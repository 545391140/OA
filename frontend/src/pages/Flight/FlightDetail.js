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
} from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import { useNotification } from '../../contexts/NotificationContext';
import { confirmPrice } from '../../services/flightService';
import dayjs from 'dayjs';

const FlightDetail = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const { showNotification } = useNotification();

  // 从路由状态获取航班信息
  const { flight, searchParams } = location.state || {};

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
          <Button startIcon={<ArrowBackIcon />} onClick={() => navigate(-1)} sx={{ mr: 2 }}>
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
              <Card key={idx} sx={{ mb: 3 }}>
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                    <Typography variant="h6">
                      {idx === 0
                        ? t('flight.detail.outbound') || '去程'
                        : t('flight.detail.return') || '返程'}
                    </Typography>
                    <Chip
                      label={formatDuration(itinerary.duration)}
                      icon={<ScheduleIcon />}
                      color="primary"
                      variant="outlined"
                    />
                  </Box>

                  {itinerary.segments?.map((segment, segIdx) => (
                    <Box key={segIdx}>
                      <Grid container spacing={2} alignItems="center" sx={{ mb: 2 }}>
                        <Grid item xs={12} md={3}>
                          <Box>
                            <Typography variant="h5" color="primary">
                              {segment.departure?.iataCode}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              {segment.departure?.terminal
                                ? `${t('flight.detail.terminal') || '航站楼'} ${segment.departure.terminal}`
                                : ''}
                            </Typography>
                            <Typography variant="h6" sx={{ mt: 1 }}>
                              {dayjs(segment.departure?.at).format('YYYY-MM-DD HH:mm')}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              {dayjs(segment.departure?.at).format('dddd')}
                            </Typography>
                          </Box>
                        </Grid>

                        <Grid item xs={12} md={6}>
                          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Box sx={{ textAlign: 'center' }}>
                              <FlightIcon sx={{ fontSize: 40, color: 'primary.main', mb: 1 }} />
                              <Typography variant="body2" color="text.secondary">
                                {formatDuration(segment.duration)}
                              </Typography>
                              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                                {segment.carrierCode} {segment.number}
                              </Typography>
                              {segment.aircraft?.code && (
                                <Typography variant="caption" color="text.secondary">
                                  {t('flight.detail.aircraft') || '机型'}: {segment.aircraft.code}
                                </Typography>
                              )}
                            </Box>
                          </Box>
                        </Grid>

                        <Grid item xs={12} md={3}>
                          <Box sx={{ textAlign: 'right' }}>
                            <Typography variant="h5" color="primary">
                              {segment.arrival?.iataCode}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              {segment.arrival?.terminal
                                ? `${t('flight.detail.terminal') || '航站楼'} ${segment.arrival.terminal}`
                                : ''}
                            </Typography>
                            <Typography variant="h6" sx={{ mt: 1 }}>
                              {dayjs(segment.arrival?.at).format('YYYY-MM-DD HH:mm')}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              {dayjs(segment.arrival?.at).format('dddd')}
                            </Typography>
                          </Box>
                        </Grid>
                      </Grid>

                      {segIdx < itinerary.segments.length - 1 && (
                        <Divider sx={{ my: 2 }}>
                          <Chip
                            label={t('flight.detail.transfer') || '中转'}
                            size="small"
                            color="warning"
                          />
                        </Divider>
                      )}
                    </Box>
                  ))}
                </CardContent>
              </Card>
            ))}

            {/* 价格信息 */}
            <Card sx={{ mb: 3 }}>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Box>
                    <Typography variant="h6" gutterBottom>
                      {t('flight.detail.price') || '价格'}
                    </Typography>
                    {confirmedPrice?.price?.base && (
                      <Typography variant="body2" color="text.secondary">
                        {t('flight.detail.basePrice') || '基础价格'}: {confirmedPrice.price.base}{' '}
                        {confirmedPrice.price.currency}
                      </Typography>
                    )}
                    {flight.numberOfBookableSeats && (
                      <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                        {t('flight.detail.availableSeats') || '可预订座位'}: {flight.numberOfBookableSeats}
                      </Typography>
                    )}
                  </Box>
                  <Box sx={{ textAlign: 'right' }}>
                    <Typography variant="h4" color="primary">
                      {formatPrice(confirmedPrice?.price || flight.price)}
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
                </Box>
              </CardContent>
            </Card>

            {/* 操作按钮 */}
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
              <Button variant="outlined" onClick={() => navigate(-1)}>
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

