const mongoose = require('mongoose');
const Travel = require('../models/Travel');
const Expense = require('../models/Expense');
const User = require('../models/User');
const { buildDataScopeQuery } = require('../utils/dataScope');
const Role = require('../models/Role');

/**
 * @desc    获取Dashboard统计数据
 * @route   GET /api/dashboard/stats
 * @access  Private
 */
exports.getDashboardStats = async (req, res) => {
  try {
    const userId = req.user.id;
    const userRole = req.user.role;
    const currentDate = new Date();
    const currentMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    const lastMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1);

    // 获取用户角色以确定数据权限范围
    const role = await Role.findOne({ code: req.user.role, isActive: true });
    
    // 构建数据权限查询条件
    const travelQuery = await buildDataScopeQuery(req.user, role, 'employee');
    const expenseQuery = await buildDataScopeQuery(req.user, role, 'employee');

    // 并行查询所有统计数据
    const [
      totalTravelRequests,
      pendingApprovals,
      approvedRequests,
      rejectedRequests,
      monthlySpending,
      lastMonthSpending,
      totalExpenses,
      pendingExpenses
    ] = await Promise.all([
      // 总差旅申请数
      Travel.countDocuments(travelQuery),
      
      // 待审批数量
      Travel.countDocuments({ ...travelQuery, status: 'submitted' }),
      
      // 已批准数量
      Travel.countDocuments({ ...travelQuery, status: 'approved' }),
      
      // 已拒绝数量
      Travel.countDocuments({ ...travelQuery, status: 'rejected' }),
      
      // 当月支出
      Expense.aggregate([
        {
          $match: Object.assign({}, expenseQuery, {
            date: { $gte: currentMonth }
          })
        },
        {
          $group: {
            _id: null,
            total: { $sum: '$amount' }
          }
        }
      ]),
      
      // 上月支出
      Expense.aggregate([
        {
          $match: Object.assign({}, expenseQuery, {
            date: { $gte: lastMonth, $lt: currentMonth }
          })
        },
        {
          $group: {
            _id: null,
            total: { $sum: '$amount' }
          }
        }
      ]),
      
      // 总费用数
      Expense.countDocuments(expenseQuery),
      
      // 待审批费用数
      Expense.countDocuments({ ...expenseQuery, status: 'submitted' })
    ]);

    // 计算月度趋势
    const currentMonthTotal = monthlySpending[0]?.total || 0;
    const lastMonthTotal = lastMonthSpending[0]?.total || 0;
    const spendingTrend = lastMonthTotal > 0 
      ? ((currentMonthTotal - lastMonthTotal) / lastMonthTotal * 100).toFixed(1)
      : 0;

    res.json({
      success: true,
      data: {
        totalTravelRequests,
        pendingApprovals,
        approvedRequests,
        rejectedRequests,
        monthlySpending: currentMonthTotal,
        lastMonthSpending: lastMonthTotal,
        spendingTrend,
        totalExpenses,
        pendingExpenses
      }
    });
  } catch (error) {
    console.error('Get dashboard stats error:', error);
    res.status(500).json({
      success: false,
      message: '获取统计数据失败',
      error: error.message
    });
  }
};

/**
 * @desc    获取最近的差旅申请
 * @route   GET /api/dashboard/recent-travels
 * @access  Private
 */
exports.getRecentTravels = async (req, res) => {
  try {
    const userId = req.user.id;
    const userRole = req.user.role;
    const limit = parseInt(req.query.limit) || 5;

    // 获取用户角色以确定数据权限范围
    const role = await Role.findOne({ code: req.user.role, isActive: true });
    const query = await buildDataScopeQuery(req.user, role, 'employee');

    const recentTravels = await Travel.find(query)
      .sort({ createdAt: -1 })
      .limit(limit)
      .select('travelNumber title destination startDate endDate status purpose estimatedBudget')
      .populate('employee', 'firstName lastName email')
      .lean();

    res.json({
      success: true,
      data: recentTravels
    });
  } catch (error) {
    console.error('Get recent travels error:', error);
    res.status(500).json({
      success: false,
      message: '获取最近差旅失败',
      error: error.message
    });
  }
};

/**
 * @desc    获取最近的费用记录
 * @route   GET /api/dashboard/recent-expenses
 * @access  Private
 */
exports.getRecentExpenses = async (req, res) => {
  try {
    const userId = req.user.id;
    const userRole = req.user.role;
    const limit = parseInt(req.query.limit) || 5;

    // 获取用户角色以确定数据权限范围
    const role = await Role.findOne({ code: req.user.role, isActive: true });
    const query = await buildDataScopeQuery(req.user, role, 'employee');

    const recentExpenses = await Expense.find(query)
      .sort({ date: -1 })
      .limit(limit)
      .select('title description amount category date status')
      .populate('employee', 'firstName lastName email')
      .lean();

    res.json({
      success: true,
      data: recentExpenses
    });
  } catch (error) {
    console.error('Get recent expenses error:', error);
    res.status(500).json({
      success: false,
      message: '获取最近费用失败',
      error: error.message
    });
  }
};

/**
 * @desc    获取月度支出趋势
 * @route   GET /api/dashboard/monthly-spending
 * @access  Private
 */
exports.getMonthlySpending = async (req, res) => {
  try {
    console.log('[MONTHLY_SPENDING_API] Request received');
    const userId = req.user.id;
    const userRole = req.user.role;
    const months = parseInt(req.query.months) || 6;

    console.log('[MONTHLY_SPENDING_API] userId:', userId, 'userRole:', userRole, 'months:', months);

    // 获取用户角色以确定数据权限范围
    const role = await Role.findOne({ code: req.user.role, isActive: true });
    const query = await buildDataScopeQuery(req.user, role, 'employee');

    console.log('[MONTHLY_SPENDING_API] Data scope query:', JSON.stringify(query, null, 2));

    // 计算起始日期（往前N个月）
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - months);
    startDate.setDate(1);
    startDate.setHours(0, 0, 0, 0);
    startDate.setMilliseconds(0);

    console.log('[MONTHLY_SPENDING_API] Date range - startDate:', startDate.toISOString());

    const matchQuery = Object.assign({}, query, {
      date: { $gte: startDate }
    });
    
    console.log('[MONTHLY_SPENDING_API] Match query:', JSON.stringify(matchQuery, null, 2));
    
    // 先检查是否有符合条件的数据
    const totalCount = await Expense.countDocuments(matchQuery);
    console.log('[MONTHLY_SPENDING_API] Total expenses matching query:', totalCount);

    const monthlyData = await Expense.aggregate([
      {
        $match: matchQuery
      },
      {
        $group: {
          _id: {
            year: { $year: '$date' },
            month: { $month: '$date' }
          },
          total: { $sum: '$amount' },
          count: { $sum: 1 }
        }
      },
      {
        $sort: { '_id.year': 1, '_id.month': 1 }
      }
    ]);

    console.log('[MONTHLY_SPENDING_API] Aggregation result:', JSON.stringify(monthlyData, null, 2));

    // 格式化数据
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const formattedData = monthlyData.map(item => ({
      month: monthNames[item._id.month - 1],
      year: item._id.year,
      amount: parseFloat(item.total.toFixed(2)),
      count: item.count
    }));

    console.log('[MONTHLY_SPENDING_API] Final formatted data:', JSON.stringify(formattedData, null, 2));

    // 禁用缓存
    res.set({
      'Cache-Control': 'no-store, no-cache, must-revalidate, private',
      'Pragma': 'no-cache',
      'Expires': '0',
      'ETag': false
    });

    res.json({
      success: true,
      data: formattedData
    });
  } catch (error) {
    console.error('[MONTHLY_SPENDING_API] Error:', error);
    console.error('[MONTHLY_SPENDING_API] Error stack:', error.stack);
    res.status(500).json({
      success: false,
      message: '获取月度支出失败',
      error: error.message
    });
  }
};

/**
 * @desc    获取费用类别分布
 * @route   GET /api/dashboard/category-breakdown
 * @access  Private
 */
exports.getCategoryBreakdown = async (req, res) => {
  try {
    const userId = req.user.id;
    const userRole = req.user.role;
    const period = req.query.period || 'month'; // month, quarter, year

    // 获取用户角色以确定数据权限范围
    const role = await Role.findOne({ code: req.user.role, isActive: true });
    const query = await buildDataScopeQuery(req.user, role, 'employee');

    // 计算时间范围（使用本地时间，避免时区问题）
    const now = new Date();
    let startDate;
    if (period === 'month') {
      startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0, 0);
    } else if (period === 'quarter') {
      startDate = new Date(now.getFullYear(), now.getMonth() - 3, 1, 0, 0, 0, 0);
    } else if (period === 'year') {
      startDate = new Date(now.getFullYear() - 1, now.getMonth(), 1, 0, 0, 0, 0);
    } else {
      startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0, 0);
    }

    console.log('[CATEGORY_BREAKDOWN_API] userId:', userId, 'userRole:', userRole, 'period:', period);
    console.log('[CATEGORY_BREAKDOWN_API] Data scope query:', JSON.stringify(query, null, 2));
    console.log('[CATEGORY_BREAKDOWN_API] Date range:');
    console.log('[CATEGORY_BREAKDOWN_API] - Now:', now.toISOString());
    console.log('[CATEGORY_BREAKDOWN_API] - Start date:', startDate.toISOString());
    console.log('[CATEGORY_BREAKDOWN_API] - Start date local:', startDate.toString());

    const matchQuery = Object.assign({}, query, {
      date: { $gte: startDate }
    });
    
    console.log('[CATEGORY_BREAKDOWN_API] Match query:', JSON.stringify(matchQuery, null, 2));
    
    // 先检查是否有符合条件的数据
    const totalCount = await Expense.countDocuments(matchQuery);
    console.log('[CATEGORY_BREAKDOWN_API] Total expenses matching query:', totalCount);
    
    // 检查是否有 category 字段的数据
    const expensesWithCategory = await Expense.countDocuments({
      ...matchQuery,
      category: { $exists: true, $ne: null }
    });
    console.log('[CATEGORY_BREAKDOWN_API] Expenses with category field:', expensesWithCategory);

    const categoryData = await Expense.aggregate([
      {
        $match: matchQuery
      },
      {
        $group: {
          _id: '$category',
          total: { $sum: '$amount' },
          count: { $sum: 1 }
        }
      },
      {
        $sort: { total: -1 }
      }
    ]);

    // 计算总额
    const totalAmount = categoryData.reduce((sum, item) => sum + item.total, 0);
    console.log('[CATEGORY_BREAKDOWN_API] Aggregation result:', JSON.stringify(categoryData, null, 2));
    console.log('[CATEGORY_BREAKDOWN_API] Total amount:', totalAmount);

    // 定义类别颜色（使用实际的类别名称）
    const categoryColors = {
      transportation: '#8884d8',
      accommodation: '#82ca9d',
      meals: '#ffc658',
      entertainment: '#ff7300',
      communication: '#8dd3c7',
      office_supplies: '#a4de6c',
      training: '#ffb347',
      other: '#d0d0d0'
    };

    // 格式化数据 - 前端期望value是百分比
    const formattedData = categoryData.map(item => {
      const categoryName = item._id || 'other';
      const percentage = totalAmount > 0 ? parseFloat(((item.total / totalAmount) * 100).toFixed(1)) : 0;
      return {
        name: categoryName,
        value: percentage, // 前端期望百分比
        amount: parseFloat(item.total.toFixed(2)), // 保留金额用于tooltip
        count: item.count,
        percentage: percentage,
        color: categoryColors[categoryName] || categoryColors.other
      };
    });

    console.log('[CATEGORY_BREAKDOWN_API] Final formatted data:', JSON.stringify(formattedData, null, 2));

    // 禁用缓存
    res.set({
      'Cache-Control': 'no-store, no-cache, must-revalidate, private',
      'Pragma': 'no-cache',
      'Expires': '0',
      'ETag': false
    });

    res.json({
      success: true,
      data: formattedData || [], // 确保返回数组
      total: parseFloat(totalAmount.toFixed(2))
    });
  } catch (error) {
    console.error('Get category breakdown error:', error);
    res.status(500).json({
      success: false,
      message: '获取类别分布失败',
      error: error.message
    });
  }
};

/**
 * @desc    获取待办事项
 * @route   GET /api/dashboard/pending-tasks
 * @access  Private
 */
exports.getPendingTasks = async (req, res) => {
  try {
    const userId = req.user.id;
    const userRole = req.user.role;

    const tasks = [];

    // 如果是管理员或审批人，获取待审批的差旅
    if (userRole === 'admin' || userRole === 'manager') {
      const pendingTravels = await Travel.countDocuments({ status: 'submitted' });
      if (pendingTravels > 0) {
        tasks.push({
          type: 'approval',
          title: '待审批差旅申请',
          count: pendingTravels,
          priority: 'high',
          link: '/approvals'
        });
      }

      const pendingExpenses = await Expense.countDocuments({ status: 'submitted' });
      if (pendingExpenses > 0) {
        tasks.push({
          type: 'approval',
          title: '待审批费用报销',
          count: pendingExpenses,
          priority: 'high',
          link: '/approvals'
        });
      }
    }

    // 获取用户自己的草稿
    const draftTravels = await Travel.countDocuments({ employee: userId, status: 'draft' });
    if (draftTravels > 0) {
      tasks.push({
        type: 'draft',
        title: '未完成的差旅申请',
        count: draftTravels,
        priority: 'medium',
        link: '/travel'
      });
    }

    // 获取即将开始的差旅
    const upcomingTravels = await Travel.find({
      employee: userId,
      status: 'approved',
      startDate: {
        $gte: new Date(),
        $lte: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7天内
      }
    }).countDocuments();

    if (upcomingTravels > 0) {
      tasks.push({
        type: 'upcoming',
        title: '即将开始的差旅',
        count: upcomingTravels,
        priority: 'medium',
        link: '/travel'
      });
    }

    res.json({
      success: true,
      data: tasks
    });
  } catch (error) {
    console.error('Get pending tasks error:', error);
    res.status(500).json({
      success: false,
      message: '获取待办事项失败',
      error: error.message
    });
  }
};

/**
 * @desc    获取完整的Dashboard数据（一次性获取所有数据）
 * @route   GET /api/dashboard
 * @access  Private
 */
exports.getDashboardData = async (req, res) => {
  try {
    console.log('[DASHBOARD_DATA] ========== Request received ==========');
    console.log('[DASHBOARD_DATA] User ID:', req.user?.id);
    console.log('[DASHBOARD_DATA] User Role:', req.user?.role);
    console.log('[DASHBOARD_DATA] User:', JSON.stringify(req.user, null, 2));
    
    const userId = req.user.id;
    const userRole = req.user.role;

    console.log('[DASHBOARD_DATA] Starting parallel data fetch...');

    // 并行获取所有数据，使用 Promise.allSettled 避免一个失败导致全部失败
    const results = await Promise.allSettled([
      // 复用上面的逻辑
      getDashboardStatsData(userId, userRole),
      getRecentTravelsData(userId, userRole, 5),
      getRecentExpensesData(userId, userRole, 5),
      getMonthlySpendingData(userId, userRole, 6),
      getCategoryBreakdownData(userId, userRole, 'month'),
      getPendingTasksData(userId, userRole)
    ]);

    // 处理结果，如果失败则使用默认值
    const stats = results[0].status === 'fulfilled' ? results[0].value : {};
    const recentTravels = results[1].status === 'fulfilled' ? results[1].value : [];
    const recentExpenses = results[2].status === 'fulfilled' ? results[2].value : [];
    const monthlySpending = results[3].status === 'fulfilled' ? results[3].value : [];
    const categoryBreakdown = results[4].status === 'fulfilled' ? results[4].value : [];
    const pendingTasks = results[5].status === 'fulfilled' ? results[5].value : [];

    // 记录任何失败的结果
    results.forEach((result, index) => {
      if (result.status === 'rejected') {
        const functionNames = ['getDashboardStatsData', 'getRecentTravelsData', 'getRecentExpensesData', 'getMonthlySpendingData', 'getCategoryBreakdownData', 'getPendingTasksData'];
        console.error(`[DASHBOARD_DATA] ❌ ${functionNames[index]} failed:`, result.reason);
        console.error(`[DASHBOARD_DATA] Error stack:`, result.reason?.stack);
      }
    });

    console.log('[DASHBOARD_DATA] Data fetched:');
    console.log('[DASHBOARD_DATA] - stats:', JSON.stringify(stats, null, 2));
    console.log('[DASHBOARD_DATA] - recentTravels count:', recentTravels?.length || 0);
    console.log('[DASHBOARD_DATA] - recentExpenses count:', recentExpenses?.length || 0);
    console.log('[DASHBOARD_DATA] - monthlySpending:', JSON.stringify(monthlySpending, null, 2));
    console.log('[DASHBOARD_DATA] - monthlySpending length:', monthlySpending?.length || 0);
    console.log('[DASHBOARD_DATA] - categoryBreakdown:', JSON.stringify(categoryBreakdown, null, 2));
    console.log('[DASHBOARD_DATA] - categoryBreakdown length:', categoryBreakdown?.length || 0);
    console.log('[DASHBOARD_DATA] - pendingTasks count:', pendingTasks?.length || 0);

    const responseData = {
      success: true,
      data: {
        stats: stats || {},
        recentTravels: recentTravels || [],
        recentExpenses: recentExpenses || [],
        monthlySpending: monthlySpending || [], // 确保返回数组
        categoryBreakdown: categoryBreakdown || [], // 确保返回数组
        pendingTasks: pendingTasks || []
      }
    };
    
    console.log('[DASHBOARD_DATA] Sending response...');
    console.log('[DASHBOARD_DATA] Response data:', JSON.stringify(responseData, null, 2));
    
    // 禁用缓存，确保每次请求都执行服务器端逻辑
    res.set({
      'Cache-Control': 'no-store, no-cache, must-revalidate, private',
      'Pragma': 'no-cache',
      'Expires': '0',
      'ETag': false
    });
    
    res.json(responseData);
  } catch (error) {
    console.error('[DASHBOARD_DATA] ========== ERROR ==========');
    console.error('[DASHBOARD_DATA] Error:', error);
    console.error('[DASHBOARD_DATA] Error stack:', error.stack);
    console.error('[DASHBOARD_DATA] ============================');
    res.status(500).json({
      success: false,
      message: '获取Dashboard数据失败',
      error: error.message
    });
  }
};

// 辅助函数（内部使用）
async function getDashboardStatsData(userId, userRole) {
  // 获取完整用户信息以确定数据权限范围
  const user = await User.findById(userId);
  if (!user) {
    // 如果用户不存在，返回空数据
    return {
      totalTravelRequests: 0,
      pendingApprovals: 0,
      approvedRequests: 0,
      monthlySpending: 0,
      spendingTrend: 0
    };
  }
  const role = await Role.findOne({ code: userRole, isActive: true });
  const travelQuery = await buildDataScopeQuery(user, role, 'employee');
  const expenseQuery = await buildDataScopeQuery(user, role, 'employee');
  
  // 转换 employee 字段为 ObjectId（如果存在且是字符串）
  const expenseQueryForAggregate = { ...expenseQuery };
  if (expenseQueryForAggregate.employee) {
    if (typeof expenseQueryForAggregate.employee === 'string') {
      expenseQueryForAggregate.employee = new mongoose.Types.ObjectId(expenseQueryForAggregate.employee);
    } else if (expenseQueryForAggregate.employee.$in && Array.isArray(expenseQueryForAggregate.employee.$in)) {
      // 处理 $in 操作符的情况
      expenseQueryForAggregate.employee.$in = expenseQueryForAggregate.employee.$in.map(id => 
        typeof id === 'string' ? new mongoose.Types.ObjectId(id) : id
      );
    }
  }
  
  const currentMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  const lastMonth = new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1);

  const [
    totalTravelRequests,
    pendingApprovals,
    approvedRequests,
    monthlySpending,
    lastMonthSpending
  ] = await Promise.all([
    Travel.countDocuments(travelQuery),
    Travel.countDocuments({ ...travelQuery, status: 'submitted' }),
    Travel.countDocuments({ ...travelQuery, status: 'approved' }),
    Expense.aggregate([
      { $match: Object.assign({}, expenseQueryForAggregate, { date: { $gte: currentMonth } }) },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]),
    Expense.aggregate([
      { $match: Object.assign({}, expenseQueryForAggregate, { date: { $gte: lastMonth, $lt: currentMonth } }) },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ])
  ]);

  const currentMonthTotal = monthlySpending[0]?.total || 0;
  const lastMonthTotal = lastMonthSpending[0]?.total || 0;
  const spendingTrend = lastMonthTotal > 0 
    ? ((currentMonthTotal - lastMonthTotal) / lastMonthTotal * 100).toFixed(1)
    : 0;

  return {
    totalTravelRequests,
    pendingApprovals,
    approvedRequests,
    monthlySpending: currentMonthTotal,
    spendingTrend: parseFloat(spendingTrend)
  };
}

async function getRecentTravelsData(userId, userRole, limit) {
  const user = await User.findById(userId);
  if (!user) return [];
  const role = await Role.findOne({ code: userRole, isActive: true });
  const query = await buildDataScopeQuery(user, role, 'employee');
  return await Travel.find(query)
    .sort({ createdAt: -1 })
    .limit(limit)
    .select('travelNumber title destination startDate endDate status')
    .populate('employee', 'firstName lastName email')
    .lean();
}

async function getRecentExpensesData(userId, userRole, limit) {
  const user = await User.findById(userId);
  if (!user) return [];
  const role = await Role.findOne({ code: userRole, isActive: true });
  const query = await buildDataScopeQuery(user, role, 'employee');
  return await Expense.find(query)
    .sort({ date: -1 })
    .limit(limit)
    .select('title description amount category date status')
    .lean();
}

async function getMonthlySpendingData(userId, userRole, months) {
  try {
    console.log('[MONTHLY_SPENDING_DATA] ========== Starting ==========');
    console.log('[MONTHLY_SPENDING_DATA] userId:', userId);
    console.log('[MONTHLY_SPENDING_DATA] userRole:', userRole);
    console.log('[MONTHLY_SPENDING_DATA] months:', months);
    
    const user = await User.findById(userId);
    if (!user) {
      console.log('[MONTHLY_SPENDING_DATA] ❌ User not found:', userId);
      return [];
    }
    console.log('[MONTHLY_SPENDING_DATA] ✅ User found:', user.email);
    
    const role = await Role.findOne({ code: userRole, isActive: true });
    console.log('[MONTHLY_SPENDING_DATA] Role:', role?.name, role?.dataScope);
    
    const query = await buildDataScopeQuery(user, role, 'employee');
    console.log('[MONTHLY_SPENDING_DATA] Data scope query:', JSON.stringify(query, null, 2));
    
    // 计算起始日期（往前N个月的第一天）
    // 注意：使用本地时间，避免时区问题
    const now = new Date();
    const startDate = new Date(now.getFullYear(), now.getMonth() - months, 1, 0, 0, 0, 0);

    console.log('[MONTHLY_SPENDING_DATA] Date range:');
    console.log('[MONTHLY_SPENDING_DATA] - Now:', now.toISOString(), now.toString());
    console.log('[MONTHLY_SPENDING_DATA] - Start date:', startDate.toISOString(), startDate.toString());

    // 转换 employee 字段为 ObjectId（如果存在且是字符串）
    const matchQuery = Object.assign({}, query, { date: { $gte: startDate } });
    if (matchQuery.employee) {
      if (typeof matchQuery.employee === 'string') {
        matchQuery.employee = new mongoose.Types.ObjectId(matchQuery.employee);
      } else if (matchQuery.employee.$in && Array.isArray(matchQuery.employee.$in)) {
        // 处理 $in 操作符的情况
        matchQuery.employee.$in = matchQuery.employee.$in.map(id => 
          typeof id === 'string' ? new mongoose.Types.ObjectId(id) : id
        );
      }
    }
    console.log('[MONTHLY_SPENDING_DATA] Match query:', JSON.stringify(matchQuery, null, 2));
    
    // 先检查是否有符合条件的数据
    const totalCount = await Expense.countDocuments(matchQuery);
    console.log('[MONTHLY_SPENDING_DATA] Total expenses matching query:', totalCount);
    
    if (totalCount === 0) {
      console.log('[MONTHLY_SPENDING_DATA] ⚠️ No expenses found matching query');
      return [];
    }

    console.log('[MONTHLY_SPENDING_DATA] Running aggregation...');
    const monthlyData = await Expense.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: { year: { $year: '$date' }, month: { $month: '$date' } },
          total: { $sum: '$amount' }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } }
    ]);

    console.log('[MONTHLY_SPENDING_DATA] Aggregation result:', JSON.stringify(monthlyData, null, 2));
    console.log('[MONTHLY_SPENDING_DATA] Aggregation result length:', monthlyData.length);

    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const result = monthlyData.map(item => ({
      month: monthNames[item._id.month - 1],
      amount: parseFloat(item.total.toFixed(2))
    }));
    
    console.log('[MONTHLY_SPENDING_DATA] Final result:', JSON.stringify(result, null, 2));
    console.log('[MONTHLY_SPENDING_DATA] ========== Completed ==========');
    
    return result;
  } catch (error) {
    console.error('[MONTHLY_SPENDING_DATA] ========== ERROR ==========');
    console.error('[MONTHLY_SPENDING_DATA] Error:', error);
    console.error('[MONTHLY_SPENDING_DATA] Error message:', error.message);
    console.error('[MONTHLY_SPENDING_DATA] Error stack:', error.stack);
    console.error('[MONTHLY_SPENDING_DATA] ============================');
    return [];
  }
}

async function getCategoryBreakdownData(userId, userRole, period) {
  try {
    console.log('[CATEGORY_BREAKDOWN] ========== Starting ==========');
    console.log('[CATEGORY_BREAKDOWN] userId:', userId);
    console.log('[CATEGORY_BREAKDOWN] userRole:', userRole);
    console.log('[CATEGORY_BREAKDOWN] period:', period);
    
    const user = await User.findById(userId);
    if (!user) {
      console.log('[CATEGORY_BREAKDOWN] ❌ User not found:', userId);
      return [];
    }
    console.log('[CATEGORY_BREAKDOWN] ✅ User found:', user.email);
    
    const role = await Role.findOne({ code: userRole, isActive: true });
    console.log('[CATEGORY_BREAKDOWN] Role:', role?.name, role?.dataScope);
    
    const query = await buildDataScopeQuery(user, role, 'employee');
    console.log('[CATEGORY_BREAKDOWN] Data scope query:', JSON.stringify(query, null, 2));
    
    // 计算时间范围（使用本地时间，避免时区问题）
    const now = new Date();
    let startDate;
    if (period === 'month') {
      startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0, 0);
    } else if (period === 'quarter') {
      startDate = new Date(now.getFullYear(), now.getMonth() - 3, 1, 0, 0, 0, 0);
    } else if (period === 'year') {
      startDate = new Date(now.getFullYear() - 1, now.getMonth(), 1, 0, 0, 0, 0);
    } else {
      startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0, 0);
    }

    console.log('[CATEGORY_BREAKDOWN] Date range:');
    console.log('[CATEGORY_BREAKDOWN] - Now:', now.toISOString(), now.toString());
    console.log('[CATEGORY_BREAKDOWN] - Start date:', startDate.toISOString(), startDate.toString());

    // 转换 employee 字段为 ObjectId（如果存在且是字符串）
    const matchQuery = Object.assign({}, query, { date: { $gte: startDate } });
    if (matchQuery.employee) {
      if (typeof matchQuery.employee === 'string') {
        matchQuery.employee = new mongoose.Types.ObjectId(matchQuery.employee);
      } else if (matchQuery.employee.$in && Array.isArray(matchQuery.employee.$in)) {
        // 处理 $in 操作符的情况
        matchQuery.employee.$in = matchQuery.employee.$in.map(id => 
          typeof id === 'string' ? new mongoose.Types.ObjectId(id) : id
        );
      }
    }
    console.log('[CATEGORY_BREAKDOWN] Match query:', JSON.stringify(matchQuery, null, 2));
    
    const totalCount = await Expense.countDocuments(matchQuery);
    console.log('[CATEGORY_BREAKDOWN] Total expenses matching query:', totalCount);
    
    if (totalCount === 0) {
      console.log('[CATEGORY_BREAKDOWN] ⚠️ No expenses found matching query');
      return [];
    }
    
    // 检查是否有 category 字段的数据
    const expensesWithCategory = await Expense.countDocuments({
      ...matchQuery,
      category: { $exists: true, $ne: null }
    });
    console.log('[CATEGORY_BREAKDOWN] Expenses with category field:', expensesWithCategory);

    console.log('[CATEGORY_BREAKDOWN] Running aggregation...');
    const categoryData = await Expense.aggregate([
      { $match: matchQuery },
      { $group: { _id: '$category', total: { $sum: '$amount' }, count: { $sum: 1 } } },
      { $sort: { total: -1 } }
    ]);

    console.log('[CATEGORY_BREAKDOWN] Aggregation result:', JSON.stringify(categoryData, null, 2));
    console.log('[CATEGORY_BREAKDOWN] Aggregation result length:', categoryData.length);

    if (categoryData.length === 0) {
      console.log('[CATEGORY_BREAKDOWN] ⚠️ No category data found');
      return [];
    }

    // 定义类别颜色（使用实际的类别名称）
    const categoryColors = {
      transportation: '#8884d8',
      accommodation: '#82ca9d',
      meals: '#ffc658',
      entertainment: '#ff7300',
      communication: '#8dd3c7',
      office_supplies: '#a4de6c',
      training: '#ffb347',
      other: '#d0d0d0'
    };

    const totalAmount = categoryData.reduce((sum, item) => sum + item.total, 0);
    console.log('[CATEGORY_BREAKDOWN] Total amount:', totalAmount);

    const result = categoryData.map(item => {
      const categoryName = item._id || 'other';
      const percentage = totalAmount > 0 ? parseFloat(((item.total / totalAmount) * 100).toFixed(1)) : 0;
      return {
        name: categoryName,
        value: percentage, // 前端期望百分比
        amount: parseFloat(item.total.toFixed(2)), // 保留金额用于tooltip
        count: item.count,
        percentage: percentage,
        color: categoryColors[categoryName] || categoryColors.other
      };
    });
    
    console.log('[CATEGORY_BREAKDOWN] Final result:', JSON.stringify(result, null, 2));
    console.log('[CATEGORY_BREAKDOWN] ========== Completed ==========');
    
    return result;
  } catch (error) {
    console.error('[CATEGORY_BREAKDOWN] ========== ERROR ==========');
    console.error('[CATEGORY_BREAKDOWN] Error:', error);
    console.error('[CATEGORY_BREAKDOWN] Error message:', error.message);
    console.error('[CATEGORY_BREAKDOWN] Error stack:', error.stack);
    console.error('[CATEGORY_BREAKDOWN] ============================');
    return [];
  }
}

async function getPendingTasksData(userId, userRole) {
  const tasks = [];

  if (userRole === 'admin' || userRole === 'manager') {
    const pendingTravels = await Travel.countDocuments({ status: 'submitted' });
    if (pendingTravels > 0) {
      tasks.push({
        type: 'approval',
        title: '待审批差旅',
        count: pendingTravels,
        priority: 'high'
      });
    }
  }

  const draftTravels = await Travel.countDocuments({ employee: userId, status: 'draft' });
  if (draftTravels > 0) {
    tasks.push({
      type: 'draft',
      title: '草稿差旅',
      count: draftTravels,
      priority: 'medium'
    });
  }

  return tasks;
}

