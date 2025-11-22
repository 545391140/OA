/**
 * 自定义应用错误类
 * 用于创建标准化的错误对象
 */
class AppError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * 创建常见错误类型的便捷方法
 */
class ErrorFactory {
  /**
   * 创建"未找到"错误
   */
  static notFound(message = 'Resource not found') {
    return new AppError(message, 404);
  }

  /**
   * 创建"未授权"错误
   */
  static unauthorized(message = 'Not authorized') {
    return new AppError(message, 401);
  }

  /**
   * 创建"禁止访问"错误
   */
  static forbidden(message = 'Forbidden') {
    return new AppError(message, 403);
  }

  /**
   * 创建"验证错误"
   */
  static validation(message = 'Validation error') {
    return new AppError(message, 400);
  }

  /**
   * 创建"冲突"错误
   */
  static conflict(message = 'Resource conflict') {
    return new AppError(message, 409);
  }

  /**
   * 创建"服务器错误"
   */
  static serverError(message = 'Internal server error') {
    return new AppError(message, 500);
  }

  /**
   * 创建"错误请求"错误
   */
  static badRequest(message = 'Bad request') {
    return new AppError(message, 400);
  }
}

module.exports = { AppError, ErrorFactory };

