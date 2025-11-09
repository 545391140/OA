const Travel = require('../models/Travel');
const Expense = require('../models/Expense');
const User = require('../models/User');

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

    // 根据角色确定查询条件
    const travelQuery = userRole === 'admin' ? {} : { user: userId };
    const expenseQuery = userRole === 'admin' ? {} : { employee: userId };

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
      Expense.countDocuments({ ...expenseQuery, status: 'pending' })
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

    const query = userRole === 'admin' ? {} : { user: userId };

    const recentTravels = await Travel.find(query)
      .sort({ createdAt: -1 })
      .limit(limit)
      .select('title destination startDate endDate status purpose estimatedBudget')
      .populate('user', 'firstName lastName email')
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

    const query = userRole === 'admin' ? {} : { employee: userId };

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
    const userId = req.user.id;
    const userRole = req.user.role;
    const months = parseInt(req.query.months) || 6;

    const query = userRole === 'admin' ? {} : { employee: userId };

    // 计算起始日期（往前N个月）
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - months);
    startDate.setDate(1);
    startDate.setHours(0, 0, 0, 0);

    const monthlyData = await Expense.aggregate([
      {
        $match: Object.assign({}, query, {
          date: { $gte: startDate }
        })
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

    // 格式化数据
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const formattedData = monthlyData.map(item => ({
      month: monthNames[item._id.month - 1],
      year: item._id.year,
      amount: parseFloat(item.total.toFixed(2)),
      count: item.count
    }));

    res.json({
      success: true,
      data: formattedData
    });
  } catch (error) {
    console.error('Get monthly spending error:', error);
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

    const query = userRole === 'admin' ? {} : { employee: userId };

    // 计算时间范围
    const startDate = new Date();
    if (period === 'month') {
      startDate.setMonth(startDate.getMonth() - 1);
    } else if (period === 'quarter') {
      startDate.setMonth(startDate.getMonth() - 3);
    } else if (period === 'year') {
      startDate.setFullYear(startDate.getFullYear() - 1);
    }

    const categoryData = await Expense.aggregate([
      {
        $match: Object.assign({}, query, {
          date: { $gte: startDate }
        })
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

    // 定义类别颜色
    const categoryColors = {
      flight: '#8884d8',
      accommodation: '#82ca9d',
      meal: '#ffc658',
      transport: '#ff7300',
      other: '#a4de6c',
      default: '#d0d0d0'
    };

    // 格式化数据
    const formattedData = categoryData.map(item => ({
      name: item._id || 'Other',
      value: parseFloat(item.total.toFixed(2)),
      count: item.count,
      percentage: totalAmount > 0 ? ((item.total / totalAmount) * 100).toFixed(1) : 0,
      color: categoryColors[item._id] || categoryColors.default
    }));

    res.json({
      success: true,
      data: formattedData,
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

      const pendingExpenses = await Expense.countDocuments({ status: 'pending' });
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
    const draftTravels = await Travel.countDocuments({ user: userId, status: 'draft' });
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
      user: userId,
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

    // 并行获取所有数据
    const [stats, recentTravels, recentExpenses, monthlySpending, categoryBreakdown, pendingTasks] = await Promise.all([
      // 复用上面的逻辑
      getDashboardStatsData(userId, userRole),
      getRecentTravelsData(userId, userRole, 5),
      getRecentExpensesData(userId, userRole, 5),
      getMonthlySpendingData(userId, userRole, 6),
      getCategoryBreakdownData(userId, userRole, 'month'),
      getPendingTasksData(userId, userRole)
    ]);

    res.json({
      success: true,
      data: {
        stats,
        recentTravels,
        recentExpenses,
        monthlySpending,
        categoryBreakdown,
        pendingTasks
      }
    });
  } catch (error) {
    console.error('Get dashboard data error:', error);
    res.status(500).json({
      success: false,
      message: '获取Dashboard数据失败',
      error: error.message
    });
  }
};

// 辅助函数（内部使用）
async function getDashboardStatsData(userId, userRole) {
  const travelQuery = userRole === 'admin' ? {} : { user: userId };
  const expenseQuery = userRole === 'admin' ? {} : { employee: userId };
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
      { $match: Object.assign({}, expenseQuery, { date: { $gte: currentMonth } }) },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]),
    Expense.aggregate([
      { $match: Object.assign({}, expenseQuery, { date: { $gte: lastMonth, $lt: currentMonth } }) },
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
  const query = userRole === 'admin' ? {} : { user: userId };
  return await Travel.find(query)
    .sort({ createdAt: -1 })
    .limit(limit)
    .select('title destination startDate endDate status')
    .lean();
}

async function getRecentExpensesData(userId, userRole, limit) {
  const query = userRole === 'admin' ? {} : { employee: userId };
  return await Expense.find(query)
    .sort({ date: -1 })
    .limit(limit)
    .select('title description amount category date status')
    .lean();
}

async function getMonthlySpendingData(userId, userRole, months) {
  const query = userRole === 'admin' ? {} : { employee: userId };
  const startDate = new Date();
  startDate.setMonth(startDate.getMonth() - months);
  startDate.setDate(1);

  const monthlyData = await Expense.aggregate([
    { $match: Object.assign({}, query, { date: { $gte: startDate } }) },
    {
      $group: {
        _id: { year: { $year: '$date' }, month: { $month: '$date' } },
        total: { $sum: '$amount' }
      }
    },
    { $sort: { '_id.year': 1, '_id.month': 1 } }
  ]);

  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return monthlyData.map(item => ({
    month: monthNames[item._id.month - 1],
    amount: parseFloat(item.total.toFixed(2))
  }));
}

async function getCategoryBreakdownData(userId, userRole, period) {
  const query = userRole === 'admin' ? {} : { employee: userId };
  const startDate = new Date();
  startDate.setMonth(startDate.getMonth() - 1);

  const categoryData = await Expense.aggregate([
    { $match: Object.assign({}, query, { date: { $gte: startDate } }) },
    { $group: { _id: '$category', total: { $sum: '$amount' } } },
    { $sort: { total: -1 } }
  ]);

  const categoryColors = {
    flight: '#8884d8',
    accommodation: '#82ca9d',
    meal: '#ffc658',
    transport: '#ff7300',
    other: '#a4de6c'
  };

  const totalAmount = categoryData.reduce((sum, item) => sum + item.total, 0);

  return categoryData.map(item => ({
    name: item._id || 'Other',
    value: parseFloat(((item.total / totalAmount) * 100).toFixed(1)),
    color: categoryColors[item._id] || '#d0d0d0'
  }));
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

  const draftTravels = await Travel.countDocuments({ user: userId, status: 'draft' });
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

