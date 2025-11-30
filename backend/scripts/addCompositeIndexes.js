/**
 * 为 Location 集合添加复合索引
 * 优化带 status 条件的拼音和英文查询性能
 * 
 * 使用方法：
 * node backend/scripts/addCompositeIndexes.js
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const mongoose = require('mongoose');
const connectDB = require('../config/database');
const Location = require('../models/Location');

async function addCompositeIndexes() {
  try {
    console.log('正在连接数据库...');
    await connectDB();
    console.log('✓ 数据库连接成功\n');

    const collection = Location.collection;

    // 检查现有索引
    console.log('=== 检查现有索引 ===');
    const indexes = await collection.indexes();
    const existingIndexes = indexes.map(idx => {
      const keys = Object.keys(idx.key || {});
      return keys.length > 0 ? keys.join('_') : null;
    }).filter(Boolean);
    
    console.log('现有索引:', existingIndexes.join(', '));
    console.log('');

    // 添加 pinyin + status 复合索引
    console.log('=== 添加 pinyin + status 复合索引 ===');
    try {
      const pinyinStatusIndexExists = indexes.some(idx => 
        idx.key && idx.key.pinyin === 1 && idx.key.status === 1
      );
      if (pinyinStatusIndexExists) {
        console.log('⚠ pinyin + status 复合索引已存在，跳过');
      } else {
        await collection.createIndex({ pinyin: 1, status: 1 }, { 
          name: 'pinyin_1_status_1',
          background: true
        });
        console.log('✓ pinyin + status 复合索引创建成功');
      }
    } catch (error) {
      if (error.code === 85) {
        console.log('⚠ pinyin + status 复合索引已存在（重复键错误）');
      } else {
        console.error('✗ pinyin + status 复合索引创建失败:', error.message);
        throw error;
      }
    }

    // 添加 enName + status 复合索引
    console.log('\n=== 添加 enName + status 复合索引 ===');
    try {
      const enNameStatusIndexExists = indexes.some(idx => 
        idx.key && idx.key.enName === 1 && idx.key.status === 1
      );
      if (enNameStatusIndexExists) {
        console.log('⚠ enName + status 复合索引已存在，跳过');
      } else {
        await collection.createIndex({ enName: 1, status: 1 }, { 
          name: 'enName_1_status_1',
          background: true
        });
        console.log('✓ enName + status 复合索引创建成功');
      }
    } catch (error) {
      if (error.code === 85) {
        console.log('⚠ enName + status 复合索引已存在（重复键错误）');
      } else {
        console.error('✗ enName + status 复合索引创建失败:', error.message);
        throw error;
      }
    }

    // 验证索引
    console.log('\n=== 验证索引 ===');
    const newIndexes = await collection.indexes();
    const pinyinStatusIndex = newIndexes.find(idx => 
      idx.key && idx.key.pinyin === 1 && idx.key.status === 1
    );
    const enNameStatusIndex = newIndexes.find(idx => 
      idx.key && idx.key.enName === 1 && idx.key.status === 1
    );
    
    if (pinyinStatusIndex) {
      console.log('✓ pinyin + status 复合索引验证成功');
      console.log('  索引名称:', pinyinStatusIndex.name);
      console.log('  索引键:', JSON.stringify(pinyinStatusIndex.key));
    } else {
      console.log('✗ pinyin + status 复合索引验证失败：未找到索引');
    }
    
    if (enNameStatusIndex) {
      console.log('✓ enName + status 复合索引验证成功');
      console.log('  索引名称:', enNameStatusIndex.name);
      console.log('  索引键:', JSON.stringify(enNameStatusIndex.key));
    } else {
      console.log('✗ enName + status 复合索引验证失败：未找到索引');
    }

    // 测试查询性能
    console.log('\n=== 测试查询性能 ===');
    const testQueries = [
      { 
        name: '拼音前缀匹配 + status',
        query: { pinyin: { $regex: '^beijing', $options: 'i' }, status: 'active' }
      },
      { 
        name: '英文前缀匹配 + status',
        query: { enName: { $regex: '^Beijing', $options: 'i' }, status: 'active' }
      }
    ];

    for (const test of testQueries) {
      try {
        const startTime = Date.now();
        const explain = await Location.find(test.query).limit(10).explain('executionStats');
        const endTime = Date.now();
        const executionStats = explain.executionStats;
        
        const indexUsed = executionStats.executionStages?.indexName || 
                         executionStats.executionStages?.inputStage?.indexName ||
                         '无索引';
        
        console.log(`${test.name}:`);
        console.log(`  使用索引: ${indexUsed}`);
        console.log(`  扫描文档数: ${executionStats.totalDocsExamined || 'N/A'}`);
        console.log(`  返回文档数: ${executionStats.nReturned || 'N/A'}`);
        console.log(`  查询耗时: ${endTime - startTime}ms`);
        console.log(`  执行时间: ${executionStats.executionTimeMillis || 'N/A'}ms`);
      } catch (error) {
        console.warn(`  ⚠ 查询测试失败:`, error.message);
      }
    }

    console.log('\n✓ 复合索引添加完成');
    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error('\n✗ 错误:', error.message);
    console.error(error.stack);
    await mongoose.connection.close();
    process.exit(1);
  }
}

addCompositeIndexes();

