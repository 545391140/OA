/**
 * 酒店列表组件
 * 显示搜索结果中的酒店列表
 */

import React, { useState, useMemo, useRef, useEffect } from 'react';
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
  TextField,
} from '@mui/material';
import {
  Hotel as HotelIcon,
  LocationOn as LocationIcon,
  Star as StarIcon,
  AttachMoney as MoneyIcon,
  Bed as BedIcon,
  People as PeopleIcon,
  Phone as PhoneIcon,
  Email as EmailIcon,
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
  const [hotelNameFilter, setHotelNameFilter] = useState(''); // 酒店名称搜索
  const [imageErrors, setImageErrors] = useState({}); // 记录图片加载失败的酒店ID
  const isMountedRef = useRef(true); // 跟踪组件挂载状态

  // 组件挂载/卸载时更新 ref
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

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
    if (hotels[0]) {
      const firstHotel = hotels[0];
      const hotelInfo = firstHotel.hotel || {};
      console.log('📋 第一个酒店完整数据结构:', JSON.stringify({
        hotel: {
          hotelId: hotelInfo.hotelId,
          name: hotelInfo.name,
          address: hotelInfo.address,
          contact: hotelInfo.contact,
          hasContact: !!hotelInfo.contact,
          contactPhone: hotelInfo.contact?.phone,
          contactEmail: hotelInfo.contact?.email,
          description: hotelInfo.description,
          hasDescription: !!hotelInfo.description,
          descriptionText: hotelInfo.description?.text,
          media: hotelInfo.media,
          mediaType: Array.isArray(hotelInfo.media) ? 'array' : typeof hotelInfo.media,
          mediaLength: Array.isArray(hotelInfo.media) ? hotelInfo.media.length : 'N/A',
          firstMediaItem: Array.isArray(hotelInfo.media) && hotelInfo.media.length > 0 ? hotelInfo.media[0] : 'N/A',
        },
        offersCount: firstHotel.offers?.length || 0,
        hasOffers: !!firstHotel.offers && Array.isArray(firstHotel.offers),
      }, null, 2));
      
      // 专门检查联系方式和描述字段
      console.log('📞 联系方式检查:', {
        hasContact: !!hotelInfo.contact,
        contact: hotelInfo.contact,
        phone: hotelInfo.contact?.phone,
        email: hotelInfo.contact?.email,
        willShowPhone: !!(hotelInfo.contact?.phone),
        willShowEmail: !!(hotelInfo.contact?.email),
      });
      console.log('📝 描述检查:', {
        hasDescription: !!hotelInfo.description,
        description: hotelInfo.description,
        descriptionText: hotelInfo.description?.text,
        willShowDescription: !!(hotelInfo.description?.text),
      });
    }

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

    // 酒店名称过滤
    if (hotelNameFilter.trim()) {
      const nameFilter = hotelNameFilter.trim().toLowerCase();
      filtered = filtered.filter(hotel => {
        const hotelName = (hotel.hotel?.name || '').toLowerCase();
        return hotelName.includes(nameFilter);
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
  }, [hotels, sortType, priceRange, minRating, hotelNameFilter]);

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
      <Paper sx={{ p: 2, mb: 2, mt: 3 }}>
        <Grid container spacing={2} alignItems="center">
          {/* 酒店名称搜索 */}
          <Grid item xs={12} sm={4}>
            <TextField
              fullWidth
              size="small"
              label={t('hotel.list.searchName') || '搜索酒店名称'}
              value={hotelNameFilter}
              onChange={(e) => setHotelNameFilter(e.target.value)}
              placeholder={t('hotel.list.searchNamePlaceholder') || '输入酒店名称'}
              InputProps={{
                startAdornment: <HotelIcon sx={{ mr: 1, color: 'text.secondary' }} />,
              }}
            />
          </Grid>

          {/* 排序按钮 */}
          <Grid item xs={12} sm={8}>
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              <Button
                size="small"
                variant={sortType === 'price-low' ? 'contained' : 'outlined'}
                onClick={() => setSortType('price-low')}
              >
                {t('hotel.list.priceLow') || '价格: 低到高'}
              </Button>
              <Button
                size="small"
                variant={sortType === 'price-high' ? 'contained' : 'outlined'}
                onClick={() => setSortType('price-high')}
              >
                {t('hotel.list.priceHigh') || '价格: 高到低'}
              </Button>
              <Button
                size="small"
                variant={sortType === 'rating-high' ? 'contained' : 'outlined'}
                onClick={() => setSortType('rating-high')}
              >
                {t('hotel.list.ratingHigh') || '评分: 高到低'}
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
                <CardContent sx={{ py: 2 }}>
                  <Grid container spacing={2} sx={{ alignItems: 'stretch' }}>
                    {/* 酒店图片 */}
                    <Grid item xs={12} sm={3} sx={{ display: 'flex' }}>
                      <Box
                        sx={{
                          width: '100%',
                          height: '100%',
                          minHeight: { xs: 200, sm: 240 },
                          bgcolor: 'grey.200',
                          borderRadius: 2,
                          overflow: 'hidden',
                          position: 'relative',
                        }}
                      >
                        {(() => {
                          // 获取图片URL，支持多种格式
                          let imageUrl = null;
                          
                          if (hotelInfo.media && Array.isArray(hotelInfo.media) && hotelInfo.media.length > 0) {
                            const firstMedia = hotelInfo.media[0];
                            // 支持不同的media格式：{ uri: '...' } 或直接是字符串URL
                            imageUrl = firstMedia.uri || firstMedia.url || (typeof firstMedia === 'string' ? firstMedia : null);
                          }
                          
                          // 如果没有图片URL，使用占位图片服务
                          // 注意：Amadeus API 不返回 media 字段，所以使用占位图片
                          if (!imageUrl) {
                            // 使用酒店名称生成占位图片URL（使用 Unsplash Source 或其他占位服务）
                            const hotelName = hotelInfo.name || 'Hotel';
                            // 使用 hotelId 作为占位图片的标识
                            const hotelId = hotelInfo.hotelId || 'default';
                            // 使用 Unsplash Source API（免费，无需API Key）
                            imageUrl = `https://source.unsplash.com/400x300/?hotel,${encodeURIComponent(hotelName)}`;
                            // 备用方案：使用 placeholder.com
                            // imageUrl = `https://via.placeholder.com/400x300/cccccc/666666?text=${encodeURIComponent(hotelName.substring(0, 20))}`;
                          }
                          
                          // 如果有图片URL且未标记为错误，显示图片
                          if (imageUrl && !imageErrors[hotelInfo.hotelId]) {
                            return (
                              <img
                                src={imageUrl}
                                alt={hotelInfo.name || '酒店图片'}
                                style={{
                                  width: '100%',
                                  height: '100%',
                                  objectFit: 'cover',
                                }}
                                onError={(e) => {
                                  // 图片加载失败时记录错误，但只在组件仍然挂载时更新状态
                                  console.warn('图片加载失败:', {
                                    hotelId: hotelInfo.hotelId,
                                    imageUrl,
                                    hotelName: hotelInfo.name,
                                    hasMedia: !!hotelInfo.media,
                                    error: e,
                                  });
                                  if (isMountedRef.current && hotelInfo.hotelId) {
                                    setImageErrors(prev => ({
                                      ...prev,
                                      [hotelInfo.hotelId]: true,
                                    }));
                                  }
                                }}
                                onLoad={() => {
                                  console.log('图片加载成功:', {
                                    hotelId: hotelInfo.hotelId,
                                    imageUrl,
                                    hotelName: hotelInfo.name,
                                    isPlaceholder: !hotelInfo.media,
                                  });
                                }}
                              />
                            );
                          }
                          
                          // 如果图片加载失败，显示默认图标
                          return (
                            <Box
                              sx={{
                                width: '100%',
                                height: '100%',
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                justifyContent: 'center',
                                bgcolor: 'grey.100',
                              }}
                            >
                              <HotelIcon sx={{ fontSize: { xs: 48, sm: 64 }, color: 'grey.400', mb: 1 }} />
                              <Typography variant="caption" color="text.secondary" sx={{ textAlign: 'center', px: 1 }}>
                                {hotelInfo.name || '酒店图片'}
                              </Typography>
                            </Box>
                          );
                        })()}
                      </Box>
                    </Grid>

                    {/* 酒店信息 */}
                    <Grid item xs={12} sm={6}>
                      {/* 酒店名称 */}
                      <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, mb: 1.5 }}>
                        {hotelInfo.name || t('hotel.list.unknownHotel') || '未知酒店'}
                      </Typography>

                      {/* 评分 */}
                      {hotelInfo.rating && (
                        <Box sx={{ display: 'flex', alignItems: 'center', mb: 1.5 }}>
                          <Rating value={hotelInfo.rating} readOnly size="small" />
                          <Typography variant="body2" color="text.secondary" sx={{ ml: 1 }}>
                            {hotelInfo.rating}
                          </Typography>
                        </Box>
                      )}

                      {/* 城市 - 优先显示搜索时使用的城市 */}
                      {(searchParams?.cityName || searchParams?.cityLocation?.name || hotelInfo.address?.cityName) && (
                        <Box sx={{ display: 'flex', alignItems: 'flex-start', mb: 1 }}>
                          <LocationIcon fontSize="small" color="action" sx={{ mt: 0.5, mr: 1, flexShrink: 0 }} />
                          <Typography variant="body2" color="text.secondary">
                            <strong style={{ marginRight: '4px' }}>{t('hotel.list.city') || '城市'}:</strong>
                            {searchParams?.cityName || searchParams?.cityLocation?.name || hotelInfo.address?.cityName}
                            {(searchParams?.cityLocation?.countryCode || hotelInfo.address?.countryCode) && 
                              `, ${searchParams?.cityLocation?.countryCode || hotelInfo.address.countryCode}`}
                          </Typography>
                        </Box>
                      )}

                      {/* 详细地址 */}
                      {hotelInfo.address && (hotelInfo.address.lines?.length > 0 || hotelInfo.address.postalCode || hotelInfo.address.stateCode) && (
                        <Box sx={{ display: 'flex', alignItems: 'flex-start', mb: 1 }}>
                          <LocationIcon fontSize="small" color="action" sx={{ mt: 0.5, mr: 1, flexShrink: 0 }} />
                          <Typography 
                            variant="body2" 
                            color="text.secondary"
                            sx={{
                              flex: 1,
                              minWidth: 0,
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                            }}
                            title={
                              hotelInfo.address.lines && hotelInfo.address.lines.length > 0
                                ? hotelInfo.address.lines.join(', ') +
                                  (hotelInfo.address.postalCode ? ', ' + hotelInfo.address.postalCode : '') +
                                  (hotelInfo.address.stateCode ? ', ' + hotelInfo.address.stateCode : '')
                                : (hotelInfo.address.postalCode || '') +
                                  (hotelInfo.address.stateCode ? (hotelInfo.address.postalCode ? ', ' : '') + hotelInfo.address.stateCode : '')
                            }
                          >
                            <strong>{t('hotel.list.address') || '地址'}:</strong>{' '}
                            {hotelInfo.address.lines && hotelInfo.address.lines.length > 0
                              ? hotelInfo.address.lines.join(', ')
                              : ''}
                            {hotelInfo.address.postalCode && (hotelInfo.address.lines?.length > 0 ? ', ' : '') + hotelInfo.address.postalCode}
                            {hotelInfo.address.stateCode && (hotelInfo.address.postalCode || hotelInfo.address.lines?.length > 0 ? ', ' : '') + hotelInfo.address.stateCode}
                          </Typography>
                        </Box>
                      )}

                      {/* 电话 */}
                      {hotelInfo.contact?.phone && (
                        <Box sx={{ display: 'flex', alignItems: 'flex-start', mb: 1 }}>
                          <PhoneIcon fontSize="small" color="action" sx={{ mt: 0.5, mr: 1, flexShrink: 0 }} />
                          <Typography 
                            variant="body2" 
                            color="text.secondary"
                            sx={{
                              flex: 1,
                              minWidth: 0,
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                            }}
                            title={hotelInfo.contact.phone}
                          >
                            <strong>{t('hotel.list.phone') || '电话'}:</strong>{' '}
                            <a 
                              href={`tel:${hotelInfo.contact.phone}`} 
                              style={{ color: 'inherit', textDecoration: 'none' }}
                              onClick={(e) => e.stopPropagation()}
                            >
                              {hotelInfo.contact.phone}
                            </a>
                          </Typography>
                        </Box>
                      )}

                      {/* 邮箱 */}
                      {hotelInfo.contact?.email && (
                        <Box sx={{ display: 'flex', alignItems: 'flex-start', mb: 1 }}>
                          <EmailIcon fontSize="small" color="action" sx={{ mt: 0.5, mr: 1, flexShrink: 0 }} />
                          <Typography 
                            variant="body2" 
                            color="text.secondary"
                            sx={{
                              flex: 1,
                              minWidth: 0,
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                            }}
                            title={hotelInfo.contact.email}
                          >
                            <strong>{t('hotel.list.email') || '邮箱'}:</strong>{' '}
                            <a 
                              href={`mailto:${hotelInfo.contact.email}`} 
                              style={{ color: 'inherit', textDecoration: 'none' }}
                              onClick={(e) => e.stopPropagation()}
                            >
                              {hotelInfo.contact.email}
                            </a>
                          </Typography>
                        </Box>
                      )}

                      {/* 酒店描述 */}
                      {hotelInfo.description?.text && (
                        <Box sx={{ display: 'flex', alignItems: 'flex-start', mb: 1 }}>
                          <Box sx={{ mt: 0.5, mr: 1, flexShrink: 0, width: 20, display: 'flex', alignItems: 'flex-start', justifyContent: 'center' }}>
                            <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.875rem' }}>📝</Typography>
                          </Box>
                          <Typography 
                            variant="body2" 
                            color="text.secondary"
                            sx={{
                              flex: 1,
                              minWidth: 0,
                              display: '-webkit-box',
                              WebkitLineClamp: 2,
                              WebkitBoxOrient: 'vertical',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              lineHeight: 1.5,
                            }}
                            title={hotelInfo.description.text}
                          >
                            <strong>{t('hotel.list.description') || '描述'}:</strong>{' '}
                            {hotelInfo.description.text}
                          </Typography>
                        </Box>
                      )}

                      {/* 房间信息 */}
                      {offer.room && (
                        <Box sx={{ display: 'flex', alignItems: 'center', mb: 1, mt: 1 }}>
                          <BedIcon fontSize="small" color="action" sx={{ mr: 1, flexShrink: 0 }} />
                          <Typography variant="body2" color="text.secondary">
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

