/**
 * 用户管理页面 - 列表页
 * 提供用户数据的列表展示、搜索、新增、编辑、删除、禁用功能
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
  Tooltip
} from '@mui/material';
import {
  Add as AddIcon,
  Search as SearchIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Block as BlockIcon,
  CheckCircle as CheckCircleIcon,
  Refresh as RefreshIcon,
  People as PeopleIcon
} from '@mui/icons-material';
import apiClient from '../../utils/axiosConfig';
import { useNotification } from '../../contexts/NotificationContext';
import { useAuth } from '../../contexts/AuthContext';
import { useTranslation } from 'react-i18next';
import dayjs from 'dayjs';
import RegionSelector from '../../components/Common/RegionSelector';
import { PERMISSIONS } from '../../config/permissions';

const UserManagement = () => {
  const { t } = useTranslation();
  const { showNotification } = useNotification();
  const { user, hasPermission } = useAuth();
  const canView = hasPermission(PERMISSIONS.USER_VIEW);
  const canCreate = hasPermission(PERMISSIONS.USER_CREATE);
  const canEdit = hasPermission(PERMISSIONS.USER_EDIT);
  const canDelete = hasPermission(PERMISSIONS.USER_DELETE);
  const canToggleActive = hasPermission(PERMISSIONS.USER_TOGGLE_ACTIVE);

  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [positions, setPositions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [roleFilter, setRoleFilter] = useState('all');
  const [positionFilter, setPositionFilter] = useState('all');
  const [departmentFilter, setDepartmentFilter] = useState('all');
  
  // 对话框状态
  const [deleteDialog, setDeleteDialog] = useState({ open: false, user: null });
  const [formDialog, setFormDialog] = useState({ open: false, user: null, mode: 'create' });
  const [formData, setFormData] = useState({
    employeeId: '',
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    role: '',
    department: '',
    position: '',
    jobLevel: '',
    phone: '',
    manager: '',
    residenceCountry: null,
    residenceCity: null
  });
  const [saving, setSaving] = useState(false);
  const [managers, setManagers] = useState([]);
  const [loadingLocations, setLoadingLocations] = useState(false);
  const [formErrors, setFormErrors] = useState({});

  useEffect(() => {
    fetchUsers();
    fetchRoles();
    fetchPositions();
    fetchManagers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter, roleFilter, positionFilter, departmentFilter]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const params = {};
      if (statusFilter !== 'all') {
        params.isActive = statusFilter === 'active';
      }
      if (roleFilter !== 'all') {
        params.role = roleFilter;
      }
      if (positionFilter !== 'all') {
        params.position = positionFilter;
      }
      if (departmentFilter !== 'all') {
        params.department = departmentFilter;
      }
      if (searchTerm) {
        params.search = searchTerm;
      }

      const response = await apiClient.get('/users', { params });
      
      if (response.data && response.data.success) {
        setUsers(response.data.data || []);
      } else {
        throw new Error(response.data?.message || t('user.management.fetchError'));
      }
    } catch (err) {
      console.error('Fetch users error:', err);
      setError(err.response?.data?.message || err.message || t('user.management.fetchError'));
      showNotification(t('user.management.fetchError'), 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchRoles = async () => {
    try {
      const response = await apiClient.get('/roles', { params: { isActive: true } });
      if (response.data && response.data.success) {
        setRoles(response.data.data || []);
      }
    } catch (err) {
      console.error('Fetch roles error:', err);
    }
  };

  const fetchPositions = async () => {
    try {
      const response = await apiClient.get('/positions', { params: { isActive: true } });
      if (response.data && response.data.success) {
        setPositions(response.data.data || []);
      }
    } catch (err) {
      console.error('Fetch positions error:', err);
    }
  };

  const fetchManagers = async () => {
    try {
      const response = await apiClient.get('/users', { params: { isActive: true } });
      if (response.data && response.data.success) {
        setManagers(response.data.data || []);
      }
    } catch (err) {
      console.error('Fetch managers error:', err);
    }
  };

  const handleSearch = () => {
    fetchUsers();
  };

  const handleReset = () => {
    setSearchTerm('');
    setStatusFilter('all');
    setRoleFilter('all');
    setPositionFilter('all');
    setDepartmentFilter('all');
    setTimeout(() => fetchUsers(), 100);
  };

  const handleDelete = (userItem) => {
    setDeleteDialog({ open: true, user: userItem });
  };

  const confirmDelete = async () => {
    try {
      await apiClient.delete(`/users/${deleteDialog.user._id}`);
      showNotification(t('user.management.deleteSuccess'), 'success');
      fetchUsers();
    } catch (err) {
      console.error('Delete user error:', err);
      const errorMsg = err.response?.data?.message || t('user.management.deleteError');
      showNotification(errorMsg, 'error');
    } finally {
      setDeleteDialog({ open: false, user: null });
    }
  };

  const handleEdit = async (userItem) => {
    // 初始化表单数据
    const initialData = {
      employeeId: userItem.employeeId || '',
      firstName: userItem.firstName || '',
      lastName: userItem.lastName || '',
      email: userItem.email || '',
      password: '', // Don't show password when editing
      role: userItem.role || '',
      department: userItem.department || '',
      position: userItem.position || '',
      jobLevel: userItem.jobLevel || '',
      phone: userItem.phone || '',
      manager: userItem.manager?._id || '',
      residenceCountry: null,
      residenceCity: null
    };

    // 加载常驻国和常驻城市数据（如果是ID）
    setLoadingLocations(true);
    try {
      if (userItem.residenceCountry) {
        if (typeof userItem.residenceCountry === 'object' && userItem.residenceCountry._id) {
          initialData.residenceCountry = userItem.residenceCountry;
        } else {
          const countryId = typeof userItem.residenceCountry === 'object' 
            ? (userItem.residenceCountry._id || userItem.residenceCountry.id)
            : userItem.residenceCountry;
          if (countryId) {
            try {
              const countryResponse = await apiClient.get(`/locations/${countryId}`);
              if (countryResponse.data?.success) {
                initialData.residenceCountry = countryResponse.data.data;
              }
            } catch (err) {
              console.warn('Failed to load residence country:', err);
            }
          }
        }
      }

      if (userItem.residenceCity) {
        if (typeof userItem.residenceCity === 'object' && userItem.residenceCity._id) {
          initialData.residenceCity = userItem.residenceCity;
        } else {
          const cityId = typeof userItem.residenceCity === 'object'
            ? (userItem.residenceCity._id || userItem.residenceCity.id)
            : userItem.residenceCity;
          if (cityId) {
            try {
              const cityResponse = await apiClient.get(`/locations/${cityId}`);
              if (cityResponse.data?.success) {
                initialData.residenceCity = cityResponse.data.data;
              }
            } catch (err) {
              console.warn('Failed to load residence city:', err);
            }
          }
        }
      }
    } finally {
      setLoadingLocations(false);
    }

    setFormData(initialData);
    setFormErrors({});
    setFormDialog({ open: true, user: userItem, mode: 'edit' });
  };

  const handleAdd = () => {
    setFormData({
      employeeId: '',
      firstName: '',
      lastName: '',
      email: '',
      password: '',
      role: '',
      department: '',
      position: '',
      jobLevel: '',
      phone: '',
      manager: '',
      residenceCountry: null,
      residenceCity: null
    });
    setFormErrors({});
    setFormDialog({ open: true, user: null, mode: 'create' });
  };

  // 表单验证函数
  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.employeeId || !formData.employeeId.trim()) {
      newErrors.employeeId = t('user.management.errors.employeeIdRequired') || '员工编号不能为空';
    }
    
    if (!formData.firstName || !formData.firstName.trim()) {
      newErrors.firstName = t('user.management.errors.firstNameRequired') || '名字不能为空';
    }
    
    if (!formData.lastName || !formData.lastName.trim()) {
      newErrors.lastName = t('user.management.errors.lastNameRequired') || '姓氏不能为空';
    }
    
    if (!formData.email || !formData.email.trim()) {
      newErrors.email = t('user.management.errors.emailRequired') || '邮箱不能为空';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = t('user.management.errors.emailInvalid') || '请输入有效的邮箱地址';
    }
    
    if (formDialog.mode === 'create' && (!formData.password || !formData.password.trim())) {
      newErrors.password = t('user.management.errors.passwordRequired') || '密码不能为空';
    } else if (formData.password && formData.password.length < 6) {
      newErrors.password = t('user.management.errors.passwordMinLength') || '密码至少需要6个字符';
    }
    
    if (!formData.role) {
      newErrors.role = t('user.management.errors.roleRequired') || '请选择角色';
    }
    
    if (!formData.position) {
      newErrors.position = t('user.management.errors.positionRequired') || '请选择岗位';
    }
    
    if (!formData.department || !formData.department.trim()) {
      newErrors.department = t('user.management.errors.departmentRequired') || '部门不能为空';
    }
    
    setFormErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    // 先进行表单验证
    if (!validateForm()) {
      showNotification(t('user.management.validationError') || '请检查表单错误', 'error');
      return;
    }
    
    try {
      setSaving(true);
      
      const saveData = { ...formData };
      // Don't send password if it's empty (edit mode)
      if (formDialog.mode === 'edit' && !saveData.password) {
        delete saveData.password;
      }
      // Don't send manager if it's empty
      if (!saveData.manager) {
        delete saveData.manager;
      }
      // 处理常驻国和常驻城市：如果是对象，提取ID或name
      if (saveData.residenceCountry) {
        if (typeof saveData.residenceCountry === 'object') {
          saveData.residenceCountry = saveData.residenceCountry._id || saveData.residenceCountry.id || saveData.residenceCountry.name || null;
        }
        // 如果是null或空字符串，删除字段
        if (!saveData.residenceCountry || saveData.residenceCountry === '') {
          delete saveData.residenceCountry;
        }
      } else {
        delete saveData.residenceCountry;
      }
      
      if (saveData.residenceCity) {
        if (typeof saveData.residenceCity === 'object') {
          saveData.residenceCity = saveData.residenceCity._id || saveData.residenceCity.id || saveData.residenceCity.name || null;
        }
        // 如果是null或空字符串，删除字段
        if (!saveData.residenceCity || saveData.residenceCity === '') {
          delete saveData.residenceCity;
        }
      } else {
        delete saveData.residenceCity;
      }
      
      console.log('Saving user data:', { mode: formDialog.mode, data: saveData });
      
      if (formDialog.mode === 'create') {
        const response = await apiClient.post('/users', saveData);
        console.log('Create user response:', response.data);
        showNotification(t('user.management.createSuccess'), 'success');
      } else {
        const response = await apiClient.put(`/users/${formDialog.user._id}`, saveData);
        console.log('Update user response:', response.data);
        showNotification(t('user.management.updateSuccess'), 'success');
      }
      
      fetchUsers();
      setFormDialog({ open: false, user: null, mode: 'create' });
    } catch (err) {
      console.error('Save user error:', err);
      console.error('Error response:', err.response?.data);
      
      // 处理验证错误
      if (err.response?.data?.errors && Array.isArray(err.response.data.errors)) {
        const errorMessages = err.response.data.errors.map(e => e.msg || e.message).join(', ');
        showNotification(`${t('user.management.validationError')}: ${errorMessages}`, 'error');
      } else {
        const errorMsg = err.response?.data?.message || err.message || t('user.management.saveError');
        showNotification(errorMsg, 'error');
      }
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (userItem) => {
    try {
      await apiClient.patch(`/users/${userItem._id}/toggle-active`);
      showNotification(userItem.isActive ? t('user.management.toggleDisabledSuccess') : t('user.management.toggleSuccess'), 'success');
      fetchUsers();
    } catch (err) {
      console.error('Toggle active error:', err);
      const errorMsg = err.response?.data?.message || t('user.management.toggleError');
      showNotification(errorMsg, 'error');
    }
  };

  // 获取所有部门和角色（用于筛选）
  const departments = [...new Set(users.map(u => u.department).filter(Boolean))];
  const roleCodes = [...new Set(users.map(u => u.role).filter(Boolean))];
  const positionCodes = [...new Set(users.map(u => u.position).filter(Boolean))];

  // 获取角色和岗位的显示名称
  const getRoleName = (code) => {
    const role = roles.find(r => r.code === code);
    return role ? role.name : code;
  };

  const getPositionName = (code) => {
    const position = positions.find(p => p.code === code);
    return position ? position.name : code;
  };

  const filteredUsers = users.filter(userItem => {
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      return (
        userItem.employeeId?.toLowerCase().includes(search) ||
        userItem.firstName?.toLowerCase().includes(search) ||
        userItem.lastName?.toLowerCase().includes(search) ||
        userItem.email?.toLowerCase().includes(search)
      );
    }
    return true;
  });

  return (
    <Container maxWidth="xl">
      <Box sx={{ py: 3 }}>
        {/* Header */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <PeopleIcon sx={{ fontSize: 32, color: 'primary.main' }} />
            <Typography variant="h4" fontWeight={600}>
              {t('user.management.title')}
            </Typography>
          </Box>
          {canCreate && (
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={handleAdd}
              sx={{ borderRadius: 2 }}
            >
              {t('user.management.addUser')}
            </Button>
          )}
        </Box>

        {/* Filters */}
        <Paper sx={{ p: 2, mb: 3 }}>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                placeholder={t('user.management.searchPlaceholder')}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon />
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>
            <Grid item xs={12} md={2}>
              <FormControl fullWidth>
                <InputLabel>{t('user.management.status')}</InputLabel>
                <Select
                  value={statusFilter}
                  label={t('user.management.status')}
                  onChange={(e) => setStatusFilter(e.target.value)}
                >
                  <MenuItem value="all">{t('user.management.all')}</MenuItem>
                  <MenuItem value="active">{t('user.management.active')}</MenuItem>
                  <MenuItem value="inactive">{t('user.management.inactive')}</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={2}>
              <FormControl fullWidth>
                <InputLabel>{t('user.role')}</InputLabel>
                <Select
                  value={roleFilter}
                  label={t('user.role')}
                  onChange={(e) => setRoleFilter(e.target.value)}
                >
                  <MenuItem value="all">{t('user.management.all')}</MenuItem>
                  {roleCodes.map(code => (
                    <MenuItem key={code} value={code}>{getRoleName(code)}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={2}>
              <FormControl fullWidth>
                <InputLabel>{t('user.position')}</InputLabel>
                <Select
                  value={positionFilter}
                  label={t('user.position')}
                  onChange={(e) => setPositionFilter(e.target.value)}
                >
                  <MenuItem value="all">{t('user.management.all')}</MenuItem>
                  {positionCodes.map(code => (
                    <MenuItem key={code} value={code}>{getPositionName(code)}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={2}>
              <FormControl fullWidth>
                <InputLabel>{t('user.department')}</InputLabel>
                <Select
                  value={departmentFilter}
                  label={t('user.department')}
                  onChange={(e) => setDepartmentFilter(e.target.value)}
                >
                  <MenuItem value="all">{t('user.management.all')}</MenuItem>
                  {departments.map(dept => (
                    <MenuItem key={dept} value={dept}>{dept}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={12}>
              <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
                <Button
                  variant="outlined"
                  startIcon={<SearchIcon />}
                  onClick={handleSearch}
                >
                  {t('common.search')}
                </Button>
                <Button
                  variant="outlined"
                  startIcon={<RefreshIcon />}
                  onClick={handleReset}
                >
                  {t('common.refresh')}
                </Button>
              </Box>
            </Grid>
          </Grid>
        </Paper>

        {/* Error Alert */}
        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {/* Table */}
        <TableContainer component={Paper}>
          {loading && <LinearProgress />}
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>{t('user.management.tableHeaders.employeeId')}</TableCell>
                <TableCell>{t('user.management.tableHeaders.name')}</TableCell>
                <TableCell>{t('user.management.tableHeaders.email')}</TableCell>
                <TableCell>{t('user.management.tableHeaders.role')}</TableCell>
                <TableCell>{t('user.management.tableHeaders.position')}</TableCell>
                <TableCell>{t('user.management.tableHeaders.department')}</TableCell>
                <TableCell>{t('user.management.tableHeaders.jobLevel')}</TableCell>
                <TableCell>{t('user.management.tableHeaders.manager')}</TableCell>
                <TableCell>{t('user.management.tableHeaders.phone')}</TableCell>
                <TableCell>{t('user.residenceCountry') || '常驻国家'}</TableCell>
                <TableCell>{t('user.residenceCity') || '常驻城市'}</TableCell>
                <TableCell>{t('user.management.tableHeaders.status')}</TableCell>
                <TableCell>{t('user.management.tableHeaders.lastLogin')}</TableCell>
                <TableCell align="right">{t('user.management.tableHeaders.actions')}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredUsers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={14} align="center" sx={{ py: 4 }}>
                    {loading ? <CircularProgress /> : t('user.management.noData')}
                  </TableCell>
                </TableRow>
              ) : (
                filteredUsers.map((userItem) => (
                  <TableRow key={userItem._id} hover>
                    <TableCell>
                      <Typography variant="body2" fontWeight={500}>
                        {userItem.employeeId}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      {userItem.firstName} {userItem.lastName}
                    </TableCell>
                    <TableCell>{userItem.email}</TableCell>
                    <TableCell>
                      <Chip label={getRoleName(userItem.role)} size="small" color="primary" variant="outlined" />
                    </TableCell>
                    <TableCell>
                      <Chip label={getPositionName(userItem.position)} size="small" color="secondary" variant="outlined" />
                    </TableCell>
                    <TableCell>{userItem.department || '-'}</TableCell>
                    <TableCell>{userItem.jobLevel || '-'}</TableCell>
                    <TableCell>
                      {userItem.manager 
                        ? `${userItem.manager.firstName} ${userItem.manager.lastName}`
                        : '-'}
                    </TableCell>
                    <TableCell>{userItem.phone || '-'}</TableCell>
                    <TableCell>
                      {userItem.residenceCountry 
                        ? (typeof userItem.residenceCountry === 'object' && userItem.residenceCountry.name
                          ? (userItem.residenceCountry.name || userItem.residenceCountry.enName || '-')
                          : (typeof userItem.residenceCountry === 'string' && userItem.residenceCountry.length > 10
                            ? '-' // 如果是很长的字符串（可能是ID），显示为'-'，等待后端populate
                            : userItem.residenceCountry))
                        : '-'}
                    </TableCell>
                    <TableCell>
                      {userItem.residenceCity 
                        ? (typeof userItem.residenceCity === 'object' && userItem.residenceCity.name
                          ? (userItem.residenceCity.name || userItem.residenceCity.enName || '-')
                          : (typeof userItem.residenceCity === 'string' && userItem.residenceCity.length > 10
                            ? '-' // 如果是很长的字符串（可能是ID），显示为'-'，等待后端populate
                            : userItem.residenceCity))
                        : '-'}
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={userItem.isActive ? t('user.management.active') : t('user.management.inactive')}
                        color={userItem.isActive ? 'success' : 'default'}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      {userItem.lastLogin 
                        ? dayjs(userItem.lastLogin).format('YYYY-MM-DD HH:mm')
                        : '-'}
                    </TableCell>
                    <TableCell align="right">
                      <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
                        {canToggleActive && (
                          <Tooltip title={userItem.isActive ? t('user.management.disable') : t('user.management.enable')}>
                            <IconButton
                              size="small"
                              onClick={() => handleToggleActive(userItem)}
                              color={userItem.isActive ? 'warning' : 'success'}
                            >
                              {userItem.isActive ? <BlockIcon /> : <CheckCircleIcon />}
                            </IconButton>
                          </Tooltip>
                        )}
                        {canEdit && (
                          <Tooltip title={t('common.edit')}>
                            <IconButton
                              size="small"
                              onClick={() => handleEdit(userItem)}
                              color="primary"
                            >
                              <EditIcon />
                            </IconButton>
                          </Tooltip>
                        )}
                        {canDelete && (
                          <Tooltip title={t('common.delete')}>
                            <IconButton
                              size="small"
                              onClick={() => handleDelete(userItem)}
                              color="error"
                            >
                              <DeleteIcon />
                            </IconButton>
                          </Tooltip>
                        )}
                      </Box>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>

        {/* Delete Dialog */}
        <Dialog open={deleteDialog.open} onClose={() => setDeleteDialog({ open: false, user: null })}>
          <DialogTitle>{t('user.management.confirmDelete')}</DialogTitle>
          <DialogContent>
            <Typography>
              {t('user.management.deleteConfirmMessage')} <strong>{deleteDialog.user?.firstName} {deleteDialog.user?.lastName}</strong> ({deleteDialog.user?.employeeId})?
            </Typography>
            <Alert severity="warning" sx={{ mt: 2 }}>
              {t('user.management.deleteWarning')}
            </Alert>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDeleteDialog({ open: false, user: null })}>{t('common.cancel')}</Button>
            <Button
              onClick={confirmDelete}
              color="error"
              variant="contained"
            >
              {t('common.delete')}
            </Button>
          </DialogActions>
        </Dialog>

        {/* Form Dialog */}
        <Dialog
          open={formDialog.open}
          onClose={() => !saving && setFormDialog({ open: false, user: null, mode: 'create' })}
          maxWidth="md"
          fullWidth
        >
          <DialogTitle>
            {formDialog.mode === 'create' ? t('user.management.addUser') : t('user.management.editUser')}
          </DialogTitle>
          <DialogContent>
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label={t('user.employeeId')}
                  value={formData.employeeId}
                  onChange={(e) => {
                    setFormData({ ...formData, employeeId: e.target.value });
                    if (formErrors.employeeId) {
                      setFormErrors({ ...formErrors, employeeId: '' });
                    }
                  }}
                  required
                  disabled={formDialog.mode === 'edit'}
                  error={!!formErrors.employeeId}
                  helperText={formErrors.employeeId}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label={t('auth.email')}
                  type="email"
                  value={formData.email}
                  onChange={(e) => {
                    setFormData({ ...formData, email: e.target.value });
                    if (formErrors.email) {
                      setFormErrors({ ...formErrors, email: '' });
                    }
                  }}
                  required
                  error={!!formErrors.email}
                  helperText={formErrors.email}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label={t('user.firstName')}
                  value={formData.firstName}
                  onChange={(e) => {
                    setFormData({ ...formData, firstName: e.target.value });
                    if (formErrors.firstName) {
                      setFormErrors({ ...formErrors, firstName: '' });
                    }
                  }}
                  required
                  error={!!formErrors.firstName}
                  helperText={formErrors.firstName}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label={t('user.lastName')}
                  value={formData.lastName}
                  onChange={(e) => {
                    setFormData({ ...formData, lastName: e.target.value });
                    if (formErrors.lastName) {
                      setFormErrors({ ...formErrors, lastName: '' });
                    }
                  }}
                  required
                  error={!!formErrors.lastName}
                  helperText={formErrors.lastName}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label={t('user.management.password')}
                  type="password"
                  value={formData.password}
                  onChange={(e) => {
                    setFormData({ ...formData, password: e.target.value });
                    if (formErrors.password) {
                      setFormErrors({ ...formErrors, password: '' });
                    }
                  }}
                  required={formDialog.mode === 'create'}
                  error={!!formErrors.password}
                  helperText={formErrors.password || (formDialog.mode === 'edit' ? t('user.management.passwordHint') : t('user.management.passwordRequirement'))}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label={t('user.phone')}
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <FormControl fullWidth required error={!!formErrors.role}>
                  <InputLabel>{t('user.role')}</InputLabel>
                  <Select
                    value={formData.role}
                    label={t('user.role')}
                    onChange={(e) => {
                      setFormData({ ...formData, role: e.target.value });
                      if (formErrors.role) {
                        setFormErrors({ ...formErrors, role: '' });
                      }
                    }}
                  >
                    {roles.map(role => (
                      <MenuItem key={role._id} value={role.code}>
                        {role.name} ({role.code})
                      </MenuItem>
                    ))}
                  </Select>
                  {formErrors.role && (
                    <Typography variant="caption" color="error" sx={{ mt: 0.5, ml: 1.5 }}>
                      {formErrors.role}
                    </Typography>
                  )}
                </FormControl>
              </Grid>
              <Grid item xs={12} md={6}>
                <FormControl fullWidth required error={!!formErrors.position}>
                  <InputLabel>{t('user.position')}</InputLabel>
                  <Select
                    value={formData.position}
                    label={t('user.position')}
                    onChange={(e) => {
                      setFormData({ ...formData, position: e.target.value });
                      if (formErrors.position) {
                        setFormErrors({ ...formErrors, position: '' });
                      }
                    }}
                  >
                    {positions.map(position => (
                      <MenuItem key={position._id} value={position.code}>
                        {position.name} ({position.code})
                      </MenuItem>
                    ))}
                  </Select>
                  {formErrors.position && (
                    <Typography variant="caption" color="error" sx={{ mt: 0.5, ml: 1.5 }}>
                      {formErrors.position}
                    </Typography>
                  )}
                </FormControl>
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label={t('user.department')}
                  value={formData.department}
                  onChange={(e) => {
                    setFormData({ ...formData, department: e.target.value });
                    if (formErrors.department) {
                      setFormErrors({ ...formErrors, department: '' });
                    }
                  }}
                  required
                  error={!!formErrors.department}
                  helperText={formErrors.department}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label={t('user.management.jobLevel')}
                  value={formData.jobLevel}
                  onChange={(e) => setFormData({ ...formData, jobLevel: e.target.value })}
                />
              </Grid>
              <Grid item xs={12}>
                <FormControl fullWidth>
                  <InputLabel>{t('user.manager')}</InputLabel>
                  <Select
                    value={formData.manager}
                    label={t('user.manager')}
                    onChange={(e) => setFormData({ ...formData, manager: e.target.value })}
                  >
                    <MenuItem value="">{t('user.management.noManager')}</MenuItem>
                    {managers
                      .filter(m => formDialog.mode === 'create' || m._id !== formDialog.user?._id)
                      .map(manager => (
                        <MenuItem key={manager._id} value={manager._id}>
                          {manager.firstName} {manager.lastName} ({manager.employeeId})
                        </MenuItem>
                      ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={6}>
                <RegionSelector
                  label={t('user.residenceCountry') || '常驻国家'}
                  value={formData.residenceCountry}
                  onChange={(value) => {
                    // 只允许选择国家类型
                    if (value === null) {
                      setFormData({ ...formData, residenceCountry: null });
                    } else if (value && value.type === 'country') {
                      setFormData({ ...formData, residenceCountry: value });
                    } else if (value && value.type !== 'country') {
                      // 如果选择了非国家类型，显示提示并拒绝
                      showNotification(t('user.management.invalidCountryType') || '请选择国家类型', 'warning');
                    }
                  }}
                  placeholder={t('user.residenceCountryPlaceholder') || '搜索国家'}
                  showHotCitiesOnFocus={false}
                  allowedTypes={['country']}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <RegionSelector
                  label={t('user.residenceCity') || '常驻城市'}
                  value={formData.residenceCity}
                  onChange={(value) => {
                    // 只允许选择城市类型
                    if (value === null) {
                      setFormData({ ...formData, residenceCity: null });
                    } else if (value && value.type === 'city') {
                      setFormData({ ...formData, residenceCity: value });
                    } else if (value && value.type !== 'city') {
                      // 如果选择了非城市类型，显示提示并拒绝
                      showNotification(t('user.management.invalidCityType') || '请选择城市类型', 'warning');
                    }
                  }}
                  placeholder={t('user.residenceCityPlaceholder') || '搜索城市'}
                  showHotCitiesOnFocus={false}
                  allowedTypes={['city']}
                />
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions>
            <Button
              onClick={() => setFormDialog({ open: false, user: null, mode: 'create' })}
              disabled={saving}
            >
              {t('common.cancel')}
            </Button>
            <Button
              onClick={handleSave}
              variant="contained"
              disabled={
                saving || 
                !formData.employeeId || 
                !formData.firstName || 
                !formData.lastName || 
                !formData.email || 
                !formData.role || 
                !formData.position || 
                !formData.department ||
                (formDialog.mode === 'create' && !formData.password)
              }
            >
              {saving ? <CircularProgress size={20} /> : t('common.save')}
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </Container>
  );
};

export default UserManagement;

