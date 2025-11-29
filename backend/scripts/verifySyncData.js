/**
 * 验证同步数据的脚本
 * 检查新字段是否正确保存
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const mongoose = require('mongoose');
const connectDB = require('../config/database');
const Location = require('../models/Location');

async function main() {
  try {
    await connectDB();
    console.log('✓ 数据库连接成功\n');

    // 查询包含新字段的记录
    console.log('='.repeat(60));
    console.log('查询包含新字段的记录:');
    console.log('='.repeat(60));

    // 1. 查询有ctripCityId的记录
    const locationsWithCtripId = await Location.find({ 
      ctripCityId: { $exists: true, $ne: null } 
    }).limit(10);
    
    console.log(`\n1. 包含ctripCityId的记录: ${locationsWithCtripId.length} 条`);
    locationsWithCtripId.slice(0, 5).forEach((loc, i) => {
      console.log(`\n   [${i+1}] ${loc.name} (${loc.type})`);
      console.log(`      ctripCityId: ${loc.ctripCityId}`);
      console.log(`      ctripProvinceId: ${loc.ctripProvinceId || 'N/A'}`);
      console.log(`      corpTag: ${loc.corpTag}`);
      console.log(`      districtCode: ${loc.districtCode || 'N/A'}`);
    });

    // 2. 查询有ctripProvinceId的记录
    const locationsWithProvinceId = await Location.find({ 
      ctripProvinceId: { $exists: true, $ne: null } 
    }).limit(5);
    
    console.log(`\n2. 包含ctripProvinceId的记录: ${locationsWithProvinceId.length} 条`);
    locationsWithProvinceId.slice(0, 3).forEach((loc, i) => {
      console.log(`\n   [${i+1}] ${loc.name} (${loc.type})`);
      console.log(`      ctripProvinceId: ${loc.ctripProvinceId}`);
    });

    // 3. 查询非标城市
    const nonStandardCities = await Location.find({ 
      corpTag: 1, 
      type: 'city' 
    });
    
    console.log(`\n3. 非标城市（corpTag=1）: ${nonStandardCities.length} 条`);

    // 4. 查询标准城市
    const standardCities = await Location.find({ 
      corpTag: 0, 
      type: 'city' 
    }).limit(5);
    
    console.log(`\n4. 标准城市（corpTag=0）: ${standardCities.length} 条（显示前5条）`);

    // 5. 查询有districtCode的记录
    const locationsWithDistrictCode = await Location.find({ 
      districtCode: { $exists: true, $ne: null, $ne: '' } 
    }).limit(5);
    
    console.log(`\n5. 包含districtCode的记录: ${locationsWithDistrictCode.length} 条`);
    locationsWithDistrictCode.slice(0, 3).forEach((loc, i) => {
      console.log(`\n   [${i+1}] ${loc.name} (${loc.type})`);
      console.log(`      districtCode: ${loc.districtCode}`);
    });

    // 6. 统计各类型数据
    console.log('\n' + '='.repeat(60));
    console.log('数据统计:');
    console.log('='.repeat(60));
    
    const totalCount = await Location.countDocuments();
    const withCtripCityId = await Location.countDocuments({ ctripCityId: { $exists: true, $ne: null } });
    const withCtripProvinceId = await Location.countDocuments({ ctripProvinceId: { $exists: true, $ne: null } });
    const withCorpTag = await Location.countDocuments({ corpTag: { $exists: true } });
    const withDistrictCode = await Location.countDocuments({ districtCode: { $exists: true, $ne: null, $ne: '' } });
    
    console.log(`总记录数: ${totalCount}`);
    console.log(`包含ctripCityId: ${withCtripCityId}`);
    console.log(`包含ctripProvinceId: ${withCtripProvinceId}`);
    console.log(`包含corpTag: ${withCorpTag}`);
    console.log(`包含districtCode: ${withDistrictCode}`);

    // 7. 验证数据格式
    console.log('\n' + '='.repeat(60));
    console.log('数据格式验证:');
    console.log('='.repeat(60));
    
    const sampleLocation = await Location.findOne({ ctripCityId: { $exists: true } });
    if (sampleLocation) {
      console.log('\n示例记录:', sampleLocation.name);
      console.log('字段列表:', Object.keys(sampleLocation.toObject()).join(', '));
      
      const requiredFields = ['name', 'type'];
      const newFields = ['ctripCityId', 'ctripProvinceId', 'corpTag', 'districtCode'];
      
      const missingRequired = requiredFields.filter(f => !sampleLocation[f]);
      const missingNew = newFields.filter(f => !(f in sampleLocation.toObject()));
      
      if (missingRequired.length > 0) {
        console.log('❌ 缺少必填字段:', missingRequired.join(', '));
      } else {
        console.log('✓ 必填字段完整');
      }
      
      if (missingNew.length > 0) {
        console.log('⚠️  新字段未设置:', missingNew.join(', '));
      } else {
        console.log('✓ 新字段已添加');
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log('验证完成');
    console.log('='.repeat(60));
    
    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('验证失败:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

