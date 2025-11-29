/**
 * 重建Location集合的文本索引
 * 用于支持多语言搜索（中文、英文、拼音）
 * 
 * 使用方法：
 * node backend/scripts/rebuildTextIndex.js
 */

const mongoose = require('mongoose');
const Location = require('../models/Location');
const config = require('../config');

async function rebuildTextIndex() {
  try {
    console.log('正在连接数据库...');
    const mongoURI = config.MONGODB_URI || config.mongoURI || process.env.MONGODB_URI;
    await mongoose.connect(mongoURI);
    console.log('数据库连接成功');

    // 获取集合
    const collection = Location.collection;

    // 检查现有文本索引
    console.log('\n=== 检查现有索引 ===');
    const indexes = await collection.indexes();
    const textIndexes = indexes.filter(idx => idx.textIndexVersion !== undefined);
    
    if (textIndexes.length > 0) {
      console.log('发现现有文本索引:');
      textIndexes.forEach(idx => {
        console.log('  -', idx.name, ':', JSON.stringify(idx.weights || idx.key));
      });
      
      console.log('\n删除现有文本索引...');
      for (const idx of textIndexes) {
        try {
          await collection.dropIndex(idx.name);
          console.log(`  ✓ 已删除索引: ${idx.name}`);
        } catch (error) {
          console.warn(`  ⚠ 删除索引失败 ${idx.name}:`, error.message);
        }
      }
    } else {
      console.log('未发现现有文本索引');
    }

    // 创建新的文本索引（包含enName和pinyin）
    console.log('\n=== 创建新的文本索引 ===');
    console.log('索引字段: name, code, city, province, district, county, country, countryCode, enName, pinyin');
    
    try {
      await collection.createIndex(
        {
          name: 'text',
          code: 'text',
          city: 'text',
          province: 'text',
          district: 'text',
          county: 'text',
          country: 'text',
          countryCode: 'text',
          enName: 'text',
          pinyin: 'text'
        },
        {
          name: 'location_text_index',
          default_language: 'none', // 禁用默认语言，支持中文
          weights: {
            name: 10,      // 名称权重最高
            code: 8,       // 代码权重较高
            city: 6,       // 城市权重中等
            enName: 5,     // 英文名称权重
            pinyin: 5,     // 拼音权重
            province: 3,  // 省份权重较低
            district: 2,  // 区权重较低
            county: 2,    // 县权重较低
            country: 1,   // 国家权重最低
            countryCode: 1 // 国家代码权重最低
          }
        }
      );
      console.log('✓ 文本索引创建成功');
    } catch (error) {
      console.error('✗ 创建文本索引失败:', error.message);
      throw error;
    }

    // 验证索引
    console.log('\n=== 验证索引 ===');
    const newIndexes = await collection.indexes();
    const newTextIndexes = newIndexes.filter(idx => idx.textIndexVersion !== undefined);
    
    if (newTextIndexes.length > 0) {
      console.log('新的文本索引:');
      newTextIndexes.forEach(idx => {
        console.log('  -', idx.name);
        if (idx.weights) {
          console.log('    权重:', JSON.stringify(idx.weights, null, 2));
        }
      });
    }

    // 测试搜索
    console.log('\n=== 测试搜索 ===');
    const testQueries = [
      { search: '成都', type: '中文' },
      { search: 'Chengdu', type: '英文' },
      { search: 'chengdu', type: '拼音' }
    ];

    for (const test of testQueries) {
      try {
        const results = await Location.find({
          $text: { $search: test.search },
          status: 'active'
        })
        .select('name enName pinyin code type')
        .limit(3);
        
        console.log(`\n${test.type}搜索 "${test.search}":`);
        console.log(`  结果数量: ${results.length}`);
        results.forEach((r, i) => {
          console.log(`  ${i + 1}. ${r.name} (en: ${r.enName || 'N/A'}, pinyin: ${r.pinyin || 'N/A'})`);
        });
      } catch (error) {
        console.warn(`  ⚠ ${test.type}搜索测试失败:`, error.message);
      }
    }

    console.log('\n✓ 文本索引重建完成');
    process.exit(0);
  } catch (error) {
    console.error('\n✗ 错误:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// 运行脚本
rebuildTextIndex();

