const express = require('express');
const { body, validationResult } = require('express-validator');
const { protect, authorize, checkPermission } = require('../middleware/auth');
const { PERMISSIONS } = require('../config/permissions');
const Position = require('../models/Position');

const router = express.Router();

// @desc    Get all positions
// @route   GET /api/positions
// @access  Private (Requires position.view permission)
router.get('/', protect, checkPermission(PERMISSIONS.POSITION_VIEW), async (req, res) => {
  try {
    const { isActive, search, department, jobLevel } = req.query;
    
    // Build query
    const query = {};
    if (isActive !== undefined) {
      query.isActive = isActive === 'true';
    }
    if (department) {
      query.department = department;
    }
    if (jobLevel) {
      query.jobLevel = jobLevel;
    }
    if (search) {
      query.$or = [
        { code: { $regex: search, $options: 'i' } },
        { name: { $regex: search, $options: 'i' } },
        { nameEn: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    const positions = await Position.find(query)
      .populate('createdBy', 'firstName lastName')
      .populate('updatedBy', 'firstName lastName')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      count: positions.length,
      data: positions
    });
  } catch (error) {
    console.error('Get positions error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Server error'
    });
  }
});

// @desc    Get single position
// @route   GET /api/positions/:id
// @access  Private (Requires position.view permission)
router.get('/:id', protect, checkPermission(PERMISSIONS.POSITION_VIEW), async (req, res) => {
  try {
    const position = await Position.findById(req.params.id)
      .populate('createdBy', 'firstName lastName')
      .populate('updatedBy', 'firstName lastName');

    if (!position) {
      return res.status(404).json({
        success: false,
        message: 'Position not found'
      });
    }

    res.json({
      success: true,
      data: position
    });
  } catch (error) {
    console.error('Get position error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Server error'
    });
  }
});

// @desc    Create new position
// @route   POST /api/positions
// @access  Private (Requires position.create permission)
router.post('/', [
  protect,
  checkPermission(PERMISSIONS.POSITION_CREATE),
  body('code').notEmpty().withMessage('Position code is required')
    .matches(/^[A-Z0-9_]+$/).withMessage('Position code must contain only uppercase letters, numbers, and underscores'),
  body('name').notEmpty().withMessage('Position name is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation errors',
        errors: errors.array()
      });
    }

    const {
      code,
      name,
      nameEn,
      description,
      department,
      jobLevel,
      minSalary,
      maxSalary,
      requirements,
      responsibilities
    } = req.body;

    // Check if position code already exists
    const existingPosition = await Position.findOne({ code: code.toUpperCase() });
    if (existingPosition) {
      return res.status(400).json({
        success: false,
        message: 'Position code already exists'
      });
    }

    // Validate salary range
    if (minSalary && maxSalary && minSalary > maxSalary) {
      return res.status(400).json({
        success: false,
        message: 'Minimum salary cannot be greater than maximum salary'
      });
    }

    const position = await Position.create({
      code: code.toUpperCase(),
      name,
      nameEn,
      description,
      department,
      jobLevel,
      minSalary,
      maxSalary,
      requirements: requirements || {},
      responsibilities: responsibilities || [],
      createdBy: req.user.id
    });

    res.status(201).json({
      success: true,
      data: position
    });
  } catch (error) {
    console.error('Create position error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Server error'
    });
  }
});

// @desc    Update position
// @route   PUT /api/positions/:id
// @access  Private (Requires position.edit permission)
router.put('/:id', [
  protect,
  checkPermission(PERMISSIONS.POSITION_EDIT),
  body('name').optional().notEmpty().withMessage('Position name cannot be empty'),
  body('code').optional().matches(/^[A-Z0-9_]+$/).withMessage('Position code must contain only uppercase letters, numbers, and underscores')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation errors',
        errors: errors.array()
      });
    }

    let position = await Position.findById(req.params.id);
    if (!position) {
      return res.status(404).json({
        success: false,
        message: 'Position not found'
      });
    }

    // Check if code is being changed and if new code already exists
    if (req.body.code && req.body.code.toUpperCase() !== position.code) {
      const existingPosition = await Position.findOne({ code: req.body.code.toUpperCase() });
      if (existingPosition) {
        return res.status(400).json({
          success: false,
          message: 'Position code already exists'
        });
      }
    }

    // Validate salary range
    const minSalary = req.body.minSalary !== undefined ? req.body.minSalary : position.minSalary;
    const maxSalary = req.body.maxSalary !== undefined ? req.body.maxSalary : position.maxSalary;
    if (minSalary && maxSalary && minSalary > maxSalary) {
      return res.status(400).json({
        success: false,
        message: 'Minimum salary cannot be greater than maximum salary'
      });
    }

    // Update fields
    const updateData = { ...req.body };
    if (updateData.code) {
      updateData.code = updateData.code.toUpperCase();
    }
    updateData.updatedBy = req.user.id;

    position = await Position.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    ).populate('createdBy', 'firstName lastName')
     .populate('updatedBy', 'firstName lastName');

    res.json({
      success: true,
      data: position
    });
  } catch (error) {
    console.error('Update position error:', error);
    
    // Handle validation errors
    if (error.name === 'ValidationError') {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: Object.values(error.errors).map(err => ({
          field: err.path,
          message: err.message
        }))
      });
    }

    res.status(500).json({
      success: false,
      message: error.message || 'Server error'
    });
  }
});

// @desc    Delete position
// @route   DELETE /api/positions/:id
// @access  Private (Requires position.delete permission)
router.delete('/:id', protect, checkPermission(PERMISSIONS.POSITION_DELETE), async (req, res) => {
  try {
    const position = await Position.findById(req.params.id);
    if (!position) {
      return res.status(404).json({
        success: false,
        message: 'Position not found'
      });
    }

    // Check if it's a system position
    if (position.isSystem) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete system position'
      });
    }

    // Check if any users are using this position
    const User = require('../models/User');
    const userCount = await User.countDocuments({ position: position.code });
    if (userCount > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete position: ${userCount} user(s) are using this position`
      });
    }

    await Position.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: 'Position deleted successfully'
    });
  } catch (error) {
    console.error('Delete position error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Server error'
    });
  }
});

// @desc    Toggle position active status
// @route   PATCH /api/positions/:id/toggle-active
// @access  Private (Requires position.edit permission)
router.patch('/:id/toggle-active', protect, checkPermission(PERMISSIONS.POSITION_EDIT), async (req, res) => {
  try {
    const position = await Position.findById(req.params.id);
    if (!position) {
      return res.status(404).json({
        success: false,
        message: 'Position not found'
      });
    }

    // Check if it's a system position
    if (position.isSystem && !position.isActive) {
      return res.status(400).json({
        success: false,
        message: 'Cannot disable system position'
      });
    }

    position.isActive = !position.isActive;
    position.updatedBy = req.user.id;
    await position.save();

    res.json({
      success: true,
      data: position
    });
  } catch (error) {
    console.error('Toggle position active error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Server error'
    });
  }
});

module.exports = router;

