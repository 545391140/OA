const mongoose = require('mongoose');

const TravelStandardSchema = new mongoose.Schema({
  standardCode: {
    type: String,
    required: [true, 'Please add a standard code'],
    unique: true,
    trim: true,
    uppercase: true
  },
  standardName: {
    type: String,
    required: [true, 'Please add a standard name'],
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  effectiveDate: {
    type: Date,
    required: [true, 'Please add effective date']
  },
  expiryDate: {
    type: Date
  },
  status: {
    type: String,
    enum: ['draft', 'active', 'expired'],
    default: 'draft'
  },
  version: {
    type: Number,
    default: 1
  },
  // 优先级（数值越大优先级越高，用于匹配时的优先级排序）
  priority: {
    type: Number,
    default: 50,
    min: 0,
    max: 100
  },
  // 适用条件组（支持OR逻辑：组之间是OR，组内条件间是AND）
  conditionGroups: [{
    groupId: {
      type: Number,
      required: true
    },
    logicOperator: {
      type: String,
      enum: ['AND', 'OR'],
      default: 'AND'
    },
    conditions: [{
      type: {
        type: String,
        enum: ['country', 'city', 'city_level', 'position_level', 'role', 'position', 'department', 'project_code'],
        required: true
      },
      operator: {
        type: String,
        enum: ['IN', 'NOT_IN', 'EQUAL', '>=', '<='],
        required: true
      },
      value: {
        type: String,
        required: true
      },
      // 存储关联的 Location ID（用于 city 和 country 类型，解决名称变更后匹配失效的问题）
      locationIds: [{
        type: mongoose.Schema.ObjectId,
        ref: 'Location'
      }]
    }]
  }],
  // 覆盖人群配置（保留兼容性）
  targetAudience: {
    // 适用的职级列表（为空表示所有职级）
    jobLevels: [{
      type: String,
      trim: true
    }],
    // 适用的部门列表（为空表示所有部门）
    departments: [{
      type: String,
      trim: true
    }],
    // 适用的员工类型（为空表示所有类型）
    employeeTypes: [{
      type: String,
      enum: ['fulltime', 'parttime', 'contract', 'intern', 'all'],
      default: 'all'
    }]
  },
  // 适用的城市级别（为空表示所有城市级别）
  applicableCityLevels: [{
    type: Number,
    enum: [1, 2, 3, 4]
  }],
  // 适用的城市列表（可选，为空表示适用所有城市）
  applicableCities: [{
    cityCode: {
      type: String,
      trim: true
    },
    cityName: {
      type: String,
      trim: true
    }
  }],
  // 费用项目配置标识（是否已配置各项费用标准）
  // 改为动态对象：key为费用项ID（字符串），value为是否已配置（Boolean）
  expenseItemsConfigured: {
    type: Object,
    default: {}
    // 格式：{ "费用项ID": true/false, ... }
    // 例如：{ "6905c4099527232c153dace1": true, "6905c4099527232c153dace2": false }
  },
  // 费用标准详细配置（对应费用项的详细限额配置）
  expenseStandards: [{
    expenseItemId: {
      type: mongoose.Schema.ObjectId,
      ref: 'ExpenseItem',
      required: true
    },
    limitType: {
      type: String,
      enum: ['FIXED', 'RANGE', 'ACTUAL', 'PERCENTAGE'],
      required: true
    },
    limitAmount: {
      type: Number,
      min: 0
    },
    limitMin: {
      type: Number,
      min: 0
    },
    limitMax: {
      type: Number,
      min: 0
    },
    calcUnit: {
      type: String,
      enum: ['PER_DAY', 'PER_TRIP', 'PER_KM'],
      default: 'PER_DAY'
    },
    percentage: {
      type: Number,
      min: 0,
      max: 100
    },
    baseAmount: {
      type: Number,
      min: 0
    }
  }],
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

// Index for better query performance
TravelStandardSchema.index({ effectiveDate: 1, expiryDate: 1 });
TravelStandardSchema.index({ status: 1 });
TravelStandardSchema.index({ priority: -1 }); // For matching queries, higher priority first
TravelStandardSchema.index({ 'targetAudience.jobLevels': 1 });
TravelStandardSchema.index({ 'targetAudience.departments': 1 });
TravelStandardSchema.index({ applicableCityLevels: 1 });
TravelStandardSchema.index({ 'conditionGroups.groupId': 1 }); // For condition matching

module.exports = mongoose.model('TravelStandard', TravelStandardSchema);

