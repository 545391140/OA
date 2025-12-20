/**
 * 测试北京-上海航班搜索
 * 日期：2025-12-28
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const amadeusApi = require('../services/amadeus');

async function testBeijingShanghaiFlight() {
  console.log('\n' + '='.repeat(70));
  console.log('🔍 测试：北京 → 上海 航班搜索');
  console.log('📅 日期：2025-12-28');
  console.log('='.repeat(70) + '\n');

  try {
    // 搜索参数
    const searchParams = {
      originLocationCode: 'PEK',        // 北京首都国际机场
      destinationLocationCode: 'SHA',  // 上海虹桥机场（也可以使用PVG浦东）
      departureDate: '2025-12-28',
      adults: 1,
      travelClass: 'ECONOMY',
      max: 10,  // 获取最多10个结果
      currencyCode: 'CNY'  // 使用人民币
    };

    console.log('📋 搜索参数：');
    console.log(JSON.stringify(searchParams, null, 2));
    console.log('\n⏳ 正在搜索航班...\n');

    // 执行搜索
    const result = await amadeusApi.searchFlightOffers(searchParams);

    if (result.success && result.data && result.data.length > 0) {
      console.log(`✅ 搜索成功！找到 ${result.data.length} 个航班\n`);
      console.log('='.repeat(70));
      console.log('📊 航班查询结果');
      console.log('='.repeat(70) + '\n');

      // 展示每个航班的详细信息
      result.data.forEach((flight, index) => {
        console.log(`\n【航班 ${index + 1}】`);
        console.log('-'.repeat(70));
        
        // 基本信息
        console.log(`📌 航班ID: ${flight.id}`);
        console.log(`💰 价格: ${flight.price?.total} ${flight.price?.currency}`);
        if (flight.price?.base) {
          console.log(`   └─ 基础价格: ${flight.price.base} ${flight.price.currency}`);
        }
        if (flight.numberOfBookableSeats) {
          console.log(`💺 可预订座位: ${flight.numberOfBookableSeats}`);
        }
        
        // 行程信息
        if (flight.itineraries && flight.itineraries.length > 0) {
          flight.itineraries.forEach((itinerary, idx) => {
            const direction = idx === 0 ? '去程' : '返程';
            console.log(`\n✈️  ${direction}:`);
            console.log(`   总时长: ${itinerary.duration}`);
            
            if (itinerary.segments && itinerary.segments.length > 0) {
              itinerary.segments.forEach((segment, segIdx) => {
                console.log(`\n   航段 ${segIdx + 1}:`);
                console.log(`   出发: ${segment.departure?.iataCode} (${segment.departure?.at})`);
                if (segment.departure?.terminal) {
                  console.log(`   航站楼: ${segment.departure.terminal}`);
                }
                console.log(`   到达: ${segment.arrival?.iataCode} (${segment.arrival?.at})`);
                if (segment.arrival?.terminal) {
                  console.log(`   航站楼: ${segment.arrival.terminal}`);
                }
                console.log(`   航班号: ${segment.carrierCode} ${segment.number}`);
                console.log(`   飞行时长: ${segment.duration}`);
                if (segment.aircraft?.code) {
                  console.log(`   机型: ${segment.aircraft.code}`);
                }
              });
            }
          });
        }
        
        // 其他信息
        if (flight.validatingAirlineCodes && flight.validatingAirlineCodes.length > 0) {
          console.log(`\n🏢 验证航空公司: ${flight.validatingAirlineCodes.join(', ')}`);
        }
        
        if (flight.lastTicketingDate) {
          console.log(`📅 最后出票日期: ${flight.lastTicketingDate}`);
        }
        
        console.log('-'.repeat(70));
      });

      // 价格统计
      console.log('\n' + '='.repeat(70));
      console.log('💰 价格统计');
      console.log('='.repeat(70));
      
      const prices = result.data.map(f => parseFloat(f.price?.total || 0));
      const minPrice = Math.min(...prices);
      const maxPrice = Math.max(...prices);
      const avgPrice = prices.reduce((a, b) => a + b, 0) / prices.length;
      
      console.log(`最低价格: ${minPrice} CNY`);
      console.log(`最高价格: ${maxPrice} CNY`);
      console.log(`平均价格: ${avgPrice.toFixed(2)} CNY`);
      
      // 航空公司统计
      const airlines = new Set();
      result.data.forEach(flight => {
        flight.itineraries?.forEach(itinerary => {
          itinerary.segments?.forEach(segment => {
            if (segment.carrierCode) {
              airlines.add(segment.carrierCode);
            }
          });
        });
      });
      
      console.log(`\n航空公司数量: ${airlines.size}`);
      console.log(`航空公司代码: ${Array.from(airlines).join(', ')}`);

      // 保存结果到JSON文件
      const fs = require('fs');
      const path = require('path');
      const outputPath = path.resolve(__dirname, '../logs/beijing-shanghai-flight-results.json');
      fs.writeFileSync(outputPath, JSON.stringify({
        searchParams,
        timestamp: new Date().toISOString(),
        resultCount: result.data.length,
        results: result.data,
        statistics: {
          minPrice,
          maxPrice,
          avgPrice,
          airlines: Array.from(airlines)
        }
      }, null, 2));
      
      console.log(`\n💾 完整结果已保存到: ${outputPath}`);

    } else {
      console.log('❌ 未找到符合条件的航班');
      if (result.meta) {
        console.log('Meta信息:', JSON.stringify(result.meta, null, 2));
      }
    }

    console.log('\n' + '='.repeat(70));
    console.log('✅ 测试完成');
    console.log('='.repeat(70) + '\n');

  } catch (error) {
    console.error('\n❌ 测试失败:', error.message);
    if (error.response) {
      console.error('API响应:', JSON.stringify(error.response.data, null, 2));
    }
    console.error('\n');
    process.exit(1);
  }
}

// 运行测试
testBeijingShanghaiFlight().catch(error => {
  console.error('❌ 执行失败:', error);
  process.exit(1);
});

