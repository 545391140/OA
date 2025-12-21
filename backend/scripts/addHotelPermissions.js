/**
 * 添加酒店权限到现有角色
 * 使用方法：node backend/scripts/addHotelPermissions.js
 */

const mongoose = require('mongoose');
require('dotenv').config();
const config = require('../config');
const Role = require('../models/Role');

const connectDB = async () => {
  try {
    const mongoUri = process.env.MONGODB_URI || config.MONGODB_URI || 'mongodb://localhost:27017/travel-expense-system';
    console.log(`🔌 连接 MongoDB...`);
    const conn = await mongoose.connect(mongoUri);
    console.log(`✅ MongoDB 连接成功: ${conn.connection.host}`);
  } catch (error) {
    console.error('❌ 数据库连接失败:', error.message);
    process.exit(1);
  }
};

const addHotelPermissions = async () => {
  try {
    await connectDB();

    // 酒店相关权限
    const hotelPermissions = [
      'hotel.search',
      'hotel.booking.view',
      'hotel.booking.create',
      'hotel.booking.cancel',
    ];

    // 查找所有角色
    const roles = await Role.find({});
    console.log(`\n📋 找到 ${roles.length} 个角色`);

    for (const role of roles) {
      const originalCount = role.permissions.length;
      let updated = false;

      // 添加酒店权限（如果还没有）
      hotelPermissions.forEach(permission => {
        if (!role.permissions.includes(permission)) {
          role.permissions.push(permission);
          updated = true;
        }
      });

      if (updated) {
        await role.save();
        console.log(`✅ ${role.name} (${role.code}): 添加了 ${role.permissions.length - originalCount} 个权限`);
        console.log(`   新增权限: ${hotelPermissions.filter(p => !role.permissions.slice(0, originalCount).includes(p)).join(', ')}`);
      } else {
        console.log(`ℹ️  ${role.name} (${role.code}): 已有所有酒店权限`);
      }
    }

    console.log('\n✅ 权限更新完成');
    process.exit(0);
  } catch (error) {
    console.error('❌ 更新权限失败:', error);
    process.exit(1);
  }
};

addHotelPermissions();

