/**
 * 酒店预订详情页面
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
  Hotel as HotelIcon,
  Person as PersonIcon,
  AttachMoney as MoneyIcon,
  Cancel as CancelIcon,
  CheckCircle as CheckCircleIcon,
  Schedule as ScheduleIcon,
  LocationOn as LocationIcon,
  CalendarToday as CalendarIcon,
  Phone as PhoneIcon,
  Email as EmailIcon,
  Bed as BedIcon,
  People as PeopleIcon,
} from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../contexts/AuthContext';
import { useNotification } from '../../contexts/NotificationContext';
import { getHotelBooking, cancelHotelBooking } from '../../services/hotelService';
import { useDateFormat } from '../../utils/dateFormatter';
import dayjs from 'dayjs';

const HotelBookingDetail = () => {
  const { t } = useTranslation();
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { showNotification } = useNotification();
  const formatDate = useDateFormat(false);

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
      const response = await getHotelBooking(id);
      if (response.data.success) {
        setBooking(response.data.data);
      } else {
        throw new Error(response.data.message || '获取预订详情失败');
      }
    } catch (error) {
      showNotification(error.response?.data?.message || error.message || '获取预订详情失败', 'error');
      navigate('/flight/bookings?tab=hotel');
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
      await cancelHotelBooking(id, cancelReason);
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

  const formatPrice = (price) => {
    if (!price) return '-';
    const total = price.total || '0';
    const currency = price.currency || 'USD';
    return `${total} ${currency}`;
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
          {t('hotel.bookingDetail.notFound') || '预订记录不存在'}
        </Alert>
        <Button startIcon={<ArrowBackIcon />} onClick={() => navigate('/flight/bookings?tab=hotel')} sx={{ mt: 2 }}>
          {t('common.back') || '返回'}
        </Button>
      </Container>
    );
  }

  const canCancel = booking.status === 'confirmed' && booking.employee?.toString() === user?.id?.toString();
  const hotelOffer = booking.hotelOffer || {};
  const hotel = hotelOffer.hotel || {};
  const address = hotel.address || {};
  const price = hotelOffer.offers?.[0]?.price || booking.price;

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Paper elevation={3} sx={{ p: 4 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <Button startIcon={<ArrowBackIcon />} onClick={() => navigate(-1)} sx={{ mr: 2 }}>
              {t('common.back') || '返回'}
            </Button>
            <Typography variant="h4">
              {t('hotel.bookingDetail.title') || '酒店预订详情'}
            </Typography>
          </Box>
          <Chip
            label={t(`hotel.booking.${booking.status}`) || booking.status}
            color={getStatusColor(booking.status)}
            icon={booking.status === 'confirmed' ? <CheckCircleIcon /> : <ScheduleIcon />}
          />
        </Box>

        {/* 预订基本信息 */}
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              {t('hotel.bookingDetail.basicInfo') || '基本信息'}
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <Typography variant="body2" color="text.secondary">
                  {t('hotel.booking.bookingReference') || '预订参考号'}
                </Typography>
                <Typography variant="body1">{booking.bookingReference || '-'}</Typography>
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="body2" color="text.secondary">
                  {t('hotel.booking.travelNumber') || '差旅单号'}
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
                  {t('hotel.bookingDetail.createdAt') || '创建时间'}
                </Typography>
                <Typography variant="body1">
                  {dayjs(booking.createdAt).format('YYYY-MM-DD HH:mm:ss')}
                </Typography>
              </Grid>
              {booking.cancelledAt && (
                <Grid item xs={12}>
                  <Alert severity="warning">
                    {t('hotel.bookingDetail.cancelledAt') || '取消时间'}:{' '}
                    {dayjs(booking.cancelledAt).format('YYYY-MM-DD HH:mm:ss')}
                    {booking.cancellationReason && (
                      <>
                        <br />
                        {t('hotel.booking.cancelReason') || '取消原因'}:{' '}
                        {booking.cancellationReason}
                      </>
                    )}
                  </Alert>
                </Grid>
              )}
            </Grid>
          </CardContent>
        </Card>

        {/* 酒店信息 */}
        {hotel && (
          <Card sx={{ mb: 3, border: '1px solid', borderColor: 'divider' }}>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                <Box>
                  <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <HotelIcon color="primary" />
                    {hotel.name || '-'}
                  </Typography>
                  {hotel.rating && (
                    <Chip
                      icon={<CheckCircleIcon />}
                      label={`${t('hotel.detail.rating') || '评分'}: ${hotel.rating}/5`}
                      color="primary"
                      size="small"
                      sx={{ mt: 1 }}
                    />
                  )}
                </Box>
              </Box>

              <Divider sx={{ my: 2 }} />

              <Grid container spacing={2}>
                {/* 地址信息 */}
                {address && (
                  <Grid item xs={12}>
                    <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
                      <LocationIcon color="action" sx={{ mt: 0.5 }} />
                      <Box>
                        <Typography variant="body2" color="text.secondary">
                          {t('hotel.list.address') || '地址'}
                        </Typography>
                        <Typography variant="body1">
                          {[
                            address.lines?.join(', '),
                            address.cityName,
                            address.postalCode,
                            address.countryCode,
                          ]
                            .filter(Boolean)
                            .join(', ') || '-'}
                        </Typography>
                      </Box>
                    </Box>
                  </Grid>
                )}

                {/* 联系方式 */}
                {hotel.contact && (
                  <>
                    {hotel.contact.phone && (
                      <Grid item xs={12} md={6}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <PhoneIcon color="action" />
                          <Box>
                            <Typography variant="body2" color="text.secondary">
                              {t('hotel.list.phone') || '电话'}
                            </Typography>
                            <Typography variant="body1">{hotel.contact.phone}</Typography>
                          </Box>
                        </Box>
                      </Grid>
                    )}
                    {hotel.contact.email && (
                      <Grid item xs={12} md={6}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <EmailIcon color="action" />
                          <Box>
                            <Typography variant="body2" color="text.secondary">
                              {t('hotel.list.email') || '邮箱'}
                            </Typography>
                            <Typography variant="body1">{hotel.contact.email}</Typography>
                          </Box>
                        </Box>
                      </Grid>
                    )}
                  </>
                )}
              </Grid>
            </CardContent>
          </Card>
        )}

        {/* 入住信息 */}
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <CalendarIcon color="primary" />
              {t('hotel.bookingDetail.checkInOut') || '入住/退房信息'}
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <Box sx={{ p: 2, borderRadius: 2, bgcolor: 'rgba(25, 118, 210, 0.08)', border: '1px solid', borderColor: 'primary.main' }}>
                  <Typography variant="body2" color="text.secondary">
                    {t('hotel.search.checkIn') || '入住日期'}
                  </Typography>
                  <Typography variant="h5" color="primary" fontWeight="bold" sx={{ mt: 1 }}>
                    {hotelOffer.checkInDate ? formatDate(hotelOffer.checkInDate) : '-'}
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={12} md={6}>
                <Box sx={{ p: 2, borderRadius: 2, bgcolor: 'rgba(46, 125, 50, 0.08)', border: '1px solid', borderColor: 'success.main' }}>
                  <Typography variant="body2" color="text.secondary">
                    {t('hotel.search.checkOut') || '退房日期'}
                  </Typography>
                  <Typography variant="h5" color="success.main" fontWeight="bold" sx={{ mt: 1 }}>
                    {hotelOffer.checkOutDate ? formatDate(hotelOffer.checkOutDate) : '-'}
                  </Typography>
                </Box>
              </Grid>
              {hotelOffer.checkInDate && hotelOffer.checkOutDate && (
                <Grid item xs={12}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}>
                    <PeopleIcon color="action" />
                    <Typography variant="body1">
                      {t('hotel.bookingDetail.nights') || '入住天数'}:{' '}
                      {dayjs(hotelOffer.checkOutDate).diff(dayjs(hotelOffer.checkInDate), 'day')}{' '}
                      {t('hotel.list.nights') || '晚'}
                    </Typography>
                  </Box>
                </Grid>
              )}
            </Grid>
          </CardContent>
        </Card>

        {/* 价格信息 */}
        {price && (
          <Card sx={{ mb: 3, border: '1px solid', borderColor: 'divider' }}>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                <Box>
                  <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <MoneyIcon color="primary" />
                    {t('hotel.bookingDetail.price') || '价格信息'}
                  </Typography>
                  <Chip
                    icon={<CheckCircleIcon />}
                    label={t('hotel.booking.confirmed') || '已确认'}
                    color="success"
                    size="small"
                    sx={{ mt: 1 }}
                  />
                </Box>
                <Box sx={{ textAlign: 'right' }}>
                  <Typography variant="h3" color="primary" fontWeight="bold">
                    {formatPrice(price)}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                    {t('hotel.bookingDetail.totalPrice') || '总价'}
                  </Typography>
                </Box>
              </Box>

              <Divider sx={{ my: 2 }} />

              {/* 价格明细 */}
              <Grid container spacing={2}>
                {price.base && (
                  <Grid item xs={12} sm={6}>
                    <Box sx={{ p: 1.5, borderRadius: 1, bgcolor: 'rgba(0, 0, 0, 0.02)' }}>
                      <Typography variant="caption" color="text.secondary">
                        {t('hotel.bookingDetail.basePrice') || '基础价格'}
                      </Typography>
                      <Typography variant="h6" fontWeight="medium">
                        {price.base} {price.currency}
                      </Typography>
                    </Box>
                  </Grid>
                )}
                {price.taxes && price.taxes.length > 0 && (
                  <Grid item xs={12} sm={6}>
                    <Box sx={{ p: 1.5, borderRadius: 1, bgcolor: 'rgba(0, 0, 0, 0.02)' }}>
                      <Typography variant="caption" color="text.secondary">
                        {t('hotel.bookingDetail.taxes') || '税费'}
                      </Typography>
                      <Typography variant="h6" fontWeight="medium">
                        {price.taxes.reduce((sum, tax) => sum + parseFloat(tax.amount || 0), 0).toFixed(2)}{' '}
                        {price.currency}
                      </Typography>
                    </Box>
                  </Grid>
                )}
              </Grid>
            </CardContent>
          </Card>
        )}

        {/* 房间信息 */}
        {booking.rooms && booking.rooms.length > 0 && (
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <BedIcon color="primary" />
                {t('hotel.bookingDetail.rooms') || '房间信息'}
              </Typography>
              <Grid container spacing={2}>
                {booking.rooms.map((room, index) => (
                  <Grid item xs={12} md={6} key={index}>
                    <Box sx={{ p: 2, borderRadius: 2, bgcolor: 'rgba(0, 0, 0, 0.02)', border: '1px solid', borderColor: 'divider' }}>
                      <Typography variant="subtitle1" fontWeight="bold">
                        {t('hotel.booking.room') || '房间'} {index + 1}
                      </Typography>
                      {room.type && (
                        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                          {t('hotel.detail.roomType') || '房型'}: {room.type}
                        </Typography>
                      )}
                      {room.beds && (
                        <Typography variant="body2" color="text.secondary">
                          {t('hotel.list.beds') || '床'}: {room.beds}
                        </Typography>
                      )}
                    </Box>
                  </Grid>
                ))}
              </Grid>
            </CardContent>
          </Card>
        )}

        {/* 客人信息 */}
        {booking.guests && booking.guests.length > 0 && (
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                {t('hotel.booking.guestInfo') || '客人信息'}
              </Typography>
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>{t('hotel.booking.guest') || '客人'}</TableCell>
                      <TableCell>{t('hotel.booking.firstName') || '名'}</TableCell>
                      <TableCell>{t('hotel.booking.lastName') || '姓'}</TableCell>
                      <TableCell>{t('hotel.booking.email') || '邮箱'}</TableCell>
                      <TableCell>{t('hotel.booking.phoneNumber') || '电话'}</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {booking.guests.map((guest, index) => (
                      <TableRow key={index}>
                        <TableCell>
                          {t('hotel.booking.guest') || '客人'} {index + 1}
                        </TableCell>
                        <TableCell>{guest.firstName || '-'}</TableCell>
                        <TableCell>{guest.lastName || '-'}</TableCell>
                        <TableCell>{guest.email || '-'}</TableCell>
                        <TableCell>
                          {guest.phone
                            ? `${guest.phone.countryCode || ''} ${guest.phone.number || ''}`
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

        {/* 特殊要求 */}
        {booking.specialRequests && (
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                {t('hotel.booking.specialRequests') || '特殊要求'}
              </Typography>
              <Typography variant="body1">{booking.specialRequests}</Typography>
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
              {t('hotel.booking.cancel') || '取消预订'}
            </Button>
          )}
        </Box>
      </Paper>

      {/* 取消对话框 */}
      <Dialog open={cancelDialogOpen} onClose={() => setCancelDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{t('hotel.booking.cancelBooking') || '取消预订'}</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            multiline
            rows={4}
            label={t('hotel.booking.cancelReason') || '取消原因'}
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

export default HotelBookingDetail;

