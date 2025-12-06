/**
 * 测试实际代码流程，模拟前端请求 'tokyo'
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const mongoose = require('mongoose');
const connectDB = require('../config/database');
const Location = require('../models/Location');

// 完全复制实际代码的函数
function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function detectInputType(searchTerm) {
  if (!searchTerm || typeof searchTerm !== 'string') {
    return { type: 'unknown', isPinyinOrEnglish: false };
  }
  
  const trimmed = searchTerm.trim();
  const lower = trimmed.toLowerCase();
  
  // 检测是否是代码（通常是3-4位大写字母或数字组合）
  if (/^[A-Z0-9]{2,5}$/i.test(trimmed)) {
    return { type: 'code', isPinyinOrEnglish: false };
  }
  
  // 检测是否包含中文字符
  const hasChinese = /[\u4e00-\u9fa5]/.test(trimmed);
  if (hasChinese) {
    return { type: 'chinese', isPinyinOrEnglish: false };
  }
  
  // 检测是否是拼音或英文（只包含字母，可能包含空格）
  if (/^[a-z\s]+$/i.test(trimmed)) {
    return { type: 'pinyin', isPinyinOrEnglish: true };
  }
  
  // 默认当作拼音/英文处理
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
  
  console.log('  [buildRegexSearchQuery] inputType:', inputType);
  console.log('  [buildRegexSearchQuery] forceEnNamePinyin:', forceEnNamePinyin);
  console.log('  [buildRegexSearchQuery] inputType.isPinyinOrEnglish || forceEnNamePinyin:', inputType.isPinyinOrEnglish || forceEnNamePinyin);
  
  if (inputType.isPinyinOrEnglish || forceEnNamePinyin) {
    console.log('  [buildRegexSearchQuery] 使用拼音/英文查询逻辑');
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
  } else if (inputType.type === 'chinese') {
    console.log('  [buildRegexSearchQuery] 使用中文查询逻辑');
    // ... 中文逻辑
  } else if (inputType.type === 'code') {
    console.log('  [buildRegexSearchQuery] 使用代码查询逻辑');
    // ... 代码逻辑
  } else {
    console.log('  [buildRegexSearchQuery] 使用默认查询逻辑');
    // ... 默认逻辑
  }
  
  return { $or: searchConditions };
}

async function testActualCodeFlow() {
  try {
    console.log('正在连接数据库...');
    await connectDB();
    console.log('✓ 数据库连接成功\n');

    // 完全模拟前端请求
    const search = 'tokyo';
    const status = 'active';
    const searchPriority = 'enName_pinyin';
    const page = 1;
    const limit = 50;
    const skip = (page - 1) * limit;
    
    console.log('='.repeat(80));
    console.log('测试实际代码流程');
    console.log('='.repeat(80));
    console.log(`search: "${search}"`);
    console.log(`status: ${status}`);
    console.log(`searchPriority: ${searchPriority}`);
    console.log(`page: ${page}, limit: ${limit}\n`);
    
    // 模拟实际代码流程
    const searchTrimmed = search.trim();
    const inputType = detectInputType(searchTrimmed);
    
    console.log('【1】输入类型检测');
    console.log('-'.repeat(80));
    console.log(`detectInputType("${searchTrimmed}"):`, inputType);
    console.log(`isPinyinOrEnglish: ${inputType.isPinyinOrEnglish}`);
    console.log(`type: ${inputType.type}`);
    
    // 第一阶段：只使用前缀匹配
    console.log('\n【2】构建前缀匹配查询');
    console.log('-'.repeat(80));
    const prefixOnlyQuery = buildRegexSearchQuery(searchTrimmed, searchPriority, status, true);
    console.log('prefixOnlyQuery:', JSON.stringify(prefixOnlyQuery, null, 2));
    
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
    
    console.log('\n优化后的查询:');
    console.log(JSON.stringify(optimizedQuery, null, 2));
    console.log(`statusMergedIntoOr: ${statusMergedIntoOr}`);
    
    // 构建聚合管道
    console.log('\n【3】构建聚合管道');
    console.log('-'.repeat(80));
    const escapedTrimmed = escapeRegex(searchTrimmed);
    const escapedLower = escapeRegex(searchTrimmed.toLowerCase());
    
    const pipeline = [
      { $match: optimizedQuery }
    ];
    
    // 检查是否会添加 $addFields
    console.log(`inputType.isPinyinOrEnglish: ${inputType.isPinyinOrEnglish}`);
    if (inputType.isPinyinOrEnglish) {
      console.log('✓ 会添加 $addFields（拼音/英文）');
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
    } else if (inputType.type === 'chinese') {
      console.log('✓ 会添加 $addFields（中文）');
      // ... 中文逻辑
    } else {
      console.log('⚠ 不会添加 $addFields（其他类型）');
      console.log('  这可能导致排序失败！');
      pipeline.push({
        $addFields: {
          matchScore: 50
        }
      });
    }
    
    pipeline.push({ $sort: { matchScore: -1, type: 1, name: 1 } });
    pipeline.push({ $skip: skip });
    pipeline.push({ $limit: limit });
    
    console.log('\n完整聚合管道:');
    console.log(JSON.stringify(pipeline, null, 2));
    
    // 执行查询
    console.log('\n【4】执行聚合查询');
    console.log('-'.repeat(80));
    
    let locations = [];
    try {
      locations = await Location.aggregate(pipeline);
      console.log(`✓ 查询成功，找到 ${locations.length} 条结果`);
      
      if (locations.length > 0) {
        locations.forEach((loc, idx) => {
          console.log(`\n  [${idx + 1}] ${loc.name} (${loc.enName}, ${loc.pinyin})`);
          console.log(`      matchScore: ${loc.matchScore !== undefined ? loc.matchScore : 'N/A'}`);
          console.log(`      type: ${loc.type}`);
        });
      } else {
        console.log('✗ 查询返回空结果！');
      }
    } catch (error) {
      console.log(`✗ 查询失败: ${error.message}`);
      console.log(`  错误堆栈: ${error.stack}`);
      
      // 如果是因为 matchScore 字段不存在导致的排序错误
      if (error.message.includes('matchScore') || error.message.includes('sort')) {
        console.log('\n尝试修复：添加默认 matchScore');
        const fixedPipeline = [
          { $match: optimizedQuery },
          { $addFields: { matchScore: 50 } },
          { $sort: { matchScore: -1, type: 1, name: 1 } },
          { $skip: skip },
          { $limit: limit }
        ];
        
        try {
          const fixedResult = await Location.aggregate(fixedPipeline);
          console.log(`✓ 修复后查询成功，找到 ${fixedResult.length} 条结果`);
        } catch (fixedError) {
          console.log(`✗ 修复后仍然失败: ${fixedError.message}`);
        }
      }
    }
    
    // 检查总数
    console.log('\n【5】检查总数查询');
    console.log('-'.repeat(80));
    const total = await Location.countDocuments(optimizedQuery);
    console.log(`countDocuments 结果: ${total}`);
    
    console.log('\n【6】问题诊断');
    console.log('='.repeat(80));
    
    if (locations.length === 0 && total > 0) {
      console.log('⚠ 发现问题：');
      console.log('  - countDocuments 能找到数据');
      console.log('  - 但 aggregate() 返回空结果');
      console.log('  - 可能是聚合管道中的排序失败（matchScore 字段不存在）');
    } else if (locations.length === 0 && total === 0) {
      console.log('⚠ 发现问题：');
      console.log('  - countDocuments 和 aggregate() 都返回空结果');
      console.log('  - 查询条件可能有问题');
    } else {
      console.log('✓ 查询正常');
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

testActualCodeFlow();


