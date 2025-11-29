/**
 * 为现有地理位置数据创建国家类型记录
 * 此脚本会扫描数据库中的所有位置数据，提取不同的国家，然后为每个国家创建一个type='country'的记录
 */

require('dotenv').config();
const mongoose = require('mongoose');
const Location = require('../models/Location');

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI || 'mongodb+srv://liuzhijiansun:BE12mjA8imCd4vBp@cluster0.tzxphum.mongodb.net/travel-expense-system?retryWrites=true&w=majority');
    console.log(`✓ MongoDB连接成功: ${conn.connection.host}`);
  } catch (error) {
    console.error('❌ 数据库连接失败:', error.message);
    process.exit(1);
  }
};

async function createCountryRecords() {
  try {
    console.log('\n开始创建国家类型记录...\n');

    // 获取所有不同的国家
    const countries = await Location.distinct('country', {
      country: { $exists: true, $ne: null, $ne: '' }
    });

    console.log(`找到 ${countries.length} 个不同的国家:`);
    countries.forEach((country, index) => {
      console.log(`  ${index + 1}. ${country}`);
    });

    let created = 0;
    let updated = 0;
    let skipped = 0;

    // 为每个国家创建或更新记录
    for (const countryName of countries) {
      try {
        // 获取该国家的示例记录，用于提取国家码等信息
        const sampleLocation = await Location.findOne({
          country: countryName,
          countryCode: { $exists: true, $ne: null, $ne: '' }
        });

        const countryCode = sampleLocation?.countryCode || '';
        
        // 检查是否已存在该国家的记录
        const existingCountry = await Location.findOne({
          type: 'country',
          country: countryName
        });

        const countryData = {
          name: countryName,
          code: countryCode || countryName.substring(0, 2).toUpperCase(),
          type: 'country',
          country: countryName,
          countryCode: countryCode,
          status: 'active',
          coordinates: { latitude: 0, longitude: 0 },
          timezone: countryCode === 'CN' ? 'Asia/Shanghai' : 'UTC',
        };

        if (existingCountry) {
          // 更新现有记录
          Object.keys(countryData).forEach(key => {
            if (countryData[key] !== undefined && countryData[key] !== null) {
              existingCountry[key] = countryData[key];
            }
          });
          await existingCountry.save();
          updated++;
          console.log(`  ✓ 更新: ${countryName} (${countryCode})`);
        } else {
          // 创建新记录
          await Location.create(countryData);
          created++;
          console.log(`  ✓ 创建: ${countryName} (${countryCode})`);
        }
      } catch (error) {
        console.error(`  ✗ 处理失败 [${countryName}]:`, error.message);
        skipped++;
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log('完成！统计信息:');
    console.log(`  创建: ${created} 条`);
    console.log(`  更新: ${updated} 条`);
    console.log(`  跳过: ${skipped} 条`);
    console.log('='.repeat(60) + '\n');

  } catch (error) {
    console.error('\n❌ 创建国家记录失败:', error);
    throw error;
  }
}

async function main() {
  await connectDB();
  await createCountryRecords();
  await mongoose.connection.close();
  console.log('数据库连接已关闭');
  process.exit(0);
}

// 运行脚本
if (require.main === module) {
  main().catch((error) => {
    console.error('脚本执行失败:', error);
    process.exit(1);
  });
}

module.exports = { createCountryRecords };

