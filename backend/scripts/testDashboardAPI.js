const mongoose = require('mongoose');
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const Travel = require('../models/Travel');
const Expense = require('../models/Expense');
const User = require('../models/User');
const Role = require('../models/Role');
const { buildDataScopeQuery } = require('../utils/dataScope');

async function testDashboardAPI() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    // 1. 检查用户
    console.log('📋 Step 1: 检查用户');
    const testUser = await User.findOne().lean();
    if (!testUser) {
      console.log('❌ 未找到用户');
      process.exit(1);
    }
    console.log(`   用户: ${testUser.firstName} ${testUser.lastName} (${testUser.role})`);
    console.log(`   用户ID: ${testUser._id}`);

    // 2. 检查角色
    console.log('\n📋 Step 2: 检查角色');
    const role = await Role.findOne({ code: testUser.role, isActive: true });
    if (!role) {
      console.log(`❌ 未找到角色: ${testUser.role}`);
      process.exit(1);
    }
    console.log(`   角色: ${role.name} (${role.code})`);

    // 3. 检查数据权限查询
    console.log('\n📋 Step 3: 检查数据权限查询');
    const travelQuery = await buildDataScopeQuery(testUser, role, 'employee');
    console.log('   数据权限查询条件:', JSON.stringify(travelQuery, null, 2));

    // 4. 检查 Travel 数据
    console.log('\n📊 Step 4: 检查 Travel 数据');
    const totalTravels = await Travel.countDocuments({});
    console.log(`   总差旅数: ${totalTravels}`);
    const travelsWithPermission = await Travel.countDocuments(travelQuery);
    console.log(`   符合权限的差旅数: ${travelsWithPermission}`);

    // 5. 检查 Expense 数据
    console.log('\n💰 Step 5: 检查 Expense 数据');
    const totalExpenses = await Expense.countDocuments({});
    console.log(`   总费用数: ${totalExpenses}`);
    const expensesWithPermission = await Expense.countDocuments(travelQuery);
    console.log(`   符合权限的费用数: ${expensesWithPermission}`);

    // 6. 测试各个查询函数
    console.log('\n🔬 Step 6: 测试各个查询函数');
    
    // 测试统计数据
    try {
      const stats = await Travel.countDocuments(travelQuery);
      console.log(`   ✅ getDashboardStatsData: ${stats} 条差旅`);
    } catch (err) {
      console.log(`   ❌ getDashboardStatsData 失败:`, err.message);
    }

    // 测试最近差旅
    try {
      const recentTravels = await Travel.find(travelQuery)
        .sort({ createdAt: -1 })
        .limit(5)
        .lean();
      console.log(`   ✅ getRecentTravelsData: ${recentTravels.length} 条`);
    } catch (err) {
      console.log(`   ❌ getRecentTravelsData 失败:`, err.message);
    }

    // 测试最近费用
    try {
      const recentExpenses = await Expense.find(travelQuery)
        .sort({ date: -1 })
        .limit(5)
        .lean();
      console.log(`   ✅ getRecentExpensesData: ${recentExpenses.length} 条`);
    } catch (err) {
      console.log(`   ❌ getRecentExpensesData 失败:`, err.message);
    }

    // 测试月度支出
    try {
      const currentMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
      const monthlySpending = await Expense.aggregate([
        {
          $match: {
            ...travelQuery,
            date: { $gte: currentMonth }
          }
        },
        {
          $group: {
            _id: null,
            total: { $sum: '$amount' }
          }
        }
      ]);
      const total = monthlySpending[0]?.total || 0;
      console.log(`   ✅ getMonthlySpendingData: ${total} 元`);
    } catch (err) {
      console.log(`   ❌ getMonthlySpendingData 失败:`, err.message);
    }

    // 测试类别分布
    try {
      const categoryData = await Expense.aggregate([
        {
          $match: travelQuery
        },
        {
          $group: {
            _id: '$category',
            total: { $sum: '$amount' },
            count: { $sum: 1 }
          }
        }
      ]);
      console.log(`   ✅ getCategoryBreakdownData: ${categoryData.length} 个类别`);
    } catch (err) {
      console.log(`   ❌ getCategoryBreakdownData 失败:`, err.message);
    }

    // 测试国家差旅数据
    try {
      const { getCountryTravelData } = require('../controllers/dashboardController');
      // 需要模拟 req 对象
      const countryData = await getCountryTravelData(travelQuery);
      console.log(`   ✅ getCountryTravelData: ${countryData.length} 个国家`);
      if (countryData.length > 0) {
        console.log(`   前3个国家:`, countryData.slice(0, 3).map(c => `${c.name}(${c.count})`).join(', '));
      }
    } catch (err) {
      console.log(`   ❌ getCountryTravelData 失败:`, err.message);
      console.log(`   错误堆栈:`, err.stack);
    }

    console.log('\n✅ 测试完成');
    process.exit(0);
  } catch (error) {
    console.error('❌ 错误:', error);
    console.error('错误堆栈:', error.stack);
    process.exit(1);
  }
}

testDashboardAPI();

