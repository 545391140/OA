const mongoose = require('mongoose');

const PositionSchema = new mongoose.Schema({
  code: {
    type: String,
    required: [true, 'Please add a position code'],
    unique: true,
    trim: true,
    uppercase: true,
    match: [/^[A-Z0-9_]+$/, 'Position code must contain only uppercase letters, numbers, and underscores']
  },
  name: {
    type: String,
    required: [true, 'Please add a position name'],
    trim: true
  },
  nameEn: {
    type: String,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  department: {
    type: String,
    trim: true,
    comment: 'Default department for this position'
  },
  jobLevel: {
    type: String,
    trim: true,
    comment: 'Job level associated with this position'
  },
  minSalary: {
    type: Number,
    min: 0
  },
  maxSalary: {
    type: Number,
    min: 0
  },
  requirements: {
    education: {
      type: String,
      trim: true
    },
    experience: {
      type: String,
      trim: true
    },
    skills: [{
      type: String,
      trim: true
    }]
  },
  responsibilities: [{
    type: String,
    trim: true
  }],
  isSystem: {
    type: Boolean,
    default: false,
    comment: 'System positions cannot be deleted'
  },
  isActive: {
    type: Boolean,
    default: true
  },
  createdBy: {
    type: mongoose.Schema.ObjectId,
    ref: 'User'
  },
  updatedBy: {
    type: mongoose.Schema.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

// Indexes
PositionSchema.index({ code: 1 });
PositionSchema.index({ isActive: 1 });
PositionSchema.index({ department: 1 });
PositionSchema.index({ jobLevel: 1 });

// Note: Deletion checks are handled in the route handler
// This is because Mongoose's pre('remove') hook may not work with all delete methods

// Prevent disabling system positions
PositionSchema.pre('save', function(next) {
  if (this.isSystem && this.isModified('isActive') && !this.isActive) {
    next(new Error('Cannot disable system position'));
  } else {
    next();
  }
});

module.exports = mongoose.model('Position', PositionSchema);

