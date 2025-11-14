const mongoose = require('mongoose');

const TravelAccommodationStandardSchema = new mongoose.Schema({
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
  maxAmountPerNight: {
    type: Number,
    required: [true, 'Please add max amount per night'],
    min: 0
  },
  starLevel: {
    type: String,
    trim: true // 如：四星级及以下、五星级等
  },
  remark: {
    type: String,
    trim: true
  }
}, {
  timestamps: true
});

// Index for better query performance
TravelAccommodationStandardSchema.index({ standard: 1, jobLevelCode: 1, cityLevel: 1 });

module.exports = mongoose.model('TravelAccommodationStandard', TravelAccommodationStandardSchema);

