const mongoose = require('mongoose');

const LoginLogSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.ObjectId,
    ref: 'User',
    required: true 
  },
  email: {
    type: String,
    required: true
  },
  employeeId: {
    type: String
  },
  ipAddress: {
    type: String
  },
  userAgent: {
    type: String
  },
  status: {
    type: String,
    enum: ['success', 'failed'],
    required: true
  },
  failureReason: {
    type: String
  },
  loginTime: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Indexes for better query performance
LoginLogSchema.index({ userId: 1, loginTime: -1 });
LoginLogSchema.index({ email: 1, loginTime: -1 });
LoginLogSchema.index({ status: 1, loginTime: -1 });
LoginLogSchema.index({ loginTime: -1 });

module.exports = mongoose.model('LoginLog', LoginLogSchema);


