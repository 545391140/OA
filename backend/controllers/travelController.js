const mongoose = require('mongoose');
const Travel = require('../models/Travel');
const User = require('../models/User');

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
exports.getTravels = async (req, res) => {
  try {
    const { status } = req.query;
    const query = { employee: req.user.id };
    
    if (status) {
      query.status = status;
    }

    const travels = await Travel.find(query)
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
};

// @desc    Get single travel request
// @route   GET /api/travel/:id
// @access  Private
exports.getTravelById = async (req, res) => {
  try {
    // 验证ID格式
    if (!req.params.id || !mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid travel ID format'
      });
    }

    // 先查询travel，不populate，避免populate失败
    let travel = await Travel.findById(req.params.id);
    
    if (travel) {
      // 手动populate employee（如果存在）
      if (travel.employee) {
        try {
          const employeeDoc = await User.findById(travel.employee).select('firstName lastName email');
          if (employeeDoc) {
            travel.employee = {
              _id: employeeDoc._id,
              firstName: employeeDoc.firstName,
              lastName: employeeDoc.lastName,
              email: employeeDoc.email
            };
          }
        } catch (userError) {
          console.error('Error populating employee:', userError.message);
          // employee保持为ObjectId，不影响后续逻辑
        }
      }
      
      // 手动populate approvals.approver（如果存在）
      if (travel.approvals && Array.isArray(travel.approvals) && travel.approvals.length > 0) {
        try {
          // 收集所有approver IDs
          const approverIds = travel.approvals
            .map(approval => approval.approver)
            .filter(id => id);
          
          if (approverIds.length > 0) {
            // 批量查询所有approvers
            const approvers = await User.find({ _id: { $in: approverIds } }).select('firstName lastName email');
            const approverMap = new Map(approvers.map(a => [a._id.toString(), a]));
            
            // 填充approvals中的approver字段
            for (let approval of travel.approvals) {
              if (approval.approver) {
                const approverId = approval.approver.toString();
                const approverDoc = approverMap.get(approverId);
                if (approverDoc) {
                  approval.approver = {
                    _id: approverDoc._id,
                    firstName: approverDoc.firstName,
                    lastName: approverDoc.lastName,
                    email: approverDoc.email
                  };
                }
              }
            }
          }
        } catch (approverError) {
          console.error('Error populating approvers:', approverError.message);
          // 继续执行，approver保持为ObjectId
        }
      }
    }

    if (!travel) {
      return res.status(404).json({
        success: false,
        message: 'Travel request not found'
      });
    }

    // 检查权限：只能查看自己的申请或管理员
    // 安全地获取employee ID（可能是ObjectId或populated对象）
    let employeeId;
    if (!travel.employee) {
      // 如果没有employee字段，可能是数据损坏
      console.error('Travel request missing employee field:', req.params.id);
      return res.status(500).json({
        success: false,
        message: 'Travel request data is incomplete'
      });
    }
    
    if (travel.employee._id) {
      // Populated对象
      employeeId = travel.employee._id.toString();
    } else if (typeof travel.employee.toString === 'function') {
      // ObjectId
      employeeId = travel.employee.toString();
    } else {
      // 已经是字符串
      employeeId = String(travel.employee);
    }
    
    if (employeeId !== req.user.id && req.user.role !== 'admin') {
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
};

// @desc    Create new travel request
// @route   POST /api/travel
// @access  Private
exports.createTravel = async (req, res) => {
  try {
    // 处理日期字段转换
    const travelData = {
      ...req.body,
      employee: req.user.id
    };

    // 转换日期字符串为Date对象
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
};

// @desc    Update travel request
// @route   PUT /api/travel/:id
// @access  Private
exports.updateTravel = async (req, res) => {
  try {
    let travel = await Travel.findById(req.params.id);

    if (!travel) {
      return res.status(404).json({
        success: false,
        message: 'Travel request not found'
      });
    }

    // 检查权限：只能更新自己的申请或管理员
    // 安全地获取employee ID（可能是ObjectId或populated对象）
    const employeeId = travel.employee 
      ? (travel.employee._id ? travel.employee._id.toString() : travel.employee.toString())
      : travel.employee;
    
    if (employeeId !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this travel request'
      });
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
};

// @desc    Delete travel request
// @route   DELETE /api/travel/:id
// @access  Private
exports.deleteTravel = async (req, res) => {
  try {
    const travel = await Travel.findById(req.params.id);

    if (!travel) {
      return res.status(404).json({
        success: false,
        message: 'Travel request not found'
      });
    }

    // 检查权限：只能删除自己的申请或管理员
    // 安全地获取employee ID（可能是ObjectId或populated对象）
    const employeeId = travel.employee 
      ? (travel.employee._id ? travel.employee._id.toString() : travel.employee.toString())
      : travel.employee;
    
    if (employeeId !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this travel request'
      });
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
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};


