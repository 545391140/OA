const express = require('express');
const mongoose = require('mongoose');
const { protect } = require('../middleware/auth');
const Expense = require('../models/Expense');
const Invoice = require('../models/Invoice');

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
    
    // 构建查询条件
    const query = { employee: req.user.id };
    
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

    // 权限检查：只能查看自己的费用申请或管理员
    // 统一提取 employee ID 并转换为字符串
    let employeeId = null;
    if (expense.employee) {
      if (expense.employee._id) {
        // populate 后的对象
        employeeId = expense.employee._id.toString();
      } else if (mongoose.Types.ObjectId.isValid(expense.employee)) {
        // ObjectId 对象或有效的 ObjectId 字符串
        const objId = expense.employee instanceof mongoose.Types.ObjectId 
          ? expense.employee 
          : new mongoose.Types.ObjectId(expense.employee);
        employeeId = objId.toString();
      } else if (typeof expense.employee === 'object' && expense.employee.toString) {
        // 其他对象类型
        employeeId = expense.employee.toString();
      } else {
        // 字符串或其他类型，统一转换为字符串
        employeeId = String(expense.employee);
      }
    }
    
    // 统一提取 user ID 并转换为字符串
    let userId = null;
    if (req.user && req.user.id) {
      if (mongoose.Types.ObjectId.isValid(req.user.id)) {
        const userObjId = req.user.id instanceof mongoose.Types.ObjectId 
          ? req.user.id 
          : new mongoose.Types.ObjectId(req.user.id);
        userId = userObjId.toString();
      } else {
        userId = String(req.user.id);
      }
    }
    
    const userRole = req.user?.role || '';
    const isAdmin = userRole === 'admin' || userRole === 'Administrator';
    
    console.log('[GET_EXPENSE] Permission check:', {
      expenseId: req.params.id,
      employeeId: employeeId,
      userId: userId,
      userRole: userRole,
      isAdmin: isAdmin,
      employeeMatch: employeeId === userId,
      employeeIdType: typeof employeeId,
      userIdType: typeof userId,
      employeeValue: expense.employee,
      userValue: req.user?.id
    });
    
    // 如果没有 employee 字段，允许访问（可能是旧数据或特殊情况）
    if (!employeeId) {
      console.warn('[GET_EXPENSE] Expense has no employee field:', req.params.id);
      // 允许访问，但记录警告
    } else if (!userId) {
      console.error('[GET_EXPENSE] User ID is missing:', req.user);
      return res.status(401).json({
        success: false,
        message: 'User authentication required'
      });
    } else {
      // 统一转换为字符串后比较
      const employeeIdStr = String(employeeId);
      const userIdStr = String(userId);
      
      if (employeeIdStr !== userIdStr && !isAdmin) {
        console.warn('[GET_EXPENSE] Unauthorized access attempt:', {
          expenseId: req.params.id,
          employeeId: employeeIdStr,
          userId: userIdStr,
          userRole: userRole,
          exactMatch: employeeIdStr === userIdStr,
          lengthMatch: employeeIdStr.length === userIdStr.length
        });
        return res.status(403).json({
          success: false,
          message: 'Not authorized to access this expense'
        });
      }
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

    const expense = await Expense.create(expenseData);

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

    // 权限检查：统一 ID 格式进行比较
    const employeeId = expense.employee?.toString() || String(expense.employee);
    const userId = req.user?.id?.toString() || String(req.user.id);
    const isAdmin = req.user?.role === 'admin' || req.user?.role === 'Administrator';
    
    if (employeeId !== userId && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized'
      });
    }

    // 处理更新数据
    const updateData = { ...req.body };
    
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

    // 更新费用申请
    Object.keys(updateData).forEach(key => {
      // 不允许更新 employee、_id、createdAt、updatedAt、__v 和 reimbursementNumber（核销单号一旦生成不可修改）
      if (key !== 'employee' && key !== '_id' && key !== 'createdAt' && key !== 'updatedAt' && key !== '__v' && key !== 'reimbursementNumber') {
        expense[key] = updateData[key];
      }
    });
    
    // 如果费用申请还没有核销单号，自动生成一个
    if (!expense.reimbursementNumber) {
      expense.reimbursementNumber = await generateReimbursementNumber();
    }

    await expense.save();

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

    // 权限检查：统一 ID 格式进行比较
    const employeeId = expense.employee?.toString() || String(expense.employee);
    const userId = req.user?.id?.toString() || String(req.user.id);
    const isAdmin = req.user?.role === 'admin' || req.user?.role === 'Administrator';
    
    if (employeeId !== userId && !isAdmin) {
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
    
    // 权限检查
    if (expense.employee.toString() !== req.user.id && req.user.role !== 'admin') {
      console.log(`User ${req.user.id} not authorized to link invoice to expense ${req.params.id}`);
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
    
    // 权限检查：统一 ID 格式进行比较
    const employeeId = expense.employee?.toString() || String(expense.employee);
    const userId = req.user?.id?.toString() || String(req.user.id);
    const isAdmin = req.user?.role === 'admin' || req.user?.role === 'Administrator';
    
    if (employeeId !== userId && !isAdmin) {
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

module.exports = router;
