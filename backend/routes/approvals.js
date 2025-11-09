const express = require('express');
const { protect } = require('../middleware/auth');
const Travel = require('../models/Travel');
const Expense = require('../models/Expense');
const User = require('../models/User');
const mongoose = require('mongoose');

const router = express.Router();

// @desc    Get pending approvals
// @route   GET /api/approvals
// @access  Private
router.get('/', protect, async (req, res) => {
  try {
    // Get travel requests pending approval
    const pendingTravels = await Travel.find({
      'approvals.approver': req.user.id,
      'approvals.status': 'pending'
    })
      .populate('employee', 'firstName lastName email')
      .populate('approvals.approver', 'firstName lastName email');

    // Get expenses pending approval
    const pendingExpenses = await Expense.find({
      'approvals.approver': req.user.id,
      'approvals.status': 'pending'
    })
      .populate('employee', 'firstName lastName email')
      .populate('travel', 'title destination');

    res.json({
      success: true,
      data: {
        travels: pendingTravels,
        expenses: pendingExpenses
      }
    });
  } catch (error) {
    console.error('Get approvals error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @desc    Approve/Reject travel request
// @route   PUT /api/approvals/travel/:id
// @access  Private
router.put('/travel/:id', protect, async (req, res) => {
  try {
    const { action, comments } = req.body;
    const travel = await Travel.findById(req.params.id);

    if (!travel) {
      return res.status(404).json({
        success: false,
        message: 'Travel request not found'
      });
    }

    // Find the approval record for this approver
    const approvalIndex = travel.approvals.findIndex(
      approval => String(approval.approver) === String(req.user.id) && approval.status === 'pending'
    );

    if (approvalIndex === -1) {
      return res.status(403).json({
        success: false,
        message: 'No pending approval found for this user'
      });
    }

    // Update approval status
    travel.approvals[approvalIndex].status = action === 'approve' ? 'approved' : 'rejected';
    travel.approvals[approvalIndex].approvedAt = new Date();
    if (comments) {
      travel.approvals[approvalIndex].comments = comments;
    }

    // Check if all approvals are completed
    const allApproved = travel.approvals.every(approval => 
      approval.status === 'approved' || approval.status === 'rejected'
    );

    if (allApproved) {
      const hasRejected = travel.approvals.some(approval => approval.status === 'rejected');
      travel.status = hasRejected ? 'rejected' : 'approved';
    }

    await travel.save();

    res.json({
      success: true,
      data: travel
    });
  } catch (error) {
    console.error('Approve travel error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @desc    Approve/Reject expense request
// @route   PUT /api/approvals/expense/:id
// @access  Private
router.put('/expense/:id', protect, async (req, res) => {
  try {
    const { action, comments } = req.body;
    const expense = await Expense.findById(req.params.id);

    if (!expense) {
      return res.status(404).json({
        success: false,
        message: 'Expense request not found'
      });
    }

    // Find the approval record for this approver
    const approvalIndex = expense.approvals.findIndex(
      approval => String(approval.approver) === String(req.user.id) && approval.status === 'pending'
    );

    if (approvalIndex === -1) {
      return res.status(403).json({
        success: false,
        message: 'No pending approval found for this user'
      });
    }

    // Update approval status
    expense.approvals[approvalIndex].status = action === 'approve' ? 'approved' : 'rejected';
    expense.approvals[approvalIndex].approvedAt = new Date();
    if (comments) {
      expense.approvals[approvalIndex].comments = comments;
    }

    // Check if all approvals are completed
    const allApproved = expense.approvals.every(approval => 
      approval.status === 'approved' || approval.status === 'rejected'
    );

    if (allApproved) {
      const hasRejected = expense.approvals.some(approval => approval.status === 'rejected');
      expense.status = hasRejected ? 'rejected' : 'approved';
    }

    await expense.save();

    res.json({
      success: true,
      data: expense
    });
  } catch (error) {
    console.error('Approve expense error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @desc    Get approval history
// @route   GET /api/approvals/history
// @access  Private
router.get('/history', protect, async (req, res) => {
  try {
    const approverId = req.user.id;
    const approverIdString = String(approverId);

    // Get travel approvals history
    const travelHistory = await Travel.find({
      'approvals.approver': { $in: [approverId, approverIdString] },
      'approvals.status': { $in: ['approved', 'rejected'] }
    })
      .populate('employee', 'firstName lastName email')
      .select('title travelNumber status estimatedCost currency startDate endDate destination createdAt approvals employee')
      .sort({ createdAt: -1 })
      .limit(50);

    // Get expense approvals history
    const expenseHistory = await Expense.find({
      'approvals.approver': { $in: [approverId, approverIdString] },
      'approvals.status': { $in: ['approved', 'rejected'] }
    })
      .populate('employee', 'firstName lastName email')
      .populate('travel', 'title destination')
      .select('title amount currency status date createdAt approvals employee travel')
      .sort({ createdAt: -1 })
      .limit(50);

    // Transform data to include approval details
    const transformHistory = (items, type) => {
      return items.flatMap(item => {
        return item.approvals
          .filter(approval => 
            (String(approval.approver) === approverIdString || String(approval.approver) === String(approverId)) &&
            (approval.status === 'approved' || approval.status === 'rejected')
          )
          .map(approval => ({
            id: item._id,
            type,
            title: item.title,
            number: item.travelNumber || item.expenseNumber,
            status: approval.status,
            approvedAt: approval.approvedAt,
            comments: approval.comments,
            amount: item.estimatedCost || item.amount,
            currency: item.currency,
            date: item.startDate || item.date,
            createdAt: item.createdAt,
            employee: item.employee,
            travel: item.travel
          }));
      }).sort((a, b) => new Date(b.approvedAt) - new Date(a.approvedAt));
    };

    res.json({
      success: true,
      data: {
        travels: transformHistory(travelHistory, 'travel'),
        expenses: transformHistory(expenseHistory, 'expense')
      }
    });
  } catch (error) {
    console.error('Get approval history error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @desc    Get approval statistics
// @route   GET /api/approvals/statistics
// @access  Private
router.get('/statistics', protect, async (req, res) => {
  try {
    const { startDate, endDate, type } = req.query;

    // 构建日期查询条件（UTC时间）
    const dateMatch = {};
    if (startDate) {
      dateMatch.$gte = new Date(startDate + 'T00:00:00.000Z');
    }
    if (endDate) {
      dateMatch.$lte = new Date(endDate + 'T23:59:59.999Z');
    }

    // 获取审批人ID（支持ObjectId和字符串格式）
    const approverId = req.user.id;
    const approverIdString = String(approverId);

    // 查询差旅统计数据
    const getTravelStats = async () => {
      // 第一步：匹配日期条件（如果有）
      const dateStage = Object.keys(dateMatch).length > 0 ? { $match: { createdAt: dateMatch } } : null;
      
      // 第二步：展开approvals数组
      // 第三步：匹配approver
      // 第四步：按status分组统计
      const pipeline = [];
      
      if (dateStage) {
        pipeline.push(dateStage);
      }
      
      pipeline.push(
        { $unwind: '$approvals' },
        {
          $match: {
            'approvals.approver': { $in: [approverId, approverIdString] }
          }
        },
        {
          $group: {
            _id: '$approvals.status',
            count: { $sum: 1 },
            totalAmount: {
              $sum: {
                $ifNull: [
                  { $ifNull: ['$estimatedBudget', '$estimatedCost'] },
                  0
                ]
              }
            },
            avgAmount: {
              $avg: {
                $ifNull: [
                  { $ifNull: ['$estimatedBudget', '$estimatedCost'] },
                  0
                ]
              }
            },
            totalApprovalTime: {
              $sum: {
                $cond: [
                  {
                    $and: [
                      { $ne: ['$approvals.approvedAt', null] },
                      { $ne: ['$createdAt', null] }
                    ]
                  },
                  {
                    $divide: [
                      { $subtract: ['$approvals.approvedAt', '$createdAt'] },
                      3600000
                    ]
                  },
                  0
                ]
              }
            },
            completedCount: {
              $sum: {
                $cond: [
                  { $in: ['$approvals.status', ['approved', 'rejected']] },
                  1,
                  0
                ]
              }
            }
          }
        }
      );

      const stats = await Travel.aggregate(pipeline);

      const result = {
        pending: 0,
        approved: 0,
        rejected: 0,
        total: 0,
        totalAmount: 0,
        avgAmount: 0,
        avgApprovalTime: 0,
        approvalRate: 0
      };

      stats.forEach(stat => {
        result[stat._id] = stat.count;
        result.total += stat.count;
        result.totalAmount += stat.totalAmount || 0;
      });

      const completedCount = stats.reduce((sum, stat) => sum + (stat.completedCount || 0), 0);
      const totalApprovalTime = stats.reduce((sum, stat) => sum + (stat.totalApprovalTime || 0), 0);

      if (result.total > 0) {
        result.avgAmount = result.totalAmount / result.total;
        result.avgApprovalTime = completedCount > 0 ? totalApprovalTime / completedCount : 0;
        result.approvalRate = parseFloat(((result.approved / result.total) * 100).toFixed(2));
      }

      return result;
    };

    // 查询费用统计数据
    const getExpenseStats = async () => {
      const dateStage = Object.keys(dateMatch).length > 0 ? { $match: { createdAt: dateMatch } } : null;
      
      const pipeline = [];
      
      if (dateStage) {
        pipeline.push(dateStage);
      }
      
      pipeline.push(
        { $unwind: '$approvals' },
        {
          $match: {
            'approvals.approver': { $in: [approverId, approverIdString] }
          }
        },
        {
          $group: {
            _id: '$approvals.status',
            count: { $sum: 1 },
            totalAmount: {
              $sum: {
                $ifNull: [
                  { $ifNull: ['$totalAmount', '$amount'] },
                  0
                ]
              }
            },
            avgAmount: {
              $avg: {
                $ifNull: [
                  { $ifNull: ['$totalAmount', '$amount'] },
                  0
                ]
              }
            },
            totalApprovalTime: {
              $sum: {
                $cond: [
                  {
                    $and: [
                      { $ne: ['$approvals.approvedAt', null] },
                      { $ne: ['$createdAt', null] }
                    ]
                  },
                  {
                    $divide: [
                      { $subtract: ['$approvals.approvedAt', '$createdAt'] },
                      3600000
                    ]
                  },
                  0
                ]
              }
            },
            completedCount: {
              $sum: {
                $cond: [
                  { $in: ['$approvals.status', ['approved', 'rejected']] },
                  1,
                  0
                ]
              }
            }
          }
        }
      );

      const stats = await Expense.aggregate(pipeline);

      const result = {
        pending: 0,
        approved: 0,
        rejected: 0,
        total: 0,
        totalAmount: 0,
        avgAmount: 0,
        avgApprovalTime: 0,
        approvalRate: 0
      };

      stats.forEach(stat => {
        result[stat._id] = stat.count;
        result.total += stat.count;
        result.totalAmount += stat.totalAmount || 0;
      });

      const completedCount = stats.reduce((sum, stat) => sum + (stat.completedCount || 0), 0);
      const totalApprovalTime = stats.reduce((sum, stat) => sum + (stat.totalApprovalTime || 0), 0);

      if (result.total > 0) {
        result.avgAmount = result.totalAmount / result.total;
        result.avgApprovalTime = completedCount > 0 ? totalApprovalTime / completedCount : 0;
        result.approvalRate = parseFloat(((result.approved / result.total) * 100).toFixed(2));
      }

      return result;
    };

    // 根据type参数决定查询哪些数据
    const results = {};

    if (!type || type === 'travel' || type === 'all') {
      results.travel = await getTravelStats();
    }

    if (!type || type === 'expense' || type === 'all') {
      results.expense = await getExpenseStats();
    }

    res.json({
      success: true,
      data: results
    });
  } catch (error) {
    console.error('Get approval statistics error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// @desc    Get approver workload statistics
// @route   GET /api/approvals/approver-workload
// @access  Private
router.get('/approver-workload', protect, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    // 构建日期查询条件（UTC时间）
    const dateMatch = {};
    if (startDate) {
      dateMatch.$gte = new Date(startDate + 'T00:00:00.000Z');
    }
    if (endDate) {
      dateMatch.$lte = new Date(endDate + 'T23:59:59.999Z');
    }

    const matchStage = Object.keys(dateMatch).length > 0 ? { createdAt: dateMatch } : {};

    // 聚合查询差旅审批人工作量
    const travelWorkload = await Travel.aggregate([
      {
        $match: matchStage
      },
      {
        $unwind: '$approvals'
      },
      {
        $lookup: {
          from: 'users',
          localField: 'approvals.approver',
          foreignField: '_id',
          as: 'approverInfo'
        }
      },
      {
        $unwind: '$approverInfo'
      },
      {
        $group: {
          _id: '$approvals.approver',
          approverName: { $first: { $concat: ['$approverInfo.firstName', ' ', '$approverInfo.lastName'] } },
          pending: {
            $sum: { $cond: [{ $eq: ['$approvals.status', 'pending'] }, 1, 0] }
          },
          approved: {
            $sum: { $cond: [{ $eq: ['$approvals.status', 'approved'] }, 1, 0] }
          },
          rejected: {
            $sum: { $cond: [{ $eq: ['$approvals.status', 'rejected'] }, 1, 0] }
          },
          total: { $sum: 1 },
          totalApprovalTime: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $in: ['$approvals.status', ['approved', 'rejected']] },
                    { $ne: ['$approvals.approvedAt', null] },
                    { $ne: ['$createdAt', null] }
                  ]
                },
                {
                  $divide: [
                    { $subtract: ['$approvals.approvedAt', '$createdAt'] },
                    3600000
                  ]
                },
                0
              ]
            }
          },
          completedCount: {
            $sum: {
              $cond: [
                { $in: ['$approvals.status', ['approved', 'rejected']] },
                1,
                0
              ]
            }
          }
        }
      }
    ]);

    // 聚合查询费用审批人工作量
    const expenseWorkload = await Expense.aggregate([
      {
        $match: matchStage
      },
      {
        $unwind: '$approvals'
      },
      {
        $lookup: {
          from: 'users',
          localField: 'approvals.approver',
          foreignField: '_id',
          as: 'approverInfo'
        }
      },
      {
        $unwind: '$approverInfo'
      },
      {
        $group: {
          _id: '$approvals.approver',
          approverName: { $first: { $concat: ['$approverInfo.firstName', ' ', '$approverInfo.lastName'] } },
          pending: {
            $sum: { $cond: [{ $eq: ['$approvals.status', 'pending'] }, 1, 0] }
          },
          approved: {
            $sum: { $cond: [{ $eq: ['$approvals.status', 'approved'] }, 1, 0] }
          },
          rejected: {
            $sum: { $cond: [{ $eq: ['$approvals.status', 'rejected'] }, 1, 0] }
          },
          total: { $sum: 1 },
          totalApprovalTime: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $in: ['$approvals.status', ['approved', 'rejected']] },
                    { $ne: ['$approvals.approvedAt', null] },
                    { $ne: ['$createdAt', null] }
                  ]
                },
                {
                  $divide: [
                    { $subtract: ['$approvals.approvedAt', '$createdAt'] },
                    3600000
                  ]
                },
                0
              ]
            }
          },
          completedCount: {
            $sum: {
              $cond: [
                { $in: ['$approvals.status', ['approved', 'rejected']] },
                1,
                0
              ]
            }
          }
        }
      }
    ]);

    // 合并差旅和费用的工作量数据
    const workloadMap = new Map();

    [...travelWorkload, ...expenseWorkload].forEach(item => {
      const key = String(item._id);
      if (workloadMap.has(key)) {
        const existing = workloadMap.get(key);
        existing.pending += item.pending;
        existing.approved += item.approved;
        existing.rejected += item.rejected;
        existing.total += item.total;
        existing.totalApprovalTime += item.totalApprovalTime;
        existing.completedCount += item.completedCount;
      } else {
        workloadMap.set(key, {
          approverId: item._id,
          approverName: item.approverName,
          pending: item.pending,
          approved: item.approved,
          rejected: item.rejected,
          total: item.total,
          totalApprovalTime: item.totalApprovalTime,
          completedCount: item.completedCount
        });
      }
    });

    // 计算平均审批时间和审批率
    const workload = Array.from(workloadMap.values()).map(item => ({
      ...item,
      avgApprovalTime: item.completedCount > 0 ? item.totalApprovalTime / item.completedCount : 0,
      approvalRate: item.total > 0 ? parseFloat(((item.approved / item.total) * 100).toFixed(2)) : 0
    }));

    res.json({
      success: true,
      data: workload
    });
  } catch (error) {
    console.error('Get approver workload error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// @desc    Get approval trend data
// @route   GET /api/approvals/trend
// @access  Private
router.get('/trend', protect, async (req, res) => {
  try {
    const { startDate, endDate, type } = req.query;

    // 构建日期查询条件（UTC时间）
    const dateMatch = {};
    if (startDate) {
      dateMatch.$gte = new Date(startDate + 'T00:00:00.000Z');
    }
    if (endDate) {
      dateMatch.$lte = new Date(endDate + 'T23:59:59.999Z');
    }

    const approverId = req.user.id;
    const approverIdString = String(approverId);

    const matchStage = Object.keys(dateMatch).length > 0 
      ? { createdAt: dateMatch }
      : {};

    // 查询差旅趋势数据
    const getTravelTrend = async () => {
      const pipeline = [
        { $match: matchStage },
        { $unwind: '$approvals' },
        {
          $match: {
            'approvals.approver': { $in: [approverId, approverIdString] }
          }
        },
        {
          $group: {
            _id: {
              date: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
              status: '$approvals.status'
            },
            count: { $sum: 1 }
          }
        },
        { $sort: { '_id.date': 1 } }
      ];

      return await Travel.aggregate(pipeline);
    };

    // 查询费用趋势数据
    const getExpenseTrend = async () => {
      const pipeline = [
        { $match: matchStage },
        { $unwind: '$approvals' },
        {
          $match: {
            'approvals.approver': { $in: [approverId, approverIdString] }
          }
        },
        {
          $group: {
            _id: {
              date: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
              status: '$approvals.status'
            },
            count: { $sum: 1 }
          }
        },
        { $sort: { '_id.date': 1 } }
      ];

      return await Expense.aggregate(pipeline);
    };

    let trendData = [];

    if (!type || type === 'travel' || type === 'all') {
      const travelTrend = await getTravelTrend();
      trendData = [...trendData, ...travelTrend.map(item => ({ ...item, type: 'travel' }))];
    }

    if (!type || type === 'expense' || type === 'all') {
      const expenseTrend = await getExpenseTrend();
      trendData = [...trendData, ...expenseTrend.map(item => ({ ...item, type: 'expense' }))];
    }

    // 合并相同日期和状态的数据
    const trendMap = new Map();
    trendData.forEach(item => {
      const key = `${item._id.date}-${item._id.status}`;
      if (trendMap.has(key)) {
        trendMap.get(key).count += item.count;
      } else {
        trendMap.set(key, {
          date: item._id.date,
          status: item._id.status,
          count: item.count
        });
      }
    });

    res.json({
      success: true,
      data: Array.from(trendMap.values()).sort((a, b) => a.date.localeCompare(b.date))
    });
  } catch (error) {
    console.error('Get approval trend error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// @desc    Get travel statistics for an employee
// @route   GET /api/approvals/travel-statistics/:employeeId
// @access  Private
router.get('/travel-statistics/:employeeId', protect, async (req, res) => {
  try {
    const { employeeId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(employeeId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid employee ID'
      });
    }

    const currentYear = new Date().getFullYear();
    const yearStart = new Date(`${currentYear}-01-01T00:00:00.000Z`);
    const yearEnd = new Date(`${currentYear}-12-31T23:59:59.999Z`);

    const stats = await Travel.aggregate([
      {
        $match: {
          employee: mongoose.Types.ObjectId(employeeId),
          createdAt: {
            $gte: yearStart,
            $lte: yearEnd
          }
        }
      },
      {
        $group: {
          _id: null,
          totalTrips: { $sum: 1 },
          totalAmount: {
            $sum: {
              $ifNull: [
                { $ifNull: ['$estimatedBudget', '$estimatedCost'] },
                0
              ]
            }
          },
          totalDays: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $ne: ['$startDate', null] },
                    { $ne: ['$endDate', null] }
                  ]
                },
                {
                  $divide: [
                    { $subtract: ['$endDate', '$startDate'] },
                    86400000
                  ]
                },
                0
              ]
            }
          }
        }
      }
    ]);

    const result = stats[0] || {
      totalTrips: 0,
      totalAmount: 0,
      totalDays: 0
    };

    result.efficiency = result.totalDays > 0 
      ? parseFloat((result.totalAmount / result.totalDays).toFixed(2))
      : 0;

    // 获取员工信息以获取部门预算
    const employee = await User.findById(employeeId).select('department');
    if (employee && employee.department) {
      // 这里可以添加部门预算查询逻辑
      result.budgetUsage = 0; // 暂时返回0，需要根据实际业务逻辑实现
    } else {
      result.budgetUsage = 0;
    }

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Get travel statistics error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

module.exports = router;
