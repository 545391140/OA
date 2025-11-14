const mongoose = require('mongoose');

/**
 * 其他费用标准（通用费用项标准）
 * 支持：娱乐、通讯、办公用品、培训等费用类型
 */
const TravelOtherExpenseStandardSchema = new mongoose.Schema({
  standard: {
    type: mongoose.Schema.ObjectId,
    ref: 'TravelStandard',
    required: true
  },
  expenseType: {
    type: String,
    required: [true, 'Please add expense type'],
    enum: ['entertainment', 'communication', 'office_supplies', 'training', 'parking', 'toll', 'insurance', 'visa', 'other'],
    trim: true
  },
  expenseTypeName: {
    type: String,
    required: [true, 'Please add expense type name'],
    trim: true // 如：娱乐费用、通讯费用、办公用品等
  },
  jobLevelCode: {
    type: String,
    required: [true, 'Please add job level code'],
    trim: true
  },
  // 城市级别（可选）
  cityLevel: {
    type: Number,
    enum: [1, 2, 3, 4] // 可为空，表示不限城市级别
  },
  // 计算方式
  amountType: {
    type: String,
    required: [true, 'Please add amount type'],
    enum: ['daily', 'per_trip', 'per_item', 'percentage', 'fixed'],
    default: 'fixed'
    // daily: 按天
    // per_trip: 按次
    // per_item: 按项
    // percentage: 按比例（需要配合baseAmount）
    // fixed: 固定金额
  },
  // 金额配置
  amount: {
    type: Number,
    required: [true, 'Please add amount'],
    min: 0
  },
  // 如果是按比例，需要基础金额
  baseAmount: {
    type: Number,
    min: 0
  },
  // 如果是按比例，比例值（如0.1表示10%）
  percentage: {
    type: Number,
    min: 0,
    max: 100
  },
  // 适用范围描述
  applicableScope: {
    type: String,
    trim: true // 如：客户招待、团队聚餐、电话费、打印费等
  },
  // 是否有上限
  hasMaxLimit: {
    type: Boolean,
    default: false
  },
  // 上限金额
  maxLimit: {
    type: Number,
    min: 0
  },
  // 是否需要票据
  requireReceipt: {
    type: Boolean,
    default: true
  },
  // 是否需要审批
  requireApproval: {
    type: Boolean,
    default: false
  },
  remark: {
    type: String,
    trim: true
  }
}, {
  timestamps: true
});

// Index for better query performance
TravelOtherExpenseStandardSchema.index({ standard: 1, expenseType: 1 });
TravelOtherExpenseStandardSchema.index({ standard: 1, jobLevelCode: 1 });
TravelOtherExpenseStandardSchema.index({ expenseType: 1 });

module.exports = mongoose.model('TravelOtherExpenseStandard', TravelOtherExpenseStandardSchema);

