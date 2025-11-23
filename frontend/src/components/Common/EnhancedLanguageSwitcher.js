import React, { useState, useEffect } from 'react';
import {
  FormControl,
  Select,
  MenuItem,
  Box,
  Typography,
  Chip,
  Tooltip,
  IconButton,
  Menu,
  ListItemIcon,
  ListItemText,
  Divider
} from '@mui/material';
import {
  Language as LanguageIcon,
  Check as CheckIcon,
  Translate as TranslateIcon
} from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import { setLocale, SUPPORTED_LOCALES, getLocaleDirection } from '../../utils/localeResolver';
import i18nMonitor from '../../utils/i18nMonitor';

const EnhancedLanguageSwitcher = ({ variant = 'select', showFlags = true, showNames = true }) => {
  const { t, i18n } = useTranslation();
  const [anchorEl, setAnchorEl] = useState(null);
  const [currentLocale, setCurrentLocale] = useState(i18n.language);
  const [switchStartTime, setSwitchStartTime] = useState(null);

  // 语言配置
  const languageConfig = {
    'en': { 
      name: 'English', 
      nativeName: 'English',
      flag: '🇺🇸',
      direction: 'ltr'
    },
    'zh': { 
      name: 'Chinese', 
      nativeName: '中文',
      flag: '🇨🇳',
      direction: 'ltr'
    },
    'zh-Hans': { 
      name: 'Simplified Chinese', 
      nativeName: '简体中文',
      flag: '🇨🇳',
      direction: 'ltr'
    },
    'zh-Hans-CN': { 
      name: 'Simplified Chinese (China)', 
      nativeName: '简体中文（中国）',
      flag: '🇨🇳',
      direction: 'ltr'
    },
    'zh-Hant': { 
      name: 'Traditional Chinese', 
      nativeName: '繁體中文',
      flag: '🇹🇼',
      direction: 'ltr'
    },
    'zh-Hant-TW': { 
      name: 'Traditional Chinese (Taiwan)', 
      nativeName: '繁體中文（台灣）',
      flag: '🇹🇼',
      direction: 'ltr'
    },
    'ja': { 
      name: 'Japanese', 
      nativeName: '日本語',
      flag: '🇯🇵',
      direction: 'ltr'
    },
    'ko': { 
      name: 'Korean', 
      nativeName: '한국어',
      flag: '🇰🇷',
      direction: 'ltr'
    },
    'ar': { 
      name: 'Arabic', 
      nativeName: 'العربية',
      flag: '🇸🇦',
      direction: 'rtl'
    },
    'he': { 
      name: 'Hebrew', 
      nativeName: 'עברית',
      flag: '🇮🇱',
      direction: 'rtl'
    },
    'vi': { 
      name: 'Vietnamese', 
      nativeName: 'Tiếng Việt',
      flag: '🇻🇳',
      direction: 'ltr'
    },
    'th': { 
      name: 'Thai', 
      nativeName: 'ไทย',
      flag: '🇹🇭',
      direction: 'ltr'
    }
  };

  // 监听语言变化
  useEffect(() => {
    const handleLanguageChange = (lng) => {
      setCurrentLocale(lng);
      
      // 记录语言切换完成
      if (switchStartTime) {
        const endTime = Date.now();
        i18nMonitor.recordLanguageSwitch(switchStartTime, endTime, currentLocale, lng);
        setSwitchStartTime(null);
      }
    };

    i18n.on('languageChanged', handleLanguageChange);
    return () => i18n.off('languageChanged', handleLanguageChange);
  }, [i18n, currentLocale, switchStartTime]);

  // 处理语言切换
  const handleLanguageChange = (newLocale) => {
    if (newLocale === currentLocale) return;
    
    // 记录切换开始时间
    setSwitchStartTime(Date.now());
    
    // 设置新语言
    setLocale(newLocale);
    i18n.changeLanguage(newLocale);
    
    // 关闭菜单
    setAnchorEl(null);
  };

  // 处理菜单打开
  const handleMenuOpen = (event) => {
    setAnchorEl(event.currentTarget);
  };

  // 处理菜单关闭
  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  // 获取当前语言配置
  const currentLanguageConfig = languageConfig[currentLocale] || languageConfig['en'];

  // Select variant
  if (variant === 'select') {
    return (
      <FormControl size="small" sx={{ minWidth: 120 }}>
        <Select
          value={currentLocale}
          onChange={(e) => handleLanguageChange(e.target.value)}
          displayEmpty
          startAdornment={
            showFlags ? (
              <Box component="span" sx={{ mr: 1, fontSize: '1.2em' }}>
                {currentLanguageConfig.flag}
              </Box>
            ) : null
          }
        >
          {Object.entries(languageConfig).map(([code, config]) => (
            <MenuItem key={code} value={code}>
              <Box sx={{ display: 'flex', alignItems: 'center', width: '100%' }}>
                {showFlags && (
                  <Box component="span" sx={{ mr: 1, fontSize: '1.2em' }}>
                    {config.flag}
                  </Box>
                )}
                <Box sx={{ flexGrow: 1 }}>
                  {showNames ? (
                    <Box>
                      <Typography variant="body2" sx={{ fontWeight: 'medium' }}>
                        {config.nativeName}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {config.name}
                      </Typography>
                    </Box>
                  ) : (
                    <Typography variant="body2">
                      {config.nativeName}
                    </Typography>
                  )}
                </Box>
                {code === currentLocale && (
                  <CheckIcon color="primary" sx={{ ml: 1 }} />
                )}
              </Box>
            </MenuItem>
          ))}
        </Select>
      </FormControl>
    );
  }

  // Chip variant
  if (variant === 'chip') {
    return (
      <Chip
        icon={showFlags ? <span style={{ fontSize: '1.2em' }}>{currentLanguageConfig.flag}</span> : <LanguageIcon />}
        label={showNames ? currentLanguageConfig.nativeName : currentLanguageConfig.name}
        onClick={handleMenuOpen}
        variant="outlined"
        size="small"
        clickable
      />
    );
  }

  // Icon variant
  if (variant === 'icon') {
    return (
      <>
        <Tooltip title={t('common.changeLanguage')}>
          <IconButton onClick={handleMenuOpen} size="small">
            <LanguageIcon />
          </IconButton>
        </Tooltip>
        
        <Menu
          anchorEl={anchorEl}
          open={Boolean(anchorEl)}
          onClose={handleMenuClose}
          PaperProps={{
            sx: { minWidth: 200 }
          }}
        >
          <Box sx={{ px: 2, py: 1 }}>
            <Typography variant="subtitle2" color="text.secondary">
              {t('common.selectLanguage')}
            </Typography>
          </Box>
          <Divider />
          
          {Object.entries(languageConfig).map(([code, config]) => (
            <MenuItem
              key={code}
              onClick={() => handleLanguageChange(code)}
              selected={code === currentLocale}
            >
              <ListItemIcon>
                {showFlags ? (
                  <span style={{ fontSize: '1.2em' }}>{config.flag}</span>
                ) : (
                  <TranslateIcon />
                )}
              </ListItemIcon>
              <ListItemText
                primary={config.nativeName}
                secondary={showNames ? config.name : null}
              />
              {code === currentLocale && (
                <CheckIcon color="primary" />
              )}
            </MenuItem>
          ))}
        </Menu>
      </>
    );
  }

  // Default return Select variant
  return null;
};

export default EnhancedLanguageSwitcher;
