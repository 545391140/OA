/**
 * 币种管理页面
 * 提供币种数据的列表展示、搜索、新增、编辑、删除功能
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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  CircularProgress,
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
  Refresh as RefreshIcon,
  AttachMoney as MoneyIcon
} from '@mui/icons-material';
import apiClient from '../../utils/axiosConfig';
import { useNotification } from '../../contexts/NotificationContext';
import { useAuth } from '../../contexts/AuthContext';
import { useTranslation } from 'react-i18next';
import dayjs from 'dayjs';
import { PERMISSIONS } from '../../config/permissions';

const CurrencyManagement = () => {
  const { t } = useTranslation();
  const { showNotification } = useNotification();
  const { user, hasPermission } = useAuth();
  const canView = hasPermission(PERMISSIONS.CURRENCY_VIEW);
  const canCreate = hasPermission(PERMISSIONS.CURRENCY_CREATE);
  const canEdit = hasPermission(PERMISSIONS.CURRENCY_EDIT);
  const canDelete = hasPermission(PERMISSIONS.CURRENCY_DELETE);
  const canToggleActive = hasPermission(PERMISSIONS.CURRENCY_TOGGLE_ACTIVE);

  const [currencies, setCurrencies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  
  // 对话框状态
  const [deleteDialog, setDeleteDialog] = useState({ open: false, currency: null });
  const [formDialog, setFormDialog] = useState({ open: false, currency: null, mode: 'create' });
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    nameEn: '',
    symbol: '',
    exchangeRate: 1.0,
    isActive: true,
    isDefault: false,
    decimalPlaces: 2,
    displayOrder: 0,
    remark: ''
  });
  const [saving, setSaving] = useState(false);
  const [formErrors, setFormErrors] = useState({});

  useEffect(() => {
    fetchCurrencies();
  }, [statusFilter]);

  const fetchCurrencies = async () => {
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

      const response = await apiClient.get('/currencies', { params });
      
      if (response.data && response.data.success) {
        setCurrencies(response.data.data || []);
      } else {
        throw new Error(response.data?.message || t('currency.management.fetchError'));
      }
    } catch (err) {
      // 只在开发环境或非401错误时记录错误
      if (err.response?.status !== 401) {

      }
      const errorMsg = err.response?.data?.message || err.message || t('currency.management.fetchError');
      setError(errorMsg);
      // 401错误（未授权）不显示通知，因为可能是用户未登录
      if (err.response?.status !== 401) {
        showNotification(errorMsg, 'error');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    fetchCurrencies();
  };

  const handleReset = () => {
    setSearchTerm('');
    setStatusFilter('all');
    setTimeout(() => fetchCurrencies(), 100);
  };

  const handleDelete = (currency) => {
    setDeleteDialog({ open: true, currency });
  };

  const confirmDelete = async () => {
    try {
      await apiClient.delete(`/currencies/${deleteDialog.currency._id}`);
      showNotification(t('currency.management.deleteSuccess'), 'success');
      fetchCurrencies();
    } catch (err) {

      const errorMsg = err.response?.data?.message || t('currency.management.deleteError');
      showNotification(errorMsg, 'error');
    } finally {
      setDeleteDialog({ open: false, currency: null });
    }
  };

  const handleEdit = (currency) => {
    setFormData({
      code: currency.code || '',
      name: currency.name || '',
      nameEn: currency.nameEn || '',
      symbol: currency.symbol || '',
      exchangeRate: currency.exchangeRate || 1.0,
      isActive: currency.isActive !== undefined ? currency.isActive : true,
      isDefault: currency.isDefault || false,
      decimalPlaces: currency.decimalPlaces || 2,
      displayOrder: currency.displayOrder || 0,
      remark: currency.remark || ''
    });
    setFormErrors({});
    setFormDialog({ open: true, currency, mode: 'edit' });
  };

  const handleAdd = () => {
    setFormData({
      code: '',
      name: '',
      nameEn: '',
      symbol: '',
      exchangeRate: 1.0,
      isActive: true,
      isDefault: false,
      decimalPlaces: 2,
      displayOrder: 0,
      remark: ''
    });
    setFormErrors({});
    setFormDialog({ open: true, currency: null, mode: 'create' });
  };

  const handleFormChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    // 清除该字段的错误
    if (formErrors[field]) {
      setFormErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const validateForm = () => {
    const errors = {};
    
    if (!formData.code || formData.code.trim() === '') {
      errors.code = t('currency.management.errors.codeRequired');
    } else if (formData.code.length !== 3) {
      errors.code = t('currency.management.errors.codeLength');
    }
    
    if (!formData.name || formData.name.trim() === '') {
      errors.name = t('currency.management.errors.nameRequired');
    }
    
    if (!formData.exchangeRate || formData.exchangeRate <= 0) {
      errors.exchangeRate = t('currency.management.errors.exchangeRateRequired');
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSave = async () => {
    if (!validateForm()) {
      return;
    }

    try {
      setSaving(true);
      
      const data = {
        ...formData,
        code: formData.code.toUpperCase().trim()
      };

      if (formDialog.mode === 'create') {
        await apiClient.post('/currencies', data);
        showNotification(t('currency.management.createSuccess'), 'success');
      } else {
        await apiClient.put(`/currencies/${formDialog.currency._id}`, data);
        showNotification(t('currency.management.updateSuccess'), 'success');
      }
      
      fetchCurrencies();
      setFormDialog({ open: false, currency: null, mode: 'create' });
    } catch (err) {

      const errorMsg = err.response?.data?.message || t('currency.management.saveError');
      showNotification(errorMsg, 'error');
      
      // 显示字段错误
      if (err.response?.data?.errors) {
        const fieldErrors = {};
        err.response.data.errors.forEach(error => {
          if (error.param) {
            fieldErrors[error.param] = error.msg;
          }
        });
        setFormErrors(fieldErrors);
      }
    } finally {
      setSaving(false);
    }
  };

  const filteredCurrencies = currencies.filter(currency => {
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      return (
        currency.code?.toLowerCase().includes(searchLower) ||
        currency.name?.toLowerCase().includes(searchLower) ||
        currency.nameEn?.toLowerCase().includes(searchLower)
      );
    }
    return true;
  });

  return (
    <Container maxWidth="xl">
      <Box sx={{ py: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <MoneyIcon sx={{ fontSize: 32, color: 'primary.main' }} />
            <Typography variant="h4" component="h1">
              {t('currency.management.title')}
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', gap: 2 }}>
            <Button
              variant="outlined"
              startIcon={<RefreshIcon />}
              onClick={fetchCurrencies}
              disabled={loading}
            >
              {t('common.refresh')}
            </Button>
            {canCreate && (
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={handleAdd}
              >
                {t('currency.management.add')}
              </Button>
            )}
          </Box>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        <Paper sx={{ p: 3 }}>
          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                placeholder={t('currency.management.searchPlaceholder')}
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
            <Grid item xs={12} md={3}>
              <TextField
                fullWidth
                select
                label={t('currency.management.statusFilter')}
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                SelectProps={{
                  native: true
                }}
              >
                <option value="all">{t('common.all')}</option>
                <option value="active">{t('common.active')}</option>
                <option value="inactive">{t('common.inactive')}</option>
              </TextField>
            </Grid>
            <Grid item xs={12} md={3}>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Button variant="outlined" onClick={handleSearch} fullWidth>
                  {t('common.search')}
                </Button>
                <Button variant="outlined" onClick={handleReset} fullWidth>
                  {t('common.reset')}
                </Button>
              </Box>
            </Grid>
          </Grid>

          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress />
            </Box>
          ) : (
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>{t('currency.management.code')}</TableCell>
                    <TableCell>{t('currency.management.name')}</TableCell>
                    <TableCell>{t('currency.management.nameEn')}</TableCell>
                    <TableCell>{t('currency.management.symbol')}</TableCell>
                    <TableCell>{t('currency.management.exchangeRate')}</TableCell>
                    <TableCell>{t('currency.management.decimalPlaces')}</TableCell>
                    <TableCell>{t('currency.management.status')}</TableCell>
                    <TableCell>{t('currency.management.isDefault')}</TableCell>
                    <TableCell>{t('currency.management.displayOrder')}</TableCell>
                    <TableCell align="right">{t('common.actions')}</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredCurrencies.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={10} align="center">
                        {t('currency.management.noData')}
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredCurrencies.map((currency) => (
                      <TableRow key={currency._id}>
                        <TableCell>
                          <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                            {currency.code}
                          </Typography>
                        </TableCell>
                        <TableCell>{currency.name}</TableCell>
                        <TableCell>{currency.nameEn || '-'}</TableCell>
                        <TableCell>{currency.symbol || '-'}</TableCell>
                        <TableCell>{currency.exchangeRate?.toFixed(4) || '0.0000'}</TableCell>
                        <TableCell>{currency.decimalPlaces || 2}</TableCell>
                        <TableCell>
                          <Chip
                            label={currency.isActive ? t('common.active') : t('common.inactive')}
                            color={currency.isActive ? 'success' : 'default'}
                            size="small"
                          />
                        </TableCell>
                        <TableCell>
                          {currency.isDefault && (
                            <Chip
                              label={t('common.yes')}
                              color="primary"
                              size="small"
                            />
                          )}
                        </TableCell>
                        <TableCell>{currency.displayOrder || 0}</TableCell>
                        <TableCell align="right">
                          <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
                            {canEdit && (
                              <Tooltip title={t('common.edit')}>
                                <IconButton
                                  size="small"
                                  color="primary"
                                  onClick={() => handleEdit(currency)}
                                >
                                  <EditIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                            )}
                            {canDelete && (
                              <Tooltip title={t('common.delete')}>
                                <IconButton
                                  size="small"
                                  color="error"
                                  onClick={() => handleDelete(currency)}
                                >
                                  <DeleteIcon fontSize="small" />
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
          )}
        </Paper>

        {/* 删除确认对话框 */}
        <Dialog
          open={deleteDialog.open}
          onClose={() => setDeleteDialog({ open: false, currency: null })}
        >
          <DialogTitle>{t('currency.management.deleteConfirm')}</DialogTitle>
          <DialogContent>
            <Typography>
              {t('currency.management.deleteMessage', { code: deleteDialog.currency?.code })}
            </Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDeleteDialog({ open: false, currency: null })}>
              {t('common.cancel')}
            </Button>
            <Button onClick={confirmDelete} color="error" variant="contained">
              {t('common.delete')}
            </Button>
          </DialogActions>
        </Dialog>

        {/* 表单对话框 */}
        <Dialog
          open={formDialog.open}
          onClose={() => setFormDialog({ open: false, currency: null, mode: 'create' })}
          maxWidth="md"
          fullWidth
        >
          <DialogTitle>
            {formDialog.mode === 'create'
              ? t('currency.management.add')
              : t('currency.management.edit')}
          </DialogTitle>
          <DialogContent>
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label={t('currency.management.code')}
                  value={formData.code}
                  onChange={(e) => handleFormChange('code', e.target.value.toUpperCase())}
                  error={!!formErrors.code}
                  helperText={formErrors.code}
                  disabled={formDialog.mode === 'edit'}
                  required
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label={t('currency.management.name')}
                  value={formData.name}
                  onChange={(e) => handleFormChange('name', e.target.value)}
                  error={!!formErrors.name}
                  helperText={formErrors.name}
                  required
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label={t('currency.management.nameEn')}
                  value={formData.nameEn}
                  onChange={(e) => handleFormChange('nameEn', e.target.value)}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label={t('currency.management.symbol')}
                  value={formData.symbol}
                  onChange={(e) => handleFormChange('symbol', e.target.value)}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  type="number"
                  label={t('currency.management.exchangeRate')}
                  value={formData.exchangeRate}
                  onChange={(e) => handleFormChange('exchangeRate', parseFloat(e.target.value) || 0)}
                  error={!!formErrors.exchangeRate}
                  helperText={formErrors.exchangeRate || t('currency.management.exchangeRateHint')}
                  inputProps={{ step: 0.0001, min: 0 }}
                  required
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  type="number"
                  label={t('currency.management.decimalPlaces')}
                  value={formData.decimalPlaces}
                  onChange={(e) => handleFormChange('decimalPlaces', parseInt(e.target.value) || 0)}
                  inputProps={{ min: 0, max: 4 }}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  type="number"
                  label={t('currency.management.displayOrder')}
                  value={formData.displayOrder}
                  onChange={(e) => handleFormChange('displayOrder', parseInt(e.target.value) || 0)}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={formData.isActive}
                      onChange={(e) => handleFormChange('isActive', e.target.checked)}
                    />
                  }
                  label={t('currency.management.isActive')}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={formData.isDefault}
                      onChange={(e) => handleFormChange('isDefault', e.target.checked)}
                    />
                  }
                  label={t('currency.management.isDefault')}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  multiline
                  rows={3}
                  label={t('currency.management.remark')}
                  value={formData.remark}
                  onChange={(e) => handleFormChange('remark', e.target.value)}
                />
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setFormDialog({ open: false, currency: null, mode: 'create' })}>
              {t('common.cancel')}
            </Button>
            <Button
              onClick={handleSave}
              variant="contained"
              disabled={saving}
            >
              {saving ? <CircularProgress size={24} /> : t('common.save')}
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </Container>
  );
};

export default CurrencyManagement;

