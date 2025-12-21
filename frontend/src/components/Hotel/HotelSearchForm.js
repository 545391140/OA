/**
 * 酒店搜索表单组件
 * 提供酒店搜索功能（城市、日期、客人、房间）
 */

import React, { useState, useEffect } from 'react';
import {
  Paper,
  Box,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
  CircularProgress,
  Grid,
} from '@mui/material';
import {
  Search as SearchIcon,
  Hotel as HotelIcon,
} from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { useTranslation } from 'react-i18next';
import dayjs from 'dayjs';
import RegionSelector from '../Common/RegionSelector';

const HotelSearchForm = ({ 
  onSearch, 
  initialValues = {},
  loading = false,
  prefillData = null // 从差旅申请预填充的数据
}) => {
  const { t } = useTranslation();

  // 从预填充数据或初始值初始化
  const [cityCode, setCityCode] = useState(prefillData?.cityCode || initialValues.cityCode || '');
  const [cityLocation, setCityLocation] = useState(prefillData?.cityLocation || initialValues.cityLocation || null);
  const [checkInDate, setCheckInDate] = useState(
    prefillData?.checkInDate 
      ? dayjs(prefillData.checkInDate) 
      : initialValues.checkInDate 
        ? dayjs(initialValues.checkInDate) 
        : dayjs().add(1, 'day')
  );
  const [checkOutDate, setCheckOutDate] = useState(
    prefillData?.checkOutDate 
      ? dayjs(prefillData.checkOutDate) 
      : initialValues.checkOutDate 
        ? dayjs(initialValues.checkOutDate) 
        : dayjs().add(2, 'day')
  );
  const [adults, setAdults] = useState(prefillData?.adults || initialValues.adults || 1);
  const [roomQuantity, setRoomQuantity] = useState(prefillData?.roomQuantity || initialValues.roomQuantity || 1);
  const [children, setChildren] = useState(prefillData?.children || initialValues.children || 0);

  // 当预填充数据变化时更新
  useEffect(() => {
    if (prefillData) {
      if (prefillData.cityCode) setCityCode(prefillData.cityCode);
      if (prefillData.cityLocation) setCityLocation(prefillData.cityLocation);
      if (prefillData.checkInDate) setCheckInDate(dayjs(prefillData.checkInDate));
      if (prefillData.checkOutDate) setCheckOutDate(dayjs(prefillData.checkOutDate));
      if (prefillData.adults) setAdults(prefillData.adults);
      if (prefillData.roomQuantity) setRoomQuantity(prefillData.roomQuantity);
      if (prefillData.children !== undefined) setChildren(prefillData.children);
    }
  }, [prefillData]);

  const handleSearch = () => {
    // 验证必填字段
    const finalCityCode = cityCode || (cityLocation?.code || cityLocation?.iataCode);
    if (!finalCityCode) {
      return;
    }

    if (!checkInDate || !checkOutDate) {
      return;
    }

    if (checkOutDate.isBefore(checkInDate) || checkOutDate.isSame(checkInDate)) {
      return;
    }

    // 构建搜索参数
    const searchParams = {
      cityCode: finalCityCode,
      checkInDate: checkInDate.format('YYYY-MM-DD'),
      checkOutDate: checkOutDate.format('YYYY-MM-DD'),
      adults,
      roomQuantity,
      children: children || 0,
      currencyCode: 'USD',
    };

    onSearch(searchParams);
  };

  return (
    <LocalizationProvider dateAdapter={AdapterDayjs}>
      <Paper sx={{ p: 2, pb: '48px', mb: 3, position: 'relative', overflow: 'visible' }}>
        <Grid container spacing={2} alignItems="flex-start">
          {/* 城市选择 */}
          <Grid item xs={12} md={3}>
            <RegionSelector
              label={t('hotel.search.city') || '城市'}
              value={cityLocation}
              onChange={(location) => {
                setCityLocation(location);
                if (location?.code || location?.iataCode) {
                  setCityCode(location.code || location.iataCode);
                }
              }}
              placeholder={t('hotel.search.cityPlaceholder') || '搜索城市'}
              transportationType="flight" // 复用航班的位置选择器，只允许城市
              allowedTypes={['city']}
              required
            />
          </Grid>

          {/* 入住日期 */}
          <Grid item xs={12} md={2}>
            <DatePicker
              label={t('hotel.search.checkIn') || '入住日期'}
              value={checkInDate}
              onChange={(date) => {
                if (date && dayjs.isDayjs(date) && date.isValid()) {
                  setCheckInDate(date);
                  // 如果退房日期早于新的入住日期，自动调整
                  if (checkOutDate && checkOutDate.isBefore(date)) {
                    setCheckOutDate(date.add(1, 'day'));
                  }
                }
              }}
              minDate={dayjs()}
              slotProps={{ textField: { fullWidth: true, size: 'small' } }}
            />
          </Grid>

          {/* 退房日期 */}
          <Grid item xs={12} md={2}>
            <DatePicker
              label={t('hotel.search.checkOut') || '退房日期'}
              value={checkOutDate}
              onChange={(date) => {
                if (date && dayjs.isDayjs(date) && date.isValid()) {
                  setCheckOutDate(date);
                }
              }}
              minDate={checkInDate ? checkInDate.add(1, 'day') : dayjs().add(1, 'day')}
              slotProps={{ textField: { fullWidth: true, size: 'small' } }}
            />
          </Grid>

          {/* 成人数量 */}
          <Grid item xs={6} md={1}>
            <TextField
              fullWidth
              size="small"
              type="number"
              label={t('hotel.search.adults') || '成人'}
              value={adults}
              onChange={(e) => setAdults(Math.max(1, Math.min(9, parseInt(e.target.value) || 1)))}
              inputProps={{ min: 1, max: 9 }}
            />
          </Grid>

          {/* 儿童数量 */}
          <Grid item xs={6} md={1}>
            <TextField
              fullWidth
              size="small"
              type="number"
              label={t('hotel.search.children') || '儿童'}
              value={children}
              onChange={(e) => setChildren(Math.max(0, Math.min(9, parseInt(e.target.value) || 0)))}
              inputProps={{ min: 0, max: 9 }}
            />
          </Grid>

          {/* 房间数量 */}
          <Grid item xs={6} md={1}>
            <TextField
              fullWidth
              size="small"
              type="number"
              label={t('hotel.search.rooms') || '房间'}
              value={roomQuantity}
              onChange={(e) => setRoomQuantity(Math.max(1, Math.min(9, parseInt(e.target.value) || 1)))}
              inputProps={{ min: 1, max: 9 }}
            />
          </Grid>
        </Grid>

        {/* 搜索按钮 */}
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
            disabled={loading || !cityCode && !cityLocation || !checkInDate || !checkOutDate}
            sx={{ 
              minWidth: '200px',
              height: '48px',
              fontSize: '16px',
              fontWeight: 600,
              borderRadius: '24px',
              textTransform: 'none',
            }}
          >
            {t('hotel.search.search') || '搜索'}
          </Button>
        </Box>
      </Paper>
    </LocalizationProvider>
  );
};

export default HotelSearchForm;

