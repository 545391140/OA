const mongoose = require('mongoose');

const NotificationTemplateSchema = new mongoose.Schema({
  // 模板代码（唯一标识）
  code: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    uppercase: true
  },
  // 模板名称
  name: {
    type: String,
    required: true,
    trim: true
  },
  // 模板类型
  type: {
    type: String,
    required: true,
    enum: [
      'approval_request',
      'approval_approved',
      'approval_rejected',
      'travel_submitted',
      'expense_submitted',
      'system',
      'reminder',
      'other'
    ]
  },
  // 模板标题（支持变量）
  titleTemplate: {
    type: String,
    required: true
  },
  // 模板内容（支持变量）
  contentTemplate: {
    type: String,
    required: true
  },
  // 邮件模板（HTML格式，可选）
  emailTemplate: {
    type: String
  },
  // 推送通知模板（简短版本）
  pushTemplate: {
    type: String
  },
  // 可用变量说明
  variables: [{
    name: {
      type: String,
      required: true
    },
    description: {
      type: String
    },
    example: {
      type: String
    }
  }],
  // 是否启用
  enabled: {
    type: Boolean,
    default: true
  },
  // 优先级
  priority: {
    type: String,
    enum: ['low', 'normal', 'high', 'urgent'],
    default: 'normal'
  },
  // 是否发送邮件
  sendEmail: {
    type: Boolean,
    default: true
  },
  // 是否发送推送
  sendPush: {
    type: Boolean,
    default: true
  },
  // 是否发送站内通知
  sendInApp: {
    type: Boolean,
    default: true
  },
  // 描述
  description: {
    type: String,
    trim: true
  }
}, {
  timestamps: true
});

// 索引
NotificationTemplateSchema.index({ code: 1 }, { unique: true });
NotificationTemplateSchema.index({ type: 1 });
NotificationTemplateSchema.index({ enabled: 1 });

// 静态方法：根据类型获取模板
NotificationTemplateSchema.statics.getTemplateByType = async function(type) {
  const template = await this.findOne({ type, enabled: true });
  if (!template) {
    throw new Error(`Template not found for type: ${type}`);
  }
  return template;
};

// 静态方法：根据代码获取模板
NotificationTemplateSchema.statics.getTemplateByCode = async function(code) {
  const template = await this.findOne({ code: code.toUpperCase(), enabled: true });
  if (!template) {
    throw new Error(`Template not found for code: ${code}`);
  }
  return template;
};

// 实例方法：渲染模板
NotificationTemplateSchema.methods.render = function(variables = {}) {
  let title = this.titleTemplate;
  let content = this.contentTemplate;
  let email = this.emailTemplate || this.contentTemplate;
  let push = this.pushTemplate || this.contentTemplate;

  // 替换变量 {{variableName}}
  const replaceVariables = (text) => {
    if (!text) return '';
    return text.replace(/\{\{(\w+)\}\}/g, (match, key) => {
      return variables[key] !== undefined ? String(variables[key]) : match;
    });
  };

  return {
    title: replaceVariables(title),
    content: replaceVariables(content),
    email: replaceVariables(email),
    push: replaceVariables(push)
  };
};

module.exports = mongoose.model('NotificationTemplate', NotificationTemplateSchema);





