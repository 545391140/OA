import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
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
  Train as TrainIcon,
  DirectionsCar as CarIcon,
  DirectionsBus as BusIcon,
  AttachMoney as MoneyIcon,
} from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../contexts/AuthContext';
import { useNotification } from '../../contexts/NotificationContext';
import ModernFormSection from '../../components/Common/ModernFormSection';
import ModernInput from '../../components/Common/ModernInput';
import ModernExpenseItem from '../../components/Common/ModernExpenseItem';
import ModernCostOverview from '../../components/Common/ModernCostOverview';
import RegionSelector from '../../components/Common/RegionSelector';
import FormSection from '../../components/Common/FormSection';
import TravelRouteCard from '../../components/Travel/TravelRouteCard';
import BudgetCard from '../../components/Travel/BudgetCard';
import { calculateDistance, formatDistance, isCitySupported } from '../../utils/distanceCalculator';
import dayjs from 'dayjs';
import apiClient from '../../utils/axiosConfig';
import { formatCurrency as formatCurrencyUtil } from '../../utils/icuFormatter';
import { useCurrencies } from '../../hooks/useCurrencies';
import { convertFromCNY, convertToCNY } from '../../utils/currencyConverter';
// 已改为使用API，不再使用locationService的getAllCities

const TravelForm = () => {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const { showNotification } = useNotification();
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = Boolean(id);
  
  // 获取币种数据
  const { currencyCodes, currencyOptions } = useCurrencies();

  // 交通工具选项
  const transportationOptions = [
    { value: 'flight', label: t('travel.form.transportation.flight'), icon: <FlightIcon /> },
    { value: 'train', label: t('travel.form.transportation.train'), icon: <TrainIcon /> },
    { value: 'car', label: t('travel.form.transportation.car'), icon: <CarIcon /> },
    { value: 'bus', label: t('travel.form.transportation.bus'), icon: <BusIcon /> },
  ];

  // 获取用户默认货币（从用户资料中读取）
  // 注意：这个函数在组件初始化时调用，此时 user 可能还未加载
  // 因此我们会在 useEffect 中再次更新货币值
  const getDefaultCurrency = (currentUser) => {
    if (currentUser && currentUser.preferences && currentUser.preferences.currency) {
      const userCurrency = currentUser.preferences.currency;
      // 验证货币值是否有效
      if (currencyCodes.includes(userCurrency)) {
        return userCurrency;
      }
    }
    return 'USD'; // 默认值
  };

  // 获取货币显示名称（国际化）
  // 注意：只依赖 t，因为 t 函数本身会在语言变化时自动更新
  const getCurrencyDisplayName = useCallback((currencyCode) => {
    if (!currencyCode) return '';
    try {
      const translationKey = `common.currencies.${currencyCode}`;
      const currencyName = t(translationKey);
      
      // 检查翻译是否成功（i18next 在找不到翻译时会返回键本身）
      // 如果返回的不是键本身且不为空，说明翻译成功
      if (currencyName && currencyName !== translationKey && currencyName.trim() !== '') {
        return `${currencyCode} - ${currencyName}`;
      }
      
      // 回退到英文名称（当翻译不存在时）
      const fallbackNames = {
        'USD': 'US Dollar',
        'CNY': 'Chinese Yuan',
        'JPY': 'Japanese Yen',
        'KRW': 'Korean Won',
        'EUR': 'Euro',
        'GBP': 'British Pound'
      };
      return `${currencyCode} - ${fallbackNames[currencyCode] || currencyCode}`;
    } catch (error) {
      console.warn(`Error getting currency display name for ${currencyCode}:`, error);
      return currencyCode;
    }
  }, [t, i18n.language]);

  // 使用函数式初始化，确保能正确获取用户默认货币
  const [formData, setFormData] = useState(() => ({
    title: '',
    purpose: '',
    travelType: 'domestic', // 新增：差旅类型 (international/domestic)
    tripType: 'domestic', // 新增：行程类型 (domestic/cross_border) - 根据常驻国自动判断
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
    // 费用预算 - 去程（动态结构，key为费用项ID）
    outboundBudget: {},
    // 费用预算 - 返程（动态结构，key为费用项ID）
    inboundBudget: {},
    // 费用预算 - 多程行程（数组，每个元素对应一个多程行程的费用预算）
    multiCityRoutesBudget: [],
    estimatedCost: '',
    currency: getDefaultCurrency(user), // 使用用户默认货币（如果user已加载）
    notes: ''
  }));

  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState([]);
  const [errorSteps, setErrorSteps] = useState([]);
  const [validationResults, setValidationResults] = useState([]);
  const [distance, setDistance] = useState(null);
  const [matchedExpenseItems, setMatchedExpenseItems] = useState(null); // 匹配的费用项列表（用于去程，保持向后兼容）
  const [routeMatchedExpenseItems, setRouteMatchedExpenseItems] = useState({
    outbound: null,
    inbound: null,
    multiCity: {} // key为index
  }); // 每个行程的匹配费用项列表
  const [isLoadingTravelData, setIsLoadingTravelData] = useState(false); // 标记是否正在加载差旅数据
  
  // 城市等级缓存（避免重复请求）
  const cityLevelCacheRef = useRef(new Map());
  
  // 语言变化状态，用于强制更新货币选项
  const [currentLanguage, setCurrentLanguage] = useState(i18n.language);
  
  // 监听语言变化
  useEffect(() => {
    const handleLanguageChange = (lng) => {
      setCurrentLanguage(lng);
    };
    
    i18n.on('languageChanged', handleLanguageChange);
    return () => {
      i18n.off('languageChanged', handleLanguageChange);
    };
  }, [i18n]);

  // 步骤定义
  const steps = [
    {
      label: t('travel.form.basicInfo'),
      description: t('travel.form.basicInfoDescription'),
      icon: '1'
    },
    {
      label: t('travel.form.travelArrangement'),
      description: t('travel.form.travelArrangementDescription'),
      icon: '2'
    },
    {
      label: t('travel.form.expenseBudget'),
      description: t('travel.form.expenseBudgetDescription'),
      icon: '3'
    }
  ];

  // 货币选项（从API获取，已包含国际化处理）
  const currencies = currencyOptions;

  // 新增：差旅类型选项（使用 useMemo 响应语言变化）
  // 注意：只依赖 t，因为 t 函数本身会在语言变化时自动更新
  const travelTypes = React.useMemo(() => [
    { value: 'domestic', label: t('travel.domestic'), icon: '🏠' },
    { value: 'international', label: t('travel.international'), icon: '✈️' }
  ], [t, i18n.language]);

  // 新增：行程类型选项（境内/跨境）（使用 useMemo 响应语言变化）
  // 注意：只依赖 t，因为 t 函数本身会在语言变化时自动更新
  const tripTypes = React.useMemo(() => [
    { value: 'domestic', label: t('travel.tripTypes.domestic'), icon: '🏠' },
    { value: 'cross_border', label: t('travel.tripTypes.cross_border'), icon: '✈️' }
  ], [t, i18n.language]);

  // 费用承担部门选项（使用 useMemo 响应语言变化）
  // 注意：只依赖 t，因为 t 函数本身会在语言变化时自动更新
  const departments = React.useMemo(() => [
    { value: 'hr', label: t('travel.departments.hr') },
    { value: 'it', label: t('travel.departments.it') },
    { value: 'finance', label: t('travel.departments.finance') },
    { value: 'marketing', label: t('travel.departments.marketing') },
    { value: 'sales', label: t('travel.departments.sales') },
    { value: 'operations', label: t('travel.departments.operations') },
    { value: 'information_resources', label: t('travel.departments.information_resources') }
  ], [t, i18n.language]);

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




  useEffect(() => {
    if (isEdit) {
      fetchTravelData();
      // 编辑模式下，重置货币初始化标记（因为会从API加载数据）
      currencyInitializedRef.current = true;
    } else {
      // 新建模式下，重置货币初始化标记，允许设置用户默认货币
      currencyInitializedRef.current = false;
    }
    // 初始化时更新步骤状态
    updateStepStatus();
  }, [id, isEdit]);

  // 新建模式下，设置申请人姓名为当前登录用户（仅在requestName为空时设置）
  useEffect(() => {
    if (!isEdit && user && user.firstName && user.lastName) {
      setFormData(prev => {
        // 仅在requestName为空时设置默认值
        if (!prev.requestName || prev.requestName.trim() === '') {
          const currentUserName = `${user.firstName} ${user.lastName}`.trim();
          return {
            ...prev,
            requestName: currentUserName
          };
        }
        return prev;
      });
    }
  }, [isEdit, user]);

  // 新建模式下，设置默认货币为用户个人资料中的货币
  // 使用 useRef 跟踪是否已经设置过货币，避免重复设置
  const currencyInitializedRef = useRef(false);
  
  useEffect(() => {
    // 只在新建模式下设置，且用户信息已加载，且货币还未初始化
    if (!isEdit && user && user.preferences && user.preferences.currency && !currencyInitializedRef.current) {
      const userCurrency = user.preferences.currency;
      // 验证货币值是否有效
      if (currencyCodes.includes(userCurrency)) {
        setFormData(prev => {
          // 如果当前货币与用户默认货币不同，则更新
          if (prev.currency !== userCurrency) {
            currencyInitializedRef.current = true;
            return {
              ...prev,
              currency: userCurrency
            };
          }
          return prev;
        });
      }
    }
  }, [isEdit, user]);

  // 监听表单数据变化，实时更新步骤状态
  useEffect(() => {
    updateStepStatus();
  }, [formData]);

  // 辅助函数：从Location对象或字符串中提取国家信息
  const extractCountryFromLocation = (location) => {
    if (!location) {
      console.log('[extractCountryFromLocation] No location provided');
      return null;
    }
    
    console.log('[extractCountryFromLocation] Input:', location, 'Type:', typeof location);
    
    if (typeof location === 'string') {
      // 如果是字符串格式 "城市, 国家"
      const parts = location.split(',');
      if (parts.length >= 2) {
        const country = parts[parts.length - 1].trim(); // 取最后一部分作为国家
        if (country) {
          console.log('[extractCountryFromLocation] Extracted from string:', country);
          return country;
        }
      }
      console.log('[extractCountryFromLocation] String format invalid, parts:', parts);
      return null;
    }
    
    if (typeof location === 'object' && location !== null) {
      // 如果是对象，优先使用 country 字段
      if (location.country) {
        let country = null;
        if (typeof location.country === 'string') {
          country = location.country.trim(); // 去除首尾空格
        } else if (typeof location.country === 'object' && location.country.name) {
          country = location.country.name.trim();
        }
        
        // 确保提取到的国家名称不为空
        if (country && country.length > 0) {
          console.log('[extractCountryFromLocation] Extracted from country field:', country);
          return country;
        }
      }
      
      // 如果没有 country 字段或 country 为空，尝试从 name 中提取（如果是国家类型）
      if (location.type === 'country' && location.name) {
        const countryName = typeof location.name === 'string' ? location.name.trim() : location.name;
        if (countryName) {
          console.log('[extractCountryFromLocation] Extracted from name (country type):', countryName);
          return countryName;
        }
      }
      
      // 如果对象有 parentIdObj（父级城市对象），尝试从父级提取国家
      if (location.parentIdObj && typeof location.parentIdObj === 'object') {
        if (location.parentIdObj.country) {
          const parentCountry = typeof location.parentIdObj.country === 'string' 
            ? location.parentIdObj.country.trim() 
            : (location.parentIdObj.country.name || '').trim();
          if (parentCountry) {
            console.log('[extractCountryFromLocation] Extracted from parentIdObj.country:', parentCountry);
            return parentCountry;
          }
        }
      }
      
      // 尝试从其他可能的字段提取（作为最后的备选方案）
      if (location.name && location.type !== 'country') {
        // 可能是城市对象，但缺少 country 字段
        // 这种情况不应该发生（因为 RegionSelector 的 transformLocationData 会设置默认值）
        // 但为了健壮性，我们记录警告
        console.warn('[extractCountryFromLocation] Object has name but no valid country field:', {
          name: location.name,
          type: location.type,
          country: location.country,
          countryCode: location.countryCode
        });
      }
    }
    
    console.log('[extractCountryFromLocation] Could not extract country, returning null');
    return null;
  };

  // 辅助函数：判断是否是跨境行程
  const determineTripType = (userResidenceCountry, destinations) => {
    // 如果没有常驻国信息，默认返回境内
    if (!userResidenceCountry) {
      console.log('[determineTripType] No residenceCountry, returning domestic');
      return 'domestic';
    }

    // 获取常驻国名称（可能是字符串或对象）
    let residenceCountryName = null;
    if (typeof userResidenceCountry === 'string') {
      residenceCountryName = userResidenceCountry.trim();
    } else if (typeof userResidenceCountry === 'object' && userResidenceCountry !== null) {
      // 尝试从多个可能的字段提取
      residenceCountryName = (userResidenceCountry.name || userResidenceCountry.country || '').toString().trim();
      // 如果还是空，尝试直接使用对象本身（可能是字符串化的对象）
      if (!residenceCountryName && typeof userResidenceCountry.toString === 'function') {
        const str = userResidenceCountry.toString();
        if (str && str !== '[object Object]') {
          residenceCountryName = str.trim();
        }
      }
    }

    console.log('[determineTripType] Residence country name:', residenceCountryName);

    if (!residenceCountryName || residenceCountryName.length === 0) {
      console.log('[determineTripType] Could not extract residence country name, returning domestic');
      return 'domestic';
    }

    // 检查所有行程目的地
    const allDestinations = [
      destinations.outbound,
      destinations.inbound,
      ...(destinations.multiCity || [])
    ].filter(Boolean);

    console.log('[determineTripType] All destinations:', allDestinations);

    // 如果没有任何目的地，默认返回境内
    if (allDestinations.length === 0) {
      console.log('[determineTripType] No destinations, returning domestic');
      return 'domestic';
    }

    // 检查是否有任何一个目的地不在常驻国
    // 使用不区分大小写的比较，因为国家名称可能有大小写差异
    const normalizedResidenceCountry = residenceCountryName.toLowerCase().trim();
    
    for (const dest of allDestinations) {
      const destCountry = extractCountryFromLocation(dest);
      console.log('[determineTripType] Destination:', dest, '-> Country:', destCountry);
      
      if (destCountry) {
        const normalizedDestCountry = destCountry.toLowerCase().trim();
        // 如果目的地国家与常驻国不同，返回跨境
        if (normalizedDestCountry !== normalizedResidenceCountry) {
          console.log('[determineTripType] Found cross-border destination:', destCountry, '!=', residenceCountryName);
          return 'cross_border';
        }
      } else {
        // 如果无法提取目的地国家，记录警告但继续检查其他目的地
        console.warn('[determineTripType] Could not extract country from destination:', dest);
      }
    }

    // 所有目的地都在常驻国，返回境内
    console.log('[determineTripType] All destinations in residence country, returning domestic');
    return 'domestic';
  };

  // 自动判断行程类型：根据申请人常驻国和行程目的地
  useEffect(() => {
    // 调试日志
    console.log('[TripType Auto-Detect] ===== START =====');
    console.log('[TripType Auto-Detect] User:', user ? { id: user.id, email: user.email, hasResidenceCountry: !!user.residenceCountry } : 'null');
    console.log('[TripType Auto-Detect] User residenceCountry:', user?.residenceCountry);
    console.log('[TripType Auto-Detect] User residenceCountry type:', typeof user?.residenceCountry);
    console.log('[TripType Auto-Detect] FormData tripType:', formData.tripType);
    console.log('[TripType Auto-Detect] FormData destinations:', {
      outbound: formData.outbound?.destination,
      inbound: formData.inbound?.destination,
      multiCity: formData.multiCityRoutes?.map(route => route.destination) || []
    });
    console.log('[TripType Auto-Detect] isEdit:', isEdit);
    console.log('[TripType Auto-Detect] isLoadingTravelData:', isLoadingTravelData);

    // 如果正在加载差旅数据，跳过自动判断（避免覆盖 fetchTravelData 中的判断结果）
    if (isLoadingTravelData) {
      console.log('[TripType Auto-Detect] Skipping: isLoadingTravelData is true');
      return;
    }

    if (!user) {
      console.log('[TripType Auto-Detect] No user, keeping current value');
      return;
    }

    if (!user.residenceCountry) {
      console.log('[TripType Auto-Detect] No residenceCountry, keeping current value');
      console.log('[TripType Auto-Detect] User object keys:', Object.keys(user));
      return;
    }

    const destinations = {
      outbound: formData.outbound?.destination,
      inbound: formData.inbound?.destination,
      multiCity: formData.multiCityRoutes?.map(route => route.destination) || []
    };

    // 只有当至少有一个目的地时才自动判断
    const hasAnyDestination = destinations.outbound || destinations.inbound || destinations.multiCity.length > 0;
    
    console.log('[TripType Auto-Detect] hasAnyDestination:', hasAnyDestination);
    
    if (hasAnyDestination) {
      const autoTripType = determineTripType(user.residenceCountry, destinations);
      console.log('[TripType Auto-Detect] Determined trip type:', autoTripType);
      console.log('[TripType Auto-Detect] Current tripType:', formData.tripType);
      
      setFormData(prev => {
        // 只有当自动判断的结果与当前值不同时才更新
        if (prev.tripType !== autoTripType) {
          console.log('[TripType Auto-Detect] ✅ Updating tripType from', prev.tripType, 'to', autoTripType);
          return {
            ...prev,
            tripType: autoTripType
          };
        } else {
          console.log('[TripType Auto-Detect] No update needed, tripType already correct');
        }
        return prev;
      });
    } else {
      console.log('[TripType Auto-Detect] No destinations found, skipping auto-detect');
    }
    
    console.log('[TripType Auto-Detect] ===== END =====\n');
  }, [
    user,
    user?.residenceCountry,
    formData.outbound?.destination,
    formData.inbound?.destination,
    formData.multiCityRoutes,
    isLoadingTravelData,
    isEdit
  ]);

  // 自动填充出行安排：当基本信息页面的字段变化时，自动填充到出行安排页面
  useEffect(() => {
    setFormData(prev => {
      const newData = { ...prev };
      let hasChanges = false;

      // 1. 去程出发日期 = 基本信息页的开始日期（如果去程日期为空）
      if (prev.startDate && !prev.outbound.date) {
        newData.outbound = {
          ...newData.outbound,
          date: prev.startDate
        };
        hasChanges = true;
      }

      // 2. 去程目的地 = 基本信息的目的地（如果去程目的地为空）
      if (prev.destination && !hasLocationValue(prev.outbound.destination)) {
        // 处理 destination 可能是字符串或对象的情况
        let destinationValue = prev.destination;
        if (typeof prev.destination === 'object' && prev.destination !== null) {
          // 如果是对象，保持对象格式（RegionSelector 需要对象格式）
          destinationValue = prev.destination;
        } else if (typeof prev.destination === 'string' && prev.destination.trim()) {
          // 如果是字符串，保持字符串格式
          destinationValue = prev.destination;
        }
        
        newData.outbound = {
          ...newData.outbound,
          destination: destinationValue
        };
        hasChanges = true;
      }

      // 3. 返程出发日期 = 基本信息结束日期（如果返程日期为空）
      if (prev.endDate && !prev.inbound.date) {
        newData.inbound = {
          ...newData.inbound,
          date: prev.endDate
        };
        hasChanges = true;
      }

      // 4. 返程出发地 = 去程目的地（如果返程出发地为空且去程目的地有值）
      if (hasLocationValue(prev.outbound.destination) && !hasLocationValue(prev.inbound.departure)) {
        // 处理去程目的地可能是字符串或对象的情况
        let departureValue = prev.outbound.destination;
        if (typeof prev.outbound.destination === 'object' && prev.outbound.destination !== null) {
          // 如果是对象，保持对象格式
          departureValue = prev.outbound.destination;
        } else if (typeof prev.outbound.destination === 'string' && prev.outbound.destination.trim()) {
          // 如果是字符串，保持字符串格式
          departureValue = prev.outbound.destination;
        }
        
        newData.inbound = {
          ...newData.inbound,
          departure: departureValue
        };
        hasChanges = true;
      }

      // 只有当有变化时才返回新数据
      return hasChanges ? newData : prev;
    });
  }, [formData.startDate, formData.endDate, formData.destination, formData.outbound.destination]);

  // 匹配单个行程的差旅标准
  const matchRouteStandard = async (destination, routeDate, routeType, routeIndex = null, overrideFormData = null) => {
    if (!destination || !routeDate) return null;

      try {
        // 获取城市信息以获取城市等级
        let cityName = '';
        let country = '';
        let cityLevel = null;
        
        // 处理目的地（可能是字符串或对象）
        if (typeof destination === 'string') {
          cityName = destination.split(',')[0].trim();
          country = destination.split(',')[1]?.trim() || '';
        } else if (typeof destination === 'object' && destination !== null) {
          cityName = destination.name || destination.city || '';
          country = destination.country || '';
        }

        // 如果找到了城市名，尝试获取城市等级（使用缓存）
        if (cityName) {
          const cacheKey = `${cityName}_${country || ''}`;
          
          // 检查缓存
          if (cityLevelCacheRef.current.has(cacheKey)) {
            const cached = cityLevelCacheRef.current.get(cacheKey);
            cityLevel = cached.cityLevel;
            country = country || cached.country || '';
          } else {
            try {
              // 从地理位置管理API获取城市数据
              const response = await apiClient.get('/locations', {
                params: { type: 'city', search: cityName, status: 'active' }
              });
              if (response.data && response.data.success) {
                const cities = response.data.data || [];
                const matchedCity = cities.find(city => 
                  city.name === cityName || 
                  city.city === cityName ||
                  city.name?.includes(cityName) ||
                  city.city?.includes(cityName)
                );
                if (matchedCity) {
                  cityLevel = matchedCity.cityLevel || null;
                  country = country || matchedCity.country || '';
                  // 缓存结果
                  cityLevelCacheRef.current.set(cacheKey, {
                    cityLevel,
                    country: country || matchedCity.country || ''
                  });
                } else {
                  // 缓存未找到的结果，避免重复请求
                  cityLevelCacheRef.current.set(cacheKey, {
                    cityLevel: null,
                    country: country || ''
                  });
                }
              }
            } catch (err) {
              console.warn('Failed to fetch city level:', err);
              // 缓存错误结果，避免重复请求
              cityLevelCacheRef.current.set(cacheKey, {
                cityLevel: null,
                country: country || ''
              });
            }
          }
        }

        // 核心逻辑：获取所有可能用于匹配差旅标准的条件
        // 包括：角色、岗位、部门、职级、项目编码等
        // 这些条件对应差旅标准配置时的条件类型
        // 使用 overrideFormData 如果提供，否则使用 formData（用于编辑模式下的匹配）
        const currentFormData = overrideFormData || formData;
        const positionLevel = user?.jobLevel || '';
        const department = user?.department || currentFormData.costOwingDepartment || '';
        const role = user?.role || '';
        const position = user?.position || '';
        // 项目编码可以从表单中获取，如果有项目编码字段的话
        const projectCode = currentFormData.projectCode || '';

        // 调用标准匹配API，传递所有匹配条件
        // 后端会自动从用户信息中获取缺失的条件，确保所有条件都被查询
        // 获取当前表单的币种（currentFormData 已在上面声明）
        const targetCurrency = currentFormData.currency || 'CNY';
        
        const matchResponse = await apiClient.post('/travel-standards/match', {
          // 目的地相关条件
          country: country || '',
          city: cityName || '',
          cityLevel: cityLevel,
          // 用户信息相关条件（角色、岗位、部门、职级）
          role: role,
          position: position,
          department: department,
          positionLevel: positionLevel,
          // 项目相关条件
          projectCode: projectCode,
          // 币种（用于汇率换算）
          currency: targetCurrency,
          // 匹配策略
          matchStrategy: 'MERGE_BEST' // 使用合并最优策略
        });

        if (matchResponse.data && matchResponse.data.success && matchResponse.data.data.matched) {
        return matchResponse.data.data.expenses;
      }
      return null;
    } catch (error) {
      console.error(`Match standard error for ${routeType}:`, error);
      return null;
    }
  };

  // 自动匹配差旅标准并填充预算
  useEffect(() => {
    // 编辑模式下，也支持自动匹配（当目的地或日期变化时）
    // 注意：编辑模式下首次加载时，fetchTravelData 中已经重新匹配了，这里主要用于后续字段变化时的匹配
    
    // 如果正在加载差旅数据，跳过自动匹配（避免覆盖 fetchTravelData 中的匹配结果）
    if (isLoadingTravelData) {
      return;
    }
    
    const autoMatchStandard = async () => {
      try {
        // 为所有行程匹配差旅标准
        const routeMatches = {
          outbound: null,
          inbound: null,
          multiCity: {}
        };

        // 匹配去程
        if (formData.outbound.destination && formData.outbound.date) {
          routeMatches.outbound = await matchRouteStandard(
            formData.outbound.destination,
            formData.outbound.date,
            'outbound'
          );
        }

        // 匹配返程
        if (formData.inbound.destination && formData.inbound.date) {
          routeMatches.inbound = await matchRouteStandard(
            formData.inbound.destination,
            formData.inbound.date,
            'inbound'
          );
        }

        // 匹配多程行程
        if (formData.multiCityRoutes && formData.multiCityRoutes.length > 0) {
          for (let i = 0; i < formData.multiCityRoutes.length; i++) {
            const route = formData.multiCityRoutes[i];
            if (route.destination && route.date) {
              routeMatches.multiCity[i] = await matchRouteStandard(
                route.destination,
                route.date,
                'multiCity',
                i
              );
            }
          }
        }

        // 更新匹配结果
        setRouteMatchedExpenseItems(routeMatches);
        
        // 保持向后兼容：去程的匹配结果也设置到matchedExpenseItems
        if (routeMatches.outbound) {
          setMatchedExpenseItems(routeMatches.outbound);
        }
        
        // 如果有任何行程匹配成功，显示通知
        if (routeMatches.outbound || routeMatches.inbound || Object.keys(routeMatches.multiCity).length > 0) {
          showNotification(t('travel.form.autoMatchSuccess'), 'success');
        }
      } catch (error) {
        console.error('Auto match standard error:', error);
        // 静默失败，不显示错误提示
      }
    };

    // 防抖处理，避免频繁调用
    const timeoutId = setTimeout(() => {
      autoMatchStandard();
    }, 1000);

    return () => clearTimeout(timeoutId);
  }, [
    isEdit,
    isLoadingTravelData, // 添加依赖，避免在加载时执行
    formData.outbound.destination,
    formData.outbound.date,
    formData.inbound.destination,
    formData.inbound.date,
    formData.multiCityRoutes,
    formData.currency, // 添加币种依赖，币种变化时重新匹配差旅标准
    user?.jobLevel,
    user?.department,
    user?.role, // 添加用户角色依赖，角色变化时重新匹配
    user?.position, // 添加用户岗位依赖，岗位变化时重新匹配
    formData.costOwingDepartment
  ]);


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
      default:
        return null;
    }
  };

  const fetchTravelData = async () => {
    try {
      setLoading(true);
      setIsLoadingTravelData(true); // 标记开始加载
      
      // 只在有 ID 时验证格式并获取数据（新建模式下不会有 ID）
      if (id) {
        // 清理 ID：去除可能的空格和特殊字符
        const cleanId = String(id).trim();
        
        // 验证ID格式（MongoDB ObjectId应该是24位十六进制字符串）
        if (!/^[0-9a-fA-F]{24}$/.test(cleanId)) {
          console.error('Invalid ID format:', {
            original: id,
            cleaned: cleanId,
            length: cleanId.length,
            matches: /^[0-9a-fA-F]{24}$/.test(cleanId)
          });
          throw new Error(t('travel.form.invalidIdFormat') + ': ' + (cleanId.length !== 24 ? t('travel.form.idLengthError', { length: cleanId.length }) : t('travel.form.idInvalidChars')));
        }
        
        // 使用清理后的 ID
        const response = await apiClient.get(`/travel/${cleanId}`);
        
        if (response.data && response.data.success) {
          const data = response.data.data;
          
          // 转换日期字段和Location对象
          const convertLocationToString = (val) => {
            if (typeof val === 'object' && val !== null) {
              if (val.name) return val.name;
              if (val.city || val.country) {
                return `${val.city || ''}, ${val.country || ''}`.trim();
              }
            }
            return val || '';
          };
          
          // 处理预算数据，确保所有字段都是字符串格式（用于表单输入）- 适配动态结构
          const processBudget = (budget) => {
            if (!budget || typeof budget !== 'object') {
              return {};
            }
            
            const processed = {};
            // 处理动态结构（key为费用项ID）
            Object.entries(budget).forEach(([itemId, item]) => {
              if (item && typeof item === 'object') {
                processed[itemId] = {
                  itemId: itemId,
                  itemName: item.itemName || t('travel.form.unknownExpenseItem'),
                  unitPrice: item.unitPrice !== undefined && item.unitPrice !== null 
                    ? String(item.unitPrice) 
                    : '',
                  quantity: item.quantity !== undefined && item.quantity !== null 
                    ? item.quantity 
                    : 1,
                  subtotal: item.subtotal !== undefined && item.subtotal !== null 
                    ? String(item.subtotal) 
                    : ''
                };
              }
            });
            return processed;
          };
          
          // 辅助函数：保留 Location 对象格式（用于自动判断行程类型）
          const preserveLocationForAutoDetect = (val) => {
            // 如果是对象，保留对象格式（用于自动判断）
            if (typeof val === 'object' && val !== null) {
              return val;
            }
            // 如果是字符串，转换为字符串（用于显示）
            return convertLocationToString(val);
          };
          
          const processedData = {
            ...formData, // 先保留默认值
            ...data, // 然后覆盖从API获取的数据
            destination: convertLocationToString(data.destination),
            startDate: data.startDate ? dayjs(data.startDate) : null,
            endDate: data.endDate ? dayjs(data.endDate) : null,
            outbound: {
              ...data.outbound || {},
              date: data.outbound?.date ? dayjs(data.outbound.date) : null,
              departure: convertLocationToString(data.outbound?.departure),
              // 保留原始格式用于自动判断，但转换为字符串用于显示
              destination: data.outbound?.destination || '',
              transportation: data.outbound?.transportation || ''
            },
            inbound: {
              ...data.inbound || {},
              date: data.inbound?.date ? dayjs(data.inbound.date) : null,
              departure: convertLocationToString(data.inbound?.departure),
              // 保留原始格式用于自动判断
              destination: data.inbound?.destination || '',
              transportation: data.inbound?.transportation || ''
            },
            multiCityRoutes: (data.multiCityRoutes || []).map(route => ({
              ...route,
              date: route.date ? dayjs(route.date) : null,
              departure: convertLocationToString(route.departure),
              // 保留原始格式用于自动判断
              destination: route.destination || '',
              transportation: route.transportation || ''
            })),
            outboundBudget: processBudget(data.outboundBudget),
            inboundBudget: processBudget(data.inboundBudget),
            multiCityRoutesBudget: (data.multiCityRoutesBudget || (data.multiCityRoutes || []).map(() => ({}))).map(budget => processBudget(budget)),
            currency: data.currency || 'USD',
            estimatedCost: data.estimatedCost !== undefined ? String(data.estimatedCost) : '',
            notes: data.notes || '',
            title: data.title || '',
            purpose: data.purpose || ''
          };
          
          // 编辑模式下，优先重新匹配差旅标准（使用最新标准），而不是从预算恢复
          // 这样可以确保编辑时使用最新的差旅标准
          // 先设置 formData（用于其他组件）
          setFormData(processedData);
          
          const routeMatchesFromAPI = {
            outbound: null,
            inbound: null,
            multiCity: {}
          };
          
          // 并行匹配所有行程的标准（优化性能）
          const matchPromises = [];
          
          // 匹配去程
          if (processedData.outbound.destination && processedData.outbound.date) {
            matchPromises.push(
              matchRouteStandard(
                processedData.outbound.destination,
                processedData.outbound.date,
                'outbound',
                null,
                processedData
              ).then(result => ({ type: 'outbound', result }))
            );
          }
          
          // 匹配返程
          if (processedData.inbound.destination && processedData.inbound.date) {
            matchPromises.push(
              matchRouteStandard(
                processedData.inbound.destination,
                processedData.inbound.date,
                'inbound',
                null,
                processedData
              ).then(result => ({ type: 'inbound', result }))
            );
          }
          
          // 匹配多程行程
          if (processedData.multiCityRoutes && processedData.multiCityRoutes.length > 0) {
            processedData.multiCityRoutes.forEach((route, i) => {
              if (route.destination && route.date) {
                matchPromises.push(
                  matchRouteStandard(
                    route.destination,
                    route.date,
                    'multiCity',
                    i,
                    processedData
                  ).then(result => ({ type: 'multiCity', index: i, result }))
                );
              }
            });
          }
          
          // 等待所有匹配完成
          const matchResults = await Promise.all(matchPromises);
          
          // 处理匹配结果
          matchResults.forEach(({ type, index, result }) => {
            if (type === 'outbound') {
              routeMatchesFromAPI.outbound = result;
            } else if (type === 'inbound') {
              routeMatchesFromAPI.inbound = result;
            } else if (type === 'multiCity' && index !== undefined) {
              routeMatchesFromAPI.multiCity[index] = result;
            }
          });
          
          // 优先使用重新匹配的结果，如果没有匹配到则从预算恢复（向后兼容）
          const finalRouteMatches = {
            outbound: routeMatchesFromAPI.outbound || (() => {
              // 如果没有匹配到，从预算恢复
              if (processedData.outboundBudget && Object.keys(processedData.outboundBudget).length > 0) {
                const expenseItems = {};
                Object.entries(processedData.outboundBudget).forEach(([itemId, item]) => {
                  if (item && item.itemName) {
                    expenseItems[itemId] = {
                      itemName: item.itemName,
                      limitType: 'FIXED',
                      unit: t('travel.form.unitPerDay'),
                      limit: parseFloat(item.unitPrice) || 0
                    };
                  }
                });
                return Object.keys(expenseItems).length > 0 ? expenseItems : null;
              }
              return null;
            })(),
            inbound: routeMatchesFromAPI.inbound || (() => {
              if (processedData.inboundBudget && Object.keys(processedData.inboundBudget).length > 0) {
                const expenseItems = {};
                Object.entries(processedData.inboundBudget).forEach(([itemId, item]) => {
                  if (item && item.itemName) {
                    expenseItems[itemId] = {
                      itemName: item.itemName,
                      limitType: 'FIXED',
                      unit: t('travel.form.unitPerDay'),
                      limit: parseFloat(item.unitPrice) || 0
                    };
                  }
                });
                return Object.keys(expenseItems).length > 0 ? expenseItems : null;
              }
              return null;
            })(),
            multiCity: {}
          };
          
          // 处理多程行程
          if (processedData.multiCityRoutes && processedData.multiCityRoutes.length > 0) {
            processedData.multiCityRoutes.forEach((route, index) => {
              if (routeMatchesFromAPI.multiCity[index]) {
                finalRouteMatches.multiCity[index] = routeMatchesFromAPI.multiCity[index];
              } else if (processedData.multiCityRoutesBudget && processedData.multiCityRoutesBudget[index]) {
                const budget = processedData.multiCityRoutesBudget[index];
                if (budget && Object.keys(budget).length > 0) {
                  const expenseItems = {};
                  Object.entries(budget).forEach(([itemId, item]) => {
                    if (item && item.itemName) {
                      expenseItems[itemId] = {
                        itemName: item.itemName,
                        limitType: 'FIXED',
                        unit: t('travel.form.unitPerDay'),
                        limit: parseFloat(item.unitPrice) || 0
                      };
                    }
                  });
                  if (Object.keys(expenseItems).length > 0) {
                    finalRouteMatches.multiCity[index] = expenseItems;
                  }
                }
              }
            });
          }
          
          // 批量更新匹配结果（减少重渲染）
          setRouteMatchedExpenseItems(finalRouteMatches);
          setMatchedExpenseItems(finalRouteMatches.outbound || null);
          
          // 编辑模式下，重新判断行程类型会在 useEffect 中自动执行
          // 这里只记录日志，不执行判断（避免 user 信息未加载的问题）
          console.log('[fetchTravelData] Data loaded, tripType auto-detect will be triggered by useEffect');
          console.log('[fetchTravelData] Current tripType:', processedData.tripType);
          console.log('[fetchTravelData] Destinations:', {
            outbound: processedData.outbound?.destination,
            inbound: processedData.inbound?.destination,
            multiCity: processedData.multiCityRoutes?.map(route => route.destination) || []
          });
        }
      }
    } catch (error) {
      console.error('Fetch travel data error:', error);
      console.error('Error details:', {
        message: error.message,
        response: error.response,
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        id: id
      });
      
      // 显示更详细的错误信息
      let errorMessage = t('travel.form.fetchError');
      if (error.response) {
        if (error.response.status === 404) {
          errorMessage = t('travel.form.notFound');
        } else if (error.response.status === 403) {
          errorMessage = t('travel.form.noPermission');
        } else if (error.response.status === 400) {
          errorMessage = error.response.data?.message || t('travel.form.invalidId');
        } else if (error.response.data?.message) {
          errorMessage = error.response.data.message;
        } else {
          errorMessage = t('travel.form.serverError', { status: error.response.status });
        }
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      showNotification(errorMessage, 'error');
    } finally {
      setLoading(false);
      setIsLoadingTravelData(false); // 标记加载完成
    }
  };

  const handleChange = (field, value) => {
    // 特殊处理：币种切换时需要换算所有预算金额
    if (field === 'currency') {
      setFormData(prev => {
        const oldCurrency = prev.currency || 'CNY';
        const newCurrency = value;
        
        // 如果币种没有变化，直接返回
        if (oldCurrency === newCurrency) {
          return { ...prev, currency: newCurrency };
        }
        
        // 换算所有预算金额：从旧币种 -> CNY -> 新币种
        const newOutboundBudget = {};
        const newInboundBudget = {};
        const newMultiCityRoutesBudget = [];
        
        // 换算去程预算
        Object.entries(prev.outboundBudget || {}).forEach(([itemId, item]) => {
          const unitPrice = parseFloat(item.unitPrice) || 0;
          const subtotal = parseFloat(item.subtotal) || 0;
          
          // 先转换为CNY
          const unitPriceCNY = convertToCNY(unitPrice, oldCurrency);
          const subtotalCNY = convertToCNY(subtotal, oldCurrency);
          
          // 再转换为新币种
          const newUnitPrice = convertFromCNY(unitPriceCNY, newCurrency);
          const newSubtotal = convertFromCNY(subtotalCNY, newCurrency);
          
          newOutboundBudget[itemId] = {
            ...item,
            unitPrice: newUnitPrice > 0 ? String(newUnitPrice) : '',
            subtotal: newSubtotal > 0 ? newSubtotal.toFixed(2) : ''
          };
        });
        
        // 换算返程预算
        Object.entries(prev.inboundBudget || {}).forEach(([itemId, item]) => {
          const unitPrice = parseFloat(item.unitPrice) || 0;
          const subtotal = parseFloat(item.subtotal) || 0;
          
          // 先转换为CNY
          const unitPriceCNY = convertToCNY(unitPrice, oldCurrency);
          const subtotalCNY = convertToCNY(subtotal, oldCurrency);
          
          // 再转换为新币种
          const newUnitPrice = convertFromCNY(unitPriceCNY, newCurrency);
          const newSubtotal = convertFromCNY(subtotalCNY, newCurrency);
          
          newInboundBudget[itemId] = {
            ...item,
            unitPrice: newUnitPrice > 0 ? String(newUnitPrice) : '',
            subtotal: newSubtotal > 0 ? newSubtotal.toFixed(2) : ''
          };
        });
        
        // 换算多程行程预算
        (prev.multiCityRoutesBudget || []).forEach((budget, index) => {
          const newBudget = {};
          Object.entries(budget || {}).forEach(([itemId, item]) => {
            const unitPrice = parseFloat(item.unitPrice) || 0;
            const subtotal = parseFloat(item.subtotal) || 0;
            
            // 先转换为CNY
            const unitPriceCNY = convertToCNY(unitPrice, oldCurrency);
            const subtotalCNY = convertToCNY(subtotal, oldCurrency);
            
            // 再转换为新币种
            const newUnitPrice = convertFromCNY(unitPriceCNY, newCurrency);
            const newSubtotal = convertFromCNY(subtotalCNY, newCurrency);
            
            newBudget[itemId] = {
              ...item,
              unitPrice: newUnitPrice > 0 ? String(newUnitPrice) : '',
              subtotal: newSubtotal > 0 ? newSubtotal.toFixed(2) : ''
            };
          });
          newMultiCityRoutesBudget.push(newBudget);
        });
        
        return {
          ...prev,
          currency: newCurrency,
          outboundBudget: newOutboundBudget,
          inboundBudget: newInboundBudget,
          multiCityRoutesBudget: newMultiCityRoutesBudget
        };
      });
      
      // 币种切换后，重新匹配差旅标准（使用新币种）
      // 这个会在 useEffect 中自动触发，因为 formData.currency 变化了
      return;
    }
    
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
            let inboundDestination = value;
            if (typeof value === 'object' && value !== null && value.city) {
              inboundDestination = `${value.city}, ${value.country}`;
            }
            newData.inbound = {
              ...newData.inbound,
              destination: inboundDestination
            };
          } else if (child === 'destination') {
            // 去程目的地变化时，返程出发地设为去程目的地
            let inboundDeparture = value;
            if (typeof value === 'object' && value !== null && value.city) {
              inboundDeparture = `${value.city}, ${value.country}`;
            }
            newData.inbound = {
              ...newData.inbound,
              departure: inboundDeparture
            };
          }
        }

        return newData;
      });
    } else {
      setFormData(prev => {
        // 处理destination字段可能接收Location对象的情况
        let processedValue = value;
        if (field === 'destination' && typeof value === 'object' && value !== null && value.city) {
          processedValue = `${value.city}, ${value.country}`;
        }
        
        return {
          ...prev,
          [field]: processedValue
        };
      });
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
      multiCityRoutes: [...prev.multiCityRoutes, newRoute],
      multiCityRoutesBudget: [...(prev.multiCityRoutesBudget || []), {}]
    }));
  };

  // 删除返程
  const removeInbound = () => {
    setFormData(prev => ({
      ...prev,
      inbound: {
        date: null,
        departure: '',
        destination: '',
        transportation: ''
      }
    }));
  };

  // 删除多程行程
  const removeMultiCityRoute = (index) => {
    setFormData(prev => ({
      ...prev,
      multiCityRoutes: prev.multiCityRoutes.filter((_, i) => i !== index),
      multiCityRoutesBudget: (prev.multiCityRoutesBudget || []).filter((_, i) => i !== index)
    }));
  };

  // 更新多程行程
  const updateMultiCityRoute = (index, field, value) => {
    setFormData(prev => {
      // 处理RegionSelector返回的对象数据
      let processedValue = value;
      if ((field === 'departure' || field === 'destination') && 
          typeof value === 'object' && value !== null && value.city) {
        processedValue = `${value.city}, ${value.country}`;
      }
      
      return {
        ...prev,
        multiCityRoutes: prev.multiCityRoutes.map((route, i) => 
          i === index ? { ...route, [field]: processedValue } : route
        )
      };
    });
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

  // 辅助函数：根据 calcUnit 计算费用项数量
  const calculateExpenseQuantity = (expense, routeQuantity, calcUnit, routeDistance = null, personCount = 1) => {
    // 确定使用的 calcUnit（优先级：expense.calcUnit > calcUnit 参数 > 默认值）
    const unit = expense.calcUnit || calcUnit || expense.unit || 'PER_DAY';
    const normalizedUnit = typeof unit === 'string' ? unit.toUpperCase() : unit;
    
    // 根据计算单位确定数量
    switch (normalizedUnit) {
      case 'PER_DAY':
        // 按天计算：使用行程的天数
        return routeQuantity || 1;
      case 'PER_TRIP':
        // 按次计算：每个行程1次
        return 1;
      case 'PER_KM':
        // 按公里计算：使用距离信息（如果有），否则返回1
        if (routeDistance !== null && routeDistance > 0) {
          return Math.max(1, Math.round(routeDistance)); // 至少为1，四舍五入到整数
        }
        return 1;
      case 'PER_PERSON':
        // 按人计算：使用人数信息（如果有），否则返回1
        return personCount > 0 ? personCount : 1;
      default:
        // 默认情况：如果不是 PER_DAY，返回1
        return normalizedUnit === 'PER_DAY' ? (routeQuantity || 1) : 1;
    }
  };

  // 自动计算费用数量（基于日期）- 适配动态费用项和多程行程
  useEffect(() => {
    const calculateBudgetQuantities = () => {
      // 收集所有行程的日期信息
      const routes = [];
      
      // 添加去程
      if (formData.outbound.date) {
        routes.push({
          type: 'outbound',
          date: dayjs.isDayjs(formData.outbound.date) ? formData.outbound.date : dayjs(formData.outbound.date)
        });
      }
      
      // 添加返程（如果存在）
      if (formData.inbound.date) {
        routes.push({
          type: 'inbound',
          date: dayjs.isDayjs(formData.inbound.date) ? formData.inbound.date : dayjs(formData.inbound.date)
        });
      }
      
      // 添加多程行程
      if (formData.multiCityRoutes && formData.multiCityRoutes.length > 0) {
        formData.multiCityRoutes.forEach((route, index) => {
          if (route.date) {
            routes.push({
              type: 'multiCity',
              index: index,
              date: dayjs.isDayjs(route.date) ? route.date : dayjs(route.date)
            });
          }
        });
      }
      
      // 如果没有行程，设置默认值并返回
      if (routes.length === 0) {
        const quantities = {};
        quantities.outbound = 1;
        if (formData.inbound.date) {
          quantities.inbound = 1;
        }
        return;
      }
      
      // ========== 按日期分组行程（解决同一天多行程费用重复计算问题）==========
      const routesByDate = {};
      routes.forEach((route) => {
        const dateKey = route.date.format('YYYY-MM-DD');
        if (!routesByDate[dateKey]) {
          routesByDate[dateKey] = [];
        }
        routesByDate[dateKey].push(route);
      });
      
      // 获取排序后的日期列表
      const sortedDates = Object.keys(routesByDate).sort((a, b) => {
        return dayjs(a).isBefore(dayjs(b)) ? -1 : 1;
      });
      
      // ========== 计算每个日期组的天数 ==========
      const dateGroupQuantities = {}; // 用于 PER_DAY 类型费用
      const quantities = {}; // 保留用于 PER_TRIP、PER_KM 类型
      
      sortedDates.forEach((dateKey, groupIndex) => {
        const groupRoutes = routesByDate[dateKey];
        const currentDate = dayjs(dateKey);
        
        if (groupIndex === sortedDates.length - 1) {
          // 最后一天：固定为1天
          dateGroupQuantities[dateKey] = 1;
          // 该日期组的所有行程都使用1天（用于 PER_TRIP、PER_KM）
          groupRoutes.forEach(route => {
            if (route.type === 'outbound') {
              quantities.outbound = 1;
            } else if (route.type === 'inbound') {
              quantities.inbound = 1;
            } else if (route.type === 'multiCity') {
              quantities[`multiCity_${route.index}`] = 1;
            }
          });
        } else {
          // 其他天：计算到下一组日期的间隔
          const nextDateKey = sortedDates[groupIndex + 1];
          const nextDate = dayjs(nextDateKey);
          const days = Math.max(1, nextDate.diff(currentDate, 'day'));
          
          dateGroupQuantities[dateKey] = days;
          // 该日期组的所有行程都使用相同的天数（用于 PER_TRIP、PER_KM）
          groupRoutes.forEach(route => {
            if (route.type === 'outbound') {
              quantities.outbound = days;
            } else if (route.type === 'inbound') {
              quantities.inbound = days;
            } else if (route.type === 'multiCity') {
              quantities[`multiCity_${route.index}`] = days;
            }
          });
        }
      });
      
      // ========== 创建日期到行程的映射（用于查找日期组）==========
      const routeToDateKey = {};
      routes.forEach(route => {
        const dateKey = route.date.format('YYYY-MM-DD');
        if (route.type === 'outbound') {
          routeToDateKey.outbound = dateKey;
        } else if (route.type === 'inbound') {
          routeToDateKey.inbound = dateKey;
        } else if (route.type === 'multiCity') {
          routeToDateKey[`multiCity_${route.index}`] = dateKey;
        }
      });

      // 计算每个行程的距离
      const distances = {};
      // 计算去程距离
      if (formData.outbound.departure && formData.outbound.destination) {
        const outboundDistance = calculateDistance(formData.outbound.departure, formData.outbound.destination);
        distances.outbound = outboundDistance;
      }
      // 计算返程距离
      if (formData.inbound.departure && formData.inbound.destination) {
        const inboundDistance = calculateDistance(formData.inbound.departure, formData.inbound.destination);
        distances.inbound = inboundDistance;
      }
      // 计算多程行程距离
      if (formData.multiCityRoutes && formData.multiCityRoutes.length > 0) {
        formData.multiCityRoutes.forEach((route, index) => {
          if (route.departure && route.destination) {
            const multiCityDistance = calculateDistance(route.departure, route.destination);
            distances[`multiCity_${index}`] = multiCityDistance;
          }
        });
      }

      // 更新预算数量（根据匹配的费用项信息判断是否需要按天计算）
      // 检查是否有任何行程的匹配结果
      const hasAnyMatch = routeMatchedExpenseItems.outbound || routeMatchedExpenseItems.inbound || Object.keys(routeMatchedExpenseItems.multiCity).length > 0 || matchedExpenseItems;
      if (!hasAnyMatch) return;

      setFormData(prev => {
        const newOutboundBudget = { ...prev.outboundBudget };
        const newInboundBudget = { ...prev.inboundBudget };
        const newMultiCityRoutesBudget = [...(prev.multiCityRoutesBudget || [])];

        // 处理去程费用项
        const outboundExpenseItems = routeMatchedExpenseItems.outbound || matchedExpenseItems;
        if (outboundExpenseItems) {
          Object.entries(outboundExpenseItems).forEach(([itemId, expense]) => {
            // 计算新的 unitPrice（根据匹配的标准）
            let newUnitPrice = 0;
            if (expense.limitType === 'FIXED') {
              newUnitPrice = expense.limit || 0;
            } else if (expense.limitType === 'RANGE') {
              newUnitPrice = expense.limitMax || expense.limitMin || 0;
            } else if (expense.limitType === 'ACTUAL') {
              // 实报实销类型：unitPrice 设为0，但允许用户手动输入
              newUnitPrice = 0;
            } else if (expense.limitType === 'PERCENTAGE') {
              newUnitPrice = expense.baseAmount ? (expense.baseAmount * (expense.percentage || 0) / 100) : 0;
            }
            
            // 根据 calcUnit 计算数量（区分 PER_DAY 和其他类型）
            let quantity;
            const calcUnit = expense.calcUnit || 'PER_DAY';
            
            if (calcUnit === 'PER_DAY') {
              // PER_DAY 类型：使用日期组的天数（同一天的多个行程共享天数）
              const dateKey = routeToDateKey.outbound;
              const dateGroupDays = dateGroupQuantities[dateKey] || 1;
              quantity = dateGroupDays;
            } else {
              // PER_TRIP、PER_KM、PER_PERSON 类型：使用原有逻辑（按行程计算）
              quantity = calculateExpenseQuantity(
                expense, 
                quantities.outbound, 
                expense.calcUnit,
                distances.outbound || null,
                1 // 人数暂时设为1，后续可以添加人数字段
              );
            }
            
            // 如果预算项不存在，初始化它
            if (!newOutboundBudget[itemId]) {
              newOutboundBudget[itemId] = {
                itemId: itemId,
                itemName: expense.itemName || t('travel.form.unknownExpenseItem'),
                unitPrice: newUnitPrice > 0 ? String(newUnitPrice) : '',
                quantity: quantity,
                subtotal: newUnitPrice > 0 ? (newUnitPrice * quantity).toFixed(2) : '',
                calcUnit: expense.calcUnit || 'PER_DAY', // 保存 calcUnit 用于后续计算
                limitType: expense.limitType || 'FIXED' // 保存 limitType
              };
            } else {
              // 预算项已存在：更新 unitPrice（使用新标准）和数量
              const currentUnitPrice = parseFloat(newOutboundBudget[itemId].unitPrice) || 0;
              
              // 如果新标准的价格与当前不同，更新 unitPrice
              if (Math.abs(newUnitPrice - currentUnitPrice) > 0.01) {
                newOutboundBudget[itemId].unitPrice = newUnitPrice > 0 ? String(newUnitPrice) : '';
                newOutboundBudget[itemId].itemName = expense.itemName || newOutboundBudget[itemId].itemName;
              }
              
              // 更新 calcUnit 和 limitType（如果变化）
              if (expense.calcUnit) {
                newOutboundBudget[itemId].calcUnit = expense.calcUnit;
              }
              if (expense.limitType) {
                newOutboundBudget[itemId].limitType = expense.limitType;
              }
              
              // 更新数量和总价
              newOutboundBudget[itemId].quantity = quantity;
              // 对于实报实销类型，不自动计算 subtotal（允许用户手动输入）
              if (expense.limitType !== 'ACTUAL') {
                newOutboundBudget[itemId].subtotal = (newUnitPrice > 0 ? newUnitPrice : currentUnitPrice) * quantity;
                newOutboundBudget[itemId].subtotal = newOutboundBudget[itemId].subtotal.toFixed(2);
              }
            }
          });
        }
        
        // 处理返程费用项
        const inboundExpenseItems = routeMatchedExpenseItems.inbound || matchedExpenseItems;
        if (inboundExpenseItems) {
          Object.entries(inboundExpenseItems).forEach(([itemId, expense]) => {
            // 计算新的 unitPrice（根据匹配的标准）
            let newUnitPrice = 0;
            if (expense.limitType === 'FIXED') {
              newUnitPrice = expense.limit || 0;
            } else if (expense.limitType === 'RANGE') {
              newUnitPrice = expense.limitMax || expense.limitMin || 0;
            } else if (expense.limitType === 'ACTUAL') {
              // 实报实销类型：unitPrice 设为0，但允许用户手动输入
              newUnitPrice = 0;
            } else if (expense.limitType === 'PERCENTAGE') {
              newUnitPrice = expense.baseAmount ? (expense.baseAmount * (expense.percentage || 0) / 100) : 0;
            }
            
            // 根据 calcUnit 计算数量（区分 PER_DAY 和其他类型）
            let quantity;
            const calcUnit = expense.calcUnit || 'PER_DAY';
            
            if (calcUnit === 'PER_DAY') {
              // PER_DAY 类型：使用日期组的天数（同一天的多个行程共享天数）
              const dateKey = routeToDateKey.inbound;
              const dateGroupDays = dateGroupQuantities[dateKey] || 1;
              quantity = dateGroupDays;
            } else {
              // PER_TRIP、PER_KM、PER_PERSON 类型：使用原有逻辑（按行程计算）
              quantity = calculateExpenseQuantity(
                expense, 
                quantities.inbound, 
                expense.calcUnit,
                distances.inbound || null,
                1 // 人数暂时设为1，后续可以添加人数字段
              );
            }
            
            // 如果预算项不存在，初始化它
            if (!newInboundBudget[itemId]) {
              newInboundBudget[itemId] = {
                itemId: itemId,
                itemName: expense.itemName || t('travel.form.unknownExpenseItem'),
                unitPrice: newUnitPrice > 0 ? String(newUnitPrice) : '',
                quantity: quantity,
                subtotal: newUnitPrice > 0 ? (newUnitPrice * quantity).toFixed(2) : '',
                calcUnit: expense.calcUnit || 'PER_DAY', // 保存 calcUnit 用于后续计算
                limitType: expense.limitType || 'FIXED' // 保存 limitType
              };
            } else {
              // 预算项已存在：更新 unitPrice（使用新标准）和数量
              const currentUnitPrice = parseFloat(newInboundBudget[itemId].unitPrice) || 0;
              
              // 如果新标准的价格与当前不同，更新 unitPrice
              if (Math.abs(newUnitPrice - currentUnitPrice) > 0.01) {
                newInboundBudget[itemId].unitPrice = newUnitPrice > 0 ? String(newUnitPrice) : '';
                newInboundBudget[itemId].itemName = expense.itemName || newInboundBudget[itemId].itemName;
              }
              
              // 更新 calcUnit 和 limitType（如果变化）
              if (expense.calcUnit) {
                newInboundBudget[itemId].calcUnit = expense.calcUnit;
              }
              if (expense.limitType) {
                newInboundBudget[itemId].limitType = expense.limitType;
              }
              
              // 更新数量和总价
              newInboundBudget[itemId].quantity = quantity;
              // 对于实报实销类型，不自动计算 subtotal（允许用户手动输入）
              if (expense.limitType !== 'ACTUAL') {
                newInboundBudget[itemId].subtotal = (newUnitPrice > 0 ? newUnitPrice : currentUnitPrice) * quantity;
                newInboundBudget[itemId].subtotal = newInboundBudget[itemId].subtotal.toFixed(2);
              }
            }
          });
        }
        
        // 处理多程行程费用项
        // 确保 multiCityRoutesBudget 数组长度与 multiCityRoutes 一致
        if (formData.multiCityRoutes && formData.multiCityRoutes.length > 0) {
          // 确保数组长度一致
          while (newMultiCityRoutesBudget.length < formData.multiCityRoutes.length) {
            newMultiCityRoutesBudget.push({});
          }
          // 如果数组过长，截断（不应该发生，但为了安全）
          if (newMultiCityRoutesBudget.length > formData.multiCityRoutes.length) {
            newMultiCityRoutesBudget = newMultiCityRoutesBudget.slice(0, formData.multiCityRoutes.length);
          }
          
          formData.multiCityRoutes.forEach((route, index) => {
            const multiCityExpenseItems = routeMatchedExpenseItems.multiCity[index] || matchedExpenseItems;
            if (multiCityExpenseItems) {
              if (!newMultiCityRoutesBudget[index]) {
                newMultiCityRoutesBudget[index] = {};
              }
              
              Object.entries(multiCityExpenseItems).forEach(([itemId, expense]) => {
                const quantityKey = `multiCity_${index}`;
                
                // 计算新的 unitPrice（根据匹配的标准）
                let newUnitPrice = 0;
                if (expense.limitType === 'FIXED') {
                  newUnitPrice = expense.limit || 0;
                } else if (expense.limitType === 'RANGE') {
                  newUnitPrice = expense.limitMax || expense.limitMin || 0;
                } else if (expense.limitType === 'ACTUAL') {
                  // 实报实销类型：unitPrice 设为0，但允许用户手动输入
                  newUnitPrice = 0;
                } else if (expense.limitType === 'PERCENTAGE') {
                  newUnitPrice = expense.baseAmount ? (expense.baseAmount * (expense.percentage || 0) / 100) : 0;
                }
                
                // 根据 calcUnit 计算数量（区分 PER_DAY 和其他类型）
                let quantity;
                const calcUnit = expense.calcUnit || 'PER_DAY';
                
                if (calcUnit === 'PER_DAY') {
                  // PER_DAY 类型：使用日期组的天数（同一天的多个行程共享天数）
                  const dateKey = routeToDateKey[quantityKey];
                  const dateGroupDays = dateGroupQuantities[dateKey] || 1;
                  quantity = dateGroupDays;
                } else {
                  // PER_TRIP、PER_KM、PER_PERSON 类型：使用原有逻辑（按行程计算）
                  quantity = calculateExpenseQuantity(
                    expense, 
                    quantities[quantityKey], 
                    expense.calcUnit,
                    distances[quantityKey] || null,
                    1 // 人数暂时设为1，后续可以添加人数字段
                  );
                }
                
                // 如果预算项不存在，初始化它
                if (!newMultiCityRoutesBudget[index][itemId]) {
                  newMultiCityRoutesBudget[index][itemId] = {
                    itemId: itemId,
                    itemName: expense.itemName || t('travel.form.unknownExpenseItem'),
                    unitPrice: newUnitPrice > 0 ? String(newUnitPrice) : '',
                    quantity: quantity,
                    subtotal: newUnitPrice > 0 ? (newUnitPrice * quantity).toFixed(2) : '',
                    calcUnit: expense.calcUnit || 'PER_DAY', // 保存 calcUnit 用于后续计算
                    limitType: expense.limitType || 'FIXED' // 保存 limitType
                  };
                } else {
                  // 预算项已存在：更新 unitPrice（使用新标准）和数量
                  const currentUnitPrice = parseFloat(newMultiCityRoutesBudget[index][itemId].unitPrice) || 0;
                  
                  // 如果新标准的价格与当前不同，更新 unitPrice
                  if (Math.abs(newUnitPrice - currentUnitPrice) > 0.01) {
                    newMultiCityRoutesBudget[index][itemId].unitPrice = newUnitPrice > 0 ? String(newUnitPrice) : '';
                    newMultiCityRoutesBudget[index][itemId].itemName = expense.itemName || newMultiCityRoutesBudget[index][itemId].itemName;
                  }
                  
                  // 更新 calcUnit 和 limitType（如果变化）
                  if (expense.calcUnit) {
                    newMultiCityRoutesBudget[index][itemId].calcUnit = expense.calcUnit;
                  }
                  if (expense.limitType) {
                    newMultiCityRoutesBudget[index][itemId].limitType = expense.limitType;
                  }
                  
                  // 更新数量和总价
                  newMultiCityRoutesBudget[index][itemId].quantity = quantity;
                  // 对于实报实销类型，不自动计算 subtotal（允许用户手动输入）
                  if (expense.limitType !== 'ACTUAL') {
                    newMultiCityRoutesBudget[index][itemId].subtotal = (newUnitPrice > 0 ? newUnitPrice : currentUnitPrice) * quantity;
                    newMultiCityRoutesBudget[index][itemId].subtotal = newMultiCityRoutesBudget[index][itemId].subtotal.toFixed(2);
                  }
                }
              });
            }
          });
        }

        return {
          ...prev,
          outboundBudget: newOutboundBudget,
          inboundBudget: newInboundBudget,
          multiCityRoutesBudget: newMultiCityRoutesBudget
        };
      });
    };

    // 只在有日期和匹配的费用项时计算
    if ((formData.outbound.date || formData.inbound.date || (formData.multiCityRoutes && formData.multiCityRoutes.length > 0)) && (routeMatchedExpenseItems.outbound || routeMatchedExpenseItems.inbound || Object.keys(routeMatchedExpenseItems.multiCity).length > 0 || matchedExpenseItems)) {
      calculateBudgetQuantities();
    }
  }, [formData.outbound.date, formData.inbound.date, formData.multiCityRoutes, routeMatchedExpenseItems, matchedExpenseItems]);

  // 实时计算费用总额（当预算变化时自动更新）
  useEffect(() => {
    const calculateTotalCost = () => {
      // 计算去程费用
      const outboundTotal = Object.values(formData.outboundBudget || {}).reduce((sum, item) => {
        return sum + (parseFloat(item.subtotal) || 0);
      }, 0);
      
      // 计算返程费用
      const inboundTotal = Object.values(formData.inboundBudget || {}).reduce((sum, item) => {
        return sum + (parseFloat(item.subtotal) || 0);
      }, 0);
      
      // 计算多程行程费用
      const multiCityTotal = (formData.multiCityRoutesBudget || []).reduce((sum, budget) => {
        return sum + Object.values(budget || {}).reduce((budgetSum, item) => {
          return budgetSum + (parseFloat(item.subtotal) || 0);
        }, 0);
      }, 0);
      
      const totalCost = outboundTotal + inboundTotal + multiCityTotal;
      
      // 只有当计算出的总额与当前值不同时才更新（避免无限循环）
      setFormData(prev => {
        const currentCost = parseFloat(prev.estimatedCost) || 0;
        if (Math.abs(totalCost - currentCost) > 0.01) {
          return {
            ...prev,
            estimatedCost: totalCost > 0 ? String(totalCost.toFixed(2)) : ''
          };
        }
        return prev;
      });
    };

    calculateTotalCost();
  }, [formData.outboundBudget, formData.inboundBudget, formData.multiCityRoutesBudget]);

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
            outboundBudget: {},
            inboundBudget: {},
            matchedExpenseItems: null
    }));
  };

  // 处理预算项目变化（适配动态费用项结构）
  const handleBudgetChange = (tripType, itemId, field, value, routeIndex = null) => {
    setFormData(prev => {
      const newData = { ...prev };
      let budget;
      
      if (tripType === 'outbound') {
        // 创建新的 outboundBudget 对象以确保 React 能检测到变化
        newData.outboundBudget = { ...newData.outboundBudget };
        budget = newData.outboundBudget;
      } else if (tripType === 'inbound') {
        // 创建新的 inboundBudget 对象以确保 React 能检测到变化
        newData.inboundBudget = { ...newData.inboundBudget };
        budget = newData.inboundBudget;
      } else if (tripType === 'multiCity' && routeIndex !== null) {
        // 多程行程的费用预算
        newData.multiCityRoutesBudget = [...(newData.multiCityRoutesBudget || [])];
        if (!newData.multiCityRoutesBudget[routeIndex]) {
          newData.multiCityRoutesBudget[routeIndex] = {};
        }
        newData.multiCityRoutesBudget[routeIndex] = { ...newData.multiCityRoutesBudget[routeIndex] };
        budget = newData.multiCityRoutesBudget[routeIndex];
      } else {
        return newData;
      }
      
      // 确保费用项存在
      if (!budget[itemId]) {
        // 根据行程类型获取对应的匹配费用项
        let expenseItemName = t('travel.form.unknownExpenseItem');
        if (tripType === 'outbound' && routeMatchedExpenseItems.outbound) {
          expenseItemName = routeMatchedExpenseItems.outbound[itemId]?.itemName || t('travel.form.unknownExpenseItem');
        } else if (tripType === 'inbound' && routeMatchedExpenseItems.inbound) {
          expenseItemName = routeMatchedExpenseItems.inbound[itemId]?.itemName || t('travel.form.unknownExpenseItem');
        } else if (tripType === 'multiCity' && routeIndex !== null && routeMatchedExpenseItems.multiCity[routeIndex]) {
          expenseItemName = routeMatchedExpenseItems.multiCity[routeIndex][itemId]?.itemName || t('travel.form.unknownExpenseItem');
        } else if (matchedExpenseItems) {
          expenseItemName = matchedExpenseItems[itemId]?.itemName || t('travel.form.unknownExpenseItem');
        }
        
        budget[itemId] = {
          itemId: itemId,
          itemName: expenseItemName,
          unitPrice: '',
          quantity: 1,
          subtotal: ''
        };
      } else {
        // 创建新的费用项对象以确保 React 能检测到变化
        budget[itemId] = { ...budget[itemId] };
      }
      
      if (field === 'unitPrice' || field === 'quantity') {
        budget[itemId][field] = value;
        // 自动计算小计
        const unitPrice = parseFloat(budget[itemId].unitPrice) || 0;
        const quantity = parseInt(budget[itemId].quantity) || 1;
        budget[itemId].subtotal = (unitPrice * quantity).toFixed(2);
      } else {
        budget[itemId][field] = value;
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
        // 转换对象为字符串（如果存在）
        const getStringValue = (val) => {
          if (typeof val === 'object' && val !== null && val.city) {
            return `${val.city}, ${val.country}`;
          }
          return val;
        };
        
        newData.inbound = {
          ...newData.inbound,
          departure: getStringValue(prev.outbound.destination), // 返程出发地 = 去程目的地
          destination: getStringValue(prev.outbound.departure)  // 返程目的地 = 去程出发地
        };
      }

      return newData;
    });
  };

  // 辅助函数：检查Location字段是否有值（可能是字符串或对象）
  // 这个函数需要在多个地方使用，所以定义在组件顶层
  const hasLocationValue = (val) => {
    if (!val) return false;
    if (val === null || val === undefined) return false;
    
    // 字符串类型
    if (typeof val === 'string') {
      return val.trim().length > 0;
    }
    
    // 对象类型 - 检查多种可能的属性
    if (typeof val === 'object') {
      // 检查是否是数组（不应该出现，但为了安全）
      if (Array.isArray(val)) {
        return val.length > 0;
      }
      
      // 检查对象是否有任何有效属性
      // RegionSelector 返回的对象可能有：name, code, city, country, id, _id 等
      // 必须至少有一个有意义的属性，不能是空对象
      
      // 检查 name 属性（字符串且非空）
      if (val.name && typeof val.name === 'string' && val.name.trim().length > 0) return true;
      
      // 检查 city 属性（字符串且非空）
      if (val.city && typeof val.city === 'string' && val.city.trim().length > 0) return true;
      
      // 检查 code 属性（字符串且非空）
      if (val.code && typeof val.code === 'string' && val.code.trim().length > 0) return true;
      
      // 检查 id 或 _id 属性（任何值都认为有效）
      if (val.id || val._id) return true;
      
      // 检查 country 和 city 组合
      if (val.country && val.city) {
        const countryStr = typeof val.country === 'string' ? val.country : String(val.country);
        const cityStr = typeof val.city === 'string' ? val.city : String(val.city);
        if (countryStr.trim().length > 0 && cityStr.trim().length > 0) return true;
      }
      
      return false;
    }
    
    return false;
  };

  // 更新步骤状态
  const updateStepStatus = () => {
    const newCompletedSteps = [];
    const newErrorSteps = [];
    const newValidationResults = [];

    // 步骤1: 基本信息（包含所有必填字段）
    // destination 字段现在是可选的，因为主要使用 outbound.destination 和 inbound.destination
    // 检查是否有任何行程目的地
    const hasAnyDestination = hasLocationValue(formData.destination) ||
                             hasLocationValue(formData.outbound?.destination) ||
                             hasLocationValue(formData.inbound?.destination) ||
                             (formData.multiCityRoutes && formData.multiCityRoutes.some(route => 
                               hasLocationValue(route.destination)
                             ));
    
    const basicInfoComplete = formData.tripType && 
                             formData.costOwingDepartment && 
                             hasAnyDestination && 
                             formData.requestName && 
                             formData.startDate && 
                             formData.endDate && 
                             formData.tripDescription.trim();
    
    if (basicInfoComplete) {
      newCompletedSteps.push(0);
      newValidationResults.push({
        message: t('travel.form.basicInfoComplete'),
        status: 'valid'
      });
    } else {
      const missingFields = [];
      if (!formData.tripType) missingFields.push(t('travel.tripType'));
      if (!formData.costOwingDepartment) missingFields.push(t('travel.costOwingDepartment'));
      if (!hasAnyDestination) missingFields.push(t('travel.form.destinationAtLeastOne'));
      if (!formData.requestName) missingFields.push(t('travel.requestName'));
      if (!formData.startDate) missingFields.push(t('travel.startDate'));
      if (!formData.endDate) missingFields.push(t('travel.endDate'));
      if (!formData.tripDescription.trim()) missingFields.push(t('travel.tripDescription'));
      
      newErrorSteps.push(0);
      newValidationResults.push({
        message: t('travel.form.pleaseFill', { fields: missingFields.join('、') }),
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
        message: t('travel.form.travelArrangementComplete'),
        status: 'valid'
      });
    } else {
      const missingFields = [];
      if (!formData.outbound.transportation) missingFields.push(t('travel.form.pleaseSelectOutboundTransportation'));
      if (!formData.outbound.date) missingFields.push(t('travel.form.pleaseSelectOutboundDate'));
      if (!(typeof formData.outbound.departure === 'string' ? formData.outbound.departure.trim() : formData.outbound.departure)) missingFields.push(t('travel.form.pleaseSelectOutboundDeparture'));
      if (!(typeof formData.outbound.destination === 'string' ? formData.outbound.destination.trim() : formData.outbound.destination)) missingFields.push(t('travel.form.pleaseSelectOutboundDestination'));
      if (!formData.inbound.transportation) missingFields.push(t('travel.form.pleaseSelectInboundTransportation'));
      if (!formData.inbound.date) missingFields.push(t('travel.form.pleaseSelectInboundDate'));
      if (!(typeof formData.inbound.departure === 'string' ? formData.inbound.departure.trim() : formData.inbound.departure)) missingFields.push(t('travel.form.pleaseSelectInboundDeparture'));
      if (!(typeof formData.inbound.destination === 'string' ? formData.inbound.destination.trim() : formData.inbound.destination)) missingFields.push(t('travel.form.pleaseSelectInboundDestination'));
      
      newErrorSteps.push(1);
      newValidationResults.push({
        message: t('travel.form.pleaseComplete', { fields: missingFields.join('、') }),
        status: 'error'
      });
    }

        // 步骤3: 费用预算（动态验证）
        let outboundBudgetValid = true;
        let inboundBudgetValid = true;
        const missingFields = [];
        
        // 如果有匹配的费用项，验证每个费用项的单价
        if (matchedExpenseItems && Object.keys(matchedExpenseItems).length > 0) {
          Object.keys(matchedExpenseItems).forEach(itemId => {
            const outboundItem = formData.outboundBudget[itemId];
            const inboundItem = formData.inboundBudget[itemId];
            const expense = matchedExpenseItems[itemId];
            
            // 实报实销的费用项不需要验证单价
            if (expense.limitType === 'ACTUAL') {
              return;
            }
            
            if (!outboundItem || !outboundItem.unitPrice || parseFloat(outboundItem.unitPrice) <= 0) {
              outboundBudgetValid = false;
              missingFields.push(t('travel.form.outboundExpenseItem', { itemName: expense.itemName || t('travel.form.unknownExpenseItem') }));
            }
            
            if (!inboundItem || !inboundItem.unitPrice || parseFloat(inboundItem.unitPrice) <= 0) {
              inboundBudgetValid = false;
              missingFields.push(t('travel.form.inboundExpenseItem', { itemName: expense.itemName || t('travel.form.unknownExpenseItem') }));
            }
          });
        } else {
          // 如果没有匹配的费用项，标记为未完成
          outboundBudgetValid = false;
          inboundBudgetValid = false;
          missingFields.push(t('travel.form.expenseItemsRequired'));
        }
        
        const costValid = outboundBudgetValid && inboundBudgetValid;
        
        if (costValid) {
      newCompletedSteps.push(2);
      newValidationResults.push({
            message: t('travel.form.expenseBudgetComplete'),
        status: 'valid'
      });
    } else {
          newErrorSteps.push(2);
      newValidationResults.push({
            message: t('travel.form.pleaseCompleteBudget', { fields: missingFields.slice(0, 5).join('、') + (missingFields.length > 5 ? '...' : '') }),
        status: 'error'
      });
    }


    setCompletedSteps(newCompletedSteps);
    setErrorSteps(newErrorSteps);
    setValidationResults(newValidationResults);
  };


  const validateForm = () => {
    const newErrors = {};

    // 基本信息验证
    if (!formData.tripType) {
      newErrors.tripType = t('travel.form.pleaseSelectTripType');
    }

    if (!formData.costOwingDepartment) {
      newErrors.costOwingDepartment = t('travel.form.pleaseSelectDepartment');
    }

    // destination 字段现在是可选的，因为主要使用 outbound.destination 和 inbound.destination
    // 检查是否有任何行程目的地（去程、返程或多程行程）
    const hasOutboundDestination = hasLocationValue(formData.outbound?.destination);
    const hasInboundDestination = hasLocationValue(formData.inbound?.destination);
    const hasMultiCityDestination = formData.multiCityRoutes && formData.multiCityRoutes.length > 0 && 
      formData.multiCityRoutes.some(route => hasLocationValue(route.destination));
    const hasBasicDestination = hasLocationValue(formData.destination);
    
    // 如果没有任何目的地（基本信息、去程、返程或多程行程都没有），则报错
    if (!hasOutboundDestination && !hasInboundDestination && !hasMultiCityDestination && !hasBasicDestination) {
      newErrors.destination = t('travel.form.pleaseSelectDestination');
    }

    if (!formData.requestName || !formData.requestName.trim()) {
      newErrors.requestName = t('travel.form.pleaseEnterRequestName');
    }

    if (!formData.startDate) {
      newErrors.startDate = t('travel.form.pleaseSelectStartDate');
    }

    if (!formData.endDate) {
      newErrors.endDate = t('travel.form.pleaseSelectEndDate');
    }

    if (!formData.tripDescription.trim()) {
      newErrors.tripDescription = t('travel.form.pleaseInputDescription');
    }

    // 去程信息验证
    if (!formData.outbound.date) {
      newErrors.outboundDate = t('travel.form.pleaseSelectOutboundDate');
    }

    if (!formData.outbound.transportation) {
      newErrors.outboundTransportation = t('travel.form.pleaseSelectOutboundTransportation');
    }

    if (!hasLocationValue(formData.outbound.departure)) {
      newErrors.outboundDeparture = t('travel.form.pleaseSelectOutboundDeparture');
    }

    if (!hasLocationValue(formData.outbound.destination)) {
      newErrors.outboundDestination = t('travel.form.pleaseSelectOutboundDestination');
    }

    // 返程信息验证
    if (!formData.inbound.date) {
      newErrors.inboundDate = t('travel.form.pleaseSelectInboundDate');
    }

    if (!formData.inbound.transportation) {
      newErrors.inboundTransportation = t('travel.form.pleaseSelectInboundTransportation');
    }

    if (!hasLocationValue(formData.inbound.departure)) {
      newErrors.inboundDeparture = t('travel.form.pleaseSelectInboundDeparture');
    }

    if (!hasLocationValue(formData.inbound.destination)) {
      newErrors.inboundDestination = t('travel.form.pleaseSelectInboundDestination');
    }

    // 日期逻辑验证
    if (formData.startDate && formData.endDate && 
        formData.startDate.isAfter(formData.endDate)) {
      newErrors.endDate = t('travel.form.endDateBeforeStartDate');
    }

    // 计算estimatedCost（如果未设置）
    let calculatedCost = formData.estimatedCost;
    if (!calculatedCost || isNaN(calculatedCost) || parseFloat(calculatedCost) <= 0) {
      // 计算总费用
      const outboundTotal = Object.values(formData.outboundBudget || {}).reduce((sum, item) => {
        return sum + (parseFloat(item.subtotal) || 0);
      }, 0);
      const inboundTotal = Object.values(formData.inboundBudget || {}).reduce((sum, item) => {
        return sum + (parseFloat(item.subtotal) || 0);
      }, 0);
      // 计算多程行程费用
      const multiCityTotal = (formData.multiCityRoutesBudget || []).reduce((sum, budget) => {
        return sum + Object.values(budget || {}).reduce((budgetSum, item) => {
          return budgetSum + (parseFloat(item.subtotal) || 0);
        }, 0);
      }, 0);
      calculatedCost = outboundTotal + inboundTotal + multiCityTotal;
    }

    // 费用验证（如果计算后的费用仍为0，则报错）
    if (!calculatedCost || isNaN(calculatedCost) || parseFloat(calculatedCost) <= 0) {
      newErrors.estimatedCost = t('travel.form.pleaseFillBudget');
    }

    setErrors(newErrors);
    
    // 如果有错误，显示提示
    if (Object.keys(newErrors).length > 0) {
      const errorMessages = Object.values(newErrors).join('、');
      showNotification(t('travel.form.pleaseCompleteInfo', { messages: errorMessages }), 'error');
    }
    
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async (status = 'draft') => {
    if (!validateForm()) {
      // 验证失败，阻止提交
      return;
    }

    try {
      setSaving(true);
      
      // 辅助函数：将Location对象转换为字符串
      const convertLocationToString = (val) => {
        if (!val) return '';
        if (typeof val === 'string') return val.trim();
        if (typeof val === 'object') {
          return val.name || `${val.city || ''}, ${val.country || ''}`.trim() || '';
        }
        return String(val);
      };
      
      // 计算estimatedCost（如果未设置）
      let calculatedCost = formData.estimatedCost;
      if (!calculatedCost || isNaN(calculatedCost) || parseFloat(calculatedCost) <= 0) {
        const outboundTotal = Object.values(formData.outboundBudget || {}).reduce((sum, item) => {
          return sum + (parseFloat(item.subtotal) || 0);
        }, 0);
        const inboundTotal = Object.values(formData.inboundBudget || {}).reduce((sum, item) => {
          return sum + (parseFloat(item.subtotal) || 0);
        }, 0);
        // 计算多程行程费用
        const multiCityTotal = (formData.multiCityRoutesBudget || []).reduce((sum, budget) => {
          return sum + Object.values(budget || {}).reduce((budgetSum, item) => {
            return budgetSum + (parseFloat(item.subtotal) || 0);
          }, 0);
        }, 0);
        calculatedCost = outboundTotal + inboundTotal + multiCityTotal;
      }
      
      // 准备提交数据，转换dayjs对象为ISO字符串，转换Location对象为字符串
      // 深度序列化费用预算数据，确保所有数据都能正确提交
      // 如果要提交审批，先保存为draft状态，然后通过submit API提交
      
      // 确保 requestName 有值：如果为空，使用当前登录用户的姓名
      let requestName = formData.requestName;
      if (!requestName || !requestName.trim()) {
        if (user && user.firstName && user.lastName) {
          requestName = `${user.firstName} ${user.lastName}`.trim();
        } else if (user && user.email) {
          requestName = user.email;
        } else {
          requestName = user?.employeeId || '';
        }
      }
      
      const submitData = {
        ...formData,
        requestName: requestName, // 确保 requestName 有值
        status: status === 'submitted' ? 'draft' : status, // 提交审批时先保存为draft
        destination: convertLocationToString(formData.destination),
        startDate: formData.startDate ? formData.startDate.toISOString() : null,
        endDate: formData.endDate ? formData.endDate.toISOString() : null,
        outbound: {
          ...formData.outbound,
          date: formData.outbound.date ? formData.outbound.date.toISOString() : null,
          departure: convertLocationToString(formData.outbound.departure),
          destination: convertLocationToString(formData.outbound.destination)
        },
        inbound: {
          ...formData.inbound,
          date: formData.inbound.date ? formData.inbound.date.toISOString() : null,
          departure: convertLocationToString(formData.inbound.departure),
          destination: convertLocationToString(formData.inbound.destination)
        },
        multiCityRoutes: formData.multiCityRoutes.map(route => ({
          ...route,
          date: route.date ? route.date.toISOString() : null,
          departure: convertLocationToString(route.departure),
          destination: convertLocationToString(route.destination)
        })),
        // 深度复制费用预算数据，确保所有更改都被提交
        outboundBudget: formData.outboundBudget ? JSON.parse(JSON.stringify(formData.outboundBudget)) : {},
        inboundBudget: formData.inboundBudget ? JSON.parse(JSON.stringify(formData.inboundBudget)) : {},
        // 确保 multiCityRoutesBudget 数组长度与 multiCityRoutes 一致
        // 必须始终包含 multiCityRoutesBudget 字段，即使为空数组
        multiCityRoutesBudget: (() => {
          const routesLength = formData.multiCityRoutes ? formData.multiCityRoutes.length : 0;
          if (routesLength === 0) {
            return [];
          }
          // 确保数组长度与 multiCityRoutes 一致
          const budgets = [];
          const existingBudgets = formData.multiCityRoutesBudget || [];
          
          for (let i = 0; i < routesLength; i++) {
            // 如果存在对应的预算，使用它；否则创建空对象
            const budget = existingBudgets[i] || {};
            // 深度复制预算对象，确保包含所有字段（calcUnit, limitType 等）
            budgets.push(budget && typeof budget === 'object' 
              ? JSON.parse(JSON.stringify(budget)) 
              : {});
          }
          
          // 验证数组长度
          if (budgets.length !== routesLength) {
            console.warn(`[TravelForm] multiCityRoutesBudget length mismatch: ${budgets.length} vs ${routesLength}`);
          }
          
          return budgets;
        })(),
        // 确保币种字段存在且有效
        currency: (formData.currency && currencyCodes.includes(formData.currency)) 
          ? formData.currency.toUpperCase() 
          : (getDefaultCurrency(user) || 'USD'),
        estimatedCost: parseFloat(calculatedCost) || 0
      };
      
      // 强制确保 multiCityRoutesBudget 字段存在
      if (!submitData.hasOwnProperty('multiCityRoutesBudget')) {
        submitData.multiCityRoutesBudget = [];
      }
      // 确保它是数组
      if (!Array.isArray(submitData.multiCityRoutesBudget)) {
        submitData.multiCityRoutesBudget = [];
      }
      
      // 新建时，不发送 travelNumber 字段，让后端自动生成
      if (!isEdit) {
        delete submitData.travelNumber;
      }
      
      // 详细检查 multiCityRoutesBudget 数据
      const budgetDetails = (submitData.multiCityRoutesBudget || []).map((budget, index) => {
        const keys = Object.keys(budget || {});
        const items = keys.map(key => ({
          itemId: key,
          itemName: budget[key]?.itemName || 'N/A',
          unitPrice: budget[key]?.unitPrice || 'N/A',
          quantity: budget[key]?.quantity || 'N/A',
          subtotal: budget[key]?.subtotal || 'N/A'
        }));
        return {
          index,
          keysCount: keys.length,
          items: items
        };
      });
      

      let response;
      if (isEdit) {
        // 更新现有申请
        response = await apiClient.put(`/travel/${id}`, submitData);
      } else {
        // 创建新申请
        response = await apiClient.post('/travel', submitData);
      }

      if (response.data && response.data.success) {
        const travelId = response.data.data._id || id;
        
        // 如果状态是submitted，先保存为draft，然后调用提交审批API
        if (status === 'submitted' && travelId) {
          try {
            // 先确保状态是draft（如果后端已经保存为submitted，需要先改回draft）
            // 或者直接调用submit API（它会检查状态）
            await apiClient.post(`/travel/${travelId}/submit`);
            showNotification(
              isEdit ? t('travel.form.updateSubmitSuccess') : t('travel.form.submitSuccess'),
              'success'
            );
          } catch (submitError) {
            console.error('Submit approval error:', submitError);
            console.error('Submit error details:', {
              message: submitError.message,
              response: submitError.response?.data,
              status: submitError.response?.status
            });
            // 显示具体的错误信息
            const errorMsg = submitError.response?.data?.message || submitError.message || t('travel.form.submitError');
            showNotification(
              errorMsg,
              'error'
            );
            // 不导航，让用户看到错误信息
            return;
          }
        } else {
        showNotification(
          status === 'draft' 
            ? (isEdit ? t('travel.form.updateDraftSuccess') : t('travel.form.saveDraftSuccess'))
            : (isEdit ? t('travel.form.updateSubmitSuccess') : t('travel.form.submitSuccess')),
          'success'
        );
        }
        
        navigate('/travel');
      }
    } catch (error) {
      console.error('Save travel error:', error);
      console.error('Error details:', {
        message: error.message,
        response: error.response,
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        config: {
          url: error.config?.url,
          method: error.config?.method,
          baseURL: error.config?.baseURL,
          headers: error.config?.headers
        }
      });
      
      let errorMessage = isEdit ? t('travel.form.updateError') : t('travel.form.saveError');
      if (error.response) {
        if (error.response.status === 404) {
          errorMessage = t('travel.form.apiNotFound');
        } else if (error.response.status === 401) {
          errorMessage = t('travel.form.unauthorized');
        } else if (error.response.data?.message) {
          errorMessage = error.response.data.message;
        }
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      showNotification(errorMessage, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleSubmit = () => {
    handleSave('submitted');
  };

  // 渲染基本信息步骤
  const renderBasicInfoStep = () => (
    <ModernFormSection
            title={t('travel.form.title')}
      description={t('travel.form.basicInfoDescription')}
            stepNumber={1}
            status={completedSteps.includes(0) ? 'completed' : errorSteps.includes(0) ? 'error' : currentStep === 0 ? 'active' : 'pending'}
            statusLabel={errorSteps.includes(0) ? t('travel.form.pendingFill') : undefined}
          >
            <Grid container spacing={3}>
              {/* Trip Type - 自动判断，只读显示 */}
              <Grid item xs={12} md={6}>
          <ModernInput
            type="select"
            label={t('travel.tripType')}
                  value={formData.tripType}
            onChange={(e) => handleTripTypeChange(e.target.value)}
            error={!!errors.tripType}
            required={true}
            options={tripTypes}
            disabled={true}
            helperText={t('travel.form.tripTypeAutoDetected') || '根据您的常驻国和行程目的地自动判断'}
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
                  placeholder={t('travel.form.searchDestinationPlaceholder')}
                  error={!!errors.destination}
                  helperText={errors.destination}
                  required={true}
              />
            </Grid>

              {/* Request Name */}
              <Grid item xs={12} md={6}>
          <ModernInput
            type="text"
            label={t('travel.requestName')}
                    value={formData.requestName}
                    onChange={(e) => handleChange('requestName', e.target.value)}
                    error={!!errors.requestName}
            required={true}
            placeholder={user && user.firstName && user.lastName ? `${user.firstName} ${user.lastName}` : t('travel.requestName')}
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

              {/* Currency */}
              <Grid item xs={12} md={6}>
                <ModernInput
                  type="select"
                  label={t('travel.form.currency')}
                  value={formData.currency}
                  onChange={(e) => handleChange('currency', e.target.value)}
                  error={!!errors.currency}
                  helperText={errors.currency}
                  required={true}
                  options={currencies}
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
      </Grid>
    </ModernFormSection>
  );

  // 渲染出行安排步骤（包含出行日期和目的地）
  const renderTravelArrangementStep = () => (
    <ModernFormSection
      title={t('travel.form.travelArrangement')}
      description={t('travel.form.description')}
      stepNumber={2}
      status={completedSteps.includes(1) ? 'completed' : errorSteps.includes(1) ? 'error' : currentStep === 1 ? 'active' : 'pending'}
      statusLabel={errorSteps.includes(1) ? t('travel.form.pendingFill') : undefined}
    >
      <Grid container spacing={2}>
        {/* 去程信息 */}
            <Grid item xs={12}>
          <TravelRouteCard
            title={formData.multiCityRoutes.length >= 1 ? t('travel.form.firstRouteTitle') : t('travel.form.outboundTitle')}
            icon="🛫"
            routeData={formData.outbound}
            transportationOptions={transportationOptions}
            errors={{
              transportation: errors.outboundTransportation,
              date: errors.outboundDate,
              departure: errors.outboundDeparture,
              destination: errors.outboundDestination
            }}
            onTransportationChange={(e) => handleChange('outbound.transportation', e.target.value)}
            onDateChange={(date) => handleChange('outbound.date', date)}
            onDepartureChange={(value) => handleChange('outbound.departure', value)}
            onDestinationChange={(value) => handleChange('outbound.destination', value)}
            showDelete={false}
            distance={distance}
            formatDistance={formatDistance}
                    />
                  </Grid>

        {/* 返程信息 */}
            <Grid item xs={12}>
          <TravelRouteCard
            title={formData.multiCityRoutes.length >= 1 ? t('travel.form.secondRouteTitle') : t('travel.form.inboundTitle')}
            icon="🛬"
            routeData={formData.inbound}
            transportationOptions={transportationOptions}
            errors={{
              transportation: errors.inboundTransportation,
              date: errors.inboundDate,
              departure: errors.inboundDeparture,
              destination: errors.inboundDestination
            }}
            onTransportationChange={(e) => handleChange('inbound.transportation', e.target.value)}
            onDateChange={(date) => handleChange('inbound.date', date)}
            onDepartureChange={(value) => handleChange('inbound.departure', value)}
            onDestinationChange={(value) => handleChange('inbound.destination', value)}
            onDelete={removeInbound}
            showDelete={true}
                      />
                    </Grid>

        {/* 多程行程 */}
        {formData.multiCityRoutes.map((route, index) => (
          <Grid item xs={12} key={index}>
            <TravelRouteCard
              title={t('travel.form.routeTitle', { index: index + 3 })}
              icon="🚌"
              routeData={route}
              transportationOptions={transportationOptions}
              errors={{}}
              onTransportationChange={(e) => updateMultiCityRoute(index, 'transportation', e.target.value)}
              onDateChange={(date) => updateMultiCityRoute(index, 'date', date)}
              onDepartureChange={(value) => updateMultiCityRoute(index, 'departure', value)}
              onDestinationChange={(value) => updateMultiCityRoute(index, 'destination', value)}
              onDelete={() => removeMultiCityRoute(index)}
              showDelete={true}
              />
            </Grid>
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
            {t('travel.form.addRoute')}
          </Button>
              </Grid>
      </Grid>
    </ModernFormSection>
  );


  // 渲染费用预算步骤
  // 渲染费用项目组件
  const renderExpenseItem = (tripType, category, label, icon, unitLabel = t('travel.form.unitPrice')) => {
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
              {t('travel.form.currencyLabel', { 
                currency: getCurrencyDisplayName(formData.currency)
              })}
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
              label={`${t('travel.form.quantity')} *`}
              type="number"
              value={item.quantity}
              onChange={(e) => handleBudgetChange(tripType, category, 'quantity', e.target.value)}
              sx={{}}
            />
          </Grid>
          
          <Grid item xs={12} sm={4}>
            <Box sx={{ textAlign: 'right' }}>
              <Typography variant="h6" color="primary">
                {formatCurrencyUtil(
                  parseFloat(item.subtotal || 0), 
                  formData.currency || 'USD', 
                  i18n.language || 'en'
                )}
              </Typography>
            </Box>
          </Grid>
        </Grid>
      </Box>
    );
  };

  // 按日期分组行程和预算（用于费用卡片显示）
  const getDateGroupedBudgets = useMemo(() => {
    // 如果没有任何行程数据，返回空数组
    if (!formData || (!formData.outbound && !formData.inbound && (!formData.multiCityRoutes || formData.multiCityRoutes.length === 0))) {
      return [];
    }
    
    const routes = [];
    
    // 收集去程
    if (formData.outbound && formData.outbound.date) {
      routes.push({
        type: 'outbound',
        index: null,
        date: dayjs.isDayjs(formData.outbound.date) ? formData.outbound.date : dayjs(formData.outbound.date),
        routeData: formData.outbound,
        budgetData: (formData.outboundBudget && typeof formData.outboundBudget === 'object') ? formData.outboundBudget : {},
        matchedItems: (routeMatchedExpenseItems.outbound && typeof routeMatchedExpenseItems.outbound === 'object') ? routeMatchedExpenseItems.outbound : (matchedExpenseItems || {})
      });
    }
    
    // 收集返程
    if (formData.inbound && formData.inbound.date) {
      routes.push({
        type: 'inbound',
        index: null,
        date: dayjs.isDayjs(formData.inbound.date) ? formData.inbound.date : dayjs(formData.inbound.date),
        routeData: formData.inbound,
        budgetData: (formData.inboundBudget && typeof formData.inboundBudget === 'object') ? formData.inboundBudget : {},
        matchedItems: (routeMatchedExpenseItems.inbound && typeof routeMatchedExpenseItems.inbound === 'object') ? routeMatchedExpenseItems.inbound : (matchedExpenseItems || {})
      });
    }
    
    // 收集多程行程
    if (formData.multiCityRoutes && formData.multiCityRoutes.length > 0) {
      formData.multiCityRoutes.forEach((route, index) => {
        if (route && route.date) {
          const budgetData = (formData.multiCityRoutesBudget && formData.multiCityRoutesBudget[index]) || {};
          routes.push({
            type: 'multiCity',
            index: index,
            date: dayjs.isDayjs(route.date) ? route.date : dayjs(route.date),
            routeData: route,
            budgetData: budgetData && typeof budgetData === 'object' ? budgetData : {},
            matchedItems: (routeMatchedExpenseItems.multiCity && routeMatchedExpenseItems.multiCity[index]) || matchedExpenseItems || {}
          });
        }
      });
    }
    
    // 按日期分组
    const routesByDate = {};
    routes.forEach((route) => {
      if (!route || !route.date) {
        return; // 跳过无效的路由
      }
      try {
        const dateKey = route.date.format('YYYY-MM-DD');
        if (!routesByDate[dateKey]) {
          routesByDate[dateKey] = [];
        }
        routesByDate[dateKey].push(route);
      } catch (error) {
        console.warn('Error formatting route date:', error, route);
        return; // 跳过日期格式错误的路由
      }
    });
    
    // 获取排序后的日期列表
    const sortedDates = Object.keys(routesByDate || {}).sort((a, b) => {
      return dayjs(a).isBefore(dayjs(b)) ? -1 : 1;
    });
    
    // 如果没有有效的日期分组，返回空数组
    if (sortedDates.length === 0) {
      return [];
    }
    
    // 为每个日期组合并预算和行程信息
    return sortedDates.map((dateKey, groupIndex) => {
      const groupRoutes = routesByDate[dateKey];
      
      // 合并预算数据（同一天的多个行程合并）
      const mergedBudget = {};
      const mergedMatchedItems = {};
      const routeInfos = [];
      
      groupRoutes.forEach((route) => {
        if (!route || !route.routeData) {
          return; // 跳过无效的路由
        }
        
        // 收集行程信息（用于显示）
        routeInfos.push({
          type: route.type,
          index: route.index,
          departure: route.routeData.departure || '',
          destination: route.routeData.destination || '',
          transportation: route.routeData.transportation || ''
        });
        
        // 合并预算数据
        const budgetData = route.budgetData || {};
        if (!budgetData || typeof budgetData !== 'object' || Array.isArray(budgetData)) {
          return; // 跳过无效的预算数据
        }
        Object.entries(budgetData).forEach(([itemId, budgetItem]) => {
          if (!mergedBudget[itemId]) {
            // 如果该费用项还没有，直接添加
            mergedBudget[itemId] = { ...budgetItem };
          } else {
            // 如果该费用项已存在，需要合并（对于 PER_DAY 类型，数量应该相同；对于其他类型，需要累加）
            const existingItem = mergedBudget[itemId];
            const calcUnit = budgetItem.calcUnit || 'PER_DAY';
            
            if (calcUnit === 'PER_DAY') {
              // PER_DAY 类型：数量应该相同（因为共享天数），只保留一个
              // 但 subtotal 应该保持一致
              if (parseFloat(budgetItem.subtotal) > parseFloat(existingItem.subtotal)) {
                mergedBudget[itemId] = { ...budgetItem };
              }
            } else {
              // PER_TRIP、PER_KM 类型：需要累加数量和金额
              const existingQuantity = parseFloat(existingItem.quantity) || 0;
              const existingSubtotal = parseFloat(existingItem.subtotal) || 0;
              const newQuantity = parseFloat(budgetItem.quantity) || 0;
              const newSubtotal = parseFloat(budgetItem.subtotal) || 0;
              
              mergedBudget[itemId] = {
                ...existingItem,
                quantity: existingQuantity + newQuantity,
                subtotal: (existingSubtotal + newSubtotal).toFixed(2)
              };
            }
          }
        });
        
        // 合并匹配的费用项（取第一个非空的）
        const matchedItems = route.matchedItems || {};
        if (matchedItems && typeof matchedItems === 'object' && Object.keys(matchedItems).length > 0 && Object.keys(mergedMatchedItems).length === 0) {
          Object.assign(mergedMatchedItems, matchedItems);
        }
      });
      
      // 生成标题
      let title;
      const firstRoute = groupRoutes[0];
      let routeIndex;
      
      // 计算第一个行程的序号
      if (firstRoute.type === 'outbound') {
        routeIndex = 1; // 第1程
      } else if (firstRoute.type === 'inbound') {
        routeIndex = 2; // 第2程
      } else if (firstRoute.type === 'multiCity') {
        routeIndex = firstRoute.index + 3; // 多程行程从第3程开始
      } else {
        routeIndex = 1;
      }
      
      if (groupRoutes.length === 1) {
        // 单个行程
        if (firstRoute.type === 'outbound') {
          title = formData.multiCityRoutes.length >= 1 
            ? t('travel.form.firstRouteBudgetTitle') 
            : t('travel.form.outboundBudgetTitle');
        } else if (firstRoute.type === 'inbound') {
          title = formData.multiCityRoutes.length >= 1 
            ? t('travel.form.secondRouteBudgetTitle') 
            : t('travel.form.inboundBudgetTitle');
        } else {
          title = t('travel.form.routeBudgetTitle', { index: routeIndex });
        }
      } else {
        // 多个行程在同一天：使用统一的格式 "第n程费用预算（n个行程）"
        title = t('travel.form.routeBudgetTitleWithCount', { 
          index: routeIndex,
          count: groupRoutes.length 
        }) || `第${routeIndex}程费用预算（${groupRoutes.length}个行程）`;
      }
      
      return {
        dateKey,
        date: dayjs(dateKey),
        title,
        routeInfos,
        budgetData: mergedBudget,
        matchedExpenseItems: mergedMatchedItems,
        groupRoutes // 保存原始路由信息，用于处理预算变更
      };
    });
  }, [
    formData.outbound,
    formData.inbound,
    formData.multiCityRoutes,
    formData.outboundBudget,
    formData.inboundBudget,
    formData.multiCityRoutesBudget,
    routeMatchedExpenseItems,
    matchedExpenseItems,
    t
  ]);

  const renderBudgetStep = () => {
    const dateGroupedBudgets = getDateGroupedBudgets;
    
    return (
      <ModernFormSection
        title={t('travel.form.budgetTitle')}
        description={t('travel.form.budgetDescription')}
        icon="💰"
        stepNumber={3}
        status={completedSteps.includes(2) ? 'completed' : errorSteps.includes(2) ? 'error' : currentStep === 2 ? 'active' : 'pending'}
        required={true}
      >
        <Grid container spacing={3}>
          {/* 按日期分组显示费用预算 */}
          {dateGroupedBudgets.map((dateGroup, groupIndex) => {
            // 获取第一个行程的路由数据（用于显示）
            const firstRoute = dateGroup.groupRoutes[0];
            const routeData = firstRoute.routeData;
            
            return (
              <Grid item xs={12} key={`date-group-${dateGroup.dateKey}-${groupIndex}`}>
                <BudgetCard
                  title={dateGroup.title}
                  icon="💰"
                  routeData={{
                    ...routeData,
                    date: dateGroup.date,
                    // 如果有多个行程，显示所有行程信息
                    multipleRoutes: dateGroup.groupRoutes.length > 1 ? dateGroup.routeInfos : null
                  }}
                  budgetData={dateGroup.budgetData}
                  matchedExpenseItems={dateGroup.matchedExpenseItems}
                  currency={(formData.currency || 'USD').toUpperCase()}
                  onBudgetChange={(tripType, itemId, field, value, routeIndex) => {
                    // 处理预算变更：对于同一天的多个行程，需要判断费用类型
                    // 获取费用项的calcUnit来判断是否需要同步更新
                    const budgetItem = dateGroup.budgetData[itemId];
                    const calcUnit = budgetItem?.calcUnit || 'PER_DAY';
                    
                    if (calcUnit === 'PER_DAY') {
                      // PER_DAY类型：同一天的多个行程共享，只需要更新第一个行程
                      // 其他行程的预算会通过useEffect自动重新计算
                      const firstRoute = dateGroup.groupRoutes[0];
                      if (firstRoute.type === 'outbound') {
                        handleBudgetChange('outbound', itemId, field, value, null);
                      } else if (firstRoute.type === 'inbound') {
                        handleBudgetChange('inbound', itemId, field, value, null);
                      } else if (firstRoute.type === 'multiCity') {
                        handleBudgetChange('multiCity', itemId, field, value, firstRoute.index);
                      }
                    } else {
                      // PER_TRIP、PER_KM类型：每个行程独立，需要分别更新
                      // 但由于UI上显示的是合并后的预算，这里只更新第一个行程
                      // 如果需要分别编辑，需要更复杂的UI逻辑
                      const firstRoute = dateGroup.groupRoutes[0];
                      if (firstRoute.type === 'outbound') {
                        handleBudgetChange('outbound', itemId, field, value, null);
                      } else if (firstRoute.type === 'inbound') {
                        handleBudgetChange('inbound', itemId, field, value, null);
                      } else if (firstRoute.type === 'multiCity') {
                        handleBudgetChange('multiCity', itemId, field, value, firstRoute.index);
                      }
                    }
                  }}
                  tripType={firstRoute.type}
                  purpose={formData.purpose}
                  routeIndex={firstRoute.index}
                />
              </Grid>
            );
          })}
        </Grid>
      </ModernFormSection>
    );
  };


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
              matchedExpenseItems={matchedExpenseItems}
              routeMatchedExpenseItems={routeMatchedExpenseItems}
              currency={(formData.currency || 'USD').toUpperCase()}
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
            {t('travel.form.previousPage')}
          </Button>

          <Box sx={{ display: 'flex', gap: 2 }}>
            <Typography variant="body2" color="text.secondary">
              {t('travel.form.pageInfo', { current: currentStep + 1, total: steps.length })}
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
                {t('travel.form.nextPage')}
              </Button>
            )}
          </Box>
        </Box>
      </Box>
    </Container>
  );
};

export default TravelForm;

