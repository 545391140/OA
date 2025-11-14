const mongoose = require('mongoose');

const LocationSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please add a location name'],
    trim: true
  },
  code: {
    type: String,
    trim: true,
    uppercase: true
  },
  type: {
    type: String,
    required: [true, 'Please add location type'],
    enum: ['airport', 'station', 'city', 'province', 'country', 'bus'],
    default: 'city'
  },
  city: {
    type: String,
    trim: true
  },
  province: {
    type: String,
    trim: true
  },
  district: {
    type: String,
    trim: true
  },
  county: {
    type: String,
    trim: true
  },
  country: {
    type: String,
    default: '中国',
    trim: true
  },
  countryCode: {
    type: String,
    trim: true,
    uppercase: true
  },
  enName: {
    type: String,
    trim: true
  },
  pinyin: {
    type: String,
    trim: true
  },
  coordinates: {
    latitude: {
      type: Number,
      default: 0
    },
    longitude: {
      type: Number,
      default: 0
    }
  },
  timezone: {
    type: String,
    default: 'Asia/Shanghai',
    trim: true
  },
  status: {
    type: String,
    enum: ['active', 'inactive'],
    default: 'active'
  },
  parentId: {
    type: mongoose.Schema.ObjectId,
    ref: 'Location',
    default: null
  },
  continentId: {
    type: Number
  },
  // 城市风险等级（仅适用于城市类型）
  riskLevel: {
    type: String,
    enum: ['low', 'medium', 'high', 'very_high'],
    default: 'low'
  },
  // 城市无机场标识（仅适用于城市类型）
  noAirport: {
    type: Boolean,
    default: false
  },
  // 城市等级（仅适用于城市类型，用于差旅标准）
  // 1: 一线城市, 2: 二线城市, 3: 三线城市, 4: 其他城市
  cityLevel: {
    type: Number,
    enum: [1, 2, 3, 4],
    default: 4
  },
  remark: {
    type: String,
    trim: true
  }
}, {
  timestamps: true
});

// Indexes for better query performance
LocationSchema.index({ type: 1 });
LocationSchema.index({ code: 1 });
LocationSchema.index({ city: 1 });
LocationSchema.index({ province: 1 });
LocationSchema.index({ district: 1 });
LocationSchema.index({ county: 1 });
LocationSchema.index({ country: 1 });
LocationSchema.index({ countryCode: 1 });
LocationSchema.index({ name: 1 });
LocationSchema.index({ status: 1 });
LocationSchema.index({ parentId: 1 }); // 用于查询隶属关系
LocationSchema.index({ riskLevel: 1 }); // 用于按风险等级查询
LocationSchema.index({ noAirport: 1 }); // 用于查询无机场城市
LocationSchema.index({ cityLevel: 1 }); // 用于按城市等级查询
LocationSchema.index({ name: 'text', code: 'text', city: 'text', province: 'text', district: 'text', county: 'text', country: 'text', countryCode: 'text' }); // Text search index

module.exports = mongoose.model('Location', LocationSchema);
