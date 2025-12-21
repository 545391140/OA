/**
 * 酒店列表组件
 * 显示搜索结果中的酒店列表
 */

import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Chip,
  Button,
  Divider,
  Rating,
  Paper,
} from '@mui/material';
import {
  Hotel as HotelIcon,
  LocationOn as LocationIcon,
  Star as StarIcon,
  AttachMoney as MoneyIcon,
  Bed as BedIcon,
  People as PeopleIcon,
} from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import dayjs from 'dayjs';

const HotelList = ({ hotels, searchParams, onSelectHotel }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  // 排序和过滤状态
  const [sortType, setSortType] = useState('price-low');
  const [priceRange, setPriceRange] = useState([0, 100000]); // 增加价格上限，避免过滤掉高价格酒店
  const [minRating, setMinRating] = useState(0);

  // 格式化价格
  const formatPrice = (price) => {
    if (!price) return '-';
    const total = typeof price.total === 'string' ? price.total : price.total?.toString() || '0';
    const currency = price.currency || 'USD';
    return `${currency} ${total}`;
  };

  // 计算入住天数
  const calculateNights = (checkIn, checkOut) => {
    if (!checkIn || !checkOut) return 0;
    const checkInDate = dayjs(checkIn);
    const checkOutDate = dayjs(checkOut);
    return checkOutDate.diff(checkInDate, 'day');
  };

  // 过滤和排序酒店
  const filteredAndSortedHotels = useMemo(() => {
    if (!hotels || hotels.length === 0) return [];

    console.log(`🏨 HotelList 收到 ${hotels.length} 个酒店数据`);
    console.log('📋 第一个酒店数据结构:', hotels[0] ? {
      hasHotel: !!hotels[0].hotel,
      hotelId: hotels[0].hotel?.hotelId,
      hotelName: hotels[0].hotel?.name,
      offersCount: hotels[0].offers?.length || 0,
      hasOffers: !!hotels[0].offers && Array.isArray(hotels[0].offers),
      price: hotels[0].offers?.[0]?.price,
    } : '无数据');

    let filtered = [...hotels];

    // 价格过滤（只过滤有价格的酒店，价格为0或无效的也保留）
    const beforePriceFilter = filtered.length;
    filtered = filtered.filter(hotel => {
      const price = parseFloat(hotel.offers?.[0]?.price?.total || 0);
      // 如果价格为0或无效，保留（可能是数据问题）
      if (!price || price === 0 || isNaN(price)) {
        return true;
      }
      const inRange = price >= priceRange[0] && price <= priceRange[1];
      if (!inRange) {
        console.log(`🚫 价格过滤: ${hotel.hotel?.name} 价格 ${price} 不在范围 [${priceRange[0]}, ${priceRange[1]}]`);
      }
      return inRange;
    });
    if (filtered.length < beforePriceFilter) {
      console.log(`💰 价格过滤: ${beforePriceFilter} -> ${filtered.length} (移除了 ${beforePriceFilter - filtered.length} 个)`);
    }

    // 评分过滤
    if (minRating > 0) {
      filtered = filtered.filter(hotel => {
        const rating = hotel.hotel?.rating || 0;
        return rating >= minRating;
      });
    }

    // 排序
    filtered.sort((a, b) => {
      const priceA = parseFloat(a.offers?.[0]?.price?.total || 0);
      const priceB = parseFloat(b.offers?.[0]?.price?.total || 0);

      switch (sortType) {
        case 'price-low':
          return priceA - priceB;
        case 'price-high':
          return priceB - priceA;
        case 'rating-high':
          const ratingA = a.hotel?.rating || 0;
          const ratingB = b.hotel?.rating || 0;
          return ratingB - ratingA;
        default:
          return 0;
      }
    });

    console.log(`✅ 最终过滤后: ${filtered.length} 个酒店`);
    return filtered;
  }, [hotels, sortType, priceRange, minRating]);

  const handleSelectHotel = (hotel) => {
    if (onSelectHotel) {
      onSelectHotel(hotel);
    } else {
      // 默认导航到详情页
      navigate('/hotel/detail', {
        state: {
          hotel,
          searchParams,
        },
      });
    }
  };

  if (!hotels || hotels.length === 0) {
    return (
      <Paper sx={{ p: 4, textAlign: 'center' }}>
        <Typography variant="h6" color="text.secondary">
          {t('hotel.list.noResults') || '未找到酒店'}
        </Typography>
      </Paper>
    );
  }

  return (
    <Box>
      {/* 筛选和排序栏 */}
      <Paper sx={{ p: 2, mb: 2 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} sm={4}>
            <Typography variant="body2" sx={{ mb: 1 }}>
              {t('hotel.list.sortBy') || '排序方式'}
            </Typography>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button
                size="small"
                variant={sortType === 'price-low' ? 'contained' : 'outlined'}
                onClick={() => setSortType('price-low')}
              >
                {t('hotel.list.priceLow') || '价格从低到高'}
              </Button>
              <Button
                size="small"
                variant={sortType === 'price-high' ? 'contained' : 'outlined'}
                onClick={() => setSortType('price-high')}
              >
                {t('hotel.list.priceHigh') || '价格从高到低'}
              </Button>
              <Button
                size="small"
                variant={sortType === 'rating-high' ? 'contained' : 'outlined'}
                onClick={() => setSortType('rating-high')}
              >
                {t('hotel.list.ratingHigh') || '评分从高到低'}
              </Button>
            </Box>
          </Grid>
        </Grid>
      </Paper>

      {/* 酒店列表 */}
      <Grid container spacing={2}>
        {filteredAndSortedHotels.map((hotel, index) => {
          const hotelInfo = hotel.hotel || {};
          const offer = hotel.offers?.[0] || {};
          const price = offer.price || {};
          const nights = calculateNights(searchParams?.checkInDate, searchParams?.checkOutDate);

          return (
            <Grid item xs={12} key={hotelInfo.hotelId || index}>
              <Card
                sx={{
                  cursor: 'pointer',
                  transition: 'all 0.3s',
                  '&:hover': {
                    boxShadow: 6,
                    transform: 'translateY(-4px)',
                  },
                }}
                onClick={() => handleSelectHotel(hotel)}
              >
                <CardContent>
                  <Grid container spacing={2}>
                    {/* 酒店图片占位 */}
                    <Grid item xs={12} sm={3}>
                      <Box
                        sx={{
                          width: '100%',
                          height: 200,
                          bgcolor: 'grey.200',
                          borderRadius: 2,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <HotelIcon sx={{ fontSize: 64, color: 'grey.400' }} />
                      </Box>
                    </Grid>

                    {/* 酒店信息 */}
                    <Grid item xs={12} sm={6}>
                      <Typography variant="h6" gutterBottom>
                        {hotelInfo.name || t('hotel.list.unknownHotel') || '未知酒店'}
                      </Typography>

                      {/* 评分 */}
                      {hotelInfo.rating && (
                        <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                          <Rating value={hotelInfo.rating} readOnly size="small" />
                          <Typography variant="body2" color="text.secondary" sx={{ ml: 1 }}>
                            {hotelInfo.rating}
                          </Typography>
                        </Box>
                      )}

                      {/* 地址 */}
                      {hotelInfo.address && (
                        <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                          <LocationIcon fontSize="small" color="action" />
                          <Typography variant="body2" color="text.secondary" sx={{ ml: 1 }}>
                            {hotelInfo.address.lines?.[0] || hotelInfo.address.cityName || ''}
                            {hotelInfo.address.cityName && hotelInfo.address.countryCode && `, ${hotelInfo.address.cityName}, ${hotelInfo.address.countryCode}`}
                          </Typography>
                        </Box>
                      )}

                      {/* 房间信息 */}
                      {offer.room && (
                        <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                          <BedIcon fontSize="small" color="action" />
                          <Typography variant="body2" color="text.secondary" sx={{ ml: 1 }}>
                            {offer.room.typeEstimated?.beds || 1} {t('hotel.list.beds') || '张床'}
                            {offer.room.typeEstimated?.bedType && ` (${offer.room.typeEstimated.bedType})`}
                          </Typography>
                        </Box>
                      )}

                      {/* 取消政策 */}
                      {offer.policies?.cancellation && (
                        <Chip
                          label={offer.policies.cancellation.type === 'FREE_CANCELLATION' 
                            ? t('hotel.list.freeCancellation') || '免费取消'
                            : t('hotel.list.nonRefundable') || '不可退款'}
                          size="small"
                          color={offer.policies.cancellation.type === 'FREE_CANCELLATION' ? 'success' : 'default'}
                          sx={{ mt: 1 }}
                        />
                      )}
                    </Grid>

                    {/* 价格和操作 */}
                    <Grid item xs={12} sm={3}>
                      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', height: '100%' }}>
                        <Typography variant="h5" color="primary" gutterBottom>
                          {formatPrice(price)}
                        </Typography>
                        {nights > 0 && (
                          <Typography variant="body2" color="text.secondary">
                            {t('hotel.list.perNight') || '每晚'} / {nights} {t('hotel.list.nights') || '晚'}
                          </Typography>
                        )}
                        <Button
                          variant="contained"
                          sx={{ mt: 2 }}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSelectHotel(hotel);
                          }}
                        >
                          {t('hotel.list.select') || '选择'}
                        </Button>
                      </Box>
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>
            </Grid>
          );
        })}
      </Grid>
    </Box>
  );
};

export default HotelList;

