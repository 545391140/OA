const mongoose = require('mongoose');

const ExpenseSchema = new mongoose.Schema({
  employee: {
    type: mongoose.Schema.ObjectId,
    ref: 'User',
    required: true
  },
  travel: {
    type: mongoose.Schema.ObjectId,
    ref: 'Travel'
  },
  title: {
    type: String,
    required: [true, 'Please add an expense title'],
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  category: {
    type: String,
    required: true,
    enum: [
      'transportation',
      'accommodation',
      'meals',
      'entertainment',
      'communication',
      'office_supplies',
      'training',
      'other'
    ]
  },
  subcategory: {
    type: String,
    trim: true
  },
  amount: {
    type: Number,
    required: [true, 'Please add an amount'],
    min: 0
  },
  currency: {
    type: String,
    default: 'USD',
    enum: ['USD', 'CNY', 'JPY', 'KRW', 'EUR']
  },
  exchangeRate: {
    type: Number,
    default: 1
  },
  localAmount: {
    type: Number
  },
  localCurrency: {
    type: String
  },
  date: {
    type: Date,
    required: true
  },
  status: {
    type: String,
    enum: ['draft', 'submitted', 'approved', 'rejected', 'paid', 'cancelled'],
    default: 'draft'
  },
  vendor: {
    name: {
      type: String,
      trim: true
    },
    address: {
      type: String,
      trim: true
    },
    taxId: {
      type: String,
      trim: true
    }
  },
  receipts: [{
    filename: String,
    originalName: String,
    path: String,
    size: Number,
    mimeType: String,
    uploadedAt: {
      type: Date,
      default: Date.now
    },
    ocrData: {
      type: mongoose.Schema.Types.Mixed
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
  payment: {
    method: {
      type: String,
      enum: ['cash', 'credit_card', 'bank_transfer', 'company_card']
    },
    reference: {
      type: String,
      trim: true
    },
    paidAt: {
      type: Date
    },
    paidBy: {
      type: mongoose.Schema.ObjectId,
      ref: 'User'
    }
  },
  project: {
    type: mongoose.Schema.ObjectId,
    ref: 'Project'
  },
  costCenter: {
    type: String,
    trim: true
  },
  isBillable: {
    type: Boolean,
    default: false
  },
  client: {
    type: String,
    trim: true
  },
  notes: {
    type: String,
    trim: true
  },
  tags: [{
    type: String,
    trim: true
  }]
}, {
  timestamps: true
});

// Index for better query performance
ExpenseSchema.index({ employee: 1, status: 1 });
ExpenseSchema.index({ date: -1 });
ExpenseSchema.index({ category: 1 });
ExpenseSchema.index({ 'approvals.approver': 1, 'approvals.status': 1 });

// Calculate local amount before saving
ExpenseSchema.pre('save', function(next) {
  if (this.localAmount && this.exchangeRate) {
    this.localAmount = this.amount * this.exchangeRate;
  }
  next();
});

module.exports = mongoose.model('Expense', ExpenseSchema);
