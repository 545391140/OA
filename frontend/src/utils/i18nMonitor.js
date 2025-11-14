// 国际化监控工具
// 监控翻译覆盖率、缺失键率、硬编码率、语言切换性能等指标

class I18nMonitor {
  constructor() {
    this.metrics = {
      missingKeys: new Set(),
      fallbackHits: new Map(),
      switchTimes: [],
      hardcodedStrings: new Set(),
      translationCoverage: new Map()
    };
    
    this.startTime = null;
    this.isMonitoring = false;
    
    // 绑定到全局对象以便调试
    if (typeof window !== 'undefined') {
      window.i18nMonitor = this;
    }
  }

  /**
   * 开始监控
   */
  startMonitoring() {
    this.isMonitoring = true;
    this.startTime = Date.now();
    
    // 监听语言切换
    this.setupLanguageSwitchListener();
    
    // 监听翻译缺失
    this.setupMissingKeyListener();
    
    // 仅在调试模式下输出启动日志
    if (process.env.REACT_APP_DEBUG_I18N === 'true') {
      console.log('I18n monitoring started');
    }
  }

  /**
   * 停止监控
   */
  stopMonitoring() {
    this.isMonitoring = false;
    console.log('I18n monitoring stopped');
  }

  /**
   * 记录缺失的翻译键
   */
  recordMissingKey(key, namespace, locale) {
    if (!this.isMonitoring) return;
    
    const missingKey = `${namespace}:${key}:${locale}`;
    this.metrics.missingKeys.add(missingKey);
    
    // 发送到监控服务
    this.sendMetric('missing_key', {
      key,
      namespace,
      locale,
      timestamp: Date.now()
    });
    
    // 仅在调试模式下输出警告
    if (process.env.REACT_APP_DEBUG_I18N === 'true') {
      console.warn(`Missing translation key: ${missingKey}`);
    }
  }

  /**
   * 记录回退命中
   */
  recordFallbackHit(fromLocale, toLocale, key) {
    if (!this.isMonitoring) return;
    
    const fallbackKey = `${fromLocale}->${toLocale}`;
    const current = this.metrics.fallbackHits.get(fallbackKey) || 0;
    this.metrics.fallbackHits.set(fallbackKey, current + 1);
    
    this.sendMetric('fallback_hit', {
      fromLocale,
      toLocale,
      key,
      timestamp: Date.now()
    });
  }

  /**
   * 记录语言切换时间
   */
  recordLanguageSwitch(startTime, endTime, fromLocale, toLocale) {
    if (!this.isMonitoring) return;
    
    const switchTime = endTime - startTime;
    this.metrics.switchTimes.push({
      switchTime,
      fromLocale,
      toLocale,
      timestamp: Date.now()
    });
    
    // 只保留最近100次切换记录
    if (this.metrics.switchTimes.length > 100) {
      this.metrics.switchTimes = this.metrics.switchTimes.slice(-100);
    }
    
    this.sendMetric('language_switch', {
      switchTime,
      fromLocale,
      toLocale,
      timestamp: Date.now()
    });
    
    console.log(`Language switch: ${fromLocale} -> ${toLocale}, time: ${switchTime}ms`);
  }

  /**
   * 记录硬编码字符串
   */
  recordHardcodedString(string, file, line) {
    if (!this.isMonitoring) return;
    
    const hardcodedKey = `${file}:${line}:${string}`;
    this.metrics.hardcodedStrings.add(hardcodedKey);
    
    this.sendMetric('hardcoded_string', {
      string,
      file,
      line,
      timestamp: Date.now()
    });
    
    console.warn(`Hardcoded string detected: ${string} in ${file}:${line}`);
  }

  /**
   * 记录翻译覆盖率
   */
  recordTranslationCoverage(namespace, locale, totalKeys, translatedKeys) {
    if (!this.isMonitoring) return;
    
    const coverage = (translatedKeys / totalKeys) * 100;
    const key = `${namespace}:${locale}`;
    this.metrics.translationCoverage.set(key, {
      totalKeys,
      translatedKeys,
      coverage,
      timestamp: Date.now()
    });
    
    this.sendMetric('translation_coverage', {
      namespace,
      locale,
      totalKeys,
      translatedKeys,
      coverage,
      timestamp: Date.now()
    });
  }

  /**
   * 设置语言切换监听器
   */
  setupLanguageSwitchListener() {
    // 监听i18next语言变化事件
    if (typeof window !== 'undefined' && window.i18next) {
      window.i18next.on('languageChanged', (lng) => {
        // 这里可以记录语言切换
        console.log(`Language changed to: ${lng}`);
      });
    }
  }

  /**
   * 设置缺失键监听器
   */
  setupMissingKeyListener() {
    // 重写i18next的t函数来监控缺失键
    if (typeof window !== 'undefined' && window.i18next) {
      const originalT = window.i18next.t;
      window.i18next.t = (...args) => {
        const result = originalT.apply(window.i18next, args);
        
        // 检查是否是缺失键（通常返回键名本身）
        if (result === args[0] && typeof args[0] === 'string') {
          this.recordMissingKey(args[0], args[1] || 'translation', window.i18next.language);
        }
        
        return result;
      };
    }
  }

  /**
   * 发送指标到监控服务
   */
  sendMetric(type, data) {
    // 仅在调试模式下输出日志（通过环境变量控制）
    if (process.env.NODE_ENV === 'development' && process.env.REACT_APP_DEBUG_I18N === 'true') {
      console.log(`Metric [${type}]:`, data);
    }
    
    // 实际项目中可以发送到监控API
    // fetch('/api/metrics', {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify({ type, data })
    // }).catch(console.error);
  }

  /**
   * 计算翻译覆盖率（自动统计所有翻译键）
   */
  calculateTranslationCoverage() {
    if (typeof window === 'undefined' || !window.i18next) {
      return {};
    }

    const coverageData = {};
    const resources = window.i18next.store.data || {};
    const locales = Object.keys(resources);

    locales.forEach(locale => {
      const localeResources = resources[locale] || {};
      const namespaces = Object.keys(localeResources);

      namespaces.forEach(namespace => {
        const namespaceData = localeResources[namespace] || {};
        const allKeys = this.getAllKeys(namespaceData);
        const totalKeys = allKeys.length;
        
        // 统计已翻译的键（值不为空且不是键名本身）
        const translatedKeys = allKeys.filter(key => {
          const value = this.getNestedValue(namespaceData, key);
          return value && typeof value === 'string' && value.trim() !== '' && value !== key;
        }).length;

        const coverage = totalKeys > 0 ? (translatedKeys / totalKeys) * 100 : 0;
        const key = `${namespace}:${locale}`;
        
        coverageData[key] = {
          totalKeys,
          translatedKeys,
          coverage,
          timestamp: Date.now()
        };

        // 更新监控指标
        this.metrics.translationCoverage.set(key, coverageData[key]);
      });
    });

    return coverageData;
  }

  /**
   * 获取对象中的所有键（递归）
   */
  getAllKeys(obj, prefix = '') {
    const keys = [];
    
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        const fullKey = prefix ? `${prefix}.${key}` : key;
        const value = obj[key];
        
        if (value && typeof value === 'object' && !Array.isArray(value)) {
          // 递归获取嵌套键
          keys.push(...this.getAllKeys(value, fullKey));
        } else {
          // 叶子节点
          keys.push(fullKey);
        }
      }
    }
    
    return keys;
  }

  /**
   * 获取嵌套对象的值
   */
  getNestedValue(obj, keyPath) {
    const keys = keyPath.split('.');
    let value = obj;
    
    for (const key of keys) {
      if (value && typeof value === 'object' && key in value) {
        value = value[key];
      } else {
        return undefined;
      }
    }
    
    return value;
  }

  /**
   * 获取监控报告
   */
  getReport() {
    const now = Date.now();
    const uptime = this.startTime ? now - this.startTime : 0;
    
    // 自动计算翻译覆盖率
    this.calculateTranslationCoverage();
    
    // 计算缺失键率（24小时滚动）
    const missingKeyRate = this.metrics.missingKeys.size;
    
    // 计算语言切换P95时间
    const switchTimes = this.metrics.switchTimes.map(s => s.switchTime);
    const p95SwitchTime = this.calculatePercentile(switchTimes, 95);
    
    // 计算平均翻译覆盖率
    const coverageEntries = Array.from(this.metrics.translationCoverage.values());
    const avgCoverage = coverageEntries.length > 0 
      ? coverageEntries.reduce((sum, c) => sum + c.coverage, 0) / coverageEntries.length 
      : 100; // 如果没有覆盖率数据，默认100%
    
    // 计算硬编码率（这里需要从静态扫描结果获取，暂时返回0）
    const hardcodedRate = this.metrics.hardcodedStrings.size;
    
    return {
      uptime,
      missingKeyRate,
      p95SwitchTime: p95SwitchTime || 0,
      avgCoverage,
      hardcodedRate,
      fallbackHits: Object.fromEntries(this.metrics.fallbackHits),
      recentSwitchTimes: this.metrics.switchTimes.slice(-10),
      missingKeys: Array.from(this.metrics.missingKeys),
      hardcodedStrings: Array.from(this.metrics.hardcodedStrings),
      translationCoverage: Object.fromEntries(this.metrics.translationCoverage)
    };
  }

  /**
   * 计算百分位数
   */
  calculatePercentile(values, percentile) {
    if (values.length === 0) return 0;
    
    const sorted = [...values].sort((a, b) => a - b);
    const index = Math.ceil((percentile / 100) * sorted.length) - 1;
    return sorted[index] || 0;
  }

  /**
   * 重置指标
   */
  reset() {
    this.metrics = {
      missingKeys: new Set(),
      fallbackHits: new Map(),
      switchTimes: [],
      hardcodedStrings: new Set(),
      translationCoverage: new Map()
    };
    this.startTime = Date.now();
    console.log('I18n metrics reset');
  }

  /**
   * 导出指标数据
   */
  exportMetrics() {
    return {
      metrics: {
        missingKeys: Array.from(this.metrics.missingKeys),
        fallbackHits: Object.fromEntries(this.metrics.fallbackHits),
        switchTimes: this.metrics.switchTimes,
        hardcodedStrings: Array.from(this.metrics.hardcodedStrings),
        translationCoverage: Object.fromEntries(this.metrics.translationCoverage)
      },
      report: this.getReport()
    };
  }
}

// 创建全局监控实例
const i18nMonitor = new I18nMonitor();

// 在开发环境自动启动监控
if (process.env.NODE_ENV === 'development') {
  i18nMonitor.startMonitoring();
}

export default i18nMonitor;
export { I18nMonitor };
