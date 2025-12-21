/**
 * 预订详情页面
 * 显示完整预订信息，提供取消功能
 */

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  Flight as FlightIcon,
  Person as PersonIcon,
  AttachMoney as MoneyIcon,
  Cancel as CancelIcon,
  CheckCircle as CheckCircleIcon,
  Schedule as ScheduleIcon,
  LocationOn as LocationIcon,
  AirportShuttle as AirportIcon,
  FlightTakeoff as TakeoffIcon,
  FlightLand as LandingIcon,
  SwapHoriz as TransferIcon,
  AirlineStops as StopsIcon,
  Luggage as LuggageIcon,
  EventSeat as SeatIcon,
  LocalOffer as TaxIcon,
} from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../contexts/AuthContext';
import { useNotification } from '../../contexts/NotificationContext';
import { getBooking, cancelBooking } from '../../services/flightService';
import { getAirlineInfo, getAirportInfoBatch } from '../../utils/flightUtils';
import dayjs from 'dayjs';

const BookingDetail = () => {
  const { t } = useTranslation();
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { showNotification } = useNotification();

  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelling, setCancelling] = useState(false);
  const [airportInfoMap, setAirportInfoMap] = useState(new Map());

  useEffect(() => {
    fetchBooking();
  }, [id]);

  // 获取机场信息
  useEffect(() => {
    const fetchAirportInfo = async () => {
      if (!booking?.flightOffer?.itineraries) return;
      
      const airportCodes = new Set();
      booking.flightOffer.itineraries.forEach(itinerary => {
        itinerary.segments?.forEach(segment => {
          if (segment.departure?.iataCode) {
            airportCodes.add(segment.departure.iataCode);
          }
          if (segment.arrival?.iataCode) {
            airportCodes.add(segment.arrival.iataCode);
          }
        });
      });

      if (airportCodes.size > 0) {
        try {
          const infoMap = await getAirportInfoBatch(Array.from(airportCodes));
          setAirportInfoMap(infoMap);
        } catch (error) {
          console.warn('获取机场信息失败:', error);
          setAirportInfoMap(new Map());
        }
      }
    };

    if (booking) {
      fetchAirportInfo();
    }
  }, [booking]);

  const fetchBooking = async () => {
    try {
      setLoading(true);
      const response = await getBooking(id);
      if (response.data.success) {
        setBooking(response.data.data);
      } else {
        throw new Error(response.data.message || '获取预订详情失败');
      }
    } catch (error) {
      showNotification(error.response?.data?.message || error.message || '获取预订详情失败', 'error');
      navigate('/flight/bookings');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async () => {
    if (!cancelReason.trim()) {
      showNotification('请输入取消原因', 'error');
      return;
    }

    setCancelling(true);
    try {
      await cancelBooking(id, cancelReason);
      showNotification('预订已取消', 'success');
      setCancelDialogOpen(false);
      setCancelReason('');
      fetchBooking();
    } catch (error) {
      showNotification(error.response?.data?.message || '取消失败', 'error');
    } finally {
      setCancelling(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'confirmed':
        return 'success';
      case 'pending':
        return 'warning';
      case 'cancelled':
        return 'error';
      case 'failed':
        return 'error';
      default:
        return 'default';
    }
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

  // 获取机场显示名称：优先城市名称，其次机场名称，最后才是代码（主标题使用）
  const getAirportDisplayName = (iataCode, location) => {
    if (!iataCode) return '';
    
    // 优先使用airportInfoMap中的信息
    const airportInfo = airportInfoMap.get(iataCode);
    if (airportInfo) {
      if (airportInfo.city && airportInfo.city.trim()) {
        return airportInfo.city; // 优先显示城市名称
      }
      if (airportInfo.name && airportInfo.name !== iataCode && airportInfo.name.trim()) {
        return airportInfo.name; // 其次显示机场名称
      }
    }
    
    // 如果没有airportInfoMap信息，尝试使用location
    if (location) {
      return location.name || location.cityName || iataCode;
    }
    
    // 最后返回代码
    return iataCode;
  };

  // 获取机场城市名称（用于下方小字显示，格式：名称 代码）
  const getAirportCity = (iataCode, location) => {
    if (!iataCode) return '';
    
    let displayName = '';
    
    // 优先使用airportInfoMap中的信息
    const airportInfo = airportInfoMap.get(iataCode);
    if (airportInfo) {
      if (airportInfo.city && airportInfo.city.trim()) {
        displayName = airportInfo.city; // 优先显示城市名称
      } else if (airportInfo.name && airportInfo.name !== iataCode && airportInfo.name.trim()) {
        displayName = airportInfo.name; // 其次显示机场名称
      }
    }
    
    // 如果没有airportInfoMap信息，尝试使用location
    if (!displayName && location) {
      displayName = location.name || location.cityName || '';
    }
    
    // 如果有名称，显示"名称 代码"，否则只显示代码
    if (displayName && displayName !== iataCode) {
      return `${displayName} ${iataCode}`;
    }
    
    // 最后返回代码
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

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  if (!booking) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Alert severity="error">
          {t('flight.bookingDetail.notFound') || '预订记录不存在'}
        </Alert>
        <Button startIcon={<ArrowBackIcon />} onClick={() => navigate('/flight/bookings')} sx={{ mt: 2 }}>
          {t('common.back') || '返回'}
        </Button>
      </Container>
    );
  }

  const canCancel = booking.status === 'confirmed' && booking.employee?.toString() === user?.id?.toString();

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Paper elevation={3} sx={{ p: 4 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <Button startIcon={<ArrowBackIcon />} onClick={() => navigate(-1)} sx={{ mr: 2 }}>
              {t('common.back') || '返回'}
            </Button>
            <Typography variant="h4">
              {t('flight.bookingDetail.title') || '预订详情'}
            </Typography>
          </Box>
          <Chip
            label={t(`flight.booking.${booking.status}`) || booking.status}
            color={getStatusColor(booking.status)}
            icon={booking.status === 'confirmed' ? <CheckCircleIcon /> : <ScheduleIcon />}
          />
        </Box>

        {/* 预订基本信息 */}
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              {t('flight.bookingDetail.basicInfo') || '基本信息'}
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <Typography variant="body2" color="text.secondary">
                  {t('flight.bookingDetail.bookingReference') || '预订参考号'}
                </Typography>
                <Typography variant="body1">{booking.bookingReference || '-'}</Typography>
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="body2" color="text.secondary">
                  {t('flight.bookingDetail.travelNumber') || '差旅单号'}
                </Typography>
                <Typography variant="body1">
                  {booking.travelId?.travelNumber || '-'}
                  {booking.travelId && (
                    <Button
                      size="small"
                      onClick={() => navigate(`/travel/${booking.travelId._id || booking.travelId}`)}
                      sx={{ ml: 1 }}
                    >
                      {t('common.view') || '查看'}
                    </Button>
                  )}
                </Typography>
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="body2" color="text.secondary">
                  {t('flight.bookingDetail.createdAt') || '创建时间'}
                </Typography>
                <Typography variant="body1">
                  {dayjs(booking.createdAt).format('YYYY-MM-DD HH:mm:ss')}
                </Typography>
              </Grid>
              {booking.cancelledAt && (
                <Grid item xs={12}>
                  <Alert severity="warning">
                    {t('flight.bookingDetail.cancelledAt') || '取消时间'}:{' '}
                    {dayjs(booking.cancelledAt).format('YYYY-MM-DD HH:mm:ss')}
                    {booking.cancellationReason && (
                      <>
                        <br />
                        {t('flight.bookingDetail.cancellationReason') || '取消原因'}:{' '}
                        {booking.cancellationReason}
                      </>
                    )}
                  </Alert>
                </Grid>
              )}
            </Grid>
          </CardContent>
        </Card>

        {/* 航班信息 */}
        {booking.flightOffer?.itineraries && (
          <Card sx={{ mb: 3, border: '1px solid', borderColor: 'divider' }}>
            <CardContent>
              {booking.flightOffer.itineraries.map((itinerary, idx) => {
                // 获取出发和目的地位置信息（从第一个和最后一个航段）
                const firstSegment = itinerary.segments?.[0];
                const lastSegment = itinerary.segments?.[itinerary.segments?.length - 1];
                const originLocation = firstSegment?.departure ? { name: firstSegment.departure.iataCode } : null;
                const destinationLocation = lastSegment?.arrival ? { name: lastSegment.arrival.iataCode } : null;

                return (
                  <Box key={idx} sx={{ mb: idx < booking.flightOffer.itineraries.length - 1 ? 3 : 0 }}>
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
                          <Grid container spacing={3} sx={{ mb: (!isLastSegment && transferTime) ? 0 : (segIdx < itinerary.segments.length - 1 ? 3 : 0) }}>
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
                                  <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1 }}>
                                    <Typography variant="h4" color="primary" fontWeight="bold">
                                      {getAirportDisplayName(
                                        segment.departure?.iataCode,
                                        segIdx === 0 && idx === 0 ? originLocation : null
                                      )}
                                    </Typography>
                                    <Typography variant="body2" color="text.secondary">
                                      {segment.departure?.iataCode}
                                    </Typography>
                                  </Box>
                                </Box>
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
                                  bgcolor: 'rgba(0, 0, 0, 0.02)',
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
                                  <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1 }}>
                                    <Typography variant="h4" color="success.main" fontWeight="bold">
                                      {getAirportDisplayName(
                                        segment.arrival?.iataCode,
                                        isLastSegment && idx === (booking.flightOffer.itineraries.length - 1) ? destinationLocation : null
                                      )}
                                    </Typography>
                                    <Typography variant="body2" color="text.secondary">
                                      {segment.arrival?.iataCode}
                                    </Typography>
                                  </Box>
                                </Box>
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
                              mt: 3,
                              mb: 3,
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
                  </Box>
                );
              })}
            </CardContent>
          </Card>
        )}

        {/* 价格信息 */}
        {booking.price && (
          <Card sx={{ mb: 3, border: '1px solid', borderColor: 'divider' }}>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                <Box>
                  <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <MoneyIcon color="primary" />
                    {t('flight.detail.price') || '价格信息'}
                  </Typography>
                  <Chip
                    icon={<CheckCircleIcon />}
                    label={t('flight.booking.confirmed') || '已确认'}
                    color="success"
                    size="small"
                    sx={{ mt: 1 }}
                  />
                </Box>
                <Box sx={{ textAlign: 'right' }}>
                  <Typography variant="h3" color="primary" fontWeight="bold">
                    {formatPrice(booking.price)}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                    {t('flight.detail.totalPrice') || '总价'}
                  </Typography>
                </Box>
              </Box>

              <Divider sx={{ my: 2 }} />

              {/* 价格明细 */}
              {(() => {
                // 计算总卡片数
                const cardCount = (booking.price?.base ? 1 : 0) + 
                                 (booking.price?.fees && Array.isArray(booking.price.fees) && booking.price.fees.length > 0 ? booking.price.fees.length + 1 : 0) +
                                 (booking.flightOffer?.numberOfBookableSeats ? 1 : 0) +
                                 (booking.flightOffer?.itineraries?.[0]?.segments?.[0]?.class ? 1 : 0);
                const itemWidth = cardCount > 0 ? Math.floor(12 / cardCount) : 12;
                
                return (
                  <Grid container spacing={2}>
                    {booking.price?.base && (
                      <Grid item xs={12} sm={itemWidth}>
                        <Box sx={{ p: 1.5, borderRadius: 1, bgcolor: 'rgba(0, 0, 0, 0.02)' }}>
                          <Typography variant="caption" color="text.secondary">
                            {t('flight.detail.basePrice') || '基础价格'}
                          </Typography>
                          <Typography variant="h6" fontWeight="medium">
                            {booking.price.base} {booking.price.currency}
                          </Typography>
                        </Box>
                      </Grid>
                    )}
                    {booking.price?.fees && Array.isArray(booking.price.fees) && booking.price.fees.length > 0 && (
                      <>
                        {/* 费用总和 */}
                        <Grid item xs={12} sm={itemWidth}>
                          <Box sx={{ p: 1.5, borderRadius: 1, bgcolor: 'rgba(0, 0, 0, 0.02)' }}>
                            <Typography variant="caption" color="text.secondary">
                              {t('flight.detail.fees') || '费用合计'}
                            </Typography>
                            <Typography variant="h6" fontWeight="medium">
                              {booking.price.fees.reduce((sum, fee) => sum + parseFloat(fee.amount || 0), 0).toFixed(2)} {booking.price.currency}
                            </Typography>
                          </Box>
                        </Grid>
                        {/* 费用明细 */}
                        {booking.price.fees.map((fee, index) => (
                          <Grid item xs={12} sm={itemWidth} key={index}>
                            <Box sx={{ p: 1.5, borderRadius: 1, bgcolor: 'rgba(0, 0, 0, 0.02)' }}>
                              <Typography variant="caption" color="text.secondary">
                                {fee.type === 'SUPPLIER' ? (t('flight.detail.supplierFee') || '供应商费用') :
                                 fee.type === 'TICKETING' ? (t('flight.detail.ticketingFee') || '出票费') :
                                 fee.type === 'FORM_OF_PAYMENT' ? (t('flight.detail.paymentFee') || '支付手续费') :
                                 fee.type === 'SERVICE' ? (t('flight.detail.serviceFee') || '服务费') :
                                 fee.type === 'TAX' ? (t('flight.detail.tax') || '税费') :
                                 (t('flight.detail.fee') || '费用')} {fee.type !== 'UNKNOWN' ? `(${fee.type})` : ''}
                              </Typography>
                              <Typography variant="h6" fontWeight="medium">
                                {parseFloat(fee.amount || 0).toFixed(2)} {booking.price.currency}
                              </Typography>
                            </Box>
                          </Grid>
                        ))}
                      </>
                    )}
                    {booking.flightOffer?.numberOfBookableSeats && (
                      <Grid item xs={12} sm={itemWidth}>
                        <Box sx={{ p: 1.5, borderRadius: 1, bgcolor: 'rgba(2, 136, 209, 0.08)' }}>
                          <Typography variant="caption" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <SeatIcon fontSize="small" />
                            {t('flight.detail.availableSeats') || '可预订座位'}
                          </Typography>
                          <Typography variant="h6" fontWeight="medium" color="info.main">
                            {booking.flightOffer.numberOfBookableSeats}
                          </Typography>
                        </Box>
                      </Grid>
                    )}
                    {booking.flightOffer?.itineraries?.[0]?.segments?.[0]?.class && (
                      <Grid item xs={12} sm={itemWidth}>
                        <Box sx={{ p: 1.5, borderRadius: 1, bgcolor: 'rgba(0, 0, 0, 0.02)' }}>
                          <Typography variant="caption" color="text.secondary">
                            {t('flight.detail.cabinClass') || '舱位等级'}
                          </Typography>
                          <Typography variant="h6" fontWeight="medium">
                            {booking.flightOffer.itineraries[0].segments[0].class}
                          </Typography>
                        </Box>
                      </Grid>
                    )}
                  </Grid>
                );
              })()}

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
        )}

        {/* 乘客信息 */}
        {booking.travelers && booking.travelers.length > 0 && (
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                {t('flight.bookingDetail.passengers') || '乘客信息'}
              </Typography>
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>{t('flight.bookingDetail.name') || '姓名'}</TableCell>
                      <TableCell>{t('flight.bookingDetail.dateOfBirth') || '出生日期'}</TableCell>
                      <TableCell>{t('flight.bookingDetail.email') || '邮箱'}</TableCell>
                      <TableCell>{t('flight.bookingDetail.phone') || '电话'}</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {booking.travelers.map((traveler, index) => (
                      <TableRow key={index}>
                        <TableCell>
                          {traveler.name?.firstName} {traveler.name?.lastName}
                        </TableCell>
                        <TableCell>
                          {traveler.dateOfBirth
                            ? dayjs(traveler.dateOfBirth).format('YYYY-MM-DD')
                            : '-'}
                        </TableCell>
                        <TableCell>{traveler.contact?.emailAddress || '-'}</TableCell>
                        <TableCell>
                          {traveler.contact?.phones?.[0]
                            ? `${traveler.contact.phones[0].countryCallingCode} ${traveler.contact.phones[0].number}`
                            : '-'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        )}

        {/* 操作按钮 */}
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
          <Button variant="outlined" onClick={() => navigate(-1)}>
            {t('common.back') || '返回'}
          </Button>
          {canCancel && (
            <Button
              variant="contained"
              color="error"
              startIcon={<CancelIcon />}
              onClick={() => setCancelDialogOpen(true)}
            >
              {t('flight.bookingDetail.cancel') || '取消预订'}
            </Button>
          )}
        </Box>
      </Paper>

      {/* 取消对话框 */}
      <Dialog open={cancelDialogOpen} onClose={() => setCancelDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{t('flight.bookingDetail.cancelBooking') || '取消预订'}</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            multiline
            rows={4}
            label={t('flight.bookingDetail.cancelReason') || '取消原因'}
            value={cancelReason}
            onChange={(e) => setCancelReason(e.target.value)}
            sx={{ mt: 1 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCancelDialogOpen(false)} disabled={cancelling}>
            {t('common.cancel') || '取消'}
          </Button>
          <Button onClick={handleCancel} color="error" variant="contained" disabled={cancelling}>
            {cancelling ? t('common.submitting') || '提交中...' : t('common.confirm') || '确认'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default BookingDetail;

