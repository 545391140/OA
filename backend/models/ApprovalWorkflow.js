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
  type: {
    type: String,
    required: true,
    enum: ['travel', 'expense', 'leave', 'other'],
    default: 'travel'
  },
  // 触发条件
  conditions: {
    // 金额范围
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
    // 部门（为空表示所有部门）
    departments: [{
      type: String,
      trim: true
    }],
    // 职位级别（为空表示所有职位）
    jobLevels: [{
      type: String,
      trim: true
    }]
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
    // 如果是 specific_user，指定用户ID
    approverUsers: [{
      type: mongoose.Schema.ObjectId,
      ref: 'User'
    }],
    // 如果是 role，指定角色
    approverRoles: [{
      type: String,
      trim: true
    }],
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
ApprovalWorkflowSchema.index({ 'conditions.amountRange.min': 1, 'conditions.amountRange.max': 1 });

module.exports = mongoose.model('ApprovalWorkflow', ApprovalWorkflowSchema);

