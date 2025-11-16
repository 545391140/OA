const mongoose = require('mongoose');

const InvoiceSchema = new mongoose.Schema({
  // 上传用户
  uploadedBy: {
    type: mongoose.Schema.ObjectId,
    ref: 'User',
    required: true
  },
  
  // 发票基本信息
  invoiceNumber: {
    type: String,
    trim: true,
    index: true
  },
  invoiceDate: {
    type: Date
  },
  invoiceType: {
    type: String,
    trim: true  // 如：电子发票(普通发票)
  },
  amount: {
    type: Number,
    min: 0
  },
  currency: {
    type: String,
    trim: true,
    default: 'CNY'
  },
  taxAmount: {
    type: Number,
    min: 0,
    default: 0
  },
  totalAmount: {
    type: Number,
    min: 0
  },
  
  // 商户信息（销售方）
  vendor: {
    name: {
      type: String,
      trim: true
    },
    taxId: {
      type: String,
      trim: true
    },
    address: {
      type: String,
      trim: true
    },
    phone: {
      type: String,
      trim: true
    }
  },

  // 购买方信息
  buyer: {
    name: {
      type: String,
      trim: true
    },
    taxId: {
      type: String,
      trim: true
    },
    address: {
      type: String,
      trim: true
    },
    phone: {
      type: String,
      trim: true
    }
  },

  // 发票项目明细
  items: [{
    name: {
      type: String,
      trim: true
    },
    unitPrice: {
      type: Number,
      min: 0
    },
    quantity: {
      type: Number,
      min: 0,
      default: 1
    },
    amount: {
      type: Number,
      min: 0
    },
    taxRate: {
      type: String,
      trim: true  // 如 "3%", "13%"
    },
    taxAmount: {
      type: Number,
      min: 0
    }
  }],

  // 开票人
  issuer: {
    type: String,
    trim: true
  },

  // 出行人信息（适用于交通类发票）
  traveler: {
    name: {
      type: String,
      trim: true
    },
    idNumber: {
      type: String,
      trim: true
    },
    travelDate: {
      type: Date
    },
    departure: {
      type: String,
      trim: true
    },
    destination: {
      type: String,
      trim: true
    },
    class: {
      type: String,
      trim: true  // 如 "经济舱", "商务舱"
    },
    vehicleType: {
      type: String,
      trim: true  // 如 "高铁", "飞机"
    }
  },

  // 价税合计（大写）
  totalAmountInWords: {
    type: String,
    trim: true
  },
  
  // 文件信息
  file: {
    filename: {
      type: String,
      required: true
    },
    originalName: {
      type: String,
      required: true
    },
    path: {
      type: String,
      required: true
    },
    size: {
      type: Number,
      required: true
    },
    mimeType: {
      type: String,
      required: true
    },
    uploadedAt: {
      type: Date,
      default: Date.now
    }
  },
  
  // OCR识别数据（如果使用OCR）
  ocrData: {
    extracted: {
      type: Boolean,
      default: false
    },
    confidence: {
      type: Number,
      min: 0,
      max: 100
    },
    rawData: {
      type: mongoose.Schema.Types.Mixed
    },
    extractedAt: {
      type: Date
    }
  },
  
  // 分类和标签
  category: {
    type: String,
    enum: [
      'transportation',
      'accommodation',
      'meals',
      'entertainment',
      'communication',
      'office_supplies',
      'training',
      'other'
    ],
    default: 'other'
  },
  tags: [{
    type: String,
    trim: true
  }],
  
  // 关联信息
  relatedExpense: {
    type: mongoose.Schema.ObjectId,
    ref: 'Expense'
  },
  relatedTravel: {
    type: mongoose.Schema.ObjectId,
    ref: 'Travel'
  },
  
  // 状态
  status: {
    type: String,
    enum: ['pending', 'verified', 'linked', 'archived'],
    default: 'pending'
  },
  
  // 备注
  notes: {
    type: String,
    trim: true
  },
  
  // 审核信息
  verifiedBy: {
    type: mongoose.Schema.ObjectId,
    ref: 'User'
  },
  verifiedAt: {
    type: Date
  }
}, {
  timestamps: true
});

// 索引优化
InvoiceSchema.index({ uploadedBy: 1, status: 1 });
InvoiceSchema.index({ invoiceDate: -1 });
InvoiceSchema.index({ category: 1 });
InvoiceSchema.index({ status: 1 });
InvoiceSchema.index({ relatedExpense: 1 });
InvoiceSchema.index({ relatedTravel: 1 });
InvoiceSchema.index({ invoiceNumber: 1 });
InvoiceSchema.index({ 'vendor.name': 'text', notes: 'text' }); // 全文搜索

module.exports = mongoose.model('Invoice', InvoiceSchema);

