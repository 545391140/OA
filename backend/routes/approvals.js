const express = require('express');
const { protect } = require('../middleware/auth');
const Travel = require('../models/Travel');
const Expense = require('../models/Expense');

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
    const { status, comments } = req.body;
    const notificationService = require('../services/notificationService');

    const travel = await Travel.findById(req.params.id).populate('employee', 'firstName lastName email');

    if (!travel) {
      return res.status(404).json({
        success: false,
        message: 'Travel request not found'
      });
    }

    // Update approval status
    const approvalIndex = travel.approvals.findIndex(
      approval => approval.approver.toString() === req.user.id
    );

    if (approvalIndex === -1) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to approve this request'
      });
    }

    // 检查审批级别顺序（可选）
    const currentLevel = travel.approvals[approvalIndex].level;
    const hasLowerLevelPending = travel.approvals.some(
      approval => approval.level < currentLevel && approval.status === 'pending'
    );

    if (hasLowerLevelPending) {
      return res.status(400).json({
        success: false,
        message: 'Cannot approve: lower level approvals are still pending'
      });
    }

    travel.approvals[approvalIndex].status = status;
    travel.approvals[approvalIndex].comments = comments;
    travel.approvals[approvalIndex].approvedAt = new Date();

    // Update overall status if all approvals are complete
    const allApproved = travel.approvals.every(approval => approval.status === 'approved');
    const anyRejected = travel.approvals.some(approval => approval.status === 'rejected');

    if (anyRejected) {
      travel.status = 'rejected';
    } else if (allApproved) {
      travel.status = 'approved';
    }

    await travel.save();

    // 发送通知给申请人
    try {
      if (status === 'approved') {
        await notificationService.notifyApprovalApproved({
          requester: travel.employee._id,
          requestType: 'travel',
          requestId: travel._id,
          requestTitle: travel.title || travel.travelNumber,
          approver: req.user.id
        });
      } else if (status === 'rejected') {
        await notificationService.notifyApprovalRejected({
          requester: travel.employee._id,
          requestType: 'travel',
          requestId: travel._id,
          requestTitle: travel.title || travel.travelNumber,
          approver: req.user.id,
          comments
        });
      }
    } catch (notifyError) {
      console.error('Failed to send approval notification:', notifyError);
      // 通知失败不影响审批流程
    }

    res.json({
      success: true,
      data: travel
    });
  } catch (error) {
    console.error('Update travel approval error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @desc    Approve/Reject expense
// @route   PUT /api/approvals/expense/:id
// @access  Private
router.put('/expense/:id', protect, async (req, res) => {
  try {
    const { status, comments } = req.body;

    const expense = await Expense.findById(req.params.id);

    if (!expense) {
      return res.status(404).json({
        success: false,
        message: 'Expense not found'
      });
    }

    // Update approval status
    const approvalIndex = expense.approvals.findIndex(
      approval => approval.approver.toString() === req.user.id
    );

    if (approvalIndex === -1) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to approve this request'
      });
    }

    expense.approvals[approvalIndex].status = status;
    expense.approvals[approvalIndex].comments = comments;
    expense.approvals[approvalIndex].approvedAt = new Date();

    // Update overall status if all approvals are complete
    const allApproved = expense.approvals.every(approval => approval.status === 'approved');
    const anyRejected = expense.approvals.some(approval => approval.status === 'rejected');

    if (anyRejected) {
      expense.status = 'rejected';
    } else if (allApproved) {
      expense.status = 'approved';
    }

    await expense.save();

    res.json({
      success: true,
      data: expense
    });
  } catch (error) {
    console.error('Update expense approval error:', error);
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
    const { page = 1, limit = 20, status, type } = req.query;
    const skip = (page - 1) * limit;

    // 构建查询条件
    const travelQuery = {
      'approvals.approver': req.user.id,
      'approvals.status': { $in: ['approved', 'rejected'] }
    };
    const expenseQuery = {
      'approvals.approver': req.user.id,
      'approvals.status': { $in: ['approved', 'rejected'] }
    };

    if (status) {
      travelQuery.status = status;
      expenseQuery.status = status;
    }

    let travels = [];
    let expenses = [];

    if (!type || type === 'travel') {
      travels = await Travel.find(travelQuery)
        .populate('employee', 'firstName lastName email')
        .populate('approvals.approver', 'firstName lastName email')
        .sort({ 'approvals.approvedAt': -1 })
        .skip(skip)
        .limit(limit);
    }

    if (!type || type === 'expense') {
      expenses = await Expense.find(expenseQuery)
        .populate('employee', 'firstName lastName email')
        .populate('travel', 'title destination')
        .sort({ 'approvals.approvedAt': -1 })
        .skip(skip)
        .limit(limit);
    }

    const total = travels.length + expenses.length;

    res.json({
      success: true,
      data: {
        travels,
        expenses
      },
      total,
      page: parseInt(page),
      pages: Math.ceil(total / limit)
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
    const { startDate, endDate } = req.query;

    // 构建日期查询
    const dateQuery = {};
    if (startDate) {
      dateQuery.$gte = new Date(startDate);
    }
    if (endDate) {
      dateQuery.$lte = new Date(endDate);
    }

    // 查询统计数据
    const [travelStats, expenseStats] = await Promise.all([
      Travel.aggregate([
        {
          $match: {
            'approvals.approver': req.user.id,
            ...(Object.keys(dateQuery).length > 0 && { 'approvals.approvedAt': dateQuery })
          }
        },
        {
          $unwind: '$approvals'
        },
        {
          $match: {
            'approvals.approver': req.user.id
          }
        },
        {
          $group: {
            _id: '$approvals.status',
            count: { $sum: 1 },
            avgAmount: { $avg: '$estimatedBudget' }
          }
        }
      ]),
      Expense.aggregate([
        {
          $match: {
            'approvals.approver': req.user.id,
            ...(Object.keys(dateQuery).length > 0 && { 'approvals.approvedAt': dateQuery })
          }
        },
        {
          $unwind: '$approvals'
        },
        {
          $match: {
            'approvals.approver': req.user.id
          }
        },
        {
          $group: {
            _id: '$approvals.status',
            count: { $sum: 1 },
            avgAmount: { $avg: '$totalAmount' }
          }
        }
      ])
    ]);

    // 格式化统计结果
    const formatStats = (stats) => {
      const result = {
        pending: 0,
        approved: 0,
        rejected: 0,
        total: 0,
        avgAmount: 0
      };

      stats.forEach(stat => {
        result[stat._id] = stat.count;
        result.total += stat.count;
        result.avgAmount += stat.avgAmount || 0;
      });

      result.avgAmount = result.avgAmount / (stats.length || 1);
      result.approvalRate = result.total > 0 ? (result.approved / result.total * 100).toFixed(2) : 0;

      return result;
    };

    res.json({
      success: true,
      data: {
        travel: formatStats(travelStats),
        expense: formatStats(expenseStats)
      }
    });
  } catch (error) {
    console.error('Get approval statistics error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

module.exports = router;
