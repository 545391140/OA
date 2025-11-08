
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
    // 核心逻辑：管理员可以看到所有差旅申请，普通用户只能看到自己的
    let query = {};
    
    // 如果不是管理员，只查询当前用户的申请
    if (req.user.role !== 'admin') {
      query.employee = req.user.id;
    }
    // 如果是管理员，不添加 employee 过滤条件，查询所有申请
    
    const travels = await Travel.find(query)
      .populate('employee', 'firstName lastName email')
      .populate('approvals.approver', 'firstName lastName email')
      .sort({ createdAt: -1 });

    console.log(`[TRAVEL_LIST] User ${req.user.id} (role: ${req.user.role}) fetched ${travels.length} travels`);

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

    // 确保 multiCityRoutesBudget 数组长度与 multiCityRoutes 一致
    const routesLength = travelData.multiCityRoutes ? travelData.multiCityRoutes.length : 0;
    
    if (routesLength > 0) {
      // 如果有多程行程，确保 multiCityRoutesBudget 存在且长度匹配
      if (travelData.multiCityRoutesBudget !== undefined && Array.isArray(travelData.multiCityRoutesBudget)) {
        // 如果提供了 multiCityRoutesBudget，确保长度匹配
        while (travelData.multiCityRoutesBudget.length < routesLength) {
          travelData.multiCityRoutesBudget.push({});
        }
        if (travelData.multiCityRoutesBudget.length > routesLength) {
          travelData.multiCityRoutesBudget = travelData.multiCityRoutesBudget.slice(0, routesLength);
        }
      } else {
        // 如果没有提供 multiCityRoutesBudget 或格式不正确，初始化数组
        travelData.multiCityRoutesBudget = Array(routesLength).fill(null).map(() => ({}));
      }
    } else {
      // 如果没有 multiCityRoutes，设置为空数组
      travelData.multiCityRoutesBudget = travelData.multiCityRoutesBudget || [];
      if (!Array.isArray(travelData.multiCityRoutesBudget)) {
        travelData.multiCityRoutesBudget = [];
      }
    }
    
    // 强制确保 multiCityRoutesBudget 字段被包含
    if (!travelData.hasOwnProperty('multiCityRoutesBudget')) {
      travelData.multiCityRoutesBudget = [];
    }
    if (!Array.isArray(travelData.multiCityRoutesBudget)) {
      travelData.multiCityRoutesBudget = [];
    }
    
    console.log('Create travel - multiCityRoutesBudget:', {
      routesLength,
      budgetLength: travelData.multiCityRoutesBudget.length,
      hasMultiCityRoutes: !!travelData.multiCityRoutes,
      multiCityRoutesLength: travelData.multiCityRoutes?.length || 0,
      budget: travelData.multiCityRoutesBudget,
      travelDataKeys: Object.keys(travelData).filter(k => k.includes('Budget') || k.includes('Routes'))
    });

    // 计算总费用
    if (!travelData.estimatedCost) {
      const outboundTotal = Object.values(travelData.outboundBudget || {}).reduce((sum, item) => {
        return sum + (parseFloat(item.subtotal) || 0);
      }, 0);
      const inboundTotal = Object.values(travelData.inboundBudget || {}).reduce((sum, item) => {
        return sum + (parseFloat(item.subtotal) || 0);
      }, 0);
      // 计算多程行程费用
      const multiCityTotal = (travelData.multiCityRoutesBudget || []).reduce((sum, budget) => {
        return sum + Object.values(budget || {}).reduce((budgetSum, item) => {
          return budgetSum + (parseFloat(item.subtotal) || 0);
        }, 0);
      }, 0);
      travelData.estimatedCost = outboundTotal + inboundTotal + multiCityTotal;
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
    
    console.log('Created travel:', {
      id: travel._id,
      hasOutboundBudget: !!travel.outboundBudget,
      hasInboundBudget: !!travel.inboundBudget,
      hasMultiCityRoutesBudget: !!travel.multiCityRoutesBudget,
      multiCityRoutesBudgetLength: travel.multiCityRoutesBudget?.length || 0,
      multiCityRoutesBudget: travel.multiCityRoutesBudget,
      multiCityRoutesLength: travel.multiCityRoutes?.length || 0
    });

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
    
    // 记录接收到的原始数据
    console.log('=== 后端接收到的原始数据 ===');
    console.log('req.body.multiCityRoutesBudget:', {
      exists: req.body.hasOwnProperty('multiCityRoutesBudget'),
      isArray: Array.isArray(req.body.multiCityRoutesBudget),
      length: req.body.multiCityRoutesBudget?.length || 0,
      data: JSON.stringify(req.body.multiCityRoutesBudget, null, 2),
      type: typeof req.body.multiCityRoutesBudget
    });
    console.log('req.body.multiCityRoutes:', {
      exists: req.body.hasOwnProperty('multiCityRoutes'),
      isArray: Array.isArray(req.body.multiCityRoutes),
      length: req.body.multiCityRoutes?.length || 0
    });
    
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

    // 确保 multiCityRoutesBudget 数组长度与 multiCityRoutes 一致
    // 重要：优先使用前端发送的数据，不要覆盖用户输入
    const finalMultiCityRoutes = updateData.multiCityRoutes !== undefined 
      ? updateData.multiCityRoutes 
      : (travel.multiCityRoutes || []);
    const routesLength = finalMultiCityRoutes.length || 0;
    
    // 如果前端发送了 multiCityRoutesBudget，使用前端的数据（即使它是空数组）
    // 只有在前端没有发送该字段时，才从现有数据中初始化
    console.log('=== 处理 multiCityRoutesBudget ===');
    console.log('前端是否发送:', updateData.hasOwnProperty('multiCityRoutesBudget'));
    console.log('前端原始数据:', {
      isArray: Array.isArray(updateData.multiCityRoutesBudget),
      length: updateData.multiCityRoutesBudget?.length || 0,
      type: typeof updateData.multiCityRoutesBudget,
      data: JSON.stringify(updateData.multiCityRoutesBudget, null, 2)
    });
    console.log('routesLength:', routesLength);
    
    if (updateData.hasOwnProperty('multiCityRoutesBudget')) {
      // 前端发送了该字段，使用前端的数据
      if (!Array.isArray(updateData.multiCityRoutesBudget)) {
        console.warn('Warning: multiCityRoutesBudget is not an array, converting');
        updateData.multiCityRoutesBudget = [];
      }
      
      // 确保数组长度与 multiCityRoutes 一致（但保留前端的数据）
      if (routesLength > 0) {
        const originalLength = updateData.multiCityRoutesBudget.length;
        // 如果长度不匹配，调整长度（保留现有数据，不足的用空对象填充）
        while (updateData.multiCityRoutesBudget.length < routesLength) {
          updateData.multiCityRoutesBudget.push({});
        }
        if (updateData.multiCityRoutesBudget.length > routesLength) {
          updateData.multiCityRoutesBudget = updateData.multiCityRoutesBudget.slice(0, routesLength);
        }
        console.log(`调整数组长度: ${originalLength} -> ${updateData.multiCityRoutesBudget.length}`);
        
        // 检查每个预算对象是否有数据
        updateData.multiCityRoutesBudget.forEach((budget, index) => {
          const keys = Object.keys(budget || {});
          const items = keys.map(key => ({
            itemId: key,
            itemName: budget[key]?.itemName || 'N/A',
            unitPrice: budget[key]?.unitPrice || 'N/A',
            quantity: budget[key]?.quantity || 'N/A',
            subtotal: budget[key]?.subtotal || 'N/A'
          }));
          console.log(`预算[${index}]:`, {
            keysCount: keys.length,
            keys: keys,
            hasData: keys.length > 0,
            items: items
          });
        });
      } else {
        // 如果没有多程行程，设置为空数组
        updateData.multiCityRoutesBudget = [];
      }
    } else {
      // 前端没有发送该字段，从现有数据中初始化
      console.log('前端未发送 multiCityRoutesBudget，从现有数据初始化');
      if (routesLength > 0) {
        const existingBudget = travel.multiCityRoutesBudget || [];
        if (Array.isArray(existingBudget) && existingBudget.length === routesLength) {
          updateData.multiCityRoutesBudget = existingBudget;
        } else {
          updateData.multiCityRoutesBudget = Array(routesLength).fill(null).map((_, index) => 
            existingBudget[index] || {}
          );
        }
      } else {
        updateData.multiCityRoutesBudget = [];
      }
    }
    
    console.log('处理后的 multiCityRoutesBudget:', {
      length: updateData.multiCityRoutesBudget?.length || 0,
      isArray: Array.isArray(updateData.multiCityRoutesBudget),
      data: JSON.stringify(updateData.multiCityRoutesBudget, null, 2)
    });

    // 计算总费用
    if (updateData.outboundBudget || updateData.inboundBudget || updateData.multiCityRoutesBudget) {
      const outboundTotal = Object.values(updateData.outboundBudget || travel.outboundBudget || {}).reduce((sum, item) => {
        return sum + (parseFloat(item.subtotal) || 0);
      }, 0);
      const inboundTotal = Object.values(updateData.inboundBudget || travel.inboundBudget || {}).reduce((sum, item) => {
        return sum + (parseFloat(item.subtotal) || 0);
      }, 0);
      // 计算多程行程费用
      const multiCityRoutesBudget = updateData.multiCityRoutesBudget || travel.multiCityRoutesBudget || [];
      const multiCityTotal = multiCityRoutesBudget.reduce((sum, budget) => {
        return sum + Object.values(budget || {}).reduce((budgetSum, item) => {
          return budgetSum + (parseFloat(item.subtotal) || 0);
        }, 0);
      }, 0);
      updateData.estimatedCost = outboundTotal + inboundTotal + multiCityTotal;
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

    // updateData.multiCityRoutesBudget 已经在上面（365-406行）处理过了
    // 这里只需要记录日志即可
    console.log('Update travel data (processed):', {
      id: req.params.id,
      hasOutboundBudget: !!updateData.outboundBudget,
      hasInboundBudget: !!updateData.inboundBudget,
      hasMultiCityRoutesBudget: !!updateData.multiCityRoutesBudget,
      multiCityRoutesBudgetLength: updateData.multiCityRoutesBudget?.length || 0,
      multiCityRoutesLength: routesLength,
      multiCityRoutesBudget: updateData.multiCityRoutesBudget,
      existingMultiCityRoutesBudget: travel.multiCityRoutesBudget ? travel.multiCityRoutesBudget.length : 0,
      isArray: Array.isArray(updateData.multiCityRoutesBudget),
      sampleBudgetItem: updateData.multiCityRoutesBudget?.[0] || 'N/A'
    });

    // 使用 findById 获取文档，然后直接设置字段并保存
    // 这样可以确保新字段（multiCityRoutesBudget）被正确保存到数据库
    travel = await Travel.findById(req.params.id);
    
    if (!travel) {
      return res.status(404).json({
        success: false,
        message: 'Travel request not found'
      });
    }
    
    // 直接设置所有更新字段
    // 注意：updateData.multiCityRoutesBudget 已经在上面处理过了
    console.log('=== 设置文档字段 ===');
    Object.keys(updateData).forEach(key => {
      if (key !== 'employee' && key !== 'travelNumber') {
        travel[key] = updateData[key];
        if (key === 'multiCityRoutesBudget') {
          console.log(`设置 travel.${key}:`, {
            isArray: Array.isArray(updateData[key]),
            length: updateData[key]?.length || 0,
            data: JSON.stringify(updateData[key], null, 2)
          });
        }
      }
    });
    
    // 强制设置 multiCityRoutesBudget（使用已经处理过的值）
    // 这确保即使用户输入了数据，也会被正确保存
    travel.multiCityRoutesBudget = updateData.multiCityRoutesBudget || [];
    
    // 确保是数组类型
    if (!Array.isArray(travel.multiCityRoutesBudget)) {
      console.warn('Warning: multiCityRoutesBudget is not an array, converting to array');
      travel.multiCityRoutesBudget = [];
    }
    
    console.log('=== Before save - travel.multiCityRoutesBudget ===');
    console.log('准备保存的数据:', {
      length: travel.multiCityRoutesBudget?.length || 0,
      isArray: Array.isArray(travel.multiCityRoutesBudget),
      data: JSON.stringify(travel.multiCityRoutesBudget, null, 2),
      routesLength: routesLength,
      updateDataHasProperty: updateData.hasOwnProperty('multiCityRoutesBudget')
    });
    
    // 检查每个预算对象
    travel.multiCityRoutesBudget.forEach((budget, index) => {
      const keys = Object.keys(budget || {});
      console.log(`准备保存的预算[${index}]:`, {
        keysCount: keys.length,
        keys: keys,
        hasData: keys.length > 0,
        sampleItem: keys.length > 0 ? budget[keys[0]] : null
      });
    });
    
    // 保存文档，这会确保所有字段（包括新字段）都被保存到数据库
    console.log('=== 开始保存到数据库 ===');
    await travel.save();
    console.log('保存完成');
    
    // 重新加载以获取最新数据
    travel = await Travel.findById(req.params.id).populate('employee', 'firstName lastName email');

    console.log('=== 保存后的数据（从数据库重新加载） ===');
    console.log('Updated travel:', {
      id: travel._id,
      hasOutboundBudget: !!travel.outboundBudget,
      hasInboundBudget: !!travel.inboundBudget,
      hasMultiCityRoutesBudget: !!travel.multiCityRoutesBudget,
      multiCityRoutesBudgetLength: travel.multiCityRoutesBudget?.length || 0,
      multiCityRoutesBudget: JSON.stringify(travel.multiCityRoutesBudget, null, 2)
    });
    
    // 详细检查保存后的 multiCityRoutesBudget
    if (travel.multiCityRoutesBudget && Array.isArray(travel.multiCityRoutesBudget)) {
      travel.multiCityRoutesBudget.forEach((budget, index) => {
        const keys = Object.keys(budget || {});
        const items = keys.map(key => ({
          itemId: key,
          itemName: budget[key]?.itemName || 'N/A',
          unitPrice: budget[key]?.unitPrice || 'N/A',
          quantity: budget[key]?.quantity || 'N/A',
          subtotal: budget[key]?.subtotal || 'N/A'
        }));
        console.log(`保存后的预算[${index}]:`, {
          keysCount: keys.length,
          keys: keys,
          hasData: keys.length > 0,
          items: items
        });
      });
    } else {
      console.warn('保存后的 multiCityRoutesBudget 不是数组或为空');
    }

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
