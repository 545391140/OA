const { validationResult } = require('express-validator');
const Location = require('../models/Location');
const logger = require('../utils/logger');

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
 * 构建文本索引搜索查询（优先使用，性能最佳）
 * MongoDB 文本索引支持中文、英文、拼音等多种语言的全文搜索
 */
function buildTextSearchQuery(searchTerm) {
  if (!searchTerm || typeof searchTerm !== 'string') {
    return null;
  }
  
  const searchTrimmed = searchTerm.trim();
  if (!searchTrimmed || searchTrimmed.length < 1) {
    return null;
  }
  
  // 处理搜索词：MongoDB $text 搜索会自动分词
  // 对于中文，需要确保搜索词格式正确
  // 对于英文/拼音，可以支持短语搜索（用引号）或单词搜索
  
  // 清理搜索词：移除特殊字符（但保留空格用于短语搜索）
  let processedSearch = searchTrimmed
    .replace(/[^\w\s\u4e00-\u9fa5]/g, ' ') // 移除特殊字符，保留字母、数字、中文、空格
    .replace(/\s+/g, ' ') // 合并多个空格
    .trim();
  
  if (!processedSearch) {
    return null;
  }
  
  // 构建 $text 查询
  // MongoDB 文本索引会自动匹配包含这些词的文档
  // 使用 $language: 'none' 禁用语言特定处理，支持多语言搜索（中文、英文、拼音）
  return {
    $text: { 
      $search: processedSearch,
      $language: 'none' // 禁用语言特定处理，适合多语言场景
    }
  };
}

/**
 * 生成正则表达式搜索查询条件（降级方案）
 * 支持：中文名称（name）、英文名称（enName）、拼音（pinyin）、代码（code）
 * 支持拼写容错（如 beijning -> beijing）
 * @param {string} searchTerm - 搜索关键词
 * @param {string} searchPriority - 搜索优先级，'enName_pinyin' 表示优先查询 enName 和 pinyin
 */
function buildRegexSearchQuery(searchTerm, searchPriority = null) {
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
  
  // 如果指定了优先查询 enName 和 pinyin，调整查询顺序
  const prioritizeEnNamePinyin = searchPriority === 'enName_pinyin';
  
  if (prioritizeEnNamePinyin) {
    // 1. 精确匹配（最高优先级）- 优先查询 enName、pinyin 字段
    searchConditions.push(
      { enName: { $regex: `^${escapedTrimmed}$`, $options: 'i' } },
      { pinyin: { $regex: `^${escapedLower}$`, $options: 'i' } },
      { name: { $regex: `^${escapedTrimmed}$`, $options: 'i' } },
      { code: { $regex: `^${escapedLower}$`, $options: 'i' } }
    );
    
    // 2. 前缀匹配（高优先级）- 优先查询 enName、pinyin 字段
    searchConditions.push(
      { enName: { $regex: `^${escapedTrimmed}`, $options: 'i' } },
      { pinyin: { $regex: `^${escapedLower}`, $options: 'i' } },
      { name: { $regex: `^${escapedTrimmed}`, $options: 'i' } },
      { code: { $regex: `^${escapedLower}`, $options: 'i' } }
    );
    
    // 3. 包含匹配（中等优先级）- 优先查询 enName、pinyin 字段
    searchConditions.push(
      { enName: { $regex: escapedTrimmed, $options: 'i' } },
      { pinyin: { $regex: escapedLower, $options: 'i' } },
      { name: { $regex: escapedTrimmed, $options: 'i' } },
      { code: { $regex: escapedLower, $options: 'i' } },
      { city: { $regex: escapedTrimmed, $options: 'i' } },
      { province: { $regex: escapedTrimmed, $options: 'i' } },
      { district: { $regex: escapedTrimmed, $options: 'i' } },
      { county: { $regex: escapedTrimmed, $options: 'i' } },
      { country: { $regex: escapedTrimmed, $options: 'i' } },
      { countryCode: { $regex: escapedLower, $options: 'i' } }
    );
  } else {
    // 默认顺序：name、enName、pinyin、code
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
  }
  
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
  logger.info('[LocationController] ========== getLocations 被调用 ==========');
  logger.info(`[LocationController] 请求参数: ${JSON.stringify(req.query, null, 2)}`);
  
  try {
    const { 
      type, 
      status, 
      search, 
      city, 
      country,
      page = 1,
      limit = 20,
      includeChildren = false, // 新增：是否包含子项（机场、火车站）
      searchPriority = null // 新增：搜索优先级，'enName_pinyin' 表示优先查询 enName 和 pinyin
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
      logger.info(`[LocationController] 搜索关键词: ${searchTrimmed}`);
      
      // 优先使用文本索引搜索（性能最佳，适合30万条数据）
      // 文本索引会自动匹配 name、enName、pinyin、code 等字段
      const textSearchQuery = buildTextSearchQuery(searchTrimmed);
      logger.info(`[LocationController] 文本索引查询结果: ${JSON.stringify(textSearchQuery)}`);
      
      if (textSearchQuery && textSearchQuery.$text) {
        // 使用文本索引搜索
        query.$text = textSearchQuery.$text;
        useTextSearch = true;
        logger.info('[LocationController] 使用文本索引搜索');
      } else {
        // 降级使用正则表达式搜索（当文本索引无法使用时）
        const regexSearchQuery = buildRegexSearchQuery(searchTrimmed, searchPriority);
        logger.info(`[LocationController] 正则表达式查询条件数量: ${regexSearchQuery?.$or?.length || 0}`);
        logger.info(`[LocationController] 搜索优先级: ${searchPriority || 'default'}`);
        
        if (regexSearchQuery && regexSearchQuery.$or && regexSearchQuery.$or.length > 0) {
          // 合并搜索条件到query中
          if (query.$or && Array.isArray(query.$or)) {
            query.$or = [...query.$or, ...regexSearchQuery.$or];
          } else {
            query.$or = regexSearchQuery.$or;
          }
        }
        useTextSearch = false;
        logger.info('[LocationController] 使用正则表达式搜索');
      }
      
      logger.info(`[LocationController] 最终查询条件: ${JSON.stringify(query, null, 2)}`);
    }
    
    // country筛选需要在搜索条件之后添加，确保与$text或$or条件正确组合
    if (country) {
      if (useTextSearch && query.$text) {
        // 文本搜索时，country作为额外的过滤条件
        query.country = { $regex: country, $options: 'i' };
      } else if (query.$or && Array.isArray(query.$or)) {
        // 如果有$or条件，需要在每个$or条件中添加country筛选
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
    // 如果没有搜索关键词（获取全部数据），允许更大的 limit（用于差旅规则配置等场景）
    // 如果有搜索关键词，限制最大100条以防止性能问题
    const maxLimit = search ? 100 : 10000; // 无搜索时允许10000条，有搜索时限制100条
    const limitNum = Math.min(parseInt(limit, 10) || 20, maxLimit);
    const skip = (pageNum - 1) * limitNum;
    const includeChildrenFlag = includeChildren === 'true' || includeChildren === true;

    // 获取总数和分页数据
    // 优先使用文本索引搜索，如果失败则降级使用正则表达式
    let total, locations, sortOptions = { type: 1, name: 1 };
    
    try {
      if (useTextSearch) {
        // 文本搜索时，优先按文本相关性排序，然后按类型和名称
        // $meta: 'textScore' 会根据文本匹配的相关性评分排序
        sortOptions = { score: { $meta: 'textScore' }, type: 1, name: 1 };
        
        // 获取分页数据（包含文本相关性评分）
        const findQuery = { ...query };
        
        // MongoDB 4.0+ 支持 countDocuments 与 $text 一起使用
        // 但对于30万条数据，如果结果很多，countDocuments 可能较慢
        // 为了提高性能，可以先获取分页数据，然后估算总数
        try {
          // 先获取总数（如果数据量大可能较慢）
          total = await Location.countDocuments(findQuery);
        } catch (countError) {
          // 如果 countDocuments 失败，使用 find 估算（限制查询数量以提高性能）
          logger.warn('[LocationController] countDocuments 失败，使用 find 估算总数:', countError.message);
          const estimateLimit = 10000;
          const estimateResults = await Location.find(findQuery).limit(estimateLimit + 1).lean();
          total = estimateResults.length;
          // 如果返回了 estimateLimit + 1 条，说明可能还有更多
          if (total > estimateLimit) {
            total = estimateLimit; // 限制最大显示数量，避免性能问题
          }
        }
        
        // 获取分页数据（包含文本相关性评分）
        // 优化：不 populate parentId，减少查询时间（如果需要可以在前端处理）
        logger.info(`[LocationController] 执行文本索引查询，查询条件: ${JSON.stringify(findQuery, null, 2)}`);
        locations = await Location.find(findQuery)
          .select({ score: { $meta: 'textScore' } }) // 包含文本评分字段
          .sort(sortOptions)
          .skip(skip)
          .limit(limitNum)
          .allowDiskUse(true) // 避免大数据量排序时内存超限
          .lean(); // 使用 lean() 返回纯对象，提高性能
        logger.info(`[LocationController] 文本索引搜索结果数量: ${locations.length}`);
        if (locations.length > 0) {
          logger.info(`[LocationController] 前3个结果: ${JSON.stringify(locations.slice(0, 3).map(loc => ({
            name: loc.name,
            pinyin: loc.pinyin,
            enName: loc.enName,
            code: loc.code,
            type: loc.type
          })), null, 2)}`);
        } else {
          // 如果文本索引搜索没有找到结果，降级使用正则表达式搜索
          logger.warn(`[LocationController] 文本索引搜索没有找到结果，降级使用正则表达式搜索`);
          logger.info(`[LocationController] 原始查询条件: ${JSON.stringify(findQuery, null, 2)}`);
          
          // 使用正则表达式搜索
          const searchTrimmed = search.trim();
          const regexSearchQuery = buildRegexSearchQuery(searchTrimmed);
          
          if (regexSearchQuery && regexSearchQuery.$or && regexSearchQuery.$or.length > 0) {
            const fallbackQuery = {
              status: query.status || 'active',
              $or: regexSearchQuery.$or
            };
            
            logger.info(`[LocationController] 降级查询条件: ${JSON.stringify(fallbackQuery, null, 2)}`);
            
            // 使用降级查询
            sortOptions = { type: 1, name: 1 };
            total = await Location.countDocuments(fallbackQuery);
            locations = await Location.find(fallbackQuery)
              .sort(sortOptions)
              .skip(skip)
              .limit(limitNum)
              .allowDiskUse(true) // 避免大数据量排序时内存超限
              .lean();
            
            logger.info(`[LocationController] 降级搜索结果数量: ${locations.length}`);
            if (locations.length > 0) {
              logger.info(`[LocationController] 降级搜索前3个结果: ${JSON.stringify(locations.slice(0, 3).map(loc => ({
                name: loc.name,
                pinyin: loc.pinyin,
                enName: loc.enName,
                code: loc.code,
                type: loc.type
              })), null, 2)}`);
            }
          }
        }
        
        // 如果需要包含子项，批量查询
        if (includeChildrenFlag) {
          const cityIds = locations
            .filter(loc => loc.type === 'city' && loc._id)
            .map(loc => loc._id);
          
          if (cityIds.length > 0) {
            // 批量查询所有城市的子项（一次性查询，性能更好）
            const childrenLocations = await Location.find({
              parentId: { $in: cityIds },
              status: 'active'
            })
            .sort({ type: 1, name: 1 })
            .lean();
            
            // 将子项添加到结果中
            locations = [...locations, ...childrenLocations];
          }
        }
      } else {
        // 使用正则表达式搜索
        sortOptions = { type: 1, name: 1 };
        
        // 获取总数
        logger.info(`[LocationController] 执行正则表达式查询，查询条件: ${JSON.stringify(query, null, 2)}`);
        total = await Location.countDocuments(query);
        logger.info(`[LocationController] 正则表达式查询总数: ${total}`);
        
        // 获取分页数据
        // 优化：不 populate parentId，减少查询时间
        locations = await Location.find(query)
          .sort(sortOptions)
          .skip(skip)
          .limit(limitNum)
          .allowDiskUse(true) // 避免大数据量排序时内存超限
          .lean(); // 使用 lean() 返回纯对象，提高性能
        logger.info(`[LocationController] 正则表达式搜索结果数量: ${locations.length}`);
        if (locations.length > 0) {
          logger.info(`[LocationController] 前3个结果: ${JSON.stringify(locations.slice(0, 3).map(loc => ({
            name: loc.name,
            pinyin: loc.pinyin,
            enName: loc.enName,
            code: loc.code,
            type: loc.type
          })), null, 2)}`);
        } else {
          logger.warn(`[LocationController] 没有找到匹配的结果，查询条件: ${JSON.stringify(query, null, 2)}`);
        }
        
        // 如果需要包含子项，批量查询
        if (includeChildrenFlag) {
          const cityIds = locations
            .filter(loc => loc.type === 'city' && loc._id)
            .map(loc => loc._id);
          
          if (cityIds.length > 0) {
            // 批量查询所有城市的子项（一次性查询，性能更好）
            const childrenLocations = await Location.find({
              parentId: { $in: cityIds },
              status: 'active'
            })
            .sort({ type: 1, name: 1 })
            .lean();
            
            // 将子项添加到结果中
            locations = [...locations, ...childrenLocations];
          }
        }
      }
    } catch (error) {
      // 如果文本索引查询失败（例如集合没有文本索引或文本索引未创建），降级使用正则表达式
      if (useTextSearch && (
        error.message && (
          error.message.includes('text index') || 
          error.message.includes('no text index') ||
          error.message.includes('$text') ||
          error.code === 27 // MongoDB error code for text index not found
        )
      )) {
        logger.warn('[LocationController] 文本索引查询失败，降级使用正则表达式:', error.message);
        
        // 重新构建查询，使用正则表达式
        const searchTrimmed = search.trim();
        const fallbackQuery = { ...query };
        delete fallbackQuery.$text; // 移除 $text 查询
        
        // 使用正则表达式搜索
        const regexSearchQuery = buildRegexSearchQuery(searchTrimmed);
        if (regexSearchQuery && regexSearchQuery.$or) {
          fallbackQuery.$or = regexSearchQuery.$or;
        } else {
          // 如果构建失败，使用简单的正则表达式
          fallbackQuery.$or = [
            { name: { $regex: searchTrimmed, $options: 'i' } },
            { code: { $regex: searchTrimmed, $options: 'i' } },
            { city: { $regex: searchTrimmed, $options: 'i' } },
            { province: { $regex: searchTrimmed, $options: 'i' } },
            { district: { $regex: searchTrimmed, $options: 'i' } },
            { county: { $regex: searchTrimmed, $options: 'i' } },
            { country: { $regex: searchTrimmed, $options: 'i' } },
            { countryCode: { $regex: searchTrimmed, $options: 'i' } },
            { enName: { $regex: searchTrimmed, $options: 'i' } },
            { pinyin: { $regex: searchTrimmed.toLowerCase(), $options: 'i' } }
          ];
        }
        
        // 合并其他查询条件（type, status, city, country）
        if (type) fallbackQuery.type = type;
        if (status) fallbackQuery.status = status;
        if (city) fallbackQuery.city = { $regex: city, $options: 'i' };
        if (country) {
          if (fallbackQuery.$or && Array.isArray(fallbackQuery.$or)) {
            fallbackQuery.$or = fallbackQuery.$or.map(condition => ({
              ...condition,
              country: { $regex: country, $options: 'i' }
            }));
          } else {
            fallbackQuery.country = { $regex: country, $options: 'i' };
          }
        }
        
        // 使用降级查询
        sortOptions = { type: 1, name: 1 };
        total = await Location.countDocuments(fallbackQuery);
        locations = await Location.find(fallbackQuery)
          .sort(sortOptions)
          .skip(skip)
          .limit(limitNum)
          .allowDiskUse(true) // 避免大数据量排序时内存超限
          .lean(); // 使用 lean() 返回纯对象，提高性能
        
        // 如果需要包含子项，批量查询
        if (includeChildrenFlag) {
          const cityIds = locations
            .filter(loc => loc.type === 'city' && loc._id)
            .map(loc => loc._id);
          
          if (cityIds.length > 0) {
            const childrenLocations = await Location.find({
              parentId: { $in: cityIds },
              status: 'active'
            })
            .sort({ type: 1, name: 1 })
            .lean();
            
            locations = [...locations, ...childrenLocations];
          }
        }
      } else {
        // 其他错误，直接抛出
        logger.error('[LocationController] 查询失败:', error);
        throw error;
      }
    }

    // 批量查询 parentId 对应的城市信息（用于显示）
    const parentIds = locations
      .map(loc => {
        if (!loc.parentId) return null;
        // parentId 可能是 ObjectId 对象或字符串
        if (typeof loc.parentId === 'object' && loc.parentId._id) {
          return loc.parentId._id;
        }
        return loc.parentId;
      })
      .filter(id => id !== null);

    if (parentIds.length > 0) {
      try {
        // 批量查询 parentId 对应的城市信息
        const parentCities = await Location.find({
          _id: { $in: parentIds }
        })
        .select('name code enName type city province noAirport')
        .lean();

        // 创建 parentId -> city info 的映射
        const parentCityMap = new Map();
        parentCities.forEach(city => {
          parentCityMap.set(city._id.toString(), {
            name: city.name,
            code: city.code,
            enName: city.enName,
            type: city.type,
            city: city.city,
            province: city.province,
            noAirport: city.noAirport || false
          });
        });

        // 将 parentId 信息合并到 locations 中
        locations = locations.map(loc => {
          if (loc.parentId) {
            let parentIdStr = null;
            if (typeof loc.parentId === 'object' && loc.parentId._id) {
              parentIdStr = loc.parentId._id.toString();
            } else {
              parentIdStr = loc.parentId.toString();
            }

            if (parentCityMap.has(parentIdStr)) {
              loc.parentId = {
                _id: parentIdStr,
                ...parentCityMap.get(parentIdStr)
              };
            }
          }
          return loc;
        });
      } catch (parentError) {
        // 如果查询 parentId 失败，不影响主查询结果
        logger.warn('[LocationController] 批量查询 parentId 失败:', parentError.message);
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
    logger.error('[LocationController] Get locations error:', {
      error: error.message,
      stack: error.stack,
      query: req.query
    });
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
      .populate('parentId', 'name code type city province noAirport');

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
    logger.error('Get location error:', error);
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
      .populate('parentId', 'name code type city province noAirport')
      .sort({ type: 1, name: 1 });

    res.json({
      success: true,
      count: locations.length,
      data: locations
    });
  } catch (error) {
    logger.error('Get locations by parent error:', error);
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
    logger.error('Create location error:', error);
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
    logger.error('Update location error:', error);
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
    logger.error('Delete location error:', error);
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
    logger.error('Batch create locations error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};
