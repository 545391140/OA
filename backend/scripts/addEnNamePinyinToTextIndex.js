/**
 * 将 enName 和 pinyin 添加到文本索引
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const mongoose = require('mongoose');
const connectDB = require('../config/database');
const Location = require('../models/Location');

async function addEnNamePinyinToTextIndex() {
  try {
    console.log('正在连接数据库...');
    await connectDB();
    console.log('✓ 数据库连接成功\n');

    console.log('='.repeat(80));
    console.log('添加 enName 和 pinyin 到文本索引');
    console.log('='.repeat(80));
    
    // 1. 检查当前文本索引
    console.log('\n【1】检查当前文本索引');
    console.log('-'.repeat(80));
    
    const indexes = await Location.collection.getIndexes();
    let oldTextIndexName = null;
    
    Object.keys(indexes).forEach(indexName => {
      const index = indexes[indexName];
      if (indexName.includes('text') || (index._fts && index._fts === 'text')) {
        console.log(`找到文本索引: ${indexName}`);
        oldTextIndexName = indexName;
      }
    });
    
    if (!oldTextIndexName) {
      console.log('⚠ 未找到旧的文本索引');
    }
    
    // 2. 删除旧的文本索引
    if (oldTextIndexName) {
      console.log(`\n【2】删除旧的文本索引: ${oldTextIndexName}`);
      console.log('-'.repeat(80));
      
      try {
        await Location.collection.dropIndex(oldTextIndexName);
        console.log(`✓ 成功删除旧索引: ${oldTextIndexName}`);
      } catch (error) {
        if (error.code === 27 || error.message.includes('index not found')) {
          console.log(`索引 ${oldTextIndexName} 不存在，跳过删除`);
        } else {
          console.log(`✗ 删除索引失败: ${error.message}`);
          throw error;
        }
      }
    }
    
    // 3. 创建新的文本索引（包含 enName 和 pinyin）
    console.log('\n【3】创建新的文本索引（包含 enName 和 pinyin）');
    console.log('-'.repeat(80));
    
    const newTextIndexDefinition = {
      name: 'text',
      code: 'text',
      city: 'text',
      province: 'text',
      district: 'text',
      county: 'text',
      country: 'text',
      countryCode: 'text',
      enName: 'text',   // 新增：英文名称
      pinyin: 'text'   // 新增：拼音
    };
    
    console.log('新的文本索引定义:');
    console.log(JSON.stringify(newTextIndexDefinition, null, 2));
    console.log('\n包含的字段: name, code, city, province, district, county, country, countryCode, enName, pinyin');
    
    try {
      console.log('\n正在创建索引（后台构建，可能需要一些时间）...');
      
      await Location.collection.createIndex(newTextIndexDefinition, {
        name: 'text_index_with_enName_pinyin',
        background: true, // 后台创建，不阻塞其他操作
        weights: {
          name: 10,        // 中文名称权重最高
          enName: 8,       // 英文名称权重较高
          pinyin: 8,       // 拼音权重较高
          code: 5,         // 代码权重中等
          city: 3,         // 城市权重较低
          province: 2,     // 省份权重较低
          district: 1,     // 区县权重最低
          county: 1,       // 县权重最低
          country: 1,      // 国家权重最低
          countryCode: 1   // 国家代码权重最低
        }
      });
      
      console.log('✓ 文本索引创建成功！');
      console.log('  索引名称: text_index_with_enName_pinyin');
      console.log('  注意: 索引正在后台构建，可能需要一些时间才能完全生效');
    } catch (error) {
      if (error.code === 85 || error.message.includes('already exists')) {
        console.log('⚠ 索引已存在，尝试删除后重新创建...');
        try {
          await Location.collection.dropIndex('text_index_with_enName_pinyin');
          await Location.collection.createIndex(newTextIndexDefinition, {
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
          console.log('✓ 索引重新创建成功！');
        } catch (retryError) {
          console.log(`✗ 重新创建失败: ${retryError.message}`);
          throw retryError;
        }
      } else {
        console.log(`✗ 创建索引失败: ${error.message}`);
        throw error;
      }
    }
    
    // 4. 验证新索引
    console.log('\n【4】验证新索引');
    console.log('-'.repeat(80));
    
    const updatedIndexes = await Location.collection.getIndexes();
    const newIndex = updatedIndexes['text_index_with_enName_pinyin'];
    
    if (newIndex) {
      console.log('✓ 新索引已创建');
      console.log('索引定义:', JSON.stringify(newIndex, null, 2));
    } else {
      console.log('⚠ 未找到新创建的索引（可能还在构建中）');
    }
    
    // 5. 测试文本索引搜索
    console.log('\n【5】测试文本索引搜索');
    console.log('-'.repeat(80));
    
    const testQueries = [
      { term: 'tokyo', description: '搜索 "tokyo"（应该能找到 Tokyo）' },
      { term: 'Tokyo', description: '搜索 "Tokyo"（应该能找到 Tokyo）' },
      { term: 'dongjing', description: '搜索 "dongjing"（应该能找到东京）' },
      { term: '东京', description: '搜索 "东京"（应该能找到东京）' }
    ];
    
    console.log('注意: 如果索引还在构建中，测试可能暂时失败');
    console.log('等待几秒后重新运行测试脚本即可\n');
    
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
        
        if (results.length > 0) {
          console.log(`✓ ${test.description}: ${results.length} 条结果`);
          results.forEach((loc, idx) => {
            console.log(`    [${idx + 1}] ${loc.name} (${loc.enName || 'N/A'}, ${loc.pinyin || 'N/A'})`);
          });
        } else {
          console.log(`⚠ ${test.description}: 0 条结果（索引可能还在构建中）`);
        }
      } catch (error) {
        console.log(`✗ ${test.description}: 失败 - ${error.message}`);
      }
    }
    
    // 6. 总结
    console.log('\n【6】完成总结');
    console.log('='.repeat(80));
    console.log('✓ 操作完成！');
    console.log('\n新文本索引已创建，包含以下字段:');
    console.log('  - name (权重: 10)');
    console.log('  - enName (权重: 8) ⭐ 新增');
    console.log('  - pinyin (权重: 8) ⭐ 新增');
    console.log('  - code (权重: 5)');
    console.log('  - city (权重: 3)');
    console.log('  - province (权重: 2)');
    console.log('  - district (权重: 1)');
    console.log('  - county (权重: 1)');
    console.log('  - country (权重: 1)');
    console.log('  - countryCode (权重: 1)');
    console.log('\n注意事项:');
    console.log('1. 索引正在后台构建，可能需要几分钟到几十分钟（取决于数据量）');
    console.log('2. 构建期间可以正常使用数据库，但搜索可能暂时不包含新字段');
    console.log('3. 可以使用以下命令检查索引构建状态:');
    console.log('   db.locations.aggregate([{ $indexStats: {} }])');
    console.log('4. 构建完成后，搜索 "tokyo" 和 "dongjing" 应该能正常工作');
    
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

addEnNamePinyinToTextIndex();


