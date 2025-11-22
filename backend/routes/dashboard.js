const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const dashboardController = require('../controllers/dashboardController');

// 测试端点 - 验证路由是否工作
router.get('/test', (req, res) => {
  console.log('[DASHBOARD_TEST] Test endpoint hit!');
  res.json({ success: true, message: 'Dashboard route is working', timestamp: new Date().toISOString() });
});

// 获取完整Dashboard数据（推荐使用）
router.get('/', protect, (req, res, next) => {
  console.log('[DASHBOARD_ROUTE] ========== Route hit ==========');
  console.log('[DASHBOARD_ROUTE] Method:', req.method);
  console.log('[DASHBOARD_ROUTE] Path:', req.path);
  console.log('[DASHBOARD_ROUTE] Original URL:', req.originalUrl);
  console.log('[DASHBOARD_ROUTE] User:', req.user ? { id: req.user.id, role: req.user.role } : 'No user');
  console.log('[DASHBOARD_ROUTE] ===============================');
  next();
}, dashboardController.getDashboardData);

// 获取统计数据
router.get('/stats', protect, dashboardController.getDashboardStats);

// 获取最近的差旅申请
router.get('/recent-travels', protect, dashboardController.getRecentTravels);

// 获取最近的费用记录
router.get('/recent-expenses', protect, dashboardController.getRecentExpenses);

// 获取月度支出趋势
router.get('/monthly-spending', protect, dashboardController.getMonthlySpending);

// 获取费用类别分布
router.get('/category-breakdown', protect, dashboardController.getCategoryBreakdown);

// 获取待办事项
router.get('/pending-tasks', protect, dashboardController.getPendingTasks);

module.exports = router;

