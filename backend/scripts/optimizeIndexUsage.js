/**
 * 优化索引使用 - 检查索引状态并强制使用复合索引
 * 解决拼音和英文搜索性能问题
 * 
 * 使用方法：
 * node backend/scripts/optimizeIndexUsage.js
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const mongoose = require('mongoose');
const connectDB = require('../config/database');
const Location = require('../models/Location');

async function optimizeIndexUsage() {
  try {
    console.log('正在连接数据库...');
    await connectDB();
    console.log('✓ 数据库连接成功\n');

    const collection = Location.collection;

    // 1. 检查索引状态
    console.log('=== 检查索引状态 ===');
    const indexes = await collection.indexes();
    
    const pinyinIndex = indexes.find(idx => idx.key && idx.key.pinyin === 1 && !idx.key.status);
    const enNameIndex = indexes.find(idx => idx.key && idx.key.enName === 1 && !idx.key.status);
    const pinyinStatusIndex = indexes.find(idx => idx.key && idx.key.pinyin === 1 && idx.key.status === 1);
    const enNameStatusIndex = indexes.find(idx => idx.key && idx.key.enName === 1 && idx.key.status === 1);
    
    console.log('普通索引:');
    console.log(`  pinyin_1: ${pinyinIndex ? '✓ 存在' : '✗ 不存在'}`);
    console.log(`  enName_1: ${enNameIndex ? '✓ 存在' : '✗ 不存在'}`);
    console.log('\n复合索引:');
    console.log(`  pinyin_1_status_1: ${pinyinStatusIndex ? '✓ 存在' : '✗ 不存在'}`);
    console.log(`  enName_1_status_1: ${enNameStatusIndex ? '✓ 存在' : '✗ 不存在'}`);
    
    if (pinyinStatusIndex) {
      console.log(`    索引名称: ${pinyinStatusIndex.name}`);
      console.log(`    索引键: ${JSON.stringify(pinyinStatusIndex.key)}`);
    }
    if (enNameStatusIndex) {
      console.log(`    索引名称: ${enNameStatusIndex.name}`);
      console.log(`    索引键: ${JSON.stringify(enNameStatusIndex.key)}`);
    }

    // 2. 检查索引构建状态
    console.log('\n=== 检查索引构建状态 ===');
    try {
      const stats = await collection.stats();
      console.log(`集合文档数: ${stats.count.toLocaleString()}`);
      console.log(`索引数量: ${stats.nindexes}`);
      
      // 检查索引是否在构建中（通过查看索引统计）
      const indexStats = await collection.aggregate([
        { $indexStats: {} }
      ]).toArray();
      
      console.log('\n索引使用统计:');
      indexStats.forEach(stat => {
        if (stat.name.includes('pinyin') || stat.name.includes('enName')) {
          console.log(`  ${stat.name}:`);
          console.log(`    访问次数: ${stat.accesses.ops || 0}`);
        }
      });
    } catch (error) {
      console.warn('⚠ 无法获取索引统计信息:', error.message);
    }

    // 3. 测试查询性能（不使用 hint）
    console.log('\n=== 测试查询性能（不使用 hint） ===');
    const testQueries = [
      { 
        name: '拼音前缀匹配 + status',
        query: { pinyin: { $regex: '^beijing', $options: 'i' }, status: 'active' },
        expectedIndex: 'pinyin_1_status_1'
      },
      { 
        name: '英文前缀匹配 + status',
        query: { enName: { $regex: '^Beijing', $options: 'i' }, status: 'active' },
        expectedIndex: 'enName_1_status_1'
      }
    ];

    for (const test of testQueries) {
      try {
        const startTime = Date.now();
        const explain = await Location.find(test.query).limit(10).explain('executionStats');
        const endTime = Date.now();
        const executionStats = explain.executionStats;
        
        // 递归查找使用的索引
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
        
        const indexUsed = findIndexName(executionStats.executionStages) || '无索引';
        
        console.log(`\n${test.name}:`);
        console.log(`  使用索引: ${indexUsed}`);
        console.log(`  预期索引: ${test.expectedIndex}`);
        console.log(`  扫描文档数: ${executionStats.totalDocsExamined?.toLocaleString() || 'N/A'}`);
        console.log(`  返回文档数: ${executionStats.nReturned || 'N/A'}`);
        console.log(`  查询耗时: ${endTime - startTime}ms`);
        console.log(`  执行时间: ${executionStats.executionTimeMillis || 'N/A'}ms`);
        
        if (indexUsed === test.expectedIndex) {
          console.log(`  ✓ 索引使用正确`);
        } else if (indexUsed.includes('status_1') && !indexUsed.includes('pinyin') && !indexUsed.includes('enName')) {
          console.log(`  ⚠ 使用了 status_1 索引而不是复合索引，性能可能较差`);
        } else {
          console.log(`  ⚠ 索引使用可能不是最优`);
        }
      } catch (error) {
        console.error(`  ✗ 查询测试失败:`, error.message);
      }
    }

    // 4. 测试使用 hint 强制使用复合索引
    console.log('\n=== 测试使用 hint 强制使用复合索引 ===');
    const hintTests = [
      {
        name: '拼音前缀匹配 + status (hint: pinyin_1_status_1)',
        query: { pinyin: { $regex: '^beijing', $options: 'i' }, status: 'active' },
        hint: { pinyin: 1, status: 1 }
      },
      {
        name: '英文前缀匹配 + status (hint: enName_1_status_1)',
        query: { enName: { $regex: '^Beijing', $options: 'i' }, status: 'active' },
        hint: { enName: 1, status: 1 }
      }
    ];

    for (const test of hintTests) {
      try {
        const startTime = Date.now();
        const explain = await Location.find(test.query).hint(test.hint).limit(10).explain('executionStats');
        const endTime = Date.now();
        const executionStats = explain.executionStats;
        
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
        
        const indexUsed = findIndexName(executionStats.executionStages) || '无索引';
        
        console.log(`\n${test.name}:`);
        console.log(`  使用索引: ${indexUsed}`);
        console.log(`  扫描文档数: ${executionStats.totalDocsExamined?.toLocaleString() || 'N/A'}`);
        console.log(`  返回文档数: ${executionStats.nReturned || 'N/A'}`);
        console.log(`  查询耗时: ${endTime - startTime}ms`);
        console.log(`  执行时间: ${executionStats.executionTimeMillis || 'N/A'}ms`);
        
        if (indexUsed.includes('pinyin') || indexUsed.includes('enName')) {
          console.log(`  ✓ 强制使用复合索引成功`);
        }
      } catch (error) {
        console.error(`  ✗ 查询测试失败:`, error.message);
      }
    }

    // 5. 建议
    console.log('\n=== 优化建议 ===');
    console.log('1. 确保复合索引已完全构建（对于大量数据可能需要几分钟到几小时）');
    console.log('2. 如果索引已构建但查询优化器仍未使用，可以：');
    console.log('   - 重启 MongoDB 服务以更新查询优化器统计信息');
    console.log('   - 使用 hint() 强制使用复合索引（已在代码中优化查询结构）');
    console.log('   - 运行 db.locations.reIndex() 重建索引（谨慎使用，会锁定集合）');
    console.log('3. 查询结构已优化：status 条件已合并到每个 $or 条件中，确保可以使用复合索引');

    console.log('\n✓ 索引优化检查完成');
    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error('\n✗ 错误:', error.message);
    console.error(error.stack);
    await mongoose.connection.close();
    process.exit(1);
  }
}

optimizeIndexUsage();










