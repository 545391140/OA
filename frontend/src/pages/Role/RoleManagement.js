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
import dayjs from 'dayjs';

const RoleManagement = () => {
  const { showNotification } = useNotification();
  const { user } = useAuth();
  const canEdit = user?.role === 'admin';

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
    level: 0
  });
  const [saving, setSaving] = useState(false);

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
        throw new Error(response.data?.message || '获取角色数据失败');
      }
    } catch (err) {
      console.error('Fetch roles error:', err);
      setError(err.response?.data?.message || err.message || '获取角色数据失败');
      showNotification('获取角色数据失败', 'error');
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
      showNotification('删除成功', 'success');
      fetchRoles();
    } catch (err) {
      console.error('Delete role error:', err);
      const errorMsg = err.response?.data?.message || '删除失败';
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
      level: role.level || 0
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
        showNotification('创建成功', 'success');
      } else {
        await apiClient.put(`/roles/${formDialog.role._id}`, formData);
        showNotification('更新成功', 'success');
      }
      
      fetchRoles();
      setFormDialog({ open: false, role: null, mode: 'create' });
    } catch (err) {
      console.error('Save role error:', err);
      const errorMsg = err.response?.data?.message || '保存失败';
      showNotification(errorMsg, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (role) => {
    try {
      await apiClient.patch(`/roles/${role._id}/toggle-active`);
      showNotification(role.isActive ? '已禁用' : '已启用', 'success');
      fetchRoles();
    } catch (err) {
      console.error('Toggle active error:', err);
      const errorMsg = err.response?.data?.message || '操作失败';
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
              角色管理
            </Typography>
          </Box>
          {canEdit && (
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={handleAdd}
              sx={{ borderRadius: 2 }}
            >
              新增角色
            </Button>
          )}
        </Box>

        {/* Filters */}
        <Paper sx={{ p: 2, mb: 3 }}>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                placeholder="搜索角色代码、名称..."
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
            <Grid item xs={12} md={5}>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Button
                  variant="outlined"
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
                <TableCell>角色代码</TableCell>
                <TableCell>角色名称</TableCell>
                <TableCell>英文名称</TableCell>
                <TableCell>描述</TableCell>
                <TableCell>权限数量</TableCell>
                <TableCell>级别</TableCell>
                <TableCell>系统角色</TableCell>
                <TableCell>状态</TableCell>
                <TableCell>创建时间</TableCell>
                <TableCell align="right">操作</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredRoles.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={10} align="center" sx={{ py: 4 }}>
                    {loading ? <CircularProgress /> : '暂无数据'}
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
                    <TableCell>{role.name}</TableCell>
                    <TableCell>{role.nameEn || '-'}</TableCell>
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
                      {role.isSystem ? (
                        <Chip label="是" color="primary" size="small" />
                      ) : (
                        <Chip label="否" size="small" variant="outlined" />
                      )}
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={role.isActive ? '启用' : '禁用'}
                        color={role.isActive ? 'success' : 'default'}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      {dayjs(role.createdAt).format('YYYY-MM-DD HH:mm')}
                    </TableCell>
                    <TableCell align="right">
                      <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
                        {canEdit && (
                          <>
                            <Tooltip title={role.isActive ? '禁用' : '启用'}>
                              <IconButton
                                size="small"
                                onClick={() => handleToggleActive(role)}
                                disabled={role.isSystem && !role.isActive}
                                color={role.isActive ? 'warning' : 'success'}
                              >
                                {role.isActive ? <BlockIcon /> : <CheckCircleIcon />}
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="编辑">
                              <IconButton
                                size="small"
                                onClick={() => handleEdit(role)}
                                color="primary"
                              >
                                <EditIcon />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="删除">
                              <IconButton
                                size="small"
                                onClick={() => handleDelete(role)}
                                disabled={role.isSystem}
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
        <Dialog open={deleteDialog.open} onClose={() => setDeleteDialog({ open: false, role: null })}>
          <DialogTitle>确认删除</DialogTitle>
          <DialogContent>
            <Typography>
              确定要删除角色 <strong>{deleteDialog.role?.name}</strong> ({deleteDialog.role?.code}) 吗？
            </Typography>
            {deleteDialog.role?.isSystem && (
              <Alert severity="warning" sx={{ mt: 2 }}>
                系统角色无法删除
              </Alert>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDeleteDialog({ open: false, role: null })}>取消</Button>
            <Button
              onClick={confirmDelete}
              color="error"
              variant="contained"
              disabled={deleteDialog.role?.isSystem}
            >
              删除
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
            {formDialog.mode === 'create' ? '新增角色' : '编辑角色'}
          </DialogTitle>
          <DialogContent>
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="角色代码"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                  required
                  disabled={formDialog.mode === 'edit'}
                  helperText="只能包含大写字母、数字和下划线"
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="角色名称"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="英文名称"
                  value={formData.nameEn}
                  onChange={(e) => setFormData({ ...formData, nameEn: e.target.value })}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="级别"
                  type="number"
                  value={formData.level}
                  onChange={(e) => setFormData({ ...formData, level: parseInt(e.target.value) || 0 })}
                  inputProps={{ min: 0, max: 100 }}
                  helperText="数值越大，权限级别越高"
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="描述"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  multiline
                  rows={3}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="权限列表（用逗号分隔）"
                  value={formData.permissions.join(', ')}
                  onChange={(e) => {
                    const permissions = e.target.value
                      .split(',')
                      .map(p => p.trim())
                      .filter(p => p);
                    setFormData({ ...formData, permissions });
                  }}
                  helperText="输入权限，多个权限用逗号分隔"
                />
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions>
            <Button
              onClick={() => setFormDialog({ open: false, role: null, mode: 'create' })}
              disabled={saving}
            >
              取消
            </Button>
            <Button
              onClick={handleSave}
              variant="contained"
              disabled={saving || !formData.code || !formData.name}
            >
              {saving ? <CircularProgress size={20} /> : '保存'}
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </Container>
  );
};

export default RoleManagement;

