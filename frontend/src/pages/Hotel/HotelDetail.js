/**
 * 酒店详情页面
 * 显示酒店详细信息，提供预订按钮
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
  Card,
  CardContent,
  Chip,
  Divider,
  Alert,
  CircularProgress,
  Rating,
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  Hotel as HotelIcon,
  LocationOn as LocationIcon,
  Star as StarIcon,
  AttachMoney as MoneyIcon,
  Bed as BedIcon,
  People as PeopleIcon,
  CheckCircle as CheckCircleIcon,
} from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import { useNotification } from '../../contexts/NotificationContext';
import { confirmHotelPrice, getHotelRatings } from '../../services/hotelService';
import dayjs from 'dayjs';

const HotelDetail = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const { showNotification } = useNotification();

  // 从路由状态获取酒店信息和搜索条件
  const { hotel, searchParams, searchResults } = location.state || {};

  const [confirmedPrice, setConfirmedPrice] = useState(null);
  const [priceConfirming, setPriceConfirming] = useState(false);
  const [ratings, setRatings] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (hotel) {
      handleConfirmPrice();
      handleGetRatings();
    }
  }, [hotel]);

  // 确认价格
  const handleConfirmPrice = async () => {
    if (!hotel?.offers?.[0]?.id) return;

    setPriceConfirming(true);
    setError(null);

    try {
      const response = await confirmHotelPrice({ offerId: hotel.offers[0].id });
      if (response.data.success) {
        setConfirmedPrice(response.data.data);
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || '确认价格失败');
    } finally {
      setPriceConfirming(false);
    }
  };

  // 获取酒店评分
  const handleGetRatings = async () => {
    if (!hotel?.hotel?.hotelId) return;

    try {
      const response = await getHotelRatings({ hotelIds: hotel.hotel.hotelId });
      if (response.data.success && response.data.data && response.data.data.length > 0) {
        setRatings(response.data.data[0]);
      }
    } catch (err) {
      // 评分获取失败不影响页面显示
      console.warn('获取酒店评分失败:', err);
    }
  };

  const handleBook = () => {
    if (!hotel) return;

    const offerToUse = confirmedPrice || hotel;
    const offerId = offerToUse.offers?.[0]?.id || hotel.offers?.[0]?.id;

    if (!offerId) {
      showNotification('无法获取报价ID', 'error');
      return;
    }

    // 确保酒店信息完整：如果使用了 confirmedPrice，需要合并原始的 hotel 信息
    // 因为 confirmedPrice 可能只包含价格信息，不包含完整的地址等详细信息
    let hotelToSubmit = offerToUse;
    if (confirmedPrice && hotel) {
      // 合并信息：优先使用 confirmedPrice 的价格信息，但保留原始 hotel 的完整信息
      hotelToSubmit = {
        ...confirmedPrice,
        hotel: {
          ...hotel.hotel, // 保留原始酒店的完整信息（包括地址）
          ...confirmedPrice.hotel, // 使用确认价格后的酒店信息（如果有更新）
        },
        offers: confirmedPrice.offers || hotel.offers, // 使用确认价格后的报价
      };
    }

    // 调试：检查传递的酒店信息是否包含地址
    console.log('📋 跳转到预订页面时的酒店信息:', JSON.stringify({
      hotelId: hotelToSubmit?.hotel?.hotelId,
      name: hotelToSubmit?.hotel?.name,
      hasAddress: !!hotelToSubmit?.hotel?.address,
      address: hotelToSubmit?.hotel?.address,
      cityCode: hotelToSubmit?.hotel?.cityCode,
      cityName: hotelToSubmit?.hotel?.address?.cityName,
      countryCode: hotelToSubmit?.hotel?.address?.countryCode,
    }, null, 2));

    // 导航到预订页面
    navigate('/hotel/booking', {
      state: {
        hotel: hotelToSubmit,
        offerId,
        searchParams,
        searchResults,
      },
    });
  };

  const handleBack = () => {
    // 返回时传递搜索结果和搜索条件，以便恢复列表（与机票逻辑一致）
    if (searchResults) {
      navigate('/flight/search', {
        state: {
          defaultTab: 'hotel',
          searchResults,
          searchParams,
        },
      });
    } else {
      navigate('/flight/search', {
        state: {
          defaultTab: 'hotel',
        },
      });
    }
  };

  if (!hotel) {
    return (
      <Container maxWidth="lg">
        <Alert severity="error" sx={{ mt: 4 }}>
          {t('hotel.detail.notFound') || '酒店信息不存在'}
        </Alert>
        <Button startIcon={<ArrowBackIcon />} onClick={handleBack} sx={{ mt: 2 }}>
          {t('hotel.detail.back') || '返回'}
        </Button>
      </Container>
    );
  }

  const hotelInfo = hotel.hotel || {};
  const offer = confirmedPrice?.offers?.[0] || hotel.offers?.[0] || {};
  const price = offer.price || {};
  const nights = searchParams?.checkInDate && searchParams?.checkOutDate
    ? dayjs(searchParams.checkOutDate).diff(dayjs(searchParams.checkInDate), 'day')
    : 0;

  const formatPrice = (priceObj) => {
    if (!priceObj) return '-';
    const total = typeof priceObj.total === 'string' ? priceObj.total : priceObj.total?.toString() || '0';
    const currency = priceObj.currency || 'USD';
    return `${currency} ${total}`;
  };

  return (
    <Container maxWidth="lg">
      <Box sx={{ py: 3 }}>
        {/* 返回按钮 */}
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={handleBack}
          sx={{ mb: 2 }}
        >
          {t('hotel.detail.back') || '返回'}
        </Button>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {/* 酒店基本信息 */}
        <Paper sx={{ p: 3, mb: 3 }}>
          <Grid container spacing={3}>
            <Grid item xs={12} md={8}>
              <Typography variant="h4" gutterBottom>
                {hotelInfo.name || t('hotel.detail.unknownHotel') || '未知酒店'}
              </Typography>

              {/* 评分 */}
              {hotelInfo.rating && (
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <Rating value={hotelInfo.rating} readOnly />
                  <Typography variant="body1" sx={{ ml: 1 }}>
                    {hotelInfo.rating} / 5
                  </Typography>
                </Box>
              )}

              {/* 地址 */}
              {hotelInfo.address && (
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <LocationIcon color="action" />
                  <Typography variant="body1" sx={{ ml: 1 }}>
                    {hotelInfo.address.lines?.join(', ') || hotelInfo.address.cityName || ''}
                    {hotelInfo.address.cityName && hotelInfo.address.countryCode && `, ${hotelInfo.address.countryCode}`}
                  </Typography>
                </Box>
              )}

              {/* 房间信息 */}
              {offer.room && (
                <Box sx={{ mb: 2 }}>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    {t('hotel.detail.roomType') || '房间类型'}
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <BedIcon color="action" />
                    <Typography>
                      {offer.room.typeEstimated?.beds || 1} {t('hotel.detail.beds') || '张床'}
                      {offer.room.typeEstimated?.bedType && ` (${offer.room.typeEstimated.bedType})`}
                    </Typography>
                  </Box>
                </Box>
              )}
            </Grid>

            {/* 价格和预订 */}
            <Grid item xs={12} md={4}>
              <Card sx={{ position: 'sticky', top: 20 }}>
                <CardContent>
                  <Typography variant="h5" color="primary" gutterBottom>
                    {formatPrice(price)}
                  </Typography>
                  {nights > 0 && (
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      {t('hotel.detail.perNight') || '每晚'} / {nights} {t('hotel.detail.nights') || '晚'}
                    </Typography>
                  )}

                  <Divider sx={{ my: 2 }} />

                  {/* 价格明细 */}
                  {price.base && (
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="body2" color="text.secondary">
                        {t('hotel.detail.basePrice') || '基础价格'}: {price.currency} {price.base}
                      </Typography>
                    </Box>
                  )}

                  {/* 取消政策 */}
                  {offer.policies?.cancellation && (
                    <Box sx={{ mb: 2 }}>
                      <Chip
                        label={offer.policies.cancellation.type === 'FREE_CANCELLATION'
                          ? t('hotel.detail.freeCancellation') || '免费取消'
                          : t('hotel.detail.nonRefundable') || '不可退款'}
                        color={offer.policies.cancellation.type === 'FREE_CANCELLATION' ? 'success' : 'default'}
                        size="small"
                      />
                    </Box>
                  )}

                  <Button
                    variant="contained"
                    fullWidth
                    size="large"
                    startIcon={priceConfirming ? <CircularProgress size={20} /> : <CheckCircleIcon />}
                    onClick={handleBook}
                    disabled={priceConfirming || !offer.id}
                    sx={{ mt: 2 }}
                  >
                    {priceConfirming
                      ? t('hotel.detail.confirming') || '确认中...'
                      : t('hotel.detail.book') || '立即预订'}
                  </Button>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </Paper>

        {/* 详细信息 */}
        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>
            {t('hotel.detail.details') || '详细信息'}
          </Typography>
          <Divider sx={{ mb: 2 }} />

          {/* 入住信息 */}
          {searchParams && (
            <Grid container spacing={2} sx={{ mb: 2 }}>
              <Grid item xs={12} sm={6}>
                <Typography variant="body2" color="text.secondary">
                  {t('hotel.detail.checkIn') || '入住日期'}
                </Typography>
                <Typography variant="body1">
                  {searchParams.checkInDate ? dayjs(searchParams.checkInDate).format('YYYY-MM-DD') : '-'}
                </Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="body2" color="text.secondary">
                  {t('hotel.detail.checkOut') || '退房日期'}
                </Typography>
                <Typography variant="body1">
                  {searchParams.checkOutDate ? dayjs(searchParams.checkOutDate).format('YYYY-MM-DD') : '-'}
                </Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="body2" color="text.secondary">
                  {t('hotel.detail.guests') || '客人'}
                </Typography>
                <Typography variant="body1">
                  {searchParams.adults || 1} {t('hotel.detail.adults') || '成人'}
                  {searchParams.children > 0 && `, ${searchParams.children} ${t('hotel.detail.children') || '儿童'}`}
                </Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="body2" color="text.secondary">
                  {t('hotel.detail.rooms') || '房间'}
                </Typography>
                <Typography variant="body1">
                  {searchParams.roomQuantity || 1} {t('hotel.detail.room') || '间'}
                </Typography>
              </Grid>
            </Grid>
          )}
        </Paper>
      </Box>
    </Container>
  );
};

export default HotelDetail;

