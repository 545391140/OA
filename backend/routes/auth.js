const express = require('express');
const { body, validationResult } = require('express-validator');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Role = require('../models/Role');
const Position = require('../models/Position');
const { protect } = require('../middleware/auth');

const router = express.Router();

// Generate JWT Token
const generateToken = (id) => {
  const secret = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production';
  if (!process.env.JWT_SECRET) {
    console.warn('⚠️  WARNING: JWT_SECRET not set, using default. This is insecure for production!');
  }
  return jwt.sign({ id }, secret, {
    expiresIn: process.env.JWT_EXPIRE || '7d',
  });
};

// @desc    Register user
// @route   POST /api/auth/register
// @access  Public
router.post('/register', [
  body('employeeId').notEmpty().withMessage('Employee ID is required'),
  body('firstName').notEmpty().withMessage('First name is required'),
  body('lastName').notEmpty().withMessage('Last name is required'),
  body('email').isEmail().withMessage('Please include a valid email'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('department').notEmpty().withMessage('Department is required'),
  body('position').notEmpty().withMessage('Position is required')
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

    const { employeeId, firstName, lastName, email, password, department, position, manager, phone } = req.body;

    // Check if user exists
    const existingUser = await User.findOne({
      $or: [{ email }, { employeeId }]
    });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'User already exists with this email or employee ID'
      });
    }

    // Create user
    const user = await User.create({
      employeeId,
      firstName,
      lastName,
      email,
      password,
      department,
      position,
      manager,
      phone
    });

    const token = generateToken(user._id);

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      token,
      user: {
        id: user._id,
        employeeId: user.employeeId,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role,
        department: user.department,
        position: user.position,
        preferences: user.preferences
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during registration'
    });
  }
});

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
router.post('/login', [
  body('email').isEmail().withMessage('Please include a valid email'),
  body('password').notEmpty().withMessage('Password is required')
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

    const { email, password } = req.body;

    console.log(`[LOGIN] Attempting login for email: ${email}`);

    // Check for user
    const user = await User.findOne({ email }).select('+password');

    if (!user) {
      console.log(`[LOGIN] User not found: ${email}`);
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    console.log(`[LOGIN] User found: ${email}, isActive: ${user.isActive}`);

    // Check if user is active
    if (!user.isActive) {
      console.log(`[LOGIN] User account is deactivated: ${email}`);
      return res.status(401).json({
        success: false,
        message: 'Account is deactivated'
      });
    }

    // Check password
    const isMatch = await user.matchPassword(password);

    if (!isMatch) {
      console.log(`[LOGIN] Password mismatch for user: ${email}`);
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    console.log(`[LOGIN] Login successful for user: ${email}`);

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    const token = generateToken(user._id);

    res.json({
      success: true,
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        employeeId: user.employeeId,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role,
        department: user.department,
        position: user.position,
        preferences: user.preferences,
        lastLogin: user.lastLogin
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during login'
    });
  }
});

// @desc    Get current user
// @route   GET /api/auth/me
// @access  Private
router.get('/me', protect, async (req, res) => {
  try {
    let user = null;
    const mongoose = require('mongoose');
    
    // 优先尝试通过 ID 查找用户（真实用户或有效的 ObjectId）
    if (req.user._id && mongoose.Types.ObjectId.isValid(req.user._id)) {
      user = await User.findById(req.user._id)
        .select('-password')
        .populate('manager', 'firstName lastName email');
    }
    
    // 如果通过 ID 没找到，尝试通过 email 查找（开发模式下可能使用 mock user）
    if (!user && req.user.email) {
      user = await User.findOne({ email: req.user.email })
        .select('-password')
        .populate('manager', 'firstName lastName email');
    }
    
    // 如果数据库中找到了用户，返回真实数据
    if (user) {
      // 获取角色和岗位的详细信息
      let roleInfo = null;
      let positionInfo = null;
      
      if (user.role) {
        const role = await Role.findOne({ code: user.role, isActive: true });
        if (role) {
          roleInfo = {
            code: role.code,
            name: role.name,
            nameEn: role.nameEn
          };
        }
      }
      
      if (user.position) {
        const position = await Position.findOne({ code: user.position, isActive: true });
        if (position) {
          positionInfo = {
            code: position.code,
            name: position.name,
            nameEn: position.nameEn,
            department: position.department
          };
        }
      }

      return res.json({
        success: true,
        user: {
          id: user._id,
          employeeId: user.employeeId,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          role: user.role,
          roleInfo: roleInfo,
          department: user.department,
          position: user.position,
          positionInfo: positionInfo,
          jobLevel: user.jobLevel,
          manager: user.manager,
          phone: user.phone,
          avatar: user.avatar,
          preferences: user.preferences || {},
          lastLogin: user.lastLogin,
          isActive: user.isActive,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt
        }
      });
    }
    
    // 如果数据库中没有找到用户，返回 mock 数据（仅作为后备方案）
    // 这种情况应该很少见，因为开发模式应该使用真实数据库
    console.warn('⚠️  User not found in database, returning mock data. User email:', req.user.email);
    return res.json({
      success: true,
      user: {
        id: req.user.id || req.user._id,
        employeeId: req.user.employeeId || 'DEMO001',
        firstName: req.user.firstName || 'John',
        lastName: req.user.lastName || 'Doe',
        email: req.user.email || 'demo@company.com',
        role: req.user.role || 'admin',
        roleInfo: null,
        department: req.user.department || 'Sales',
        position: req.user.position || 'Senior Manager',
        positionInfo: null,
        jobLevel: req.user.jobLevel || '',
        manager: null,
        phone: req.user.phone || '',
        avatar: req.user.avatar || '',
        preferences: req.user.preferences || {
          language: req.user.language || 'en',
          currency: req.user.currency || 'USD',
          timezone: req.user.timezone || 'UTC'
        },
        lastLogin: req.user.lastLogin || null,
        isActive: true,
        createdAt: req.user.createdAt || new Date(),
        updatedAt: req.user.updatedAt || new Date()
      }
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Server error'
    });
  }
});

// @desc    Update user preferences
// @route   PUT /api/auth/preferences
// @access  Private
router.put('/preferences', protect, [
  body('language').optional().isIn(['en', 'zh', 'ja', 'ko']).withMessage('Invalid language'),
  body('currency').optional().isIn(['USD', 'CNY', 'JPY', 'KRW', 'EUR']).withMessage('Invalid currency')
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

    const user = await User.findByIdAndUpdate(
      req.user.id,
      { preferences: req.body },
      { new: true, runValidators: true }
    );

    res.json({
      success: true,
      message: 'Preferences updated successfully',
      preferences: user.preferences
    });
  } catch (error) {
    console.error('Update preferences error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @desc    Change password
// @route   PUT /api/auth/change-password
// @access  Private
router.put('/change-password', protect, [
  body('currentPassword').notEmpty().withMessage('Current password is required'),
  body('newPassword').isLength({ min: 6 }).withMessage('New password must be at least 6 characters')
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

    const { currentPassword, newPassword } = req.body;

    const user = await User.findById(req.user.id).select('+password');

    // Check current password
    const isMatch = await user.matchPassword(currentPassword);

    if (!isMatch) {
      return res.status(400).json({
        success: false,
        message: 'Current password is incorrect'
      });
    }

    user.password = newPassword;
    await user.save();

    res.json({
      success: true,
      message: 'Password changed successfully'
    });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

module.exports = router;
