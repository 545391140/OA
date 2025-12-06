/**
 * 模拟实际 API 调用，测试 Tokyo 搜索的完整流程
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const mongoose = require('mongoose');
const connectDB = require('../config/database');
const Location = require('../models/Location');

async function testTokyoAPI() {
  try {
    console.log('正在连接数据库...');
    await connectDB();
    console.log('✓ 数据库连接成功\n');

    const searchTerm = 'Tokyo';
    const status = 'active';
    const searchPriority = 'enName_pinyin';
    const page = 1;
    const limit = 20;
    const skip = (page - 1) * limit;
    const transportationType = null; // 模拟没有交通工具类型限制
    
    console.log('='.repeat(80));
    console.log('模拟实际 API 调用流程');
    console.log('='.repeat(80));
    console.log(`搜索词: ${searchTerm}`);
    console.log(`status: ${status}`);
    console.log(`searchPriority: ${searchPriority}`);
    console.log(`transportationType: ${transportationType || 'null'}`);
    console.log(`page: ${page}, limit: ${limit}\n`);
    
    // ==========================================
    // 1. 模拟实际代码的查询逻辑（完整版）
    // ==========================================
    console.log('【1】模拟实际代码的完整查询逻辑');
    console.log('-'.repeat(80));
    
    // 复制实际代码中的函数
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
    
    // 模拟实际代码的查询流程
    const searchTrimmed = searchTerm.trim();
    const inputType = detectInputType(searchTrimmed);
    const prefixOnlyQuery = buildRegexSearchQuery(searchTrimmed, searchPriority, status, true);
    
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
    
    console.log('优化后的查询:', JSON.stringify(optimizedQuery, null, 2));
    
    // 构建聚合管道（完整版，包含 $addFields）
    const escapedTrimmed = escapeRegex(searchTrimmed);
    const escapedLower = escapeRegex(searchTrimmed.toLowerCase());
    
    const pipeline = [
      { $match: optimizedQuery }
    ];
    
    // 添加匹配评分（这是实际代码中的逻辑）
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
    pipeline.push({ $skip: skip });
    pipeline.push({ $limit: limit });
    
    console.log('\n完整聚合管道:');
    console.log(JSON.stringify(pipeline, null, 2));
    
    // 执行聚合查询
    let locations = [];
    try {
      locations = await Location.aggregate(pipeline);
      console.log(`\n✓ 聚合查询成功，找到 ${locations.length} 条结果`);
    } catch (error) {
      console.log(`\n✗ 聚合查询失败: ${error.message}`);
      console.log(`   错误堆栈: ${error.stack}`);
    }
    
    // ==========================================
    // 2. 检查聚合结果
    // ==========================================
    console.log('\n【2】检查聚合结果');
    console.log('-'.repeat(80));
    if (locations.length > 0) {
      locations.forEach((loc, idx) => {
        console.log(`\n  [${idx + 1}] ${loc.name || 'N/A'}`);
        console.log(`      _id: ${loc._id}`);
        console.log(`      enName: ${loc.enName || 'N/A'}`);
        console.log(`      pinyin: ${loc.pinyin || 'N/A'}`);
        console.log(`      type: ${loc.type || 'N/A'}`);
        console.log(`      status: ${loc.status || 'N/A'}`);
        console.log(`      matchScore: ${loc.matchScore !== undefined ? loc.matchScore : 'N/A'}`);
      });
    } else {
      console.log('✗ 聚合查询返回空结果！');
    }
    
    // ==========================================
    // 3. 模拟前端的数据处理（transformLocationData）
    // ==========================================
    console.log('\n【3】模拟前端的数据处理');
    console.log('-'.repeat(80));
    
    function transformLocationData(loc) {
      if (!loc) return null;
      
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
    }
    
    const validLocations = locations
      .map(transformLocationData)
      .filter(location => location !== null);
    
    console.log(`原始结果数量: ${locations.length}`);
    console.log(`转换后数量: ${validLocations.length}`);
    
    if (validLocations.length > 0) {
      console.log('\n转换后的第一条数据:');
      console.log(JSON.stringify(validLocations[0], null, 2));
    }
    
    // ==========================================
    // 4. 模拟前端的过滤逻辑（transportationType）
    // ==========================================
    console.log('\n【4】模拟前端的过滤逻辑（transportationType）');
    console.log('-'.repeat(80));
    
    let filteredResults = validLocations;
    if (transportationType) {
      console.log(`应用 transportationType 过滤: ${transportationType}`);
      filteredResults = validLocations.filter(location => {
        switch (transportationType) {
          case 'flight':
            return location.type === 'airport' || location.type === 'city';
          case 'train':
            return location.type === 'station' || location.type === 'city';
          case 'car':
          case 'bus':
            return location.type === 'city';
          default:
            return true;
        }
      });
      console.log(`过滤后数量: ${filteredResults.length}`);
    } else {
      console.log('无 transportationType，不过滤');
    }
    
    // ==========================================
    // 5. 模拟前端的去重逻辑
    // ==========================================
    console.log('\n【5】模拟前端的去重逻辑');
    console.log('-'.repeat(80));
    
    const uniqueResults = Array.from(
      new Map(filteredResults.map(item => [item._id || item.id, item])).values()
    );
    
    console.log(`去重前数量: ${filteredResults.length}`);
    console.log(`去重后数量: ${uniqueResults.length}`);
    
    // ==========================================
    // 6. 模拟 API 响应格式
    // ==========================================
    console.log('\n【6】模拟 API 响应格式');
    console.log('-'.repeat(80));
    
    const apiResponse = {
      success: true,
      data: uniqueResults,
      pagination: {
        page: page,
        limit: limit,
        total: uniqueResults.length,
        totalPages: Math.ceil(uniqueResults.length / limit)
      }
    };
    
    console.log('API 响应结构:');
    console.log(`  success: ${apiResponse.success}`);
    console.log(`  data.length: ${apiResponse.data.length}`);
    console.log(`  pagination.total: ${apiResponse.pagination.total}`);
    
    // ==========================================
    // 7. 检查前端显示条件
    // ==========================================
    console.log('\n【7】检查前端显示条件');
    console.log('-'.repeat(80));
    
    const searchValue = searchTerm;
    const isValidSearchLength = (keyword) => {
      if (!keyword || !keyword.trim()) return false;
      const trimmed = keyword.trim();
      const hasChinese = /[\u4e00-\u9fa5]/.test(trimmed);
      if (hasChinese) {
        return trimmed.length >= 2;
      }
      return trimmed.length >= 3;
    };
    
    const shouldShowNoMatch = uniqueResults.length === 0 && 
                              searchValue.trim() && 
                              isValidSearchLength(searchValue);
    
    console.log(`searchValue: "${searchValue}"`);
    console.log(`searchValue.trim(): "${searchValue.trim()}"`);
    console.log(`isValidSearchLength("${searchValue}"): ${isValidSearchLength(searchValue)}`);
    console.log(`uniqueResults.length: ${uniqueResults.length}`);
    console.log(`shouldShowNoMatch: ${shouldShowNoMatch}`);
    
    if (shouldShowNoMatch) {
      console.log('\n⚠ 前端会显示"未找到匹配的地区"');
    } else {
      console.log('\n✓ 前端应该显示结果');
    }
    
    // ==========================================
    // 8. 总结
    // ==========================================
    console.log('\n【8】问题诊断总结');
    console.log('='.repeat(80));
    
    const issues = [];
    
    if (locations.length === 0) {
      issues.push('✗ 聚合查询返回空结果');
    }
    
    if (validLocations.length === 0 && locations.length > 0) {
      issues.push('✗ 数据转换后结果为空（transformLocationData 可能有问题）');
    }
    
    if (filteredResults.length === 0 && validLocations.length > 0 && transportationType) {
      issues.push(`⚠ transportationType="${transportationType}" 过滤掉了所有结果`);
    }
    
    if (uniqueResults.length === 0 && filteredResults.length > 0) {
      issues.push('✗ 去重后结果为空（去重逻辑可能有问题）');
    }
    
    if (shouldShowNoMatch && uniqueResults.length > 0) {
      issues.push('⚠ 前端显示条件判断有误');
    }
    
    if (issues.length === 0) {
      console.log('✓ 未发现明显问题');
      console.log('\n建议检查：');
      console.log('1. 浏览器 Network 标签：查看实际 API 响应');
      console.log('2. 浏览器 Console 标签：查看是否有错误');
      console.log('3. React DevTools：查看 filteredLocations 状态');
      console.log('4. 检查是否有其他过滤逻辑');
    } else {
      console.log('发现以下问题：');
      issues.forEach((issue, idx) => {
        console.log(`   ${idx + 1}. ${issue}`);
      });
    }
    
    console.log('\n✓ 测试完成');
    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error('\n✗ 错误:', error.message);
    console.error(error.stack);
    await mongoose.connection.close();
    process.exit(1);
  }
}

testTokyoAPI();


