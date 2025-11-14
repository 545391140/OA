/**
 * 检查数据库配置信息
 * 显示数据库连接信息（密码已隐藏）
 * 
 * 使用方法：
 * node backend/scripts/checkDatabaseConfig.js
 */

require('dotenv').config();
const mongoose = require('mongoose');

const uri = process.env.MONGODB_URI || '未配置';

console.log('\n📊 数据库配置信息\n');

if (uri === '未配置') {
  console.log('❌ MONGODB_URI 未配置！');
  console.log('\n请按照以下步骤配置：');
  console.log('1. 编辑 backend/.env 文件');
  console.log('2. 添加：MONGODB_URI=your-connection-string\n');
  process.exit(1);
}

// 解析连接字符串
if (uri.startsWith('mongodb+srv://')) {
  // MongoDB Atlas 格式
  const match = uri.match(/mongodb\+srv:\/\/([^:]+):([^@]+)@([^/]+)\/([^?]+)/);
  
  if (match) {
    const [, username, password, cluster, database] = match;
    console.log('✅ 数据库类型: MongoDB Atlas (云数据库)');
    console.log('✅ 用户名:', username);
    console.log('✅ 密码:', '*'.repeat(Math.min(password.length, 20)) + ' (已隐藏)');
    console.log('✅ 集群地址:', cluster);
    console.log('✅ 数据库名:', database);
    console.log('\n📝 完整连接字符串格式:');
    console.log(`   mongodb+srv://${username}:${password}@${cluster}/${database}?retryWrites=true&w=majority`);
  } else {
    console.log('⚠️  连接字符串格式解析失败');
    console.log('预览:', uri.substring(0, 60) + '...');
  }
} else if (uri.startsWith('mongodb://')) {
  // 本地 MongoDB 格式
  const match = uri.match(/mongodb:\/\/(?:([^:]+):([^@]+)@)?([^/]+)\/([^?]+)/);
  
  if (match) {
    const [, username, password, host, database] = match;
    console.log('✅ 数据库类型: 本地 MongoDB');
    if (username) {
      console.log('✅ 用户名:', username);
      console.log('✅ 密码:', password ? '*'.repeat(Math.min(password.length, 20)) + ' (已隐藏)' : '未设置');
    }
    console.log('✅ 主机地址:', host);
    console.log('✅ 数据库名:', database);
    console.log('\n📝 完整连接字符串格式:');
    console.log(`   mongodb://${username ? username + ':' + password + '@' : ''}${host}/${database}`);
  } else {
    console.log('⚠️  连接字符串格式解析失败');
    console.log('预览:', uri.substring(0, 60) + '...');
  }
} else {
  console.log('⚠️  未知的连接字符串格式');
  console.log('预览:', uri.substring(0, 60) + '...');
}

// 测试连接
console.log('\n🔗 测试数据库连接...');
mongoose.connect(uri)
  .then((conn) => {
    console.log('✅ 连接成功！');
    console.log('✅ 连接主机:', conn.connection.host);
    console.log('✅ 数据库名:', conn.connection.name);
    console.log('✅ 连接状态:', conn.connection.readyState === 1 ? '已连接' : '未连接');
    process.exit(0);
  })
  .catch((error) => {
    console.log('❌ 连接失败！');
    console.log('❌ 错误信息:', error.message);
    console.log('\n💡 可能的原因：');
    console.log('   1. 连接字符串不正确');
    console.log('   2. 用户名或密码错误');
    console.log('   3. 网络连接问题');
    console.log('   4. MongoDB Atlas 白名单未配置（需要允许你的 IP）');
    process.exit(1);
  });

