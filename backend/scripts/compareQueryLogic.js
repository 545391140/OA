/**
 * 对比脚本查询逻辑和实际代码查询逻辑的区别
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const mongoose = require('mongoose');
const connectDB = require('../config/database');
const Location = require('../models/Location');

// 复制实际代码中的函数
function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function detectInputType(searchTerm) {
  if (!searchTerm || typeof searchTerm !== 'string') {
    return { type: 'unknown', isPinyinOrEnglish: false };
  }
  
  const trimmed = searchTerm.trim();
  const lower = trimmed.toLowerCase();
  
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
    // 精确匹配
    searchConditions.push(
      addStatusCondition({ enName: { $regex: `^${escapedTrimmed}$`, $options: 'i' } }),
      addStatusCondition({ pinyin: { $regex: `^${escapedLower}$`, $options: 'i' } })
    );
    
    // 前缀匹配
    searchConditions.push(
      addStatusCondition({ enName: { $regex: `^${escapedTrimmed}`, $options: 'i' } }),
      addStatusCondition({ pinyin: { $regex: `^${escapedLower}`, $options: 'i' } })
    );
    
    // 包含匹配（只在 prefixOnly=false 时添加）
    if (!prefixOnly) {
      searchConditions.push(
        addStatusCondition({ enName: { $regex: escapedTrimmed, $options: 'i' } }),
        addStatusCondition({ pinyin: { $regex: escapedLower, $options: 'i' } })
      );
    }
  }
  
  return { $or: searchConditions };
}

async function compareQueryLogic() {
  try {
    console.log('正在连接数据库...');
    await connectDB();
    console.log('✓ 数据库连接成功\n');

    const searchTerm = 'Tokyo';
    const status = 'active';
    const searchPriority = 'enName_pinyin';
    
    console.log('=== 对比查询逻辑 ===\n');
    console.log(`搜索词: ${searchTerm}`);
    console.log(`status: ${status}`);
    console.log(`searchPriority: ${searchPriority}\n`);
    
    // 1. 脚本中的查询逻辑（简单直接）
    console.log('1. 脚本中的查询逻辑（简单直接）:');
    const scriptQuery = {
      status: 'active',
      $or: [
        { enName: { $regex: `^${searchTerm}`, $options: 'i' } },
        { pinyin: { $regex: `^${searchTerm.toLowerCase()}`, $options: 'i' } }
      ]
    };
    console.log('   查询条件:', JSON.stringify(scriptQuery, null, 2));
    
    const scriptResults = await Location.find(scriptQuery).limit(10).lean();
    console.log(`   找到 ${scriptResults.length} 条结果`);
    if (scriptResults.length > 0) {
      scriptResults.forEach((loc, idx) => {
        console.log(`   ${idx + 1}. ${loc.name} (${loc.enName}, ${loc.pinyin})`);
      });
    }
    
    // 2. 实际代码中的查询逻辑（使用 buildRegexSearchQuery，prefixOnly=true）
    console.log('\n2. 实际代码中的查询逻辑（prefixOnly=true，只前缀匹配）:');
    const prefixOnlyQuery = buildRegexSearchQuery(searchTerm, searchPriority, status, true);
    console.log('   buildRegexSearchQuery 返回:', JSON.stringify(prefixOnlyQuery, null, 2));
    
    // 模拟实际代码中的查询结构优化
    let optimizedQuery = {};
    if (prefixOnlyQuery && prefixOnlyQuery.$or && prefixOnlyQuery.$or.length > 0) {
      const allHaveStatus = prefixOnlyQuery.$or.every(cond => cond.status === status);
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
    
    console.log('   优化后的查询条件:', JSON.stringify(optimizedQuery, null, 2));
    
    const actualResults1 = await Location.find(optimizedQuery).limit(10).lean();
    console.log(`   找到 ${actualResults1.length} 条结果`);
    if (actualResults1.length > 0) {
      actualResults1.forEach((loc, idx) => {
        console.log(`   ${idx + 1}. ${loc.name} (${loc.enName}, ${loc.pinyin})`);
      });
    }
    
    // 3. 实际代码中的查询逻辑（使用聚合管道）
    console.log('\n3. 实际代码中的查询逻辑（使用聚合管道）:');
    const escapedTrimmed = escapeRegex(searchTerm);
    const escapedLower = escapeRegex(searchTerm.toLowerCase());
    
    const pipeline = [
      { $match: optimizedQuery }
    ];
    
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
    
    pipeline.push({ $sort: { matchScore: -1, type: 1, name: 1 } });
    pipeline.push({ $skip: 0 });
    pipeline.push({ $limit: 10 });
    
    console.log('   聚合管道:', JSON.stringify(pipeline, null, 2));
    
    const actualResults2 = await Location.aggregate(pipeline);
    console.log(`   找到 ${actualResults2.length} 条结果`);
    if (actualResults2.length > 0) {
      actualResults2.forEach((loc, idx) => {
        console.log(`   ${idx + 1}. ${loc.name} (${loc.enName}, ${loc.pinyin}) - matchScore: ${loc.matchScore}`);
      });
    }
    
    // 4. 对比差异
    console.log('\n=== 关键差异 ===');
    console.log('1. 脚本查询: status 在顶层，$or 在下一层');
    console.log('2. 实际代码查询: status 被合并到每个 $or 条件中，然后提取到顶层');
    console.log('3. 实际代码使用聚合管道添加匹配评分和排序');
    console.log('4. 实际代码有分阶段查询逻辑（prefixOnly=true 时只使用前缀匹配）');
    
    // 5. 检查 Tokyo 的 pinyin 字段
    console.log('\n=== 检查 Tokyo 的 pinyin 字段 ===');
    const tokyo = await Location.findOne({ enName: 'Tokyo' }).lean();
    if (tokyo) {
      console.log(`   name: ${tokyo.name}`);
      console.log(`   enName: ${tokyo.enName}`);
      console.log(`   pinyin: ${tokyo.pinyin}`);
      console.log(`   status: ${tokyo.status}`);
      console.log(`   type: ${tokyo.type}`);
      
      // 检查 pinyin 是否匹配 "tokyo"
      const pinyinLower = (tokyo.pinyin || '').toLowerCase();
      console.log(`\n   pinyin.toLowerCase(): "${pinyinLower}"`);
      console.log(`   是否匹配 "tokyo": ${pinyinLower === 'tokyo' || pinyinLower.startsWith('tokyo')}`);
      console.log(`   是否匹配 "dongjing": ${pinyinLower === 'dongjing' || pinyinLower.startsWith('dongjing')}`);
    }
    
    console.log('\n✓ 对比完成');
    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error('\n✗ 错误:', error.message);
    console.error(error.stack);
    await mongoose.connection.close();
    process.exit(1);
  }
}

compareQueryLogic();



