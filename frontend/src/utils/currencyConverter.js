/**
 * 货币汇率换算工具
 * 差旅标准按CNY（人民币）维护，需要根据选择的币种进行换算
 */

// 默认汇率（相对于CNY）
// 注意：这些是示例汇率，实际应该从后端API或配置中获取
const DEFAULT_EXCHANGE_RATES = {
  CNY: 1.0,      // 基准货币
  USD: 0.14,     // 1 CNY = 0.14 USD (约7.14 CNY = 1 USD)
  JPY: 20.0,     // 1 CNY = 20 JPY (约0.05 CNY = 1 JPY)
  KRW: 180.0,    // 1 CNY = 180 KRW (约0.0056 CNY = 1 KRW)
  EUR: 0.13,     // 1 CNY = 0.13 EUR (约7.69 CNY = 1 EUR)
  GBP: 0.11      // 1 CNY = 0.11 GBP (约9.09 CNY = 1 GBP)
};

/**
 * 从CNY转换为目标币种
 * @param {number} amountCNY - 人民币金额
 * @param {string} targetCurrency - 目标币种代码
 * @param {object} customRates - 自定义汇率（可选）
 * @returns {number} 转换后的金额
 */
export const convertFromCNY = (amountCNY, targetCurrency, customRates = null) => {
  if (!amountCNY || amountCNY === 0) return 0;
  if (!targetCurrency) return amountCNY;
  
  const rates = customRates || DEFAULT_EXCHANGE_RATES;
  const rate = rates[targetCurrency.toUpperCase()];
  
  if (!rate) {
    console.warn(`Exchange rate not found for currency: ${targetCurrency}, using CNY amount`);
    return amountCNY;
  }
  
  // 如果目标币种是CNY，直接返回
  if (targetCurrency.toUpperCase() === 'CNY') {
    return amountCNY;
  }
  
  // 转换为目标币种
  const converted = amountCNY * rate;
  
  // 保留2位小数（JPY和KRW可能需要不同的小数位数，但这里统一处理）
  return Math.round(converted * 100) / 100;
};

/**
 * 从目标币种转换为CNY
 * @param {number} amount - 金额
 * @param {string} sourceCurrency - 源币种代码
 * @param {object} customRates - 自定义汇率（可选）
 * @returns {number} 人民币金额
 */
export const convertToCNY = (amount, sourceCurrency, customRates = null) => {
  if (!amount || amount === 0) return 0;
  if (!sourceCurrency) return amount;
  
  const rates = customRates || DEFAULT_EXCHANGE_RATES;
  const rate = rates[sourceCurrency.toUpperCase()];
  
  if (!rate) {
    console.warn(`Exchange rate not found for currency: ${sourceCurrency}, using original amount`);
    return amount;
  }
  
  // 如果源币种是CNY，直接返回
  if (sourceCurrency.toUpperCase() === 'CNY') {
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
 * @param {object} customRates - 自定义汇率（可选）
 * @returns {number} 汇率（相对于CNY）
 */
export const getExchangeRate = (currency, customRates = null) => {
  const rates = customRates || DEFAULT_EXCHANGE_RATES;
  return rates[currency.toUpperCase()] || 1.0;
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

