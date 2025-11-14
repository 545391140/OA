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

const UserManagement = () => {
  const { t } = useTranslation();
  const { showNotification } = useNotification();
  const { user } = useAuth();
  const canEdit = user?.role === 'admin';

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
    manager: ''
  });
  const [saving, setSaving] = useState(false);
  const [managers, setManagers] = useState([]);

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

  const handleEdit = (userItem) => {
    setFormData({
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
      manager: userItem.manager?._id || ''
    });
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
      manager: ''
    });
    setFormDialog({ open: true, user: null, mode: 'create' });
  };

  const handleSave = async () => {
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
          {canEdit && (
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
                <TableCell>{t('user.management.tableHeaders.status')}</TableCell>
                <TableCell>{t('user.management.tableHeaders.lastLogin')}</TableCell>
                <TableCell align="right">{t('user.management.tableHeaders.actions')}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredUsers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={12} align="center" sx={{ py: 4 }}>
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
                        {canEdit && (
                          <>
                            <Tooltip title={userItem.isActive ? t('user.management.disable') : t('user.management.enable')}>
                              <IconButton
                                size="small"
                                onClick={() => handleToggleActive(userItem)}
                                color={userItem.isActive ? 'warning' : 'success'}
                              >
                                {userItem.isActive ? <BlockIcon /> : <CheckCircleIcon />}
                              </IconButton>
                            </Tooltip>
                            <Tooltip title={t('common.edit')}>
                              <IconButton
                                size="small"
                                onClick={() => handleEdit(userItem)}
                                color="primary"
                              >
                                <EditIcon />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title={t('common.delete')}>
                              <IconButton
                                size="small"
                                onClick={() => handleDelete(userItem)}
                                color="error"
                              >
                                <DeleteIcon />
                              </IconButton>
                            </Tooltip>
                          </>
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
                  onChange={(e) => setFormData({ ...formData, employeeId: e.target.value })}
                  required
                  disabled={formDialog.mode === 'edit'}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label={t('auth.email')}
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label={t('user.firstName')}
                  value={formData.firstName}
                  onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                  required
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label={t('user.lastName')}
                  value={formData.lastName}
                  onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                  required
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label={t('user.management.password')}
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  required={formDialog.mode === 'create'}
                  helperText={formDialog.mode === 'edit' ? t('user.management.passwordHint') : t('user.management.passwordRequirement')}
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
                <FormControl fullWidth required>
                  <InputLabel>{t('user.role')}</InputLabel>
                  <Select
                    value={formData.role}
                    label={t('user.role')}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  >
                    {roles.map(role => (
                      <MenuItem key={role._id} value={role.code}>
                        {role.name} ({role.code})
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={6}>
                <FormControl fullWidth required>
                  <InputLabel>{t('user.position')}</InputLabel>
                  <Select
                    value={formData.position}
                    label={t('user.position')}
                    onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                  >
                    {positions.map(position => (
                      <MenuItem key={position._id} value={position.code}>
                        {position.name} ({position.code})
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label={t('user.department')}
                  value={formData.department}
                  onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                  required
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

