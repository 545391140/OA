const express = require('express');
const { protect } = require('../middleware/auth');
const notificationService = require('../services/notificationService');
const asyncHandler = require('../utils/asyncHandler');
const logger = require('../utils/logger');
const mongoose = require('mongoose');

const router = express.Router();

// @desc    Get user notifications
// @route   GET /api/notifications
// @access  Private
router.get('/', protect, asyncHandler(async (req, res) => {
  const { page, limit, isRead } = req.query;
  
  // 验证用户ID
  if (!req.user || !req.user.id) {
    logger.error('Get notifications: User not found in request');
    return res.status(401).json({
      success: false,
      message: 'User not authenticated'
    });
  }

  // 验证用户ID格式
  if (!mongoose.Types.ObjectId.isValid(req.user.id)) {
    logger.error(`Get notifications: Invalid user ID format: ${req.user.id}`);
    return res.status(400).json({
      success: false,
      message: 'Invalid user ID format'
    });
  }

  const result = await notificationService.getUserNotifications(
    req.user.id,
    {
      page: parseInt(page) || 1,
      limit: parseInt(limit) || 20,
      isRead: isRead !== undefined ? isRead === 'true' : undefined
    }
  );

  res.json({
    success: true,
    ...result
  });
}));

// @desc    Get unread count
// @route   GET /api/notifications/unread-count
// @access  Private
router.get('/unread-count', protect, asyncHandler(async (req, res) => {
  // 验证用户ID
  if (!req.user || !req.user.id) {
    logger.error('Get unread count: User not found in request');
    return res.status(401).json({
      success: false,
      message: 'User not authenticated'
    });
  }

  // 验证用户ID格式
  if (!mongoose.Types.ObjectId.isValid(req.user.id)) {
    logger.error(`Get unread count: Invalid user ID format: ${req.user.id}`);
    return res.status(400).json({
      success: false,
      message: 'Invalid user ID format'
    });
  }

  const count = await notificationService.getUnreadCount(req.user.id);

  res.json({
    success: true,
    count: count || 0
  });
}));

// @desc    Mark notification as read
// @route   PUT /api/notifications/:id/read
// @access  Private
router.put('/:id/read', protect, async (req, res) => {
  try {
    const notification = await notificationService.markAsRead(
      req.params.id,
      req.user.id
    );

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found'
      });
    }

    res.json({
      success: true,
      data: notification
    });
  } catch (error) {
    console.error('Mark as read error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @desc    Mark all notifications as read
// @route   PUT /api/notifications/read-all
// @access  Private
router.put('/read-all', protect, async (req, res) => {
  try {
    const result = await notificationService.markAllAsRead(req.user.id);

    res.json({
      success: true,
      modifiedCount: result.modifiedCount
    });
  } catch (error) {
    console.error('Mark all as read error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @desc    Delete notification
// @route   DELETE /api/notifications/:id
// @access  Private
router.delete('/:id', protect, async (req, res) => {
  try {
    const result = await notificationService.deleteNotification(
      req.params.id,
      req.user.id
    );

    if (result.deletedCount === 0) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found'
      });
    }

    res.json({
      success: true,
      message: 'Notification deleted successfully'
    });
  } catch (error) {
    console.error('Delete notification error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

module.exports = router;

