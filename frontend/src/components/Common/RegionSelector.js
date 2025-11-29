/**
 * 地区选择器组件 - 基于携程API的地理位置服务
 * 支持机场、火车站、城市的搜索和选择
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import ReactDOM from 'react-dom';
import {
  Box,
  TextField,
  Paper,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Typography,
  Chip,
  InputAdornment,
  IconButton,
  useTheme,
  alpha,
  Divider,
  CircularProgress,
  Alert
} from '@mui/material';
import { styled, keyframes } from '@mui/material/styles';
import SearchIcon from '@mui/icons-material/Search';
import ClearIcon from '@mui/icons-material/Clear';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import FlightIcon from '@mui/icons-material/Flight';
import TrainIcon from '@mui/icons-material/Train';
import LocationCityIcon from '@mui/icons-material/LocationCity';
import { searchLocations } from '../../services/locationService';
import apiClient from '../../utils/axiosConfig';

// 拼音映射表（用于中文搜索）
const pinyinMap = {
  '北京': 'beijing',
  '上海': 'shanghai',
  '广州': 'guangzhou',
  '深圳': 'shenzhen',
  '杭州': 'hangzhou',
  '南京': 'nanjing',
  '成都': 'chengdu',
  '武汉': 'wuhan',
  '西安': 'xian',
  '重庆': 'chongqing',
  '天津': 'tianjin',
  '苏州': 'suzhou',
  '青岛': 'qingdao',
  '长沙': 'changsha',
  '大连': 'dalian',
  '厦门': 'xiamen',
  '无锡': 'wuxi',
  '福州': 'fuzhou',
  '济南': 'jinan',
  '宁波': 'ningbo'
};

// 样式化组件
const StyledTextField = styled(TextField)(({ theme }) => ({
  '& .MuiOutlinedInput-root': {
    minHeight: 56,
    borderRadius: 8,
    backgroundColor: '#ffffff',
    fontSize: 16,
    fontFamily: 'Inter, Roboto, Helvetica, Arial, sans-serif',
    lineHeight: 1.5,
    letterSpacing: '0.00938em',
    '& .MuiOutlinedInput-notchedOutline': {
      borderColor: '#d1d5db',
      borderWidth: '1px',
      borderRadius: 8,
    },
    '&:hover .MuiOutlinedInput-notchedOutline': {
      borderColor: '#3b82f6',
      borderWidth: '2px',
    },
    '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
      borderColor: '#2563eb',
      borderWidth: '2px',
      boxShadow: '0 0 0 3px rgba(37, 99, 235, 0.1)',
    },
    '&.Mui-error .MuiOutlinedInput-notchedOutline': {
      borderColor: '#dc2626',
      borderWidth: '2px',
    },
  },
  '& .MuiInputLabel-root': {
    fontSize: 16,
    fontWeight: 500,
    color: '#6b7280',
  },
  '& .MuiInputLabel-root.Mui-focused': {
    color: '#2563eb',
  },
}));

// 高风险提示动画
const pulse = keyframes`
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.7;
  }
`;

const DropdownPaper = styled(Paper)(({ theme }) => ({
  position: 'absolute',
  zIndex: 1300,
  minWidth: 300,
  maxWidth: 'calc(100vw - 40px)',
  maxHeight: 'calc(100vh - 100px)', // 限制最大高度，留出边距
  overflowX: 'hidden',
  overflowY: 'auto', // 添加垂直滚动
  boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
  borderRadius: 8,
  border: '1px solid #e5e7eb',
  // 自定义滚动条样式
  '&::-webkit-scrollbar': {
    width: '6px',
  },
  '&::-webkit-scrollbar-track': {
    background: '#f1f1f1',
    borderRadius: '3px',
  },
  '&::-webkit-scrollbar-thumb': {
    background: '#c1c1c1',
    borderRadius: '3px',
    '&:hover': {
      background: '#a8a8a8',
    },
  },
}));

const RegionSelector = ({
  label = '选择地区',
  value = '',
  onChange = () => {},
  placeholder = '搜索城市、机场或火车站',
  error = false,
  helperText = '',
  required = false,
  disabled = false,
  transportationType = null // 新增：交通工具类型，用于过滤数据
}) => {
  const theme = useTheme();
  const [searchValue, setSearchValue] = useState('');
  const [filteredLocations, setFilteredLocations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState(null);
  
  const inputRef = useRef(null);
  const dropdownRef = useRef(null);

  // 初始化显示值
  useEffect(() => {
    if (value) {
      // 如果value是字符串，直接显示
      if (typeof value === 'string') {
        setSearchValue(value);
        setSelectedLocation(null); // 稍后通过搜索匹配
      } 
      // 如果value是对象
      else if (typeof value === 'object' && value !== null) {
        setSelectedLocation(value);
        // 汽车站不显示编码
        const displayValue = value.type === 'bus' 
          ? value.name 
          : `${value.name}${value.code ? ` (${value.code})` : ''}`;
        setSearchValue(displayValue);
      }
    } else {
      setSearchValue('');
      setSelectedLocation(null);
    }
  }, [value]);

  // 根据交通工具类型生成动态placeholder
  const getDynamicPlaceholder = () => {
    if (!transportationType) {
      return placeholder;
    }
    
    switch (transportationType) {
      case 'flight':
        return '搜索机场或城市';
      case 'train':
        return '搜索火车站或城市';
      case 'car':
      case 'bus':
        return '搜索城市';
      default:
        return placeholder;
    }
  };

  // 从后端API搜索地理位置数据（按需搜索，提升性能）
  const searchLocationsFromAPI = useCallback(async (keyword) => {
    if (!keyword || keyword.trim().length < 1) {
      setFilteredLocations([]);
      return;
    }

    console.log('[RegionSelector] transportationType:', transportationType);
    console.log('[RegionSelector] 搜索关键词:', keyword);

    setLoading(true);
    setErrorMessage('');
    
    try {
      // 构建查询参数
      const params = {
        status: 'active',
        search: keyword.trim(),
        page: 1,
        limit: 50 // 限制返回50条结果
      };

      // 根据交通工具类型添加过滤
      if (transportationType) {
        console.log('[RegionSelector] 设置了transportationType过滤:', transportationType);
        switch (transportationType) {
          case 'flight':
            params.type = 'airport'; // 先搜索机场，城市会在结果中自然包含
            break;
          case 'train':
            params.type = 'station'; // 先搜索火车站
            break;
          case 'car':
          case 'bus':
            params.type = 'city'; // 只搜索城市
            break;
        }
      }

      console.log('[RegionSelector] 请求参数:', params);
      const response = await apiClient.get('/locations', { params });
      
      if (!response.data || !response.data.success) {
        throw new Error(response.data?.message || '搜索地理位置数据失败');
      }
      
      const locations = response.data.data || [];
      console.log('[RegionSelector] 后端返回的数据数量:', locations.length);
      console.log('[RegionSelector] 后端返回的数据类型分布:', {
        city: locations.filter(l => l.type === 'city').length,
        airport: locations.filter(l => l.type === 'airport').length,
        station: locations.filter(l => l.type === 'station').length,
        bus: locations.filter(l => l.type === 'bus').length
      });
      
      // 验证并转换数据结构
      const validLocations = locations
        .filter(location => 
          location && 
          typeof location === 'object' && 
          location.name
        )
        .map(location => ({
          // 保留原有字段
          id: location._id || location.id,
          _id: location._id || location.id,
          name: location.name,
          code: location.code || '',
          type: location.type || 'city',
          city: location.city || '',
          province: location.province || '',
          district: location.district || '',
          county: location.county || '',
          country: location.country || '中国',
          countryCode: location.countryCode || '',
          enName: location.enName || '',
          pinyin: location.pinyin || '',
          coordinates: location.coordinates || { latitude: 0, longitude: 0 },
          timezone: location.timezone || 'Asia/Shanghai',
          status: location.status || 'active',
          // 处理parentId（可能是ObjectId或对象）
          parentId: location.parentId?._id || location.parentId?.toString() || location.parentId || null,
          parentCity: location.parentId?.name || null,
          // 风险等级和无机场标识（仅城市）
          riskLevel: location.riskLevel || 'low',
          noAirport: location.noAirport || false
        }));

      // 找出搜索到的城市ID（用于查询关联的机场和火车站）
      const cityIds = validLocations
        .filter(loc => loc.type === 'city' && (loc._id || loc.id))
        .map(loc => loc._id || loc.id);

      console.log('[RegionSelector] 搜索到的城市ID:', cityIds);
      console.log('[RegionSelector] 搜索到的城市:', validLocations.filter(loc => loc.type === 'city'));

      // 查询这些城市下的机场和火车站（通过parentId关联）
      let childrenLocations = [];
      if (cityIds.length > 0) {
        try {
          // 并行查询所有城市下的子项
          const childrenPromises = cityIds.map(cityId => {
            const url = `/locations/parent/${cityId}`;
            console.log(`[RegionSelector] 查询城市 ${cityId} 下的子项: ${url}`);
            return apiClient.get(url).catch(err => {
              console.error(`[RegionSelector] 查询城市 ${cityId} 下的子项失败:`, err);
              console.error(`[RegionSelector] 错误详情:`, {
                message: err.message,
                response: err.response?.data,
                status: err.response?.status,
                url: err.config?.url
              });
              return { data: { success: false, data: [] } };
            });
          });
          
          const childrenResponses = await Promise.all(childrenPromises);
          console.log('[RegionSelector] 子项查询响应:', childrenResponses);
          
          // 合并所有子项
          childrenResponses.forEach((response, index) => {
            if (response.data && response.data.success && response.data.data) {
              console.log(`[RegionSelector] 城市 ${cityIds[index]} 下的子项数量:`, response.data.data.length);
              const children = response.data.data
                .filter(location => 
                  location && 
                  typeof location === 'object' && 
                  location.name
                )
                .map(location => ({
                  id: location._id || location.id,
                  _id: location._id || location.id,
                  name: location.name,
                  code: location.code || '',
                  type: location.type || 'city',
                  city: location.city || '',
                  province: location.province || '',
                  district: location.district || '',
                  county: location.county || '',
                  country: location.country || '中国',
                  countryCode: location.countryCode || '',
                  enName: location.enName || '',
                  pinyin: location.pinyin || '',
                  coordinates: location.coordinates || { latitude: 0, longitude: 0 },
                  timezone: location.timezone || 'Asia/Shanghai',
                  status: location.status || 'active',
                  parentId: location.parentId?._id || location.parentId?.toString() || location.parentId || null,
                  parentCity: location.parentId?.name || null,
                  riskLevel: location.riskLevel || 'low',
                  noAirport: location.noAirport || false
                }));
              
              childrenLocations.push(...children);
            } else {
              console.warn(`[RegionSelector] 城市 ${cityIds[index]} 的查询响应无效:`, response.data);
            }
          });
          
          console.log('[RegionSelector] 查询到的子项总数:', childrenLocations.length);
        } catch (childrenError) {
          console.error('[RegionSelector] 查询城市下的子项失败:', childrenError);
        }
      } else {
        console.log('[RegionSelector] 没有搜索到城市，跳过子项查询');
      }

      // 如果指定了交通工具类型，需要额外获取城市数据（用于飞机/火车）
      // 注意：必须在查询子项之前获取城市，这样才能查询到城市下的机场/火车站
      let additionalCities = [];
      if (transportationType === 'flight' || transportationType === 'train') {
        // 对于飞机和火车，还需要搜索匹配的城市
        const cityParams = {
          status: 'active',
          search: keyword.trim(),
          type: 'city',
          page: 1,
          limit: 20
        };
        
        try {
          const cityResponse = await apiClient.get('/locations', { params: cityParams });
          if (cityResponse.data && cityResponse.data.success) {
            const cities = cityResponse.data.data || [];
            additionalCities = cities
              .filter(location => location && typeof location === 'object' && location.name)
              .map(location => ({
                id: location._id || location.id,
                _id: location._id || location.id,
                name: location.name,
                code: location.code || '',
                type: 'city',
                city: location.city || '',
                province: location.province || '',
                district: location.district || '',
                county: location.county || '',
                country: location.country || '中国',
                countryCode: location.countryCode || '',
                enName: location.enName || '',
                pinyin: location.pinyin || '',
                coordinates: location.coordinates || { latitude: 0, longitude: 0 },
                timezone: location.timezone || 'Asia/Shanghai',
                status: location.status || 'active',
                parentId: null,
                parentCity: null,
                riskLevel: location.riskLevel || 'low',
                noAirport: location.noAirport || false
              }));
          }
        } catch (cityError) {
          console.warn('[RegionSelector] 搜索城市数据失败:', cityError);
        }
      }

      // 合并所有城市（包括初始搜索结果和额外搜索的城市）
      const allCities = [
        ...validLocations.filter(loc => loc.type === 'city'),
        ...additionalCities
      ];
      
      // 找出所有城市ID（包括额外搜索到的城市）
      const allCityIds = Array.from(
        new Set([
          ...cityIds,
          ...allCities.map(city => city._id || city.id).filter(Boolean)
        ])
      );

      // 如果找到了新的城市，查询这些城市下的机场和火车站
      const newCityIds = allCityIds.filter(id => !cityIds.includes(id));
      if (newCityIds.length > 0) {
        console.log('[RegionSelector] 发现新的城市ID，查询子项:', newCityIds);
        try {
          const newChildrenPromises = newCityIds.map(cityId => {
            const url = `/locations/parent/${cityId}`;
            console.log(`[RegionSelector] 查询新城市 ${cityId} 下的子项: ${url}`);
            return apiClient.get(url).catch(err => {
              console.error(`[RegionSelector] 查询新城市 ${cityId} 下的子项失败:`, err);
              return { data: { success: false, data: [] } };
            });
          });
          
          const newChildrenResponses = await Promise.all(newChildrenPromises);
          
          newChildrenResponses.forEach((response, index) => {
            if (response.data && response.data.success && response.data.data) {
              const newChildren = response.data.data
                .filter(location => location && typeof location === 'object' && location.name)
                .map(location => ({
                  id: location._id || location.id,
                  _id: location._id || location.id,
                  name: location.name,
                  code: location.code || '',
                  type: location.type || 'city',
                  city: location.city || '',
                  province: location.province || '',
                  district: location.district || '',
                  county: location.county || '',
                  country: location.country || '中国',
                  countryCode: location.countryCode || '',
                  enName: location.enName || '',
                  pinyin: location.pinyin || '',
                  coordinates: location.coordinates || { latitude: 0, longitude: 0 },
                  timezone: location.timezone || 'Asia/Shanghai',
                  status: location.status || 'active',
                  parentId: location.parentId?._id || location.parentId?.toString() || location.parentId || null,
                  parentCity: location.parentId?.name || null,
                  riskLevel: location.riskLevel || 'low',
                  noAirport: location.noAirport || false
                }));
              
              childrenLocations.push(...newChildren);
            }
          });
        } catch (newChildrenError) {
          console.error('[RegionSelector] 查询新城市下的子项失败:', newChildrenError);
        }
      }

      // 合并所有搜索结果和关联的子项
      const allResults = [
        ...validLocations,
        ...additionalCities,
        ...childrenLocations
      ];
      
      // 根据交通工具类型过滤（如果需要）
      let filteredResults = allResults;
      if (transportationType) {
        console.log('[RegionSelector] 应用transportationType过滤前，结果数量:', allResults.length);
        filteredResults = allResults.filter(location => {
          switch (transportationType) {
            case 'flight':
              return location.type === 'airport' || location.type === 'city';
            case 'train':
              return location.type === 'station' || location.type === 'city';
            case 'car':
            case 'bus':
              return location.type === 'city';
            default:
              return true;
          }
        });
        console.log('[RegionSelector] 应用transportationType过滤后，结果数量:', filteredResults.length);
        console.log('[RegionSelector] 过滤后的类型分布:', {
          city: filteredResults.filter(l => l.type === 'city').length,
          airport: filteredResults.filter(l => l.type === 'airport').length,
          station: filteredResults.filter(l => l.type === 'station').length,
          bus: filteredResults.filter(l => l.type === 'bus').length
        });
      } else {
        console.log('[RegionSelector] 未设置transportationType，不过滤');
      }

      // 去重并设置结果
      const uniqueResults = Array.from(
        new Map(filteredResults.map(item => [item._id || item.id, item])).values()
      );
      
      console.log('[RegionSelector] 最终结果数量:', uniqueResults.length);
      console.log('[RegionSelector] 最终结果类型分布:', {
        city: uniqueResults.filter(l => l.type === 'city').length,
        airport: uniqueResults.filter(l => l.type === 'airport').length,
        station: uniqueResults.filter(l => l.type === 'station').length,
        bus: uniqueResults.filter(l => l.type === 'bus').length
      });
      
      setFilteredLocations(uniqueResults);
    } catch (error) {
      const errorMessage = error.response?.data?.message || error.message || '搜索地理位置数据失败';
      setErrorMessage(errorMessage);
      console.error('搜索地理位置数据失败:', error);
      setFilteredLocations([]);
    } finally {
      setLoading(false);
    }
  }, [transportationType]);

  // 当value变化时，如果需要查找对应的位置数据
  useEffect(() => {
    if (value && typeof value === 'string' && value.trim()) {
      // 如果value是字符串，尝试搜索匹配的位置
      const timeoutId = setTimeout(() => {
        searchLocationsFromAPI(value);
      }, 300);
      return () => clearTimeout(timeoutId);
    }
  }, [value, searchLocationsFromAPI]);

  // 监听窗口滚动和大小变化，更新下拉框位置
  useEffect(() => {
    if (!showDropdown) return;

    const handleScroll = () => {
      // 触发重新渲染以更新位置
      setShowDropdown(prev => prev);
    };

    const handleResize = () => {
      // 触发重新渲染以更新位置
      setShowDropdown(prev => prev);
    };

    window.addEventListener('scroll', handleScroll, true);
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('scroll', handleScroll, true);
      window.removeEventListener('resize', handleResize);
    };
  }, [showDropdown]);

  // 搜索逻辑 - 使用后端搜索（按需加载，提升性能）
  useEffect(() => {
    if (!searchValue.trim()) {
      setFilteredLocations([]);
      setShowDropdown(false);
      return;
    }

    // 防抖处理，避免频繁请求
    const timeoutId = setTimeout(() => {
      searchLocationsFromAPI(searchValue);
    }, 300); // 300ms防抖，给用户输入时间

    return () => clearTimeout(timeoutId);
  }, [searchValue, searchLocationsFromAPI]);

  // 处理输入框点击
  const handleInputClick = () => {
    if (disabled) return;
    setShowDropdown(true);
  };

  // 处理输入框焦点
  const handleInputFocus = () => {
    if (disabled) return;
    setShowDropdown(true);
  };

  // 处理输入框失焦
  const handleInputBlur = (event) => {
    // 延迟隐藏下拉框，以便点击选项
    setTimeout(() => {
      if (!dropdownRef.current?.contains(document.activeElement)) {
        setShowDropdown(false);
      }
    }, 150);
  };

  // 处理选择
  const handleSelect = (location) => {
    // 汽车站不显示编码
    const displayValue = location.type === 'bus' 
      ? location.name 
      : `${location.name}${location.code ? ` (${location.code})` : ''}`;
    setSearchValue(displayValue);
    setShowDropdown(false);
    
    // 调用onChange回调，传递完整的location对象
    onChange(location);
  };

  // 处理清除
  const handleClear = () => {
    setSearchValue('');
    onChange(null);
  };

  // 处理输入变化
  const handleInputChange = (event) => {
    const value = event.target.value;
    setSearchValue(value);
    
    if (value.trim()) {
      setShowDropdown(true);
    } else {
      setShowDropdown(false);
    }
  };

  // 获取类型图标
  const getTypeIcon = (type) => {
    switch (type) {
      case 'airport':
        return <FlightIcon sx={{ fontSize: 20 }} />;
      case 'station':
        return <TrainIcon sx={{ fontSize: 20 }} />;
      case 'city':
        return <LocationCityIcon sx={{ fontSize: 20 }} />;
      default:
        return <LocationOnIcon sx={{ fontSize: 20 }} />;
    }
  };

  // 获取类型颜色
  const getTypeColor = (type) => {
    switch (type) {
      case 'airport':
        return 'primary';
      case 'station':
        return 'secondary';
      case 'city':
        return 'success';
      default:
        return 'default';
    }
  };

  // 获取类型标签
  const getTypeLabel = (type) => {
    switch (type) {
      case 'airport':
        return '机场';
      case 'station':
        return '火车站';
      case 'city':
        return '城市';
      default:
        return '地区';
    }
  };

  // 获取风险等级标签
  const getRiskLevelLabel = (level) => {
    const labels = { 
      low: '低', 
      medium: '中', 
      high: '高', 
      very_high: '很高' 
    };
    return labels[level] || level;
  };

  // 获取风险等级颜色
  const getRiskLevelColor = (level) => {
    const colors = { 
      low: 'success', 
      medium: 'warning', 
      high: 'error', 
      very_high: 'error' 
    };
    return colors[level] || 'default';
  };

  // 渲染下拉框内容
  const renderDropdownContent = () => {
    if (loading) {
      return (
        <Box sx={{ p: 2, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <CircularProgress size={20} sx={{ mr: 1 }} />
          <Typography variant="body2">加载中...</Typography>
        </Box>
      );
    }

    if (errorMessage) {
      return (
        <Box sx={{ p: 2 }}>
          <Alert severity="error" size="small">
            {errorMessage}
          </Alert>
        </Box>
      );
    }

    if (filteredLocations.length === 0 && searchValue.trim()) {
      return (
        <Box sx={{ p: 2, textAlign: 'center' }}>
          <Typography variant="body2" color="text.secondary">
            未找到匹配的地区
          </Typography>
        </Box>
      );
    }

    // 按层级关系组织数据（传入搜索关键词用于排序）
    const organizedLocations = organizeLocationsByHierarchy(filteredLocations, searchValue.trim());

    return (
      <List sx={{ p: 0 }}>
        {organizedLocations.map((location, index) => {
          // 判断是否是子项（机场或火车站有parentId）
          const isChild = (location.type === 'airport' || location.type === 'station') && location.parentId;
          
          return (
            <React.Fragment key={location.id || location._id}>
              <ListItem
                button
                onClick={() => handleSelect(location)}
                sx={{
                  py: 1.5,
                  px: isChild ? 4 : 2, // 子项缩进
                  '&:hover': {
                    backgroundColor: alpha(theme.palette.primary.main, 0.04),
                  },
                }}
              >
                <ListItemIcon sx={{ minWidth: 40 }}>
                  {getTypeIcon(location.type)}
                </ListItemIcon>
                <ListItemText
                  primary={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5, flexWrap: 'wrap' }}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 500 }}>
                        {location.name}
                      </Typography>
                      <Chip
                        label={getTypeLabel(location.type)}
                        size="small"
                        color={getTypeColor(location.type)}
                        sx={{ height: 20, fontSize: '0.75rem' }}
                      />
                      {/* 汽车站不显示编码 */}
                      {location.code && location.type !== 'bus' ? (
                        <Chip
                          label={location.code}
                          size="small"
                          variant="outlined"
                          sx={{ height: 20, fontSize: '0.75rem' }}
                        />
                      ) : null}
                      {/* 城市类型显示风险等级（低风险不显示，显示在右侧） */}
                      {location.type === 'city' && location.riskLevel && location.riskLevel !== 'low' ? (
                        <Chip
                          label={`风险${getRiskLevelLabel(location.riskLevel)}`}
                          size="small"
                          color={getRiskLevelColor(location.riskLevel)}
                          sx={{ 
                            height: 20, 
                            fontSize: '0.7rem',
                            fontWeight: 600,
                            marginLeft: 'auto',
                            ...(location.riskLevel === 'high' || location.riskLevel === 'very_high' ? {
                              animation: `${pulse} 2s infinite`
                            } : {})
                          }}
                        />
                      ) : null}
                      {/* 城市类型显示无机场标识 */}
                      {location.type === 'city' && location.noAirport ? (
                        <Chip
                          label="无机场"
                          size="small"
                          color="warning"
                          variant="outlined"
                          sx={{ 
                            height: 20, 
                            fontSize: '0.7rem',
                            fontWeight: 500
                          }}
                        />
                      ) : null}
                    </Box>
                  }
                  secondary={
                    <Typography variant="body2" color="text.secondary">
                      {[
                        location.province && location.province !== location.city ? location.province : null,
                        location.city,
                        location.district,
                        location.country
                      ].filter(Boolean).join(', ')}
                      {location.parentCity && (
                        <span> • 隶属: {location.parentCity}</span>
                      )}
                    </Typography>
                  }
                />
              </ListItem>
              {index < organizedLocations.length - 1 && <Divider />}
            </React.Fragment>
          );
        })}
      </List>
    );
  };

  // 计算下拉框位置
  const getDropdownPosition = () => {
    if (!inputRef.current) {
      return { top: 0, left: 0, width: 300 };
    }

    const inputRect = inputRef.current.getBoundingClientRect();
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft;
    
    // 计算可用空间
    const viewportHeight = window.innerHeight;
    const spaceBelow = viewportHeight - inputRect.bottom;
    const spaceAbove = inputRect.top;
    const maxDropdownHeight = Math.min(400, viewportHeight - 100); // 最大400px或视口高度-100px
    
    let top, maxHeight;
    
    // 如果下方空间足够，显示在下方
    if (spaceBelow >= 200 || spaceBelow > spaceAbove) {
      top = inputRect.bottom + scrollTop + 4;
      maxHeight = Math.min(maxDropdownHeight, spaceBelow - 20);
    } else {
      // 否则显示在上方
      top = inputRect.top + scrollTop - maxDropdownHeight - 4;
      maxHeight = Math.min(maxDropdownHeight, spaceAbove - 20);
    }

    return {
      top: Math.max(10, top), // 确保不会超出屏幕顶部
      left: inputRect.left + scrollLeft,
      width: Math.max(inputRect.width, 300),
      maxHeight: Math.max(200, maxHeight), // 最小高度200px
    };
  };

  // 按层级关系组织位置数据
  const organizeLocationsByHierarchy = (locations, searchKeyword = '') => {
    if (!locations || locations.length === 0) {
      return [];
    }

    console.log('[RegionSelector] organizeLocationsByHierarchy 输入数据数量:', locations.length);
    console.log('[RegionSelector] organizeLocationsByHierarchy 搜索关键词:', searchKeyword);
    console.log('[RegionSelector] organizeLocationsByHierarchy 输入数据类型分布:', {
      city: locations.filter(l => l.type === 'city').length,
      airport: locations.filter(l => l.type === 'airport').length,
      station: locations.filter(l => l.type === 'station').length,
      bus: locations.filter(l => l.type === 'bus').length
    });

    const result = [];
    const parentMap = new Map(); // 城市ID -> 城市对象
    const childrenMap = new Map(); // 城市ID -> [机场/火车站/汽车站列表]
    const independentItems = [];

    // 分离城市和其子项（机场/火车站/汽车站）
    locations.forEach(location => {
      // 标准化location的ID
      const locationId = location.id || location._id || location._id?.toString();
      
      // 如果是城市类型
      if (location.type === 'city') {
        if (locationId) {
          parentMap.set(locationId.toString(), location);
        }
      } 
      // 如果是机场、火车站或汽车站，且有parentId
      else if ((location.type === 'airport' || location.type === 'station' || location.type === 'bus') && location.parentId) {
        // 标准化parentId
        let parentId;
        if (typeof location.parentId === 'object') {
          parentId = location.parentId._id || location.parentId.id || location.parentId.toString();
        } else {
          parentId = location.parentId.toString();
        }
        
        if (parentId) {
          const parentIdStr = parentId.toString();
          if (!childrenMap.has(parentIdStr)) {
            childrenMap.set(parentIdStr, []);
          }
          childrenMap.get(parentIdStr).push(location);
        }
      } 
      // 独立项目（没有parentId的机场/火车站/汽车站）
      else {
        independentItems.push(location);
      }
    });

    console.log('[RegionSelector] organizeLocationsByHierarchy 组织结果:');
    console.log('- parentMap大小:', parentMap.size);
    console.log('- childrenMap大小:', childrenMap.size);
    console.log('- independentItems数量:', independentItems.length);
    console.log('- independentItems类型分布:', {
      city: independentItems.filter(l => l.type === 'city').length,
      airport: independentItems.filter(l => l.type === 'airport').length,
      station: independentItems.filter(l => l.type === 'station').length,
      bus: independentItems.filter(l => l.type === 'bus').length
    });

    // 处理childrenMap中但parent不在parentMap中的子项（parentId关联错误的情况）
    // 这些子项应该作为独立项目显示
    const orphanedChildren = [];
    childrenMap.forEach((children, parentId) => {
      if (!parentMap.has(parentId)) {
        console.log(`- 发现orphaned子项，parentId ${parentId} 不在parentMap中，数量:`, children.length);
        orphanedChildren.push(...children);
      }
    });

    // 合并所有需要显示的机场/火车站/汽车站（优先显示）
    const allTransportationItems = [
      ...independentItems,
      ...orphanedChildren
    ];
    
    // 从parentMap的城市中提取其子项
    parentMap.forEach((city, cityId) => {
      const children = childrenMap.get(cityId.toString()) || [];
      allTransportationItems.push(...children);
    });

    // 对于火车站和汽车站，只保留名称前缀匹配的（如果有关键词）
    const keywordLower = searchKeyword ? searchKeyword.trim().toLowerCase() : '';
    if (keywordLower) {
      const filteredItems = allTransportationItems.filter(item => {
        // 机场：显示所有匹配的
        if (item.type === 'airport') {
          return true;
        }
        
        // 火车站和汽车站：只显示名称前缀匹配的
        if (item.type === 'station' || item.type === 'bus') {
          const nameLower = (item.name || '').toLowerCase();
          // 名称以关键词开头，或者名称完全等于关键词
          return nameLower.startsWith(keywordLower) || nameLower === keywordLower;
        }
        
        // 其他类型：显示所有
        return true;
      });
      
      console.log('[RegionSelector] 前缀匹配过滤前数量:', allTransportationItems.length);
      console.log('[RegionSelector] 前缀匹配过滤后数量:', filteredItems.length);
      console.log('[RegionSelector] 被过滤掉的火车站/汽车站:', 
        allTransportationItems
          .filter(item => !filteredItems.includes(item) && (item.type === 'station' || item.type === 'bus'))
          .map(item => `${item.type}:${item.name}`)
      );
      
      // 清空原数组并填充过滤后的结果
      allTransportationItems.length = 0;
      allTransportationItems.push(...filteredItems);
    }

    // 按类型优先级排序：city(1) > airport(2) > station(3) > bus(4)
    // 优先级数字越小，排序越靠前
    const typePriority = {
      'city': 1,      // 最高优先级（最先显示）
      'airport': 2,  // 第二优先级
      'station': 3,   // 第三优先级
      'bus': 4        // 最低优先级（最后显示）
    };
    
    // 计算名称匹配度（用于排序）
    const getMatchScore = (location, keyword) => {
      if (!keyword || !keyword.trim()) {
        return 0;
      }
      
      const keywordLower = keyword.trim().toLowerCase();
      const nameLower = (location.name || '').toLowerCase();
      const codeLower = (location.code || '').toLowerCase();
      
      // 完全匹配（名称完全等于关键词）
      if (nameLower === keywordLower) {
        return 100;
      }
      
      // 前缀匹配（名称以关键词开头，如"成都"匹配"成都东站"）
      if (nameLower.startsWith(keywordLower)) {
        return 80;
      }
      
      // 代码完全匹配
      if (codeLower === keywordLower) {
        return 70;
      }
      
      // 代码前缀匹配
      if (codeLower.startsWith(keywordLower)) {
        return 60;
      }
      
      // 包含匹配（名称包含关键词）
      if (nameLower.includes(keywordLower)) {
        return 50;
      }
      
      // 代码包含匹配
      if (codeLower.includes(keywordLower)) {
        return 40;
      }
      
      return 0;
    };
    
    allTransportationItems.sort((a, b) => {
      const priorityA = typePriority[a.type] || 99;
      const priorityB = typePriority[b.type] || 99;
      
      // 首先按类型优先级排序
      if (priorityA !== priorityB) {
        return priorityA - priorityB;
      }
      
      // 同类型按名称匹配度排序（匹配度高的优先）
      const matchScoreA = getMatchScore(a, searchKeyword);
      const matchScoreB = getMatchScore(b, searchKeyword);
      
      if (matchScoreA !== matchScoreB) {
        return matchScoreB - matchScoreA; // 匹配度高的在前
      }
      
      // 匹配度相同，按名称长度排序（短名称优先，如"成都站"优先于"成都东站"）
      const nameLengthA = (a.name || '').length;
      const nameLengthB = (b.name || '').length;
      if (nameLengthA !== nameLengthB) {
        return nameLengthA - nameLengthB;
      }
      
      // 最后按名称中文排序
      return (a.name || '').localeCompare(b.name || '', 'zh-CN');
    });
    
    console.log('[RegionSelector] 排序后的交通工具类型顺序（前10条）:', 
      allTransportationItems.slice(0, 10).map(item => {
        const matchScore = getMatchScore(item, searchKeyword);
        return `${item.type}:${item.name} (匹配度:${matchScore})`;
      }));

    // 先添加城市（优先级最高）
    parentMap.forEach((city, cityId) => {
      result.push(city);
    });

    // 然后添加机场/火车站/汽车站（按优先级排序）
    allTransportationItems.forEach(item => result.push(item));

    console.log('[RegionSelector] organizeLocationsByHierarchy 最终结果数量:', result.length);
    console.log('[RegionSelector] organizeLocationsByHierarchy 最终结果类型分布:', {
      city: result.filter(l => l.type === 'city').length,
      airport: result.filter(l => l.type === 'airport').length,
      station: result.filter(l => l.type === 'station').length,
      bus: result.filter(l => l.type === 'bus').length
    });
    console.log('[RegionSelector] organizeLocationsByHierarchy 前10条结果:', result.slice(0, 10).map(l => `${l.type}:${l.name}`));

    return result;
  };

  return (
    <Box sx={{ position: 'relative' }}>
      <StyledTextField
        ref={inputRef}
        fullWidth
        label={label}
        value={searchValue}
        onChange={handleInputChange}
        onClick={handleInputClick}
        onFocus={handleInputFocus}
        onBlur={handleInputBlur}
        placeholder={getDynamicPlaceholder()}
        error={error}
        helperText={helperText}
        required={required}
        disabled={disabled}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <SearchIcon sx={{ color: 'text.secondary' }} />
            </InputAdornment>
          ),
          endAdornment: searchValue && !disabled && (
            <InputAdornment position="end">
              <IconButton
                onClick={handleClear}
                size="small"
                sx={{ p: 0.5 }}
              >
                <ClearIcon sx={{ fontSize: 18 }} />
              </IconButton>
            </InputAdornment>
          ),
        }}
      />

      {/* 下拉框 */}
      {showDropdown && ReactDOM.createPortal(
        <DropdownPaper
          ref={dropdownRef}
          sx={{
            position: 'fixed',
            zIndex: 1300,
            mt: 0.5,
            ...getDropdownPosition(),
          }}
        >
          {renderDropdownContent()}
        </DropdownPaper>,
        document.body
      )}
    </Box>
  );
};

export default RegionSelector;
