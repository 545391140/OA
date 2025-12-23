/**
 * 热门城市选择组件
 * 用于显示和选择热门城市
 */

import React, { useState, useCallback } from 'react';
import {
  Box,
  Tabs,
  Tab,
  Grid,
  Button,
  Typography
} from '@mui/material';
import { useTranslation } from 'react-i18next';
import { hotCitiesData } from '../../data/cityData';
import { getDomesticCitiesByLetter } from '../../utils/cityUtils';

const HotCitySelector = ({
  onCitySelect,
  currentLanguage = 'zh'
}) => {
  const { t } = useTranslation();
  const [hotCityCategory, setHotCityCategory] = useState('international'); // 'domestic' 或 'international'
  const [hotCitySubCategory, setHotCitySubCategory] = useState('internationalHot'); // 国际子分类
  const [domesticSubCategory, setDomesticSubCategory] = useState('hot'); // 国内子分类：'hot' 或字母组

  /**
   * 获取城市显示名称（根据当前语言）
   */
  const getCityDisplayName = useCallback((city) => {
    if (typeof city === 'string') {
      // 如果是字符串（国内城市按字母分类），直接返回
      return city;
    }
    
    // 如果是对象（多语言支持）
    if (typeof city === 'object' && city !== null) {
      // 根据当前语言返回对应的名称
      const lang = currentLanguage.toLowerCase();
      
      // 处理语言代码变体（如 zh-Hans -> zh, zh-Hans-CN -> zh）
      const baseLang = lang.split('-')[0];
      
      // 优先使用完整语言代码匹配（如 ja, ko, th, vi, ar）
      if (city[lang]) {
        return city[lang];
      }
      
      // 其次使用基础语言代码匹配（如 zh, en）
      if (city[baseLang]) {
        return city[baseLang];
      }
      
      // 如果是中文相关语言，使用中文
      if (baseLang === 'zh' || lang.startsWith('zh')) {
        return city.zh || city.en || Object.values(city)[0] || '';
      }
      
      // 其他语言使用英文
      return city.en || city.zh || Object.values(city)[0] || '';
    }
    
    return '';
  }, [currentLanguage]);

  /**
   * 获取城市搜索名称（用于API搜索，优先使用中文或英文）
   */
  const getCitySearchName = useCallback((city) => {
    if (typeof city === 'string') {
      // 如果是字符串，直接返回
      return city;
    }
    
    // 如果是对象，优先使用中文，其次英文
    if (typeof city === 'object' && city !== null) {
      return city.zh || city.en || Object.values(city)[0] || '';
    }
    
    return '';
  }, []);

  /**
   * 获取热门城市列表
   */
  const getHotCitiesList = () => {
    if (hotCityCategory === 'domestic') {
      if (domesticSubCategory === 'hot') {
        return hotCitiesData.domesticHot;
      } else {
        // 按字母筛选（返回字符串数组）
        const citiesByLetter = getDomesticCitiesByLetter();
        return citiesByLetter[domesticSubCategory] || [];
      }
    } else {
      return hotCitiesData[hotCitySubCategory] || hotCitiesData.internationalHot;
    }
  };

  /**
   * 处理热门城市选择
   */
  const handleHotCitySelect = useCallback((city) => {
    if (onCitySelect) {
      const displayName = getCityDisplayName(city);
      const searchName = getCitySearchName(city);
      onCitySelect(city, displayName, searchName);
    }
  }, [onCitySelect, getCityDisplayName, getCitySearchName]);

  /**
   * 渲染热门城市内容
   */
  const renderHotCities = () => {
    const cities = getHotCitiesList();
    
    return (
      <Box sx={{ width: '100%', maxWidth: 800 }}>
        <Box sx={{ display: 'flex', borderBottom: '1px solid #e5e7eb' }}>
          {/* 左侧分类 */}
          <Box sx={{ 
            width: 120, 
            borderRight: '1px solid #e5e7eb',
            bgcolor: '#f9fafb'
          }}>
            <Button
              fullWidth
              onClick={() => {
                setHotCityCategory('domestic');
                setDomesticSubCategory('hot'); // 切换到国内时，默认显示热门
              }}
              disableRipple
              sx={{
                justifyContent: 'center',
                px: 2,
                py: 1.5,
                textTransform: 'none',
                color: hotCityCategory === 'domestic' ? '#2563eb' : '#6b7280',
                bgcolor: hotCityCategory === 'domestic' ? '#eff6ff' : 'transparent',
                fontWeight: hotCityCategory === 'domestic' ? 600 : 400,
                border: 'none !important',
                outline: 'none !important',
                boxShadow: 'none !important',
                textAlign: 'center',
                '&:hover': {
                  bgcolor: hotCityCategory === 'domestic' ? '#dbeafe' : '#f3f4f6',
                },
              }}
            >
              {t('location.selector.hotCities.domestic')}
            </Button>
            <Button
              fullWidth
              onClick={() => {
                setHotCityCategory('international');
                setHotCitySubCategory('internationalHot');
              }}
              disableRipple
              sx={{
                justifyContent: 'center',
                px: 2,
                py: 1.5,
                textTransform: 'none',
                color: hotCityCategory === 'international' ? '#2563eb' : '#6b7280',
                bgcolor: hotCityCategory === 'international' ? '#eff6ff' : 'transparent',
                fontWeight: hotCityCategory === 'international' ? 600 : 400,
                border: 'none !important',
                outline: 'none !important',
                boxShadow: 'none !important',
                textAlign: 'center',
                '&:hover': {
                  bgcolor: hotCityCategory === 'international' ? '#dbeafe' : '#f3f4f6',
                },
              }}
            >
              {t('location.selector.hotCities.international')}<br />
              {t('location.selector.hotCities.hongKongMacauTaiwan')}
            </Button>
          </Box>

          {/* 右侧内容区域 */}
          <Box sx={{ flex: 1 }}>
            {/* 子分类标签 */}
            {hotCityCategory === 'domestic' && (
              <Box sx={{ borderBottom: '1px solid #e5e7eb', px: 2 }}>
                <Tabs
                  value={domesticSubCategory}
                  onChange={(e, newValue) => setDomesticSubCategory(newValue)}
                  sx={{
                    minHeight: 48,
                    '& .MuiTab-root': {
                      minHeight: 48,
                      textTransform: 'none',
                      fontSize: '0.875rem',
                      fontWeight: 500,
                      color: '#6b7280',
                      '&.Mui-selected': {
                        color: '#2563eb',
                        fontWeight: 600
                      }
                    },
                    '& .MuiTabs-indicator': {
                      backgroundColor: '#2563eb',
                      height: 2
                    }
                  }}
                >
                  <Tab label={t('location.selector.hotCities.hot')} value="hot" />
                  <Tab label="ABCDEF" value="ABCDEF" />
                  <Tab label="GHIJ" value="GHIJ" />
                  <Tab label="KLMN" value="KLMN" />
                  <Tab label="PQRSTUVW" value="PQRSTUVW" />
                  <Tab label="XYZ" value="XYZ" />
                </Tabs>
              </Box>
            )}
            {hotCityCategory === 'international' && (
              <Box sx={{ borderBottom: '1px solid #e5e7eb', px: 2 }}>
                <Tabs
                  value={hotCitySubCategory}
                  onChange={(e, newValue) => setHotCitySubCategory(newValue)}
                  sx={{
                    minHeight: 48,
                    '& .MuiTab-root': {
                      minHeight: 48,
                      textTransform: 'none',
                      fontSize: '0.875rem',
                      fontWeight: 500,
                      color: '#6b7280',
                      '&.Mui-selected': {
                        color: '#2563eb',
                        fontWeight: 600
                      }
                    },
                    '& .MuiTabs-indicator': {
                      backgroundColor: '#2563eb',
                      height: 2
                    }
                  }}
                >
                  <Tab label={t('location.selector.hotCities.internationalHot')} value="internationalHot" />
                  <Tab label={t('location.selector.hotCities.asia')} value="asia" />
                  <Tab label={t('location.selector.hotCities.europe')} value="europe" />
                  <Tab label={t('location.selector.hotCities.americas')} value="americas" />
                  <Tab label={t('location.selector.hotCities.africa')} value="africa" />
                  <Tab label={t('location.selector.hotCities.oceania')} value="oceania" />
                </Tabs>
              </Box>
            )}

            {/* 城市网格 */}
            <Box sx={{ p: 1.5 }}>
              <Grid container spacing={0.5}>
                {cities.filter(city => city && (typeof city === 'string' || typeof city === 'object')).map((city, index) => {
                  const displayName = getCityDisplayName(city);
                  const cityKey = typeof city === 'string' ? city : (city.zh || city.en || `city-${index}`);
                  
                  return (
                    <Grid item xs={4} sm={3} md={2} key={cityKey}>
                      <Box
                        component="div"
                        onClick={() => handleHotCitySelect(city)}
                        onMouseDown={(e) => e.preventDefault()}
                        tabIndex={-1}
                        sx={{
                          py: 1,
                          px: 1.5,
                          color: '#374151',
                          fontSize: '0.875rem',
                          fontWeight: 400,
                          cursor: 'pointer',
                          borderRadius: 1,
                          textAlign: 'center',
                          transition: 'all 0.2s ease',
                          border: 'none !important',
                          outline: 'none !important',
                          boxShadow: 'none !important',
                          userSelect: 'none',
                          '&:hover': {
                            color: '#2563eb',
                            bgcolor: '#eff6ff',
                          },
                          '&:active': {
                            bgcolor: '#eff6ff'
                          }
                        }}
                      >
                        {displayName || ''}
                      </Box>
                    </Grid>
                  );
                })}
              </Grid>
            </Box>
          </Box>
        </Box>
      </Box>
    );
  };

  return renderHotCities();
};

export default HotCitySelector;














