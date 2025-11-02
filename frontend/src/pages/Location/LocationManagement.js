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

const LocationManagement = () => {
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
    country: '中国',
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
        throw new Error(response.data?.message || '获取地理位置数据失败');
      }
    } catch (err) {
      console.error('Fetch locations error:', err);
      setError(err.response?.data?.message || err.message || '获取地理位置数据失败');
      showNotification('获取地理位置数据失败', 'error');
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
      showNotification('删除成功', 'success');
      fetchLocations();
    } catch (err) {
      console.error('Delete location error:', err);
      showNotification('删除失败', 'error');
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
      country: location.country || '中国',
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
      country: '中国',
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
        showNotification('创建成功', 'success');
      } else {
        await apiClient.put(`/locations/${formDialog.location._id}`, submitData);
        showNotification('更新成功', 'success');
      }
      setFormDialog({ open: false, location: null, mode: 'create' });
      fetchLocations();
    } catch (err) {
      console.error('Save location error:', err);
      showNotification(err.response?.data?.message || '保存失败', 'error');
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
    const labels = {
      airport: '机场',
      station: '火车站',
      city: '城市',
      province: '省份',
      country: '国家',
      bus: '汽车站'
    };
    return labels[type] || type;
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
    const labels = {
      1: '一线城市',
      2: '二线城市',
      3: '三线城市',
      4: '其他城市'
    };
    return labels[level] || '其他城市';
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
          🌍 地理位置管理
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
                placeholder="搜索名称、代码、城市、省、区、县、国家或国家码..."
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
                <InputLabel>类型</InputLabel>
                <Select
                  value={typeFilter}
                  label="类型"
                  onChange={(e) => setTypeFilter(e.target.value)}
                >
                  <MenuItem value="all">全部</MenuItem>
                  <MenuItem value="airport">机场</MenuItem>
                  <MenuItem value="station">火车站</MenuItem>
                  <MenuItem value="city">城市</MenuItem>
                  <MenuItem value="province">省份</MenuItem>
                  <MenuItem value="country">国家</MenuItem>
                  <MenuItem value="bus">汽车站</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={2}>
              <FormControl fullWidth>
                <InputLabel>状态</InputLabel>
                <Select
                  value={statusFilter}
                  label="状态"
                  onChange={(e) => setStatusFilter(e.target.value)}
                >
                  <MenuItem value="all">全部</MenuItem>
                  <MenuItem value="active">启用</MenuItem>
                  <MenuItem value="inactive">禁用</MenuItem>
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
                  搜索
                </Button>
                <Button
                  variant="outlined"
                  startIcon={<RefreshIcon />}
                  onClick={handleReset}
                >
                  重置
                </Button>
                {canEdit && (
                  <Button
                    variant="contained"
                    color="primary"
                    startIcon={<AddIcon />}
                    onClick={handleAdd}
                    sx={{ ml: 'auto' }}
                  >
                    新增
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
                  <TableCell>类型</TableCell>
                  <TableCell>名称</TableCell>
                  <TableCell>代码</TableCell>
                  <TableCell>省</TableCell>
                  <TableCell>市</TableCell>
                  <TableCell>区</TableCell>
                  <TableCell>县</TableCell>
                  <TableCell>国家</TableCell>
                  <TableCell>国家码</TableCell>
                  <TableCell>隶属城市</TableCell>
                  <TableCell>风险等级</TableCell>
                  <TableCell>无机场</TableCell>
                  <TableCell>城市等级</TableCell>
                  <TableCell>坐标</TableCell>
                  <TableCell>状态</TableCell>
                  {canEdit && <TableCell align="right">操作</TableCell>}
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
                        暂无数据
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredLocations.map((location) => {
                    const getRiskLevelLabel = (level) => {
                      const labels = { low: '低', medium: '中', high: '高', very_high: '很高' };
                      return labels[level] || level;
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
                            location.noAirport ? '是' : '否'
                          ) : '-'}
                        </TableCell>
                        <TableCell>
                          {location.type === 'city' ? (
                            <Chip
                              label={`${location.cityLevel || 4}级 - ${getCityLevelLabel(location.cityLevel || 4)}`}
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
                            label={location.status === 'active' ? '启用' : '禁用'}
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
          <DialogTitle>确认删除</DialogTitle>
          <DialogContent>
            <Typography>
              确定要删除地理位置 "{deleteDialog.location?.name}" 吗？此操作不可撤销。
            </Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDeleteDialog({ open: false, location: null })}>
              取消
            </Button>
            <Button onClick={confirmDelete} color="error" variant="contained">
              删除
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
            {formDialog.mode === 'create' ? '新增地理位置' : '编辑地理位置'}
          </DialogTitle>
          <DialogContent>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2 }}>
              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="名称 *"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="代码"
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <FormControl fullWidth>
                    <InputLabel>类型 *</InputLabel>
                    <Select
                      value={formData.type}
                      label="类型 *"
                      onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                    >
                      <MenuItem value="airport">机场</MenuItem>
                      <MenuItem value="station">火车站</MenuItem>
                      <MenuItem value="city">城市</MenuItem>
                      <MenuItem value="province">省份</MenuItem>
                      <MenuItem value="country">国家</MenuItem>
                      <MenuItem value="bus">汽车站</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="省"
                    value={formData.province}
                    onChange={(e) => setFormData({ ...formData, province: e.target.value })}
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="市"
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="区"
                    value={formData.district}
                    onChange={(e) => setFormData({ ...formData, district: e.target.value })}
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="县"
                    value={formData.county}
                    onChange={(e) => setFormData({ ...formData, county: e.target.value })}
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="国家"
                    value={formData.country}
                    onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="国家码"
                    value={formData.countryCode}
                    onChange={(e) => setFormData({ ...formData, countryCode: e.target.value.toUpperCase() })}
                    placeholder="如：CN, US, JP"
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="英文名称"
                    value={formData.enName}
                    onChange={(e) => setFormData({ ...formData, enName: e.target.value })}
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="拼音"
                    value={formData.pinyin}
                    onChange={(e) => setFormData({ ...formData, pinyin: e.target.value })}
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    type="number"
                    label="纬度"
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
                    label="经度"
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
                    label="时区"
                    value={formData.timezone}
                    onChange={(e) => setFormData({ ...formData, timezone: e.target.value })}
                  />
                </Grid>
                {(formData.type === 'airport' || formData.type === 'station') && (
                  <Grid item xs={12} md={6}>
                    <FormControl fullWidth>
                      <InputLabel>隶属城市</InputLabel>
                      <Select
                        value={formData.parentId}
                        label="隶属城市"
                        onChange={(e) => setFormData({ ...formData, parentId: e.target.value })}
                      >
                        <MenuItem value="">无</MenuItem>
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
                        <InputLabel>风险等级</InputLabel>
                        <Select
                          value={formData.riskLevel}
                          label="风险等级"
                          onChange={(e) => setFormData({ ...formData, riskLevel: e.target.value })}
                        >
                          <MenuItem value="low">低</MenuItem>
                          <MenuItem value="medium">中</MenuItem>
                          <MenuItem value="high">高</MenuItem>
                          <MenuItem value="very_high">很高</MenuItem>
                        </Select>
                      </FormControl>
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <FormControl fullWidth>
                        <InputLabel>无机场</InputLabel>
                        <Select
                          value={formData.noAirport ? 'true' : 'false'}
                          label="无机场"
                          onChange={(e) => setFormData({ ...formData, noAirport: e.target.value === 'true' })}
                        >
                          <MenuItem value="false">否</MenuItem>
                          <MenuItem value="true">是</MenuItem>
                        </Select>
                      </FormControl>
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <FormControl fullWidth>
                        <InputLabel>城市等级</InputLabel>
                        <Select
                          value={formData.cityLevel}
                          label="城市等级"
                          onChange={(e) => setFormData({ ...formData, cityLevel: Number(e.target.value) })}
                        >
                          <MenuItem value={1}>1级 - 一线城市</MenuItem>
                          <MenuItem value={2}>2级 - 二线城市</MenuItem>
                          <MenuItem value={3}>3级 - 三线城市</MenuItem>
                          <MenuItem value={4}>4级 - 其他城市</MenuItem>
                        </Select>
                      </FormControl>
                    </Grid>
                  </>
                )}
                <Grid item xs={12} md={6}>
                  <FormControl fullWidth>
                    <InputLabel>状态</InputLabel>
                    <Select
                      value={formData.status}
                      label="状态"
                      onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    >
                      <MenuItem value="active">启用</MenuItem>
                      <MenuItem value="inactive">禁用</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    multiline
                    rows={3}
                    label="备注"
                    value={formData.remark}
                    onChange={(e) => setFormData({ ...formData, remark: e.target.value })}
                  />
                </Grid>
              </Grid>
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setFormDialog({ open: false, location: null, mode: 'create' })}>
              取消
            </Button>
            <Button onClick={handleSave} variant="contained" disabled={!formData.name}>
              保存
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </Container>
  );
};

export default LocationManagement;




