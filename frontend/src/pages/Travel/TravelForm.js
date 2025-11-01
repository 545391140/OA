import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Container,
  Paper,
  Box,
  Typography,
  Button,
  Grid,
  Chip,
  IconButton,
  Card,
  CardContent,
  Divider,
  Alert,
  CircularProgress,
  InputAdornment,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Save as SaveIcon,
  Send as SendIcon,
  Flight as FlightIcon,
  Hotel as HotelIcon,
  Train as TrainIcon,
  DirectionsCar as CarIcon,
  DirectionsBus as BusIcon,
  AttachMoney as MoneyIcon,
  NavigateNext as NavigateNextIcon,
  NavigateBefore as NavigateBeforeIcon,
} from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../contexts/AuthContext';
import { useNotification } from '../../contexts/NotificationContext';
import ModernFormSection from '../../components/Common/ModernFormSection';
import ModernInput from '../../components/Common/ModernInput';
import ModernExpenseItem from '../../components/Common/ModernExpenseItem';
import ModernCostOverview from '../../components/Common/ModernCostOverview';
import CitySearchInput from '../../components/Common/CitySearchInput';
import RegionSelector from '../../components/Common/RegionSelector';
import FormSection from '../../components/Common/FormSection';
import { calculateDistance, formatDistance, isCitySupported } from '../../utils/distanceCalculator';
import dayjs from 'dayjs';

const TravelForm = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { showNotification } = useNotification();
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = Boolean(id);

  // 交通工具选项
  const transportationOptions = [
    { value: 'flight', label: '飞机', icon: <FlightIcon /> },
    { value: 'train', label: '火车', icon: <TrainIcon /> },
    { value: 'car', label: '汽车', icon: <CarIcon /> },
    { value: 'bus', label: '大巴', icon: <BusIcon /> },
  ];

  const [formData, setFormData] = useState({
    title: '',
    purpose: '',
    travelType: 'domestic', // 新增：差旅类型 (international/domestic)
    tripType: 'mainland_china', // 新增：行程类型 (international/mainland_china)
    // 新增字段
    costOwingDepartment: '', // 费用承担部门
    destination: '', // 目的地
    requestName: '', // 申请人姓名
    startDate: null, // 开始日期
    endDate: null, // 结束日期
    tripDescription: '', // 差旅描述
    comment: '', // 备注
    // 去程信息
    outbound: {
      date: null, // 出发日期
      departure: '', // 出发地
      destination: '', // 目的地
      transportation: '' // 交通工具
    },
    // 返程信息
    inbound: {
      date: null, // 返程日期
      departure: '', // 出发地
      destination: '', // 目的地
      transportation: '' // 交通工具
    },
    destinationAddress: '', // 目的地详细地址
    // 新增：多程行程支持
    multiCityRoutes: [], // 多程路线数组，每个元素包含 { date, departure, destination, transportation }
    // 费用预算 - 去程
    outboundBudget: {
      flight: { unitPrice: '', quantity: 1, subtotal: '' }, // 机票
      accommodation: { unitPrice: '', quantity: 1, subtotal: '' }, // 住宿
      localTransport: { unitPrice: '', quantity: 1, subtotal: '' }, // 市内交通
      airportTransfer: { unitPrice: '', quantity: 1, subtotal: '' }, // 特殊时间机场接送费
      allowance: { unitPrice: '', quantity: 1, subtotal: '' } // 差旅补助
    },
    // 费用预算 - 返程
    inboundBudget: {
      flight: { unitPrice: '', quantity: 1, subtotal: '' }, // 机票
      accommodation: { unitPrice: '', quantity: 1, subtotal: '' }, // 住宿
      localTransport: { unitPrice: '', quantity: 1, subtotal: '' }, // 市内交通
      airportTransfer: { unitPrice: '', quantity: 1, subtotal: '' }, // 特殊时间机场接送费
      allowance: { unitPrice: '', quantity: 1, subtotal: '' } // 差旅补助
    },
    estimatedCost: '',
    currency: 'USD',
    notes: '',
    bookings: []
  });

  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState([]);
  const [errorSteps, setErrorSteps] = useState([]);
  const [validationResults, setValidationResults] = useState([]);
  const [distance, setDistance] = useState(null);

  // 步骤定义
  const steps = [
    {
      label: '基本信息',
      description: '填写差旅基本信息、类型和行程',
      icon: '1'
    },
    {
      label: '出行安排',
      description: '设置出行日期、出发地和目的地',
      icon: '2'
    },
    {
      label: '费用预算',
      description: '设置详细的费用预算项目',
      icon: '3'
    },
    {
      label: '预订信息',
      description: '添加预订详情',
      icon: '4'
    }
  ];

  const currencies = [
    { value: 'USD', label: 'USD - US Dollar' },
    { value: 'CNY', label: 'CNY - Chinese Yuan' },
    { value: 'JPY', label: 'JPY - Japanese Yen' },
    { value: 'KRW', label: 'KRW - Korean Won' },
    { value: 'EUR', label: 'EUR - Euro' }
  ];

  // 新增：差旅类型选项
  const travelTypes = [
    { value: 'domestic', label: t('travel.domestic'), icon: '🏠' },
    { value: 'international', label: t('travel.international'), icon: '✈️' }
  ];

  // 新增：行程类型选项
  const tripTypes = [
    { value: 'international', label: t('travel.tripTypes.international'), icon: '🌍' },
    { value: 'mainland_china', label: t('travel.tripTypes.mainland_china'), icon: '🇨🇳' }
  ];

  // 费用承担部门选项
  const departments = [
    { value: 'hr', label: t('travel.departments.hr') },
    { value: 'it', label: t('travel.departments.it') },
    { value: 'finance', label: t('travel.departments.finance') },
    { value: 'marketing', label: t('travel.departments.marketing') },
    { value: 'sales', label: t('travel.departments.sales') },
    { value: 'operations', label: t('travel.departments.operations') },
    { value: 'information_resources', label: t('travel.departments.information_resources') }
  ];

  // 目的地选项
  const destinations = [
    { value: 'los_angeles', label: t('travel.destinations.los_angeles') },
    { value: 'new_york', label: t('travel.destinations.new_york') },
    { value: 'london', label: t('travel.destinations.london') },
    { value: 'tokyo', label: t('travel.destinations.tokyo') },
    { value: 'shanghai', label: t('travel.destinations.shanghai') },
    { value: 'singapore', label: t('travel.destinations.singapore') },
    { value: 'paris', label: t('travel.destinations.paris') }
  ];

  // 申请人姓名选项
  const requestNames = [
    { value: 'john_doe', label: t('travel.requestNames.john_doe') },
    { value: 'jane_smith', label: t('travel.requestNames.jane_smith') },
    { value: 'mike_johnson', label: t('travel.requestNames.mike_johnson') },
    { value: 'sarah_wilson', label: t('travel.requestNames.sarah_wilson') },
    { value: 'david_brown', label: t('travel.requestNames.david_brown') }
  ];


  const bookingTypes = [
    { value: 'flight', label: t('travel.flight'), icon: <FlightIcon /> },
    { value: 'hotel', label: t('travel.hotel'), icon: <HotelIcon /> },
    { value: 'car', label: t('travel.carRental'), icon: <CarIcon /> },
    { value: 'train', label: t('travel.train'), icon: <TrainIcon /> },
    { value: 'other', label: t('travel.other'), icon: <MoneyIcon /> }
  ];

  useEffect(() => {
    if (isEdit) {
      fetchTravelData();
    }
    // 初始化时更新步骤状态
    updateStepStatus();
  }, [id, isEdit]);

  // 监听表单数据变化，实时更新步骤状态
  useEffect(() => {
    updateStepStatus();
  }, [formData]);


  // 分页导航函数
  const handleNextStep = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleStepClick = (stepIndex) => {
    setCurrentStep(stepIndex);
  };

  // 渲染当前步骤的内容
  const renderCurrentStep = () => {
    switch (currentStep) {
      case 0:
        return renderBasicInfoStep();
      case 1:
        return renderTravelArrangementStep();
      case 2:
        return renderBudgetStep();
      case 3:
        return renderBookingsStep();
      default:
        return null;
    }
  };

  const fetchTravelData = async () => {
    try {
      setLoading(true);
      // TODO: 实现真实的API调用
      // const response = await fetch(`/api/travel/${id}`);
      // const data = await response.json();
      // setFormData(data);
      
      // 暂时保持空表单，让用户自己填写
      console.log('Loading travel data for ID:', id);
    } catch (error) {
      showNotification('Failed to load travel data', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field, value) => {
    if (field.includes('.')) {
      const [parent, child] = field.split('.');
      setFormData(prev => {
        // 处理RegionSelector返回的对象数据
        let processedValue = value;
        if (typeof value === 'object' && value !== null && value.city) {
          // RegionSelector返回的是对象，我们需要提取显示文本用于存储和计算
          processedValue = `${value.city}, ${value.country}`;
        }

        const newData = {
        ...prev,
        [parent]: {
          ...prev[parent],
          [child]: processedValue
        }
        };

        // 自动设置返程信息（适用于所有行程类型）
        if (parent === 'outbound') {
          if (child === 'departure') {
            // 去程出发地变化时，返程目的地设为去程出发地
            newData.inbound = {
              ...newData.inbound,
              destination: value
            };
          } else if (child === 'destination') {
            // 去程目的地变化时，返程出发地设为去程目的地
            newData.inbound = {
              ...newData.inbound,
              departure: value
            };
          }
        }

        return newData;
      });
    } else {
      setFormData(prev => ({
        ...prev,
        [field]: value
      }));
    }

    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: ''
      }));
    }

    // 更新步骤状态
    setTimeout(() => updateStepStatus(), 100);
  };

  // 添加多程行程
  const addMultiCityRoute = () => {
    const newRoute = {
      date: null,
      departure: '',
      destination: '',
      transportation: ''
    };
    setFormData(prev => ({
      ...prev,
      multiCityRoutes: [...prev.multiCityRoutes, newRoute]
    }));
  };

  // 删除多程行程
  const removeMultiCityRoute = (index) => {
    setFormData(prev => ({
      ...prev,
      multiCityRoutes: prev.multiCityRoutes.filter((_, i) => i !== index)
    }));
  };

  // 更新多程行程
  const updateMultiCityRoute = (index, field, value) => {
    setFormData(prev => ({
      ...prev,
      multiCityRoutes: prev.multiCityRoutes.map((route, i) => 
        i === index ? { ...route, [field]: value } : route
      )
    }));
  };

  // 计算距离
  useEffect(() => {
    const calculateCityDistance = () => {
      // 计算去程距离（适用于所有行程类型）
      if (formData.outbound.departure && formData.outbound.destination) {
        const outboundDistance = calculateDistance(formData.outbound.departure, formData.outbound.destination);
        setDistance(outboundDistance);
      } else {
        setDistance(null);
      }
    };

    calculateCityDistance();
  }, [formData.outbound.departure, formData.outbound.destination, formData.tripType]);

  // 处理差旅类型变化
  const handleTravelTypeChange = (travelType) => {
    setFormData(prev => ({
      ...prev,
      travelType: travelType,
      // 重置新字段
      costOwingDepartment: '',
      destination: '',
      requestName: '',
      startDate: null,
      endDate: null,
      tripDescription: '',
      comment: '',
      outbound: {
        date: null,
        departure: '',
        destination: ''
      },
      inbound: {
        date: null,
        departure: '',
        destination: ''
      },
      destinationAddress: '',
            outboundBudget: {
              flight: { unitPrice: '', quantity: 1, subtotal: '' },
              accommodation: { unitPrice: '', quantity: 1, subtotal: '' },
              localTransport: { unitPrice: '', quantity: 1, subtotal: '' },
              airportTransfer: { unitPrice: '', quantity: 1, subtotal: '' },
              allowance: { unitPrice: '', quantity: 1, subtotal: '' }
            },
            inboundBudget: {
              flight: { unitPrice: '', quantity: 1, subtotal: '' },
              accommodation: { unitPrice: '', quantity: 1, subtotal: '' },
              localTransport: { unitPrice: '', quantity: 1, subtotal: '' },
              airportTransfer: { unitPrice: '', quantity: 1, subtotal: '' },
              allowance: { unitPrice: '', quantity: 1, subtotal: '' }
            }
    }));
  };

  // 处理预算项目变化
  const handleBudgetChange = (tripType, category, field, value) => {
    setFormData(prev => {
      const newData = { ...prev };
      const budget = tripType === 'outbound' ? newData.outboundBudget : newData.inboundBudget;
      
      if (field === 'unitPrice' || field === 'quantity') {
        budget[category][field] = value;
        // 自动计算小计
        const unitPrice = parseFloat(budget[category].unitPrice) || 0;
        const quantity = parseInt(budget[category].quantity) || 1;
        budget[category].subtotal = (unitPrice * quantity).toFixed(2);
      } else {
        budget[category][field] = value;
      }
      
      return newData;
    });
  };

  // 处理行程类型变化
  const handleTripTypeChange = (tripType) => {
    setFormData(prev => {
      const newData = {
        ...prev,
        tripType: tripType
      };

      // 自动设置返程信息（如果去程信息已填写）
      if (prev.outbound.departure && prev.outbound.destination) {
        newData.inbound = {
          ...newData.inbound,
          departure: prev.outbound.destination, // 返程出发地 = 去程目的地
          destination: prev.outbound.departure  // 返程目的地 = 去程出发地
        };
      }

      return newData;
    });
  };


  // 更新步骤状态
  const updateStepStatus = () => {
    const newCompletedSteps = [];
    const newErrorSteps = [];
    const newValidationResults = [];

    // 步骤1: 基本信息（包含所有必填字段）
    const basicInfoComplete = formData.tripType && 
                             formData.costOwingDepartment && 
                             formData.destination && 
                             formData.requestName && 
                             formData.startDate && 
                             formData.endDate && 
                             formData.tripDescription.trim();
    
    if (basicInfoComplete) {
      newCompletedSteps.push(0);
      newValidationResults.push({
        message: '基本信息填写完整',
        status: 'valid'
      });
    } else {
      const missingFields = [];
      if (!formData.tripType) missingFields.push(t('travel.tripType'));
      if (!formData.costOwingDepartment) missingFields.push(t('travel.costOwingDepartment'));
      if (!formData.destination) missingFields.push(t('travel.destination'));
      if (!formData.requestName) missingFields.push(t('travel.requestName'));
      if (!formData.startDate) missingFields.push(t('travel.startDate'));
      if (!formData.endDate) missingFields.push(t('travel.endDate'));
      if (!formData.tripDescription.trim()) missingFields.push(t('travel.tripDescription'));
      
      newErrorSteps.push(0);
      newValidationResults.push({
        message: `请填写：${missingFields.join('、')}`,
        status: 'error'
      });
    }

    // 步骤2: 出行安排（包含去程和返程信息）
    const outboundComplete = formData.outbound.date && 
                            (typeof formData.outbound.departure === 'string' ? formData.outbound.departure.trim() : formData.outbound.departure) && 
                            (typeof formData.outbound.destination === 'string' ? formData.outbound.destination.trim() : formData.outbound.destination) &&
                            formData.outbound.transportation;
    const inboundComplete = formData.inbound.date && 
                           (typeof formData.inbound.departure === 'string' ? formData.inbound.departure.trim() : formData.inbound.departure) && 
                           (typeof formData.inbound.destination === 'string' ? formData.inbound.destination.trim() : formData.inbound.destination) &&
                           formData.inbound.transportation;
    
    if (outboundComplete && inboundComplete) {
      newCompletedSteps.push(1);
      newValidationResults.push({
        message: '出行安排设置完整',
        status: 'valid'
      });
    } else {
      const missingFields = [];
      if (!formData.outbound.transportation) missingFields.push('去程交通工具');
      if (!formData.outbound.date) missingFields.push('去程出发日期');
      if (!(typeof formData.outbound.departure === 'string' ? formData.outbound.departure.trim() : formData.outbound.departure)) missingFields.push('去程出发地');
      if (!(typeof formData.outbound.destination === 'string' ? formData.outbound.destination.trim() : formData.outbound.destination)) missingFields.push('去程目的地');
      if (!formData.inbound.transportation) missingFields.push('返程交通工具');
      if (!formData.inbound.date) missingFields.push('返程出发日期');
      if (!(typeof formData.inbound.departure === 'string' ? formData.inbound.departure.trim() : formData.inbound.departure)) missingFields.push('返程出发地');
      if (!(typeof formData.inbound.destination === 'string' ? formData.inbound.destination.trim() : formData.inbound.destination)) missingFields.push('返程目的地');
      
      newErrorSteps.push(1);
      newValidationResults.push({
        message: `请完善出行安排：${missingFields.join('、')}`,
        status: 'error'
      });
    }

        // 步骤3: 费用预算
        const outboundBudgetValid = formData.outboundBudget.flight.unitPrice && 
                                   formData.outboundBudget.accommodation.unitPrice && 
                                   formData.outboundBudget.localTransport.unitPrice && 
                                   formData.outboundBudget.airportTransfer.unitPrice && 
                                   formData.outboundBudget.allowance.unitPrice;
        
        const inboundBudgetValid = formData.inboundBudget.flight.unitPrice && 
                                   formData.inboundBudget.accommodation.unitPrice && 
                                   formData.inboundBudget.localTransport.unitPrice && 
                                   formData.inboundBudget.airportTransfer.unitPrice && 
                                   formData.inboundBudget.allowance.unitPrice;
        
        const costValid = outboundBudgetValid && inboundBudgetValid;
        
        if (costValid) {
      newCompletedSteps.push(2);
      newValidationResults.push({
            message: '费用预算设置完整',
        status: 'valid'
      });
    } else {
          const missingFields = [];
          if (!formData.outboundBudget.flight.unitPrice) missingFields.push('去程机票');
          if (!formData.outboundBudget.accommodation.unitPrice) missingFields.push('去程住宿');
          if (!formData.outboundBudget.localTransport.unitPrice) missingFields.push('去程市内交通');
          if (!formData.outboundBudget.airportTransfer.unitPrice) missingFields.push('去程机场接送费');
          if (!formData.outboundBudget.allowance.unitPrice) missingFields.push('去程差旅补助');
          
          if (!formData.inboundBudget.flight.unitPrice) missingFields.push('返程机票');
          if (!formData.inboundBudget.accommodation.unitPrice) missingFields.push('返程住宿');
          if (!formData.inboundBudget.localTransport.unitPrice) missingFields.push('返程市内交通');
          if (!formData.inboundBudget.airportTransfer.unitPrice) missingFields.push('返程机场接送费');
          if (!formData.inboundBudget.allowance.unitPrice) missingFields.push('返程差旅补助');
          
          newErrorSteps.push(2);
      newValidationResults.push({
            message: `请完善费用预算：${missingFields.join('、')}`,
        status: 'error'
      });
    }

    // 步骤4: 预订信息（可选）
    if (formData.bookings.length > 0) {
      newCompletedSteps.push(3);
      newValidationResults.push({
        message: '预订信息已添加',
        status: 'valid'
      });
    } else {
      newValidationResults.push({
        message: '预订信息为可选项，可以稍后添加',
        status: 'info'
      });
    }

    setCompletedSteps(newCompletedSteps);
    setErrorSteps(newErrorSteps);
    setValidationResults(newValidationResults);
  };

  const addBooking = () => {
    setFormData(prev => ({
      ...prev,
      bookings: [
        ...prev.bookings,
        {
          type: 'flight',
          provider: '',
          bookingReference: '',
          cost: '',
          currency: 'USD',
          details: {},
          status: 'pending'
        }
      ]
    }));
  };

  const removeBooking = (index) => {
    setFormData(prev => ({
      ...prev,
      bookings: prev.bookings.filter((_, i) => i !== index)
    }));
  };

  const updateBooking = (index, field, value) => {
    setFormData(prev => ({
      ...prev,
      bookings: prev.bookings.map((booking, i) =>
        i === index ? { ...booking, [field]: value } : booking
      )
    }));
  };

  const validateForm = () => {
    const newErrors = {};

    // 基本信息验证
    if (!formData.tripType) {
      newErrors.tripType = '请选择行程类型';
    }

    if (!formData.costOwingDepartment) {
      newErrors.costOwingDepartment = '请选择费用承担部门';
    }

    if (!formData.destination) {
      newErrors.destination = '请选择目的地';
    }

    if (!formData.requestName) {
      newErrors.requestName = '请选择申请人姓名';
    }

    if (!formData.startDate) {
      newErrors.startDate = '请选择开始日期';
    }

    if (!formData.endDate) {
      newErrors.endDate = '请选择结束日期';
    }

    if (!formData.tripDescription.trim()) {
      newErrors.tripDescription = '请输入差旅描述';
    }

    // 去程信息验证
    if (!formData.outbound.date) {
      newErrors.outboundDate = '请选择去程出发日期';
    }

    if (!formData.outbound.departure) {
      newErrors.outboundDeparture = '请选择去程出发地';
    }

    if (!formData.outbound.destination) {
      newErrors.outboundDestination = '请选择去程目的地';
    }

    // 返程信息验证
    if (!formData.inbound.date) {
      newErrors.inboundDate = '请选择返程日期';
    }

    if (!formData.inbound.departure) {
      newErrors.inboundDeparture = '请选择返程出发地';
    }

    if (!formData.inbound.destination) {
      newErrors.inboundDestination = '请选择返程目的地';
    }

    // 日期逻辑验证
    if (formData.startDate && formData.endDate && 
        formData.startDate.isAfter(formData.endDate)) {
      newErrors.endDate = '返回日期不能早于出发日期';
    }

    // 费用验证
    if (!formData.estimatedCost || isNaN(formData.estimatedCost) || parseFloat(formData.estimatedCost) <= 0) {
      newErrors.estimatedCost = '请输入有效的费用预算（大于0的数字）';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async (status = 'draft') => {
    if (!validateForm()) {
      return;
    }

    try {
      setSaving(true);
      
      const submitData = {
        ...formData,
        status,
        estimatedCost: parseFloat(formData.estimatedCost)
      };

      // Mock API call - replace with actual implementation
      console.log('Saving travel request:', submitData);
      
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 1000));

      showNotification(
        status === 'draft' ? 'Travel request saved as draft' : 'Travel request submitted successfully',
        'success'
      );
      
      navigate('/travel');
    } catch (error) {
      showNotification('Failed to save travel request', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleSubmit = () => {
    console.log('=== 提交申请按钮点击 ===');
    console.log('Form data:', formData);
    console.log('Validation result:', validateForm());
    console.log('Errors:', errors);
    handleSave('submitted');
  };

  // 渲染基本信息步骤
  const renderBasicInfoStep = () => (
    <ModernFormSection
            title="基本信息"
      description="填写差旅申请的基本信息、类型和行程"
            stepNumber={1}
            status={completedSteps.includes(0) ? 'completed' : errorSteps.includes(0) ? 'error' : currentStep === 0 ? 'active' : 'pending'}
            statusLabel={errorSteps.includes(0) ? '待填写' : undefined}
          >
            <Grid container spacing={3}>
              {/* Trip Type */}
              <Grid item xs={12} md={6}>
          <ModernInput
            type="select"
            label={t('travel.tripType')}
                  value={formData.tripType}
            onChange={(e) => handleTripTypeChange(e.target.value)}
            error={!!errors.tripType}
            required={true}
            options={tripTypes}
                />
              </Grid>

              {/* Cost-Owing Department */}
              <Grid item xs={12} md={6}>
          <ModernInput
            type="select"
            label={t('travel.costOwingDepartment')}
                    value={formData.costOwingDepartment}
                    onChange={(e) => handleChange('costOwingDepartment', e.target.value)}
                    error={!!errors.costOwingDepartment}
            required={true}
            options={departments}
              />
            </Grid>

            {/* Destination */}
              <Grid item xs={12} md={6}>
                <RegionSelector
                  label={t('travel.destination')}
                  value={formData.destination}
                  onChange={(value) => handleChange('destination', value)}
                  placeholder="搜索目的地城市或机场"
                  error={!!errors.destination}
                  helperText={errors.destination}
                  required={true}
              />
            </Grid>

              {/* Request Name */}
              <Grid item xs={12} md={6}>
          <ModernInput
            type="select"
            label={t('travel.requestName')}
                    value={formData.requestName}
                    onChange={(e) => handleChange('requestName', e.target.value)}
                    error={!!errors.requestName}
            required={true}
            options={requestNames}
              />
            </Grid>

              {/* Start Date */}
              <Grid item xs={12} md={6}>
                <DatePicker
                  label={`${t('travel.startDate')} *`}
                  value={formData.startDate}
                  onChange={(newValue) => handleChange('startDate', newValue)}
                  slotProps={{
                    textField: {
                      fullWidth: true,
                      error: !!errors.startDate,
                      helperText: errors.startDate,
                      required: true
                    }
                  }}
                />
              </Grid>

              {/* End Date */}
                <Grid item xs={12} md={6}>
                  <DatePicker
                  label={`${t('travel.endDate')} *`}
                  value={formData.endDate}
                  onChange={(newValue) => handleChange('endDate', newValue)}
                    slotProps={{
                      textField: {
                        fullWidth: true,
                      error: !!errors.endDate,
                      helperText: errors.endDate,
                      required: true
                      }
                    }}
                  />
                </Grid>

              {/* Trip Description */}
              <Grid item xs={12}>
          <ModernInput
            type="text"
            label={t('travel.tripDescription')}
                value={formData.tripDescription}
                onChange={(e) => handleChange('tripDescription', e.target.value)}
                error={!!errors.tripDescription}
                helperText={errors.tripDescription || t('travel.placeholders.tripDescription')}
            multiline={true}
            rows={4}
            required={true}
            placeholder={t('travel.placeholders.tripDescription')}
                  />
                </Grid>

              {/* Comment */}
              <Grid item xs={12}>
          <ModernInput
            type="text"
            label={t('travel.comment')}
                value={formData.comment}
                onChange={(e) => handleChange('comment', e.target.value)}
                error={!!errors.comment}
                helperText={t('travel.placeholders.comment')}
            multiline={true}
            rows={3}
            placeholder={t('travel.placeholders.comment')}
                    />
                  </Grid>
      </Grid>
    </ModernFormSection>
  );

  // 渲染出行安排步骤（包含出行日期和目的地）
  const renderTravelArrangementStep = () => (
    <ModernFormSection
      title="出行安排"
      description="设置出行日期、出发地和目的地"
      stepNumber={2}
      status={completedSteps.includes(1) ? 'completed' : errorSteps.includes(1) ? 'error' : currentStep === 1 ? 'active' : 'pending'}
      statusLabel={errorSteps.includes(1) ? '待填写' : undefined}
    >
      <Grid container spacing={3}>
        {/* 去程信息 */}
            <Grid item xs={12}>
          <Typography variant="h6" gutterBottom sx={{ mt: 2, mb: 2 }}>
            🛫 {formData.multiCityRoutes.length >= 1 ? '第一程信息' : '去程信息'}
              </Typography>
            </Grid>

                  <Grid item xs={12} md={3}>
                    <FormControl fullWidth>
                      <InputLabel>交通工具 *</InputLabel>
                      <Select
                        value={formData.outbound.transportation}
                        onChange={(e) => handleChange('outbound.transportation', e.target.value)}
                        label="交通工具 *"
                        error={!!errors.outboundTransportation}
                      >
                        {transportationOptions.map((option) => (
                          <MenuItem key={option.value} value={option.value}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              {option.icon}
                              {option.label}
                            </Box>
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>

                  <Grid item xs={12} md={3}>
                    <DatePicker
            label="出发日期 *"
            value={formData.outbound.date}
            onChange={(date) => handleChange('outbound.date', date)}
                      slotProps={{
                        textField: {
                          fullWidth: true,
                error: !!errors.outboundDate,
                helperText: errors.outboundDate,
                sx: {}
                        }
                      }}
                    />
                  </Grid>

                  <Grid item xs={12} md={3}>
          <RegionSelector
            label="出发地"
            value={formData.outbound.departure}
            onChange={(value) => handleChange('outbound.departure', value)}
            placeholder="搜索城市或机场"
            error={!!errors.outboundDeparture}
            helperText={errors.outboundDeparture}
            required
            transportationType={formData.outbound.transportation}
              />
            </Grid>

            <Grid item xs={12} md={3}>
          <RegionSelector
            label="目的地"
            value={formData.outbound.destination}
            onChange={(value) => handleChange('outbound.destination', value)}
            placeholder="搜索城市或机场"
            error={!!errors.outboundDestination}
            helperText={errors.outboundDestination}
            required
            transportationType={formData.outbound.transportation}
              />
            </Grid>

        {/* 距离显示 */}
        {distance !== null && (
            <Grid item xs={12}>
            <Alert 
              severity="info" 
              sx={{ 
                mt: 2, 
                backgroundColor: '#e3f2fd',
                '& .MuiAlert-icon': {
                  color: '#1976d2'
                }
              }}
            >
              <Typography variant="body2">
                📏 距离信息：{formData.outbound.departure} → {formData.outbound.destination} 
                <strong> {formatDistance(distance)}</strong>
                {distance && distance > 1000 && (
                  <span style={{ marginLeft: '8px', color: '#666' }}>
                    (约 {Math.round(distance / 800)} 小时飞行时间)
                  </span>
                )}
              </Typography>
            </Alert>
                  </Grid>
            )}

        {/* 返程信息 */}
              <>
            <Grid item xs={12}>
              <Typography variant="h6" gutterBottom sx={{ mt: 3, mb: 2 }}>
                🛬 {formData.multiCityRoutes.length >= 1 ? '第二程信息' : '返程信息'}
              </Typography>
                </Grid>
                
                    <Grid item xs={12} md={3}>
                      <FormControl fullWidth>
                        <InputLabel>交通工具 *</InputLabel>
                        <Select
                          value={formData.inbound.transportation}
                          onChange={(e) => handleChange('inbound.transportation', e.target.value)}
                          label="交通工具 *"
                          error={!!errors.inboundTransportation}
                        >
                          {transportationOptions.map((option) => (
                            <MenuItem key={option.value} value={option.value}>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                {option.icon}
                                {option.label}
                              </Box>
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    </Grid>

                    <Grid item xs={12} md={3}>
                      <DatePicker
                label="返程日期 *"
                value={formData.inbound.date}
                onChange={(date) => handleChange('inbound.date', date)}
                        slotProps={{
                          textField: {
                        fullWidth: true,
                    error: !!errors.inboundDate,
                    helperText: errors.inboundDate,
                    sx: {}
                          }
                        }}
                      />
                    </Grid>

                    <Grid item xs={12} md={3}>
              <RegionSelector
                label="出发地"
                value={formData.inbound.departure}
                onChange={(value) => handleChange('inbound.departure', value)}
                placeholder="搜索城市或机场"
                error={!!errors.inboundDeparture}
                helperText={errors.inboundDeparture}
                required
                transportationType={formData.inbound.transportation}
              />
                    </Grid>

            <Grid item xs={12} md={3}>
              <RegionSelector
                label="目的地"
                value={formData.inbound.destination}
                onChange={(value) => handleChange('inbound.destination', value)}
                placeholder="搜索城市或机场"
                error={!!errors.inboundDestination}
                helperText={errors.inboundDestination}
                required
                transportationType={formData.inbound.transportation}
                  />
                  </Grid>
              </>

        {/* 多程行程 */}
        {formData.multiCityRoutes.map((route, index) => (
          <React.Fragment key={index}>
            <Grid item xs={12}>
              <Typography variant="h6" gutterBottom sx={{ mt: 3, mb: 2 }}>
                🚌 第{index + 3}程信息
              </Typography>
            </Grid>

            <Grid item xs={12} md={3}>
              <FormControl fullWidth>
                <InputLabel>交通工具 *</InputLabel>
                <Select
                  value={route.transportation}
                  onChange={(e) => updateMultiCityRoute(index, 'transportation', e.target.value)}
                  label="交通工具 *"
                >
                  {transportationOptions.map((option) => (
                    <MenuItem key={option.value} value={option.value}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        {option.icon}
                        {option.label}
                      </Box>
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} md={3}>
              <DatePicker
                label="出发日期 *"
                value={route.date}
                onChange={(date) => updateMultiCityRoute(index, 'date', date)}
                slotProps={{
                  textField: {
                    fullWidth: true,
                    sx: {}
                  }
                }}
              />
            </Grid>

            <Grid item xs={12} md={3}>
              <RegionSelector
                label="出发地"
                value={route.departure}
                onChange={(value) => updateMultiCityRoute(index, 'departure', value)}
                placeholder="搜索城市或机场"
                required
                transportationType={route.transportation}
              />
            </Grid>

            <Grid item xs={12} md={2}>
              <RegionSelector
                label="目的地"
                value={route.destination}
                onChange={(value) => updateMultiCityRoute(index, 'destination', value)}
                placeholder="搜索城市或机场"
                required
                transportationType={route.transportation}
              />
            </Grid>

            <Grid item xs={12} md={1}>
              <IconButton
                onClick={() => removeMultiCityRoute(index)}
                color="error"
                sx={{ mt: 1 }}
              >
                <DeleteIcon />
              </IconButton>
            </Grid>
          </React.Fragment>
        ))}

        {/* 添加行程按钮 */}
        <Grid item xs={12}>
          <Button
            variant="outlined"
            startIcon={<AddIcon />}
            onClick={addMultiCityRoute}
            sx={{ 
              mt: 2, 
              width: '100%',
              borderStyle: 'dashed',
              borderColor: '#ccc',
              color: '#666',
              '&:hover': {
                borderColor: '#1976d2',
                color: '#1976d2',
                backgroundColor: 'rgba(25, 118, 210, 0.04)'
              }
            }}
          >
            添加行程
          </Button>
        </Grid>

        <Grid item xs={12}>
              <TextField
                fullWidth
            label="目的地详细地址"
            value={formData.destinationAddress}
            onChange={(e) => handleChange('destinationAddress', e.target.value)}
            placeholder="详细地址（可选）"
            sx={{}}
          />
              </Grid>
      </Grid>
    </ModernFormSection>
  );


  // 渲染费用预算步骤
  // 渲染费用项目组件
  const renderExpenseItem = (tripType, category, label, icon, unitLabel = '单价') => {
    const budget = tripType === 'outbound' ? formData.outboundBudget : formData.inboundBudget;
    const item = budget[category];
    
    return (
      <Box sx={{ mb: 3, p: 2, border: '1px solid #e0e0e0', borderRadius: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <Box sx={{ mr: 1 }}>{icon}</Box>
          <Typography variant="h6">{label}</Typography>
        </Box>
        
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} sm={3}>
            <Typography variant="body2" color="text.secondary">
              货币: {formData.currency}
            </Typography>
          </Grid>
          
          <Grid item xs={12} sm={3}>
              <TextField
                fullWidth
              size="small"
              label={`${unitLabel} *`}
                type="number"
              value={item.unitPrice}
              onChange={(e) => handleBudgetChange(tripType, category, 'unitPrice', e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <MoneyIcon />
                    </InputAdornment>
                  ),
                }}
              sx={{}}
              />
            </Grid>

          <Grid item xs={12} sm={2}>
            <TextField
              fullWidth
              size="small"
              label="数量 *"
              type="number"
              value={item.quantity}
              onChange={(e) => handleBudgetChange(tripType, category, 'quantity', e.target.value)}
              sx={{}}
            />
          </Grid>
          
          <Grid item xs={12} sm={4}>
            <Box sx={{ textAlign: 'right' }}>
              <Typography variant="h6" color="primary">
                小计: {formData.currency} {item.subtotal || '0.00'}
              </Typography>
            </Box>
          </Grid>
        </Grid>
      </Box>
    );
  };

  const renderBudgetStep = () => (
    <ModernFormSection
      title="费用预算"
      description="设置详细的费用预算项目"
      icon="💰"
      stepNumber={3}
      status={completedSteps.includes(2) ? 'completed' : errorSteps.includes(2) ? 'error' : currentStep === 2 ? 'active' : 'pending'}
      required={true}
    >
      <Grid container spacing={3}>
        {/* 去程费用预算 */}
            <Grid item xs={12}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
            <Typography variant="h5" sx={{ color: 'primary.main' }}>
              去程
            </Typography>
            <Typography variant="h6" color="primary">
              {formData.currency} {(() => {
                const total = Object.values(formData.outboundBudget).reduce((sum, item) => {
                  return sum + (parseFloat(item.subtotal) || 0);
                }, 0);
                return total.toFixed(2);
              })()}
            </Typography>
          </Box>
          
          {/* 行程信息 */}
          <Box sx={{ mb: 3, p: 2, backgroundColor: '#f5f5f5', borderRadius: 2 }}>
            <Grid container spacing={2}>
              <Grid item xs={6}>
                <Typography variant="body2" color="text.secondary">From:</Typography>
                <Typography variant="body1">{formData.outbound.departure || '未选择'}</Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="body2" color="text.secondary">To:</Typography>
                <Typography variant="body1">{formData.outbound.destination || '未选择'}</Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="body2" color="text.secondary">Date:</Typography>
                <Typography variant="body1">
                  {formData.outbound.date ? formData.outbound.date.format('YYYY-MM-DD') : '未选择'}
                </Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="body2" color="text.secondary">Purpose:</Typography>
                <Typography variant="body1">{formData.purpose || '未填写'}</Typography>
              </Grid>
            </Grid>
          </Box>
        </Grid>

        {/* 去程费用项目 */}
        <ModernExpenseItem
          tripType="outbound"
          category="flight"
          label="Flight"
          icon="✈️"
          unitPrice={formData.outboundBudget.flight.unitPrice}
          quantity={formData.outboundBudget.flight.quantity}
          subtotal={formData.outboundBudget.flight.subtotal}
          currency={formData.currency}
          onUnitPriceChange={(e) => handleBudgetChange('outbound', 'flight', 'unitPrice', e.target.value)}
          onQuantityChange={(e) => handleBudgetChange('outbound', 'flight', 'quantity', e.target.value)}
        />
        
        <ModernExpenseItem
          tripType="outbound"
          category="accommodation"
          label="Accommodations"
          icon="🏨"
          unitLabel="单价/晚"
          unitPrice={formData.outboundBudget.accommodation.unitPrice}
          quantity={formData.outboundBudget.accommodation.quantity}
          subtotal={formData.outboundBudget.accommodation.subtotal}
          currency={formData.currency}
          onUnitPriceChange={(e) => handleBudgetChange('outbound', 'accommodation', 'unitPrice', e.target.value)}
          onQuantityChange={(e) => handleBudgetChange('outbound', 'accommodation', 'quantity', e.target.value)}
          showInfo={true}
          infoText="该金额仅可向下调整"
        />
        
        <ModernExpenseItem
          tripType="outbound"
          category="allowance"
          label="Travel Allowances"
          icon="💰"
          unitLabel="单价/天"
          unitPrice={formData.outboundBudget.allowance.unitPrice}
          quantity={formData.outboundBudget.allowance.quantity}
          subtotal={formData.outboundBudget.allowance.subtotal}
          currency={formData.currency}
          onUnitPriceChange={(e) => handleBudgetChange('outbound', 'allowance', 'unitPrice', e.target.value)}
          onQuantityChange={(e) => handleBudgetChange('outbound', 'allowance', 'quantity', e.target.value)}
        />
        
        <ModernExpenseItem
          tripType="outbound"
          category="localTransport"
          label="Intra-city Transportation"
          icon="🚗"
          unitLabel="单价/天"
          unitPrice={formData.outboundBudget.localTransport.unitPrice}
          quantity={formData.outboundBudget.localTransport.quantity}
          subtotal={formData.outboundBudget.localTransport.subtotal}
          currency={formData.currency}
          onUnitPriceChange={(e) => handleBudgetChange('outbound', 'localTransport', 'unitPrice', e.target.value)}
          onQuantityChange={(e) => handleBudgetChange('outbound', 'localTransport', 'quantity', e.target.value)}
        />
        
        <ModernExpenseItem
          tripType="outbound"
          category="airportTransfer"
          label="After Hours Airport Transfer"
          icon="🚌"
          unitPrice={formData.outboundBudget.airportTransfer.unitPrice}
          quantity={formData.outboundBudget.airportTransfer.quantity}
          subtotal={formData.outboundBudget.airportTransfer.subtotal}
          currency={formData.currency}
          onUnitPriceChange={(e) => handleBudgetChange('outbound', 'airportTransfer', 'unitPrice', e.target.value)}
          onQuantityChange={(e) => handleBudgetChange('outbound', 'airportTransfer', 'quantity', e.target.value)}
        />

        {/* 返程费用预算 */}
          <>
            <Grid item xs={12}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2, mt: 4 }}>
                <Typography variant="h5" sx={{ color: 'primary.main' }}>
                  返程
                </Typography>
                <Typography variant="h6" color="primary">
                  {formData.currency} {(() => {
                    const total = Object.values(formData.inboundBudget).reduce((sum, item) => {
                      return sum + (parseFloat(item.subtotal) || 0);
                    }, 0);
                    return total.toFixed(2);
                  })()}
                </Typography>
              </Box>
              
              {/* 返程行程信息 */}
              <Box sx={{ mb: 3, p: 2, backgroundColor: '#f5f5f5', borderRadius: 2 }}>
                <Grid container spacing={2}>
                  <Grid item xs={6}>
                    <Typography variant="body2" color="text.secondary">From:</Typography>
                    <Typography variant="body1">{formData.inbound.departure || '未选择'}</Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="body2" color="text.secondary">To:</Typography>
                    <Typography variant="body1">{formData.inbound.destination || '未选择'}</Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="body2" color="text.secondary">Date:</Typography>
                    <Typography variant="body1">
                      {formData.inbound.date ? formData.inbound.date.format('YYYY-MM-DD') : '未选择'}
                    </Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="body2" color="text.secondary">Purpose:</Typography>
                    <Typography variant="body1">{formData.purpose || '未填写'}</Typography>
                  </Grid>
                </Grid>
              </Box>
            </Grid>

            {/* 返程费用项目 */}
            <ModernExpenseItem
              tripType="inbound"
              category="flight"
              label="Flight"
              icon="✈️"
              unitPrice={formData.inboundBudget.flight.unitPrice}
              quantity={formData.inboundBudget.flight.quantity}
              subtotal={formData.inboundBudget.flight.subtotal}
              currency={formData.currency}
              onUnitPriceChange={(e) => handleBudgetChange('inbound', 'flight', 'unitPrice', e.target.value)}
              onQuantityChange={(e) => handleBudgetChange('inbound', 'flight', 'quantity', e.target.value)}
            />
            
            <ModernExpenseItem
              tripType="inbound"
              category="accommodation"
              label="Accommodations"
              icon="🏨"
              unitLabel="单价/晚"
              unitPrice={formData.inboundBudget.accommodation.unitPrice}
              quantity={formData.inboundBudget.accommodation.quantity}
              subtotal={formData.inboundBudget.accommodation.subtotal}
              currency={formData.currency}
              onUnitPriceChange={(e) => handleBudgetChange('inbound', 'accommodation', 'unitPrice', e.target.value)}
              onQuantityChange={(e) => handleBudgetChange('inbound', 'accommodation', 'quantity', e.target.value)}
              showInfo={true}
              infoText="该金额仅可向下调整"
            />
            
            <ModernExpenseItem
              tripType="inbound"
              category="allowance"
              label="Travel Allowances"
              icon="💰"
              unitLabel="单价/天"
              unitPrice={formData.inboundBudget.allowance.unitPrice}
              quantity={formData.inboundBudget.allowance.quantity}
              subtotal={formData.inboundBudget.allowance.subtotal}
              currency={formData.currency}
              onUnitPriceChange={(e) => handleBudgetChange('inbound', 'allowance', 'unitPrice', e.target.value)}
              onQuantityChange={(e) => handleBudgetChange('inbound', 'allowance', 'quantity', e.target.value)}
            />
            
            <ModernExpenseItem
              tripType="inbound"
              category="localTransport"
              label="Intra-city Transportation"
              icon="🚗"
              unitLabel="单价/天"
              unitPrice={formData.inboundBudget.localTransport.unitPrice}
              quantity={formData.inboundBudget.localTransport.quantity}
              subtotal={formData.inboundBudget.localTransport.subtotal}
              currency={formData.currency}
              onUnitPriceChange={(e) => handleBudgetChange('inbound', 'localTransport', 'unitPrice', e.target.value)}
              onQuantityChange={(e) => handleBudgetChange('inbound', 'localTransport', 'quantity', e.target.value)}
            />
            
            <ModernExpenseItem
              tripType="inbound"
              category="airportTransfer"
              label="After Hours Airport Transfer"
              icon="🚌"
              unitPrice={formData.inboundBudget.airportTransfer.unitPrice}
              quantity={formData.inboundBudget.airportTransfer.quantity}
              subtotal={formData.inboundBudget.airportTransfer.subtotal}
              currency={formData.currency}
              onUnitPriceChange={(e) => handleBudgetChange('inbound', 'airportTransfer', 'unitPrice', e.target.value)}
              onQuantityChange={(e) => handleBudgetChange('inbound', 'airportTransfer', 'quantity', e.target.value)}
            />
          </>
      </Grid>
    </ModernFormSection>
  );

  // 渲染预订信息步骤
  const renderBookingsStep = () => (
    <FormSection
      title="预订信息"
      description="添加预订详情"
      icon="✈️"
      stepNumber={4}
      status={completedSteps.includes(3) ? 'completed' : errorSteps.includes(3) ? 'error' : currentStep === 3 ? 'active' : 'pending'}
      required={false}
    >
      <Grid container spacing={3}>
        <Grid item xs={12}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6">
                  {t('travel.bookings')}
                </Typography>
                <Button
                  startIcon={<AddIcon />}
                  onClick={addBooking}
                  variant="outlined"
                  size="small"
                >
                  {t('travel.addBooking')}
                </Button>
              </Box>
            </Grid>

            {formData.bookings.map((booking, index) => (
              <Grid item xs={12} key={index}>
                <Card variant="outlined">
                  <CardContent>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                      <Typography variant="subtitle1">
                        {t('travel.booking')} {index + 1}
                      </Typography>
                      <IconButton
                        onClick={() => removeBooking(index)}
                        color="error"
                        size="small"
                      >
                        <DeleteIcon />
                      </IconButton>
                    </Box>

                    <Grid container spacing={2}>
                      <Grid item xs={12} md={3}>
                        <FormControl fullWidth>
                          <InputLabel>{t('travel.bookingType')}</InputLabel>
                          <Select
                            value={booking.type}
                            label={t('travel.bookingType')}
                            onChange={(e) => updateBooking(index, 'type', e.target.value)}
                          >
                            {bookingTypes.map((type) => (
                              <MenuItem key={type.value} value={type.value}>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                  {type.icon}
                                  {type.label}
                                </Box>
                              </MenuItem>
                            ))}
                          </Select>
                        </FormControl>
                      </Grid>

                      <Grid item xs={12} md={3}>
                        <TextField
                          fullWidth
                          label={t('travel.provider')}
                          value={booking.provider}
                          onChange={(e) => updateBooking(index, 'provider', e.target.value)}
                      sx={{}}
                        />
                      </Grid>

                      <Grid item xs={12} md={3}>
                        <TextField
                          fullWidth
                          label={t('travel.bookingReference')}
                          value={booking.bookingReference}
                          onChange={(e) => updateBooking(index, 'bookingReference', e.target.value)}
                      sx={{}}
                        />
                      </Grid>

                      <Grid item xs={12} md={3}>
                        <TextField
                          fullWidth
                          label={t('travel.cost')}
                          type="number"
                          value={booking.cost}
                          onChange={(e) => updateBooking(index, 'cost', e.target.value)}
                      sx={{}}
                        />
                      </Grid>
                    </Grid>
                  </CardContent>
                </Card>
              </Grid>
            ))}

            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={4}
                label={t('travel.additionalNotes')}
                value={formData.notes}
                onChange={(e) => handleChange('notes', e.target.value)}
                placeholder={t('placeholders.additionalTravelInfo')}
            sx={{}}
              />
            </Grid>
      </Grid>
    </FormSection>
  );

  if (loading) {
    return (
      <Container maxWidth="xl">
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="xl">
      <Box sx={{ py: 3 }}>
        <Typography variant="h4" gutterBottom sx={{ 
          background: 'linear-gradient(45deg, #1976d2, #42a5f5)',
          backgroundClip: 'text',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          fontWeight: 700,
          mb: 3
        }}>
          {isEdit ? t('travel.editTravel') : t('travel.newTravel')}
        </Typography>



        {/* 主要内容区域 - 左右两栏布局 */}
        <Box sx={{ mt: 3, display: 'flex', gap: 3, minHeight: '400px' }}>
          {/* 左侧表单内容 */}
          <Box sx={{ flex: 1, minWidth: 0 }}>
            {renderCurrentStep()}
          </Box>
          
          {/* 右侧账单摘要 */}
          <Box sx={{ width: 380, flexShrink: 0 }}>
            <ModernCostOverview
              formData={formData}
              currency={formData.currency}
            />
          </Box>
        </Box>

        {/* 分页导航按钮 */}
        <Box sx={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          mt: 4, 
          p: 3,
          borderTop: '1px solid #e0e0e0'
        }}>
          <Button
            variant="outlined"
            onClick={handlePrevStep}
            disabled={currentStep === 0}
            sx={{ borderRadius: 2 }}
          >
            上一页
          </Button>

          <Box sx={{ display: 'flex', gap: 2 }}>
            <Typography variant="body2" color="text.secondary">
              第 {currentStep + 1} 页，共 {steps.length} 页
            </Typography>
          </Box>

          <Box sx={{ display: 'flex', gap: 2 }}>
            {currentStep === steps.length - 1 ? (
              <>
            <Button
              variant="outlined"
              onClick={() => navigate('/travel')}
              disabled={saving}
              sx={{ borderRadius: 2 }}
            >
              {t('common.cancel')}
            </Button>
            <Button
              variant="contained"
              startIcon={<SaveIcon />}
              onClick={() => handleSave('draft')}
              disabled={saving}
              sx={{ borderRadius: 2 }}
            >
              {saving ? <CircularProgress size={20} /> : t('travel.saveDraft')}
            </Button>
            <Button
              variant="contained"
              color="primary"
              startIcon={<SendIcon />}
              onClick={handleSubmit}
              disabled={saving}
              sx={{ borderRadius: 2 }}
            >
              {saving ? <CircularProgress size={20} /> : t('travel.submitRequest')}
            </Button>
              </>
            ) : (
              <Button
                variant="contained"
                onClick={handleNextStep}
                sx={{ borderRadius: 2 }}
              >
                下一页
              </Button>
            )}
          </Box>
        </Box>
      </Box>
    </Container>
  );
};

export default TravelForm;

