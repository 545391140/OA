const express = require('express');
const logger = require('../utils/logger');
const { protect, authorize } = require('../middleware/auth');
const Settings = require('../models/Settings');

const router = express.Router();

// @desc    Get system settings (admin only)
// @route   GET /api/settings/system
// @access  Private/Admin
router.get('/system', protect, authorize('admin'), async (req, res) => {
  try {
    const settings = await Settings.getSystemSettings();
    
    res.json({
      success: true,
      data: {
        general: settings.general,
        notifications: settings.notifications,
        security: settings.security
      }
    });
  } catch (error) {
    logger.error('Get system settings error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @desc    Get user settings
// @route   GET /api/settings/user
// @access  Private
router.get('/user', protect, async (req, res) => {
  try {
    const settings = await Settings.getUserSettings(req.user.id);
    
    res.json({
      success: true,
      data: {
        general: settings.general,
        notifications: settings.notifications,
        security: settings.security
      }
    });
  } catch (error) {
    logger.error('Get user settings error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @desc    Get current user's effective settings (user settings merged with system settings)
// @route   GET /api/settings
// @access  Private
router.get('/', protect, async (req, res) => {
  try {
    // 获取系统设置和用户设置
    const [systemSettings, userSettings] = await Promise.all([
      Settings.getSystemSettings(),
      Settings.getUserSettings(req.user.id)
    ]);

    // 合并设置：用户设置优先于系统设置
    const effectiveSettings = {
      general: {
        companyName: systemSettings.general.companyName, // 公司名称使用系统设置
        timezone: userSettings.general.timezone || systemSettings.general.timezone,
        currency: userSettings.general.currency || systemSettings.general.currency
      },
      notifications: {
        ...systemSettings.notifications.toObject(),
        ...userSettings.notifications.toObject()
      },
      security: {
        ...systemSettings.security.toObject(),
        ...userSettings.security.toObject()
      }
    };
    
    res.json({
      success: true,
      data: effectiveSettings
    });
  } catch (error) {
    logger.error('Get effective settings error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @desc    Update system settings (admin only)
// @route   PUT /api/settings/system
// @access  Private/Admin
router.put('/system', protect, authorize('admin'), async (req, res) => {
  try {
    const { general, notifications, security } = req.body;
    
    const updateData = {};
    if (general) updateData.general = general;
    if (notifications) updateData.notifications = notifications;
    if (security) updateData.security = security;

    const settings = await Settings.updateSystemSettings(updateData);
    
    res.json({
      success: true,
      data: {
        general: settings.general,
        notifications: settings.notifications,
        security: settings.security
      }
    });
  } catch (error) {
    logger.error('Update system settings error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Server error'
    });
  }
});

// @desc    Update user settings
// @route   PUT /api/settings/user
// @access  Private
router.put('/user', protect, async (req, res) => {
  try {
    const { general, notifications, security } = req.body;
    
    const updateData = {};
    if (general) updateData.general = general;
    if (notifications) updateData.notifications = notifications;
    if (security) updateData.security = security;

    const settings = await Settings.updateUserSettings(req.user.id, updateData);
    
    res.json({
      success: true,
      data: {
        general: settings.general,
        notifications: settings.notifications,
        security: settings.security
      }
    });
  } catch (error) {
    logger.error('Update user settings error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Server error'
    });
  }
});

// @desc    Update current user's settings (saves to user settings)
// @route   PUT /api/settings
// @access  Private
router.put('/', protect, async (req, res) => {
  try {
    const { general, notifications, security } = req.body;
    
    const updateData = {};
    if (general) updateData.general = general;
    if (notifications) updateData.notifications = notifications;
    if (security) updateData.security = security;

    const settings = await Settings.updateUserSettings(req.user.id, updateData);
    
    res.json({
      success: true,
      data: {
        general: settings.general,
        notifications: settings.notifications,
        security: settings.security
      },
      message: 'Settings saved successfully'
    });
  } catch (error) {
    logger.error('Update settings error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Server error'
    });
  }
});

module.exports = router;

