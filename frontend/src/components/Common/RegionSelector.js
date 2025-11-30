/**
 * 地区选择器组件 - 基于携程API的地理位置服务
 * 支持机场、火车站、城市的搜索和选择
 */

import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
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
import apiClient from '../../utils/axiosConfig';
import { useTranslation } from 'react-i18next';
import HotCitySelector from './HotCitySelector';

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

// 预编译正则表达式（优化性能）
const CODE_REGEX = /^[A-Z0-9]{2,4}$/i;
const CHINESE_REGEX = /[\u4e00-\u9fa5]/;

// 类型优先级映射（优化性能）
const TYPE_PRIORITY = {
  'city': 1,
  'airport': 2,
  'station': 3,
  'bus': 4
};

/**
 * 计算名称匹配度（用于排序）- 优化版本，预计算小写字符串
 */
const getMatchScore = (location, keywordLower, precomputed) => {
  if (!keywordLower) {
    return 0;
  }
  
  // 使用预计算的小写字符串，避免重复转换
  const nameLower = precomputed.nameLower;
  const codeLower = precomputed.codeLower;
  const pinyinLower = precomputed.pinyinLower;
  const enNameLower = precomputed.enNameLower;
  
  // 完全匹配（名称完全等于关键词）- 最高优先级
  if (nameLower === keywordLower) {
    return 100;
  }
  
  // 拼音完全匹配
  if (pinyinLower && pinyinLower === keywordLower) {
    return 95;
  }
  
  // 英文名称完全匹配
  if (enNameLower && enNameLower === keywordLower) {
    return 90;
  }
  
  // 代码完全匹配
  if (codeLower && codeLower === keywordLower) {
    return 85;
  }
  
  // 前缀匹配（名称以关键词开头）
  if (nameLower.startsWith(keywordLower)) {
    return 80;
  }
  
  // 拼音前缀匹配
  if (pinyinLower && pinyinLower.startsWith(keywordLower)) {
    return 75;
  }
  
  // 英文名称前缀匹配
  if (enNameLower && enNameLower.startsWith(keywordLower)) {
    return 70;
  }
  
  // 代码前缀匹配
  if (codeLower && codeLower.startsWith(keywordLower)) {
    return 65;
  }
  
  // 包含匹配（名称包含关键词）
  if (nameLower.includes(keywordLower)) {
    return 50;
  }
  
  // 拼音包含匹配
  if (pinyinLower && pinyinLower.includes(keywordLower)) {
    return 45;
  }
  
  // 英文名称包含匹配
  if (enNameLower && enNameLower.includes(keywordLower)) {
    return 40;
  }
  
  // 代码包含匹配
  if (codeLower && codeLower.includes(keywordLower)) {
    return 35;
  }
  
  return 0;
};

/**
 * 按层级关系组织位置数据（优化版本）
 * 优化点：
 * 1. 预计算小写字符串，避免重复转换
 * 2. 预计算匹配分数，避免排序时重复计算
 * 3. 减少遍历次数，合并多个操作
 */
const organizeLocationsByHierarchy = (locations, searchKeyword = '') => {
  if (!locations || locations.length === 0) {
    return [];
  }

  const result = [];
  const parentMap = new Map();
  const childrenMap = new Map();
  const independentItems = [];

  // 预计算搜索关键词的小写版本
  const keywordLower = searchKeyword ? searchKeyword.trim().toLowerCase() : '';
  
  // 预计算所有位置的小写字符串和匹配分数（优化：减少重复计算）
  const locationMetadata = new Map();
  locations.forEach(location => {
    // 预计算小写字符串（只计算一次）
    const precomputed = {
      nameLower: (location.name || '').toLowerCase(),
      codeLower: (location.code || '').toLowerCase(),
      pinyinLower: (location.pinyin || '').toLowerCase(),
      enNameLower: (location.enName || '').toLowerCase()
    };
    
    const metadata = {
      ...precomputed,
      matchScore: keywordLower ? getMatchScore(location, keywordLower, precomputed) : 0
    };
    locationMetadata.set(location.id || location._id, metadata);
  });

  // 第一步：收集所有城市（合并操作，减少遍历）
  const allCities = new Map();
  const cityNameMap = new Map();
  
  locations.forEach(location => {
    if (location.type === 'city') {
      const locationId = location.id || location._id || location._id?.toString();
      if (locationId) {
        const idStr = locationId.toString();
        allCities.set(idStr, location);
        // 建立城市名称到城市的映射
        if (location.name) {
          const cityName = location.name.trim();
          if (!cityNameMap.has(cityName)) {
            cityNameMap.set(cityName, []);
          }
          cityNameMap.get(cityName).push(location);
        }
      }
    }
  });
  
  // 第二步：识别父城市和子城市（合并到一次遍历）
  const parentCityIds = new Set();
  const childCityIds = new Set();
  
  allCities.forEach((city, cityId) => {
    if (city.city && city.city !== city.name) {
      const parentCityName = city.city.trim();
      const parentCities = cityNameMap.get(parentCityName);
      if (parentCities && parentCities.length > 0) {
        childCityIds.add(cityId);
        parentCities.forEach(parentCity => {
          const parentId = parentCity.id || parentCity._id || parentCity._id?.toString();
          if (parentId) {
            parentCityIds.add(parentId.toString());
          }
        });
      } else {
        parentCityIds.add(cityId);
      }
    } else {
      parentCityIds.add(cityId);
    }
  });
  
  // 第三步：只保留父城市
  allCities.forEach((city, cityId) => {
    if (parentCityIds.has(cityId) && !childCityIds.has(cityId)) {
      parentMap.set(cityId, city);
    }
  });
  
  // 第四步：处理机场、火车站、汽车站（合并操作）
  locations.forEach(location => {
    if ((location.type === 'airport' || location.type === 'station' || location.type === 'bus') && location.parentId) {
      let parentId;
      if (typeof location.parentId === 'object') {
        parentId = location.parentId._id || location.parentId.id || location.parentId.toString();
      } else {
        parentId = location.parentId.toString();
      }
      
      if (parentId) {
        const parentIdStr = parentId.toString();
        if (parentCityIds.has(parentIdStr) && !childCityIds.has(parentIdStr)) {
          if (!childrenMap.has(parentIdStr)) {
            childrenMap.set(parentIdStr, []);
          }
          childrenMap.get(parentIdStr).push(location);
        } else {
          independentItems.push(location);
        }
      }
    } else if (location.type !== 'city') {
      independentItems.push(location);
    }
  });

  // 处理孤儿子项
  const orphanedChildren = [];
  childrenMap.forEach((children, parentId) => {
    if (!parentMap.has(parentId)) {
      orphanedChildren.push(...children);
    }
  });

  // 合并所有需要显示的机场/火车站/汽车站
  const allTransportationItems = [
    ...independentItems,
    ...orphanedChildren
  ];
  
  parentMap.forEach((city, cityId) => {
    const children = childrenMap.get(cityId.toString()) || [];
    allTransportationItems.push(...children);
  });

  // 对于火车站和汽车站，过滤匹配关键词的（使用预计算的元数据）
  if (keywordLower) {
    const filteredItems = allTransportationItems.filter(item => {
      if (item.type === 'airport') {
        return true;
      }
      
      if (item.type === 'station' || item.type === 'bus') {
        const metadata = locationMetadata.get(item.id || item._id);
        if (!metadata) return false;
        
        const { nameLower, pinyinLower, enNameLower, codeLower } = metadata;
        
        // 使用预计算的小写字符串进行匹配
        return nameLower.startsWith(keywordLower) || 
               nameLower === keywordLower || 
               nameLower.includes(keywordLower) ||
               (pinyinLower && (pinyinLower.startsWith(keywordLower) || pinyinLower === keywordLower || pinyinLower.includes(keywordLower))) ||
               (enNameLower && (enNameLower.startsWith(keywordLower) || enNameLower === keywordLower || enNameLower.includes(keywordLower))) ||
               (codeLower && (codeLower.startsWith(keywordLower) || codeLower === keywordLower || codeLower.includes(keywordLower)));
      }
      
      return true;
    });
    
    allTransportationItems.length = 0;
    allTransportationItems.push(...filteredItems);
  }

  // 排序（使用预计算的匹配分数）
  allTransportationItems.sort((a, b) => {
    const priorityA = TYPE_PRIORITY[a.type] || 99;
    const priorityB = TYPE_PRIORITY[b.type] || 99;
    
    if (priorityA !== priorityB) {
      return priorityA - priorityB;
    }
    
    // 使用预计算的匹配分数
    const metadataA = locationMetadata.get(a.id || a._id);
    const metadataB = locationMetadata.get(b.id || b._id);
    const matchScoreA = metadataA?.matchScore || 0;
    const matchScoreB = metadataB?.matchScore || 0;
    
    if (matchScoreA !== matchScoreB) {
      return matchScoreB - matchScoreA;
    }
    
    // 匹配度相同，按名称长度排序
    const nameLengthA = (a.name || '').length;
    const nameLengthB = (b.name || '').length;
    if (nameLengthA !== nameLengthB) {
      return nameLengthA - nameLengthB;
    }
    
    // 最后按名称中文排序
    return (a.name || '').localeCompare(b.name || '', 'zh-CN');
  });
  
  // 先添加城市（优先级最高）
  parentMap.forEach((city) => {
    result.push(city);
  });

  // 然后添加机场/火车站/汽车站（按优先级排序）
  allTransportationItems.forEach(item => result.push(item));

  return result;
};

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
  const { i18n, t } = useTranslation();
  const [currentLanguage, setCurrentLanguage] = useState(i18n.language || 'zh');
  const isChinese = currentLanguage.toLowerCase().startsWith('zh');
  
  // 监听语言变化
  useEffect(() => {
    const handleLanguageChange = (lng) => {
      setCurrentLanguage(lng || 'zh');
    };
    
    // 设置初始语言
    setCurrentLanguage(i18n.language || 'zh');
    
    // 监听语言变化事件
    i18n.on('languageChanged', handleLanguageChange);
    
    return () => {
      i18n.off('languageChanged', handleLanguageChange);
    };
  }, [i18n]);
  
  // 获取显示名称的辅助函数
  const getDisplayName = useCallback((location) => {
    if (!location) return '';
    const displayName = isChinese 
      ? (location.name || '') 
      : (location.enName || location.name || '');
    // 确保返回的是字符串，避免返回 undefined 或 null
    return String(displayName || '');
  }, [isChinese]);
  const [searchValue, setSearchValue] = useState('');
  const [filteredLocations, setFilteredLocations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState(null);
  // 状态标记：区分"用户正在输入"和"已选择位置"
  const [isUserTyping, setIsUserTyping] = useState(false);
  // 热门城市相关状态
  const [showHotCities, setShowHotCities] = useState(false);
  
  // 自动补全相关状态
  const [autocompleteSuggestions, setAutocompleteSuggestions] = useState([]);
  const [showAutocomplete, setShowAutocomplete] = useState(false);
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(-1);
  const [isComposing, setIsComposing] = useState(false); // 中文输入法组合状态
  
  const inputRef = useRef(null);
  const dropdownRef = useRef(null);
  const suggestionsRef = useRef(null);
  
  // 请求取消控制器
  const abortControllerRef = useRef(null);
  const autocompleteAbortControllerRef = useRef(null);
  const autocompleteTimeoutRef = useRef(null);
  
  // 搜索结果缓存（Map<keyword, {data, timestamp}>）
  const searchCacheRef = useRef(new Map());
  const CACHE_TTL = 5 * 60 * 1000; // 5分钟缓存时间
  const MAX_CACHE_SIZE = 100; // 最大缓存数量
  
  // 防重复搜索：记录上次搜索的关键词
  const lastSearchKeywordRef = useRef('');

  // 初始化显示值
  useEffect(() => {
    if (value) {
      // 如果value是字符串，直接显示
      if (typeof value === 'string') {
        setSearchValue(value);
        setSelectedLocation(null); // 稍后通过搜索匹配
        setIsUserTyping(false); // 初始化时不是用户输入
      } 
      // 如果value是对象
      else if (typeof value === 'object' && value !== null) {
        setSelectedLocation(value);
        // 根据语言选择显示名称
        const displayName = getDisplayName(value);
        // 汽车站不显示编码，城市类型显示国家代码，其他类型显示编码
        let codeToShow = '';
        if (value.type === 'city' && value.countryCode) {
          codeToShow = value.countryCode;
        } else if (value.type !== 'bus' && value.code) {
          codeToShow = value.code;
        }
        const displayValue = codeToShow ? `${displayName} (${codeToShow})` : displayName;
        setSearchValue(displayValue);
        setIsUserTyping(false); // 初始化时不是用户输入
      }
    } else {
      setSearchValue('');
      setSelectedLocation(null);
      setIsUserTyping(false);
    }
  }, [value, getDisplayName]);

  // 监听语言变化，更新已选择位置的显示
  useEffect(() => {
    if (selectedLocation) {
      const displayName = getDisplayName(selectedLocation);
      // 汽车站不显示编码，城市类型显示国家代码，其他类型显示编码
      let codeToShow = '';
      if (selectedLocation.type === 'city' && selectedLocation.countryCode) {
        codeToShow = selectedLocation.countryCode;
      } else if (selectedLocation.type !== 'bus' && selectedLocation.code) {
        codeToShow = selectedLocation.code;
      }
      const displayValue = codeToShow ? `${displayName} (${codeToShow})` : displayName;
      setSearchValue(displayValue);
      setIsUserTyping(false); // 语言变化更新显示时不是用户输入
    }
  }, [currentLanguage, selectedLocation, getDisplayName]);

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

  /**
   * 检查搜索关键词是否满足最小长度要求
   * 中文至少2个字符，英文/拼音至少3个字符，代码至少2个字符
   */
  const isValidSearchLength = useCallback((keyword) => {
    if (!keyword || !keyword.trim()) {
      return false;
    }
    
    const trimmed = keyword.trim();
    
    // 检查是否是代码（通常是2-4个大写字母或数字）
    if (/^[A-Z0-9]{2,4}$/i.test(trimmed)) {
      return trimmed.length >= 2;
    }
    
    // 检查是否包含中文字符
    const hasChinese = /[\u4e00-\u9fa5]/.test(trimmed);
    if (hasChinese) {
      // 中文至少2个字符
      return trimmed.length >= 2;
    }
    
    // 英文/拼音至少3个字符
    return trimmed.length >= 3;
  }, []);

  /**
   * 检查是否满足自动补全的最小长度要求（比搜索要求更宽松）
   * 中文至少1个字符，英文/拼音至少2个字符，代码至少1个字符
   */
  const isValidAutocompleteLength = useCallback((keyword) => {
    if (!keyword || !keyword.trim()) {
      return false;
    }
    
    const trimmed = keyword.trim();
    
    // 检查是否是代码
    if (/^[A-Z0-9]{1,4}$/i.test(trimmed)) {
      return trimmed.length >= 1;
    }
    
    // 检查是否包含中文字符
    const hasChinese = /[\u4e00-\u9fa5]/.test(trimmed);
    if (hasChinese) {
      // 中文至少1个字符
      return trimmed.length >= 1;
    }
    
    // 英文/拼音至少2个字符
    return trimmed.length >= 2;
  }, []);

  /**
   * 转换位置数据为标准格式（提取重复代码）
   */
  const transformLocationData = useCallback((location) => {
    if (!location || typeof location !== 'object' || !location.name) {
      return null;
    }
    
    // 处理 parentId：后端可能返回完整的 parentId 对象（包含城市信息）
    let parentId = null;
    let parentCity = null;
    let parentIdObj = null;
    
    if (location.parentId) {
      if (typeof location.parentId === 'object') {
        // parentId 是对象，包含完整的城市信息
        parentId = location.parentId._id || location.parentId.id || null;
        parentCity = location.parentId.name || null;
        parentIdObj = location.parentId; // 保留完整对象，用于后续提取城市信息
      } else {
        // parentId 是字符串或 ObjectId
        parentId = location.parentId.toString();
        parentIdObj = { _id: parentId };
      }
    }
    
    return {
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
      parentId: parentId,
      parentCity: parentCity,
      parentIdObj: parentIdObj, // 新增：保留完整的 parentId 对象，用于提取城市信息
      riskLevel: location.riskLevel || 'low',
      noAirport: location.noAirport || false
    };
  }, []);

  /**
   * 清理过期的缓存
   */
  const cleanExpiredCache = useCallback(() => {
    const now = Date.now();
    const cache = searchCacheRef.current;
    
    for (const [key, value] of cache.entries()) {
      if (now - value.timestamp > CACHE_TTL) {
        cache.delete(key);
      }
    }
    
    // 如果缓存数量超过最大值，删除最旧的
    if (cache.size > MAX_CACHE_SIZE) {
      const entries = Array.from(cache.entries());
      entries.sort((a, b) => a[1].timestamp - b[1].timestamp);
      const toDelete = entries.slice(0, cache.size - MAX_CACHE_SIZE);
      toDelete.forEach(([key]) => cache.delete(key));
    }
  }, []);

  /**
   * 获取缓存键（包含关键词和交通工具类型）
   */
  const getCacheKey = useCallback((keyword, transportationType) => {
    return `${keyword.trim().toLowerCase()}_${transportationType || 'all'}`;
  }, []);

  /**
   * 检查是否是取消错误
   */
  const isCancelError = useCallback((error) => {
    if (!error) return false;
    return error.name === 'CanceledError' || 
           error.name === 'AbortError' || 
           error.code === 'ERR_CANCELED' ||
           (error.message && error.message.includes('canceled'));
  }, []);

  /**
   * 从缓存获取搜索结果（返回深拷贝，避免状态污染）
   */
  const getCachedResult = useCallback((keyword, transportationType) => {
    cleanExpiredCache();
    const cacheKey = getCacheKey(keyword, transportationType);
    const cached = searchCacheRef.current.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      // 返回深拷贝，避免状态污染
      try {
        return JSON.parse(JSON.stringify(cached.data));
      } catch (error) {
        // 如果深拷贝失败，返回原数据（虽然不理想，但至少不会崩溃）
        return cached.data;
      }
    }
    
    return null;
  }, [cleanExpiredCache, getCacheKey]);

  /**
   * 保存搜索结果到缓存
   */
  const setCachedResult = useCallback((keyword, transportationType, data) => {
    cleanExpiredCache();
    const cacheKey = getCacheKey(keyword, transportationType);
    searchCacheRef.current.set(cacheKey, {
      data: data,
      timestamp: Date.now()
    });
  }, [cleanExpiredCache, getCacheKey]);

  /**
   * 获取自动补全建议（轻量级搜索，只返回少量结果）
   */
  const fetchAutocompleteSuggestions = useCallback(async (keyword) => {
    if (!keyword || !keyword.trim()) {
      setAutocompleteSuggestions([]);
      setShowAutocomplete(false);
      return;
    }

    const trimmedKeyword = keyword.trim();
    
    // 检查是否满足自动补全的最小长度要求
    if (!isValidAutocompleteLength(trimmedKeyword)) {
      setAutocompleteSuggestions([]);
      setShowAutocomplete(false);
      return;
    }

    // 取消之前的请求
    if (autocompleteAbortControllerRef.current) {
      autocompleteAbortControllerRef.current.abort();
    }

    const abortController = new AbortController();
    autocompleteAbortControllerRef.current = abortController;

    try {
      // 检测输入类型：中文、拼音或英语
      const hasChinese = /[\u4e00-\u9fa5]/.test(trimmedKeyword);
      const isPinyinOrEnglish = !hasChinese && /^[a-zA-Z\s]+$/.test(trimmedKeyword);
      
      const params = {
        status: 'active',
        search: trimmedKeyword,
        page: 1,
        limit: 8 // 自动补全只返回8条建议
      };

      // 如果输入是拼音或英语，添加参数告诉后端优先查询 enName 和 pinyin
      if (isPinyinOrEnglish) {
        params.searchPriority = 'enName_pinyin'; // 告诉后端优先查询 enName 和 pinyin
      }

      // 根据交通工具类型添加过滤
      if (transportationType) {
        switch (transportationType) {
          case 'flight':
            // 不限制type，返回机场和城市
            break;
          case 'train':
            // 不限制type，返回火车站和城市
            break;
          case 'car':
          case 'bus':
            params.type = 'city';
            break;
        }
      }

      const response = await apiClient.get('/locations', {
        params,
        signal: abortController.signal
      });

      if (abortController.signal.aborted) {
        return;
      }

      if (response.data && response.data.success) {
        const locations = response.data.data || [];
        const suggestions = locations
          .map(transformLocationData)
          .filter(location => location !== null)
          .slice(0, 8); // 限制最多8条

        // 只有在请求未被取消时才更新状态
        if (!abortController.signal.aborted) {
          setAutocompleteSuggestions(suggestions);
          setShowAutocomplete(suggestions.length > 0);
          setSelectedSuggestionIndex(-1);
        }
      } else {
        if (!abortController.signal.aborted) {
          setAutocompleteSuggestions([]);
          setShowAutocomplete(false);
        }
      }
    } catch (error) {
      if (isCancelError(error) || abortController.signal.aborted) {
        return;
      }
      // 自动补全失败不影响主搜索，静默处理
      if (!abortController.signal.aborted) {
        setAutocompleteSuggestions([]);
        setShowAutocomplete(false);
      }
    }
  }, [transportationType, transformLocationData, isValidAutocompleteLength, isCancelError]);

  // 从后端API搜索地理位置数据（按需搜索，提升性能）
  const searchLocationsFromAPI = useCallback(async (keyword) => {
    // 防重复搜索：如果关键词与上次相同，跳过
    const trimmedKeyword = keyword?.trim() || '';
    if (trimmedKeyword === lastSearchKeywordRef.current) {
      return;
    }
    
    // 更新上次搜索关键词
    lastSearchKeywordRef.current = trimmedKeyword;
    
    if (!keyword || keyword.trim().length < 1) {
      setFilteredLocations([]);
      return;
    }

    // 检查最小搜索长度
    if (!isValidSearchLength(keyword)) {
      setFilteredLocations([]);
      setLoading(false);
      return;
    }

    // 检查缓存
    const cachedResult = getCachedResult(keyword, transportationType);
    if (cachedResult) {
      setFilteredLocations(cachedResult);
      setLoading(false);
      return;
    }

    // 取消之前的请求
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // 创建新的 AbortController
    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    setLoading(true);
    setErrorMessage('');
    
    try {
      // 检测输入类型：中文、拼音或英语
      const trimmedKeyword = keyword.trim();
      const hasChinese = /[\u4e00-\u9fa5]/.test(trimmedKeyword);
      const isPinyinOrEnglish = !hasChinese && /^[a-zA-Z\s]+$/.test(trimmedKeyword);
      
      // 优化：根据交通工具类型智能决定是否使用 includeChildren
      // 构建查询参数
      const params = {
        status: 'active',
        search: trimmedKeyword,
        page: 1,
        limit: 50, // 限制返回50条结果
      };
      
      // 如果输入是拼音或英语，添加参数告诉后端优先查询 enName 和 pinyin
      if (isPinyinOrEnglish) {
        params.searchPriority = 'enName_pinyin'; // 告诉后端优先查询 enName 和 pinyin
      }

      // 根据交通工具类型添加过滤和优化 includeChildren
      if (transportationType) {
        switch (transportationType) {
          case 'flight':
            // 对于飞机，搜索机场和城市
            // 使用 includeChildren 获取城市的机场，但限制每个城市最多5个机场
            params.includeChildren = 'true';
            params.maxChildrenPerCity = 5; // 每个城市最多5个机场
            break;
          case 'train':
            // 对于火车，搜索火车站和城市
            // 使用 includeChildren 获取城市的火车站，但限制每个城市最多5个火车站
            params.includeChildren = 'true';
            params.maxChildrenPerCity = 5; // 每个城市最多5个火车站
            break;
          case 'car':
          case 'bus':
            // 对于汽车/公交，只搜索城市，不需要子项
            params.type = 'city';
            // 不使用 includeChildren，减少数据传输
            break;
          default:
            // 默认情况：不使用 includeChildren，避免返回过多数据
            break;
        }
      } else {
        // 没有指定交通工具类型时，不使用 includeChildren
        // 避免返回过多不必要的数据
      }
      
      const response = await apiClient.get('/locations', { 
        params,
        signal: abortController.signal
      });
      
      // 检查请求是否被取消
      if (abortController.signal.aborted) {
        return;
      }
      
      if (!response.data || !response.data.success) {
        throw new Error(response.data?.message || '搜索地理位置数据失败');
      }
      
      const locations = response.data.data || [];
      
      // 验证并转换数据结构（使用提取的函数）
      const validLocations = locations
        .map(transformLocationData)
        .filter(location => location !== null);

      // 优化：由于使用了 includeChildren 参数，子项已经包含在结果中
      // 后端已经通过 parentId 字段包含了城市信息，不需要额外的API调用
      
      // 从机场/火车站的 parentId 中提取城市信息，确保城市也在结果中
      if (transportationType === 'flight' || transportationType === 'train') {
        const cityMap = new Map(); // 用于存储已提取的城市，避免重复
        
        // 先收集所有城市（直接匹配的城市）
        validLocations.forEach(loc => {
          if (loc.type === 'city' && loc._id) {
            cityMap.set(loc._id.toString(), loc);
          }
        });
        
        // 从机场/火车站的 parentId 中提取城市信息
        validLocations.forEach(loc => {
          if ((loc.type === 'airport' || loc.type === 'station') && loc.parentId) {
            const parentIdStr = loc.parentId.toString();
            
            // 如果该城市不在结果中，且 parentIdObj 中有城市信息，则添加城市
            if (parentIdStr && !cityMap.has(parentIdStr) && loc.parentIdObj) {
              const parentCity = loc.parentIdObj;
              
              // 从 parentIdObj 中提取城市信息（后端已经填充了完整的城市信息）
              if (parentCity.name) {
                const cityInfo = {
                  id: parentIdStr,
                  _id: parentIdStr,
                  name: parentCity.name,
                  code: parentCity.code || '',
                  type: 'city',
                  city: parentCity.city || parentCity.name,
                  province: parentCity.province || '',
                  district: '',
                  county: '',
                  country: loc.country || '中国',
                  countryCode: loc.countryCode || '',
                  enName: parentCity.enName || '',
                  pinyin: '',
                  coordinates: { latitude: 0, longitude: 0 },
                  timezone: 'Asia/Shanghai',
                  status: 'active',
                  parentId: null,
                  parentCity: null,
                  parentIdObj: null,
                  riskLevel: 'low',
                  noAirport: parentCity.noAirport || false
                };
                cityMap.set(parentIdStr, cityInfo);
                validLocations.push(cityInfo);
              }
            }
          }
        });
      }
      
      // 去重（基于 _id），因为 includeChildren 可能导致重复
      const uniqueLocations = Array.from(
        new Map(validLocations.map(loc => [loc._id || loc.id, loc])).values()
      );

      // 优化：由于使用了 includeChildren，子项已经包含在 uniqueLocations 中
      // 根据交通工具类型过滤
      let filteredResults = uniqueLocations;
      if (transportationType) {
        filteredResults = uniqueLocations.filter(location => {
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
      }

      // 最终去重（虽然已经去重过，但为了确保）
      const uniqueResults = Array.from(
        new Map(filteredResults.map(item => [item._id || item.id, item])).values()
      );
      
      // 检查请求是否被取消
      if (abortController.signal.aborted) {
        return;
      }
      
      // 保存到缓存
      setCachedResult(keyword, transportationType, uniqueResults);
      
      setFilteredLocations(uniqueResults);
    } catch (error) {
      // 如果是取消请求，不显示错误
      if (isCancelError(error) || abortController.signal.aborted) {
        return;
      }
      
      const errorMessage = error.response?.data?.message || error.message || '搜索地理位置数据失败';
      setErrorMessage(errorMessage);
      setFilteredLocations([]);
    } finally {
      // 只有在请求未被取消时才更新loading状态
      if (!abortController.signal.aborted) {
        setLoading(false);
      }
    }
  }, [transportationType, transformLocationData, isValidSearchLength, getCachedResult, setCachedResult, isCancelError]);


  // 当value变化时，如果需要查找对应的位置数据
  useEffect(() => {
    if (value && typeof value === 'string' && value.trim()) {
      // 如果value是字符串，尝试搜索匹配的位置
      // 标记为用户输入状态，允许搜索
      setIsUserTyping(true);
      const timeoutId = setTimeout(() => {
        searchLocationsFromAPI(value);
      }, 300);
      return () => {
        clearTimeout(timeoutId);
        // 取消请求
        if (abortControllerRef.current) {
          abortControllerRef.current.abort();
        }
      };
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
      setAutocompleteSuggestions([]);
      setShowAutocomplete(false);
      // 如果输入框有焦点，显示热门城市
      if (document.activeElement === inputRef.current) {
        setShowHotCities(true);
        setShowDropdown(true);
      } else {
        setShowHotCities(false);
        setShowDropdown(false);
      }
      // 清空上次搜索关键词
      lastSearchKeywordRef.current = '';
      return;
    }

    // 如果已选择位置且不是用户正在输入，跳过搜索（避免已选择位置时重复搜索）
    if (selectedLocation && !isUserTyping) {
      return;
    }

    // 检查最小搜索长度
    if (!isValidSearchLength(searchValue)) {
      setFilteredLocations([]);
      setShowHotCities(false);
      setShowDropdown(true);
      // 如果满足自动补全条件，只显示自动补全建议
      if (isValidAutocompleteLength(searchValue)) {
        // 自动补全建议已经在 handleInputChange 中获取
        return;
      }
      return;
    }

    // 有搜索内容时，隐藏热门城市和自动补全，显示搜索结果
    setShowHotCities(false);
    setShowAutocomplete(false);

    // 防抖处理，避免频繁请求
    const timeoutId = setTimeout(() => {
      searchLocationsFromAPI(searchValue);
    }, 300); // 300ms防抖，给用户输入时间

    return () => {
      clearTimeout(timeoutId);
      // 组件卸载时取消请求
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [searchValue, searchLocationsFromAPI, isValidSearchLength, isValidAutocompleteLength, selectedLocation, isUserTyping]);

  // 组件卸载时的清理
  useEffect(() => {
    return () => {
      // 取消进行中的请求
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      if (autocompleteAbortControllerRef.current) {
        autocompleteAbortControllerRef.current.abort();
      }
      // 清除防抖定时器
      if (autocompleteTimeoutRef.current) {
        clearTimeout(autocompleteTimeoutRef.current);
      }
    };
  }, []);

  // 处理输入框点击
  const handleInputClick = () => {
    if (disabled) return;
    setShowDropdown(true);
  };

  // 处理输入框焦点
  const handleInputFocus = () => {
    if (disabled) return;
    setShowDropdown(true);
    // 如果没有搜索内容，显示热门城市
    if (!searchValue.trim()) {
      setShowHotCities(true);
    }
  };

  // 处理输入框失焦
  const handleInputBlur = (event) => {
    // 延迟隐藏下拉框，以便点击选项
    setTimeout(() => {
      if (!dropdownRef.current?.contains(document.activeElement)) {
        setShowDropdown(false);
        setShowHotCities(false);
      }
    }, 150);
  };

  // 处理选择
  const handleSelect = (location) => {
    // 根据语言选择显示名称
    const displayName = getDisplayName(location);
    // 汽车站不显示编码，城市类型显示国家代码，其他类型显示编码
    let codeToShow = '';
    if (location.type === 'city' && location.countryCode) {
      codeToShow = location.countryCode;
    } else if (location.type !== 'bus' && location.code) {
      codeToShow = location.code;
    }
    const displayValue = codeToShow ? `${displayName} (${codeToShow})` : displayName;
    setSearchValue(displayValue);
    setSelectedLocation(location);
    setIsUserTyping(false); // 选择位置后，标记为非用户输入状态
    setShowDropdown(false);
    // 清空上次搜索关键词，允许下次搜索
    lastSearchKeywordRef.current = '';
    
    // 调用onChange回调，传递完整的location对象
    onChange(location);
  };

  // 处理清除
  const handleClear = () => {
    setSearchValue('');
    setSelectedLocation(null);
    setIsUserTyping(false); // 清除时标记为非用户输入状态
    // 清空上次搜索关键词
    lastSearchKeywordRef.current = '';
    onChange(null);
  };

  // 处理输入变化
  const handleInputChange = useCallback((event) => {
    const value = event.target.value;
    setSearchValue(value);
    setIsUserTyping(true); // 用户输入时，标记为用户输入状态
    setSelectedLocation(null); // 用户输入时，清空已选择的位置
    
    if (value.trim()) {
      setShowDropdown(true);
      setShowHotCities(false); // 有输入时隐藏热门城市
      
      // 如果满足自动补全条件，获取建议（使用防抖）
      if (isValidAutocompleteLength(value)) {
        // 清除之前的防抖定时器
        if (autocompleteTimeoutRef.current) {
          clearTimeout(autocompleteTimeoutRef.current);
        }
        
        // 设置防抖，200ms后获取建议
        autocompleteTimeoutRef.current = setTimeout(() => {
          fetchAutocompleteSuggestions(value);
        }, 200);
      } else {
        // 不满足自动补全条件，清除建议
        if (autocompleteTimeoutRef.current) {
          clearTimeout(autocompleteTimeoutRef.current);
          autocompleteTimeoutRef.current = null;
        }
        setAutocompleteSuggestions([]);
        setShowAutocomplete(false);
      }
    } else {
      // 清空输入，清除所有状态
      if (autocompleteTimeoutRef.current) {
        clearTimeout(autocompleteTimeoutRef.current);
        autocompleteTimeoutRef.current = null;
      }
      // 清空上次搜索关键词
      lastSearchKeywordRef.current = '';
      setShowDropdown(false);
      setAutocompleteSuggestions([]);
      setShowAutocomplete(false);
      // 如果输入框有焦点，显示热门城市
      if (document.activeElement === inputRef.current) {
        setShowHotCities(true);
        setShowDropdown(true);
      }
    }
  }, [isValidAutocompleteLength, fetchAutocompleteSuggestions]);

  // 处理键盘事件（用于自动补全导航）
  const handleKeyDown = (event) => {
    // 如果正在使用中文输入法，不处理导航键
    if (isComposing) {
      return;
    }

    // 如果显示自动补全建议
    if (showAutocomplete && autocompleteSuggestions.length > 0) {
      switch (event.key) {
        case 'ArrowDown':
          event.preventDefault();
          setSelectedSuggestionIndex(prev => {
            const nextIndex = prev < autocompleteSuggestions.length - 1 ? prev + 1 : prev;
            // 滚动到选中的建议
            if (suggestionsRef.current && nextIndex >= 0) {
              const suggestionElement = suggestionsRef.current.children[nextIndex];
              if (suggestionElement) {
                suggestionElement.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
              }
            }
            return nextIndex;
          });
          break;
        case 'ArrowUp':
          event.preventDefault();
          setSelectedSuggestionIndex(prev => {
            const nextIndex = prev > 0 ? prev - 1 : -1;
            // 滚动到选中的建议
            if (suggestionsRef.current && nextIndex >= 0) {
              const suggestionElement = suggestionsRef.current.children[nextIndex];
              if (suggestionElement) {
                suggestionElement.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
              }
            }
            return nextIndex;
          });
          break;
        case 'Enter':
          if (selectedSuggestionIndex >= 0 && selectedSuggestionIndex < autocompleteSuggestions.length) {
            event.preventDefault();
            const selectedSuggestion = autocompleteSuggestions[selectedSuggestionIndex];
            handleSelectSuggestion(selectedSuggestion);
          }
          break;
        case 'Escape':
          event.preventDefault();
          setShowAutocomplete(false);
          setSelectedSuggestionIndex(-1);
          break;
        default:
          break;
      }
    }
  };

  // 处理中文输入法组合开始
  const handleCompositionStart = () => {
    setIsComposing(true);
  };

  // 处理中文输入法组合结束
  const handleCompositionEnd = () => {
    setIsComposing(false);
  };

  // 选择自动补全建议
  const handleSelectSuggestion = useCallback((suggestion) => {
    const displayName = getDisplayName(suggestion);
    const displayValue = suggestion.type === 'bus'
      ? displayName
      : `${displayName}${suggestion.code ? ` (${suggestion.code})` : ''}`;
    
    // 清除防抖定时器
    if (autocompleteTimeoutRef.current) {
      clearTimeout(autocompleteTimeoutRef.current);
      autocompleteTimeoutRef.current = null;
    }
    
    setSearchValue(displayValue);
    setSelectedLocation(suggestion);
    setIsUserTyping(false); // 选择建议后，标记为非用户输入状态
    setShowAutocomplete(false);
    setAutocompleteSuggestions([]);
    setSelectedSuggestionIndex(-1);
    // 清空上次搜索关键词，允许下次搜索
    lastSearchKeywordRef.current = '';
    
    // 调用onChange回调
    onChange(suggestion);
    
    // 触发完整搜索以获取更多结果
    if (isValidSearchLength(displayName)) {
      searchLocationsFromAPI(displayName);
    }
  }, [getDisplayName, isValidSearchLength, searchLocationsFromAPI, onChange]);

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

  // 处理热门城市选择
  const handleHotCitySelect = useCallback(async (city, displayName, searchName) => {
    // 设置搜索值（显示名称）
    setSearchValue(displayName);
    setShowHotCities(false);
    
    // 搜索该城市（使用搜索名称，可能是中文或英文）
    try {
      await searchLocationsFromAPI(searchName);
      // 如果搜索到结果，自动选择第一个匹配的城市
      // 注意：这里不自动选择，让用户从搜索结果中选择
    } catch (error) {
      // 搜索失败，静默处理
    }
  }, [searchLocationsFromAPI]);

  // 使用 useMemo 缓存组织后的位置数据（优化性能）
  // 只在 filteredLocations 或 searchValue 变化时重新计算
  const organizedLocations = useMemo(() => {
    if (!filteredLocations || filteredLocations.length === 0) {
      return [];
    }
    return organizeLocationsByHierarchy(filteredLocations, searchValue.trim());
  }, [filteredLocations, searchValue]);

  // 渲染自动补全建议
  const renderAutocompleteSuggestions = () => {
    if (!showAutocomplete || autocompleteSuggestions.length === 0) {
      return null;
    }

    return (
      <Box sx={{ p: 0 }}>
        <Box sx={{ px: 2, py: 1, borderBottom: '1px solid #e5e7eb' }}>
          <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.75rem', fontWeight: 500 }}>
            搜索建议
          </Typography>
        </Box>
        <List ref={suggestionsRef} sx={{ p: 0, maxHeight: 300, overflowY: 'auto' }}>
          {autocompleteSuggestions.map((suggestion, index) => {
            const isSelected = index === selectedSuggestionIndex;
            return (
              <ListItem
                key={suggestion.id || suggestion._id}
                button
                onClick={() => handleSelectSuggestion(suggestion)}
                onMouseEnter={() => setSelectedSuggestionIndex(index)}
                sx={{
                  py: 1,
                  px: 2,
                  bgcolor: isSelected ? alpha(theme.palette.primary.main, 0.08) : 'transparent',
                  '&:hover': {
                    backgroundColor: alpha(theme.palette.primary.main, 0.12),
                  },
                }}
              >
                <ListItemIcon sx={{ minWidth: 36 }}>
                  {getTypeIcon(suggestion.type)}
                </ListItemIcon>
                <ListItemText
                  primary={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                      <Typography variant="body2" sx={{ fontWeight: isSelected ? 600 : 400 }}>
                        {getDisplayName(suggestion)}
                      </Typography>
                      {/* 城市类型显示国家代码，其他类型显示编码 */}
                      {suggestion.type === 'city' && suggestion.countryCode ? (
                        <Chip
                          label={suggestion.countryCode}
                          size="small"
                          variant="outlined"
                          sx={{ height: 18, fontSize: '0.7rem' }}
                        />
                      ) : suggestion.code && suggestion.type !== 'bus' ? (
                        <Chip
                          label={suggestion.code}
                          size="small"
                          variant="outlined"
                          sx={{ height: 18, fontSize: '0.7rem' }}
                        />
                      ) : null}
                      {/* 右侧标识区域（无机场标识显示在最右侧） */}
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, marginLeft: 'auto' }}>
                        {/* 城市类型显示无机场标识 */}
                        {suggestion.type === 'city' && suggestion.noAirport ? (
                          <Chip
                            label="无机场"
                            size="small"
                            color="warning"
                            variant="outlined"
                            sx={{ 
                              height: 18, 
                              fontSize: '0.7rem',
                              fontWeight: 500
                            }}
                          />
                        ) : null}
                      </Box>
                    </Box>
                  }
                  secondary={
                    <Typography variant="caption" color="text.secondary">
                      {[
                        suggestion.city,
                        suggestion.province && suggestion.province !== suggestion.city ? suggestion.province : null,
                        isChinese ? suggestion.country : (suggestion.countryCode || suggestion.country)
                      ].filter(Boolean).join(', ')}
                    </Typography>
                  }
                />
              </ListItem>
            );
          })}
        </List>
      </Box>
    );
  };

  // 渲染下拉框内容
  const renderDropdownContent = () => {
    // 如果显示热门城市
    if (showHotCities && !searchValue.trim()) {
      return (
        <HotCitySelector
          onCitySelect={handleHotCitySelect}
          currentLanguage={currentLanguage}
        />
      );
    }

    // 如果显示自动补全建议（且不满足完整搜索条件）
    // 注意：只有在不满足完整搜索条件时才显示自动补全建议
    if (showAutocomplete && autocompleteSuggestions.length > 0 && !isValidSearchLength(searchValue)) {
      return renderAutocompleteSuggestions();
    }

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

    if (filteredLocations.length === 0 && searchValue.trim() && isValidSearchLength(searchValue)) {
      return (
        <Box sx={{ p: 2, textAlign: 'center' }}>
          <Typography variant="body2" color="text.secondary">
            未找到匹配的地区
          </Typography>
        </Box>
      );
    }

    // 使用已缓存的 organizedLocations（在组件顶层通过 useMemo 计算）

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
                        {getDisplayName(location)}
                      </Typography>
                      <Chip
                        label={getTypeLabel(location.type)}
                        size="small"
                        color={getTypeColor(location.type)}
                        sx={{ height: 20, fontSize: '0.75rem' }}
                      />
                      {/* 汽车站不显示编码 */}
                      {/* 城市类型显示国家代码，其他类型显示编码 */}
                      {location.type === 'city' && location.countryCode ? (
                        <Chip
                          label={location.countryCode}
                          size="small"
                          variant="outlined"
                          sx={{ height: 20, fontSize: '0.75rem' }}
                        />
                      ) : location.code && location.type !== 'bus' ? (
                        <Chip
                          label={location.code}
                          size="small"
                          variant="outlined"
                          sx={{ height: 20, fontSize: '0.75rem' }}
                        />
                      ) : null}
                      {/* 右侧标识区域（风险等级和无机场标识） */}
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, marginLeft: 'auto' }}>
                        {/* 城市类型显示风险等级（低风险不显示） */}
                        {location.type === 'city' && location.riskLevel && location.riskLevel !== 'low' ? (
                          <Chip
                            label={`风险${getRiskLevelLabel(location.riskLevel)}`}
                            size="small"
                            color={getRiskLevelColor(location.riskLevel)}
                            sx={{ 
                              height: 20, 
                              fontSize: '0.7rem',
                              fontWeight: 600,
                              ...(location.riskLevel === 'high' || location.riskLevel === 'very_high' ? {
                                animation: `${pulse} 2s infinite`
                              } : {})
                            }}
                          />
                        ) : null}
                        {/* 城市类型显示无机场标识（显示在最右侧） */}
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
                    </Box>
                  }
                  secondary={
                    <Typography variant="body2" color="text.secondary">
                      {[
                        location.province && location.province !== location.city ? location.province : null,
                        location.city,
                        location.district,
                        isChinese ? location.country : (location.countryCode || location.country)
                      ].filter(Boolean).join(', ')}
                      {location.parentCity && (
                        <span> • {isChinese ? '隶属' : 'Parent'}: {isChinese ? location.parentCity : (location.parentCityEnName || location.parentCity)}</span>
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
    const viewportWidth = window.innerWidth;
    const spaceBelow = viewportHeight - inputRect.bottom;
    const spaceAbove = inputRect.top;
    const maxDropdownHeight = Math.min(500, viewportHeight - 100); // 热门城市需要更高
    
    // 如果显示热门城市，使用更宽的宽度
    const dropdownWidth = showHotCities 
      ? Math.min(800, viewportWidth - 40) // 热门城市界面宽度
      : Math.max(inputRect.width, 300); // 普通搜索界面宽度
    
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

    // 调整左侧位置，确保不超出屏幕
    let left = inputRect.left + scrollLeft;
    if (left + dropdownWidth > viewportWidth) {
      left = viewportWidth - dropdownWidth - 20;
    }
    if (left < 20) {
      left = 20;
    }

    return {
      top: Math.max(10, top), // 确保不会超出屏幕顶部
      left: left,
      width: dropdownWidth,
      maxHeight: Math.max(showHotCities ? 400 : 200, maxHeight), // 热门城市最小高度400px
    };
  };


  return (
    <Box sx={{ position: 'relative' }}>
      <StyledTextField
        ref={inputRef}
        fullWidth
        label={label}
        value={searchValue}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
        onCompositionStart={handleCompositionStart}
        onCompositionEnd={handleCompositionEnd}
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
