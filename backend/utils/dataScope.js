const mongoose = require('mongoose');
const User = require('../models/User');
const Department = require('../models/Department');

/**
 * 数据权限范围枚举
 */
const DATA_SCOPE = {
  SELF: 'self',              // 本人数据
  ALL: 'all',                // 全部数据
  DEPARTMENT: 'department',  // 本部门数据
  SUB_DEPARTMENT: 'subDepartment' // 本部门及下属部门数据
};

/**
 * 部门用户列表缓存
 * 缓存结构：{ departmentCode: { userIds: [...], timestamp: Date } }
 * TTL: 5分钟（300000毫秒）
 */
const departmentUserCache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5分钟

/**
 * 获取缓存的部门用户ID列表
 * @param {String} departmentCode - 部门代码
 * @returns {Array|null} 用户ID列表，如果缓存不存在或过期则返回null
 */
function getCachedDepartmentUsers(departmentCode) {
  if (!departmentCode) return null;
  
  const cached = departmentUserCache.get(departmentCode);
  if (!cached) return null;
  
  // 检查缓存是否过期
  const now = Date.now();
  if (now - cached.timestamp > CACHE_TTL) {
    departmentUserCache.delete(departmentCode);
    return null;
  }
  
  return cached.userIds;
}

/**
 * 设置部门用户ID列表缓存
 * @param {String} departmentCode - 部门代码
 * @param {Array} userIds - 用户ID列表
 */
function setCachedDepartmentUsers(departmentCode, userIds) {
  if (!departmentCode) return;
  
  departmentUserCache.set(departmentCode, {
    userIds: userIds,
    timestamp: Date.now()
  });
}

/**
 * 清除部门用户缓存（当用户或部门信息更新时调用）
 * @param {String} departmentCode - 部门代码（可选，如果不提供则清除所有缓存）
 */
function clearDepartmentUserCache(departmentCode = null) {
  if (departmentCode) {
    departmentUserCache.delete(departmentCode);
  } else {
    departmentUserCache.clear();
  }
}

/**
 * 获取部门的所有用户ID（带缓存）
 * @param {String} departmentCode - 部门代码
 * @returns {Promise<Array>} 用户ID列表
 */
async function getDepartmentUserIds(departmentCode) {
  if (!departmentCode) return [];
  
  // 先检查缓存
  const cached = getCachedDepartmentUsers(departmentCode);
  if (cached !== null) {
    return cached;
  }
  
  // 缓存未命中，查询数据库
  const usersInDepartment = await User.find({
    department: departmentCode,
    isActive: true
  }).select('_id').lean();
  
  const userIds = usersInDepartment.map(u => u._id.toString());
  
  // 存入缓存
  setCachedDepartmentUsers(departmentCode, userIds);
  
  return userIds;
}

/**
 * 获取多个部门的所有用户ID（带缓存）
 * @param {Array<String>} departmentCodes - 部门代码数组
 * @returns {Promise<Array>} 用户ID列表（去重）
 */
async function getMultipleDepartmentUserIds(departmentCodes) {
  if (!departmentCodes || departmentCodes.length === 0) return [];
  
  const userIdSets = await Promise.all(
    departmentCodes.map(code => getDepartmentUserIds(code))
  );
  
  // 合并并去重
  const allUserIds = new Set();
  userIdSets.forEach(userIds => {
    userIds.forEach(id => allUserIds.add(id));
  });
  
  return Array.from(allUserIds);
}

/**
 * 获取用户的数据权限范围
 * @param {Object} user - 用户对象
 * @param {Object} role - 角色对象（可选，如果不提供则从用户获取）
 * @returns {Promise<Object>} 返回数据权限信息
 */
async function getUserDataScope(user, role = null) {
  if (!user) {
    throw new Error('User is required');
  }

  // 如果没有提供角色，从用户获取
  if (!role && user.role) {
    const Role = require('../models/Role');
    role = await Role.findOne({ code: user.role, isActive: true });
  }

  // 如果没有角色或角色没有设置数据权限，默认返回本人数据
  const dataScope = role?.dataScope || DATA_SCOPE.SELF;

  // 获取用户信息（如果需要部门信息）
  let userWithDept = user;
  if (dataScope === DATA_SCOPE.DEPARTMENT || dataScope === DATA_SCOPE.SUB_DEPARTMENT) {
    if (!user.department) {
      // 如果用户没有部门信息，只能查看本人数据
      return {
        scope: DATA_SCOPE.SELF,
        userId: user._id || user.id,
        departmentIds: []
      };
    }
    
    // 查找部门信息
    const department = await Department.findOne({ code: user.department, isActive: true });
    if (!department) {
      return {
        scope: DATA_SCOPE.SELF,
        userId: user._id || user.id,
        departmentIds: []
      };
    }

    userWithDept = {
      ...user,
      departmentId: department._id,
      departmentCode: department.code
    };
  }

  const userId = user._id || user.id;
  const userIdStr = userId?.toString() || String(userId);

  switch (dataScope) {
    case DATA_SCOPE.ALL:
      return {
        scope: DATA_SCOPE.ALL,
        userId: userIdStr,
        departmentIds: null // null 表示所有部门
      };

    case DATA_SCOPE.DEPARTMENT:
      return {
        scope: DATA_SCOPE.DEPARTMENT,
        userId: userIdStr,
        departmentIds: userWithDept.departmentId ? [userWithDept.departmentId] : [],
        departmentCode: userWithDept.departmentCode || user.department
      };

    case DATA_SCOPE.SUB_DEPARTMENT:
      if (!userWithDept.departmentId) {
        return {
          scope: DATA_SCOPE.SELF,
          userId: userIdStr,
          departmentIds: []
        };
      }
      // 获取本部门及所有下属部门的ID
      const descendantIds = await Department.getDescendantIds(userWithDept.departmentId);
      return {
        scope: DATA_SCOPE.SUB_DEPARTMENT,
        userId: userIdStr,
        departmentIds: descendantIds,
        departmentCode: userWithDept.departmentCode || user.department
      };

    case DATA_SCOPE.SELF:
    default:
      return {
        scope: DATA_SCOPE.SELF,
        userId: userIdStr,
        departmentIds: []
      };
  }
}

/**
 * 构建数据权限查询条件
 * @param {Object} user - 用户对象
 * @param {Object} role - 角色对象（可选）
 * @param {String} employeeField - 员工字段名（默认为 'employee'）
 * @param {String} departmentField - 部门字段名（默认为 'department'）
 * @returns {Promise<Object>} MongoDB查询条件
 */
async function buildDataScopeQuery(user, role = null, employeeField = 'employee', departmentField = 'department') {
  const dataScope = await getUserDataScope(user, role);

  const query = {};

  switch (dataScope.scope) {
    case DATA_SCOPE.ALL:
      // 全部数据，不添加任何限制
      return {};

    case DATA_SCOPE.DEPARTMENT:
      // 本部门数据
      if (dataScope.departmentCode) {
        // 使用缓存的部门用户查询
        const userIds = await getDepartmentUserIds(dataScope.departmentCode);
        
        if (userIds.length > 0) {
          query[employeeField] = { $in: userIds };
        } else {
          // 如果没有找到员工，只能查看本人数据
          query[employeeField] = dataScope.userId;
        }
      } else {
        // 如果没有部门信息，只能查看本人数据
        query[employeeField] = dataScope.userId;
      }
      break;

    case DATA_SCOPE.SUB_DEPARTMENT:
      // 本部门及下属部门数据
      if (dataScope.departmentIds && dataScope.departmentIds.length > 0) {
        // 获取所有相关部门的代码（带缓存）
        const departments = await Department.find({
          _id: { $in: dataScope.departmentIds },
          isActive: true
        }).select('code').lean();
        
        const departmentCodes = departments.map(d => d.code);
        
        if (departmentCodes.length > 0) {
          // 使用缓存的多个部门用户查询
          const userIds = await getMultipleDepartmentUserIds(departmentCodes);
          
          if (userIds.length > 0) {
            query[employeeField] = { $in: userIds };
          } else {
            // 如果没有找到员工，只能查看本人数据
            query[employeeField] = dataScope.userId;
          }
        } else {
          query[employeeField] = dataScope.userId;
        }
      } else {
        // 如果没有部门信息，只能查看本人数据
        query[employeeField] = dataScope.userId;
      }
      break;

    case DATA_SCOPE.SELF:
    default:
      // 本人数据
      query[employeeField] = dataScope.userId;
      break;
  }

  return query;
}

/**
 * 检查用户是否有权限访问特定数据
 * @param {Object} user - 用户对象
 * @param {Object} data - 数据对象（必须包含employee字段）
 * @param {Object} role - 角色对象（可选）
 * @param {String} employeeField - 员工字段名（默认为 'employee'）
 * @returns {Promise<Boolean>} 是否有权限
 */
async function checkDataAccess(user, data, role = null, employeeField = 'employee') {
  const dataScope = await getUserDataScope(user, role);

  // 全部数据权限
  if (dataScope.scope === DATA_SCOPE.ALL) {
    return true;
  }

  // 获取数据的员工ID
  const dataEmployeeId = data[employeeField];
  if (!dataEmployeeId) {
    return false;
  }

  const dataEmployeeIdStr = dataEmployeeId._id?.toString() || dataEmployeeId?.toString() || String(dataEmployeeId);
  const userIdStr = dataScope.userId;

  // 本人数据权限
  if (dataScope.scope === DATA_SCOPE.SELF) {
    return dataEmployeeIdStr === userIdStr;
  }

  // 部门权限检查
  if (dataScope.scope === DATA_SCOPE.DEPARTMENT || dataScope.scope === DATA_SCOPE.SUB_DEPARTMENT) {
    // 获取数据所属员工的部门信息
    const dataEmployee = await User.findById(dataEmployeeIdStr).select('department');
    if (!dataEmployee || !dataEmployee.department) {
      return false;
    }

    // 本部门权限
    if (dataScope.scope === DATA_SCOPE.DEPARTMENT) {
      return dataEmployee.department === dataScope.departmentCode;
    }

    // 本部门及下属部门权限
    if (dataScope.scope === DATA_SCOPE.SUB_DEPARTMENT) {
      if (dataScope.departmentIds && dataScope.departmentIds.length > 0) {
        const dataEmployeeDept = await Department.findOne({ code: dataEmployee.department, isActive: true });
        if (!dataEmployeeDept) {
          return false;
        }
        return dataScope.departmentIds.some(id => id.toString() === dataEmployeeDept._id.toString());
      }
      return false;
    }
  }

  return false;
}

module.exports = {
  DATA_SCOPE,
  getUserDataScope,
  buildDataScopeQuery,
  checkDataAccess,
  clearDepartmentUserCache // 导出清除缓存函数，供外部调用
};

