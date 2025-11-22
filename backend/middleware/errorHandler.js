const logger = require('../utils/logger');
const { AppError } = require('../utils/AppError');

/**
 * 全局错误处理中间件
 * 统一处理所有错误，包括操作错误和编程错误
 */
const errorHandler = (err, req, res, next) => {
  let error = { ...err };
  error.message = err.message;

  // 记录错误信息
  const errorDetails = {
    message: err.message,
    stack: err.stack,
    url: req.originalUrl,
    method: req.method,
    ip: req.ip,
    user: req.user ? req.user.id : 'anonymous',
  };

  // Mongoose bad ObjectId (CastError)
  if (err.name === 'CastError') {
    const message = 'Resource not found';
    error = new AppError(message, 404);
  }

  // Mongoose duplicate key
  if (err.code === 11000) {
    const field = Object.keys(err.keyPattern || {})[0] || 'field';
    const message = `Duplicate ${field} value entered`;
    error = new AppError(message, 400);
  }

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const messages = Object.values(err.errors).map(val => val.message);
    const message = messages.join(', ');
    error = new AppError(message, 400);
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    const message = 'Invalid token';
    error = new AppError(message, 401);
  }

  if (err.name === 'TokenExpiredError') {
    const message = 'Token expired';
    error = new AppError(message, 401);
  }

  // 记录错误日志
  if (error.statusCode >= 500) {
    // 服务器错误 - 记录完整错误信息
    logger.error('Server Error:', {
      ...errorDetails,
      statusCode: error.statusCode || 500,
      error: err,
    });
  } else {
    // 客户端错误 - 只记录警告
    logger.warn('Client Error:', {
      ...errorDetails,
      statusCode: error.statusCode || 400,
    });
  }

  // 发送错误响应
  const statusCode = error.statusCode || 500;
  const message = error.message || 'Server Error';

  res.status(statusCode).json({
    success: false,
    message,
    ...(process.env.NODE_ENV === 'development' && {
      stack: err.stack,
      error: err.name,
    }),
  });
};

module.exports = errorHandler;
