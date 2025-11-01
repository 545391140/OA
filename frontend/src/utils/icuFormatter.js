// ICU/CLDR格式化工具
// 统一处理时间、货币、数字、单位等格式化

/**
 * 货币格式化
 */
export const formatCurrency = (amount, currency = 'USD', locale = 'en') => {
  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  } catch (error) {
    console.warn('Currency formatting failed:', error);
    return `${currency} ${amount.toFixed(2)}`;
  }
};

/**
 * 数字格式化
 */
export const formatNumber = (number, locale = 'en', options = {}) => {
  try {
    return new Intl.NumberFormat(locale, {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
      ...options
    }).format(number);
  } catch (error) {
    console.warn('Number formatting failed:', error);
    return number.toString();
  }
};

/**
 * 百分比格式化
 */
export const formatPercent = (number, locale = 'en', options = {}) => {
  try {
    return new Intl.NumberFormat(locale, {
      style: 'percent',
      minimumFractionDigits: 1,
      maximumFractionDigits: 2,
      ...options
    }).format(number / 100);
  } catch (error) {
    console.warn('Percent formatting failed:', error);
    return `${number.toFixed(1)}%`;
  }
};

/**
 * 日期格式化
 */
export const formatDate = (date, locale = 'en', options = {}) => {
  try {
    const dateObj = date instanceof Date ? date : new Date(date);
    return new Intl.DateTimeFormat(locale, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      ...options
    }).format(dateObj);
  } catch (error) {
    console.warn('Date formatting failed:', error);
    return date.toString();
  }
};

/**
 * 时间格式化
 */
export const formatTime = (date, locale = 'en', options = {}) => {
  try {
    const dateObj = date instanceof Date ? date : new Date(date);
    return new Intl.DateTimeFormat(locale, {
      hour: '2-digit',
      minute: '2-digit',
      ...options
    }).format(dateObj);
  } catch (error) {
    console.warn('Time formatting failed:', error);
    return date.toString();
  }
};

/**
 * 日期时间格式化
 */
export const formatDateTime = (date, locale = 'en', options = {}) => {
  try {
    const dateObj = date instanceof Date ? date : new Date(date);
    return new Intl.DateTimeFormat(locale, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      ...options
    }).format(dateObj);
  } catch (error) {
    console.warn('DateTime formatting failed:', error);
    return date.toString();
  }
};

/**
 * 相对时间格式化（如：2天前）
 */
export const formatRelativeTime = (date, locale = 'en') => {
  try {
    const dateObj = date instanceof Date ? date : new Date(date);
    const now = new Date();
    const diffInSeconds = Math.floor((now - dateObj) / 1000);
    
    const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });
    
    if (Math.abs(diffInSeconds) < 60) {
      return rtf.format(diffInSeconds, 'second');
    } else if (Math.abs(diffInSeconds) < 3600) {
      return rtf.format(Math.floor(diffInSeconds / 60), 'minute');
    } else if (Math.abs(diffInSeconds) < 86400) {
      return rtf.format(Math.floor(diffInSeconds / 3600), 'hour');
    } else if (Math.abs(diffInSeconds) < 2592000) {
      return rtf.format(Math.floor(diffInSeconds / 86400), 'day');
    } else if (Math.abs(diffInSeconds) < 31536000) {
      return rtf.format(Math.floor(diffInSeconds / 2592000), 'month');
    } else {
      return rtf.format(Math.floor(diffInSeconds / 31536000), 'year');
    }
  } catch (error) {
    console.warn('Relative time formatting failed:', error);
    return formatDate(date, locale);
  }
};

/**
 * 单位格式化（距离、重量等）
 */
export const formatUnit = (value, unit, locale = 'en', options = {}) => {
  try {
    return new Intl.NumberFormat(locale, {
      style: 'unit',
      unit: unit,
      ...options
    }).format(value);
  } catch (error) {
    console.warn('Unit formatting failed:', error);
    return `${value} ${unit}`;
  }
};

/**
 * 列表格式化
 */
export const formatList = (items, locale = 'en', options = {}) => {
  try {
    return new Intl.ListFormat(locale, {
      style: 'long',
      type: 'conjunction',
      ...options
    }).format(items);
  } catch (error) {
    console.warn('List formatting failed:', error);
    return items.join(', ');
  }
};

/**
 * 复数格式化
 */
export const formatPlural = (count, locale = 'en', options = {}) => {
  try {
    const rules = new Intl.PluralRules(locale);
    return rules.select(count);
  } catch (error) {
    console.warn('Plural formatting failed:', error);
    return count === 1 ? 'one' : 'other';
  }
};

/**
 * 排序格式化（Collation）
 */
export const getCollator = (locale = 'en', options = {}) => {
  try {
    return new Intl.Collator(locale, {
      sensitivity: 'base',
      ignorePunctuation: true,
      numeric: true,
      ...options
    });
  } catch (error) {
    console.warn('Collator creation failed:', error);
    return new Intl.Collator('en');
  }
};

/**
 * 排序数组
 */
export const sortArray = (array, locale = 'en', options = {}) => {
  try {
    const collator = getCollator(locale, options);
    return [...array].sort(collator.compare);
  } catch (error) {
    console.warn('Array sorting failed:', error);
    return [...array].sort();
  }
};

/**
 * 获取周起始日
 */
export const getWeekStartDay = (locale = 'en') => {
  try {
    // 大多数西方国家从周日开始，中国等从周一开始
    const weekStartDays = {
      'en': 0, // Sunday
      'zh': 1, // Monday
      'zh-Hans': 1,
      'zh-Hans-CN': 1,
      'zh-Hant': 1,
      'zh-Hant-TW': 1,
      'ja': 0,
      'ko': 0,
      'ar': 6, // Saturday
      'he': 0
    };
    
    return weekStartDays[locale] || 0;
  } catch (error) {
    console.warn('Week start day detection failed:', error);
    return 0;
  }
};

/**
 * 获取时区
 */
export const getTimezone = (locale = 'en') => {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch (error) {
    console.warn('Timezone detection failed:', error);
    return 'UTC';
  }
};

/**
 * 格式化工具类
 */
export class ICUFormatter {
  constructor(locale = 'en') {
    this.locale = locale;
  }

  currency(amount, currency = 'USD', options = {}) {
    return formatCurrency(amount, currency, this.locale, options);
  }

  number(number, options = {}) {
    return formatNumber(number, this.locale, options);
  }

  percent(number, options = {}) {
    return formatPercent(number, this.locale, options);
  }

  date(date, options = {}) {
    return formatDate(date, this.locale, options);
  }

  time(date, options = {}) {
    return formatTime(date, this.locale, options);
  }

  dateTime(date, options = {}) {
    return formatDateTime(date, this.locale, options);
  }

  relativeTime(date) {
    return formatRelativeTime(date, this.locale);
  }

  unit(value, unit, options = {}) {
    return formatUnit(value, unit, this.locale, options);
  }

  list(items, options = {}) {
    return formatList(items, this.locale, options);
  }

  plural(count) {
    return formatPlural(count, this.locale);
  }

  sort(array, options = {}) {
    return sortArray(array, this.locale, options);
  }

  getWeekStartDay() {
    return getWeekStartDay(this.locale);
  }

  getTimezone() {
    return getTimezone(this.locale);
  }
}
