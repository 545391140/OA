const express = require('express');
const { protect, authorize } = require('../middleware/auth');
const NotificationTemplate = require('../models/NotificationTemplate');

const router = express.Router();

// @desc    Get all notification templates
// @route   GET /api/notification-templates
// @access  Private/Admin
router.get('/', protect, authorize('admin'), async (req, res) => {
  try {
    const { type, enabled } = req.query;
    const query = {};
    
    if (type) {
      query.type = type;
    }
    if (enabled !== undefined) {
      query.enabled = enabled === 'true';
    }

    const templates = await NotificationTemplate.find(query).sort({ code: 1 });

    res.json({
      success: true,
      count: templates.length,
      data: templates
    });
  } catch (error) {
    console.error('Get notification templates error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @desc    Get single notification template
// @route   GET /api/notification-templates/:id
// @access  Private/Admin
router.get('/:id', protect, authorize('admin'), async (req, res) => {
  try {
    const template = await NotificationTemplate.findById(req.params.id);

    if (!template) {
      return res.status(404).json({
        success: false,
        message: 'Template not found'
      });
    }

    res.json({
      success: true,
      data: template
    });
  } catch (error) {
    console.error('Get notification template error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @desc    Create notification template
// @route   POST /api/notification-templates
// @access  Private/Admin
router.post('/', protect, authorize('admin'), async (req, res) => {
  try {
    const template = await NotificationTemplate.create(req.body);

    res.status(201).json({
      success: true,
      data: template
    });
  } catch (error) {
    console.error('Create notification template error:', error);
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Template code already exists'
      });
    }
    res.status(500).json({
      success: false,
      message: error.message || 'Server error'
    });
  }
});

// @desc    Update notification template
// @route   PUT /api/notification-templates/:id
// @access  Private/Admin
router.put('/:id', protect, authorize('admin'), async (req, res) => {
  try {
    const template = await NotificationTemplate.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!template) {
      return res.status(404).json({
        success: false,
        message: 'Template not found'
      });
    }

    res.json({
      success: true,
      data: template
    });
  } catch (error) {
    console.error('Update notification template error:', error);
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Template code already exists'
      });
    }
    res.status(500).json({
      success: false,
      message: error.message || 'Server error'
    });
  }
});

// @desc    Delete notification template
// @route   DELETE /api/notification-templates/:id
// @access  Private/Admin
router.delete('/:id', protect, authorize('admin'), async (req, res) => {
  try {
    const template = await NotificationTemplate.findByIdAndDelete(req.params.id);

    if (!template) {
      return res.status(404).json({
        success: false,
        message: 'Template not found'
      });
    }

    res.json({
      success: true,
      message: 'Template deleted successfully'
    });
  } catch (error) {
    console.error('Delete notification template error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @desc    Render template with variables (for testing)
// @route   POST /api/notification-templates/:id/render
// @access  Private/Admin
router.post('/:id/render', protect, authorize('admin'), async (req, res) => {
  try {
    const template = await NotificationTemplate.findById(req.params.id);

    if (!template) {
      return res.status(404).json({
        success: false,
        message: 'Template not found'
      });
    }

    const rendered = template.render(req.body.variables || {});

    res.json({
      success: true,
      data: rendered
    });
  } catch (error) {
    console.error('Render template error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

module.exports = router;







