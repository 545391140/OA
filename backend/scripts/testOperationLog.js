const mongoose = require('mongoose');
require('dotenv').config();
const axios = require('axios');

const BASE_URL = process.env.API_BASE_URL || 'http://localhost:3001';

// 连接数据库
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/oa', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ MongoDB connected');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error.message);
    process.exit(1);
  }
};

// 登录获取token
const login = async (email, password) => {
  try {
    const response = await axios.post(`${BASE_URL}/api/auth/login`, {
      email,
      password
    });
    if (response.data.success) {
      return response.data.token;
    }
    throw new Error('Login failed');
  } catch (error) {
    console.error('❌ Login error:', error.response?.data?.message || error.message);
    throw error;
  }
};

// 检查操作日志
const checkOperationLogs = async () => {
  const OperationLog = require('../models/OperationLog');
  try {
    const count = await OperationLog.countDocuments();
    const recentLogs = await OperationLog.find()
      .sort({ operationTime: -1 })
      .limit(5)
      .lean();
    
    console.log(`\n📊 操作日志统计:`);
    console.log(`   总记录数: ${count}`);
    console.log(`\n📝 最近5条日志:`);
    recentLogs.forEach((log, index) => {
      console.log(`   ${index + 1}. [${log.module}] ${log.action} ${log.resourceType} - ${log.status} (${log.operationTime})`);
    });
    
    return { count, recentLogs };
  } catch (error) {
    console.error('❌ Check logs error:', error.message);
    throw error;
  }
};

// 执行测试操作
const runTests = async () => {
  try {
    await connectDB();
    
    // 先检查当前日志数量
    console.log('\n🔍 检查当前日志状态...');
    const beforeLogs = await checkOperationLogs();
    const beforeCount = beforeLogs.count;
    
    // 登录获取token
    console.log('\n🔐 登录获取token...');
    const testEmail = process.env.TEST_EMAIL || 'admin@example.com';
    const testPassword = process.env.TEST_PASSWORD || 'password123';
    
    let token;
    try {
      token = await login(testEmail, testPassword);
      console.log('✅ 登录成功');
    } catch (error) {
      console.log('⚠️  登录失败，尝试使用mock token...');
      // 如果登录失败，尝试创建一个测试用户或使用mock token
      token = 'mock-jwt-token-test';
    }
    
    // 执行一些测试操作
    console.log('\n🧪 执行测试操作...');
    const headers = {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };
    
    // 测试1: 获取用户列表（GET请求，应该不记录）
    console.log('   1. GET /api/users (应该不记录)');
    try {
      await axios.get(`${BASE_URL}/api/users`, { headers });
      console.log('      ✅ GET请求完成');
    } catch (error) {
      console.log('      ⚠️  GET请求失败:', error.response?.status);
    }
    
    // 测试2: 获取设置（GET请求，应该不记录）
    console.log('   2. GET /api/settings (应该不记录)');
    try {
      await axios.get(`${BASE_URL}/api/settings`, { headers });
      console.log('      ✅ GET请求完成');
    } catch (error) {
      console.log('      ⚠️  GET请求失败:', error.response?.status);
    }
    
    // 等待一下确保日志被写入
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // 检查日志
    console.log('\n🔍 检查操作日志...');
    const afterLogs = await checkOperationLogs();
    const afterCount = afterLogs.count;
    
    console.log(`\n📈 日志变化:`);
    console.log(`   之前: ${beforeCount} 条`);
    console.log(`   之后: ${afterCount} 条`);
    console.log(`   新增: ${afterCount - beforeCount} 条`);
    
    if (afterCount === beforeCount) {
      console.log('\n⚠️  警告: 没有新的日志记录！');
      console.log('   可能的原因:');
      console.log('   1. GET请求被排除（正常）');
      console.log('   2. 需要执行POST/PUT/DELETE操作才能记录日志');
      console.log('   3. req.user未设置');
      console.log('   4. 中间件未正确触发');
    } else {
      console.log('\n✅ 日志功能正常工作！');
    }
    
    // 关闭数据库连接
    await mongoose.connection.close();
    console.log('\n✅ 测试完成');
    
  } catch (error) {
    console.error('\n❌ 测试失败:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
};

// 运行测试
runTests();



