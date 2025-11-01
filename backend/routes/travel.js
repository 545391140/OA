const express = require('express');
const { protect } = require('../middleware/auth');
const Travel = require('../models/Travel');

const router = express.Router();

// @desc    Get all travel requests
// @route   GET /api/travel
// @access  Private
router.get('/', protect, async (req, res) => {
  try {
    const travels = await Travel.find({ employee: req.user.id })
      .populate('employee', 'firstName lastName email')
      .populate('approvals.approver', 'firstName lastName email')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      count: travels.length,
      data: travels
    });
  } catch (error) {
    console.error('Get travels error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @desc    Get single travel request
// @route   GET /api/travel/:id
// @access  Private
router.get('/:id', protect, async (req, res) => {
  try {
    const travel = await Travel.findById(req.params.id)
      .populate('employee', 'firstName lastName email')
      .populate('approvals.approver', 'firstName lastName email');

    if (!travel) {
      return res.status(404).json({
        success: false,
        message: 'Travel request not found'
      });
    }

    res.json({
      success: true,
      data: travel
    });
  } catch (error) {
    console.error('Get travel error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @desc    Create new travel request
// @route   POST /api/travel
// @access  Private
router.post('/', protect, async (req, res) => {
  try {
    const travelData = {
      ...req.body,
      employee: req.user.id
    };

    const travel = await Travel.create(travelData);

    res.status(201).json({
      success: true,
      data: travel
    });
  } catch (error) {
    console.error('Create travel error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

module.exports = router;
