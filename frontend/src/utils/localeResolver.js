// Locale解析优先级：URL ?lang= → 用户 Profile → Cookie → Accept-Language → 租户默认 → 系统默认
import { getCookie, setCookie } from './cookieUtils';

// 支持的语言列表
export const SUPPORTED_LOCALES = {
  'en': 'English',
  'zh': '中文',
  'zh-Hans': '简体中文',
  'zh-Hans-CN': '简体中文（中国）',
  'zh-Hant': '繁体中文',
  'zh-Hant-TW': '繁体中文（台湾）',
  'ja': '日本語',
  'ko': '한국어',
  'ar': 'العربية',
  'he': 'עברית'
};

// 回退链配置
// 优化：由于 zh-Hans-CN 和 zh-Hans 都映射到同一个资源，简化回退链
export const FALLBACK_CHAINS = {
  'zh-Hans-CN': ['zh-Hans-CN', 'zh', 'en'],  // 简化：直接回退到 zh
  'zh-Hans': ['zh-Hans', 'zh', 'en'],        // 简化：直接回退到 zh
  'zh-Hant-TW': ['zh-Hant-TW', 'zh-Hant', 'zh', 'en'],
  'zh-Hant': ['zh-Hant', 'zh', 'en'],
  'zh': ['zh', 'en'],
  'ja': ['ja', 'en'],
  'ko': ['ko', 'en'],
  'ar': ['ar', 'en'],
  'he': ['he', 'en'],
  'en': ['en']
};

// 系统默认语言
export const DEFAULT_LOCALE = 'en';

// 租户默认语言（可以从配置或API获取）
export const TENANT_DEFAULT_LOCALE = 'zh-Hans-CN';

/**
 * 从URL参数解析语言
 */
export const getLocaleFromURL = () => {
  const urlParams = new URLSearchParams(window.location.search);
  const lang = urlParams.get('lang');
  return lang && SUPPORTED_LOCALES[lang] ? lang : null;
};

/**
 * 从用户Profile获取语言偏好
 */
export const getLocaleFromProfile = () => {
  try {
    const userProfile = JSON.parse(localStorage.getItem('userProfile') || '{}');
    return userProfile.language && SUPPORTED_LOCALES[userProfile.language] 
      ? userProfile.language 
      : null;
  } catch (error) {
    console.warn('Failed to parse user profile:', error);
    return null;
  }
};

/**
 * 从Cookie获取语言偏好
 */
export const getLocaleFromCookie = () => {
  const cookieLang = getCookie('locale');
  return cookieLang && SUPPORTED_LOCALES[cookieLang] ? cookieLang : null;
};

/**
 * 从Accept-Language头解析语言
 */
export const getLocaleFromAcceptLanguage = () => {
  const acceptLanguage = navigator.language || navigator.languages?.[0];
  if (!acceptLanguage) return null;

  // 精确匹配
  if (SUPPORTED_LOCALES[acceptLanguage]) {
    return acceptLanguage;
  }

  // 语言代码匹配（如 zh-CN -> zh-Hans-CN）
  const languageCode = acceptLanguage.split('-')[0];
  const regionCode = acceptLanguage.split('-')[1];

  // 特殊处理中文
  if (languageCode === 'zh') {
    if (regionCode === 'CN' || regionCode === 'SG') {
      return 'zh-Hans-CN';
    } else if (regionCode === 'TW' || regionCode === 'HK' || regionCode === 'MO') {
      return 'zh-Hant-TW';
    } else {
      return 'zh-Hans';
    }
  }

  // 其他语言匹配
  for (const locale of Object.keys(SUPPORTED_LOCALES)) {
    if (locale.startsWith(languageCode)) {
      return locale;
    }
  }

  return null;
};

/**
 * 获取完整的回退链
 */
export const getFallbackChain = (locale) => {
  return FALLBACK_CHAINS[locale] || FALLBACK_CHAINS[DEFAULT_LOCALE];
};

/**
 * 解析当前应该使用的语言
 */
export const resolveLocale = () => {
  // 1. URL参数优先级最高
  let locale = getLocaleFromURL();
  if (locale) {
    setCookie('locale', locale, 365); // 保存到Cookie
    return locale;
  }

  // 2. 用户Profile
  locale = getLocaleFromProfile();
  if (locale) {
    setCookie('locale', locale, 365);
    return locale;
  }

  // 3. Cookie
  locale = getLocaleFromCookie();
  if (locale) {
    return locale;
  }

  // 4. Accept-Language
  locale = getLocaleFromAcceptLanguage();
  if (locale) {
    setCookie('locale', locale, 365);
    return locale;
  }

  // 5. 租户默认
  locale = TENANT_DEFAULT_LOCALE;
  setCookie('locale', locale, 365);
  return locale;
};

/**
 * 设置语言并更新所有相关存储
 */
export const setLocale = (locale) => {
  if (!SUPPORTED_LOCALES[locale]) {
    console.warn(`Unsupported locale: ${locale}`);
    return false;
  }

  // 更新Cookie
  setCookie('locale', locale, 365);
  
  // 更新localStorage
  localStorage.setItem('language', locale);
  localStorage.setItem('i18nextLng', locale);
  
  // 更新用户Profile
  try {
    const userProfile = JSON.parse(localStorage.getItem('userProfile') || '{}');
    userProfile.language = locale;
    localStorage.setItem('userProfile', JSON.stringify(userProfile));
  } catch (error) {
    console.warn('Failed to update user profile:', error);
  }

  return true;
};

/**
 * 获取语言方向（LTR/RTL）
 */
export const getLocaleDirection = (locale) => {
  const rtlLocales = ['ar', 'he'];
  return rtlLocales.includes(locale) ? 'rtl' : 'ltr';
};

/**
 * 获取语言字体族
 */
export const getLocaleFontFamily = (locale) => {
  const fontFamilies = {
    'en': '"Roboto", "Helvetica", "Arial", sans-serif',
    'zh': '"Roboto", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif',
    'zh-Hans': '"Roboto", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif',
    'zh-Hans-CN': '"Roboto", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif',
    'zh-Hant': '"Roboto", "PingFang TC", "Microsoft JhengHei", sans-serif',
    'zh-Hant-TW': '"Roboto", "PingFang TC", "Microsoft JhengHei", sans-serif',
    'ja': '"Roboto", "Hiragino Sans", "Yu Gothic", "Meiryo", sans-serif',
    'ko': '"Roboto", "Malgun Gothic", "Apple SD Gothic Neo", sans-serif',
    'ar': '"Roboto", "Cairo", "Amiri", sans-serif',
    'he': '"Roboto", "Heebo", "Assistant", sans-serif'
  };
  
  return fontFamilies[locale] || fontFamilies['en'];
};

/**
 * 初始化语言解析
 */
export const initializeLocale = () => {
  const locale = resolveLocale();
  setLocale(locale);
  return locale;
};
