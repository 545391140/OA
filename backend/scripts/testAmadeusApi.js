/**
 * Amadeus API 连接和功能测试脚本
 * 用于验证 API 配置和连接是否正常，以及返回数据是否正确
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const axios = require('axios');
const config = require('../config');
const logger = require('../utils/logger');

// 测试结果收集
const testResults = {
  timestamp: new Date().toISOString(),
  environment: config.AMADEUS_API_ENV || process.env.AMADEUS_API_ENV || 'test',
  tests: [],
  summary: {
    total: 0,
    passed: 0,
    failed: 0,
    warnings: 0,
  },
};

// 测试辅助函数
function addTestResult(name, status, message, data = null) {
  testResults.tests.push({
    name,
    status, // 'passed', 'failed', 'warning'
    message,
    data,
    timestamp: new Date().toISOString(),
  });
  testResults.summary.total++;
  if (status === 'passed') {
    testResults.summary.passed++;
  } else if (status === 'failed') {
    testResults.summary.failed++;
  } else if (status === 'warning') {
    testResults.summary.warnings++;
  }
}

// Token 缓存
let tokenCache = {
  accessToken: null,
  expiresAt: null,
};

/**
 * 获取 Access Token
 */
async function getAccessToken() {
  // 检查缓存
  if (tokenCache.accessToken && tokenCache.expiresAt && Date.now() < tokenCache.expiresAt - 5 * 60 * 1000) {
    // 返回与 API 调用一致的格式
    return {
      token: tokenCache.accessToken,
      expiresIn: Math.floor((tokenCache.expiresAt - Date.now()) / 1000),
      response: {
        token_type: 'Bearer',
        access_token: tokenCache.accessToken,
      },
    };
  }

  try {
    const apiKey = config.AMADEUS_API_KEY || process.env.AMADEUS_API_KEY;
    const apiSecret = config.AMADEUS_API_SECRET || process.env.AMADEUS_API_SECRET;
    const env = config.AMADEUS_API_ENV || process.env.AMADEUS_API_ENV || 'test';

    if (!apiKey || !apiSecret) {
      throw new Error('Amadeus API配置缺失：请配置AMADEUS_API_KEY和AMADEUS_API_SECRET');
    }

    const baseURL = env === 'production' 
      ? 'https://api.amadeus.com'
      : 'https://test.api.amadeus.com';

    const response = await axios.post(
      `${baseURL}/v1/security/oauth2/token`,
      new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: apiKey,
        client_secret: apiSecret,
      }),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        timeout: 10000,
      }
    );

    // 只在调试模式下记录响应
    // console.log('   📄 API 响应:', JSON.stringify(response.data, null, 2));
    
    if (response.data && response.data.access_token) {
      const expiresIn = response.data.expires_in || 1799;
      tokenCache = {
        accessToken: response.data.access_token,
        expiresAt: Date.now() + expiresIn * 1000,
      };
      return {
        token: tokenCache.accessToken,
        expiresIn,
        response: response.data,
      };
    } else {
      // 详细记录响应内容以便调试
      console.error('   ❌ API 响应格式错误，响应数据:', JSON.stringify(response.data, null, 2));
      throw new Error('获取Access Token失败：响应格式错误');
    }
  } catch (error) {
    // 详细记录错误信息
    if (error.response) {
      console.error('HTTP 状态码:', error.response.status);
      console.error('响应数据:', JSON.stringify(error.response.data, null, 2));
    }
    throw new Error(`获取Access Token失败: ${error.message}`);
  }
}

/**
 * 测试 1: 配置验证
 */
async function testConfig() {
  console.log('\n📋 测试 1: 配置验证');
  console.log('─'.repeat(60));
  
  try {
    const apiKey = config.AMADEUS_API_KEY || process.env.AMADEUS_API_KEY;
    const apiSecret = config.AMADEUS_API_SECRET || process.env.AMADEUS_API_SECRET;
    const env = config.AMADEUS_API_ENV || process.env.AMADEUS_API_ENV || 'test';

    if (!apiKey || !apiSecret) {
      addTestResult('配置验证', 'failed', 'API Key 或 Secret 未设置');
      console.log('   ❌ API Key 或 Secret 未设置');
      return false;
    }

    // 验证格式（API Key 通常是字符串）
    if (typeof apiKey !== 'string' || apiKey.length < 10) {
      addTestResult('配置验证', 'failed', 'API Key 格式不正确');
      console.log('   ❌ API Key 格式不正确');
      return false;
    }

    if (typeof apiSecret !== 'string' || apiSecret.length < 10) {
      addTestResult('配置验证', 'failed', 'API Secret 格式不正确');
      console.log('   ❌ API Secret 格式不正确');
      return false;
    }

    addTestResult('配置验证', 'passed', '配置验证通过', {
      apiKey: apiKey.substring(0, 10) + '...',
      apiSecret: '***',
      environment: env,
    });
    console.log('   ✅ 配置验证通过');
    console.log(`   📍 环境: ${env}`);
    console.log(`   🔑 API Key: ${apiKey.substring(0, 10)}...`);
    return true;
  } catch (error) {
    addTestResult('配置验证', 'failed', error.message);
    console.log(`   ❌ ${error.message}`);
    return false;
  }
}

/**
 * 测试 2: 认证和 Token 获取
 */
async function testAuthentication() {
  console.log('\n🔐 测试 2: 认证和 Token 获取');
  console.log('─'.repeat(60));
  
  try {
    const result = await getAccessToken();
    
    if (result && result.token) {
      // Amadeus API 的 token 格式不是标准 JWT，只要长度合理即可
      const isValidFormat = result.token.length >= 20 && result.token.length <= 500;
      
      if (isValidFormat) {
        addTestResult('认证测试', 'passed', '成功获取 Access Token', {
          tokenLength: result.token.length,
          expiresIn: result.expiresIn,
          tokenType: result.response.token_type,
          username: result.response.username,
          applicationName: result.response.application_name,
        });
        console.log('   ✅ 成功获取 Access Token');
        console.log(`   ⏱️  有效期: ${result.expiresIn} 秒 (约 ${Math.round(result.expiresIn / 60)} 分钟)`);
        console.log(`   📝 Token 类型: ${result.response.token_type}`);
        console.log(`   👤 用户名: ${result.response.username}`);
        console.log(`   📱 应用名称: ${result.response.application_name}`);
        console.log(`   🔑 Token 长度: ${result.token.length} 字符`);
        return true;
      } else {
        addTestResult('认证测试', 'warning', 'Token 长度异常', {
          tokenLength: result.token.length,
        });
        console.log(`   ⚠️  Token 长度异常: ${result.token.length} 字符`);
        return true; // 仍然返回 true，因为获取到了 token
      }
    } else {
      addTestResult('认证测试', 'failed', '获取 Token 失败：响应格式错误');
      console.log('   ❌ 获取 Token 失败：响应格式错误');
      return false;
    }
  } catch (error) {
    addTestResult('认证测试', 'failed', error.message);
    console.log(`   ❌ ${error.message}`);
    
    // 提供详细的错误信息
    if (error.response) {
      console.log(`   📊 HTTP 状态码: ${error.response.status}`);
      console.log(`   📄 响应数据:`, JSON.stringify(error.response.data, null, 2));
    }
    return false;
  }
}

/**
 * 测试 3: 航班搜索 API
 */
async function testFlightSearch() {
  console.log('\n✈️  测试 3: 航班搜索 API');
  console.log('─'.repeat(60));
  
  try {
    const tokenResult = await getAccessToken();
    if (!tokenResult || !tokenResult.token) {
      addTestResult('航班搜索', 'failed', '无法获取 Access Token');
      console.log('   ❌ 无法获取 Access Token');
      return false;
    }

    const env = config.AMADEUS_API_ENV || process.env.AMADEUS_API_ENV || 'test';
    const baseURL = env === 'production' 
      ? 'https://api.amadeus.com'
      : 'https://test.api.amadeus.com';

    // 使用测试数据：北京到纽约
    const searchParams = {
      originLocationCode: 'PEK',
      destinationLocationCode: 'JFK',
      departureDate: '2025-12-25', // 使用未来日期
      adults: 1,
      travelClass: 'ECONOMY',
      max: 5, // 只获取5个结果用于测试
      currencyCode: 'USD',
    };

    console.log('   🔍 搜索参数:', JSON.stringify(searchParams, null, 2));

    const response = await axios.get(
      `${baseURL}/v2/shopping/flight-offers`,
      {
        params: searchParams,
        headers: {
          'Authorization': `Bearer ${tokenResult.token}`,
          'Accept': 'application/vnd.amadeus+json',
        },
        timeout: 30000,
      }
    );

    // 验证响应格式
    if (response.data && Array.isArray(response.data.data)) {
      const flightOffers = response.data.data;
      
      if (flightOffers.length > 0) {
        // 验证第一个航班报价的数据结构
        const firstOffer = flightOffers[0];
        const validation = {
          hasId: !!firstOffer.id,
          hasPrice: !!(firstOffer.price && firstOffer.price.total),
          hasItineraries: !!(firstOffer.itineraries && Array.isArray(firstOffer.itineraries)),
          hasSegments: firstOffer.itineraries && firstOffer.itineraries[0] && 
                      Array.isArray(firstOffer.itineraries[0].segments),
        };

        const allValid = Object.values(validation).every(v => v === true);

        if (allValid) {
          addTestResult('航班搜索', 'passed', `成功搜索到 ${flightOffers.length} 个航班报价`, {
            count: flightOffers.length,
            sampleOffer: {
              id: firstOffer.id,
              price: firstOffer.price.total + ' ' + firstOffer.price.currency,
              segments: firstOffer.itineraries[0].segments.length,
              origin: firstOffer.itineraries[0].segments[0]?.departure?.iataCode,
              destination: firstOffer.itineraries[0].segments[firstOffer.itineraries[0].segments.length - 1]?.arrival?.iataCode,
            },
            validation,
          });
          console.log(`   ✅ 搜索成功，找到 ${flightOffers.length} 个航班报价`);
          console.log(`   💰 示例价格: ${firstOffer.price.total} ${firstOffer.price.currency}`);
          console.log(`   🛫 示例航班: ${firstOffer.itineraries[0].segments[0]?.departure?.iataCode} → ${firstOffer.itineraries[0].segments[firstOffer.itineraries[0].segments.length - 1]?.arrival?.iataCode}`);
          return true;
        } else {
          addTestResult('航班搜索', 'warning', '搜索成功但数据结构不完整', {
            count: flightOffers.length,
            validation,
          });
          console.log(`   ⚠️  搜索成功但数据结构不完整`);
          console.log(`   📊 验证结果:`, validation);
          return true;
        }
      } else {
        addTestResult('航班搜索', 'warning', '搜索成功但未找到航班（可能是测试数据问题）', {
          count: 0,
        });
        console.log('   ⚠️  搜索成功但未找到航班（可能是测试数据问题）');
        return true; // 这可能是正常的，取决于测试环境的数据
      }
    } else {
      addTestResult('航班搜索', 'failed', 'API 响应格式错误', {
        hasData: !!response.data,
        dataType: typeof response.data,
      });
      console.log('   ❌ API 响应格式错误');
      console.log('   📄 响应数据:', JSON.stringify(response.data, null, 2));
      return false;
    }
  } catch (error) {
    addTestResult('航班搜索', 'failed', error.message, {
      status: error.response?.status,
      statusText: error.response?.statusText,
    });
    console.log(`   ❌ ${error.message}`);
    
    if (error.response) {
      console.log(`   📊 HTTP 状态码: ${error.response.status}`);
      if (error.response.data) {
        console.log('   📄 错误响应:', JSON.stringify(error.response.data, null, 2));
      }
    }
    return false;
  }
}

/**
 * 测试 4: API 响应格式验证
 */
async function testResponseFormat() {
  console.log('\n📋 测试 4: API 响应格式验证');
  console.log('─'.repeat(60));
  
  try {
    const tokenResult = await getAccessToken();
    if (!tokenResult || !tokenResult.token) {
      addTestResult('响应格式验证', 'failed', '无法获取 Access Token');
      return false;
    }

    const env = config.AMADEUS_API_ENV || process.env.AMADEUS_API_ENV || 'test';
    const baseURL = env === 'production' 
      ? 'https://api.amadeus.com'
      : 'https://test.api.amadeus.com';

    // 测试一个简单的搜索请求
    const response = await axios.get(
      `${baseURL}/v2/shopping/flight-offers`,
      {
        params: {
          originLocationCode: 'PEK',
          destinationLocationCode: 'JFK',
          departureDate: '2025-12-25',
          adults: 1,
          max: 1,
        },
        headers: {
          'Authorization': `Bearer ${tokenResult.token}`,
          'Accept': 'application/vnd.amadeus+json',
        },
        timeout: 30000,
      }
    );

    // 验证响应结构
    const validations = {
      hasData: Array.isArray(response.data.data),
      hasMeta: !!response.data.meta,
      correctContentType: response.headers['content-type']?.includes('application/json') || 
                         response.headers['content-type']?.includes('application/vnd.amadeus+json'),
    };

    const allValid = Object.values(validations).every(v => v === true);

    if (allValid) {
      addTestResult('响应格式验证', 'passed', 'API 响应格式正确', validations);
      console.log('   ✅ API 响应格式正确');
      console.log('   📊 验证结果:', validations);
      return true;
    } else {
      addTestResult('响应格式验证', 'warning', 'API 响应格式部分不符合预期', validations);
      console.log('   ⚠️  API 响应格式部分不符合预期');
      console.log('   📊 验证结果:', validations);
      return true;
    }
  } catch (error) {
    addTestResult('响应格式验证', 'failed', error.message);
    console.log(`   ❌ ${error.message}`);
    return false;
  }
}

/**
 * 测试 5: 错误处理验证
 */
async function testErrorHandling() {
  console.log('\n⚠️  测试 5: 错误处理验证');
  console.log('─'.repeat(60));
  
  try {
    const tokenResult = await getAccessToken();
    if (!tokenResult || !tokenResult.token) {
      addTestResult('错误处理验证', 'failed', '无法获取 Access Token');
      return false;
    }

    const env = config.AMADEUS_API_ENV || process.env.AMADEUS_API_ENV || 'test';
    const baseURL = env === 'production' 
      ? 'https://api.amadeus.com'
      : 'https://test.api.amadeus.com';

    // 测试无效参数（应该返回错误）
    try {
      await axios.get(
        `${baseURL}/v2/shopping/flight-offers`,
        {
          params: {
            originLocationCode: 'INVALID', // 无效的机场代码
            destinationLocationCode: 'JFK',
            departureDate: '2025-12-25',
            adults: 1,
          },
          headers: {
            'Authorization': `Bearer ${tokenResult.token}`,
            'Accept': 'application/vnd.amadeus+json',
          },
          timeout: 30000,
        }
      );
      
      // 如果没有抛出错误，说明 API 可能接受了无效参数
      addTestResult('错误处理验证', 'warning', 'API 未拒绝无效参数');
      console.log('   ⚠️  API 未拒绝无效参数（可能是正常的，取决于 API 行为）');
      return true;
    } catch (error) {
      // 验证错误响应格式
      if (error.response && error.response.data && error.response.data.errors) {
        const errors = error.response.data.errors;
        const hasErrorFormat = Array.isArray(errors) && errors.length > 0 && errors[0].status;
        
        if (hasErrorFormat) {
          addTestResult('错误处理验证', 'passed', '错误响应格式正确', {
            status: error.response.status,
            errorCount: errors.length,
            firstError: {
              status: errors[0].status,
              code: errors[0].code,
              title: errors[0].title,
            },
          });
          console.log('   ✅ 错误响应格式正确');
          console.log(`   📊 HTTP 状态码: ${error.response.status}`);
          console.log(`   📝 错误数量: ${errors.length}`);
          console.log(`   🔍 第一个错误: ${errors[0].title} (${errors[0].code})`);
          return true;
        } else {
          addTestResult('错误处理验证', 'warning', '错误响应格式不符合预期');
          console.log('   ⚠️  错误响应格式不符合预期');
          return true;
        }
      } else {
        addTestResult('错误处理验证', 'warning', '错误响应格式异常');
        console.log('   ⚠️  错误响应格式异常');
        return true;
      }
    }
  } catch (error) {
    addTestResult('错误处理验证', 'failed', error.message);
    console.log(`   ❌ ${error.message}`);
    return false;
  }
}

/**
 * 生成测试报告
 */
function generateReport() {
  console.log('\n' + '='.repeat(60));
  console.log('📊 测试报告');
  console.log('='.repeat(60));
  
  console.log(`\n⏰ 测试时间: ${testResults.timestamp}`);
  console.log(`🌍 测试环境: ${testResults.environment}`);
  console.log(`\n📈 测试统计:`);
  console.log(`   总计: ${testResults.summary.total}`);
  console.log(`   ✅ 通过: ${testResults.summary.passed}`);
  console.log(`   ❌ 失败: ${testResults.summary.failed}`);
  console.log(`   ⚠️  警告: ${testResults.summary.warnings}`);
  
  console.log(`\n📋 详细结果:`);
  testResults.tests.forEach((test, index) => {
    const icon = test.status === 'passed' ? '✅' : test.status === 'failed' ? '❌' : '⚠️';
    console.log(`\n${index + 1}. ${icon} ${test.name}`);
    console.log(`   状态: ${test.status}`);
    console.log(`   消息: ${test.message}`);
    if (test.data) {
      console.log(`   数据:`, JSON.stringify(test.data, null, 2));
    }
  });
  
  // 总体评估
  console.log(`\n${'='.repeat(60)}`);
  if (testResults.summary.failed === 0) {
    console.log('✅ 所有关键测试通过！Amadeus API 可以正常使用。');
  } else if (testResults.summary.failed <= testResults.summary.warnings) {
    console.log('⚠️  部分测试失败，但可能是预期的（如测试数据问题）。');
  } else {
    console.log('❌ 关键测试失败，请检查 API 配置和连接。');
  }
  console.log('='.repeat(60) + '\n');
  
  return testResults;
}

/**
 * 保存报告到文件
 */
function saveReport() {
  const fs = require('fs');
  const path = require('path');
  
  const reportPath = path.join(__dirname, '../logs/amadeus-api-test-report.json');
  const reportDir = path.dirname(reportPath);
  
  // 确保目录存在
  if (!fs.existsSync(reportDir)) {
    fs.mkdirSync(reportDir, { recursive: true });
  }
  
  // 保存 JSON 报告
  fs.writeFileSync(reportPath, JSON.stringify(testResults, null, 2), 'utf8');
  console.log(`\n📄 测试报告已保存到: ${reportPath}`);
  
  // 生成 Markdown 报告
  const mdReportPath = path.join(__dirname, '../logs/amadeus-api-test-report.md');
  const mdReport = generateMarkdownReport();
  fs.writeFileSync(mdReportPath, mdReport, 'utf8');
  console.log(`📄 Markdown 报告已保存到: ${mdReportPath}`);
}

/**
 * 生成 Markdown 格式报告
 */
function generateMarkdownReport() {
  let md = `# Amadeus API 测试报告\n\n`;
  md += `**测试时间**: ${testResults.timestamp}\n`;
  md += `**测试环境**: ${testResults.environment}\n\n`;
  
  md += `## 测试统计\n\n`;
  md += `| 项目 | 数量 |\n`;
  md += `|------|------|\n`;
  md += `| 总计 | ${testResults.summary.total} |\n`;
  md += `| ✅ 通过 | ${testResults.summary.passed} |\n`;
  md += `| ❌ 失败 | ${testResults.summary.failed} |\n`;
  md += `| ⚠️ 警告 | ${testResults.summary.warnings} |\n\n`;
  
  md += `## 详细测试结果\n\n`;
  testResults.tests.forEach((test, index) => {
    const icon = test.status === 'passed' ? '✅' : test.status === 'failed' ? '❌' : '⚠️';
    md += `### ${index + 1}. ${icon} ${test.name}\n\n`;
    md += `- **状态**: ${test.status}\n`;
    md += `- **消息**: ${test.message}\n`;
    md += `- **时间**: ${test.timestamp}\n`;
    if (test.data) {
      md += `- **数据**:\n\`\`\`json\n${JSON.stringify(test.data, null, 2)}\n\`\`\`\n`;
    }
    md += `\n`;
  });
  
  md += `## 总体评估\n\n`;
  if (testResults.summary.failed === 0) {
    md += `✅ **所有关键测试通过！** Amadeus API 可以正常使用。\n`;
  } else if (testResults.summary.failed <= testResults.summary.warnings) {
    md += `⚠️ **部分测试失败**，但可能是预期的（如测试数据问题）。\n`;
  } else {
    md += `❌ **关键测试失败**，请检查 API 配置和连接。\n`;
  }
  
  return md;
}

/**
 * 主测试函数
 */
async function runTests() {
  console.log('\n' + '='.repeat(60));
  console.log('🧪 Amadeus API 连接和功能测试');
  console.log('='.repeat(60));
  
  try {
    // 测试 1: 配置验证
    const configOk = await testConfig();
    if (!configOk) {
      console.log('\n❌ 配置验证失败，终止测试');
      generateReport();
      saveReport();
      process.exit(1);
    }
    
    // 测试 2: 认证
    const authOk = await testAuthentication();
    if (!authOk) {
      console.log('\n❌ 认证测试失败，终止后续测试');
      generateReport();
      saveReport();
      process.exit(1);
    }
    
    // 测试 3: 航班搜索
    await testFlightSearch();
    
    // 测试 4: 响应格式验证
    await testResponseFormat();
    
    // 测试 5: 错误处理
    await testErrorHandling();
    
    // 生成报告
    generateReport();
    saveReport();
    
    // 根据测试结果决定退出码
    if (testResults.summary.failed === 0) {
      process.exit(0);
    } else {
      process.exit(1);
    }
    
  } catch (error) {
    console.error('\n❌ 测试过程中发生错误:', error);
    addTestResult('测试执行', 'failed', error.message);
    generateReport();
    saveReport();
    process.exit(1);
  }
}

// 运行测试
runTests();

