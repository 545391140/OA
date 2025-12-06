const express = require('express');
const logger = require('../utils/logger');
const { protect } = require('../middleware/auth');
const pushNotificationService = require('../services/pushNotificationService');

const router = express.Router();

// @desc    Get VAPID public key
// @route   GET /api/push/vapid-key
// @access  Private
router.get('/vapid-key', protect, (req, res) => {
  try {
    const publicKey = pushNotificationService.getVapidPublicKey();
    res.json({
      success: true,
      data: {
        publicKey
      }
    });
  } catch (error) {
    logger.error('Get VAPID key error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @desc    Subscribe to push notifications
// @route   POST /api/push/subscribe
// @access  Private
router.post('/subscribe', protect, async (req, res) => {
  try {
    const { subscription } = req.body;

    if (!subscription) {
      return res.status(400).json({
        success: false,
        message: 'Subscription is required'
      });
    }

    const result = await pushNotificationService.savePushSubscription(req.user.id, subscription);

    if (result) {
      res.json({
        success: true,
        message: 'Push subscription saved successfully'
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'Failed to save subscription'
      });
    }
  } catch (error) {
    logger.error('Subscribe push notification error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @desc    Unsubscribe from push notifications
// @route   POST /api/push/unsubscribe
// @access  Private
router.post('/unsubscribe', protect, async (req, res) => {
  try {
    const result = await pushNotificationService.removePushSubscription(req.user.id);

    if (result) {
      res.json({
        success: true,
        message: 'Push subscription removed successfully'
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'Failed to remove subscription'
      });
    }
  } catch (error) {
    logger.error('Unsubscribe push notification error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

module.exports = router;










