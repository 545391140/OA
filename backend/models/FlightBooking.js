const mongoose = require('mongoose');

const FlightBookingSchema = new mongoose.Schema({
  // 关联的差旅申请ID（必填）
  travelId: {
    type: mongoose.Schema.ObjectId,
    ref: 'Travel',
    required: [true, '差旅申请ID必填：机票预订必须关联差旅申请'],
    index: true,
  },
  // 预订员工ID
  employee: {
    type: mongoose.Schema.ObjectId,
    ref: 'User',
    required: [true, '预订员工ID必填'],
    index: true,
  },
  // 预订参考号（Amadeus返回）
  bookingReference: {
    type: String,
    trim: true,
    index: true,
  },
  // Amadeus 订单ID
  amadeusOrderId: {
    type: String,
    trim: true,
  },
  // 航班报价信息（完整对象，存储 Amadeus API 返回的完整数据）
  flightOffer: {
    type: mongoose.Schema.Types.Mixed,
    required: true,
  },
  // 乘客信息
  travelers: [{
    id: {
      type: String,
      required: true,
    },
    dateOfBirth: {
      type: String, // YYYY-MM-DD 格式
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
        countryCallingCode: {
          type: String,
          trim: true,
        },
        number: {
          type: String,
          trim: true,
        },
      }],
    },
  }],
  // 预订状态
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'cancelled', 'failed'],
    default: 'pending',
  },
  // 价格信息
  price: {
    total: {
      type: String,
      required: true,
    },
    currency: {
      type: String,
      default: 'USD',
    },
    base: {
      type: String,
    },
    fees: [{
      amount: {
        type: String,
        default: '0.00',
      },
      type: {
        type: String,
        default: 'UNKNOWN',
      },
    }],
  },
  // 取消原因
  cancellationReason: {
    type: String,
    trim: true,
  },
  // 取消时间
  cancelledAt: {
    type: Date,
  },
  // 备注
  notes: {
    type: String,
    trim: true,
  },
}, {
  timestamps: true,
});

// 索引
FlightBookingSchema.index({ travelId: 1, createdAt: -1 });
FlightBookingSchema.index({ employee: 1, createdAt: -1 });
FlightBookingSchema.index({ status: 1 });
FlightBookingSchema.index({ amadeusOrderId: 1 }, { unique: true, sparse: true });

module.exports = mongoose.model('FlightBooking', FlightBookingSchema);

