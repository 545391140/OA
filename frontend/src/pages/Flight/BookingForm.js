/**
 * 机/酒预订表单组件
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
  LocationOn as LocationIcon,
  AirportShuttle as AirportIcon,
  Schedule as ScheduleIcon,
  FlightTakeoff as TakeoffIcon,
  FlightLand as LandingIcon,
  SwapHoriz as TransferIcon,
  AirlineStops as StopsIcon,
  Luggage as LuggageIcon,
  EventSeat as SeatIcon,
} from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../contexts/AuthContext';
import { useNotification } from '../../contexts/NotificationContext';
import { confirmPrice, createBooking } from '../../services/flightService';
import apiClient from '../../utils/axiosConfig';
import { getAirlineInfo, getAirportInfoBatch } from '../../utils/flightUtils';
import dayjs from 'dayjs';
import { pinyin } from 'pinyin-pro';

const steps = ['selectTravel', 'passengerInfo', 'confirmPrice', 'submit'];

// 检测字符串是否包含中文字符
const containsChinese = (str) => {
  if (!str || typeof str !== 'string') return false;
  return /[\u4e00-\u9fa5]/.test(str);
};

// 将中文转换为拼音，保留已有的英文字母
const convertToPinyin = (name) => {
  if (!name || typeof name !== 'string') {
    return '';
  }
  
  const trimmedName = name.trim();
  if (!trimmedName) {
    return '';
  }
  
  // 如果包含中文，需要转换
  if (containsChinese(trimmedName)) {
    try {
      // 使用 pinyin-pro 转换整个字符串（会自动处理中英文混合）
      const pinyinResult = pinyin(trimmedName, { toneType: 'none' });
      
      if (!pinyinResult || typeof pinyinResult !== 'string') {
        // 如果转换失败，尝试只保留英文字母
        const englishOnly = trimmedName.replace(/[^A-Za-z]/g, '');
        return englishOnly ? englishOnly.toUpperCase() : '';
      }
      
      // 移除所有空格和特殊字符，只保留字母，转换为大写
      const result = pinyinResult.replace(/\s+/g, '').replace(/[^A-Za-z]/g, '').toUpperCase();
      
      // 如果转换后为空，说明可能是特殊字符，尝试保留原字符串中的英文字母
      if (!result) {
        const englishOnly = trimmedName.replace(/[^A-Za-z]/g, '');
        return englishOnly ? englishOnly.toUpperCase() : '';
      }
      
      return result;
    } catch (error) {
      console.error('拼音转换失败:', error, '原始名字:', trimmedName);
      // 如果转换失败，尝试只保留英文字母
      const englishOnly = trimmedName.replace(/[^A-Za-z]/g, '');
      return englishOnly ? englishOnly.toUpperCase() : '';
    }
  }
  
  // 如果不包含中文，只保留英文字母、连字符和空格，然后转换为大写
  const result = trimmedName.replace(/[^A-Za-z\-\s']/g, '').replace(/\s+/g, '').toUpperCase();
  
  // 如果结果为空，说明只包含特殊字符
  if (!result || !result.trim()) {
    return '';
  }
  
  return result;
};

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

  const [airportInfoMap, setAirportInfoMap] = useState(new Map());

  // 获取机场信息
  useEffect(() => {
    const fetchAirportInfo = async () => {
      if (!flight?.itineraries) return;
      
      const airportCodes = new Set();
      flight.itineraries.forEach(itinerary => {
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

    if (flight) {
      fetchAirportInfo();
    }
  }, [flight]);

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
      dateOfBirth: user?.dateOfBirth ? dayjs(user.dateOfBirth) : null,
      name: { firstName: user?.firstName || '', lastName: user?.lastName || '' },
      contact: {
        emailAddress: user?.email || '',
        phones: [{ 
          deviceType: 'MOBILE', 
          countryCallingCode: '+86', 
          number: user?.phone || '' 
        }],
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

  // 当用户信息加载后，自动更新第一个乘客的信息（包括手机号和生日）
  useEffect(() => {
    if (user) {
      setTravelers(prev => {
        // 如果第一个乘客的信息为空，则自动填入用户信息
        if (prev.length > 0) {
          const firstTraveler = prev[0];
          const shouldUpdate = 
            !firstTraveler.contact.phones[0]?.number ||
            !firstTraveler.dateOfBirth ||
            !firstTraveler.name.firstName ||
            !firstTraveler.name.lastName ||
            !firstTraveler.contact.emailAddress;
          
          if (shouldUpdate) {
            const updated = [...prev];
            updated[0] = {
              ...updated[0],
              name: {
                firstName: updated[0].name.firstName || user.firstName || '',
                lastName: updated[0].name.lastName || user.lastName || '',
              },
              contact: {
                ...updated[0].contact,
                emailAddress: updated[0].contact.emailAddress || user.email || '',
                phones: [{
                  deviceType: 'MOBILE',
                  countryCallingCode: updated[0].contact.phones[0]?.countryCallingCode || '+86',
                  number: updated[0].contact.phones[0]?.number || user.phone || '',
                }],
              },
              dateOfBirth: updated[0].dateOfBirth || (user.dateOfBirth ? dayjs(user.dateOfBirth) : null),
            };
            return updated;
          }
        }
        return prev;
      });
    }
  }, [user?.phone, user?.firstName, user?.lastName, user?.email, user?.dateOfBirth]);

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
      // 自动转换中文名字为拼音
      const response = await confirmPrice({
        flightOffer: flight,
        travelers: travelers.map((t) => ({
          ...t,
          name: {
            firstName: convertToPinyin(t.name.firstName),
            lastName: convertToPinyin(t.name.lastName),
          },
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
        if (!traveler.name.firstName || !traveler.name.firstName.trim()) {
          showNotification(`请填写乘客${i + 1}的名字`, 'error');
          return;
        }
        if (!traveler.name.lastName || !traveler.name.lastName.trim()) {
          showNotification(`请填写乘客${i + 1}的姓氏`, 'error');
          return;
        }
        
        // 验证名字格式（转换后不能为空）
        const convertedFirstName = convertToPinyin(traveler.name.firstName);
        const convertedLastName = convertToPinyin(traveler.name.lastName);
        if (!convertedFirstName || !convertedFirstName.trim()) {
          showNotification(`乘客${i + 1}的名字格式无效，请使用英文字母或中文（将自动转换为拼音）`, 'error');
          return;
        }
        if (!convertedLastName || !convertedLastName.trim()) {
          showNotification(`乘客${i + 1}的姓氏格式无效，请使用英文字母或中文（将自动转换为拼音）`, 'error');
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
    } else if (activeStep === 2) {
      // 在进入最后一步前，必须确认价格
      if (!confirmedPrice) {
        showNotification('请先确认价格后再继续', 'error');
        return;
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

    // 必须使用确认后的价格，否则会导致 "Could not sell segment" 错误
    if (!confirmedPrice) {
      showNotification('请先确认价格后再提交预订', 'error');
      setActiveStep(1); // 返回到价格确认步骤
      return;
    }

    // 验证并格式化 travelers 数据
    const validatedTravelers = travelers.map((t, index) => {
      // 验证姓名（在转换前先检查）
      if (!t.name.firstName || !t.name.firstName.trim()) {
        throw new Error(`乘客${index + 1}的名字必填`);
      }
      if (!t.name.lastName || !t.name.lastName.trim()) {
        throw new Error(`乘客${index + 1}的姓氏必填`);
      }
      
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
      
      // 自动转换中文名字为拼音
      const convertedFirstName = convertToPinyin(t.name.firstName);
      const convertedLastName = convertToPinyin(t.name.lastName);
      
      // 验证转换后的名字不为空
      if (!convertedFirstName || !convertedFirstName.trim()) {
        throw new Error(`乘客${index + 1}的名字格式无效，请使用英文字母或中文（将自动转换为拼音）。当前输入: "${t.name.firstName}"`);
      }
      if (!convertedLastName || !convertedLastName.trim()) {
        throw new Error(`乘客${index + 1}的姓氏格式无效，请使用英文字母或中文（将自动转换为拼音）。当前输入: "${t.name.lastName}"`);
      }
      
      return {
        ...t,
        name: {
          firstName: convertedFirstName,
          lastName: convertedLastName,
        },
        dateOfBirth: dayjs(t.dateOfBirth).format('YYYY-MM-DD'),
      };
    });

    setLoading(true);
    setError(null);

    try {
      const bookingData = {
        travelId: selectedTravelId,
        flightOffer: confirmedPrice, // 必须使用确认后的价格
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
                        helperText={
                          traveler.name.firstName && containsChinese(traveler.name.firstName)
                            ? `将转换为: ${convertToPinyin(traveler.name.firstName)}`
                            : ''
                        }
                      />
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <TextField
                        fullWidth
                        label={t('flight.booking.lastName') || '姓'}
                        value={traveler.name.lastName}
                        onChange={(e) => handleTravelerChange(index, 'name.lastName', e.target.value)}
                        required
                        helperText={
                          traveler.name.lastName && containsChinese(traveler.name.lastName)
                            ? `将转换为: ${convertToPinyin(traveler.name.lastName)}`
                            : ''
                        }
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
              <Card sx={{ mb: 2, border: '1px solid', borderColor: 'divider' }}>
                <CardContent>
                  {flight.itineraries?.map((itinerary, idx) => (
                    <Box key={idx} sx={{ mb: idx < flight.itineraries.length - 1 ? 3 : 0 }}>
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
                                          idx === 0 ? originLocation : destinationLocation
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
                                          idx === 0 ? destinationLocation : originLocation
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
                  ))}
                </CardContent>
              </Card>
            )}

            {priceConfirming ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                <CircularProgress />
              </Box>
            ) : confirmedPrice ? (
              <Card sx={{ border: '1px solid', borderColor: 'divider' }}>
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                    <Box>
                      <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <MoneyIcon color="primary" />
                        {t('flight.detail.price') || '价格信息'}
                      </Typography>
                      <Chip
                        icon={<CheckCircleIcon />}
                        label={t('flight.detail.priceConfirmed') || '价格已确认'}
                        color="success"
                        size="small"
                        sx={{ mt: 1 }}
                      />
                    </Box>
                    <Box sx={{ textAlign: 'right' }}>
                      <Typography variant="h3" color="primary" fontWeight="bold">
                        {formatPrice(confirmedPrice.price)}
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                        {t('flight.detail.totalPrice') || '总价'}
                      </Typography>
                    </Box>
                  </Box>

                  <Divider sx={{ my: 2 }} />

                  {/* 价格明细 */}
                  <Grid container spacing={2}>
                    {confirmedPrice.price?.base && (
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
                    {confirmedPrice.price?.taxes && confirmedPrice.price.taxes.length > 0 && (
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
            ) : (
              <Box>
                <Alert severity="warning" sx={{ mb: 2 }}>
                  {t('flight.booking.priceNotConfirmed') || '价格尚未确认，请点击确认按钮'}
                </Alert>
                <Button
                  variant="contained"
                  onClick={handleConfirmPrice}
                  disabled={priceConfirming}
                  startIcon={priceConfirming ? <CircularProgress size={20} /> : <CheckCircleIcon />}
                  fullWidth
                >
                  {priceConfirming 
                    ? (t('flight.booking.confirming') || '确认中...') 
                    : (t('flight.booking.confirmPriceButton') || '确认价格')}
                </Button>
              </Box>
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

