const express = require('express');
const { protect } = require('../middleware/auth');

const router = express.Router();

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

// @desc    Get expense reports
// @route   GET /api/reports/expenses
// @access  Private
router.get('/expenses', protect, async (req, res) => {
  try {
    const { startDate, endDate, category, department } = req.query;

    // Mock expense report data - replace with actual implementation
    const expenseReportData = {
      summary: {
        totalAmount: 12500.75,
        totalExpenses: 45,
        averageAmount: 277.79
      },
      expenses: [
        {
          id: 1,
          date: '2024-01-15',
          description: 'Hotel accommodation',
          category: 'accommodation',
          amount: 450.00,
          employee: 'John Doe',
          department: 'Sales'
        },
        {
          id: 2,
          date: '2024-01-14',
          description: 'Flight ticket',
          category: 'transportation',
          amount: 320.00,
          employee: 'Jane Smith',
          department: 'Marketing'
        }
      ],
      categorySummary: [
        { category: 'Transportation', count: 15, total: 4200.50 },
        { category: 'Accommodation', count: 12, total: 3600.00 },
        { category: 'Meals', count: 18, total: 2700.25 }
      ]
    };

    res.json({
      success: true,
      data: expenseReportData
    });
  } catch (error) {
    console.error('Get expense reports error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

module.exports = router;
