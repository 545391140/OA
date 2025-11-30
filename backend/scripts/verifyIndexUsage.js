/**
 * 验证 enName 和 pinyin 索引是否被使用
 * 使用 explain() 查看查询执行计划
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const mongoose = require('mongoose');
const connectDB = require('../config/database');
const Location = require('../models/Location');

async function verifyIndexUsage() {
  try {
    console.log('正在连接数据库...');
    await connectDB();
    console.log('✓ 数据库连接成功\n');

    const testQueries = [
      { 
        name: '英文前缀匹配（应该使用索引）',
        query: { enName: { $regex: '^Beijing', $options: 'i' }, status: 'active' }
      },
      { 
        name: '拼音前缀匹配（应该使用索引）',
        query: { pinyin: { $regex: '^beijing', $options: 'i' }, status: 'active' }
      },
      { 
        name: '英文包含匹配（无法使用索引）',
        query: { enName: { $regex: 'Beijing', $options: 'i' }, status: 'active' }
      },
      { 
        name: '拼音包含匹配（无法使用索引）',
        query: { pinyin: { $regex: 'beijing', $options: 'i' }, status: 'active' }
      }
    ];

    console.log('=== 验证索引使用情况 ===\n');

    for (const test of testQueries) {
      console.log(`测试: ${test.name}`);
      try {
        const explain = await Location.find(test.query).limit(10).explain('executionStats');
        const executionStats = explain.executionStats;
        
        // 检查是否使用了索引
        const indexUsed = executionStats.executionStages?.indexName || 
                         executionStats.executionStages?.inputStage?.indexName ||
                         executionStats.executionStages?.inputStage?.inputStage?.indexName ||
                         '无索引';
        
        console.log(`  使用索引: ${indexUsed}`);
        console.log(`  扫描文档数: ${executionStats.totalDocsExamined || 'N/A'}`);
        console.log(`  返回文档数: ${executionStats.nReturned || 'N/A'}`);
        console.log(`  执行时间: ${executionStats.executionTimeMillis || 'N/A'}ms`);
        
        // 判断索引是否被使用
        if (indexUsed !== '无索引' && indexUsed.includes('enName') || indexUsed.includes('pinyin')) {
          console.log(`  ✓ 索引被正确使用`);
        } else if (test.name.includes('包含匹配')) {
          console.log(`  ⚠ 包含匹配无法使用索引（预期行为）`);
        } else {
          console.log(`  ✗ 索引未被使用，可能需要优化查询`);
        }
      } catch (error) {
        console.error(`  ✗ 查询失败:`, error.message);
      }
      console.log('');
    }

    // 检查索引统计信息
    console.log('=== 索引统计信息 ===');
    const collection = Location.collection;
    const stats = await collection.stats();
    console.log(`集合文档数: ${stats.count}`);
    console.log(`集合大小: ${(stats.size / 1024 / 1024).toFixed(2)} MB`);
    console.log(`索引数量: ${stats.nindexes}`);
    console.log(`索引总大小: ${(stats.totalIndexSize / 1024 / 1024).toFixed(2)} MB`);

    console.log('\n✓ 验证完成');
    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error('\n✗ 错误:', error.message);
    console.error(error.stack);
    await mongoose.connection.close();
    process.exit(1);
  }
}

verifyIndexUsage();



