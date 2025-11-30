/**
 * 查询携程API返回的完整数据
 * 用于调试和查看API原始返回
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const ctripApiService = require('../services/ctripApiService');
const mongoose = require('mongoose');
const Location = require('../models/Location');

async function queryCtripData() {
  try {
    // 连接数据库
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✓ 数据库连接成功\n');

    // 查找目标记录
    const location = await Location.findOne({ name: 'A Reguenga', code: '480326' }).lean();
    if (!location) {
      console.error('❌ 未找到该记录');
      await mongoose.connection.close();
      return;
    }

    console.log('📋 数据库中的记录信息:');
    console.log(`   名称: ${location.name}`);
    console.log(`   代码: ${location.code}`);
    console.log(`   类型: ${location.type}`);
    console.log(`   国家: ${location.country} (${location.countryCode})`);
    console.log(`   省份: ${location.province}`);
    console.log(`   城市: ${location.city}`);
    console.log(`   县: ${location.county}`);
    console.log(`   携程省份ID: ${location.ctripProvinceId}`);
    console.log(`   携程城市ID: ${location.ctripCityId}`);
    console.log(`   携程县ID: ${location.ctripCountyId}`);
    console.log('');

    // 查找西班牙的国家ID（从携程API）
    console.log('🔍 查询西班牙的国家信息...');
    const countries = await ctripApiService.getAllCountries('zh-CN');
    
    // 查找西班牙（字段名是 name, enName, code）
    const spain = countries.find(c => 
      c.name === '西班牙' || 
      c.enName === 'Spain' || 
      c.code === 'ES'
    );
    
    if (!spain) {
      console.error('❌ 未找到西班牙的国家信息');
      console.log(`   总共有 ${countries.length} 个国家`);
      await mongoose.connection.close();
      return;
    }

    console.log(`✓ 找到西班牙: ID=${spain.countryId}, 名称=${spain.name}, 英文=${spain.enName}, 代码=${spain.code}`);
    console.log('');

    // 调用携程API获取POI数据
    console.log('🔍 调用携程API获取POI数据...');
    console.log(`   国家ID: ${spain.countryId}`);
    console.log(`   省份ID: ${location.ctripProvinceId || '未指定'}`);
    console.log(`   城市ID: ${location.ctripCityId || '未指定'}`);
    console.log('');

    const poiData = await ctripApiService.getAllPOIInfo({
      countryId: spain.countryId,
      provinceIds: location.ctripProvinceId ? location.ctripProvinceId.toString() : '',
      returnDistrict: true,
      returnCounty: true,
      returnAirport: true,
      returnTrainStation: true,
      returnBusStation: true,
    });

    console.log('✓ API调用成功\n');
    console.log('📦 完整API返回数据:');
    console.log('='.repeat(80));

    // 查找目标县的数据
    let foundCounty = null;
    let foundProvince = null;
    let foundCity = null;

    if (poiData.dataList && Array.isArray(poiData.dataList)) {
      for (const province of poiData.dataList) {
        if (province.provinceId === location.ctripProvinceId) {
          foundProvince = province;
          
          if (province.prefectureLevelCityInfoList) {
            for (const city of province.prefectureLevelCityInfoList) {
              if (city.cityId === location.ctripCityId) {
                foundCity = city;
                
                if (city.countyList) {
                  for (const county of city.countyList) {
                    if (county.countyId === location.ctripCountyId) {
                      foundCounty = county;
                      break;
                    }
                  }
                }
                break;
              }
            }
          }
          break;
        }
      }
    }

    // 输出找到的目标数据（优先显示）
    if (foundCounty) {
      console.log('📋 找到的县数据 (A Reguenga) - 完整返回:');
      console.log(JSON.stringify(foundCounty, null, 2));
      console.log('');
    } else {
      console.log('⚠️  未在API返回中找到目标县数据');
      console.log('   可能原因：');
      console.log('   1. 该县不在返回的省份/城市列表中');
      console.log('   2. API返回的数据结构有变化');
      console.log('   3. 需要更精确的查询条件');
      console.log('');
    }

    if (foundCity) {
      console.log('📋 找到的城市数据 (卢戈省) - 完整返回:');
      console.log(JSON.stringify(foundCity, null, 2));
      console.log('');
    }

    if (foundProvince) {
      console.log('📋 找到的省份数据 (加利西亚自治区) - 完整返回:');
      console.log(JSON.stringify(foundProvince, null, 2));
      console.log('');
    }

    // 输出完整API返回（保存到文件）
    const fs = require('fs');
    const path = require('path');
    const outputFile = path.join(__dirname, '../logs/ctrip-api-response-areguenga.json');
    fs.writeFileSync(outputFile, JSON.stringify(poiData, null, 2), 'utf8');
    console.log(`💾 完整API返回已保存到: ${outputFile}`);
    console.log('');
    
    // 也输出到控制台（但可能很长）
    console.log('📦 完整API返回数据（前1000行）:');
    console.log('='.repeat(80));
    const jsonStr = JSON.stringify(poiData, null, 2);
    const lines = jsonStr.split('\n');
    lines.slice(0, 1000).forEach(line => console.log(line));
    if (lines.length > 1000) {
      console.log(`\n... (还有 ${lines.length - 1000} 行，完整数据已保存到文件) ...`);
    }
    console.log('='.repeat(80));
    console.log('');

    await mongoose.connection.close();
    console.log('\n✓ 查询完成');
  } catch (error) {
    console.error('\n❌ 错误:', error.message);
    console.error(error.stack);
    await mongoose.connection.close();
    process.exit(1);
  }
}

// 执行查询
queryCtripData();

