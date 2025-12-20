/**
 * 检查 Tokyo 数据是否存在以及查询问题
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const mongoose = require('mongoose');
const connectDB = require('../config/database');
const Location = require('../models/Location');

async function checkTokyo() {
  try {
    console.log('正在连接数据库...');
    await connectDB();
    console.log('✓ 数据库连接成功\n');

    const searchTerm = 'Tokyo';
    const searchLower = searchTerm.toLowerCase();
    
    console.log('=== 检查 Tokyo 数据 ===\n');
    
    // 1. 检查精确匹配
    console.log('1. 精确匹配查询:');
    const exactMatches = await Location.find({
      $or: [
        { enName: { $regex: `^${searchTerm}$`, $options: 'i' } },
        { pinyin: { $regex: `^${searchLower}$`, $options: 'i' } },
        { name: searchTerm }
      ],
      status: 'active'
    }).limit(10).lean();
    
    console.log(`   找到 ${exactMatches.length} 条精确匹配`);
    if (exactMatches.length > 0) {
      exactMatches.forEach((loc, idx) => {
        console.log(`   ${idx + 1}. ${loc.name} (${loc.enName || 'N/A'}, ${loc.pinyin || 'N/A'}) - ${loc.type}`);
      });
    }
    
    // 2. 检查前缀匹配
    console.log('\n2. 前缀匹配查询:');
    const prefixMatches = await Location.find({
      $or: [
        { enName: { $regex: `^${searchTerm}`, $options: 'i' } },
        { pinyin: { $regex: `^${searchLower}`, $options: 'i' } }
      ],
      status: 'active'
    }).limit(10).lean();
    
    console.log(`   找到 ${prefixMatches.length} 条前缀匹配`);
    if (prefixMatches.length > 0) {
      prefixMatches.forEach((loc, idx) => {
        console.log(`   ${idx + 1}. ${loc.name} (${loc.enName || 'N/A'}, ${loc.pinyin || 'N/A'}) - ${loc.type}`);
      });
    }
    
    // 3. 检查包含匹配
    console.log('\n3. 包含匹配查询:');
    const containsMatches = await Location.find({
      $or: [
        { enName: { $regex: searchTerm, $options: 'i' } },
        { pinyin: { $regex: searchLower, $options: 'i' } },
        { name: { $regex: searchTerm, $options: 'i' } }
      ],
      status: 'active'
    }).limit(10).lean();
    
    console.log(`   找到 ${containsMatches.length} 条包含匹配`);
    if (containsMatches.length > 0) {
      containsMatches.forEach((loc, idx) => {
        console.log(`   ${idx + 1}. ${loc.name} (${loc.enName || 'N/A'}, ${loc.pinyin || 'N/A'}) - ${loc.type}`);
      });
    }
    
    // 4. 检查数据库中是否有包含 "tokyo" 的数据（不区分大小写）
    console.log('\n4. 检查所有包含 "tokyo" 的数据:');
    const allTokyo = await Location.find({
      $or: [
        { enName: { $regex: 'tokyo', $options: 'i' } },
        { pinyin: { $regex: 'tokyo', $options: 'i' } },
        { name: { $regex: 'tokyo', $options: 'i' } },
        { city: { $regex: 'tokyo', $options: 'i' } }
      ]
    }).limit(20).lean();
    
    console.log(`   找到 ${allTokyo.length} 条相关数据`);
    if (allTokyo.length > 0) {
      allTokyo.forEach((loc, idx) => {
        console.log(`   ${idx + 1}. ${loc.name || 'N/A'} | enName: ${loc.enName || 'N/A'} | pinyin: ${loc.pinyin || 'N/A'} | city: ${loc.city || 'N/A'} | type: ${loc.type || 'N/A'} | status: ${loc.status || 'N/A'}`);
      });
    } else {
      console.log('   ⚠ 未找到任何包含 "tokyo" 的数据');
    }
    
    // 5. 检查日本的城市
    console.log('\n5. 检查日本的城市（前10个）:');
    const japanCities = await Location.find({
      country: { $regex: '日本|Japan', $options: 'i' },
      type: 'city',
      status: 'active'
    }).limit(10).lean();
    
    console.log(`   找到 ${japanCities.length} 个日本城市`);
    if (japanCities.length > 0) {
      japanCities.forEach((loc, idx) => {
        console.log(`   ${idx + 1}. ${loc.name || 'N/A'} | enName: ${loc.enName || 'N/A'} | pinyin: ${loc.pinyin || 'N/A'}`);
      });
    }
    
    // 6. 测试使用优化后的查询逻辑
    console.log('\n6. 测试优化后的查询逻辑:');
    const inputType = { isPinyinOrEnglish: true, type: 'pinyin' };
    const status = 'active';
    
    // 模拟 buildRegexSearchQuery 的逻辑
    const escapedTrimmed = searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const escapedLower = searchLower.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    
    const optimizedQuery = {
      status: status,
      $or: [
        { enName: { $regex: `^${escapedTrimmed}$`, $options: 'i' } },
        { pinyin: { $regex: `^${escapedLower}$`, $options: 'i' } },
        { enName: { $regex: `^${escapedTrimmed}`, $options: 'i' } },
        { pinyin: { $regex: `^${escapedLower}`, $options: 'i' } }
      ]
    };
    
    console.log('   查询条件:', JSON.stringify(optimizedQuery, null, 2));
    
    const optimizedResults = await Location.find(optimizedQuery).limit(10).lean();
    console.log(`   找到 ${optimizedResults.length} 条结果`);
    if (optimizedResults.length > 0) {
      optimizedResults.forEach((loc, idx) => {
        console.log(`   ${idx + 1}. ${loc.name} (${loc.enName || 'N/A'}, ${loc.pinyin || 'N/A'})`);
      });
    }
    
    // 7. 检查索引使用情况
    console.log('\n7. 检查索引使用情况:');
    const explainResult = await Location.find({
      status: 'active',
      $or: [
        { enName: { $regex: `^${escapedTrimmed}`, $options: 'i' } },
        { pinyin: { $regex: `^${escapedLower}`, $options: 'i' } }
      ]
    }).hint({ enName: 1, status: 1 }).limit(10).explain('executionStats');
    
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
    console.log(`   使用索引: ${indexUsed}`);
    console.log(`   扫描文档数: ${explainResult.executionStats.totalDocsExamined?.toLocaleString() || 'N/A'}`);
    console.log(`   返回文档数: ${explainResult.executionStats.nReturned || 'N/A'}`);
    
    console.log('\n✓ 检查完成');
    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error('\n✗ 错误:', error.message);
    console.error(error.stack);
    await mongoose.connection.close();
    process.exit(1);
  }
}

checkTokyo();










