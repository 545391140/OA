/**
 * 测试搜索性能优化效果
 * 对比优化前后的查询性能
 * 
 * 使用方法：
 * node backend/scripts/testSearchPerformance.js
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const mongoose = require('mongoose');
const connectDB = require('../config/database');
const Location = require('../models/Location');

async function testSearchPerformance() {
  try {
    console.log('正在连接数据库...');
    await connectDB();
    console.log('✓ 数据库连接成功\n');

    // 测试用例
    const testCases = [
      { term: 'Beijing', type: '英文', field: 'enName' },
      { term: 'beijing', type: '拼音', field: 'pinyin' },
      { term: '北京', type: '中文', field: 'name' },
      { term: 'shanghai', type: '拼音', field: 'pinyin' },
      { term: 'Shanghai', type: '英文', field: 'enName' },
      { term: '上海', type: '中文', field: 'name' },
    ];

    console.log('=== 性能测试 ===\n');

    for (const test of testCases) {
      console.log(`测试 ${test.type} 搜索: "${test.term}"`);
      
      // 测试1: 前缀匹配（可以使用索引）
      try {
        const startTime1 = Date.now();
        const prefixQuery = {
          [test.field]: { $regex: `^${test.term}`, $options: 'i' },
          status: 'active'
        };
        const prefixResults = await Location.find(prefixQuery)
          .limit(10)
          .lean();
        const endTime1 = Date.now();
        const prefixDuration = endTime1 - startTime1;
        
        // 获取执行计划
        const explain1 = await Location.find(prefixQuery).limit(10).explain('executionStats');
        const executionStats1 = explain1.executionStats;
        const indexUsed = executionStats1.executionStages?.indexName || 
                         executionStats1.executionStages?.inputStage?.indexName || 
                         '无索引';
        
        console.log(`  前缀匹配 (可以使用索引):`);
        console.log(`    结果数量: ${prefixResults.length}`);
        console.log(`    查询耗时: ${prefixDuration}ms`);
        console.log(`    使用索引: ${indexUsed}`);
        console.log(`    扫描文档数: ${executionStats1.totalDocsExamined || 'N/A'}`);
        console.log(`    返回文档数: ${executionStats1.nReturned || 'N/A'}`);
      } catch (error) {
        console.warn(`    前缀匹配测试失败:`, error.message);
      }

      // 测试2: 包含匹配（无法使用索引）
      try {
        const startTime2 = Date.now();
        const containsQuery = {
          [test.field]: { $regex: test.term, $options: 'i' },
          status: 'active'
        };
        const containsResults = await Location.find(containsQuery)
          .limit(10)
          .lean();
        const endTime2 = Date.now();
        const containsDuration = endTime2 - startTime2;
        
        // 获取执行计划
        const explain2 = await Location.find(containsQuery).limit(10).explain('executionStats');
        const executionStats2 = explain2.executionStats;
        const indexUsed2 = executionStats2.executionStages?.indexName || 
                          executionStats2.executionStages?.inputStage?.indexName || 
                          '无索引';
        
        console.log(`  包含匹配 (无法使用索引):`);
        console.log(`    结果数量: ${containsResults.length}`);
        console.log(`    查询耗时: ${containsDuration}ms`);
        console.log(`    使用索引: ${indexUsed2}`);
        console.log(`    扫描文档数: ${executionStats2.totalDocsExamined || 'N/A'}`);
        console.log(`    返回文档数: ${executionStats2.nReturned || 'N/A'}`);
        
        // 性能对比
        if (typeof prefixDuration !== 'undefined' && containsDuration > 0 && prefixDuration > 0) {
          const speedup = (containsDuration / prefixDuration).toFixed(2);
          console.log(`  性能提升: 前缀匹配比包含匹配快 ${speedup}x`);
        }
      } catch (error) {
        console.warn(`    包含匹配测试失败:`, error.message);
      }

      console.log('');
    }

    // 测试优化后的查询逻辑（使用 $or 条件）
    console.log('=== 优化后的查询逻辑测试 ===\n');
    const optimizedTestCases = [
      { term: 'beijing', description: '拼音搜索' },
      { term: 'Beijing', description: '英文搜索' },
      { term: '北京', description: '中文搜索' },
    ];

    for (const test of optimizedTestCases) {
      console.log(`测试 ${test.description}: "${test.term}"`);
      
      try {
        const startTime = Date.now();
        
        // 模拟优化后的查询逻辑（优先使用前缀匹配）
        const escapedTerm = test.term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const searchLower = test.term.toLowerCase();
        const escapedLower = escapedTerm.toLowerCase();
        
        const optimizedQuery = {
          status: 'active',
          $or: [
            // 精确匹配（可以使用索引）
            { enName: { $regex: `^${escapedTerm}$`, $options: 'i' } },
            { pinyin: { $regex: `^${searchLower}$`, $options: 'i' } },
            { name: { $regex: `^${escapedTerm}$`, $options: 'i' } },
            { code: { $regex: `^${searchLower}$`, $options: 'i' } },
            // 前缀匹配（可以使用索引）
            { enName: { $regex: `^${escapedTerm}`, $options: 'i' } },
            { pinyin: { $regex: `^${searchLower}`, $options: 'i' } },
            { name: { $regex: `^${escapedTerm}`, $options: 'i' } },
            { code: { $regex: `^${searchLower}`, $options: 'i' } },
            // 包含匹配（无法使用索引，但作为备选）
            { enName: { $regex: escapedTerm, $options: 'i' } },
            { pinyin: { $regex: searchLower, $options: 'i' } },
            { name: { $regex: escapedTerm, $options: 'i' } },
            { code: { $regex: searchLower, $options: 'i' } },
          ]
        };
        
        const results = await Location.find(optimizedQuery)
          .limit(10)
          .lean();
        const endTime = Date.now();
        const duration = endTime - startTime;
        
        console.log(`  结果数量: ${results.length}`);
        console.log(`  查询耗时: ${duration}ms`);
        if (results.length > 0) {
          console.log(`  示例结果: ${results[0].name} (enName: ${results[0].enName || 'N/A'}, pinyin: ${results[0].pinyin || 'N/A'})`);
        }
      } catch (error) {
        console.warn(`  测试失败:`, error.message);
      }
      
      console.log('');
    }

    // 检查索引状态
    console.log('=== 索引状态检查 ===\n');
    const collection = Location.collection;
    const indexes = await collection.indexes();
    
    const enNameIndex = indexes.find(idx => idx.key && idx.key.enName === 1);
    const pinyinIndex = indexes.find(idx => idx.key && idx.key.pinyin === 1);
    
    if (enNameIndex) {
      console.log('✓ enName 索引存在');
      console.log(`  索引名称: ${enNameIndex.name}`);
      console.log(`  索引键: ${JSON.stringify(enNameIndex.key)}`);
    } else {
      console.log('✗ enName 索引不存在');
    }
    
    if (pinyinIndex) {
      console.log('✓ pinyin 索引存在');
      console.log(`  索引名称: ${pinyinIndex.name}`);
      console.log(`  索引键: ${JSON.stringify(pinyinIndex.key)}`);
    } else {
      console.log('✗ pinyin 索引不存在');
    }

    console.log('\n✓ 性能测试完成');
    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error('\n✗ 错误:', error.message);
    console.error(error.stack);
    await mongoose.connection.close();
    process.exit(1);
  }
}

testSearchPerformance();

