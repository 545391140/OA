const mongoose = require('mongoose');

const TravelTransportStandardSchema = new mongoose.Schema({
  standard: {
    type: mongoose.Schema.ObjectId,
    ref: 'TravelStandard',
    required: true
  },
  jobLevelCode: {
    type: String,
    required: [true, 'Please add job level code'],
    trim: true
  },
  transportType: {
    type: String,
    required: [true, 'Please add transport type'],
    enum: ['flight', 'train', 'bus', 'car', 'other'],
    trim: true
  },
  seatClass: {
    type: String,
    required: true,
    trim: true // 如：经济舱、商务舱、一等座、二等座等
  },
  maxAmount: {
    type: Number,
    required: [true, 'Please add max amount'],
    min: 0
  },
  cityLevel: {
    type: Number,
    enum: [1, 2, 3, 4] // 可为空，表示不限城市级别
  },
  distanceRange: {
    type: String,
    trim: true // 如：">1000km", "<500km", "全部"
  },
  remark: {
    type: String,
    trim: true
  }
}, {
  timestamps: true
});

// Index for better query performance
TravelTransportStandardSchema.index({ standard: 1, jobLevelCode: 1 });
TravelTransportStandardSchema.index({ transportType: 1 });

module.exports = mongoose.model('TravelTransportStandard', TravelTransportStandardSchema);

