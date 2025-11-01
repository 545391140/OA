/**
 * 初始化默认管理员用户
 * 用于首次部署时创建可登录的用户账户
 * 
 * 使用方法：
 * node backend/scripts/initDefaultUser.js
 */

const mongoose = require('mongoose');
require('dotenv').config();
const User = require('../models/User');

// 默认管理员用户配置
const DEFAULT_ADMIN = {
  employeeId: 'ADMIN001',
  firstName: 'Admin',
  lastName: 'User',
  email: 'admin@company.com',
  password: 'admin123456', // 生产环境应该修改为强密码
  role: 'admin',
  department: 'IT',
  position: 'System Administrator',
  isActive: true
};

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

const initDefaultUser = async () => {
  try {
    await connectDB();

    // 检查是否已存在管理员用户
    const existingAdmin = await User.findOne({
      $or: [
        { email: DEFAULT_ADMIN.email },
        { employeeId: DEFAULT_ADMIN.employeeId }
      ]
    });

    if (existingAdmin) {
      console.log('✅ 默认管理员用户已存在:');
      console.log(`   邮箱: ${existingAdmin.email}`);
      console.log(`   员工ID: ${existingAdmin.employeeId}`);
      console.log(`   角色: ${existingAdmin.role}`);
      console.log('\n⚠️  如果需要重置密码，请使用以下命令：');
      console.log('   node backend/scripts/resetUserPassword.js');
      process.exit(0);
    }

    // 创建默认管理员用户
    const admin = await User.create(DEFAULT_ADMIN);

    console.log('✅ 默认管理员用户创建成功！');
    console.log('\n📋 登录信息：');
    console.log(`   邮箱: ${admin.email}`);
    console.log(`   密码: ${DEFAULT_ADMIN.password}`);
    console.log(`   员工ID: ${admin.employeeId}`);
    console.log(`   角色: ${admin.role}`);
    console.log('\n⚠️  重要提示：');
    console.log('   1. 首次登录后请立即修改密码');
    console.log('   2. 生产环境请修改默认密码');
    console.log('   3. 建议创建其他管理员账户后删除此默认账户');

    process.exit(0);
  } catch (error) {
    console.error('❌ 创建默认用户失败:', error.message);
    if (error.code === 11000) {
      console.log('   用户可能已存在，请检查数据库');
    }
    process.exit(1);
  }
};

// 运行脚本
initDefaultUser();

