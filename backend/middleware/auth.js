const jwt = require('jsonwebtoken');
const config = require('../config');
const User = require('../models/User');

// Protect routes
const protect = async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      // Get token from header
      token = req.headers.authorization.split(' ')[1];

      // Development mode: Support mock tokens (when NODE_ENV is development or undefined)
      const isDevMode = !process.env.NODE_ENV || process.env.NODE_ENV === 'development';
      const isMockToken = token.startsWith('mock-jwt-token-');
      
      if (isDevMode && isMockToken) {
        // 开发模式下，尝试从数据库查找真实用户
        // 优先查找 admin 角色的用户，如果没有则使用第一个用户
        try {
          let realUser = await User.findOne({ role: 'admin', isActive: true })
            .select('-password')
            .sort({ createdAt: -1 })
            .limit(1);
          
          // 如果没有 admin 用户，查找任意激活的用户
          if (!realUser) {
            realUser = await User.findOne({ isActive: true })
              .select('-password')
              .sort({ createdAt: -1 })
              .limit(1);
          }
          
          if (realUser) {
            // 使用真实用户数据
            req.user = realUser;
            console.log(`✅ [AUTH] Development mode: Using real user from database - ${realUser.email}`);
          } else {
            // 如果数据库中没有用户，使用 mock user
            req.user = {
              _id: '507f1f77bcf86cd799439011',
              id: '507f1f77bcf86cd799439011',
              email: 'demo@company.com',
              firstName: 'John',
              lastName: 'Doe',
              department: 'Sales',
              position: 'Senior Manager',
              role: 'admin',
              language: 'en',
              currency: 'USD',
              timezone: 'UTC'
            };
            console.log('⚠️  [AUTH] Development mode: No users in database, using mock user');
          }
        } catch (error) {
          console.error('Error fetching user in dev mode:', error);
          // 出错时使用 mock user
          req.user = {
            _id: '507f1f77bcf86cd799439011',
            id: '507f1f77bcf86cd799439011',
            email: 'demo@company.com',
            firstName: 'John',
            lastName: 'Doe',
            department: 'Sales',
            position: 'Senior Manager',
            role: 'admin',
            language: 'en',
            currency: 'USD',
            timezone: 'UTC'
          };
          console.log('⚠️  [AUTH] Development mode: Error fetching user, using mock user');
        }
        return next();
      }
      
      if (isMockToken) {
        console.log('⚠️  [AUTH] Mock token detected but not in dev mode. NODE_ENV:', process.env.NODE_ENV);
      }

      // Verify token
      const secret = process.env.JWT_SECRET || config.JWT_SECRET;
      const decoded = jwt.verify(token, secret);

      // Get user from the token
      req.user = await User.findById(decoded.id).select('-password');

      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Not authorized, user not found'
        });
      }

      next();
    } catch (error) {
      console.error('Token verification error:', error);
      return res.status(401).json({
        success: false,
        message: 'Not authorized, token failed'
      });
    }
  }

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Not authorized, no token'
    });
  }
};

// Grant access to specific roles
const authorize = (...roles) => {
  return (req, res, next) => {
    const userRole = req.user.role ? req.user.role.toUpperCase() : '';
    const allowedRoles = roles.map(r => r.toUpperCase());
    
    // Admin role has access to everything
    if (userRole === 'ADMIN') {
      return next();
    }
    
    if (!allowedRoles.includes(userRole)) {
      return res.status(403).json({
        success: false,
        message: `User role ${req.user.role} is not authorized to access this route`
      });
    }
    next();
  };
};

module.exports = { protect, authorize };
