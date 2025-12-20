const asyncHandler = require('../utils/asyncHandler');
const { ErrorFactory } = require('../utils/AppError');
const logger = require('../utils/logger');
const LoginLog = require('../models/LoginLog');
const OperationLog = require('../models/OperationLog');
const User = require('../models/User');

// @desc    Get login logs
// @route   GET /api/logs/login
// @access  Private
exports.getLoginLogs = asyncHandler(async (req, res) => {
  const {
    page = 1,
    limit = 50,
    userId,
    email,
    status,
    startDate,
    endDate,
    search
  } = req.query;

  // Build query
  const query = {};

  if (userId) {
    query.userId = userId;
  }

  if (email) {
    query.email = { $regex: email, $options: 'i' };
  }

  if (status) {
    query.status = status;
  }

  if (startDate || endDate) {
    query.loginTime = {};
    if (startDate) {
      query.loginTime.$gte = new Date(startDate);
    }
    if (endDate) {
      query.loginTime.$lte = new Date(endDate);
    }
  }

  if (search) {
    query.$or = [
      { email: { $regex: search, $options: 'i' } },
      { employeeId: { $regex: search, $options: 'i' } },
      { ipAddress: { $regex: search, $options: 'i' } }
    ];
  }

  // Calculate pagination
  const pageNum = parseInt(page);
  const limitNum = parseInt(limit);
  const skip = (pageNum - 1) * limitNum;

  // Execute query
  const [logs, total] = await Promise.all([
    LoginLog.find(query)
      .populate('userId', 'firstName lastName email employeeId')
      .sort({ loginTime: -1 })
      .skip(skip)
      .limit(limitNum)
      .lean(),
    LoginLog.countDocuments(query)
  ]);

  res.json({
    success: true,
    data: logs,
    pagination: {
      page: pageNum,
      limit: limitNum,
      total,
      pages: Math.ceil(total / limitNum)
    }
  });
});

// @desc    Get operation logs
// @route   GET /api/logs/operation
// @access  Private
exports.getOperationLogs = asyncHandler(async (req, res) => {
  const {
    page = 1,
    limit = 50,
    userId,
    module,
    action,
    resourceType,
    status,
    startDate,
    endDate,
    search
  } = req.query;

  // Build query
  const query = {};

  if (userId) {
    query.userId = userId;
  }

  if (module) {
    query.module = module;
  }

  if (action) {
    query.action = action;
  }

  if (resourceType) {
    query.resourceType = resourceType;
  }

  if (status) {
    query.status = status;
  }

  if (startDate || endDate) {
    query.operationTime = {};
    if (startDate) {
      query.operationTime.$gte = new Date(startDate);
    }
    if (endDate) {
      query.operationTime.$lte = new Date(endDate);
    }
  }

  if (search) {
    query.$or = [
      { email: { $regex: search, $options: 'i' } },
      { employeeId: { $regex: search, $options: 'i' } },
      { description: { $regex: search, $options: 'i' } },
      { resourceId: { $regex: search, $options: 'i' } }
    ];
  }

  // Calculate pagination
  const pageNum = parseInt(page);
  const limitNum = parseInt(limit);
  const skip = (pageNum - 1) * limitNum;

  // Execute query
  const [logs, total] = await Promise.all([
    OperationLog.find(query)
      .populate('userId', 'firstName lastName email employeeId')
      .sort({ operationTime: -1 })
      .skip(skip)
      .limit(limitNum)
      .lean(),
    OperationLog.countDocuments(query)
  ]);

  res.json({
    success: true,
    data: logs,
    pagination: {
      page: pageNum,
      limit: limitNum,
      total,
      pages: Math.ceil(total / limitNum)
    }
  });
});

// @desc    Get login log statistics
// @route   GET /api/logs/login/statistics
// @access  Private
exports.getLoginLogStatistics = asyncHandler(async (req, res) => {
  const { startDate, endDate } = req.query;

  const query = {};
  if (startDate || endDate) {
    query.loginTime = {};
    if (startDate) {
      query.loginTime.$gte = new Date(startDate);
    }
    if (endDate) {
      query.loginTime.$lte = new Date(endDate);
    }
  }

  const [totalLogins, successfulLogins, failedLogins, uniqueUsers] = await Promise.all([
    LoginLog.countDocuments(query),
    LoginLog.countDocuments({ ...query, status: 'success' }),
    LoginLog.countDocuments({ ...query, status: 'failed' }),
    LoginLog.distinct('userId', query).then(ids => ids.length)
  ]);

  res.json({
    success: true,
    data: {
      totalLogins,
      successfulLogins,
      failedLogins,
      uniqueUsers,
      successRate: totalLogins > 0 ? ((successfulLogins / totalLogins) * 100).toFixed(2) : 0
    }
  });
});

// @desc    Get operation log statistics
// @route   GET /api/logs/operation/statistics
// @access  Private
exports.getOperationLogStatistics = asyncHandler(async (req, res) => {
  const { startDate, endDate } = req.query;

  const query = {};
  if (startDate || endDate) {
    query.operationTime = {};
    if (startDate) {
      query.operationTime.$gte = new Date(startDate);
    }
    if (endDate) {
      query.operationTime.$lte = new Date(endDate);
    }
  }

  const [totalOperations, successfulOperations, failedOperations, uniqueUsers, moduleStats, actionStats] = await Promise.all([
    OperationLog.countDocuments(query),
    OperationLog.countDocuments({ ...query, status: 'success' }),
    OperationLog.countDocuments({ ...query, status: 'failed' }),
    OperationLog.distinct('userId', query).then(ids => ids.length),
    OperationLog.aggregate([
      { $match: query },
      { $group: { _id: '$module', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]),
    OperationLog.aggregate([
      { $match: query },
      { $group: { _id: '$action', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ])
  ]);

  res.json({
    success: true,
    data: {
      totalOperations,
      successfulOperations,
      failedOperations,
      uniqueUsers,
      successRate: totalOperations > 0 ? ((successfulOperations / totalOperations) * 100).toFixed(2) : 0,
      moduleStats,
      actionStats
    }
  });
});




