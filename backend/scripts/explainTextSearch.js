/**
 * 解释文本索引搜索逻辑
 * 不改代码，只分析
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const mongoose = require('mongoose');
const connectDB = require('../config/database');
const Location = require('../models/Location');

async function explainTextSearch() {
  try {
    console.log('正在连接数据库...');
    await connectDB();
    console.log('✓ 数据库连接成功\n');

    const searchTerm = 'tokyo';
    
    console.log('='.repeat(80));
    console.log('文本索引搜索逻辑分析');
    console.log('='.repeat(80));
    console.log(`搜索词: "${searchTerm}"\n`);
    
    // 1. 检查文本索引配置
    console.log('【1】文本索引配置');
    console.log('-'.repeat(80));
    
    try {
      const indexes = await Location.collection.getIndexes();
      console.log('所有索引:');
      Object.keys(indexes).forEach(indexName => {
        const index = indexes[indexName];
        console.log(`  ${indexName}:`, JSON.stringify(index, null, 2));
        
        if (indexName.includes('text') || (index.weights && Object.keys(index.weights).length > 0)) {
          console.log(`    ⭐ 这是文本索引`);
          if (index.weights) {
            console.log(`    权重配置:`, index.weights);
          }
        }
      });
    } catch (error) {
      console.log(`检查索引失败: ${error.message}`);
    }
    
    // 2. 分析 buildTextSearchQuery 函数
    console.log('\n【2】buildTextSearchQuery 函数逻辑');
    console.log('-'.repeat(80));
    
    function buildTextSearchQuery(searchTerm) {
      if (!searchTerm || typeof searchTerm !== 'string') {
        return null;
      }
      
      const searchTrimmed = searchTerm.trim();
      if (!searchTrimmed || searchTrimmed.length < 1) {
        return null;
      }
      
      // 处理搜索词：MongoDB $text 搜索会自动分词
      // 对于中文，需要确保搜索词格式正确
      // 对于英文/拼音，可以支持短语搜索（用引号）或单词搜索
      
      // 清理搜索词：移除特殊字符（但保留空格用于短语搜索）
      let processedSearch = searchTrimmed
        .replace(/[^\w\s\u4e00-\u9fa5]/g, ' ') // 移除特殊字符，保留字母、数字、中文、空格
        .replace(/\s+/g, ' ') // 合并多个空格
        .trim();
      
      if (!processedSearch) {
        return null;
      }
      
      // 构建 $text 查询
      // MongoDB 文本索引会自动匹配包含这些词的文档
      // 使用 $language: 'none' 禁用语言特定处理，支持多语言搜索（中文、英文、拼音）
      return {
        $text: { 
          $search: processedSearch,
          $language: 'none' // 禁用语言特定处理，支持多语言
        }
      };
    }
    
    const textSearchQuery = buildTextSearchQuery(searchTerm);
    console.log('输入:', searchTerm);
    console.log('处理后的搜索词:', textSearchQuery?.$text?.$search);
    console.log('生成的查询:', JSON.stringify(textSearchQuery, null, 2));
    
    console.log('\n处理逻辑说明:');
    console.log('  1. 移除特殊字符，保留字母、数字、中文、空格');
    console.log('  2. 合并多个空格');
    console.log('  3. 使用 $text 查询，$language: "none"（禁用语言特定处理）');
    
    // 3. 测试文本索引搜索
    console.log('\n【3】测试文本索引搜索');
    console.log('-'.repeat(80));
    
    if (textSearchQuery && textSearchQuery.$text) {
      const query = {
        ...textSearchQuery,
        status: 'active'
      };
      
      console.log('查询条件:', JSON.stringify(query, null, 2));
      
      try {
        const results = await Location.find(query)
          .select({ score: { $meta: 'textScore' } })
          .sort({ score: { $meta: 'textScore' }, type: 1, name: 1 })
          .limit(10)
          .lean();
        
        console.log(`\n结果数量: ${results.length}`);
        
        if (results.length > 0) {
          console.log('\n找到的结果:');
          results.forEach((loc, idx) => {
            console.log(`  [${idx + 1}] ${loc.name} (${loc.enName}, ${loc.pinyin})`);
            console.log(`      score: ${loc.score}`);
            console.log(`      type: ${loc.type}`);
          });
        } else {
          console.log('\n✗ 文本索引搜索未找到结果');
        }
      } catch (error) {
        console.log(`\n✗ 文本索引搜索失败: ${error.message}`);
        console.log(`  错误堆栈: ${error.stack}`);
      }
    }
    
    // 4. 检查 Tokyo 数据的文本索引字段
    console.log('\n【4】检查 Tokyo 数据的文本索引字段');
    console.log('-'.repeat(80));
    
    const tokyo = await Location.findOne({ enName: 'Tokyo' }).lean();
    if (tokyo) {
      console.log('Tokyo 数据:');
      console.log(`  name: "${tokyo.name}"`);
      console.log(`  enName: "${tokyo.enName}"`);
      console.log(`  pinyin: "${tokyo.pinyin}"`);
      console.log(`  code: "${tokyo.code}"`);
      console.log(`  city: "${tokyo.city}"`);
      console.log(`  country: "${tokyo.country}"`);
      
      // 检查文本索引字段
      const textIndexFields = ['name', 'code', 'city', 'province', 'district', 'county', 'country', 'countryCode', 'enName', 'pinyin'];
      console.log('\n文本索引字段值:');
      textIndexFields.forEach(field => {
        if (tokyo[field]) {
          console.log(`  ${field}: "${tokyo[field]}"`);
        }
      });
      
      // 测试为什么文本索引搜索找不到
      console.log('\n分析为什么文本索引搜索找不到:');
      console.log(`  搜索词: "${searchTerm}"`);
      console.log(`  enName: "${tokyo.enName}"`);
      console.log(`  enName.toLowerCase(): "${(tokyo.enName || '').toLowerCase()}"`);
      console.log(`  是否包含搜索词: ${(tokyo.enName || '').toLowerCase().includes(searchTerm.toLowerCase())}`);
      
      // MongoDB 文本索引的工作原理
      console.log('\nMongoDB 文本索引工作原理:');
      console.log('  1. 文本索引会对文本进行分词（tokenization）');
      console.log('  2. 默认情况下，MongoDB 会使用语言特定的分词器');
      console.log('  3. 使用 $language: "none" 会禁用语言特定处理');
      console.log('  4. 但 "none" 模式仍然会进行基本的分词（按空格、标点等）');
      console.log('  5. 对于 "tokyo" 这样的单个词，应该能匹配到 "Tokyo"');
      console.log('  6. 但如果文本索引配置有问题，可能无法匹配');
    }
    
    // 5. 测试不同的搜索词
    console.log('\n【5】测试不同的搜索词');
    console.log('-'.repeat(80));
    
    const testTerms = ['tokyo', 'Tokyo', 'TOKYO', 'tok', 'dongjing', '东京'];
    
    for (const term of testTerms) {
      const testQuery = buildTextSearchQuery(term);
      if (testQuery && testQuery.$text) {
        const query = {
          ...testQuery,
          status: 'active'
        };
        
        try {
          const results = await Location.find(query)
            .select({ score: { $meta: 'textScore' } })
            .limit(5)
            .lean();
          
          console.log(`搜索 "${term}": ${results.length} 条结果`);
          if (results.length > 0) {
            results.forEach((loc, idx) => {
              console.log(`  [${idx + 1}] ${loc.name} (${loc.enName})`);
            });
          }
        } catch (error) {
          console.log(`搜索 "${term}": 失败 - ${error.message}`);
        }
      }
    }
    
    // 6. 总结
    console.log('\n【6】文本索引搜索逻辑总结');
    console.log('='.repeat(80));
    console.log('文本索引搜索的特点:');
    console.log('  1. 使用 MongoDB 的 $text 查询');
    console.log('  2. 会自动匹配文本索引中包含的所有字段');
    console.log('  3. 支持多词搜索（用空格分隔）');
    console.log('  4. 不区分大小写（默认）');
    console.log('  5. 会进行分词处理');
    console.log('  6. 返回相关性评分（score）');
    console.log('\n为什么 "tokyo" 搜索可能失败:');
    console.log('  1. 文本索引可能没有正确创建');
    console.log('  2. enName 字段可能没有包含在文本索引中');
    console.log('  3. 文本索引的分词器可能有问题');
    console.log('  4. 数据可能没有正确索引');
    console.log('\n降级机制:');
    console.log('  如果文本索引搜索返回 0 条结果，会降级使用正则表达式搜索');
    console.log('  正则表达式搜索会查询 enName 和 pinyin 字段');
    
    console.log('\n✓ 分析完成');
    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error('\n✗ 错误:', error.message);
    console.error(error.stack);
    await mongoose.connection.close();
    process.exit(1);
  }
}

explainTextSearch();



