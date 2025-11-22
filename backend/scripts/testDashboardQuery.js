const mongoose = require('mongoose');
const Expense = require('../models/Expense');
const User = require('../models/User');
const Role = require('../models/Role');
const { buildDataScopeQuery } = require('../utils/dataScope');
require('dotenv').config();

async function testDashboardQuery() {
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/travel-expense-system';
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB');

    // 获取一个用户（admin用户）
    const user = await User.findOne({ role: 'admin', isActive: true });
    if (!user) {
      console.log('❌ No admin user found');
      process.exit(1);
    }

    console.log('\n👤 Testing with user:', {
      id: user._id,
      email: user.email,
      role: user.role,
      department: user.department
    });

    const role = await Role.findOne({ code: user.role, isActive: true });
    console.log('📋 Role:', {
      code: role?.code,
      dataScope: role?.dataScope
    });

    // 测试数据权限查询
    const query = await buildDataScopeQuery(user, role, 'employee');
    console.log('\n🔍 Data scope query:', JSON.stringify(query, null, 2));

    // 测试月度支出查询（过去6个月）
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - 6);
    startDate.setDate(1);
    startDate.setHours(0, 0, 0, 0);
    startDate.setMilliseconds(0);

    console.log('\n📅 Date range:');
    console.log('  - Start date:', startDate.toISOString());
    console.log('  - Current date:', new Date().toISOString());

    const matchQuery = Object.assign({}, query, {
      date: { $gte: startDate }
    });

    console.log('\n🔍 Match query:', JSON.stringify(matchQuery, null, 2));

    // 检查匹配的费用数量
    const count = await Expense.countDocuments(matchQuery);
    console.log('\n📊 Expenses matching query:', count);

    // 执行聚合查询
    const monthlyData = await Expense.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: { year: { $year: '$date' }, month: { $month: '$date' } },
          total: { $sum: '$amount' }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } }
    ]);

    console.log('\n📊 Monthly spending aggregation result:');
    console.log(JSON.stringify(monthlyData, null, 2));

    // 测试类别分布查询（过去1个月）
    const categoryStartDate = new Date();
    categoryStartDate.setMonth(categoryStartDate.getMonth() - 1);
    categoryStartDate.setHours(0, 0, 0, 0);
    categoryStartDate.setMilliseconds(0);

    console.log('\n📅 Category breakdown date range:');
    console.log('  - Start date:', categoryStartDate.toISOString());

    const categoryMatchQuery = Object.assign({}, query, {
      date: { $gte: categoryStartDate }
    });

    const categoryCount = await Expense.countDocuments(categoryMatchQuery);
    console.log('\n📊 Expenses matching category query:', categoryCount);

    const categoryData = await Expense.aggregate([
      { $match: categoryMatchQuery },
      { $group: { _id: '$category', total: { $sum: '$amount' }, count: { $sum: 1 } } },
      { $sort: { total: -1 } }
    ]);

    console.log('\n📊 Category breakdown aggregation result:');
    console.log(JSON.stringify(categoryData, null, 2));

    await mongoose.connection.close();
    console.log('\n✅ Test completed');
  } catch (error) {
    console.error('❌ Error:', error);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
}

testDashboardQuery();

