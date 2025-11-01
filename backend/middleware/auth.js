const jwt = require('jsonwebtoken');
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
        // Create mock user for development
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
        console.log('✅ [AUTH] Development mode: Using mock user with admin role');
        return next();
      }
      
      if (isMockToken) {
        console.log('⚠️  [AUTH] Mock token detected but not in dev mode. NODE_ENV:', process.env.NODE_ENV);
      }

      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-super-secret-jwt-key-here');

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
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `User role ${req.user.role} is not authorized to access this route`
      });
    }
    next();
  };
};

module.exports = { protect, authorize };
