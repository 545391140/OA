const { validationResult } = require('express-validator');
const TravelStandard = require('../models/TravelStandard');

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

    res.json({
      success: true,
      count: standards.length,
      data: standards
    });
  } catch (error) {
    console.error('Get standards error:', error);
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

    res.json({
      success: true,
      data: standard
    });
  } catch (error) {
    console.error('Get standard error:', error);
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
      processedBody.expenseStandards = processedBody.expenseStandards.map(es => {
        const processedEs = { ...es };
        // 确保 expenseItemId 是有效的 ObjectId 字符串
        if (processedEs.expenseItemId) {
          // 如果是对象，提取 _id；如果是字符串，直接使用
          if (typeof processedEs.expenseItemId === 'object' && processedEs.expenseItemId._id) {
            processedEs.expenseItemId = processedEs.expenseItemId._id;
          } else if (typeof processedEs.expenseItemId === 'string') {
            // 已经是字符串，保持不变（Mongoose会自动转换）
            processedEs.expenseItemId = processedEs.expenseItemId;
          }
        }
        return processedEs;
      });
    }

    const standardData = {
      ...processedBody,
      createdBy: req.user.id || req.user._id,
      updatedBy: req.user.id || req.user._id
    };

    console.log('[CREATE] Standard data:', JSON.stringify({
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

    console.log('[CREATE] Created standard (from DB):', JSON.stringify({
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

    res.status(201).json({
      success: true,
      message: 'Travel standard created successfully',
      data: populatedStandard
    });
  } catch (error) {
    console.error('Create standard error:', error);
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

    console.log('[UPDATE] Received req.body:', JSON.stringify({
      conditionGroupsLength: req.body.conditionGroups?.length,
      expenseStandardsLength: req.body.expenseStandards?.length,
      conditionGroups: req.body.conditionGroups,
      expenseStandards: req.body.expenseStandards
    }, null, 2));

    // 处理 expenseStandards 中的 expenseItemId 转换
    const processedBody = { ...req.body };
    if (processedBody.expenseStandards && Array.isArray(processedBody.expenseStandards)) {
      processedBody.expenseStandards = processedBody.expenseStandards.map(es => {
        const processedEs = { ...es };
        // 确保 expenseItemId 是有效的 ObjectId 字符串
        if (processedEs.expenseItemId) {
          // 如果是对象，提取 _id；如果是字符串，直接使用
          if (typeof processedEs.expenseItemId === 'object' && processedEs.expenseItemId._id) {
            processedEs.expenseItemId = processedEs.expenseItemId._id;
          } else if (typeof processedEs.expenseItemId === 'string') {
            // 已经是字符串，保持不变（Mongoose会自动转换）
            processedEs.expenseItemId = processedEs.expenseItemId;
          }
        }
        return processedEs;
      });
    }

    console.log('[UPDATE] Processed update data:', JSON.stringify({
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

    console.log('[UPDATE] Before update - existingStandard conditionGroups:', existingStandard.conditionGroups?.length || 0);
    console.log('[UPDATE] Before update - existingStandard expenseStandards:', existingStandard.expenseStandards?.length || 0);
    console.log('[UPDATE] updateData keys:', Object.keys(updateData));
    
    // 使用 findByIdAndUpdate 配合 $set 来确保嵌套数组被正确更新
    // 这是更可靠的方法来更新嵌套数组
    const $setData = {};
    Object.keys(updateData).forEach(key => {
      if (updateData[key] !== undefined) {
        $setData[key] = updateData[key];
        console.log(`[UPDATE] Adding to $set: ${key}`, 
          Array.isArray(updateData[key]) ? `ARRAY(${updateData[key].length})` : 
          typeof updateData[key]);
      }
    });

    console.log('[UPDATE] $setData conditionGroups length:', $setData.conditionGroups?.length || 0);
    console.log('[UPDATE] $setData expenseStandards length:', $setData.expenseStandards?.length || 0);

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

      console.log('[UPDATE] After findByIdAndUpdate - conditionGroups:', updatedStandard.conditionGroups?.length || 0);
      console.log('[UPDATE] After findByIdAndUpdate - expenseStandards:', updatedStandard.expenseStandards?.length || 0);
      console.log('[UPDATE] Save successful via findByIdAndUpdate');
    } catch (saveError) {
      console.error('[UPDATE] Save error:', saveError);
      throw saveError;
    }

    // 重新查询并populate（强制从数据库查询，不使用缓存）
    // 注意：由于已经使用 findByIdAndUpdate 返回了 updatedStandard，可以直接使用它
    // 但为了确保 populate 正确，我们重新查询
    const standardDoc = await TravelStandard.findById(req.params.id)
      .populate('expenseStandards.expenseItemId', 'itemName description amount');

    console.log('[UPDATE] Saved standard (from DB after save):', JSON.stringify({
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
    console.error('Update standard error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
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
    console.error('Delete standard error:', error);
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
    console.error('Activate standard error:', error);
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
    console.error('Deactivate standard error:', error);
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
    const { country, city, cityLevel, positionLevel, department, projectCode } = req.body;
    const now = new Date();

    // Find all active standards
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

    // Test each standard against conditions and collect all matched standards
    const matchedStandards = [];
    for (const standard of standards) {
      if (matchConditions(standard, { country, city, cityLevel, positionLevel, department, projectCode })) {
        matchedStandards.push(standard);
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
      expenses = buildExpensesFromStandard(primaryStandard);
    } else if (matchStrategy === 'MERGE_BEST') {
      // 策略2：合并最优 - 合并所有匹配标准，每个费用项取最高限额
      expenses = mergeExpensesBest(matchedStandards);
    } else if (matchStrategy === 'MERGE_ALL') {
      // 策略3：合并所有 - 合并所有匹配标准的所有费用项
      expenses = mergeExpensesAll(matchedStandards);
    }

    // 构建响应，包含所有匹配的标准信息
    const matchedStandardsInfo = matchedStandards.map(std => ({
      _id: std._id,
      standardCode: std.standardCode,
      standardName: std.standardName,
      priority: std.priority
    }));

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
        expenses
      }
    });
  } catch (error) {
    console.error('Match standard error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during standard matching'
    });
  }
};

// Helper function to build expenses object from a single standard
function buildExpensesFromStandard(standard) {
  const expenses = {};
  if (standard.expenseStandards && standard.expenseStandards.length > 0) {
    standard.expenseStandards.forEach(es => {
      const itemId = es.expenseItemId?._id?.toString() || es.expenseItemId?.toString();
      const itemName = es.expenseItemId?.itemName || '未知';
      
      if (es.limitType === 'FIXED') {
        expenses[itemId] = {
          itemName,
          limit: es.limitAmount || 0,
          unit: es.calcUnit === 'PER_DAY' ? '元/天' : es.calcUnit === 'PER_TRIP' ? '元/次' : '元/公里',
          limitType: 'FIXED',
          sourceStandard: standard.standardCode
        };
      } else if (es.limitType === 'RANGE') {
        expenses[itemId] = {
          itemName,
          type: `范围: ${es.limitMin || 0}~${es.limitMax || 0}元`,
          limitMin: es.limitMin || 0,
          limitMax: es.limitMax || 0,
          limitType: 'RANGE',
          sourceStandard: standard.standardCode
        };
      } else if (es.limitType === 'ACTUAL') {
        expenses[itemId] = {
          itemName,
          type: '实报实销',
          limitType: 'ACTUAL',
          sourceStandard: standard.standardCode
        };
      } else if (es.limitType === 'PERCENTAGE') {
        expenses[itemId] = {
          itemName,
          type: `按比例: ${es.percentage || 0}% (基准: ${es.baseAmount || 0}元)`,
          percentage: es.percentage || 0,
          baseAmount: es.baseAmount || 0,
          limitType: 'PERCENTAGE',
          sourceStandard: standard.standardCode
        };
      }
    });
  }
  return expenses;
}

// Helper function to merge expenses from multiple standards, taking the best (highest) limit for each expense item
function mergeExpensesBest(standards) {
  const mergedExpenses = {};
  
  standards.forEach(standard => {
    if (standard.expenseStandards && standard.expenseStandards.length > 0) {
      standard.expenseStandards.forEach(es => {
        const itemId = es.expenseItemId?._id?.toString() || es.expenseItemId?.toString();
        const itemName = es.expenseItemId?.itemName || '未知';
        
        if (!mergedExpenses[itemId]) {
          // 首次遇到该费用项，直接添加
          if (es.limitType === 'FIXED') {
            mergedExpenses[itemId] = {
              itemName,
              limit: es.limitAmount || 0,
              unit: es.calcUnit === 'PER_DAY' ? '元/天' : es.calcUnit === 'PER_TRIP' ? '元/次' : '元/公里',
              limitType: 'FIXED',
              sourceStandards: [standard.standardCode]
            };
          } else if (es.limitType === 'RANGE') {
            mergedExpenses[itemId] = {
              itemName,
              type: `范围: ${es.limitMin || 0}~${es.limitMax || 0}元`,
              limitMin: es.limitMin || 0,
              limitMax: es.limitMax || 0,
              limitType: 'RANGE',
              sourceStandards: [standard.standardCode]
            };
          } else if (es.limitType === 'ACTUAL') {
            mergedExpenses[itemId] = {
              itemName,
              type: '实报实销',
              limitType: 'ACTUAL',
              sourceStandards: [standard.standardCode]
            };
          } else if (es.limitType === 'PERCENTAGE') {
            mergedExpenses[itemId] = {
              itemName,
              type: `按比例: ${es.percentage || 0}% (基准: ${es.baseAmount || 0}元)`,
              percentage: es.percentage || 0,
              baseAmount: es.baseAmount || 0,
              limitType: 'PERCENTAGE',
              sourceStandards: [standard.standardCode]
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
          // 如果新的是固定限额，且金额更高，则更新
          else if (es.limitType === 'FIXED' && existing.limitType === 'FIXED') {
            if (es.limitAmount > (existing.limit || 0)) {
              mergedExpenses[itemId] = {
                ...existing,
                limit: es.limitAmount,
                unit: es.calcUnit === 'PER_DAY' ? '元/天' : es.calcUnit === 'PER_TRIP' ? '元/次' : '元/公里',
                sourceStandards: [...(existing.sourceStandards || []), standard.standardCode]
              };
            } else {
              // 保留现有的更高限额，但记录来源
              if (!existing.sourceStandards.includes(standard.standardCode)) {
                existing.sourceStandards.push(standard.standardCode);
              }
            }
          }
          // 如果新的是范围限额，取最大范围
          else if (es.limitType === 'RANGE' && existing.limitType === 'RANGE') {
            const newMin = Math.min(existing.limitMin || 0, es.limitMin || 0);
            const newMax = Math.max(existing.limitMax || 0, es.limitMax || 0);
            mergedExpenses[itemId] = {
              ...existing,
              type: `范围: ${newMin}~${newMax}元`,
              limitMin: newMin,
              limitMax: newMax,
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
function mergeExpensesAll(standards) {
  const mergedExpenses = {};
  
  standards.forEach(standard => {
    if (standard.expenseStandards && standard.expenseStandards.length > 0) {
      standard.expenseStandards.forEach(es => {
        const itemId = es.expenseItemId?._id?.toString() || es.expenseItemId?.toString();
        const itemName = es.expenseItemId?.itemName || '未知';
        
        // 为每个标准创建独立的费用项（添加标准代码作为后缀）
        const uniqueKey = `${itemId}_${standard.standardCode}`;
        
        if (es.limitType === 'FIXED') {
          mergedExpenses[uniqueKey] = {
            itemName: `${itemName} (${standard.standardCode})`,
            limit: es.limitAmount || 0,
            unit: es.calcUnit === 'PER_DAY' ? '元/天' : es.calcUnit === 'PER_TRIP' ? '元/次' : '元/公里',
            limitType: 'FIXED',
            sourceStandard: standard.standardCode
          };
        } else if (es.limitType === 'RANGE') {
          mergedExpenses[uniqueKey] = {
            itemName: `${itemName} (${standard.standardCode})`,
            type: `范围: ${es.limitMin || 0}~${es.limitMax || 0}元`,
            limitMin: es.limitMin || 0,
            limitMax: es.limitMax || 0,
            limitType: 'RANGE',
            sourceStandard: standard.standardCode
          };
        } else if (es.limitType === 'ACTUAL') {
          mergedExpenses[uniqueKey] = {
            itemName: `${itemName} (${standard.standardCode})`,
            type: '实报实销',
            limitType: 'ACTUAL',
            sourceStandard: standard.standardCode
          };
        } else if (es.limitType === 'PERCENTAGE') {
          mergedExpenses[uniqueKey] = {
            itemName: `${itemName} (${standard.standardCode})`,
            type: `按比例: ${es.percentage || 0}% (基准: ${es.baseAmount || 0}元)`,
            percentage: es.percentage || 0,
            baseAmount: es.baseAmount || 0,
            limitType: 'PERCENTAGE',
            sourceStandard: standard.standardCode
          };
        }
      });
    }
  });
  
  return mergedExpenses;
}

// Helper function to match conditions
function matchConditions(standard, testData) {
  const { country, city, cityLevel, positionLevel, department, projectCode } = testData;
  
  // If no condition groups, match all (no restrictions)
  if (!standard.conditionGroups || standard.conditionGroups.length === 0) {
    return true;
  }

  // Group之间是OR关系：只要有一个组匹配成功，就返回true
  for (const group of standard.conditionGroups) {
    if (matchConditionGroup(group, testData)) {
      return true;
    }
  }

  return false;
}

// Helper function to match a condition group (组内条件是AND关系)
function matchConditionGroup(group, testData) {
  const { country, city, cityLevel, positionLevel, department, projectCode } = testData;
  
  if (!group.conditions || group.conditions.length === 0) {
    return true; // Empty group matches all
  }

  // 组内所有条件都需匹配（AND）
  for (const condition of group.conditions) {
    if (!matchSingleCondition(condition, testData)) {
      return false;
    }
  }

  return true;
}

// Helper function to match a single condition
function matchSingleCondition(condition, testData) {
  const { country, city, cityLevel, positionLevel, department, projectCode } = testData;
  const { type, operator, value } = condition;

  let testValue = '';
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
    case 'department':
      testValue = department || '';
      break;
    case 'project_code':
      testValue = projectCode || '';
      break;
    default:
      return false;
  }

  const values = value.split(',').map(v => v.trim()).filter(v => v);

  switch (operator) {
    case 'IN':
      return values.some(v => testValue.toLowerCase().includes(v.toLowerCase()) || v.toLowerCase() === testValue.toLowerCase());
    case 'NOT_IN':
      return !values.some(v => testValue.toLowerCase().includes(v.toLowerCase()) || v.toLowerCase() === testValue.toLowerCase());
    case 'EQUAL':
      return values.some(v => v.toLowerCase() === testValue.toLowerCase());
    case '>=':
      return Number(testValue) >= Number(value);
    case '<=':
      return Number(testValue) <= Number(value);
    default:
      return false;
  }
}

