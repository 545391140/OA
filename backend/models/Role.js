const mongoose = require('mongoose');

const RoleSchema = new mongoose.Schema({
  code: {
    type: String,
    required: [true, 'Please add a role code'],
    unique: true,
    trim: true,
    uppercase: true,
    match: [/^[A-Z0-9_]+$/, 'Role code must contain only uppercase letters, numbers, and underscores']
  },
  name: {
    type: String,
    required: [true, 'Please add a role name'],
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
  permissions: [{
    type: String,
    trim: true
  }],
  level: {
    type: Number,
    default: 0,
    min: 0,
    max: 100,
    comment: 'Role level for hierarchy (higher number = higher authority)'
  },
  // 数据权限范围
  dataScope: {
    type: String,
    enum: ['self', 'all', 'department', 'subDepartment'],
    default: 'self',
    comment: 'Data access scope: self (本人数据), all (全部数据), department (本部门数据), subDepartment (本部门及下属部门数据)'
  },
  isSystem: {
    type: Boolean,
    default: false,
    comment: 'System roles cannot be deleted'
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
RoleSchema.index({ code: 1 });
RoleSchema.index({ isActive: 1 });
RoleSchema.index({ level: -1 });

// Note: Deletion checks are handled in the route handler
// This is because Mongoose's pre('remove') hook may not work with all delete methods

// Prevent disabling system roles
RoleSchema.pre('save', function(next) {
  if (this.isSystem && this.isModified('isActive') && !this.isActive) {
    next(new Error('Cannot disable system role'));
  } else {
    next();
  }
});

module.exports = mongoose.model('Role', RoleSchema);

