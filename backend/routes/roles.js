const express = require('express');
const logger = require('../utils/logger');
const { body, validationResult } = require('express-validator');
const { protect, authorize } = require('../middleware/auth');
const Role = require('../models/Role');
const User = require('../models/User');
const { PERMISSION_GROUPS } = require('../config/permissions');

const router = express.Router();

// @desc    Get all available permissions
// @route   GET /api/roles/permissions
// @access  Private (Admin only)
router.get('/permissions', protect, authorize('admin'), async (req, res) => {
  try {
    res.json({
      success: true,
      data: PERMISSION_GROUPS
    });
  } catch (error) {
    logger.error('Get permissions error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Server error'
    });
  }
});

// @desc    Get all roles
// @route   GET /api/roles
// @access  Private (Admin only)
router.get('/', protect, authorize('admin'), async (req, res) => {
  try {
    const { isActive, search } = req.query;
    
    // Build query
    const query = {};
    if (isActive !== undefined) {
      query.isActive = isActive === 'true';
    }
    if (search) {
      query.$or = [
        { code: { $regex: search, $options: 'i' } },
        { name: { $regex: search, $options: 'i' } },
        { nameEn: { $regex: search, $options: 'i' } }
      ];
    }

    // 优化：先查询主数据，再批量查询关联数据，避免 populate 的 N+1 问题
    const roles = await Role.find(query)
      .sort({ level: -1, createdAt: -1 })
      .lean(); // 使用 lean() 返回纯 JavaScript 对象，提高性能

    // 步骤 1：收集所有需要 populate 的唯一 ID
    const createdByIds = [...new Set(
      roles
        .map(r => r.createdBy)
        .filter(Boolean)
        .map(id => id.toString ? id.toString() : id)
    )];
    
    const updatedByIds = [...new Set(
      roles
        .map(r => r.updatedBy)
        .filter(Boolean)
        .map(id => id.toString ? id.toString() : id)
    )];

    // 步骤 2：批量查询关联数据（只在有 ID 时才查询）
    const [createdByUsers, updatedByUsers] = await Promise.all([
      createdByIds.length > 0
        ? User.find({ _id: { $in: createdByIds } })
            .select('firstName lastName')
            .lean()
        : Promise.resolve([]),
      updatedByIds.length > 0
        ? User.find({ _id: { $in: updatedByIds } })
            .select('firstName lastName')
            .lean()
        : Promise.resolve([])
    ]);

    // 步骤 3：创建 ID 到数据的映射表
    const createdByMap = new Map(createdByUsers.map(u => [u._id.toString(), u]));
    const updatedByMap = new Map(updatedByUsers.map(u => [u._id.toString(), u]));

    // 步骤 4：合并数据到原始文档中（模拟 Mongoose populate 的行为）
    roles.forEach(role => {
      // Populate createdBy
      if (role.createdBy) {
        const createdById = role.createdBy.toString ? role.createdBy.toString() : role.createdBy;
        role.createdBy = createdByMap.get(createdById) || null;
      }
      
      // Populate updatedBy
      if (role.updatedBy) {
        const updatedById = role.updatedBy.toString ? role.updatedBy.toString() : role.updatedBy;
        role.updatedBy = updatedByMap.get(updatedById) || null;
      }
    });

    res.json({
      success: true,
      count: roles.length,
      data: roles
    });
  } catch (error) {
    logger.error('Get roles error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Server error'
    });
  }
});

// @desc    Get single role
// @route   GET /api/roles/:id
// @access  Private (Admin only)
router.get('/:id', protect, authorize('admin'), async (req, res) => {
  try {
    const role = await Role.findById(req.params.id)
      .populate('createdBy', 'firstName lastName')
      .populate('updatedBy', 'firstName lastName');

    if (!role) {
      return res.status(404).json({
        success: false,
        message: 'Role not found'
      });
    }

    res.json({
      success: true,
      data: role
    });
  } catch (error) {
    logger.error('Get role error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Server error'
    });
  }
});

// @desc    Create new role
// @route   POST /api/roles
// @access  Private (Admin only)
router.post('/', [
  protect,
  authorize('admin'),
  body('code').notEmpty().withMessage('Role code is required')
    .matches(/^[A-Z0-9_]+$/).withMessage('Role code must contain only uppercase letters, numbers, and underscores'),
  body('name').notEmpty().withMessage('Role name is required')
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

    const { code, name, nameEn, description, permissions, level } = req.body;

    // Check if role code already exists
    const existingRole = await Role.findOne({ code: code.toUpperCase() });
    if (existingRole) {
      return res.status(400).json({
        success: false,
        message: 'Role code already exists'
      });
    }

    const role = await Role.create({
      code: code.toUpperCase(),
      name,
      nameEn,
      description,
      permissions: permissions || [],
      level: level || 0,
      createdBy: req.user.id
    });

    res.status(201).json({
      success: true,
      data: role
    });
  } catch (error) {
    logger.error('Create role error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Server error'
    });
  }
});

// @desc    Update role
// @route   PUT /api/roles/:id
// @access  Private (Admin only)
router.put('/:id', [
  protect,
  authorize('admin'),
  body('name').optional().notEmpty().withMessage('Role name cannot be empty'),
  body('code').optional().matches(/^[A-Z0-9_]+$/).withMessage('Role code must contain only uppercase letters, numbers, and underscores')
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

    let role = await Role.findById(req.params.id);
    if (!role) {
      return res.status(404).json({
        success: false,
        message: 'Role not found'
      });
    }

    // Check if code is being changed and if new code already exists
    if (req.body.code && req.body.code.toUpperCase() !== role.code) {
      const existingRole = await Role.findOne({ code: req.body.code.toUpperCase() });
      if (existingRole) {
        return res.status(400).json({
          success: false,
          message: 'Role code already exists'
        });
      }
    }

    // Update fields
    const updateData = { ...req.body };
    if (updateData.code) {
      updateData.code = updateData.code.toUpperCase();
    }
    updateData.updatedBy = req.user.id;

    role = await Role.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    ).populate('createdBy', 'firstName lastName')
     .populate('updatedBy', 'firstName lastName');

    res.json({
      success: true,
      data: role
    });
  } catch (error) {
    logger.error('Update role error:', error);
    
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

// @desc    Delete role
// @route   DELETE /api/roles/:id
// @access  Private (Admin only)
router.delete('/:id', protect, authorize('admin'), async (req, res) => {
  try {
    const role = await Role.findById(req.params.id);
    if (!role) {
      return res.status(404).json({
        success: false,
        message: 'Role not found'
      });
    }

    // Check if it's a system role
    if (role.isSystem) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete system role'
      });
    }

    // Check if any users are using this role
    const User = require('../models/User');
    const userCount = await User.countDocuments({ role: role.code });
    if (userCount > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete role: ${userCount} user(s) are using this role`
      });
    }

    await Role.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: 'Role deleted successfully'
    });
  } catch (error) {
    logger.error('Delete role error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Server error'
    });
  }
});

// @desc    Toggle role active status
// @route   PATCH /api/roles/:id/toggle-active
// @access  Private (Admin only)
router.patch('/:id/toggle-active', protect, authorize('admin'), async (req, res) => {
  try {
    const role = await Role.findById(req.params.id);
    if (!role) {
      return res.status(404).json({
        success: false,
        message: 'Role not found'
      });
    }

    // Check if it's a system role
    if (role.isSystem && !role.isActive) {
      return res.status(400).json({
        success: false,
        message: 'Cannot disable system role'
      });
    }

    role.isActive = !role.isActive;
    role.updatedBy = req.user.id;
    await role.save();

    res.json({
      success: true,
      data: role
    });
  } catch (error) {
    logger.error('Toggle role active error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Server error'
    });
  }
});

module.exports = router;

