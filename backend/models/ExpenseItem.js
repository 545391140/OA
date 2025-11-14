const mongoose = require('mongoose');

/**
 * 通用费用项标准模型
 * 简化的费用项模型，只包含基本字段
 */
const ExpenseItemSchema = new mongoose.Schema({
  standard: {
    type: mongoose.Schema.ObjectId,
    ref: 'TravelStandard',
    required: false // 差旅标准改为非必填
  },
  itemName: {
    type: String,
    required: [true, 'Please add expense item name'],
    trim: true,
    unique: true // 添加唯一性约束
  },
  amount: {
    type: Number,
    required: false, // 金额改为非必填
    min: 0
  },
  description: {
    type: String,
    trim: true
  },
  // 可选：关联到原有的具体费用类型（用于兼容）
  category: {
    type: String,
    enum: ['transport', 'accommodation', 'meal', 'allowance', 'other', 'general'],
    default: 'general'
  },
  // 可选：保留一些扩展字段
  jobLevelCode: {
    type: String,
    trim: true
  },
  cityLevel: {
    type: Number,
    enum: [1, 2, 3, 4]
  },
  remark: {
    type: String,
    trim: true
  },
  // 启用/禁用状态
  status: {
    type: String,
    enum: ['enabled', 'disabled'],
    default: 'enabled'
  },
  // 父费用项（用于支持子费用项）
  parentItem: {
    type: mongoose.Schema.ObjectId,
    ref: 'ExpenseItem',
    default: null
  },
  // 是否为系统默认费用项（不可删除）
  isSystemDefault: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Index for better query performance
ExpenseItemSchema.index({ standard: 1 });
// itemName 已在字段定义中设置 unique: true，不需要额外索引
ExpenseItemSchema.index({ category: 1 });
ExpenseItemSchema.index({ status: 1 });
ExpenseItemSchema.index({ parentItem: 1 });
ExpenseItemSchema.index({ isSystemDefault: 1 });

module.exports = mongoose.model('ExpenseItem', ExpenseItemSchema);

