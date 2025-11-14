import React, { useState, useEffect, useRef } from 'react';
import {
  TextField,
  Autocomplete,
  Box,
  Typography,
  Chip,
  Avatar,
  Paper,
  ListItem,
  ListItemText,
  ListItemIcon,
  Divider
} from '@mui/material';
import {
  LocationOn as LocationIcon,
  FlightTakeoff as FlightIcon,
  Star as StarIcon
} from '@mui/icons-material';
import { cityCoordinates, isCitySupported } from '../../utils/distanceCalculator';

const CitySearchInput = ({
  label,
  value,
  onChange,
  placeholder,
  error,
  helperText,
  travelType = 'all',
  sx = {}
}) => {
  const [inputValue, setInputValue] = useState('');
  const [options, setOptions] = useState([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef(null);

  // 获取热门城市
  const getHotCities = (type) => {
    const hotCities = [
      '北京', '上海', '广州', '深圳', '成都', '杭州', '南京', '武汉', '西安', '重庆',
      '香港', '台北', '纽约', '东京', '首尔', '新加坡', '伦敦', '巴黎', '悉尼'
    ];
    
    return hotCities.map(cityName => ({
      id: cityName,
      name: cityName,
      country: getCityCountry(cityName),
      hot: true,
      airports: []
    }));
  };

  // 获取城市所属国家
  const getCityCountry = (cityName) => {
    const domesticCities = [
      '北京', '上海', '广州', '深圳', '成都', '杭州', '南京', '武汉', '西安', '重庆',
      '天津', '青岛', '大连', '沈阳', '长春', '哈尔滨', '昆明', '南宁', '福州', '厦门',
      '长沙', '南昌', '太原', '石家庄', '呼和浩特', '兰州', '西宁', '银川', '乌鲁木齐', '拉萨',
      '香港', '澳门', '台北'
    ];
    
    return domesticCities.includes(cityName) ? '中国' : '国际';
  };

  // 搜索城市
  const searchCities = (query, type) => {
    if (!query || query.trim() === '') {
      return getHotCities(type);
    }
    
    const searchTerm = query.toLowerCase().trim();
    const allCities = Object.keys(cityCoordinates);
    
    return allCities
      .filter(cityName => {
        const country = getCityCountry(cityName);
        const isDomestic = country === '中国';
        
        // 根据类型过滤
        if (type === 'domestic' && !isDomestic) return false;
        if (type === 'international' && isDomestic) return false;
        
        // 搜索匹配
        return cityName.toLowerCase().includes(searchTerm);
      })
      .map(cityName => ({
        id: cityName,
        name: cityName,
        country: getCityCountry(cityName),
        hot: getHotCities(type).some(hot => hot.name === cityName),
        airports: []
      }))
      .sort((a, b) => {
        // 热门城市优先
        if (a.hot && !b.hot) return -1;
        if (!a.hot && b.hot) return 1;
        
        // 名称匹配优先
        const aMatch = a.name.toLowerCase().includes(searchTerm);
        const bMatch = b.name.toLowerCase().includes(searchTerm);
        if (aMatch && !bMatch) return -1;
        if (!aMatch && bMatch) return 1;
        
        return 0;
      });
  };

  // 初始化热门城市
  useEffect(() => {
    const hotCities = getHotCities(travelType);
    setOptions(hotCities);
  }, [travelType]);

  // 搜索城市
  const handleInputChange = (event, newInputValue) => {
    setInputValue(newInputValue);
    
    if (newInputValue.length >= 1) {
      setLoading(true);
      // 模拟搜索延迟
      setTimeout(() => {
        const searchResults = searchCities(newInputValue, travelType);
        setOptions(searchResults);
        setLoading(false);
      }, 200);
    } else {
      // 显示热门城市
      const hotCities = getHotCities(travelType);
      setOptions(hotCities);
    }
  };

  // 处理选择
  const handleChange = (event, newValue) => {
    if (newValue) {
      onChange(newValue.name);
    } else {
      onChange('');
    }
  };

  // 获取当前选中的城市对象
  const selectedCity = value ? {
    id: value,
    name: value,
    country: getCityCountry(value),
    hot: getHotCities(travelType).some(hot => hot.name === value),
    airports: []
  } : null;

  return (
    <Autocomplete
      ref={inputRef}
      open={open}
      onOpen={() => setOpen(true)}
      onClose={() => setOpen(false)}
      value={selectedCity}
      onChange={handleChange}
      inputValue={inputValue}
      onInputChange={handleInputChange}
      options={options}
      loading={loading}
      loadingText="搜索中..."
      noOptionsText="未找到相关城市"
      getOptionLabel={(option) => option.name || option}
      isOptionEqualToValue={(option, value) => option.id === value?.id}
      filterOptions={(x) => x} // 禁用默认过滤，使用自定义搜索
      renderInput={(params) => (
        <TextField
          {...params}
          label={label}
          placeholder={placeholder}
          error={error}
          helperText={helperText}
          InputProps={{
            ...params.InputProps,
            startAdornment: (
              <Box sx={{ display: 'flex', alignItems: 'center', mr: 1 }}>
                <LocationIcon color="action" />
              </Box>
            ),
          }}
          sx={{...sx}}
        />
      )}
      renderOption={(props, option) => (
        <ListItem {...props} key={option.id}>
          <ListItemIcon>
            <Avatar sx={{ width: 32, height: 32, bgcolor: 'primary.main' }}>
              <LocationIcon fontSize="small" />
            </Avatar>
          </ListItemIcon>
          <ListItemText
            primary={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Typography variant="body1" fontWeight="medium">
                  {option.name}
                </Typography>
                {option.hot && (
                  <Chip
                    icon={<StarIcon />}
                    label="热门"
                    size="small"
                    color="warning"
                    variant="outlined"
                    sx={{ height: 20, fontSize: '0.75rem' }}
                  />
                )}
              </Box>
            }
            secondary={
              <Box>
                <Typography variant="body2" color="text.secondary">
                  {option.country}
                  {option.airports.length > 0 && ` • ${option.airports.join(', ')}`}
                </Typography>
                {option.nameEn && option.nameEn !== option.name && (
                  <Typography variant="caption" color="text.secondary">
                    {option.nameEn}
                  </Typography>
                )}
              </Box>
            }
          />
        </ListItem>
      )}
      PaperComponent={(props) => (
        <Paper {...props} sx={{ mt: 1, boxShadow: 3 }}>
          {inputValue === '' && (
            <>
              <Box sx={{ p: 2, pb: 1 }}>
                <Typography variant="subtitle2" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <StarIcon fontSize="small" />
                  热门城市
                </Typography>
              </Box>
              <Divider />
            </>
          )}
          {props.children}
        </Paper>
      )}
      ListboxProps={{
        style: {
          maxHeight: 300,
        }
      }}
    />
  );
};

export default CitySearchInput;
