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
  },
  // 携程API的ID字段（用于增量更新和关联）
  ctripCityId: {
    type: Number,
    index: true
  },
  ctripProvinceId: {
    type: Number,
    index: true
  },
  ctripCountyId: {
    type: Number,
    index: true
  },
  ctripDistrictId: {
    type: Number,
    index: true
  },
  // 非标城市标识（从remark中提取）
  // 0: 标准城市信息, 1: 非标城市信息（只可预订机票）
  corpTag: {
    type: Number,
    enum: [0, 1],
    default: 0
  },
  // 行政区划代码
  districtCode: {
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
// Text search index - 包含多语言字段（中文、英文、拼音）
LocationSchema.index({ 
  name: 'text', 
  code: 'text', 
  city: 'text', 
  province: 'text', 
  district: 'text', 
  county: 'text', 
  country: 'text', 
  countryCode: 'text',
  enName: 'text',  // 英文名称（支持英文搜索）
  pinyin: 'text'   // 拼音（支持拼音搜索）
});

// 新增字段的索引（方案一：最小调整方案）
LocationSchema.index({ ctripCityId: 1, type: 1 }); // 用于增量更新查询
LocationSchema.index({ ctripProvinceId: 1, type: 1 }); // 用于增量更新查询
LocationSchema.index({ corpTag: 1, type: 1 }); // 用于非标城市过滤
LocationSchema.index({ districtCode: 1 }); // 用于行政区划代码查询

module.exports = mongoose.model('Location', LocationSchema);
