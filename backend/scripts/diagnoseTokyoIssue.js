/**
 * 全面诊断 Tokyo 搜索问题
 * 检查所有可能的问题点，不改代码
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

async function diagnoseTokyoIssue() {
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
    
    console.log('='.repeat(80));
    console.log('全面诊断 Tokyo 搜索问题');
    console.log('='.repeat(80));
    console.log(`搜索词: ${searchTerm}`);
    console.log(`status: ${status}`);
    console.log(`searchPriority: ${searchPriority}`);
    console.log(`page: ${page}, limit: ${limit}, skip: ${skip}\n`);
    
    // ==========================================
    // 1. 检查原始数据
    // ==========================================
    console.log('【1】检查原始数据');
    console.log('-'.repeat(80));
    const tokyoRaw = await Location.findOne({ enName: 'Tokyo' }).lean();
    if (tokyoRaw) {
      console.log('✓ 找到 Tokyo 数据:');
      console.log(`   _id: ${tokyoRaw._id}`);
      console.log(`   name: ${tokyoRaw.name}`);
      console.log(`   enName: ${tokyoRaw.enName}`);
      console.log(`   pinyin: ${tokyoRaw.pinyin}`);
      console.log(`   code: ${tokyoRaw.code || 'N/A'}`);
      console.log(`   type: ${tokyoRaw.type}`);
      console.log(`   status: ${tokyoRaw.status}`);
      console.log(`   country: ${tokyoRaw.country}`);
      console.log(`   city: ${tokyoRaw.city || 'N/A'}`);
      console.log(`   所有字段:`, Object.keys(tokyoRaw).join(', '));
    } else {
      console.log('✗ 未找到 Tokyo 数据');
      return;
    }
    
    // ==========================================
    // 2. 检查 buildRegexSearchQuery 生成的查询
    // ==========================================
    console.log('\n【2】检查 buildRegexSearchQuery 生成的查询');
    console.log('-'.repeat(80));
    const prefixOnlyQuery = buildRegexSearchQuery(searchTerm, searchPriority, status, true);
    console.log('prefixOnly=true 的查询:');
    console.log(JSON.stringify(prefixOnlyQuery, null, 2));
    
    // 优化查询结构（模拟实际代码）
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
    
    // ==========================================
    // 3. 测试 find() 查询（不使用聚合）
    // ==========================================
    console.log('\n【3】测试 find() 查询（不使用聚合）');
    console.log('-'.repeat(80));
    const findResults = await Location.find(optimizedQuery)
      .sort({ type: 1, name: 1 })
      .skip(skip)
      .limit(limit)
      .lean();
    
    console.log(`找到 ${findResults.length} 条结果`);
    if (findResults.length > 0) {
      findResults.forEach((loc, idx) => {
        console.log(`\n  [${idx + 1}] ${loc.name}`);
        console.log(`      _id: ${loc._id}`);
        console.log(`      enName: ${loc.enName}`);
        console.log(`      pinyin: ${loc.pinyin}`);
        console.log(`      type: ${loc.type}`);
        console.log(`      status: ${loc.status}`);
        console.log(`      字段数量: ${Object.keys(loc).length}`);
        console.log(`      所有字段: ${Object.keys(loc).slice(0, 10).join(', ')}...`);
      });
    }
    
    // ==========================================
    // 4. 测试聚合管道查询（实际代码使用的）
    // ==========================================
    console.log('\n【4】测试聚合管道查询（实际代码使用的）');
    console.log('-'.repeat(80));
    const inputType = detectInputType(searchTerm);
    const escapedTrimmed = escapeRegex(searchTerm);
    const escapedLower = escapeRegex(searchTerm.toLowerCase());
    
    const pipeline = [
      { $match: optimizedQuery }
    ];
    
    // 添加匹配评分
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
    
    console.log('聚合管道:');
    console.log(JSON.stringify(pipeline, null, 2));
    
    let aggregateResults = [];
    try {
      aggregateResults = await Location.aggregate(pipeline);
      console.log(`\n✓ 聚合查询成功，找到 ${aggregateResults.length} 条结果`);
      
      if (aggregateResults.length > 0) {
        aggregateResults.forEach((loc, idx) => {
          console.log(`\n  [${idx + 1}] ${loc.name || 'N/A'}`);
          console.log(`      _id: ${loc._id}`);
          console.log(`      enName: ${loc.enName || 'N/A'}`);
          console.log(`      pinyin: ${loc.pinyin || 'N/A'}`);
          console.log(`      type: ${loc.type || 'N/A'}`);
          console.log(`      status: ${loc.status || 'N/A'}`);
          console.log(`      matchScore: ${loc.matchScore !== undefined ? loc.matchScore : 'N/A'}`);
          console.log(`      字段数量: ${Object.keys(loc).length}`);
          console.log(`      所有字段: ${Object.keys(loc).join(', ')}`);
          
          // 检查关键字段是否存在
          const requiredFields = ['_id', 'name', 'enName', 'pinyin', 'type', 'status'];
          const missingFields = requiredFields.filter(field => !(field in loc));
          if (missingFields.length > 0) {
            console.log(`      ⚠ 缺失字段: ${missingFields.join(', ')}`);
          }
        });
      } else {
        console.log('\n✗ 聚合查询返回空结果！');
      }
    } catch (error) {
      console.log(`\n✗ 聚合查询失败: ${error.message}`);
      console.log(`   错误堆栈: ${error.stack}`);
    }
    
    // ==========================================
    // 5. 对比 find() 和 aggregate() 的结果差异
    // ==========================================
    console.log('\n【5】对比 find() 和 aggregate() 的结果差异');
    console.log('-'.repeat(80));
    console.log(`find() 结果数量: ${findResults.length}`);
    console.log(`aggregate() 结果数量: ${aggregateResults.length}`);
    
    if (findResults.length !== aggregateResults.length) {
      console.log('⚠ 结果数量不一致！');
    }
    
    if (findResults.length > 0 && aggregateResults.length > 0) {
      const findIds = findResults.map(r => r._id.toString()).sort();
      const aggregateIds = aggregateResults.map(r => r._id.toString()).sort();
      
      console.log(`find() 的 _id: ${findIds.join(', ')}`);
      console.log(`aggregate() 的 _id: ${aggregateIds.join(', ')}`);
      
      if (JSON.stringify(findIds) !== JSON.stringify(aggregateIds)) {
        console.log('⚠ _id 不一致！');
      }
    }
    
    // 检查字段差异
    if (findResults.length > 0 && aggregateResults.length > 0) {
      const findFields = Object.keys(findResults[0]).sort();
      const aggregateFields = Object.keys(aggregateResults[0]).sort();
      
      console.log(`\nfind() 字段 (${findFields.length}): ${findFields.join(', ')}`);
      console.log(`aggregate() 字段 (${aggregateFields.length}): ${aggregateFields.join(', ')}`);
      
      const missingInAggregate = findFields.filter(f => !aggregateFields.includes(f));
      const extraInAggregate = aggregateFields.filter(f => !findFields.includes(f));
      
      if (missingInAggregate.length > 0) {
        console.log(`⚠ aggregate() 缺失字段: ${missingInAggregate.join(', ')}`);
      }
      if (extraInAggregate.length > 0) {
        console.log(`✓ aggregate() 额外字段: ${extraInAggregate.join(', ')}`);
      }
    }
    
    // ==========================================
    // 6. 检查 MongoDB 版本和 $regexMatch 支持
    // ==========================================
    console.log('\n【6】检查 MongoDB 版本和功能支持');
    console.log('-'.repeat(80));
    try {
      const adminDb = mongoose.connection.db.admin();
      const serverStatus = await adminDb.serverStatus();
      console.log(`MongoDB 版本: ${serverStatus.version}`);
      
      // 检查 $regexMatch 是否支持（MongoDB 4.2+）
      const versionParts = serverStatus.version.split('.').map(Number);
      const majorVersion = versionParts[0];
      const minorVersion = versionParts[1];
      
      if (majorVersion > 4 || (majorVersion === 4 && minorVersion >= 2)) {
        console.log('✓ $regexMatch 支持（MongoDB 4.2+）');
      } else {
        console.log(`⚠ $regexMatch 可能不支持（需要 MongoDB 4.2+，当前 ${serverStatus.version}）`);
      }
    } catch (error) {
      console.log(`⚠ 无法获取服务器状态: ${error.message}`);
    }
    
    // ==========================================
    // 7. 检查索引使用情况
    // ==========================================
    console.log('\n【7】检查索引使用情况');
    console.log('-'.repeat(80));
    try {
      const explainResult = await Location.find(optimizedQuery)
        .hint({ enName: 1, status: 1 })
        .limit(10)
        .explain('executionStats');
      
      const findIndexName = (stage) => {
        if (stage.indexName) return stage.indexName;
        if (stage.inputStage) return findIndexName(stage.inputStage);
        if (stage.inputStages) {
          for (const s of stage.inputStages) {
            const idx = findIndexName(s);
            if (idx) return idx;
          }
        }
        return null;
      };
      
      const indexUsed = findIndexName(explainResult.executionStats.executionStages) || '无索引';
      console.log(`使用的索引: ${indexUsed}`);
      console.log(`扫描文档数: ${explainResult.executionStats.totalDocsExamined?.toLocaleString() || 'N/A'}`);
      console.log(`返回文档数: ${explainResult.executionStats.nReturned || 'N/A'}`);
      console.log(`执行时间: ${explainResult.executionStats.executionTimeMillis || 'N/A'}ms`);
    } catch (error) {
      console.log(`⚠ 无法检查索引: ${error.message}`);
    }
    
    // ==========================================
    // 8. 模拟前端可能的数据处理
    // ==========================================
    console.log('\n【8】模拟前端可能的数据处理');
    console.log('-'.repeat(80));
    
    // 模拟 transformLocationData 函数（简化版）
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
    
    console.log('处理 aggregate() 结果:');
    const transformedAggregate = aggregateResults.map(transformLocationData).filter(loc => loc !== null);
    console.log(`  原始数量: ${aggregateResults.length}`);
    console.log(`  转换后数量: ${transformedAggregate.length}`);
    
    if (transformedAggregate.length > 0) {
      console.log(`\n  转换后的第一条数据:`);
      console.log(JSON.stringify(transformedAggregate[0], null, 2));
    }
    
    console.log('\n处理 find() 结果:');
    const transformedFind = findResults.map(transformLocationData).filter(loc => loc !== null);
    console.log(`  原始数量: ${findResults.length}`);
    console.log(`  转换后数量: ${transformedFind.length}`);
    
    // ==========================================
    // 9. 总结和问题诊断
    // ==========================================
    console.log('\n【9】问题诊断总结');
    console.log('='.repeat(80));
    
    const issues = [];
    
    if (aggregateResults.length === 0) {
      issues.push('✗ 聚合查询返回空结果');
    } else if (aggregateResults.length !== findResults.length) {
      issues.push(`⚠ 聚合查询结果数量 (${aggregateResults.length}) 与 find() 结果数量 (${findResults.length}) 不一致`);
    }
    
    if (aggregateResults.length > 0) {
      const firstResult = aggregateResults[0];
      const requiredFields = ['_id', 'name', 'enName', 'pinyin', 'type', 'status'];
      const missingFields = requiredFields.filter(field => !(field in firstResult));
      if (missingFields.length > 0) {
        issues.push(`⚠ 聚合结果缺失字段: ${missingFields.join(', ')}`);
      }
    }
    
    if (transformedAggregate.length === 0 && aggregateResults.length > 0) {
      issues.push('✗ 数据转换后结果为空（transformLocationData 可能有问题）');
    }
    
    if (issues.length === 0) {
      console.log('✓ 未发现明显问题');
      console.log('   建议检查：');
      console.log('   1. 前端 API 调用是否正确');
      console.log('   2. 前端数据过滤逻辑');
      console.log('   3. 前端显示条件');
    } else {
      console.log('发现以下问题：');
      issues.forEach((issue, idx) => {
        console.log(`   ${idx + 1}. ${issue}`);
      });
    }
    
    console.log('\n✓ 诊断完成');
    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error('\n✗ 错误:', error.message);
    console.error(error.stack);
    await mongoose.connection.close();
    process.exit(1);
  }
}

diagnoseTokyoIssue();

