/**
 * 航班详情页面
 * 显示航班详细信息，提供预订按钮
 */

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
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
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  Flight as FlightIcon,
  Schedule as ScheduleIcon,
  AttachMoney as MoneyIcon,
  CheckCircle as CheckCircleIcon,
  LocationOn as LocationIcon,
  AirportShuttle as AirportIcon,
  FlightTakeoff as TakeoffIcon,
  FlightLand as LandingIcon,
  SwapHoriz as TransferIcon,
  Luggage as LuggageIcon,
  EventSeat as SeatIcon,
  AirlineStops as StopsIcon,
} from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import { useNotification } from '../../contexts/NotificationContext';
import { confirmPrice } from '../../services/flightService';
import { getAirlineInfo } from '../../utils/flightUtils';
import dayjs from 'dayjs';

const FlightDetail = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const { showNotification } = useNotification();

  // 从路由状态获取航班信息和搜索条件
  const { 
    flight, 
    searchParams, 
    searchResults, 
    originLocation, 
    destinationLocation, 
    isRoundTrip 
  } = location.state || {};

  const [confirmedPrice, setConfirmedPrice] = useState(null);
  const [priceConfirming, setPriceConfirming] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (flight) {
      handleConfirmPrice();
    }
  }, [flight]);

  const handleConfirmPrice = async () => {
    if (!flight) return;

    setPriceConfirming(true);
    setError(null);
    try {
      const response = await confirmPrice(flight);
      if (response.data.success) {
        setConfirmedPrice(response.data.data);
      } else {
        throw new Error(response.data.message || '价格确认失败');
      }
    } catch (error) {
      const errorMsg = error.response?.data?.message || error.message || '价格确认失败';
      setError(errorMsg);
      showNotification(errorMsg, 'error');
    } finally {
      setPriceConfirming(false);
    }
  };

  const handleBook = () => {
    if (!flight) {
      showNotification('航班信息缺失', 'error');
      return;
    }
    navigate('/flight/booking', {
      state: {
        flight: confirmedPrice || flight,
        searchParams,
        searchResults,
        originLocation,
        destinationLocation,
        isRoundTrip
      },
    });
  };

  const formatDuration = (duration) => {
    const match = duration?.match(/PT(?:(\d+)H)?(?:(\d+)M)?/);
    if (!match) return duration;
    const hours = match[1] || 0;
    const minutes = match[2] || 0;
    const parts = [];
    if (hours > 0) parts.push(`${hours}小时`);
    if (minutes > 0) parts.push(`${minutes}分钟`);
    return parts.join('') || '0分钟';
  };

  const formatPrice = (price) => {
    if (!price) return '-';
    return `${price.total} ${price.currency}`;
  };

  // 获取机场城市名称
  const getAirportCity = (iataCode, location) => {
    if (location) {
      return location.name || location.cityName || iataCode;
    }
    return iataCode;
  };

  // 计算中转时间
  const calculateTransferTime = (arrivalTime, nextDepartureTime) => {
    if (!arrivalTime || !nextDepartureTime) return null;
    const arrival = dayjs(arrivalTime);
    const departure = dayjs(nextDepartureTime);
    const diffMinutes = departure.diff(arrival, 'minute');
    const hours = Math.floor(diffMinutes / 60);
    const minutes = diffMinutes % 60;
    if (hours > 0) {
      return `${hours}小时${minutes}分钟`;
    }
    return `${minutes}分钟`;
  };

  if (!flight) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Alert severity="error">
          {t('flight.detail.noFlight') || '未找到航班信息'}
        </Alert>
        <Button startIcon={<ArrowBackIcon />} onClick={() => navigate('/flight/search')} sx={{ mt: 2 }}>
          {t('common.back') || '返回'}
        </Button>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Paper elevation={3} sx={{ p: 4 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
          <Button 
            startIcon={<ArrowBackIcon />} 
            onClick={() => {
              // 返回时传递搜索结果和搜索条件，以便恢复列表
              if (searchResults) {
                navigate('/flight/search', {
                  state: {
                    searchResults,
                    searchParams,
                    originLocation,
                    destinationLocation,
                    isRoundTrip
                  }
                });
              } else {
                navigate(-1);
              }
            }} 
            sx={{ mr: 2 }}
          >
            {t('common.back') || '返回'}
          </Button>
          <Typography variant="h4">
            {t('flight.detail.title') || '航班详情'}
          </Typography>
        </Box>

        {priceConfirming ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress />
          </Box>
        ) : (
          <>
            {error && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {error}
              </Alert>
            )}

            {/* 航班信息 */}
            {flight.itineraries?.map((itinerary, idx) => (
              <Card key={idx} sx={{ mb: 3, border: '1px solid', borderColor: 'divider' }}>
                <CardContent>
                  {/* 行程标题 */}
                  <Box sx={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center', 
                    mb: 3,
                    pb: 2,
                    borderBottom: '2px solid',
                    borderColor: 'primary.main'
                  }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      {idx === 0 ? (
                        <TakeoffIcon color="primary" />
                      ) : (
                        <LandingIcon color="primary" />
                      )}
                      <Typography variant="h5" fontWeight="bold">
                        {idx === 0
                          ? t('flight.detail.outbound') || '去程'
                          : t('flight.detail.return') || '返程'}
                      </Typography>
                    </Box>
                    <Chip
                      label={formatDuration(itinerary.duration)}
                      icon={<ScheduleIcon />}
                      color="primary"
                      sx={{ fontSize: '0.95rem', fontWeight: 600 }}
                    />
                  </Box>

                  {itinerary.segments?.map((segment, segIdx) => {
                    const isLastSegment = segIdx === itinerary.segments.length - 1;
                    const nextSegment = !isLastSegment ? itinerary.segments[segIdx + 1] : null;
                    const transferTime = nextSegment 
                      ? calculateTransferTime(segment.arrival?.at, nextSegment.departure?.at)
                      : null;

                    return (
                      <Box key={segIdx}>
                        <Grid container spacing={3} sx={{ mb: segIdx < itinerary.segments.length - 1 ? 3 : 0 }}>
                          {/* 出发机场 */}
                          <Grid item xs={12} md={3}>
                            <Box sx={{ 
                              p: 2, 
                              borderRadius: 2, 
                              bgcolor: 'rgba(25, 118, 210, 0.08)',
                              border: '1px solid',
                              borderColor: 'primary.main'
                            }}>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                                <LocationIcon color="primary" fontSize="small" />
                                <Typography variant="h4" color="primary" fontWeight="bold">
                                  {segment.departure?.iataCode}
                                </Typography>
                              </Box>
                              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                                {getAirportCity(
                                  segment.departure?.iataCode,
                                  idx === 0 ? originLocation : destinationLocation
                                )}
                              </Typography>
                              {segment.departure?.terminal ? (
                                <Chip
                                  icon={<AirportIcon />}
                                  label={`${t('flight.detail.terminal') || '航站楼'} ${segment.departure.terminal}`}
                                  size="small"
                                  variant="outlined"
                                  sx={{ mb: 1 }}
                                />
                              ) : (
                                <Typography variant="caption" color="text.disabled" sx={{ display: 'block', mb: 1 }}>
                                  {t('flight.detail.terminalNotAvailable') || '航站楼信息暂未提供'}
                                </Typography>
                              )}
                              <Typography variant="h6" sx={{ mt: 1.5, fontWeight: 600 }}>
                                {dayjs(segment.departure?.at).format('HH:mm')}
                              </Typography>
                              <Typography variant="body2" color="text.secondary">
                                {dayjs(segment.departure?.at).format('YYYY年MM月DD日 dddd')}
                              </Typography>
                            </Box>
                          </Grid>

                          {/* 航班信息 */}
                          <Grid item xs={12} md={6}>
                            <Box sx={{ 
                              display: 'flex', 
                              flexDirection: 'column',
                              alignItems: 'center',
                              justifyContent: 'center',
                              p: 2
                            }}>
                              {/* 飞行时长 */}
                              <Box sx={{ 
                                display: 'flex', 
                                alignItems: 'center', 
                                gap: 1,
                                mb: 2,
                                p: 1.5,
                                borderRadius: 2,
                                bgcolor: 'grey.50',
                                width: '100%',
                                justifyContent: 'center'
                              }}>
                                <ScheduleIcon color="primary" />
                                <Typography variant="body1" fontWeight="medium">
                                  {formatDuration(segment.duration)}
                                </Typography>
                              </Box>

                              {/* 航班号和航空公司 */}
                              <Box sx={{ 
                                display: 'flex', 
                                flexDirection: 'column',
                                alignItems: 'center',
                                gap: 1,
                                mb: 1.5,
                                p: 2,
                                borderRadius: 2,
                                bgcolor: 'rgba(0, 0, 0, 0.02)',
                                width: '100%'
                              }}>
                                <Box sx={{ 
                                  display: 'flex', 
                                  alignItems: 'center', 
                                  gap: 2,
                                  width: '100%',
                                  justifyContent: 'center'
                                }}>
                                  <FlightIcon sx={{ fontSize: 32, color: 'primary.main' }} />
                                  <Box sx={{ textAlign: 'center' }}>
                                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1, flexWrap: 'wrap' }}>
                                      <Typography variant="h6" fontWeight="bold">
                                        {segment.carrierCode} {segment.number}
                                      </Typography>
                                      {segment.aircraft?.code && (
                                        <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500 }}>
                                          {t('flight.detail.aircraft') || '机型'}: {segment.aircraft.code}
                                        </Typography>
                                      )}
                                    </Box>
                                    {(() => {
                                      const airlineInfo = getAirlineInfo(segment.carrierCode);
                                      return airlineInfo.name && airlineInfo.name !== segment.carrierCode ? (
                                        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, fontWeight: 500 }}>
                                          {airlineInfo.name}
                                        </Typography>
                                      ) : null;
                                    })()}
                                  </Box>
                                </Box>
                              </Box>

                              {/* 舱位信息 */}
                              {segment.class && (
                                <Chip
                                  label={`${t('flight.detail.cabinClass') || '舱位'}: ${segment.class}`}
                                  size="small"
                                  color="info"
                                  variant="outlined"
                                  sx={{ mt: 1 }}
                                />
                              )}
                            </Box>
                          </Grid>

                          {/* 到达机场 */}
                          <Grid item xs={12} md={3}>
                            <Box sx={{ 
                              p: 2, 
                              borderRadius: 2, 
                              bgcolor: 'rgba(46, 125, 50, 0.08)',
                              border: '1px solid',
                              borderColor: 'success.main',
                              textAlign: 'right'
                            }}>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1, justifyContent: 'flex-end' }}>
                                <LocationIcon color="success" fontSize="small" />
                                <Typography variant="h4" color="success.main" fontWeight="bold">
                                  {segment.arrival?.iataCode}
                                </Typography>
                              </Box>
                              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                                {getAirportCity(
                                  segment.arrival?.iataCode,
                                  idx === 0 ? destinationLocation : originLocation
                                )}
                              </Typography>
                              {segment.arrival?.terminal ? (
                                <Chip
                                  icon={<AirportIcon />}
                                  label={`${t('flight.detail.terminal') || '航站楼'} ${segment.arrival.terminal}`}
                                  size="small"
                                  variant="outlined"
                                  color="success"
                                  sx={{ mb: 1 }}
                                />
                              ) : (
                                <Typography variant="caption" color="text.disabled" sx={{ display: 'block', mb: 1 }}>
                                  {t('flight.detail.terminalNotAvailable') || '航站楼信息暂未提供'}
                                </Typography>
                              )}
                              <Typography variant="h6" sx={{ mt: 1.5, fontWeight: 600 }}>
                                {dayjs(segment.arrival?.at).format('HH:mm')}
                              </Typography>
                              <Typography variant="body2" color="text.secondary">
                                {dayjs(segment.arrival?.at).format('YYYY年MM月DD日 dddd')}
                              </Typography>
                            </Box>
                          </Grid>
                        </Grid>

                        {/* 中转信息 */}
                        {!isLastSegment && transferTime && (
                          <Box sx={{ 
                            my: 3,
                            p: 2,
                            borderRadius: 2,
                            bgcolor: 'rgba(237, 108, 2, 0.08)',
                            border: '1px solid',
                            borderColor: 'warning.main'
                          }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 2 }}>
                              <StopsIcon color="warning" />
                              <Chip
                                icon={<TransferIcon />}
                                label={`${t('flight.detail.transfer') || '中转'} ${getAirportCity(segment.arrival?.iataCode)}`}
                                color="warning"
                                sx={{ fontWeight: 600 }}
                              />
                              <Typography variant="body1" color="text.secondary">
                                {t('flight.detail.transferTime') || '中转时间'}: <strong>{transferTime}</strong>
                              </Typography>
                            </Box>
                          </Box>
                        )}
                      </Box>
                    );
                  })}
                </CardContent>
              </Card>
            ))}

            {/* 价格信息 */}
            <Card sx={{ mb: 3, border: '1px solid', borderColor: 'divider' }}>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                  <Box>
                    <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <MoneyIcon color="primary" />
                      {t('flight.detail.price') || '价格信息'}
                    </Typography>
                    {confirmedPrice && (
                      <Chip
                        icon={<CheckCircleIcon />}
                        label={t('flight.detail.priceConfirmed') || '价格已确认'}
                        color="success"
                        size="small"
                        sx={{ mt: 1 }}
                      />
                    )}
                  </Box>
                  <Box sx={{ textAlign: 'right' }}>
                    <Typography variant="h3" color="primary" fontWeight="bold">
                      {formatPrice(confirmedPrice?.price || flight.price)}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                      {t('flight.detail.totalPrice') || '总价'}
                    </Typography>
                  </Box>
                </Box>

                <Divider sx={{ my: 2 }} />

                {/* 价格明细 */}
                <Grid container spacing={2}>
                  {confirmedPrice?.price?.base && (
                    <Grid item xs={12} sm={6} md={3}>
                      <Box sx={{ p: 1.5, borderRadius: 1, bgcolor: 'rgba(0, 0, 0, 0.02)' }}>
                        <Typography variant="caption" color="text.secondary">
                          {t('flight.detail.basePrice') || '基础价格'}
                        </Typography>
                        <Typography variant="h6" fontWeight="medium">
                          {confirmedPrice.price.base} {confirmedPrice.price.currency}
                        </Typography>
                      </Box>
                    </Grid>
                  )}
                  {confirmedPrice?.price?.taxes && confirmedPrice.price.taxes.length > 0 && (
                    <Grid item xs={12} sm={6} md={3}>
                      <Box sx={{ p: 1.5, borderRadius: 1, bgcolor: 'rgba(0, 0, 0, 0.02)' }}>
                        <Typography variant="caption" color="text.secondary">
                          {t('flight.detail.taxes') || '税费'}
                        </Typography>
                        <Typography variant="h6" fontWeight="medium">
                          {confirmedPrice.price.taxes.reduce((sum, tax) => sum + parseFloat(tax.amount || 0), 0).toFixed(2)} {confirmedPrice.price.currency}
                        </Typography>
                      </Box>
                    </Grid>
                  )}
                  {flight.numberOfBookableSeats && (
                    <Grid item xs={12} sm={6} md={3}>
                      <Box sx={{ p: 1.5, borderRadius: 1, bgcolor: 'rgba(2, 136, 209, 0.08)' }}>
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <SeatIcon fontSize="small" />
                          {t('flight.detail.availableSeats') || '可预订座位'}
                        </Typography>
                        <Typography variant="h6" fontWeight="medium" color="info.main">
                          {flight.numberOfBookableSeats}
                        </Typography>
                      </Box>
                    </Grid>
                  )}
                  {flight.itineraries?.[0]?.segments?.[0]?.class && (
                    <Grid item xs={12} sm={6} md={3}>
                      <Box sx={{ p: 1.5, borderRadius: 1, bgcolor: 'rgba(0, 0, 0, 0.02)' }}>
                        <Typography variant="caption" color="text.secondary">
                          {t('flight.detail.cabinClass') || '舱位等级'}
                        </Typography>
                        <Typography variant="h6" fontWeight="medium">
                          {flight.itineraries[0].segments[0].class}
                        </Typography>
                      </Box>
                    </Grid>
                  )}
                </Grid>

                {/* 行李信息提示 */}
                <Alert severity="info" sx={{ mt: 2 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <LuggageIcon />
                    <Typography variant="body2">
                      {t('flight.detail.baggageInfo') || '行李信息请以航空公司规定为准，预订时请仔细查看相关条款。'}
                    </Typography>
                  </Box>
                </Alert>
              </CardContent>
            </Card>

            {/* 操作按钮 */}
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
              <Button 
                variant="outlined" 
                onClick={() => {
                  // 返回时传递搜索结果和搜索条件，以便恢复列表
                  if (searchResults) {
                    navigate('/flight/search', {
                      state: {
                        searchResults,
                        searchParams,
                        originLocation,
                        destinationLocation,
                        isRoundTrip
                      }
                    });
                  } else {
                    navigate(-1);
                  }
                }}
              >
                {t('common.cancel') || '取消'}
              </Button>
              <Button
                variant="contained"
                size="large"
                onClick={handleBook}
                disabled={!confirmedPrice && !flight.price}
                startIcon={<FlightIcon />}
              >
                {t('flight.detail.bookNow') || '立即预订'}
              </Button>
            </Box>
          </>
        )}
      </Paper>
    </Container>
  );
};

export default FlightDetail;

