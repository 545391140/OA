/**
 * 测试仪表盘API
 * 检查数据获取是否正常
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const mongoose = require('mongoose');
const connectDB = require('../config/database');
const User = require('../models/User');
const Travel = require('../models/Travel');
const Expense = require('../models/Expense');
const Role = require('../models/Role');

async function testDashboard() {
  try {
    console.log('正在连接数据库...');
    await connectDB();
    console.log('✓ 数据库连接成功\n');

    // 检查用户数据
    console.log('=== 检查用户数据 ===');
    const userCount = await User.countDocuments();
    console.log(`用户总数: ${userCount}`);
    
    if (userCount > 0) {
      const firstUser = await User.findOne().lean();
      console.log(`示例用户: ${firstUser.email} (ID: ${firstUser._id}, Role: ${firstUser.role})`);
      
      // 检查角色
      if (firstUser.role) {
        const role = await Role.findOne({ code: firstUser.role, isActive: true });
        console.log(`角色信息: ${role ? role.name : '未找到'}`);
      }
    }

    // 检查差旅数据
    console.log('\n=== 检查差旅数据 ===');
    const travelCount = await Travel.countDocuments();
    console.log(`差旅总数: ${travelCount}`);
    
    if (travelCount > 0) {
      const travelStats = await Travel.aggregate([
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 }
          }
        }
      ]);
      console.log('差旅状态分布:', travelStats);
    }

    // 检查费用数据
    console.log('\n=== 检查费用数据 ===');
    const expenseCount = await Expense.countDocuments();
    console.log(`费用总数: ${expenseCount}`);
    
    if (expenseCount > 0) {
      const expenseStats = await Expense.aggregate([
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 }
          }
        }
      ]);
      console.log('费用状态分布:', expenseStats);
      
      // 检查月度支出
      const currentMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
      const monthlySpending = await Expense.aggregate([
        {
          $match: {
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
      console.log(`当月支出: ${monthlySpending[0]?.total || 0}`);
    }

    // 测试数据权限查询
    console.log('\n=== 测试数据权限查询 ===');
    if (userCount > 0) {
      const firstUser = await User.findOne().lean();
      const role = await Role.findOne({ code: firstUser.role, isActive: true });
      
      if (role) {
        const { buildDataScopeQuery } = require('../utils/dataScope');
        const travelQuery = await buildDataScopeQuery(firstUser, role, 'employee');
        console.log('数据权限查询条件:', JSON.stringify(travelQuery, null, 2));
        
        const allowedTravelCount = await Travel.countDocuments(travelQuery);
        console.log(`用户可访问的差旅数: ${allowedTravelCount}`);
      }
    }

    console.log('\n✓ 测试完成');
    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error('\n✗ 错误:', error.message);
    console.error(error.stack);
    await mongoose.connection.close();
    process.exit(1);
  }
}

testDashboard();

