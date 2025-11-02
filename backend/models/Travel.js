const mongoose = require('mongoose');

const TravelSchema = new mongoose.Schema({
  employee: {
    type: mongoose.Schema.ObjectId,
    ref: 'User',
    required: true
  },
  // 差旅单号（自动生成）
  travelNumber: {
    type: String,
    unique: true,
    trim: true,
    uppercase: true
  },
  // 基本信息
  title: {
    type: String,
    trim: true
  },
  purpose: {
    type: String,
    trim: true
  },
  travelType: {
    type: String,
    enum: ['domestic', 'international'],
    default: 'domestic'
  },
  tripType: {
    type: String,
    enum: ['international', 'mainland_china'],
    default: 'mainland_china'
  },
  costOwingDepartment: {
    type: String,
    trim: true
  },
  destination: {
    type: mongoose.Schema.Types.Mixed, // 可以是字符串或Location对象
    default: null
  },
  requestName: {
    type: String,
    trim: true
  },
  startDate: {
    type: Date
  },
  endDate: {
    type: Date
  },
  tripDescription: {
    type: String,
    trim: true
  },
  comment: {
    type: String,
    trim: true
  },
  destinationAddress: {
    type: String,
    trim: true
  },
  // 去程信息
  outbound: {
    date: Date,
    departure: mongoose.Schema.Types.Mixed, // 可以是字符串或Location对象
    destination: mongoose.Schema.Types.Mixed,
    transportation: {
      type: String,
      enum: ['flight', 'train', 'car', 'bus', '']
    }
  },
  // 返程信息
  inbound: {
    date: Date,
    departure: mongoose.Schema.Types.Mixed,
    destination: mongoose.Schema.Types.Mixed,
    transportation: {
      type: String,
      enum: ['flight', 'train', 'car', 'bus', '']
    }
  },
  // 多程行程
  multiCityRoutes: [{
    date: Date,
    departure: mongoose.Schema.Types.Mixed,
    destination: mongoose.Schema.Types.Mixed,
    transportation: {
      type: String,
      enum: ['flight', 'train', 'car', 'bus']
    }
  }],
  // 费用预算 - 去程（动态结构，key为费用项ID）
  outboundBudget: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  // 费用预算 - 返程（动态结构，key为费用项ID）
  inboundBudget: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  // 向后兼容的旧字段
  dates: {
    departure: {
      type: Date
    },
    return: {
      type: Date
    }
  },
  estimatedCost: {
    type: Number,
    default: 0,
    min: 0
  },
  currency: {
    type: String,
    default: 'USD',
    enum: ['USD', 'RMB', 'CNY', 'JPY', 'KRW', 'EUR']
  },
  status: {
    type: String,
    enum: ['draft', 'submitted', 'approved', 'rejected', 'in-progress', 'completed', 'cancelled'],
    default: 'draft'
  },
  bookings: [{
    type: {
      type: String,
      enum: ['flight', 'hotel', 'car', 'train', 'other'],
      required: true
    },
    provider: {
      type: String,
      required: true,
      trim: true
    },
    bookingReference: {
      type: String,
      trim: true
    },
    cost: {
      type: Number,
      required: true,
      min: 0
    },
    currency: {
      type: String,
      default: 'USD'
    },
    details: {
      type: mongoose.Schema.Types.Mixed
    },
    status: {
      type: String,
      enum: ['pending', 'confirmed', 'cancelled'],
      default: 'pending'
    }
  }],
  approvals: [{
    approver: {
      type: mongoose.Schema.ObjectId,
      ref: 'User',
      required: true
    },
    level: {
      type: Number,
      required: true
    },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending'
    },
    comments: {
      type: String,
      trim: true
    },
    approvedAt: {
      type: Date
    }
  }],
  actualCost: {
    type: Number,
    default: 0
  },
  notes: {
    type: String,
    trim: true
  },
  attachments: [{
    filename: String,
    originalName: String,
    path: String,
    size: Number,
    mimeType: String,
    uploadedAt: {
      type: Date,
      default: Date.now
    }
  }]
}, {
  timestamps: true
});

// Index for better query performance
TravelSchema.index({ employee: 1, status: 1 });
TravelSchema.index({ 'approvals.approver': 1, 'approvals.status': 1 });
TravelSchema.index({ travelNumber: 1 }, { unique: true }); // 差旅单号索引

module.exports = mongoose.model('Travel', TravelSchema);
