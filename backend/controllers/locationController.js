const { validationResult } = require('express-validator');
const Location = require('../models/Location');

/**
 * 转义正则表达式特殊字符
 */
function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * 生成拼写容错的正则表达式模式
 * 支持常见的拼写错误（如 beijning -> beijing）
 */
function generateFuzzyRegex(searchTerm) {
  const term = searchTerm.toLowerCase().trim();
  if (term.length < 3) {
    return term; // 太短的词不进行模糊匹配
  }

  const fuzzyPatterns = [term]; // 总是包含原始词

  // 模式1: 前缀+后缀匹配（如 beijning -> beij.*ing）
  if (term.length >= 6) {
    const prefix = escapeRegex(term.slice(0, 3));
    const suffix = escapeRegex(term.slice(-3));
    fuzzyPatterns.push(`^${prefix}.*${suffix}`);
    
    const prefix2 = escapeRegex(term.slice(0, 2));
    fuzzyPatterns.push(`^${prefix2}.*${suffix}`);
  }
  
  // 模式2: 尝试移除中间的一个字符（模拟多余字符，如 beijning -> beijing）
  if (term.length >= 5) {
    for (let i = 2; i < term.length - 2; i++) {
      const withoutChar = term.slice(0, i) + term.slice(i + 1);
      const escaped = escapeRegex(withoutChar);
      fuzzyPatterns.push(`^${escaped}`);
    }
  }
  
  // 模式3: 尝试相邻字符交换（如 beijning -> beijing，n和i交换）
  for (let i = 0; i < term.length - 1; i++) {
    const swapped = term.slice(0, i) + term[i + 1] + term[i] + term.slice(i + 2);
    if (swapped !== term) {
      const escaped = escapeRegex(swapped);
      fuzzyPatterns.push(`^${escaped}`);
    }
  }

  // 去重并限制数量
  const uniquePatterns = [...new Set(fuzzyPatterns)].slice(0, 5);
  
  return uniquePatterns.length > 1 ? `(${uniquePatterns.join('|')})` : uniquePatterns[0] || term;
}

/**
 * 生成搜索查询条件，支持多种搜索方式
 * 支持：中文名称（name）、英文名称（enName）、拼音（pinyin）、代码（code）
 * 支持拼写容错（如 beijning -> beijing）
 */
function buildSearchQuery(searchTerm) {
  if (!searchTerm || typeof searchTerm !== 'string') {
    return null;
  }
  
  const searchTrimmed = searchTerm.trim();
  if (!searchTrimmed) {
    return null;
  }
  
  const searchLower = searchTrimmed.toLowerCase();
  
  // 转义搜索词
  const escapedTrimmed = escapeRegex(searchTrimmed);
  const escapedLower = escapeRegex(searchLower);
  
  const searchConditions = [];
  
  // 1. 精确匹配（最高优先级）- 优先查询 name、enName、pinyin 字段
  searchConditions.push(
    { name: { $regex: `^${escapedTrimmed}$`, $options: 'i' } },
    { enName: { $regex: `^${escapedTrimmed}$`, $options: 'i' } },
    { pinyin: { $regex: `^${escapedLower}$`, $options: 'i' } },
    { code: { $regex: `^${escapedLower}$`, $options: 'i' } }
  );
  
  // 2. 前缀匹配（高优先级）- 优先查询 name、enName、pinyin 字段
  searchConditions.push(
    { name: { $regex: `^${escapedTrimmed}`, $options: 'i' } },
    { enName: { $regex: `^${escapedTrimmed}`, $options: 'i' } },
    { pinyin: { $regex: `^${escapedLower}`, $options: 'i' } },
    { code: { $regex: `^${escapedLower}`, $options: 'i' } }
  );
  
  // 3. 包含匹配（中等优先级）- 优先查询 name、enName、pinyin 字段
  searchConditions.push(
    { name: { $regex: escapedTrimmed, $options: 'i' } },
    { enName: { $regex: escapedTrimmed, $options: 'i' } },
    { pinyin: { $regex: escapedLower, $options: 'i' } },
    { code: { $regex: escapedLower, $options: 'i' } },
    { city: { $regex: escapedTrimmed, $options: 'i' } },
    { province: { $regex: escapedTrimmed, $options: 'i' } },
    { district: { $regex: escapedTrimmed, $options: 'i' } },
    { county: { $regex: escapedTrimmed, $options: 'i' } },
    { country: { $regex: escapedTrimmed, $options: 'i' } },
    { countryCode: { $regex: escapedLower, $options: 'i' } }
  );
  
  // 4. 拼写容错匹配（低优先级，仅对英文和拼音）
  // 对于长度 >= 3 的英文搜索词，生成模糊匹配模式
  if (searchLower.length >= 3 && /^[a-z]+$/.test(searchLower)) {
    const fuzzyPattern = generateFuzzyRegex(searchLower);
    if (fuzzyPattern && fuzzyPattern !== searchLower) {
      searchConditions.push(
        { enName: { $regex: fuzzyPattern, $options: 'i' } },
        { pinyin: { $regex: fuzzyPattern, $options: 'i' } }
      );
    }
  }
  
  return { $or: searchConditions };
}

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
    
    if (search) {
      const searchTrimmed = search.trim();
      
      // 使用优化的搜索查询构建函数，支持 name、enName、pinyin、code 字段搜索
      // 并支持拼写容错功能
      const searchQuery = buildSearchQuery(searchTrimmed);
      
      if (searchQuery && searchQuery.$or && searchQuery.$or.length > 0) {
        // 合并搜索条件到query中
        if (query.$or && Array.isArray(query.$or)) {
          query.$or = [...query.$or, ...searchQuery.$or];
        } else {
          query.$or = searchQuery.$or;
        }
      }
      useTextSearch = false;
    }
    
    // country筛选需要在搜索条件之后添加，确保与$or条件正确组合
    if (country) {
      // 如果有搜索条件（$or），需要在每个$or条件中添加country筛选
      if (query.$or && Array.isArray(query.$or)) {
        // 在每个$or条件中添加country筛选
        query.$or = query.$or.map(condition => ({
          ...condition,
          country: { $regex: country, $options: 'i' }
        }));
      } else {
        // 如果没有$or条件，直接添加country筛选
        query.country = { $regex: country, $options: 'i' };
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
