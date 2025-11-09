const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const dashboardController = require('../controllers/dashboardController');

// 获取完整Dashboard数据（推荐使用）
router.get('/', auth, dashboardController.getDashboardData);

// 获取统计数据
router.get('/stats', auth, dashboardController.getDashboardStats);

// 获取最近的差旅申请
router.get('/recent-travels', auth, dashboardController.getRecentTravels);

// 获取最近的费用记录
router.get('/recent-expenses', auth, dashboardController.getRecentExpenses);

// 获取月度支出趋势
router.get('/monthly-spending', auth, dashboardController.getMonthlySpending);

// 获取费用类别分布
router.get('/category-breakdown', auth, dashboardController.getCategoryBreakdown);

// 获取待办事项
router.get('/pending-tasks', auth, dashboardController.getPendingTasks);

module.exports = router;

