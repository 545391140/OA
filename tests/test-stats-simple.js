// 简单测试审批统计API
const axios = require('axios');

const BASE_URL = 'http://localhost:5000/api';

// 从命令行参数获取token
const token = process.argv[2];

if (!token) {
  console.error('Usage: node test-stats-simple.js <auth_token>');
  console.error('请提供认证token');
  process.exit(1);
}

// 计算日期范围（最近30天）
const endDate = new Date().toISOString().split('T')[0];
const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

console.log('=== 测试审批统计API ===');
console.log(`日期范围: ${startDate} 到 ${endDate}`);
console.log('');

const config = {
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  }
};

async function testStatistics() {
  try {
    console.log('1. 测试获取所有类型的统计...');
    const statsResponse = await axios.get(
      `${BASE_URL}/approvals/statistics?startDate=${startDate}&endDate=${endDate}`,
      config
    );
    console.log('统计数据:', JSON.stringify(statsResponse.data, null, 2));
    console.log('');
    console.log('---');
    console.log('');

    console.log('2. 测试获取差旅统计...');
    const travelStatsResponse = await axios.get(
      `${BASE_URL}/approvals/statistics?startDate=${startDate}&endDate=${endDate}&type=travel`,
      config
    );
    console.log('差旅统计:', JSON.stringify(travelStatsResponse.data, null, 2));
    console.log('');
    console.log('---');
    console.log('');

    console.log('3. 测试获取费用统计...');
    const expenseStatsResponse = await axios.get(
      `${BASE_URL}/approvals/statistics?startDate=${startDate}&endDate=${endDate}&type=expense`,
      config
    );
    console.log('费用统计:', JSON.stringify(expenseStatsResponse.data, null, 2));
    console.log('');
    console.log('---');
    console.log('');

    console.log('4. 测试获取审批人工作量...');
    const workloadResponse = await axios.get(
      `${BASE_URL}/approvals/approver-workload?startDate=${startDate}&endDate=${endDate}`,
      config
    );
    console.log('审批人工作量:', JSON.stringify(workloadResponse.data, null, 2));
    console.log('');
    console.log('---');
    console.log('');

    console.log('5. 测试获取趋势数据...');
    const trendResponse = await axios.get(
      `${BASE_URL}/approvals/trend?startDate=${startDate}&endDate=${endDate}`,
      config
    );
    console.log('趋势数据:', JSON.stringify(trendResponse.data, null, 2));
    console.log('');
    console.log('---');
    console.log('');

    console.log('=== 测试完成 ===');
  } catch (error) {
    console.error('测试失败:', error.message);
    if (error.response) {
      console.error('响应状态:', error.response.status);
      console.error('响应数据:', JSON.stringify(error.response.data, null, 2));
    }
    process.exit(1);
  }
}

testStatistics();

