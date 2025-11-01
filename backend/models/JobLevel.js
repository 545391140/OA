const mongoose = require('mongoose');

const JobLevelSchema = new mongoose.Schema({
  levelCode: {
    type: String,
    required: [true, 'Please add a level code'],
    unique: true,
    trim: true,
    uppercase: true
  },
  levelName: {
    type: String,
    required: [true, 'Please add a level name'],
    trim: true
  },
  levelOrder: {
    type: Number,
    required: [true, 'Please add level order'],
    default: 0
  },
  status: {
    type: String,
    enum: ['active', 'inactive'],
    default: 'active'
  },
  description: {
    type: String,
    trim: true
  }
}, {
  timestamps: true
});

// Index for better query performance
JobLevelSchema.index({ levelOrder: 1 });
JobLevelSchema.index({ status: 1 });

module.exports = mongoose.model('JobLevel', JobLevelSchema);

