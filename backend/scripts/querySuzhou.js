/**
 * 查询苏州数据
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const mongoose = require('mongoose');
const connectDB = require('../config/database');
const Location = require('../models/Location');

async function main() {
  try {
    await connectDB();
    console.log('✓ 数据库连接成功\n');

    // 查询苏州数据
    console.log('='.repeat(80));
    console.log('查询苏州数据:');
    console.log('='.repeat(80));

    // 查询所有包含"苏州"的记录
    const suzhouLocations = await Location.find({
      $or: [
        { name: /苏州/i },
        { city: /苏州/i },
        { province: /苏州/i }
      ]
    }).lean();

    console.log(`\n找到 ${suzhouLocations.length} 条相关记录\n`);

    // 按类型分组显示
    const byType = {};
    suzhouLocations.forEach(loc => {
      const type = loc.type || 'unknown';
      if (!byType[type]) {
        byType[type] = [];
      }
      byType[type].push(loc);
    });

    // 显示城市类型的数据（重点）
    if (byType.city && byType.city.length > 0) {
      console.log('\n' + '='.repeat(80));
      console.log(`城市类型 (${byType.city.length} 条):`);
      console.log('='.repeat(80));
      
      byType.city.forEach((loc, i) => {
        console.log(`\n[${i + 1}] ${loc.name}`);
        console.log(`   ID: ${loc._id}`);
        console.log(`   类型: ${loc.type}`);
        console.log(`   代码: ${loc.code || '(空)'}`);
        console.log(`   城市: ${loc.city || '(空)'}`);
        console.log(`   省份: ${loc.province || '(空)'}`);
        console.log(`   区: ${loc.district || '(空)'}`);
        console.log(`   县: ${loc.county || '(空)'}`);
        console.log(`   国家: ${loc.country || '(空)'}`);
        console.log(`   国家代码: ${loc.countryCode || '(空)'}`);
        console.log(`   英文名: ${loc.enName || '(空)'}`);
        console.log(`   拼音: ${loc.pinyin || '(空)'}`);
        console.log(`   行政区划代码: ${loc.districtCode || '(空)'}`);
        console.log(`   城市等级: ${loc.cityLevel || '(空)'}`);
        console.log(`   携程城市ID: ${loc.ctripCityId || '(空)'}`);
        console.log(`   携程省份ID: ${loc.ctripProvinceId || '(空)'}`);
        console.log(`   携程县级市ID: ${loc.ctripCountyId || '(空)'}`);
        console.log(`   非标城市标识: ${loc.corpTag || 0}`);
        console.log(`   备注: ${loc.remark || '(空)'}`);
        console.log(`   状态: ${loc.status || '(空)'}`);
        console.log(`   父级ID: ${loc.parentId || '(空)'}`);
      });
    }

    // 显示其他类型的数据
    Object.keys(byType).forEach(type => {
      if (type !== 'city') {
        console.log(`\n${type} 类型 (${byType[type].length} 条):`);
        byType[type].slice(0, 5).forEach((loc, i) => {
          console.log(`  [${i + 1}] ${loc.name} (${loc.type}) - 城市: ${loc.city || '(空)'}`);
        });
        if (byType[type].length > 5) {
          console.log(`  ... 还有 ${byType[type].length - 5} 条记录`);
        }
      }
    });

    // 特别查询：名称为"苏州"的城市
    console.log('\n' + '='.repeat(80));
    console.log('名称为"苏州"的城市记录:');
    console.log('='.repeat(80));
    const suzhouCity = await Location.findOne({
      name: '苏州',
      type: 'city'
    }).lean();

    if (suzhouCity) {
      console.log('\n找到苏州城市记录:');
      console.log(JSON.stringify(suzhouCity, null, 2));
    } else {
      console.log('\n未找到名称为"苏州"的城市记录');
    }

    await mongoose.connection.close();
    console.log('\n✓ 查询完成');
  } catch (error) {
    console.error('❌ 查询失败:', error);
    process.exit(1);
  }
}

main();

