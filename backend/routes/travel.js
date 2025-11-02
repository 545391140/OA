
const express = require('express');
const { protect } = require('../middleware/auth');
const Travel = require('../models/Travel');

const router = express.Router();

// 生成差旅单号
const generateTravelNumber = async () => {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  const datePrefix = `TR-${year}${month}${day}`;
  
  // 查找今天最大的序号
  const todayTravels = await Travel.find({
    travelNumber: { $regex: `^${datePrefix}` }
  }).sort({ travelNumber: -1 }).limit(1);
  
  let sequence = 1;
  if (todayTravels.length > 0 && todayTravels[0].travelNumber) {
    const lastNumber = todayTravels[0].travelNumber;
    const parts = lastNumber.split('-');
    if (parts.length === 3) {
      const lastSequence = parseInt(parts[2] || '0');
      sequence = lastSequence + 1;
    }
  }
  
  // 生成4位序号
  const sequenceStr = String(sequence).padStart(4, '0');
  return `${datePrefix}-${sequenceStr}`;
};

// @desc    Get all travel requests
// @route   GET /api/travel
// @access  Private
router.get('/', protect, async (req, res) => {
  try {
    const travels = await Travel.find({ employee: req.user.id })
      .populate('employee', 'firstName lastName email')
      .populate('approvals.approver', 'firstName lastName email')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      count: travels.length,
      data: travels
    });
  } catch (error) {
    console.error('Get travels error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @desc    Get single travel request
// @route   GET /api/travel/:id
// @access  Private
router.get('/:id', protect, async (req, res) => {
  try {
    // 验证ID格式
    const mongoose = require('mongoose');
    if (!req.params.id || !mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid travel ID format'
      });
    }

    const travel = await Travel.findById(req.params.id)
      .populate('employee', 'firstName lastName email')
      .populate('approvals.approver', 'firstName lastName email');

    if (!travel) {
      return res.status(404).json({
        success: false,
        message: 'Travel request not found'
      });
    }

    // 权限检查：只能查看自己的申请或管理员
    // 如果是管理员，允许访问所有申请（包括employee为null的情况）
    if (req.user.role === 'admin') {
      return res.json({
        success: true,
        data: travel
      });
    }
    
    let employeeId;
    if (!travel.employee) {
      // 如果没有employee字段，在开发模式下允许访问，否则返回错误
      const isDevMode = !process.env.NODE_ENV || process.env.NODE_ENV === 'development';
      if (isDevMode) {
        console.warn('Travel request missing employee field, allowing access in dev mode:', req.params.id);
        return res.json({
          success: true,
          data: travel
        });
      } else {
        console.error('Travel request missing employee field:', req.params.id);
        return res.status(500).json({
          success: false,
          message: 'Travel request data is incomplete'
        });
      }
    }
    
    // 处理 employee 可能是 ObjectId 或 populated 对象的情况
    if (travel.employee._id) {
      // Populated对象（有 _id 属性）
      employeeId = travel.employee._id.toString();
    } else if (travel.employee.id) {
      // Populated对象（可能有 id 属性）
      employeeId = String(travel.employee.id);
    } else if (typeof travel.employee === 'object' && travel.employee.toString) {
      // ObjectId 对象
      employeeId = travel.employee.toString();
    } else {
      // 字符串或其他格式
      employeeId = String(travel.employee);
    }
    
    const userId = req.user.id.toString();
    
    if (employeeId !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to access this travel request'
      });
    }

    res.json({
      success: true,
      data: travel
    });
  } catch (error) {
    console.error('Get travel error:', error);
    console.error('Error stack:', error.stack);
    console.error('Request params:', req.params);
    console.error('User ID:', req.user?.id);
    res.status(500).json({
      success: false,
      message: error.message || 'Server error'
    });
  }
});

// @desc    Create new travel request
// @route   POST /api/travel
// @access  Private
router.post('/', protect, async (req, res) => {
  try {
    const travelData = {
      ...req.body,
      employee: req.user.id
    };

    // 处理日期字段转换
    if (travelData.startDate && typeof travelData.startDate === 'string') {
      travelData.startDate = new Date(travelData.startDate);
    }
    if (travelData.endDate && typeof travelData.endDate === 'string') {
      travelData.endDate = new Date(travelData.endDate);
    }
    if (travelData.outbound?.date && typeof travelData.outbound.date === 'string') {
      travelData.outbound.date = new Date(travelData.outbound.date);
    }
    if (travelData.inbound?.date && typeof travelData.inbound.date === 'string') {
      travelData.inbound.date = new Date(travelData.inbound.date);
    }
    if (travelData.multiCityRoutes) {
      travelData.multiCityRoutes = travelData.multiCityRoutes.map(route => ({
        ...route,
        date: route.date ? (typeof route.date === 'string' ? new Date(route.date) : route.date) : null
      }));
    }

    // 计算总费用
    if (!travelData.estimatedCost) {
      const outboundTotal = Object.values(travelData.outboundBudget || {}).reduce((sum, item) => {
        return sum + (parseFloat(item.subtotal) || 0);
      }, 0);
      const inboundTotal = Object.values(travelData.inboundBudget || {}).reduce((sum, item) => {
        return sum + (parseFloat(item.subtotal) || 0);
      }, 0);
      travelData.estimatedCost = outboundTotal + inboundTotal;
    }

    // 向后兼容：设置dates字段
    if (travelData.startDate || travelData.outbound?.date) {
      travelData.dates = {
        departure: travelData.outbound?.date || travelData.startDate,
        return: travelData.inbound?.date || travelData.endDate
      };
    }

    // 自动生成差旅单号（如果没有提供）
    if (!travelData.travelNumber) {
      travelData.travelNumber = await generateTravelNumber();
    }

    const travel = await Travel.create(travelData);

    res.status(201).json({
      success: true,
      data: travel
    });
  } catch (error) {
    console.error('Create travel error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Server error'
    });
  }
});

// @desc    Update travel request
// @route   PUT /api/travel/:id
// @access  Private
router.put('/:id', protect, async (req, res) => {
  try {
    // 验证ID格式
    const mongoose = require('mongoose');
    if (!req.params.id || !mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid travel ID format'
      });
    }

    let travel = await Travel.findById(req.params.id);

    if (!travel) {
      return res.status(404).json({
        success: false,
        message: 'Travel request not found'
      });
    }

    // 检查权限：只能更新自己的申请或管理员
    // 如果是管理员，允许更新所有申请（包括employee为null的情况）
    if (req.user.role === 'admin') {
      // 管理员可以更新，继续执行
    } else {
      // 非管理员需要检查权限
      let employeeId;
      if (!travel.employee) {
        // 如果没有employee字段，在开发模式下允许更新，否则返回错误
        const isDevMode = !process.env.NODE_ENV || process.env.NODE_ENV === 'development';
        if (!isDevMode) {
          console.error('Travel request missing employee field:', req.params.id);
          return res.status(500).json({
            success: false,
            message: 'Travel request data is incomplete'
          });
        }
      } else {
        // 处理 employee 可能是 ObjectId 或 populated 对象的情况
        if (travel.employee._id) {
          employeeId = travel.employee._id.toString();
        } else if (travel.employee.id) {
          employeeId = String(travel.employee.id);
        } else if (typeof travel.employee === 'object' && travel.employee.toString) {
          employeeId = travel.employee.toString();
        } else {
          employeeId = String(travel.employee);
        }
        
        const userId = req.user.id.toString();
        
        if (employeeId !== userId) {
          return res.status(403).json({
            success: false,
            message: 'Not authorized to update this travel request'
          });
        }
      }
    }

    // 处理日期字段转换
    const updateData = { ...req.body };
    
    if (updateData.startDate && typeof updateData.startDate === 'string') {
      updateData.startDate = new Date(updateData.startDate);
    }
    if (updateData.endDate && typeof updateData.endDate === 'string') {
      updateData.endDate = new Date(updateData.endDate);
    }
    if (updateData.outbound?.date && typeof updateData.outbound.date === 'string') {
      updateData.outbound.date = new Date(updateData.outbound.date);
    }
    if (updateData.inbound?.date && typeof updateData.inbound.date === 'string') {
      updateData.inbound.date = new Date(updateData.inbound.date);
    }
    if (updateData.multiCityRoutes) {
      updateData.multiCityRoutes = updateData.multiCityRoutes.map(route => ({
        ...route,
        date: route.date ? (typeof route.date === 'string' ? new Date(route.date) : route.date) : null
      }));
    }

    // 计算总费用
    if (updateData.outboundBudget || updateData.inboundBudget) {
      const outboundTotal = Object.values(updateData.outboundBudget || travel.outboundBudget || {}).reduce((sum, item) => {
        return sum + (parseFloat(item.subtotal) || 0);
      }, 0);
      const inboundTotal = Object.values(updateData.inboundBudget || travel.inboundBudget || {}).reduce((sum, item) => {
        return sum + (parseFloat(item.subtotal) || 0);
      }, 0);
      updateData.estimatedCost = outboundTotal + inboundTotal;
    }

    // 向后兼容：设置dates字段
    if (updateData.startDate || updateData.outbound?.date) {
      updateData.dates = {
        departure: updateData.outbound?.date || updateData.startDate || travel.dates?.departure,
        return: updateData.inbound?.date || updateData.endDate || travel.dates?.return
      };
    }

    // 不允许更新差旅单号（保持原值）
    if (updateData.travelNumber !== undefined && updateData.travelNumber !== travel.travelNumber) {
      delete updateData.travelNumber;
    }
    
    // 不允许更新或删除 employee 字段（如果原值为 null，且更新数据中包含 null，则删除该字段）
    if (updateData.employee === null || updateData.employee === undefined) {
      delete updateData.employee;
    }

    travel = await Travel.findByIdAndUpdate(req.params.id, updateData, {
      new: true,
      runValidators: true
    }).populate('employee', 'firstName lastName email');

    res.json({
      success: true,
      data: travel
    });
  } catch (error) {
    console.error('Update travel error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Server error'
    });
  }
});

// @desc    Delete travel request
// @route   DELETE /api/travel/:id
// @access  Private
router.delete('/:id', protect, async (req, res) => {
  try {
    // 验证ID格式
    const mongoose = require('mongoose');
    if (!req.params.id || !mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid travel ID format'
      });
    }

    const travel = await Travel.findById(req.params.id);

    if (!travel) {
      return res.status(404).json({
        success: false,
        message: 'Travel request not found'
      });
    }

    // 检查权限：只能删除自己的申请或管理员
    // 如果是管理员，允许删除所有申请（包括employee为null的情况）
    if (req.user.role === 'admin') {
      // 管理员可以删除，继续执行
    } else {
      // 非管理员需要检查权限
      let employeeId;
      if (!travel.employee) {
        // 如果没有employee字段，在开发模式下允许删除，否则返回错误
        const isDevMode = !process.env.NODE_ENV || process.env.NODE_ENV === 'development';
        if (!isDevMode) {
          console.error('Travel request missing employee field:', req.params.id);
          return res.status(500).json({
            success: false,
            message: 'Travel request data is incomplete'
          });
        }
      } else {
        // 处理 employee 可能是 ObjectId 或 populated 对象的情况
        if (travel.employee._id) {
          employeeId = travel.employee._id.toString();
        } else if (travel.employee.id) {
          employeeId = String(travel.employee.id);
        } else if (typeof travel.employee === 'object' && travel.employee.toString) {
          employeeId = travel.employee.toString();
        } else {
          employeeId = String(travel.employee);
        }
        
        const userId = req.user.id.toString();
        
        if (employeeId !== userId) {
          return res.status(403).json({
            success: false,
            message: 'Not authorized to delete this travel request'
          });
        }
      }
    }

    // 只能删除草稿状态的申请
    if (travel.status !== 'draft') {
      return res.status(400).json({
        success: false,
        message: 'Can only delete draft travel requests'
      });
    }

    await travel.deleteOne();

    res.json({
      success: true,
      message: 'Travel request deleted successfully'
    });
  } catch (error) {
    console.error('Delete travel error:', error);
    console.error('Error stack:', error.stack);
    console.error('Request params:', req.params);
    console.error('User ID:', req.user?.id);
    res.status(500).json({
      success: false,
      message: error.message || 'Server error'
    });
  }
});

module.exports = router;
