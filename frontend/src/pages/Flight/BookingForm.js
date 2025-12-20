/**
 * 机票预订表单组件
 * 包含乘客信息、差旅申请选择、价格确认、提交功能
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
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  CircularProgress,
  Stepper,
  Step,
  StepLabel,
  Card,
  CardContent,
  Divider,
  Chip,
  IconButton,
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  Person as PersonIcon,
  Flight as FlightIcon,
  AttachMoney as MoneyIcon,
  CheckCircle as CheckCircleIcon,
  Add as AddIcon,
  Delete as DeleteIcon,
} from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../contexts/AuthContext';
import { useNotification } from '../../contexts/NotificationContext';
import { confirmPrice, createBooking } from '../../services/flightService';
import apiClient from '../../utils/axiosConfig';
import dayjs from 'dayjs';

const steps = ['selectTravel', 'passengerInfo', 'confirmPrice', 'submit'];

const BookingForm = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
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

  const [activeStep, setActiveStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // 差旅申请相关
  const [travels, setTravels] = useState([]);
  const [selectedTravelId, setSelectedTravelId] = useState('');
  const [travelsLoading, setTravelsLoading] = useState(false);

  // 乘客信息
  const [travelers, setTravelers] = useState([
    {
      id: 'TRAVELER_1',
      dateOfBirth: null,
      name: { firstName: user?.firstName || '', lastName: user?.lastName || '' },
      contact: {
        emailAddress: user?.email || '',
        phones: [{ deviceType: 'MOBILE', countryCallingCode: '+86', number: '' }],
      },
    },
  ]);

  // 价格确认
  const [confirmedPrice, setConfirmedPrice] = useState(null);
  const [priceConfirming, setPriceConfirming] = useState(false);

  useEffect(() => {
    if (activeStep === 0) {
      fetchTravels();
    }
    if (activeStep === 2 && flight && !confirmedPrice) {
      handleConfirmPrice();
    }
  }, [activeStep]);

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
          (t) => t.status === 'approved'
        );
        setTravels(validTravels);
      }
    } catch (error) {
      showNotification('获取差旅申请列表失败', 'error');
    } finally {
      setTravelsLoading(false);
    }
  };

  const handleConfirmPrice = async () => {
    if (!flight) return;

    setPriceConfirming(true);
    setError(null);
    try {
      // 在确认价格时传入 travelers 信息，确保 travelerPricings 中的 ID 格式正确
      const response = await confirmPrice({
        flightOffer: flight,
        travelers: travelers.map((t) => ({
          ...t,
          dateOfBirth: t.dateOfBirth ? dayjs(t.dateOfBirth).format('YYYY-MM-DD') : null,
        })),
      });
      if (response.data.success) {
        setConfirmedPrice(response.data.data);
        showNotification('价格确认成功', 'success');
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

  const handleNext = () => {
    if (activeStep === 0) {
      if (!selectedTravelId) {
        showNotification('请选择差旅申请', 'error');
        return;
      }
    } else if (activeStep === 1) {
      // 验证乘客信息
      for (let i = 0; i < travelers.length; i++) {
        const traveler = travelers[i];
        if (!traveler.name.firstName || !traveler.name.lastName) {
          showNotification(`请填写乘客${i + 1}的姓名`, 'error');
          return;
        }
        if (!traveler.dateOfBirth) {
          showNotification(`请选择乘客${i + 1}的出生日期`, 'error');
          return;
        }
        if (!traveler.contact.emailAddress) {
          showNotification(`请填写乘客${i + 1}的邮箱`, 'error');
          return;
        }
        // 验证电话号码
        if (!traveler.contact.phones || !traveler.contact.phones[0] || 
            !traveler.contact.phones[0].number || !traveler.contact.phones[0].number.trim()) {
          showNotification(`请填写乘客${i + 1}的电话号码`, 'error');
          return;
        }
        // 验证国家代码
        if (!traveler.contact.phones[0].countryCallingCode) {
          showNotification(`请选择乘客${i + 1}的国家代码`, 'error');
          return;
        }
      }
    }
    setActiveStep((prevStep) => prevStep + 1);
  };

  const handleBack = () => {
    setActiveStep((prevStep) => prevStep - 1);
  };

  const handleAddTraveler = () => {
    if (travelers.length >= 9) {
      showNotification('最多只能添加9名乘客', 'warning');
      return;
    }
    setTravelers([
      ...travelers,
      {
        id: `TRAVELER_${travelers.length + 1}`,
        dateOfBirth: null,
        name: { firstName: '', lastName: '' },
        contact: {
          emailAddress: '',
          phones: [{ deviceType: 'MOBILE', countryCallingCode: '+86', number: '' }],
        },
      },
    ]);
  };

  const handleRemoveTraveler = (index) => {
    if (travelers.length <= 1) {
      showNotification('至少需要一名乘客', 'warning');
      return;
    }
    setTravelers(travelers.filter((_, i) => i !== index));
  };

  const handleTravelerChange = (index, field, value) => {
    const updated = [...travelers];
    if (field.includes('.')) {
      const [parent, child] = field.split('.');
      if (child.includes('.')) {
        const [subParent, subChild] = child.split('.');
        updated[index][parent][subParent][subChild] = value;
      } else {
        // 如果是 dateOfBirth 字段，确保值是有效的 dayjs 对象或 null
        if (field === 'dateOfBirth' && value && dayjs.isDayjs(value)) {
          updated[index][parent][child] = value;
        } else if (field === 'dateOfBirth' && !value) {
          updated[index][parent][child] = null;
        } else {
          updated[index][parent][child] = value;
        }
      }
    } else {
      // 如果是 dateOfBirth 字段，确保值是有效的 dayjs 对象或 null
      if (field === 'dateOfBirth' && value && dayjs.isDayjs(value)) {
        updated[index][field] = value;
      } else if (field === 'dateOfBirth' && !value) {
        updated[index][field] = null;
      } else {
        updated[index][field] = value;
      }
    }
    setTravelers(updated);
  };

  const handlePhoneChange = (travelerIndex, phoneIndex, field, value) => {
    const updated = [...travelers];
    updated[travelerIndex].contact.phones[phoneIndex][field] = value;
    setTravelers(updated);
  };

  const handleSubmit = async () => {
    if (!selectedTravelId || !flight) {
      showNotification('缺少必要信息', 'error');
      return;
    }

    // 验证并格式化 travelers 数据
    const validatedTravelers = travelers.map((t, index) => {
      // 验证 dateOfBirth
      if (!t.dateOfBirth) {
        throw new Error(`乘客${index + 1}的出生日期必填`);
      }
      
      // 验证电话号码
      if (!t.contact.phones || !t.contact.phones[0] || 
          !t.contact.phones[0].number || !t.contact.phones[0].number.trim()) {
        throw new Error(`乘客${index + 1}的电话号码必填`);
      }
      
      // 验证国家代码
      if (!t.contact.phones[0].countryCallingCode) {
        throw new Error(`乘客${index + 1}的国家代码必填`);
      }
      
      return {
        ...t,
        dateOfBirth: dayjs(t.dateOfBirth).format('YYYY-MM-DD'),
      };
    });

    setLoading(true);
    setError(null);

    try {
      const bookingData = {
        travelId: selectedTravelId,
        flightOffer: confirmedPrice || flight,
        travelers: validatedTravelers,
      };

      const response = await createBooking(bookingData);
      if (response.data.success) {
        showNotification('机票预订成功', 'success');
        navigate(`/flight/bookings/${response.data.data._id}`);
      } else {
        throw new Error(response.data.message || '预订失败');
      }
    } catch (error) {
      const errorMsg = error.response?.data?.message || error.message || '预订失败';
      setError(errorMsg);
      showNotification(errorMsg, 'error');
    } finally {
      setLoading(false);
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

  const renderStepContent = () => {
    switch (activeStep) {
      case 0:
        return (
          <Box>
            <Typography variant="h6" gutterBottom>
              {t('flight.booking.selectTravel') || '选择差旅申请'}
            </Typography>
            <FormControl fullWidth sx={{ mt: 2 }}>
              <InputLabel>{t('flight.booking.travelApplication') || '差旅申请'}</InputLabel>
              <Select
                value={selectedTravelId}
                onChange={(e) => setSelectedTravelId(e.target.value)}
                label={t('flight.booking.travelApplication') || '差旅申请'}
                disabled={travelsLoading}
              >
                {travels.map((travel) => (
                  <MenuItem key={travel._id} value={travel._id}>
                    {travel.travelNumber} - {travel.title} ({t(`travel.statuses.${travel.status}`) || travel.status})
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            {travels.length === 0 && !travelsLoading && (
              <Alert 
                severity="info" 
                sx={{ mt: 2 }}
                action={
                  <Button
                    color="inherit"
                    size="small"
                    onClick={() => navigate('/travel/new')}
                    sx={{ fontWeight: 600 }}
                  >
                    {t('flight.booking.createTravel') || '创建差旅申请'}
                  </Button>
                }
              >
                <Box>
                  <Typography variant="body1" sx={{ fontWeight: 500, mb: 0.5 }}>
                    {t('flight.booking.noTravelAvailable') || '没有可用的差旅申请'}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {t('flight.booking.noTravelAvailableDesc') || '机票预订需要关联已审批通过的差旅申请。请先创建并提交差旅申请，待审批通过后再进行机票预订。'}
                  </Typography>
                </Box>
              </Alert>
            )}
          </Box>
        );

      case 1:
        return (
          <Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6">
                {t('flight.booking.passengerInfo') || '乘客信息'}
              </Typography>
              <Button
                startIcon={<AddIcon />}
                onClick={handleAddTraveler}
                disabled={travelers.length >= 9}
              >
                {t('flight.booking.addPassenger') || '添加乘客'}
              </Button>
            </Box>

            {travelers.map((traveler, index) => (
              <Card key={index} sx={{ mb: 2 }}>
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                    <Typography variant="subtitle1">
                      {t('flight.booking.passenger') || '乘客'} {index + 1}
                    </Typography>
                    {travelers.length > 1 && (
                      <IconButton
                        color="error"
                        onClick={() => handleRemoveTraveler(index)}
                        size="small"
                      >
                        <DeleteIcon />
                      </IconButton>
                    )}
                  </Box>

                  <Grid container spacing={2}>
                    <Grid item xs={12} md={6}>
                      <TextField
                        fullWidth
                        label={t('flight.booking.firstName') || '名'}
                        value={traveler.name.firstName}
                        onChange={(e) => handleTravelerChange(index, 'name.firstName', e.target.value)}
                        required
                      />
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <TextField
                        fullWidth
                        label={t('flight.booking.lastName') || '姓'}
                        value={traveler.name.lastName}
                        onChange={(e) => handleTravelerChange(index, 'name.lastName', e.target.value)}
                        required
                      />
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <DatePicker
                        label={t('flight.booking.dateOfBirth') || '出生日期'}
                        value={traveler.dateOfBirth ? dayjs(traveler.dateOfBirth) : null}
                        onChange={(date) => handleTravelerChange(index, 'dateOfBirth', date)}
                        maxDate={dayjs().subtract(1, 'day')}
                        slotProps={{ textField: { fullWidth: true, required: true } }}
                      />
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <TextField
                        fullWidth
                        type="email"
                        label={t('flight.booking.email') || '邮箱'}
                        value={traveler.contact.emailAddress}
                        onChange={(e) => handleTravelerChange(index, 'contact.emailAddress', e.target.value)}
                        required
                      />
                    </Grid>
                    <Grid item xs={12} md={4}>
                      <FormControl fullWidth>
                        <InputLabel>{t('flight.booking.countryCode') || '国家代码'}</InputLabel>
                        <Select
                          value={traveler.contact.phones[0]?.countryCallingCode || '+86'}
                          onChange={(e) => handlePhoneChange(index, 0, 'countryCallingCode', e.target.value)}
                        >
                          <MenuItem value="+86">+86 (中国)</MenuItem>
                          <MenuItem value="+1">+1 (美国/加拿大)</MenuItem>
                          <MenuItem value="+81">+81 (日本)</MenuItem>
                          <MenuItem value="+82">+82 (韩国)</MenuItem>
                        </Select>
                      </FormControl>
                    </Grid>
                    <Grid item xs={12} md={8}>
                      <TextField
                        fullWidth
                        label={t('flight.booking.phone') || '手机号'}
                        value={traveler.contact.phones[0]?.number || ''}
                        onChange={(e) => handlePhoneChange(index, 0, 'number', e.target.value)}
                      />
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>
            ))}
          </Box>
        );

      case 2:
        return (
          <Box>
            <Typography variant="h6" gutterBottom>
              {t('flight.booking.confirmPrice') || '确认价格'}
            </Typography>

            {flight && (
              <Card sx={{ mb: 2 }}>
                <CardContent>
                  <Typography variant="subtitle1" gutterBottom>
                    {t('flight.booking.flightInfo') || '航班信息'}
                  </Typography>
                  {flight.itineraries?.map((itinerary, idx) => (
                    <Box key={idx} sx={{ mb: 2 }}>
                      {itinerary.segments?.map((segment, segIdx) => (
                        <Box key={segIdx} sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                          <Box sx={{ minWidth: 80 }}>
                            <Typography variant="h6" color="primary">
                              {segment.departure?.iataCode}
                            </Typography>
                            <Typography variant="caption">
                              {dayjs(segment.departure?.at).format('YYYY-MM-DD HH:mm')}
                            </Typography>
                          </Box>
                          <Box sx={{ flex: 1, mx: 2, textAlign: 'center' }}>
                            <Typography variant="caption">{formatDuration(itinerary.duration)}</Typography>
                            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', mt: 0.5 }}>
                              <FlightIcon sx={{ fontSize: 16, mr: 0.5 }} />
                              <Typography variant="caption">
                                {segment.carrierCode} {segment.number}
                              </Typography>
                            </Box>
                          </Box>
                          <Box sx={{ minWidth: 80, textAlign: 'right' }}>
                            <Typography variant="h6" color="primary">
                              {segment.arrival?.iataCode}
                            </Typography>
                            <Typography variant="caption">
                              {dayjs(segment.arrival?.at).format('YYYY-MM-DD HH:mm')}
                            </Typography>
                          </Box>
                        </Box>
                      ))}
                    </Box>
                  ))}
                </CardContent>
              </Card>
            )}

            {priceConfirming ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                <CircularProgress />
              </Box>
            ) : confirmedPrice ? (
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography variant="h6">
                      {t('flight.booking.confirmedPrice') || '确认价格'}
                    </Typography>
                    <Typography variant="h4" color="primary">
                      {formatPrice(confirmedPrice.price)}
                    </Typography>
                  </Box>
                  {confirmedPrice.price?.base && (
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                      {t('flight.booking.basePrice') || '基础价格'}: {confirmedPrice.price.base}{' '}
                      {confirmedPrice.price.currency}
                    </Typography>
                  )}
                </CardContent>
              </Card>
            ) : (
              <Alert severity="warning">
                {t('flight.booking.priceNotConfirmed') || '价格尚未确认，请点击确认按钮'}
              </Alert>
            )}

            {error && (
              <Alert severity="error" sx={{ mt: 2 }}>
                {error}
              </Alert>
            )}
          </Box>
        );

      case 3:
        return (
          <Box>
            <Typography variant="h6" gutterBottom>
              {t('flight.booking.review') || '确认预订'}
            </Typography>
            <Alert severity="info" sx={{ mb: 2 }}>
              {t('flight.booking.reviewMessage') || '请确认以上信息无误后提交预订'}
            </Alert>
            {error && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {error}
              </Alert>
            )}
          </Box>
        );

      default:
        return null;
    }
  };

  if (!flight) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Alert severity="error">
          {t('flight.booking.noFlightSelected') || '未选择航班，请先搜索并选择航班'}
        </Alert>
        <Button 
          startIcon={<ArrowBackIcon />} 
          onClick={() => {
            // 返回时传递搜索条件，以便恢复搜索结果
            if (searchParams && originLocation && destinationLocation) {
              navigate('/flight/search', {
                state: {
                  searchParams,
                  searchResults,
                  originLocation,
                  destinationLocation,
                  isRoundTrip
                }
              });
            } else {
              navigate('/flight/search');
            }
          }} 
          sx={{ mt: 2 }}
        >
          {t('common.back') || '返回'}
        </Button>
      </Container>
    );
  }

  return (
    <LocalizationProvider dateAdapter={AdapterDayjs}>
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Paper elevation={3} sx={{ p: 4 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
            <Button 
              startIcon={<ArrowBackIcon />} 
              onClick={() => {
                // 返回时传递搜索条件，以便恢复搜索结果
                if (searchParams && originLocation && destinationLocation) {
                  navigate('/flight/search', {
                    state: {
                      searchParams,
                      searchResults,
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
              {t('flight.booking.title') || '机票预订'}
            </Typography>
          </Box>

          <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
            {steps.map((step) => (
              <Step key={step}>
                <StepLabel>{t(`flight.booking.steps.${step}`) || step}</StepLabel>
              </Step>
            ))}
          </Stepper>

          {renderStepContent()}

          <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 4 }}>
            <Button disabled={activeStep === 0} onClick={handleBack}>
              {t('common.previous') || '上一步'}
            </Button>
            {activeStep < steps.length - 1 ? (
              <Button 
                variant="contained" 
                onClick={handleNext} 
                disabled={loading || (activeStep === 0 && travels.length === 0)}
              >
                {t('common.next') || '下一步'}
              </Button>
            ) : (
              <Button
                variant="contained"
                onClick={handleSubmit}
                disabled={loading || !confirmedPrice}
                startIcon={loading ? <CircularProgress size={20} /> : <CheckCircleIcon />}
              >
                {loading ? t('common.submitting') || '提交中...' : t('flight.booking.submit') || '提交预订'}
              </Button>
            )}
          </Box>
        </Paper>
      </Container>
    </LocalizationProvider>
  );
};

export default BookingForm;

