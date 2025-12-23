import React, { useState, useEffect } from 'react';
import {
  Container,
  Box,
  Typography,
  Paper,
  Tabs,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Chip,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
  IconButton,
  Grid,
  CircularProgress
} from '@mui/material';
import {
  Refresh as RefreshIcon,
  FilterList as FilterIcon
} from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../contexts/AuthContext';
import { useNotification } from '../../contexts/NotificationContext';
import apiClient from '../../utils/axiosConfig';
import dayjs from 'dayjs';

const Logs = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { showNotification } = useNotification();

  const [tabValue, setTabValue] = useState(0);
  const [loading, setLoading] = useState(false);
  
  // Login logs state
  const [loginLogs, setLoginLogs] = useState([]);
  const [loginLogsPage, setLoginLogsPage] = useState(0);
  const [loginLogsRowsPerPage, setLoginLogsRowsPerPage] = useState(20);
  const [loginLogsTotal, setLoginLogsTotal] = useState(0);
  
  // Operation logs state
  const [operationLogs, setOperationLogs] = useState([]);
  const [operationLogsPage, setOperationLogsPage] = useState(0);
  const [operationLogsRowsPerPage, setOperationLogsRowsPerPage] = useState(20);
  const [operationLogsTotal, setOperationLogsTotal] = useState(0);

  // Filters
  const [loginFilters, setLoginFilters] = useState({
    email: '',
    status: '',
    startDate: '',
    endDate: ''
  });

  const [operationFilters, setOperationFilters] = useState({
    module: '',
    action: '',
    status: '',
    startDate: '',
    endDate: ''
  });

  // Fetch login logs
  const fetchLoginLogs = async () => {
    setLoading(true);
    try {
      const params = {
        page: loginLogsPage + 1, // API uses 1-based pagination
        limit: loginLogsRowsPerPage,
        ...loginFilters
      };
      
      // Remove empty filters
      Object.keys(params).forEach(key => {
        if (params[key] === '' || params[key] === null || params[key] === undefined) {
          delete params[key];
        }
      });

      const response = await apiClient.get('/logs/login', { params });
      if (response.data && response.data.success) {
        setLoginLogs(response.data.data || []);
        setLoginLogsTotal(response.data.pagination?.total || 0);
      }
    } catch (error) {
      console.error('Failed to fetch login logs:', error);
      showNotification(
        error.response?.data?.message || t('logs.error.fetchLoginLogs'),
        'error'
      );
    } finally {
      setLoading(false);
    }
  };

  // Fetch operation logs
  const fetchOperationLogs = async () => {
    setLoading(true);
    try {
      const params = {
        page: operationLogsPage + 1, // API uses 1-based pagination
        limit: operationLogsRowsPerPage,
        ...operationFilters
      };
      
      // Remove empty filters
      Object.keys(params).forEach(key => {
        if (params[key] === '' || params[key] === null || params[key] === undefined) {
          delete params[key];
        }
      });

      const response = await apiClient.get('/logs/operation', { params });
      if (response.data && response.data.success) {
        setOperationLogs(response.data.data || []);
        setOperationLogsTotal(response.data.pagination?.total || 0);
      }
    } catch (error) {
      console.error('Failed to fetch operation logs:', error);
      showNotification(
        error.response?.data?.message || t('logs.error.fetchOperationLogs'),
        'error'
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (tabValue === 0) {
      fetchLoginLogs();
    } else {
      fetchOperationLogs();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tabValue, loginLogsPage, loginLogsRowsPerPage, operationLogsPage, operationLogsRowsPerPage]);

  useEffect(() => {
    if (tabValue === 0) {
      setLoginLogsPage(0);
      fetchLoginLogs();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loginFilters]);

  useEffect(() => {
    if (tabValue === 1) {
      setOperationLogsPage(0);
      fetchOperationLogs();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [operationFilters]);

  const handleLoginLogsPageChange = (event, newPage) => {
    setLoginLogsPage(newPage);
  };

  const handleLoginLogsRowsPerPageChange = (event) => {
    setLoginLogsRowsPerPage(parseInt(event.target.value, 10));
    setLoginLogsPage(0);
  };

  const handleOperationLogsPageChange = (event, newPage) => {
    setOperationLogsPage(newPage);
  };

  const handleOperationLogsRowsPerPageChange = (event) => {
    setOperationLogsRowsPerPage(parseInt(event.target.value, 10));
    setOperationLogsPage(0);
  };

  const handleClearFilters = () => {
    if (tabValue === 0) {
      setLoginFilters({
        email: '',
        status: '',
        startDate: '',
        endDate: ''
      });
      setLoginLogsPage(0);
    } else {
      setOperationFilters({
        module: '',
        action: '',
        status: '',
        startDate: '',
        endDate: ''
      });
      setOperationLogsPage(0);
    }
  };

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  const handleLoginFilterChange = (field, value) => {
    setLoginFilters(prev => ({ ...prev, [field]: value }));
  };

  const handleOperationFilterChange = (field, value) => {
    setOperationFilters(prev => ({ ...prev, [field]: value }));
  };

  const handleRefresh = () => {
    if (tabValue === 0) {
      fetchLoginLogs();
    } else {
      fetchOperationLogs();
    }
  };

  const formatDate = (date) => {
    if (!date) return '-';
    return dayjs(date).format('YYYY-MM-DD HH:mm:ss');
  };

  const getStatusColor = (status) => {
    return status === 'success' ? 'success' : 'error';
  };

  const getActionColor = (action) => {
    const colors = {
      create: 'primary',
      update: 'warning',
      delete: 'error',
      view: 'info',
      approve: 'success',
      reject: 'error'
    };
    return colors[action] || 'default';
  };

  return (
    <Container maxWidth="xl">
      <Box sx={{ py: 3 }}>
        {/* Header */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h4" gutterBottom>
            {t('logs.title')}
          </Typography>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button
              variant="outlined"
              startIcon={<RefreshIcon />}
              onClick={handleRefresh}
              disabled={loading}
            >
              {t('common.refresh')}
            </Button>
          </Box>
        </Box>

        {/* Tabs */}
        <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
          <Tabs value={tabValue} onChange={handleTabChange}>
            <Tab label={t('logs.loginLogs.title')} />
            <Tab label={t('logs.operationLogs.title')} />
          </Tabs>
        </Box>

        {/* Login Logs Tab */}
        {tabValue === 0 && (
          <>
            {/* Filters */}
            <Paper sx={{ p: 2, mb: 3 }}>
              <Grid container spacing={2} alignItems="center">
                <Grid item xs={12} md={3}>
                  <TextField
                    fullWidth
                    placeholder={t('logs.filters.email')}
                    value={loginFilters.email}
                    onChange={(e) => handleLoginFilterChange('email', e.target.value)}
                  />
                </Grid>
                <Grid item xs={12} md={2}>
                  <FormControl fullWidth>
                    <InputLabel>{t('logs.filters.status')}</InputLabel>
                    <Select
                      value={loginFilters.status}
                      onChange={(e) => handleLoginFilterChange('status', e.target.value)}
                      label={t('logs.filters.status')}
                    >
                      <MenuItem value="">{t('logs.filters.all')}</MenuItem>
                      <MenuItem value="success">{t('logs.status.success')}</MenuItem>
                      <MenuItem value="failed">{t('logs.status.failed')}</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} md={2}>
                  <TextField
                    fullWidth
                    label={t('logs.filters.startDate')}
                    type="date"
                    value={loginFilters.startDate}
                    onChange={(e) => handleLoginFilterChange('startDate', e.target.value)}
                    InputLabelProps={{ shrink: true }}
                  />
                </Grid>
                <Grid item xs={12} md={2}>
                  <TextField
                    fullWidth
                    label={t('logs.filters.endDate')}
                    type="date"
                    value={loginFilters.endDate}
                    onChange={(e) => handleLoginFilterChange('endDate', e.target.value)}
                    InputLabelProps={{ shrink: true }}
                  />
                </Grid>
                <Grid item xs={12} md={3}>
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <Button
                      variant="outlined"
                      startIcon={<FilterIcon />}
                      onClick={handleClearFilters}
                    >
                      {t('common.reset')}
                    </Button>
                  </Box>
                </Grid>
              </Grid>
            </Paper>

            {/* Table */}
            {loading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
                <CircularProgress />
              </Box>
            ) : loginLogs.length > 0 ? (
              <TableContainer component={Paper}>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ minWidth: 150 }}>{t('logs.loginLogs.columns.user')}</TableCell>
                      <TableCell sx={{ minWidth: 200 }}>{t('logs.loginLogs.columns.email')}</TableCell>
                      <TableCell sx={{ minWidth: 100 }}>{t('logs.loginLogs.columns.status')}</TableCell>
                      <TableCell sx={{ minWidth: 150 }}>{t('logs.loginLogs.columns.ipAddress')}</TableCell>
                      <TableCell sx={{ minWidth: 180 }}>{t('logs.loginLogs.columns.loginTime')}</TableCell>
                      <TableCell sx={{ minWidth: 150 }}>{t('logs.loginLogs.columns.failureReason')}</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {loginLogs.map((log) => (
                      <TableRow key={log._id} hover>
                        <TableCell>
                          {log.userId
                            ? `${log.userId.firstName || ''} ${log.userId.lastName || ''}`.trim() || log.userId.email
                            : log.email}
                        </TableCell>
                        <TableCell>{log.email}</TableCell>
                        <TableCell>
                          <Chip
                            label={t(`logs.status.${log.status}`)}
                            color={getStatusColor(log.status)}
                            size="small"
                          />
                        </TableCell>
                        <TableCell>{log.ipAddress || '-'}</TableCell>
                        <TableCell>{formatDate(log.loginTime)}</TableCell>
                        <TableCell>{log.failureReason || '-'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                <TablePagination
                  component="div"
                  count={loginLogsTotal}
                  page={loginLogsPage}
                  onPageChange={handleLoginLogsPageChange}
                  rowsPerPage={loginLogsRowsPerPage}
                  onRowsPerPageChange={handleLoginLogsRowsPerPageChange}
                  rowsPerPageOptions={[10, 20, 50, 100]}
                  labelRowsPerPage={t('common.rowsPerPage')}
                  labelDisplayedRows={({ from, to, count }) => 
                    `${from}-${to} ${t('common.of')} ${count !== -1 ? count : `${t('common.moreThan')} ${to}`}`
                  }
                />
              </TableContainer>
            ) : (
              <Paper sx={{ p: 4, textAlign: 'center', mt: 2 }}>
                <Typography variant="h6" color="text.secondary">
                  {t('logs.noData')}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                  {(loginFilters.email || loginFilters.status || loginFilters.startDate || loginFilters.endDate)
                    ? t('travel.list.tryAdjustingSearch')
                    : t('logs.noData')}
                </Typography>
              </Paper>
            )}
          </>
        )}

        {/* Operation Logs Tab */}
        {tabValue === 1 && (
          <>
            {/* Filters */}
            <Paper sx={{ p: 2, mb: 3 }}>
              <Grid container spacing={2} alignItems="center">
                <Grid item xs={12} md={2}>
                  <FormControl fullWidth>
                    <InputLabel>{t('logs.filters.module')}</InputLabel>
                    <Select
                      value={operationFilters.module}
                      onChange={(e) => handleOperationFilterChange('module', e.target.value)}
                      label={t('logs.filters.module')}
                    >
                      <MenuItem value="">{t('logs.filters.all')}</MenuItem>
                      <MenuItem value="user">{t('logs.modules.user')}</MenuItem>
                      <MenuItem value="travel">{t('logs.modules.travel')}</MenuItem>
                      <MenuItem value="expense">{t('logs.modules.expense')}</MenuItem>
                      <MenuItem value="approval">{t('logs.modules.approval')}</MenuItem>
                      <MenuItem value="role">{t('logs.modules.role')}</MenuItem>
                      <MenuItem value="position">{t('logs.modules.position')}</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} md={2}>
                  <FormControl fullWidth>
                    <InputLabel>{t('logs.filters.action')}</InputLabel>
                    <Select
                      value={operationFilters.action}
                      onChange={(e) => handleOperationFilterChange('action', e.target.value)}
                      label={t('logs.filters.action')}
                    >
                      <MenuItem value="">{t('logs.filters.all')}</MenuItem>
                      <MenuItem value="create">{t('logs.actions.create')}</MenuItem>
                      <MenuItem value="update">{t('logs.actions.update')}</MenuItem>
                      <MenuItem value="delete">{t('logs.actions.delete')}</MenuItem>
                      <MenuItem value="view">{t('logs.actions.view')}</MenuItem>
                      <MenuItem value="approve">{t('logs.actions.approve')}</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} md={2}>
                  <FormControl fullWidth>
                    <InputLabel>{t('logs.filters.status')}</InputLabel>
                    <Select
                      value={operationFilters.status}
                      onChange={(e) => handleOperationFilterChange('status', e.target.value)}
                      label={t('logs.filters.status')}
                    >
                      <MenuItem value="">{t('logs.filters.all')}</MenuItem>
                      <MenuItem value="success">{t('logs.status.success')}</MenuItem>
                      <MenuItem value="failed">{t('logs.status.failed')}</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} md={2}>
                  <TextField
                    fullWidth
                    label={t('logs.filters.startDate')}
                    type="date"
                    value={operationFilters.startDate}
                    onChange={(e) => handleOperationFilterChange('startDate', e.target.value)}
                    InputLabelProps={{ shrink: true }}
                  />
                </Grid>
                <Grid item xs={12} md={2}>
                  <TextField
                    fullWidth
                    label={t('logs.filters.endDate')}
                    type="date"
                    value={operationFilters.endDate}
                    onChange={(e) => handleOperationFilterChange('endDate', e.target.value)}
                    InputLabelProps={{ shrink: true }}
                  />
                </Grid>
                <Grid item xs={12} md={2}>
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <Button
                      variant="outlined"
                      startIcon={<FilterIcon />}
                      onClick={handleClearFilters}
                    >
                      {t('common.reset')}
                    </Button>
                  </Box>
                </Grid>
              </Grid>
            </Paper>

            {/* Table */}
            {loading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
                <CircularProgress />
              </Box>
            ) : operationLogs.length > 0 ? (
              <TableContainer component={Paper}>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ minWidth: 150 }}>{t('logs.operationLogs.columns.user')}</TableCell>
                      <TableCell sx={{ minWidth: 120 }}>{t('logs.operationLogs.columns.module')}</TableCell>
                      <TableCell sx={{ minWidth: 100 }}>{t('logs.operationLogs.columns.action')}</TableCell>
                      <TableCell sx={{ minWidth: 120 }}>{t('logs.operationLogs.columns.resourceType')}</TableCell>
                      <TableCell sx={{ minWidth: 200 }}>{t('logs.operationLogs.columns.description')}</TableCell>
                      <TableCell sx={{ minWidth: 100 }}>{t('logs.operationLogs.columns.status')}</TableCell>
                      <TableCell sx={{ minWidth: 180 }}>{t('logs.operationLogs.columns.operationTime')}</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {operationLogs.map((log) => (
                      <TableRow key={log._id} hover>
                        <TableCell>
                          {log.userId
                            ? `${log.userId.firstName || ''} ${log.userId.lastName || ''}`.trim() || log.userId.email
                            : log.email}
                        </TableCell>
                        <TableCell>
                          {log.module ? (t(`logs.modules.${log.module}`) !== `logs.modules.${log.module}` 
                            ? t(`logs.modules.${log.module}`) 
                            : t('logs.modules.unknown')) 
                            : '-'}
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={log.action ? (t(`logs.actions.${log.action}`) !== `logs.actions.${log.action}` 
                              ? t(`logs.actions.${log.action}`) 
                              : log.action) 
                              : '-'}
                            color={getActionColor(log.action)}
                            size="small"
                          />
                        </TableCell>
                        <TableCell>{log.resourceType || '-'}</TableCell>
                        <TableCell>{log.description || '-'}</TableCell>
                        <TableCell>
                          <Chip
                            label={t(`logs.status.${log.status}`)}
                            color={getStatusColor(log.status)}
                            size="small"
                          />
                        </TableCell>
                        <TableCell>{formatDate(log.operationTime)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                <TablePagination
                  component="div"
                  count={operationLogsTotal}
                  page={operationLogsPage}
                  onPageChange={handleOperationLogsPageChange}
                  rowsPerPage={operationLogsRowsPerPage}
                  onRowsPerPageChange={handleOperationLogsRowsPerPageChange}
                  rowsPerPageOptions={[10, 20, 50, 100]}
                  labelRowsPerPage={t('common.rowsPerPage')}
                  labelDisplayedRows={({ from, to, count }) => 
                    `${from}-${to} ${t('common.of')} ${count !== -1 ? count : `${t('common.moreThan')} ${to}`}`
                  }
                />
              </TableContainer>
            ) : (
              <Paper sx={{ p: 4, textAlign: 'center', mt: 2 }}>
                <Typography variant="h6" color="text.secondary">
                  {t('logs.noData')}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                  {(operationFilters.module || operationFilters.action || operationFilters.status || operationFilters.startDate || operationFilters.endDate)
                    ? t('travel.list.tryAdjustingSearch')
                    : t('logs.noData')}
                </Typography>
              </Paper>
            )}
          </>
        )}
      </Box>
    </Container>
  );
};

export default Logs;






