const mongoose = require('mongoose');

const TravelSchema = new mongoose.Schema({
  employee: {
    type: mongoose.Schema.ObjectId,
    ref: 'User',
    required: true
  },
  title: {
    type: String,
    required: [true, 'Please add a travel title'],
    trim: true
  },
  purpose: {
    type: String,
    required: [true, 'Please add travel purpose'],
    trim: true
  },
  destination: {
    country: {
      type: String,
      required: true,
      trim: true
    },
    city: {
      type: String,
      required: true,
      trim: true
    },
    address: {
      type: String,
      trim: true
    }
  },
  dates: {
    departure: {
      type: Date,
      required: true
    },
    return: {
      type: Date,
      required: true
    }
  },
  estimatedCost: {
    type: Number,
    required: true,
    min: 0
  },
  currency: {
    type: String,
    default: 'USD',
    enum: ['USD', 'RMB', 'CNY', 'JPY', 'KRW', 'EUR']
  },
  status: {
    type: String,
    enum: ['draft', 'submitted', 'approved', 'rejected', 'in-progress', 'completed', 'cancelled'],
    default: 'draft'
  },
  bookings: [{
    type: {
      type: String,
      enum: ['flight', 'hotel', 'car', 'train', 'other'],
      required: true
    },
    provider: {
      type: String,
      required: true,
      trim: true
    },
    bookingReference: {
      type: String,
      trim: true
    },
    cost: {
      type: Number,
      required: true,
      min: 0
    },
    currency: {
      type: String,
      default: 'USD'
    },
    details: {
      type: mongoose.Schema.Types.Mixed
    },
    status: {
      type: String,
      enum: ['pending', 'confirmed', 'cancelled'],
      default: 'pending'
    }
  }],
  approvals: [{
    approver: {
      type: mongoose.Schema.ObjectId,
      ref: 'User',
      required: true
    },
    level: {
      type: Number,
      required: true
    },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending'
    },
    comments: {
      type: String,
      trim: true
    },
    approvedAt: {
      type: Date
    }
  }],
  actualCost: {
    type: Number,
    default: 0
  },
  notes: {
    type: String,
    trim: true
  },
  attachments: [{
    filename: String,
    originalName: String,
    path: String,
    size: Number,
    mimeType: String,
    uploadedAt: {
      type: Date,
      default: Date.now
    }
  }]
}, {
  timestamps: true
});

// Index for better query performance
TravelSchema.index({ employee: 1, status: 1 });
TravelSchema.index({ 'approvals.approver': 1, 'approvals.status': 1 });

module.exports = mongoose.model('Travel', TravelSchema);
