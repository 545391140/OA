const mongoose = require('mongoose');

const OperationLogSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.ObjectId,
    ref: 'User',
    required: true
  },
  email: {
    type: String,
    required: true
  },
  employeeId: {
    type: String
  },
  module: {
    type: String,
    required: true,
    comment: '操作模块，如 travel, expense, user 等'
  },
  action: {
    type: String,
    required: true,
    comment: '操作动作，如 create, update, delete, view, approve 等'
  },
  resourceType: {
    type: String,
    required: true,
    comment: '资源类型，如 Travel, Expense, User 等'
  },
  resourceId: {
    type: String,
    comment: '资源ID'
  },
  description: {
    type: String,
    comment: '操作描述'
  },
  ipAddress: {
    type: String
  },
  userAgent: {
    type: String
  },
  requestMethod: {
    type: String,
    enum: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE']
  },
  requestPath: {
    type: String
  },
  status: {
    type: String,
    enum: ['success', 'failed'],
    default: 'success'
  },
  errorMessage: {
    type: String
  },
  operationTime: {
    type: Date,
    default: Date.now
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    comment: '额外的元数据，如请求参数、响应数据等'
  }
}, {
  timestamps: true
});

// Indexes for better query performance
OperationLogSchema.index({ userId: 1, operationTime: -1 });
OperationLogSchema.index({ module: 1, operationTime: -1 });
OperationLogSchema.index({ action: 1, operationTime: -1 });
OperationLogSchema.index({ resourceType: 1, operationTime: -1 });
OperationLogSchema.index({ status: 1, operationTime: -1 });
OperationLogSchema.index({ operationTime: -1 });

module.exports = mongoose.model('OperationLog', OperationLogSchema);






