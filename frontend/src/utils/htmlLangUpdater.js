// HTML语言更新工具
export const updateHtmlLang = (language) => {
  // 更新HTML lang属性
  document.documentElement.lang = language;
  
  // 更新页面标题
  const titles = {
    en: 'Travel & Expense Management System',
    zh: '差旅和费用管理系统',
    ja: '出張・経費管理システム',
    ko: '출장 및 비용 관리 시스템'
  };
  
  document.title = titles[language] || titles.en;
  
  // 更新meta描述
  const descriptions = {
    en: 'Modern Travel and Expense Management System',
    zh: '现代化差旅和费用管理系统',
    ja: 'モダンな出張・経費管理システム',
    ko: '현대적인 출장 및 비용 관리 시스템'
  };
  
  const metaDescription = document.querySelector('meta[name="description"]');
  if (metaDescription) {
    metaDescription.content = descriptions[language] || descriptions.en;
  }
  
  // 更新noscript提示
  const noscriptMessages = {
    en: 'You need to enable JavaScript to run this app.',
    zh: '您需要启用JavaScript才能运行此应用程序。',
    ja: 'このアプリを実行するにはJavaScriptを有効にする必要があります。',
    ko: '이 앱을 실행하려면 JavaScript를 활성화해야 합니다.'
  };
  
  const noscript = document.querySelector('noscript');
  if (noscript) {
    noscript.textContent = noscriptMessages[language] || noscriptMessages.en;
  }
  
  // 更新manifest.json中的名称（通过动态设置）
  const manifestNames = {
    en: 'Travel & Expense Management System',
    zh: '差旅和费用管理系统',
    ja: '出張・経費管理システム',
    ko: '출장 및 비용 관리システム'
  };
  
  const manifestShortNames = {
    en: 'Travel Expense',
    zh: '差旅费用',
    ja: '出張経費',
    ko: '출장비용'
  };
  
  // 动态更新manifest
  const manifestLink = document.querySelector('link[rel="manifest"]');
  if (manifestLink) {
    // 创建新的manifest内容
    const manifest = {
      short_name: manifestShortNames[language] || manifestShortNames.en,
      name: manifestNames[language] || manifestNames.en,
      icons: [
        {
          src: "/favicon.ico",
          sizes: "64x64 32x32 24x24 16x16",
          type: "image/x-icon"
        }
      ],
      start_url: "/",
      display: "standalone",
      theme_color: "#000000",
      background_color: "#ffffff"
    };
    
    // 创建blob URL并更新manifest链接
    const manifestBlob = new Blob([JSON.stringify(manifest)], { type: 'application/json' });
    const manifestURL = URL.createObjectURL(manifestBlob);
    manifestLink.href = manifestURL;
  }
  
  // 更新页面方向（RTL支持）
  if (language === 'ar' || language === 'he') {
    document.documentElement.dir = 'rtl';
  } else {
    document.documentElement.dir = 'ltr';
  }
  
  // 更新页面字体（如果需要）
  const fontFamilies = {
    en: '"Roboto", "Helvetica", "Arial", sans-serif',
    zh: '"Roboto", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif',
    ja: '"Roboto", "Hiragino Sans", "Yu Gothic", "Meiryo", sans-serif',
    ko: '"Roboto", "Malgun Gothic", "Apple SD Gothic Neo", sans-serif'
  };
  
  // 动态更新字体
  const style = document.createElement('style');
  style.textContent = `
    body {
      font-family: ${fontFamilies[language] || fontFamilies.en} !important;
    }
  `;
  
  // 移除旧的字体样式
  const oldStyle = document.querySelector('#dynamic-font-style');
  if (oldStyle) {
    oldStyle.remove();
  }
  
  style.id = 'dynamic-font-style';
  document.head.appendChild(style);
};

// 初始化HTML语言
export const initializeHtmlLang = () => {
  const savedLanguage = localStorage.getItem('i18nextLng') || 'en';
  updateHtmlLang(savedLanguage);
};

// 监听语言变化
export const setupLanguageListener = () => {
  // 监听localStorage变化
  window.addEventListener('storage', (e) => {
    if (e.key === 'i18nextLng') {
      updateHtmlLang(e.newValue);
    }
  });
  
  // 监听自定义语言变化事件
  window.addEventListener('languageChanged', (e) => {
    updateHtmlLang(e.detail.language);
  });
};
