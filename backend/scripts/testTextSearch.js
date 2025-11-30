/**
 * 测试文本索引搜索是否会匹配到 Tokyo
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const mongoose = require('mongoose');
const connectDB = require('../config/database');
const Location = require('../models/Location');

async function testTextSearch() {
  try {
    console.log('正在连接数据库...');
    await connectDB();
    console.log('✓ 数据库连接成功\n');

    const searchTerm = 'tokyo';
    
    console.log('='.repeat(80));
    console.log('测试文本索引搜索');
    console.log('='.repeat(80));
    console.log(`搜索词: "${searchTerm}"\n`);
    
    // 1. 测试文本索引搜索
    console.log('【1】测试文本索引搜索');
    console.log('-'.repeat(80));
    
    const textSearchQuery = {
      $text: { $search: searchTerm },
      status: 'active'
    };
    
    console.log('文本搜索查询:', JSON.stringify(textSearchQuery, null, 2));
    
    try {
      const textResults = await Location.find(textSearchQuery)
        .select({ score: { $meta: 'textScore' } })
        .sort({ score: { $meta: 'textScore' }, type: 1, name: 1 })
        .limit(10)
        .lean();
      
      console.log(`文本索引搜索结果: ${textResults.length} 条`);
      if (textResults.length > 0) {
        textResults.forEach((loc, idx) => {
          console.log(`  [${idx + 1}] ${loc.name} (${loc.enName}, ${loc.pinyin}) - score: ${loc.score}`);
        });
      } else {
        console.log('  ✗ 文本索引搜索未找到结果');
      }
    } catch (error) {
      console.log(`  ✗ 文本索引搜索失败: ${error.message}`);
    }
    
    // 2. 测试正则表达式搜索（降级方案）
    console.log('\n【2】测试正则表达式搜索（降级方案）');
    console.log('-'.repeat(80));
    
    const regexQuery = {
      status: 'active',
      $or: [
        { enName: { $regex: `^${searchTerm}`, $options: 'i' } },
        { pinyin: { $regex: `^${searchTerm}`, $options: 'i' } }
      ]
    };
    
    console.log('正则表达式查询:', JSON.stringify(regexQuery, null, 2));
    
    const regexResults = await Location.find(regexQuery)
      .sort({ type: 1, name: 1 })
      .limit(10)
      .lean();
    
    console.log(`正则表达式搜索结果: ${regexResults.length} 条`);
    if (regexResults.length > 0) {
      regexResults.forEach((loc, idx) => {
        console.log(`  [${idx + 1}] ${loc.name} (${loc.enName}, ${loc.pinyin})`);
      });
    }
    
    // 3. 检查实际代码流程
    console.log('\n【3】模拟实际代码流程');
    console.log('-'.repeat(80));
    
    // 复制实际代码的 buildTextSearchQuery
    function buildTextSearchQuery(searchTerm) {
      if (!searchTerm || typeof searchTerm !== 'string') {
        return null;
      }
      
      const trimmed = searchTerm.trim();
      if (!trimmed || trimmed.length < 2) {
        return null;
      }
      
      // 转义特殊字符，但保留空格（用于多词搜索）
      const escaped = trimmed.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      
      // 构建文本搜索查询
      // MongoDB 文本索引会自动匹配 name、enName、pinyin、code 等字段
      return {
        $text: {
          $search: escaped
        }
      };
    }
    
    const textSearchQuery2 = buildTextSearchQuery(searchTerm);
    console.log('buildTextSearchQuery 结果:', JSON.stringify(textSearchQuery2, null, 2));
    
    if (textSearchQuery2 && textSearchQuery2.$text) {
      const query = {
        ...textSearchQuery2,
        status: 'active'
      };
      
      console.log('\n使用文本搜索查询:');
      console.log(JSON.stringify(query, null, 2));
      
      try {
        const results = await Location.find(query)
          .select({ score: { $meta: 'textScore' } })
          .sort({ score: { $meta: 'textScore' }, type: 1, name: 1 })
          .limit(10)
          .lean();
        
        console.log(`结果数量: ${results.length}`);
        if (results.length === 0) {
          console.log('  ✗ 文本搜索未找到结果，应该降级使用正则表达式搜索');
        } else {
          console.log('  ✓ 文本搜索找到结果');
        }
      } catch (error) {
        console.log(`  ✗ 文本搜索失败: ${error.message}`);
      }
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

testTextSearch();

