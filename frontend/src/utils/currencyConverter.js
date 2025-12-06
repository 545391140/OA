/**
 * 货币汇率换算工具
 * 差旅标准按CNY（人民币）维护，需要根据选择的币种进行换算
 */

import apiClient from './axiosConfig';

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
let exchangeRatesCacheTimestamp = null;
const EXCHANGE_RATES_CACHE_DURATION = 5 * 60 * 1000; // 5分钟缓存

/**
 * 从API获取汇率
 * @param {boolean} forceRefresh - 是否强制刷新
 * @returns {Promise<object>} 汇率对象
 */
export const fetchExchangeRates = async (forceRefresh = false) => {
  // 如果缓存有效且不强制刷新，直接返回缓存
  if (!forceRefresh && exchangeRatesCache && exchangeRatesCacheTimestamp) {
    const now = Date.now();
    if (now - exchangeRatesCacheTimestamp < EXCHANGE_RATES_CACHE_DURATION) {
      return exchangeRatesCache;
    }
  }

  try {
    const response = await apiClient.get('/currencies/exchange-rates');
    
    if (response.data && response.data.success && response.data.data) {
      const rates = { CNY: 1.0, ...response.data.data }; // 确保CNY存在
      exchangeRatesCache = rates;
      exchangeRatesCacheTimestamp = Date.now();
      return rates;
    }
    
    // 如果API失败，返回默认汇率
    return DEFAULT_EXCHANGE_RATES;
  } catch (error) {
    // 静默处理错误，401错误（未授权）是正常的
    if (process.env.NODE_ENV === 'development' && error.response?.status !== 401) {
      console.warn('Failed to fetch exchange rates from API, using default rates:', error.message || error);
    }
    // API失败时返回默认汇率
    return DEFAULT_EXCHANGE_RATES;
  }
};

/**
 * 获取汇率（同步版本，使用缓存或默认值）
 * @returns {object} 汇率对象
 */
const getExchangeRatesSync = () => {
  return exchangeRatesCache || DEFAULT_EXCHANGE_RATES;
};

/**
 * 从CNY转换为目标币种（高精度版本）
 * @param {number} amountCNY - 人民币金额
 * @param {string} targetCurrency - 目标币种代码
 * @param {object} customRates - 自定义汇率（可选）
 * @param {boolean} roundResult - 是否四舍五入结果，默认true
 * @returns {number} 转换后的金额
 */
export const convertFromCNY = (amountCNY, targetCurrency, customRates = null, roundResult = true) => {
  if (!amountCNY || amountCNY === 0) return 0;
  if (!targetCurrency) return amountCNY;
  
  const rates = customRates || getExchangeRatesSync();
  const rate = rates[targetCurrency.toUpperCase()];
  
  if (!rate) {
    console.warn(`Exchange rate not found for currency: ${targetCurrency}, using CNY amount`);
    return amountCNY;
  }
  
  // 如果目标币种是CNY，直接返回
  if (targetCurrency.toUpperCase() === 'CNY') {
    return amountCNY;
  }
  
  // 使用更高精度的计算（避免浮点数误差）
  // 使用整数运算减少精度损失：先转换为整数（乘以1000000），计算后再转换回小数
  // 这样可以保留更多小数位数，减少精度损失
  const amountInt = Math.round(amountCNY * 1000000); // 转换为整数（保留6位小数精度）
  const rateInt = Math.round(rate * 1000000); // 汇率也转换为整数
  const convertedInt = Math.round((amountInt * rateInt) / 1000000); // 整数运算，结果需要除以1000000
  const converted = convertedInt / 1000000; // 转换回小数
  
  // 只在最后显示时才四舍五入，中间计算保持高精度
  if (roundResult) {
    // 保留2位小数
    return Math.round(converted * 100) / 100;
  }
  
  return converted;
};

/**
 * 从目标币种转换为CNY（高精度版本）
 * @param {number} amount - 金额
 * @param {string} sourceCurrency - 源币种代码
 * @param {object} customRates - 自定义汇率（可选）
 * @param {boolean} roundResult - 是否四舍五入结果，默认false（中间计算保持高精度）
 * @returns {number} 人民币金额
 */
export const convertToCNY = (amount, sourceCurrency, customRates = null, roundResult = false) => {
  if (!amount || amount === 0) return 0;
  if (!sourceCurrency) return amount;
  
  const rates = customRates || getExchangeRatesSync();
  const rate = rates[sourceCurrency.toUpperCase()];
  
  if (!rate) {
    console.warn(`Exchange rate not found for currency: ${sourceCurrency}, using original amount`);
    return amount;
  }
  
  // 如果源币种是CNY，直接返回
  if (sourceCurrency.toUpperCase() === 'CNY') {
    return amount;
  }
  
  // 使用更高精度的计算（避免浮点数误差）
  // 使用整数运算减少精度损失：先转换为整数（乘以1000000），计算后再转换回小数
  // 这样可以保留更多小数位数，减少精度损失
  const amountInt = Math.round(amount * 1000000); // 转换为整数（保留6位小数精度）
  const rateInt = Math.round(rate * 1000000); // 汇率也转换为整数
  const convertedInt = Math.round((amountInt * 1000000) / rateInt); // 整数运算（除以汇率）
  const converted = convertedInt / 1000000; // 转换回小数
  
  // 中间计算不四舍五入，保持高精度
  if (roundResult) {
    // 只在需要显示时才四舍五入
    return Math.round(converted * 100) / 100;
  }
  
  return converted;
};

/**
 * 获取汇率
 * @param {string} currency - 币种代码
 * @param {object} customRates - 自定义汇率（可选）
 * @returns {number} 汇率（相对于CNY）
 */
export const getExchangeRate = (currency, customRates = null) => {
  const rates = customRates || getExchangeRatesSync();
  return rates[currency.toUpperCase()] || 1.0;
};

/**
 * 刷新汇率缓存
 */
export const refreshExchangeRates = async () => {
  return await fetchExchangeRates(true);
};

/**
 * 设置自定义汇率
 * @param {object} rates - 汇率对象
 * @returns {object} 更新后的汇率对象
 */
export const setExchangeRates = (rates) => {
  Object.assign(DEFAULT_EXCHANGE_RATES, rates);
  return DEFAULT_EXCHANGE_RATES;
};

/**
 * 获取默认汇率对象
 * @returns {object} 默认汇率对象
 */
export const getDefaultRates = () => {
  return { ...DEFAULT_EXCHANGE_RATES };
};

