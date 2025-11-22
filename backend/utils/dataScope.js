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
        // 查询员工部门匹配的数据
        // 需要先找到该部门的所有员工
        const usersInDepartment = await User.find({
          department: dataScope.departmentCode,
          isActive: true
        }).select('_id');
        
        if (usersInDepartment.length > 0) {
          const userIds = usersInDepartment.map(u => u._id.toString());
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
        // 获取所有相关部门的代码
        const departments = await Department.find({
          _id: { $in: dataScope.departmentIds },
          isActive: true
        }).select('code');
        
        const departmentCodes = departments.map(d => d.code);
        
        if (departmentCodes.length > 0) {
          // 找到这些部门的所有员工
          const usersInDepartments = await User.find({
            department: { $in: departmentCodes },
            isActive: true
          }).select('_id');
          
          if (usersInDepartments.length > 0) {
            const userIds = usersInDepartments.map(u => u._id.toString());
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
  checkDataAccess
};

