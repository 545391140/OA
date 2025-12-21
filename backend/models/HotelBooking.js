const mongoose = require('mongoose');

const HotelBookingSchema = new mongoose.Schema({
  // ========== 关联信息 ==========
  
  // 关联的差旅申请ID（必填）
  travelId: {
    type: mongoose.Schema.ObjectId,
    ref: 'Travel',
    required: [true, '差旅申请ID必填：酒店预订必须关联差旅申请'],
    index: true,
  },
  
  // 预订员工ID
  employee: {
    type: mongoose.Schema.ObjectId,
    ref: 'User',
    required: [true, '预订员工ID必填'],
    index: true,
  },
  
  // ========== 预订标识 ==========
  
  // 预订参考号（Amadeus返回，用于客户查询）
  bookingReference: {
    type: String,
    trim: true,
  },
  
  // Amadeus 订单ID（唯一标识）
  amadeusBookingId: {
    type: String,
    trim: true,
    sparse: true, // 允许null，但如果有值则唯一
  },
  
  // ========== 酒店信息 ==========
  
  // 酒店基本信息（从报价中提取）
  hotel: {
    hotelId: {
      type: String,
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
    },
    chainCode: String,
    iataCode: String,
    cityCode: String,
    geoCode: {
      latitude: Number,
      longitude: Number,
    },
    address: {
      countryCode: String,
      postalCode: String,
      stateCode: String,
      cityName: String,
      lines: [String],
    },
  },
  
  // ========== 入住信息 ==========
  
  // 入住日期
  checkIn: {
    type: Date,
    required: true,
    index: true,
  },
  
  // 退房日期
  checkOut: {
    type: Date,
    required: true,
    index: true,
  },
  
  // 入住天数
  nights: {
    type: Number,
    default: function() {
      if (this.checkIn && this.checkOut) {
        return Math.ceil((this.checkOut - this.checkIn) / (1000 * 60 * 60 * 24));
      }
      return 0;
    },
  },
  
  // ========== 客人信息 ==========
  
  guests: [{
    id: {
      type: String,
      required: true,
    },
    name: {
      firstName: {
        type: String,
        required: true,
        trim: true,
      },
      lastName: {
        type: String,
        required: true,
        trim: true,
      },
    },
    contact: {
      emailAddress: {
        type: String,
        required: true,
        lowercase: true,
      },
      phones: [{
        deviceType: {
          type: String,
          enum: ['MOBILE', 'LANDLINE'],
        },
        countryCallingCode: String,
        number: String,
      }],
    },
  }],
  
  // 成人数量
  adults: {
    type: Number,
    required: true,
    min: 1,
    max: 9,
  },
  
  // 儿童数量
  children: {
    type: Number,
    default: 0,
    min: 0,
  },
  
  // ========== 房间信息 ==========
  
  rooms: [{
    type: {
      type: String,
      trim: true,
    },
    typeEstimated: {
      beds: Number,
      bedType: String, // KING, QUEEN, etc.
    },
    description: {
      text: String,
      lang: String,
    },
    guests: {
      type: Number,
      default: 1,
    },
  }],
  
  // 房间数量
  roomQuantity: {
    type: Number,
    default: 1,
    min: 1,
  },
  
  // ========== 价格信息 ==========
  
  price: {
    total: {
      type: String,
      required: true,
    },
    currency: {
      type: String,
      default: 'USD',
      index: true,
    },
    base: {
      type: String,
    },
    taxes: [{
      amount: String,
      code: String,
      type: String,
    }],
    variations: {
      average: {
        base: String,
      },
      changes: [{
        startDate: Date,
        endDate: Date,
        base: String,
      }],
    },
  },
  
  // 价格数值（用于计算和排序）
  priceAmount: {
    type: Number,
    default: function() {
      return parseFloat(this.price?.total || 0);
    },
  },
  
  // ========== 报价信息 ==========
  
  // 报价ID（Amadeus）
  offerId: {
    type: String,
    required: true,
    index: true,
  },
  
  // 报价代码
  rateCode: {
    type: String,
    trim: true,
  },
  
  // 完整报价信息（存储 Amadeus API 返回的完整数据）
  hotelOffer: {
    type: mongoose.Schema.Types.Mixed,
    required: true,
  },
  
  // ========== 取消政策 ==========
  
  cancellationPolicy: {
    cancellations: [{
      numberOfNights: Number,
      deadline: Date,
      amount: String,
      policyType: {
        type: String,
        enum: ['CANCELLATION', 'NO_SHOW'],
      },
    }],
    paymentType: {
      type: String,
      enum: ['guarantee', 'deposit', 'prepaid'],
    },
    refundable: {
      cancellationRefund: {
        type: String,
        enum: ['REFUNDABLE_UP_TO_DEADLINE', 'NON_REFUNDABLE', 'UNKNOWN'],
      },
    },
  },
  
  // ========== 预订状态 ==========
  
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'cancelled', 'failed'],
    default: 'pending',
    index: true,
  },
  
  // 状态变更历史（用于审计）
  statusHistory: [{
    status: {
      type: String,
      enum: ['pending', 'confirmed', 'cancelled', 'failed'],
    },
    changedAt: {
      type: Date,
      default: Date.now,
    },
    changedBy: {
      type: mongoose.Schema.ObjectId,
      ref: 'User',
    },
    reason: String,
  }],
  
  // ========== 取消信息 ==========
  
  cancellationReason: {
    type: String,
    trim: true,
  },
  
  cancelledAt: {
    type: Date,
    index: true,
  },
  
  cancelledBy: {
    type: mongoose.Schema.ObjectId,
    ref: 'User',
  },
  
  // ========== 其他信息 ==========
  
  // 特殊要求
  specialRequests: {
    type: String,
    trim: true,
  },
  
  // 备注
  notes: {
    type: String,
    trim: true,
  },
  
  // 确认信息（Amadeus返回）
  confirmation: {
    confirmationNumber: String,
    confirmationCode: String,
    confirmationUrl: String,
  },
  
  // 支付信息（如果已支付）
  payment: {
    method: String,
    transactionId: String,
    paidAt: Date,
    amount: String,
    currency: String,
  },
  
  // 同步状态（与 Amadeus 同步）
  syncStatus: {
    type: String,
    enum: ['synced', 'pending', 'failed'],
    default: 'synced',
  },
  
  lastSyncedAt: {
    type: Date,
  },
  
  syncError: {
    type: String,
  },
}, {
  timestamps: true,
});

// ========== 索引设计 ==========

// 基础查询索引
HotelBookingSchema.index({ travelId: 1, createdAt: -1 }); // 按差旅申请查询
HotelBookingSchema.index({ employee: 1, createdAt: -1 }); // 按员工查询
HotelBookingSchema.index({ status: 1, createdAt: -1 }); // 按状态查询

// 预订标识索引
HotelBookingSchema.index({ bookingReference: 1 }); // 按预订参考号查询
HotelBookingSchema.index({ amadeusBookingId: 1 }, { unique: true, sparse: true }); // Amadeus订单ID唯一

// 日期范围查询索引
HotelBookingSchema.index({ checkIn: 1, checkOut: 1 }); // 按入住日期查询
HotelBookingSchema.index({ checkIn: 1, status: 1 }); // 按入住日期和状态查询

// 酒店查询索引
HotelBookingSchema.index({ 'hotel.hotelId': 1, createdAt: -1 }); // 按酒店ID查询
HotelBookingSchema.index({ 'hotel.cityCode': 1, checkIn: 1 }); // 按城市和日期查询

// 价格查询索引
HotelBookingSchema.index({ priceAmount: 1 }); // 按价格排序
HotelBookingSchema.index({ 'price.currency': 1, priceAmount: 1 }); // 按货币和价格查询

// 复合索引（常用查询组合）
HotelBookingSchema.index({ employee: 1, status: 1, createdAt: -1 }); // 员工+状态+时间
HotelBookingSchema.index({ travelId: 1, status: 1 }); // 差旅申请+状态
HotelBookingSchema.index({ checkIn: 1, checkOut: 1, status: 1 }); // 日期范围+状态

module.exports = mongoose.model('HotelBooking', HotelBookingSchema);

