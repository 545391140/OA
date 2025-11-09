const express = require('express');
const { protect } = require('../middleware/auth');
const Travel = require('../models/Travel');
const Expense = require('../models/Expense');
const User = require('../models/User');
const mongoose = require('mongoose');

const router = express.Router();

// @desc    Get departments list
// @route   GET /api/reports/departments
// @access  Private
router.get('/departments', protect, async (req, res) => {
  try {
    const departments = await User.distinct('department');
    res.json({
      success: true,
      data: departments.filter(d => d && d.trim())
    });
  } catch (error) {
    console.error('Get departments error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @desc    Get dashboard reports
// @route   GET /api/reports/dashboard
// @access  Private
router.get('/dashboard', protect, async (req, res) => {
  try {
    // Mock dashboard data - replace with actual implementation
    const dashboardData = {
      stats: {
        totalTravelRequests: 12,
        pendingApprovals: 3,
        monthlySpending: 2450.50,
        approvedRequests: 8
      },
      recentTravel: [
        { id: 1, title: 'Business Trip to Tokyo', status: 'approved', date: '2024-01-15' },
        { id: 2, title: 'Client Meeting in Seoul', status: 'pending', date: '2024-01-20' },
        { id: 3, title: 'Conference in Singapore', status: 'draft', date: '2024-01-25' }
      ],
      recentExpenses: [
        { id: 1, description: 'Hotel accommodation', amount: 450.00, category: 'accommodation', date: '2024-01-15' },
        { id: 2, description: 'Flight ticket', amount: 320.00, category: 'transportation', date: '2024-01-14' },
        { id: 3, description: 'Business dinner', amount: 85.50, category: 'meals', date: '2024-01-13' }
      ],
      monthlySpending: [
        { month: 'Jan', amount: 2450.50 },
        { month: 'Feb', amount: 1890.25 },
        { month: 'Mar', amount: 3200.75 },
        { month: 'Apr', amount: 2100.00 },
        { month: 'May', amount: 2750.30 },
        { month: 'Jun', amount: 1980.45 }
      ],
      categoryBreakdown: [
        { name: 'Transportation', value: 35, color: '#8884d8' },
        { name: 'Accommodation', value: 30, color: '#82ca9d' },
        { name: 'Meals', value: 20, color: '#ffc658' },
        { name: 'Other', value: 15, color: '#ff7300' }
      ]
    };

    res.json({
      success: true,
      data: dashboardData
    });
  } catch (error) {
    console.error('Get dashboard reports error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @desc    Get comprehensive reports
// @route   GET /api/reports/comprehensive
// @access  Private
router.get('/comprehensive', protect, async (req, res) => {
  try {
    const { startDate, endDate, department } = req.query;
    
    // 构建日期查询条件
    const dateMatch = {};
    if (startDate || endDate) {
      dateMatch.createdAt = {};
      if (startDate) {
        dateMatch.createdAt.$gte = new Date(startDate + 'T00:00:00.000Z');
      }
      if (endDate) {
        dateMatch.createdAt.$lte = new Date(endDate + 'T23:59:59.999Z');
      }
    }

    // 构建部门查询条件
    const departmentMatch = {};
    if (department && department !== 'all') {
      departmentMatch['employee.department'] = department;
    }

    // 1. 汇总统计
    const summary = await getSummaryStats(dateMatch, departmentMatch);
    
    // 2. 月度数据
    const monthlyData = await getMonthlyData(dateMatch, departmentMatch);
    
    // 3. 类别数据
    const categoryData = await getCategoryData(dateMatch, departmentMatch);
    
    // 4. 部门数据
    const departmentData = await getDepartmentData(dateMatch);
    
    // 5. 差旅数据
    const travelData = await getTravelData(dateMatch, departmentMatch);
    
    // 6. 费用数据
    const expenseData = await getExpenseData(dateMatch, departmentMatch);

    res.json({
      success: true,
      data: {
        summary,
        monthlyData,
        categoryData,
        departmentData,
        travelData,
        expenseData
      }
    });
  } catch (error) {
    console.error('Get comprehensive reports error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// @desc    Get expense reports
// @route   GET /api/reports/expenses
// @access  Private
router.get('/expenses', protect, async (req, res) => {
  try {
    const { startDate, endDate, category, department } = req.query;

    const match = {};
    if (startDate || endDate) {
      match.createdAt = {};
      if (startDate) match.createdAt.$gte = new Date(startDate + 'T00:00:00.000Z');
      if (endDate) match.createdAt.$lte = new Date(endDate + 'T23:59:59.999Z');
    }
    if (category && category !== 'all') {
      match.category = category;
    }

    // 查询费用数据
    const expenses = await Expense.find(match)
      .populate('employee', 'firstName lastName department')
      .lean();

    // 部门筛选
    let filteredExpenses = expenses;
    if (department && department !== 'all') {
      filteredExpenses = expenses.filter(e => 
        e.employee?.department === department
      );
    }

    // 计算汇总
    const totalAmount = filteredExpenses.reduce((sum, e) => sum + (e.amount || 0), 0);
    const totalExpenses = filteredExpenses.length;
    const averageAmount = totalExpenses > 0 ? totalAmount / totalExpenses : 0;

    // 类别汇总
    const categorySummary = {};
    filteredExpenses.forEach(expense => {
      const cat = expense.category || 'other';
      if (!categorySummary[cat]) {
        categorySummary[cat] = { category: cat, count: 0, total: 0 };
      }
      categorySummary[cat].count++;
      categorySummary[cat].total += expense.amount || 0;
    });

    res.json({
      success: true,
      data: {
        summary: {
          totalAmount,
          totalExpenses,
          averageAmount
        },
        expenses: filteredExpenses.slice(0, 100).map(e => ({
          id: e._id,
          date: e.date || e.createdAt,
          description: e.description || e.title,
          category: e.category,
          amount: e.amount,
          employee: e.employee ? `${e.employee.firstName} ${e.employee.lastName}` : 'Unknown',
          department: e.employee?.department || 'Unknown'
        })),
        categorySummary: Object.values(categorySummary)
      }
    });
  } catch (error) {
    console.error('Get expense reports error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// 辅助函数：获取汇总统计
async function getSummaryStats(dateMatch, departmentMatch) {
  const travelMatch = { ...dateMatch };
  const expenseMatch = { ...dateMatch };

  // 差旅统计
  const travelPipeline = [
    { $match: travelMatch },
    {
      $lookup: {
        from: 'users',
        localField: 'employee',
        foreignField: '_id',
        as: 'employee'
      }
    },
    { $unwind: { path: '$employee', preserveNullAndEmptyArrays: true } },
    { $match: departmentMatch },
    {
      $group: {
        _id: null,
        totalTravel: { $sum: { $ifNull: ['$estimatedBudget', '$estimatedCost', 0] } },
        totalTravelCount: { $sum: 1 }
      }
    }
  ];

  const travelStats = await Travel.aggregate(travelPipeline);
  const totalTravel = travelStats[0]?.totalTravel || 0;
  const totalTravelCount = travelStats[0]?.totalTravelCount || 0;

  // 费用统计
  const expensePipeline = [
    { $match: expenseMatch },
    {
      $lookup: {
        from: 'users',
        localField: 'employee',
        foreignField: '_id',
        as: 'employee'
      }
    },
    { $unwind: { path: '$employee', preserveNullAndEmptyArrays: true } },
    { $match: departmentMatch },
    {
      $group: {
        _id: null,
        totalExpenses: { $sum: { $ifNull: ['$amount', 0] } },
        totalExpenseCount: { $sum: 1 }
      }
    }
  ];

  const expenseStats = await Expense.aggregate(expensePipeline);
  const totalExpenses = expenseStats[0]?.totalExpenses || 0;

  // 待审批统计
  const pendingApprovals = await Travel.countDocuments({
    ...travelMatch,
    status: 'submitted'
  });

  // 计算审批率
  const totalTravelRequests = await Travel.countDocuments(travelMatch);
  const approvedTravelRequests = await Travel.countDocuments({
    ...travelMatch,
    status: 'approved'
  });
  const approvalRate = totalTravelRequests > 0 
    ? (approvedTravelRequests / totalTravelRequests * 100) 
    : 0;

  // 计算月度趋势（与上个月比较）
  const now = new Date();
  const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);

  const currentMonthExpenses = await Expense.aggregate([
    { $match: { createdAt: { $gte: currentMonthStart }, ...expenseMatch } },
    { $group: { _id: null, total: { $sum: { $ifNull: ['$amount', 0] } } } }
  ]);

  const lastMonthExpenses = await Expense.aggregate([
    { $match: { createdAt: { $gte: lastMonthStart, $lte: lastMonthEnd }, ...expenseMatch } },
    { $group: { _id: null, total: { $sum: { $ifNull: ['$amount', 0] } } } }
  ]);

  const currentTotal = currentMonthExpenses[0]?.total || 0;
  const lastTotal = lastMonthExpenses[0]?.total || 0;
  const monthlyTrend = lastTotal > 0 ? ((currentTotal - lastTotal) / lastTotal * 100) : 0;

  // 计算审批率趋势（与上个月比较）
  const currentMonthApproved = await Travel.countDocuments({
    ...travelMatch,
    createdAt: { $gte: currentMonthStart },
    status: 'approved'
  });
  const currentMonthTotal = await Travel.countDocuments({
    ...travelMatch,
    createdAt: { $gte: currentMonthStart }
  });
  const currentMonthApprovalRate = currentMonthTotal > 0 
    ? (currentMonthApproved / currentMonthTotal * 100) 
    : 0;

  const lastMonthApproved = await Travel.countDocuments({
    ...travelMatch,
    createdAt: { $gte: lastMonthStart, $lte: lastMonthEnd },
    status: 'approved'
  });
  const lastMonthTotal = await Travel.countDocuments({
    ...travelMatch,
    createdAt: { $gte: lastMonthStart, $lte: lastMonthEnd }
  });
  const lastMonthApprovalRate = lastMonthTotal > 0 
    ? (lastMonthApproved / lastMonthTotal * 100) 
    : 0;

  const approvalRateTrend = lastMonthApprovalRate > 0 
    ? ((currentMonthApprovalRate - lastMonthApprovalRate) / lastMonthApprovalRate * 100) 
    : 0;

  return {
    totalExpenses,
    totalTravel,
    pendingApprovals,
    approvalRate: parseFloat(approvalRate.toFixed(1)),
    monthlyTrend: parseFloat(monthlyTrend.toFixed(2)),
    approvalRateTrend: parseFloat(approvalRateTrend.toFixed(2))
  };
}

// 辅助函数：获取月度数据
async function getMonthlyData(dateMatch, departmentMatch) {
  // 差旅数据聚合
  const travelPipeline = [
    { $match: dateMatch },
    {
      $lookup: {
        from: 'users',
        localField: 'employee',
        foreignField: '_id',
        as: 'employee'
      }
    },
    { $unwind: { path: '$employee', preserveNullAndEmptyArrays: true } },
    { $match: departmentMatch },
    {
      $group: {
        _id: {
          year: { $year: '$createdAt' },
          month: { $month: '$createdAt' }
        },
        travel: { $sum: { $ifNull: ['$estimatedBudget', '$estimatedCost', 0] } },
        approved: {
          $sum: { $cond: [{ $eq: ['$status', 'approved'] }, 1, 0] }
        },
        pending: {
          $sum: { $cond: [{ $eq: ['$status', 'submitted'] }, 1, 0] }
        }
      }
    },
    { $sort: { '_id.year': 1, '_id.month': 1 } },
    { $limit: 12 }
  ];

  const travelData = await Travel.aggregate(travelPipeline);
  
  // 费用数据聚合
  const expensePipeline = [
    { $match: dateMatch },
    {
      $lookup: {
        from: 'users',
        localField: 'employee',
        foreignField: '_id',
        as: 'employee'
      }
    },
    { $unwind: { path: '$employee', preserveNullAndEmptyArrays: true } },
    { $match: departmentMatch },
    {
      $group: {
        _id: {
          year: { $year: '$createdAt' },
          month: { $month: '$createdAt' }
        },
        expenses: { $sum: { $ifNull: ['$amount', 0] } }
      }
    },
    { $sort: { '_id.year': 1, '_id.month': 1 } },
    { $limit: 12 }
  ];

  const expenseData = await Expense.aggregate(expensePipeline);

  // 合并数据
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const monthlyMap = {};

  // 先处理差旅数据
  travelData.forEach(item => {
    const key = `${item._id.year}-${item._id.month}`;
    monthlyMap[key] = {
      month: monthNames[item._id.month - 1],
      travel: item.travel || 0,
      approved: item.approved || 0,
      pending: item.pending || 0,
      expenses: 0
    };
  });

  // 再处理费用数据
  expenseData.forEach(item => {
    const key = `${item._id.year}-${item._id.month}`;
    if (!monthlyMap[key]) {
      monthlyMap[key] = {
        month: monthNames[item._id.month - 1],
        travel: 0,
        approved: 0,
        pending: 0,
        expenses: 0
      };
    }
    monthlyMap[key].expenses = item.expenses || 0;
  });

  // 按时间排序
  return Object.values(monthlyMap).sort((a, b) => {
    const monthOrder = monthNames.indexOf(a.month) - monthNames.indexOf(b.month);
    return monthOrder;
  });
}

// 辅助函数：获取类别数据
async function getCategoryData(dateMatch, departmentMatch) {
  const pipeline = [
    { $match: dateMatch },
    {
      $lookup: {
        from: 'users',
        localField: 'employee',
        foreignField: '_id',
        as: 'employee'
      }
    },
    { $unwind: { path: '$employee', preserveNullAndEmptyArrays: true } },
    { $match: departmentMatch },
    {
      $group: {
        _id: '$category',
        value: { $sum: { $ifNull: ['$amount', 0] } },
        count: { $sum: 1 }
      }
    },
    { $sort: { value: -1 } }
  ];

  const categoryData = await Expense.aggregate(pipeline);
  
  const categoryMap = {
    transportation: 'Transportation',
    accommodation: 'Accommodation',
    meals: 'Meals',
    entertainment: 'Entertainment',
    communication: 'Communication',
    office_supplies: 'Office Supplies',
    training: 'Training',
    other: 'Other'
  };

  return categoryData.map(item => ({
    name: categoryMap[item._id] || item._id,
    value: item.value || 0,
    count: item.count || 0
  }));
}

// 辅助函数：获取部门数据
async function getDepartmentData(dateMatch) {
  // 费用数据聚合
  const expensePipeline = [
    { $match: dateMatch },
    {
      $lookup: {
        from: 'users',
        localField: 'employee',
        foreignField: '_id',
        as: 'employee'
      }
    },
    { $unwind: { path: '$employee', preserveNullAndEmptyArrays: true } },
    {
      $group: {
        _id: { $ifNull: ['$employee.department', 'Unknown'] },
        expenses: { $sum: { $ifNull: ['$amount', 0] } },
        count: { $sum: 1 }
      }
    }
  ];

  // 差旅数据聚合
  const travelPipeline = [
    { $match: dateMatch },
    {
      $lookup: {
        from: 'users',
        localField: 'employee',
        foreignField: '_id',
        as: 'employee'
      }
    },
    { $unwind: { path: '$employee', preserveNullAndEmptyArrays: true } },
    {
      $group: {
        _id: { $ifNull: ['$employee.department', 'Unknown'] },
        travel: { $sum: { $ifNull: ['$estimatedBudget', '$estimatedCost', 0] } },
        count: { $sum: 1 }
      }
    }
  ];

  const expenseData = await Expense.aggregate(expensePipeline);
  const travelData = await Travel.aggregate(travelPipeline);

  // 合并部门数据
  const deptMap = {};
  
  expenseData.forEach(item => {
    const dept = item._id || 'Unknown';
    if (!deptMap[dept]) {
      deptMap[dept] = { department: dept, expenses: 0, travel: 0, count: 0 };
    }
    deptMap[dept].expenses = item.expenses || 0;
    deptMap[dept].count += item.count || 0;
  });

  travelData.forEach(item => {
    const dept = item._id || 'Unknown';
    if (!deptMap[dept]) {
      deptMap[dept] = { department: dept, expenses: 0, travel: 0, count: 0 };
    }
    deptMap[dept].travel = item.travel || 0;
    deptMap[dept].count += item.count || 0;
  });

  // 按费用总额排序
  return Object.values(deptMap).sort((a, b) => (b.expenses + b.travel) - (a.expenses + a.travel));
}

// 辅助函数：获取差旅数据
async function getTravelData(dateMatch, departmentMatch) {
  const pipeline = [
    { $match: dateMatch },
    {
      $lookup: {
        from: 'users',
        localField: 'employee',
        foreignField: '_id',
        as: 'employee'
      }
    },
    { $unwind: { path: '$employee', preserveNullAndEmptyArrays: true } },
    { $match: departmentMatch },
    {
      $group: {
        _id: {
          $ifNull: [
            { $ifNull: ['$destination.city', '$destination.name'] },
            { $ifNull: ['$destination', 'Unknown'] }
          ]
        },
        trips: { $sum: 1 },
        cost: { $sum: { $ifNull: ['$estimatedBudget', '$estimatedCost', 0] } }
      }
    },
    {
      $addFields: {
        avgCost: { $divide: ['$cost', '$trips'] }
      }
    },
    { $sort: { cost: -1 } },
    { $limit: 10 }
  ];

  const travelData = await Travel.aggregate(pipeline);

  return travelData.map(item => ({
    destination: item._id || 'Unknown',
    trips: item.trips || 0,
    cost: item.cost || 0,
    avgCost: item.avgCost || 0
  }));
}

// 辅助函数：获取费用数据
async function getExpenseData(dateMatch, departmentMatch) {
  const pipeline = [
    { $match: dateMatch },
    {
      $lookup: {
        from: 'users',
        localField: 'employee',
        foreignField: '_id',
        as: 'employee'
      }
    },
    { $unwind: { path: '$employee', preserveNullAndEmptyArrays: true } },
    { $match: departmentMatch },
    {
      $group: {
        _id: { $ifNull: ['$vendor', 'Unknown'] },
        amount: { $sum: { $ifNull: ['$amount', 0] } },
        count: { $sum: 1 },
        category: { $first: '$category' }
      }
    },
    { $sort: { amount: -1 } },
    { $limit: 10 }
  ];

  const expenseData = await Expense.aggregate(pipeline);

  const categoryMap = {
    transportation: 'Transportation',
    accommodation: 'Accommodation',
    meals: 'Meals',
    entertainment: 'Entertainment',
    communication: 'Communication',
    office_supplies: 'Office Supplies',
    training: 'Training',
    other: 'Other'
  };

  return expenseData.map(item => ({
    vendor: item._id || 'Unknown',
    amount: item.amount || 0,
    count: item.count || 0,
    category: categoryMap[item.category] || item.category || 'Other'
  }));
}

module.exports = router;
