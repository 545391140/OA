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
  position: 'fixed',
  zIndex: 9999,
  minWidth: 300,
  maxWidth: 'calc(100vw - 40px)',
  overflowX: 'hidden',
  boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
  borderRadius: 8,
  border: '1px solid #e5e7eb',
}));

const RegionSelector = ({
  label = '选择地区',
  value = '',
  onChange = () => {},
  placeholder = '搜索城市、机场或火车站',
  error = false,
  helperText = '',
  required = false,
  disabled = false
}) => {
  const theme = useTheme();
  const [searchValue, setSearchValue] = useState('');
  const [filteredLocations, setFilteredLocations] = useState([]);
  const [allLocations, setAllLocations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0 });
  
  const inputRef = useRef(null);
  const dropdownRef = useRef(null);

  // 获取所有地理位置数据
  const fetchAllLocations = async () => {
    setLoading(true);
    setErrorMessage('');
    
    try {
      const locations = await getAllLocations();
      setAllLocations(locations);
      console.log('获取地理位置数据成功:', locations.length);
    } catch (error) {
      setErrorMessage('获取地理位置数据失败: ' + error.message);
      console.error('获取地理位置数据失败:', error);
    } finally {
      setLoading(false);
    }
  };

  // 组件挂载时获取数据
  useEffect(() => {
    fetchAllLocations();
  }, []);

  // 搜索和过滤逻辑
  useEffect(() => {
    if (!searchValue.trim()) {
      setFilteredLocations([]);
      return;
    }

    if (allLocations.length === 0) {
      return;
    }

    const filtered = searchLocations(searchValue, allLocations);
    setFilteredLocations(filtered.slice(0, 50)); // 限制显示数量
  }, [searchValue, allLocations]);

  // 计算下拉框位置
  const calculateDropdownPosition = () => {
    if (!inputRef.current) return;

    const rect = inputRef.current.getBoundingClientRect();
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    
    setDropdownPosition({
      top: rect.bottom + scrollTop + 4,
      left: rect.left,
      width: rect.width
    });
  };

  // 处理输入框点击
  const handleInputClick = () => {
    if (disabled) return;
    
    calculateDropdownPosition();
    setShowDropdown(true);
  };

  // 处理输入框焦点
  const handleInputFocus = () => {
    if (disabled) return;
    
    calculateDropdownPosition();
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
      calculateDropdownPosition();
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

    return (
      <List sx={{ p: 0 }}>
        {filteredLocations.map((location, index) => (
          <React.Fragment key={location.id}>
            <ListItem
              button
              onClick={() => handleSelect(location)}
              sx={{
                py: 1.5,
                px: 2,
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
            {index < filteredLocations.length - 1 && <Divider />}
          </React.Fragment>
        ))}
      </List>
    );
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
        placeholder={placeholder}
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
      {showDropdown && (
        <DropdownPaper
          ref={dropdownRef}
          sx={{
            top: dropdownPosition.top,
            left: dropdownPosition.left,
            width: dropdownPosition.width,
          }}
        >
          {renderDropdownContent()}
        </DropdownPaper>
      )}
    </Box>
  );
};

export default RegionSelector;



