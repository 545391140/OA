/**
 * 测试 Tokyo 查询，使用小写的 'tokyo'（模拟前端请求）
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const mongoose = require('mongoose');
const connectDB = require('../config/database');
const Location = require('../models/Location');

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

async function testTokyoQuery() {
  try {
    console.log('正在连接数据库...');
    await connectDB();
    console.log('✓ 数据库连接成功\n');

    // 模拟前端请求：search: 'tokyo'（小写）
    const searchTerm = 'tokyo';
    const status = 'active';
    const searchPriority = 'enName_pinyin';
    const page = 1;
    const limit = 50;
    const skip = (page - 1) * limit;
    
    console.log('='.repeat(80));
    console.log('测试 Tokyo 查询（使用小写 "tokyo"）');
    console.log('='.repeat(80));
    console.log(`搜索词: "${searchTerm}"`);
    console.log(`status: ${status}`);
    console.log(`searchPriority: ${searchPriority}`);
    console.log(`page: ${page}, limit: ${limit}\n`);
    
    // 1. 检查输入类型检测
    console.log('【1】输入类型检测');
    console.log('-'.repeat(80));
    const inputType = detectInputType(searchTerm);
    console.log(`detectInputType("${searchTerm}"):`, inputType);
    console.log(`isPinyinOrEnglish: ${inputType.isPinyinOrEnglish}`);
    
    // 2. 检查 buildRegexSearchQuery
    console.log('\n【2】buildRegexSearchQuery 生成的查询');
    console.log('-'.repeat(80));
    const prefixOnlyQuery = buildRegexSearchQuery(searchTerm, searchPriority, status, true);
    console.log('prefixOnly=true 的查询:');
    console.log(JSON.stringify(prefixOnlyQuery, null, 2));
    
    // 3. 优化查询结构
    console.log('\n【3】优化查询结构');
    console.log('-'.repeat(80));
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
    
    console.log('优化后的查询:');
    console.log(JSON.stringify(optimizedQuery, null, 2));
    console.log(`statusMergedIntoOr: ${statusMergedIntoOr}`);
    
    // 4. 测试查询
    console.log('\n【4】测试查询');
    console.log('-'.repeat(80));
    
    // 4.1 使用 find() 测试
    const findResults = await Location.find(optimizedQuery)
      .sort({ type: 1, name: 1 })
      .skip(skip)
      .limit(limit)
      .lean();
    
    console.log(`find() 结果数量: ${findResults.length}`);
    if (findResults.length > 0) {
      findResults.forEach((loc, idx) => {
        console.log(`  [${idx + 1}] ${loc.name} (${loc.enName}, ${loc.pinyin})`);
      });
    } else {
      console.log('  ✗ find() 未找到结果');
    }
    
    // 4.2 使用聚合管道测试
    const escapedTrimmed = escapeRegex(searchTerm);
    const escapedLower = escapeRegex(searchTerm.toLowerCase());
    
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
    pipeline.push({ $skip: skip });
    pipeline.push({ $limit: limit });
    
    console.log('\n聚合管道:');
    console.log(JSON.stringify(pipeline, null, 2));
    
    const aggregateResults = await Location.aggregate(pipeline);
    console.log(`\naggregate() 结果数量: ${aggregateResults.length}`);
    if (aggregateResults.length > 0) {
      aggregateResults.forEach((loc, idx) => {
        console.log(`  [${idx + 1}] ${loc.name} (${loc.enName}, ${loc.pinyin}) - matchScore: ${loc.matchScore}`);
      });
    } else {
      console.log('  ✗ aggregate() 未找到结果');
    }
    
    // 5. 检查转义后的正则表达式
    console.log('\n【5】检查正则表达式转义');
    console.log('-'.repeat(80));
    console.log(`searchTerm: "${searchTerm}"`);
    console.log(`escapedTrimmed: "${escapedTrimmed}"`);
    console.log(`escapedLower: "${escapedLower}"`);
    console.log(`enName 精确匹配: "^${escapedTrimmed}$"`);
    console.log(`enName 前缀匹配: "^${escapedTrimmed}"`);
    console.log(`pinyin 精确匹配: "^${escapedLower}$"`);
    console.log(`pinyin 前缀匹配: "^${escapedLower}"`);
    
    // 6. 手动测试每个查询条件
    console.log('\n【6】手动测试每个查询条件');
    console.log('-'.repeat(80));
    
    const testConditions = [
      { name: 'enName 精确匹配', query: { enName: { $regex: `^${escapedTrimmed}$`, $options: 'i' }, status: 'active' } },
      { name: 'enName 前缀匹配', query: { enName: { $regex: `^${escapedTrimmed}`, $options: 'i' }, status: 'active' } },
      { name: 'pinyin 精确匹配', query: { pinyin: { $regex: `^${escapedLower}$`, $options: 'i' }, status: 'active' } },
      { name: 'pinyin 前缀匹配', query: { pinyin: { $regex: `^${escapedLower}`, $options: 'i' }, status: 'active' } }
    ];
    
    for (const test of testConditions) {
      const result = await Location.find(test.query).limit(5).lean();
      console.log(`${test.name}: ${result.length} 条结果`);
      if (result.length > 0) {
        result.forEach((loc, idx) => {
          console.log(`  [${idx + 1}] ${loc.name} (${loc.enName}, ${loc.pinyin})`);
        });
      }
    }
    
    // 7. 检查 Tokyo 的实际字段值
    console.log('\n【7】检查 Tokyo 的实际字段值');
    console.log('-'.repeat(80));
    const tokyo = await Location.findOne({ enName: 'Tokyo' }).lean();
    if (tokyo) {
      console.log('Tokyo 数据:');
      console.log(`  name: "${tokyo.name}"`);
      console.log(`  enName: "${tokyo.enName}"`);
      console.log(`  pinyin: "${tokyo.pinyin}"`);
      console.log(`  status: "${tokyo.status}"`);
      
      // 测试匹配
      console.log('\n匹配测试:');
      console.log(`  enName.toLowerCase() === "tokyo": ${(tokyo.enName || '').toLowerCase() === 'tokyo'}`);
      console.log(`  enName.match(/^tokyo$/i): ${(tokyo.enName || '').match(/^tokyo$/i) ? '匹配' : '不匹配'}`);
      console.log(`  enName.match(/^tokyo/i): ${(tokyo.enName || '').match(/^tokyo/i) ? '匹配' : '不匹配'}`);
      console.log(`  pinyin.toLowerCase() === "tokyo": ${(tokyo.pinyin || '').toLowerCase() === 'tokyo'}`);
      console.log(`  pinyin.match(/^tokyo$/i): ${(tokyo.pinyin || '').match(/^tokyo$/i) ? '匹配' : '不匹配'}`);
    }
    
    // 8. 检查总数查询
    console.log('\n【8】检查总数查询');
    console.log('-'.repeat(80));
    const total = await Location.countDocuments(optimizedQuery);
    console.log(`countDocuments 结果: ${total}`);
    
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

testTokyoQuery();


