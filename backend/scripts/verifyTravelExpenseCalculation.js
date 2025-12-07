const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

// 加载环境变量
dotenv.config({ path: path.join(__dirname, '../.env') });

// 连接数据库
const connectDB = async () => {
  try {
    const config = require('../config');
    const mongoUri = process.env.MONGODB_URI || config.MONGODB_URI;
    
    if (!mongoUri) {
      throw new Error('MONGODB_URI not found in environment variables or config');
    }
    
    const conn = await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 30000,
      connectTimeoutMS: 30000,
    });
    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`❌ Database connection error: ${error.message}`);
    process.exit(1);
  }
};

// 验证费用计算
const verifyExpenseCalculation = async () => {
  await connectDB();

  try {
    // 加载所有必要的模型
    require('../models/ExpenseItem');
    const TravelStandard = require('../models/TravelStandard');
    const { convertFromCNYSync } = require('../utils/currencyConverter');
    
    console.log('\n' + '='.repeat(80));
    console.log('验证差旅费用计算');
    console.log('='.repeat(80) + '\n');

    // 从截图获取的行程信息
    const routes = [
      { type: 'outbound', date: '2025-12-06', departure: '北京, 中国', destination: '纽约, 美国' },
      { type: 'inbound', date: '2025-12-11', departure: '纽约, 美国', destination: '北京, 中国' },
      { type: 'multiCity', index: 0, date: '2025-12-12', departure: '北京, 中国', destination: '上海, 中国' },
      { type: 'multiCity', index: 1, date: '2025-12-12', departure: '上海, 中国', destination: '北京, 中国' },
      { type: 'multiCity', index: 2, date: '2025-12-13', departure: '北京, 中国', destination: '迪拜, 阿联酋' }
    ];

    // 从截图获取的费用显示
    const displayedCosts = {
      outbound: 850.00,      // US$
      inbound: 2069.00,      // US$
      multiCity: 519.00,     // US$ (3程)
      transportation: 1908.00,  // US$
      accommodation: 720.00,     // US$
      allowance: 540.00,        // US$
      phone: 90.00,             // US$
      laundry: 90.00,           // US$
      visa: 90.00,              // US$
      total: 3438.00            // US$
    };

    console.log('📋 行程信息：');
    routes.forEach((route, idx) => {
      console.log(`  ${idx + 1}. ${route.type === 'outbound' ? '去程' : route.type === 'inbound' ? '返程' : `第${route.index + 1}程`}: ${route.departure} → ${route.destination} (${route.date})`);
    });

    // 查询差旅标准
    const standard = await TravelStandard.findOne({ 
      standardCode: 'I001',
      status: 'active'
    }).populate('expenseStandards.expenseItemId');

    if (!standard) {
      console.error('❌ 未找到标准 I001');
      return;
    }

    console.log(`\n📊 差旅标准: ${standard.standardName} (${standard.standardCode})\n`);

    // 计算天数
    const calculateDays = (routes) => {
      const sortedRoutes = [...routes].sort((a, b) => {
        return new Date(a.date) - new Date(b.date);
      });
      
      const dateGroups = {};
      sortedRoutes.forEach(route => {
        const dateKey = route.date;
        if (!dateGroups[dateKey]) {
          dateGroups[dateKey] = [];
        }
        dateGroups[dateKey].push(route);
      });

      const sortedDates = Object.keys(dateGroups).sort();
      const dateGroupQuantities = {};
      
      sortedDates.forEach((dateKey, idx) => {
        if (idx === sortedDates.length - 1) {
          // 最后一天：1天
          dateGroupQuantities[dateKey] = 1;
        } else {
          // 其他天：计算到下一组日期的间隔
          const currentDate = new Date(dateKey);
          const nextDate = new Date(sortedDates[idx + 1]);
          const days = Math.max(1, Math.ceil((nextDate - currentDate) / (1000 * 60 * 60 * 24)));
          dateGroupQuantities[dateKey] = days;
        }
      });

      return { dateGroups, dateGroupQuantities, sortedDates };
    };

    const { dateGroups, dateGroupQuantities, sortedDates } = calculateDays(routes);

    console.log('📅 日期分组和天数计算：');
    sortedDates.forEach(dateKey => {
      const routesInDate = dateGroups[dateKey];
      const days = dateGroupQuantities[dateKey];
      console.log(`  ${dateKey}: ${days}天 (${routesInDate.length}个行程)`);
    });

    // 计算每个行程的天数
    const routeDays = {
      outbound: dateGroupQuantities['2025-12-06'] || 1,
      inbound: dateGroupQuantities['2025-12-11'] || 1,
      multiCity0: dateGroupQuantities['2025-12-12'] || 1,
      multiCity1: dateGroupQuantities['2025-12-12'] || 1,  // 同一天，使用相同天数
      multiCity2: dateGroupQuantities['2025-12-13'] || 1
    };

    console.log('\n📐 各行程天数：');
    console.log(`  去程: ${routeDays.outbound}天`);
    console.log(`  返程: ${routeDays.inbound}天`);
    console.log(`  第1程: ${routeDays.multiCity0}天`);
    console.log(`  第2程: ${routeDays.multiCity1}天`);
    console.log(`  第3程: ${routeDays.multiCity2}天`);

    // 计算总天数（用于 PER_DAY 类型）
    const totalDays = Object.values(routeDays).reduce((sum, days) => sum + days, 0);
    console.log(`\n总天数: ${totalDays}天`);

    // 计算费用（假设币种为USD，需要从CNY转换）
    const targetCurrency = 'USD';
    const exchangeRate = 7.2; // 假设汇率 1 USD = 7.2 CNY（实际应该从API获取）

    console.log(`\n💰 费用计算（币种: ${targetCurrency}，汇率: 1 USD = ${exchangeRate} CNY）:\n`);

    const calculatedCosts = {
      outbound: {},
      inbound: {},
      multiCity: [{}, {}, {}],
      byItem: {}
    };

    // 处理每个费用项
    standard.expenseStandards.forEach(es => {
      const itemId = es.expenseItemId?._id?.toString() || es.expenseItemId?.toString();
      const itemName = es.expenseItemId?.itemName || '未知';
      const limitType = es.limitType;
      const calcUnit = es.calcUnit;

      console.log(`\n费用项: ${itemName}`);
      console.log(`  限额类型: ${limitType}`);
      console.log(`  计算单位: ${calcUnit || 'N/A'}`);

      if (limitType === 'ACTUAL') {
        // 实报实销：不自动计算，显示为0或用户输入
        console.log(`  ⚠️  实报实销类型，不自动计算金额`);
        calculatedCosts.byItem[itemName] = 0;
      } else if (limitType === 'FIXED') {
        const limitCNY = es.limitAmount || 0;
        const limitUSD = limitCNY / exchangeRate;

        if (calcUnit === 'PER_DAY') {
          // 按天计算
          const outboundAmount = limitUSD * routeDays.outbound;
          const inboundAmount = limitUSD * routeDays.inbound;
          const multiCity0Amount = limitUSD * routeDays.multiCity0;
          const multiCity1Amount = limitUSD * routeDays.multiCity1;
          const multiCity2Amount = limitUSD * routeDays.multiCity2;

          calculatedCosts.outbound[itemId] = outboundAmount;
          calculatedCosts.inbound[itemId] = inboundAmount;
          calculatedCosts.multiCity[0][itemId] = multiCity0Amount;
          calculatedCosts.multiCity[1][itemId] = multiCity1Amount;
          calculatedCosts.multiCity[2][itemId] = multiCity2Amount;

          const total = outboundAmount + inboundAmount + multiCity0Amount + multiCity1Amount + multiCity2Amount;
          calculatedCosts.byItem[itemName] = total;

          console.log(`  单价: ${limitUSD.toFixed(2)} USD/天`);
          console.log(`  去程: ${limitUSD.toFixed(2)} × ${routeDays.outbound} = ${outboundAmount.toFixed(2)} USD`);
          console.log(`  返程: ${limitUSD.toFixed(2)} × ${routeDays.inbound} = ${inboundAmount.toFixed(2)} USD`);
          console.log(`  第1程: ${limitUSD.toFixed(2)} × ${routeDays.multiCity0} = ${multiCity0Amount.toFixed(2)} USD`);
          console.log(`  第2程: ${limitUSD.toFixed(2)} × ${routeDays.multiCity1} = ${multiCity1Amount.toFixed(2)} USD`);
          console.log(`  第3程: ${limitUSD.toFixed(2)} × ${routeDays.multiCity2} = ${multiCity2Amount.toFixed(2)} USD`);
          console.log(`  小计: ${total.toFixed(2)} USD`);
        } else if (calcUnit === 'PER_TRIP') {
          // 按次计算：每个行程1次
          const tripCount = routes.length; // 5个行程
          const total = limitUSD * tripCount;
          calculatedCosts.byItem[itemName] = total;

          console.log(`  单价: ${limitUSD.toFixed(2)} USD/次`);
          console.log(`  行程数: ${tripCount}次`);
          console.log(`  小计: ${total.toFixed(2)} USD`);
        }
      }
    });

    // 计算各行程总费用
    const outboundTotal = Object.values(calculatedCosts.outbound).reduce((sum, val) => sum + val, 0);
    const inboundTotal = Object.values(calculatedCosts.inbound).reduce((sum, val) => sum + val, 0);
    const multiCityTotal = calculatedCosts.multiCity.reduce((sum, budget) => {
      return sum + Object.values(budget).reduce((budgetSum, val) => budgetSum + val, 0);
    }, 0);

    console.log('\n' + '='.repeat(80));
    console.log('计算结果对比');
    console.log('='.repeat(80));

    console.log('\n📊 各行程费用：');
    console.log(`  去程: 计算值 ${outboundTotal.toFixed(2)} USD | 显示值 ${displayedCosts.outbound.toFixed(2)} USD | 差异: ${Math.abs(outboundTotal - displayedCosts.outbound).toFixed(2)} USD`);
    console.log(`  返程: 计算值 ${inboundTotal.toFixed(2)} USD | 显示值 ${displayedCosts.inbound.toFixed(2)} USD | 差异: ${Math.abs(inboundTotal - displayedCosts.inbound).toFixed(2)} USD`);
    console.log(`  多程: 计算值 ${multiCityTotal.toFixed(2)} USD | 显示值 ${displayedCosts.multiCity.toFixed(2)} USD | 差异: ${Math.abs(multiCityTotal - displayedCosts.multiCity).toFixed(2)} USD`);

    console.log('\n📋 按费用项汇总：');
    Object.entries(calculatedCosts.byItem).forEach(([itemName, calculated]) => {
      let displayed = 0;
      if (itemName.includes('交通') || itemName.includes('Transportation')) {
        displayed = displayedCosts.transportation;
      } else if (itemName.includes('住宿') || itemName.includes('Accommodation')) {
        displayed = displayedCosts.accommodation;
      } else if (itemName.includes('补助') || itemName.includes('Allowance')) {
        displayed = displayedCosts.allowance;
      } else if (itemName.includes('电话') || itemName.includes('Phone')) {
        displayed = displayedCosts.phone;
      } else if (itemName.includes('洗衣') || itemName.includes('Laundry')) {
        displayed = displayedCosts.laundry;
      } else if (itemName.includes('签证') || itemName.includes('Visa')) {
        displayed = displayedCosts.visa;
      }
      
      const diff = Math.abs(calculated - displayed);
      const match = diff < 1 ? '✅' : '❌';
      console.log(`  ${match} ${itemName}: 计算值 ${calculated.toFixed(2)} USD | 显示值 ${displayed.toFixed(2)} USD | 差异: ${diff.toFixed(2)} USD`);
    });

    const calculatedTotal = outboundTotal + inboundTotal + multiCityTotal;
    console.log(`\n💰 总费用: 计算值 ${calculatedTotal.toFixed(2)} USD | 显示值 ${displayedCosts.total.toFixed(2)} USD | 差异: ${Math.abs(calculatedTotal - displayedCosts.total).toFixed(2)} USD`);

    console.log('\n' + '='.repeat(80));
    console.log('验证完成');
    console.log('='.repeat(80) + '\n');

  } catch (error) {
    console.error('❌ 验证过程出错:', error);
    console.error(error.stack);
  } finally {
    await mongoose.disconnect();
    console.log('数据库连接已关闭');
    process.exit(0);
  }
};

verifyExpenseCalculation();

