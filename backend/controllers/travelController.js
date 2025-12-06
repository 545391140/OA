const mongoose = require('mongoose');
const Travel = require('../models/Travel');
const User = require('../models/User');
const Location = require('../models/Location');

// 辅助函数：尝试将字符串目的地转换为 Location ObjectId
const ensureLocationObjectId = async (destination) => {
  if (!destination) return destination;
  
  // 如果已经是 ObjectId，直接返回
  if (mongoose.Types.ObjectId.isValid(destination) && typeof destination !== 'string') {
    return destination;
  }
  
  // 如果是字符串（可能是 ObjectId 字符串，也可能是城市名）
  if (typeof destination === 'string') {
    // 先尝试看是不是有效的 ObjectId 字符串，但这比较模糊，因为城市名不太可能是 ObjectId
    // 我们主要处理城市名的情况
    
    // 尝试在 Location 表中查找
    const cityName = destination.split(',')[0].trim();
    const location = await Location.findOne({
      name: { $regex: new RegExp(`^${cityName}$`, 'i') },
      type: { $in: ['city', 'country'] }
    }).sort({ type: 1 });
    
    if (location) {
      return location._id;
    }
  }
  
  return destination;
};

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

    // 填充目的地信息（因为 destination 是 Mixed 类型，不能直接 populate，需要手动处理）
    // 收集所有 Location ID
    const locationIds = new Set();
    travels.forEach(travel => {
      if (travel.destination && mongoose.Types.ObjectId.isValid(travel.destination) && typeof travel.destination !== 'string') {
        locationIds.add(travel.destination.toString());
      }
    });
    
    // 如果有 Location ID，批量查询并替换
    if (locationIds.size > 0) {
      const locations = await Location.find({ _id: { $in: [...locationIds] } }).select('name city country');
      const locationMap = {};
      locations.forEach(loc => {
        locationMap[loc._id.toString()] = loc.name || loc.city; // 优先使用 name
      });
      
      // 替换 travels 中的 destination 为名称字符串（保持 API 兼容性）
      // 或者替换为对象？为了兼容前端可能期待字符串，我们这里可以替换为 Location 对象或保留为对象
      // 为了最佳兼容性，如果前端期待字符串，我们最好转换回字符串，或者前端能处理对象
      // 观察前端代码通常习惯，最好返回对象包含 name
      
      // 这里我们返回 Location 对象，因为前端通常会显示 name
      // 但要注意如果前端代码写死显示 travel.destination，那就会变成 [object Object]
      // 安全起见，我们给 destination 赋值为对象，前端应该能处理
      // 如果前端只把它当字符串渲染，我们需要确认前端逻辑。
      // 假设前端是 {travel.destination}，如果是对象会出问题。
      
      // 策略：如果原先是字符串，现在是对象，为了兼容，我们返回一个包含 toString 的对象？不现实。
      // 我们返回对象，并确保对象有 name 字段。
      // 绝大多数前端组件处理 Mixed 字段时会检查类型。
      
      travels.forEach(travel => {
        if (travel.destination && mongoose.Types.ObjectId.isValid(travel.destination) && typeof travel.destination !== 'string') {
           const locName = locationMap[travel.destination.toString()];
           if (locName) {
             // 暂时将 destination 替换为 Location 对象，包含 name
             // 为了兼容性，我们不仅替换为对象，还把 name 属性放进去
             // 但是 Mongoose document 是不可变的，除非转为 object
             // 这里 travels 是 Mongoose Documents 数组
             
             // 修改：我们不直接修改 destination 字段类型（这会违反 schema 验证如果再次保存）
             // 但这里是 response，我们可以调用 .toObject()
           }
        }
      });
    }
    
    // 将 mongoose 文档转换为普通对象以便修改
    const travelObjects = travels.map(t => t.toObject());
    
    if (locationIds.size > 0) {
       const locations = await Location.find({ _id: { $in: [...locationIds] } }).select('name city country');
       const locationMap = {};
       locations.forEach(loc => {
         locationMap[loc._id.toString()] = loc;
       });
       
       travelObjects.forEach(travel => {
         if (travel.destination && mongoose.Types.ObjectId.isValid(travel.destination) && typeof travel.destination !== 'string') {
            const loc = locationMap[travel.destination.toString()];
            if (loc) {
               // 这里有一个关键决策：是返回字符串还是对象？
               // 为了最小化前端破坏，如果前端只是展示 {travel.destination}，返回字符串最好。
               // 但如果前端想展示更多信息，对象好。
               // 鉴于我们做了 "Standard Match"，前端可能需要城市名。
               // 让我们把 destination 替换为 location.name (字符串)，这样最安全！
               // 但等等，如果我们在编辑页面，我们需要 ID 来绑定 Select 组件。
               // 所以列表页返回 name，详情页返回对象？
               
               // 妥协方案：destination 字段保留为 ID 或 对象，添加一个新的字段 destinationName
               // 或者，直接把 destination 变成对象 { _id, name }
               travel.destination = {
                 _id: loc._id,
                 name: loc.name || loc.city,
                 country: loc.country,
                 toString: () => loc.name || loc.city // 尝试 trick 也不行 JSON 序列化不认
               };
               // 还是替换为对象吧，前端 TravelList 通常会处理对象
             }
         }
       });
    }

    res.json({
      success: true,
      count: travelObjects.length,
      data: travelObjects
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
    let travel = await Travel.findById(req.params.id).lean(); // 使用 lean() 转换为普通对象
    
    if (travel) {
      // 手动处理 destination
      if (travel.destination && mongoose.Types.ObjectId.isValid(travel.destination) && typeof travel.destination !== 'string') {
         const location = await Location.findById(travel.destination).select('name city country');
         if (location) {
            travel.destination = {
              _id: location._id,
              name: location.name || location.city,
              country: location.country,
              type: location.type
            };
         }
      }

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
                } else {
                  // 如果找不到审批人，设置为 null（后续会被过滤）
                  approval.approver = null;
                }
              }
            }
            
            // 过滤掉 approver 为 null 的审批记录（审批人可能已被删除）
            travel.approvals = travel.approvals.filter(
              approval => approval.approver !== null && approval.approver !== undefined
            );
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
    // 如果是管理员，允许访问所有申请（包括employee为null的情况）
    if (req.user.role === 'admin') {
      // 管理员可以访问，继续执行
    } else {
      // 非管理员需要检查权限
      let employeeId;
      if (!travel.employee) {
        // 如果没有employee字段，在开发模式下允许访问，否则返回错误
        const isDevMode = !process.env.NODE_ENV || process.env.NODE_ENV === 'development';
        if (isDevMode) {
          console.warn('Travel request missing employee field, allowing access in dev mode:', req.params.id);
          // 在开发模式下允许访问，继续执行
        } else {
          console.error('Travel request missing employee field:', req.params.id);
          return res.status(500).json({
            success: false,
            message: 'Travel request data is incomplete'
          });
        }
      } else {
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
      }
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

    // 自动转换目的地为 ObjectId
    if (travelData.destination) {
      travelData.destination = await ensureLocationObjectId(travelData.destination);
    }
    if (travelData.outbound?.destination) {
      travelData.outbound.destination = await ensureLocationObjectId(travelData.outbound.destination);
    }
    if (travelData.inbound?.destination) {
      travelData.inbound.destination = await ensureLocationObjectId(travelData.inbound.destination);
    }
    if (travelData.multiCityRoutes && travelData.multiCityRoutes.length > 0) {
      for (let i = 0; i < travelData.multiCityRoutes.length; i++) {
        if (travelData.multiCityRoutes[i].destination) {
          travelData.multiCityRoutes[i].destination = await ensureLocationObjectId(travelData.multiCityRoutes[i].destination);
        }
      }
    }

    // 计算总费用（包含多程预算）
      const outboundTotal = Object.values(travelData.outboundBudget || {}).reduce((sum, item) => {
        return sum + (parseFloat(item.subtotal) || 0);
      }, 0);
      const inboundTotal = Object.values(travelData.inboundBudget || {}).reduce((sum, item) => {
        return sum + (parseFloat(item.subtotal) || 0);
      }, 0);
    const multiCityTotal = (travelData.multiCityRoutesBudget || []).reduce((total, budget) => {
      return total + Object.values(budget || {}).reduce((sum, item) => {
        return sum + (parseFloat(item.subtotal) || 0);
      }, 0);
    }, 0);
    
    const calculatedTotal = outboundTotal + inboundTotal + multiCityTotal;
    
    // 设置 estimatedCost 和 estimatedBudget（保持兼容性）
    travelData.estimatedCost = calculatedTotal;
    travelData.estimatedBudget = calculatedTotal;

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

    // 自动转换目的地为 ObjectId
    if (updateData.destination) {
      updateData.destination = await ensureLocationObjectId(updateData.destination);
    }
    if (updateData.outbound?.destination) {
      updateData.outbound.destination = await ensureLocationObjectId(updateData.outbound.destination);
    }
    if (updateData.inbound?.destination) {
      updateData.inbound.destination = await ensureLocationObjectId(updateData.inbound.destination);
    }
    if (updateData.multiCityRoutes && updateData.multiCityRoutes.length > 0) {
      for (let i = 0; i < updateData.multiCityRoutes.length; i++) {
        if (updateData.multiCityRoutes[i].destination) {
          updateData.multiCityRoutes[i].destination = await ensureLocationObjectId(updateData.multiCityRoutes[i].destination);
        }
      }
    }

    // 计算总费用（包含多程预算）
    if (updateData.outboundBudget || updateData.inboundBudget || updateData.multiCityRoutesBudget) {
      const outboundTotal = Object.values(updateData.outboundBudget || travel.outboundBudget || {}).reduce((sum, item) => {
        return sum + (parseFloat(item.subtotal) || 0);
      }, 0);
      const inboundTotal = Object.values(updateData.inboundBudget || travel.inboundBudget || {}).reduce((sum, item) => {
        return sum + (parseFloat(item.subtotal) || 0);
      }, 0);
      const multiCityTotal = (updateData.multiCityRoutesBudget || travel.multiCityRoutesBudget || []).reduce((total, budget) => {
        return total + Object.values(budget || {}).reduce((sum, item) => {
          return sum + (parseFloat(item.subtotal) || 0);
        }, 0);
      }, 0);
      
      const calculatedTotal = outboundTotal + inboundTotal + multiCityTotal;
      
      // 设置 estimatedCost 和 estimatedBudget（保持兼容性）
      updateData.estimatedCost = calculatedTotal;
      updateData.estimatedBudget = calculatedTotal;
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
};


