const mongoose = require('mongoose');

const TravelMealStandardSchema = new mongoose.Schema({
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
  cityLevel: {
    type: Number,
    required: [true, 'Please add city level'],
    enum: [1, 2, 3, 4]
  },
  breakfastAmount: {
    type: Number,
    required: [true, 'Please add breakfast amount'],
    min: 0,
    default: 0
  },
  lunchAmount: {
    type: Number,
    required: [true, 'Please add lunch amount'],
    min: 0,
    default: 0
  },
  dinnerAmount: {
    type: Number,
    required: [true, 'Please add dinner amount'],
    min: 0,
    default: 0
  },
  dailyTotal: {
    type: Number,
    required: [true, 'Please add daily total'],
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
TravelMealStandardSchema.index({ standard: 1, jobLevelCode: 1, cityLevel: 1 });

module.exports = mongoose.model('TravelMealStandard', TravelMealStandardSchema);

