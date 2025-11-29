/**
 * 为 Location 集合添加 enName 和 pinyin 的普通索引
 * 用于优化拼音和英语搜索的正则表达式查询性能
 * 
 * 使用方法：
 * node backend/scripts/addEnNamePinyinIndexes.js
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const mongoose = require('mongoose');
const connectDB = require('../config/database');
const Location = require('../models/Location');

async function addIndexes() {
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
      return keys.length > 0 ? keys[0] : null;
    }).filter(Boolean);
    
    console.log('现有索引字段:', existingIndexes.join(', '));
    console.log('');

    // 添加 enName 索引
    console.log('=== 添加 enName 索引 ===');
    try {
      const enNameIndexExists = indexes.some(idx => idx.key && idx.key.enName === 1);
      if (enNameIndexExists) {
        console.log('⚠ enName 索引已存在，跳过');
      } else {
        await collection.createIndex({ enName: 1 }, { 
          name: 'enName_1',
          background: true // 后台创建，不阻塞其他操作
        });
        console.log('✓ enName 索引创建成功');
      }
    } catch (error) {
      if (error.code === 85) {
        console.log('⚠ enName 索引已存在（重复键错误）');
      } else {
        console.error('✗ enName 索引创建失败:', error.message);
        throw error;
      }
    }

    // 添加 pinyin 索引
    console.log('\n=== 添加 pinyin 索引 ===');
    try {
      const pinyinIndexExists = indexes.some(idx => idx.key && idx.key.pinyin === 1);
      if (pinyinIndexExists) {
        console.log('⚠ pinyin 索引已存在，跳过');
      } else {
        await collection.createIndex({ pinyin: 1 }, { 
          name: 'pinyin_1',
          background: true // 后台创建，不阻塞其他操作
        });
        console.log('✓ pinyin 索引创建成功');
      }
    } catch (error) {
      if (error.code === 85) {
        console.log('⚠ pinyin 索引已存在（重复键错误）');
      } else {
        console.error('✗ pinyin 索引创建失败:', error.message);
        throw error;
      }
    }

    // 验证索引
    console.log('\n=== 验证索引 ===');
    const newIndexes = await collection.indexes();
    const enNameIndex = newIndexes.find(idx => idx.key && idx.key.enName === 1);
    const pinyinIndex = newIndexes.find(idx => idx.key && idx.key.pinyin === 1);
    
    if (enNameIndex) {
      console.log('✓ enName 索引验证成功');
      console.log('  索引名称:', enNameIndex.name);
      console.log('  索引键:', JSON.stringify(enNameIndex.key));
    } else {
      console.log('✗ enName 索引验证失败：未找到索引');
    }
    
    if (pinyinIndex) {
      console.log('✓ pinyin 索引验证成功');
      console.log('  索引名称:', pinyinIndex.name);
      console.log('  索引键:', JSON.stringify(pinyinIndex.key));
    } else {
      console.log('✗ pinyin 索引验证失败：未找到索引');
    }

    // 测试查询性能（可选）
    console.log('\n=== 测试查询性能 ===');
    const testQueries = [
      { field: 'enName', value: 'Beijing', type: '英文' },
      { field: 'pinyin', value: 'beijing', type: '拼音' }
    ];

    for (const test of testQueries) {
      try {
        const startTime = Date.now();
        const results = await Location.find({
          [test.field]: { $regex: `^${test.value}`, $options: 'i' },
          status: 'active'
        })
        .limit(10)
        .lean();
        const endTime = Date.now();
        const duration = endTime - startTime;
        
        console.log(`${test.type}前缀匹配查询 "${test.value}":`);
        console.log(`  结果数量: ${results.length}`);
        console.log(`  查询耗时: ${duration}ms`);
        if (results.length > 0) {
          console.log(`  示例结果: ${results[0].name} (${test.field}: ${results[0][test.field] || 'N/A'})`);
        }
      } catch (error) {
        console.warn(`  ⚠ ${test.type}查询测试失败:`, error.message);
      }
    }

    console.log('\n✓ 索引添加完成');
    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error('\n✗ 错误:', error.message);
    console.error(error.stack);
    await mongoose.connection.close();
    process.exit(1);
  }
}

addIndexes();

