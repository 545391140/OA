const mongoose = require('mongoose');

const ApprovalWorkflowSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please add a workflow name'],
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  // 兼容字段：type（旧版本）
  type: {
    type: String,
    enum: ['travel', 'expense', 'leave', 'other'],
    default: 'travel'
  },
  // 适用类型（travel/expense/all）
  appliesTo: {
    type: String,
    enum: ['travel', 'expense', 'all'],
    default: 'all'
  },
  // 触发条件
  conditions: {
    // 金额范围（兼容旧版本）
    amountRange: {
      min: {
        type: Number,
        default: 0
      },
      max: {
        type: Number,
        default: Number.MAX_SAFE_INTEGER
      }
    },
    // 最小金额（新版本，扁平化结构）
    minAmount: {
      type: Number,
      default: 0
    },
    // 最大金额（新版本，扁平化结构）
    maxAmount: {
      type: Number,
      default: 999999999999
    },
    // 部门（数组，兼容旧版本）
    departments: [{
      type: String,
      trim: true
    }],
    // 单个部门（新版本，扁平化结构）
    department: {
      type: String,
      trim: true
    },
    // 职位级别（数组，兼容旧版本）
    jobLevels: [{
      type: String,
      trim: true
    }],
    // 单个职位级别（新版本，扁平化结构）
    jobLevel: {
      type: String,
      trim: true
    }
  },
  // 审批步骤
  steps: [{
    level: {
      type: Number,
      required: true
    },
    name: {
      type: String,
      required: true,
      trim: true
    },
    // 审批人类型
    approverType: {
      type: String,
      required: true,
      enum: ['manager', 'role', 'specific_user', 'department_head', 'finance'],
      default: 'manager'
    },
    // 如果是 specific_user，指定用户ID（数组，支持多个用户）
    approverUsers: [{
      type: mongoose.Schema.ObjectId,
      ref: 'User'
    }],
    // 如果是 role，指定角色（数组，支持多个角色）
    approverRoles: [{
      type: String,
      trim: true
    }],
    // 兼容字段：单个角色（如果approverType是role）
    role: {
      type: String,
      trim: true
    },
    // 兼容字段：单个用户（如果approverType是specific_user）
    user: {
      type: mongoose.Schema.ObjectId,
      ref: 'User'
    },
    // 兼容字段：部门（如果approverType是department_head）
    department: {
      type: String,
      trim: true
    },
    // 审批方式
    approvalMode: {
      type: String,
      enum: ['any', 'all', 'sequence'], // any: 任一审批即可, all: 全部审批, sequence: 按顺序
      default: 'any'
    },
    // 是否必须
    required: {
      type: Boolean,
      default: true
    },
    // 超时时间（小时）
    timeoutHours: {
      type: Number,
      default: 48
    }
  }],
  // 优先级（数字越大优先级越高）
  priority: {
    type: Number,
    default: 0
  },
  // 是否启用
  isActive: {
    type: Boolean,
    default: true
  },
  createdBy: {
    type: mongoose.Schema.ObjectId,
    ref: 'User'
  },
  updatedBy: {
    type: mongoose.Schema.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

// 索引
ApprovalWorkflowSchema.index({ type: 1, isActive: 1, priority: -1 });
ApprovalWorkflowSchema.index({ appliesTo: 1, isActive: 1, priority: -1 });
ApprovalWorkflowSchema.index({ 'conditions.amountRange.min': 1, 'conditions.amountRange.max': 1 });
ApprovalWorkflowSchema.index({ 'conditions.minAmount': 1, 'conditions.maxAmount': 1 });

module.exports = mongoose.model('ApprovalWorkflow', ApprovalWorkflowSchema);

