const { validationResult } = require('express-validator');
const logger = require('../utils/logger');
const Currency = require('../models/Currency');

// @desc    Get all currencies
// @route   GET /api/currencies
// @access  Private
exports.getCurrencies = async (req, res) => {
  try {
    const { isActive, code, search } = req.query;
    const query = {};
    
    if (isActive !== undefined) {
      query.isActive = isActive === 'true';
    }
    if (code) {
      query.code = { $regex: code, $options: 'i' };
    }
    if (search) {
      query.$or = [
        { code: { $regex: search, $options: 'i' } },
        { name: { $regex: search, $options: 'i' } },
        { nameEn: { $regex: search, $options: 'i' } }
      ];
    }

    const currencies = await Currency.find(query)
      .sort({ displayOrder: 1, code: 1 });

    res.json({
      success: true,
      count: currencies.length,
      data: currencies
    });
  } catch (error) {
    logger.error('Get currencies error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Get active currencies only
// @route   GET /api/currencies/active
// @access  Private
exports.getActiveCurrencies = async (req, res) => {
  try {
    const currencies = await Currency.find({ isActive: true })
      .sort({ displayOrder: 1, code: 1 })
      .select('code name nameEn symbol exchangeRate decimalPlaces');

    res.json({
      success: true,
      count: currencies.length,
      data: currencies
    });
  } catch (error) {
    logger.error('Get active currencies error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Get currency by code
// @route   GET /api/currencies/code/:code
// @access  Private
exports.getCurrencyByCode = async (req, res) => {
  try {
    const currency = await Currency.findOne({
      code: req.params.code.toUpperCase()
    });

    if (!currency) {
      return res.status(404).json({
        success: false,
        message: 'Currency not found'
      });
    }

    res.json({
      success: true,
      data: currency
    });
  } catch (error) {
    logger.error('Get currency error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Get currency by ID
// @route   GET /api/currencies/:id
// @access  Private
exports.getCurrencyById = async (req, res) => {
  try {
    const currency = await Currency.findById(req.params.id);

    if (!currency) {
      return res.status(404).json({
        success: false,
        message: 'Currency not found'
      });
    }

    res.json({
      success: true,
      data: currency
    });
  } catch (error) {
    logger.error('Get currency error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Create currency
// @route   POST /api/currencies
// @access  Private (Admin/Finance only)
exports.createCurrency = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation errors',
        errors: errors.array()
      });
    }

    // 如果设置为默认币种，先取消其他币种的默认状态
    if (req.body.isDefault) {
      await Currency.updateMany(
        { isDefault: true },
        { $set: { isDefault: false } }
      );
    }

    const currency = await Currency.create({
      ...req.body,
      code: req.body.code.toUpperCase()
    });

    res.status(201).json({
      success: true,
      message: 'Currency created successfully',
      data: currency
    });
  } catch (error) {
    logger.error('Create currency error:', error);
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Currency code already exists'
      });
    }
    res.status(500).json({
      success: false,
      message: error.message || 'Server error'
    });
  }
};

// @desc    Update currency
// @route   PUT /api/currencies/:id
// @access  Private (Admin/Finance only)
exports.updateCurrency = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation errors',
        errors: errors.array()
      });
    }

    // 如果设置为默认币种，先取消其他币种的默认状态
    if (req.body.isDefault) {
      await Currency.updateMany(
        { _id: { $ne: req.params.id }, isDefault: true },
        { $set: { isDefault: false } }
      );
    }

    const updateData = { ...req.body };
    if (updateData.code) {
      updateData.code = updateData.code.toUpperCase();
    }

    const currency = await Currency.findByIdAndUpdate(
      req.params.id,
      updateData,
      {
        new: true,
        runValidators: true
      }
    );

    if (!currency) {
      return res.status(404).json({
        success: false,
        message: 'Currency not found'
      });
    }

    res.json({
      success: true,
      message: 'Currency updated successfully',
      data: currency
    });
  } catch (error) {
    logger.error('Update currency error:', error);
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Currency code already exists'
      });
    }
    res.status(500).json({
      success: false,
      message: error.message || 'Server error'
    });
  }
};

// @desc    Delete currency
// @route   DELETE /api/currencies/:id
// @access  Private (Admin only)
exports.deleteCurrency = async (req, res) => {
  try {
    const currency = await Currency.findById(req.params.id);

    if (!currency) {
      return res.status(404).json({
        success: false,
        message: 'Currency not found'
      });
    }

    // 检查是否被使用（可以添加更详细的检查）
    // 暂时允许删除，但可以添加使用检查逻辑

    await currency.deleteOne();

    res.json({
      success: true,
      message: 'Currency deleted successfully'
    });
  } catch (error) {
    logger.error('Delete currency error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Get exchange rates (for currency converter)
// @route   GET /api/currencies/exchange-rates
// @access  Private
exports.getExchangeRates = async (req, res) => {
  try {
    const currencies = await Currency.find({ isActive: true })
      .select('code exchangeRate')
      .lean();

    const rates = {};
    currencies.forEach(currency => {
      rates[currency.code] = currency.exchangeRate;
    });

    res.json({
      success: true,
      data: rates
    });
  } catch (error) {
    logger.error('Get exchange rates error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

