const mongoose = require('mongoose');

const TravelAllowanceStandardSchema = new mongoose.Schema({
  standard: {
    type: mongoose.Schema.ObjectId,
    ref: 'TravelStandard',
    required: true
  },
  allowanceType: {
    type: String,
    required: [true, 'Please add allowance type'],
    trim: true // 如：通讯补贴、市内交通、其他补贴
  },
  jobLevelCode: {
    type: String,
    required: [true, 'Please add job level code'],
    trim: true
  },
  amountType: {
    type: String,
    required: [true, 'Please add amount type'],
    enum: ['daily', 'per_trip', 'fixed'], // 按天、按次、固定金额
    default: 'daily'
  },
  amount: {
    type: Number,
    required: [true, 'Please add amount'],
    min: 0
  },
  remark: {
    type: String,
    trim: true
  }
}, {
  timestamps: true
});

// Index for better query performance
TravelAllowanceStandardSchema.index({ standard: 1, jobLevelCode: 1 });
TravelAllowanceStandardSchema.index({ allowanceType: 1 });

module.exports = mongoose.model('TravelAllowanceStandard', TravelAllowanceStandardSchema);

