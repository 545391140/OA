const express = require('express');
const { protect, authorize } = require('../middleware/auth');
const Department = require('../models/Department');
const User = require('../models/User');
const { clearDepartmentUserCache } = require('../utils/dataScope');

const router = express.Router();

// @desc    Get all departments
// @route   GET /api/departments
// @access  Private
router.get('/', protect, async (req, res) => {
  try {
    const { isActive, parent, level } = req.query;
    
    const query = {};
    if (isActive !== undefined) {
      query.isActive = isActive === 'true';
    }
    if (parent) {
      if (parent === 'null' || parent === 'root') {
        query.parent = null;
      } else {
        query.parent = parent;
      }
    }
    if (level !== undefined) {
      query.level = parseInt(level);
    }

    const departments = await Department.find(query)
      .populate('parent', 'code name')
      .populate('manager', 'firstName lastName email')
      .populate('createdBy', 'firstName lastName')
      .populate('updatedBy', 'firstName lastName')
      .sort({ level: 1, order: 1, name: 1 });

    res.json({
      success: true,
      count: departments.length,
      data: departments
    });
  } catch (error) {
    console.error('Get departments error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Server error'
    });
  }
});

// @desc    Get single department
// @route   GET /api/departments/:id
// @access  Private
router.get('/:id', protect, async (req, res) => {
  try {
    const department = await Department.findById(req.params.id)
      .populate('parent', 'code name')
      .populate('manager', 'firstName lastName email')
      .populate('children', 'code name level');

    if (!department) {
      return res.status(404).json({
        success: false,
        message: 'Department not found'
      });
    }

    res.json({
      success: true,
      data: department
    });
  } catch (error) {
    console.error('Get department error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Server error'
    });
  }
});

// @desc    Create new department
// @route   POST /api/departments
// @access  Private (Admin only)
router.post('/', protect, authorize('admin'), async (req, res) => {
  try {
    const { code, name, nameEn, description, parent, manager, order } = req.body;

    // 检查代码是否已存在
    const existingDept = await Department.findOne({ code: code.toUpperCase() });
    if (existingDept) {
      return res.status(400).json({
        success: false,
        message: 'Department code already exists'
      });
    }

    // 计算层级和路径
    let level = 0;
    let path = '';
    
    if (parent) {
      const parentDept = await Department.findById(parent);
      if (!parentDept) {
        return res.status(400).json({
          success: false,
          message: 'Parent department not found'
        });
      }
      level = parentDept.level + 1;
      path = parentDept.path ? `${parentDept.path}/${parentDept._id}` : `/${parentDept._id}`;
    } else {
      path = '/';
    }

    const department = await Department.create({
      code: code.toUpperCase(),
      name,
      nameEn,
      description,
      parent: parent || null,
      level,
      path,
      manager: manager || null,
      order: order || 0,
      createdBy: req.user.id
    });

    // 清除部门用户缓存（新部门创建不影响现有用户，但为了一致性清除）
    // 注意：新部门创建时通常还没有用户，但清除缓存可以确保一致性

    res.status(201).json({
      success: true,
      data: department
    });
  } catch (error) {
    console.error('Create department error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Server error'
    });
  }
});

// @desc    Update department
// @route   PUT /api/departments/:id
// @access  Private (Admin only)
router.put('/:id', protect, authorize('admin'), async (req, res) => {
  try {
    const department = await Department.findById(req.params.id);

    if (!department) {
      return res.status(404).json({
        success: false,
        message: 'Department not found'
      });
    }

    const { name, nameEn, description, parent, manager, order, isActive } = req.body;

    // 如果更新了parent，需要重新计算层级和路径
    if (parent !== undefined && parent !== department.parent?.toString()) {
      let level = 0;
      let path = '';
      
      if (parent && parent !== 'null') {
        const parentDept = await Department.findById(parent);
        if (!parentDept) {
          return res.status(400).json({
            success: false,
            message: 'Parent department not found'
          });
        }
        // 检查是否会造成循环引用
        if (parentDept.path && parentDept.path.includes(department._id.toString())) {
          return res.status(400).json({
            success: false,
            message: 'Cannot set parent to a child department (circular reference)'
          });
        }
        level = parentDept.level + 1;
        path = parentDept.path ? `${parentDept.path}/${parentDept._id}` : `/${parentDept._id}`;
      } else {
        level = 0;
        path = '/';
      }

      department.level = level;
      department.path = path;
      department.parent = parent && parent !== 'null' ? parent : null;

      // 更新所有子部门的层级和路径
      await updateChildrenLevelsAndPaths(department._id, level, path);
    }

    // 更新其他字段
    if (name !== undefined) department.name = name;
    if (nameEn !== undefined) department.nameEn = nameEn;
    if (description !== undefined) department.description = description;
    if (manager !== undefined) department.manager = manager || null;
    if (order !== undefined) department.order = order;
    if (isActive !== undefined) department.isActive = isActive;
    department.updatedBy = req.user.id;

    await department.save();

    // 清除部门用户缓存（部门信息更新可能影响用户列表）
    // 如果 isActive 状态改变，需要清除缓存
    if (isActive !== undefined && isActive !== department.isActive) {
      clearDepartmentUserCache(department.code);
    }
    // 如果部门代码改变，清除旧代码的缓存
    // 注意：当前实现不允许更改部门代码，但为了一致性保留此逻辑

    res.json({
      success: true,
      data: department
    });
  } catch (error) {
    console.error('Update department error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Server error'
    });
  }
});

// @desc    Delete department
// @route   DELETE /api/departments/:id
// @access  Private (Admin only)
router.delete('/:id', protect, authorize('admin'), async (req, res) => {
  try {
    const department = await Department.findById(req.params.id);

    if (!department) {
      return res.status(404).json({
        success: false,
        message: 'Department not found'
      });
    }

    // 检查是否有子部门
    const children = await Department.find({ parent: department._id });
    if (children.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete department with child departments'
      });
    }

    // 检查是否有员工关联
    const users = await User.find({ department: department.code });
    if (users.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete department with associated users'
      });
    }

    await Department.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: 'Department deleted successfully'
    });
  } catch (error) {
    console.error('Delete department error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Server error'
    });
  }
});

// 递归更新子部门的层级和路径
async function updateChildrenLevelsAndPaths(parentId, parentLevel, parentPath) {
  const children = await Department.find({ parent: parentId });
  
  for (const child of children) {
    const newLevel = parentLevel + 1;
    const newPath = parentPath === '/' ? `/${parentId}` : `${parentPath}/${parentId}`;
    
    child.level = newLevel;
    child.path = newPath;
    await child.save();
    
    // 递归更新子部门的子部门
    await updateChildrenLevelsAndPaths(child._id, newLevel, newPath);
  }
}

module.exports = router;

