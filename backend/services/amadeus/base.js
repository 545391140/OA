/**
 * Amadeus API 基础模块
 * 负责配置验证、认证、Token 管理
 */

const axios = require('axios');
const logger = require('../../utils/logger');
const config = require('../../config');

// Token 缓存
let tokenCache = {
  accessToken: null,
  expiresAt: null,
};

/**
 * 验证 API 配置
 */
async function validateConfig() {
  const apiKey = config.AMADEUS_API_KEY || process.env.AMADEUS_API_KEY;
  const apiSecret = config.AMADEUS_API_SECRET || process.env.AMADEUS_API_SECRET;
  
  if (!apiKey || !apiSecret) {
    throw new Error('Amadeus API 配置缺失：请设置 AMADEUS_API_KEY 和 AMADEUS_API_SECRET');
  }
  
  logger.info('Amadeus API 配置验证通过');
  return true;
}

/**
 * 测试 API 连接
 */
async function testConnection() {
  try {
    logger.info('正在测试 Amadeus API 连接...');
    const token = await getAccessToken();
    
    if (token) {
      logger.info('✅ Amadeus API 连接测试成功');
      return {
        success: true,
        message: 'Amadeus API 连接正常',
        environment: config.AMADEUS_API_ENV || 'test',
      };
    } else {
      throw new Error('获取 Access Token 失败');
    }
  } catch (error) {
    logger.error('❌ Amadeus API 连接测试失败:', error.message);
    throw new Error(`Amadeus API 连接测试失败: ${error.message}`);
  }
}

/**
 * 获取 Access Token
 * Token 有效期：1799秒（约30分钟），需要缓存并自动刷新
 * 参考：https://developers.amadeus.com/self-service/apis-docs/guides/developer-guides/authorization-262
 */
async function getAccessToken() {
  // 检查缓存是否有效（提前5分钟刷新）
  if (tokenCache.accessToken && tokenCache.expiresAt && Date.now() < tokenCache.expiresAt - 5 * 60 * 1000) {
    return tokenCache.accessToken;
  }

  try {
    const apiKey = config.AMADEUS_API_KEY || process.env.AMADEUS_API_KEY;
    const apiSecret = config.AMADEUS_API_SECRET || process.env.AMADEUS_API_SECRET;
    const env = config.AMADEUS_API_ENV || process.env.AMADEUS_API_ENV || 'test';

    if (!apiKey || !apiSecret) {
      throw new Error('Amadeus API配置缺失：请配置AMADEUS_API_KEY和AMADEUS_API_SECRET');
    }

    const baseURL = getBaseURL();

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

    if (response.data && response.data.access_token) {
      const expiresIn = response.data.expires_in || 1799;
      tokenCache = {
        accessToken: response.data.access_token,
        expiresAt: Date.now() + expiresIn * 1000,
      };
      logger.debug('Amadeus Access Token获取成功');
      return tokenCache.accessToken;
    } else {
      throw new Error('获取Access Token失败：响应格式错误');
    }
  } catch (error) {
    logger.error('获取Amadeus Access Token失败:', error.message);
    if (error.response) {
      logger.error('API响应:', JSON.stringify(error.response.data, null, 2));
    }
    throw new Error(`获取Amadeus Access Token失败: ${error.message}`);
  }
}

/**
 * 刷新 Access Token
 */
async function refreshAccessToken() {
  tokenCache = { accessToken: null, expiresAt: null };
  return await getAccessToken();
}

/**
 * 获取 API 基础 URL
 */
function getBaseURL() {
  const env = config.AMADEUS_API_ENV || process.env.AMADEUS_API_ENV || 'test';
  return env === 'production'
    ? 'https://api.amadeus.com'
    : 'https://test.api.amadeus.com';
}

module.exports = {
  validateConfig,
  testConnection,
  getAccessToken,
  refreshAccessToken,
  getBaseURL,
};

