/**
 * 地区选择器组件 - 基于携程API的地理位置服务
 * 支持机场、火车站、城市的搜索和选择
 */

import React, { useState, useRef, useEffect } from 'react';
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
  const [allLocations, setAllLocations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState(null);
  
  const inputRef = useRef(null);
  const dropdownRef = useRef(null);

  // 初始化显示值
  useEffect(() => {
    if (value) {
      // 如果value是字符串，尝试在数据中查找
      if (typeof value === 'string') {
        const found = allLocations.find(loc => 
          loc.name === value || 
          loc.code === value ||
          loc._id === value
        );
        if (found) {
          setSelectedLocation(found);
          setSearchValue(`${found.name}${found.code ? ` (${found.code})` : ''}`);
        } else {
          setSearchValue(value);
        }
      } 
      // 如果value是对象
      else if (typeof value === 'object' && value !== null) {
        setSelectedLocation(value);
        setSearchValue(`${value.name}${value.code ? ` (${value.code})` : ''}`);
      }
    } else {
      setSearchValue('');
      setSelectedLocation(null);
    }
  }, [value, allLocations]);

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

  // 从地理位置管理API获取所有地理位置数据
  const fetchAllLocations = async () => {
    setLoading(true);
    setErrorMessage('');
    
    try {
      // 从后端API获取所有启用的地理位置数据
      const response = await apiClient.get('/locations', {
        params: { status: 'active' }
      });
      
      if (!response.data || !response.data.success) {
        throw new Error(response.data?.message || '获取地理位置数据失败');
      }
      
      const locations = response.data.data || [];
      console.log('从API获取地理位置数据成功:', locations.length);
      
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
      
      console.log('有效数据数量:', validLocations.length);
      setAllLocations(validLocations);
    } catch (error) {
      const errorMessage = error.response?.data?.message || error.message || '获取地理位置数据失败';
      setErrorMessage(errorMessage);
      console.error('获取地理位置数据失败:', error);
      console.error('错误详情:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status
      });
      setAllLocations([]);
    } finally {
      setLoading(false);
    }
  };

  // 组件挂载时获取数据
  useEffect(() => {
    fetchAllLocations();
  }, []);

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

  // 搜索和过滤逻辑
  useEffect(() => {
    if (!searchValue.trim()) {
      setFilteredLocations([]);
      return;
    }

    if (!allLocations || allLocations.length === 0) {
      return;
    }

      // 防抖处理
    const timeoutId = setTimeout(() => {
      if (!allLocations || allLocations.length === 0) {
        return;
      }

      // 根据交通工具类型过滤
      const transportationFiltered = filterLocationsByTransportation(allLocations);

      // 本地搜索（支持新字段）
      const lowerKeyword = searchValue.toLowerCase();
      const filtered = transportationFiltered.filter(location => {
        return (
          (location.name && location.name.toLowerCase().includes(lowerKeyword)) ||
          (location.code && location.code.toLowerCase().includes(lowerKeyword)) ||
          (location.city && location.city.toLowerCase().includes(lowerKeyword)) ||
          (location.province && location.province.toLowerCase().includes(lowerKeyword)) ||
          (location.district && location.district.toLowerCase().includes(lowerKeyword)) ||
          (location.county && location.county.toLowerCase().includes(lowerKeyword)) ||
          (location.country && location.country.toLowerCase().includes(lowerKeyword)) ||
          (location.countryCode && location.countryCode.toLowerCase().includes(lowerKeyword)) ||
          (location.enName && location.enName.toLowerCase().includes(lowerKeyword)) ||
          (location.pinyin && location.pinyin.toLowerCase().includes(lowerKeyword)) ||
          (location.parentCity && location.parentCity.toLowerCase().includes(lowerKeyword))
        );
      });
      
      setFilteredLocations(filtered.slice(0, 50)); // 限制显示数量
    }, 200); // 200ms防抖

    return () => clearTimeout(timeoutId);
  }, [searchValue, allLocations, transportationType]);

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
    const displayValue = `${location.name} (${location.code})`;
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

    // 按层级关系组织数据
    const organizedLocations = organizeLocationsByHierarchy(filteredLocations);

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
                      {location.code && (
                        <Chip
                          label={location.code}
                          size="small"
                          variant="outlined"
                          sx={{ height: 20, fontSize: '0.75rem' }}
                        />
                      )}
                      {/* 城市类型显示风险等级（低风险不显示，显示在右侧） */}
                      {location.type === 'city' && location.riskLevel && location.riskLevel !== 'low' && (
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
                      )}
                      {/* 城市类型显示无机场标识 */}
                      {location.type === 'city' && location.noAirport && (
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
                      )}
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

  // 根据交通工具类型过滤位置数据
  const filterLocationsByTransportation = (locations) => {
    if (!transportationType || !locations) {
      return locations;
    }

    return locations.filter(location => {
      switch (transportationType) {
        case 'flight':
          // 飞机：优先显示机场，也显示城市（用于选择城市的所有机场）
          return location.type === 'airport' || location.type === 'city';
        case 'train':
          // 火车：优先显示火车站，也显示城市（用于选择城市的所有车站）
          return location.type === 'station' || location.type === 'city';
        case 'car':
        case 'bus':
          // 汽车/大巴：主要显示城市
          return location.type === 'city';
        default:
          return true;
      }
    });
  };

  // 按层级关系组织位置数据
  const organizeLocationsByHierarchy = (locations) => {
    if (!locations || locations.length === 0) {
      return [];
    }

    const result = [];
    const parentMap = new Map(); // 城市ID -> 城市对象
    const childrenMap = new Map(); // 城市ID -> [机场/火车站列表]
    const independentItems = [];

    // 分离城市和其子项（机场/火车站）
    locations.forEach(location => {
      // 标准化location的ID
      const locationId = location.id || location._id || location._id?.toString();
      
      // 如果是城市类型
      if (location.type === 'city') {
        if (locationId) {
          parentMap.set(locationId.toString(), location);
        }
      } 
      // 如果是机场或火车站，且有parentId
      else if ((location.type === 'airport' || location.type === 'station') && location.parentId) {
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
      // 独立项目（没有parentId的机场/火车站）
      else {
        independentItems.push(location);
      }
    });

    // 按层级添加：先添加城市，再添加其下的机场/火车站
    parentMap.forEach((city, cityId) => {
      result.push(city);
      const children = childrenMap.get(cityId.toString()) || [];
      children.forEach(child => result.push(child));
    });

    // 最后添加独立项目（没有关联城市的机场/火车站）
    independentItems.forEach(item => result.push(item));

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
