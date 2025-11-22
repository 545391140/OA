const mongoose = require('mongoose');
const Expense = require('../models/Expense');
const User = require('../models/User');
require('dotenv').config();

async function checkExpenseData() {
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/travel-expense-system';
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB');

    // 检查总费用数量
    const totalCount = await Expense.countDocuments({});
    console.log('\n📊 Total expenses in database:', totalCount);

    if (totalCount === 0) {
      console.log('⚠️  No expenses found in database!');
      process.exit(0);
    }

    // 检查最近6个月的费用
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    sixMonthsAgo.setHours(0, 0, 0, 0);
    sixMonthsAgo.setMilliseconds(0);
    
    const recentCount = await Expense.countDocuments({
      date: { $gte: sixMonthsAgo }
    });
    console.log('📅 Expenses in last 6 months:', recentCount);

    // 检查最近1个月的费用
    const oneMonthAgo = new Date();
    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
    oneMonthAgo.setHours(0, 0, 0, 0);
    oneMonthAgo.setMilliseconds(0);
    
    const lastMonthCount = await Expense.countDocuments({
      date: { $gte: oneMonthAgo }
    });
    console.log('📅 Expenses in last 1 month:', lastMonthCount);

    // 检查费用状态分布
    const statusCounts = await Expense.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);
    console.log('\n📋 Status distribution:');
    statusCounts.forEach(item => {
      console.log(`  - ${item._id || 'null'}: ${item.count}`);
    });

    // 检查类别分布
    const categoryCounts = await Expense.aggregate([
      {
        $group: {
          _id: '$category',
          count: { $sum: 1 },
          total: { $sum: '$amount' }
        }
      },
      { $sort: { count: -1 } }
    ]);
    console.log('\n📋 Category distribution:');
    categoryCounts.forEach(item => {
      console.log(`  - ${item._id || 'null'}: ${item.count} expenses, total: ${item.total}`);
    });

    // 检查最近的费用
    const recentExpenses = await Expense.find({})
      .sort({ date: -1 })
      .limit(5)
      .select('title amount date category status employee')
      .populate('employee', 'firstName lastName email')
      .lean();
    
    console.log('\n📝 Recent 5 expenses:');
    recentExpenses.forEach((expense, index) => {
      console.log(`\n  ${index + 1}. ${expense.title || 'Untitled'}`);
      console.log(`     Amount: ${expense.amount}, Category: ${expense.category}`);
      console.log(`     Date: ${expense.date}, Status: ${expense.status}`);
      console.log(`     Employee: ${expense.employee?.firstName || 'N/A'} ${expense.employee?.lastName || ''}`);
    });

    // 检查日期范围
    const dateRange = await Expense.aggregate([
      {
        $group: {
          _id: null,
          minDate: { $min: '$date' },
          maxDate: { $max: '$date' }
        }
      }
    ]);
    if (dateRange.length > 0) {
      console.log('\n📅 Date range:');
      console.log(`  - Earliest: ${dateRange[0].minDate}`);
      console.log(`  - Latest: ${dateRange[0].maxDate}`);
    }

    // 检查员工分布
    const employeeCounts = await Expense.aggregate([
      {
        $group: {
          _id: '$employee',
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } },
      { $limit: 5 }
    ]);
    console.log('\n👥 Top 5 employees by expense count:');
    for (const item of employeeCounts) {
      const user = await User.findById(item._id).select('firstName lastName email').lean();
      console.log(`  - ${user?.firstName || 'N/A'} ${user?.lastName || ''} (${user?.email || 'N/A'}): ${item.count} expenses`);
    }

    await mongoose.connection.close();
    console.log('\n✅ Check completed');
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

checkExpenseData();

