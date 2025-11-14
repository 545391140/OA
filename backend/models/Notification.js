const mongoose = require('mongoose');

const NotificationSchema = new mongoose.Schema({
  // 接收人
  recipient: {
    type: mongoose.Schema.ObjectId,
    ref: 'User',
    required: true
  },
  // 发送人
  sender: {
    type: mongoose.Schema.ObjectId,
    ref: 'User'
  },
  // 通知类型
  type: {
    type: String,
    required: true,
    enum: [
      'approval_request',      // 审批请求
      'approval_approved',     // 审批通过
      'approval_rejected',     // 审批拒绝
      'travel_submitted',      // 差旅提交
      'expense_submitted',     // 费用提交
      'system',                // 系统通知
      'reminder',              // 提醒
      'other'
    ]
  },
  // 标题
  title: {
    type: String,
    required: true,
    trim: true
  },
  // 内容
  content: {
    type: String,
    required: true
  },
  // 关联数据
  relatedData: {
    // 关联类型
    type: {
      type: String,
      enum: ['travel', 'expense', 'leave', 'other']
    },
    // 关联ID
    id: {
      type: mongoose.Schema.ObjectId
    },
    // 关联URL
    url: {
      type: String
    }
  },
  // 是否已读
  isRead: {
    type: Boolean,
    default: false
  },
  // 已读时间
  readAt: {
    type: Date
  },
  // 优先级
  priority: {
    type: String,
    enum: ['low', 'normal', 'high', 'urgent'],
    default: 'normal'
  }
}, {
  timestamps: true
});

// 索引
NotificationSchema.index({ recipient: 1, isRead: 1, createdAt: -1 });
NotificationSchema.index({ type: 1, createdAt: -1 });

module.exports = mongoose.model('Notification', NotificationSchema);

