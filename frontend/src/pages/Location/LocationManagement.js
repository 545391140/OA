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
  Grid
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
  Refresh as RefreshIcon
} from '@mui/icons-material';
import apiClient from '../../utils/axiosConfig';
import { useNotification } from '../../contexts/NotificationContext';
import { useAuth } from '../../contexts/AuthContext';
import { useTranslation } from 'react-i18next';

const LocationManagement = () => {
  const { t } = useTranslation();
  const { showNotification } = useNotification();
  const { user } = useAuth();
  const canEdit = user?.role === 'admin' || user?.role === 'finance';

  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  
  // 对话框状态
  const [deleteDialog, setDeleteDialog] = useState({ open: false, location: null });
  const [formDialog, setFormDialog] = useState({ open: false, location: null, mode: 'create' });
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
  }, [typeFilter, statusFilter]);

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
      
      const params = {};
      if (typeFilter !== 'all') {
        params.type = typeFilter;
      }
      if (statusFilter !== 'all') {
        params.status = statusFilter;
      }
      if (searchTerm) {
        params.search = searchTerm;
      }

      const response = await apiClient.get('/locations', { params });
      
      if (response.data && response.data.success) {
        setLocations(response.data.data || []);
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
    fetchLocations();
  };

  const handleReset = () => {
    setSearchTerm('');
    setTypeFilter('all');
    setStatusFilter('all');
    setTimeout(() => fetchLocations(), 100);
  };

  const handleDelete = (location) => {
    setDeleteDialog({ open: true, location });
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

  const handleEdit = (location) => {
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

  const filteredLocations = locations.filter(location => {
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      return (
        location.name?.toLowerCase().includes(term) ||
        location.code?.toLowerCase().includes(term) ||
        location.city?.toLowerCase().includes(term) ||
        location.province?.toLowerCase().includes(term) ||
        location.district?.toLowerCase().includes(term) ||
        location.county?.toLowerCase().includes(term) ||
        location.country?.toLowerCase().includes(term) ||
        location.countryCode?.toLowerCase().includes(term)
      );
    }
    return true;
  });

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
        <Typography variant="h4" gutterBottom sx={{ 
          background: 'linear-gradient(45deg, #1976d2, #42a5f5)',
          backgroundClip: 'text',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          fontWeight: 700,
          mb: 3
        }}>
          {t('location.management.title')}
        </Typography>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {/* 搜索和筛选区域 */}
        <Paper sx={{ p: 2, mb: 3 }}>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={4}>
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
                  onChange={(e) => setTypeFilter(e.target.value)}
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
                  onChange={(e) => setStatusFilter(e.target.value)}
                >
                  <MenuItem value="all">{t('location.management.all')}</MenuItem>
                  <MenuItem value="active">{t('location.management.active')}</MenuItem>
                  <MenuItem value="inactive">{t('location.management.inactive')}</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={4}>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Button
                  variant="contained"
                  startIcon={<SearchIcon />}
                  onClick={handleSearch}
                >
                  {t('location.management.search')}
                </Button>
                <Button
                  variant="outlined"
                  startIcon={<RefreshIcon />}
                  onClick={handleReset}
                >
                  {t('location.management.reset')}
                </Button>
                {canEdit && (
                  <Button
                    variant="contained"
                    color="primary"
                    startIcon={<AddIcon />}
                    onClick={handleAdd}
                    sx={{ ml: 'auto' }}
                  >
                    {t('location.management.add')}
                  </Button>
                )}
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
                  {canEdit && <TableCell align="right">{t('location.management.tableHeaders.actions')}</TableCell>}
                </TableRow>
              </TableHead>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={canEdit ? 15 : 14} align="center">
                      <CircularProgress />
                    </TableCell>
                  </TableRow>
                ) : filteredLocations.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={canEdit ? 15 : 14} align="center">
                      <Typography variant="body2" color="text.secondary">
                        {t('location.management.noData')}
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredLocations.map((location) => {
                    const getRiskLevelLabel = (level) => {
                      return t(`location.management.riskLevels.${level}`) || level;
                    };
                    const getRiskLevelColor = (level) => {
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
                          {location.parentId?.name || location.parentId || '-'}
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
                        {canEdit && (
                          <TableCell align="right">
                            <IconButton
                              size="small"
                              onClick={() => handleEdit(location)}
                              color="primary"
                            >
                              <EditIcon />
                            </IconButton>
                            <IconButton
                              size="small"
                              onClick={() => handleDelete(location)}
                              color="error"
                            >
                              <DeleteIcon />
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
        </Paper>

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




