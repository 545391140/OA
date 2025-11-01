const { validationResult } = require('express-validator');
const mongoose = require('mongoose');

// 导入所有费用项标准模型
const TravelTransportStandard = require('../models/TravelTransportStandard');
const TravelAccommodationStandard = require('../models/TravelAccommodationStandard');
const TravelMealStandard = require('../models/TravelMealStandard');
const TravelAllowanceStandard = require('../models/TravelAllowanceStandard');
const TravelOtherExpenseStandard = require('../models/TravelOtherExpenseStandard');
const ExpenseItem = require('../models/ExpenseItem');
const TravelStandard = require('../models/TravelStandard');

// ==================== 通用费用项（新简化模型） ====================

// @desc    Get all expense items (optionally filter by standard ID)
// @route   GET /api/expense-items (all items)
// @route   GET /api/expense-items/:standardId (items for a specific standard)
// @access  Private
exports.getExpenseItems = async (req, res) => {
  try {
    const query = {};
    
    // 如果提供了standardId参数，则过滤该标准的费用项
    // 如果没有提供，则返回所有费用项（包括无标准的）
    if (req.params.standardId && req.params.standardId !== 'all') {
      query.standard = req.params.standardId;
    }

    const items = await ExpenseItem.find(query)
      .populate('standard', 'standardCode standardName')
      .populate('parentItem', 'itemName')
      .sort({ isSystemDefault: -1, status: 1, createdAt: -1 }); // 系统默认项优先，启用状态优先显示

    res.json({
      success: true,
      count: items.length,
      data: items
    });
  } catch (error) {
    console.error('Get expense items error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Create expense item
// @route   POST /api/expense-items
// @access  Private (Finance/Admin only)
exports.createExpenseItem = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation errors',
        errors: errors.array()
      });
    }

    // 构建费用项数据 - 先处理parentItem，确保它在对象中
    const parentItemValue = req.body.parentItem || req.body.parentItemId;
    console.log('[DEBUG] Received parentItem value:', parentItemValue, 'Type:', typeof parentItemValue);
    console.log('[DEBUG] Full req.body:', JSON.stringify(req.body, null, 2));
    
    // 先处理parentItem，确保它被正确设置
    let parentItemObjectId = null;
    if (parentItemValue && parentItemValue !== '' && parentItemValue !== null && parentItemValue !== undefined) {
      if (mongoose.Types.ObjectId.isValid(parentItemValue)) {
        parentItemObjectId = new mongoose.Types.ObjectId(parentItemValue);
        console.log('[DEBUG] Valid parentItem ObjectId:', parentItemObjectId.toString());
      } else {
        console.warn('[DEBUG] Invalid parentItem ObjectId format:', parentItemValue);
      }
    } else {
      console.log('[DEBUG] No parentItem provided');
    }

    // 检查费用项名称唯一性
    const itemName = req.body.itemName ? req.body.itemName.trim() : '';
    if (!itemName) {
      return res.status(400).json({
        success: false,
        message: '费用项目名称不能为空'
      });
    }

    const existingItem = await ExpenseItem.findOne({ itemName: itemName });
    if (existingItem) {
      return res.status(400).json({
        success: false,
        message: `费用项目名称"${itemName}"已存在，请使用其他名称`
      });
    }

    // 构建费用项数据，包含parentItem
    const itemData = {
      itemName: itemName,
      status: req.body.status || 'enabled',
      category: req.body.category || 'general'
    };
    
    // 可选字段
    if (req.body.description !== undefined && req.body.description !== null) {
      itemData.description = req.body.description;
    }
    if (req.body.amount !== undefined && req.body.amount !== null) {
      itemData.amount = req.body.amount;
    }
    if (req.body.standardId) {
      itemData.standard = req.body.standardId;
    }
    // 关键：在这里设置parentItem
    if (parentItemObjectId) {
      itemData.parentItem = parentItemObjectId;
      console.log('[DEBUG] Added parentItem to itemData:', itemData.parentItem.toString());
    }

    console.log('[CREATE] Final itemData before create:', JSON.stringify({
      ...itemData,
      parentItem: itemData.parentItem ? itemData.parentItem.toString() : null,
      parentItemType: itemData.parentItem ? typeof itemData.parentItem : 'null'
    }, null, 2));
    
    const expenseItem = await ExpenseItem.create(itemData);
    console.log('[CREATE] Created expense item _id:', expenseItem._id.toString());
    console.log('[CREATE] Created expense item parentItem:', expenseItem.parentItem);
    console.log('[CREATE] Created expense item parentItem type:', typeof expenseItem.parentItem);
    
    // 重新查询以确保 parentItem 被正确保存
    const savedItem = await ExpenseItem.findById(expenseItem._id);
    console.log('[CREATE] Saved expense item parentItem:', savedItem.parentItem);
    console.log('[CREATE] Saved expense item parentItem type:', typeof savedItem.parentItem);

    // 返回创建的费用项，确保包含 parentItem
    // 直接使用Mongoose文档，让JSON序列化自动处理
    // 但确保parentItem被正确序列化
    const result = savedItem.toObject({ virtuals: false, transform: (doc, ret) => {
      // 确保parentItem被包含，无论是否为null
      if (doc.parentItem) {
        ret.parentItem = doc.parentItem.toString();
      } else if (doc.parentItem === null || doc.parentItem === undefined) {
        ret.parentItem = null;
      }
      return ret;
    }});
    
    // 如果toObject没有正确转换parentItem，手动设置
    if (savedItem.parentItem && !result.parentItem) {
      result.parentItem = savedItem.parentItem.toString();
    }
    
    console.log('[CREATE] Final result parentItem:', result.parentItem);
    
    res.status(201).json({
      success: true,
      message: 'Expense item created successfully',
      data: result
    });
  } catch (error) {
    console.error('Create expense item error:', error);
    
    // 处理唯一性约束错误（数据库层面）
    if (error.code === 11000 || error.name === 'MongoServerError' || (error.message && error.message.includes('duplicate'))) {
      return res.status(400).json({
        success: false,
        message: `费用项目名称"${req.body.itemName || '未知'}"已存在，请使用其他名称`
      });
    }

    res.status(500).json({
      success: false,
      message: 'Server error: ' + (error.message || 'Unknown error')
    });
  }
};

// @desc    Update expense item
// @route   PUT /api/expense-items/item/:id
// @access  Private (Finance/Admin only)
exports.updateExpenseItem = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation errors',
        errors: errors.array()
      });
    }

    // 检查费用项是否存在
    const existingItem = await ExpenseItem.findById(req.params.id);
    if (!existingItem) {
      return res.status(404).json({
        success: false,
        message: 'Expense item not found'
      });
    }

    // 构建更新数据
    const updateData = {};

    // 如果修改了itemName，需要检查唯一性
    if (req.body.itemName && req.body.itemName.trim() !== existingItem.itemName) {
      const itemName = req.body.itemName.trim();
      
      // 检查名称唯一性（排除当前项）
      const duplicateItem = await ExpenseItem.findOne({
        itemName: itemName,
        _id: { $ne: req.params.id }
      });

      if (duplicateItem) {
        return res.status(400).json({
          success: false,
          message: `费用项目名称"${itemName}"已存在，请使用其他名称`
        });
      }

      updateData.itemName = itemName;
    }

    // 其他可选字段
    if (req.body.description !== undefined) {
      updateData.description = req.body.description ? req.body.description.trim() : undefined;
    }
    if (req.body.amount !== undefined && req.body.amount !== null) {
      updateData.amount = req.body.amount;
    } else if (req.body.amount === null || req.body.amount === '') {
      updateData.amount = undefined; // 允许清空金额
    }
    if (req.body.status) {
      updateData.status = req.body.status;
    }
    if (req.body.category) {
      updateData.category = req.body.category;
    }

    // standard 字段处理
    if (req.body.standardId !== undefined) {
      if (req.body.standardId && req.body.standardId !== '') {
        updateData.standard = req.body.standardId;
      } else {
        updateData.standard = null; // 允许解除关联
      }
    }

    // parentItem 字段处理
    const parentItemValue = req.body.parentItem || req.body.parentItemId;
    if (parentItemValue !== undefined) {
      if (parentItemValue && parentItemValue !== '' && parentItemValue !== null) {
        if (mongoose.Types.ObjectId.isValid(parentItemValue)) {
          updateData.parentItem = new mongoose.Types.ObjectId(parentItemValue);
        }
      } else {
        updateData.parentItem = null; // 允许解除关联
      }
    }

    console.log('[UPDATE] Update data:', JSON.stringify({
      ...updateData,
      parentItem: updateData.parentItem ? updateData.parentItem.toString() : null
    }, null, 2));

    // 执行更新
    const expenseItem = await ExpenseItem.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    );

    if (!expenseItem) {
      return res.status(404).json({
        success: false,
        message: 'Expense item not found'
      });
    }

    res.json({
      success: true,
      message: 'Expense item updated successfully',
      data: expenseItem
    });
  } catch (error) {
    console.error('Update expense item error:', error);
    
    // 处理唯一性约束错误（数据库层面）
    if (error.code === 11000 || error.name === 'MongoServerError' || (error.message && error.message.includes('duplicate'))) {
      return res.status(400).json({
        success: false,
        message: `费用项目名称"${req.body.itemName || '未知'}"已存在，请使用其他名称`
      });
    }

    res.status(500).json({
      success: false,
      message: 'Server error: ' + (error.message || 'Unknown error')
    });
  }
};

// @desc    Delete expense item
// @route   DELETE /api/expense-items/:id
// @access  Private (Admin only)
exports.deleteExpenseItem = async (req, res) => {
  try {
    const expenseItem = await ExpenseItem.findById(req.params.id);

    if (!expenseItem) {
      return res.status(404).json({
        success: false,
        message: 'Expense item not found'
      });
    }

    // 检查是否为系统默认费用项（不可删除）
    if (expenseItem.isSystemDefault) {
      return res.status(400).json({
        success: false,
        message: '系统默认费用项不可删除'
      });
    }

    // 检查是否有子费用项
    const childItems = await ExpenseItem.countDocuments({ parentItem: req.params.id });
    if (childItems > 0) {
      return res.status(400).json({
        success: false,
        message: `该费用项下有 ${childItems} 个子费用项，请先删除子费用项`
      });
    }

    await expenseItem.deleteOne();

    res.json({
      success: true,
      message: 'Expense item deleted successfully'
    });
  } catch (error) {
    console.error('Delete expense item error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Enable expense item
// @route   PUT /api/expense-items/item/:id/enable
// @access  Private (Finance/Admin only)
exports.enableExpenseItem = async (req, res) => {
  try {
    const expenseItem = await ExpenseItem.findByIdAndUpdate(
      req.params.id,
      { status: 'enabled' },
      { new: true, runValidators: true }
    );

    if (!expenseItem) {
      return res.status(404).json({
        success: false,
        message: 'Expense item not found'
      });
    }

    res.json({
      success: true,
      message: 'Expense item enabled successfully',
      data: expenseItem
    });
  } catch (error) {
    console.error('Enable expense item error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Disable expense item
// @route   PUT /api/expense-items/item/:id/disable
// @access  Private (Finance/Admin only)
exports.disableExpenseItem = async (req, res) => {
  try {
    const expenseItem = await ExpenseItem.findByIdAndUpdate(
      req.params.id,
      { status: 'disabled' },
      { new: true, runValidators: true }
    );

    if (!expenseItem) {
      return res.status(404).json({
        success: false,
        message: 'Expense item not found'
      });
    }

    res.json({
      success: true,
      message: 'Expense item disabled successfully',
      data: expenseItem
    });
  } catch (error) {
    console.error('Disable expense item error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// ==================== 交通标准 ====================

// @desc    Get transport standards by standard ID
// @route   GET /api/expense-items/:standardId/transport
// @access  Private
exports.getTransportStandards = async (req, res) => {
  try {
    const standards = await TravelTransportStandard.find({ standard: req.params.standardId })
      .sort({ jobLevelCode: 1, transportType: 1 });

    res.json({
      success: true,
      count: standards.length,
      data: standards
    });
  } catch (error) {
    console.error('Get transport standards error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Create transport standard
// @route   POST /api/expense-items/:standardId/transport
// @access  Private (Finance/Admin only)
exports.createTransportStandard = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation errors',
        errors: errors.array()
      });
    }

    const transportData = {
      ...req.body,
      standard: req.params.standardId
    };

    const transportStandard = await TravelTransportStandard.create(transportData);

    // 更新标准主表的费用项配置状态
    await TravelStandard.findByIdAndUpdate(req.params.standardId, {
      'expenseItemsConfigured.transport': true
    });

    res.status(201).json({
      success: true,
      message: 'Transport standard created successfully',
      data: transportStandard
    });
  } catch (error) {
    console.error('Create transport standard error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error: ' + (error.message || 'Unknown error')
    });
  }
};

// @desc    Update transport standard
// @route   PUT /api/expense-items/transport/:id
// @access  Private (Finance/Admin only)
exports.updateTransportStandard = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation errors',
        errors: errors.array()
      });
    }

    const transportStandard = await TravelTransportStandard.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!transportStandard) {
      return res.status(404).json({
        success: false,
        message: 'Transport standard not found'
      });
    }

    res.json({
      success: true,
      message: 'Transport standard updated successfully',
      data: transportStandard
    });
  } catch (error) {
    console.error('Update transport standard error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Delete transport standard
// @route   DELETE /api/expense-items/transport/:id
// @access  Private (Admin only)
exports.deleteTransportStandard = async (req, res) => {
  try {
    const transportStandard = await TravelTransportStandard.findById(req.params.id);

    if (!transportStandard) {
      return res.status(404).json({
        success: false,
        message: 'Transport standard not found'
      });
    }

    await transportStandard.deleteOne();

    // 检查是否还有其他交通标准
    const remaining = await TravelTransportStandard.countDocuments({ standard: transportStandard.standard });
    if (remaining === 0) {
      await TravelStandard.findByIdAndUpdate(transportStandard.standard, {
        'expenseItemsConfigured.transport': false
      });
    }

    res.json({
      success: true,
      message: 'Transport standard deleted successfully'
    });
  } catch (error) {
    console.error('Delete transport standard error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// ==================== 住宿标准 ====================

// @desc    Get accommodation standards by standard ID
// @route   GET /api/expense-items/:standardId/accommodation
// @access  Private
exports.getAccommodationStandards = async (req, res) => {
  try {
    const standards = await TravelAccommodationStandard.find({ standard: req.params.standardId })
      .sort({ jobLevelCode: 1, cityLevel: 1 });

    res.json({
      success: true,
      count: standards.length,
      data: standards
    });
  } catch (error) {
    console.error('Get accommodation standards error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Create accommodation standard
// @route   POST /api/expense-items/:standardId/accommodation
// @access  Private (Finance/Admin only)
exports.createAccommodationStandard = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation errors',
        errors: errors.array()
      });
    }

    const accommodationData = {
      ...req.body,
      standard: req.params.standardId
    };

    const accommodationStandard = await TravelAccommodationStandard.create(accommodationData);

    // 更新标准主表的费用项配置状态
    await TravelStandard.findByIdAndUpdate(req.params.standardId, {
      'expenseItemsConfigured.accommodation': true
    });

    res.status(201).json({
      success: true,
      message: 'Accommodation standard created successfully',
      data: accommodationStandard
    });
  } catch (error) {
    console.error('Create accommodation standard error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error: ' + (error.message || 'Unknown error')
    });
  }
};

// @desc    Update accommodation standard
// @route   PUT /api/expense-items/accommodation/:id
// @access  Private (Finance/Admin only)
exports.updateAccommodationStandard = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation errors',
        errors: errors.array()
      });
    }

    const accommodationStandard = await TravelAccommodationStandard.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!accommodationStandard) {
      return res.status(404).json({
        success: false,
        message: 'Accommodation standard not found'
      });
    }

    res.json({
      success: true,
      message: 'Accommodation standard updated successfully',
      data: accommodationStandard
    });
  } catch (error) {
    console.error('Update accommodation standard error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Delete accommodation standard
// @route   DELETE /api/expense-items/accommodation/:id
// @access  Private (Admin only)
exports.deleteAccommodationStandard = async (req, res) => {
  try {
    const accommodationStandard = await TravelAccommodationStandard.findById(req.params.id);

    if (!accommodationStandard) {
      return res.status(404).json({
        success: false,
        message: 'Accommodation standard not found'
      });
    }

    await accommodationStandard.deleteOne();

    // 检查是否还有其他住宿标准
    const remaining = await TravelAccommodationStandard.countDocuments({ standard: accommodationStandard.standard });
    if (remaining === 0) {
      await TravelStandard.findByIdAndUpdate(accommodationStandard.standard, {
        'expenseItemsConfigured.accommodation': false
      });
    }

    res.json({
      success: true,
      message: 'Accommodation standard deleted successfully'
    });
  } catch (error) {
    console.error('Delete accommodation standard error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// ==================== 餐饮标准 ====================

// @desc    Get meal standards by standard ID
// @route   GET /api/expense-items/:standardId/meal
// @access  Private
exports.getMealStandards = async (req, res) => {
  try {
    const standards = await TravelMealStandard.find({ standard: req.params.standardId })
      .sort({ jobLevelCode: 1, cityLevel: 1 });

    res.json({
      success: true,
      count: standards.length,
      data: standards
    });
  } catch (error) {
    console.error('Get meal standards error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Create meal standard
// @route   POST /api/expense-items/:standardId/meal
// @access  Private (Finance/Admin only)
exports.createMealStandard = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation errors',
        errors: errors.array()
      });
    }

    const mealData = {
      ...req.body,
      standard: req.params.standardId
    };

    const mealStandard = await TravelMealStandard.create(mealData);

    // 更新标准主表的费用项配置状态
    await TravelStandard.findByIdAndUpdate(req.params.standardId, {
      'expenseItemsConfigured.meal': true
    });

    res.status(201).json({
      success: true,
      message: 'Meal standard created successfully',
      data: mealStandard
    });
  } catch (error) {
    console.error('Create meal standard error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error: ' + (error.message || 'Unknown error')
    });
  }
};

// @desc    Update meal standard
// @route   PUT /api/expense-items/meal/:id
// @access  Private (Finance/Admin only)
exports.updateMealStandard = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation errors',
        errors: errors.array()
      });
    }

    const mealStandard = await TravelMealStandard.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!mealStandard) {
      return res.status(404).json({
        success: false,
        message: 'Meal standard not found'
      });
    }

    res.json({
      success: true,
      message: 'Meal standard updated successfully',
      data: mealStandard
    });
  } catch (error) {
    console.error('Update meal standard error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Delete meal standard
// @route   DELETE /api/expense-items/meal/:id
// @access  Private (Admin only)
exports.deleteMealStandard = async (req, res) => {
  try {
    const mealStandard = await TravelMealStandard.findById(req.params.id);

    if (!mealStandard) {
      return res.status(404).json({
        success: false,
        message: 'Meal standard not found'
      });
    }

    await mealStandard.deleteOne();

    // 检查是否还有其他餐饮标准
    const remaining = await TravelMealStandard.countDocuments({ standard: mealStandard.standard });
    if (remaining === 0) {
      await TravelStandard.findByIdAndUpdate(mealStandard.standard, {
        'expenseItemsConfigured.meal': false
      });
    }

    res.json({
      success: true,
      message: 'Meal standard deleted successfully'
    });
  } catch (error) {
    console.error('Delete meal standard error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// ==================== 津贴标准 ====================

// @desc    Get allowance standards by standard ID
// @route   GET /api/expense-items/:standardId/allowance
// @access  Private
exports.getAllowanceStandards = async (req, res) => {
  try {
    const standards = await TravelAllowanceStandard.find({ standard: req.params.standardId })
      .sort({ jobLevelCode: 1, allowanceType: 1 });

    res.json({
      success: true,
      count: standards.length,
      data: standards
    });
  } catch (error) {
    console.error('Get allowance standards error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Create allowance standard
// @route   POST /api/expense-items/:standardId/allowance
// @access  Private (Finance/Admin only)
exports.createAllowanceStandard = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation errors',
        errors: errors.array()
      });
    }

    const allowanceData = {
      ...req.body,
      standard: req.params.standardId
    };

    const allowanceStandard = await TravelAllowanceStandard.create(allowanceData);

    // 更新标准主表的费用项配置状态
    await TravelStandard.findByIdAndUpdate(req.params.standardId, {
      'expenseItemsConfigured.allowance': true
    });

    res.status(201).json({
      success: true,
      message: 'Allowance standard created successfully',
      data: allowanceStandard
    });
  } catch (error) {
    console.error('Create allowance standard error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error: ' + (error.message || 'Unknown error')
    });
  }
};

// @desc    Update allowance standard
// @route   PUT /api/expense-items/allowance/:id
// @access  Private (Finance/Admin only)
exports.updateAllowanceStandard = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation errors',
        errors: errors.array()
      });
    }

    const allowanceStandard = await TravelAllowanceStandard.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!allowanceStandard) {
      return res.status(404).json({
        success: false,
        message: 'Allowance standard not found'
      });
    }

    res.json({
      success: true,
      message: 'Allowance standard updated successfully',
      data: allowanceStandard
    });
  } catch (error) {
    console.error('Update allowance standard error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Delete allowance standard
// @route   DELETE /api/expense-items/allowance/:id
// @access  Private (Admin only)
exports.deleteAllowanceStandard = async (req, res) => {
  try {
    const allowanceStandard = await TravelAllowanceStandard.findById(req.params.id);

    if (!allowanceStandard) {
      return res.status(404).json({
        success: false,
        message: 'Allowance standard not found'
      });
    }

    await allowanceStandard.deleteOne();

    // 检查是否还有其他津贴标准
    const remaining = await TravelAllowanceStandard.countDocuments({ standard: allowanceStandard.standard });
    if (remaining === 0) {
      await TravelStandard.findByIdAndUpdate(allowanceStandard.standard, {
        'expenseItemsConfigured.allowance': false
      });
    }

    res.json({
      success: true,
      message: 'Allowance standard deleted successfully'
    });
  } catch (error) {
    console.error('Delete allowance standard error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// ==================== 其他费用标准 ====================

// @desc    Get other expense standards by standard ID and type
// @route   GET /api/expense-items/:standardId/other?expenseType=entertainment
// @access  Private
exports.getOtherExpenseStandards = async (req, res) => {
  try {
    const { expenseType } = req.query;
    const query = { standard: req.params.standardId };
    
    if (expenseType) {
      query.expenseType = expenseType;
    }

    const standards = await TravelOtherExpenseStandard.find(query)
      .sort({ expenseType: 1, jobLevelCode: 1 });

    res.json({
      success: true,
      count: standards.length,
      data: standards
    });
  } catch (error) {
    console.error('Get other expense standards error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Get all expense types for a standard
// @route   GET /api/expense-items/:standardId/other/types
// @access  Private
exports.getOtherExpenseTypes = async (req, res) => {
  try {
    const standards = await TravelOtherExpenseStandard.find({ standard: req.params.standardId })
      .select('expenseType expenseTypeName')
      .lean();

    // 获取所有唯一的费用类型
    const uniqueTypes = [...new Set(standards.map(s => s.expenseType))];

    // 获取所有类型的名称映射
    const typeMap = {
      entertainment: '娱乐费用',
      communication: '通讯费用',
      office_supplies: '办公用品',
      training: '培训费用',
      parking: '停车费',
      toll: '过路费',
      insurance: '保险费用',
      visa: '签证费用',
      other: '其他费用'
    };

    const types = uniqueTypes.map(type => ({
      value: type,
      label: typeMap[type] || type
    }));

    res.json({
      success: true,
      data: types
    });
  } catch (error) {
    console.error('Get expense types error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Create other expense standard
// @route   POST /api/expense-items/:standardId/other
// @access  Private (Finance/Admin only)
exports.createOtherExpenseStandard = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation errors',
        errors: errors.array()
      });
    }

    const expenseData = {
      ...req.body,
      standard: req.params.standardId
    };

    const expenseStandard = await TravelOtherExpenseStandard.create(expenseData);

    // 更新标准主表的费用项配置状态
    const standard = await TravelStandard.findById(req.params.standardId);
    if (standard) {
      if (!standard.expenseItemsConfigured.otherExpenses) {
        standard.expenseItemsConfigured.otherExpenses = {};
      }
      standard.expenseItemsConfigured.otherExpenses[expenseData.expenseType] = true;
      await standard.save();
    }

    res.status(201).json({
      success: true,
      message: 'Other expense standard created successfully',
      data: expenseStandard
    });
  } catch (error) {
    console.error('Create other expense standard error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error: ' + (error.message || 'Unknown error')
    });
  }
};

// @desc    Update other expense standard
// @route   PUT /api/expense-items/other/:id
// @access  Private (Finance/Admin only)
exports.updateOtherExpenseStandard = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation errors',
        errors: errors.array()
      });
    }

    const expenseStandard = await TravelOtherExpenseStandard.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!expenseStandard) {
      return res.status(404).json({
        success: false,
        message: 'Other expense standard not found'
      });
    }

    res.json({
      success: true,
      message: 'Other expense standard updated successfully',
      data: expenseStandard
    });
  } catch (error) {
    console.error('Update other expense standard error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Delete other expense standard
// @route   DELETE /api/expense-items/other/:id
// @access  Private (Admin only)
exports.deleteOtherExpenseStandard = async (req, res) => {
  try {
    const expenseStandard = await TravelOtherExpenseStandard.findById(req.params.id);

    if (!expenseStandard) {
      return res.status(404).json({
        success: false,
        message: 'Other expense standard not found'
      });
    }

    const expenseType = expenseStandard.expenseType;
    await expenseStandard.deleteOne();

    // 检查是否还有其他相同类型的费用标准
    const remaining = await TravelOtherExpenseStandard.countDocuments({
      standard: expenseStandard.standard,
      expenseType: expenseType
    });

    if (remaining === 0) {
      const standard = await TravelStandard.findById(expenseStandard.standard);
      if (standard && standard.expenseItemsConfigured.otherExpenses) {
        standard.expenseItemsConfigured.otherExpenses[expenseType] = false;
        await standard.save();
      }
    }

    res.json({
      success: true,
      message: 'Other expense standard deleted successfully'
    });
  } catch (error) {
    console.error('Delete other expense standard error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};
