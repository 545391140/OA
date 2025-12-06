/**
 * 初始化币种数据脚本
 * 在数据库中创建默认币种
 */

require('dotenv').config();
const mongoose = require('mongoose');
const Currency = require('../models/Currency');
const connectDB = require('../config/database');

const defaultCurrencies = [
  {
    code: 'CNY',
    name: '人民币',
    nameEn: 'Chinese Yuan',
    symbol: '¥',
    exchangeRate: 1.0,
    isActive: true,
    isDefault: true,
    decimalPlaces: 2,
    displayOrder: 1
  },
  {
    code: 'USD',
    name: '美元',
    nameEn: 'US Dollar',
    symbol: '$',
    exchangeRate: 0.14, // 1 CNY = 0.14 USD (约7.14 CNY = 1 USD)
    isActive: true,
    isDefault: false,
    decimalPlaces: 2,
    displayOrder: 2
  },
  {
    code: 'EUR',
    name: '欧元',
    nameEn: 'Euro',
    symbol: '€',
    exchangeRate: 0.13, // 1 CNY = 0.13 EUR (约7.69 CNY = 1 EUR)
    isActive: true,
    isDefault: false,
    decimalPlaces: 2,
    displayOrder: 3
  },
  {
    code: 'GBP',
    name: '英镑',
    nameEn: 'British Pound',
    symbol: '£',
    exchangeRate: 0.11, // 1 CNY = 0.11 GBP (约9.09 CNY = 1 GBP)
    isActive: true,
    isDefault: false,
    decimalPlaces: 2,
    displayOrder: 4
  },
  {
    code: 'JPY',
    name: '日元',
    nameEn: 'Japanese Yen',
    symbol: '¥',
    exchangeRate: 20.0, // 1 CNY = 20 JPY (约0.05 CNY = 1 JPY)
    isActive: true,
    isDefault: false,
    decimalPlaces: 0,
    displayOrder: 5
  },
  {
    code: 'KRW',
    name: '韩元',
    nameEn: 'South Korean Won',
    symbol: '₩',
    exchangeRate: 180.0, // 1 CNY = 180 KRW (约0.0056 CNY = 1 KRW)
    isActive: true,
    isDefault: false,
    decimalPlaces: 0,
    displayOrder: 6
  }
];

async function initCurrencies() {
  try {
    // 连接数据库
    await connectDB();
    console.log('✅ Database connected');

    // 检查是否已有币种数据
    const existingCount = await Currency.countDocuments();
    if (existingCount > 0) {
      console.log(`⚠️  Found ${existingCount} existing currencies. Skipping initialization.`);
      console.log('   If you want to reinitialize, please delete existing currencies first.');
      process.exit(0);
    }

    // 创建币种
    console.log('📝 Creating default currencies...');
    const created = await Currency.insertMany(defaultCurrencies);
    console.log(`✅ Successfully created ${created.length} currencies:`);
    
    created.forEach(currency => {
      console.log(`   - ${currency.code}: ${currency.name} (${currency.nameEn}) - Rate: ${currency.exchangeRate}`);
    });

    console.log('\n✅ Currency initialization completed!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error initializing currencies:', error);
    process.exit(1);
  }
}

// 运行脚本
initCurrencies();

