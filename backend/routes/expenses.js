const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const fs = require('fs');
const { protect } = require('../middleware/auth');
const Expense = require('../models/Expense');
const Invoice = require('../models/Invoice');
const User = require('../models/User');
const { buildDataScopeQuery, checkDataAccess } = require('../utils/dataScope');
const Role = require('../models/Role');
const approvalWorkflowService = require('../services/approvalWorkflowService');
const notificationService = require('../services/notificationService');

const router = express.Router();

// 生成核销单号
const generateReimbursementNumber = async () => {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  const datePrefix = `EXP-${year}${month}${day}`;
  
  // 查找今天最大的序号
  const todayExpenses = await Expense.find({
    reimbursementNumber: { $regex: `^${datePrefix}` }
  }).sort({ reimbursementNumber: -1 }).limit(1);
  
  let sequence = 1;
  if (todayExpenses.length > 0 && todayExpenses[0].reimbursementNumber) {
    const lastNumber = todayExpenses[0].reimbursementNumber;
    const parts = lastNumber.split('-');
    if (parts.length === 3) {
      const lastSequence = parseInt(parts[2] || '0');
      sequence = lastSequence + 1;
    }
  }
  
  // 生成4位序号
  const sequenceStr = String(sequence).padStart(4, '0');
  return `${datePrefix}-${sequenceStr}`;
};

// @desc    Get all expenses
// @route   GET /api/expenses
// @access  Private
router.get('/', protect, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    
    // 获取用户角色以确定数据权限范围
    const role = await Role.findOne({ code: req.user.role, isActive: true });
    
    // 构建数据权限查询条件
    const dataScopeQuery = await buildDataScopeQuery(req.user, role, 'employee');
    
    // 构建查询条件（合并数据权限条件和筛选条件）
    const query = { ...dataScopeQuery };
    
    // 状态筛选
    if (req.query.status && req.query.status !== 'all') {
      query.status = req.query.status;
    }
    
    // 分类筛选
    if (req.query.category && req.query.category !== 'all') {
      query.category = req.query.category;
    }
    
    // 搜索条件
    if (req.query.search) {
      query.$or = [
        { title: { $regex: req.query.search, $options: 'i' } },
        { description: { $regex: req.query.search, $options: 'i' } },
        { 'vendor.name': { $regex: req.query.search, $options: 'i' } }
      ];
    }
    
    // 查询总数
    const total = await Expense.countDocuments(query);
    
    // 查询数据
    const expenses = await Expense.find(query)
      .populate('employee', 'firstName lastName email')
      .populate('travel', 'title destination')
      .populate('approvals.approver', 'firstName lastName email')
      .populate('expenseItem', 'itemName category')
      .populate('relatedInvoices', 'invoiceNumber invoiceDate amount totalAmount currency vendor category')
      .sort({ date: -1 })
      .skip(skip)
      .limit(limit);

    // 过滤掉 approver 为 null 的审批记录（审批人可能已被删除）
    expenses.forEach(expense => {
      if (expense.approvals && Array.isArray(expense.approvals)) {
        expense.approvals = expense.approvals.filter(
          approval => approval.approver !== null && approval.approver !== undefined
        );
      }
      // 注意：如果 travel 关联的差旅被删除，populate 会将 travel 设置为 null
      // 这是正常行为，前端需要处理 null 值
    });

    res.json({
      success: true,
      count: total,
      page: page,
      limit: limit,
      totalPages: Math.ceil(total / limit),
      data: expenses
    });
  } catch (error) {
    console.error('Get expenses error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @desc    Get single expense
// @route   GET /api/expenses/:id
// @access  Private
router.get('/:id', protect, async (req, res) => {
  try {
    // 验证ID格式
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid expense ID format'
      });
    }

    let expense;
    try {
      expense = await Expense.findById(req.params.id)
        .populate('employee', 'firstName lastName email')
        .populate('travel', 'title destination travelNumber')
        .populate('approvals.approver', 'firstName lastName email')
        .populate('expenseItem', 'itemName category')
        .populate('relatedInvoices', 'invoiceNumber invoiceDate amount totalAmount currency vendor category');
    } catch (populateError) {
      console.error('Populate error:', populateError);
      // 如果 populate 失败，尝试不使用 populate
      expense = await Expense.findById(req.params.id);
      if (expense) {
        console.warn('Populate failed, returning expense without populated fields');
      }
    }

    if (!expense) {
      return res.status(404).json({
        success: false,
        message: 'Expense not found'
      });
    }

    // 数据权限检查：使用数据权限范围检查
    const role = await Role.findOne({ code: req.user.role, isActive: true });
    const hasAccess = await checkDataAccess(req.user, expense, role, 'employee');
    
    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to access this expense'
      });
    }

    // 过滤掉 approver 为 null 的审批记录（审批人可能已被删除）
    if (expense.approvals && Array.isArray(expense.approvals)) {
      expense.approvals = expense.approvals.filter(
        approval => approval.approver !== null && approval.approver !== undefined
      );
    }
    // 注意：如果 travel 关联的差旅被删除，populate 会将 travel 设置为 null
    // 这是正常行为，前端需要处理 null 值

    res.json({
      success: true,
      data: expense
    });
  } catch (error) {
    console.error('Get expense error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Server error',
      error: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// @desc    Create new expense
// @route   POST /api/expenses
// @access  Private
router.post('/', protect, async (req, res) => {
  try {
    // 处理日期字段
    const expenseData = {
      ...req.body,
      employee: req.user.id
    };

    // 确保date是Date对象
    if (expenseData.date && typeof expenseData.date === 'string') {
      expenseData.date = new Date(expenseData.date);
    }

    // 确保amount是数字
    if (expenseData.amount) {
      expenseData.amount = parseFloat(expenseData.amount);
    }

    // 处理project字段：如果是空字符串或无效的ObjectId，设置为null
    if (expenseData.project) {
      if (typeof expenseData.project === 'string') {
        if (expenseData.project.trim() === '' || !mongoose.Types.ObjectId.isValid(expenseData.project)) {
          // 如果project是字符串但不是有效的ObjectId，可能是项目名称，设置为null
          delete expenseData.project;
        } else {
          // 转换为ObjectId
          expenseData.project = new mongoose.Types.ObjectId(expenseData.project);
        }
      }
    } else {
      // 如果project为空或undefined，删除该字段
      delete expenseData.project;
    }

    // 清理receipts数组，移除file对象
    if (expenseData.receipts && Array.isArray(expenseData.receipts)) {
      expenseData.receipts = expenseData.receipts.map(receipt => {
        const { file, ...receiptData } = receipt;
        return receiptData;
      });
    }

    // 自动生成核销单号（如果没有提供）
    if (!expenseData.reimbursementNumber) {
      expenseData.reimbursementNumber = await generateReimbursementNumber();
    }

    // 确保手动创建的费用设置 matchSource 为 manual
    if (!expenseData.matchSource) {
      expenseData.matchSource = 'manual';
    }

    // 如果创建时状态就是 submitted，需要触发审批流程
    const isSubmittingOnCreate = expenseData.status === 'submitted';
    
    if (isSubmittingOnCreate) {
      // 获取员工信息（用于匹配审批流程）
      const employee = await User.findById(req.user.id).select('department jobLevel manager');
      
      // 使用审批工作流服务匹配审批流程
      const expenseAmount = expenseData.amount || 0;
      const workflow = await approvalWorkflowService.matchWorkflow({
        type: 'expense',
        amount: expenseAmount,
        department: employee?.department || req.user.department,
        jobLevel: employee?.jobLevel || req.user.jobLevel
      });

      let approvals = [];
      
      if (workflow) {
        // 使用匹配的工作流生成审批人
        approvals = await approvalWorkflowService.generateApprovers({
          workflow,
          requesterId: req.user.id,
          department: employee?.department || req.user.department
        });
      } else {
        // 没有匹配的工作流，使用默认逻辑
        console.log('No matching workflow found for expense, using default approval logic');
        
        if (expenseAmount > 10000) {
          approvals.push({
            approver: employee?.manager || req.user.id,
            level: 1,
            status: 'pending'
          });
          approvals.push({
            approver: req.user.id,
            level: 2,
            status: 'pending'
          });
        } else if (expenseAmount > 5000) {
          approvals.push({
            approver: employee?.manager || req.user.id,
            level: 1,
            status: 'pending'
          });
        } else {
          approvals.push({
            approver: employee?.manager || req.user.id,
            level: 1,
            status: 'pending'
          });
        }

        // 如果没有指定审批人，使用管理员作为默认审批人
        const adminUser = await User.findOne({ role: 'admin', isActive: true });
        if (adminUser) {
          approvals.forEach(approval => {
            if (!approval.approver || approval.approver.toString() === req.user.id.toString()) {
              approval.approver = adminUser._id;
            }
          });
        }
      }

      // 设置审批流程
      expenseData.approvals = approvals;
    }

    const expense = await Expense.create(expenseData);

    // 如果创建时状态就是 submitted，发送审批通知
    if (isSubmittingOnCreate && expense.approvals && expense.approvals.length > 0) {
      try {
        const approverIds = [...new Set(expense.approvals.map(a => a.approver.toString()))];
        
        await notificationService.notifyApprovalRequest({
          approvers: approverIds,
          requestType: 'expense',
          requestId: expense._id,
          requestTitle: expense.title || expense.expenseItem?.itemName || expense.reimbursementNumber || '费用申请',
          requester: {
            _id: req.user.id,
            firstName: req.user.firstName,
            lastName: req.user.lastName
          }
        });
      } catch (notifyError) {
        console.error('Failed to send approval notifications:', notifyError);
        // 通知失败不影响创建流程
      }
    }

    res.status(201).json({
      success: true,
      data: expense
    });
  } catch (error) {
    console.error('Create expense error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Server error',
      error: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// @desc    Update expense
// @route   PUT /api/expenses/:id
// @access  Private
router.put('/:id', protect, async (req, res) => {
  try {
    const expense = await Expense.findById(req.params.id);

    if (!expense) {
      return res.status(404).json({
        success: false,
        message: 'Expense not found'
      });
    }

    // 数据权限检查：使用数据权限范围检查
    const role = await Role.findOne({ code: req.user.role, isActive: true });
    const hasAccess = await checkDataAccess(req.user, expense, role, 'employee');
    
    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized'
      });
    }

    // 处理更新数据
    const updateData = { ...req.body };
    
    // 记录原始状态，用于检测状态变化
    const originalStatus = expense.status;
    const isSubmitting = updateData.status === 'submitted' && originalStatus === 'draft';
    
    // 处理日期字段
    if (updateData.date && typeof updateData.date === 'string') {
      updateData.date = new Date(updateData.date);
    }

    // 确保amount是数字
    if (updateData.amount !== undefined) {
      updateData.amount = parseFloat(updateData.amount);
    }

    // 处理project字段：如果是空字符串或无效的ObjectId，设置为null
    if (updateData.project !== undefined) {
      if (updateData.project === '' || updateData.project === null) {
        updateData.project = null;
      } else if (typeof updateData.project === 'string') {
        if (!mongoose.Types.ObjectId.isValid(updateData.project)) {
          // 如果project是字符串但不是有效的ObjectId，可能是项目名称，设置为null
          updateData.project = null;
        } else {
          // 转换为ObjectId
          updateData.project = new mongoose.Types.ObjectId(updateData.project);
        }
      }
    }

    // 清理receipts数组，移除file对象
    if (updateData.receipts && Array.isArray(updateData.receipts)) {
      updateData.receipts = updateData.receipts.map(receipt => {
        const { file, ...receiptData } = receipt;
        return receiptData;
      });
    }

    // 如果是从草稿状态提交审批，触发审批流程
    if (isSubmitting) {
      console.log('[EXPENSE_SUBMIT] Detected status change from draft to submitted');
      
      // 只能提交草稿状态的申请
      if (expense.status !== 'draft') {
        console.log('[EXPENSE_SUBMIT] Expense status is not draft:', expense.status);
        return res.status(400).json({
          success: false,
          message: 'Can only submit draft expense requests'
        });
      }

      // 获取员工信息（用于匹配审批流程）
      const employee = await User.findById(expense.employee).select('department jobLevel manager');
      console.log('[EXPENSE_SUBMIT] Employee info:', {
        id: expense.employee,
        department: employee?.department,
        jobLevel: employee?.jobLevel,
        manager: employee?.manager
      });
      
      // 使用审批工作流服务匹配审批流程
      const expenseAmount = expense.amount || 0;
      console.log('[EXPENSE_SUBMIT] Matching workflow for amount:', expenseAmount);
      
      const workflow = await approvalWorkflowService.matchWorkflow({
        type: 'expense',
        amount: expenseAmount,
        department: employee?.department || req.user.department,
        jobLevel: employee?.jobLevel || req.user.jobLevel
      });

      let approvals = [];
      
      if (workflow) {
        console.log('[EXPENSE_SUBMIT] Workflow matched:', workflow.name);
        // 使用匹配的工作流生成审批人
        approvals = await approvalWorkflowService.generateApprovers({
          workflow,
          requesterId: expense.employee,
          department: employee?.department || req.user.department
        });
        console.log('[EXPENSE_SUBMIT] Generated approvers from workflow:', approvals.length);
      } else {
        // 没有匹配的工作流，使用默认逻辑
        console.log('[EXPENSE_SUBMIT] No matching workflow found, using default approval logic');
        
        if (expenseAmount > 10000) {
          approvals.push({
            approver: employee?.manager || req.user.id,
            level: 1,
            status: 'pending'
          });
          approvals.push({
            approver: req.user.id,
            level: 2,
            status: 'pending'
          });
        } else if (expenseAmount > 5000) {
          approvals.push({
            approver: employee?.manager || req.user.id,
            level: 1,
            status: 'pending'
          });
        } else {
          approvals.push({
            approver: employee?.manager || req.user.id,
            level: 1,
            status: 'pending'
          });
        }

        // 如果没有指定审批人，使用管理员作为默认审批人
        const adminUser = await User.findOne({ role: 'admin', isActive: true });
        if (adminUser) {
          approvals.forEach(approval => {
            if (!approval.approver || approval.approver.toString() === expense.employee.toString()) {
              approval.approver = adminUser._id;
            }
          });
        }
        console.log('[EXPENSE_SUBMIT] Generated approvers from default logic:', approvals.length);
      }

      // 设置审批流程
      updateData.approvals = approvals;
      console.log('[EXPENSE_SUBMIT] Final approvals to set:', JSON.stringify(approvals, null, 2));
    } else {
      console.log('[EXPENSE_SUBMIT] Not submitting - isSubmitting:', isSubmitting, 'originalStatus:', originalStatus, 'newStatus:', updateData.status);
    }

    // 更新费用申请
    // 注意：如果是从草稿状态提交审批，approvals 字段已经在上面设置好了，需要确保不被覆盖
    Object.keys(updateData).forEach(key => {
      // 不允许更新 employee、_id、createdAt、updatedAt、__v 和 reimbursementNumber（核销单号一旦生成不可修改）
      // 如果是从草稿状态提交审批，不允许前端覆盖 approvals 字段
      if (key !== 'employee' && key !== '_id' && key !== 'createdAt' && key !== 'updatedAt' && key !== '__v' && key !== 'reimbursementNumber') {
        // 如果是从草稿状态提交审批，且当前字段是 approvals，跳过（使用后端生成的审批流程）
        if (isSubmitting && key === 'approvals' && updateData.approvals && updateData.approvals.length > 0) {
          // 使用后端生成的审批流程，忽略前端传递的
          return;
        }
        expense[key] = updateData[key];
      }
    });
    
    // 确保审批流程被正确设置（如果是从草稿状态提交审批）
    if (isSubmitting && updateData.approvals && updateData.approvals.length > 0) {
      expense.approvals = updateData.approvals;
      console.log('[EXPENSE_SUBMIT] Set approvals on expense object:', expense.approvals.length);
    }
    
    // 如果费用申请还没有核销单号，自动生成一个
    if (!expense.reimbursementNumber) {
      expense.reimbursementNumber = await generateReimbursementNumber();
    }

    await expense.save();
    
    console.log('[EXPENSE_SUBMIT] Expense saved. Status:', expense.status, 'Approvals count:', expense.approvals?.length || 0);

    // 如果是从草稿状态提交审批，发送审批通知
    if (isSubmitting && expense.approvals && expense.approvals.length > 0) {
      console.log('[EXPENSE_SUBMIT] Sending approval notifications to:', expense.approvals.map(a => a.approver.toString()));
      try {
        const approverIds = [...new Set(expense.approvals.map(a => a.approver.toString()))];
        const requester = await User.findById(expense.employee).select('firstName lastName');
        
        await notificationService.notifyApprovalRequest({
          approvers: approverIds,
          requestType: 'expense',
          requestId: expense._id,
          requestTitle: expense.title || expense.expenseItem?.itemName || expense.reimbursementNumber || '费用申请',
          requester: {
            _id: expense.employee,
            firstName: requester?.firstName || req.user.firstName,
            lastName: requester?.lastName || req.user.lastName
          }
        });
      } catch (notifyError) {
        console.error('Failed to send approval notifications:', notifyError);
        // 通知失败不影响提交流程
      }
    }

    // 重新查询并 populate 关联数据，确保返回完整的数据
    // 使用 lean() 和手动 populate 以避免某些关联文档不存在时的错误
    try {
      const updatedExpense = await Expense.findById(expense._id)
        .populate('employee', 'firstName lastName email')
        .populate('travel', 'title destination travelNumber')
        .populate('approvals.approver', 'firstName lastName email')
        .populate('expenseItem', 'itemName category')
        .populate('relatedInvoices', 'invoiceNumber invoiceDate amount totalAmount currency vendor category');

      res.json({
        success: true,
        data: updatedExpense
      });
    } catch (populateError) {
      // 如果 populate 失败，返回未 populate 的数据
      console.error('Populate error:', populateError);
      const updatedExpense = await Expense.findById(expense._id);
      res.json({
        success: true,
        data: updatedExpense
      });
    }
  } catch (error) {
    console.error('Update expense error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Server error',
      error: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// @desc    Delete expense
// @route   DELETE /api/expenses/:id
// @access  Private
router.delete('/:id', protect, async (req, res) => {
  try {
    const expense = await Expense.findById(req.params.id);

    if (!expense) {
      return res.status(404).json({
        success: false,
        message: 'Expense not found'
      });
    }

    // 数据权限检查：使用数据权限范围检查
    const role = await Role.findOne({ code: req.user.role, isActive: true });
    const hasAccess = await checkDataAccess(req.user, expense, role, 'employee');
    
    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized'
      });
    }

    // 检查状态：只有草稿状态可以删除
    if (expense.status !== 'draft') {
      return res.status(400).json({
        success: false,
        message: 'Only draft expenses can be deleted'
      });
    }

    // 取消关联的发票
    if (expense.relatedInvoices && expense.relatedInvoices.length > 0) {
      const Invoice = require('../models/Invoice');
      await Invoice.updateMany(
        { _id: { $in: expense.relatedInvoices } },
        {
          $set: {
            relatedExpense: null,
            relatedTravel: null,
            matchStatus: 'unmatched',
            matchedTravelId: null,
            matchedExpenseItemId: null
          }
        }
      );
    }

    // 如果关联了差旅，从差旅中移除
    if (expense.travel) {
      const Travel = require('../models/Travel');
      await Travel.updateOne(
        { _id: expense.travel },
        {
          $pull: { relatedExpenses: expense._id }
        }
      );
    }

    // 删除费用申请
    await Expense.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: 'Expense deleted successfully'
    });
  } catch (error) {
    console.error('Delete expense error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Server error'
    });
  }
});

// @desc    Link invoice to expense
// @route   POST /api/expenses/:id/link-invoice
// @access  Private
router.post('/:id/link-invoice', protect, async (req, res) => {
  try {
    const { invoiceId } = req.body;
    
    console.log(`Linking invoice ${invoiceId} to expense ${req.params.id}`);
    
    if (!invoiceId) {
      return res.status(400).json({
        success: false,
        message: 'Invoice ID is required'
      });
    }
    
    const expense = await Expense.findById(req.params.id);
    const invoice = await Invoice.findById(invoiceId);
    
    if (!expense) {
      console.log(`Expense ${req.params.id} not found`);
      return res.status(404).json({
        success: false,
        message: 'Expense not found'
      });
    }
    
    if (!invoice) {
      console.log(`Invoice ${invoiceId} not found`);
      return res.status(404).json({
        success: false,
        message: 'Invoice not found'
      });
    }
    
    // 数据权限检查：使用数据权限范围检查
    const role = await Role.findOne({ code: req.user.role, isActive: true });
    const hasAccess = await checkDataAccess(req.user, expense, role, 'employee');
    
    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized'
      });
    }
    
    // 检查发票是否已经在当前费用申请中（只检查当前费用申请，不检查其他费用申请）
    const invoiceObjectId = typeof invoiceId === 'string' ? invoiceId : invoiceId.toString();
    const invoiceIdInExpense = expense.relatedInvoices.some(id => id.toString() === invoiceObjectId);
    
    if (!invoiceIdInExpense) {
      console.log(`Adding invoice ${invoiceId} to expense ${expense._id}`);
      expense.relatedInvoices.push(invoiceObjectId);
      await expense.save();
      console.log(`Successfully added invoice to expense. Total invoices: ${expense.relatedInvoices.length}`);
    } else {
      console.log(`Invoice ${invoiceId} already in expense.relatedInvoices, skipping`);
      // 如果发票已经在当前费用申请中，直接返回成功（幂等操作）
      return res.json({
        success: true,
        message: 'Invoice already linked to this expense',
        data: {
          expense: expense,
          invoice: invoice
        }
      });
    }
    
    // 更新发票的 relatedExpense（允许同一个发票关联到多个费用申请，但只记录最后关联的那个）
    // 注意：由于 Invoice 模型的 relatedExpense 字段是单一值，我们只更新为当前费用申请
    // 但不会阻止发票在其他费用申请中使用（通过 expense.relatedInvoices 数组）
    if (!invoice.relatedExpense || invoice.relatedExpense.toString() !== expense._id.toString()) {
      console.log(`Updating invoice ${invoiceId} relatedExpense to ${expense._id}`);
      invoice.relatedExpense = expense._id;
      invoice.matchStatus = 'linked';
      if (expense.travel) {
        invoice.relatedTravel = expense.travel;
      }
      await invoice.save();
      console.log(`Successfully updated invoice`);
    } else {
      console.log(`Invoice ${invoiceId} already linked to expense ${expense._id}, skipping update`);
    }
    
    res.json({
      success: true,
      message: 'Invoice linked successfully',
      data: {
        expense: expense,
        invoice: invoice
      }
    });
    
  } catch (error) {
    console.error('Link invoice error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to link invoice'
    });
  }
});

// @desc    Unlink invoice from expense
// @route   DELETE /api/expenses/:id/unlink-invoice/:invoiceId
// @access  Private
router.delete('/:id/unlink-invoice/:invoiceId', protect, async (req, res) => {
  try {
    const expense = await Expense.findById(req.params.id);
    const invoice = await Invoice.findById(req.params.invoiceId);
    
    if (!expense || !invoice) {
      return res.status(404).json({
        success: false,
        message: 'Expense or invoice not found'
      });
    }
    
    // 数据权限检查：使用数据权限范围检查
    const role = await Role.findOne({ code: req.user.role, isActive: true });
    const hasAccess = await checkDataAccess(req.user, expense, role, 'employee');
    
    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized'
      });
    }
    
    // 取消关联
    expense.relatedInvoices = expense.relatedInvoices.filter(
      id => id.toString() !== invoice._id.toString()
    );
    await expense.save();
    
    invoice.relatedExpense = null;
    invoice.matchStatus = 'unmatched';
    invoice.matchedTravelId = null;
    invoice.matchedExpenseItemId = null;
    await invoice.save();
    
    res.json({
      success: true,
      message: 'Invoice unlinked successfully'
    });
    
  } catch (error) {
    console.error('Unlink invoice error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to unlink invoice'
    });
  }
});

// @desc    Get expense receipt file
// @route   GET /api/expenses/:id/receipts/:receiptPath
// @access  Private
router.get('/:id/receipts/*', protect, async (req, res) => {
  try {
    const expense = await Expense.findById(req.params.id);
    
    if (!expense) {
      return res.status(404).json({
        success: false,
        message: 'Expense not found'
      });
    }
    
    // 数据权限检查：使用数据权限范围检查
    const role = await Role.findOne({ code: req.user.role, isActive: true });
    const hasAccess = await checkDataAccess(req.user, expense, role, 'employee');
    
    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to access this file'
      });
    }
    
    // 获取收据路径（从URL中提取）
    const receiptPath = req.params[0]; // Express捕获的*部分
    
    // 查找匹配的收据
    const receipt = expense.receipts?.find(r => r.path === receiptPath || r.path?.endsWith(receiptPath));
    
    if (!receipt || !receipt.path) {
      return res.status(404).json({
        success: false,
        message: 'Receipt not found'
      });
    }
    
    // 构建文件路径
    const filePath = path.isAbsolute(receipt.path) 
      ? receipt.path 
      : path.resolve(__dirname, '..', receipt.path);
    
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        success: false,
        message: 'File not found'
      });
    }
    
    // 设置响应头
    res.setHeader('Content-Type', receipt.mimeType || 'application/octet-stream');
    res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(receipt.originalName || receipt.filename || 'receipt')}"`);
    
    // 发送文件
    res.sendFile(filePath);
  } catch (error) {
    console.error('Get expense receipt error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to get receipt file'
    });
  }
});

module.exports = router;
