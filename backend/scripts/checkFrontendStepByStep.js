/**
 * 一步步检查前端问题
 * 模拟前端的数据处理流程，找出问题所在
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const mongoose = require('mongoose');
const connectDB = require('../config/database');
const Location = require('../models/Location');

async function checkFrontendStepByStep() {
  try {
    console.log('正在连接数据库...');
    await connectDB();
    console.log('✓ 数据库连接成功\n');

    const searchTerm = 'Tokyo';
    const status = 'active';
    const searchPriority = 'enName_pinyin';
    const transportationType = null; // 先测试没有交通工具类型限制的情况
    const page = 1;
    const limit = 50;
    
    console.log('='.repeat(80));
    console.log('一步步检查前端问题');
    console.log('='.repeat(80));
    console.log(`搜索词: ${searchTerm}`);
    console.log(`status: ${status}`);
    console.log(`searchPriority: ${searchPriority}`);
    console.log(`transportationType: ${transportationType || 'null'}`);
    console.log(`page: ${page}, limit: ${limit}\n`);
    
    // ==========================================
    // 步骤 1: 模拟前端 API 调用参数构建
    // ==========================================
    console.log('【步骤 1】模拟前端 API 调用参数构建');
    console.log('-'.repeat(80));
    
    // 模拟前端的 isPinyinOrEnglish 检测
    function isPinyinOrEnglish(str) {
      if (!str) return false;
      const trimmed = str.trim();
      const hasChinese = /[\u4e00-\u9fa5]/.test(trimmed);
      if (hasChinese) return false;
      return /^[a-z\s]+$/i.test(trimmed);
    }
    
    const trimmedKeyword = searchTerm.trim();
    const isPinyinOrEnglishVal = isPinyinOrEnglish(trimmedKeyword);
    const searchPriorityForAPI = isPinyinOrEnglishVal ? 'enName_pinyin' : null;
    
    console.log(`trimmedKeyword: "${trimmedKeyword}"`);
    console.log(`isPinyinOrEnglish("${trimmedKeyword}"): ${isPinyinOrEnglishVal}`);
    console.log(`searchPriorityForAPI: ${searchPriorityForAPI}`);
    
    const apiParams = {
      status: 'active',
      search: trimmedKeyword,
      page: page,
      limit: limit
    };
    
    if (searchPriorityForAPI) {
      apiParams.searchPriority = searchPriorityForAPI;
    }
    
    if (transportationType) {
      switch (transportationType) {
        case 'flight':
          apiParams.includeChildren = 'true';
          apiParams.maxChildrenPerCity = 5;
          break;
        case 'train':
          apiParams.includeChildren = 'true';
          apiParams.maxChildrenPerCity = 5;
          break;
        case 'car':
        case 'bus':
          apiParams.type = 'city';
          break;
      }
    } else {
      apiParams.includeChildren = 'true';
      apiParams.maxChildrenPerCity = 5;
    }
    
    console.log('\nAPI 请求参数:');
    console.log(JSON.stringify(apiParams, null, 2));
    
    // ==========================================
    // 步骤 2: 模拟后端 API 响应
    // ==========================================
    console.log('\n【步骤 2】模拟后端 API 响应');
    console.log('-'.repeat(80));
    
    // 复制实际代码的查询逻辑
    function escapeRegex(str) {
      return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }
    
    function detectInputType(searchTerm) {
      if (!searchTerm || typeof searchTerm !== 'string') {
        return { type: 'unknown', isPinyinOrEnglish: false };
      }
      const trimmed = searchTerm.trim();
      if (/^[A-Z0-9]{2,5}$/i.test(trimmed)) {
        return { type: 'code', isPinyinOrEnglish: false };
      }
      const hasChinese = /[\u4e00-\u9fa5]/.test(trimmed);
      if (hasChinese) {
        return { type: 'chinese', isPinyinOrEnglish: false };
      }
      if (/^[a-z\s]+$/i.test(trimmed)) {
        return { type: 'pinyin', isPinyinOrEnglish: true };
      }
      return { type: 'pinyin', isPinyinOrEnglish: true };
    }
    
    function buildRegexSearchQuery(searchTerm, searchPriority = null, status = null, prefixOnly = false) {
      if (!searchTerm || typeof searchTerm !== 'string') {
        return null;
      }
      const searchTrimmed = searchTerm.trim();
      if (!searchTrimmed) {
        return null;
      }
      const searchLower = searchTrimmed.toLowerCase();
      const escapedTrimmed = escapeRegex(searchTrimmed);
      const escapedLower = escapeRegex(searchLower);
      const inputType = detectInputType(searchTrimmed);
      
      const addStatusCondition = (condition) => {
        if (status) {
          return { ...condition, status };
        }
        return condition;
      };
      
      const searchConditions = [];
      const forceEnNamePinyin = searchPriority === 'enName_pinyin';
      
      if (inputType.isPinyinOrEnglish || forceEnNamePinyin) {
        searchConditions.push(
          addStatusCondition({ enName: { $regex: `^${escapedTrimmed}$`, $options: 'i' } }),
          addStatusCondition({ pinyin: { $regex: `^${escapedLower}$`, $options: 'i' } })
        );
        searchConditions.push(
          addStatusCondition({ enName: { $regex: `^${escapedTrimmed}`, $options: 'i' } }),
          addStatusCondition({ pinyin: { $regex: `^${escapedLower}`, $options: 'i' } })
        );
        if (!prefixOnly) {
          searchConditions.push(
            addStatusCondition({ enName: { $regex: escapedTrimmed, $options: 'i' } }),
            addStatusCondition({ pinyin: { $regex: escapedLower, $options: 'i' } })
          );
        }
      }
      
      return { $or: searchConditions };
    }
    
    // 执行查询
    const searchTrimmed = apiParams.search.trim();
    const inputType = detectInputType(searchTrimmed);
    const prefixOnlyQuery = buildRegexSearchQuery(searchTrimmed, searchPriorityForAPI, status, true);
    
    let optimizedQuery = {};
    let statusMergedIntoOr = false;
    
    if (prefixOnlyQuery && prefixOnlyQuery.$or && prefixOnlyQuery.$or.length > 0) {
      const allHaveStatus = prefixOnlyQuery.$or.every(cond => cond.status === status);
      statusMergedIntoOr = allHaveStatus;
      
      if (allHaveStatus && status) {
        optimizedQuery = {
          status: status,
          $or: prefixOnlyQuery.$or.map(cond => {
            const { status: _, ...rest } = cond;
            return rest;
          })
        };
      } else {
        optimizedQuery = prefixOnlyQuery;
      }
    }
    
    const escapedTrimmed = escapeRegex(searchTrimmed);
    const escapedLower = escapeRegex(searchTrimmed.toLowerCase());
    
    const pipeline = [
      { $match: optimizedQuery }
    ];
    
    if (inputType.isPinyinOrEnglish) {
      pipeline.push({
        $addFields: {
          matchScore: {
            $cond: [
              { $or: [
                { $eq: [{ $toLower: { $ifNull: ['$pinyin', ''] } }, escapedLower] },
                { $eq: [{ $toLower: { $ifNull: ['$enName', ''] } }, escapedLower] }
              ]},
              100,
              {
                $cond: [
                  { $or: [
                    { $regexMatch: { input: { $toLower: { $ifNull: ['$pinyin', ''] } }, regex: `^${escapedLower}`, options: 'i' } },
                    { $regexMatch: { input: { $toLower: { $ifNull: ['$enName', ''] } }, regex: `^${escapedTrimmed}`, options: 'i' } }
                  ]},
                  80,
                  0
                ]
              }
            ]
          }
        }
      });
    }
    
    pipeline.push({ $sort: { matchScore: -1, type: 1, name: 1 } });
    pipeline.push({ $skip: (page - 1) * limit });
    pipeline.push({ $limit: limit });
    
    const locations = await Location.aggregate(pipeline);
    const total = await Location.countDocuments(optimizedQuery);
    
    console.log(`查询结果: ${locations.length} 条`);
    console.log(`总数: ${total}`);
    
    if (locations.length > 0) {
      console.log('\n第一条结果:');
      console.log(JSON.stringify(locations[0], null, 2));
    }
    
    // 模拟 API 响应格式
    const apiResponse = {
      success: true,
      data: locations,
      pagination: {
        page: page,
        limit: limit,
        total: total,
        totalPages: Math.ceil(total / limit)
      }
    };
    
    console.log('\nAPI 响应格式:');
    console.log(`  success: ${apiResponse.success}`);
    console.log(`  data.length: ${apiResponse.data.length}`);
    console.log(`  pagination.total: ${apiResponse.pagination.total}`);
    
    // ==========================================
    // 步骤 3: 模拟前端响应处理
    // ==========================================
    console.log('\n【步骤 3】模拟前端响应处理');
    console.log('-'.repeat(80));
    
    // 检查响应格式
    if (!apiResponse.data || !apiResponse.success) {
      console.log('✗ API 响应格式错误');
      console.log(`  success: ${apiResponse.success}`);
      console.log(`  data: ${apiResponse.data}`);
      return;
    }
    
    const locationsFromAPI = apiResponse.data || [];
    console.log(`✓ API 响应正常，收到 ${locationsFromAPI.length} 条数据`);
    
    // ==========================================
    // 步骤 4: 模拟前端数据转换 (transformLocationData)
    // ==========================================
    console.log('\n【步骤 4】模拟前端数据转换 (transformLocationData)');
    console.log('-'.repeat(80));
    
    function transformLocationData(loc) {
      if (!loc) {
        console.log('  ⚠ transformLocationData: loc 为 null 或 undefined');
        return null;
      }
      
      try {
        return {
          id: loc._id?.toString() || loc.id,
          _id: loc._id?.toString() || loc._id,
          name: loc.name,
          code: loc.code || '',
          type: loc.type,
          city: loc.city || loc.name,
          province: loc.province || '',
          district: loc.district || '',
          county: loc.county || '',
          country: loc.country || '',
          countryCode: loc.countryCode || '',
          enName: loc.enName || '',
          pinyin: loc.pinyin || '',
          coordinates: loc.coordinates || { latitude: 0, longitude: 0 },
          timezone: loc.timezone || 'Asia/Shanghai',
          status: loc.status || 'active',
          parentId: loc.parentId?.toString() || loc.parentId || null,
          parentCity: loc.parentCity || null,
          parentIdObj: loc.parentIdObj || null,
          riskLevel: loc.riskLevel || 'low',
          noAirport: loc.noAirport || false
        };
      } catch (error) {
        console.log(`  ✗ transformLocationData 转换失败: ${error.message}`);
        return null;
      }
    }
    
    const validLocations = locationsFromAPI
      .map((loc, idx) => {
        const transformed = transformLocationData(loc);
        if (!transformed && loc) {
          console.log(`  ⚠ 第 ${idx + 1} 条数据转换失败`);
          console.log(`     原始数据:`, JSON.stringify(loc, null, 2));
        }
        return transformed;
      })
      .filter(location => location !== null);
    
    console.log(`原始数据数量: ${locationsFromAPI.length}`);
    console.log(`转换后数量: ${validLocations.length}`);
    
    if (validLocations.length === 0 && locationsFromAPI.length > 0) {
      console.log('\n✗ 所有数据转换失败！');
      console.log('原始数据示例:');
      console.log(JSON.stringify(locationsFromAPI[0], null, 2));
      return;
    }
    
    if (validLocations.length > 0) {
      console.log('\n转换后的第一条数据:');
      console.log(JSON.stringify(validLocations[0], null, 2));
    }
    
    // ==========================================
    // 步骤 5: 模拟前端 includeChildren 处理
    // ==========================================
    console.log('\n【步骤 5】模拟前端 includeChildren 处理');
    console.log('-'.repeat(80));
    
    let processedLocations = [...validLocations];
    
    if (apiParams.includeChildren === 'true' && (transportationType === 'flight' || transportationType === 'train')) {
      console.log('处理 includeChildren 逻辑...');
      const cityMap = new Map();
      
      validLocations.forEach(loc => {
        if (loc.type === 'city' && loc._id) {
          cityMap.set(loc._id.toString(), loc);
        }
      });
      
      validLocations.forEach(loc => {
        if ((loc.type === 'airport' || loc.type === 'station') && loc.parentId) {
          const parentIdStr = loc.parentId.toString();
          if (parentIdStr && !cityMap.has(parentIdStr) && loc.parentIdObj) {
            const parentCity = loc.parentIdObj;
            if (parentCity.name) {
              const cityInfo = {
                id: parentIdStr,
                _id: parentIdStr,
                name: parentCity.name,
                code: parentCity.code || '',
                type: 'city',
                city: parentCity.city || parentCity.name,
                province: parentCity.province || '',
                district: '',
                county: '',
                country: loc.country || '中国',
                countryCode: loc.countryCode || '',
                enName: parentCity.enName || '',
                pinyin: '',
                coordinates: { latitude: 0, longitude: 0 },
                timezone: 'Asia/Shanghai',
                status: 'active',
                parentId: null,
                parentCity: null,
                parentIdObj: null,
                riskLevel: 'low',
                noAirport: parentCity.noAirport || false
              };
              cityMap.set(parentIdStr, cityInfo);
              processedLocations.push(cityInfo);
            }
          }
        }
      });
      
      console.log(`处理 includeChildren 后数量: ${processedLocations.length}`);
    } else {
      console.log('跳过 includeChildren 处理');
    }
    
    // ==========================================
    // 步骤 6: 模拟前端去重逻辑
    // ==========================================
    console.log('\n【步骤 6】模拟前端去重逻辑');
    console.log('-'.repeat(80));
    
    const uniqueLocations = Array.from(
      new Map(processedLocations.map(loc => [loc._id || loc.id, loc])).values()
    );
    
    console.log(`去重前数量: ${processedLocations.length}`);
    console.log(`去重后数量: ${uniqueLocations.length}`);
    
    if (uniqueLocations.length === 0 && processedLocations.length > 0) {
      console.log('✗ 去重后结果为空！');
      console.log('检查 _id 和 id 字段:');
      processedLocations.forEach((loc, idx) => {
        console.log(`  [${idx + 1}] _id: ${loc._id}, id: ${loc.id}`);
      });
      return;
    }
    
    // ==========================================
    // 步骤 7: 模拟前端 transportationType 过滤
    // ==========================================
    console.log('\n【步骤 7】模拟前端 transportationType 过滤');
    console.log('-'.repeat(80));
    
    let filteredResults = uniqueLocations;
    
    if (transportationType) {
      console.log(`应用 transportationType 过滤: ${transportationType}`);
      filteredResults = uniqueLocations.filter(location => {
        switch (transportationType) {
          case 'flight':
            const flightMatch = location.type === 'airport' || location.type === 'city';
            if (!flightMatch) {
              console.log(`  过滤掉: ${location.name} (type: ${location.type})`);
            }
            return flightMatch;
          case 'train':
            const trainMatch = location.type === 'station' || location.type === 'city';
            if (!trainMatch) {
              console.log(`  过滤掉: ${location.name} (type: ${location.type})`);
            }
            return trainMatch;
          case 'car':
          case 'bus':
            const carMatch = location.type === 'city';
            if (!carMatch) {
              console.log(`  过滤掉: ${location.name} (type: ${location.type})`);
            }
            return carMatch;
          default:
            return true;
        }
      });
      console.log(`过滤前数量: ${uniqueLocations.length}`);
      console.log(`过滤后数量: ${filteredResults.length}`);
    } else {
      console.log('无 transportationType，不过滤');
    }
    
    if (filteredResults.length === 0 && uniqueLocations.length > 0 && transportationType) {
      console.log('\n✗ transportationType 过滤掉了所有结果！');
      console.log('被过滤的数据:');
      uniqueLocations.forEach(loc => {
        console.log(`  - ${loc.name} (type: ${loc.type})`);
      });
      return;
    }
    
    // ==========================================
    // 步骤 8: 最终去重
    // ==========================================
    console.log('\n【步骤 8】最终去重');
    console.log('-'.repeat(80));
    
    const finalResults = Array.from(
      new Map(filteredResults.map(item => [item._id || item.id, item])).values()
    );
    
    console.log(`最终结果数量: ${finalResults.length}`);
    
    if (finalResults.length > 0) {
      console.log('\n最终结果:');
      finalResults.forEach((loc, idx) => {
        console.log(`  [${idx + 1}] ${loc.name} (${loc.enName}, ${loc.pinyin}) - type: ${loc.type}`);
      });
    }
    
    // ==========================================
    // 步骤 9: 检查前端显示条件
    // ==========================================
    console.log('\n【步骤 9】检查前端显示条件');
    console.log('-'.repeat(80));
    
    function isValidSearchLength(keyword) {
      if (!keyword || !keyword.trim()) return false;
      const trimmed = keyword.trim();
      const hasChinese = /[\u4e00-\u9fa5]/.test(trimmed);
      if (hasChinese) {
        return trimmed.length >= 2;
      }
      return trimmed.length >= 3;
    }
    
    const searchValue = searchTerm;
    const filteredLocations = finalResults;
    
    const shouldShowNoMatch = filteredLocations.length === 0 && 
                              searchValue.trim() && 
                              isValidSearchLength(searchValue);
    
    console.log(`searchValue: "${searchValue}"`);
    console.log(`searchValue.trim(): "${searchValue.trim()}"`);
    console.log(`isValidSearchLength("${searchValue}"): ${isValidSearchLength(searchValue)}`);
    console.log(`filteredLocations.length: ${filteredLocations.length}`);
    console.log(`shouldShowNoMatch: ${shouldShowNoMatch}`);
    
    if (shouldShowNoMatch) {
      console.log('\n⚠ 前端会显示"未找到匹配的地区"');
    } else {
      console.log('\n✓ 前端应该显示结果');
    }
    
    // ==========================================
    // 步骤 10: 问题总结
    // ==========================================
    console.log('\n【步骤 10】问题总结');
    console.log('='.repeat(80));
    
    const issues = [];
    
    if (locations.length === 0) {
      issues.push('✗ 后端查询返回空结果');
    }
    
    if (validLocations.length === 0 && locations.length > 0) {
      issues.push('✗ 数据转换失败（transformLocationData）');
    }
    
    if (uniqueLocations.length === 0 && processedLocations.length > 0) {
      issues.push('✗ 去重后结果为空');
    }
    
    if (filteredResults.length === 0 && uniqueLocations.length > 0 && transportationType) {
      issues.push(`✗ transportationType="${transportationType}" 过滤掉了所有结果`);
    }
    
    if (finalResults.length === 0 && filteredResults.length > 0) {
      issues.push('✗ 最终去重后结果为空');
    }
    
    if (shouldShowNoMatch && finalResults.length > 0) {
      issues.push('⚠ 前端显示条件判断有误');
    }
    
    if (issues.length === 0) {
      console.log('✓ 所有步骤检查通过，未发现问题');
      console.log('\n建议：');
      console.log('1. 检查浏览器 Network 标签，查看实际 API 请求和响应');
      console.log('2. 检查浏览器 Console 标签，查看是否有错误');
      console.log('3. 检查 React DevTools，查看组件状态');
      console.log('4. 检查是否有其他过滤逻辑或条件');
    } else {
      console.log('发现以下问题：');
      issues.forEach((issue, idx) => {
        console.log(`  ${idx + 1}. ${issue}`);
      });
    }
    
    console.log('\n✓ 检查完成');
    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error('\n✗ 错误:', error.message);
    console.error(error.stack);
    await mongoose.connection.close();
    process.exit(1);
  }
}

checkFrontendStepByStep();

