const mongoose = require('mongoose');
const Travel = require('../models/Travel');
const Expense = require('../models/Expense');
const User = require('../models/User');
const Location = require('../models/Location');
const { buildDataScopeQuery } = require('../utils/dataScope');
const Role = require('../models/Role');
const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D', '#FFC658', '#FF7C7C', '#8DD1E1', '#D084D0'];

// 国家名称中英文映射表（作为后备方案，当数据库中没有enName时使用）
const COUNTRY_NAME_MAP = {
  '中国': 'China',
  '美国': 'United States',
  '日本': 'Japan',
  '韩国': 'South Korea',
  '英国': 'United Kingdom',
  '法国': 'France',
  '德国': 'Germany',
  '意大利': 'Italy',
  '西班牙': 'Spain',
  '加拿大': 'Canada',
  '澳大利亚': 'Australia',
  '新加坡': 'Singapore',
  '马来西亚': 'Malaysia',
  '泰国': 'Thailand',
  '印度': 'India',
  '俄罗斯': 'Russia',
  '巴西': 'Brazil',
  '墨西哥': 'Mexico',
  '阿根廷': 'Argentina',
  '智利': 'Chile',
  '南非': 'South Africa',
  '埃及': 'Egypt',
  '土耳其': 'Turkey',
  '沙特阿拉伯': 'Saudi Arabia',
  '阿联酋': 'United Arab Emirates',
  '以色列': 'Israel',
  '印度尼西亚': 'Indonesia',
  '菲律宾': 'Philippines',
  '越南': 'Vietnam',
  '新西兰': 'New Zealand',
  '荷兰': 'Netherlands',
  '比利时': 'Belgium',
  '瑞士': 'Switzerland',
  '奥地利': 'Austria',
  '瑞典': 'Sweden',
  '挪威': 'Norway',
  '丹麦': 'Denmark',
  '芬兰': 'Finland',
  '波兰': 'Poland',
  '葡萄牙': 'Portugal',
  '希腊': 'Greece',
  '爱尔兰': 'Ireland',
  '捷克': 'Czech Republic',
  '匈牙利': 'Hungary',
  '罗马尼亚': 'Romania',
  '保加利亚': 'Bulgaria',
  '克罗地亚': 'Croatia',
  '乌克兰': 'Ukraine',
  '白俄罗斯': 'Belarus',
  '哈萨克斯坦': 'Kazakhstan',
  '乌兹别克斯坦': 'Uzbekistan',
  '伊朗': 'Iran',
  '伊拉克': 'Iraq',
  '阿富汗': 'Afghanistan',
  '巴基斯坦': 'Pakistan',
  '孟加拉国': 'Bangladesh',
  '斯里兰卡': 'Sri Lanka',
  '缅甸': 'Myanmar',
  '柬埔寨': 'Cambodia',
  '老挝': 'Laos',
  '文莱': 'Brunei',
  '蒙古': 'Mongolia',
  '朝鲜': 'North Korea',
  '尼泊尔': 'Nepal',
  '不丹': 'Bhutan',
  '马尔代夫': 'Maldives',
  '也门': 'Yemen',
  '阿曼': 'Oman',
  '卡塔尔': 'Qatar',
  '科威特': 'Kuwait',
  '巴林': 'Bahrain',
  '约旦': 'Jordan',
  '黎巴嫩': 'Lebanon',
  '叙利亚': 'Syria',
  '巴勒斯坦': 'Palestine',
  '乌拉圭': 'Uruguay',
  '巴拉圭': 'Paraguay',
  '玻利维亚': 'Bolivia',
  '秘鲁': 'Peru',
  '厄瓜多尔': 'Ecuador',
  '哥伦比亚': 'Colombia',
  '委内瑞拉': 'Venezuela',
  '冈比亚': 'Gambia'
};

/**
 * @desc    获取Dashboard统计数据
 * @route   GET /api/dashboard/stats
 * @access  Private
 */
exports.getDashboardStats = async (req, res) => {
  try {
    const userId = req.user.id;
    const userRole = req.user.role;
    
    // 使用UTC时间计算月份，避免时区问题
    const currentDate = new Date();
    const year = currentDate.getUTCFullYear();
    const month = currentDate.getUTCMonth();
    const currentMonth = new Date(Date.UTC(year, month, 1, 0, 0, 0, 0));
    const lastMonth = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0, 0));
    const nextMonth = new Date(Date.UTC(year, month + 1, 1, 0, 0, 0, 0));

    // 获取用户角色以确定数据权限范围
    const role = await Role.findOne({ code: req.user.role, isActive: true });
    
    // 构建数据权限查询条件
    const travelQuery = await buildDataScopeQuery(req.user, role, 'employee');
    const expenseQuery = await buildDataScopeQuery(req.user, role, 'employee');
    
    // 转换 expenseQuery 中的 employee 字段为 ObjectId（用于聚合查询）
    const expenseQueryForAggregate = { ...expenseQuery };
    if (expenseQueryForAggregate.employee) {
      if (typeof expenseQueryForAggregate.employee === 'string') {
        expenseQueryForAggregate.employee = new mongoose.Types.ObjectId(expenseQueryForAggregate.employee);
      } else if (expenseQueryForAggregate.employee.$in && Array.isArray(expenseQueryForAggregate.employee.$in)) {
        expenseQueryForAggregate.employee.$in = expenseQueryForAggregate.employee.$in.map(id => 
          typeof id === 'string' ? new mongoose.Types.ObjectId(id) : id
        );
      }
    }

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
          $match: Object.assign({}, expenseQueryForAggregate, {
            date: { $gte: currentMonth, $lt: nextMonth }
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
          $match: Object.assign({}, expenseQueryForAggregate, {
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

    // 获取即将开始的差旅（优化：直接使用 countDocuments 而不是 find().countDocuments()）
    const upcomingTravels = await Travel.countDocuments({
      employee: userId,
      status: 'approved',
      startDate: {
        $gte: new Date(),
        $lte: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7天内
      }
    });

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
    console.log('[DASHBOARD_DATA] ========== 开始获取Dashboard数据 ==========');
    const userId = req.user.id;
    const userRole = req.user.role;
    console.log('[DASHBOARD_DATA] 用户ID:', userId, '角色:', userRole);

    // 一次性查询用户和角色，避免重复查询
    const [user, role] = await Promise.all([
      User.findById(userId),
      Role.findOne({ code: userRole, isActive: true })
    ]);

    if (!user) {
      console.error('[DASHBOARD_DATA] ❌ 用户不存在');
      return res.status(404).json({
        success: false,
        message: '用户不存在'
      });
    }

    console.log('[DASHBOARD_DATA] ✅ 用户和角色查询完成');

    // 一次性构建数据权限查询条件（travelQuery 和 expenseQuery 相同，只需调用一次）
    const dataScopeQuery = await buildDataScopeQuery(user, role, 'employee');
    const travelQuery = dataScopeQuery;
    const expenseQuery = dataScopeQuery;
    console.log('[DASHBOARD_DATA] 数据权限查询条件:', JSON.stringify(travelQuery));

    // 转换 expenseQuery 中的 employee 字段为 ObjectId（用于聚合查询）
    const expenseQueryForAggregate = convertEmployeeToObjectId({ ...expenseQuery });

    console.log('[DASHBOARD_DATA] 开始并行查询所有数据...');
    const startTime = Date.now();
    
    // 并行获取所有数据，使用 Promise.allSettled 避免一个失败导致全部失败
    // 合并月度支出和类别分布的查询（使用相同的日期范围时）
    const results = await Promise.allSettled([
      getDashboardStatsData(user, role, travelQuery, expenseQuery, expenseQueryForAggregate),
      getRecentTravelsData(travelQuery, 5),
      getRecentExpensesData(expenseQuery, 5),
      getMonthlySpendingAndCategoryData(expenseQueryForAggregate, 6, 'month'),
      getPendingTasksData(userId, userRole, travelQuery),
      getCountryTravelData(travelQuery)
    ]);
    
    const queryTime = Date.now() - startTime;
    console.log(`[DASHBOARD_DATA] 数据查询完成，耗时: ${queryTime}ms`);

    // 处理结果，如果失败则使用默认值
    const stats = results[0].status === 'fulfilled' ? results[0].value : {};
    const recentTravels = results[1].status === 'fulfilled' ? results[1].value : [];
    const recentExpenses = results[2].status === 'fulfilled' ? results[2].value : [];
    const monthlyAndCategoryData = results[3].status === 'fulfilled' ? results[3].value : { monthlySpending: [], categoryBreakdown: [] };
    const monthlySpending = monthlyAndCategoryData.monthlySpending || [];
    const categoryBreakdown = monthlyAndCategoryData.categoryBreakdown || [];
    const pendingTasks = results[4].status === 'fulfilled' ? results[4].value : [];
    const countryTravelData = results[5].status === 'fulfilled' ? results[5].value : [];

    // 记录任何失败的结果
    results.forEach((result, index) => {
      if (result.status === 'rejected') {
        const functionNames = ['getDashboardStatsData', 'getRecentTravelsData', 'getRecentExpensesData', 'getMonthlySpendingAndCategoryData', 'getPendingTasksData', 'getCountryTravelData'];
        console.error(`[DASHBOARD_DATA] ❌ ${functionNames[index]} failed:`, result.reason);
        console.error(`[DASHBOARD_DATA] ❌ ${functionNames[index]} error stack:`, result.reason?.stack);
      }
    });

    const responseData = {
      success: true,
      data: {
        stats: stats || {},
        recentTravels: recentTravels || [],
        recentExpenses: recentExpenses || [],
        monthlySpending: monthlySpending || [],
        categoryBreakdown: categoryBreakdown || [],
        pendingTasks: pendingTasks || [],
        countryTravelData: countryTravelData || []
      }
    };
    
    console.log('[DASHBOARD_DATA] 响应数据统计:');
    console.log(`  - stats: ${Object.keys(stats || {}).length} 个字段`);
    console.log(`  - recentTravels: ${recentTravels?.length || 0} 条`);
    console.log(`  - recentExpenses: ${recentExpenses?.length || 0} 条`);
    console.log(`  - monthlySpending: ${monthlySpending?.length || 0} 条`);
    console.log(`  - categoryBreakdown: ${categoryBreakdown?.length || 0} 条`);
    console.log(`  - pendingTasks: ${pendingTasks?.length || 0} 条`);
    console.log(`  - countryTravelData: ${countryTravelData?.length || 0} 条`);
    
    // 禁用缓存，确保每次请求都执行服务器端逻辑
    res.set({
      'Cache-Control': 'no-store, no-cache, must-revalidate, private',
      'Pragma': 'no-cache',
      'Expires': '0',
      'ETag': false
    });
    
    console.log('[DASHBOARD_DATA] ========== 发送响应 ==========');
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
      totalExpenses: 0,
      countryCount: 0
    };
  }
  
  // 使用UTC时间计算月份，避免时区问题
  const now = new Date();
  const year = now.getUTCFullYear();
  const month = now.getUTCMonth();
  const currentMonth = new Date(Date.UTC(year, month, 1, 0, 0, 0, 0));
  const lastMonth = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0, 0));
  const nextMonth = new Date(Date.UTC(year, month + 1, 1, 0, 0, 0, 0));

  console.log('[DASHBOARD_STATS] Date ranges:', {
    now: now.toISOString(),
    currentMonth: currentMonth.toISOString(),
    lastMonth: lastMonth.toISOString(),
    nextMonth: nextMonth.toISOString(),
    expenseQuery: JSON.stringify(expenseQueryForAggregate, null, 2)
  });

  // 分别查询当前月和上月的费用，确保日期比较正确
  const [
    totalTravelRequests,
    pendingApprovals,
    approvedRequests,
    currentMonthSpendingData,
    lastMonthSpendingData,
    totalExpenses,
    countryCount
  ] = await Promise.all([
    Travel.countDocuments(travelQuery),
    Travel.countDocuments({ ...travelQuery, status: 'submitted' }),
    Travel.countDocuments({ ...travelQuery, status: 'approved' }),
    // 当前月支出
    Expense.aggregate([
      { 
        $match: Object.assign({}, expenseQueryForAggregate, { 
          date: { $gte: currentMonth, $lt: nextMonth }
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
        $match: Object.assign({}, expenseQueryForAggregate, { 
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
    Expense.countDocuments(expenseQuery),
    // 查询地理位置覆盖的国家数量（不重复的国家）
    Location.distinct('country', { status: 'active', country: { $exists: true, $ne: null, $ne: '' } })
  ]);

  // 从聚合结果中提取总额
  const currentMonthTotal = currentMonthSpendingData[0]?.total || 0;
  const lastMonthTotal = lastMonthSpendingData[0]?.total || 0;
  const spendingTrend = lastMonthTotal > 0 
    ? ((currentMonthTotal - lastMonthTotal) / lastMonthTotal * 100).toFixed(1)
    : 0;

  console.log('[DASHBOARD_STATS] Monthly spending results:', {
    currentMonthTotal,
    lastMonthTotal,
    spendingTrend,
    currentMonthData: currentMonthSpendingData,
    lastMonthData: lastMonthSpendingData
  });

  return {
    totalTravelRequests,
    pendingApprovals,
    approvedRequests,
    monthlySpending: currentMonthTotal,
    spendingTrend: parseFloat(spendingTrend),
    totalExpenses,
    countryCount: countryCount ? countryCount.length : 0
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
          $project: {
            date: 1,
            amount: 1,
            category: 1
          }
        },
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
            $project: {
              date: 1,
              amount: 1
            }
          },
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
          {
            $project: {
              category: 1,
              amount: 1
            }
          },
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

async function getPendingTasksData(userId, userRole, travelQuery = null) {
  const tasks = [];

  // 如果有数据权限查询条件，使用它；否则使用默认查询
  const baseTravelQuery = travelQuery || {};

  if (userRole === 'admin' || userRole === 'manager') {
    // 使用数据权限查询条件（如果有）
    const pendingTravels = await Travel.countDocuments({ 
      ...baseTravelQuery, 
      status: 'submitted' 
    });
    if (pendingTravels > 0) {
      tasks.push({
        type: 'approval',
        title: '待审批差旅',
        count: pendingTravels,
        priority: 'high'
      });
    }
  }

  // 用户自己的草稿（不受数据权限限制，因为查询条件中已经包含 employee）
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

/**
 * 获取按国家统计的出差数量占比数据（优化版本：使用聚合管道减少数据库往返）
 */
async function getCountryTravelData(travelQuery) {
  try {
    console.log('[COUNTRY_TRAVEL_DATA] 开始查询国家差旅数据...');
    const startTime = Date.now();
    
    // 第一步：使用聚合管道处理 ObjectId 类型的目的地（最优化路径）
    const objectIdPipeline = [
      // 匹配符合条件的差旅记录
      { $match: travelQuery },
      
      // 展开所有目的地到一个数组中（只处理 ObjectId 类型）
      {
        $project: {
          destinations: {
            $filter: {
              input: {
                $concatArrays: [
                  // 主目的地（只保留 ObjectId）
                  {
                    $cond: [
                      { $and: [{ $ne: ['$destination', null] }, { $eq: [{ $type: '$destination' }, 'objectId'] }] },
                      ['$destination'],
                      []
                    ]
                  },
                  // 去程目的地
                  {
                    $cond: [
                      {
                        $and: [
                          { $ne: ['$outbound', null] },
                          { $ne: ['$outbound.destination', null] },
                          { $eq: [{ $type: '$outbound.destination' }, 'objectId'] }
                        ]
                      },
                      ['$outbound.destination'],
                      []
                    ]
                  },
                  // 返程目的地
                  {
                    $cond: [
                      {
                        $and: [
                          { $ne: ['$inbound', null] },
                          { $ne: ['$inbound.destination', null] },
                          { $eq: [{ $type: '$inbound.destination' }, 'objectId'] }
                        ]
                      },
                      ['$inbound.destination'],
                      []
                    ]
                  },
                  // 多程目的地
                  {
                    $cond: [
                      {
                        $and: [
                          { $ne: ['$multiCityRoutes', null] },
                          { $gt: [{ $size: { $ifNull: ['$multiCityRoutes', []] } }, 0] }
                        ]
                      },
                      {
                        $map: {
                          input: {
                            $filter: {
                              input: '$multiCityRoutes',
                              as: 'route',
                              cond: {
                                $and: [
                                  { $ne: ['$$route.destination', null] },
                                  { $eq: [{ $type: '$$route.destination' }, 'objectId'] }
                                ]
                              }
                            }
                          },
                          as: 'route',
                          in: '$$route.destination'
                        }
                      },
                      []
                    ]
                  }
                ]
              },
              as: 'dest',
              cond: { $ne: ['$$dest', null] }
            }
          }
        }
      },
      
      // 展开目的地数组
      { $unwind: '$destinations' },
      
      // 关联 Location 表获取国家信息
      {
        $lookup: {
          from: 'locations',
          localField: 'destinations',
          foreignField: '_id',
          as: 'location'
        }
      },
      
      // 提取国家信息
      {
        $project: {
          country: {
            $cond: [
              { $gt: [{ $size: '$location' }, 0] },
              { $arrayElemAt: ['$location.country', 0] },
              null
            ]
          }
        }
      },
      
      // 过滤掉没有国家的记录
      { $match: { country: { $ne: null, $exists: true } } },
      
      // 按国家分组统计
      {
        $group: {
          _id: '$country',
          count: { $sum: 1 }
        }
      }
    ];

    // 第二步：处理字符串类型的目的地（需要单独处理）
    const stringPipeline = [
      { $match: travelQuery },
      {
        $project: {
          destinations: {
            $filter: {
              input: {
                $concatArrays: [
                  // 主目的地（只保留字符串）
                  {
                    $cond: [
                      { $and: [{ $ne: ['$destination', null] }, { $eq: [{ $type: '$destination' }, 'string'] }] },
                      ['$destination'],
                      []
                    ]
                  },
                  // 去程目的地
                  {
                    $cond: [
                      {
                        $and: [
                          { $ne: ['$outbound', null] },
                          { $ne: ['$outbound.destination', null] },
                          { $eq: [{ $type: '$outbound.destination' }, 'string'] }
                        ]
                      },
                      ['$outbound.destination'],
                      []
                    ]
                  },
                  // 返程目的地
                  {
                    $cond: [
                      {
                        $and: [
                          { $ne: ['$inbound', null] },
                          { $ne: ['$inbound.destination', null] },
                          { $eq: [{ $type: '$inbound.destination' }, 'string'] }
                        ]
                      },
                      ['$inbound.destination'],
                      []
                    ]
                  },
                  // 多程目的地
                  {
                    $cond: [
                      {
                        $and: [
                          { $ne: ['$multiCityRoutes', null] },
                          { $gt: [{ $size: { $ifNull: ['$multiCityRoutes', []] } }, 0] }
                        ]
                      },
                      {
                        $map: {
                          input: {
                            $filter: {
                              input: '$multiCityRoutes',
                              as: 'route',
                              cond: {
                                $and: [
                                  { $ne: ['$$route.destination', null] },
                                  { $eq: [{ $type: '$$route.destination' }, 'string'] }
                                ]
                              }
                            }
                          },
                          as: 'route',
                          in: '$$route.destination'
                        }
                      },
                      []
                    ]
                  }
                ]
              },
              as: 'dest',
              cond: { $ne: ['$$dest', null] }
            }
          }
        }
      },
      { $unwind: '$destinations' },
      {
        $project: {
          countryArray: {
            $cond: [
              {
                $gte: [
                  { $size: { $split: ['$destinations', ','] } },
                  2
                ]
              },
              { $split: ['$destinations', ','] },
              []
            ]
          }
        }
      },
      {
        $project: {
          country: {
            $cond: [
              { $gt: [{ $size: '$countryArray' }, 0] },
              {
                $trim: {
                  input: { $arrayElemAt: ['$countryArray', -1] }
                }
              },
              null
            ]
          }
        }
      },
      { $match: { country: { $ne: null, $exists: true } } },
      {
        $group: {
          _id: '$country',
          count: { $sum: 1 }
        }
      }
    ];

    // 并行执行两个聚合查询
    console.log('[COUNTRY_TRAVEL_DATA] 执行聚合查询...');
    const [objectIdResults, stringResults] = await Promise.all([
      Travel.aggregate(objectIdPipeline).allowDiskUse(true),
      Travel.aggregate(stringPipeline).allowDiskUse(true)
    ]);
    console.log(`[COUNTRY_TRAVEL_DATA] ObjectId结果: ${objectIdResults.length}, 字符串结果: ${stringResults.length}`);

    // 合并结果
    const countryCountMap = new Map();
    
    // 处理 ObjectId 结果
    objectIdResults.forEach(item => {
      if (item._id) {
        countryCountMap.set(item._id, (countryCountMap.get(item._id) || 0) + item.count);
      }
    });
    
    // 处理字符串结果
    stringResults.forEach(item => {
      if (item._id) {
        countryCountMap.set(item._id, (countryCountMap.get(item._id) || 0) + item.count);
      }
    });

    // 处理字符串目的地中无法从格式提取国家的情况（需要查询 Location）
    // 查询所有无法从格式提取的字符串目的地（格式不是"城市, 国家"）
    const unmatchedStringPipeline = [
      { $match: travelQuery },
      {
        $project: {
          destinations: {
            $filter: {
              input: {
                $concatArrays: [
                  {
                    $cond: [
                      {
                        $and: [
                          { $ne: ['$destination', null] },
                          { $eq: [{ $type: '$destination' }, 'string'] },
                          { $lt: [{ $size: { $split: ['$destination', ','] } }, 2] }
                        ]
                      },
                      ['$destination'],
                      []
                    ]
                  },
                  {
                    $cond: [
                      {
                        $and: [
                          { $ne: ['$outbound', null] },
                          { $ne: ['$outbound.destination', null] },
                          { $eq: [{ $type: '$outbound.destination' }, 'string'] },
                          { $lt: [{ $size: { $split: ['$outbound.destination', ','] } }, 2] }
                        ]
                      },
                      ['$outbound.destination'],
                      []
                    ]
                  },
                  {
                    $cond: [
                      {
                        $and: [
                          { $ne: ['$inbound', null] },
                          { $ne: ['$inbound.destination', null] },
                          { $eq: [{ $type: '$inbound.destination' }, 'string'] },
                          { $lt: [{ $size: { $split: ['$inbound.destination', ','] } }, 2] }
                        ]
                      },
                      ['$inbound.destination'],
                      []
                    ]
                  },
                  {
                    $cond: [
                      {
                        $and: [
                          { $ne: ['$multiCityRoutes', null] },
                          { $gt: [{ $size: { $ifNull: ['$multiCityRoutes', []] } }, 0] }
                        ]
                      },
                      {
                        $map: {
                          input: {
                            $filter: {
                              input: '$multiCityRoutes',
                              as: 'route',
                              cond: {
                                $and: [
                                  { $ne: ['$$route.destination', null] },
                                  { $eq: [{ $type: '$$route.destination' }, 'string'] },
                                  { $lt: [{ $size: { $split: ['$$route.destination', ','] } }, 2] }
                                ]
                              }
                            }
                          },
                          as: 'route',
                          in: '$$route.destination'
                        }
                      },
                      []
                    ]
                  }
                ]
              },
              as: 'dest',
              cond: { $ne: ['$$dest', null] }
            }
          }
        }
      },
      { $unwind: '$destinations' },
      {
        $group: {
          _id: null,
          destinations: { $addToSet: '$destinations' }
        }
      }
    ];

    console.log('[COUNTRY_TRAVEL_DATA] 处理未匹配的字符串目的地...');
    const unmatchedResult = await Travel.aggregate(unmatchedStringPipeline).allowDiskUse(true);
    
    if (unmatchedResult.length > 0 && unmatchedResult[0].destinations && unmatchedResult[0].destinations.length > 0) {
      const uniqueStringDests = unmatchedResult[0].destinations;
      console.log(`[COUNTRY_TRAVEL_DATA] 找到 ${uniqueStringDests.length} 个未匹配的字符串目的地`);
      
      // 限制查询数量，避免查询过多导致性能问题
      const limitedDests = uniqueStringDests.slice(0, 100);
      
      // 查询 Location 匹配这些字符串目的地
      const locationMatches = await Location.find({
        $or: limitedDests.map(dest => ({
          name: { $regex: dest.trim().split(',')[0], $options: 'i' }
        }))
      }).select('country name').limit(100).lean();

      // 创建名称到国家的映射
      const nameToCountryMap = new Map();
      locationMatches.forEach(loc => {
        if (loc.country) {
          nameToCountryMap.set(loc.name.toLowerCase(), loc.country);
        }
      });
      console.log(`[COUNTRY_TRAVEL_DATA] 创建了 ${nameToCountryMap.size} 个名称到国家的映射`);

      // 统计匹配到的国家（只处理限制后的目的地）
      limitedDests.forEach(dest => {
        const cityName = dest.trim().split(',')[0].toLowerCase();
        const country = nameToCountryMap.get(cityName);
        if (country) {
          countryCountMap.set(country, (countryCountMap.get(country) || 0) + 1);
        }
      });
      console.log(`[COUNTRY_TRAVEL_DATA] 处理未匹配字符串目的地完成，当前国家数量: ${countryCountMap.size}`);
    } else {
      console.log('[COUNTRY_TRAVEL_DATA] 没有未匹配的字符串目的地需要处理');
    }

    console.log(`[COUNTRY_TRAVEL_DATA] 合并后国家数量: ${countryCountMap.size}`);
    
    if (countryCountMap.size === 0) {
      console.log('[COUNTRY_TRAVEL_DATA] 没有找到国家数据，返回空数组');
      return [];
    }

    // 转换为数组并排序
    const countryStats = Array.from(countryCountMap.entries())
      .map(([country, count]) => ({ _id: country, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // 计算总数
    const total = countryStats.reduce((sum, item) => sum + item.count, 0);
    console.log(`[COUNTRY_TRAVEL_DATA] 前10个国家统计完成，总数: ${total}`);

    // 获取国家名称列表，用于查询英文名称
    const countryNames = countryStats.map(item => item._id);
    console.log(`[COUNTRY_TRAVEL_DATA] 查询 ${countryNames.length} 个国家的英文名称...`);

    // 一次性查询所有国家的英文名称
    const [countryLocations, allLocations] = await Promise.all([
      Location.find({
        type: 'country',
        name: { $in: countryNames }
      }).select('name enName').limit(20).lean(),
      Location.find({
        country: { $in: countryNames },
        enName: { $exists: true, $ne: null }
      }).select('country enName').limit(100).lean()
    ]);
    console.log(`[COUNTRY_TRAVEL_DATA] 找到 ${countryLocations.length} 个国家类型Location，${allLocations.length} 个其他Location`);

    // 创建国家名称到英文名称的映射
    const countryToEnNameMap = new Map();
    
    countryLocations.forEach(loc => {
      if (loc.name) {
        countryToEnNameMap.set(loc.name, loc.enName || loc.name);
      }
    });
    
    allLocations.forEach(loc => {
      if (loc.country && loc.enName && !countryToEnNameMap.has(loc.country)) {
        countryToEnNameMap.set(loc.country, loc.enName);
      }
    });

    // 转换为图表数据格式
    const countryData = countryStats.map((item, index) => {
      const country = item._id;
      let enName = countryToEnNameMap.get(country);
      if (!enName || enName === country) {
        enName = COUNTRY_NAME_MAP[country] || country;
      }
      return {
        name: country,
        enName: enName,
        value: Math.round((item.count / total) * 100 * 100) / 100,
        count: item.count,
        color: COLORS[index % COLORS.length]
      };
    });

    const totalTime = Date.now() - startTime;
    console.log(`[COUNTRY_TRAVEL_DATA] 查询完成，耗时: ${totalTime}ms，返回 ${countryData.length} 个国家`);
    return countryData;
  } catch (error) {
    console.error('[COUNTRY_TRAVEL_DATA] Error:', error);
    console.error('[COUNTRY_TRAVEL_DATA] Error stack:', error.stack);
    // 返回空数组而不是抛出错误，避免影响整个dashboard
    return [];
  }
}

