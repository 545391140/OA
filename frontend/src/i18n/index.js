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
  // 将 zh.json 同时映射到 zh-Hans 和 zh-Hans-CN，避免回退
  'zh-Hans': {
    translation: zh
  },
  'zh-Hans-CN': {
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
    missingKeyHandler: (lng, ns, key, fallbackValue) => {
      // 记录缺失的翻译键
      i18nMonitor.recordMissingKey(key, ns, lng);
      
      // 如果使用了回退值，记录回退信息
      if (fallbackValue && fallbackValue !== key) {
        // 尝试确定回退到的语言
        const fallbackChain = getFallbackChain(lng);
        if (fallbackChain.length > 1) {
          // 记录回退命中（仅在真正发生回退时）
          i18nMonitor.recordFallbackHit(lng, fallbackChain[1] || 'en', key);
        }
      }
    },
    
    // 回退处理 - 优化：只在真正发生回退时记录
    fallbackLng: (code) => {
      const fallbackChain = getFallbackChain(code);
      // 如果当前语言在资源中存在，不需要回退，不记录
      // 只有当资源中不存在该语言时，才会真正回退
      // 这里只返回回退链，实际回退由 i18next 内部处理
      return fallbackChain;
    },
    
    // 优化：使用更智能的回退处理
    // 当翻译键不存在时，i18next 会自动使用回退链
    // 我们通过 missingKeyHandler 来记录真正的缺失情况
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
