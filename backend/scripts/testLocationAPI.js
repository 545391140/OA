/**
 * 测试地理位置 API 是否正常工作
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const mongoose = require('mongoose');
const connectDB = require('../config/database');
const Location = require('../models/Location');

async function testLocationAPI() {
  try {
    console.log('正在连接数据库...');
    await connectDB();
    console.log('✓ 数据库连接成功\n');

    console.log('='.repeat(80));
    console.log('测试地理位置 API');
    console.log('='.repeat(80));
    
    // 1. 测试基本查询（无搜索条件）
    console.log('\n【1】测试基本查询（无搜索条件，status=active）');
    console.log('-'.repeat(80));
    
    try {
      const query1 = { status: 'active' };
      const count1 = await Location.countDocuments(query1);
      const locations1 = await Location.find(query1)
        .sort({ type: 1, name: 1 })
        .limit(10)
        .lean();
      
      console.log(`总数: ${count1.toLocaleString()}`);
      console.log(`前10条数据: ${locations1.length} 条`);
      
      if (locations1.length > 0) {
        console.log('\n前5条数据:');
        locations1.slice(0, 5).forEach((loc, idx) => {
          console.log(`  [${idx + 1}] ${loc.name} (${loc.type}, ${loc.status})`);
        });
      }
    } catch (error) {
      console.log(`✗ 基本查询失败: ${error.message}`);
      console.log(`  错误堆栈: ${error.stack}`);
    }
    
    // 2. 测试文本索引搜索
    console.log('\n【2】测试文本索引搜索');
    console.log('-'.repeat(80));
    
    try {
      const textQuery = {
        $text: { $search: '北京', $language: 'none' },
        status: 'active'
      };
      
      const textResults = await Location.find(textQuery)
        .select({ score: { $meta: 'textScore' } })
        .sort({ score: { $meta: 'textScore' }, type: 1, name: 1 })
        .limit(5)
        .lean();
      
      console.log(`文本索引搜索结果: ${textResults.length} 条`);
      if (textResults.length > 0) {
        textResults.forEach((loc, idx) => {
          console.log(`  [${idx + 1}] ${loc.name} (score: ${loc.score?.toFixed(2) || 'N/A'})`);
        });
      }
    } catch (error) {
      console.log(`✗ 文本索引搜索失败: ${error.message}`);
      if (error.message.includes('text index')) {
        console.log('  可能原因: 文本索引还在构建中或不存在');
      }
    }
    
    // 3. 测试聚合管道（模拟实际代码）
    console.log('\n【3】测试聚合管道查询');
    console.log('-'.repeat(80));
    
    try {
      const pipeline = [
        { $match: { status: 'active' } },
        { $sort: { type: 1, name: 1 } },
        { $limit: 10 }
      ];
      
      const aggregateResults = await Location.aggregate(pipeline);
      console.log(`聚合查询结果: ${aggregateResults.length} 条`);
      
      if (aggregateResults.length > 0) {
        console.log('\n前5条数据:');
        aggregateResults.slice(0, 5).forEach((loc, idx) => {
          console.log(`  [${idx + 1}] ${loc.name} (${loc.type})`);
        });
      }
    } catch (error) {
      console.log(`✗ 聚合查询失败: ${error.message}`);
      console.log(`  错误堆栈: ${error.stack}`);
    }
    
    // 4. 检查文本索引状态
    console.log('\n【4】检查文本索引状态');
    console.log('-'.repeat(80));
    
    try {
      const indexes = await Location.collection.getIndexes();
      const textIndexes = Object.keys(indexes).filter(name => name.includes('text'));
      
      if (textIndexes.length > 0) {
        console.log(`找到 ${textIndexes.length} 个文本索引:`);
        textIndexes.forEach(name => {
          console.log(`  - ${name}`);
        });
        
        // 检查索引构建状态
        try {
          const indexStats = await Location.collection.aggregate([
            { $indexStats: {} }
          ]).toArray();
          
          const textIndexStats = indexStats.filter(stat => textIndexes.includes(stat.name));
          if (textIndexStats.length > 0) {
            console.log('\n文本索引统计:');
            textIndexStats.forEach(stat => {
              console.log(`  ${stat.name}:`);
              console.log(`    访问次数: ${stat.accesses.ops}`);
              console.log(`    最后访问: ${stat.accesses.since}`);
            });
          }
        } catch (error) {
          console.log(`获取索引统计失败: ${error.message}`);
        }
      } else {
        console.log('⚠ 未找到文本索引');
      }
    } catch (error) {
      console.log(`检查索引失败: ${error.message}`);
    }
    
    // 5. 测试分页查询
    console.log('\n【5】测试分页查询');
    console.log('-'.repeat(80));
    
    try {
      const page = 1;
      const limit = 20;
      const skip = (page - 1) * limit;
      
      const total = await Location.countDocuments({ status: 'active' });
      const locations = await Location.find({ status: 'active' })
        .sort({ type: 1, name: 1 })
        .skip(skip)
        .limit(limit)
        .lean();
      
      console.log(`总数: ${total.toLocaleString()}`);
      console.log(`第 ${page} 页，每页 ${limit} 条，跳过 ${skip} 条`);
      console.log(`返回数据: ${locations.length} 条`);
      
      if (locations.length > 0) {
        console.log('\n前3条数据:');
        locations.slice(0, 3).forEach((loc, idx) => {
          console.log(`  [${idx + 1}] ${loc.name} (${loc.type})`);
        });
      }
    } catch (error) {
      console.log(`✗ 分页查询失败: ${error.message}`);
      console.log(`  错误堆栈: ${error.stack}`);
    }
    
    // 6. 检查数据库连接和集合
    console.log('\n【6】检查数据库连接和集合');
    console.log('-'.repeat(80));
    
    try {
      const db = mongoose.connection.db;
      const collections = await db.listCollections().toArray();
      const locationCollection = collections.find(col => col.name === 'locations');
      
      if (locationCollection) {
        console.log('✓ locations 集合存在');
        const stats = await db.collection('locations').stats();
        console.log(`  文档数量: ${stats.count.toLocaleString()}`);
        console.log(`  集合大小: ${(stats.size / 1024 / 1024).toFixed(2)} MB`);
        console.log(`  索引数量: ${stats.nindexes}`);
      } else {
        console.log('✗ locations 集合不存在');
      }
    } catch (error) {
      console.log(`检查集合失败: ${error.message}`);
    }
    
    // 7. 总结
    console.log('\n【7】诊断总结');
    console.log('='.repeat(80));
    
    console.log('测试完成。如果所有测试都通过，API 应该正常工作。');
    console.log('如果某个测试失败，请检查相应的错误信息。');
    
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

testLocationAPI();

