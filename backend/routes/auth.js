const express = require('express');
const { body, validationResult } = require('express-validator');
const jwt = require('jsonwebtoken');
const config = require('../config');
const asyncHandler = require('../utils/asyncHandler');
const logger = require('../utils/logger');
const { ErrorFactory } = require('../utils/AppError');
const User = require('../models/User');
const Role = require('../models/Role');
const Position = require('../models/Position');
const LoginLog = require('../models/LoginLog');
const { protect } = require('../middleware/auth');

const router = express.Router();

// Generate JWT Token
const generateToken = (id) => {
  const secret = process.env.JWT_SECRET || config.JWT_SECRET;
  if (!process.env.JWT_SECRET) {
    logger.warn('⚠️  WARNING: JWT_SECRET not set, using default. This is insecure for production!');
  }
  return jwt.sign({ id }, secret, {
    expiresIn: process.env.JWT_EXPIRE || config.JWT_EXPIRE,
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
], asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw ErrorFactory.validation('Validation errors: ' + errors.array().map(e => e.msg).join(', '));
  }

  const { employeeId, firstName, lastName, email, password, department, position, manager, phone } = req.body;

  logger.info('User registration attempt:', { email, employeeId });

  // Check if user exists
  const existingUser = await User.findOne({
    $or: [{ email }, { employeeId }]
  });

  if (existingUser) {
    logger.warn('Registration failed - user already exists:', { email, employeeId });
    throw ErrorFactory.conflict('User already exists with this email or employee ID');
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

  logger.info('User registered successfully:', { userId: user._id, email: user.email });

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
}));

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
router.post('/login', [
  body('email').isEmail().withMessage('Please include a valid email'),
  body('password').notEmpty().withMessage('Password is required')
], asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw ErrorFactory.validation('Validation errors: ' + errors.array().map(e => e.msg).join(', '));
  }

  const { email, password } = req.body;

  logger.info('Login attempt:', { email });

  // Check for user with retry logic for MongoDB topology errors
  let user;
  let retryCount = 0;
  const maxRetries = 3;
  const retryDelay = 1000; // 1秒

  while (retryCount < maxRetries) {
    try {
      user = await User.findOne({ email }).select('+password');
      break; // 成功，退出重试循环
    } catch (error) {
      // 如果是MongoDB拓扑选择错误，进行重试
      if (error.name === 'MongoServerSelectionError' && retryCount < maxRetries - 1) {
        retryCount++;
        logger.warn(`Login query retry ${retryCount}/${maxRetries} due to topology error:`, error.message);
        // 等待后重试
        await new Promise(resolve => setTimeout(resolve, retryDelay * retryCount));
        continue;
      }
      // 其他错误或达到最大重试次数，抛出错误
      throw error;
    }
  }

  if (!user) {
    logger.warn('Login failed - user not found:', { email });
    // Record failed login log
    try {
      const ipAddress = req.ip || req.connection.remoteAddress || req.headers['x-forwarded-for']?.split(',')[0] || 'unknown';
      const userAgent = req.headers['user-agent'] || 'unknown';
      
      await LoginLog.create({
        email,
        ipAddress,
        userAgent,
        status: 'failed',
        failureReason: 'User not found'
      });
    } catch (logError) {
      logger.warn('Failed to record failed login log:', logError.message);
    }
    throw ErrorFactory.unauthorized('Invalid credentials');
  }

  logger.debug('User found:', { email, isActive: user.isActive });

  // Check if user is active
  if (!user.isActive) {
    logger.warn('Login failed - account deactivated:', { email });
    // Record failed login log
    try {
      const ipAddress = req.ip || req.connection.remoteAddress || req.headers['x-forwarded-for']?.split(',')[0] || 'unknown';
      const userAgent = req.headers['user-agent'] || 'unknown';
      
      await LoginLog.create({
        userId: user._id,
        email: user.email,
        employeeId: user.employeeId,
        ipAddress,
        userAgent,
        status: 'failed',
        failureReason: 'Account deactivated'
      });
    } catch (logError) {
      logger.warn('Failed to record failed login log:', logError.message);
    }
    throw ErrorFactory.unauthorized('Account is deactivated');
  }

  // Check password
  const isMatch = await user.matchPassword(password);

  if (!isMatch) {
    logger.warn('Login failed - password mismatch:', { email });
    // Record failed login log
    try {
      const ipAddress = req.ip || req.connection.remoteAddress || req.headers['x-forwarded-for']?.split(',')[0] || 'unknown';
      const userAgent = req.headers['user-agent'] || 'unknown';
      
      await LoginLog.create({
        userId: user._id,
        email: user.email,
        employeeId: user.employeeId,
        ipAddress,
        userAgent,
        status: 'failed',
        failureReason: 'Invalid password'
      });
    } catch (logError) {
      logger.warn('Failed to record failed login log:', logError.message);
    }
    throw ErrorFactory.unauthorized('Invalid credentials');
  }

  logger.info('Login successful:', { userId: user._id, email: user.email });

  // Update last login with retry logic
  user.lastLogin = new Date();
  retryCount = 0;
  while (retryCount < maxRetries) {
    try {
      await user.save();
      break; // 成功，退出重试循环
    } catch (error) {
      // 如果是MongoDB拓扑选择错误，进行重试
      if (error.name === 'MongoServerSelectionError' && retryCount < maxRetries - 1) {
        retryCount++;
        logger.warn(`Save lastLogin retry ${retryCount}/${maxRetries} due to topology error:`, error.message);
        await new Promise(resolve => setTimeout(resolve, retryDelay * retryCount));
        continue;
      }
      // 其他错误或达到最大重试次数，记录警告但继续（不影响登录）
      logger.warn('Failed to update lastLogin:', error.message);
      break;
    }
  }

  // Get user permissions from role with retry logic
  let permissions = [];
  if (user.role) {
    retryCount = 0;
    while (retryCount < maxRetries) {
      try {
        const role = await Role.findOne({ code: user.role, isActive: true });
        if (role) {
          permissions = role.permissions || [];
        }
        break; // 成功，退出重试循环
      } catch (error) {
        // 如果是MongoDB拓扑选择错误，进行重试
        if (error.name === 'MongoServerSelectionError' && retryCount < maxRetries - 1) {
          retryCount++;
          logger.warn(`Role query retry ${retryCount}/${maxRetries} due to topology error:`, error.message);
          await new Promise(resolve => setTimeout(resolve, retryDelay * retryCount));
          continue;
        }
        // 其他错误或达到最大重试次数，记录警告但继续（使用空权限数组）
        logger.warn('Failed to fetch role permissions:', error.message);
        break;
      }
    }
  }

  const token = generateToken(user._id);

  // Record login log
  try {
    const ipAddress = req.ip || req.connection.remoteAddress || req.headers['x-forwarded-for']?.split(',')[0] || 'unknown';
    const userAgent = req.headers['user-agent'] || 'unknown';
    
    await LoginLog.create({
      userId: user._id,
      email: user.email,
      employeeId: user.employeeId,
      ipAddress,
      userAgent,
      status: 'success'
    });
  } catch (logError) {
    // Log error but don't fail login
    logger.warn('Failed to record login log:', logError.message);
  }

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
      permissions: permissions,
      department: user.department,
      position: user.position,
      preferences: user.preferences,
      lastLogin: user.lastLogin
    }
  });
}));

// @desc    Get current user
// @route   GET /api/auth/me
// @access  Private
router.get('/me', protect, asyncHandler(async (req, res) => {
  let user = null;
  const mongoose = require('mongoose');
  
  logger.debug('Getting current user:', { userId: req.user.id, email: req.user.email });
  
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
    let permissions = [];
    
    if (user.role) {
      const role = await Role.findOne({ code: user.role, isActive: true });
      if (role) {
        roleInfo = {
          code: role.code,
          name: role.name,
          nameEn: role.nameEn
        };
        // 获取角色的权限
        permissions = role.permissions || [];
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

    // 处理常驻国和常驻城市（如果是 ObjectId，需要 populate）
    const Location = require('../models/Location');
    let residenceCountry = user.residenceCountry;
    let residenceCity = user.residenceCity;
    
    // 如果 residenceCountry 是 ObjectId，尝试 populate
    if (residenceCountry && mongoose.Types.ObjectId.isValid(residenceCountry)) {
      const countryLocation = await Location.findById(residenceCountry).lean();
      if (countryLocation) {
        residenceCountry = countryLocation;
      }
    }
    
    // 如果 residenceCity 是 ObjectId，尝试 populate
    if (residenceCity && mongoose.Types.ObjectId.isValid(residenceCity)) {
      const cityLocation = await Location.findById(residenceCity).lean();
      if (cityLocation) {
        residenceCity = cityLocation;
      }
    }

    logger.debug('User found in database:', { userId: user._id, email: user.email });
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
        permissions: permissions,
        department: user.department,
        position: user.position,
        positionInfo: positionInfo,
        jobLevel: user.jobLevel,
        manager: user.manager,
        phone: user.phone,
        dateOfBirth: user.dateOfBirth,
        residenceCountry: residenceCountry,
        residenceCity: residenceCity,
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
  logger.warn('⚠️  User not found in database, returning mock data:', { email: req.user.email });
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
}));

// @desc    Update user preferences
// @route   PUT /api/auth/preferences
// @access  Private
router.put('/preferences', protect, asyncHandler(async (req, res) => {
  // 验证语言
  const validLanguages = ['en', 'zh', 'ja', 'ko', 'ar', 'vi', 'th'];
  if (req.body.language && !validLanguages.includes(req.body.language)) {
    throw ErrorFactory.validation(`Invalid language. Must be one of: ${validLanguages.join(', ')}`);
  }

  // 验证币种：从数据库获取活跃币种列表
  if (req.body.currency) {
    const Currency = require('../models/Currency');
    const activeCurrencies = await Currency.find({ isActive: true }).select('code').lean();
    const validCurrencyCodes = activeCurrencies.map(c => c.code);
    
    // 确保CNY始终在列表中（即使数据库中没有）
    if (!validCurrencyCodes.includes('CNY')) {
      validCurrencyCodes.push('CNY');
    }
    
    if (!validCurrencyCodes.includes(req.body.currency.toUpperCase())) {
      throw ErrorFactory.validation(`Invalid currency. Must be one of active currencies: ${validCurrencyCodes.join(', ')}`);
    }
    
    // 转换为大写
    req.body.currency = req.body.currency.toUpperCase();
  }

  logger.info('Updating user preferences:', { userId: req.user.id, preferences: req.body });

  const user = await User.findByIdAndUpdate(
    req.user.id,
    { preferences: req.body },
    { new: true, runValidators: true }
  );

  if (!user) {
    throw ErrorFactory.notFound('User not found');
  }

  logger.info('User preferences updated successfully:', { userId: user._id });
  res.json({
    success: true,
    message: 'Preferences updated successfully',
    preferences: user.preferences
  });
}));

// @desc    Update current user profile
// @route   PUT /api/auth/profile
// @access  Private
router.put('/profile', protect, [
  body('email').optional().isEmail().withMessage('Please include a valid email'),
  body('firstName').optional().notEmpty().withMessage('First name cannot be empty'),
  body('lastName').optional().notEmpty().withMessage('Last name cannot be empty')
], asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw ErrorFactory.validation('Validation errors: ' + errors.array().map(e => e.msg).join(', '));
  }

  const { firstName, lastName, email, phone, department, jobLevel, dateOfBirth } = req.body;

  logger.info('Updating user profile:', { userId: req.user.id, updateData: { firstName, lastName, email, phone, department, jobLevel, dateOfBirth } });

  // 构建更新数据对象，只包含提供的字段
  const updateData = {};
  if (firstName !== undefined) updateData.firstName = firstName;
  if (lastName !== undefined) updateData.lastName = lastName;
  if (email !== undefined) updateData.email = email;
  if (phone !== undefined) updateData.phone = phone;
  if (department !== undefined) updateData.department = department;
  if (jobLevel !== undefined) updateData.jobLevel = jobLevel;
  if (dateOfBirth !== undefined) {
    // 如果dateOfBirth是字符串，转换为Date对象；如果是null，设置为null
    updateData.dateOfBirth = dateOfBirth ? new Date(dateOfBirth) : null;
  }

  // 如果邮箱被更改，检查新邮箱是否已存在
  if (updateData.email && updateData.email !== req.user.email) {
    const existingUser = await User.findOne({ email: updateData.email });
    if (existingUser) {
      throw ErrorFactory.conflict('Email already exists');
    }
  }

  const user = await User.findByIdAndUpdate(
    req.user.id,
    updateData,
    { new: true, runValidators: true }
  ).select('-password');

  if (!user) {
    throw ErrorFactory.notFound('User not found');
  }

  logger.info('User profile updated successfully:', { userId: user._id });
  res.json({
    success: true,
    message: 'Profile updated successfully',
    user: {
      id: user._id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      phone: user.phone,
      department: user.department,
      jobLevel: user.jobLevel,
      dateOfBirth: user.dateOfBirth
    }
  });
}));

// @desc    Change password
// @route   PUT /api/auth/change-password
// @access  Private
router.put('/change-password', protect, [
  body('currentPassword').notEmpty().withMessage('Current password is required'),
  body('newPassword').isLength({ min: 6 }).withMessage('New password must be at least 6 characters')
], asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw ErrorFactory.validation('Validation errors: ' + errors.array().map(e => e.msg).join(', '));
  }

  const { currentPassword, newPassword } = req.body;

  logger.info('Password change attempt:', { userId: req.user.id });

  const user = await User.findById(req.user.id).select('+password');

  if (!user) {
    throw ErrorFactory.notFound('User not found');
  }

  // Check current password
  const isMatch = await user.matchPassword(currentPassword);

  if (!isMatch) {
    logger.warn('Password change failed - incorrect current password:', { userId: req.user.id });
    throw ErrorFactory.badRequest('Current password is incorrect');
  }

  user.password = newPassword;
  await user.save();

  logger.info('Password changed successfully:', { userId: user._id });
  res.json({
    success: true,
    message: 'Password changed successfully'
  });
}));

module.exports = router;
