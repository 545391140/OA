const mongoose = require('mongoose');

const DepartmentSchema = new mongoose.Schema({
  code: {
    type: String,
    required: [true, 'Please add a department code'],
    unique: true,
    trim: true,
    uppercase: true
  },
  name: {
    type: String,
    required: [true, 'Please add a department name'],
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
  parent: {
    type: mongoose.Schema.ObjectId,
    ref: 'Department',
    default: null,
    comment: 'Parent department ID for hierarchical structure'
  },
  level: {
    type: Number,
    default: 0,
    min: 0,
    comment: 'Department level in hierarchy (0 = root level)'
  },
  path: {
    type: String,
    trim: true,
    comment: 'Full path from root to this department (e.g., "/1/2/3")'
  },
  manager: {
    type: mongoose.Schema.ObjectId,
    ref: 'User',
    comment: 'Department manager'
  },
  isActive: {
    type: Boolean,
    default: true
  },
  order: {
    type: Number,
    default: 0,
    comment: 'Display order'
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
DepartmentSchema.index({ code: 1 });
DepartmentSchema.index({ parent: 1 });
DepartmentSchema.index({ isActive: 1 });
DepartmentSchema.index({ level: 1 });
DepartmentSchema.index({ path: 1 });

// Virtual for children departments
DepartmentSchema.virtual('children', {
  ref: 'Department',
  localField: '_id',
  foreignField: 'parent'
});

// Method to get all descendant department IDs (including self)
DepartmentSchema.methods.getDescendantIds = async function() {
  const descendants = [this._id];
  
  const findChildren = async (parentId) => {
    // 明确设置 session 为 null，确保不使用任何事务上下文
    const children = await mongoose.model('Department').find({ parent: parentId, isActive: true })
      .session(null)
      .lean();
    for (const child of children) {
      descendants.push(child._id);
      await findChildren(child._id);
    }
  };
  
  await findChildren(this._id);
  return descendants;
};

// Static method to get all descendant department IDs for a given department
DepartmentSchema.statics.getDescendantIds = async function(departmentId) {
  // 明确设置 session 为 null，确保不使用任何事务上下文
  const department = await this.findById(departmentId)
    .session(null)
    .lean();
  if (!department) {
    return [departmentId];
  }
  // 创建一个临时对象来调用实例方法
  const tempDept = new this(department);
  return await tempDept.getDescendantIds();
};

module.exports = mongoose.model('Department', DepartmentSchema);




