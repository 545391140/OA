const express = require('express');
const { protect, checkPermission } = require('../middleware/auth');
const { PERMISSIONS } = require('../config/permissions');
const {
  getLoginLogs,
  getOperationLogs,
  getLoginLogStatistics,
  getOperationLogStatistics
} = require('../controllers/logController');

const router = express.Router();

// All routes require authentication
router.use(protect);

// @desc    Get login logs
// @route   GET /api/logs/login
// @access  Private
router.get('/login', checkPermission(PERMISSIONS.LOG_VIEW), getLoginLogs);

// @desc    Get operation logs
// @route   GET /api/logs/operation
// @access  Private
router.get('/operation', checkPermission(PERMISSIONS.LOG_VIEW), getOperationLogs);

// @desc    Get login log statistics
// @route   GET /api/logs/login/statistics
// @access  Private
router.get('/login/statistics', checkPermission(PERMISSIONS.LOG_VIEW), getLoginLogStatistics);

// @desc    Get operation log statistics
// @route   GET /api/logs/operation/statistics
// @access  Private
router.get('/operation/statistics', checkPermission(PERMISSIONS.LOG_VIEW), getOperationLogStatistics);

module.exports = router;





