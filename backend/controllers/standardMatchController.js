const TravelStandard = require('../models/TravelStandard');
const TravelTransportStandard = require('../models/TravelTransportStandard');
const TravelAccommodationStandard = require('../models/TravelAccommodationStandard');
const TravelMealStandard = require('../models/TravelMealStandard');
const TravelAllowanceStandard = require('../models/TravelAllowanceStandard');
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
      return res.status(404).json({
        success: false,
        message: 'No effective travel standard found for the given date'
      });
    }

    // Get city level
    const cityInfo = await CityLevel.findOne({
      $or: [
        { cityCode: destination.toUpperCase() },
        { cityName: { $regex: destination, $options: 'i' } }
      ]
    });

    const cityLevel = cityInfo ? cityInfo.level : 4; // Default to level 4 if not found

    // Match transport standard
    const transportStandard = await TravelTransportStandard.findOne({
      standard: effectiveStandard._id,
      jobLevelCode: user.jobLevel || 'EMPLOYEE',
      transportType: transportType || 'flight',
      $or: [
        { cityLevel: null },
        { cityLevel: cityLevel }
      ]
    }).sort({ cityLevel: -1 }); // Prefer specific city level over null

    // Match accommodation standard
    const accommodationStandard = await TravelAccommodationStandard.findOne({
      standard: effectiveStandard._id,
      jobLevelCode: user.jobLevel || 'EMPLOYEE',
      cityLevel: cityLevel
    });

    // Match meal standard
    const mealStandard = await TravelMealStandard.findOne({
      standard: effectiveStandard._id,
      jobLevelCode: user.jobLevel || 'EMPLOYEE',
      cityLevel: cityLevel
    });

    // Get allowance standards
    const allowanceStandards = await TravelAllowanceStandard.find({
      standard: effectiveStandard._id,
      jobLevelCode: user.jobLevel || 'EMPLOYEE'
    });

    // Calculate estimated costs
    const estimatedCost = {
      transport: transportStandard ? transportStandard.maxAmount : 0,
      accommodation: accommodationStandard ? 
        (accommodationStandard.maxAmountPerNight * (days || 1)) : 0,
      meal: mealStandard ? 
        (mealStandard.dailyTotal * (days || 1)) : 0,
      allowance: allowanceStandards.reduce((sum, allowance) => {
        if (allowance.amountType === 'daily') {
          return sum + (allowance.amount * (days || 1));
        } else if (allowance.amountType === 'per_trip') {
          return sum + allowance.amount;
        } else {
          return sum + allowance.amount;
        }
      }, 0),
      total: 0
    };

    estimatedCost.total = 
      estimatedCost.transport + 
      estimatedCost.accommodation + 
      estimatedCost.meal + 
      estimatedCost.allowance;

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
        transport: transportStandard ? {
          type: transportStandard.transportType,
          seatClass: transportStandard.seatClass,
          maxAmount: transportStandard.maxAmount,
          cityLevel: transportStandard.cityLevel,
          distanceRange: transportStandard.distanceRange
        } : null,
        accommodation: accommodationStandard ? {
          maxAmountPerNight: accommodationStandard.maxAmountPerNight,
          starLevel: accommodationStandard.starLevel,
          nights: days || 1,
          totalAmount: accommodationStandard.maxAmountPerNight * (days || 1)
        } : null,
        meal: mealStandard ? {
          breakfast: mealStandard.breakfastAmount,
          lunch: mealStandard.lunchAmount,
          dinner: mealStandard.dinnerAmount,
          dailyTotal: mealStandard.dailyTotal,
          days: days || 1,
          totalAmount: mealStandard.dailyTotal * (days || 1)
        } : null,
        allowances: allowanceStandards.map(allowance => ({
          type: allowance.allowanceType,
          amountType: allowance.amountType,
          amount: allowance.amount,
          total: allowance.amountType === 'daily' ? 
            allowance.amount * (days || 1) : allowance.amount
        })),
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

