/**
 * 机票搜索页面
 * 提供航班搜索功能
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
} from '@mui/material';
import {
  Search as SearchIcon,
  ArrowBack as ArrowBackIcon,
} from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { useTranslation } from 'react-i18next';
import { useNotification } from '../../contexts/NotificationContext';
import { searchFlights } from '../../services/flightService';
import dayjs from 'dayjs';
import FlightList from './FlightList';
import RegionSelector from '../../components/Common/RegionSelector';

const FlightSearch = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const { showNotification } = useNotification();

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

  // 从location.state或sessionStorage恢复数据
  // 如果是从详情页返回（有searchResults），保留搜索条件
  // 如果是从菜单进入（没有searchResults），清空之前的搜索条件
  const restoredData = (() => {
    if (location.state?.searchResults) {
      // 从详情页返回，保留搜索条件
      const data = {
        searchResults: location.state.searchResults,
        searchParams: { ...location.state.searchParams },
        originLocation: location.state.originLocation,
        destinationLocation: location.state.destinationLocation,
        isRoundTrip: location.state.isRoundTrip
      };
      // 转换日期字符串回dayjs对象
      if (data.searchParams?.departureDate && typeof data.searchParams.departureDate === 'string') {
        data.searchParams.departureDate = dayjs(data.searchParams.departureDate);
      }
      if (data.searchParams?.returnDate && typeof data.searchParams.returnDate === 'string') {
        data.searchParams.returnDate = dayjs(data.searchParams.returnDate);
      }
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
  const [searchParams, setSearchParams] = useState(restoredData?.searchParams || {
    departureDate: dayjs().add(7, 'day'),
    returnDate: null,
    adults: 1,
    children: 0,
    infants: 0,
    travelClass: 'ECONOMY',
    max: 50,
    currencyCode: 'USD',
    nonStop: false,
  });

  const [searchResults, setSearchResults] = useState(restoredData?.searchResults || null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isRoundTrip, setIsRoundTrip] = useState(restoredData?.isRoundTrip || false);

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

  return (
    <LocalizationProvider dateAdapter={AdapterDayjs}>
      <Container maxWidth="xl">
        <Box sx={{ py: 3 }}>
          {/* Header */}
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
            <Typography variant="h4" gutterBottom>
              {t('flight.search.title') || '机票搜索'}
            </Typography>
            <Button
              startIcon={<ArrowBackIcon />}
              onClick={() => navigate(-1)}
              variant="outlined"
            >
              {t('common.back')}
            </Button>
          </Box>

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
                  value={searchParams.departureDate}
                  onChange={(date) => setSearchParams({ ...searchParams, departureDate: date })}
                  minDate={dayjs()}
                  slotProps={{ textField: { fullWidth: true, size: 'small' } }}
                />
              </Box>
              {isRoundTrip && (
                <Box sx={{ flex: { xs: '1 1 100%', md: '1 1 auto' }, minWidth: { xs: '100%', md: 0 } }}>
                  <DatePicker
                    label={t('flight.search.returnDate') || '返程日期'}
                    value={searchParams.returnDate}
                    onChange={(date) => setSearchParams({ ...searchParams, returnDate: date })}
                    minDate={searchParams.departureDate}
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

          {searchResults && (
            <FlightList
              flights={searchResults}
              searchParams={searchParams}
              originLocation={originLocation}
              destinationLocation={destinationLocation}
              isRoundTrip={isRoundTrip}
              onSelectFlight={(flight) => {
                // 导航到预订页面或显示预订对话框
                navigate('/flight/booking', { state: { flight, searchParams } });
              }}
            />
          )}
        </Box>
      </Container>
    </LocalizationProvider>
  );
};

export default FlightSearch;

