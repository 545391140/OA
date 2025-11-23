const TravelStandard = require('../models/TravelStandard');
const CityLevel = require('../models/CityLevel');
const User = require('../models/User');
const logger = require('../utils/logger');
const mongoose = require('mongoose');

// @desc    Match travel standard for a trip
// @route   POST /api/standard-match/match
// @access  Private
exports.matchStandard = async (req, res) => {
  try {
    const { destination, startDate, transportType, days } = req.body;
    
    // 验证用户ID
    if (!req.user || !req.user.id) {
      logger.error('Match standard: User not found in request');
      return res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
    }

    // 验证用户ID格式
    if (!mongoose.Types.ObjectId.isValid(req.user.id)) {
      logger.error(`Match standard: Invalid user ID format: ${req.user.id}`);
      return res.status(400).json({
        success: false,
        message: 'Invalid user ID format'
      });
    }

    // 验证必需参数
    if (!destination) {
      return res.status(400).json({
        success: false,
        message: 'Destination is required'
      });
    }

    if (!startDate) {
      return res.status(400).json({
        success: false,
        message: 'Start date is required'
      });
    }

    const userId = req.user.id;

    // Get user with job level
    const user = await User.findById(userId).select('jobLevel');
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // 确定使用的 jobLevelCode，优先使用用户的 jobLevel，如果为空则使用默认值
    const jobLevelCode = (user.jobLevel && user.jobLevel.trim()) ? user.jobLevel.toUpperCase() : 'EMPLOYEE';
    
    logger.info('Standard match query params:', {
      userId,
      destination,
      startDate,
      transportType,
      days,
      userJobLevel: user.jobLevel,
      jobLevelCode
    });

    // Find effective standard
    const effectiveStandard = await TravelStandard.findOne({
      status: 'active',
      effectiveDate: { $lte: new Date(startDate) },
      $or: [
        { expiryDate: { $gte: new Date(startDate) } },
        { expiryDate: null }
      ]
    }).sort({ effectiveDate: -1 });

    if (!effectiveStandard) {
      logger.warn('No effective standard found', { startDate, userId });
      return res.status(404).json({
        success: false,
        message: 'No effective travel standard found for the given date'
      });
    }

    logger.info('Found effective standard:', {
      standardId: effectiveStandard._id,
      standardCode: effectiveStandard.standardCode,
      standardName: effectiveStandard.standardName
    });

    // Get city level
    const cityInfo = await CityLevel.findOne({
      $or: [
        { cityCode: destination.toUpperCase() },
        { cityName: { $regex: destination, $options: 'i' } }
      ]
    });

    const cityLevel = cityInfo ? cityInfo.level : 4; // Default to level 4 if not found
    
    logger.info('City level info:', {
      destination,
      cityInfo: cityInfo ? { name: cityInfo.cityName, level: cityInfo.level } : null,
      cityLevel
    });

    // 使用新的数据结构：从 expenseStandards 中提取数据
    // 需要 populate expenseItemId 来获取费用项信息（包括 category）
    await effectiveStandard.populate({
      path: 'expenseStandards.expenseItemId',
      select: 'itemName category description'
    });
    
    logger.info('Expense standards before processing:', {
      count: effectiveStandard.expenseStandards?.length || 0,
      standards: effectiveStandard.expenseStandards?.map(es => ({
        expenseItemId: es.expenseItemId?._id || es.expenseItemId,
        itemName: es.expenseItemId?.itemName || 'N/A',
        category: es.expenseItemId?.category || 'N/A',
        limitType: es.limitType,
        limitAmount: es.limitAmount,
        calcUnit: es.calcUnit
      })) || []
    });
    
    // 根据费用项的 category 分类提取数据
    const transportItems = [];
    const accommodationItems = [];
    const mealItems = [];
    const allowanceItems = [];
    
    // 根据 itemName 推断分类的辅助函数
    const inferCategoryFromName = (itemName) => {
      const name = itemName.toLowerCase();
      // 特殊处理：机场往返应该归类为补贴，而不是交通费
      if (name.includes('机场往返') || name.includes('机场接送') || name.includes('往返机场')) {
        return 'allowance';
      }
      // 交通费：包含交通、机票、火车、航班等（但不包括机场往返）
      if (name.includes('交通') || name.includes('机票') || name.includes('火车') || 
          name.includes('航班') || name.includes('transport')) {
        return 'transport';
      } else if (name.includes('住宿') || name.includes('酒店') || name.includes('accommodation')) {
        return 'accommodation';
      } else if (name.includes('餐') || name.includes('食') || name.includes('meal') || 
                 name.includes('breakfast') || name.includes('lunch') || name.includes('dinner')) {
        return 'meal';
      } else if (name.includes('补助') || name.includes('补贴') || name.includes('allowance') ||
                 name.includes('电话') || name.includes('洗衣') || name.includes('签证') ||
                 name.includes('机场')) {
        // 机场相关的其他费用（如机场费、机场税等）也归类为补贴
        return 'allowance';
      }
      return 'general';
    };

    if (effectiveStandard.expenseStandards && effectiveStandard.expenseStandards.length > 0) {
      effectiveStandard.expenseStandards.forEach(es => {
        // 处理 expenseItemId 可能是 ObjectId 或已 populate 的对象
        const expenseItem = es.expenseItemId;
        let category = (expenseItem && typeof expenseItem === 'object' && expenseItem.category) 
          ? expenseItem.category 
          : 'general';
        const itemName = (expenseItem && typeof expenseItem === 'object' && expenseItem.itemName)
          ? expenseItem.itemName
          : '未知费用项';
        
        // 如果 category 是 'general'，尝试根据 itemName 推断
        if (category === 'general') {
          category = inferCategoryFromName(itemName);
        }
        
        const itemData = {
          itemName,
          limitAmount: es.limitAmount || 0,
          limitType: es.limitType || 'FIXED',
          calcUnit: es.calcUnit || 'PER_DAY'
        };
        
        if (category === 'transport') {
          transportItems.push(itemData);
        } else if (category === 'accommodation') {
          accommodationItems.push(itemData);
        } else if (category === 'meal') {
          mealItems.push(itemData);
        } else if (category === 'allowance') {
          allowanceItems.push(itemData);
        } else {
          // 如果仍然无法分类，添加到 allowance（其他补贴）
          allowanceItems.push(itemData);
          logger.debug('Uncategorized expense item, added to allowance:', { itemName, limitAmount: es.limitAmount });
        }
      });
    }

    logger.info('Expense standards extracted:', {
      transportCount: transportItems.length,
      accommodationCount: accommodationItems.length,
      mealCount: mealItems.length,
      allowanceCount: allowanceItems.length
    });

    // 计算预估费用
    // 对于交通：取第一个或最大的限额
    const transportAmount = transportItems.length > 0 
      ? Math.max(...transportItems.map(t => t.limitAmount || 0))
      : 0;
    
    // 对于住宿：按天计算
    const accommodationAmount = accommodationItems.length > 0
      ? Math.max(...accommodationItems.map(a => {
          const amount = a.limitAmount || 0;
          return a.calcUnit === 'PER_DAY' ? amount * (days || 1) : amount;
        }))
      : 0;
    
    // 对于餐饮：按天计算
    const mealAmount = mealItems.length > 0
      ? Math.max(...mealItems.map(m => {
          const amount = m.limitAmount || 0;
          return m.calcUnit === 'PER_DAY' ? amount * (days || 1) : amount;
        }))
      : 0;
    
    // 对于补贴：按天或按次计算
    const allowanceAmount = allowanceItems.reduce((sum, a) => {
      const amount = a.limitAmount || 0;
      if (a.calcUnit === 'PER_DAY') {
        return sum + (amount * (days || 1));
      } else if (a.calcUnit === 'PER_TRIP') {
        return sum + amount;
      } else {
        return sum + amount;
      }
    }, 0);

    const estimatedCost = {
      transport: transportAmount,
      accommodation: accommodationAmount,
      meal: mealAmount,
      allowance: allowanceAmount,
      total: transportAmount + accommodationAmount + mealAmount + allowanceAmount
    };

    res.json({
      success: true,
      data: {
        standard: {
          id: effectiveStandard._id,
          code: effectiveStandard.standardCode,
          name: effectiveStandard.standardName,
          version: effectiveStandard.version
        },
        userInfo: {
          jobLevel: user.jobLevel || 'EMPLOYEE',
          cityLevel: cityLevel,
          cityInfo: cityInfo ? {
            name: cityInfo.cityName,
            level: cityInfo.level,
            levelName: getCityLevelName(cityInfo.level)
          } : null
        },
        transport: transportItems.length > 0 ? {
          type: transportType || 'flight',
          seatClass: '经济舱', // 默认值，实际应该从费用项中获取
          maxAmount: transportAmount,
          cityLevel: cityLevel,
          distanceRange: null
        } : null,
        accommodation: accommodationItems.length > 0 ? {
          maxAmountPerNight: Math.max(...accommodationItems.map(a => a.limitAmount || 0)),
          starLevel: null, // 实际应该从费用项中获取
          nights: days || 1,
          totalAmount: accommodationAmount
        } : null,
        meal: mealItems.length > 0 ? {
          breakfast: 0, // 实际应该从费用项中获取或计算
          lunch: 0,
          dinner: 0,
          dailyTotal: Math.max(...mealItems.map(m => m.limitAmount || 0)),
          days: days || 1,
          totalAmount: mealAmount
        } : null,
        allowances: allowanceItems.length > 0 ? allowanceItems.map(allowance => ({
          type: allowance.itemName,
          amountType: allowance.calcUnit === 'PER_DAY' ? 'daily' : 'per_trip',
          amount: allowance.limitAmount || 0,
          total: allowance.calcUnit === 'PER_DAY' ? 
            (allowance.limitAmount || 0) * (days || 1) : (allowance.limitAmount || 0)
        })) : [],
        estimatedCost
      }
    });
  } catch (error) {
    logger.error('Match standard error:', {
      error: error.message,
      stack: error.stack,
      userId: req.user?.id,
      destination,
      startDate
    });
    res.status(500).json({
      success: false,
      message: error.message || 'Server error during standard matching'
    });
  }
};

// @desc    Validate expense against standard
// @route   POST /api/standard-match/validate
// @access  Private
exports.validateExpense = async (req, res) => {
  try {
    const { standardId, expense } = req.body;
    const userId = req.user.id;

    // Get standard
    const standard = await TravelStandard.findById(standardId);
    if (!standard) {
      return res.status(404).json({
        success: false,
        message: 'Standard not found'
      });
    }

    // Get user
    const user = await User.findById(userId).select('jobLevel');
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const validationResults = {
      isValid: true,
      violations: [],
      warnings: []
    };

    // Validate transport expense
    if (expense.transport) {
      const transportStandard = await TravelTransportStandard.findOne({
        standard: standardId,
        jobLevelCode: user.jobLevel || 'EMPLOYEE',
        transportType: expense.transport.type
      });

      if (transportStandard && expense.transport.amount > transportStandard.maxAmount) {
        validationResults.isValid = false;
        validationResults.violations.push({
          type: 'transport',
          message: `交通费用超标: ${expense.transport.amount} > ${transportStandard.maxAmount}`,
          actual: expense.transport.amount,
          limit: transportStandard.maxAmount,
          excess: expense.transport.amount - transportStandard.maxAmount
        });
      }
    }

    // Validate accommodation expense
    if (expense.accommodation) {
      const accommodationStandard = await TravelAccommodationStandard.findOne({
        standard: standardId,
        jobLevelCode: user.jobLevel || 'EMPLOYEE',
        cityLevel: expense.accommodation.cityLevel
      });

      if (accommodationStandard && 
          expense.accommodation.amountPerNight > accommodationStandard.maxAmountPerNight) {
        validationResults.isValid = false;
        validationResults.violations.push({
          type: 'accommodation',
          message: `住宿费用超标: ${expense.accommodation.amountPerNight} > ${accommodationStandard.maxAmountPerNight}`,
          actual: expense.accommodation.amountPerNight,
          limit: accommodationStandard.maxAmountPerNight,
          excess: expense.accommodation.amountPerNight - accommodationStandard.maxAmountPerNight
        });
      }
    }

    // Validate meal expense
    if (expense.meal) {
      const mealStandard = await TravelMealStandard.findOne({
        standard: standardId,
        jobLevelCode: user.jobLevel || 'EMPLOYEE',
        cityLevel: expense.meal.cityLevel
      });

      if (mealStandard && expense.meal.dailyTotal > mealStandard.dailyTotal) {
        validationResults.warnings.push({
          type: 'meal',
          message: `餐饮费用超过标准: ${expense.meal.dailyTotal} > ${mealStandard.dailyTotal}`,
          actual: expense.meal.dailyTotal,
          limit: mealStandard.dailyTotal
        });
      }
    }

    res.json({
      success: true,
      data: validationResults
    });
  } catch (error) {
    logger.error('Validate expense error:', {
      error: error.message,
      stack: error.stack,
      userId: req.user?.id,
      standardId
    });
    res.status(500).json({
      success: false,
      message: error.message || 'Server error during expense validation'
    });
  }
};

// Helper function
function getCityLevelName(level) {
  const levelMap = {
    1: '一线城市',
    2: '二线城市',
    3: '三线城市',
    4: '其他城市'
  };
  return levelMap[level] || '其他城市';
}

