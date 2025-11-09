import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container,
  Paper,
  Box,
  Typography,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  CircularProgress,
  LinearProgress,
  Divider,
  Grid,
  Chip,
  InputAdornment
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
  Search as SearchIcon,
  Refresh as RefreshIcon
} from '@mui/icons-material';
import apiClient from '../../utils/axiosConfig';
import { useNotification } from '../../contexts/NotificationContext';
import { useAuth } from '../../contexts/AuthContext';
import { useTranslation } from 'react-i18next';

const ExpenseItemsMaintenance = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { showNotification } = useNotification();
  const { user } = useAuth();
  const canEdit = user?.role === 'admin' || user?.role === 'finance';

  // 数据状态
  const [expenseItems, setExpenseItems] = useState([]);
  const [standards, setStandards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deleteDialog, setDeleteDialog] = useState({ open: false, item: null });
  
  // 搜索和过滤状态
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [standardFilter, setStandardFilter] = useState('all');

  // 新增/编辑对话框状态
  const [formDialog, setFormDialog] = useState({ open: false, item: null, mode: 'create' });
  const [formData, setFormData] = useState({
    standardId: '',
    itemName: '',
    amount: '',
    description: '',
    status: 'enabled',
    parentItemId: ''
  });
  const [parentItemId, setParentItemId] = useState(null); // 当前选择的父费用项ID（用于添加子项）

  useEffect(() => {
    fetchAllData();
  }, []);

  const fetchAllData = async () => {
    try {
      setLoading(true);
      const [standardsRes, expenseItemsRes] = await Promise.all([
        apiClient.get('/travel-standards'),
        apiClient.get('/expense-items') // 获取所有费用项
      ]);

      if (standardsRes.data && standardsRes.data.success) {
        setStandards(standardsRes.data.data || []);
      }

      // 检查费用项响应
      if (!expenseItemsRes.data) {
        console.error('费用项响应为空:', expenseItemsRes);
        showNotification(t('expenseItem.maintenance.responseEmpty'), 'error');
        return;
      }

      if (expenseItemsRes.data.success === false) {
        console.error('费用项加载失败:', expenseItemsRes.data.message || expenseItemsRes.data.error);
        showNotification(expenseItemsRes.data.message || t('expenseItem.maintenance.loadError'), 'error');
        return;
      }

      if (expenseItemsRes.data && expenseItemsRes.data.success) {
        const items = expenseItemsRes.data.data || [];
        
        // 创建标准映射以便显示标准信息
        const standardMap = {};
        if (standardsRes.data && standardsRes.data.success) {
          standardsRes.data.data.forEach(standard => {
            standardMap[standard._id] = {
              code: standard.standardCode,
              name: standard.standardName
            };
          });
        }

        // 为每个费用项添加标准信息和父项信息
        const enrichedItems = items.map(item => {
          const standardInfo = item.standard && typeof item.standard === 'object' 
            ? { code: item.standard.standardCode, name: item.standard.standardName }
            : (item.standard ? standardMap[item.standard] : null);

          // 处理父项信息：可能是populated对象、ID字符串或null
          let parentInfo = null;
          if (item.parentItem) {
            if (typeof item.parentItem === 'object' && item.parentItem._id) {
              // populated对象
              parentInfo = { 
                id: item.parentItem._id.toString(), 
                name: item.parentItem.itemName 
              };
            } else if (typeof item.parentItem === 'string') {
              // 只是ID字符串，需要查找对应的费用项名称
              const parentItemObj = items.find(p => p._id === item.parentItem || p._id?.toString() === item.parentItem);
              if (parentItemObj) {
                parentInfo = {
                  id: parentItemObj._id.toString(),
                  name: parentItemObj.itemName
                };
              } else {
                parentInfo = { id: item.parentItem, name: t('expenseItem.maintenance.otherExpense') };
              }
            }
          }

          return {
            ...item,
            standardCode: standardInfo?.code || '-',
            standardName: standardInfo?.name || '-',
            standard: item.standard?._id || item.standard || null,
            parentItem: parentInfo,
            _idStr: item._id?.toString() || item._id // 用于匹配的字符串ID
          };
        });

        // 按层级关系组织费用项：父项在前，子项紧随其后
        const organizedItems = [];
        const processedIds = new Set();
        
        // 先添加所有父项（没有parentItem的项）
        enrichedItems.forEach(item => {
          if (!item.parentItem && !processedIds.has(item._idStr)) {
            organizedItems.push(item);
            processedIds.add(item._idStr);
            
            // 然后添加该父项的所有子项
            const children = enrichedItems.filter(child => {
              if (!child.parentItem || processedIds.has(child._idStr)) {
                return false;
              }
              // 匹配父项ID：支持多种格式
              const parentId = child.parentItem.id || child.parentItem;
              const itemId = item._idStr || item._id?.toString();
              return parentId === itemId || parentId === item._id || parentId?.toString() === itemId;
            });
            
            children.forEach(child => {
              organizedItems.push(child);
              processedIds.add(child._idStr);
            });
          }
        });
        
        // 添加剩余的项（可能是数据不一致的情况）
        enrichedItems.forEach(item => {
          if (!processedIds.has(item._idStr)) {
            organizedItems.push(item);
          }
        });

        setExpenseItems(organizedItems);
      }
    } catch (err) {
      console.error('Fetch data error:', err);
      const errorMessage = err.response?.data?.message 
        || err.message 
        || t('expenseItem.maintenance.fetchError');
      showNotification(`${t('expenseItem.maintenance.fetchError')}: ${errorMessage}`, 'error');
      console.error('错误详情:', {
        message: err.message,
        response: err.response?.data,
        status: err.response?.status,
        url: err.config?.url
      });
    } finally {
      setLoading(false);
    }
  };

  const handleOpenAddDialog = (parentItem = null) => {
    setFormData({
      standardId: '',
      itemName: '',
      amount: '',
      description: '',
      status: 'enabled',
      parentItemId: parentItem ? parentItem._id : ''
    });
    setParentItemId(parentItem ? parentItem._id : null);
    setFormDialog({ open: true, item: null, mode: 'create' });
  };

  const handleOpenEditDialog = (item) => {
    // 处理parentItem：可能是对象（包含id和name）或字符串ID或null
    let parentItemIdValue = '';
    if (item.parentItem) {
      if (typeof item.parentItem === 'object' && item.parentItem.id) {
        // 如果是对象，提取id
        parentItemIdValue = item.parentItem.id;
      } else if (typeof item.parentItem === 'string') {
        // 如果是字符串，直接使用
        parentItemIdValue = item.parentItem;
      } else if (item.parentItem._id) {
        // 如果是populated对象，使用_id
        parentItemIdValue = item.parentItem._id;
      }
    }
    
    // 处理standard：可能是对象或字符串ID或null
    let standardIdValue = '';
    if (item.standard) {
      if (typeof item.standard === 'object' && item.standard._id) {
        standardIdValue = item.standard._id;
      } else if (typeof item.standard === 'string') {
        standardIdValue = item.standard;
      }
    }
    
    setFormData({
      standardId: standardIdValue,
      itemName: item.itemName || '',
      amount: item.amount || '',
      description: item.description || '',
      status: item.status || 'enabled',
      parentItemId: parentItemIdValue
    });
    setParentItemId(parentItemIdValue || null);
    setFormDialog({ open: true, item, mode: 'edit' });
  };

  const handleSave = async () => {
    try {
      if (!formData.itemName || !formData.itemName.trim()) {
        showNotification(t('expenseItem.maintenance.nameRequired'), 'warning');
        return;
      }

      const payload = {
        itemName: formData.itemName.trim(),
        description: formData.description.trim() || undefined,
        status: formData.status || 'enabled'
      };

      // 如果选择了父费用项，则添加到payload中
      if (formData.parentItemId || parentItemId) {
        payload.parentItem = formData.parentItemId || parentItemId;
      }

      // 如果填写了金额，则添加到payload中
      if (formData.amount && formData.amount.trim()) {
        const amountValue = parseFloat(formData.amount);
        if (amountValue >= 0) {
          payload.amount = amountValue;
        } else {
          showNotification(t('expenseItem.maintenance.amountInvalid'), 'warning');
          return;
        }
      }

      // 如果选择了标准，则添加到payload中
      if (formData.standardId) {
        payload.standardId = formData.standardId;
      }

      if (formDialog.mode === 'create') {
        await apiClient.post('/expense-items', payload);
        showNotification(t('expenseItem.maintenance.createSuccess'), 'success');
      } else {
        // 编辑时也包含standardId（如果修改了标准）
        if (formData.standardId !== undefined && formData.standardId !== null && formData.standardId !== '') {
          payload.standardId = formData.standardId;
        } else if (formData.standardId === '' || formData.standardId === null) {
          payload.standardId = null; // 空字符串或null表示解除关联
        }
        // 编辑时也包含parentItem（确保是字符串ID，不是对象）
        const parentItemIdToSend = formData.parentItemId || parentItemId;
        if (parentItemIdToSend !== undefined && parentItemIdToSend !== null && parentItemIdToSend !== '') {
          // 如果是对象，提取id；如果是字符串，直接使用
          payload.parentItem = typeof parentItemIdToSend === 'object' && parentItemIdToSend.id 
            ? parentItemIdToSend.id 
            : parentItemIdToSend;
        } else if (parentItemIdToSend === '' || parentItemIdToSend === null) {
          payload.parentItem = null; // 空字符串或null表示解除关联
        }
        await apiClient.put(`/expense-items/item/${formDialog.item._id}`, payload);
        showNotification(t('expenseItem.maintenance.updateSuccess'), 'success');
      }

      setFormDialog({ open: false, item: null, mode: 'create' });
      fetchAllData();
    } catch (err) {
      console.error('Save expense item error:', err);
      showNotification(t('expenseItem.maintenance.saveError') + ': ' + (err.response?.data?.message || t('common.error')), 'error');
    }
  };

  const handleDelete = async () => {
    try {
      const { item } = deleteDialog;
      await apiClient.delete(`/expense-items/item/${item._id}`);
      showNotification(t('expenseItem.maintenance.deleteSuccess'), 'success');
      setDeleteDialog({ open: false, item: null });
      fetchAllData();
    } catch (err) {
      console.error('Delete error:', err);
      showNotification(t('expenseItem.maintenance.deleteError') + ': ' + (err.response?.data?.message || t('common.error')), 'error');
    }
  };

  // 搜索和过滤逻辑
  const filteredExpenseItems = expenseItems.filter(item => {
    // 搜索过滤
    if (searchTerm.trim()) {
      const search = searchTerm.toLowerCase();
      const matchSearch = 
        item.itemName?.toLowerCase().includes(search) ||
        item.standardCode?.toLowerCase().includes(search) ||
        item.standardName?.toLowerCase().includes(search) ||
        item.description?.toLowerCase().includes(search) ||
        item.parentItem?.name?.toLowerCase().includes(search);
      
      if (!matchSearch) return false;
    }
    
    // 状态过滤
    if (statusFilter !== 'all' && item.status !== statusFilter) {
      return false;
    }
    
    // 标准过滤
    if (standardFilter !== 'all') {
      const itemStandardId = item.standard?._id || item.standard;
      if (itemStandardId !== standardFilter) {
        return false;
      }
    }
    
    return true;
  });

  // 搜索处理（虽然实时搜索，但保留按钮以保持一致性）
  const handleSearch = () => {
    // 实时搜索已经在 filteredExpenseItems 中处理
    // 此函数保留以保持与其他页面的一致性
  };

  // 刷新/重置过滤器
  const handleReset = () => {
    setSearchTerm('');
    setStatusFilter('all');
    setStandardFilter('all');
    fetchAllData(); // 重新加载数据
  };

  if (loading) {
    return (
      <Container maxWidth="xl" sx={{ py: 4 }}>
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      <Paper elevation={3} sx={{ p: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h4">{t('expenseItem.maintenance.title')}</Typography>
          {canEdit && (
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={handleOpenAddDialog}
            >
              {t('expenseItem.maintenance.addExpenseItem')}
            </Button>
          )}
        </Box>

        <Divider sx={{ mb: 3 }} />

        {/* 搜索框 */}
        <Box sx={{ mb: 2 }}>
          <TextField
            fullWidth
            placeholder={t('expenseItem.maintenance.searchPlaceholder')}
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
        </Box>

        {/* 过滤器区域 */}
        <Paper sx={{ p: 2, mb: 3 }}>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={3}>
              <FormControl fullWidth>
                <InputLabel>{t('expenseItem.maintenance.filters.status')}</InputLabel>
                <Select
                  value={statusFilter}
                  label={t('expenseItem.maintenance.filters.status')}
                  onChange={(e) => setStatusFilter(e.target.value)}
                >
                  <MenuItem value="all">{t('expenseItem.maintenance.filters.allStatus')}</MenuItem>
                  <MenuItem value="enabled">{t('expenseItem.maintenance.form.enabled')}</MenuItem>
                  <MenuItem value="disabled">{t('expenseItem.maintenance.form.disabled')}</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={3}>
              <FormControl fullWidth>
                <InputLabel>{t('expenseItem.maintenance.filters.standard')}</InputLabel>
                <Select
                  value={standardFilter}
                  label={t('expenseItem.maintenance.filters.standard')}
                  onChange={(e) => setStandardFilter(e.target.value)}
                >
                  <MenuItem value="all">{t('expenseItem.maintenance.filters.allStandards')}</MenuItem>
                  {standards.map((standard) => (
                    <MenuItem key={standard._id} value={standard._id}>
                      {standard.standardCode} - {standard.standardName}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={6}>
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

        {/* Table */}
        <TableContainer component={Paper}>
          {loading && <LinearProgress />}
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>{t('expenseItem.maintenance.tableHeaders.standardCode')}</TableCell>
                <TableCell>{t('expenseItem.maintenance.tableHeaders.standardName')}</TableCell>
                <TableCell>{t('expenseItem.maintenance.tableHeaders.itemName')}</TableCell>
                <TableCell>{t('expenseItem.maintenance.tableHeaders.amount')}</TableCell>
                <TableCell>{t('expenseItem.maintenance.tableHeaders.description')}</TableCell>
                <TableCell>{t('expenseItem.maintenance.tableHeaders.status')}</TableCell>
                <TableCell align="right">{t('expenseItem.maintenance.tableHeaders.actions')}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredExpenseItems.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} align="center">
                    {(searchTerm || statusFilter !== 'all' || standardFilter !== 'all') ? (
                      <Box sx={{ py: 4 }}>
                        <Typography variant="body2" color="text.secondary" gutterBottom>
                          {t('expenseItem.maintenance.noSearchResults')}
                        </Typography>
                        <Button
                          variant="outlined"
                          startIcon={<RefreshIcon />}
                          onClick={handleReset}
                          sx={{ mt: 2 }}
                        >
                          {t('common.refresh')}
                        </Button>
                      </Box>
                    ) : canEdit ? (
                      <Box sx={{ py: 4 }}>
                        <Typography variant="body2" color="text.secondary" gutterBottom>
                          {t('expenseItem.maintenance.noItems')}
                        </Typography>
                        <Button
                          variant="outlined"
                          startIcon={<AddIcon />}
                          onClick={handleOpenAddDialog}
                          sx={{ mt: 2 }}
                        >
                          {t('expenseItem.maintenance.createFirstItem')}
                        </Button>
                      </Box>
                    ) : (
                      <Typography variant="body2" color="text.secondary">
                        {t('expenseItem.maintenance.noData')}
                      </Typography>
                    )}
                  </TableCell>
                </TableRow>
              ) : (
                filteredExpenseItems.map((item) => (
                  <TableRow 
                    key={item._id} 
                    hover
                    sx={{
                      backgroundColor: item.parentItem ? 'action.hover' : 'transparent',
                      '&:hover': {
                        backgroundColor: item.parentItem ? 'action.selected' : 'action.hover'
                      }
                    }}
                  >
                    <TableCell>{item.standardCode}</TableCell>
                    <TableCell>{item.standardName}</TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                        {item.parentItem && (
                          <Box sx={{ 
                            display: 'inline-flex', 
                            alignItems: 'center',
                            ml: 3,
                            pl: 2,
                            borderLeft: '2px solid',
                            borderColor: 'primary.light',
                            position: 'relative',
                            '&::before': {
                              content: '""',
                              position: 'absolute',
                              left: '-2px',
                              top: '-8px',
                              width: '2px',
                              height: '8px',
                              backgroundColor: 'primary.light'
                            }
                          }}>
                            <Typography variant="body2" color="primary.main" sx={{ mr: 1, fontWeight: 'medium' }}>
                              └─
                            </Typography>
                            <Chip 
                              label={item.parentItem?.name || t('expenseItem.maintenance.otherExpense')}
                              size="small" 
                              color="primary" 
                              variant="outlined"
                              sx={{ height: '20px', fontSize: '0.7rem' }}
                            />
                            <Typography variant="body2" color="text.secondary" sx={{ mx: 0.5 }}>
                              ›
                            </Typography>
                          </Box>
                        )}
                        <Typography 
                          variant={item.parentItem ? 'body2' : 'body1'}
                          sx={{ 
                            fontWeight: item.parentItem ? 'normal' : 'medium',
                            color: item.parentItem ? 'text.secondary' : 'text.primary'
                          }}
                        >
                          {item.itemName}
                        </Typography>
                        {item.isSystemDefault && (
                          <Chip label={t('expenseItem.maintenance.systemDefault')} size="small" color="info" variant="outlined" sx={{ ml: 1 }} />
                        )}
                      </Box>
                    </TableCell>
                    <TableCell>
                      {item.amount !== undefined && item.amount !== null 
                        ? `¥${item.amount.toLocaleString()}` 
                        : '-'}
                    </TableCell>
                    <TableCell>{item.description || '-'}</TableCell>
                    <TableCell>
                      <Chip
                        label={item.status === 'enabled' ? t('expenseItem.maintenance.form.enabled') : t('expenseItem.maintenance.form.disabled')}
                        color={item.status === 'enabled' ? 'success' : 'default'}
                        size="small"
                      />
                    </TableCell>
                    <TableCell align="right">
                      {canEdit && (
                        <>
                          {item.status === 'enabled' ? (
                            <IconButton
                              size="small"
                              color="error"
                              onClick={async () => {
                                try {
                                  await apiClient.put(`/expense-items/item/${item._id}/disable`);
                                  showNotification(t('expenseItem.maintenance.disableSuccess'), 'success');
                                  fetchAllData();
                                } catch (err) {
                                  showNotification(t('expenseItem.maintenance.operationError') + ': ' + (err.response?.data?.message || t('common.error')), 'error');
                                }
                              }}
                              title={t('expenseItem.maintenance.actions.disable')}
                            >
                              <CancelIcon />
                            </IconButton>
                          ) : (
                            <IconButton
                              size="small"
                              color="success"
                              onClick={async () => {
                                try {
                                  await apiClient.put(`/expense-items/item/${item._id}/enable`);
                                  showNotification(t('expenseItem.maintenance.enableSuccess'), 'success');
                                  fetchAllData();
                                } catch (err) {
                                  showNotification(t('expenseItem.maintenance.operationError') + ': ' + (err.response?.data?.message || t('common.error')), 'error');
                                }
                              }}
                              title={t('expenseItem.maintenance.actions.enable')}
                            >
                              <CheckCircleIcon />
                            </IconButton>
                          )}
                          <IconButton
                            size="small"
                            onClick={() => handleOpenEditDialog(item)}
                            title={t('expenseItem.maintenance.actions.edit')}
                          >
                            <EditIcon />
                          </IconButton>
                          {!item.isSystemDefault && (
                            <IconButton
                              size="small"
                              color="error"
                              onClick={() => setDeleteDialog({ open: true, item })}
                              title={t('expenseItem.maintenance.actions.delete')}
                            >
                              <DeleteIcon />
                            </IconButton>
                          )}
                          {/* 检查是否为"其他费用"（数据库中存储的是中文值）或是否有子项功能 */}
                          {(item.itemName === '其他费用' || item.itemName === t('expenseItem.maintenance.otherExpense')) && (
                            <IconButton
                              size="small"
                              color="primary"
                              onClick={() => handleOpenAddDialog(item)}
                              title={t('expenseItem.maintenance.addSubItem')}
                            >
                              <AddIcon />
                            </IconButton>
                          )}
                        </>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>

        {/* 新增/编辑费用项对话框 */}
        <Dialog 
          open={formDialog.open} 
          onClose={() => setFormDialog({ open: false, item: null, mode: 'create' })} 
          maxWidth="md" 
          fullWidth
        >
          <DialogTitle>
            {formDialog.mode === 'create' ? t('expenseItem.maintenance.addExpenseItem') : t('expenseItem.maintenance.editExpenseItem')}
          </DialogTitle>
          <DialogContent>
            <Grid container spacing={2} sx={{ mt: 1 }}>
              {parentItemId && (
                <Grid item xs={12}>
                  <Alert severity="info">
                    {t('expenseItem.maintenance.addingSubItem')}
                  </Alert>
                </Grid>
              )}
              <Grid item xs={12}>
                <FormControl fullWidth>
                  <InputLabel>{t('expenseItem.maintenance.form.travelStandard')}</InputLabel>
                  <Select
                    value={formData.standardId || ''} // 确保null转换为空字符串
                    onChange={(e) => setFormData({ ...formData, standardId: e.target.value || '' })}
                    label={t('expenseItem.maintenance.form.travelStandard')}
                    disabled={formDialog.mode === 'edit' || !!parentItemId} // 编辑模式下或添加子项时不允许修改标准
                  >
                    <MenuItem value="">
                      <em>{t('expenseItem.maintenance.form.noStandard')}</em>
                    </MenuItem>
                    {standards.map((standard) => (
                      <MenuItem key={standard._id} value={standard._id}>
                        {standard.standardCode} - {standard.standardName}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              {parentItemId && (
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label={t('expenseItem.maintenance.form.parentItem')}
                    value={t('expenseItem.maintenance.otherExpense')}
                    disabled
                    helperText={t('expenseItem.maintenance.form.parentItemHint')}
                  />
                </Grid>
              )}
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label={t('expenseItem.maintenance.form.itemName')}
                  value={formData.itemName}
                  onChange={(e) => setFormData({ ...formData, itemName: e.target.value })}
                  required
                  placeholder={t('expenseItem.maintenance.form.itemNamePlaceholder')}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  type="number"
                  label={t('expenseItem.maintenance.form.amount')}
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  inputProps={{ min: 0, step: 0.01 }}
                  InputProps={{ startAdornment: '¥' }}
                  placeholder={t('expenseItem.maintenance.form.amountPlaceholder')}
                  helperText={t('expenseItem.maintenance.form.amountHint')}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  multiline
                  rows={4}
                  label={t('expenseItem.maintenance.form.description')}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder={t('expenseItem.maintenance.form.descriptionPlaceholder')}
                />
              </Grid>
              <Grid item xs={12}>
                <FormControl fullWidth>
                  <InputLabel>{t('expenseItem.maintenance.form.status')}</InputLabel>
                  <Select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    label={t('expenseItem.maintenance.form.status')}
                  >
                    <MenuItem value="enabled">{t('expenseItem.maintenance.form.enabled')}</MenuItem>
                    <MenuItem value="disabled">{t('expenseItem.maintenance.form.disabled')}</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setFormDialog({ open: false, item: null, mode: 'create' })}>
              {t('common.cancel')}
            </Button>
            <Button onClick={handleSave} variant="contained">
              {t('common.save')}
            </Button>
          </DialogActions>
        </Dialog>

        {/* 删除确认对话框 */}
        <Dialog open={deleteDialog.open} onClose={() => setDeleteDialog({ open: false, item: null })}>
          <DialogTitle>{t('expenseItem.maintenance.confirmDelete')}</DialogTitle>
          <DialogContent>
            <Typography>{t('expenseItem.maintenance.deleteConfirmMessage')} "{deleteDialog.item?.itemName}"? {t('expenseItem.maintenance.deleteWarning')}</Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDeleteDialog({ open: false, item: null })}>{t('common.cancel')}</Button>
            <Button onClick={handleDelete} color="error" variant="contained">
              {t('common.delete')}
            </Button>
          </DialogActions>
        </Dialog>
      </Paper>
    </Container>
  );
};

export default ExpenseItemsMaintenance;
