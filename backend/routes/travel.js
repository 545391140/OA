
const express = require('express');
const { protect } = require('../middleware/auth');
const Travel = require('../models/Travel');
const User = require('../models/User');
const { buildDataScopeQuery, checkDataAccess } = require('../utils/dataScope');
const Role = require('../models/Role');

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
    // 获取用户角色和数据权限
    const role = await Role.findOne({ code: req.user.role, isActive: true });
    const dataScopeQuery = await buildDataScopeQuery(req.user, role, 'employee');
    
    // 构建查询条件（应用数据权限）
    let query = { ...dataScopeQuery };
    
    // 分页参数
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    
    // 状态过滤（如果提供）
    if (req.query.status && req.query.status !== 'all') {
      query.status = req.query.status;
    }
    
    // 搜索关键词（如果提供）
    if (req.query.search) {
      const searchRegex = new RegExp(req.query.search, 'i');
      query.$or = [
        { title: searchRegex },
        { travelNumber: searchRegex },
        { purpose: searchRegex }
      ];
    }
    
    // 查询总数（用于分页）
    const total = await Travel.countDocuments(query);
    
    // 查询数据：只选择列表需要的字段，使用 lean() 提高性能
    // 优化：先查询主数据，再批量查询关联数据，避免嵌套 populate 的 N+1 问题
    const travels = await Travel.find(query)
      .select('title travelNumber status estimatedCost currency startDate endDate destination destinationAddress outbound inbound createdAt employee purpose tripDescription comment approvals')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(); // 使用 lean() 返回纯 JavaScript 对象，提高性能

    // 步骤 1：收集所有唯一的 employee ID 和 approver ID
    const employeeIds = [...new Set(
      travels
        .map(t => t.employee)
        .filter(Boolean)
        .map(id => id.toString ? id.toString() : id)
    )];
    
    // 收集所有审批人 ID（从嵌套的 approvals 数组中）
    const approverIds = [...new Set(
      travels
        .flatMap(t => (t.approvals || []).map(a => a.approver))
        .filter(Boolean)
        .map(id => id.toString ? id.toString() : id)
    )];

    // 步骤 2：批量查询关联数据（只在有 ID 时才查询）
    const [employees, approvers] = await Promise.all([
      employeeIds.length > 0
        ? User.find({ _id: { $in: employeeIds } })
            .select('firstName lastName email')
            .lean()
        : Promise.resolve([]),
      approverIds.length > 0
        ? User.find({ _id: { $in: approverIds } })
            .select('firstName lastName email')
            .lean()
        : Promise.resolve([])
    ]);

    // 步骤 3：创建 ID 到数据的映射表（提升查找性能）
    const employeeMap = new Map(employees.map(e => [e._id.toString(), e]));
    const approverMap = new Map(approvers.map(a => [a._id.toString(), a]));

    // 步骤 4：合并数据到原始文档中（模拟 Mongoose populate 的行为）
    travels.forEach(travel => {
      // Populate employee
      if (travel.employee) {
        const employeeId = travel.employee.toString ? travel.employee.toString() : travel.employee;
        travel.employee = employeeMap.get(employeeId) || null;
      }
      
      // Populate approvals.approver（只保留第一个审批人用于显示状态）
      if (travel.approvals && Array.isArray(travel.approvals)) {
        // 只处理第一个审批人（用于列表显示）
        if (travel.approvals.length > 0 && travel.approvals[0].approver) {
          const approverId = travel.approvals[0].approver.toString 
            ? travel.approvals[0].approver.toString() 
            : travel.approvals[0].approver;
          travel.approvals[0].approver = approverMap.get(approverId) || null;
        }
        
        // 过滤掉 approver 为 null 的审批记录（审批人可能已被删除）
        travel.approvals = travel.approvals.filter(
          approval => approval.approver !== null && approval.approver !== undefined
        );
        
        // 只保留第一个审批人用于列表显示
        if (travel.approvals.length > 1) {
          travel.approvals = [travel.approvals[0]];
        }
      }
    });

    console.log(`[TRAVEL_LIST] User ${req.user.id} (role: ${req.user.role}) fetched ${travels.length} travels (page: ${page}, limit: ${limit}, total: ${total})`);

    res.json({
      success: true,
      count: travels.length,
      total: total,
      page: page,
      limit: limit,
      pages: Math.ceil(total / limit),
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

    // 过滤掉 approver 为 null 的审批记录（审批人可能已被删除）
    if (travel.approvals && Array.isArray(travel.approvals)) {
      travel.approvals = travel.approvals.filter(
        approval => approval.approver !== null && approval.approver !== undefined
      );
    }

    // 数据权限检查：使用数据权限范围检查
    const role = await Role.findOne({ code: req.user.role, isActive: true });
    const hasAccess = await checkDataAccess(req.user, travel, role, 'employee');
    
    if (!hasAccess) {
      console.warn('[GET_TRAVEL] Data access denied:', {
        travelId: req.params.id,
        userId: req.user.id,
        userRole: req.user.role,
        dataScope: role?.dataScope || 'self'
      });
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

    // 数据权限检查：使用数据权限范围检查
    const role = await Role.findOne({ code: req.user.role, isActive: true });
    const hasAccess = await checkDataAccess(req.user, travel, role, 'employee');
    
    if (!hasAccess) {
      console.warn('[PUT_TRAVEL] Data access denied:', {
        travelId: req.params.id,
        userId: req.user.id,
        userRole: req.user.role,
        dataScope: role?.dataScope || 'self'
      });
          return res.status(403).json({
            success: false,
            message: 'Not authorized to update this travel request'
          });
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
    // 数据权限检查：使用数据权限范围检查
    const role = await Role.findOne({ code: req.user.role, isActive: true });
    const hasAccess = await checkDataAccess(req.user, travel, role, 'employee');
    
    if (!hasAccess) {
      console.warn('[DELETE_TRAVEL] Data access denied:', {
        travelId: req.params.id,
        userId: req.user.id,
        userRole: req.user.role,
        dataScope: role?.dataScope || 'self'
      });
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
    console.error('Error stack:', error.stack);
    console.error('Request params:', req.params);
    console.error('User ID:', req.user?.id);
    res.status(500).json({
      success: false,
      message: error.message || 'Server error'
    });
  }
});

// @desc    Submit travel request for approval
// @route   POST /api/travel/:id/submit
// @access  Private
router.post('/:id/submit', protect, async (req, res) => {
  try {
    const mongoose = require('mongoose');
    const approvalWorkflowService = require('../services/approvalWorkflowService');
    const notificationService = require('../services/notificationService');
    const User = require('../models/User');
    
    if (!req.params.id || !mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid travel ID format'
      });
    }

    const travel = await Travel.findById(req.params.id).populate('employee', 'firstName lastName email department jobLevel');

    if (!travel) {
      return res.status(404).json({
        success: false,
        message: 'Travel request not found'
      });
    }

    // 检查权限：只能提交自己的申请
    let employeeId;
    // 数据权限检查：使用数据权限范围检查
    const role = await Role.findOne({ code: req.user.role, isActive: true });
    const hasAccess = await checkDataAccess(req.user, travel, role, 'employee');
    
    if (!hasAccess) {
      console.warn('[SUBMIT_TRAVEL] Data access denied:', {
        travelId: req.params.id,
        userId: req.user.id,
        userRole: req.user.role,
        dataScope: role?.dataScope || 'self'
      });
        return res.status(403).json({
          success: false,
          message: 'Not authorized to submit this travel request'
        });
    }

    // 只能提交草稿状态的申请
    if (travel.status !== 'draft') {
      return res.status(400).json({
        success: false,
        message: 'Can only submit draft travel requests'
      });
    }

    // 使用审批工作流服务匹配审批流程
    const budgetAmount = travel.estimatedBudget || travel.estimatedCost || 0;
    const workflow = await approvalWorkflowService.matchWorkflow({
      type: 'travel',
      amount: budgetAmount,
      department: travel.employee?.department || req.user.department,
      jobLevel: travel.employee?.jobLevel || req.user.jobLevel
    });

    let approvals = [];
    
    if (workflow) {
      // 使用匹配的工作流生成审批人
      approvals = await approvalWorkflowService.generateApprovers({
        workflow,
        requesterId: req.user.id,
        department: travel.employee?.department || req.user.department
      });
    } else {
      // 没有匹配的工作流，使用默认逻辑
      console.log('No matching workflow found, using default approval logic');
      
      if (budgetAmount > 10000) {
        approvals.push({
          approver: req.user.manager || req.user.id,
          level: 1,
          status: 'pending'
        });
        approvals.push({
          approver: req.user.id,
          level: 2,
          status: 'pending'
        });
      } else if (budgetAmount > 5000) {
        approvals.push({
          approver: req.user.manager || req.user.id,
          level: 1,
          status: 'pending'
        });
      } else {
        approvals.push({
          approver: req.user.manager || req.user.id,
          level: 1,
          status: 'pending'
        });
      }

      // 如果没有指定审批人，使用管理员作为默认审批人
      const adminUser = await User.findOne({ role: 'admin', isActive: true });
      if (adminUser) {
        approvals.forEach(approval => {
          if (!approval.approver || approval.approver.toString() === req.user.id.toString()) {
            approval.approver = adminUser._id;
          }
        });
      }
    }

    // 更新状态和审批流程
    travel.status = 'submitted';
    travel.approvals = approvals;

    await travel.save();

    // 发送审批通知
    try {
      const approverIds = [...new Set(approvals.map(a => a.approver.toString()))];
      await notificationService.notifyApprovalRequest({
        approvers: approverIds,
        requestType: 'travel',
        requestId: travel._id,
        requestTitle: travel.title || travel.travelNumber,
        requester: {
          _id: req.user.id,
          firstName: req.user.firstName,
          lastName: req.user.lastName
        }
      });
    } catch (notifyError) {
      console.error('Failed to send approval notifications:', notifyError);
      // 通知失败不影响提交流程
    }

    res.json({
      success: true,
      data: travel
    });
  } catch (error) {
    console.error('Submit travel error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Server error'
    });
  }
});

// @desc    Generate expenses for travel
// @route   POST /api/travel/:id/generate-expenses
// @access  Private
router.post('/:id/generate-expenses', protect, async (req, res) => {
  const travelId = req.params.id;
  console.log(`[GENERATE_EXPENSES] Starting request for travel ${travelId}`);
  
  try {
    const travel = await Travel.findById(travelId)
      .populate('employee', 'firstName lastName email');
    
    console.log(`[GENERATE_EXPENSES] Travel found: ${travel ? 'yes' : 'no'}`);
    
    if (!travel) {
      console.log(`[GENERATE_EXPENSES] Travel ${travelId} not found`);
      return res.status(404).json({
        success: false,
        message: 'Travel not found'
      });
    }
    
    // 数据权限检查：使用数据权限范围检查
    const role = await Role.findOne({ code: req.user.role, isActive: true });
    const hasAccess = await checkDataAccess(req.user, travel, role, 'employee');
    
    if (!hasAccess) {
      console.log(`[GENERATE_EXPENSES] Data access denied by user ${req.user.id}`);
      return res.status(403).json({
        success: false,
        message: 'Not authorized'
      });
    }
    
    // 检查是否有employee字段
    let employeeId;
    if (travel.employee) {
      if (travel.employee._id) {
        employeeId = travel.employee._id.toString();
      } else if (typeof travel.employee === 'object' && travel.employee.toString) {
        employeeId = travel.employee.toString();
      } else {
        employeeId = String(travel.employee);
      }
    }
    
    if (!employeeId) {
      console.error(`[GENERATE_EXPENSES] Travel ${travelId} has no employee`);
      return res.status(400).json({
        success: false,
        message: 'Travel has no employee assigned'
      });
    }
    
    // 检查是否已经生成过
    if (travel.expenseGenerationStatus === 'completed') {
      console.log(`[GENERATE_EXPENSES] Travel ${req.params.id} already has completed expense generation`);
      console.log(`[GENERATE_EXPENSES] Related expenses:`, travel.relatedExpenses);
      return res.status(400).json({
        success: false,
        message: 'Expenses already generated',
        data: {
          expenses: travel.relatedExpenses || [],
          expenseGenerationStatus: travel.expenseGenerationStatus,
          expenseGeneratedAt: travel.expenseGeneratedAt
        }
      });
    }
    
    // 检查是否正在生成中
    if (travel.expenseGenerationStatus === 'generating') {
      // 检查生成状态是否已经持续太长时间（超过5分钟），如果是，重置状态
      const generatingTimeout = 5 * 60 * 1000; // 5分钟
      const now = new Date();
      // 使用 updatedAt 来判断，因为 generating 状态是在更新时设置的
      const updatedAt = travel.updatedAt || travel.createdAt;
      const timeSinceUpdate = now - new Date(updatedAt);
      
      if (timeSinceUpdate > generatingTimeout) {
        console.warn(`Expense generation status stuck in 'generating' for ${Math.round(timeSinceUpdate / 1000)}s, resetting to 'pending'`);
        // 重置状态为 pending，允许重新生成
        await Travel.updateOne(
          { _id: req.params.id },
          { 
            $set: { 
              expenseGenerationStatus: 'pending',
              expenseGenerationError: 'Previous generation timed out, reset to pending'
            } 
          }
        );
        // 重新查询差旅单
        travel = await Travel.findById(req.params.id)
          .populate('employee', 'firstName lastName email');
      } else {
        // 如果还在超时时间内，返回错误
        const remainingSeconds = Math.round((generatingTimeout - timeSinceUpdate) / 1000);
        console.log(`[GENERATE_EXPENSES] Travel ${req.params.id} is still generating, remaining time: ${remainingSeconds}s`);
      return res.status(400).json({
        success: false,
          message: 'Expense generation in progress',
          data: {
            timeout: remainingSeconds, // 剩余秒数
            startedAt: updatedAt,
            elapsedSeconds: Math.round(timeSinceUpdate / 1000)
          }
      });
      }
    }
    
    // 执行自动生成
    console.log(`[GENERATE_EXPENSES] Calling autoGenerateExpenses for travel ${travelId}`);
    const expenseMatchService = require('../services/expenseMatchService');
    
    try {
    const result = await expenseMatchService.autoGenerateExpenses(travel);
      console.log(`[GENERATE_EXPENSES] Successfully generated ${result.generatedCount} expenses`);
    
    res.json({
      success: true,
      message: `Successfully generated ${result.generatedCount} expense(s)`,
      data: result
    });
    } catch (serviceError) {
      console.error(`[GENERATE_EXPENSES] Service error:`, serviceError);
      console.error(`[GENERATE_EXPENSES] Service error stack:`, serviceError.stack);
      throw serviceError; // 重新抛出，让外层 catch 处理
    }
    
  } catch (error) {
    console.error(`[GENERATE_EXPENSES] Fatal error for travel ${travelId}:`, error);
    console.error(`[GENERATE_EXPENSES] Error stack:`, error.stack);
    console.error(`[GENERATE_EXPENSES] Error details:`, {
      message: error.message,
      name: error.name,
      code: error.code,
      keyPattern: error.keyPattern,
      keyValue: error.keyValue
    });
    
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to generate expenses',
      error: process.env.NODE_ENV === 'development' ? {
        name: error.name,
        code: error.code,
        keyPattern: error.keyPattern,
        keyValue: error.keyValue,
        stack: error.stack
      } : undefined
    });
  }
});

// @desc    Get travel expenses
// @route   GET /api/travel/:id/expenses
// @access  Private
router.get('/:id/expenses', protect, async (req, res) => {
  const travelId = req.params.id;
  console.log(`[GET_TRAVEL_EXPENSES] Starting request for travel ${travelId}`);
  
  try {
    const travel = await Travel.findById(travelId)
      .populate('employee', 'firstName lastName email');
    
    if (!travel) {
      console.log(`[GET_TRAVEL_EXPENSES] Travel ${travelId} not found`);
      return res.status(404).json({
        success: false,
        message: 'Travel not found'
      });
    }
    
    console.log(`[GET_TRAVEL_EXPENSES] Travel found: ${travel.travelNumber || travelId}`);
    
    // 数据权限检查：使用数据权限范围检查
    const role = await Role.findOne({ code: req.user.role, isActive: true });
    const hasAccess = await checkDataAccess(req.user, travel, role, 'employee');
    
    if (!hasAccess) {
      console.log(`[GET_TRAVEL_EXPENSES] Data access denied by user ${req.user.id} for travel ${travelId}`);
      return res.status(403).json({
        success: false,
        message: 'Not authorized'
      });
    }
    
    // 获取费用申请的详细信息
    const Expense = require('../models/Expense');
    const mongoose = require('mongoose');
    
    // 过滤掉无效的 ObjectId
    const relatedExpenses = travel.relatedExpenses || [];
    console.log(`[GET_TRAVEL_EXPENSES] Travel has ${relatedExpenses.length} related expenses`);
    
    const validExpenseIds = relatedExpenses.filter(id => {
      if (!id) return false;
      try {
        const idStr = id.toString ? id.toString() : String(id);
        const isValid = mongoose.Types.ObjectId.isValid(idStr);
        if (!isValid) {
          console.warn(`[GET_TRAVEL_EXPENSES] Invalid expense ID found: ${idStr}`);
        }
        return isValid;
      } catch (e) {
        console.warn(`[GET_TRAVEL_EXPENSES] Error validating expense ID: ${id}`, e);
        return false;
      }
    }).map(id => {
      // 统一转换为 ObjectId（必须使用 new 关键字）
      const idStr = id.toString ? id.toString() : String(id);
      return new mongoose.Types.ObjectId(idStr);
    });
    
    console.log(`[GET_TRAVEL_EXPENSES] Valid expense IDs: ${validExpenseIds.length} out of ${relatedExpenses.length}`);
    
    if (validExpenseIds.length === 0) {
      console.log(`[GET_TRAVEL_EXPENSES] No valid expense IDs found, returning empty array`);
      return res.json({
        success: true,
        count: 0,
        data: []
      });
    }
    
    // 查询费用申请，使用 try-catch 处理 populate 错误
    let expenses = [];
    try {
      console.log(`[GET_TRAVEL_EXPENSES] Querying expenses with populate...`);
      console.log(`[GET_TRAVEL_EXPENSES] Valid expense IDs:`, validExpenseIds.map(id => id.toString()));
      
      // 先尝试使用 populate 查询，使用 lean() 提高性能
      expenses = await Expense.find({
        _id: { $in: validExpenseIds }
      })
        .populate({
          path: 'expenseItem',
          select: 'itemName category',
          model: 'ExpenseItem'
        })
        .populate({
          path: 'relatedInvoices',
          select: 'invoiceNumber invoiceDate amount totalAmount currency vendor category',
          model: 'Invoice'
        })
        .sort({ createdAt: -1 })
        .lean(); // 使用 lean() 直接返回普通对象，提高性能
      
      console.log(`[GET_TRAVEL_EXPENSES] Found ${expenses.length} expenses`);
      
      // 清理 populate 失败的数据（null 值）
      expenses = expenses.map(expense => {
        // 如果 expenseItem populate 失败（为 null），保持原样
        if (expense.expenseItem === null) {
          expense.expenseItem = null;
        }
        // 如果 relatedInvoices populate 失败，过滤掉 null 值
        if (Array.isArray(expense.relatedInvoices)) {
          expense.relatedInvoices = expense.relatedInvoices.filter(inv => inv !== null && inv !== undefined);
        } else if (expense.relatedInvoices === null || expense.relatedInvoices === undefined) {
          expense.relatedInvoices = [];
        }
        return expense;
      });
      
    } catch (queryError) {
      console.error(`[GET_TRAVEL_EXPENSES] Error querying expenses with populate:`, queryError);
      console.error(`[GET_TRAVEL_EXPENSES] Error details:`, {
        message: queryError.message,
        stack: queryError.stack,
        name: queryError.name,
        validExpenseIds: validExpenseIds.map(id => id.toString())
      });
      
      // 如果 populate 失败，尝试不使用 populate
      try {
        console.log(`[GET_TRAVEL_EXPENSES] Falling back to query without populate...`);
        expenses = await Expense.find({
          _id: { $in: validExpenseIds }
        })
          .sort({ createdAt: -1 })
          .lean();
        console.log(`[GET_TRAVEL_EXPENSES] Fallback query found ${expenses.length} expenses`);
        
        // 手动清理数据
        expenses = expenses.map(expense => {
          if (expense.expenseItem && typeof expense.expenseItem === 'string') {
            expense.expenseItem = null;
          }
          if (!Array.isArray(expense.relatedInvoices)) {
            expense.relatedInvoices = [];
          }
          return expense;
        });
      } catch (fallbackError) {
        console.error(`[GET_TRAVEL_EXPENSES] Fallback query also failed:`, fallbackError);
        console.error(`[GET_TRAVEL_EXPENSES] Fallback error details:`, {
          message: fallbackError.message,
          stack: fallbackError.stack,
          name: fallbackError.name
        });
        // 如果查询也失败，返回空数组而不是抛出错误
        expenses = [];
      }
    }
    
    // 过滤掉 null 值和无效数据
    expenses = expenses.filter(expense => expense !== null && expense !== undefined);
    console.log(`[GET_TRAVEL_EXPENSES] Filtered expenses: ${expenses.length}`);
    
    // 手动处理 populate 失败的字段
    expenses = expenses.map(expense => {
      try {
        // 确保 expenseItem 和 relatedInvoices 格式正确
        if (expense.expenseItem && typeof expense.expenseItem === 'string') {
          // 如果 expenseItem 是字符串 ID，设置为 null
          expense.expenseItem = null;
        }
        if (expense.relatedInvoices && !Array.isArray(expense.relatedInvoices)) {
          // 如果 relatedInvoices 不是数组，初始化为空数组
          expense.relatedInvoices = [];
        }
        // 确保 relatedInvoices 数组中的元素格式正确
        if (Array.isArray(expense.relatedInvoices)) {
          expense.relatedInvoices = expense.relatedInvoices.filter(inv => inv !== null && inv !== undefined);
        }
        return expense;
      } catch (e) {
        console.warn(`[GET_TRAVEL_EXPENSES] Error processing expense ${expense._id}:`, e);
        return expense;
      }
    });
    
    console.log(`[GET_TRAVEL_EXPENSES] Successfully returning ${expenses.length} expenses`);
    
    res.json({
      success: true,
      count: expenses.length,
      data: expenses
    });
    
  } catch (error) {
    console.error(`[GET_TRAVEL_EXPENSES] Fatal error for travel ${travelId}:`, error);
    console.error(`[GET_TRAVEL_EXPENSES] Error stack:`, error.stack);
    console.error(`[GET_TRAVEL_EXPENSES] Error details:`, {
      message: error.message,
      name: error.name,
      code: error.code,
      keyPattern: error.keyPattern,
      keyValue: error.keyValue
    });
    
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to get expenses',
      error: process.env.NODE_ENV === 'development' ? {
        message: error.message,
        stack: error.stack
      } : undefined
    });
  }
});

module.exports = router;
