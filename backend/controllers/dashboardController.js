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
    const userId = req.user.id;
    const userRole = req.user.role;

    // 一次性查询用户和角色，避免重复查询
    const [user, role] = await Promise.all([
      User.findById(userId),
      Role.findOne({ code: userRole, isActive: true })
    ]);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: '用户不存在'
      });
    }

    // 一次性构建数据权限查询条件（travelQuery 和 expenseQuery 相同，只需调用一次）
    const dataScopeQuery = await buildDataScopeQuery(user, role, 'employee');
    const travelQuery = dataScopeQuery;
    const expenseQuery = dataScopeQuery;

    // 转换 expenseQuery 中的 employee 字段为 ObjectId（用于聚合查询）
    const expenseQueryForAggregate = convertEmployeeToObjectId({ ...expenseQuery });

    // 并行获取所有数据，使用 Promise.allSettled 避免一个失败导致全部失败
    // 合并月度支出和类别分布的查询（使用相同的日期范围时）
    const results = await Promise.allSettled([
      getDashboardStatsData(user, role, travelQuery, expenseQuery, expenseQueryForAggregate),
      getRecentTravelsData(travelQuery, 5),
      getRecentExpensesData(expenseQuery, 5),
      getMonthlySpendingAndCategoryData(expenseQueryForAggregate, 6, 'month'),
      getPendingTasksData(userId, userRole)
    ]);

    // 处理结果，如果失败则使用默认值
    const stats = results[0].status === 'fulfilled' ? results[0].value : {};
    const recentTravels = results[1].status === 'fulfilled' ? results[1].value : [];
    const recentExpenses = results[2].status === 'fulfilled' ? results[2].value : [];
    const monthlyAndCategoryData = results[3].status === 'fulfilled' ? results[3].value : { monthlySpending: [], categoryBreakdown: [] };
    const monthlySpending = monthlyAndCategoryData.monthlySpending || [];
    const categoryBreakdown = monthlyAndCategoryData.categoryBreakdown || [];
    const pendingTasks = results[4].status === 'fulfilled' ? results[4].value : [];

    // 记录任何失败的结果（仅在开发环境）
    if (process.env.NODE_ENV === 'development') {
      results.forEach((result, index) => {
        if (result.status === 'rejected') {
          const functionNames = ['getDashboardStatsData', 'getRecentTravelsData', 'getRecentExpensesData', 'getMonthlySpendingData', 'getCategoryBreakdownData', 'getPendingTasksData'];
          console.error(`[DASHBOARD_DATA] ❌ ${functionNames[index]} failed:`, result.reason);
        }
      });
    }

    const responseData = {
      success: true,
      data: {
        stats: stats || {},
        recentTravels: recentTravels || [],
        recentExpenses: recentExpenses || [],
        monthlySpending: monthlySpending || [],
        categoryBreakdown: categoryBreakdown || [],
        pendingTasks: pendingTasks || []
      }
    };
    
    // 禁用缓存，确保每次请求都执行服务器端逻辑
    res.set({
      'Cache-Control': 'no-store, no-cache, must-revalidate, private',
      'Pragma': 'no-cache',
      'Expires': '0',
      'ETag': false
    });
    
    res.json(responseData);
  } catch (error) {
    console.error('[DASHBOARD_DATA] Error:', error);
    res.status(500).json({
      success: false,
      message: '获取Dashboard数据失败',
      error: error.message
    });
  }
};

// 辅助函数：转换 employee 字段为 ObjectId
function convertEmployeeToObjectId(query) {
  const result = { ...query };
  if (result.employee) {
    if (typeof result.employee === 'string') {
      result.employee = new mongoose.Types.ObjectId(result.employee);
    } else if (result.employee.$in && Array.isArray(result.employee.$in)) {
      result.employee.$in = result.employee.$in.map(id => 
        typeof id === 'string' ? new mongoose.Types.ObjectId(id) : id
      );
    }
  }
  return result;
}

// 辅助函数（内部使用）
async function getDashboardStatsData(user, role, travelQuery, expenseQuery, expenseQueryForAggregate) {
  if (!user) {
    return {
      totalTravelRequests: 0,
      pendingApprovals: 0,
      approvedRequests: 0,
      monthlySpending: 0,
      spendingTrend: 0,
      totalExpenses: 0
    };
  }
  
  const currentMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  const lastMonth = new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1);

  // 合并当前月和上月的聚合查询为一个，减少数据库查询次数
  const [
    totalTravelRequests,
    pendingApprovals,
    approvedRequests,
    monthlySpendingData,
    totalExpenses
  ] = await Promise.all([
    Travel.countDocuments(travelQuery),
    Travel.countDocuments({ ...travelQuery, status: 'submitted' }),
    Travel.countDocuments({ ...travelQuery, status: 'approved' }),
    Expense.aggregate([
      { 
        $match: Object.assign({}, expenseQueryForAggregate, { 
          date: { $gte: lastMonth } 
        }) 
      },
      {
        $group: {
          _id: {
            $cond: [
              { $gte: ['$date', currentMonth] },
              'currentMonth',
              'lastMonth'
            ]
          },
          total: { $sum: '$amount' }
        }
      }
    ]),
    Expense.countDocuments(expenseQuery)
  ]);

  // 从合并的聚合结果中分离当前月和上月的数据
  const currentMonthTotal = monthlySpendingData.find(item => item._id === 'currentMonth')?.total || 0;
  const lastMonthTotal = monthlySpendingData.find(item => item._id === 'lastMonth')?.total || 0;
  const spendingTrend = lastMonthTotal > 0 
    ? ((currentMonthTotal - lastMonthTotal) / lastMonthTotal * 100).toFixed(1)
    : 0;

  return {
    totalTravelRequests,
    pendingApprovals,
    approvedRequests,
    monthlySpending: currentMonthTotal,
    spendingTrend: parseFloat(spendingTrend),
    totalExpenses
  };
}

async function getRecentTravelsData(travelQuery, limit) {
  return await Travel.find(travelQuery)
    .sort({ createdAt: -1 })
    .limit(limit)
    .select('travelNumber title destination startDate endDate status')
    .populate('employee', 'firstName lastName email')
    .lean();
}

async function getRecentExpensesData(expenseQuery, limit) {
  return await Expense.find(expenseQuery)
    .sort({ date: -1 })
    .limit(limit)
    .select('title description amount category date status')
    .lean();
}

/**
 * 合并查询：一次性获取月度支出趋势和类别分布数据
 * 当类别分布的日期范围在月度支出的范围内时，合并为一个聚合查询，减少数据库查询次数
 */
async function getMonthlySpendingAndCategoryData(expenseQueryForAggregate, months, period) {
  try {
    const now = new Date();
    
    // 计算月度支出查询的日期范围（过去N个月）
    const monthlyStartDate = new Date(now.getFullYear(), now.getMonth() - months, 1, 0, 0, 0, 0);
    
    // 计算类别分布查询的日期范围
    let categoryStartDate;
    if (period === 'month') {
      categoryStartDate = new Date(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0, 0);
    } else if (period === 'quarter') {
      categoryStartDate = new Date(now.getFullYear(), now.getMonth() - 3, 1, 0, 0, 0, 0);
    } else if (period === 'year') {
      categoryStartDate = new Date(now.getFullYear() - 1, now.getMonth(), 1, 0, 0, 0, 0);
    } else {
      categoryStartDate = new Date(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0, 0);
    }
    
    // 如果类别分布的日期范围在月度支出的范围内，可以合并查询
    const canMerge = categoryStartDate >= monthlyStartDate;
    
    if (canMerge) {
      // 合并查询：一次性获取所有数据，然后在内存中分别处理
      const allData = await Expense.aggregate([
        { $match: Object.assign({}, expenseQueryForAggregate, { date: { $gte: monthlyStartDate } }) },
        {
          $facet: {
            monthlyData: [
              {
                $group: {
                  _id: { year: { $year: '$date' }, month: { $month: '$date' } },
                  total: { $sum: '$amount' }
                }
              },
              { $sort: { '_id.year': 1, '_id.month': 1 } }
            ],
            categoryData: [
              { $match: { date: { $gte: categoryStartDate } } },
              {
                $group: {
                  _id: '$category',
                  total: { $sum: '$amount' },
                  count: { $sum: 1 }
                }
              },
              { $sort: { total: -1 } }
            ]
          }
        }
      ]);

      const monthlyData = allData[0]?.monthlyData || [];
      const categoryData = allData[0]?.categoryData || [];

      // 处理月度支出数据
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const monthlySpending = monthlyData.map(item => ({
        month: monthNames[item._id.month - 1],
        amount: parseFloat(item.total.toFixed(2))
      }));

      // 处理类别分布数据
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
      const categoryBreakdown = categoryData.length === 0 ? [] : categoryData.map(item => {
        const categoryName = item._id || 'other';
        const percentage = totalAmount > 0 ? parseFloat(((item.total / totalAmount) * 100).toFixed(1)) : 0;
        return {
          name: categoryName,
          value: percentage,
          amount: parseFloat(item.total.toFixed(2)),
          count: item.count,
          percentage: percentage,
          color: categoryColors[categoryName] || categoryColors.other
        };
      });

      return {
        monthlySpending,
        categoryBreakdown
      };
    } else {
      // 日期范围不重叠，分别查询
      const [monthlyData, categoryData] = await Promise.all([
        Expense.aggregate([
          { $match: Object.assign({}, expenseQueryForAggregate, { date: { $gte: monthlyStartDate } }) },
          {
            $group: {
              _id: { year: { $year: '$date' }, month: { $month: '$date' } },
              total: { $sum: '$amount' }
            }
          },
          { $sort: { '_id.year': 1, '_id.month': 1 } }
        ]),
        Expense.aggregate([
          { $match: Object.assign({}, expenseQueryForAggregate, { date: { $gte: categoryStartDate } }) },
          { $group: { _id: '$category', total: { $sum: '$amount' }, count: { $sum: 1 } } },
          { $sort: { total: -1 } }
        ])
      ]);

      // 处理月度支出数据
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const monthlySpending = monthlyData.map(item => ({
        month: monthNames[item._id.month - 1],
        amount: parseFloat(item.total.toFixed(2))
      }));

      // 处理类别分布数据
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
      const categoryBreakdown = categoryData.length === 0 ? [] : categoryData.map(item => {
        const categoryName = item._id || 'other';
        const percentage = totalAmount > 0 ? parseFloat(((item.total / totalAmount) * 100).toFixed(1)) : 0;
        return {
          name: categoryName,
          value: percentage,
          amount: parseFloat(item.total.toFixed(2)),
          count: item.count,
          percentage: percentage,
          color: categoryColors[categoryName] || categoryColors.other
        };
      });

      return {
        monthlySpending,
        categoryBreakdown
      };
    }
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('[MONTHLY_SPENDING_AND_CATEGORY_DATA] Error:', error);
    }
    return {
      monthlySpending: [],
      categoryBreakdown: []
    };
  }
}

// 保留原函数以保持向后兼容（如果其他地方有调用）
async function getMonthlySpendingData(expenseQueryForAggregate, months) {
  try {
    const result = await getMonthlySpendingAndCategoryData(expenseQueryForAggregate, months, 'month');
    return result.monthlySpending;
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('[MONTHLY_SPENDING_DATA] Error:', error);
    }
    return [];
  }
}

async function getCategoryBreakdownData(expenseQueryForAggregate, period) {
  try {
    const result = await getMonthlySpendingAndCategoryData(expenseQueryForAggregate, 6, period);
    return result.categoryBreakdown;
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('[CATEGORY_BREAKDOWN] Error:', error);
    }
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

