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
    // 费用预算 - 去程（动态结构，key为费用项ID）
    outboundBudget: {},
    // 费用预算 - 返程（动态结构，key为费用项ID）
    inboundBudget: {},
    // 费用预算 - 多程行程（数组，每个元素对应一个多程行程的预算，动态结构，key为费用项ID）
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
  const [matchedExpenseItems, setMatchedExpenseItems] = useState(null); // 匹配的费用项列表

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

  // 自动匹配差旅标准并填充预算（仅在新增时触发）
  useEffect(() => {
    // 只在新增模式下，且关键信息已填写时自动匹配
    if (isEdit) return; // 编辑模式不自动匹配
    
    const autoMatchStandard = async () => {
      // 检查必要信息是否已填写（只使用出行安排中的日期）
      const destination = formData.outbound.destination || formData.destination;
      const startDate = formData.outbound.date; // 只使用出行安排中的出发日期
      
      if (!destination || !startDate) return;

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

        // 获取用户职级信息
        const positionLevel = user?.jobLevel || '';
        const department = user?.department || formData.costOwingDepartment || '';

        // 调用标准匹配API
        const matchResponse = await apiClient.post('/travel-standards/match', {
          country: country || '',
          city: cityName || '',
          cityLevel: cityLevel,
          positionLevel: positionLevel,
          department: department,
          matchStrategy: 'MERGE_BEST' // 使用合并最优策略
        });

        if (matchResponse.data && matchResponse.data.success && matchResponse.data.data.matched) {
          const { expenses } = matchResponse.data.data;
          
          // 保存匹配的费用项信息（用于动态渲染）
          setMatchedExpenseItems(expenses);

          // 计算行程天数（处理dayjs对象）- 只使用出行安排中的日期
          const endDate = formData.inbound.date || startDate; // 只使用出行安排中的返程日期
          let days = 1;
          if (startDate && endDate) {
            const start = dayjs.isDayjs(startDate) ? startDate : dayjs(startDate);
            const end = dayjs.isDayjs(endDate) ? endDate : dayjs(endDate);
            days = Math.max(1, end.diff(start, 'day') + 1);
          }

          // 计算去程数量：使用去程的date字段，从去程出发日期到返程出发日期的天数
          // 第一段：去程日期到返程日期
          let outboundQuantity = 1;
          if (formData.outbound?.date && formData.inbound?.date) {
            // 使用去程行程的date字段
            const outboundDate = dayjs.isDayjs(formData.outbound.date) ? formData.outbound.date : dayjs(formData.outbound.date);
            // 使用返程行程的date字段作为下一程
            const nextDate = dayjs.isDayjs(formData.inbound.date) ? formData.inbound.date : dayjs(formData.inbound.date);
            
            if (outboundDate.isValid() && nextDate.isValid() && nextDate.isAfter(outboundDate)) {
              outboundQuantity = Math.max(1, nextDate.diff(outboundDate, 'day'));
            }
          }

          // 计算返程数量：使用返程的date字段，从返程出发日期到下一程（多程行程）的天数
          // 第二段：返程日期到多程行程日期（如果有多程行程）
          let inboundQuantity = 1;
          if (formData.inbound?.date) {
            const inboundDate = dayjs.isDayjs(formData.inbound.date) ? formData.inbound.date : dayjs(formData.inbound.date);
            
            if (formData.multiCityRoutes && formData.multiCityRoutes.length > 0 && formData.multiCityRoutes[0]?.date) {
              // 如果有多程行程，下一程是第一程多程行程，使用第一程的date字段
              const nextDate = dayjs.isDayjs(formData.multiCityRoutes[0].date) ? formData.multiCityRoutes[0].date : dayjs(formData.multiCityRoutes[0].date);
              
              if (inboundDate.isValid() && nextDate.isValid() && nextDate.isAfter(inboundDate)) {
                inboundQuantity = Math.max(1, nextDate.diff(inboundDate, 'day'));
              }
            } else {
              // 如果没有多程行程，返程是最后一程，数量固定为1
              inboundQuantity = 1;
            }
          }

          // 更新预算字段（使用费用项ID作为key）
          setFormData(prev => {
            const newOutboundBudget = { ...prev.outboundBudget };
            const newInboundBudget = { ...prev.inboundBudget };

            // 遍历匹配的费用项，使用itemId作为key
            Object.entries(expenses).forEach(([itemId, expense]) => {
              // 根据limitType处理费用
              let unitPrice = 0;
              if (expense.limitType === 'FIXED') {
                unitPrice = expense.limit || 0;
              } else if (expense.limitType === 'RANGE') {
                unitPrice = expense.limitMax || expense.limitMin || 0;
              } else if (expense.limitType === 'ACTUAL') {
                // 实报实销，设置unitPrice为0（用户手动输入）
                unitPrice = 0;
              } else if (expense.limitType === 'PERCENTAGE') {
                unitPrice = expense.baseAmount ? (expense.baseAmount * (expense.percentage || 0) / 100) : 0;
              }

              // 根据计算单位确定数量
              let outboundQty = 1;
              let inboundQty = 1;
              
              // 判断是否按天计算
              const isPerDay = expense.unit === '元/天' || expense.unit === 'PER_DAY' || expense.calcUnit === 'PER_DAY';
              if (isPerDay) {
                outboundQty = outboundQuantity;
                inboundQty = inboundQuantity; // 返程固定为1
              }

              // 初始化或更新预算项（只更新空值，保留用户手动输入的值）
              if (!newOutboundBudget[itemId] || !newOutboundBudget[itemId].unitPrice) {
                newOutboundBudget[itemId] = {
                  itemId: itemId,
                  itemName: expense.itemName || '未知费用项',
                  unitPrice: unitPrice > 0 ? String(unitPrice) : '',
                  quantity: outboundQty,
                  subtotal: unitPrice > 0 ? (unitPrice * outboundQty).toFixed(2) : ''
                };
              }

              if (!newInboundBudget[itemId] || !newInboundBudget[itemId].unitPrice) {
                newInboundBudget[itemId] = {
                  itemId: itemId,
                  itemName: expense.itemName || '未知费用项',
                  unitPrice: unitPrice > 0 ? String(unitPrice) : '',
                  quantity: inboundQty,
                  subtotal: unitPrice > 0 ? (unitPrice * inboundQty).toFixed(2) : ''
                };
              }
            });

            // 自动计算总费用（包含多程行程）
            const outboundTotal = Object.values(newOutboundBudget).reduce((sum, item) => {
              return sum + (parseFloat(item.subtotal) || 0);
            }, 0);
            const inboundTotal = Object.values(newInboundBudget).reduce((sum, item) => {
              return sum + (parseFloat(item.subtotal) || 0);
            }, 0);
            const multiCityTotal = (prev.multiCityRoutesBudget || []).reduce((sum, routeBudget) => {
              const routeTotal = Object.values(routeBudget || {}).reduce((routeSum, item) => {
                return routeSum + (parseFloat(item.subtotal) || 0);
              }, 0);
              return sum + routeTotal;
            }, 0);
            const totalCost = outboundTotal + inboundTotal + multiCityTotal;

            return {
              ...prev,
              outboundBudget: newOutboundBudget,
              inboundBudget: newInboundBudget,
              estimatedCost: totalCost > 0 ? String(totalCost.toFixed(2)) : prev.estimatedCost
            };
          });

          showNotification('已自动根据差旅标准填充预算', 'success');
        } else {
          // 如果没有匹配的标准，清空费用项列表
          setMatchedExpenseItems(null);
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
    formData.destination,
    formData.outbound.date, // 出行安排中的去程出发日期
    formData.inbound.date, // 出行安排中的返程出发日期
    user?.jobLevel,
    user?.department,
    formData.costOwingDepartment
  ]);

  // 自动为多程行程匹配差旅标准并填充预算（仅在新增时触发）
  useEffect(() => {
    // 只在新增模式下，且关键信息已填写时自动匹配
    if (isEdit) return; // 编辑模式不自动匹配
    
    // 为每个多程行程自动匹配标准
    const autoMatchMultiCityStandards = async () => {
      if (!matchedExpenseItems || Object.keys(matchedExpenseItems).length === 0) return;
      if (!formData.multiCityRoutes || formData.multiCityRoutes.length === 0) return;

      try {
        // 获取用户职级信息
        const positionLevel = user?.jobLevel || '';
        const department = user?.department || formData.costOwingDepartment || '';

        // 遍历每个多程行程（并行处理）
        await Promise.all(formData.multiCityRoutes.map(async (route, routeIndex) => {
          const destination = route.destination;
          const routeDate = route.date;
          
          if (!destination || !routeDate) return;

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

            // 调用标准匹配API
            const matchResponse = await apiClient.post('/travel-standards/match', {
              country: country || '',
              city: cityName || '',
              cityLevel: cityLevel,
              positionLevel: positionLevel,
              department: department,
              matchStrategy: 'MERGE_BEST'
            });

            if (matchResponse.data && matchResponse.data.success && matchResponse.data.data.matched) {
              const { expenses } = matchResponse.data.data;
              
              // 计算多程行程数量：使用当前多程行程的date字段，从当前出发日期到下一程出发日期的天数
              // 最后一个多程行程到返程的天数，但如果是最后一程（到返程），数量固定为1
              let multiCityQuantity = 1;
              
              // 使用当前多程行程的date字段
              if (route?.date) {
                const currentDate = dayjs.isDayjs(route.date) ? route.date : dayjs(route.date);
                if (currentDate.isValid()) {
                  // 找到下一程的日期（使用下一程的date字段）
                  let nextDate = null;
                  if (routeIndex < formData.multiCityRoutes.length - 1) {
                    // 还有下一程多程行程，使用下一程的date字段计算到下一程的天数
                    const nextRoute = formData.multiCityRoutes[routeIndex + 1];
                    if (nextRoute?.date) {
                      nextDate = dayjs.isDayjs(nextRoute.date) ? nextRoute.date : dayjs(nextRoute.date);
                    }
                  } else if (formData.inbound?.date) {
                    // 这是最后一个多程行程，下一程是返程，使用返程的date字段
                    // 但如果是到返程（最后一程），数量固定为1
                    multiCityQuantity = 1;
                    nextDate = null; // 不需要计算，直接使用1
                  }
                  
                  // 如果找到了下一程日期且不是返程，计算天数
                  if (nextDate && nextDate.isValid() && nextDate.isAfter(currentDate) && routeIndex < formData.multiCityRoutes.length - 1) {
                    multiCityQuantity = Math.max(1, nextDate.diff(currentDate, 'day'));
                  }
                }
              }

              // 更新多程行程预算
              setFormData(prev => {
                const newMultiCityRoutesBudget = [...(prev.multiCityRoutesBudget || [])];
                
                // 确保对应索引的预算对象存在
                if (!newMultiCityRoutesBudget[routeIndex]) {
                  newMultiCityRoutesBudget[routeIndex] = {};
                }
                
                const routeBudget = newMultiCityRoutesBudget[routeIndex];

                // 遍历匹配的费用项
                Object.entries(expenses).forEach(([itemId, expense]) => {
                  // 根据limitType处理费用
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

                  // 根据计算单位确定数量
                  let routeQty = 1;
                  
                  // 判断是否按天计算
                  const isPerDay = expense.unit === '元/天' || expense.unit === 'PER_DAY' || expense.calcUnit === 'PER_DAY';
                  if (isPerDay) {
                    routeQty = multiCityQuantity;
                  }

                  // 初始化或更新预算项（只更新空值，保留用户手动输入的值）
                  if (!routeBudget[itemId] || !routeBudget[itemId].unitPrice) {
                    routeBudget[itemId] = {
                      itemId: itemId,
                      itemName: expense.itemName || '未知费用项',
                      unitPrice: unitPrice > 0 ? String(unitPrice) : '',
                      quantity: routeQty,
                      subtotal: unitPrice > 0 ? (unitPrice * routeQty).toFixed(2) : ''
                    };
                  }
                });

                // 重新计算总费用（包含所有行程）
                const outboundTotal = Object.values(prev.outboundBudget || {}).reduce((sum, item) => {
                  return sum + (parseFloat(item.subtotal) || 0);
                }, 0);
                const inboundTotal = Object.values(prev.inboundBudget || {}).reduce((sum, item) => {
                  return sum + (parseFloat(item.subtotal) || 0);
                }, 0);
                const multiCityTotal = newMultiCityRoutesBudget.reduce((sum, routeBudget) => {
                  const routeTotal = Object.values(routeBudget || {}).reduce((routeSum, item) => {
                    return routeSum + (parseFloat(item.subtotal) || 0);
                  }, 0);
                  return sum + routeTotal;
                }, 0);
                const totalCost = outboundTotal + inboundTotal + multiCityTotal;

                return {
                  ...prev,
                  multiCityRoutesBudget: newMultiCityRoutesBudget,
                  estimatedCost: totalCost > 0 ? String(totalCost.toFixed(2)) : prev.estimatedCost
                };
              });
            }
          } catch (error) {
            console.error(`Auto match standard for multi-city route ${routeIndex} error:`, error);
            // 静默失败，不显示错误提示
          }
        }));
      } catch (error) {
        console.error('Auto match multi-city standards error:', error);
      }
    };

    // 防抖处理，避免频繁调用
    const timeoutId = setTimeout(() => {
      autoMatchMultiCityStandards();
    }, 1000);

    return () => clearTimeout(timeoutId);
  }, [
    isEdit,
    formData.multiCityRoutes,
    matchedExpenseItems,
    user?.jobLevel,
    user?.department,
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
          throw new Error(`无效的差旅申请ID格式: ${cleanId.length !== 24 ? `长度应为24位，实际为${cleanId.length}位` : '包含非法字符'}`);
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
                  itemName: item.itemName || '未知费用项',
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
            multiCityRoutesBudget: (data.multiCityRoutesBudget || []).map(budget => processBudget(budget)),
            currency: data.currency || 'USD',
            estimatedCost: data.estimatedCost !== undefined ? String(data.estimatedCost) : '',
            notes: data.notes || '',
            title: data.title || '',
            purpose: data.purpose || ''
          };
          
          console.log('Fetched travel data:', data);
          console.log('Processed form data:', processedData);
          
          // 如果有预算数据，从预算数据中恢复费用项信息（用于编辑模式）
          if (processedData.outboundBudget && Object.keys(processedData.outboundBudget).length > 0) {
            const expenseItems = {};
            Object.entries(processedData.outboundBudget).forEach(([itemId, item]) => {
              if (item && item.itemName) {
                expenseItems[itemId] = {
                  itemName: item.itemName,
                  limitType: 'FIXED', // 默认类型
                  unit: '元/天', // 默认单位
                  limit: parseFloat(item.unitPrice) || 0
                };
              }
            });
            if (Object.keys(expenseItems).length > 0) {
              setMatchedExpenseItems(expenseItems);
            }
          }
          
          setFormData(processedData);
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
      let errorMessage = '获取差旅数据失败';
      if (error.response) {
        if (error.response.status === 404) {
          errorMessage = '差旅申请不存在或已被删除';
        } else if (error.response.status === 403) {
          errorMessage = '您没有权限查看此差旅申请';
        } else if (error.response.status === 400) {
          errorMessage = error.response.data?.message || '无效的差旅申请ID格式';
        } else if (error.response.data?.message) {
          errorMessage = error.response.data.message;
        } else {
          errorMessage = `服务器错误 (${error.response.status})`;
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
      // 同时添加对应的预算对象
      multiCityRoutesBudget: [...prev.multiCityRoutesBudget, {}]
    }));
  };

  // 删除多程行程
  const removeMultiCityRoute = (index) => {
    setFormData(prev => ({
      ...prev,
      multiCityRoutes: prev.multiCityRoutes.filter((_, i) => i !== index),
      // 同时删除对应的预算对象
      multiCityRoutesBudget: prev.multiCityRoutesBudget.filter((_, i) => i !== index)
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

  // 自动计算费用数量（基于每段行程的date字段）- 适配动态费用项，包含多程行程
  useEffect(() => {
    const calculateBudgetQuantities = () => {
      // 计算去程数量：使用去程的date字段，从去程出发日期到返程出发日期的天数
      let outboundQuantity = 1;
      if (formData.outbound?.date && formData.inbound?.date) {
        // 使用去程行程的date字段
        const outboundDate = dayjs.isDayjs(formData.outbound.date) ? formData.outbound.date : dayjs(formData.outbound.date);
        // 使用返程行程的date字段作为下一程
        const nextDate = dayjs.isDayjs(formData.inbound.date) ? formData.inbound.date : dayjs(formData.inbound.date);
        
        if (outboundDate.isValid() && nextDate.isValid() && nextDate.isAfter(outboundDate)) {
          outboundQuantity = Math.max(1, nextDate.diff(outboundDate, 'day'));
        }
      }

      // 计算返程数量：使用返程的date字段，从返程出发日期到下一程（多程行程）的天数
      // 如果有多程行程，返程的下一程是第一程多程行程；如果没有，返程是最后一程，数量固定为1
      let inboundQuantity = 1;
      if (formData.inbound?.date) {
        const inboundDate = dayjs.isDayjs(formData.inbound.date) ? formData.inbound.date : dayjs(formData.inbound.date);
        
        if (formData.multiCityRoutes && formData.multiCityRoutes.length > 0 && formData.multiCityRoutes[0]?.date) {
          // 如果有多程行程，下一程是第一程多程行程，使用第一程的date字段
          const nextDate = dayjs.isDayjs(formData.multiCityRoutes[0].date) ? formData.multiCityRoutes[0].date : dayjs(formData.multiCityRoutes[0].date);
          
          if (inboundDate.isValid() && nextDate.isValid() && nextDate.isAfter(inboundDate)) {
            inboundQuantity = Math.max(1, nextDate.diff(inboundDate, 'day'));
          }
        } else {
          // 如果没有多程行程，返程是最后一程，数量固定为1
          inboundQuantity = 1;
        }
      }

      // 计算多程行程数量：使用每段多程行程的date字段
      // 每个多程行程从当前出发日期到下一程出发日期的天数
      // 如果是最后一个多程行程，数量固定为1
      const multiCityQuantities = formData.multiCityRoutes.map((route, routeIndex) => {
        // 使用当前多程行程的date字段
        if (!route?.date) return 1;
        
        const currentDate = dayjs.isDayjs(route.date) ? route.date : dayjs(route.date);
        if (!currentDate.isValid()) return 1;
        
        // 找到下一程的日期（使用下一程的date字段）
        let nextDate = null;
        if (routeIndex < formData.multiCityRoutes.length - 1) {
          // 还有下一程多程行程，使用下一程的date字段计算天数
          const nextRoute = formData.multiCityRoutes[routeIndex + 1];
          if (nextRoute?.date) {
            nextDate = dayjs.isDayjs(nextRoute.date) ? nextRoute.date : dayjs(nextRoute.date);
          }
        }
        // 注意：多程行程在返程之后，所以最后一个多程行程是最后一程，数量固定为1
        
        // 如果找到了下一程日期，计算天数
        if (nextDate && nextDate.isValid() && nextDate.isAfter(currentDate)) {
          return Math.max(1, nextDate.diff(currentDate, 'day'));
        }
        
        // 最后一个多程行程，数量固定为1
        return 1;
      });

      // 更新预算数量（根据匹配的费用项信息判断是否需要按天计算）
      if (!matchedExpenseItems) return;

      setFormData(prev => {
        const newOutboundBudget = { ...prev.outboundBudget };
        const newInboundBudget = { ...prev.inboundBudget };
        const newMultiCityRoutesBudget = [...(prev.multiCityRoutesBudget || [])];

        // 遍历所有匹配的费用项
        Object.entries(matchedExpenseItems).forEach(([itemId, expense]) => {
          // 判断是否按天计算
          const isPerDay = expense.unit === '元/天' || expense.unit === 'PER_DAY' || expense.calcUnit === 'PER_DAY';
          
          // 更新去程数量
          if (newOutboundBudget[itemId] && newOutboundBudget[itemId].unitPrice) {
            const quantity = isPerDay ? outboundQuantity : 1;
            newOutboundBudget[itemId].quantity = quantity;
            const unitPrice = parseFloat(newOutboundBudget[itemId].unitPrice) || 0;
            newOutboundBudget[itemId].subtotal = (unitPrice * quantity).toFixed(2);
          }
          
          // 更新返程数量（固定为1或根据isPerDay判断）
          if (newInboundBudget[itemId] && newInboundBudget[itemId].unitPrice) {
            const quantity = isPerDay ? inboundQuantity : 1;
            newInboundBudget[itemId].quantity = quantity;
            const unitPrice = parseFloat(newInboundBudget[itemId].unitPrice) || 0;
            newInboundBudget[itemId].subtotal = (unitPrice * quantity).toFixed(2);
          }

          // 更新多程行程数量
          newMultiCityRoutesBudget.forEach((routeBudget, routeIndex) => {
            if (routeBudget && routeBudget[itemId] && routeBudget[itemId].unitPrice) {
              const quantity = isPerDay ? multiCityQuantities[routeIndex] : 1;
              routeBudget[itemId].quantity = quantity;
              const unitPrice = parseFloat(routeBudget[itemId].unitPrice) || 0;
              routeBudget[itemId].subtotal = (unitPrice * quantity).toFixed(2);
            }
          });
        });

        return {
          ...prev,
          outboundBudget: newOutboundBudget,
          inboundBudget: newInboundBudget,
          multiCityRoutesBudget: newMultiCityRoutesBudget
        };
      });
    };

    // 只在有日期和匹配的费用项时计算
    if ((formData.outbound.date || formData.inbound.date || formData.multiCityRoutes.some(r => r.date)) && matchedExpenseItems) {
      calculateBudgetQuantities();
    }
  }, [formData.outbound.date, formData.inbound.date, formData.multiCityRoutes, matchedExpenseItems]);

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
  const handleBudgetChange = (tripType, itemId, field, value, multiCityRouteIndex = null) => {
    setFormData(prev => {
      const newData = { ...prev };
      
      // 确定使用哪个预算对象
      let budget;
      if (tripType === 'outbound') {
        budget = newData.outboundBudget;
      } else if (tripType === 'inbound') {
        budget = newData.inboundBudget;
      } else if (tripType === 'multiCity' && multiCityRouteIndex !== null) {
        // 多程行程的预算
        if (!newData.multiCityRoutesBudget[multiCityRouteIndex]) {
          newData.multiCityRoutesBudget[multiCityRouteIndex] = {};
        }
        budget = newData.multiCityRoutesBudget[multiCityRouteIndex];
      } else {
        return newData; // 无效的tripType
      }
      
      // 确保费用项存在
      if (!budget[itemId]) {
        budget[itemId] = {
          itemId: itemId,
          itemName: matchedExpenseItems?.[itemId]?.itemName || '未知费用项',
          unitPrice: '',
          quantity: 1,
          subtotal: ''
        };
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
              missingFields.push(`去程${expense.itemName || '未知费用项'}`);
            }
            
            if (!inboundItem || !inboundItem.unitPrice || parseFloat(inboundItem.unitPrice) <= 0) {
              inboundBudgetValid = false;
              missingFields.push(`返程${expense.itemName || '未知费用项'}`);
            }
          });
        } else {
          // 如果没有匹配的费用项，标记为未完成
          outboundBudgetValid = false;
          inboundBudgetValid = false;
          missingFields.push('费用项目（请先填写目的地和出发日期以匹配差旅标准）');
        }
        
        const costValid = outboundBudgetValid && inboundBudgetValid;
        
        if (costValid) {
      newCompletedSteps.push(2);
      newValidationResults.push({
            message: '费用预算设置完整',
        status: 'valid'
      });
    } else {
          newErrorSteps.push(2);
      newValidationResults.push({
            message: `请完善费用预算：${missingFields.slice(0, 5).join('、')}${missingFields.length > 5 ? '...' : ''}`,
        status: 'error'
      });
    }


    setCompletedSteps(newCompletedSteps);
    setErrorSteps(newErrorSteps);
    setValidationResults(newValidationResults);
  };


  const validateForm = () => {
    const newErrors = {};

    // 辅助函数：检查Location字段是否有值（可能是字符串或对象）
    const hasLocationValue = (val) => {
      if (!val) return false;
      if (typeof val === 'string') return val.trim().length > 0;
      if (typeof val === 'object') return val.name || val.city || val.id;
      return false;
    };

    // 基本信息验证
    if (!formData.tripType) {
      newErrors.tripType = '请选择行程类型';
    }

    if (!formData.costOwingDepartment) {
      newErrors.costOwingDepartment = '请选择费用承担部门';
    }

    if (!hasLocationValue(formData.destination)) {
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

    if (!formData.outbound.transportation) {
      newErrors.outboundTransportation = '请选择去程交通工具';
    }

    if (!hasLocationValue(formData.outbound.departure)) {
      newErrors.outboundDeparture = '请选择去程出发地';
    }

    if (!hasLocationValue(formData.outbound.destination)) {
      newErrors.outboundDestination = '请选择去程目的地';
    }

    // 返程信息验证
    if (!formData.inbound.date) {
      newErrors.inboundDate = '请选择返程日期';
    }

    if (!formData.inbound.transportation) {
      newErrors.inboundTransportation = '请选择返程交通工具';
    }

    if (!hasLocationValue(formData.inbound.departure)) {
      newErrors.inboundDeparture = '请选择返程出发地';
    }

    if (!hasLocationValue(formData.inbound.destination)) {
      newErrors.inboundDestination = '请选择返程目的地';
    }

    // 日期逻辑验证
    if (formData.startDate && formData.endDate && 
        formData.startDate.isAfter(formData.endDate)) {
      newErrors.endDate = '返回日期不能早于出发日期';
    }

      // 计算estimatedCost（如果未设置）
      let calculatedCost = formData.estimatedCost;
      if (!calculatedCost || isNaN(calculatedCost) || parseFloat(calculatedCost) <= 0) {
        // 计算总费用：去程 + 返程 + 所有多程行程
        const outboundTotal = Object.values(formData.outboundBudget).reduce((sum, item) => {
          return sum + (parseFloat(item.subtotal) || 0);
        }, 0);
        const inboundTotal = Object.values(formData.inboundBudget).reduce((sum, item) => {
          return sum + (parseFloat(item.subtotal) || 0);
        }, 0);
        const multiCityTotal = (formData.multiCityRoutesBudget || []).reduce((sum, routeBudget) => {
          const routeTotal = Object.values(routeBudget || {}).reduce((routeSum, item) => {
            return routeSum + (parseFloat(item.subtotal) || 0);
          }, 0);
          return sum + routeTotal;
        }, 0);
        calculatedCost = outboundTotal + inboundTotal + multiCityTotal;
      }

    // 费用验证（如果计算后的费用仍为0，则报错）
    if (!calculatedCost || isNaN(calculatedCost) || parseFloat(calculatedCost) <= 0) {
      newErrors.estimatedCost = '请填写费用预算或确保预算项目已填写';
    }

    setErrors(newErrors);
    
    // 如果有错误，显示提示
    if (Object.keys(newErrors).length > 0) {
      const errorMessages = Object.values(newErrors).join('、');
      showNotification(`请完善以下信息：${errorMessages}`, 'error');
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
        // 计算总费用：去程 + 返程 + 所有多程行程
        const outboundTotal = Object.values(formData.outboundBudget).reduce((sum, item) => {
          return sum + (parseFloat(item.subtotal) || 0);
        }, 0);
        const inboundTotal = Object.values(formData.inboundBudget).reduce((sum, item) => {
          return sum + (parseFloat(item.subtotal) || 0);
        }, 0);
        const multiCityTotal = (formData.multiCityRoutesBudget || []).reduce((sum, routeBudget) => {
          const routeTotal = Object.values(routeBudget || {}).reduce((routeSum, item) => {
            return routeSum + (parseFloat(item.subtotal) || 0);
          }, 0);
          return sum + routeTotal;
        }, 0);
        calculatedCost = outboundTotal + inboundTotal + multiCityTotal;
      }
      
      // 准备提交数据，转换dayjs对象为ISO字符串，转换Location对象为字符串
      const submitData = {
        ...formData,
        status,
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
        multiCityRoutesBudget: formData.multiCityRoutesBudget || [],
        estimatedCost: parseFloat(calculatedCost) || 0
      };
      
      // 新建时，不发送 travelNumber 字段，让后端自动生成
      if (!isEdit) {
        delete submitData.travelNumber;
      }
      
      console.log('提交数据:', submitData);

      let response;
      if (isEdit) {
        // 更新现有申请
        response = await apiClient.put(`/travel/${id}`, submitData);
      } else {
        // 创建新申请
        response = await apiClient.post('/travel', submitData);
      }

      if (response.data && response.data.success) {
        showNotification(
          status === 'draft' 
            ? (isEdit ? '差旅申请已更新为草稿' : '差旅申请已保存为草稿')
            : (isEdit ? '差旅申请已提交' : '差旅申请已创建并提交'),
          'success'
        );
        
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
      
      let errorMessage = isEdit ? '更新差旅申请失败' : '保存差旅申请失败';
      if (error.response) {
        if (error.response.status === 404) {
          errorMessage = 'API路由未找到，请检查后端服务器是否正常运行';
        } else if (error.response.status === 401) {
          errorMessage = '未授权，请重新登录';
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
                📏 距离信息：{typeof formData.outbound.departure === 'string' ? formData.outbound.departure : (formData.outbound.departure?.name || `${formData.outbound.departure?.city || ''}, ${formData.outbound.departure?.country || ''}`.trim() || '未选择')} → {typeof formData.outbound.destination === 'string' ? formData.outbound.destination : (formData.outbound.destination?.name || `${formData.outbound.destination?.city || ''}, ${formData.outbound.destination?.country || ''}`.trim() || '未选择')} 
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
                <Typography variant="body1">
                  {typeof formData.outbound.departure === 'string' 
                    ? formData.outbound.departure 
                    : (formData.outbound.departure?.name || `${formData.outbound.departure?.city || ''}, ${formData.outbound.departure?.country || ''}`.trim() || '未选择')}
                </Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="body2" color="text.secondary">To:</Typography>
                <Typography variant="body1">
                  {typeof formData.outbound.destination === 'string' 
                    ? formData.outbound.destination 
                    : (formData.outbound.destination?.name || `${formData.outbound.destination?.city || ''}, ${formData.outbound.destination?.country || ''}`.trim() || '未选择')}
                </Typography>
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

        {/* 去程费用项目 - 动态渲染 */}
        {matchedExpenseItems && Object.keys(matchedExpenseItems).length > 0 ? (
          (() => {
            // 将费用项排序，"其他费用"排在最后
            // 识别所有包含"其他"的费用项（支持中文和英文）
            // parentItem不为空（不是null、undefined或"No field"）的才是其他费用项（子费用项）
            const isOtherExpense = (expense) => {
              if (!expense) return false;
              
              // 检查category字段
              if (expense.category === 'other') {
                return true;
              }
              
              // 检查parentItem字段：必须存在且不为null（有有效的ObjectId）
              // "No field"在数据库中表现为undefined或null，所以需要明确检查
              if (expense.parentItem !== null && expense.parentItem !== undefined && expense.parentItem !== 'No field') {
                // 如果是ObjectId字符串（以ObjectId开头或包含有效的24位hex字符）或者是对象，则认为是其他费用项
                const parentItemStr = typeof expense.parentItem === 'string' 
                  ? expense.parentItem 
                  : (expense.parentItem?.toString?.() || '');
                if (parentItemStr && parentItemStr !== 'null' && parentItemStr !== 'No field') {
                  return true;
                }
              }
              
              // 检查名称
              const itemName = expense.itemName || '';
              if (!itemName) return false;
              const name = itemName.toLowerCase();
              return name.includes('其他') || 
                     name.includes('other') || 
                     name.includes('其它') ||
                     name.startsWith('其他') ||
                     name.endsWith('其他');
            };
            
            const expenseEntries = Object.entries(matchedExpenseItems);
            const sortedExpenses = expenseEntries.sort((a, b) => {
              const expenseA = a[1];
              const expenseB = b[1];
              const isOtherA = isOtherExpense(expenseA);
              const isOtherB = isOtherExpense(expenseB);
              
              // 如果A是其他费用，B不是，A排在后面
              if (isOtherA && !isOtherB) return 1;
              // 如果B是其他费用，A不是，B排在后面
              if (isOtherB && !isOtherA) return -1;
              // 如果都是其他费用或都不是其他费用，保持原顺序
              return 0;
            });
            
            return sortedExpenses.map(([itemId, expense]) => {
            const budgetItem = formData.outboundBudget[itemId] || {
              itemId: itemId,
              itemName: expense.itemName || '未知费用项',
              unitPrice: '',
              quantity: 1,
              subtotal: ''
            };
            
            // 根据费用项名称或单位判断图标和标签
            const getExpenseIcon = (itemName, unit) => {
              const name = itemName.toLowerCase();
              if (name.includes('机票') || name.includes('航班') || name.includes('flight') || name.includes('飞机')) {
                return '✈️';
              } else if (name.includes('住宿') || name.includes('酒店') || name.includes('accommodation')) {
                return '🏨';
              } else if (name.includes('交通') || name.includes('transport')) {
                return '🚗';
              } else if (name.includes('接送') || name.includes('transfer')) {
                return '🚌';
              } else if (name.includes('补助') || name.includes('津贴') || name.includes('allowance')) {
                return '💰';
              }
              return '💵';
            };
            
            const getUnitLabel = (unit, itemName) => {
              if (unit === '元/天' || unit === 'PER_DAY') {
                if (itemName.includes('住宿') || itemName.includes('酒店')) {
                  return '单价/晚';
                }
                return '单价/天';
              } else if (unit === '元/次' || unit === 'PER_TRIP') {
                return '单价/次';
              } else if (unit === '元/公里' || unit === 'PER_KM') {
                return '单价/公里';
              }
              return '单价';
            };
            
            const isPerDay = expense.unit === '元/天' || expense.unit === 'PER_DAY' || expense.calcUnit === 'PER_DAY';
            
            // 生成具体的计算提示
            const unitPriceValue = parseFloat(budgetItem.unitPrice) || 0;
            const quantityValue = parseInt(budgetItem.quantity) || 0;
            const subtotalValue = parseFloat(budgetItem.subtotal) || 0;
            let calculationText = '';
            if (unitPriceValue > 0 && quantityValue > 0 && subtotalValue > 0) {
              calculationText = `${subtotalValue.toFixed(2)}=${unitPriceValue}×${quantityValue}。该金额只可向下调整。`;
            } else {
              calculationText = '费用计算规则：总费用=差旅标准×天数。该金额只可向下调整。';
            }
            
            return (
              <Grid item xs={12} key={itemId}>
                <ModernExpenseItem
                  tripType="outbound"
                  category={itemId}
                  label={expense.itemName || '未知费用项'}
                  icon={getExpenseIcon(expense.itemName, expense.unit)}
                  unitLabel={getUnitLabel(expense.unit, expense.itemName)}
                  unitPrice={budgetItem.unitPrice}
                  quantity={budgetItem.quantity}
                  subtotal={budgetItem.subtotal}
                  currency={formData.currency}
                  onUnitPriceChange={(e) => handleBudgetChange('outbound', itemId, 'unitPrice', e.target.value)}
                  onQuantityChange={(e) => handleBudgetChange('outbound', itemId, 'quantity', e.target.value)}
                  showInfo={true}
                  infoText={calculationText}
                  quantityDisabled={true}
                />
              </Grid>
            );
            });
          })()
        ) : (
          <Grid item xs={12}>
            <Alert severity="info">
              请先填写目的地和出发日期，系统将自动匹配差旅标准并显示费用项目
            </Alert>
          </Grid>
        )}

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
                    <Typography variant="body1">
                      {typeof formData.inbound.departure === 'string' 
                        ? formData.inbound.departure 
                        : (formData.inbound.departure?.name || `${formData.inbound.departure?.city || ''}, ${formData.inbound.departure?.country || ''}`.trim() || '未选择')}
                    </Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="body2" color="text.secondary">To:</Typography>
                    <Typography variant="body1">
                      {typeof formData.inbound.destination === 'string' 
                        ? formData.inbound.destination 
                        : (formData.inbound.destination?.name || `${formData.inbound.destination?.city || ''}, ${formData.inbound.destination?.country || ''}`.trim() || '未选择')}
                    </Typography>
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

            {/* 返程费用项目 - 动态渲染 */}
            {matchedExpenseItems && Object.keys(matchedExpenseItems).length > 0 ? (
              (() => {
                // 将费用项排序，"其他费用"排在最后
                // 识别所有包含"其他"的费用项（支持中文和英文）
                // parentItem不为空（不是null、undefined或"No field"）的才是其他费用项（子费用项）
                const isOtherExpense = (expense) => {
                  if (!expense) return false;
                  
                  // 检查category字段
                  if (expense.category === 'other') {
                    return true;
                  }
                  
                  // 检查parentItem字段：必须存在且不为null（有有效的ObjectId）
                  // "No field"在数据库中表现为undefined或null，所以需要明确检查
                  if (expense.parentItem !== null && expense.parentItem !== undefined && expense.parentItem !== 'No field') {
                    // 如果是ObjectId字符串（以ObjectId开头或包含有效的24位hex字符）或者是对象，则认为是其他费用项
                    const parentItemStr = typeof expense.parentItem === 'string' 
                      ? expense.parentItem 
                      : (expense.parentItem?.toString?.() || '');
                    if (parentItemStr && parentItemStr !== 'null' && parentItemStr !== 'No field') {
                      return true;
                    }
                  }
                  
                  // 检查名称
                  const itemName = expense.itemName || '';
                  if (!itemName) return false;
                  const name = itemName.toLowerCase();
                  return name.includes('其他') || 
                         name.includes('other') || 
                         name.includes('其它') ||
                         name.startsWith('其他') ||
                         name.endsWith('其他');
                };
                
                const expenseEntries = Object.entries(matchedExpenseItems);
                const sortedExpenses = expenseEntries.sort((a, b) => {
                  const expenseA = a[1];
                  const expenseB = b[1];
                  const isOtherA = isOtherExpense(expenseA);
                  const isOtherB = isOtherExpense(expenseB);
                  
                  // 如果A是其他费用，B不是，A排在后面
                  if (isOtherA && !isOtherB) return 1;
                  // 如果B是其他费用，A不是，B排在后面
                  if (isOtherB && !isOtherA) return -1;
                  // 如果都是其他费用或都不是其他费用，保持原顺序
                  return 0;
                });
                
                return sortedExpenses.map(([itemId, expense]) => {
                const budgetItem = formData.inboundBudget[itemId] || {
                  itemId: itemId,
                  itemName: expense.itemName || '未知费用项',
                  unitPrice: '',
                  quantity: 1,
                  subtotal: ''
                };
                
                // 根据费用项名称或单位判断图标和标签（与去程相同的逻辑）
                const getExpenseIcon = (itemName, unit) => {
                  const name = itemName.toLowerCase();
                  if (name.includes('机票') || name.includes('航班') || name.includes('flight') || name.includes('飞机')) {
                    return '✈️';
                  } else if (name.includes('住宿') || name.includes('酒店') || name.includes('accommodation')) {
                    return '🏨';
                  } else if (name.includes('交通') || name.includes('transport')) {
                    return '🚗';
                  } else if (name.includes('接送') || name.includes('transfer')) {
                    return '🚌';
                  } else if (name.includes('补助') || name.includes('津贴') || name.includes('allowance')) {
                    return '💰';
                  }
                  return '💵';
                };
                
                const getUnitLabel = (unit, itemName) => {
                  if (unit === '元/天' || unit === 'PER_DAY') {
                    if (itemName.includes('住宿') || itemName.includes('酒店')) {
                      return '单价/晚';
                    }
                    return '单价/天';
                  } else if (unit === '元/次' || unit === 'PER_TRIP') {
                    return '单价/次';
                  } else if (unit === '元/公里' || unit === 'PER_KM') {
                    return '单价/公里';
                  }
                  return '单价';
                };
                
                const isPerDay = expense.unit === '元/天' || expense.unit === 'PER_DAY' || expense.calcUnit === 'PER_DAY';
                
                // 生成具体的计算提示
                const unitPriceValue = parseFloat(budgetItem.unitPrice) || 0;
                const quantityValue = parseInt(budgetItem.quantity) || 0;
                const subtotalValue = parseFloat(budgetItem.subtotal) || 0;
                let calculationText = '';
                if (unitPriceValue > 0 && quantityValue > 0 && subtotalValue > 0) {
                  calculationText = `${subtotalValue.toFixed(2)}=${unitPriceValue}×${quantityValue}。该金额只可向下调整。`;
                } else {
                  calculationText = '费用计算规则：总费用=差旅标准×天数。该金额只可向下调整。';
                }
                
                return (
                  <Grid item xs={12} key={itemId}>
                    <ModernExpenseItem
                      tripType="inbound"
                      category={itemId}
                      label={expense.itemName || '未知费用项'}
                      icon={getExpenseIcon(expense.itemName, expense.unit)}
                      unitLabel={getUnitLabel(expense.unit, expense.itemName)}
                      unitPrice={budgetItem.unitPrice}
                      quantity={budgetItem.quantity}
                      subtotal={budgetItem.subtotal}
                      currency={formData.currency}
                      onUnitPriceChange={(e) => handleBudgetChange('inbound', itemId, 'unitPrice', e.target.value)}
                      onQuantityChange={(e) => handleBudgetChange('inbound', itemId, 'quantity', e.target.value)}
                      showInfo={true}
                      infoText={calculationText}
                      quantityDisabled={true}
                    />
                  </Grid>
                );
                });
              })()
            ) : (
              <Grid item xs={12}>
                <Alert severity="info">
                  请先填写目的地和出发日期，系统将自动匹配差旅标准并显示费用项目
                </Alert>
              </Grid>
            )}
          </>

        {/* 多程行程费用预算 */}
        {formData.multiCityRoutes.map((route, routeIndex) => {
          // 确保对应的预算对象存在
          if (!formData.multiCityRoutesBudget[routeIndex]) {
            formData.multiCityRoutesBudget[routeIndex] = {};
          }
          const routeBudget = formData.multiCityRoutesBudget[routeIndex];
          
          return (
            <React.Fragment key={routeIndex}>
              <Grid item xs={12}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2, mt: 4 }}>
                  <Typography variant="h5" sx={{ color: 'primary.main' }}>
                    第{routeIndex + 3}程
                  </Typography>
                  <Typography variant="h6" color="primary">
                    {formData.currency} {(() => {
                      const total = Object.values(routeBudget || {}).reduce((sum, item) => {
                        return sum + (parseFloat(item.subtotal) || 0);
                      }, 0);
                      return total.toFixed(2);
                    })()}
                  </Typography>
                </Box>
                
                {/* 多程行程信息 */}
                <Box sx={{ mb: 3, p: 2, backgroundColor: '#f5f5f5', borderRadius: 2 }}>
                  <Grid container spacing={2}>
                    <Grid item xs={6}>
                      <Typography variant="body2" color="text.secondary">From:</Typography>
                      <Typography variant="body1">
                        {typeof route.departure === 'string' 
                          ? route.departure 
                          : (route.departure?.name || `${route.departure?.city || ''}, ${route.departure?.country || ''}`.trim() || '未选择')}
                      </Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="body2" color="text.secondary">To:</Typography>
                      <Typography variant="body1">
                        {typeof route.destination === 'string' 
                          ? route.destination 
                          : (route.destination?.name || `${route.destination?.city || ''}, ${route.destination?.country || ''}`.trim() || '未选择')}
                      </Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="body2" color="text.secondary">Date:</Typography>
                      <Typography variant="body1">
                        {route.date ? route.date.format('YYYY-MM-DD') : '未选择'}
                      </Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="body2" color="text.secondary">Transportation:</Typography>
                      <Typography variant="body1">
                        {route.transportation || '未选择'}
                      </Typography>
                    </Grid>
                  </Grid>
                </Box>
              </Grid>

              {/* 多程行程费用项目 - 动态渲染 */}
              {matchedExpenseItems && Object.keys(matchedExpenseItems).length > 0 ? (
                (() => {
                  // 将费用项排序，"其他费用"排在最后
                  const isOtherExpense = (expense) => {
                    if (!expense) return false;
                    if (expense.category === 'other') return true;
                    if (expense.parentItem !== null && expense.parentItem !== undefined && expense.parentItem !== 'No field') {
                      const parentItemStr = typeof expense.parentItem === 'string' 
                        ? expense.parentItem 
                        : (expense.parentItem?.toString?.() || '');
                      if (parentItemStr && parentItemStr !== 'null' && parentItemStr !== 'No field') {
                        return true;
                      }
                    }
                    const itemName = expense.itemName || '';
                    if (!itemName) return false;
                    const name = itemName.toLowerCase();
                    return name.includes('其他') || 
                           name.includes('other') || 
                           name.includes('其它') ||
                           name.startsWith('其他') ||
                           name.endsWith('其他');
                  };
                  
                  const expenseEntries = Object.entries(matchedExpenseItems);
                  const sortedExpenses = expenseEntries.sort((a, b) => {
                    const expenseA = a[1];
                    const expenseB = b[1];
                    const isOtherA = isOtherExpense(expenseA);
                    const isOtherB = isOtherExpense(expenseB);
                    if (isOtherA && !isOtherB) return 1;
                    if (isOtherB && !isOtherA) return -1;
                    return 0;
                  });
                  
                  return sortedExpenses.map(([itemId, expense]) => {
                    const budgetItem = routeBudget[itemId] || {
                      itemId: itemId,
                      itemName: expense.itemName || '未知费用项',
                      unitPrice: '',
                      quantity: 1,
                      subtotal: ''
                    };
                    
                    const getExpenseIcon = (itemName, unit) => {
                      const name = itemName.toLowerCase();
                      if (name.includes('机票') || name.includes('航班') || name.includes('flight') || name.includes('飞机')) {
                        return '✈️';
                      } else if (name.includes('住宿') || name.includes('酒店') || name.includes('accommodation')) {
                        return '🏨';
                      } else if (name.includes('交通') || name.includes('transport')) {
                        return '🚗';
                      } else if (name.includes('接送') || name.includes('transfer')) {
                        return '🚌';
                      } else if (name.includes('补助') || name.includes('津贴') || name.includes('allowance')) {
                        return '💰';
                      }
                      return '💵';
                    };
                    
                    const getUnitLabel = (unit, itemName) => {
                      if (unit === '元/天' || unit === 'PER_DAY') {
                        if (itemName.includes('住宿') || itemName.includes('酒店')) {
                          return '单价/晚';
                        }
                        return '单价/天';
                      } else if (unit === '元/次' || unit === 'PER_TRIP') {
                        return '单价/次';
                      } else if (unit === '元/公里' || unit === 'PER_KM') {
                        return '单价/公里';
                      }
                      return '单价';
                    };
                    
                    const unitPriceValue = parseFloat(budgetItem.unitPrice) || 0;
                    const quantityValue = parseInt(budgetItem.quantity) || 0;
                    const subtotalValue = parseFloat(budgetItem.subtotal) || 0;
                    let calculationText = '';
                    if (unitPriceValue > 0 && quantityValue > 0 && subtotalValue > 0) {
                      calculationText = `${subtotalValue.toFixed(2)}=${unitPriceValue}×${quantityValue}。该金额只可向下调整。`;
                    } else {
                      calculationText = '费用计算规则：总费用=差旅标准×天数。该金额只可向下调整。';
                    }
                    
                    return (
                      <Grid item xs={12} key={itemId}>
                        <ModernExpenseItem
                          tripType="multiCity"
                          category={itemId}
                          label={expense.itemName || '未知费用项'}
                          icon={getExpenseIcon(expense.itemName, expense.unit)}
                          unitLabel={getUnitLabel(expense.unit, expense.itemName)}
                          unitPrice={budgetItem.unitPrice}
                          quantity={budgetItem.quantity}
                          subtotal={budgetItem.subtotal}
                          currency={formData.currency}
                          onUnitPriceChange={(e) => handleBudgetChange('multiCity', itemId, 'unitPrice', e.target.value, routeIndex)}
                          onQuantityChange={(e) => handleBudgetChange('multiCity', itemId, 'quantity', e.target.value, routeIndex)}
                          showInfo={true}
                          infoText={calculationText}
                          quantityDisabled={true}
                        />
                      </Grid>
                    );
                  });
                })()
              ) : (
                <Grid item xs={12}>
                  <Alert severity="info">
                    请先填写目的地和出发日期，系统将自动匹配差旅标准并显示费用项目
                  </Alert>
                </Grid>
              )}
            </React.Fragment>
          );
        })}
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

