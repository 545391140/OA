/**
 * Amadeus SDK 实例共享模块
 * 确保所有模块使用相同的 SDK 实例和配置
 * 
 * 重要：SDK 自动管理 Token，但需要确保配置正确
 * SDK 会在首次 API 调用时自动获取 Token，并在过期前自动刷新
 */

const Amadeus = require('amadeus');
const config = require('../../config');
const logger = require('../../utils/logger');

// 统一的配置获取逻辑
const getAmadeusConfig = () => {
  const apiKey = process.env.AMADEUS_HOTEL_API_KEY || config.AMADEUS_API_KEY || process.env.AMADEUS_API_KEY;
  const apiSecret = process.env.AMADEUS_HOTEL_API_SECRET || config.AMADEUS_API_SECRET || process.env.AMADEUS_API_SECRET;
  const apiEnv = (config.AMADEUS_API_ENV || process.env.AMADEUS_API_ENV || 'test') === 'production' ? 'production' : 'test';

  // 验证配置
  if (!apiKey || !apiSecret) {
    logger.error('Amadeus API 配置缺失：请配置 AMADEUS_HOTEL_API_KEY/AMADEUS_API_KEY 和 AMADEUS_HOTEL_API_SECRET/AMADEUS_API_SECRET');
    throw new Error('Amadeus API 配置缺失');
  }

  return {
    clientId: apiKey,
    clientSecret: apiSecret,
    hostname: apiEnv === 'production' ? 'production' : 'test',
    // 可选：设置日志级别（用于调试）
    logLevel: process.env.NODE_ENV === 'development' ? 'debug' : 'warn',
    // 重要：确保 SDK 自动刷新 token
    // SDK 默认会在 token 过期前自动刷新，但我们可以显式设置
  };
};

// 创建共享的 SDK 实例
let amadeusInstance = null;
let initializationPromise = null;

/**
 * 初始化 SDK 实例并验证 Token
 * SDK 会在首次 API 调用时自动获取 Token
 */
const initializeSdk = async () => {
  if (amadeusInstance) {
    return amadeusInstance;
  }

  const sdkConfig = getAmadeusConfig();
  
  try {
    // 创建 SDK 实例
    amadeusInstance = new Amadeus(sdkConfig);
    
    logger.info('Amadeus SDK 实例已创建', {
      keyPrefix: sdkConfig.clientId.substring(0, 8) + '...',
      env: sdkConfig.hostname,
      logLevel: sdkConfig.logLevel,
    });

    // 可选：预获取 Token（SDK 会在首次调用时自动获取，但可以提前验证）
    // 注意：SDK 内部会自动处理 Token，这里只是验证配置是否正确
    try {
      // 使用一个简单的 API 调用来验证 Token 获取是否正常
      // 这里使用酒店搜索 API 来测试（使用一个常见的城市代码）
      await amadeusInstance.referenceData.locations.hotels.byCity.get({
        cityCode: 'NYC',
        hotelSource: 'ALL',
      }).catch(() => {
        // 忽略错误，这只是为了触发 Token 获取
        // 如果配置错误，会在实际调用时抛出错误
      });
      
      logger.debug('Amadeus SDK Token 验证完成');
    } catch (error) {
      // 如果预验证失败，记录警告但不阻止实例创建
      // Token 会在实际 API 调用时自动获取
      logger.warn('Amadeus SDK Token 预验证失败（将在首次 API 调用时自动获取）:', error.message);
    }

    return amadeusInstance;
  } catch (error) {
    logger.error('Amadeus SDK 初始化失败:', error);
    throw error;
  }
};

/**
 * 获取 SDK 实例（同步方式）
 * 注意：SDK 会在首次 API 调用时自动获取 Token
 */
const getAmadeusInstance = () => {
  if (!amadeusInstance) {
    const sdkConfig = getAmadeusConfig();
    amadeusInstance = new Amadeus(sdkConfig);
    logger.info('Amadeus SDK 实例已创建（同步）', {
      keyPrefix: sdkConfig.clientId.substring(0, 8) + '...',
      env: sdkConfig.hostname,
    });
  }
  return amadeusInstance;
};

/**
 * 获取 SDK 实例（异步方式，带 Token 验证）
 */
const getAmadeusInstanceAsync = async () => {
  if (initializationPromise) {
    return initializationPromise;
  }
  
  initializationPromise = initializeSdk();
  return initializationPromise;
};

/**
 * 重置实例（用于测试或重新配置）
 */
const resetInstance = () => {
  amadeusInstance = null;
  initializationPromise = null;
  logger.info('Amadeus SDK 实例已重置');
};

/**
 * 验证 SDK 配置和 Token（用于调试）
 */
const validateSdkConfig = async () => {
  try {
    const sdkConfig = getAmadeusConfig();
    const instance = getAmadeusInstance();
    
    // 尝试调用一个简单的 API 来验证 Token
    const response = await instance.referenceData.locations.hotels.byCity.get({
      cityCode: 'NYC',
      hotelSource: 'ALL',
    });
    
    logger.info('Amadeus SDK 配置验证成功', {
      hasData: !!response.data,
      dataCount: response.data?.length || 0,
    });
    
    return {
      success: true,
      message: 'SDK 配置和 Token 验证成功',
    };
  } catch (error) {
    logger.error('Amadeus SDK 配置验证失败:', error);
    return {
      success: false,
      message: error.message || 'SDK 配置验证失败',
      error: error,
    };
  }
};

module.exports = {
  getAmadeusInstance,
  getAmadeusInstanceAsync,
  getAmadeusConfig,
  resetInstance,
  validateSdkConfig,
};

