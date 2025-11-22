const mongoose = require('mongoose');
const Invoice = require('../models/Invoice');
const Expense = require('../models/Expense');
const Travel = require('../models/Travel');
const User = require('../models/User');
const { getUserDataScope, checkDataAccess, DATA_SCOPE } = require('./dataScope');

/**
 * 检查用户是否有权限访问发票
 * 发票的权限判断逻辑：
 * 1. 如果发票关联了费用申请，基于费用申请的employee判断权限
 * 2. 如果发票关联了差旅申请，基于差旅申请的employee判断权限
 * 3. 如果没有关联，基于发票的uploadedBy判断权限
 * 
 * @param {Object} user - 用户对象
 * @param {Object} invoice - 发票对象
 * @param {Object} role - 角色对象（可选）
 * @returns {Promise<Boolean>} 是否有权限
 */
async function checkInvoiceAccess(user, invoice, role = null) {
  // 如果发票关联了费用申请，基于费用申请的employee判断权限
  if (invoice.relatedExpense) {
    const expense = await Expense.findById(invoice.relatedExpense).select('employee');
    if (expense && expense.employee) {
      return await checkDataAccess(user, expense, role, 'employee');
    }
  }

  // 如果发票关联了差旅申请，基于差旅申请的employee判断权限
  if (invoice.relatedTravel) {
    const travel = await Travel.findById(invoice.relatedTravel).select('employee');
    if (travel && travel.employee) {
      return await checkDataAccess(user, travel, role, 'employee');
    }
  }

  // 如果没有关联，基于发票的uploadedBy判断权限
  // 需要将uploadedBy转换为类似employee的格式
  const invoiceData = {
    employee: invoice.uploadedBy
  };
  return await checkDataAccess(user, invoiceData, role, 'employee');
}

/**
 * 构建发票查询的数据权限条件
 * 需要查询所有相关的费用和差旅，然后根据数据权限范围过滤
 * 
 * @param {Object} user - 用户对象
 * @param {Object} role - 角色对象（可选）
 * @returns {Promise<Object>} MongoDB查询条件
 */
async function buildInvoiceDataScopeQuery(user, role = null) {
  const dataScope = await getUserDataScope(user, role);

  // 全部数据权限
  if (dataScope.scope === DATA_SCOPE.ALL) {
    return {};
  }

  // 本人数据权限
  if (dataScope.scope === DATA_SCOPE.SELF) {
    return { uploadedBy: dataScope.userId };
  }

  // 部门权限：需要查询该部门（或下属部门）的所有用户上传的发票
  if (dataScope.scope === DATA_SCOPE.DEPARTMENT || dataScope.scope === DATA_SCOPE.SUB_DEPARTMENT) {
    // 获取有权限的用户ID列表
    let userIds = [];
    
    if (dataScope.departmentCode) {
      // 查询本部门的用户
      const usersInDepartment = await User.find({
        department: dataScope.departmentCode,
        isActive: true
      }).select('_id');
      userIds = usersInDepartment.map(u => u._id.toString());
    } else if (dataScope.departmentIds && dataScope.departmentIds.length > 0) {
      // 查询本部门及下属部门的用户
      const Department = require('../models/Department');
      const departments = await Department.find({
        _id: { $in: dataScope.departmentIds },
        isActive: true
      }).select('code');
      
      const departmentCodes = departments.map(d => d.code);
      
      if (departmentCodes.length > 0) {
        const usersInDepartments = await User.find({
          department: { $in: departmentCodes },
          isActive: true
        }).select('_id');
        userIds = usersInDepartments.map(u => u._id.toString());
      }
    }

    // 如果没有找到用户，只能查看自己的发票
    if (userIds.length === 0) {
      return { uploadedBy: dataScope.userId };
    }

    // 还需要考虑关联的费用和差旅
    // 查询这些用户关联的费用申请
    const expenses = await Expense.find({
      employee: { $in: userIds }
    }).select('_id');
    const expenseIds = expenses.map(e => e._id.toString());

    // 查询这些用户关联的差旅申请
    const travels = await Travel.find({
      employee: { $in: userIds }
    }).select('_id');
    const travelIds = travels.map(t => t._id.toString());

    // 构建查询条件：上传者在这些用户中，或者关联的费用/差旅在这些ID中
    return {
      $or: [
        { uploadedBy: { $in: userIds } },
        { relatedExpense: { $in: expenseIds } },
        { relatedTravel: { $in: travelIds } }
      ]
    };
  }

  // 默认只能查看自己的发票
  return { uploadedBy: dataScope.userId };
}

module.exports = {
  checkInvoiceAccess,
  buildInvoiceDataScopeQuery
};

