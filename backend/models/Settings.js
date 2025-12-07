const mongoose = require('mongoose');

const SettingsSchema = new mongoose.Schema({
  // 设置类型：'system' 系统级设置（全局），'user' 用户级设置（个人）
  type: {
    type: String,
    required: true,
    enum: ['system', 'user'],
    default: 'system'
  },
  // 如果是用户级设置，关联用户ID
  user: {
    type: mongoose.Schema.ObjectId,
    ref: 'User',
    required: function() {
      return this.type === 'user';
    }
  },
  // 通用设置
  general: {
    companyName: {
      type: String,
      trim: true,
      default: 'Your Company'
    },
    timezone: {
      type: String,
      default: 'UTC',
      enum: ['UTC', 'America/New_York', 'Asia/Tokyo', 'Asia/Shanghai', 'Europe/London', 'America/Los_Angeles']
    },
    currency: {
      type: String,
      default: 'USD'
      // 移除 enum 限制，允许使用数据库中的任何活跃币种
      // 验证在路由层进行，从数据库获取活跃币种列表
    }
  },
  // 通知设置
  notifications: {
    emailNotifications: {
      type: Boolean,
      default: true
    },
    pushNotifications: {
      type: Boolean,
      default: true
    },
    approvalReminders: {
      type: Boolean,
      default: true
    },
    // 详细通知偏好设置
    preferences: {
      // 审批相关通知
      approvalRequest: {
        email: { type: Boolean, default: true },
        push: { type: Boolean, default: true },
        inApp: { type: Boolean, default: true }
      },
      approvalApproved: {
        email: { type: Boolean, default: true },
        push: { type: Boolean, default: true },
        inApp: { type: Boolean, default: true }
      },
      approvalRejected: {
        email: { type: Boolean, default: true },
        push: { type: Boolean, default: true },
        inApp: { type: Boolean, default: true }
      },
      // 提交相关通知
      travelSubmitted: {
        email: { type: Boolean, default: false },
        push: { type: Boolean, default: true },
        inApp: { type: Boolean, default: true }
      },
      expenseSubmitted: {
        email: { type: Boolean, default: false },
        push: { type: Boolean, default: true },
        inApp: { type: Boolean, default: true }
      },
      // 系统通知
      system: {
        email: { type: Boolean, default: true },
        push: { type: Boolean, default: true },
        inApp: { type: Boolean, default: true }
      },
      // 提醒通知
      reminder: {
        email: { type: Boolean, default: true },
        push: { type: Boolean, default: true },
        inApp: { type: Boolean, default: true }
      }
    }
  },
  // 安全设置
  security: {
    passwordPolicy: {
      type: String,
      default: 'strong',
      enum: ['weak', 'medium', 'strong']
    },
    sessionTimeout: {
      type: Number,
      default: 30,
      min: 5,
      max: 480 // 8小时
    },
    twoFactorAuth: {
      type: Boolean,
      default: false
    }
  }
}, {
  timestamps: true
});

// 索引：确保系统设置只有一条记录，用户设置每个用户一条
SettingsSchema.index({ type: 1, user: 1 }, { unique: true, sparse: true });

// 静态方法：获取系统设置
SettingsSchema.statics.getSystemSettings = async function() {
  let settings = await this.findOne({ type: 'system' });
  if (!settings) {
    // 如果不存在，创建默认系统设置
    settings = await this.create({ type: 'system' });
  }
  return settings;
};

// 静态方法：获取用户设置
SettingsSchema.statics.getUserSettings = async function(userId) {
  let settings = await this.findOne({ type: 'user', user: userId });
  if (!settings) {
    // 如果不存在，创建默认用户设置
    settings = await this.create({ type: 'user', user: userId });
  }
  return settings;
};

// 静态方法：更新系统设置
SettingsSchema.statics.updateSystemSettings = async function(updateData) {
  let settings = await this.findOne({ type: 'system' });
  if (!settings) {
    settings = await this.create({ type: 'system', ...updateData });
  } else {
    Object.keys(updateData).forEach(key => {
      if (updateData[key] !== undefined) {
        if (typeof updateData[key] === 'object' && !Array.isArray(updateData[key])) {
          settings[key] = { ...settings[key].toObject(), ...updateData[key] };
        } else {
          settings[key] = updateData[key];
        }
      }
    });
    await settings.save();
  }
  return settings;
};

// 静态方法：更新用户设置
SettingsSchema.statics.updateUserSettings = async function(userId, updateData) {
  let settings = await this.findOne({ type: 'user', user: userId });
  if (!settings) {
    settings = await this.create({ type: 'user', user: userId, ...updateData });
  } else {
    Object.keys(updateData).forEach(key => {
      if (updateData[key] !== undefined) {
        if (typeof updateData[key] === 'object' && !Array.isArray(updateData[key])) {
          settings[key] = { ...settings[key].toObject(), ...updateData[key] };
        } else {
          settings[key] = updateData[key];
        }
      }
    });
    await settings.save();
  }
  return settings;
};

module.exports = mongoose.model('Settings', SettingsSchema);

