/**
 * 货币汇率换算工具（后端）
 * 差旅标准按CNY（人民币）维护，需要根据选择的币种进行换算
 */

const logger = require('./logger');

// 默认汇率（相对于CNY）- 作为后备方案
const DEFAULT_EXCHANGE_RATES = {
  CNY: 1.0,      // 基准货币
  USD: 0.14,     // 1 CNY = 0.14 USD (约7.14 CNY = 1 USD)
  JPY: 20.0,     // 1 CNY = 20 JPY (约0.05 CNY = 1 JPY)
  KRW: 180.0,    // 1 CNY = 180 KRW (约0.0056 CNY = 1 KRW)
  EUR: 0.13,     // 1 CNY = 0.13 EUR (约7.69 CNY = 1 EUR)
  GBP: 0.11      // 1 CNY = 0.11 GBP (约9.09 CNY = 1 GBP)
};

// 汇率缓存
let exchangeRatesCache = null;
let cacheTimestamp = null;
const CACHE_DURATION = 5 * 60 * 1000; // 5分钟缓存

/**
 * 从数据库加载汇率
 * @returns {Promise<object>} 汇率对象
 */
const loadExchangeRatesFromDB = async () => {
  try {
    const Currency = require('../models/Currency');
    const currencies = await Currency.find({ isActive: true })
      .select('code exchangeRate')
      .lean();

    const rates = { CNY: 1.0 }; // 确保CNY存在
    currencies.forEach(currency => {
      rates[currency.code] = currency.exchangeRate || 1.0;
    });

    exchangeRatesCache = rates;
    cacheTimestamp = Date.now();
    return rates;
  } catch (error) {
    logger.error('Failed to load exchange rates from database:', error);
    // 如果数据库加载失败，使用默认汇率
    return DEFAULT_EXCHANGE_RATES;
  }
};

/**
 * 获取汇率（优先从数据库，失败则使用默认值）
 * @param {boolean} forceRefresh - 是否强制刷新缓存
 * @returns {Promise<object>} 汇率对象
 */
const getExchangeRates = async (forceRefresh = false) => {
  // 如果缓存有效且不强制刷新，直接返回缓存
  if (!forceRefresh && exchangeRatesCache && cacheTimestamp) {
    const now = Date.now();
    if (now - cacheTimestamp < CACHE_DURATION) {
      return exchangeRatesCache;
    }
  }

  // 从数据库加载
  return await loadExchangeRatesFromDB();
};

/**
 * 从CNY转换为目标币种（同步版本，使用缓存的汇率）
 * @param {number} amountCNY - 人民币金额
 * @param {string} targetCurrency - 目标币种代码
 * @param {object} customRates - 自定义汇率（可选，如果提供则优先使用）
 * @returns {number} 转换后的金额
 */
const convertFromCNYSync = (amountCNY, targetCurrency, customRates = null) => {
  if (!amountCNY || amountCNY === 0) return 0;
  if (!targetCurrency) return amountCNY;
  
  // 如果提供了自定义汇率，直接使用
  if (customRates) {
    const currencyUpper = targetCurrency.toUpperCase();
    const rate = customRates[currencyUpper];
    
    if (!rate) {
      logger.warn(`Exchange rate not found for currency: ${targetCurrency}, using CNY amount`);
      return amountCNY;
    }
    
    if (currencyUpper === 'CNY') {
      return amountCNY;
    }
    
    const converted = amountCNY * rate;
    return Math.round(converted * 100) / 100;
  }
  
  // 使用缓存的汇率或默认汇率
  const rates = exchangeRatesCache || DEFAULT_EXCHANGE_RATES;
  const currencyUpper = targetCurrency.toUpperCase();
  const rate = rates[currencyUpper];
  
  if (!rate) {
    logger.warn(`Exchange rate not found for currency: ${targetCurrency}, using CNY amount`);
    return amountCNY;
  }
  
  if (currencyUpper === 'CNY') {
    return amountCNY;
  }
  
  const converted = amountCNY * rate;
  return Math.round(converted * 100) / 100;
};

/**
 * 从CNY转换为目标币种（异步版本，从数据库获取最新汇率）
 * @param {number} amountCNY - 人民币金额
 * @param {string} targetCurrency - 目标币种代码
 * @param {object} customRates - 自定义汇率（可选，如果提供则优先使用）
 * @returns {Promise<number>|number} 转换后的金额（如果customRates提供则同步返回，否则异步返回）
 */
const convertFromCNY = async (amountCNY, targetCurrency, customRates = null) => {
  if (!amountCNY || amountCNY === 0) return 0;
  if (!targetCurrency) return amountCNY;
  
  // 如果提供了自定义汇率，直接使用（同步）
  if (customRates) {
    const currencyUpper = targetCurrency.toUpperCase();
    const rate = customRates[currencyUpper];
    
    if (!rate) {
      logger.warn(`Exchange rate not found for currency: ${targetCurrency}, using CNY amount`);
      return amountCNY;
    }
    
    if (currencyUpper === 'CNY') {
      return amountCNY;
    }
    
    const converted = amountCNY * rate;
    return Math.round(converted * 100) / 100;
  }
  
  // 否则从数据库获取汇率（异步）
  const rates = await getExchangeRates();
  const currencyUpper = targetCurrency.toUpperCase();
  const rate = rates[currencyUpper];
  
  if (!rate) {
    logger.warn(`Exchange rate not found for currency: ${targetCurrency}, using CNY amount`);
    return amountCNY;
  }
  
  // 如果目标币种是CNY，直接返回
  if (currencyUpper === 'CNY') {
    return amountCNY;
  }
  
  // 转换为目标币种
  const converted = amountCNY * rate;
  
  // 保留2位小数
  return Math.round(converted * 100) / 100;
};

/**
 * 从目标币种转换为CNY（同步版本，使用缓存的汇率）
 * @param {number} amount - 金额
 * @param {string} sourceCurrency - 源币种代码
 * @param {object} customRates - 自定义汇率（可选，如果提供则优先使用）
 * @returns {number} 人民币金额
 */
const convertToCNYSync = (amount, sourceCurrency, customRates = null) => {
  if (!amount || amount === 0) return 0;
  if (!sourceCurrency) return amount;
  
  // 如果提供了自定义汇率，直接使用
  if (customRates) {
    const currencyUpper = sourceCurrency.toUpperCase();
    const rate = customRates[currencyUpper];
    
    if (!rate) {
      logger.warn(`Exchange rate not found for currency: ${sourceCurrency}, using original amount`);
      return amount;
    }
    
    if (currencyUpper === 'CNY') {
      return amount;
    }
    
    const converted = amount / rate;
    return Math.round(converted * 100) / 100;
  }
  
  // 使用缓存的汇率或默认汇率
  const rates = exchangeRatesCache || DEFAULT_EXCHANGE_RATES;
  const currencyUpper = sourceCurrency.toUpperCase();
  const rate = rates[currencyUpper];
  
  if (!rate) {
    logger.warn(`Exchange rate not found for currency: ${sourceCurrency}, using original amount`);
    return amount;
  }
  
  if (currencyUpper === 'CNY') {
    return amount;
  }
  
  const converted = amount / rate;
  return Math.round(converted * 100) / 100;
};

/**
 * 从目标币种转换为CNY（异步版本，从数据库获取最新汇率）
 * @param {number} amount - 金额
 * @param {string} sourceCurrency - 源币种代码
 * @param {object} customRates - 自定义汇率（可选，如果提供则优先使用）
 * @returns {Promise<number>|number} 人民币金额（如果customRates提供则同步返回，否则异步返回）
 */
const convertToCNY = async (amount, sourceCurrency, customRates = null) => {
  if (!amount || amount === 0) return 0;
  if (!sourceCurrency) return amount;
  
  // 如果提供了自定义汇率，直接使用（同步）
  if (customRates) {
    const currencyUpper = sourceCurrency.toUpperCase();
    const rate = customRates[currencyUpper];
    
    if (!rate) {
      logger.warn(`Exchange rate not found for currency: ${sourceCurrency}, using original amount`);
      return amount;
    }
    
    if (currencyUpper === 'CNY') {
      return amount;
    }
    
    const converted = amount / rate;
    return Math.round(converted * 100) / 100;
  }
  
  // 否则从数据库获取汇率（异步）
  const rates = await getExchangeRates();
  const currencyUpper = sourceCurrency.toUpperCase();
  const rate = rates[currencyUpper];
  
  if (!rate) {
    logger.warn(`Exchange rate not found for currency: ${sourceCurrency}, using original amount`);
    return amount;
  }
  
  // 如果源币种是CNY，直接返回
  if (currencyUpper === 'CNY') {
    return amount;
  }
  
  // 转换为CNY
  const converted = amount / rate;
  
  // 保留2位小数
  return Math.round(converted * 100) / 100;
};

/**
 * 获取汇率
 * @param {string} currency - 币种代码
 * @param {object} customRates - 自定义汇率（可选，如果提供则优先使用）
 * @returns {Promise<number>|number} 汇率（相对于CNY）（如果customRates提供则同步返回，否则异步返回）
 */
const getExchangeRate = async (currency, customRates = null) => {
  if (customRates) {
    return customRates[currency.toUpperCase()] || 1.0;
  }
  
  const rates = await getExchangeRates();
  return rates[currency.toUpperCase()] || 1.0;
};

/**
 * 刷新汇率缓存
 * @returns {Promise<object>} 更新后的汇率对象
 */
const refreshExchangeRates = async () => {
  return await loadExchangeRatesFromDB();
};

/**
 * 获取默认汇率对象（后备方案）
 * @returns {object} 默认汇率对象
 */
const getDefaultRates = () => {
  return { ...DEFAULT_EXCHANGE_RATES };
};

module.exports = {
  convertFromCNY,      // 异步版本
  convertFromCNYSync,   // 同步版本（使用缓存）
  convertToCNY,         // 异步版本
  convertToCNYSync,     // 同步版本（使用缓存）
  getExchangeRate,
  getExchangeRates,
  refreshExchangeRates,
  getDefaultRates
};

