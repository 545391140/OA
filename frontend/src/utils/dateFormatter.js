import dayjs from 'dayjs';
import { useTranslation } from 'react-i18next';
import 'dayjs/locale/zh-cn';
import 'dayjs/locale/ja';
import 'dayjs/locale/ko';
import 'dayjs/locale/vi';
import 'dayjs/locale/th';
import 'dayjs/locale/ar';

/**
 * 根据语言获取对应的日期格式
 * @param {string} language - 语言代码 (en, zh, ja, ko, vi, th, ar)
 * @returns {string} dayjs 格式字符串
 */
export const getDateFormatByLanguage = (language) => {
  const lang = (language || '').toLowerCase().split('-')[0]; // 获取主语言代码
  
  const dateFormats = {
    'zh': 'YYYY-MM-DD',           // 中文：2025-11-24
    'en': 'MMM DD, YYYY',          // 英文：Nov 24, 2025
    'ja': 'YYYY年MM月DD日',         // 日语：2025年11月24日
    'ko': 'YYYY.MM.DD',            // 韩语：2025.11.24
    'vi': 'DD/MM/YYYY',            // 越南语：24/11/2025
    'th': 'DD/MM/YYYY',            // 泰语：24/11/2025
    'ar': 'DD/MM/YYYY',            // 阿拉伯语：24/11/2025
  };
  
  return dateFormats[lang] || dateFormats['en'];
};

/**
 * 根据语言获取日期范围格式（用于日期范围显示）
 * @param {string} language - 语言代码
 * @returns {string} dayjs 格式字符串
 */
export const getDateRangeFormatByLanguage = (language) => {
  const lang = (language || '').toLowerCase().split('-')[0];
  
  const dateRangeFormats = {
    'zh': 'YYYY/MM/DD',            // 中文：2025/11/24
    'en': 'MMM DD, YYYY',          // 英文：Nov 24, 2025
    'ja': 'YYYY/MM/DD',            // 日语：2025/11/24
    'ko': 'YYYY.MM.DD',            // 韩语：2025.11.24
    'vi': 'DD/MM/YYYY',            // 越南语：24/11/2025
    'th': 'DD/MM/YYYY',            // 泰语：24/11/2025
    'ar': 'DD/MM/YYYY',            // 阿拉伯语：24/11/2025
  };
  
  return dateRangeFormats[lang] || dateRangeFormats['en'];
};

/**
 * 获取 dayjs locale 代码
 * @param {string} language - 语言代码
 * @returns {string} dayjs locale 代码
 */
const getDayjsLocale = (language) => {
  const lang = (language || '').toLowerCase().split('-')[0];
  
  const localeMap = {
    'zh': 'zh-cn',
    'en': 'en',
    'ja': 'ja',
    'ko': 'ko',
    'vi': 'vi',
    'th': 'th',
    'ar': 'ar',
  };
  
  return localeMap[lang] || 'en';
};

/**
 * 格式化日期（根据当前语言）
 * @param {string|Date|dayjs.Dayjs} date - 日期
 * @param {string} language - 语言代码（可选，如果不提供则从 i18n 获取）
 * @param {boolean} isRange - 是否为日期范围格式
 * @returns {string} 格式化后的日期字符串
 */
export const formatDateByLanguage = (date, language = null, isRange = false) => {
  if (!date) return '-';
  
  const format = isRange 
    ? getDateRangeFormatByLanguage(language)
    : getDateFormatByLanguage(language);
  
  try {
    const locale = getDayjsLocale(language);
    return dayjs(date).locale(locale).format(format);
  } catch (error) {

    return '-';
  }
};

/**
 * React Hook: 根据当前 i18n 语言格式化日期
 * @param {boolean} isRange - 是否为日期范围格式
 * @returns {function} 格式化函数
 */
export const useDateFormat = (isRange = false) => {
  const { i18n } = useTranslation();
  
  return (date) => {
    return formatDateByLanguage(date, i18n.language, isRange);
  };
};

