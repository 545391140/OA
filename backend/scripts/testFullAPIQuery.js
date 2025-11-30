/**
 * 测试完整的 API 查询流程，包括所有可能的查询条件
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const mongoose = require('mongoose');
const connectDB = require('../config/database');
const Location = require('../models/Location');

async function testFullAPIQuery() {
  try {
    console.log('正在连接数据库...');
    await connectDB();
    console.log('✓ 数据库连接成功\n');

    // 完全模拟前端请求参数
    const reqQuery = {
      status: 'active',
      search: 'tokyo',
      page: 1,
      limit: 50,
      searchPriority: 'enName_pinyin',
      includeChildren: 'true',
      maxChildrenPerCity: 5
    };
    
    console.log('='.repeat(80));
    console.log('测试完整 API 查询流程');
    console.log('='.repeat(80));
    console.log('请求参数:', JSON.stringify(reqQuery, null, 2));
    console.log();
    
    // 模拟实际代码的查询构建
    const { 
      type, 
      status, 
      search, 
      city, 
      country,
      page = 1,
      limit = 20,
      includeChildren = false,
      searchPriority = null
    } = reqQuery;
    
    const query = {};
    let useTextSearch = false;
    let statusMergedIntoOr = false;
    
    console.log('【1】构建基础查询条件');
    console.log('-'.repeat(80));
    
    if (type) {
      query.type = type;
      console.log(`添加 type: ${type}`);
    }
    if (city) {
      query.city = { $regex: city, $options: 'i' };
      console.log(`添加 city: ${city}`);
    }
    
    console.log('基础 query:', JSON.stringify(query, null, 2));
    
    // 处理搜索
    if (search) {
      const searchTrimmed = search.trim();
      console.log(`\n搜索关键词: "${searchTrimmed}"`);
      
      // 这里应该使用文本搜索，但为了测试，我们直接使用正则表达式搜索
      useTextSearch = false;
      
      // 复制实际代码的函数
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
      
      const regexSearchQuery = buildRegexSearchQuery(searchTrimmed, searchPriority, status);
      
      if (regexSearchQuery && regexSearchQuery.$or && regexSearchQuery.$or.length > 0) {
        if (query.$or && Array.isArray(query.$or)) {
          query.$or = [...query.$or, ...regexSearchQuery.$or];
        } else {
          query.$or = regexSearchQuery.$or;
        }
        if (status) {
          statusMergedIntoOr = true;
        }
      }
    }
    
    // country 筛选
    if (country) {
      if (useTextSearch && query.$text) {
        query.country = { $regex: country, $options: 'i' };
      } else if (query.$or && Array.isArray(query.$or)) {
        query.$or = query.$or.map(condition => ({
          ...condition,
          country: { $regex: country, $options: 'i' }
        }));
      } else {
        query.country = { $regex: country, $options: 'i' };
      }
    }
    
    console.log('\n最终 query:', JSON.stringify(query, null, 2));
    console.log(`statusMergedIntoOr: ${statusMergedIntoOr}`);
    
    // 执行查询（模拟实际代码的聚合管道）
    console.log('\n【2】执行查询');
    console.log('-'.repeat(80));
    
    const searchTrimmed = search.trim();
    const inputType = detectInputType(searchTrimmed);
    const prefixOnlyQuery = buildRegexSearchQuery(searchTrimmed, searchPriority, status, true);
    
    let optimizedQuery = { ...query };
    
    if (prefixOnlyQuery && prefixOnlyQuery.$or && prefixOnlyQuery.$or.length > 0) {
      if (statusMergedIntoOr && prefixOnlyQuery.$or.length > 0) {
        const allHaveStatus = prefixOnlyQuery.$or.every(cond => cond.status === status);
        if (allHaveStatus && status) {
          optimizedQuery = {
            ...query,
            status: status,
            $or: prefixOnlyQuery.$or.map(cond => {
              const { status: _, ...rest } = cond;
              return rest;
            })
          };
        } else {
          optimizedQuery = { ...query, ...prefixOnlyQuery };
        }
      } else {
        optimizedQuery = { ...query, ...prefixOnlyQuery };
      }
    }
    
    console.log('optimizedQuery:', JSON.stringify(optimizedQuery, null, 2));
    
    // 构建聚合管道
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
    } else {
      pipeline.push({
        $addFields: {
          matchScore: 50
        }
      });
    }
    
    pipeline.push({ $sort: { matchScore: -1, type: 1, name: 1 } });
    pipeline.push({ $skip: (page - 1) * limit });
    pipeline.push({ $limit: parseInt(limit, 10) });
    
    console.log('\n聚合管道:');
    console.log(JSON.stringify(pipeline, null, 2));
    
    // 执行查询
    let locations = [];
    try {
      locations = await Location.aggregate(pipeline);
      console.log(`\n✓ 查询成功，找到 ${locations.length} 条结果`);
      
      if (locations.length > 0) {
        locations.forEach((loc, idx) => {
          console.log(`  [${idx + 1}] ${loc.name} (${loc.enName}, ${loc.pinyin})`);
        });
      }
    } catch (error) {
      console.log(`\n✗ 查询失败: ${error.message}`);
      console.log(`  错误堆栈: ${error.stack}`);
    }
    
    // 检查总数
    const total = await Location.countDocuments(optimizedQuery);
    console.log(`\n总数: ${total}`);
    
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

testFullAPIQuery();

