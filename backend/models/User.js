const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const UserSchema = new mongoose.Schema({
  employeeId: {
    type: String,
    required: [true, 'Please add an employee ID'],
    unique: true,
    trim: true
  },
  firstName: {
    type: String,
    required: [true, 'Please add a first name'],
    trim: true
  },
  lastName: {
    type: String,
    required: [true, 'Please add a last name'],
    trim: true
  },
  email: {
    type: String,
    required: [true, 'Please add an email'],
    unique: true,
    lowercase: true,
    match: [
      /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
      'Please add a valid email'
    ]
  },
  password: {
    type: String,
    required: [true, 'Please add a password'],
    minlength: 6,
    select: false
  },
  role: {
    type: String,
    required: [true, 'Please add a role'],
    trim: true,
    comment: 'References Role.code - stores the role code as a string'
  },
  department: {
    type: String,
    required: [true, 'Please add a department'],
    trim: true
  },
  position: {
    type: String,
    required: [true, 'Please add a position'],
    trim: true,
    comment: 'References Position.code - stores the position code as a string'
  },
  jobLevel: {
    type: String,
    trim: true
  },
  manager: {
    type: mongoose.Schema.ObjectId,
    ref: 'User'
  },
  phone: {
    type: String,
    trim: true
  },
  residenceCountry: {
    type: mongoose.Schema.Types.Mixed, // 可以是字符串或Location ObjectId
    default: null,
    comment: '常驻国家，引用Location表'
  },
  residenceCity: {
    type: mongoose.Schema.Types.Mixed, // 可以是字符串或Location ObjectId
    default: null,
    comment: '常驻城市，引用Location表'
  },
  avatar: {
    type: String,
    default: ''
  },
  isActive: {
    type: Boolean,
    default: true
  },
  lastLogin: {
    type: Date
  },
  preferences: {
    language: {
      type: String,
      default: 'en',
      enum: ['en', 'zh', 'ja', 'ko']
    },
    currency: {
      type: String,
      default: 'USD'
      // 移除 enum 限制，允许使用数据库中的任何活跃币种
      // 验证在路由层进行，从数据库获取活跃币种列表
    },
    timezone: {
      type: String,
      default: 'UTC'
    }
  },
  // Web Push订阅信息
  pushSubscription: {
    type: mongoose.Schema.Types.Mixed
  }
}, {
  timestamps: true
});

// Encrypt password using bcrypt
UserSchema.pre('save', async function(next) {
  if (!this.isModified('password')) {
    next();
  }

  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

// Match user entered password to hashed password in database
UserSchema.methods.matchPassword = async function(enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// Get full name
UserSchema.virtual('fullName').get(function() {
  return `${this.firstName} ${this.lastName}`;
});

// Index for better query performance
UserSchema.index({ department: 1, isActive: 1 }); // 复合索引：用于数据权限查询（buildDataScopeQuery）

module.exports = mongoose.model('User', UserSchema);
