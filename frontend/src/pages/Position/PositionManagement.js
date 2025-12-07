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
import { useTranslation } from 'react-i18next';
import dayjs from 'dayjs';
import { PERMISSIONS } from '../../config/permissions';

const PositionManagement = () => {
  const { t, i18n } = useTranslation();
  const { showNotification } = useNotification();
  const { user, hasPermission } = useAuth();
  const canView = hasPermission(PERMISSIONS.POSITION_VIEW);
  const canCreate = hasPermission(PERMISSIONS.POSITION_CREATE);
  const canEdit = hasPermission(PERMISSIONS.POSITION_EDIT);
  const canDelete = hasPermission(PERMISSIONS.POSITION_DELETE);
  const canToggleActive = hasPermission(PERMISSIONS.POSITION_TOGGLE_ACTIVE);

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
        throw new Error(response.data?.message || t('position.management.fetchError'));
      }
    } catch (err) {

      setError(err.response?.data?.message || err.message || t('position.management.fetchError'));
      showNotification(t('position.management.fetchError'), 'error');
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
      showNotification(t('position.management.deleteSuccess'), 'success');
      fetchPositions();
    } catch (err) {

      const errorMsg = err.response?.data?.message || t('position.management.deleteError');
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
        showNotification(t('position.management.createSuccess'), 'success');
      } else {
        await apiClient.put(`/positions/${formDialog.position._id}`, saveData);
        showNotification(t('position.management.updateSuccess'), 'success');
      }
      
      fetchPositions();
      setFormDialog({ open: false, position: null, mode: 'create' });
    } catch (err) {

      const errorMsg = err.response?.data?.message || t('position.management.saveError');
      showNotification(errorMsg, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (position) => {
    try {
      await apiClient.patch(`/positions/${position._id}/toggle-active`);
      showNotification(position.isActive ? t('position.management.toggleDisabledSuccess') : t('position.management.toggleSuccess'), 'success');
      fetchPositions();
    } catch (err) {

      const errorMsg = err.response?.data?.message || t('position.management.toggleError');
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
              {t('position.management.title')}
            </Typography>
          </Box>
          {canCreate && (
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={handleAdd}
              sx={{ borderRadius: 2 }}
            >
              {t('position.management.addPosition')}
            </Button>
          )}
        </Box>

        {/* Filters */}
        <Paper sx={{ p: 2, mb: 3 }}>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                placeholder={t('position.management.searchPlaceholder')}
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
                <InputLabel>{t('position.management.status')}</InputLabel>
                <Select
                  value={statusFilter}
                  label={t('position.management.status')}
                  onChange={(e) => setStatusFilter(e.target.value)}
                >
                  <MenuItem value="all">{t('position.management.all')}</MenuItem>
                  <MenuItem value="active">{t('position.management.active')}</MenuItem>
                  <MenuItem value="inactive">{t('position.management.inactive')}</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={3}>
              <FormControl fullWidth>
                <InputLabel>{t('position.management.department')}</InputLabel>
                <Select
                  value={departmentFilter}
                  label={t('position.management.department')}
                  onChange={(e) => setDepartmentFilter(e.target.value)}
                >
                  <MenuItem value="all">{t('position.management.all')}</MenuItem>
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
                  {t('common.search')}
                </Button>
                <Button
                  variant="outlined"
                  startIcon={<RefreshIcon />}
                  onClick={handleReset}
                  fullWidth
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
                <TableCell>{t('position.management.tableHeaders.code')}</TableCell>
                <TableCell>{t('position.management.tableHeaders.name')}</TableCell>
                <TableCell>{t('position.management.tableHeaders.nameEn')}</TableCell>
                <TableCell>{t('position.management.tableHeaders.department')}</TableCell>
                <TableCell>{t('position.management.tableHeaders.jobLevel')}</TableCell>
                <TableCell>{t('position.management.tableHeaders.salaryRange')}</TableCell>
                <TableCell>{t('position.management.tableHeaders.isSystem')}</TableCell>
                <TableCell>{t('position.management.tableHeaders.status')}</TableCell>
                <TableCell>{t('position.management.tableHeaders.createdAt')}</TableCell>
                <TableCell align="right">{t('position.management.tableHeaders.actions')}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredPositions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={10} align="center" sx={{ py: 4 }}>
                    {loading ? <CircularProgress /> : t('position.management.noData')}
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
                        <Chip label={t('position.management.yes')} color="primary" size="small" />
                      ) : (
                        <Chip label={t('position.management.no')} size="small" variant="outlined" />
                      )}
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={position.isActive ? t('position.management.active') : t('position.management.inactive')}
                        color={position.isActive ? 'success' : 'default'}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      {dayjs(position.createdAt).format('YYYY-MM-DD HH:mm')}
                    </TableCell>
                    <TableCell align="right">
                      <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
                        {canToggleActive && (
                          <Tooltip title={position.isActive ? t('position.management.disable') : t('position.management.enable')}>
                            <IconButton
                              size="small"
                              onClick={() => handleToggleActive(position)}
                              disabled={position.isSystem && !position.isActive}
                              color={position.isActive ? 'warning' : 'success'}
                            >
                              {position.isActive ? <BlockIcon /> : <CheckCircleIcon />}
                            </IconButton>
                          </Tooltip>
                        )}
                        {canEdit && (
                          <Tooltip title={t('common.edit')}>
                            <IconButton
                              size="small"
                              onClick={() => handleEdit(position)}
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
                              onClick={() => handleDelete(position)}
                              disabled={position.isSystem}
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
        <Dialog open={deleteDialog.open} onClose={() => setDeleteDialog({ open: false, position: null })}>
          <DialogTitle>{t('position.management.confirmDelete')}</DialogTitle>
          <DialogContent>
            <Typography>
              {t('position.management.deleteConfirmMessage')} <strong>{deleteDialog.position?.name}</strong> ({deleteDialog.position?.code}){i18n.language === 'zh' ? '吗？' : '?'}
            </Typography>
            {deleteDialog.position?.isSystem && (
              <Alert severity="warning" sx={{ mt: 2 }}>
                {t('position.management.deleteWarning')}
              </Alert>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDeleteDialog({ open: false, position: null })}>{t('common.cancel')}</Button>
            <Button
              onClick={confirmDelete}
              color="error"
              variant="contained"
              disabled={deleteDialog.position?.isSystem}
            >
              {t('common.delete')}
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
            {formDialog.mode === 'create' ? t('position.management.addPosition') : t('position.management.editPosition')}
          </DialogTitle>
          <DialogContent>
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label={t('position.code')}
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                  required
                  disabled={formDialog.mode === 'edit'}
                  helperText={t('position.management.codeHint')}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label={t('position.name')}
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label={t('position.nameEn')}
                  value={formData.nameEn}
                  onChange={(e) => setFormData({ ...formData, nameEn: e.target.value })}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label={t('position.department')}
                  value={formData.department}
                  onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label={t('position.jobLevel')}
                  value={formData.jobLevel}
                  onChange={(e) => setFormData({ ...formData, jobLevel: e.target.value })}
                />
              </Grid>
              <Grid item xs={12} md={3}>
                <TextField
                  fullWidth
                  label={t('position.minSalary')}
                  type="number"
                  value={formData.minSalary}
                  onChange={(e) => setFormData({ ...formData, minSalary: e.target.value })}
                  inputProps={{ min: 0 }}
                />
              </Grid>
              <Grid item xs={12} md={3}>
                <TextField
                  fullWidth
                  label={t('position.maxSalary')}
                  type="number"
                  value={formData.maxSalary}
                  onChange={(e) => setFormData({ ...formData, maxSalary: e.target.value })}
                  inputProps={{ min: 0 }}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label={t('position.description')}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  multiline
                  rows={2}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label={t('position.education')}
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
                  label={t('position.experience')}
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
                  label={t('position.skills')}
                  value={typeof formData.requirements.skills === 'string' 
                    ? formData.requirements.skills 
                    : formData.requirements.skills.join(', ')}
                  onChange={(e) => setFormData({
                    ...formData,
                    requirements: { ...formData.requirements, skills: e.target.value }
                  })}
                  helperText={t('position.skillsHint')}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label={t('position.responsibilities')}
                  value={typeof formData.responsibilities === 'string'
                    ? formData.responsibilities
                    : formData.responsibilities.join('\n')}
                  onChange={(e) => setFormData({ ...formData, responsibilities: e.target.value })}
                  multiline
                  rows={4}
                  helperText={t('position.responsibilitiesHint')}
                />
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions>
            <Button
              onClick={() => setFormDialog({ open: false, position: null, mode: 'create' })}
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

export default PositionManagement;

