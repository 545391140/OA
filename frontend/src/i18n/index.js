import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { updateHtmlLang } from '../utils/htmlLangUpdater';
import { initializeLocale, getFallbackChain, getLocaleDirection, getLocaleFontFamily } from '../utils/localeResolver';
import i18nMonitor from '../utils/i18nMonitor';

// Import translation files
import en from './locales/en.json';
import zh from './locales/zh.json';
import ja from './locales/ja.json';
import ko from './locales/ko.json';

const resources = {
  en: {
    translation: en
  },
  zh: {
    translation: zh
  },
  ja: {
    translation: ja
  },
  ko: {
    translation: ko
  }
};

// 初始化语言解析
const resolvedLocale = initializeLocale();

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: resolvedLocale,
    fallbackLng: getFallbackChain(resolvedLocale),
    debug: false, // 禁用详细日志，减少控制台输出
    
    interpolation: {
      escapeValue: false,
    },
    
    detection: {
      order: ['localStorage', 'navigator', 'htmlTag'],
      caches: ['localStorage'],
    },
    
    // 启用命名空间支持
    ns: ['translation'],
    defaultNS: 'translation',
    
    // 回退配置
    fallbackNS: 'translation',
    
    // 缺失键处理
    saveMissing: process.env.NODE_ENV === 'development',
    missingKeyHandler: (lng, ns, key) => {
      i18nMonitor.recordMissingKey(key, ns, lng);
    },
    
    // 回退处理
    fallbackLng: (code) => {
      const fallbackChain = getFallbackChain(code);
      i18nMonitor.recordFallbackHit(code, fallbackChain[1] || 'en', '');
      return fallbackChain;
    }
  });

// 监听语言变化，更新HTML和样式
i18n.on('languageChanged', (lng) => {
  const startTime = Date.now();
  
  // 更新HTML语言
  updateHtmlLang(lng);
  
  // 更新页面方向
  const direction = getLocaleDirection(lng);
  document.documentElement.dir = direction;
  
  // 更新字体
  const fontFamily = getLocaleFontFamily(lng);
  const style = document.createElement('style');
  style.textContent = `
    body {
      font-family: ${fontFamily} !important;
    }
  `;
  
  // 移除旧的字体样式
  const oldStyle = document.querySelector('#dynamic-font-style');
  if (oldStyle) {
    oldStyle.remove();
  }
  
  style.id = 'dynamic-font-style';
  document.head.appendChild(style);
  
  // 记录语言切换时间
  const endTime = Date.now();
  i18nMonitor.recordLanguageSwitch(startTime, endTime, i18n.language, lng);
});

// 初始化时更新HTML语言和样式
updateHtmlLang(i18n.language);
const direction = getLocaleDirection(i18n.language);
document.documentElement.dir = direction;

export default i18n;
