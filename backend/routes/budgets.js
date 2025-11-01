const express = require('express');
const { protect } = require('../middleware/auth');

const router = express.Router();

// @desc    Get budget information
// @route   GET /api/budgets
// @access  Private
router.get('/', protect, async (req, res) => {
  try {
    // Mock budget data - replace with actual implementation
    const budgetData = {
      monthly: {
        allocated: 5000,
        spent: 2450.50,
        remaining: 2549.50
      },
      yearly: {
        allocated: 60000,
        spent: 24500.75,
        remaining: 35499.25
      },
      categories: [
        { name: 'Transportation', allocated: 2000, spent: 850.25, remaining: 1149.75 },
        { name: 'Accommodation', allocated: 1500, spent: 1200.00, remaining: 300.00 },
        { name: 'Meals', allocated: 1000, spent: 400.25, remaining: 599.75 },
        { name: 'Other', allocated: 500, spent: 0, remaining: 500 }
      ]
    };

    res.json({
      success: true,
      data: budgetData
    });
  } catch (error) {
    console.error('Get budget error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

module.exports = router;
