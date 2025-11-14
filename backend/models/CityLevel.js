const mongoose = require('mongoose');

const CityLevelSchema = new mongoose.Schema({
  cityCode: {
    type: String,
    required: [true, 'Please add a city code'],
    trim: true,
    uppercase: true
  },
  cityName: {
    type: String,
    required: [true, 'Please add a city name'],
    trim: true
  },
  province: {
    type: String,
    trim: true
  },
  country: {
    type: String,
    default: 'China',
    trim: true
  },
  level: {
    type: Number,
    required: [true, 'Please add city level'],
    enum: [1, 2, 3, 4], // 1: 一线城市, 2: 二线城市, 3: 三线城市, 4: 其他
    default: 4
  },
  remark: {
    type: String,
    trim: true
  }
}, {
  timestamps: true
});

// Index for better query performance
CityLevelSchema.index({ cityCode: 1 }, { unique: true });
CityLevelSchema.index({ level: 1 });

module.exports = mongoose.model('CityLevel', CityLevelSchema);

