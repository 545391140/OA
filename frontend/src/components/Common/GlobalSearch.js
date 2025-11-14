import React, { useState, useEffect, useRef } from 'react';
import {
  Dialog,
  DialogContent,
  TextField,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Typography,
  Box,
  Chip,
  InputAdornment,
  CircularProgress,
  Divider,
  IconButton,
  Tabs,
  Tab
} from '@mui/material';
import {
  Search as SearchIcon,
  Close as CloseIcon,
  Flight as TravelIcon,
  Receipt as ExpenseIcon,
  Person as PersonIcon,
  Business as BusinessIcon,
  LocationOn as LocationIcon,
  Settings as SettingsIcon,
  History as HistoryIcon,
  TrendingUp as TrendingIcon
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import apiClient from '../../utils/axiosConfig';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';

dayjs.extend(relativeTime);

const GlobalSearch = ({ open, onClose }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState({
    travels: [],
    expenses: [],
    users: [],
    standards: [],
    locations: []
  });
  const [loading, setLoading] = useState(false);
  const [selectedTab, setSelectedTab] = useState(0);
  const [searchHistory, setSearchHistory] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const searchInputRef = useRef(null);

  // 从API加载搜索历史
  useEffect(() => {
    loadSearchHistory();
  }, [open]);

  const loadSearchHistory = async () => {
    try {
      const response = await apiClient.get('/search/history', {
        params: { limit: 10 }
      });
      if (response.data && response.data.success) {
        setSearchHistory(response.data.data.slice(0, 5));
      }
    } catch (error) {
      console.error('Load search history error:', error);
      // 回退到localStorage
      const history = JSON.parse(localStorage.getItem('searchHistory') || '[]');
      setSearchHistory(history.slice(0, 5));
    }
  };

  // 自动聚焦搜索框
  useEffect(() => {
    if (open && searchInputRef.current) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 100);
    }
  }, [open]);

  // 搜索建议防抖
  useEffect(() => {
    if (!searchTerm.trim()) {
      setSuggestions([]);
      setShowSuggestions(false);
      setSearchResults({
        travels: [],
        expenses: [],
        users: [],
        standards: [],
        locations: []
      });
      return;
    }

    const debounceTimer = setTimeout(() => {
      loadSuggestions(searchTerm);
    }, 200);

    return () => clearTimeout(debounceTimer);
  }, [searchTerm]);

  // 执行搜索防抖
  useEffect(() => {
    if (!searchTerm.trim()) {
      return;
    }

    const debounceTimer = setTimeout(() => {
      performSearch(searchTerm);
    }, 500);

    return () => clearTimeout(debounceTimer);
  }, [searchTerm]);

  const loadSuggestions = async (query) => {
    try {
      const response = await apiClient.get('/search/suggestions', {
        params: { q: query, limit: 5 }
      });
      if (response.data && response.data.success) {
        setSuggestions(response.data.data);
        setShowSuggestions(true);
      }
    } catch (error) {
      console.error('Load suggestions error:', error);
      setSuggestions([]);
    }
  };

  const performSearch = async (query) => {
    if (!query.trim()) return;

    setLoading(true);
    try {
      // 使用全局搜索API
      const response = await apiClient.get('/search/global', {
        params: { q: query, limit: 5 }
      });

      if (response.data && response.data.success) {
        const data = response.data.data;
        setSearchResults({
          travels: data.travels || [],
          expenses: data.expenses || [],
          users: data.users || [],
          standards: data.standards || [],
          locations: data.locations || []
        });
      }

      // 搜索历史由后端自动保存
      setShowSuggestions(false);
    } catch (error) {
      console.error('Search error:', error);
      // 如果API失败，尝试使用原来的方式
      try {
        const [travelsRes, expensesRes, usersRes, standardsRes, locationsRes] = await Promise.allSettled([
          apiClient.get('/travel', { params: { search: query, limit: 5 } }),
          apiClient.get('/expenses', { params: { search: query, limit: 5 } }),
          apiClient.get('/users', { params: { search: query, limit: 5 } }),
          apiClient.get('/travel-standards', { params: { search: query, limit: 5 } }),
          apiClient.get('/locations', { params: { search: query, limit: 5 } })
        ]);

        setSearchResults({
          travels: travelsRes.status === 'fulfilled' ? (travelsRes.value.data?.data || []) : [],
          expenses: expensesRes.status === 'fulfilled' ? (expensesRes.value.data?.data || []) : [],
          users: usersRes.status === 'fulfilled' ? (usersRes.value.data?.data || []) : [],
          standards: standardsRes.status === 'fulfilled' ? (standardsRes.value.data?.data || []) : [],
          locations: locationsRes.status === 'fulfilled' ? (locationsRes.value.data?.data || []) : []
        });
      } catch (fallbackError) {
        console.error('Fallback search error:', fallbackError);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSuggestionClick = (suggestion) => {
    setSearchTerm(suggestion.query);
    setShowSuggestions(false);
    performSearch(suggestion.query);
  };

  const clearHistory = async () => {
    try {
      await apiClient.delete('/search/history');
      setSearchHistory([]);
    } catch (error) {
      console.error('Clear history error:', error);
      localStorage.removeItem('searchHistory');
      setSearchHistory([]);
    }
  };

  const deleteHistoryItem = async (id) => {
    try {
      await apiClient.delete(`/search/history/${id}`);
      loadSearchHistory();
    } catch (error) {
      console.error('Delete history item error:', error);
    }
  };

  const handleResultClick = (type, id) => {
    const routes = {
      travel: `/travel/${id}`,
      expense: `/expenses/${id}`,
      user: `/users`,
      standard: `/travel-standards`,
      location: `/location`
    };
    navigate(routes[type] || '/');
    handleClose();
  };


  const handleClose = () => {
    setSearchTerm('');
    setSelectedTab(0);
    setSuggestions([]);
    setShowSuggestions(false);
    onClose();
  };

  const getResultIcon = (type) => {
    const icons = {
      travel: <TravelIcon />,
      expense: <ExpenseIcon />,
      user: <PersonIcon />,
      standard: <SettingsIcon />,
      location: <LocationIcon />
    };
    return icons[type] || <SearchIcon />;
  };

  const getTotalResults = () => {
    return Object.values(searchResults).reduce((sum, arr) => sum + arr.length, 0);
  };

  const getPrimaryText = (item, type) => {
    switch (type) {
      case 'travel':
        // 差旅：优先显示title，如果没有则显示purpose或travelNumber或destination
        if (item.title) return item.title;
        if (item.purpose) return item.purpose;
        if (item.travelNumber) return item.travelNumber;
        if (item.destination) {
          if (typeof item.destination === 'string') return item.destination;
          if (item.destination.name) return item.destination.name;
          if (item.destination.city) return item.destination.city;
        }
        return t('travel.untitled') || '未命名差旅';
      
      case 'expense':
        // 费用：优先显示title，如果没有则显示description或category
        if (item.title) return item.title;
        if (item.description) return item.description;
        if (item.category) return item.category;
        return t('expense.untitled') || '未命名费用';
      
      case 'user':
        // 用户：显示姓名，需要处理undefined情况
        const firstName = item.firstName || '';
        const lastName = item.lastName || '';
        if (firstName || lastName) {
          return `${firstName} ${lastName}`.trim();
        }
        if (item.email) return item.email;
        if (item.employeeId) return item.employeeId;
        return t('user.unknown') || '未知用户';
      
      case 'standard':
        // 标准：显示standardName或standardCode
        if (item.standardName) return item.standardName;
        if (item.standardCode) return item.standardCode;
        return t('travelStandard.untitled') || '未命名标准';
      
      case 'location':
        // 地点：显示name或city或country
        if (item.name) return item.name;
        if (item.city) return item.city;
        if (item.country) return item.country;
        if (item.code) return item.code;
        return t('location.untitled') || '未命名地点';
      
      default:
        // 通用：尝试多个字段
        return item.title || item.name || item.itemName || t('common.untitled') || '未命名';
    }
  };

  const getSecondaryText = (item, type) => {
    switch (type) {
      case 'travel':
        // 差旅：显示destination、purpose或日期范围
        if (item.destination) {
          if (typeof item.destination === 'string') return item.destination;
          if (item.destination.city && item.destination.country) {
            return `${item.destination.city},${item.destination.country}`;
          }
          if (item.destination.name) return item.destination.name;
        }
        if (item.purpose) return item.purpose;
        if (item.startDate && item.endDate) {
          return `${new Date(item.startDate).toLocaleDateString()} - ${new Date(item.endDate).toLocaleDateString()}`;
        }
        return item.status || '';
      
      case 'expense':
        // 费用：显示description、amount或category
        if (item.description) return item.description;
        if (item.amount) return `${item.amount} ${item.currency || ''}`;
        if (item.category) return item.category;
        return item.status || '';
      
      case 'user':
        // 用户：显示email、department或role
        if (item.email) return item.email;
        if (item.department) return item.department;
        if (item.role) return item.role;
        return '';
      
      case 'standard':
        // 标准：显示description或status
        if (item.description) return item.description;
        return item.status || '';
      
      case 'location':
        // 地点：显示city、country或type
        const parts = [];
        if (item.city) parts.push(item.city);
        if (item.country) parts.push(item.country);
        if (parts.length > 0) return parts.join(', ');
        if (item.type) return item.type;
        return '';
      
      default:
        return item.description || item.email || item.country || item.status || '';
    }
  };

  const renderResults = (results, type, title) => {
    if (results.length === 0) return null;

    return (
      <Box sx={{ mb: 2 }}>
        <Typography variant="subtitle2" color="text.secondary" sx={{ px: 2, py: 1 }}>
          {title} ({results.length})
        </Typography>
        <List dense>
          {results.map((item, index) => (
            <ListItem key={`${type}-${item._id || index}`} disablePadding>
              <ListItemButton onClick={() => handleResultClick(type, item._id)}>
                <ListItemIcon sx={{ minWidth: 40 }}>
                  {getResultIcon(type)}
                </ListItemIcon>
                <ListItemText
                  primary={getPrimaryText(item, type)}
                  secondary={getSecondaryText(item, type)}
                />
                {item.status && (
                  <Chip
                    label={t(`travel.statuses.${item.status}`) || item.status}
                    size="small"
                    sx={{ ml: 1 }}
                  />
                )}
              </ListItemButton>
            </ListItem>
          ))}
        </List>
      </Box>
    );
  };

  const renderAllResults = () => {
    return (
      <>
        {renderResults(searchResults.travels, 'travel', t('search.travels'))}
        {renderResults(searchResults.expenses, 'expense', t('search.expenses'))}
        {renderResults(searchResults.users, 'user', t('search.users'))}
        {renderResults(searchResults.standards, 'standard', t('search.standards'))}
        {renderResults(searchResults.locations, 'location', t('search.locations'))}
      </>
    );
  };

  const renderTabResults = () => {
    const tabData = [
      { results: searchResults.travels, type: 'travel', title: t('search.travels') },
      { results: searchResults.expenses, type: 'expense', title: t('search.expenses') },
      { results: searchResults.users, type: 'user', title: t('search.users') },
      { results: searchResults.standards, type: 'standard', title: t('search.standards') },
      { results: searchResults.locations, type: 'location', title: t('search.locations') }
    ];

    // selectedTab 0 是"全部"，1-5 对应 tabData[0-4]
    const currentTab = tabData[selectedTab - 1];
    
    // 如果没有找到对应的标签数据，返回空
    if (!currentTab) {
      return null;
    }
    
    return renderResults(currentTab.results, currentTab.type, currentTab.title);
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        elevation: 8,
        sx: {
          position: 'fixed',
          top: 80,
          m: 0,
          maxHeight: 'calc(100vh - 160px)'
        }
      }}
    >
      <Box sx={{ p: 2, pb: 0, position: 'relative' }}>
        <TextField
          inputRef={searchInputRef}
          fullWidth
          placeholder={t('search.placeholder')}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          onFocus={() => {
            if (suggestions.length > 0 || searchHistory.length > 0) {
              setShowSuggestions(true);
            }
          }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
            endAdornment: (
              <InputAdornment position="end">
                {loading && <CircularProgress size={20} sx={{ mr: 1 }} />}
                <IconButton size="small" onClick={handleClose}>
                  <CloseIcon />
                </IconButton>
              </InputAdornment>
            )
          }}
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              handleClose();
            } else if (e.key === 'Enter') {
              setShowSuggestions(false);
            }
          }}
        />
        {/* 搜索建议下拉框 */}
        {showSuggestions && (suggestions.length > 0 || searchHistory.length > 0) && (
          <Box
            sx={{
              position: 'absolute',
              top: '100%',
              left: 16,
              right: 16,
              bgcolor: 'background.paper',
              border: 1,
              borderColor: 'divider',
              borderRadius: 1,
              mt: 1,
              maxHeight: 300,
              overflow: 'auto',
              zIndex: 1300,
              boxShadow: 3
            }}
          >
            {suggestions.length > 0 && (
              <>
                <Typography variant="caption" sx={{ px: 2, py: 1, color: 'text.secondary', fontWeight: 'bold' }}>
                  {t('search.suggestions') || '搜索建议'}
                </Typography>
                <List dense>
                  {suggestions.map((suggestion, index) => (
                    <ListItem key={index} disablePadding>
                      <ListItemButton onClick={() => handleSuggestionClick(suggestion)}>
                        <ListItemIcon sx={{ minWidth: 40 }}>
                          <SearchIcon fontSize="small" />
                        </ListItemIcon>
                        <ListItemText 
                          primary={suggestion.query}
                          secondary={suggestion.source === 'history' ? t('search.fromHistory') : suggestion.type}
                        />
                        {suggestion.count && (
                          <Chip label={suggestion.count} size="small" />
                        )}
                      </ListItemButton>
                    </ListItem>
                  ))}
                </List>
                {searchHistory.length > 0 && <Divider />}
              </>
            )}
            {searchHistory.length > 0 && (
              <>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', px: 2, py: 1 }}>
                  <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 'bold' }}>
                    {t('search.recentSearches')}
                  </Typography>
                  <IconButton size="small" onClick={clearHistory}>
                    <CloseIcon fontSize="small" />
                  </IconButton>
                </Box>
                <List dense>
                  {searchHistory.map((item) => (
                    <ListItem key={item._id} disablePadding>
                      <ListItemButton onClick={() => handleSuggestionClick({ query: item.query })}>
                        <ListItemIcon sx={{ minWidth: 40 }}>
                          <HistoryIcon fontSize="small" />
                        </ListItemIcon>
                        <ListItemText 
                          primary={item.query}
                          secondary={item.resultCount ? `${item.resultCount} ${t('search.results') || '结果'}` : dayjs(item.createdAt).fromNow()}
                        />
                        <IconButton
                          size="small"
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteHistoryItem(item._id);
                          }}
                        >
                          <CloseIcon fontSize="small" />
                        </IconButton>
                      </ListItemButton>
                    </ListItem>
                  ))}
                </List>
              </>
            )}
          </Box>
        )}
      </Box>

      <DialogContent sx={{ p: 0, pt: 2 }} onClick={() => setShowSuggestions(false)}>
        {!searchTerm.trim() ? (
          // 显示搜索历史
          <Box sx={{ px: 2 }}>
            {searchHistory.length > 0 ? (
              <>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                  <Typography variant="subtitle2" color="text.secondary">
                    {t('search.recentSearches')}
                  </Typography>
                  <IconButton size="small" onClick={clearHistory}>
                    <CloseIcon fontSize="small" />
                  </IconButton>
                </Box>
                <List dense>
                  {searchHistory.map((item) => (
                    <ListItem key={item._id} disablePadding>
                      <ListItemButton onClick={() => handleSuggestionClick({ query: item.query })}>
                        <ListItemIcon sx={{ minWidth: 40 }}>
                          <HistoryIcon />
                        </ListItemIcon>
                        <ListItemText 
                          primary={item.query}
                          secondary={item.resultCount ? `${item.resultCount} ${t('search.results') || '结果'}` : dayjs(item.createdAt).fromNow()}
                        />
                        <IconButton
                          size="small"
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteHistoryItem(item._id);
                          }}
                        >
                          <CloseIcon fontSize="small" />
                        </IconButton>
                      </ListItemButton>
                    </ListItem>
                  ))}
                </List>
              </>
            ) : (
              <Box sx={{ textAlign: 'center', py: 4 }}>
                <SearchIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
                <Typography variant="body2" color="text.secondary">
                  {t('search.noHistory')}
                </Typography>
              </Box>
            )}
          </Box>
        ) : getTotalResults() === 0 && !loading ? (
          // 无搜索结果
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <SearchIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
            <Typography variant="body2" color="text.secondary">
              {t('search.noResults')}
            </Typography>
          </Box>
        ) : (
          // 显示搜索结果
          <>
            <Tabs
              value={selectedTab}
              onChange={(e, newValue) => setSelectedTab(newValue)}
              variant="scrollable"
              scrollButtons="auto"
              sx={{ borderBottom: 1, borderColor: 'divider', px: 2 }}
            >
              <Tab label={`${t('search.all')} (${getTotalResults()})`} />
              <Tab label={`${t('search.travels')} (${searchResults.travels.length})`} />
              <Tab label={`${t('search.expenses')} (${searchResults.expenses.length})`} />
              <Tab label={`${t('search.users')} (${searchResults.users.length})`} />
              <Tab label={`${t('search.standards')} (${searchResults.standards.length})`} />
              <Tab label={`${t('search.locations')} (${searchResults.locations.length})`} />
            </Tabs>
            <Box sx={{ mt: 2 }}>
              {selectedTab === 0 ? renderAllResults() : renderTabResults()}
            </Box>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default GlobalSearch;

