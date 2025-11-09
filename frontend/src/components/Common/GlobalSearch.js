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
  const searchInputRef = useRef(null);

  // 从localStorage加载搜索历史
  useEffect(() => {
    const history = JSON.parse(localStorage.getItem('searchHistory') || '[]');
    setSearchHistory(history.slice(0, 5)); // 只显示最近5条
  }, []);

  // 自动聚焦搜索框
  useEffect(() => {
    if (open && searchInputRef.current) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 100);
    }
  }, [open]);

  // 搜索防抖
  useEffect(() => {
    if (!searchTerm.trim()) {
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
      performSearch(searchTerm);
    }, 300);

    return () => clearTimeout(debounceTimer);
  }, [searchTerm]);

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

      // 保存搜索历史
      saveSearchHistory(query);
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

  const saveSearchHistory = (query) => {
    const history = JSON.parse(localStorage.getItem('searchHistory') || '[]');
    const newHistory = [query, ...history.filter(h => h !== query)].slice(0, 10);
    localStorage.setItem('searchHistory', JSON.stringify(newHistory));
    setSearchHistory(newHistory.slice(0, 5));
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

  const handleHistoryClick = (query) => {
    setSearchTerm(query);
  };

  const clearHistory = () => {
    localStorage.removeItem('searchHistory');
    setSearchHistory([]);
  };

  const handleClose = () => {
    setSearchTerm('');
    setSelectedTab(0);
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
                  primary={item.title || item.name || item.itemName || item.city || item.firstName + ' ' + item.lastName}
                  secondary={
                    item.destination || item.description || item.email || item.country || item.status
                  }
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
        sx: {
          position: 'fixed',
          top: 80,
          m: 0,
          maxHeight: 'calc(100vh - 160px)'
        }
      }}
    >
      <Box sx={{ p: 2, pb: 0 }}>
        <TextField
          inputRef={searchInputRef}
          fullWidth
          placeholder={t('search.placeholder')}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
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
            }
          }}
        />
      </Box>

      <DialogContent sx={{ p: 0, pt: 2 }}>
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
                  {searchHistory.map((query, index) => (
                    <ListItem key={index} disablePadding>
                      <ListItemButton onClick={() => handleHistoryClick(query)}>
                        <ListItemIcon sx={{ minWidth: 40 }}>
                          <HistoryIcon />
                        </ListItemIcon>
                        <ListItemText primary={query} />
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

