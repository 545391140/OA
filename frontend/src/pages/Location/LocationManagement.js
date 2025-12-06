/**
 * 地理位置管理页面 - 列表页
 * 提供地理位置数据的列表展示、搜索、新增、编辑、删除功能
 */

import React, { useState, useEffect } from 'react';
import {
  Container,
  Box,
  Typography,
  Button,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  IconButton,
  TextField,
  InputAdornment,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  CircularProgress,
  LinearProgress,
  Grid,
  Menu,
  TablePagination,
  Pagination,
  Autocomplete
} from '@mui/material';
import {
  Add as AddIcon,
  Search as SearchIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Flight as FlightIcon,
  Train as TrainIcon,
  LocationCity as CityIcon,
  Public as CountryIcon,
  FilterList as FilterIcon,
  Refresh as RefreshIcon,
  MoreVert as MoreVertIcon
} from '@mui/icons-material';
import apiClient from '../../utils/axiosConfig';
import { useNotification } from '../../contexts/NotificationContext';
import { useAuth } from '../../contexts/AuthContext';
import { useTranslation } from 'react-i18next';
import { PERMISSIONS } from '../../config/permissions';

const LocationManagement = () => {
  const { t } = useTranslation();
  const { showNotification } = useNotification();
  const { user, hasPermission } = useAuth();
  const canView = hasPermission(PERMISSIONS.LOCATION_VIEW);
  const canCreate = hasPermission(PERMISSIONS.LOCATION_CREATE);
  const canEdit = hasPermission(PERMISSIONS.LOCATION_EDIT);
  const canDelete = hasPermission(PERMISSIONS.LOCATION_DELETE);

  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [countryFilter, setCountryFilter] = useState('all');
  const [countryOptions, setCountryOptions] = useState([]);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(20);
  const [pagination, setPagination] = useState({
    total: 0,
    totalPages: 0,
    page: 1,
    limit: 20,
    hasNextPage: false,
    hasPrevPage: false
  });
  
  // 对话框状态
  const [deleteDialog, setDeleteDialog] = useState({ open: false, location: null });
  const [formDialog, setFormDialog] = useState({ open: false, location: null, mode: 'create' });
  const [anchorEl, setAnchorEl] = useState(null);
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    type: 'city',
    city: '',
    province: '',
    district: '',
    county: '',
    country: '',
    countryCode: '',
    enName: '',
    pinyin: '',
    coordinates: {
      latitude: 0,
      longitude: 0
    },
    timezone: 'Asia/Shanghai',
    status: 'active',
    parentId: '',
    riskLevel: 'low',
    noAirport: false,
    cityLevel: 4,
    remark: ''
  });
  const [cityOptions, setCityOptions] = useState([]);

  useEffect(() => {
    fetchLocations();
    fetchCitiesForParent();
  }, [typeFilter, statusFilter, countryFilter, page, rowsPerPage]);

  useEffect(() => {
    fetchCountries();
  }, []); // 只在组件加载时获取一次

  const fetchCountries = async () => {
    try {
      // 获取所有不同的国家列表（不限制类型，获取所有位置数据中的国家）
      const response = await apiClient.get('/locations', {
        params: { 
          status: 'active',
          limit: 10000 // 获取足够多的数据以提取所有国家
        }
      });
      if (response.data && response.data.success) {
        const locations = response.data.data || [];
        // 提取所有不同的国家
        const countries = Array.from(
          new Set(
            locations
              .map(loc => loc.country)
              .filter(country => country && country.trim())
          )
        ).sort();
        setCountryOptions(countries);
        console.log('已加载国家列表:', countries.length, '个国家');
      }
    } catch (err) {
      console.error('获取国家列表失败:', err);
      // 如果失败，使用默认国家列表
      setCountryOptions(['中国', '美国', '日本', '韩国', '新加坡', '英国', '法国', '德国', '意大利', '西班牙']);
    }
  };

  const fetchCitiesForParent = async () => {
    try {
      const response = await apiClient.get('/locations', {
        params: { type: 'city', status: 'active' }
      });
      if (response.data && response.data.success) {
        setCityOptions(response.data.data || []);
      }
    } catch (err) {
      console.error('Fetch cities error:', err);
    }
  };

  const fetchLocations = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const params = {
        page: page + 1, // 后端从1开始，前端从0开始
        limit: rowsPerPage
      };
      if (typeFilter !== 'all') {
        params.type = typeFilter;
      }
      if (statusFilter !== 'all') {
        params.status = statusFilter;
      }
      if (countryFilter && countryFilter !== 'all') {
        params.country = countryFilter;
      }
      if (searchTerm) {
        params.search = searchTerm;
      }

      const response = await apiClient.get('/locations', { params });
      
      if (response.data && response.data.success) {
        setLocations(response.data.data || []);
        if (response.data.pagination) {
          setPagination(response.data.pagination);
        }
      } else {
        throw new Error(response.data?.message || t('location.management.fetchError'));
      }
    } catch (err) {
      console.error('Fetch locations error:', err);
      setError(err.response?.data?.message || err.message || t('location.management.fetchError'));
      showNotification(t('location.management.fetchError'), 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    setPage(0); // 搜索时重置到第一页
    fetchLocations();
  };

  const handleReset = () => {
    setSearchTerm('');
    setTypeFilter('all');
    setStatusFilter('all');
    setCountryFilter('all');
    setPage(0); // 重置时回到第一页
    setTimeout(() => fetchLocations(), 100);
  };

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0); // 改变每页数量时重置到第一页
  };

  const handleMenuOpen = (event, location) => {
    setAnchorEl(event.currentTarget);
    setSelectedLocation(location);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedLocation(null);
  };

  const handleEdit = () => {
    if (selectedLocation) {
      handleOpenEditDialog(selectedLocation);
    }
    handleMenuClose();
  };

  const handleDelete = () => {
    if (selectedLocation) {
      setDeleteDialog({ open: true, location: selectedLocation });
    }
    handleMenuClose();
  };

  const handleOpenEditDialog = (location) => {
    setFormData({
      name: location.name || '',
      code: location.code || '',
      type: location.type || 'city',
      city: location.city || '',
      province: location.province || '',
      district: location.district || '',
      county: location.county || '',
      country: location.country || '',
      countryCode: location.countryCode || '',
      enName: location.enName || '',
      pinyin: location.pinyin || '',
      coordinates: {
        latitude: location.coordinates?.latitude || 0,
        longitude: location.coordinates?.longitude || 0
      },
      timezone: location.timezone || 'Asia/Shanghai',
      status: location.status || 'active',
      parentId: location.parentId?._id || location.parentId || '',
      riskLevel: location.riskLevel || 'low',
      noAirport: location.noAirport || false,
      cityLevel: location.cityLevel || 4,
      remark: location.remark || ''
    });
    setFormDialog({ open: true, location, mode: 'edit' });
  };

  const confirmDelete = async () => {
    try {
      await apiClient.delete(`/locations/${deleteDialog.location._id}`);
      showNotification(t('location.management.deleteSuccess'), 'success');
      fetchLocations();
    } catch (err) {
      console.error('Delete location error:', err);
      showNotification(t('location.management.deleteError'), 'error');
    } finally {
      setDeleteDialog({ open: false, location: null });
    }
  };


  const handleAdd = () => {
    setFormData({
      name: '',
      code: '',
      type: 'city',
      city: '',
      province: '',
      district: '',
      county: '',
      country: '',
      countryCode: '',
      enName: '',
      pinyin: '',
      coordinates: {
        latitude: 0,
        longitude: 0
      },
      timezone: 'Asia/Shanghai',
      status: 'active',
      parentId: '',
      riskLevel: 'low',
      noAirport: false,
      cityLevel: 4,
      remark: ''
    });
    setFormDialog({ open: true, location: null, mode: 'create' });
  };

  const handleSave = async () => {
    try {
      // 准备提交的数据，处理空值
      const submitData = {
        ...formData,
        parentId: formData.parentId || (formData.type === 'city' ? null : undefined)
      };
      
      // 如果parentId为空字符串，设为null或undefined
      if (!submitData.parentId || submitData.parentId === '') {
        if (formData.type === 'airport' || formData.type === 'station') {
          submitData.parentId = null; // 机场和火车站可以为空
        } else {
          delete submitData.parentId; // 城市类型不需要parentId
        }
      }
      
      // 只有城市类型才需要cityLevel，其他类型删除该字段
      if (formData.type !== 'city') {
        delete submitData.cityLevel;
      }
      
      if (formDialog.mode === 'create') {
        await apiClient.post('/locations', submitData);
        showNotification(t('location.management.createSuccess'), 'success');
      } else {
        await apiClient.put(`/locations/${formDialog.location._id}`, submitData);
        showNotification(t('location.management.updateSuccess'), 'success');
      }
      setFormDialog({ open: false, location: null, mode: 'create' });
      fetchLocations();
    } catch (err) {
      console.error('Save location error:', err);
      showNotification(err.response?.data?.message || t('location.management.saveError'), 'error');
    }
  };

  const getTypeIcon = (type) => {
    switch (type) {
      case 'airport':
        return <FlightIcon />;
      case 'station':
        return <TrainIcon />;
      case 'city':
        return <CityIcon />;
      case 'country':
        return <CountryIcon />;
      default:
        return <CityIcon />;
    }
  };

  const getTypeLabel = (type) => {
    return t(`location.management.types.${type}`) || type;
  };

  const getTypeColor = (type) => {
    const colors = {
      airport: 'primary',
      station: 'secondary',
      city: 'success',
      province: 'info',
      country: 'warning',
      bus: 'default'
    };
    return colors[type] || 'default';
  };

  const getCityLevelLabel = (level) => {
    return t(`location.management.cityLevels.${level}`) || t('location.management.cityLevels.4');
  };

  const getCityLevelColor = (level) => {
    const colors = {
      1: 'error',    // 一线城市 - 红色
      2: 'warning',  // 二线城市 - 橙色
      3: 'info',     // 三线城市 - 蓝色
      4: 'default'   // 其他城市 - 灰色
    };
    return colors[level] || 'default';
  };


  if (loading && locations.length === 0) {
    return (
      <Container maxWidth="xl">
        <Box sx={{ width: '100%', mt: 2 }}>
          <LinearProgress />
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="xl">
      <Box sx={{ py: 3 }}>
        {/* Header */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <CountryIcon sx={{ fontSize: 32, color: 'primary.main' }} />
            <Typography variant="h4" fontWeight={600}>
              {t('location.management.title')}
            </Typography>
          </Box>
          {canCreate && (
            <Button
              variant="contained"
              color="primary"
              startIcon={<AddIcon />}
              onClick={handleAdd}
              sx={{ flexShrink: 0 }}
            >
              {t('location.management.add')}
            </Button>
          )}
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {/* 搜索和筛选区域 */}
        <Paper sx={{ p: 2, mb: 3 }}>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={3}>
              <TextField
                fullWidth
                placeholder={t('location.management.searchPlaceholder')}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon />
                    </InputAdornment>
                  )
                }}
              />
            </Grid>
            <Grid item xs={12} md={2}>
              <FormControl fullWidth>
                <InputLabel>{t('location.management.type')}</InputLabel>
                <Select
                  value={typeFilter}
                  label={t('location.management.type')}
                  onChange={(e) => {
                    setTypeFilter(e.target.value);
                    setPage(0); // 改变筛选时重置到第一页
                  }}
                >
                  <MenuItem value="all">{t('location.management.all')}</MenuItem>
                  <MenuItem value="airport">{t('location.management.types.airport')}</MenuItem>
                  <MenuItem value="station">{t('location.management.types.station')}</MenuItem>
                  <MenuItem value="city">{t('location.management.types.city')}</MenuItem>
                  <MenuItem value="province">{t('location.management.types.province')}</MenuItem>
                  <MenuItem value="country">{t('location.management.types.country')}</MenuItem>
                  <MenuItem value="bus">{t('location.management.types.bus')}</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={2}>
              <FormControl fullWidth>
                <InputLabel>{t('location.management.status')}</InputLabel>
                <Select
                  value={statusFilter}
                  label={t('location.management.status')}
                  onChange={(e) => {
                    setStatusFilter(e.target.value);
                    setPage(0); // 改变筛选时重置到第一页
                  }}
                >
                  <MenuItem value="all">{t('location.management.all')}</MenuItem>
                  <MenuItem value="active">{t('location.management.active')}</MenuItem>
                  <MenuItem value="inactive">{t('location.management.inactive')}</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={2}>
              <Autocomplete
                fullWidth
                options={['all', ...countryOptions]}
                value={countryFilter}
                onChange={(event, newValue) => {
                  setCountryFilter(newValue || 'all');
                  setPage(0); // 改变筛选时重置到第一页
                }}
                getOptionLabel={(option) => {
                  if (option === 'all') {
                    return t('location.management.all');
                  }
                  return option;
                }}
                isOptionEqualToValue={(option, value) => option === value}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label={t('location.management.country')}
                    placeholder={t('location.management.country')}
                  />
                )}
                filterOptions={(options, { inputValue }) => {
                  if (!inputValue) {
                    return options;
                  }
                  const searchTerm = inputValue.toLowerCase();
                  return options.filter((option) => {
                    if (option === 'all') {
                      return t('location.management.all').toLowerCase().includes(searchTerm);
                    }
                    return option.toLowerCase().includes(searchTerm);
                  });
                }}
              />
            </Grid>
            <Grid item xs={12} md={3}>
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'nowrap' }}>
                <Button
                  variant="contained"
                  startIcon={<SearchIcon />}
                  onClick={handleSearch}
                  sx={{ flexShrink: 0, minWidth: 'auto' }}
                >
                  {t('location.management.search')}
                </Button>
                <Button
                  variant="outlined"
                  startIcon={<RefreshIcon />}
                  onClick={handleReset}
                  sx={{ flexShrink: 0, minWidth: 'auto' }}
                >
                  {t('location.management.reset')}
                </Button>
              </Box>
            </Grid>
          </Grid>
        </Paper>

        {/* 数据表格 */}
        <Paper>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>{t('location.management.tableHeaders.type')}</TableCell>
                  <TableCell>{t('location.management.tableHeaders.name')}</TableCell>
                  <TableCell>{t('location.management.tableHeaders.code')}</TableCell>
                  <TableCell>{t('location.management.tableHeaders.province')}</TableCell>
                  <TableCell>{t('location.management.tableHeaders.city')}</TableCell>
                  <TableCell>{t('location.management.tableHeaders.district')}</TableCell>
                  <TableCell>{t('location.management.tableHeaders.county')}</TableCell>
                  <TableCell>{t('location.management.tableHeaders.country')}</TableCell>
                  <TableCell>{t('location.management.tableHeaders.countryCode')}</TableCell>
                  <TableCell>{t('location.management.tableHeaders.parentCity')}</TableCell>
                  <TableCell>{t('location.management.tableHeaders.riskLevel')}</TableCell>
                  <TableCell>{t('location.management.tableHeaders.noAirport')}</TableCell>
                  <TableCell>{t('location.management.tableHeaders.cityLevel')}</TableCell>
                  <TableCell>{t('location.management.tableHeaders.coordinates')}</TableCell>
                  <TableCell>{t('location.management.tableHeaders.status')}</TableCell>
                  {(canEdit || canDelete) && <TableCell align="right">{t('location.management.tableHeaders.actions')}</TableCell>}
                </TableRow>
              </TableHead>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={(canEdit || canDelete) ? 15 : 14} align="center">
                      <CircularProgress />
                    </TableCell>
                  </TableRow>
                ) : locations.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={(canEdit || canDelete) ? 15 : 14} align="center">
                      <Typography variant="body2" color="text.secondary">
                        {t('location.management.noData')}
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  locations.map((location) => {
                    const getRiskLevelLabel = (level) => {
                      // 处理 undefined、null 或空值
                      if (!level || level === 'undefined' || level === 'null') {
                        return t('location.management.riskLevels.low') || 'low';
                      }
                      const translationKey = `location.management.riskLevels.${level}`;
                      const translated = t(translationKey);
                      // 如果翻译键不存在或返回的是键本身，使用默认值
                      if (translated === translationKey || !translated) {
                        return level;
                      }
                      return translated;
                    };
                    const getRiskLevelColor = (level) => {
                      // 处理 undefined、null 或空值
                      if (!level || level === 'undefined' || level === 'null') {
                        return 'success'; // 默认低风险
                      }
                      const colors = { low: 'success', medium: 'warning', high: 'error', very_high: 'error' };
                      return colors[level] || 'default';
                    };
                    
                    return (
                      <TableRow key={location._id} hover>
                        <TableCell>
                          <Chip
                            icon={getTypeIcon(location.type)}
                            label={getTypeLabel(location.type)}
                            color={getTypeColor(location.type)}
                            size="small"
                          />
                        </TableCell>
                        <TableCell>{location.name}</TableCell>
                        <TableCell>{location.code || '-'}</TableCell>
                        <TableCell>{location.province || '-'}</TableCell>
                        <TableCell>{location.city || '-'}</TableCell>
                        <TableCell>{location.district || '-'}</TableCell>
                        <TableCell>{location.county || '-'}</TableCell>
                        <TableCell>{location.country || '-'}</TableCell>
                        <TableCell>{location.countryCode || '-'}</TableCell>
                        <TableCell>
                          {(() => {
                            // 如果 parentId 是对象且包含 name，直接显示名称
                            if (location.parentId && typeof location.parentId === 'object' && location.parentId.name) {
                              return location.parentId.name;
                            }
                            // 如果 parentId 是字符串（ObjectId），显示 '-'
                            if (location.parentId) {
                              return '-';
                            }
                            return '-';
                          })()}
                        </TableCell>
                        <TableCell>
                          {location.type === 'city' ? (
                            <Chip
                              label={getRiskLevelLabel(location.riskLevel)}
                              color={getRiskLevelColor(location.riskLevel)}
                              size="small"
                            />
                          ) : '-'}
                        </TableCell>
                        <TableCell>
                          {location.type === 'city' ? (
                            location.noAirport ? t('location.management.form.yes') : t('location.management.form.no')
                          ) : '-'}
                        </TableCell>
                        <TableCell>
                          {location.type === 'city' ? (
                            <Chip
                              label={`${location.cityLevel || 4}${t('location.management.form.cityLevel')} - ${getCityLevelLabel(location.cityLevel || 4)}`}
                              size="small"
                              color={getCityLevelColor(location.cityLevel || 4)}
                            />
                          ) : '-'}
                        </TableCell>
                        <TableCell>
                          {location.coordinates?.latitude && location.coordinates?.longitude
                            ? `${location.coordinates.latitude.toFixed(4)}, ${location.coordinates.longitude.toFixed(4)}`
                            : '-'}
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={location.status === 'active' ? t('location.management.active') : t('location.management.inactive')}
                            color={location.status === 'active' ? 'success' : 'default'}
                            size="small"
                          />
                        </TableCell>
                        {(canEdit || canDelete) && (
                          <TableCell align="right">
                            <IconButton
                              onClick={(e) => handleMenuOpen(e, location)}
                              size="small"
                            >
                              <MoreVertIcon />
                            </IconButton>
                          </TableCell>
                        )}
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </TableContainer>
          {/* 分页组件 */}
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: 2, borderTop: 1, borderColor: 'divider' }}>
            <Typography variant="body2" color="text.secondary">
              {t('location.management.total')}: {pagination.total || 0} {t('location.management.items')}
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <FormControl size="small" sx={{ minWidth: 120 }}>
                <InputLabel>{t('location.management.rowsPerPage')}</InputLabel>
                <Select
                  value={rowsPerPage}
                  label={t('location.management.rowsPerPage')}
                  onChange={handleChangeRowsPerPage}
                >
                  <MenuItem value={10}>10</MenuItem>
                  <MenuItem value={20}>20</MenuItem>
                  <MenuItem value={50}>50</MenuItem>
                  <MenuItem value={100}>100</MenuItem>
                </Select>
              </FormControl>
              <Pagination
                count={pagination.totalPages || 0}
                page={page + 1}
                onChange={handleChangePage}
                color="primary"
                showFirstButton
                showLastButton
              />
            </Box>
          </Box>
        </Paper>

        {/* Action Menu */}
        <Menu
          anchorEl={anchorEl}
          open={Boolean(anchorEl)}
          onClose={handleMenuClose}
        >
          <MenuItem onClick={handleEdit}>
            <EditIcon sx={{ mr: 1.5, fontSize: 20 }} />
            {t('common.edit')}
          </MenuItem>
          <MenuItem onClick={handleDelete} sx={{ color: 'error.main' }}>
            <DeleteIcon sx={{ mr: 1.5, fontSize: 20 }} />
            {t('common.delete')}
          </MenuItem>
        </Menu>

        {/* 删除确认对话框 */}
        <Dialog open={deleteDialog.open} onClose={() => setDeleteDialog({ open: false, location: null })}>
          <DialogTitle>{t('location.management.confirmDelete')}</DialogTitle>
          <DialogContent>
            <Typography>
              {t('location.management.deleteConfirmMessage')} "{deleteDialog.location?.name}"? {t('location.management.deleteWarning')}
            </Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDeleteDialog({ open: false, location: null })}>
              {t('common.cancel')}
            </Button>
            <Button onClick={confirmDelete} color="error" variant="contained">
              {t('common.delete')}
            </Button>
          </DialogActions>
        </Dialog>

        {/* 新增/编辑表单对话框 */}
        <Dialog
          open={formDialog.open}
          onClose={() => setFormDialog({ open: false, location: null, mode: 'create' })}
          maxWidth="md"
          fullWidth
        >
          <DialogTitle>
            {formDialog.mode === 'create' ? t('location.management.addLocation') : t('location.management.editLocation')}
          </DialogTitle>
          <DialogContent>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2 }}>
              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label={`${t('location.management.form.name')} *`}
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label={t('location.management.form.code')}
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <FormControl fullWidth>
                    <InputLabel>{t('location.management.form.type')} *</InputLabel>
                    <Select
                      value={formData.type}
                      label={`${t('location.management.form.type')} *`}
                      onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                    >
                      <MenuItem value="airport">{t('location.management.types.airport')}</MenuItem>
                      <MenuItem value="station">{t('location.management.types.station')}</MenuItem>
                      <MenuItem value="city">{t('location.management.types.city')}</MenuItem>
                      <MenuItem value="province">{t('location.management.types.province')}</MenuItem>
                      <MenuItem value="country">{t('location.management.types.country')}</MenuItem>
                      <MenuItem value="bus">{t('location.management.types.bus')}</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label={t('location.management.form.province')}
                    value={formData.province}
                    onChange={(e) => setFormData({ ...formData, province: e.target.value })}
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label={t('location.management.form.city')}
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label={t('location.management.form.district')}
                    value={formData.district}
                    onChange={(e) => setFormData({ ...formData, district: e.target.value })}
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label={t('location.management.form.county')}
                    value={formData.county}
                    onChange={(e) => setFormData({ ...formData, county: e.target.value })}
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label={t('location.management.form.country')}
                    value={formData.country}
                    onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label={t('location.management.form.countryCode')}
                    value={formData.countryCode}
                    onChange={(e) => setFormData({ ...formData, countryCode: e.target.value.toUpperCase() })}
                    placeholder={t('location.management.form.countryCodePlaceholder')}
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label={t('location.management.form.enName')}
                    value={formData.enName}
                    onChange={(e) => setFormData({ ...formData, enName: e.target.value })}
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label={t('location.management.form.pinyin')}
                    value={formData.pinyin}
                    onChange={(e) => setFormData({ ...formData, pinyin: e.target.value })}
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    type="number"
                    label={t('location.management.form.latitude')}
                    value={formData.coordinates.latitude}
                    onChange={(e) => setFormData({
                      ...formData,
                      coordinates: {
                        ...formData.coordinates,
                        latitude: parseFloat(e.target.value) || 0
                      }
                    })}
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    type="number"
                    label={t('location.management.form.longitude')}
                    value={formData.coordinates.longitude}
                    onChange={(e) => setFormData({
                      ...formData,
                      coordinates: {
                        ...formData.coordinates,
                        longitude: parseFloat(e.target.value) || 0
                      }
                    })}
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label={t('location.management.form.timezone')}
                    value={formData.timezone}
                    onChange={(e) => setFormData({ ...formData, timezone: e.target.value })}
                  />
                </Grid>
                {(formData.type === 'airport' || formData.type === 'station') && (
                  <Grid item xs={12} md={6}>
                    <FormControl fullWidth>
                      <InputLabel>{t('location.management.form.parentCity')}</InputLabel>
                      <Select
                        value={formData.parentId}
                        label={t('location.management.form.parentCity')}
                        onChange={(e) => setFormData({ ...formData, parentId: e.target.value })}
                      >
                        <MenuItem value="">{t('location.management.form.noParent')}</MenuItem>
                        {cityOptions.map((city) => (
                          <MenuItem key={city._id} value={city._id}>
                            {city.name} ({city.code || ''})
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>
                )}
                {formData.type === 'city' && (
                  <>
                    <Grid item xs={12} md={6}>
                      <FormControl fullWidth>
                        <InputLabel>{t('location.management.form.riskLevel')}</InputLabel>
                        <Select
                          value={formData.riskLevel}
                          label={t('location.management.form.riskLevel')}
                          onChange={(e) => setFormData({ ...formData, riskLevel: e.target.value })}
                        >
                          <MenuItem value="low">{t('location.management.riskLevels.low')}</MenuItem>
                          <MenuItem value="medium">{t('location.management.riskLevels.medium')}</MenuItem>
                          <MenuItem value="high">{t('location.management.riskLevels.high')}</MenuItem>
                          <MenuItem value="very_high">{t('location.management.riskLevels.very_high')}</MenuItem>
                        </Select>
                      </FormControl>
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <FormControl fullWidth>
                        <InputLabel>{t('location.management.form.noAirport')}</InputLabel>
                        <Select
                          value={formData.noAirport ? 'true' : 'false'}
                          label={t('location.management.form.noAirport')}
                          onChange={(e) => setFormData({ ...formData, noAirport: e.target.value === 'true' })}
                        >
                          <MenuItem value="false">{t('location.management.form.no')}</MenuItem>
                          <MenuItem value="true">{t('location.management.form.yes')}</MenuItem>
                        </Select>
                      </FormControl>
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <FormControl fullWidth>
                        <InputLabel>{t('location.management.form.cityLevel')}</InputLabel>
                        <Select
                          value={formData.cityLevel}
                          label={t('location.management.form.cityLevel')}
                          onChange={(e) => setFormData({ ...formData, cityLevel: Number(e.target.value) })}
                        >
                            <MenuItem value={1}>1{t('location.management.form.cityLevel')} - {t('location.management.cityLevels.1')}</MenuItem>
                          <MenuItem value={2}>2{t('location.management.form.cityLevel')} - {t('location.management.cityLevels.2')}</MenuItem>
                          <MenuItem value={3}>3{t('location.management.form.cityLevel')} - {t('location.management.cityLevels.3')}</MenuItem>
                          <MenuItem value={4}>4{t('location.management.form.cityLevel')} - {t('location.management.cityLevels.4')}</MenuItem>
                        </Select>
                      </FormControl>
                    </Grid>
                  </>
                )}
                <Grid item xs={12} md={6}>
                  <FormControl fullWidth>
                    <InputLabel>{t('location.management.form.status')}</InputLabel>
                    <Select
                      value={formData.status}
                      label={t('location.management.form.status')}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    >
                      <MenuItem value="active">{t('location.management.active')}</MenuItem>
                      <MenuItem value="inactive">{t('location.management.inactive')}</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    multiline
                    rows={3}
                    label={t('location.management.form.remark')}
                    value={formData.remark}
                    onChange={(e) => setFormData({ ...formData, remark: e.target.value })}
                  />
                </Grid>
              </Grid>
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setFormDialog({ open: false, location: null, mode: 'create' })}>
              {t('common.cancel')}
            </Button>
            <Button onClick={handleSave} variant="contained" disabled={!formData.name}>
              {t('common.save')}
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </Container>
  );
};

export default LocationManagement;




