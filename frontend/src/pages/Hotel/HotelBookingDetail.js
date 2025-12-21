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
  
  // 获取入住和退房日期（优先使用直接字段，回退到 hotelOffer）
  const checkInDate = booking.checkIn || hotelOffer.checkInDate;
  const checkOutDate = booking.checkOut || hotelOffer.checkOutDate;

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
                    {checkInDate ? formatDate(checkInDate) : '-'}
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={12} md={6}>
                <Box sx={{ p: 2, borderRadius: 2, bgcolor: 'rgba(46, 125, 50, 0.08)', border: '1px solid', borderColor: 'success.main' }}>
                  <Typography variant="body2" color="text.secondary">
                    {t('hotel.search.checkOut') || '退房日期'}
                  </Typography>
                  <Typography variant="h5" color="success.main" fontWeight="bold" sx={{ mt: 1 }}>
                    {checkOutDate ? formatDate(checkOutDate) : '-'}
                  </Typography>
                </Box>
              </Grid>
              {checkInDate && checkOutDate && (
                <Grid item xs={12}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}>
                    <PeopleIcon color="action" />
                    <Typography variant="body1">
                      {t('hotel.bookingDetail.nights') || '入住天数'}:{' '}
                      {dayjs(checkOutDate).diff(dayjs(checkInDate), 'day')}{' '}
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
        {(() => {
          // 尝试从多个数据源获取房间信息
          let roomList = [];
          
          // 1. 优先使用 booking.rooms
          if (booking.rooms && Array.isArray(booking.rooms) && booking.rooms.length > 0) {
            roomList = booking.rooms;
          } 
          // 2. 如果没有，尝试从 hotelOffer.offers[0].room 获取
          else if (booking.hotelOffer?.offers?.[0]?.room) {
            const room = booking.hotelOffer.offers[0].room;
            roomList = Array.isArray(room) ? room : [room];
          }
          // 3. 如果还没有，遍历所有 offers 查找 room 信息
          else if (booking.hotelOffer?.offers && Array.isArray(booking.hotelOffer.offers)) {
            booking.hotelOffer.offers.forEach((offer, index) => {
              if (offer.room) {
                const roomData = Array.isArray(offer.room) ? offer.room : [offer.room];
                roomList.push(...roomData.map(r => ({ ...r, offerIndex: index })));
              }
            });
          }
          
          // 4. 如果仍然没有房间信息，但知道房间数量，创建一个占位房间
          if (roomList.length === 0 && booking.roomQuantity) {
            roomList = Array.from({ length: booking.roomQuantity }, (_, index) => ({
              type: '-',
              guests: booking.adults || 1,
            }));
          }
          
          // 5. 如果还是没有，至少显示一个房间（使用默认值）
          if (roomList.length === 0) {
            roomList = [{
              type: '-',
              guests: booking.adults || 1,
            }];
          }
          
          return (
            <Card sx={{ mb: 3 }}>
              <CardContent>
                <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <BedIcon color="primary" />
                  {t('hotel.bookingDetail.rooms') || '房间信息'}
                </Typography>
                <Grid container spacing={2}>
                  {roomList.map((room, index) => {
                    // 获取房间类型
                    const roomType = room.type || room.typeEstimated?.category || '-';
                    
                    // 获取床信息
                    const beds = room.typeEstimated?.beds;
                    const bedType = room.typeEstimated?.bedType;
                    const bedInfo = beds 
                      ? `${beds} ${t('hotel.list.beds') || '张床'}${bedType ? ` (${bedType})` : ''}`
                      : null;
                    
                    // 获取房间描述
                    const description = room.description?.text || room.description || '';
                    
                    // 获取入住人数
                    const guests = room.guests || room.typeEstimated?.guests || '-';
                    
                    return (
                      <Grid item xs={12} md={6} key={index}>
                        <Box sx={{ 
                          p: 2, 
                          borderRadius: 2, 
                          bgcolor: 'rgba(0, 0, 0, 0.02)', 
                          border: '1px solid', 
                          borderColor: 'divider',
                          height: '100%'
                        }}>
                          <Typography variant="subtitle1" fontWeight="bold" sx={{ mb: 1.5 }}>
                            {t('hotel.booking.room') || '房间'} {index + 1}
                          </Typography>
                          
                          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                            {roomType && roomType !== '-' && (
                              <Box>
                                <Typography variant="caption" color="text.secondary">
                                  {t('hotel.detail.roomType') || '房型'}
                                </Typography>
                                <Typography variant="body2" fontWeight="medium">
                                  {roomType}
                                </Typography>
                              </Box>
                            )}
                            
                            {bedInfo && (
                              <Box>
                                <Typography variant="caption" color="text.secondary">
                                  {t('hotel.bookingDetail.bedInfo') || '床型'}
                                </Typography>
                                <Typography variant="body2" fontWeight="medium">
                                  {bedInfo}
                                </Typography>
                              </Box>
                            )}
                            
                            {guests && guests !== '-' && (
                              <Box>
                                <Typography variant="caption" color="text.secondary">
                                  {t('hotel.bookingDetail.guestsPerRoom') || '入住人数'}
                                </Typography>
                                <Typography variant="body2" fontWeight="medium">
                                  {guests} {t('hotel.booking.guests') || '人'}
                                </Typography>
                              </Box>
                            )}
                            
                            {description && (
                              <Box sx={{ mt: 1 }}>
                                <Typography variant="caption" color="text.secondary">
                                  {t('hotel.bookingDetail.roomDescription') || '房间描述'}
                                </Typography>
                                <Typography variant="body2" sx={{ mt: 0.5 }}>
                                  {description}
                                </Typography>
                              </Box>
                            )}
                          </Box>
                        </Box>
                      </Grid>
                    );
                  })}
                </Grid>
              </CardContent>
            </Card>
          );
        })()}

        {/* 客人信息 */}
        {booking.guests && booking.guests.length > 0 && (
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <PeopleIcon color="primary" />
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
                    {booking.guests.map((guest, index) => {
                      const firstName = guest.name?.firstName || guest.firstName || '-';
                      const lastName = guest.name?.lastName || guest.lastName || '-';
                      const email = guest.contact?.emailAddress || guest.email || '-';
                      
                      // 处理电话号码显示
                      let phoneDisplay = '-';
                      const phone = guest.contact?.phones?.[0] || guest.phone;
                      if (phone) {
                        if (typeof phone === 'string') {
                          // 如果 phone 是字符串，直接使用
                          phoneDisplay = phone;
                        } else if (phone.number) {
                          // 如果 phone 是对象且有 number 字段
                          const number = phone.number;
                          const countryCode = phone.countryCallingCode;
                          
                          // 检查 number 是否已经包含国家代码（以 + 开头）
                          if (number.startsWith('+')) {
                            phoneDisplay = number;
                          } else if (countryCode) {
                            phoneDisplay = `+${countryCode}${number}`;
                          } else {
                            phoneDisplay = number;
                          }
                        } else {
                          phoneDisplay = '-';
                        }
                      }
                      
                      return (
                        <TableRow key={guest.id || index}>
                          <TableCell>
                            {t('hotel.booking.guest') || '客人'} {index + 1}
                          </TableCell>
                          <TableCell>{firstName}</TableCell>
                          <TableCell>{lastName}</TableCell>
                          <TableCell>{email}</TableCell>
                          <TableCell>{phoneDisplay}</TableCell>
                        </TableRow>
                      );
                    })}
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

