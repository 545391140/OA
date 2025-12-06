const express = require('express');
const mongoose = require('mongoose');
const { body, validationResult } = require('express-validator');
const { protect, authorize, checkPermission } = require('../middleware/auth');
const { PERMISSIONS } = require('../config/permissions');
const asyncHandler = require('../utils/asyncHandler');
const logger = require('../utils/logger');
const { ErrorFactory } = require('../utils/AppError');
const User = require('../models/User');
const Role = require('../models/Role');
const Position = require('../models/Position');
const Location = require('../models/Location');
const { clearDepartmentUserCache } = require('../utils/dataScope');

const router = express.Router();

// @desc    Get all users
// @route   GET /api/users
// @access  Private/Admin
router.get('/', protect, checkPermission(PERMISSIONS.USER_VIEW), async (req, res) => {
  try {
    const { isActive, search, role, position, department } = req.query;
    
    // Build query
    const query = {};
    if (isActive !== undefined) {
      query.isActive = isActive === 'true';
    }
    if (role) {
      query.role = role;
    }
    if (position) {
      query.position = position;
    }
    if (department) {
      query.department = department;
    }
    if (search) {
      query.$or = [
        { employeeId: { $regex: search, $options: 'i' } },
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }

    // 优化：先查询主数据，再批量查询关联数据，避免 populate 的 N+1 问题
    const users = await User.find(query)
      .select('-password')
      .sort({ createdAt: -1 })
      .lean(); // 使用 lean() 返回纯 JavaScript 对象，提高性能

    // 步骤 1：收集所有需要 populate 的唯一 manager ID
    const managerIds = [...new Set(
      users
        .map(u => u.manager)
        .filter(Boolean)
        .map(id => id.toString ? id.toString() : id)
    )];

    // 步骤 2：收集所有需要 populate 的 Location ID（常驻国和常驻城市）
    const locationIds = new Set();
    users.forEach(user => {
      // 处理常驻国
      if (user.residenceCountry) {
        if (typeof user.residenceCountry === 'object' && user.residenceCountry._id) {
          // 已经是对象，不需要populate
          locationIds.add(user.residenceCountry._id.toString());
        } else if (typeof user.residenceCountry === 'string') {
          // 如果是字符串，检查是否是有效的ObjectId
          if (mongoose.Types.ObjectId.isValid(user.residenceCountry) && user.residenceCountry.length === 24) {
            locationIds.add(user.residenceCountry);
          }
          // 如果不是有效的ObjectId（可能是代码或名称），保持原样，不populate
        }
      }
      // 处理常驻城市
      if (user.residenceCity) {
        if (typeof user.residenceCity === 'object' && user.residenceCity._id) {
          // 已经是对象，不需要populate
          locationIds.add(user.residenceCity._id.toString());
        } else if (typeof user.residenceCity === 'string') {
          // 如果是字符串，检查是否是有效的ObjectId
          if (mongoose.Types.ObjectId.isValid(user.residenceCity) && user.residenceCity.length === 24) {
            locationIds.add(user.residenceCity);
          }
          // 如果不是有效的ObjectId（可能是代码或名称），保持原样，不populate
        }
      }
    });

    // 步骤 3：批量查询关联数据
    const managers = managerIds.length > 0
      ? await User.find({ _id: { $in: managerIds } })
          .select('firstName lastName email')
          .lean()
      : [];

    const locations = locationIds.size > 0
      ? await Location.find({ _id: { $in: [...locationIds] } })
          .select('name enName code type country countryCode')
          .lean()
      : [];

    // 步骤 4：创建 ID 到数据的映射表
    const managerMap = new Map(managers.map(m => [m._id.toString(), m]));
    const locationMap = new Map(locations.map(loc => [loc._id.toString(), loc]));

    // 步骤 5：合并数据到原始文档中（模拟 Mongoose populate 的行为）
    users.forEach(user => {
      // Populate manager
      if (user.manager) {
        const managerId = user.manager.toString ? user.manager.toString() : user.manager;
        user.manager = managerMap.get(managerId) || null;
      }
      
      // Populate residenceCountry
      if (user.residenceCountry) {
        if (typeof user.residenceCountry === 'object' && user.residenceCountry._id) {
          // 已经是对象，尝试从map中获取更新版本
          const countryId = user.residenceCountry._id.toString();
          const populatedCountry = locationMap.get(countryId);
          if (populatedCountry) {
            user.residenceCountry = populatedCountry;
          }
        } else if (typeof user.residenceCountry === 'string') {
          // 如果是字符串，检查是否是有效的ObjectId
          if (mongoose.Types.ObjectId.isValid(user.residenceCountry) && user.residenceCountry.length === 24) {
            const populatedCountry = locationMap.get(user.residenceCountry);
            if (populatedCountry) {
              user.residenceCountry = populatedCountry;
            }
          }
          // 如果不是有效的ObjectId（可能是代码或名称），保持原样
        }
      }
      
      // Populate residenceCity
      if (user.residenceCity) {
        if (typeof user.residenceCity === 'object' && user.residenceCity._id) {
          // 已经是对象，尝试从map中获取更新版本
          const cityId = user.residenceCity._id.toString();
          const populatedCity = locationMap.get(cityId);
          if (populatedCity) {
            user.residenceCity = populatedCity;
          }
        } else if (typeof user.residenceCity === 'string') {
          // 如果是字符串，检查是否是有效的ObjectId
          if (mongoose.Types.ObjectId.isValid(user.residenceCity) && user.residenceCity.length === 24) {
            const populatedCity = locationMap.get(user.residenceCity);
            if (populatedCity) {
              user.residenceCity = populatedCity;
            }
          }
          // 如果不是有效的ObjectId（可能是代码或名称），保持原样
        }
      }
    });

    res.json({
      success: true,
      count: users.length,
      data: users
    });
  } catch (error) {
    logger.error('Get users error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Server error'
    });
  }
});

// @desc    Get single user
// @route   GET /api/users/:id
// @access  Private
router.get('/:id', protect, asyncHandler(async (req, res) => {
  logger.info('Fetching user:', { userId: req.params.id, requestedBy: req.user.id });
  
  const user = await User.findById(req.params.id)
    .select('-password')
    .populate('manager', 'firstName lastName email');

  if (!user) {
    logger.warn('User not found:', { userId: req.params.id });
    throw ErrorFactory.notFound('User not found');
  }

  // Check if requester is admin or the user themselves
  if (req.user.role !== 'admin' && req.user.id !== user._id.toString()) {
    logger.warn('Unauthorized access attempt:', { 
      userId: req.params.id, 
      requesterId: req.user.id,
      requesterRole: req.user.role 
    });
    throw ErrorFactory.forbidden('Not authorized to access this user');
  }

  logger.info('User fetched successfully:', { userId: user.id });
  res.json({
    success: true,
    data: user
  });
}));

// @desc    Create new user
// @route   POST /api/users
// @access  Private/Admin
router.post('/', [
  protect,
  checkPermission(PERMISSIONS.USER_CREATE),
  body('employeeId').notEmpty().withMessage('Employee ID is required'),
  body('firstName').notEmpty().withMessage('First name is required'),
  body('lastName').notEmpty().withMessage('Last name is required'),
  body('email').isEmail().withMessage('Please include a valid email'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('department').notEmpty().withMessage('Department is required'),
  body('position').notEmpty().withMessage('Position is required'),
  body('role').notEmpty().withMessage('Role is required')
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
      employeeId,
      firstName,
      lastName,
      email,
      password,
      role,
      department,
      position,
      jobLevel,
      manager,
      phone,
      residenceCountry,
      residenceCity
    } = req.body;

    // Check if user exists
    const existingUser = await User.findOne({
      $or: [{ email }, { employeeId }]
    });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'User with this email or employee ID already exists'
      });
    }

    // Verify role exists and is active
    if (role) {
      const roleDoc = await Role.findOne({ code: role, isActive: true });
      if (!roleDoc) {
        return res.status(400).json({
          success: false,
          message: 'Invalid or inactive role'
        });
      }
    }

    // Verify position exists and is active
    if (position) {
      const positionDoc = await Position.findOne({ code: position, isActive: true });
      if (!positionDoc) {
        return res.status(400).json({
          success: false,
          message: 'Invalid or inactive position'
        });
      }
    }

    // 构建用户数据对象
    const userData = {
      employeeId,
      firstName,
      lastName,
      email,
      password,
      role,
      department,
      position,
      jobLevel: jobLevel || undefined,
      manager: manager || undefined,
      phone: phone || undefined,
    };
    
    // 只有当residenceCountry和residenceCity有值时才添加
    if (residenceCountry) {
      userData.residenceCountry = residenceCountry;
    }
    if (residenceCity) {
      userData.residenceCity = residenceCity;
    }
    
    const user = await User.create(userData);

    const userResponse = await User.findById(user._id)
      .select('-password')
      .populate('manager', 'firstName lastName email');

    // 清除部门用户缓存（如果用户有部门）
    if (department) {
      clearDepartmentUserCache(department);
    }

    res.status(201).json({
      success: true,
      data: userResponse
    });
  } catch (error) {
    logger.error('Create user error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Server error'
    });
  }
});

// @desc    Update user
// @route   PUT /api/users/:id
// @access  Private/Admin
router.put('/:id', [
  protect,
  checkPermission(PERMISSIONS.USER_EDIT),
  body('email').optional().isEmail().withMessage('Please include a valid email'),
  body('password').optional().isLength({ min: 6 }).withMessage('Password must be at least 6 characters')
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

    let user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const updateData = { ...req.body };

    // If email is being changed, check if new email already exists
    if (updateData.email && updateData.email !== user.email) {
      const existingUser = await User.findOne({ email: updateData.email });
      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: 'Email already exists'
        });
      }
    }

    // If employeeId is being changed, check if new employeeId already exists
    if (updateData.employeeId && updateData.employeeId !== user.employeeId) {
      const existingUser = await User.findOne({ employeeId: updateData.employeeId });
      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: 'Employee ID already exists'
        });
      }
    }

    // Verify role exists and is active (always validate if role is provided)
    if (updateData.role) {
      const roleDoc = await Role.findOne({ code: updateData.role, isActive: true });
      if (!roleDoc) {
        return res.status(400).json({
          success: false,
          message: `Invalid or inactive role: ${updateData.role}`
        });
      }
    }

    // Verify position exists and is active (always validate if position is provided)
    if (updateData.position) {
      const positionDoc = await Position.findOne({ code: updateData.position, isActive: true });
      if (!positionDoc) {
        return res.status(400).json({
          success: false,
          message: `Invalid or inactive position: ${updateData.position}`
        });
      }
    }

    // Don't allow updating password through this endpoint (use separate password reset endpoint)
    delete updateData.password;

    // 记录旧部门（如果部门被更改，需要清除旧部门的缓存）
    const oldDepartment = user.department;
    const newDepartment = updateData.department;

    user = await User.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    )
      .select('-password')
      .populate('manager', 'firstName lastName email');

    // 清除部门用户缓存（如果部门被更改或 isActive 状态改变）
    if (oldDepartment && oldDepartment !== newDepartment) {
      clearDepartmentUserCache(oldDepartment);
    }
    if (newDepartment && newDepartment !== oldDepartment) {
      clearDepartmentUserCache(newDepartment);
    }
    // 如果 isActive 状态改变，也需要清除缓存
    if (updateData.isActive !== undefined && updateData.isActive !== user.isActive) {
      if (oldDepartment) clearDepartmentUserCache(oldDepartment);
      if (newDepartment) clearDepartmentUserCache(newDepartment);
    }

    res.json({
      success: true,
      data: user
    });
  } catch (error) {
    logger.error('Update user error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Server error'
    });
  }
});

// @desc    Delete user
// @route   DELETE /api/users/:id
// @access  Private/Admin
router.delete('/:id', protect, checkPermission(PERMISSIONS.USER_DELETE), async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Soft delete: set isActive to false instead of actually deleting
    user.isActive = false;
    await user.save();

    res.json({
      success: true,
      message: 'User deleted successfully'
    });
  } catch (error) {
    logger.error('Delete user error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Server error'
    });
  }
});

// @desc    Toggle user active status
// @route   PATCH /api/users/:id/toggle-active
// @access  Private/Admin
router.patch('/:id/toggle-active', protect, checkPermission(PERMISSIONS.USER_TOGGLE_ACTIVE), async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    user.isActive = !user.isActive;
    await user.save();

    const userResponse = await User.findById(user._id)
      .select('-password')
      .populate('manager', 'firstName lastName email');

    res.json({
      success: true,
      data: userResponse
    });
  } catch (error) {
    logger.error('Toggle user active error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Server error'
    });
  }
});

module.exports = router;
