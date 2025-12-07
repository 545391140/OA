// 默认币种列表（后备方案）
export const DEFAULT_CURRENCIES = [
  'USD',
  'CNY',
  'JPY',
  'KRW',
  'EUR',
  'GBP'
];

export const DEFAULT_CURRENCY = 'USD';

// 币种列表缓存
let currenciesCache = null;
let currenciesCacheTimestamp = null;
const CURRENCIES_CACHE_DURATION = 5 * 60 * 1000; // 5分钟缓存

// 延迟导入 apiClient，避免循环依赖
let apiClientPromise = null;

/**
 * 获取 apiClient 实例（延迟加载）
 * @returns {Promise} apiClient promise
 */
const getApiClient = async () => {
  if (!apiClientPromise) {
    apiClientPromise = import('./axiosConfig').then(module => module.default);
  }
  return apiClientPromise;
};

/**
 * 从API获取活跃币种列表
 * @param {boolean} forceRefresh - 是否强制刷新
 * @returns {Promise<string[]>} 币种代码数组
 */
export const fetchActiveCurrencies = async (forceRefresh = false) => {
  // 如果缓存有效且不强制刷新，直接返回缓存
  if (!forceRefresh && currenciesCache && currenciesCacheTimestamp) {
    const now = Date.now();
    if (now - currenciesCacheTimestamp < CURRENCIES_CACHE_DURATION) {
      return currenciesCache;
    }
  }

  try {
    const apiClient = await getApiClient();
    const response = await apiClient.get('/currencies/active');
    
    if (response.data && response.data.success && response.data.data) {
      const codes = response.data.data.map(currency => currency.code);
      currenciesCache = codes;
      currenciesCacheTimestamp = Date.now();
      return codes;
    }
    
    // 如果API失败，返回默认币种
    return DEFAULT_CURRENCIES;
  } catch (error) {
    // 静默处理错误
    // 401错误（未授权）是正常的，因为用户可能未登录，使用默认币种即可
    // API失败时返回默认币种
    return DEFAULT_CURRENCIES;
  }
};

/**
 * 获取币种列表（同步版本，使用缓存或默认值）
 * @returns {string[]} 币种代码数组
 */
export const getCurrencies = () => {
  return currenciesCache || DEFAULT_CURRENCIES;
};

/**
 * 刷新币种缓存
 */
export const refreshCurrenciesCache = async () => {
  return await fetchActiveCurrencies(true);
};

// 为了向后兼容，导出CURRENCIES作为getCurrencies的别名
// 注意：这个值在模块加载时是默认值，实际使用时应该通过 useCurrencies hook 获取最新数据
export const CURRENCIES = getCurrencies();

// 在应用启动时预加载币种数据（可选）
if (typeof window !== 'undefined') {
  // 延迟加载，避免阻塞应用启动
  setTimeout(() => {
    fetchActiveCurrencies().catch(() => {
      // 静默失败，使用默认值
    });
  }, 1000);
}

