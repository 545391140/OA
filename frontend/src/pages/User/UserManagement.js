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
        throw new Error(response.data?.message || '获取用户数据失败');
      }
    } catch (err) {
      console.error('Fetch users error:', err);
      setError(err.response?.data?.message || err.message || '获取用户数据失败');
      showNotification('获取用户数据失败', 'error');
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
      showNotification('删除成功', 'success');
      fetchUsers();
    } catch (err) {
      console.error('Delete user error:', err);
      const errorMsg = err.response?.data?.message || '删除失败';
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
        showNotification('创建成功', 'success');
      } else {
        const response = await apiClient.put(`/users/${formDialog.user._id}`, saveData);
        console.log('Update user response:', response.data);
        showNotification('更新成功', 'success');
      }
      
      fetchUsers();
      setFormDialog({ open: false, user: null, mode: 'create' });
    } catch (err) {
      console.error('Save user error:', err);
      console.error('Error response:', err.response?.data);
      
      // 处理验证错误
      if (err.response?.data?.errors && Array.isArray(err.response.data.errors)) {
        const errorMessages = err.response.data.errors.map(e => e.msg || e.message).join(', ');
        showNotification(`验证失败: ${errorMessages}`, 'error');
      } else {
        const errorMsg = err.response?.data?.message || err.message || '保存失败';
        showNotification(errorMsg, 'error');
      }
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (userItem) => {
    try {
      await apiClient.patch(`/users/${userItem._id}/toggle-active`);
      showNotification(userItem.isActive ? '已禁用' : '已启用', 'success');
      fetchUsers();
    } catch (err) {
      console.error('Toggle active error:', err);
      const errorMsg = err.response?.data?.message || '操作失败';
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
              用户管理
            </Typography>
          </Box>
          {canEdit && (
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={handleAdd}
              sx={{ borderRadius: 2 }}
            >
              新增用户
            </Button>
          )}
        </Box>

        {/* Filters */}
        <Paper sx={{ p: 2, mb: 3 }}>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                placeholder="搜索员工ID、姓名、邮箱..."
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
            <Grid item xs={12} md={2}>
              <FormControl fullWidth>
                <InputLabel>角色</InputLabel>
                <Select
                  value={roleFilter}
                  label="角色"
                  onChange={(e) => setRoleFilter(e.target.value)}
                >
                  <MenuItem value="all">全部</MenuItem>
                  {roleCodes.map(code => (
                    <MenuItem key={code} value={code}>{getRoleName(code)}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={2}>
              <FormControl fullWidth>
                <InputLabel>岗位</InputLabel>
                <Select
                  value={positionFilter}
                  label="岗位"
                  onChange={(e) => setPositionFilter(e.target.value)}
                >
                  <MenuItem value="all">全部</MenuItem>
                  {positionCodes.map(code => (
                    <MenuItem key={code} value={code}>{getPositionName(code)}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={2}>
              <FormControl fullWidth>
                <InputLabel>部门</InputLabel>
                <Select
                  value={departmentFilter}
                  label="部门"
                  onChange={(e) => setDepartmentFilter(e.target.value)}
                >
                  <MenuItem value="all">全部</MenuItem>
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
                <TableCell>员工ID</TableCell>
                <TableCell>姓名</TableCell>
                <TableCell>邮箱</TableCell>
                <TableCell>角色</TableCell>
                <TableCell>岗位</TableCell>
                <TableCell>部门</TableCell>
                <TableCell>职级</TableCell>
                <TableCell>直属上级</TableCell>
                <TableCell>电话</TableCell>
                <TableCell>状态</TableCell>
                <TableCell>最后登录</TableCell>
                <TableCell align="right">操作</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredUsers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={12} align="center" sx={{ py: 4 }}>
                    {loading ? <CircularProgress /> : '暂无数据'}
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
                        label={userItem.isActive ? '启用' : '禁用'}
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
                            <Tooltip title={userItem.isActive ? '禁用' : '启用'}>
                              <IconButton
                                size="small"
                                onClick={() => handleToggleActive(userItem)}
                                color={userItem.isActive ? 'warning' : 'success'}
                              >
                                {userItem.isActive ? <BlockIcon /> : <CheckCircleIcon />}
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="编辑">
                              <IconButton
                                size="small"
                                onClick={() => handleEdit(userItem)}
                                color="primary"
                              >
                                <EditIcon />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="删除">
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
          <DialogTitle>确认删除</DialogTitle>
          <DialogContent>
            <Typography>
              确定要删除用户 <strong>{deleteDialog.user?.firstName} {deleteDialog.user?.lastName}</strong> ({deleteDialog.user?.employeeId}) 吗？
            </Typography>
            <Alert severity="warning" sx={{ mt: 2 }}>
              删除操作将禁用该用户，而不是真正删除用户数据
            </Alert>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDeleteDialog({ open: false, user: null })}>取消</Button>
            <Button
              onClick={confirmDelete}
              color="error"
              variant="contained"
            >
              删除
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
            {formDialog.mode === 'create' ? '新增用户' : '编辑用户'}
          </DialogTitle>
          <DialogContent>
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="员工ID"
                  value={formData.employeeId}
                  onChange={(e) => setFormData({ ...formData, employeeId: e.target.value })}
                  required
                  disabled={formDialog.mode === 'edit'}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="邮箱"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="名"
                  value={formData.firstName}
                  onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                  required
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="姓"
                  value={formData.lastName}
                  onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                  required
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="密码"
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  required={formDialog.mode === 'create'}
                  helperText={formDialog.mode === 'edit' ? '留空则不修改密码' : '至少6个字符'}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="电话"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <FormControl fullWidth required>
                  <InputLabel>角色</InputLabel>
                  <Select
                    value={formData.role}
                    label="角色"
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
                  <InputLabel>岗位</InputLabel>
                  <Select
                    value={formData.position}
                    label="岗位"
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
                  label="部门"
                  value={formData.department}
                  onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                  required
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="职级"
                  value={formData.jobLevel}
                  onChange={(e) => setFormData({ ...formData, jobLevel: e.target.value })}
                />
              </Grid>
              <Grid item xs={12}>
                <FormControl fullWidth>
                  <InputLabel>直属上级</InputLabel>
                  <Select
                    value={formData.manager}
                    label="直属上级"
                    onChange={(e) => setFormData({ ...formData, manager: e.target.value })}
                  >
                    <MenuItem value="">无</MenuItem>
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
              取消
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
              {saving ? <CircularProgress size={20} /> : '保存'}
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </Container>
  );
};

export default UserManagement;

