/**
 * 岗位管理页面 - 列表页
 * 提供岗位数据的列表展示、搜索、新增、编辑、删除、禁用功能
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
  Work as WorkIcon
} from '@mui/icons-material';
import apiClient from '../../utils/axiosConfig';
import { useNotification } from '../../contexts/NotificationContext';
import { useAuth } from '../../contexts/AuthContext';
import dayjs from 'dayjs';

const PositionManagement = () => {
  const { showNotification } = useNotification();
  const { user } = useAuth();
  const canEdit = user?.role === 'admin';

  const [positions, setPositions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [departmentFilter, setDepartmentFilter] = useState('all');
  
  // 对话框状态
  const [deleteDialog, setDeleteDialog] = useState({ open: false, position: null });
  const [formDialog, setFormDialog] = useState({ open: false, position: null, mode: 'create' });
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    nameEn: '',
    description: '',
    department: '',
    jobLevel: '',
    minSalary: '',
    maxSalary: '',
    requirements: {
      education: '',
      experience: '',
      skills: []
    },
    responsibilities: []
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchPositions();
  }, [statusFilter, departmentFilter]);

  const fetchPositions = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const params = {};
      if (statusFilter !== 'all') {
        params.isActive = statusFilter === 'active';
      }
      if (departmentFilter !== 'all') {
        params.department = departmentFilter;
      }
      if (searchTerm) {
        params.search = searchTerm;
      }

      const response = await apiClient.get('/positions', { params });
      
      if (response.data && response.data.success) {
        setPositions(response.data.data || []);
      } else {
        throw new Error(response.data?.message || '获取岗位数据失败');
      }
    } catch (err) {
      console.error('Fetch positions error:', err);
      setError(err.response?.data?.message || err.message || '获取岗位数据失败');
      showNotification('获取岗位数据失败', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    fetchPositions();
  };

  const handleReset = () => {
    setSearchTerm('');
    setStatusFilter('all');
    setDepartmentFilter('all');
    setTimeout(() => fetchPositions(), 100);
  };

  const handleDelete = (position) => {
    setDeleteDialog({ open: true, position });
  };

  const confirmDelete = async () => {
    try {
      await apiClient.delete(`/positions/${deleteDialog.position._id}`);
      showNotification('删除成功', 'success');
      fetchPositions();
    } catch (err) {
      console.error('Delete position error:', err);
      const errorMsg = err.response?.data?.message || '删除失败';
      showNotification(errorMsg, 'error');
    } finally {
      setDeleteDialog({ open: false, position: null });
    }
  };

  const handleEdit = (position) => {
    setFormData({
      code: position.code || '',
      name: position.name || '',
      nameEn: position.nameEn || '',
      description: position.description || '',
      department: position.department || '',
      jobLevel: position.jobLevel || '',
      minSalary: position.minSalary || '',
      maxSalary: position.maxSalary || '',
      requirements: position.requirements || {
        education: '',
        experience: '',
        skills: []
      },
      responsibilities: position.responsibilities || []
    });
    setFormDialog({ open: true, position, mode: 'edit' });
  };

  const handleAdd = () => {
    setFormData({
      code: '',
      name: '',
      nameEn: '',
      description: '',
      department: '',
      jobLevel: '',
      minSalary: '',
      maxSalary: '',
      requirements: {
        education: '',
        experience: '',
        skills: []
      },
      responsibilities: []
    });
    setFormDialog({ open: true, position: null, mode: 'create' });
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      
      const saveData = {
        ...formData,
        minSalary: formData.minSalary ? parseFloat(formData.minSalary) : undefined,
        maxSalary: formData.maxSalary ? parseFloat(formData.maxSalary) : undefined,
        requirements: {
          ...formData.requirements,
          skills: typeof formData.requirements.skills === 'string'
            ? formData.requirements.skills.split(',').map(s => s.trim()).filter(s => s)
            : formData.requirements.skills
        },
        responsibilities: typeof formData.responsibilities === 'string'
          ? formData.responsibilities.split('\n').filter(r => r.trim())
          : formData.responsibilities
      };
      
      if (formDialog.mode === 'create') {
        await apiClient.post('/positions', saveData);
        showNotification('创建成功', 'success');
      } else {
        await apiClient.put(`/positions/${formDialog.position._id}`, saveData);
        showNotification('更新成功', 'success');
      }
      
      fetchPositions();
      setFormDialog({ open: false, position: null, mode: 'create' });
    } catch (err) {
      console.error('Save position error:', err);
      const errorMsg = err.response?.data?.message || '保存失败';
      showNotification(errorMsg, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (position) => {
    try {
      await apiClient.patch(`/positions/${position._id}/toggle-active`);
      showNotification(position.isActive ? '已禁用' : '已启用', 'success');
      fetchPositions();
    } catch (err) {
      console.error('Toggle active error:', err);
      const errorMsg = err.response?.data?.message || '操作失败';
      showNotification(errorMsg, 'error');
    }
  };

  // 获取所有部门（用于筛选）
  const departments = [...new Set(positions.map(p => p.department).filter(Boolean))];

  const filteredPositions = positions.filter(position => {
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      return (
        position.code?.toLowerCase().includes(search) ||
        position.name?.toLowerCase().includes(search) ||
        position.nameEn?.toLowerCase().includes(search) ||
        position.description?.toLowerCase().includes(search)
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
            <WorkIcon sx={{ fontSize: 32, color: 'primary.main' }} />
            <Typography variant="h4" fontWeight={600}>
              岗位管理
            </Typography>
          </Box>
          {canEdit && (
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={handleAdd}
              sx={{ borderRadius: 2 }}
            >
              新增岗位
            </Button>
          )}
        </Box>

        {/* Filters */}
        <Paper sx={{ p: 2, mb: 3 }}>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                placeholder="搜索岗位代码、名称..."
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
            <Grid item xs={12} md={3}>
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
            <Grid item xs={12} md={2}>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Button
                  variant="outlined"
                  startIcon={<SearchIcon />}
                  onClick={handleSearch}
                  fullWidth
                >
                  搜索
                </Button>
                <Button
                  variant="outlined"
                  startIcon={<RefreshIcon />}
                  onClick={handleReset}
                  fullWidth
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
                <TableCell>岗位代码</TableCell>
                <TableCell>岗位名称</TableCell>
                <TableCell>英文名称</TableCell>
                <TableCell>部门</TableCell>
                <TableCell>职级</TableCell>
                <TableCell>薪资范围</TableCell>
                <TableCell>系统岗位</TableCell>
                <TableCell>状态</TableCell>
                <TableCell>创建时间</TableCell>
                <TableCell align="right">操作</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredPositions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={10} align="center" sx={{ py: 4 }}>
                    {loading ? <CircularProgress /> : '暂无数据'}
                  </TableCell>
                </TableRow>
              ) : (
                filteredPositions.map((position) => (
                  <TableRow key={position._id} hover>
                    <TableCell>
                      <Typography variant="body2" fontWeight={500}>
                        {position.code}
                      </Typography>
                    </TableCell>
                    <TableCell>{position.name}</TableCell>
                    <TableCell>{position.nameEn || '-'}</TableCell>
                    <TableCell>{position.department || '-'}</TableCell>
                    <TableCell>{position.jobLevel || '-'}</TableCell>
                    <TableCell>
                      {position.minSalary || position.maxSalary ? (
                        `${position.minSalary ? `${position.minSalary}` : '?'} - ${position.maxSalary ? `${position.maxSalary}` : '?'}`
                      ) : '-'}
                    </TableCell>
                    <TableCell>
                      {position.isSystem ? (
                        <Chip label="是" color="primary" size="small" />
                      ) : (
                        <Chip label="否" size="small" variant="outlined" />
                      )}
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={position.isActive ? '启用' : '禁用'}
                        color={position.isActive ? 'success' : 'default'}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      {dayjs(position.createdAt).format('YYYY-MM-DD HH:mm')}
                    </TableCell>
                    <TableCell align="right">
                      <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
                        {canEdit && (
                          <>
                            <Tooltip title={position.isActive ? '禁用' : '启用'}>
                              <IconButton
                                size="small"
                                onClick={() => handleToggleActive(position)}
                                disabled={position.isSystem && !position.isActive}
                                color={position.isActive ? 'warning' : 'success'}
                              >
                                {position.isActive ? <BlockIcon /> : <CheckCircleIcon />}
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="编辑">
                              <IconButton
                                size="small"
                                onClick={() => handleEdit(position)}
                                color="primary"
                              >
                                <EditIcon />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="删除">
                              <IconButton
                                size="small"
                                onClick={() => handleDelete(position)}
                                disabled={position.isSystem}
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
        <Dialog open={deleteDialog.open} onClose={() => setDeleteDialog({ open: false, position: null })}>
          <DialogTitle>确认删除</DialogTitle>
          <DialogContent>
            <Typography>
              确定要删除岗位 <strong>{deleteDialog.position?.name}</strong> ({deleteDialog.position?.code}) 吗？
            </Typography>
            {deleteDialog.position?.isSystem && (
              <Alert severity="warning" sx={{ mt: 2 }}>
                系统岗位无法删除
              </Alert>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDeleteDialog({ open: false, position: null })}>取消</Button>
            <Button
              onClick={confirmDelete}
              color="error"
              variant="contained"
              disabled={deleteDialog.position?.isSystem}
            >
              删除
            </Button>
          </DialogActions>
        </Dialog>

        {/* Form Dialog */}
        <Dialog
          open={formDialog.open}
          onClose={() => !saving && setFormDialog({ open: false, position: null, mode: 'create' })}
          maxWidth="md"
          fullWidth
        >
          <DialogTitle>
            {formDialog.mode === 'create' ? '新增岗位' : '编辑岗位'}
          </DialogTitle>
          <DialogContent>
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="岗位代码"
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
                  label="岗位名称"
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
                  label="部门"
                  value={formData.department}
                  onChange={(e) => setFormData({ ...formData, department: e.target.value })}
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
              <Grid item xs={12} md={3}>
                <TextField
                  fullWidth
                  label="最低薪资"
                  type="number"
                  value={formData.minSalary}
                  onChange={(e) => setFormData({ ...formData, minSalary: e.target.value })}
                  inputProps={{ min: 0 }}
                />
              </Grid>
              <Grid item xs={12} md={3}>
                <TextField
                  fullWidth
                  label="最高薪资"
                  type="number"
                  value={formData.maxSalary}
                  onChange={(e) => setFormData({ ...formData, maxSalary: e.target.value })}
                  inputProps={{ min: 0 }}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="描述"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  multiline
                  rows={2}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="学历要求"
                  value={formData.requirements.education}
                  onChange={(e) => setFormData({
                    ...formData,
                    requirements: { ...formData.requirements, education: e.target.value }
                  })}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="工作经验"
                  value={formData.requirements.experience}
                  onChange={(e) => setFormData({
                    ...formData,
                    requirements: { ...formData.requirements, experience: e.target.value }
                  })}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="技能要求（用逗号分隔）"
                  value={typeof formData.requirements.skills === 'string' 
                    ? formData.requirements.skills 
                    : formData.requirements.skills.join(', ')}
                  onChange={(e) => setFormData({
                    ...formData,
                    requirements: { ...formData.requirements, skills: e.target.value }
                  })}
                  helperText="输入技能，多个技能用逗号分隔"
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="岗位职责（每行一条）"
                  value={typeof formData.responsibilities === 'string'
                    ? formData.responsibilities
                    : formData.responsibilities.join('\n')}
                  onChange={(e) => setFormData({ ...formData, responsibilities: e.target.value })}
                  multiline
                  rows={4}
                  helperText="每行输入一条职责"
                />
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions>
            <Button
              onClick={() => setFormDialog({ open: false, position: null, mode: 'create' })}
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

export default PositionManagement;

