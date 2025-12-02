const mongoose = require('mongoose');
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const Expense = require('../models/Expense');
const User = require('../models/User');
const Role = require('../models/Role');
const { buildDataScopeQuery } = require('../utils/dataScope');

async function testMonthlySpending() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/travel-expense-system');
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
    console.log(`   数据权限范围: ${role.dataScope || 'self'}`);

    // 3. 构建数据权限查询
    console.log('\n📋 Step 3: 构建数据权限查询');
    const expenseQuery = await buildDataScopeQuery(testUser, role, 'employee');
    console.log('   数据权限查询条件:', JSON.stringify(expenseQuery, null, 2));

    // 4. 检查所有费用数据
    console.log('\n💰 Step 4: 检查费用数据');
    const totalExpenses = await Expense.countDocuments({});
    console.log(`   总费用数: ${totalExpenses}`);
    const expensesWithPermission = await Expense.countDocuments(expenseQuery);
    console.log(`   符合权限的费用数: ${expensesWithPermission}`);

    // 5. 检查日期范围
    console.log('\n📅 Step 5: 检查日期范围');
    const now = new Date();
    const currentMonth = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0, 0);
    const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1, 0, 0, 0, 0);
    
    console.log(`   当前时间: ${now.toISOString()}`);
    console.log(`   当前月开始: ${currentMonth.toISOString()}`);
    console.log(`   上月开始: ${lastMonth.toISOString()}`);
    console.log(`   下月开始: ${nextMonth.toISOString()}`);

    // 6. 检查当前月的费用
    console.log('\n📊 Step 6: 检查当前月费用');
    const currentMonthQuery = Object.assign({}, expenseQuery, {
      date: { $gte: currentMonth, $lt: nextMonth }
    });
    console.log('   查询条件:', JSON.stringify(currentMonthQuery, null, 2));
    
    const currentMonthExpenses = await Expense.find(currentMonthQuery)
      .select('title amount date employee')
      .sort({ date: -1 })
      .limit(10)
      .lean();
    console.log(`   当前月费用数量: ${currentMonthExpenses.length}`);
    if (currentMonthExpenses.length > 0) {
      console.log('   前几条费用:');
      currentMonthExpenses.forEach((exp, idx) => {
        console.log(`     ${idx + 1}. ${exp.title} - ¥${exp.amount} - ${exp.date}`);
      });
    }

    // 7. 测试聚合查询（当前月）
    console.log('\n🔬 Step 7: 测试聚合查询（当前月）');
    const expenseQueryForAggregate = { ...expenseQuery };
    // 转换 employee 字段为 ObjectId（如果需要）
    if (expenseQueryForAggregate.employee) {
      if (typeof expenseQueryForAggregate.employee === 'string') {
        expenseQueryForAggregate.employee = new mongoose.Types.ObjectId(expenseQueryForAggregate.employee);
      } else if (expenseQueryForAggregate.employee.$in && Array.isArray(expenseQueryForAggregate.employee.$in)) {
        expenseQueryForAggregate.employee.$in = expenseQueryForAggregate.employee.$in.map(id => 
          typeof id === 'string' ? new mongoose.Types.ObjectId(id) : id
        );
      }
    }
    
    const currentMonthSpendingData = await Expense.aggregate([
      { 
        $match: Object.assign({}, expenseQueryForAggregate, { 
          date: { $gte: currentMonth, $lt: nextMonth }
        }) 
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$amount' },
          count: { $sum: 1 }
        }
      }
    ]);
    
    console.log('   聚合查询结果:', JSON.stringify(currentMonthSpendingData, null, 2));
    const currentMonthTotal = currentMonthSpendingData[0]?.total || 0;
    console.log(`   当前月总支出: ¥${currentMonthTotal}`);

    // 8. 检查所有费用的日期分布
    console.log('\n📈 Step 8: 检查所有费用的日期分布');
    const allExpenses = await Expense.find(expenseQuery)
      .select('date amount')
      .sort({ date: -1 })
      .limit(20)
      .lean();
    
    if (allExpenses.length > 0) {
      console.log('   最近20条费用的日期:');
      allExpenses.forEach((exp, idx) => {
        const expDate = new Date(exp.date);
        const isCurrentMonth = expDate >= currentMonth && expDate < nextMonth;
        console.log(`     ${idx + 1}. ${expDate.toISOString()} - ¥${exp.amount} ${isCurrentMonth ? '✅ 当前月' : '❌'}`);
      });
    } else {
      console.log('   ⚠️  没有找到任何费用数据');
    }

    // 9. 检查费用数据的 employee 字段
    console.log('\n👤 Step 9: 检查费用数据的 employee 字段');
    const sampleExpenses = await Expense.find({})
      .select('employee date amount')
      .limit(5)
      .lean();
    
    if (sampleExpenses.length > 0) {
      console.log('   样本费用的 employee 字段:');
      sampleExpenses.forEach((exp, idx) => {
        console.log(`     ${idx + 1}. Employee: ${exp.employee} (类型: ${typeof exp.employee}) - Date: ${exp.date} - Amount: ¥${exp.amount}`);
      });
    }

    console.log('\n✅ 测试完成');
    process.exit(0);
  } catch (error) {
    console.error('❌ 错误:', error);
    console.error('错误堆栈:', error.stack);
    process.exit(1);
  }
}

testMonthlySpending();

