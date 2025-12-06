/**
 * 检查币种表是否存在
 */

require('dotenv').config();
const mongoose = require('mongoose');
const Currency = require('../models/Currency');
const connectDB = require('../config/database');

async function checkCurrencyTable() {
  try {
    // 连接数据库
    await connectDB();
    console.log('✅ Database connected');

    // 检查集合是否存在
    const db = mongoose.connection.db;
    const collections = await db.listCollections().toArray();
    const collectionNames = collections.map(c => c.name);
    
    console.log('\n📋 Available collections:');
    collectionNames.forEach(name => {
      console.log(`   - ${name}`);
    });

    // 检查 currencies 集合
    const hasCurrenciesCollection = collectionNames.includes('currencies');
    console.log(`\n${hasCurrenciesCollection ? '✅' : '❌'} Currencies collection exists: ${hasCurrenciesCollection}`);

    if (hasCurrenciesCollection) {
      // 检查数据
      const count = await Currency.countDocuments();
      console.log(`\n📊 Currency documents count: ${count}`);
      
      if (count > 0) {
        console.log('\n📝 Existing currencies:');
        const currencies = await Currency.find().limit(10).select('code name exchangeRate isActive');
        currencies.forEach(c => {
          console.log(`   - ${c.code}: ${c.name} (Rate: ${c.exchangeRate}, Active: ${c.isActive})`);
        });
        if (count > 10) {
          console.log(`   ... and ${count - 10} more`);
        }
      } else {
        console.log('\n⚠️  Collection exists but is empty. Run initCurrencies.js to populate data.');
      }
    } else {
      console.log('\n⚠️  Currencies collection does not exist.');
      console.log('   MongoDB will create it automatically when you insert the first document.');
      console.log('   Run: node backend/scripts/initCurrencies.js');
    }

    // 测试模型
    console.log('\n🧪 Testing Currency model...');
    try {
      const testQuery = await Currency.findOne();
      console.log('✅ Currency model is working correctly');
    } catch (error) {
      console.log('❌ Currency model error:', error.message);
    }

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

checkCurrencyTable();

