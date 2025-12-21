/**
 * 机/酒搜索页面
 * 提供航班和酒店搜索功能
 */

import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Container,
  Paper,
  Box,
  Typography,
  Button,
  Grid,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  CircularProgress,
  Tabs,
  Tab,
} from '@mui/material';
import {
  Search as SearchIcon,
  FlightTakeoff as FlightTakeoffIcon,
  FlightLand as FlightLandIcon,
  Explore as ExploreIcon,
  Speed as SpeedIcon,
  Hotel as HotelIcon,
} from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { useTranslation } from 'react-i18next';
import { useNotification } from '../../contexts/NotificationContext';
import { searchFlights } from '../../services/flightService';
import {
  searchHotelsByCity,
  searchHotelOffers,
} from '../../services/hotelService';
import dayjs from 'dayjs';
import FlightList from './FlightList';
import RegionSelector from '../../components/Common/RegionSelector';
import HotelSearchForm from '../../components/Hotel/HotelSearchForm';
import HotelList from '../../components/Hotel/HotelList';

const FlightSearch = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const { showNotification } = useNotification();

  // Tab 状态管理
  const [activeTab, setActiveTab] = useState(() => {
    // 从 location.state 或 URL 参数获取默认 Tab
    if (location.state?.defaultTab === 'hotel') {
      return 1; // 酒店 Tab
    }
    const searchParams = new URLSearchParams(location.search);
    const tabParam = searchParams.get('tab');
    if (tabParam === 'hotel') {
      return 1;
    }
    return 0; // 默认机票 Tab
  });

  // 从sessionStorage或location.state恢复搜索结果和搜索条件
  const getStoredSearchData = () => {
    try {
      const stored = sessionStorage.getItem('flightSearchData');
      if (stored) {
        const data = JSON.parse(stored);
        // 转换日期字符串回dayjs对象
        if (data.searchParams?.departureDate) {
          data.searchParams.departureDate = dayjs(data.searchParams.departureDate);
        }
        if (data.searchParams?.returnDate) {
          data.searchParams.returnDate = dayjs(data.searchParams.returnDate);
        }
        return data;
      }
    } catch (error) {
      console.warn('Failed to restore search data:', error);
    }
    return null;
  };

  // 保存搜索结果到sessionStorage
  const saveSearchData = (results, params, origin, destination, roundTrip) => {
    try {
      const data = {
        searchResults: results,
        searchParams: {
          ...params,
          departureDate: params.departureDate?.format('YYYY-MM-DD'),
          returnDate: params.returnDate?.format('YYYY-MM-DD'),
        },
        originLocation: origin,
        destinationLocation: destination,
        isRoundTrip: roundTrip,
      };
      sessionStorage.setItem('flightSearchData', JSON.stringify(data));
    } catch (error) {
      console.warn('Failed to save search data:', error);
    }
  };

  // 辅助函数：安全地转换日期为 dayjs 对象
  const safeDayjs = (dateValue) => {
    if (!dateValue) return null;
    
    // 如果已经是 dayjs 对象，验证其有效性
    if (dayjs.isDayjs(dateValue)) {
      try {
        // 安全地检查 isValid 方法是否存在
        if (typeof dateValue.isValid === 'function') {
          return dateValue.isValid() ? dateValue : null;
        }
        // 如果没有 isValid 方法，尝试重新创建 dayjs 对象
        const d = dayjs(dateValue);
        return d.isValid() ? d : null;
      } catch (e) {
        // 如果出错，尝试重新创建
        try {
          const d = dayjs(dateValue);
          return d.isValid() ? d : null;
        } catch (e2) {
          return null;
        }
      }
    }
    
    // 如果是字符串，尝试解析
    if (typeof dateValue === 'string') {
      try {
        const d = dayjs(dateValue);
        return d.isValid() ? d : null;
      } catch (e) {
        return null;
      }
    }
    
    // 如果是 Date 对象，转换
    if (dateValue instanceof Date) {
      try {
        const d = dayjs(dateValue);
        return d.isValid() ? d : null;
      } catch (e) {
        return null;
      }
    }
    
    // 如果是对象，尝试从各种可能的属性中提取日期
    if (typeof dateValue === 'object' && dateValue !== null) {
      try {
        // 尝试从 $d 属性（dayjs 的内部结构）提取
        if (dateValue.$d) {
          const d = dayjs(dateValue.$d);
          return d.isValid() ? d : null;
        }
        // 尝试直接转换
        const d = dayjs(dateValue);
        return d.isValid() ? d : null;
      } catch (e) {
        return null;
      }
    }
    
    // 其他情况返回 null
    return null;
  };

  // 从location.state或sessionStorage恢复数据
  // 如果是从详情页或预订页返回（有location.state），保留搜索条件并自动重新查询
  // 如果是从菜单进入（没有location.state），清空之前的搜索条件
  const restoredData = (() => {
    // 检查是否有 location.state（从详情页或预订页返回）
    // 重要：如果 defaultTab === 'hotel'，说明是酒店相关的返回，不应该恢复机票数据
    if (location.state && location.state.defaultTab === 'hotel') {
      // 从酒店详情页返回，不恢复机票数据，清空机票搜索结果
      try {
        sessionStorage.removeItem('flightSearchData');
      } catch (error) {
        console.warn('Failed to clear flight search data:', error);
      }
      return null;
    }
    
    if (location.state && (location.state.searchResults || location.state.searchParams)) {
      // 从机票详情页或预订页返回，保留搜索条件
      const data = {
        searchResults: location.state.searchResults || null,
        searchParams: { ...location.state.searchParams },
        originLocation: location.state.originLocation || null,
        destinationLocation: location.state.destinationLocation || null,
        isRoundTrip: location.state.isRoundTrip || false,
        shouldAutoSearch: true // 标记需要自动重新查询
      };
      // 安全地转换日期字符串回dayjs对象
      data.searchParams.departureDate = safeDayjs(data.searchParams?.departureDate) || dayjs().add(7, 'day');
      data.searchParams.returnDate = safeDayjs(data.searchParams?.returnDate) || null;
      return data;
    } else {
      // 从菜单进入或其他方式进入，清空之前的搜索条件
      // 清除 sessionStorage 中的搜索数据
      try {
        sessionStorage.removeItem('flightSearchData');
      } catch (error) {
        console.warn('Failed to clear search data:', error);
      }
      // 返回 null，使用默认值
      return null;
    }
  })();

  const [originLocation, setOriginLocation] = useState(restoredData?.originLocation || null);
  const [destinationLocation, setDestinationLocation] = useState(restoredData?.destinationLocation || null);
  
  // 确保 searchParams 中的日期是有效的 dayjs 对象
  const defaultSearchParams = {
    departureDate: dayjs().add(7, 'day'),
    returnDate: null,
    adults: 1,
    children: 0,
    infants: 0,
    travelClass: 'ECONOMY',
    max: 50,
    currencyCode: 'USD',
    nonStop: false,
  };
  
  const initialSearchParams = restoredData?.searchParams || defaultSearchParams;
  // 确保日期值是有效的 dayjs 对象
  if (initialSearchParams.departureDate) {
    initialSearchParams.departureDate = safeDayjs(initialSearchParams.departureDate) || defaultSearchParams.departureDate;
  } else {
    initialSearchParams.departureDate = defaultSearchParams.departureDate;
  }
  if (initialSearchParams.returnDate) {
    initialSearchParams.returnDate = safeDayjs(initialSearchParams.returnDate);
  } else {
    initialSearchParams.returnDate = null;
  }
  
  const [searchParams, setSearchParams] = useState(initialSearchParams);

  const [searchResults, setSearchResults] = useState(restoredData?.searchResults || null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isRoundTrip, setIsRoundTrip] = useState(restoredData?.isRoundTrip || false);

  // ========== 酒店搜索相关状态（完全独立） ==========
  // 保存酒店搜索结果到sessionStorage
  const saveHotelSearchData = (results, params) => {
    try {
      const data = {
        searchResults: results,
        searchParams: params,
      };
      sessionStorage.setItem('hotelSearchData', JSON.stringify(data));
    } catch (error) {
      console.warn('Failed to save hotel search data:', error);
    }
  };

  // 从sessionStorage或location.state恢复酒店搜索结果
  const getStoredHotelSearchData = () => {
    try {
      // 优先从 location.state 恢复（从详情页返回）
      if (location.state?.defaultTab === 'hotel' && (location.state.searchResults || location.state.searchParams)) {
        return {
          searchResults: location.state.searchResults || null,
          searchParams: location.state.searchParams || {},
          shouldAutoSearch: true, // 标记需要自动重新查询
        };
      }
      // 从 sessionStorage 恢复
      const stored = sessionStorage.getItem('hotelSearchData');
      if (stored) {
        const data = JSON.parse(stored);
        return {
          searchResults: data.searchResults || null,
          searchParams: data.searchParams || {},
          shouldAutoSearch: false,
        };
      }
    } catch (error) {
      console.warn('Failed to restore hotel search data:', error);
    }
    return null;
  };

  const restoredHotelData = getStoredHotelSearchData();
  const [hotelSearchParams, setHotelSearchParams] = useState(restoredHotelData?.searchParams || {});
  const [hotelResults, setHotelResults] = useState(restoredHotelData?.searchResults || null);
  const [hotelLoading, setHotelLoading] = useState(false);
  const [hotelError, setHotelError] = useState(null);

  // ========== 机票搜索处理（保持不变） ==========
  const handleSearch = async () => {
    if (!originLocation || !destinationLocation) {
      showNotification('请选择出发地和目的地', 'error');
      return;
    }

    if (!searchParams.departureDate) {
      showNotification('请选择出发日期', 'error');
      return;
    }

    if (isRoundTrip && !searchParams.returnDate) {
      showNotification('请选择返程日期', 'error');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const params = {
        originLocation: originLocation, // 传递位置对象
        destinationLocation: destinationLocation, // 传递位置对象
        departureDate: searchParams.departureDate.format('YYYY-MM-DD'),
        returnDate: searchParams.returnDate ? searchParams.returnDate.format('YYYY-MM-DD') : undefined,
        adults: searchParams.adults,
        children: searchParams.children,
        infants: searchParams.infants,
        travelClass: searchParams.travelClass,
        max: searchParams.max,
        currencyCode: searchParams.currencyCode,
        nonStop: searchParams.nonStop,
      };

      const response = await searchFlights(params);
      
      if (response.data.success) {
        const results = response.data.data;
        setSearchResults(results);
        // 保存搜索结果和搜索条件到sessionStorage
        saveSearchData(results, searchParams, originLocation, destinationLocation, isRoundTrip);
        showNotification(`找到 ${response.data.count} 个航班`, 'success');
      } else {
        setError(response.data.message || '搜索失败');
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || '搜索航班失败');
      showNotification('搜索航班失败', 'error');
    } finally {
      setLoading(false);
    }
  };

  // ========== 酒店搜索处理（新增） ==========
  const handleHotelSearch = async (params) => {
    setHotelLoading(true);
    setHotelError(null);
    setHotelSearchParams(params);

    try {
      // 步骤1：通过城市搜索酒店
      const cityResponse = await searchHotelsByCity({
        cityCode: params.cityCode,
        hotelSource: 'ALL',
      });

      if (!cityResponse.data.success || !cityResponse.data.data || cityResponse.data.data.length === 0) {
        const errorMsg = `未找到酒店（城市代码: ${params.cityCode}）。请确认城市代码是否正确，北京应为 BJS，上海应为 SHA。`;
        setHotelError(errorMsg);
        setHotelResults([]);
        showNotification(errorMsg, 'warning');
        return;
      }

      const hotels = cityResponse.data.data;
      console.log(`🔍 找到 ${hotels.length} 个酒店（城市代码: ${params.cityCode}）`);
      
      // 提取更多酒店ID（增加到50个，提高成功率）
      // 注意：Amadeus API可能对hotelIds数量有限制，如果失败可以分批查询
      const hotelIds = hotels.slice(0, 50).map(h => h.hotelId).filter(Boolean);
      console.log(`📋 提取了 ${hotelIds.length} 个酒店ID用于报价搜索`);
      console.log(`📅 搜索日期: ${params.checkInDate} 至 ${params.checkOutDate}`);
      console.log(`👥 客人: ${params.adults} 成人, ${params.children || 0} 儿童`);
      console.log(`🛏️  房间: ${params.roomQuantity} 间`);

      if (hotelIds.length === 0) {
        setHotelError('无法获取酒店ID');
        setHotelResults([]);
        return;
      }

      // 步骤2：搜索酒店报价
      // 分批查询：每批最多20个酒店ID，避免API限制
      const BATCH_SIZE = 20;
      const batches = [];
      for (let i = 0; i < hotelIds.length; i += BATCH_SIZE) {
        batches.push(hotelIds.slice(i, i + BATCH_SIZE));
      }
      
      console.log(`📦 将 ${hotelIds.length} 个酒店ID分成 ${batches.length} 批查询（每批最多 ${BATCH_SIZE} 个）`);
      
      const allResults = [];
      let batchIndex = 0;
      
      for (const batch of batches) {
        batchIndex++;
        console.log(`🔄 查询第 ${batchIndex}/${batches.length} 批（${batch.length} 个酒店）...`);
        
        try {
          const offersResponse = await searchHotelOffers({
            hotelIds: batch,
            checkInDate: params.checkInDate,
            checkOutDate: params.checkOutDate,
            adults: params.adults,
            roomQuantity: params.roomQuantity,
            currencyCode: params.currencyCode || 'USD',
          });
          
          if (offersResponse.data.success && offersResponse.data.data) {
            const batchResults = offersResponse.data.data || [];
            console.log(`   ✅ 第 ${batchIndex} 批找到 ${batchResults.length} 个报价`);
            allResults.push(...batchResults);
          } else {
            console.log(`   ⚠️  第 ${batchIndex} 批查询失败或无结果`);
          }
          
          // 批次之间延迟，避免频率限制（增加到1秒）
          if (batchIndex < batches.length) {
            await new Promise(resolve => setTimeout(resolve, 1000));
          }
        } catch (err) {
          const errorMsg = err.response?.data?.message || err.message || '未知错误';
          const errorStatus = err.response?.status || 'N/A';
          console.error(`   ❌ 第 ${batchIndex} 批查询失败 (HTTP ${errorStatus}):`, errorMsg);
          console.error(`   错误详情:`, {
            status: errorStatus,
            message: errorMsg,
            hotelIdsCount: batch.length,
            hotelIds: batch.slice(0, 3).join(', ') + (batch.length > 3 ? '...' : ''),
          });
          // 继续查询下一批，不中断整个流程
        }
      }
      
      const results = allResults;
      const successRate = hotelIds.length > 0 ? ((results.length / hotelIds.length) * 100).toFixed(1) : 0;
      
      console.log(`💰 总计找到 ${results.length} 个酒店报价（从 ${hotelIds.length} 个酒店中，成功率: ${successRate}%）`);

      // 详细分析结果
      if (results.length > 0) {
        console.log('📊 报价数据结构分析:');
        results.forEach((hotel, index) => {
          console.log(`   酒店 ${index + 1}:`, {
            hotelId: hotel.hotel?.hotelId,
            hotelName: hotel.hotel?.name,
            offersCount: hotel.offers?.length || 0,
            price: hotel.offers?.[0]?.price?.total,
            currency: hotel.offers?.[0]?.price?.currency,
          });
        });
      } else {
        console.log('⚠️  未找到任何报价，可能原因：');
        console.log('   1. 指定日期没有可用房间');
        console.log('   2. 酒店在测试环境数据有限');
        console.log('   3. 搜索参数不匹配（如房间数量、客人数量）');
        console.log('   建议：尝试调整日期或搜索参数');
      }
      
      setHotelResults(results);
      
      // 保存酒店搜索结果和搜索条件到sessionStorage
      saveHotelSearchData(results, params);
      
      // 如果报价数量少于酒店数量，提示用户
      if (results.length < hotelIds.length && results.length > 0) {
        const message = `找到 ${results.length} 个酒店报价（共 ${hotels.length} 个酒店，其中 ${hotelIds.length} 个已查询，成功率 ${successRate}%）`;
        showNotification(message, 'info');
        console.log(`💡 提示: ${message}`);
        console.log(`💡 建议: 如果结果太少，可以尝试调整日期范围`);
      } else if (results.length === 0) {
        const message = `未找到可用报价（已查询 ${hotelIds.length} 个酒店）。建议：1) 调整入住/退房日期 2) 尝试未来30-60天的日期 3) 检查搜索参数`;
        showNotification(message, 'warning');
        console.log(`⚠️  ${message}`);
      } else {
        showNotification(`找到 ${results.length} 个酒店报价`, 'success');
      }
    } catch (err) {
      const errorMsg = err.response?.data?.message || err.message || '搜索酒店失败';
      setHotelError(errorMsg);
      showNotification(errorMsg, 'error');
    } finally {
      setHotelLoading(false);
    }
  };

  // Tab 切换处理
  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
    // 切换 Tab 时，可以保存当前 Tab 的状态到 sessionStorage
    if (newValue === 0) {
      // 切换到机票 Tab，保存酒店搜索状态，并清空机票搜索结果（避免显示酒店数据）
      try {
        if (hotelResults && hotelSearchParams) {
          sessionStorage.setItem('hotelSearchData', JSON.stringify({
            searchResults: hotelResults,
            searchParams: hotelSearchParams,
          }));
        }
      } catch (error) {
        console.warn('Failed to save hotel search data:', error);
      }
      // 清空机票搜索结果，避免显示之前的数据
      setSearchResults(null);
    } else {
      // 切换到酒店 Tab，保存机票搜索状态
      saveSearchData(searchResults, searchParams, originLocation, destinationLocation, isRoundTrip);
      // 清除酒店搜索的 sessionStorage（从菜单进入时）
      if (!location.state?.defaultTab) {
        try {
          sessionStorage.removeItem('hotelSearchData');
        } catch (error) {
          console.warn('Failed to clear hotel search data:', error);
        }
      }
    }
  };

  // 如果是从详情页或预订页返回，自动重新查询（机票）
  useEffect(() => {
    if (restoredData?.shouldAutoSearch && originLocation && destinationLocation && searchParams.departureDate) {
      // 延迟一下，确保组件完全加载
      const timer = setTimeout(() => {
        handleSearch();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, []); // 只在组件挂载时执行一次

  // 如果是从详情页或预订页返回，自动重新查询（酒店）
  useEffect(() => {
    if (restoredHotelData?.shouldAutoSearch && hotelSearchParams?.cityCode && hotelSearchParams?.checkInDate && hotelSearchParams?.checkOutDate) {
      // 延迟一下，确保组件完全加载
      const timer = setTimeout(() => {
        handleHotelSearch(hotelSearchParams);
      }, 100);
      return () => clearTimeout(timer);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // 只在组件挂载时执行一次

  return (
    <LocalizationProvider dateAdapter={AdapterDayjs}>
      <Container maxWidth="xl">
        <Box sx={{ py: 3 }}>
          {/* Header */}
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
            <Typography variant="h4" gutterBottom>
              {t('flight.search.title') || '预订搜索'}
            </Typography>
          </Box>

          {/* Tab 切换器 */}
          <Paper elevation={1} sx={{ mb: 3 }}>
            <Tabs 
              value={activeTab} 
              onChange={handleTabChange}
              variant="fullWidth"
              sx={{
                borderBottom: 1,
                borderColor: 'divider',
                '& .MuiTab-root': {
                  minHeight: 64,
                  fontSize: '16px',
                  fontWeight: 600,
                },
              }}
            >
              <Tab 
                label={t('flight.search.tab') || '机/酒预订'} 
                icon={<FlightTakeoffIcon />} 
                iconPosition="start"
              />
              <Tab 
                label={t('hotel.search.tab') || '酒店预订'} 
                icon={<HotelIcon />} 
                iconPosition="start"
              />
            </Tabs>
          </Paper>

          {/* 根据 Tab 显示对应内容 */}
          {activeTab === 0 ? (
            <>
              {/* ========== 机票 Tab：完全保持现有代码不变 ========== */}
              {/* Search Form */}
              <Paper sx={{ p: 2, pb: '48px', mb: 3, position: 'relative', overflow: 'visible' }}>
            <Box sx={{ display: 'flex', gap: 2, flexWrap: { xs: 'wrap', md: 'nowrap' }, alignItems: 'flex-start' }}>
              <Box sx={{ flex: { xs: '1 1 100%', md: '1 1 auto' }, minWidth: { xs: '100%', md: 0 } }}>
                <RegionSelector
                  label={t('flight.search.origin') || '出发地'}
                  value={originLocation}
                  onChange={(location) => setOriginLocation(location)}
                  placeholder={t('flight.search.originPlaceholder') || '搜索机场或城市'}
                  transportationType="flight"
                  allowedTypes={['airport', 'city']}
                  required
                />
              </Box>
              <Box sx={{ flex: { xs: '1 1 100%', md: '1 1 auto' }, minWidth: { xs: '100%', md: 0 } }}>
                <RegionSelector
                  label={t('flight.search.destination') || '目的地'}
                  value={destinationLocation}
                  onChange={(location) => setDestinationLocation(location)}
                  placeholder={t('flight.search.destinationPlaceholder') || '搜索机场或城市'}
                  transportationType="flight"
                  allowedTypes={['airport', 'city']}
                  required
                />
              </Box>
              <Box sx={{ flex: { xs: '1 1 100%', md: '1 1 auto' }, minWidth: { xs: '100%', md: 0 } }}>
                <DatePicker
                  label={t('flight.search.departureDate') || '出发日期'}
                  value={(() => {
                    const date = searchParams.departureDate;
                    if (date && dayjs.isDayjs(date) && date.isValid()) {
                      return date;
                    }
                    // 如果日期无效，返回默认值（7天后）
                    return dayjs().add(7, 'day');
                  })()}
                  onChange={(date) => {
                    if (date && dayjs.isDayjs(date) && date.isValid()) {
                      setSearchParams({ ...searchParams, departureDate: date });
                    } else {
                      // 如果日期无效，设置为默认值
                      setSearchParams({ ...searchParams, departureDate: dayjs().add(7, 'day') });
                    }
                  }}
                  minDate={dayjs()}
                  slotProps={{ textField: { fullWidth: true, size: 'small' } }}
                />
              </Box>
              {isRoundTrip && (
                <Box sx={{ flex: { xs: '1 1 100%', md: '1 1 auto' }, minWidth: { xs: '100%', md: 0 } }}>
                  <DatePicker
                    label={t('flight.search.returnDate') || '返程日期'}
                    value={(() => {
                      const date = searchParams.returnDate;
                      if (date && dayjs.isDayjs(date) && date.isValid()) {
                        return date;
                      }
                      return null;
                    })()}
                    onChange={(date) => {
                      if (date && dayjs.isDayjs(date) && date.isValid()) {
                        setSearchParams({ ...searchParams, returnDate: date });
                      } else {
                        setSearchParams({ ...searchParams, returnDate: null });
                      }
                    }}
                    minDate={(() => {
                      const departureDate = searchParams.departureDate;
                      if (departureDate && dayjs.isDayjs(departureDate) && departureDate.isValid()) {
                        return departureDate;
                      }
                      return dayjs();
                    })()}
                    slotProps={{ textField: { fullWidth: true, size: 'small' } }}
                  />
                </Box>
              )}
              <Box sx={{ flex: { xs: '1 1 calc(50% - 8px)', md: '1 1 auto' }, minWidth: { xs: 'calc(50% - 8px)', md: 0 } }}>
                <FormControl fullWidth size="small">
                  <InputLabel>{t('flight.search.tripType') || '行程类型'}</InputLabel>
                  <Select
                    value={isRoundTrip ? 'round' : 'oneway'}
                    onChange={(e) => {
                      setIsRoundTrip(e.target.value === 'round');
                      if (e.target.value === 'oneway') {
                        setSearchParams({ ...searchParams, returnDate: null });
                      }
                    }}
                    label={t('flight.search.tripType') || '行程类型'}
                  >
                    <MenuItem value="oneway">{t('flight.search.oneWay') || '单程'}</MenuItem>
                    <MenuItem value="round">{t('flight.search.roundTrip') || '往返'}</MenuItem>
                  </Select>
                </FormControl>
              </Box>
              <Box sx={{ flex: { xs: '1 1 calc(50% - 8px)', md: '1 1 auto' }, minWidth: { xs: 'calc(50% - 8px)', md: 0 } }}>
                <TextField
                  fullWidth
                  size="small"
                  type="number"
                  label={t('flight.search.adults') || '成人'}
                  value={searchParams.adults}
                  onChange={(e) => setSearchParams({ ...searchParams, adults: parseInt(e.target.value) || 1 })}
                  inputProps={{ min: 1, max: 9 }}
                />
              </Box>
              <Box sx={{ flex: { xs: '1 1 calc(50% - 8px)', md: '1 1 auto' }, minWidth: { xs: 'calc(50% - 8px)', md: 0 } }}>
                <TextField
                  fullWidth
                  size="small"
                  type="number"
                  label={t('flight.search.children') || '儿童'}
                  value={searchParams.children}
                  onChange={(e) => setSearchParams({ ...searchParams, children: parseInt(e.target.value) || 0 })}
                  inputProps={{ min: 0, max: 9 }}
                />
              </Box>
              <Box sx={{ flex: { xs: '1 1 calc(50% - 8px)', md: '1 1 auto' }, minWidth: { xs: 'calc(50% - 8px)', md: 0 } }}>
                <FormControl fullWidth size="small">
                  <InputLabel>{t('flight.search.travelClass') || '舱位等级'}</InputLabel>
                  <Select
                    value={searchParams.travelClass}
                    onChange={(e) => setSearchParams({ ...searchParams, travelClass: e.target.value })}
                    label={t('flight.search.travelClass') || '舱位等级'}
                  >
                    <MenuItem value="ECONOMY">{t('flight.search.economy') || '经济舱'}</MenuItem>
                    <MenuItem value="PREMIUM_ECONOMY">{t('flight.search.premiumEconomy') || '超级经济舱'}</MenuItem>
                    <MenuItem value="BUSINESS">{t('flight.search.business') || '商务舱'}</MenuItem>
                    <MenuItem value="FIRST">{t('flight.search.first') || '头等舱'}</MenuItem>
                  </Select>
                </FormControl>
              </Box>
            </Box>
            {/* Search Button - Centered on new line */}
            <Box sx={{ 
              display: 'flex', 
              justifyContent: 'center', 
              mt: 3,
              position: 'absolute',
              bottom: '-24px',
              left: 0,
              right: 0,
              zIndex: 1
            }}>
              <Button
                variant="contained"
                startIcon={loading ? <CircularProgress size={20} /> : <SearchIcon />}
                onClick={handleSearch}
                disabled={loading}
                sx={{ 
                  minWidth: '200px',
                  height: '48px',
                  fontSize: '16px',
                  fontWeight: 600,
                  borderRadius: '24px'
                }}
              >
                {t('flight.search.search') || '搜索'}
              </Button>
            </Box>
          </Paper>

          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          {searchResults && Array.isArray(searchResults) && searchResults.length > 0 && (
            <FlightList
              flights={searchResults}
              searchParams={searchParams}
              originLocation={originLocation}
              destinationLocation={destinationLocation}
              isRoundTrip={isRoundTrip}
              onSelectFlight={(flight) => {
                // 导航到预订页面，传递所有搜索条件以便返回时恢复
                navigate('/flight/booking', { 
                  state: { 
                    flight, 
                    searchParams,
                    searchResults,
                    originLocation,
                    destinationLocation,
                    isRoundTrip
                  } 
                });
              }}
            />
          )}

          {(!searchResults || !Array.isArray(searchResults) || searchResults.length === 0) && !loading && !error && (
            <Paper
              elevation={0}
              sx={{
                mt: 4,
                p: 6,
                textAlign: 'center',
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                borderRadius: 4,
                color: 'white',
                position: 'relative',
                overflow: 'hidden',
                '&::before': {
                  content: '""',
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  background: 'radial-gradient(circle at 20% 50%, rgba(255,255,255,0.1) 0%, transparent 50%)',
                  pointerEvents: 'none',
                }
              }}
            >
              <Box sx={{ position: 'relative', zIndex: 1 }}>
                {/* 图标装饰 */}
                <Box sx={{ display: 'flex', justifyContent: 'center', gap: 3, mb: 3 }}>
                  <Box
                    sx={{
                      p: 2,
                      borderRadius: '50%',
                      bgcolor: 'rgba(255, 255, 255, 0.2)',
                      backdropFilter: 'blur(10px)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      animation: 'float 3s ease-in-out infinite',
                      '@keyframes float': {
                        '0%, 100%': { transform: 'translateY(0px)' },
                        '50%': { transform: 'translateY(-10px)' },
                      },
                    }}
                  >
                    <FlightTakeoffIcon sx={{ fontSize: 48, color: 'white' }} />
                  </Box>
                  <Box
                    sx={{
                      p: 2,
                      borderRadius: '50%',
                      bgcolor: 'rgba(255, 255, 255, 0.2)',
                      backdropFilter: 'blur(10px)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      animation: 'float 3s ease-in-out infinite 0.5s',
                      '@keyframes float': {
                        '0%, 100%': { transform: 'translateY(0px)' },
                        '50%': { transform: 'translateY(-10px)' },
                      },
                    }}
                  >
                    <SpeedIcon sx={{ fontSize: 48, color: 'white' }} />
                  </Box>
                  <Box
                    sx={{
                      p: 2,
                      borderRadius: '50%',
                      bgcolor: 'rgba(255, 255, 255, 0.2)',
                      backdropFilter: 'blur(10px)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      animation: 'float 3s ease-in-out infinite 1s',
                      '@keyframes float': {
                        '0%, 100%': { transform: 'translateY(0px)' },
                        '50%': { transform: 'translateY(-10px)' },
                      },
                    }}
                  >
                    <FlightLandIcon sx={{ fontSize: 48, color: 'white' }} />
                  </Box>
                </Box>

                {/* 主标题 */}
                <Typography
                  variant="h3"
                  sx={{
                    fontWeight: 700,
                    mb: 2,
                    fontSize: { xs: '2rem', md: '3rem' },
                    textShadow: '0 2px 10px rgba(0,0,0,0.2)',
                  }}
                >
                  {t('flight.search.placeholder.title') || '快速订票，轻松出差'}
                </Typography>

                {/* 副标题 */}
                <Typography
                  variant="h6"
                  sx={{
                    mb: 4,
                    opacity: 0.95,
                    fontSize: { xs: '1rem', md: '1.25rem' },
                    fontWeight: 300,
                    maxWidth: '600px',
                    mx: 'auto',
                  }}
                >
                  {t('flight.search.placeholder.subtitle') || '输入出发地和目的地，一键搜索全球航班，让您的差旅更便捷'}
                </Typography>

                {/* 功能特点 */}
                <Grid container spacing={3} sx={{ mt: 4, maxWidth: '800px', mx: 'auto' }}>
                  <Grid item xs={12} sm={4}>
                    <Box
                      sx={{
                        p: 2,
                        borderRadius: 2,
                        bgcolor: 'rgba(255, 255, 255, 0.15)',
                        backdropFilter: 'blur(10px)',
                        height: '100%',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        transition: 'transform 0.3s',
                        '&:hover': {
                          transform: 'translateY(-5px)',
                          bgcolor: 'rgba(255, 255, 255, 0.2)',
                        },
                      }}
                    >
                      <ExploreIcon sx={{ fontSize: 40, mb: 1 }} />
                      <Typography variant="body1" sx={{ fontWeight: 600, mb: 0.5 }}>
                        {t('flight.search.placeholder.feature1.title') || '全球覆盖'}
                      </Typography>
                      <Typography variant="body2" sx={{ opacity: 0.9, textAlign: 'center' }}>
                        {t('flight.search.placeholder.feature1.desc') || '覆盖全球主要城市和机场'}
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <Box
                      sx={{
                        p: 2,
                        borderRadius: 2,
                        bgcolor: 'rgba(255, 255, 255, 0.15)',
                        backdropFilter: 'blur(10px)',
                        height: '100%',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        transition: 'transform 0.3s',
                        '&:hover': {
                          transform: 'translateY(-5px)',
                          bgcolor: 'rgba(255, 255, 255, 0.2)',
                        },
                      }}
                    >
                      <SpeedIcon sx={{ fontSize: 40, mb: 1 }} />
                      <Typography variant="body1" sx={{ fontWeight: 600, mb: 0.5 }}>
                        {t('flight.search.placeholder.feature2.title') || '快速搜索'}
                      </Typography>
                      <Typography variant="body2" sx={{ opacity: 0.9, textAlign: 'center' }}>
                        {t('flight.search.placeholder.feature2.desc') || '实时比价，快速找到最优航班'}
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <Box
                      sx={{
                        p: 2,
                        borderRadius: 2,
                        bgcolor: 'rgba(255, 255, 255, 0.15)',
                        backdropFilter: 'blur(10px)',
                        height: '100%',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        transition: 'transform 0.3s',
                        '&:hover': {
                          transform: 'translateY(-5px)',
                          bgcolor: 'rgba(255, 255, 255, 0.2)',
                        },
                      }}
                    >
                      <FlightTakeoffIcon sx={{ fontSize: 40, mb: 1 }} />
                      <Typography variant="body1" sx={{ fontWeight: 600, mb: 0.5 }}>
                        {t('flight.search.placeholder.feature3.title') || '便捷预订'}
                      </Typography>
                      <Typography variant="body2" sx={{ opacity: 0.9, textAlign: 'center' }}>
                        {t('flight.search.placeholder.feature3.desc') || '一站式预订，简化差旅流程'}
                      </Typography>
                    </Box>
                  </Grid>
                </Grid>
              </Box>
            </Paper>
          )}
            </>
          ) : (
            <>
              {/* ========== 酒店 Tab：完全独立的新功能 ========== */}
              <HotelSearchForm
                onSearch={handleHotelSearch}
                initialValues={hotelSearchParams}
                loading={hotelLoading}
                prefillData={location.state?.prefillData}
              />

              {hotelError && (
                <Alert severity="error" sx={{ mb: 2 }}>
                  {hotelError}
                </Alert>
              )}

              {hotelResults && (
                <HotelList
                  hotels={hotelResults}
                  searchParams={hotelSearchParams}
                  onSelectHotel={(hotel) => {
                    // 导航到酒店详情页
                    navigate('/hotel/detail', {
                      state: {
                        hotel,
                        searchParams: hotelSearchParams,
                        searchResults: hotelResults,
                      },
                    });
                  }}
                />
              )}

              {!hotelResults && !hotelLoading && !hotelError && (
                <Paper
                  elevation={0}
                  sx={{
                    mt: 4,
                    p: 6,
                    textAlign: 'center',
                    background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
                    borderRadius: 4,
                    color: 'white',
                  }}
                >
                  <HotelIcon sx={{ fontSize: 64, mb: 2 }} />
                  <Typography variant="h4" gutterBottom>
                    {t('hotel.search.placeholder.title') || '搜索酒店，轻松入住'}
                  </Typography>
                  <Typography variant="body1" sx={{ opacity: 0.9 }}>
                    {t('hotel.search.placeholder.subtitle') || '选择城市和日期，搜索全球酒店'}
                  </Typography>
                </Paper>
              )}
            </>
          )}
        </Box>
      </Container>
    </LocalizationProvider>
  );
};

export default FlightSearch;

