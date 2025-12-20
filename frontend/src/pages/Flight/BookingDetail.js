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
} from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../contexts/AuthContext';
import { useNotification } from '../../contexts/NotificationContext';
import { getBooking, cancelBooking } from '../../services/flightService';
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

  useEffect(() => {
    fetchBooking();
  }, [id]);

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
                  {t('flight.bookingDetail.price') || '价格'}
                </Typography>
                <Typography variant="h6" color="primary">
                  {formatPrice(booking.price)}
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
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                {t('flight.bookingDetail.flightInfo') || '航班信息'}
              </Typography>
              {booking.flightOffer.itineraries.map((itinerary, idx) => (
                <Box key={idx} sx={{ mb: idx < booking.flightOffer.itineraries.length - 1 ? 3 : 0 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                    <Typography variant="subtitle1">
                      {idx === 0
                        ? t('flight.detail.outbound') || '去程'
                        : t('flight.detail.return') || '返程'}
                    </Typography>
                    <Chip
                      label={formatDuration(itinerary.duration)}
                      icon={<ScheduleIcon />}
                      color="primary"
                      variant="outlined"
                      size="small"
                    />
                  </Box>

                  {itinerary.segments?.map((segment, segIdx) => (
                    <Box key={segIdx} sx={{ mb: 2 }}>
                      <Grid container spacing={2} alignItems="center">
                        <Grid item xs={12} md={3}>
                          <Box>
                            <Typography variant="h6" color="primary">
                              {segment.departure?.iataCode}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              {dayjs(segment.departure?.at).format('YYYY-MM-DD HH:mm')}
                            </Typography>
                          </Box>
                        </Grid>
                        <Grid item xs={12} md={6}>
                          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <FlightIcon sx={{ fontSize: 24, color: 'primary.main', mr: 1 }} />
                            <Typography variant="body2" color="text.secondary">
                              {segment.carrierCode} {segment.number} • {formatDuration(segment.duration)}
                            </Typography>
                          </Box>
                        </Grid>
                        <Grid item xs={12} md={3}>
                          <Box sx={{ textAlign: 'right' }}>
                            <Typography variant="h6" color="primary">
                              {segment.arrival?.iataCode}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              {dayjs(segment.arrival?.at).format('YYYY-MM-DD HH:mm')}
                            </Typography>
                          </Box>
                        </Grid>
                      </Grid>
                      {segIdx < itinerary.segments.length - 1 && <Divider sx={{ my: 2 }} />}
                    </Box>
                  ))}
                  {idx < booking.flightOffer.itineraries.length - 1 && <Divider sx={{ my: 2 }} />}
                </Box>
              ))}
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

