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

    const travel = await Travel.findById(req.params.id);

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

module.exports = router;
