/**
 * 初始化角色权限
 * 为admin角色添加所有权限
 * 
 * 使用方法：
 * node backend/scripts/initRolePermissions.js
 */

const mongoose = require('mongoose');
require('dotenv').config();
const config = require('../config');
const Role = require('../models/Role');
const { PERMISSIONS } = require('../config/permissions');

const connectDB = async () => {
  try {
    const mongoUri = process.env.MONGODB_URI || config.MONGODB_URI || 'mongodb://localhost:27017/travel-expense-system';
    console.log(`🔌 Attempting to connect to MongoDB...`);
    const conn = await mongoose.connect(mongoUri);
    console.log(`📦 MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error('❌ Database connection error:', error.message);
    process.exit(1);
  }
};

const initRolePermissions = async () => {
  try {
    await connectDB();

    // 获取所有权限代码
    const allPermissions = Object.values(PERMISSIONS);

    // 查找或创建admin角色
    let adminRole = await Role.findOne({ code: 'ADMIN' });
    
    if (!adminRole) {
      console.log('⚠️  Admin role not found. Creating admin role...');
      adminRole = await Role.create({
        code: 'ADMIN',
        name: '管理员',
        nameEn: 'Administrator',
        description: '系统管理员，拥有所有权限',
        permissions: allPermissions,
        level: 100,
        isSystem: true,
        isActive: true
      });
      console.log('✅ Admin role created with all permissions');
    } else {
      // 更新admin角色的权限
      adminRole.permissions = allPermissions;
      adminRole.level = 100;
      adminRole.isSystem = true;
      adminRole.isActive = true;
      await adminRole.save();
      console.log('✅ Admin role updated with all permissions');
    }

    console.log(`\n📋 Admin role permissions (${adminRole.permissions.length}):`);
    console.log(`   ${adminRole.permissions.join(', ')}`);

    // 查找其他角色，确保它们有基本权限
    const otherRoles = await Role.find({ code: { $ne: 'ADMIN' } });
    console.log(`\n📊 Found ${otherRoles.length} other role(s)`);

    process.exit(0);
  } catch (error) {
    console.error('❌ Init role permissions error:', error);
    process.exit(1);
  }
};

// 运行脚本
initRolePermissions();










