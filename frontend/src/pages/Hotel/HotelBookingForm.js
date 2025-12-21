/**
 * 酒店预订表单
 * 提供酒店预订功能，确保数据格式符合数据库要求
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
  TextField,
  Stepper,
  Step,
  StepLabel,
  Card,
  CardContent,
  Divider,
  Alert,
  CircularProgress,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  IconButton,
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  Delete as DeleteIcon,
  Add as AddIcon,
  CheckCircle as CheckCircleIcon,
} from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../contexts/AuthContext';
import { useNotification } from '../../contexts/NotificationContext';
import { createHotelBooking } from '../../services/hotelService';
import apiClient from '../../utils/axiosConfig';
import dayjs from 'dayjs';

const steps = ['选择差旅申请', '填写客人信息', '确认预订'];

const HotelBookingForm = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { showNotification } = useNotification();

  // 从路由状态获取酒店信息和搜索条件
  const { hotel, offerId, searchParams, searchResults } = location.state || {};

  const [activeStep, setActiveStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // 差旅申请相关
  const [travels, setTravels] = useState([]);
  const [selectedTravelId, setSelectedTravelId] = useState('');
  const [travelsLoading, setTravelsLoading] = useState(false);

  // 客人信息（确保格式符合数据库要求）
  const [guests, setGuests] = useState([
    {
      id: 'GUEST_1', // 必填：客人ID
      name: {
        firstName: user?.firstName || '', // 必填：名字
        lastName: user?.lastName || '', // 必填：姓氏
      },
      contact: {
        emailAddress: user?.email || '', // 必填：邮箱
        phones: [{ // 可选：电话数组
          deviceType: 'MOBILE', // MOBILE 或 LANDLINE
          countryCallingCode: '+86',
          number: user?.phone || '',
        }],
      },
    },
  ]);

  // 特殊要求
  const [specialRequests, setSpecialRequests] = useState('');

  useEffect(() => {
    if (activeStep === 0) {
      fetchTravels();
    }
  }, [activeStep]);

  // 当用户信息加载后，自动更新第一个客人的信息
  useEffect(() => {
    if (user) {
      setGuests(prev => {
        if (prev.length > 0) {
          const updated = [...prev];
          const firstGuest = updated[0];
          
          // 检查是否需要更新电话：如果当前电话为空，且用户有电话，则更新
          const currentPhoneNumber = firstGuest.contact?.phones?.[0]?.number?.trim();
          const userPhone = user.phone?.trim();
          const shouldUpdatePhone = !currentPhoneNumber && userPhone;
          
          updated[0] = {
            ...updated[0],
            id: updated[0].id || 'GUEST_1',
            name: {
              firstName: updated[0].name.firstName || user.firstName || '',
              lastName: updated[0].name.lastName || user.lastName || '',
            },
            contact: {
              ...updated[0].contact,
              emailAddress: updated[0].contact.emailAddress || user.email || '',
              phones: shouldUpdatePhone ? [{
                deviceType: 'MOBILE',
                countryCallingCode: '+86', // 默认中国区号
                number: userPhone,
              }] : (updated[0].contact.phones.length > 0 ? updated[0].contact.phones : [{
                deviceType: 'MOBILE',
                countryCallingCode: '+86',
                number: '', // 如果用户没有电话，留空让用户填写
              }]),
            },
          };
          return updated;
        }
        return prev;
      });
    }
  }, [user]);

  const fetchTravels = async () => {
    setTravelsLoading(true);
    try {
      // 只获取已审批通过的差旅申请
      const response = await apiClient.get('/travel', {
        params: { status: 'approved', limit: 100 },
      });
      if (response.data && response.data.success) {
        // 只保留审批通过的差旅申请
        const validTravels = (response.data.data || []).filter(
          (t) => t.status === 'approved' || t.status === 'draft'
        );
        setTravels(validTravels);
      }
    } catch (error) {
      showNotification('获取差旅申请列表失败', 'error');
    } finally {
      setTravelsLoading(false);
    }
  };

  const handleNext = () => {
    if (activeStep === 0) {
      if (!selectedTravelId) {
        showNotification('请选择差旅申请', 'error');
        return;
      }
    } else if (activeStep === 1) {
      // 验证客人信息（确保格式符合数据库要求）
      for (let i = 0; i < guests.length; i++) {
        const guest = guests[i];
        
        // 验证必填字段
        if (!guest.id || !guest.id.trim()) {
          showNotification(`请填写客人${i + 1}的ID`, 'error');
          return;
        }
        if (!guest.name?.firstName || !guest.name.firstName.trim()) {
          showNotification(`请填写客人${i + 1}的名字`, 'error');
          return;
        }
        if (!guest.name?.lastName || !guest.name.lastName.trim()) {
          showNotification(`请填写客人${i + 1}的姓氏`, 'error');
          return;
        }
        if (!guest.contact?.emailAddress || !guest.contact.emailAddress.trim()) {
          showNotification(`请填写客人${i + 1}的邮箱`, 'error');
          return;
        }
        
        // 验证邮箱格式
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(guest.contact.emailAddress)) {
          showNotification(`客人${i + 1}的邮箱格式不正确`, 'error');
          return;
        }
      }
    }
    setActiveStep((prevStep) => prevStep + 1);
  };

  const handleBack = () => {
    setActiveStep((prevStep) => prevStep - 1);
  };

  const handleCancel = () => {
    navigate('/flight/search', {
      state: {
        defaultTab: 'hotel',
        searchResults,
        searchParams,
      },
    });
  };

  const handleAddGuest = () => {
    if (guests.length >= 9) {
      showNotification('最多只能添加9个客人', 'warning');
      return;
    }
    setGuests([
      ...guests,
      {
        id: `GUEST_${guests.length + 1}`,
        name: {
          firstName: '',
          lastName: '',
        },
        contact: {
          emailAddress: '',
          phones: [{
            deviceType: 'MOBILE',
            countryCallingCode: '+86',
            number: '',
          }],
        },
      },
    ]);
  };

  const handleRemoveGuest = (index) => {
    if (guests.length <= 1) {
      showNotification('至少需要一个客人', 'warning');
      return;
    }
    setGuests(guests.filter((_, i) => i !== index));
  };

  const handleGuestChange = (index, field, value) => {
    const updated = [...guests];
    if (field.includes('.')) {
      const [parent, child] = field.split('.');
      updated[index] = {
        ...updated[index],
        [parent]: {
          ...updated[index][parent],
          [child]: value,
        },
      };
    } else {
      updated[index] = {
        ...updated[index],
        [field]: value,
      };
    }
    setGuests(updated);
  };

  const handlePhoneChange = (guestIndex, phoneIndex, field, value) => {
    const updated = [...guests];
    updated[guestIndex] = {
      ...updated[guestIndex],
      contact: {
        ...updated[guestIndex].contact,
        phones: updated[guestIndex].contact.phones.map((phone, idx) => {
          if (idx === phoneIndex) {
            return { ...phone, [field]: value };
          }
          return phone;
        }),
      },
    };
    setGuests(updated);
  };

  const handleSubmit = async () => {
    if (!hotel || !offerId) {
      showNotification('酒店信息缺失', 'error');
      return;
    }

    // 验证客人信息
    for (let i = 0; i < guests.length; i++) {
      const guest = guests[i];
      if (!guest.name.firstName || !guest.name.firstName.trim()) {
        showNotification(`客人${i + 1}的名字必填`, 'error');
        return;
      }
      if (!guest.name.lastName || !guest.name.lastName.trim()) {
        showNotification(`客人${i + 1}的姓氏必填`, 'error');
        return;
      }
      if (!guest.contact.emailAddress || !guest.contact.emailAddress.trim()) {
        showNotification(`客人${i + 1}的邮箱必填`, 'error');
        return;
      }
      // 验证电话：必须至少有一个有效的电话号码
      if (!guest.contact.phones || guest.contact.phones.length === 0) {
        showNotification(`客人${i + 1}的电话必填`, 'error');
        return;
      }
      const firstPhone = guest.contact.phones[0];
      if (!firstPhone || !firstPhone.number || !firstPhone.number.trim()) {
        showNotification(`客人${i + 1}的电话号码必填`, 'error');
        return;
      }
      if (!firstPhone.countryCallingCode || !firstPhone.countryCallingCode.trim()) {
        showNotification(`客人${i + 1}的电话国家代码必填`, 'error');
        return;
      }
      // 验证电话号码格式：号码应该只包含数字，长度在7-15位之间
      const phoneNumber = firstPhone.number.trim().replace(/\D/g, '');
      if (phoneNumber.length < 7 || phoneNumber.length > 15) {
        showNotification(`客人${i + 1}的电话号码格式无效：号码长度应在7-15位之间`, 'error');
        return;
      }
    }

    setLoading(true);
    setError(null);

    try {
      // 调试：检查酒店信息是否包含地址
      console.log('📋 提交预订时的酒店信息:', JSON.stringify({
        hotelId: hotel?.hotel?.hotelId,
        name: hotel?.hotel?.name,
        hasAddress: !!hotel?.hotel?.address,
        address: hotel?.hotel?.address,
        cityCode: hotel?.hotel?.cityCode,
        cityName: hotel?.hotel?.address?.cityName,
        countryCode: hotel?.hotel?.address?.countryCode,
      }, null, 2));

      // 构建预订数据（确保格式符合数据库要求）
      const bookingData = {
        travelId: selectedTravelId, // 必填：差旅申请ID
        offerId: offerId, // 必填：报价ID
        hotelOffer: hotel, // 必填：完整的酒店报价对象
        guests: guests.map((guest) => ({
          // 确保格式符合数据库要求
          id: guest.id, // 必填：String
          name: {
            firstName: guest.name.firstName.trim(), // 必填：String, trim
            lastName: guest.name.lastName.trim(), // 必填：String, trim
          },
          contact: {
            emailAddress: guest.contact.emailAddress.toLowerCase().trim(), // 必填：String, lowercase
            phones: guest.contact.phones.filter(phone => phone.number && phone.number.trim()).map(phone => ({
              deviceType: phone.deviceType || 'MOBILE', // enum: MOBILE, LANDLINE
              countryCallingCode: phone.countryCallingCode || '',
              number: phone.number.trim(),
            })),
          },
        })),
        specialRequests: specialRequests.trim() || undefined, // 可选
        // payments 和 rooms 可选，如果需要可以添加
      };

      const response = await createHotelBooking(bookingData);

      if (response.data.success) {
        showNotification('酒店预订成功', 'success');
        // 导航到预订详情页或预订管理页
        navigate('/hotel/bookings', {
          state: {
            bookingId: response.data.data._id,
          },
        });
      } else {
        throw new Error(response.data.message || '预订失败');
      }
    } catch (err) {
      const errorMsg = err.response?.data?.message || err.message || '预订失败';
      setError(errorMsg);
      showNotification(errorMsg, 'error');
    } finally {
      setLoading(false);
    }
  };

  if (!hotel || !offerId) {
    return (
      <Container maxWidth="lg">
        <Alert severity="error" sx={{ mt: 4 }}>
          {t('hotel.booking.missingInfo') || '酒店信息缺失'}
        </Alert>
        <Button startIcon={<ArrowBackIcon />} onClick={handleCancel} sx={{ mt: 2 }}>
          {t('hotel.booking.back') || '返回'}
        </Button>
      </Container>
    );
  }

  const hotelInfo = hotel.hotel || {};
  const offer = hotel.offers?.[0] || {};
  const price = offer.price || {};

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
          onClick={handleCancel}
          sx={{ mb: 2 }}
        >
          {t('hotel.booking.back') || '返回'}
        </Button>

        {/* 步骤指示器 */}
        <Paper sx={{ p: 3, mb: 3 }}>
          <Stepper activeStep={activeStep}>
            {steps.map((label) => (
              <Step key={label}>
                <StepLabel>{label}</StepLabel>
              </Step>
            ))}
          </Stepper>
        </Paper>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {/* 步骤内容 */}
        {activeStep === 0 && (
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              {t('hotel.booking.selectTravel') || '选择差旅申请'}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              {t('hotel.booking.selectTravelDesc') || '酒店预订必须关联差旅申请'}
            </Typography>

            {travelsLoading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
                <CircularProgress />
              </Box>
            ) : (
              <FormControl fullWidth>
                <InputLabel>{t('hotel.booking.travel') || '差旅申请'}</InputLabel>
                <Select
                  value={selectedTravelId}
                  onChange={(e) => setSelectedTravelId(e.target.value)}
                  label={t('hotel.booking.travel') || '差旅申请'}
                >
                  {travels.map((travel) => (
                    <MenuItem key={travel._id} value={travel._id}>
                      {travel.travelNumber} - {travel.title} ({travel.status})
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            )}

            {travels.length === 0 && !travelsLoading && (
              <Alert severity="warning" sx={{ mt: 2 }}>
                {t('hotel.booking.noTravels') || '没有可用的差旅申请，请先创建差旅申请'}
              </Alert>
            )}
          </Paper>
        )}

        {activeStep === 1 && (
          <Paper sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6">
                {t('hotel.booking.guestInfo') || '填写客人信息'}
              </Typography>
              <Button
                startIcon={<AddIcon />}
                onClick={handleAddGuest}
                disabled={guests.length >= 9}
                size="small"
              >
                {t('hotel.booking.addGuest') || '添加客人'}
              </Button>
            </Box>

            {guests.map((guest, index) => (
              <Card key={index} sx={{ mb: 2 }}>
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                    <Typography variant="subtitle1">
                      {t('hotel.booking.guest') || '客人'} {index + 1}
                    </Typography>
                    {guests.length > 1 && (
                      <IconButton
                        size="small"
                        color="error"
                        onClick={() => handleRemoveGuest(index)}
                      >
                        <DeleteIcon />
                      </IconButton>
                    )}
                  </Box>

                  <Grid container spacing={2}>
                    <Grid item xs={12} sm={6}>
                      <TextField
                        fullWidth
                        label={t('hotel.booking.firstName') || '名字'}
                        value={guest.name.firstName}
                        onChange={(e) => handleGuestChange(index, 'name.firstName', e.target.value)}
                        required
                      />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <TextField
                        fullWidth
                        label={t('hotel.booking.lastName') || '姓氏'}
                        value={guest.name.lastName}
                        onChange={(e) => handleGuestChange(index, 'name.lastName', e.target.value)}
                        required
                      />
                    </Grid>
                    <Grid item xs={12}>
                      <TextField
                        fullWidth
                        type="email"
                        label={t('hotel.booking.email') || '邮箱'}
                        value={guest.contact.emailAddress}
                        onChange={(e) => handleGuestChange(index, 'contact.emailAddress', e.target.value)}
                        required
                      />
                    </Grid>
                    {guest.contact.phones.map((phone, phoneIndex) => (
                      <React.Fragment key={phoneIndex}>
                        <Grid item xs={12} sm={3}>
                          <FormControl fullWidth>
                            <InputLabel>{t('hotel.booking.phoneType') || '电话类型'}</InputLabel>
                            <Select
                              value={phone.deviceType}
                              onChange={(e) => handlePhoneChange(index, phoneIndex, 'deviceType', e.target.value)}
                              label={t('hotel.booking.phoneType') || '电话类型'}
                            >
                              <MenuItem value="MOBILE">{t('hotel.booking.mobile') || '手机'}</MenuItem>
                              <MenuItem value="LANDLINE">{t('hotel.booking.landline') || '座机'}</MenuItem>
                            </Select>
                          </FormControl>
                        </Grid>
                        <Grid item xs={12} sm={3}>
                          <TextField
                            fullWidth
                            label={t('hotel.booking.countryCode') || '国家代码'}
                            value={phone.countryCallingCode}
                            onChange={(e) => handlePhoneChange(index, phoneIndex, 'countryCallingCode', e.target.value)}
                            placeholder="+86"
                          />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                          <TextField
                            fullWidth
                            label={t('hotel.booking.phoneNumber') || '电话号码'}
                            value={phone.number}
                            onChange={(e) => handlePhoneChange(index, phoneIndex, 'number', e.target.value)}
                          />
                        </Grid>
                      </React.Fragment>
                    ))}
                  </Grid>
                </CardContent>
              </Card>
            ))}

            <TextField
              fullWidth
              multiline
              rows={3}
              label={t('hotel.booking.specialRequests') || '特殊要求（可选）'}
              value={specialRequests}
              onChange={(e) => setSpecialRequests(e.target.value)}
              sx={{ mt: 2 }}
            />
          </Paper>
        )}

        {activeStep === 2 && (
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              {t('hotel.booking.confirm') || '确认预订'}
            </Typography>

            {/* 酒店信息摘要 */}
            <Card sx={{ mb: 2 }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  {hotelInfo.name || t('hotel.booking.unknownHotel') || '未知酒店'}
                </Typography>
                {hotelInfo.address && (
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    {hotelInfo.address.lines?.[0] || hotelInfo.address.cityName || ''}
                  </Typography>
                )}
                <Typography variant="h5" color="primary" sx={{ mt: 2 }}>
                  {formatPrice(price)}
                </Typography>
              </CardContent>
            </Card>

            {/* 预订信息摘要 */}
            <Card>
              <CardContent>
                <Typography variant="subtitle1" gutterBottom>
                  {t('hotel.booking.bookingSummary') || '预订摘要'}
                </Typography>
                <Divider sx={{ my: 2 }} />
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="body2" color="text.secondary">
                      {t('hotel.booking.checkIn') || '入住日期'}
                    </Typography>
                    <Typography variant="body1">
                      {searchParams?.checkInDate ? dayjs(searchParams.checkInDate).format('YYYY-MM-DD') : '-'}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="body2" color="text.secondary">
                      {t('hotel.booking.checkOut') || '退房日期'}
                    </Typography>
                    <Typography variant="body1">
                      {searchParams?.checkOutDate ? dayjs(searchParams.checkOutDate).format('YYYY-MM-DD') : '-'}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="body2" color="text.secondary">
                      {t('hotel.booking.guests') || '客人数量'}
                    </Typography>
                    <Typography variant="body1">
                      {guests.length} {t('hotel.booking.guest') || '人'}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="body2" color="text.secondary">
                      {t('hotel.booking.rooms') || '房间数量'}
                    </Typography>
                    <Typography variant="body1">
                      {searchParams?.roomQuantity || 1} {t('hotel.booking.room') || '间'}
                    </Typography>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Paper>
        )}

        {/* 操作按钮 */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 3 }}>
          <Button
            disabled={activeStep === 0}
            onClick={handleBack}
          >
            {t('hotel.booking.back') || '上一步'}
          </Button>
          <Box>
            <Button onClick={handleCancel} sx={{ mr: 1 }}>
              {t('hotel.booking.cancel') || '取消'}
            </Button>
            {activeStep === steps.length - 1 ? (
              <Button
                variant="contained"
                onClick={handleSubmit}
                disabled={loading}
                startIcon={loading ? <CircularProgress size={20} /> : <CheckCircleIcon />}
              >
                {loading ? t('hotel.booking.submitting') || '提交中...' : t('hotel.booking.submit') || '提交预订'}
              </Button>
            ) : (
              <Button variant="contained" onClick={handleNext}>
                {t('hotel.booking.next') || '下一步'}
              </Button>
            )}
          </Box>
        </Box>
      </Box>
    </Container>
  );
};

export default HotelBookingForm;

