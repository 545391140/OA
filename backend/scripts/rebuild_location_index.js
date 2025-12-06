const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const Location = require('../models/Location');

// 连接数据库
async function connectDB() {
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/travel-expense-system';
    console.log(`🔌 Connecting to ${mongoUri}...`);
    await mongoose.connect(mongoUri);
    console.log('📦 MongoDB Connected');
  } catch (error) {
    console.error('❌ Database connection error:', error);
    process.exit(1);
  }
}

async function manageIndexes() {
  await connectDB();

  try {
    console.log('🔍 检查现有索引...');
    const indexes = await Location.collection.getIndexes();
    console.log('现有索引列表:');
    console.log(JSON.stringify(indexes, null, 2));

    // 检查是否存在文本索引
    const textIndexName = Object.keys(indexes).find(name => {
      const indexDef = indexes[name];
      // indexDef 是一个数组，每个元素也是数组 [field, type]
      // 例如: [["_fts", "text"], ["_ftsx", 1]]
      return indexDef.some(fieldDef => fieldDef[1] === 'text');
    });
    
    // 检查是否有名为 "TextSearchIndex" 的索引
    const targetIndexExists = indexes['TextSearchIndex'];

    console.log(`\n📋 文本索引状态: ${textIndexName ? '存在 (' + textIndexName + ')' : '不存在'}`);

    // 如果需要重建或优化
    console.log('\n🛠️  开始重建优化后的文本索引...');

    // 1. 如果存在旧的文本索引，先删除
    if (textIndexName) {
      console.log(`🗑️  删除旧文本索引: ${textIndexName}`);
      await Location.collection.dropIndex(textIndexName);
    }
    if (targetIndexExists && textIndexName !== 'TextSearchIndex') {
       console.log(`🗑️  删除旧目标索引: TextSearchIndex`);
       await Location.collection.dropIndex('TextSearchIndex');
    }

    // 2. 创建新的优化文本索引
    console.log('✨ 创建新索引 TextSearchIndex...');
    // 权重配置：中文名、英文名、拼音、代码 权重最高 (10)
    // 城市名次之 (5)
    // 其他 (1)
    await Location.collection.createIndex(
      {
        name: "text",
        enName: "text",
        pinyin: "text",
        code: "text",
        city: "text",
        country: "text"
      },
      {
        name: "TextSearchIndex",
        weights: {
          name: 10,
          enName: 10,
          pinyin: 10,
          code: 10,
          city: 5,
          country: 1
        },
        default_language: "none" // 关键：禁用语言停用词，对拼音/中文更友好
      }
    );

    console.log('✅ 索引重建完成！');
    
    // 验证新索引
    const newIndexes = await Location.collection.getIndexes();
    console.log('新索引列表 (TextSearchIndex):');
    console.log(JSON.stringify(newIndexes['TextSearchIndex'], null, 2));

  } catch (error) {
    console.error('❌ Index management failed:', error);
  } finally {
    await mongoose.connection.close();
    console.log('👋 Database connection closed');
    process.exit(0);
  }
}

manageIndexes();

