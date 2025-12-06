/**
 * 币种数据 Hook
 * 统一从API获取币种数据，替代硬编码的币种列表
 */

import { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import apiClient from '../utils/axiosConfig';
import { fetchActiveCurrencies, DEFAULT_CURRENCIES } from '../utils/constants';

/**
 * 获取币种列表和选项的 Hook
 * @param {Object} options - 配置选项
 * @param {boolean} options.includeInactive - 是否包含非活跃币种，默认false
 * @param {boolean} options.autoFetch - 是否自动获取，默认true
 * @returns {Object} { currencies, currencyOptions, loading, error, refresh }
 */
export const useCurrencies = (options = {}) => {
  const { includeInactive = false, autoFetch = true } = options;
  const { t, i18n } = useTranslation();
  const [currencies, setCurrencies] = useState([]);
  const [loading, setLoading] = useState(autoFetch);
  const [error, setError] = useState(null);

  const fetchCurrencies = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const endpoint = includeInactive ? '/currencies' : '/currencies/active';
      const response = await apiClient.get(endpoint);
      
      if (response.data && response.data.success) {
        setCurrencies(response.data.data || []);
      } else {
        throw new Error(response.data?.message || 'Failed to fetch currencies');
      }
    } catch (err) {
      console.error('Fetch currencies error:', err);
      setError(err.message);
      // 如果API失败，使用默认币种
      if (err.response?.status !== 401) {
        // 401错误（未授权）不设置错误，因为用户可能未登录
        setError(err.response?.data?.message || err.message);
      }
      // 使用默认币种作为后备
      setCurrencies(DEFAULT_CURRENCIES.map(code => ({ code, name: code, nameEn: code })));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (autoFetch) {
      fetchCurrencies();
    }
  }, [includeInactive, autoFetch]);

  // 生成币种选项（用于下拉框）
  const currencyOptions = useMemo(() => {
    const getCurrencyLabel = (currency) => {
      const code = typeof currency === 'string' ? currency : currency.code;
      const name = typeof currency === 'string' ? null : (currency.nameEn || currency.name);
      
      try {
        const translationKey = `common.currencies.${code}`;
        const translation = t(translationKey);
        
        // 检查翻译是否成功
        if (translation && translation !== translationKey && translation.trim() !== '') {
          return `${code} - ${translation}`;
        }
      } catch (error) {
        // 忽略翻译错误
      }
      
      // 如果有英文名称，使用英文名称
      if (name && name !== code) {
        return `${code} - ${name}`;
      }
      
      // 回退到硬编码的英文名称
      const fallbackNames = {
        'USD': 'US Dollar',
        'CNY': 'Chinese Yuan',
        'JPY': 'Japanese Yen',
        'KRW': 'Korean Won',
        'EUR': 'Euro',
        'GBP': 'British Pound'
      };
      return `${code} - ${fallbackNames[code] || code}`;
    };

    return currencies.map(currency => {
      const code = typeof currency === 'string' ? currency : currency.code;
      return {
        value: code,
        label: getCurrencyLabel(currency),
        currency: typeof currency === 'string' ? null : currency
      };
    });
  }, [currencies, t, i18n.language]);

  // 获取币种代码列表
  const currencyCodes = useMemo(() => {
    return currencies.map(c => typeof c === 'string' ? c : c.code);
  }, [currencies]);

  return {
    currencies,        // 完整的币种对象数组
    currencyCodes,     // 币种代码数组 ['USD', 'CNY', ...]
    currencyOptions,   // 用于下拉框的选项数组 [{value, label}, ...]
    loading,
    error,
    refresh: fetchCurrencies
  };
};

/**
 * 获取币种代码列表的简化 Hook（仅返回代码数组）
 * @returns {Object} { currencyCodes, loading, error, refresh }
 */
export const useCurrencyCodes = () => {
  const { currencyCodes, loading, error, refresh } = useCurrencies();
  return { currencyCodes, loading, error, refresh };
};

