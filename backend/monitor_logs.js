#!/usr/bin/env node

/**
 * 后端日志监控脚本
 * 监控 expenseItemController 中的 parentItem 相关日志
 */

const http = require('http');

console.log('🔍 开始监控后端日志...');
console.log('📋 发送测试请求以触发日志输出...\n');

// 发送测试请求
const testData = JSON.stringify({
  itemName: '监控测试项',
  description: '用于监控parentItem日志',
  parentItem: '6905c4099527232c153dace1'
});

const options = {
  hostname: 'localhost',
  port: 3001,
  path: '/api/expense-items',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer mock-jwt-token-test',
    'Content-Length': Buffer.byteLength(testData)
  }
};

const req = http.request(options, (res) => {
  console.log(`📤 请求状态码: ${res.statusCode}`);
  
  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    try {
      const response = JSON.parse(data);
      console.log('\n📥 响应数据:');
      console.log(JSON.stringify(response, null, 2));
      console.log('\n⚠️  注意: 后端服务器的 console.log 输出会显示在运行 server.js 的终端窗口中');
      console.log('   请检查运行 "npm run dev:backend" 或 "node server.js" 的终端窗口');
      console.log('   查找以下日志标记:');
      console.log('   - "Received parentItem value:"');
      console.log('   - "Setting parentItem to ObjectId:"');
      console.log('   - "Creating expense item with data:"');
      console.log('   - "Created expense item, parentItem:"');
      console.log('   - "Saved expense item parentItem:"');
    } catch (e) {
      console.log('响应:', data);
    }
  });
});

req.on('error', (e) => {
  console.error(`❌ 请求错误: ${e.message}`);
});

req.write(testData);
req.end();

