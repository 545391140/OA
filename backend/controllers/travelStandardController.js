const { validationResult } = require('express-validator');
const logger = require('../utils/logger');
const TravelStandard = require('../models/TravelStandard');
const { convertFromCNYSync } = require('../utils/currencyConverter');

// @desc    Get all travel standards
// @route   GET /api/travel-standards
// @access  Private
exports.getStandards = async (req, res) => {
  try {
    const { status, effectiveDate } = req.query;

    const query = {};
    if (status) {
      query.status = status;
    }
    if (effectiveDate) {
      query.effectiveDate = { $lte: new Date(effectiveDate) };
    }

    const standards = await TravelStandard.find(query)
      .populate('createdBy', 'firstName lastName email')
      .populate('updatedBy', 'firstName lastName email')
      .populate('expenseStandards.expenseItemId', 'itemName description')
      .sort({ priority: -1, effectiveDate: -1, createdAt: -1 }); // Sort by priority first

    // 过滤掉 expenseItemId 为 null 的项（关联的费用项可能已被删除）
    standards.forEach(standard => {
      if (standard.expenseStandards && Array.isArray(standard.expenseStandards)) {
        standard.expenseStandards = standard.expenseStandards.filter(
          es => es.expenseItemId !== null && es.expenseItemId !== undefined
        );
      }
    });

    res.json({
      success: true,
      count: standards.length,
      data: standards
    });
  } catch (error) {
    logger.error('Get standards error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Get travel standard by ID
// @route   GET /api/travel-standards/:id
// @access  Private
exports.getStandardById = async (req, res) => {
  try {
    const standard = await TravelStandard.findById(req.params.id)
      .populate('createdBy', 'firstName lastName email')
      .populate('updatedBy', 'firstName lastName email')
      .populate('expenseStandards.expenseItemId', 'itemName description amount');

    if (!standard) {
      return res.status(404).json({
        success: false,
        message: 'Travel standard not found'
      });
    }

    // 过滤掉 expenseItemId 为 null 的项（关联的费用项可能已被删除）
    if (standard.expenseStandards && Array.isArray(standard.expenseStandards)) {
      standard.expenseStandards = standard.expenseStandards.filter(
        es => es.expenseItemId !== null && es.expenseItemId !== undefined
      );
    }

    res.json({
      success: true,
      data: standard
    });
  } catch (error) {
    logger.error('Get standard error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Create new travel standard
// @route   POST /api/travel-standards
// @access  Private (Finance/Admin only)
exports.createStandard = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation errors',
        errors: errors.array()
      });
    }

    // 处理 expenseStandards 中的 expenseItemId 转换
    const processedBody = { ...req.body };
    if (processedBody.expenseStandards && Array.isArray(processedBody.expenseStandards)) {
      processedBody.expenseStandards = processedBody.expenseStandards
        .map(es => {
          const processedEs = { ...es };
          // 确保 expenseItemId 是有效的 ObjectId 字符串
          if (processedEs.expenseItemId) {
            // 如果是对象（排除 null），提取 _id；如果是字符串，直接使用
            if (processedEs.expenseItemId !== null && processedEs.expenseItemId !== undefined && typeof processedEs.expenseItemId === 'object' && processedEs.expenseItemId._id) {
              processedEs.expenseItemId = processedEs.expenseItemId._id;
            } else if (typeof processedEs.expenseItemId === 'string') {
              // 已经是字符串，保持不变（Mongoose会自动转换）
              processedEs.expenseItemId = processedEs.expenseItemId;
            }
          }
          return processedEs;
        })
        .filter(es => es.expenseItemId !== null && es.expenseItemId !== undefined && es.expenseItemId !== ''); // 过滤掉无效的项
    }

    const standardData = {
      ...processedBody,
      createdBy: req.user.id || req.user._id,
      updatedBy: req.user.id || req.user._id
    };

    logger.debug('[CREATE] Standard data:', JSON.stringify({
      ...standardData,
      conditionGroupsLength: standardData.conditionGroups?.length,
      expenseStandardsLength: standardData.expenseStandards?.length,
      expenseStandards: standardData.expenseStandards?.map(es => ({
        ...es,
        expenseItemId: es.expenseItemId?.toString() || es.expenseItemId
      })),
      conditionGroups: standardData.conditionGroups
    }, null, 2));

    const standard = await TravelStandard.create(standardData);

    logger.debug('[CREATE] Created standard (from DB):', JSON.stringify({
      _id: standard._id,
      conditionGroupsLength: standard.conditionGroups?.length,
      expenseStandardsLength: standard.expenseStandards?.length,
      hasConditionGroups: Array.isArray(standard.conditionGroups),
      hasExpenseStandards: Array.isArray(standard.expenseStandards),
      conditionGroups: standard.conditionGroups,
      expenseStandards: standard.expenseStandards
    }, null, 2));

    // Populate expenseStandards after creation
    const populatedStandard = await TravelStandard.findById(standard._id)
      .populate('expenseStandards.expenseItemId', 'itemName description amount');

    // 过滤掉 expenseItemId 为 null 的项（关联的费用项可能已被删除）
    if (populatedStandard.expenseStandards && Array.isArray(populatedStandard.expenseStandards)) {
      populatedStandard.expenseStandards = populatedStandard.expenseStandards.filter(
        es => es.expenseItemId !== null && es.expenseItemId !== undefined
      );
    }

    res.status(201).json({
      success: true,
      message: 'Travel standard created successfully',
      data: populatedStandard
    });
  } catch (error) {
    logger.error('Create standard error:', error);
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Standard code already exists'
      });
    }
    res.status(500).json({
      success: false,
      message: 'Server error: ' + (error.message || 'Unknown error')
    });
  }
};

// @desc    Update travel standard
// @route   PUT /api/travel-standards/:id
// @access  Private (Finance/Admin only)
exports.updateStandard = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation errors',
        errors: errors.array()
      });
    }

    logger.debug('[UPDATE] Received req.body:', JSON.stringify({
      conditionGroupsLength: req.body.conditionGroups?.length,
      expenseStandardsLength: req.body.expenseStandards?.length,
      conditionGroups: req.body.conditionGroups,
      expenseStandards: req.body.expenseStandards
    }, null, 2));

    // 处理 expenseStandards 中的 expenseItemId 转换
    const processedBody = { ...req.body };
    if (processedBody.expenseStandards && Array.isArray(processedBody.expenseStandards)) {
      processedBody.expenseStandards = processedBody.expenseStandards
        .map(es => {
          const processedEs = { ...es };
          // 确保 expenseItemId 是有效的 ObjectId 字符串
          if (processedEs.expenseItemId) {
            // 如果是对象（排除 null），提取 _id；如果是字符串，直接使用
            if (processedEs.expenseItemId !== null && processedEs.expenseItemId !== undefined && typeof processedEs.expenseItemId === 'object' && processedEs.expenseItemId._id) {
              processedEs.expenseItemId = processedEs.expenseItemId._id;
            } else if (typeof processedEs.expenseItemId === 'string') {
              // 已经是字符串，保持不变（Mongoose会自动转换）
              processedEs.expenseItemId = processedEs.expenseItemId;
            }
          }
          return processedEs;
        })
        .filter(es => es.expenseItemId !== null && es.expenseItemId !== undefined && es.expenseItemId !== ''); // 过滤掉无效的项
    }

    logger.debug('[UPDATE] Processed update data:', JSON.stringify({
      ...processedBody,
      expenseStandards: processedBody.expenseStandards?.map(es => ({
        ...es,
        expenseItemId: es.expenseItemId?.toString() || es.expenseItemId
      })),
      conditionGroups: processedBody.conditionGroups,
      conditionGroupsLength: processedBody.conditionGroups?.length,
      expenseStandardsLength: processedBody.expenseStandards?.length
    }, null, 2));

    // 使用$set确保嵌套数组被正确更新
    const updateData = {
      ...processedBody,
      updatedBy: req.user.id || req.user._id
    };

    // 明确设置嵌套数组字段
    if (processedBody.conditionGroups !== undefined) {
      updateData.conditionGroups = processedBody.conditionGroups;
    }
    if (processedBody.expenseStandards !== undefined) {
      updateData.expenseStandards = processedBody.expenseStandards;
    }
    if (processedBody.expenseItemsConfigured !== undefined) {
      updateData.expenseItemsConfigured = processedBody.expenseItemsConfigured;
    }

    // 先查找标准，确保存在
    const existingStandard = await TravelStandard.findById(req.params.id);
    if (!existingStandard) {
      return res.status(404).json({
        success: false,
        message: 'Travel standard not found'
      });
    }

    logger.debug('[UPDATE] Before update - existingStandard conditionGroups:', existingStandard.conditionGroups?.length || 0);
    logger.debug('[UPDATE] Before update - existingStandard expenseStandards:', existingStandard.expenseStandards?.length || 0);
    logger.debug('[UPDATE] updateData keys:', Object.keys(updateData));
    
    // 使用 findByIdAndUpdate 配合 $set 来确保嵌套数组被正确更新
    // 这是更可靠的方法来更新嵌套数组
    const $setData = {};
    Object.keys(updateData).forEach(key => {
      if (updateData[key] !== undefined) {
        $setData[key] = updateData[key];
        logger.debug(`[UPDATE] Adding to $set: ${key}`, 
          Array.isArray(updateData[key]) ? `ARRAY(${updateData[key].length})` : 
          typeof updateData[key]);
      }
    });

    logger.debug('[UPDATE] $setData conditionGroups length:', $setData.conditionGroups?.length || 0);
    logger.debug('[UPDATE] $setData expenseStandards length:', $setData.expenseStandards?.length || 0);

    try {
      const updatedStandard = await TravelStandard.findByIdAndUpdate(
        req.params.id,
        { $set: $setData },
        { 
          new: true, 
          runValidators: true,
          setDefaultsOnInsert: false
        }
      );
      
      if (!updatedStandard) {
        return res.status(404).json({
          success: false,
          message: 'Travel standard not found'
        });
      }

      logger.debug('[UPDATE] After findByIdAndUpdate - conditionGroups:', updatedStandard.conditionGroups?.length || 0);
      logger.debug('[UPDATE] After findByIdAndUpdate - expenseStandards:', updatedStandard.expenseStandards?.length || 0);
      logger.debug('[UPDATE] Save successful via findByIdAndUpdate');
    } catch (saveError) {
      logger.error('[UPDATE] Save error:', saveError);
      throw saveError;
    }

    // 重新查询并populate（强制从数据库查询，不使用缓存）
    // 注意：由于已经使用 findByIdAndUpdate 返回了 updatedStandard，可以直接使用它
    // 但为了确保 populate 正确，我们重新查询
    const standardDoc = await TravelStandard.findById(req.params.id)
      .populate('expenseStandards.expenseItemId', 'itemName description amount');

    // 过滤掉 expenseItemId 为 null 的项（关联的费用项可能已被删除）
    if (standardDoc.expenseStandards && Array.isArray(standardDoc.expenseStandards)) {
      standardDoc.expenseStandards = standardDoc.expenseStandards.filter(
        es => es.expenseItemId !== null && es.expenseItemId !== undefined
      );
    }

    logger.debug('[UPDATE] Saved standard (from DB after save):', JSON.stringify({
      _id: standardDoc._id.toString(),
      conditionGroupsLength: standardDoc.conditionGroups?.length || 0,
      expenseStandardsLength: standardDoc.expenseStandards?.length || 0,
      hasConditionGroups: Array.isArray(standardDoc.conditionGroups),
      hasExpenseStandards: Array.isArray(standardDoc.expenseStandards),
      conditionGroups: standardDoc.conditionGroups || [],
      expenseStandards: (standardDoc.expenseStandards || []).map(es => ({
        expenseItemId: es.expenseItemId?._id?.toString() || es.expenseItemId?.toString(),
        limitType: es.limitType,
        limitAmount: es.limitAmount
      }))
    }, null, 2));

    res.json({
      success: true,
      message: 'Travel standard updated successfully',
      data: standardDoc
    });
  } catch (error) {
    logger.error('Update standard error:', error);
    logger.error('Update standard error stack:', error.stack);
    res.status(500).json({
      success: false,
      message: 'Server error: ' + (error.message || 'Unknown error')
    });
  }
};

// @desc    Delete travel standard
// @route   DELETE /api/travel-standards/:id
// @access  Private (Admin only)
exports.deleteStandard = async (req, res) => {
  try {
    const standard = await TravelStandard.findById(req.params.id);

    if (!standard) {
      return res.status(404).json({
        success: false,
        message: 'Travel standard not found'
      });
    }

    // Check if standard is active
    if (standard.status === 'active') {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete active standard. Please deactivate it first.'
      });
    }

    await standard.deleteOne();

    res.json({
      success: true,
      message: 'Travel standard deleted successfully'
    });
  } catch (error) {
    logger.error('Delete standard error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Activate travel standard
// @route   PUT /api/travel-standards/:id/activate
// @access  Private (Finance/Admin only)
exports.activateStandard = async (req, res) => {
  try {
    const standard = await TravelStandard.findByIdAndUpdate(
      req.params.id,
      {
        status: 'active',
        updatedBy: req.user.id || req.user._id
      },
      { new: true }
    );

    if (!standard) {
      return res.status(404).json({
        success: false,
        message: 'Travel standard not found'
      });
    }

    res.json({
      success: true,
      message: 'Travel standard activated successfully',
      data: standard
    });
  } catch (error) {
    logger.error('Activate standard error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Deactivate travel standard
// @route   PUT /api/travel-standards/:id/deactivate
// @access  Private (Finance/Admin only)
exports.deactivateStandard = async (req, res) => {
  try {
    const standard = await TravelStandard.findByIdAndUpdate(
      req.params.id,
      {
        status: 'expired',
        updatedBy: req.user.id || req.user._id
      },
      { new: true }
    );

    if (!standard) {
      return res.status(404).json({
        success: false,
        message: 'Travel standard not found'
      });
    }

    res.json({
      success: true,
      message: 'Travel standard deactivated successfully',
      data: standard
    });
  } catch (error) {
    logger.error('Deactivate standard error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Match travel standard based on conditions
// @route   POST /api/travel-standards/match
// @access  Private
exports.matchStandard = async (req, res) => {
  try {
    const { country, city, cityLevel, positionLevel, department, projectCode, role, position, currency } = req.body;
    // 获取目标币种，默认为CNY（差旅标准的基础币种）
    const targetCurrency = currency || 'CNY';
    const now = new Date();
    
    // 核心逻辑：从用户信息中获取所有可能用于匹配的条件
    // 确保所有差旅标准配置时涉及到的条件都被查询
    const User = require('../models/User');
    const user = await User.findById(req.user.id).select('role position jobLevel department');
    
    // 优先使用请求参数，如果请求参数为空，则使用用户信息
    // 这样前端可以覆盖用户信息（例如选择不同的部门或项目）
    const matchParams = {
      country: country || '',
      city: city || '',
      cityLevel: cityLevel || '',
      positionLevel: positionLevel || (user?.jobLevel || ''),
      department: department || (user?.department || ''),
      projectCode: projectCode || '',
      role: role || (user?.role || ''),
      position: position || (user?.position || '')
    };
    
    // 通过城市和国家名称查找对应的 Location ID（用于 ID 匹配）
    const Location = require('../models/Location');
    if (matchParams.city) {
      try {
        const cityLocation = await Location.findOne({
          $or: [
            { name: matchParams.city },
            { city: matchParams.city }
          ],
          type: 'city',
          status: 'active'
        });
        if (cityLocation) {
          matchParams.cityLocationId = cityLocation._id;
          logger.debug(`[STANDARD_MATCH] Found city location ID: ${cityLocation._id} for city: ${matchParams.city}`);
        }
      } catch (err) {
        logger.warn(`[STANDARD_MATCH] Failed to find city location:`, err);
      }
    }
    
    if (matchParams.country) {
      try {
        const countryLocation = await Location.findOne({
          $or: [
            { name: matchParams.country },
            { country: matchParams.country }
          ],
          type: 'country',
          status: 'active'
        });
        if (countryLocation) {
          matchParams.countryLocationId = countryLocation._id;
          logger.debug(`[STANDARD_MATCH] Found country location ID: ${countryLocation._id} for country: ${matchParams.country}`);
        }
      } catch (err) {
        logger.warn(`[STANDARD_MATCH] Failed to find country location:`, err);
      }
    }
    
    // 记录匹配参数，便于调试
    logger.debug(`[STANDARD_MATCH] Matching standards with params:`, {
      userId: req.user.id,
      ...matchParams,
      source: {
        role: role ? 'request' : (user?.role ? 'user' : 'empty'),
        position: position ? 'request' : (user?.position ? 'user' : 'empty'),
        department: department ? 'request' : (user?.department ? 'user' : 'empty'),
        positionLevel: positionLevel ? 'request' : (user?.jobLevel ? 'user' : 'empty')
      }
    });

    // Find all active standards
    // 注意：Mongoose 默认不会缓存查询结果，每次查询都会从数据库获取最新数据
    const standards = await TravelStandard.find({
      status: 'active',
      effectiveDate: { $lte: now },
      $or: [
        { expiryDate: { $gte: now } },
        { expiryDate: null }
      ]
    })
      .populate('expenseStandards.expenseItemId')
      .sort({ priority: -1, effectiveDate: -1 }); // Sort by priority (highest first)
    
    // 添加调试日志，检查条件组数据
    logger.debug(`[STANDARD_MATCH] Found ${standards.length} active standards`);
    standards.forEach((std, index) => {
      logger.debug(`[STANDARD_MATCH] Standard ${index + 1}: ${std.standardCode}, conditionGroups: ${std.conditionGroups?.length || 0}`);
      if (std.conditionGroups && std.conditionGroups.length > 0) {
        std.conditionGroups.forEach((group, gIndex) => {
          const cityConditions = group.conditions?.filter(c => c.type === 'city') || [];
          if (cityConditions.length > 0) {
            logger.debug(`[STANDARD_MATCH]   Group ${gIndex + 1} city conditions:`, cityConditions.map(c => `${c.operator} ${c.value}`).join(', '));
          }
        });
      }
    });

    // Test each standard against conditions and collect all matched standards
    // 核心逻辑：对每个标准，检查其条件组中的所有条件是否匹配
    const matchedStandards = [];
    
    for (const standard of standards) {
      // 匹配条件：检查标准的所有条件组
      // 条件组之间是OR关系，组内条件是AND关系
      if (matchConditions(standard, matchParams)) {
        matchedStandards.push(standard);
        logger.debug(`[STANDARD_MATCH] Standard matched: ${standard.standardCode} (${standard.standardName})`);
      }
    }

    if (matchedStandards.length === 0) {
      return res.json({
        success: true,
        data: {
          matched: false,
          message: '未找到匹配的差旅标准'
        }
      });
    }

    // 匹配策略：合并最优（Merge Best）
    // 如果有多个标准匹配，合并所有匹配标准的费用项，每个费用项取最优限额
    // 策略说明：
    // 1. 优先级策略（PRIORITY）：只使用优先级最高的标准（第一个匹配的）
    // 2. 合并最优策略（MERGE_BEST）：合并所有匹配标准，每个费用项取最高限额（对员工最有利）
    // 3. 合并所有策略（MERGE_ALL）：合并所有匹配标准的所有费用项
    
    const matchStrategy = req.body.matchStrategy || 'MERGE_BEST'; // 默认使用合并最优策略

    let primaryStandard = matchedStandards[0]; // 优先级最高的标准作为主标准
    let expenses = {};

    if (matchStrategy === 'PRIORITY') {
      // 策略1：只使用优先级最高的标准（原始逻辑）
      primaryStandard = matchedStandards[0];
      expenses = buildExpensesFromStandard(primaryStandard, targetCurrency);
    } else if (matchStrategy === 'MERGE_BEST') {
      // 策略2：合并最优 - 合并所有匹配标准，每个费用项取最高限额
      expenses = mergeExpensesBest(matchedStandards, targetCurrency);
    } else if (matchStrategy === 'MERGE_ALL') {
      // 策略3：合并所有 - 合并所有匹配标准的所有费用项
      expenses = mergeExpensesAll(matchedStandards, targetCurrency);
    }

    // 构建响应，包含所有匹配的标准信息
    const matchedStandardsInfo = matchedStandards.map(std => ({
      _id: std._id,
      standardCode: std.standardCode,
      standardName: std.standardName,
      priority: std.priority
    }));

    // 记录匹配日志
    logger.debug(`[STANDARD_MATCH] Matched ${matchedStandards.length} standards for user:`, {
      userId: req.user.id,
      matchParams: matchParams,
      matchedStandards: matchedStandardsInfo.map(s => ({
        code: s.standardCode,
        name: s.standardName,
        priority: s.priority
      }))
    });

    res.json({
      success: true,
      data: {
        matched: true,
        matchStrategy: matchStrategy,
        matchedCount: matchedStandards.length,
        primaryStandard: {
          _id: primaryStandard._id,
          standardCode: primaryStandard.standardCode,
          standardName: primaryStandard.standardName,
          priority: primaryStandard.priority
        },
        allMatchedStandards: matchedStandardsInfo, // 所有匹配的标准
        matchParams: matchParams, // 返回匹配参数，便于前端调试
        expenses
      }
    });
  } catch (error) {
    logger.error('Match standard error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during standard matching'
    });
  }
};

// Helper function to build expenses object from a single standard
function buildExpensesFromStandard(standard, targetCurrency = 'CNY') {
  const expenses = {};
  if (standard.expenseStandards && standard.expenseStandards.length > 0) {
    standard.expenseStandards.forEach(es => {
      const itemId = es.expenseItemId?._id?.toString() || es.expenseItemId?.toString();
      const itemName = es.expenseItemId?.itemName || '未知';
      const category = es.expenseItemId?.category || 'general';
      const parentItem = es.expenseItemId?.parentItem || null;
      
      // 差旅标准按CNY维护，需要根据目标币种进行换算
      if (es.limitType === 'FIXED') {
        const limitCNY = es.limitAmount || 0;
        const limitConverted = convertFromCNYSync(limitCNY, targetCurrency);
        expenses[itemId] = {
          itemName,
          category,
          parentItem,
          limit: limitConverted,
          limitCNY: limitCNY, // 保留原始CNY金额，便于前端显示
          unit: es.calcUnit === 'PER_DAY' ? '元/天' : es.calcUnit === 'PER_TRIP' ? '元/次' : '元/公里',
          calcUnit: es.calcUnit || 'PER_DAY',
          limitType: 'FIXED',
          sourceStandard: standard.standardCode,
          currency: targetCurrency
        };
      } else if (es.limitType === 'RANGE') {
        const limitMinCNY = es.limitMin || 0;
        const limitMaxCNY = es.limitMax || 0;
        const limitMinConverted = convertFromCNYSync(limitMinCNY, targetCurrency);
        const limitMaxConverted = convertFromCNYSync(limitMaxCNY, targetCurrency);
        expenses[itemId] = {
          itemName,
          category,
          parentItem,
          type: `范围: ${limitMinConverted}~${limitMaxConverted}${targetCurrency}`,
          limitMin: limitMinConverted,
          limitMax: limitMaxConverted,
          limitMinCNY: limitMinCNY,
          limitMaxCNY: limitMaxCNY,
          limitType: 'RANGE',
          sourceStandard: standard.standardCode,
          currency: targetCurrency
        };
      } else if (es.limitType === 'ACTUAL') {
        expenses[itemId] = {
          itemName,
          category,
          parentItem,
          type: '实报实销',
          limitType: 'ACTUAL',
          sourceStandard: standard.standardCode,
          currency: targetCurrency
        };
      } else if (es.limitType === 'PERCENTAGE') {
        const baseAmountCNY = es.baseAmount || 0;
        const baseAmountConverted = convertFromCNYSync(baseAmountCNY, targetCurrency);
        expenses[itemId] = {
          itemName,
          category,
          parentItem,
          type: `按比例: ${es.percentage || 0}% (基准: ${baseAmountConverted}${targetCurrency})`,
          percentage: es.percentage || 0,
          baseAmount: baseAmountConverted,
          baseAmountCNY: baseAmountCNY,
          limitType: 'PERCENTAGE',
          sourceStandard: standard.standardCode,
          currency: targetCurrency
        };
      }
    });
  }
  return expenses;
}

// Helper function to merge expenses from multiple standards, taking the best (highest) limit for each expense item
function mergeExpensesBest(standards, targetCurrency = 'CNY') {
  const mergedExpenses = {};
  
  standards.forEach(standard => {
    if (standard.expenseStandards && standard.expenseStandards.length > 0) {
      standard.expenseStandards.forEach(es => {
        const itemId = es.expenseItemId?._id?.toString() || es.expenseItemId?.toString();
        const itemName = es.expenseItemId?.itemName || '未知';
        const category = es.expenseItemId?.category || 'general';
        const parentItem = es.expenseItemId?.parentItem || null;
        
        if (!mergedExpenses[itemId]) {
          // 首次遇到该费用项，直接添加
        if (es.limitType === 'FIXED') {
          const limitCNY = es.limitAmount || 0;
          const limitConverted = convertFromCNYSync(limitCNY, targetCurrency);
          mergedExpenses[itemId] = {
            itemName,
            category,
            parentItem,
            limit: limitConverted,
            limitCNY: limitCNY,
            unit: es.calcUnit === 'PER_DAY' ? '元/天' : es.calcUnit === 'PER_TRIP' ? '元/次' : '元/公里',
            calcUnit: es.calcUnit || 'PER_DAY',
            limitType: 'FIXED',
            sourceStandards: [standard.standardCode],
            currency: targetCurrency
          };
        } else if (es.limitType === 'RANGE') {
          const limitMinCNY = es.limitMin || 0;
          const limitMaxCNY = es.limitMax || 0;
          const limitMinConverted = convertFromCNYSync(limitMinCNY, targetCurrency);
          const limitMaxConverted = convertFromCNYSync(limitMaxCNY, targetCurrency);
          mergedExpenses[itemId] = {
            itemName,
            category,
            parentItem,
            type: `范围: ${limitMinConverted}~${limitMaxConverted}${targetCurrency}`,
            limitMin: limitMinConverted,
            limitMax: limitMaxConverted,
            limitMinCNY: limitMinCNY,
            limitMaxCNY: limitMaxCNY,
            limitType: 'RANGE',
            sourceStandards: [standard.standardCode],
            currency: targetCurrency
          };
        } else if (es.limitType === 'ACTUAL') {
          mergedExpenses[itemId] = {
            itemName,
            category,
            parentItem,
            type: '实报实销',
            limitType: 'ACTUAL',
            sourceStandards: [standard.standardCode],
            currency: targetCurrency
          };
        } else if (es.limitType === 'PERCENTAGE') {
          const baseAmountCNY = es.baseAmount || 0;
          const baseAmountConverted = convertFromCNYSync(baseAmountCNY, targetCurrency);
          mergedExpenses[itemId] = {
            itemName,
            category,
            parentItem,
            type: `按比例: ${es.percentage || 0}% (基准: ${baseAmountConverted}${targetCurrency})`,
            percentage: es.percentage || 0,
            baseAmount: baseAmountConverted,
            baseAmountCNY: baseAmountCNY,
            limitType: 'PERCENTAGE',
            sourceStandards: [standard.standardCode],
            currency: targetCurrency
          };
        }
        } else {
          // 已存在该费用项，合并最优值
          const existing = mergedExpenses[itemId];
          
          // 如果新的是实报实销，优先使用
          if (es.limitType === 'ACTUAL') {
            mergedExpenses[itemId] = {
              ...existing,
              type: '实报实销',
              limitType: 'ACTUAL',
              sourceStandards: [...(existing.sourceStandards || []), standard.standardCode]
            };
          }
          // 如果新的是固定限额，且金额更高，则更新（比较CNY金额）
          else if (es.limitType === 'FIXED' && existing.limitType === 'FIXED') {
            const newLimitCNY = es.limitAmount || 0;
            const existingLimitCNY = existing.limitCNY || 0;
            if (newLimitCNY > existingLimitCNY) {
              const limitConverted = convertFromCNYSync(newLimitCNY, targetCurrency);
              mergedExpenses[itemId] = {
                ...existing,
                limit: limitConverted,
                limitCNY: newLimitCNY,
                unit: es.calcUnit === 'PER_DAY' ? '元/天' : es.calcUnit === 'PER_TRIP' ? '元/次' : '元/公里',
                calcUnit: es.calcUnit || 'PER_DAY',
                sourceStandards: [...(existing.sourceStandards || []), standard.standardCode]
              };
            } else {
              // 保留现有的更高限额，但记录来源
              if (!existing.sourceStandards.includes(standard.standardCode)) {
                existing.sourceStandards.push(standard.standardCode);
              }
            }
          }
          // 如果新的是范围限额，取最大范围（比较CNY金额）
          else if (es.limitType === 'RANGE' && existing.limitType === 'RANGE') {
            const newMinCNY = es.limitMin || 0;
            const newMaxCNY = es.limitMax || 0;
            const existingMinCNY = existing.limitMinCNY || 0;
            const existingMaxCNY = existing.limitMaxCNY || 0;
            const newMin = Math.min(existingMinCNY, newMinCNY);
            const newMax = Math.max(existingMaxCNY, newMaxCNY);
            const limitMinConverted = convertFromCNYSync(newMin, targetCurrency);
            const limitMaxConverted = convertFromCNYSync(newMax, targetCurrency);
            mergedExpenses[itemId] = {
              ...existing,
              type: `范围: ${limitMinConverted}~${limitMaxConverted}${targetCurrency}`,
              limitMin: limitMinConverted,
              limitMax: limitMaxConverted,
              limitMinCNY: newMin,
              limitMaxCNY: newMax,
              sourceStandards: [...(existing.sourceStandards || []), standard.standardCode]
            };
          }
          // 其他情况，记录来源但不合并（保持原有逻辑）
          else {
            if (!existing.sourceStandards.includes(standard.standardCode)) {
              existing.sourceStandards.push(standard.standardCode);
            }
          }
        }
      });
    }
  });
  
  return mergedExpenses;
}

// Helper function to merge all expenses from multiple standards (including duplicates)
function mergeExpensesAll(standards, targetCurrency = 'CNY') {
  const mergedExpenses = {};
  
  standards.forEach(standard => {
    if (standard.expenseStandards && standard.expenseStandards.length > 0) {
      standard.expenseStandards.forEach(es => {
        const itemId = es.expenseItemId?._id?.toString() || es.expenseItemId?.toString();
        const itemName = es.expenseItemId?.itemName || '未知';
        
        // 为每个标准创建独立的费用项（添加标准代码作为后缀）
        const uniqueKey = `${itemId}_${standard.standardCode}`;
        
        if (es.limitType === 'FIXED') {
          const limitCNY = es.limitAmount || 0;
          const limitConverted = convertFromCNYSync(limitCNY, targetCurrency);
          mergedExpenses[uniqueKey] = {
            itemName: `${itemName} (${standard.standardCode})`,
            limit: limitConverted,
            limitCNY: limitCNY,
            unit: es.calcUnit === 'PER_DAY' ? '元/天' : es.calcUnit === 'PER_TRIP' ? '元/次' : '元/公里',
            calcUnit: es.calcUnit || 'PER_DAY',
            limitType: 'FIXED',
            sourceStandard: standard.standardCode,
            currency: targetCurrency
          };
        } else if (es.limitType === 'RANGE') {
          const limitMinCNY = es.limitMin || 0;
          const limitMaxCNY = es.limitMax || 0;
          const limitMinConverted = convertFromCNYSync(limitMinCNY, targetCurrency);
          const limitMaxConverted = convertFromCNYSync(limitMaxCNY, targetCurrency);
          mergedExpenses[uniqueKey] = {
            itemName: `${itemName} (${standard.standardCode})`,
            type: `范围: ${limitMinConverted}~${limitMaxConverted}${targetCurrency}`,
            limitMin: limitMinConverted,
            limitMax: limitMaxConverted,
            limitMinCNY: limitMinCNY,
            limitMaxCNY: limitMaxCNY,
            limitType: 'RANGE',
            sourceStandard: standard.standardCode,
            currency: targetCurrency
          };
        } else if (es.limitType === 'ACTUAL') {
          mergedExpenses[uniqueKey] = {
            itemName: `${itemName} (${standard.standardCode})`,
            type: '实报实销',
            limitType: 'ACTUAL',
            sourceStandard: standard.standardCode,
            currency: targetCurrency
          };
        } else if (es.limitType === 'PERCENTAGE') {
          const baseAmountCNY = es.baseAmount || 0;
          const baseAmountConverted = convertFromCNYSync(baseAmountCNY, targetCurrency);
          mergedExpenses[uniqueKey] = {
            itemName: `${itemName} (${standard.standardCode})`,
            type: `按比例: ${es.percentage || 0}% (基准: ${baseAmountConverted}${targetCurrency})`,
            percentage: es.percentage || 0,
            baseAmount: baseAmountConverted,
            baseAmountCNY: baseAmountCNY,
            limitType: 'PERCENTAGE',
            sourceStandard: standard.standardCode,
            currency: targetCurrency
          };
        }
      });
    }
  });
  
  return mergedExpenses;
}

// Helper function to match conditions
// 核心逻辑：匹配差旅标准的所有条件组
// 条件组之间是OR关系：只要有一个组匹配成功，标准就匹配
// 组内条件是AND关系：组内所有条件都必须匹配
function matchConditions(standard, testData) {
  const { country, city, cityLevel, positionLevel, department, projectCode, role, position } = testData;
  
  // 如果没有条件组，匹配所有（无限制）
  if (!standard.conditionGroups || standard.conditionGroups.length === 0) {
    return true;
  }

  // 核心逻辑：遍历所有条件组，只要有一个组匹配成功，就返回true
  // Group之间是OR关系
  for (const group of standard.conditionGroups) {
    if (matchConditionGroup(group, testData)) {
      return true;
    }
  }

  return false;
}

// Helper function to match a condition group
// 核心逻辑：匹配条件组内的所有条件
// 组内条件是AND关系：所有条件都必须匹配
function matchConditionGroup(group, testData) {
  const { country, city, cityLevel, positionLevel, department, projectCode, role, position } = testData;
  
  // 如果条件组为空，匹配所有（无限制）
  if (!group.conditions || group.conditions.length === 0) {
    return true;
  }

  // 核心逻辑：组内所有条件都必须匹配（AND关系）
  // 只要有一个条件不匹配，整个组就不匹配
  for (const condition of group.conditions) {
    if (!matchSingleCondition(condition, testData)) {
      return false;
    }
  }

  return true;
}

// Helper function to match a single condition
// 核心逻辑：匹配差旅标准配置中的单个条件
// 支持的条件类型：country, city, city_level, position_level, role, position, department, project_code
// 优先使用 Location ID 匹配（解决名称变更后匹配失效的问题），降级到名称匹配（兼容旧数据）
function matchSingleCondition(condition, testData) {
  const { country, city, cityLevel, positionLevel, department, projectCode, role, position, cityLocationId, countryLocationId } = testData;
  const { type, operator, value, locationIds } = condition;

  // 优先使用 Location ID 匹配（适用于 city 和 country 类型）
  if ((type === 'city' || type === 'country') && locationIds && Array.isArray(locationIds) && locationIds.length > 0) {
    const testLocationId = type === 'city' ? cityLocationId : countryLocationId;
    
    if (testLocationId) {
      // 使用 Location ID 进行匹配
      const testIdString = testLocationId.toString();
      const conditionIds = locationIds.map(id => id.toString());
      
      switch (operator) {
        case 'IN':
          // IN: 测试 Location ID 在条件 Location ID 列表中
          if (conditionIds.includes(testIdString)) {
            logger.debug(`[STANDARD_MATCH] Matched by Location ID: ${testIdString} IN [${conditionIds.join(', ')}]`);
            return true;
          }
          // ID 不匹配，降级到名称匹配
          break;
        case 'NOT_IN':
          // NOT_IN: 测试 Location ID 不在条件 Location ID 列表中
          if (!conditionIds.includes(testIdString)) {
            logger.debug(`[STANDARD_MATCH] Matched by Location ID: ${testIdString} NOT_IN [${conditionIds.join(', ')}]`);
            return true;
          }
          // ID 在排除列表中，不匹配
          return false;
        case 'EQUAL':
          // EQUAL: 测试 Location ID 等于条件 Location ID 列表中的任意一个
          if (conditionIds.includes(testIdString)) {
            logger.debug(`[STANDARD_MATCH] Matched by Location ID: ${testIdString} EQUAL [${conditionIds.join(', ')}]`);
            return true;
          }
          // ID 不匹配，降级到名称匹配
          break;
        default:
          // 其他操作符（>=, <=）不适用于 ID 匹配，降级到名称匹配
          break;
      }
    }
  }

  let testValue = '';
  
  // 根据条件类型获取对应的测试值（降级到名称匹配，兼容旧数据）
  // 核心逻辑：所有差旅标准配置时涉及到的条件都要查询
  switch (type) {
    case 'country':
      testValue = country || '';
      break;
    case 'city':
      testValue = city || '';
      break;
    case 'city_level':
      testValue = String(cityLevel || '');
      break;
    case 'position_level':
      testValue = String(positionLevel || '');
      break;
    case 'role':
      testValue = role || '';
      break;
    case 'position':
      testValue = position || '';
      break;
    case 'department':
      testValue = department || '';
      break;
    case 'project_code':
      testValue = projectCode || '';
      break;
    default:
      logger.warn(`[STANDARD_MATCH] Unknown condition type: ${type}`);
      return false;
  }

  // 解析条件值（支持逗号分隔的多个值）
  const values = value.split(',').map(v => v.trim()).filter(v => v);
  
  if (values.length === 0) {
    return false; // 如果条件值为空，不匹配
  }

  // 根据操作符进行匹配
  switch (operator) {
    case 'IN':
      // IN: 测试值在条件值列表中（支持双向包含匹配，处理"北京"和"北京市"的情况）
      return values.some(v => {
        const vLower = v.toLowerCase().trim();
        const testLower = testValue.toLowerCase().trim();
        // 精确匹配
        if (vLower === testLower) return true;
        // 双向包含匹配（处理"北京"和"北京市"的情况）
        if (vLower.includes(testLower) || testLower.includes(vLower)) return true;
        return false;
      });
    case 'NOT_IN':
      // NOT_IN: 测试值不在条件值列表中（支持双向包含匹配）
      return !values.some(v => {
        const vLower = v.toLowerCase().trim();
        const testLower = testValue.toLowerCase().trim();
        // 精确匹配
        if (vLower === testLower) return true;
        // 双向包含匹配
        if (vLower.includes(testLower) || testLower.includes(vLower)) return true;
        return false;
      });
    case 'EQUAL':
      // EQUAL: 测试值等于条件值列表中的任意一个（精确匹配）
      return values.some(v => v.toLowerCase().trim() === testValue.toLowerCase().trim());
    case '>=':
      // >=: 测试值大于等于条件值（用于数字比较，如城市级别、岗位级别）
      return Number(testValue) >= Number(value);
    case '<=':
      // <=: 测试值小于等于条件值（用于数字比较）
      return Number(testValue) <= Number(value);
    default:
      logger.warn(`[STANDARD_MATCH] Unknown operator: ${operator}`);
      return false;
  }
}

