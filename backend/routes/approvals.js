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
    // 返回包含完整approvals数组的申请对象，让前端自己过滤
    const travelHistory = await Travel.find({
      'approvals.approver': { $in: [approverId, approverIdString] },
      'approvals.status': { $in: ['approved', 'rejected'] }
    })
      .populate('employee', 'firstName lastName email')
      .populate('approvals.approver', 'firstName lastName email position')
      .select('title travelNumber status estimatedBudget estimatedCost currency startDate endDate destination outbound inbound multiCityRoutes createdAt approvals employee')
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();

    // Get expense approvals history
    const expenseHistory = await Expense.find({
      'approvals.approver': { $in: [approverId, approverIdString] },
      'approvals.status': { $in: ['approved', 'rejected'] }
    })
      .populate('employee', 'firstName lastName email')
      .populate('travel', 'title destination')
      .populate('approvals.approver', 'firstName lastName email position')
      .select('title expenseNumber totalAmount amount currency expenseDate date createdAt approvals employee travel')
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();

    console.log('=== Approval History API ===');
    console.log('Approver ID:', approverId);
    console.log('Travel history count:', travelHistory.length);
    console.log('Expense history count:', expenseHistory.length);

    res.json({
      success: true,
      data: {
        travels: travelHistory,
        expenses: expenseHistory
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

    console.log('=== Approval Statistics API ===');
    console.log('Query params:', { startDate, endDate, type });
    const currentDate = new Date();
    console.log('Current date:', currentDate.toISOString());

    // 构建日期查询条件（UTC时间）
    const dateMatch = {};
    let hasDateFilter = false;
    if (startDate) {
      const startDateObj = new Date(startDate + 'T00:00:00.000Z');
      dateMatch.$gte = startDateObj;
      console.log('Start date match:', startDateObj.toISOString());
      hasDateFilter = true;
      
      // 检查日期范围是否合理（未来日期可能是系统时间错误）
      if (startDateObj > currentDate) {
        console.warn('WARNING: Start date is in the future! This may indicate a system time issue.');
      }
    }
    if (endDate) {
      const endDateObj = new Date(endDate + 'T23:59:59.999Z');
      dateMatch.$lte = endDateObj;
      console.log('End date match:', endDateObj.toISOString());
      hasDateFilter = true;
      
      // 检查日期范围是否合理
      if (endDateObj > currentDate) {
        console.warn('WARNING: End date is in the future! This may indicate a system time issue.');
      }
    }
    console.log('Date match object:', dateMatch);
    console.log('Has date filter:', hasDateFilter);

    // 查询差旅统计数据
    const getTravelStats = async () => {
      // 第一步：先过滤掉空数组，然后匹配日期条件（如果有）
      const pipeline = [];
      
      // 先过滤掉 approvals 数组为空的记录
      pipeline.push({
        $match: {
          approvals: { $exists: true, $ne: [] }
        }
      });
      // 使用 $expr 检查数组长度大于0
      pipeline.push({
        $match: {
          $expr: { $gt: [{ $size: '$approvals' }, 0] }
        }
      });
      
      // 如果有日期条件，添加日期匹配
      if (Object.keys(dateMatch).length > 0) {
        console.log('Adding date match to travel pipeline:', dateMatch);
        pipeline.push({ $match: { createdAt: dateMatch } });
      } else {
        console.log('No date match, querying all travel records with approvals');
      }
      
      console.log('Travel pipeline stages:', JSON.stringify(pipeline, null, 2));
      
      // 第二步：展开approvals数组
      // 第三步：按status分组统计
      pipeline.push(
        { $unwind: '$approvals' },
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
      
      console.log('Travel stats pipeline result:', JSON.stringify(stats, null, 2));
      console.log('Date match:', dateMatch);
      console.log('Stats count:', stats.length);
      
      // 如果查询结果为空且有日期过滤，尝试查询所有数据以诊断问题
      if (stats.length === 0 && hasDateFilter) {
        console.log('No results with date filter, checking total records with approvals...');
        const totalCount = await Travel.countDocuments({
          approvals: { $exists: true, $ne: [] },
          $expr: { $gt: [{ $size: '$approvals' }, 0] }
        });
        console.log('Total travel records with approvals (no date filter):', totalCount);
        
        // 查询最早和最晚的记录日期
        const dateRange = await Travel.aggregate([
          {
            $match: {
              approvals: { $exists: true, $ne: [] },
              $expr: { $gt: [{ $size: '$approvals' }, 0] }
            }
          },
          {
            $group: {
              _id: null,
              minDate: { $min: '$createdAt' },
              maxDate: { $max: '$createdAt' }
            }
          }
        ]);
        if (dateRange.length > 0) {
          console.log('Date range of travel records with approvals:', {
            minDate: dateRange[0].minDate,
            maxDate: dateRange[0].maxDate
          });
        }
      }

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
      
      console.log('Travel stats result:', result);

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
      const pipeline = [];
      
      // 先过滤掉 approvals 数组为空的记录
      pipeline.push({
        $match: {
          approvals: { $exists: true, $ne: [] }
        }
      });
      // 使用 $expr 检查数组长度大于0
      pipeline.push({
        $match: {
          $expr: { $gt: [{ $size: '$approvals' }, 0] }
        }
      });
      
      // 如果有日期条件，添加日期匹配
      if (Object.keys(dateMatch).length > 0) {
        pipeline.push({ $match: { createdAt: dateMatch } });
      }
      
      pipeline.push(
        { $unwind: '$approvals' },
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
      
      console.log('Expense stats pipeline result:', JSON.stringify(stats, null, 2));
      console.log('Expense stats count:', stats.length);
      
      // 如果查询结果为空且有日期过滤，尝试查询所有数据以诊断问题
      if (stats.length === 0 && hasDateFilter) {
        console.log('No results with date filter, checking total expense records with approvals...');
        const totalCount = await Expense.countDocuments({
          approvals: { $exists: true, $ne: [] },
          $expr: { $gt: [{ $size: '$approvals' }, 0] }
        });
        console.log('Total expense records with approvals (no date filter):', totalCount);
        
        // 查询最早和最晚的记录日期
        const dateRange = await Expense.aggregate([
          {
            $match: {
              approvals: { $exists: true, $ne: [] },
              $expr: { $gt: [{ $size: '$approvals' }, 0] }
            }
          },
          {
            $group: {
              _id: null,
              minDate: { $min: '$createdAt' },
              maxDate: { $max: '$createdAt' }
            }
          }
        ]);
        if (dateRange.length > 0) {
          console.log('Date range of expense records with approvals:', {
            minDate: dateRange[0].minDate,
            maxDate: dateRange[0].maxDate
          });
        }
      }

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
      
      console.log('Expense stats result:', result);

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
      approvalRate: item.completedCount > 0 ? parseFloat(((item.approved / item.completedCount) * 100).toFixed(2)) : 0
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

    console.log('=== Approval Trend API ===');
    console.log('Query params:', { startDate, endDate, type });

    // 构建日期查询条件（UTC时间）
    const dateMatch = {};
    if (startDate) {
      dateMatch.$gte = new Date(startDate + 'T00:00:00.000Z');
    }
    if (endDate) {
      dateMatch.$lte = new Date(endDate + 'T23:59:59.999Z');
    }

    // 查询差旅趋势数据
    const getTravelTrend = async () => {
      const pipeline = [];
      
      // 先过滤掉 approvals 数组为空的记录
      pipeline.push({
        $match: {
          approvals: { $exists: true, $ne: [] },
          $expr: { $gt: [{ $size: '$approvals' }, 0] }
        }
      });
      
      // 如果有日期条件，添加日期匹配
      if (Object.keys(dateMatch).length > 0) {
        pipeline.push({ $match: { createdAt: dateMatch } });
      }
      
      pipeline.push(
        { $unwind: '$approvals' },
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
      );

      return await Travel.aggregate(pipeline);
    };

    // 查询费用趋势数据
    const getExpenseTrend = async () => {
      const pipeline = [];
      
      // 先过滤掉 approvals 数组为空的记录
      pipeline.push({
        $match: {
          approvals: { $exists: true, $ne: [] },
          $expr: { $gt: [{ $size: '$approvals' }, 0] }
        }
      });
      
      // 如果有日期条件，添加日期匹配
      if (Object.keys(dateMatch).length > 0) {
        pipeline.push({ $match: { createdAt: dateMatch } });
      }
      
      pipeline.push(
        { $unwind: '$approvals' },
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
      );

      return await Expense.aggregate(pipeline);
    };

    let trendData = [];

    if (!type || type === 'travel' || type === 'all') {
      const travelTrend = await getTravelTrend();
      console.log('Travel trend data:', travelTrend);
      trendData = [...trendData, ...travelTrend.map(item => ({ ...item, type: 'travel' }))];
    }

    if (!type || type === 'expense' || type === 'all') {
      const expenseTrend = await getExpenseTrend();
      console.log('Expense trend data:', expenseTrend);
      trendData = [...trendData, ...expenseTrend.map(item => ({ ...item, type: 'expense' }))];
    }

    // 合并相同日期和状态的数据，并转换为前端期望的格式
    const dateMap = new Map();
    trendData.forEach(item => {
      const date = item._id.date;
      const status = item._id.status;
      
      if (!dateMap.has(date)) {
        dateMap.set(date, {
          date,
          pending: 0,
          approved: 0,
          rejected: 0
        });
      }
      
      const dateData = dateMap.get(date);
      if (status === 'pending') {
        dateData.pending += item.count;
      } else if (status === 'approved') {
        dateData.approved += item.count;
      } else if (status === 'rejected') {
        dateData.rejected += item.count;
      }
    });

    const result = Array.from(dateMap.values()).sort((a, b) => a.date.localeCompare(b.date));
    console.log('Trend result:', result);

    res.json({
      success: true,
      data: result
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
          employee: new mongoose.Types.ObjectId(employeeId),
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
