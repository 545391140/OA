const Role = require('../models/Role');
const { checkDataAccess } = require('../utils/dataScope');
const { checkInvoiceAccess } = require('../utils/invoiceDataScope');
const { ErrorFactory } = require('../utils/AppError');
const logger = require('../utils/logger');

/**
 * 加载用户角色中间件
 * 自动查询用户角色并附加到 req.role，避免在每个路由中重复查询
 */
const loadUserRole = async (req, res, next) => {
  try {
    if (!req.user || !req.user.role) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
    }

    // 如果已经加载过角色，直接跳过
    if (req.role) {
      return next();
    }

    const role = await Role.findOne({ code: req.user.role, isActive: true });
    if (!role) {
      logger.warn(`Role not found or inactive: ${req.user.role}`);
      return res.status(403).json({
        success: false,
        message: `Role ${req.user.role} not found or inactive`
      });
    }

    // 将角色附加到请求对象
    req.role = role;
    next();
  } catch (error) {
    logger.error('Load user role error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to load user role'
    });
  }
};

/**
 * 检查数据访问权限的辅助函数
 * 用于在路由处理函数中检查权限
 * 
 * @param {Object} req - Express 请求对象
 * @param {Object} resource - 资源对象
 * @param {String} resourceType - 资源类型 ('expense', 'travel', 'invoice')
 * @param {String} employeeField - 员工字段名（默认为 'employee'）
 * @returns {Promise<Boolean>} 是否有权限
 */
async function checkResourceAccess(req, resource, resourceType = 'expense', employeeField = 'employee') {
  // 确保角色已加载
  if (!req.role) {
    const role = await Role.findOne({ code: req.user.role, isActive: true });
    if (!role) {
      throw ErrorFactory.forbidden(`Role ${req.user.role} not found or inactive`);
    }
    req.role = role;
  }

  // 根据资源类型选择检查函数
  let hasAccess;
  if (resourceType === 'invoice') {
    hasAccess = await checkInvoiceAccess(req.user, resource, req.role);
  } else {
    hasAccess = await checkDataAccess(req.user, resource, req.role, employeeField);
  }

  if (!hasAccess) {
    logger.warn(`[${resourceType.toUpperCase()}_ACCESS] Data access denied:`, {
      resourceId: resource._id || req.params.id,
      userId: req.user.id,
      userRole: req.user.role
    });
    return false;
  }

  return true;
}

/**
 * 检查数据访问权限的中间件
 * 用于单个资源的权限检查（如 GET /:id, PUT /:id, DELETE /:id）
 * 
 * @param {Function} getResourceFn - 获取资源的函数 (req) => Promise<Resource>
 * @param {String} resourceType - 资源类型 ('expense', 'travel', 'invoice')
 * @param {String} employeeField - 员工字段名（默认为 'employee'）
 * @returns {Function} Express 中间件
 */
const requireDataAccess = (getResourceFn, resourceType = 'expense', employeeField = 'employee') => {
  return async (req, res, next) => {
    try {
      // 确保角色已加载
      if (!req.role) {
        await loadUserRole(req, res, () => {});
        if (!req.role) {
          return; // loadUserRole 已经发送了响应
        }
      }

      // 获取资源
      const resource = await getResourceFn(req);
      if (!resource) {
        throw ErrorFactory.notFound(`${resourceType} not found`);
      }

      // 检查权限
      const hasAccess = await checkResourceAccess(req, resource, resourceType, employeeField);
      if (!hasAccess) {
        throw ErrorFactory.forbidden('Not authorized to access this resource');
      }

      // 将资源附加到请求对象，供后续处理使用
      req.resource = resource;
      next();
    } catch (error) {
      // 如果已经是 AppError，直接传递
      if (error.statusCode) {
        return res.status(error.statusCode).json({
          success: false,
          message: error.message
        });
      }

      logger.error(`Require data access error (${resourceType}):`, error);
      res.status(500).json({
        success: false,
        message: 'Failed to check data access'
      });
    }
  };
};

/**
 * 检查数据访问权限的简化中间件（用于费用申请）
 * @param {Function} getResourceFn - 获取资源的函数
 */
const requireExpenseAccess = (getResourceFn) => {
  return requireDataAccess(getResourceFn, 'expense', 'employee');
};

/**
 * 检查数据访问权限的简化中间件（用于差旅申请）
 * @param {Function} getResourceFn - 获取资源的函数
 */
const requireTravelAccess = (getResourceFn) => {
  return requireDataAccess(getResourceFn, 'travel', 'employee');
};

/**
 * 检查数据访问权限的简化中间件（用于发票）
 * @param {Function} getResourceFn - 获取资源的函数
 */
const requireInvoiceAccess = (getResourceFn) => {
  return requireDataAccess(getResourceFn, 'invoice');
};

module.exports = {
  loadUserRole,
  checkResourceAccess,
  requireDataAccess,
  requireExpenseAccess,
  requireTravelAccess,
  requireInvoiceAccess
};

