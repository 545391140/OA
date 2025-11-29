const { validationResult } = require('express-validator');
const Location = require('../models/Location');

// @desc    Get all locations with pagination
// @route   GET /api/locations
// @access  Private
exports.getLocations = async (req, res) => {
  try {
    const { 
      type, 
      status, 
      search, 
      city, 
      country,
      page = 1,
      limit = 20
    } = req.query;
    
    const query = {};
    let useTextSearch = false;
    
    if (type) {
      query.type = type;
    }
    if (status) {
      query.status = status;
    }
    if (city) {
      query.city = { $regex: city, $options: 'i' };
    }
    if (country) {
      query.country = { $regex: country, $options: 'i' };
    }
    if (search) {
      const searchTrimmed = search.trim();
      
      // 优化策略：优先使用文本索引（性能最好，支持中文搜索）
      // 文本索引会自动分词，支持中文搜索，性能比正则表达式好10-100倍
      try {
        // 尝试使用文本索引
        query.$text = { $search: searchTrimmed };
        useTextSearch = true;
      } catch (error) {
        // 如果文本索引不可用，降级使用优化的正则表达式查询
        console.warn('文本索引不可用，使用正则表达式:', error.message);
        query.$or = [
          { name: { $regex: searchTrimmed, $options: 'i' } },
          { code: { $regex: searchTrimmed, $options: 'i' } },
          { city: { $regex: searchTrimmed, $options: 'i' } },
          { province: { $regex: searchTrimmed, $options: 'i' } },
          { district: { $regex: searchTrimmed, $options: 'i' } },
          { county: { $regex: searchTrimmed, $options: 'i' } },
          { country: { $regex: searchTrimmed, $options: 'i' } },
          { countryCode: { $regex: searchTrimmed, $options: 'i' } }
        ];
        useTextSearch = false;
      }
    }

    // 转换分页参数
    const pageNum = parseInt(page, 10) || 1;
    const limitNum = parseInt(limit, 10) || 20;
    const skip = (pageNum - 1) * limitNum;

    // 获取总数和分页数据
    // 如果文本索引查询失败，降级使用正则表达式
    let total, locations, sortOptions = { type: 1, name: 1 };
    
    try {
      if (useTextSearch) {
        // 文本搜索时，优先按文本相关性排序，然后按类型和名称
        sortOptions = { score: { $meta: 'textScore' }, type: 1, name: 1 };
      }
      
      // 获取总数
      total = await Location.countDocuments(query);
      
      // 获取分页数据
      locations = await Location.find(query)
        .populate('parentId', 'name code type city province')
        .sort(sortOptions)
        .skip(skip)
        .limit(limitNum);
    } catch (error) {
      // 如果文本索引查询失败（例如集合没有文本索引），降级使用正则表达式
      if (useTextSearch && error.message && error.message.includes('text index')) {
        console.warn('文本索引查询失败，降级使用正则表达式:', error.message);
        
        // 重新构建查询，使用正则表达式
        const searchTrimmed = search.trim();
        const fallbackQuery = { ...query };
        delete fallbackQuery.$text;
        fallbackQuery.$or = [
          { name: { $regex: searchTrimmed, $options: 'i' } },
          { code: { $regex: searchTrimmed, $options: 'i' } },
          { city: { $regex: searchTrimmed, $options: 'i' } },
          { province: { $regex: searchTrimmed, $options: 'i' } },
          { district: { $regex: searchTrimmed, $options: 'i' } },
          { county: { $regex: searchTrimmed, $options: 'i' } },
          { country: { $regex: searchTrimmed, $options: 'i' } },
          { countryCode: { $regex: searchTrimmed, $options: 'i' } }
        ];
        
        // 使用降级查询
        sortOptions = { type: 1, name: 1 };
        total = await Location.countDocuments(fallbackQuery);
        locations = await Location.find(fallbackQuery)
          .populate('parentId', 'name code type city province')
          .sort(sortOptions)
          .skip(skip)
          .limit(limitNum);
      } else {
        // 其他错误，直接抛出
        throw error;
      }
    }

    // 计算总页数
    const totalPages = Math.ceil(total / limitNum);

    res.json({
      success: true,
      data: locations,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages,
        hasNextPage: pageNum < totalPages,
        hasPrevPage: pageNum > 1
      }
    });
  } catch (error) {
    console.error('Get locations error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Get location by ID
// @route   GET /api/locations/:id
// @access  Private
exports.getLocationById = async (req, res) => {
  try {
    const location = await Location.findById(req.params.id)
      .populate('parentId', 'name code type city province');

    if (!location) {
      return res.status(404).json({
        success: false,
        message: 'Location not found'
      });
    }

    res.json({
      success: true,
      data: location
    });
  } catch (error) {
    console.error('Get location error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Get locations by parent (city) - 获取城市下的机场和火车站
// @route   GET /api/locations/parent/:parentId
// @access  Private
exports.getLocationsByParent = async (req, res) => {
  try {
    const locations = await Location.find({ parentId: req.params.parentId })
      .populate('parentId', 'name code type city province')
      .sort({ type: 1, name: 1 });

    res.json({
      success: true,
      count: locations.length,
      data: locations
    });
  } catch (error) {
    console.error('Get locations by parent error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Create location
// @route   POST /api/locations
// @access  Private (Admin/Finance only)
exports.createLocation = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation errors',
        errors: errors.array()
      });
    }

    const location = await Location.create({
      ...req.body,
      code: req.body.code ? req.body.code.toUpperCase() : undefined,
      countryCode: req.body.countryCode ? req.body.countryCode.toUpperCase() : undefined
    });

    res.status(201).json({
      success: true,
      message: 'Location created successfully',
      data: location
    });
  } catch (error) {
    console.error('Create location error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Update location
// @route   PUT /api/locations/:id
// @access  Private (Admin/Finance only)
exports.updateLocation = async (req, res) => {
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
    if (updateData.code) {
      updateData.code = updateData.code.toUpperCase();
    }
    if (updateData.countryCode) {
      updateData.countryCode = updateData.countryCode.toUpperCase();
    }

    const location = await Location.findByIdAndUpdate(
      req.params.id,
      updateData,
      {
        new: true,
        runValidators: true
      }
    );

    if (!location) {
      return res.status(404).json({
        success: false,
        message: 'Location not found'
      });
    }

    res.json({
      success: true,
      message: 'Location updated successfully',
      data: location
    });
  } catch (error) {
    console.error('Update location error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Delete location
// @route   DELETE /api/locations/:id
// @access  Private (Admin only)
exports.deleteLocation = async (req, res) => {
  try {
    const location = await Location.findById(req.params.id);

    if (!location) {
      return res.status(404).json({
        success: false,
        message: 'Location not found'
      });
    }

    await location.deleteOne();

    res.json({
      success: true,
      message: 'Location deleted successfully'
    });
  } catch (error) {
    console.error('Delete location error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Batch create locations
// @route   POST /api/locations/batch
// @access  Private (Admin/Finance only)
exports.batchCreateLocations = async (req, res) => {
  try {
    const { locations } = req.body;

    if (!Array.isArray(locations) || locations.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Locations array is required'
      });
    }

    const locationsToCreate = locations.map(loc => ({
      ...loc,
      code: loc.code ? loc.code.toUpperCase() : undefined,
      countryCode: loc.countryCode ? loc.countryCode.toUpperCase() : undefined
    }));

    const createdLocations = await Location.insertMany(locationsToCreate, {
      ordered: false
    });

    res.status(201).json({
      success: true,
      message: `${createdLocations.length} locations created successfully`,
      data: createdLocations
    });
  } catch (error) {
    console.error('Batch create locations error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};
