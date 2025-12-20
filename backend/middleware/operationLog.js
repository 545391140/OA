const OperationLog = require('../models/OperationLog');
const logger = require('../utils/logger');

/**
 * 操作日志中间件
 * 记录用户的操作行为
 */
const operationLogMiddleware = (options = {}) => {
  const {
    excludePaths = [],
    excludeMethods = ['GET'], // 默认排除GET请求
    includePaths = [],
    modules = {} // 路径到模块的映射，如 { '/api/users': 'user' }
  } = options;

  return async (req, res, next) => {
    // 如果路径在排除列表中，跳过记录
    if (excludePaths.some(path => req.path.startsWith(path))) {
      return next();
    }

    // 如果指定了包含列表且当前路径不在包含列表中，跳过记录
    if (includePaths.length > 0 && !includePaths.some(path => req.path.startsWith(path))) {
      return next();
    }

    // 如果请求方法在排除列表中，跳过记录
    if (excludeMethods.includes(req.method)) {
      return next();
    }

    // 标记是否已经记录过日志，避免重复记录
    let logRecorded = false;

    // 保存原始响应方法
    const originalSend = res.send;
    const originalJson = res.json;

    // 保存响应体以便在finish事件中使用
    let responseBody = null;

    // 拦截响应以获取操作结果
    res.send = function(body) {
      responseBody = body;
      return originalSend.call(this, body);
    };

    res.json = function(body) {
      responseBody = body;
      return originalJson.call(this, body);
    };

    // 在响应完成时记录日志（确保所有中间件都已执行，req.user已被设置）
    res.on('finish', () => {
      if (!logRecorded) {
        logRecorded = true;
        const status = res.statusCode >= 400 ? 'failed' : 'success';
        recordLog(req, res, responseBody, status);
      }
    });

    next();
  };

  async function recordLog(req, res, responseBody, status) {
    try {
      // 没有用户信息时不记录，但不影响主流程
      // 检查 req.user.id 或 req.user._id
      const userId = req.user?.id || req.user?._id;
      if (!req.user || !userId) {
        logger.debug('Operation log skipped: no user', { 
          path: req.path, 
          method: req.method,
          hasUser: !!req.user,
          userId: userId,
          userKeys: req.user ? Object.keys(req.user) : []
        });
        return;
      }

      // 确定模块名称
      let module = 'unknown';
      // 使用 req.originalUrl 或 req.path，优先使用 originalUrl 以获取完整路径
      const path = req.originalUrl || req.path;

      // 从路径映射中查找模块
      for (const [pathPrefix, moduleName] of Object.entries(modules)) {
        if (path.startsWith(pathPrefix)) {
          module = moduleName;
          break;
        }
      }

      // 如果没有找到映射，从路径推断
      if (module === 'unknown') {
        const pathParts = path.split('/').filter(Boolean);
        // 查找 'api' 后面的部分作为模块名
        const apiIndex = pathParts.indexOf('api');
        if (apiIndex >= 0 && apiIndex < pathParts.length - 1) {
          module = pathParts[apiIndex + 1].replace(/-/g, '_');
        }
      }

      // 确定操作动作
      let action = 'unknown';
      const method = req.method;
      switch (method) {
        case 'POST':
          action = 'create';
          break;
        case 'PUT':
        case 'PATCH':
          action = 'update';
          break;
        case 'DELETE':
          action = 'delete';
          break;
        case 'GET':
          action = 'view';
          break;
        default:
          action = method.toLowerCase();
      }

      // 确定资源类型（从路径推断）
      let resourceType = 'Unknown';
      const pathParts = path.split('/').filter(Boolean);
      const apiIndex = pathParts.indexOf('api');
      if (apiIndex >= 0 && apiIndex < pathParts.length - 1) {
        const resource = pathParts[apiIndex + 1];
        resourceType = resource.split('-').map(word => 
          word.charAt(0).toUpperCase() + word.slice(1)
        ).join('');
      }

      // 提取资源ID
      let resourceId = null;
      if (pathParts.length >= 3) {
        resourceId = pathParts[2];
      }

      // 构建操作描述
      let description = `${method} ${path}`;
      if (responseBody && typeof responseBody === 'object') {
        if (responseBody.success === false) {
          description = responseBody.message || description;
        }
      }

      // 提取错误信息
      let errorMessage = null;
      if (status === 'failed' && responseBody && typeof responseBody === 'object') {
        errorMessage = responseBody.message || responseBody.error || null;
      }

      // 获取IP和User-Agent
      const ipAddress = req.ip || req.connection.remoteAddress || req.headers['x-forwarded-for']?.split(',')[0] || 'unknown';
      const userAgent = req.headers['user-agent'] || 'unknown';

      // 记录操作日志
      const logData = {
        userId: userId,
        email: req.user.email || 'unknown',
        employeeId: req.user.employeeId || null,
        module,
        action,
        resourceType,
        resourceId,
        description,
        ipAddress,
        userAgent,
        requestMethod: method,
        requestPath: path,
        status,
        errorMessage,
        metadata: {
          query: req.query,
          body: method !== 'GET' ? sanitizeRequestBody(req.body) : undefined
        }
      };
      
      await OperationLog.create(logData);
      logger.info('Operation log recorded:', { 
        userId: userId, 
        module, 
        action, 
        path,
        status 
      });
    } catch (error) {
      // 记录日志失败不应该影响主流程
      logger.warn('Failed to record operation log:', error.message);
      logger.debug('Operation log error details:', { 
        path: req.path, 
        method: req.method,
        error: error.stack 
      });
    }
  }

  // 清理请求体中的敏感信息
  function sanitizeRequestBody(body) {
    if (!body || typeof body !== 'object') {
      return body;
    }

    const sanitized = { ...body };
    const sensitiveFields = ['password', 'token', 'secret', 'apiKey', 'creditCard', 'cvv'];

    for (const field of sensitiveFields) {
      if (sanitized[field]) {
        sanitized[field] = '***REDACTED***';
      }
    }

    return sanitized;
  }
};

module.exports = operationLogMiddleware;

