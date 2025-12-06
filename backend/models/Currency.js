const mongoose = require('mongoose');

const CurrencySchema = new mongoose.Schema({
  code: {
    type: String,
    required: [true, 'Please add a currency code'],
    trim: true,
    uppercase: true
  },
  name: {
    type: String,
    required: [true, 'Please add a currency name'],
    trim: true
  },
  nameEn: {
    type: String,
    trim: true
  },
  symbol: {
    type: String,
    trim: true
  },
  exchangeRate: {
    type: Number,
    required: [true, 'Please add an exchange rate'],
    min: 0,
    default: 1.0
  },
  // 汇率相对于CNY（人民币），CNY的汇率为1.0
  // 例如：USD的汇率如果是0.14，表示1 CNY = 0.14 USD
  isActive: {
    type: Boolean,
    default: true
  },
  isDefault: {
    type: Boolean,
    default: false
  },
  decimalPlaces: {
    type: Number,
    default: 2,
    min: 0,
    max: 4
  },
  displayOrder: {
    type: Number,
    default: 0
  },
  remark: {
    type: String,
    trim: true
  }
}, {
  timestamps: true
});

// Index for better query performance
CurrencySchema.index({ code: 1 }, { unique: true });
CurrencySchema.index({ isActive: 1 });
CurrencySchema.index({ isDefault: 1 });

// 确保只有一个默认币种
CurrencySchema.pre('save', async function(next) {
  if (this.isDefault && this.isModified('isDefault')) {
    // 将其他币种的isDefault设置为false
    await mongoose.model('Currency').updateMany(
      { _id: { $ne: this._id } },
      { $set: { isDefault: false } }
    );
  }
  next();
});

module.exports = mongoose.model('Currency', CurrencySchema);

