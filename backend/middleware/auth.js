const jwt = require('jsonwebtoken');
const config = require('../config');
const User = require('../models/User');
const Role = require('../models/Role');

// Protect routes
const protect = async (req, res, next) => {
  // 添加日志以追踪请求
  if (req.path && req.path.includes('/dashboard')) {
    console.log('[AUTH_PROTECT] Dashboard route protected:', req.method, req.path);
    console.log('[AUTH_PROTECT] Authorization header:', req.headers.authorization ? 'Present' : 'Missing');
  }
  
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

// Grant access to specific roles or roles with equivalent permissions
// This middleware checks role first, then falls back to permission check
const authorize = (...roles) => {
  return async (req, res, next) => {
    try {
      const userRole = req.user.role ? req.user.role.toUpperCase() : '';
      const allowedRoles = roles.map(r => r.toUpperCase());
      
      // Admin role has access to everything
      if (userRole === 'ADMIN') {
        return next();
      }
      
      // Check if user's role is in the allowed list
      if (allowedRoles.includes(userRole)) {
        return next();
      }
      
      // If role doesn't match, check if user has equivalent permissions
      // This allows custom roles (like CW001) to access routes if they have the right permissions
      if (!req.user.role) {
        return res.status(403).json({
          success: false,
          message: `User role ${req.user.role} is not authorized to access this route`
        });
      }

      const role = await Role.findOne({ code: req.user.role, isActive: true });
      
      if (!role) {
        return res.status(403).json({
          success: false,
          message: `Role ${req.user.role} not found or inactive`
        });
      }

      // Map roles to their typical permissions for fallback check
      // If user has finance-like permissions, allow access to finance routes
      const rolePermissionMap = {
        'FINANCE': [
          'travel.standard.view', 'travel.standard.create', 'travel.standard.edit',
          'expense.item.view', 'expense.item.create', 'expense.item.edit',
          'location.view', 'location.create', 'location.edit',
          'job.level.view', 'job.level.create', 'job.level.edit',
          'city.level.view', 'city.level.create', 'city.level.edit'
        ],
        'ADMIN': [] // Admin already handled above
      };

      // Check if user has permissions equivalent to the required role
      const userPermissions = role.permissions || [];
      let hasEquivalentPermissions = false;

      // Check if user has permissions that match finance role
      if (allowedRoles.includes('FINANCE') && rolePermissionMap.FINANCE) {
        hasEquivalentPermissions = rolePermissionMap.FINANCE.some(permission => 
          userPermissions.includes(permission)
        );
      }

      if (hasEquivalentPermissions) {
        return next();
      }
      
      // If no match, deny access
      return res.status(403).json({
        success: false,
        message: `User role ${req.user.role} is not authorized to access this route`
      });
    } catch (error) {
      console.error('Authorization check error:', error);
      return res.status(500).json({
        success: false,
        message: 'Error checking authorization'
      });
    }
  };
};

// Check if user has specific permission(s)
// Usage: checkPermission('user.view', 'user.create')
const checkPermission = (...requiredPermissions) => {
  return async (req, res, next) => {
    try {
      // Admin role has access to everything
      if (req.user.role && req.user.role.toUpperCase() === 'ADMIN') {
        return next();
      }

      // Get user's role and its permissions
      if (!req.user.role) {
        return res.status(403).json({
          success: false,
          message: 'User has no role assigned'
        });
      }

      const role = await Role.findOne({ code: req.user.role, isActive: true });
      
      if (!role) {
        return res.status(403).json({
          success: false,
          message: `Role ${req.user.role} not found or inactive`
        });
      }

      // Check if user's role has at least one of the required permissions
      const userPermissions = role.permissions || [];
      const hasPermission = requiredPermissions.some(permission => 
        userPermissions.includes(permission)
      );

      if (!hasPermission) {
        return res.status(403).json({
          success: false,
          message: `User does not have required permission(s): ${requiredPermissions.join(', ')}`
        });
      }

      next();
    } catch (error) {
      console.error('Permission check error:', error);
      return res.status(500).json({
        success: false,
        message: 'Error checking permissions'
      });
    }
  };
};

module.exports = { protect, authorize, checkPermission };
