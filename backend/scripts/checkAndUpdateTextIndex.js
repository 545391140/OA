/**
 * 检查并更新文本索引，添加 enName 和 pinyin 字段
 * 不改代码，只操作数据库索引
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const mongoose = require('mongoose');
const connectDB = require('../config/database');
const Location = require('../models/Location');

async function checkAndUpdateTextIndex() {
  try {
    console.log('正在连接数据库...');
    await connectDB();
    console.log('✓ 数据库连接成功\n');

    console.log('='.repeat(80));
    console.log('文本索引检查和更新');
    console.log('='.repeat(80));
    
    // 声明变量在外部作用域
    let textIndexName = null;
    let textIndexDefinition = null;
    
    // 1. 检查当前文本索引
    console.log('\n【1】检查当前文本索引');
    console.log('-'.repeat(80));
    
    try {
      const indexes = await Location.collection.getIndexes();
      console.log('所有索引:');
      
      Object.keys(indexes).forEach(indexName => {
        const index = indexes[indexName];
        console.log(`\n  ${indexName}:`);
        console.log(`    定义:`, JSON.stringify(index, null, 2));
        
        // 检查是否是文本索引（文本索引会有 _fts 字段）
        if (indexName.includes('text') || (index._fts && index._fts === 'text')) {
          console.log(`    ⭐ 这是文本索引`);
          textIndexName = indexName;
          textIndexDefinition = index;
        }
      });
      
      // 尝试获取文本索引的详细信息（包括权重）
      if (textIndexName) {
        try {
          const indexStats = await Location.collection.aggregate([
            { $indexStats: {} }
          ]).toArray();
          
          const textIndexStats = indexStats.find(stat => stat.name === textIndexName);
          if (textIndexStats) {
            console.log(`\n文本索引统计信息:`, JSON.stringify(textIndexStats, null, 2));
          }
        } catch (error) {
          console.log(`获取索引统计信息失败: ${error.message}`);
        }
      }
      
      if (!textIndexName) {
        console.log('\n⚠ 未找到文本索引');
        console.log('需要创建新的文本索引');
      } else {
        console.log(`\n找到文本索引: ${textIndexName}`);
        
        // 检查是否包含 enName 和 pinyin（通过检查索引名称或尝试查询）
        // 由于 MongoDB 的 getIndexes() 不直接显示文本索引的字段权重，
        // 我们需要通过实际查询来验证
        console.log(`\n注意: MongoDB getIndexes() 不直接显示文本索引的字段列表`);
        console.log(`需要通过实际查询来验证字段是否包含`);
        
        // 尝试用 enName 和 pinyin 搜索来验证
        try {
          const testQueryEnName = {
            $text: { $search: 'tokyo', $language: 'none' },
            status: 'active'
          };
          const testResultsEnName = await Location.find(testQueryEnName).limit(1).lean();
          
          const testQueryPinyin = {
            $text: { $search: 'dongjing', $language: 'none' },
            status: 'active'
          };
          const testResultsPinyin = await Location.find(testQueryPinyin).limit(1).lean();
          
          console.log(`\n字段验证测试:`);
          console.log(`  搜索 "tokyo" (测试 enName): ${testResultsEnName.length > 0 ? '✓ 找到' : '✗ 未找到'}`);
          console.log(`  搜索 "dongjing" (测试 pinyin): ${testResultsPinyin.length > 0 ? '✓ 找到' : '✗ 未找到'}`);
          
          if (testResultsEnName.length > 0 && testResultsPinyin.length > 0) {
            console.log('\n✓ 文本索引已包含 enName 和 pinyin 字段，无需更新');
            await mongoose.connection.close();
            process.exit(0);
          } else {
            console.log('\n⚠ 文本索引可能不包含 enName 或 pinyin 字段，需要更新');
          }
        } catch (error) {
          console.log(`验证测试失败: ${error.message}`);
          console.log('继续执行索引更新...');
        }
      }
    } catch (error) {
      console.log(`检查索引失败: ${error.message}`);
      console.log(`错误堆栈: ${error.stack}`);
    }
    
    // 2. 准备新的文本索引定义
    console.log('\n【2】准备新的文本索引定义');
    console.log('-'.repeat(80));
    
    // 新的文本索引应该包含所有字段
    const newTextIndex = {
      name: 'text',
      code: 'text',
      city: 'text',
      province: 'text',
      district: 'text',
      county: 'text',
      country: 'text',
      countryCode: 'text',
      enName: 'text',  // 新增：英文名称
      pinyin: 'text'   // 新增：拼音
    };
    
    console.log('新的文本索引定义:');
    console.log(JSON.stringify(newTextIndex, null, 2));
    
    // 3. 删除旧的文本索引（如果存在）
    console.log('\n【3】删除旧的文本索引');
    console.log('-'.repeat(80));
    
    if (textIndexName) {
      try {
        console.log(`尝试删除旧索引: ${textIndexName}`);
        await Location.collection.dropIndex(textIndexName);
        console.log(`✓ 成功删除旧索引: ${textIndexName}`);
      } catch (error) {
        if (error.code === 27 || error.message.includes('index not found')) {
          console.log(`索引 ${textIndexName} 不存在，跳过删除`);
        } else {
          console.log(`删除索引失败: ${error.message}`);
          throw error;
        }
      }
    }
    
    // 4. 创建新的文本索引
    console.log('\n【4】创建新的文本索引');
    console.log('-'.repeat(80));
    
    try {
      console.log('正在创建新的文本索引（包含 enName 和 pinyin）...');
      console.log('注意：这可能需要一些时间，取决于数据量');
      
      // 使用 createIndex 创建文本索引
      await Location.collection.createIndex(newTextIndex, {
        name: 'text_index_with_enName_pinyin',
        background: true, // 后台创建，不阻塞其他操作
        weights: {
          name: 10,        // 中文名称权重最高
          enName: 8,       // 英文名称权重较高
          pinyin: 8,       // 拼音权重较高
          code: 5,         // 代码权重中等
          city: 3,         // 城市权重较低
          province: 2,     // 省份权重较低
          district: 1,    // 区县权重最低
          county: 1,      // 县权重最低
          country: 1,     // 国家权重最低
          countryCode: 1  // 国家代码权重最低
        }
      });
      
      console.log('✓ 文本索引创建成功');
      console.log('  索引名称: text_index_with_enName_pinyin');
      console.log('  包含字段: name, code, city, province, district, county, country, countryCode, enName, pinyin');
    } catch (error) {
      console.log(`✗ 创建索引失败: ${error.message}`);
      console.log(`  错误堆栈: ${error.stack}`);
      
      // 如果是索引已存在的错误，尝试删除后重新创建
      if (error.code === 85 || error.message.includes('already exists')) {
        console.log('\n尝试删除已存在的索引后重新创建...');
        try {
          await Location.collection.dropIndex('text_index_with_enName_pinyin');
          await Location.collection.createIndex(newTextIndex, {
            name: 'text_index_with_enName_pinyin',
            background: true,
            weights: {
              name: 10,
              enName: 8,
              pinyin: 8,
              code: 5,
              city: 3,
              province: 2,
              district: 1,
              county: 1,
              country: 1,
              countryCode: 1
            }
          });
          console.log('✓ 索引重新创建成功');
        } catch (retryError) {
          console.log(`✗ 重新创建失败: ${retryError.message}`);
          throw retryError;
        }
      } else {
        throw error;
      }
    }
    
    // 5. 验证新索引
    console.log('\n【5】验证新索引');
    console.log('-'.repeat(80));
    
    try {
      const indexes = await Location.collection.getIndexes();
      const newIndex = indexes['text_index_with_enName_pinyin'];
      
      if (newIndex) {
        console.log('✓ 新索引已创建');
        console.log('索引定义:', JSON.stringify(newIndex, null, 2));
        
        if (newIndex.weights) {
          console.log('\n包含的字段:');
          Object.keys(newIndex.weights).forEach(field => {
            console.log(`  ${field}: 权重 ${newIndex.weights[field]}`);
          });
          
          const hasEnName = newIndex.weights.enName;
          const hasPinyin = newIndex.weights.pinyin;
          
          if (hasEnName && hasPinyin) {
            console.log('\n✓ enName 和 pinyin 字段已成功添加到文本索引');
          } else {
            console.log('\n⚠ enName 或 pinyin 字段未正确添加');
          }
        }
      } else {
        console.log('✗ 未找到新创建的索引');
      }
    } catch (error) {
      console.log(`验证索引失败: ${error.message}`);
    }
    
    // 6. 测试文本索引搜索
    console.log('\n【6】测试文本索引搜索');
    console.log('-'.repeat(80));
    
    const testQueries = [
      { term: 'tokyo', description: '搜索 "tokyo"（应该能找到 Tokyo）' },
      { term: 'Tokyo', description: '搜索 "Tokyo"（应该能找到 Tokyo）' },
      { term: 'dongjing', description: '搜索 "dongjing"（应该能找到东京）' },
      { term: '东京', description: '搜索 "东京"（应该能找到东京）' }
    ];
    
    for (const test of testQueries) {
      try {
        const query = {
          $text: { 
            $search: test.term,
            $language: 'none'
          },
          status: 'active'
        };
        
        const results = await Location.find(query)
          .select({ score: { $meta: 'textScore' } })
          .sort({ score: { $meta: 'textScore' }, type: 1, name: 1 })
          .limit(5)
          .lean();
        
        console.log(`${test.description}: ${results.length} 条结果`);
        if (results.length > 0) {
          results.forEach((loc, idx) => {
            console.log(`  [${idx + 1}] ${loc.name} (${loc.enName || 'N/A'}, ${loc.pinyin || 'N/A'}) - score: ${loc.score?.toFixed(2) || 'N/A'}`);
          });
        }
      } catch (error) {
        console.log(`${test.description}: 失败 - ${error.message}`);
      }
    }
    
    console.log('\n【7】总结');
    console.log('='.repeat(80));
    console.log('操作完成！');
    console.log('\n注意事项:');
    console.log('1. 文本索引已更新，包含 enName 和 pinyin 字段');
    console.log('2. 文本索引搜索现在可以匹配英文名称和拼音');
    console.log('3. 索引创建是后台操作，可能需要一些时间才能完全生效');
    console.log('4. 如果搜索仍然失败，可能需要等待索引构建完成');
    console.log('5. 可以使用以下命令检查索引构建状态:');
    console.log('   db.locations.getIndexes()');
    console.log('   db.locations.aggregate([{ $indexStats: {} }])');
    
    console.log('\n✓ 完成');
    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error('\n✗ 错误:', error.message);
    console.error(error.stack);
    await mongoose.connection.close();
    process.exit(1);
  }
}

checkAndUpdateTextIndex();

