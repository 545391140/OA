const { validationResult } = require('express-validator');
const CityLevel = require('../models/CityLevel');

// @desc    Get all city levels
// @route   GET /api/city-levels
// @access  Private
exports.getCityLevels = async (req, res) => {
  try {
    const { level, cityName } = req.query;
    const query = {};
    
    if (level) {
      query.level = parseInt(level);
    }
    if (cityName) {
      query.cityName = { $regex: cityName, $options: 'i' };
    }

    const cityLevels = await CityLevel.find(query).sort({ level: 1, cityName: 1 });

    res.json({
      success: true,
      count: cityLevels.length,
      data: cityLevels
    });
  } catch (error) {
    console.error('Get city levels error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Get city level by code
// @route   GET /api/city-levels/code/:code
// @access  Private
exports.getCityLevelByCode = async (req, res) => {
  try {
    const cityLevel = await CityLevel.findOne({
      cityCode: req.params.code.toUpperCase()
    });

    if (!cityLevel) {
      return res.status(404).json({
        success: false,
        message: 'City level not found'
      });
    }

    res.json({
      success: true,
      data: cityLevel
    });
  } catch (error) {
    console.error('Get city level error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Get city level by ID
// @route   GET /api/city-levels/:id
// @access  Private
exports.getCityLevelById = async (req, res) => {
  try {
    const cityLevel = await CityLevel.findById(req.params.id);

    if (!cityLevel) {
      return res.status(404).json({
        success: false,
        message: 'City level not found'
      });
    }

    res.json({
      success: true,
      data: cityLevel
    });
  } catch (error) {
    console.error('Get city level error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Create city level
// @route   POST /api/city-levels
// @access  Private (Admin/Finance only)
exports.createCityLevel = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation errors',
        errors: errors.array()
      });
    }

    const cityLevel = await CityLevel.create({
      ...req.body,
      cityCode: req.body.cityCode.toUpperCase()
    });

    res.status(201).json({
      success: true,
      message: 'City level created successfully',
      data: cityLevel
    });
  } catch (error) {
    console.error('Create city level error:', error);
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'City code already exists'
      });
    }
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Update city level
// @route   PUT /api/city-levels/:id
// @access  Private (Admin/Finance only)
exports.updateCityLevel = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation errors',
        errors: errors.array()
      });
    }

    const updateData = { ...req.body };
    if (updateData.cityCode) {
      updateData.cityCode = updateData.cityCode.toUpperCase();
    }

    const cityLevel = await CityLevel.findByIdAndUpdate(
      req.params.id,
      updateData,
      {
        new: true,
        runValidators: true
      }
    );

    if (!cityLevel) {
      return res.status(404).json({
        success: false,
        message: 'City level not found'
      });
    }

    res.json({
      success: true,
      message: 'City level updated successfully',
      data: cityLevel
    });
  } catch (error) {
    console.error('Update city level error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Delete city level
// @route   DELETE /api/city-levels/:id
// @access  Private (Admin only)
exports.deleteCityLevel = async (req, res) => {
  try {
    const cityLevel = await CityLevel.findById(req.params.id);

    if (!cityLevel) {
      return res.status(404).json({
        success: false,
        message: 'City level not found'
      });
    }

    await cityLevel.deleteOne();

    res.json({
      success: true,
      message: 'City level deleted successfully'
    });
  } catch (error) {
    console.error('Delete city level error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

