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
import { styled } from '@mui/material/styles';
import SearchIcon from '@mui/icons-material/Search';
import ClearIcon from '@mui/icons-material/Clear';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import FlightIcon from '@mui/icons-material/Flight';
import TrainIcon from '@mui/icons-material/Train';
import LocationCityIcon from '@mui/icons-material/LocationCity';
import { getAllLocations, searchLocations } from '../../services/locationService';

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
  
  const inputRef = useRef(null);
  const dropdownRef = useRef(null);

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

  // 获取所有地理位置数据
  const fetchAllLocations = async () => {
    setLoading(true);
    setErrorMessage('');
    
    try {
      const locations = await getAllLocations();
      console.log('获取地理位置数据成功:', locations.length);
      console.log('数据示例:', locations.slice(0, 2));
      
      // 验证数据结构
      const validLocations = locations.filter(location => 
        location && 
        typeof location === 'object' && 
        location.name && 
        location.city && 
        location.code && 
        location.country
      );
      
      console.log('有效数据数量:', validLocations.length);
      if (validLocations.length !== locations.length) {
        console.warn('发现无效数据:', locations.length - validLocations.length, '条');
      }
      
      setAllLocations(validLocations);
    } catch (error) {
      setErrorMessage('获取地理位置数据失败: ' + error.message);
      console.error('获取地理位置数据失败:', error);
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
      // 过滤掉无效的location对象
      const validLocations = allLocations.filter(location => 
        location && 
        typeof location === 'object' && 
        location.name && 
        location.city && 
        location.code && 
        location.country
      );

      // 根据交通工具类型过滤
      const transportationFiltered = filterLocationsByTransportation(validLocations);

      const filtered = searchLocations(searchValue, transportationFiltered);
      setFilteredLocations(filtered.slice(0, 30)); // 进一步限制显示数量
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
        {organizedLocations.map((location, index) => (
          <React.Fragment key={location.id}>
            <ListItem
              button
              onClick={() => handleSelect(location)}
              sx={{
                py: 1.5,
                px: location.parentId ? 4 : 2, // 子项缩进
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
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 500 }}>
                      {location.name}
                    </Typography>
                    <Chip
                      label={getTypeLabel(location.type)}
                      size="small"
                      color={getTypeColor(location.type)}
                      sx={{ height: 20, fontSize: '0.75rem' }}
                    />
                    <Chip
                      label={location.code}
                      size="small"
                      variant="outlined"
                      sx={{ height: 20, fontSize: '0.75rem' }}
                    />
                  </Box>
                }
                secondary={
                  <Typography variant="body2" color="text.secondary">
                    {location.city}, {location.country}
                    {location.coordinates && (
                      <span> • {location.coordinates.latitude}, {location.coordinates.longitude}</span>
                    )}
                  </Typography>
                }
              />
            </ListItem>
            {index < organizedLocations.length - 1 && <Divider />}
          </React.Fragment>
        ))}
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
    // 限制显示数量，提高性能
    const maxDisplayCount = 50;
    if (locations.length > maxDisplayCount) {
      locations = locations.slice(0, maxDisplayCount);
    }

    const result = [];
    const parentMap = new Map();
    const childrenMap = new Map();
    const independentItems = [];

    // 分离父级和子级
    locations.forEach(location => {
      if (location.isSummary) {
        parentMap.set(location.id, location);
      } else if (location.parentId) {
        if (!childrenMap.has(location.parentId)) {
          childrenMap.set(location.parentId, []);
        }
        childrenMap.get(location.parentId).push(location);
      } else {
        // 没有parentId的独立项目
        independentItems.push(location);
      }
    });

    // 按层级添加：先添加父级，再添加其子级
    parentMap.forEach((parent, parentId) => {
      result.push(parent);
      const children = childrenMap.get(parentId) || [];
      children.forEach(child => result.push(child));
    });

    // 最后添加独立项目
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
