/**
 * 角色管理页面 - 列表页
 * 提供角色数据的列表展示、搜索、新增、编辑、删除、禁用功能
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
  FormLabel,
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
  Switch,
  FormControlLabel,
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
  Security as SecurityIcon
} from '@mui/icons-material';
import apiClient from '../../utils/axiosConfig';
import { useNotification } from '../../contexts/NotificationContext';
import { useAuth } from '../../contexts/AuthContext';
import { PERMISSIONS } from '../../config/permissions';
import { useTranslation } from 'react-i18next';
import dayjs from 'dayjs';
import PermissionSelector from '../../components/Common/PermissionSelector';

const RoleManagement = () => {
  const { t, i18n } = useTranslation();
  const { showNotification } = useNotification();
  const { user, hasPermission } = useAuth();
  const canView = hasPermission(PERMISSIONS.ROLE_VIEW);
  const canCreate = hasPermission(PERMISSIONS.ROLE_CREATE);
  const canEdit = hasPermission(PERMISSIONS.ROLE_EDIT);
  const canDelete = hasPermission(PERMISSIONS.ROLE_DELETE);
  const canToggleActive = hasPermission(PERMISSIONS.ROLE_TOGGLE_ACTIVE);

  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  
  // 对话框状态
  const [deleteDialog, setDeleteDialog] = useState({ open: false, role: null });
  const [formDialog, setFormDialog] = useState({ open: false, role: null, mode: 'create' });
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    nameEn: '',
    description: '',
    permissions: [],
    level: 0,
    dataScope: 'self' // 数据权限范围：self(本人数据), all(全部数据), department(本部门数据), subDepartment(本部门及下属部门数据)
  });
  const [saving, setSaving] = useState(false);

  // 根据当前语言获取角色名称
  const getRoleName = (role) => {
    if (!role) return '';
    // 根据当前语言返回对应的名称
    const lang = i18n.language || 'zh';
    if (lang === 'en' || lang.startsWith('en')) {
      return role.nameEn || role.name || '';
    }
    if (lang === 'ja' || lang.startsWith('ja')) {
      // 日语优先使用 nameEn，如果没有则使用 name
      return role.nameEn || role.name || '';
    }
    if (lang === 'ko' || lang.startsWith('ko')) {
      // 韩语优先使用 nameEn，如果没有则使用 name
      return role.nameEn || role.name || '';
    }
    // 中文默认使用 name
    return role.name || '';
  };

  useEffect(() => {
    fetchRoles();
  }, [statusFilter]);

  const fetchRoles = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const params = {};
      if (statusFilter !== 'all') {
        params.isActive = statusFilter === 'active';
      }
      if (searchTerm) {
        params.search = searchTerm;
      }

      const response = await apiClient.get('/roles', { params });
      
      if (response.data && response.data.success) {
        setRoles(response.data.data || []);
      } else {
        throw new Error(response.data?.message || t('role.management.fetchError'));
      }
    } catch (err) {
      console.error('Fetch roles error:', err);
      setError(err.response?.data?.message || err.message || t('role.management.fetchError'));
      showNotification(t('role.management.fetchError'), 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    fetchRoles();
  };

  const handleReset = () => {
    setSearchTerm('');
    setStatusFilter('all');
    setTimeout(() => fetchRoles(), 100);
  };

  const handleDelete = (role) => {
    setDeleteDialog({ open: true, role });
  };

  const confirmDelete = async () => {
    try {
      await apiClient.delete(`/roles/${deleteDialog.role._id}`);
      showNotification(t('role.management.deleteSuccess'), 'success');
      fetchRoles();
    } catch (err) {
      console.error('Delete role error:', err);
      const errorMsg = err.response?.data?.message || t('role.management.deleteError');
      showNotification(errorMsg, 'error');
    } finally {
      setDeleteDialog({ open: false, role: null });
    }
  };

  const handleEdit = (role) => {
    setFormData({
      code: role.code || '',
      name: role.name || '',
      nameEn: role.nameEn || '',
      description: role.description || '',
      permissions: role.permissions || [],
      level: role.level || 0,
      dataScope: role.dataScope || 'self'
    });
    setFormDialog({ open: true, role, mode: 'edit' });
  };

  const handleAdd = () => {
    setFormData({
      code: '',
      name: '',
      nameEn: '',
      description: '',
      permissions: [],
      level: 0
    });
    setFormDialog({ open: true, role: null, mode: 'create' });
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      
      if (formDialog.mode === 'create') {
        await apiClient.post('/roles', formData);
        showNotification(t('role.management.createSuccess'), 'success');
      } else {
        await apiClient.put(`/roles/${formDialog.role._id}`, formData);
        showNotification(t('role.management.updateSuccess'), 'success');
      }
      
      fetchRoles();
      setFormDialog({ open: false, role: null, mode: 'create' });
    } catch (err) {
      console.error('Save role error:', err);
      const errorMsg = err.response?.data?.message || t('role.management.saveError');
      showNotification(errorMsg, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (role) => {
    try {
      await apiClient.patch(`/roles/${role._id}/toggle-active`);
      showNotification(role.isActive ? t('role.management.toggleDisabledSuccess') : t('role.management.toggleSuccess'), 'success');
      fetchRoles();
    } catch (err) {
      console.error('Toggle active error:', err);
      const errorMsg = err.response?.data?.message || t('role.management.toggleError');
      showNotification(errorMsg, 'error');
    }
  };

  const filteredRoles = roles.filter(role => {
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      return (
        role.code?.toLowerCase().includes(search) ||
        role.name?.toLowerCase().includes(search) ||
        role.nameEn?.toLowerCase().includes(search) ||
        role.description?.toLowerCase().includes(search)
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
            <SecurityIcon sx={{ fontSize: 32, color: 'primary.main' }} />
            <Typography variant="h4" fontWeight={600}>
              {t('role.management.title')}
            </Typography>
          </Box>
          {canCreate && (
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={handleAdd}
              sx={{ borderRadius: 2 }}
            >
              {t('role.management.addRole')}
            </Button>
          )}
        </Box>

        {/* Filters */}
        <Paper sx={{ p: 2, mb: 3 }}>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                placeholder={t('role.management.searchPlaceholder')}
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
            <Grid item xs={12} md={3}>
              <FormControl fullWidth>
                <InputLabel>{t('role.management.status')}</InputLabel>
                <Select
                  value={statusFilter}
                  label={t('role.management.status')}
                  onChange={(e) => setStatusFilter(e.target.value)}
                >
                  <MenuItem value="all">{t('role.management.all')}</MenuItem>
                  <MenuItem value="active">{t('role.management.active')}</MenuItem>
                  <MenuItem value="inactive">{t('role.management.inactive')}</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={5}>
              <Box sx={{ display: 'flex', gap: 1 }}>
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
                <TableCell>{t('role.management.tableHeaders.code')}</TableCell>
                <TableCell>{t('role.management.tableHeaders.name')}</TableCell>
                <TableCell>{t('role.management.tableHeaders.nameEn')}</TableCell>
                <TableCell>{t('role.management.tableHeaders.description')}</TableCell>
                <TableCell>{t('role.management.tableHeaders.permissionsCount')}</TableCell>
                <TableCell>{t('role.management.tableHeaders.level')}</TableCell>
                <TableCell>{t('role.management.tableHeaders.dataScope') || '数据权限'}</TableCell>
                <TableCell>{t('role.management.tableHeaders.isSystem')}</TableCell>
                <TableCell>{t('role.management.tableHeaders.status')}</TableCell>
                <TableCell>{t('role.management.tableHeaders.createdAt')}</TableCell>
                <TableCell align="right">{t('role.management.tableHeaders.actions')}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredRoles.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={11} align="center" sx={{ py: 4 }}>
                    {loading ? <CircularProgress /> : t('role.management.noData')}
                  </TableCell>
                </TableRow>
              ) : (
                filteredRoles.map((role) => (
                  <TableRow key={role._id} hover>
                    <TableCell>
                      <Typography variant="body2" fontWeight={500}>
                        {role.code}
                      </Typography>
                    </TableCell>
                    <TableCell>{getRoleName(role)}</TableCell>
                    <TableCell>
                      {i18n.language === 'zh' || i18n.language?.startsWith('zh') 
                        ? (role.nameEn || '-') 
                        : (role.name || '-')}
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" color="text.secondary" noWrap sx={{ maxWidth: 200 }}>
                        {role.description || '-'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip label={role.permissions?.length || 0} size="small" />
                    </TableCell>
                    <TableCell>{role.level || 0}</TableCell>
                    <TableCell>
                      <Chip
                        label={
                          role.dataScope === 'self' ? (t('role.dataScope.self') || '本人数据') :
                          role.dataScope === 'all' ? (t('role.dataScope.all') || '全部数据') :
                          role.dataScope === 'department' ? (t('role.dataScope.department') || '本部门数据') :
                          role.dataScope === 'subDepartment' ? (t('role.dataScope.subDepartment') || '本部门及下属部门数据') :
                          (t('role.dataScope.self') || '本人数据')
                        }
                        size="small"
                        color={
                          role.dataScope === 'all' ? 'primary' :
                          role.dataScope === 'subDepartment' ? 'info' :
                          role.dataScope === 'department' ? 'success' :
                          'default'
                        }
                      />
                    </TableCell>
                    <TableCell>
                      {role.isSystem ? (
                        <Chip label={t('role.management.yes')} color="primary" size="small" />
                      ) : (
                        <Chip label={t('role.management.no')} size="small" variant="outlined" />
                      )}
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={role.isActive ? t('role.management.active') : t('role.management.inactive')}
                        color={role.isActive ? 'success' : 'default'}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      {dayjs(role.createdAt).format('YYYY-MM-DD HH:mm')}
                    </TableCell>
                    <TableCell align="right">
                      <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
                        {canToggleActive && (
                          <Tooltip title={role.isActive ? t('role.management.disable') : t('role.management.enable')}>
                            <IconButton
                              size="small"
                              onClick={() => handleToggleActive(role)}
                              disabled={role.isSystem && !role.isActive}
                              color={role.isActive ? 'warning' : 'success'}
                            >
                              {role.isActive ? <BlockIcon /> : <CheckCircleIcon />}
                            </IconButton>
                          </Tooltip>
                        )}
                        {canEdit && (
                          <Tooltip title={t('common.edit')}>
                            <IconButton
                              size="small"
                              onClick={() => handleEdit(role)}
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
                              onClick={() => handleDelete(role)}
                              disabled={role.isSystem}
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
        <Dialog open={deleteDialog.open} onClose={() => setDeleteDialog({ open: false, role: null })}>
          <DialogTitle>{t('role.management.confirmDelete')}</DialogTitle>
          <DialogContent>
            <Typography>
              {t('role.management.deleteConfirmMessage')} <strong>{getRoleName(deleteDialog.role)}</strong> ({deleteDialog.role?.code}){i18n.language === 'zh' ? '吗？' : '?'}
            </Typography>
            {deleteDialog.role?.isSystem && (
              <Alert severity="warning" sx={{ mt: 2 }}>
                {t('role.management.deleteWarning')}
              </Alert>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDeleteDialog({ open: false, role: null })}>{t('common.cancel')}</Button>
            <Button
              onClick={confirmDelete}
              color="error"
              variant="contained"
              disabled={deleteDialog.role?.isSystem}
            >
              {t('common.delete')}
            </Button>
          </DialogActions>
        </Dialog>

        {/* Form Dialog */}
        <Dialog
          open={formDialog.open}
          onClose={() => !saving && setFormDialog({ open: false, role: null, mode: 'create' })}
          maxWidth="md"
          fullWidth
        >
          <DialogTitle>
            {formDialog.mode === 'create' ? t('role.management.addRole') : t('role.management.editRole')}
          </DialogTitle>
          <DialogContent>
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label={t('role.code')}
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                  required
                  disabled={formDialog.mode === 'edit'}
                  helperText={t('role.management.codeHint')}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label={t('role.name')}
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label={t('role.nameEn')}
                  value={formData.nameEn}
                  onChange={(e) => setFormData({ ...formData, nameEn: e.target.value })}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label={t('role.level')}
                  type="number"
                  value={formData.level}
                  onChange={(e) => setFormData({ ...formData, level: parseInt(e.target.value) || 0 })}
                  inputProps={{ min: 0, max: 100 }}
                  helperText={t('role.levelHint')}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label={t('role.description')}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  multiline
                  rows={3}
                />
              </Grid>
              <Grid item xs={12}>
                <FormControl fullWidth>
                  <FormLabel sx={{ mb: 1 }}>{t('role.permissions')}</FormLabel>
                  <PermissionSelector
                    selectedPermissions={formData.permissions}
                    onChange={(permissions) => setFormData({ ...formData, permissions })}
                    disabled={saving}
                  />
                </FormControl>
              </Grid>
              <Grid item xs={12}>
                <FormControl fullWidth>
                  <InputLabel>{t('role.dataScope') || '数据权限范围'}</InputLabel>
                  <Select
                    value={formData.dataScope}
                    label={t('role.dataScope') || '数据权限范围'}
                    onChange={(e) => setFormData({ ...formData, dataScope: e.target.value })}
                    disabled={saving}
                  >
                    <MenuItem value="self">{t('role.dataScope.self') || '本人数据'}</MenuItem>
                    <MenuItem value="all">{t('role.dataScope.all') || '全部数据'}</MenuItem>
                    <MenuItem value="department">{t('role.dataScope.department') || '本部门数据'}</MenuItem>
                    <MenuItem value="subDepartment">{t('role.dataScope.subDepartment') || '本部门及下属部门数据'}</MenuItem>
                  </Select>
                  <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5 }}>
                    {formData.dataScope === 'self' && (t('role.dataScope.selfHint') || '只能查看和操作自己的数据')}
                    {formData.dataScope === 'all' && (t('role.dataScope.allHint') || '可以查看和操作所有数据')}
                    {formData.dataScope === 'department' && (t('role.dataScope.departmentHint') || '可以查看和操作本部门的数据')}
                    {formData.dataScope === 'subDepartment' && (t('role.dataScope.subDepartmentHint') || '可以查看和操作本部门及所有下属部门的数据')}
                  </Typography>
                </FormControl>
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions>
            <Button
              onClick={() => setFormDialog({ open: false, role: null, mode: 'create' })}
              disabled={saving}
            >
              {t('common.cancel')}
            </Button>
            <Button
              onClick={handleSave}
              variant="contained"
              disabled={saving || !formData.code || !formData.name}
            >
              {saving ? <CircularProgress size={20} /> : t('common.save')}
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </Container>
  );
};

export default RoleManagement;

