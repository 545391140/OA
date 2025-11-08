/**
 * 创建测试用户
 * 用于创建可登录的测试账户
 * 
 * 使用方法：
 * node backend/scripts/createTestUser.js [email] [password]
 */

const mongoose = require('mongoose');
require('dotenv').config();
const User = require('../models/User');
const Role = require('../models/Role');
const Position = require('../models/Position');

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(
      process.env.MONGODB_URI || 'mongodb://localhost:27017/travel-expense-system'
    );
    console.log(`📦 MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error('❌ Database connection error:', error.message);
    process.exit(1);
  }
};

const createTestUser = async () => {
  try {
    await connectDB();

    // 获取命令行参数
    const email = process.argv[2] || 'admin@crm.com';
    const password = process.argv[3] || '123456';
    const employeeId = process.argv[4] || 'ADMIN001';

    console.log(`\n🔍 检查用户: ${email}`);

    // 检查用户是否已存在
    const existingUser = await User.findOne({
      $or: [
        { email: email.toLowerCase() },
        { employeeId: employeeId }
      ]
    });

    if (existingUser) {
      console.log('✅ 用户已存在:');
      console.log(`   邮箱: ${existingUser.email}`);
      console.log(`   员工ID: ${existingUser.employeeId}`);
      console.log(`   角色: ${existingUser.role}`);
      console.log(`   状态: ${existingUser.isActive ? '激活' : '未激活'}`);
      
      // 如果用户存在但未激活，激活用户
      if (!existingUser.isActive) {
        existingUser.isActive = true;
        await existingUser.save();
        console.log('✅ 用户已激活');
      }
      
      // 重置密码
      existingUser.password = password;
      await existingUser.save();
      console.log('✅ 密码已重置');
      console.log(`\n📋 登录信息：`);
      console.log(`   邮箱: ${existingUser.email}`);
      console.log(`   密码: ${password}`);
      console.log(`   员工ID: ${existingUser.employeeId}`);
      
      process.exit(0);
    }

    // 查找或创建默认角色
    let role = await Role.findOne({ code: 'admin', isActive: true });
    if (!role) {
      // 查找任何激活的角色
      role = await Role.findOne({ isActive: true });
      if (!role) {
        console.log('⚠️  没有找到可用的角色，将使用 "admin" 作为角色代码');
      }
    }

    // 查找或创建默认岗位
    let position = await Position.findOne({ isActive: true });
    if (!position) {
      console.log('⚠️  没有找到可用的岗位，将使用 "ADMIN" 作为岗位代码');
    }

    // 创建新用户
    const userData = {
      employeeId: employeeId,
      firstName: 'Admin',
      lastName: 'User',
      email: email.toLowerCase(),
      password: password,
      role: role ? role.code : 'admin',
      department: 'IT',
      position: position ? position.code : 'ADMIN',
      isActive: true
    };

    const user = await User.create(userData);

    console.log('✅ 测试用户创建成功！');
    console.log('\n📋 登录信息：');
    console.log(`   邮箱: ${user.email}`);
    console.log(`   密码: ${password}`);
    console.log(`   员工ID: ${user.employeeId}`);
    console.log(`   角色: ${user.role}`);
    console.log(`   岗位: ${user.position}`);
    console.log(`   部门: ${user.department}`);

    process.exit(0);
  } catch (error) {
    console.error('❌ 创建用户失败:', error.message);
    if (error.code === 11000) {
      console.log('   用户可能已存在，请检查数据库');
    }
    console.error('   错误详情:', error);
    process.exit(1);
  }
};

// 运行脚本
createTestUser();

