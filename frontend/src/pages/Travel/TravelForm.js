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
import CitySearchInput from '../../components/Common/CitySearchInput';
import RegionSelector from '../../components/Common/RegionSelector';
import FormSection from '../../components/Common/FormSection';
import TravelRouteCard from '../../components/Travel/TravelRouteCard';
import BudgetCard from '../../components/Travel/BudgetCard';
import { calculateDistance, formatDistance, isCitySupported } from '../../utils/distanceCalculator';
import dayjs from 'dayjs';
import apiClient from '../../utils/axiosConfig';
// 已改为使用API，不再使用locationService的getAllCities

const TravelForm = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { showNotification } = useNotification();
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = Boolean(id);

  // 交通工具选项
  const transportationOptions = [
    { value: 'flight', label: t('travel.form.transportation.flight'), icon: <FlightIcon /> },
    { value: 'train', label: t('travel.form.transportation.train'), icon: <TrainIcon /> },
    { value: 'car', label: t('travel.form.transportation.car'), icon: <CarIcon /> },
    { value: 'bus', label: t('travel.form.transportation.bus'), icon: <BusIcon /> },
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
    // 费用预算 - 去程（动态结构，key为费用项ID）
    outboundBudget: {},
    // 费用预算 - 返程（动态结构，key为费用项ID）
    inboundBudget: {},
    // 费用预算 - 多程行程（数组，每个元素对应一个多程行程的费用预算）
    multiCityRoutesBudget: [],
    estimatedCost: '',
    currency: 'USD',
    notes: ''
  });

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

  // 匹配单个行程的差旅标准
  const matchRouteStandard = async (destination, routeDate, routeType, routeIndex = null) => {
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

        // 如果找到了城市名，尝试获取城市等级
        if (cityName) {
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
              if (matchedCity && matchedCity.cityLevel) {
                cityLevel = matchedCity.cityLevel;
                country = country || matchedCity.country || '';
              }
            }
          } catch (err) {
            console.warn('Failed to fetch city level:', err);
          }
        }

        // 核心逻辑：获取所有可能用于匹配差旅标准的条件
        // 包括：角色、岗位、部门、职级、项目编码等
        // 这些条件对应差旅标准配置时的条件类型
        const positionLevel = user?.jobLevel || '';
        const department = user?.department || formData.costOwingDepartment || '';
        const role = user?.role || '';
        const position = user?.position || '';
        // 项目编码可以从表单中获取，如果有项目编码字段的话
        const projectCode = formData.projectCode || '';

        // 调用标准匹配API，传递所有匹配条件
        // 后端会自动从用户信息中获取缺失的条件，确保所有条件都被查询
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
    formData.outbound.destination,
    formData.outbound.date,
    formData.inbound.destination,
    formData.inbound.date,
    formData.multiCityRoutes,
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
      
      // 只在有 ID 时验证格式并获取数据（新建模式下不会有 ID）
      if (id) {
        // 调试：输出实际获取到的 ID
        console.log('Fetching travel data with ID:', id, 'Type:', typeof id, 'Length:', id?.length);
        
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
              destination: convertLocationToString(data.outbound?.destination),
              transportation: data.outbound?.transportation || ''
            },
            inbound: {
              ...data.inbound || {},
              date: data.inbound?.date ? dayjs(data.inbound.date) : null,
              departure: convertLocationToString(data.inbound?.departure),
              destination: convertLocationToString(data.inbound?.destination),
              transportation: data.inbound?.transportation || ''
            },
            multiCityRoutes: (data.multiCityRoutes || []).map(route => ({
              ...route,
              date: route.date ? dayjs(route.date) : null,
              departure: convertLocationToString(route.departure),
              destination: convertLocationToString(route.destination),
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
          
          console.log('Fetched travel data:', data);
          console.log('Processed form data:', processedData);
          
          // 如果有预算数据，从预算数据中恢复费用项信息（用于编辑模式）
          const routeMatches = {
            outbound: null,
            inbound: null,
            multiCity: {}
          };
          
          // 从去程预算恢复费用项
          if (processedData.outboundBudget && Object.keys(processedData.outboundBudget).length > 0) {
            const expenseItems = {};
            Object.entries(processedData.outboundBudget).forEach(([itemId, item]) => {
              if (item && item.itemName) {
                expenseItems[itemId] = {
                  itemName: item.itemName,
                  limitType: 'FIXED', // 默认类型
                  unit: t('travel.form.unitPerDay'), // 默认单位
                  limit: parseFloat(item.unitPrice) || 0
                };
              }
            });
            if (Object.keys(expenseItems).length > 0) {
              routeMatches.outbound = expenseItems;
              setMatchedExpenseItems(expenseItems);
            }
          }
          
          // 从返程预算恢复费用项
          if (processedData.inboundBudget && Object.keys(processedData.inboundBudget).length > 0) {
            const expenseItems = {};
            Object.entries(processedData.inboundBudget).forEach(([itemId, item]) => {
              if (item && item.itemName) {
                expenseItems[itemId] = {
                  itemName: item.itemName,
                  limitType: 'FIXED',
                  unit: '元/天',
                  limit: parseFloat(item.unitPrice) || 0
                };
              }
            });
            if (Object.keys(expenseItems).length > 0) {
              routeMatches.inbound = expenseItems;
            }
          }
          
          // 从多程行程预算恢复费用项
          if (processedData.multiCityRoutesBudget && processedData.multiCityRoutesBudget.length > 0) {
            processedData.multiCityRoutesBudget.forEach((budget, index) => {
              if (budget && Object.keys(budget).length > 0) {
                const expenseItems = {};
                Object.entries(budget).forEach(([itemId, item]) => {
                  if (item && item.itemName) {
                    expenseItems[itemId] = {
                      itemName: item.itemName,
                      limitType: 'FIXED',
                      unit: '元/天',
                      limit: parseFloat(item.unitPrice) || 0
                    };
                  }
                });
                if (Object.keys(expenseItems).length > 0) {
                  routeMatches.multiCity[index] = expenseItems;
                }
              }
            });
          }
          
          // 更新匹配结果
          setRouteMatchedExpenseItems(routeMatches);
          
          setFormData(processedData);
          
          // 编辑模式下，如果有目的地和日期，也尝试重新匹配差旅标准（异步执行，不阻塞）
          setTimeout(async () => {
            const routeMatchesFromAPI = {
              outbound: null,
              inbound: null,
              multiCity: {}
            };
            
            // 匹配去程
            if (processedData.outbound.destination && processedData.outbound.date) {
              routeMatchesFromAPI.outbound = await matchRouteStandard(
                processedData.outbound.destination,
                processedData.outbound.date,
                'outbound'
              );
            }
            
            // 匹配返程
            if (processedData.inbound.destination && processedData.inbound.date) {
              routeMatchesFromAPI.inbound = await matchRouteStandard(
                processedData.inbound.destination,
                processedData.inbound.date,
                'inbound'
              );
            }
            
            // 匹配多程行程
            if (processedData.multiCityRoutes && processedData.multiCityRoutes.length > 0) {
              for (let i = 0; i < processedData.multiCityRoutes.length; i++) {
                const route = processedData.multiCityRoutes[i];
                if (route.destination && route.date) {
                  routeMatchesFromAPI.multiCity[i] = await matchRouteStandard(
                    route.destination,
                    route.date,
                    'multiCity',
                    i
                  );
                }
              }
            }
            
            // 更新匹配结果（只更新有匹配结果的）
            setRouteMatchedExpenseItems(prev => {
              const updated = { ...prev };
              if (routeMatchesFromAPI.outbound) updated.outbound = routeMatchesFromAPI.outbound;
              if (routeMatchesFromAPI.inbound) updated.inbound = routeMatchesFromAPI.inbound;
              Object.keys(routeMatchesFromAPI.multiCity).forEach(index => {
                if (routeMatchesFromAPI.multiCity[index]) {
                  updated.multiCity[index] = routeMatchesFromAPI.multiCity[index];
                }
              });
              return updated;
            });
            
            if (routeMatchesFromAPI.outbound) {
              setMatchedExpenseItems(routeMatchesFromAPI.outbound);
            }
          }, 500);
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
      
      // 按日期排序行程
      routes.sort((a, b) => {
        if (!a.date || !b.date) return 0;
        return a.date.isBefore(b.date) ? -1 : 1;
      });
      
      // 计算每个行程的数量
      const quantities = {};
      routes.forEach((route, index) => {
        if (index === routes.length - 1) {
          // 最后一程数量固定为1
          if (route.type === 'outbound') {
            quantities.outbound = 1;
          } else if (route.type === 'inbound') {
            quantities.inbound = 1;
          } else if (route.type === 'multiCity') {
            quantities[`multiCity_${route.index}`] = 1;
          }
        } else {
          // 其他程：自己出发日期到下一程出发日期的间隔
          const currentDate = route.date;
          const nextDate = routes[index + 1].date;
          
          if (currentDate && nextDate && currentDate.isValid() && nextDate.isValid()) {
            const days = Math.max(1, nextDate.diff(currentDate, 'day'));
            
            if (route.type === 'outbound') {
              quantities.outbound = days;
            } else if (route.type === 'inbound') {
              quantities.inbound = days;
            } else if (route.type === 'multiCity') {
              quantities[`multiCity_${route.index}`] = days;
            }
          } else {
            // 如果日期无效，默认为1
            if (route.type === 'outbound') {
              quantities.outbound = 1;
            } else if (route.type === 'inbound') {
              quantities.inbound = 1;
            } else if (route.type === 'multiCity') {
              quantities[`multiCity_${route.index}`] = 1;
            }
          }
        }
      });
      
      // 如果没有找到任何行程，设置默认值
      if (Object.keys(quantities).length === 0) {
        quantities.outbound = 1;
        if (formData.inbound.date) {
          quantities.inbound = 1;
        }
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
          const isPerDay = expense.unit === t('travel.form.unitPerDay') || expense.unit === 'PER_DAY' || expense.calcUnit === 'PER_DAY';
          
            // 如果预算项不存在，初始化它
            if (!newOutboundBudget[itemId]) {
              let unitPrice = 0;
              if (expense.limitType === 'FIXED') {
                unitPrice = expense.limit || 0;
              } else if (expense.limitType === 'RANGE') {
                unitPrice = expense.limitMax || expense.limitMin || 0;
              } else if (expense.limitType === 'ACTUAL') {
                unitPrice = 0;
              } else if (expense.limitType === 'PERCENTAGE') {
                unitPrice = expense.baseAmount ? (expense.baseAmount * (expense.percentage || 0) / 100) : 0;
              }
              
              const quantity = isPerDay ? (quantities.outbound || 1) : 1;
              newOutboundBudget[itemId] = {
                itemId: itemId,
                itemName: expense.itemName || '未知费用项',
                unitPrice: unitPrice > 0 ? String(unitPrice) : '',
                quantity: quantity,
                subtotal: unitPrice > 0 ? (unitPrice * quantity).toFixed(2) : ''
              };
            } else if (newOutboundBudget[itemId].unitPrice) {
              // 更新数量
              const quantity = isPerDay ? (quantities.outbound || 1) : 1;
            newOutboundBudget[itemId].quantity = quantity;
            const unitPrice = parseFloat(newOutboundBudget[itemId].unitPrice) || 0;
            newOutboundBudget[itemId].subtotal = (unitPrice * quantity).toFixed(2);
          }
          });
        }
        
        // 处理返程费用项
        const inboundExpenseItems = routeMatchedExpenseItems.inbound || matchedExpenseItems;
        if (inboundExpenseItems) {
          Object.entries(inboundExpenseItems).forEach(([itemId, expense]) => {
            const isPerDay = expense.unit === t('travel.form.unitPerDay') || expense.unit === 'PER_DAY' || expense.calcUnit === 'PER_DAY';
            
            // 如果预算项不存在，初始化它
            if (!newInboundBudget[itemId]) {
              let unitPrice = 0;
              if (expense.limitType === 'FIXED') {
                unitPrice = expense.limit || 0;
              } else if (expense.limitType === 'RANGE') {
                unitPrice = expense.limitMax || expense.limitMin || 0;
              } else if (expense.limitType === 'ACTUAL') {
                unitPrice = 0;
              } else if (expense.limitType === 'PERCENTAGE') {
                unitPrice = expense.baseAmount ? (expense.baseAmount * (expense.percentage || 0) / 100) : 0;
              }
              
              const quantity = isPerDay ? (quantities.inbound || 1) : 1;
              newInboundBudget[itemId] = {
                itemId: itemId,
                itemName: expense.itemName || '未知费用项',
                unitPrice: unitPrice > 0 ? String(unitPrice) : '',
                quantity: quantity,
                subtotal: unitPrice > 0 ? (unitPrice * quantity).toFixed(2) : ''
              };
            } else if (newInboundBudget[itemId].unitPrice) {
              // 更新数量
              const quantity = isPerDay ? (quantities.inbound || 1) : 1;
            newInboundBudget[itemId].quantity = quantity;
            const unitPrice = parseFloat(newInboundBudget[itemId].unitPrice) || 0;
            newInboundBudget[itemId].subtotal = (unitPrice * quantity).toFixed(2);
          }
        });
        }
        
        // 处理多程行程费用项
        if (formData.multiCityRoutes && formData.multiCityRoutes.length > 0) {
          formData.multiCityRoutes.forEach((route, index) => {
            const multiCityExpenseItems = routeMatchedExpenseItems.multiCity[index] || matchedExpenseItems;
            if (multiCityExpenseItems) {
              if (!newMultiCityRoutesBudget[index]) {
                newMultiCityRoutesBudget[index] = {};
              }
              
              Object.entries(multiCityExpenseItems).forEach(([itemId, expense]) => {
                const isPerDay = expense.unit === t('travel.form.unitPerDay') || expense.unit === 'PER_DAY' || expense.calcUnit === 'PER_DAY';
                const quantityKey = `multiCity_${index}`;
                
                // 如果预算项不存在，初始化它
                if (!newMultiCityRoutesBudget[index][itemId]) {
                  let unitPrice = 0;
                  if (expense.limitType === 'FIXED') {
                    unitPrice = expense.limit || 0;
                  } else if (expense.limitType === 'RANGE') {
                    unitPrice = expense.limitMax || expense.limitMin || 0;
                  } else if (expense.limitType === 'ACTUAL') {
                    unitPrice = 0;
                  } else if (expense.limitType === 'PERCENTAGE') {
                    unitPrice = expense.baseAmount ? (expense.baseAmount * (expense.percentage || 0) / 100) : 0;
                  }
                  
                  const quantity = isPerDay ? (quantities[quantityKey] || 1) : 1;
                  newMultiCityRoutesBudget[index][itemId] = {
                    itemId: itemId,
                    itemName: expense.itemName || '未知费用项',
                    unitPrice: unitPrice > 0 ? String(unitPrice) : '',
                    quantity: quantity,
                    subtotal: unitPrice > 0 ? (unitPrice * quantity).toFixed(2) : ''
                  };
                } else if (newMultiCityRoutesBudget[index][itemId].unitPrice) {
                  // 更新数量
                  const quantity = isPerDay ? (quantities[quantityKey] || 1) : 1;
                  newMultiCityRoutesBudget[index][itemId].quantity = quantity;
                  const unitPrice = parseFloat(newMultiCityRoutesBudget[index][itemId].unitPrice) || 0;
                  newMultiCityRoutesBudget[index][itemId].subtotal = (unitPrice * quantity).toFixed(2);
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
    // 添加调试日志以便排查问题
    if (!hasOutboundDestination && !hasInboundDestination && !hasMultiCityDestination && !hasBasicDestination) {
      console.log('Destination validation failed:', {
        hasOutboundDestination,
        hasInboundDestination,
        hasMultiCityDestination,
        hasBasicDestination,
        outboundDestination: formData.outbound?.destination,
        inboundDestination: formData.inbound?.destination,
        basicDestination: formData.destination,
        multiCityRoutes: formData.multiCityRoutes
      });
      newErrors.destination = t('travel.form.pleaseSelectDestination');
    }

    if (!formData.requestName) {
      newErrors.requestName = t('travel.form.pleaseSelectRequestName');
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
      console.log('验证失败，阻止提交');
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
      const submitData = {
        ...formData,
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
          for (let i = 0; i < routesLength; i++) {
            const budget = formData.multiCityRoutesBudget && formData.multiCityRoutesBudget[i]
              ? formData.multiCityRoutesBudget[i]
              : {};
            budgets.push(budget ? JSON.parse(JSON.stringify(budget)) : {});
          }
          return budgets;
        })(),
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
      
      console.log('=== 前端提交数据 ===');
      console.log('multiCityRoutesBudget:', {
        length: submitData.multiCityRoutesBudget?.length || 0,
        isArray: Array.isArray(submitData.multiCityRoutesBudget),
        data: JSON.stringify(submitData.multiCityRoutesBudget, null, 2),
        details: budgetDetails
      });
      console.log('multiCityRoutes:', {
        length: submitData.multiCityRoutes?.length || 0,
        routes: submitData.multiCityRoutes
      });
      console.log('完整提交数据:', {
        ...submitData,
        outboundBudgetKeys: Object.keys(submitData.outboundBudget || {}),
        inboundBudgetKeys: Object.keys(submitData.inboundBudget || {}),
        multiCityRoutesBudgetLength: submitData.multiCityRoutesBudget?.length || 0
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
            const errorMsg = submitError.response?.data?.message || submitError.message || '提交审批失败';
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
    console.log('=== 提交申请按钮点击 ===');
    console.log('Form data:', formData);
    console.log('Validation result:', validateForm());
    console.log('Errors:', errors);
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
                  placeholder={t('travel.form.searchDestinationPlaceholder')}
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
              {t('travel.form.currencyLabel', { currency: formData.currency })}
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
                {t('travel.form.subtotal', { currency: formData.currency, amount: item.subtotal || '0.00' })}
              </Typography>
            </Box>
          </Grid>
        </Grid>
      </Box>
    );
  };

  const renderBudgetStep = () => (
    <ModernFormSection
      title={t('travel.form.budgetTitle')}
      description={t('travel.form.budgetDescription')}
      icon="💰"
      stepNumber={3}
      status={completedSteps.includes(2) ? 'completed' : errorSteps.includes(2) ? 'error' : currentStep === 2 ? 'active' : 'pending'}
      required={true}
    >
      <Grid container spacing={3}>
        {/* 去程费用预算 */}
            <Grid item xs={12}>
          <BudgetCard
            title={formData.multiCityRoutes.length >= 1 ? t('travel.form.firstRouteBudgetTitle') : t('travel.form.outboundBudgetTitle')}
            icon="💰"
            routeData={formData.outbound}
            budgetData={formData.outboundBudget}
            matchedExpenseItems={routeMatchedExpenseItems.outbound || matchedExpenseItems}
                  currency={formData.currency}
            onBudgetChange={(tripType, itemId, field, value, routeIndex) => handleBudgetChange(tripType, itemId, field, value, routeIndex)}
            tripType="outbound"
            purpose={formData.purpose}
                />
              </Grid>

        {/* 返程费用预算 */}
        {(formData.tripType === 'roundTrip' || (formData.inbound && formData.inbound.date)) && (
            <Grid item xs={12}>
            <BudgetCard
              title={formData.multiCityRoutes.length >= 1 ? t('travel.form.secondRouteBudgetTitle') : t('travel.form.inboundBudgetTitle')}
              icon="💰"
              routeData={formData.inbound}
              budgetData={formData.inboundBudget}
              matchedExpenseItems={routeMatchedExpenseItems.inbound || matchedExpenseItems}
              currency={formData.currency}
              onBudgetChange={(tripType, itemId, field, value, routeIndex) => handleBudgetChange(tripType, itemId, field, value, routeIndex)}
              tripType="inbound"
              purpose={formData.purpose}
            />
                  </Grid>
        )}

        {/* 多程行程费用预算 */}
        {formData.multiCityRoutes && formData.multiCityRoutes.map((route, index) => (
          <Grid item xs={12} key={`multi-city-${index}`}>
            <BudgetCard
              title={t('travel.form.routeBudgetTitle', { index: index + 3 })}
              icon="💰"
              routeData={route}
              budgetData={formData.multiCityRoutesBudget[index] || {}}
              matchedExpenseItems={routeMatchedExpenseItems.multiCity[index] || matchedExpenseItems}
                      currency={formData.currency}
              onBudgetChange={(tripType, itemId, field, value, routeIndex) => handleBudgetChange('multiCity', itemId, field, value, routeIndex)}
              tripType="multiCity"
              purpose={formData.purpose}
              routeIndex={index}
                    />
                  </Grid>
        ))}
      </Grid>
    </ModernFormSection>
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
              matchedExpenseItems={matchedExpenseItems}
              routeMatchedExpenseItems={routeMatchedExpenseItems}
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

