import React, { useState, useEffect } from 'react';
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
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  CheckCircle as ActivateIcon,
  Cancel as DeactivateIcon,
  Visibility as ViewIcon
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useNotification } from '../../contexts/NotificationContext';
import apiClient from '../../utils/axiosConfig';
import { useAuth } from '../../contexts/AuthContext';

const StandardList = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { showNotification } = useNotification();
  const [standards, setStandards] = useState([]);
  const [expenseItemsMap, setExpenseItemsMap] = useState({}); // 费用项ID到名称的映射
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [deleteDialog, setDeleteDialog] = useState({ open: false, id: null });

  useEffect(() => {
    fetchStandards();
    fetchExpenseItems();
  }, []);

  const fetchExpenseItems = async () => {
    try {
      const response = await apiClient.get('/expense-items');
      if (response.data && response.data.success) {
        const items = response.data.data || [];
        // 创建ID到名称的映射
        const map = {};
        items.forEach(item => {
          map[item._id] = item.itemName;
        });
        setExpenseItemsMap(map);
      }
    } catch (err) {
      console.error('Fetch expense items error:', err);
      // 不影响标准列表的显示，只记录错误
    }
  };

  const fetchStandards = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await apiClient.get('/travel-standards');
      // 处理不同的响应格式
      if (response.data) {
        if (response.data.success === true || response.data.success === false) {
          // 标准格式: { success: true/false, data: [...], message: '...' }
          if (response.data.success) {
            setStandards(response.data.data || []);
          } else {
            setError(response.data.message || t('travelStandard.management.fetchError'));
          }
        } else if (response.data.error) {
          // Rate limit 或其他错误格式: { error: '...' }
          setError(response.data.error);
        } else if (Array.isArray(response.data)) {
          // 直接返回数组
          setStandards(response.data);
        } else if (response.data.data) {
          // 有data字段但无success字段
          setStandards(response.data.data || []);
        } else {
          setError(t('travelStandard.management.parseError'));
        }
      } else {
        setError(t('travelStandard.management.emptyResponse'));
      }
    } catch (err) {
      console.error('Fetch standards error:', err);
      let errorMessage = t('travelStandard.management.fetchError');
      
      if (err.response) {
        // 服务器返回了错误响应
        if (err.response.data) {
          if (err.response.data.error) {
            errorMessage = err.response.data.error;
          } else if (err.response.data.message) {
            errorMessage = err.response.data.message;
          } else {
            errorMessage = `${t('travelStandard.management.requestFailed')} (${err.response.status})`;
          }
        } else {
          errorMessage = `${t('travelStandard.management.requestFailed')} (${err.response.status})`;
        }
      } else if (err.message) {
        errorMessage = err.message;
      }
      
      // 特殊处理 rate limit 错误
      if (errorMessage.includes('Too many requests') || errorMessage.includes('rate limit')) {
        errorMessage = t('travelStandard.management.rateLimitError');
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    try {
      await apiClient.delete(`/api/travel-standards/${deleteDialog.id}`);
      setDeleteDialog({ open: false, id: null });
      showNotification(t('travelStandard.management.deleteSuccess'), 'success');
      fetchStandards();
    } catch (err) {
      console.error('Delete standard error:', err);
      showNotification(t('travelStandard.management.deleteFailed') + ': ' + (err.response?.data?.message || t('common.error')), 'error');
    }
  };

  const handleActivate = async (id) => {
    try {
      await apiClient.put(`/api/travel-standards/${id}/activate`);
      showNotification(t('travelStandard.management.activateSuccess'), 'success');
      fetchStandards();
    } catch (err) {
      console.error('Activate standard error:', err);
      showNotification(t('travelStandard.management.activateFailed') + ': ' + (err.response?.data?.message || t('common.error')), 'error');
    }
  };

  const handleDeactivate = async (id) => {
    try {
      await apiClient.put(`/api/travel-standards/${id}/deactivate`);
      showNotification(t('travelStandard.management.deactivateSuccess'), 'success');
      fetchStandards();
    } catch (err) {
      console.error('Deactivate standard error:', err);
      showNotification(t('travelStandard.management.deactivateFailed') + ': ' + (err.response?.data?.message || t('common.error')), 'error');
    }
  };

  const getStatusColor = (status) => {
    const colorMap = {
      draft: 'default',
      active: 'success',
      expired: 'error'
    };
    return colorMap[status] || 'default';
  };

  const getStatusLabel = (status) => {
    return t(`travelStandard.management.statuses.${status}`) || status;
  };
  
  const getPriorityLabel = (priority) => {
    if (priority >= 90) return t('travelStandard.management.priorities.high');
    if (priority >= 60) return t('travelStandard.management.priorities.medium');
    return t('travelStandard.management.priorities.low');
  };

  const canEdit = user?.role === 'admin' || user?.role === 'finance';

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      <Paper elevation={3} sx={{ p: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h4">{t('travelStandard.management.title')}</Typography>
          <Button
            variant="contained"
            color="primary"
            startIcon={<AddIcon />}
            onClick={() => navigate('/travel-standards/new')}
            sx={{ minWidth: 140 }}
          >
            {t('travelStandard.management.newStandard')}
          </Button>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        <TableContainer>
          <Table>
            <TableHead>
                    <TableRow>
                      <TableCell>{t('travelStandard.management.tableHeaders.standardCode')}</TableCell>
                      <TableCell>{t('travelStandard.management.tableHeaders.standardName')}</TableCell>
                      <TableCell>{t('travelStandard.management.tableHeaders.priority')}</TableCell>
                      <TableCell>{t('travelStandard.management.tableHeaders.conditions')}</TableCell>
                      <TableCell>{t('travelStandard.management.tableHeaders.expenseItemCount')}</TableCell>
                      <TableCell>{t('travelStandard.management.tableHeaders.version')}</TableCell>
                      <TableCell>{t('travelStandard.management.tableHeaders.effectiveDate')}</TableCell>
                      <TableCell>{t('travelStandard.management.tableHeaders.expiryDate')}</TableCell>
                      <TableCell>{t('travelStandard.management.tableHeaders.status')}</TableCell>
                      <TableCell align="right">{t('travelStandard.management.tableHeaders.actions')}</TableCell>
                    </TableRow>
            </TableHead>
            <TableBody>
                     {loading ? (
                       <TableRow>
                         <TableCell colSpan={10} align="center">
                           {t('travelStandard.management.loading')}
                         </TableCell>
                       </TableRow>
                     ) : standards.length === 0 ? (
                       <TableRow>
                         <TableCell colSpan={10} align="center">
                           {t('travelStandard.management.noData')}
                         </TableCell>
                       </TableRow>
              ) : (
                       standards.map((standard) => {
                         // 计算条件组数量
                         const conditionCount = standard.conditionGroups?.length || 0;
                         const totalConditionCount = standard.conditionGroups?.reduce((sum, group) => 
                           sum + (group.conditions?.length || 0), 0
                         ) || 0;
                         
                         // 计算费用项数量
                         const expenseItemCount = Object.values(standard.expenseItemsConfigured || {})
                           .filter(configured => configured === true).length;
                         
                         const getPriorityColor = (priority) => {
                           if (priority >= 90) return 'error';
                           if (priority >= 60) return 'warning';
                           return 'info';
                         };
                         
                         return (
                           <TableRow key={standard._id} hover>
                             <TableCell>{standard.standardCode}</TableCell>
                             <TableCell>
                               <Box>
                                 <Typography variant="body2" fontWeight="medium">
                                   {standard.standardName}
                                 </Typography>
                                 {standard.description && (
                                   <Typography variant="caption" color="text.secondary">
                                     {standard.description}
                                   </Typography>
                                 )}
                               </Box>
                             </TableCell>
                             <TableCell>
                               <Chip
                                 label={`${getPriorityLabel(standard.priority || 50)} (${standard.priority || 50})`}
                                 color={getPriorityColor(standard.priority || 50)}
                                 size="small"
                               />
                             </TableCell>
                             <TableCell>
                               {conditionCount > 0 ? (
                                 <Typography variant="body2">
                                   {conditionCount}{t('travelStandard.management.conditions.groups')} ({totalConditionCount}{t('travelStandard.management.conditions.conditions')})
                                 </Typography>
                               ) : (
                                 <Typography variant="body2" color="text.secondary">{t('travelStandard.management.conditions.notConfigured')}</Typography>
                               )}
                             </TableCell>
                             <TableCell>
                               <Typography variant="body2">{expenseItemCount}</Typography>
                             </TableCell>
                             <TableCell>V{standard.version}</TableCell>
                             <TableCell>
                               {new Date(standard.effectiveDate).toLocaleDateString()}
                             </TableCell>
                             <TableCell>
                               {standard.expiryDate ? new Date(standard.expiryDate).toLocaleDateString() : t('travelStandard.management.expiryDate.permanent')}
                             </TableCell>
                             <TableCell>
                               <Chip
                                 label={getStatusLabel(standard.status)}
                                 color={getStatusColor(standard.status)}
                                 size="small"
                               />
                             </TableCell>
                      <TableCell align="right">
                        <IconButton
                          size="small"
                          onClick={() => navigate(`/travel-standards/${standard._id}`)}
                          title={t('travelStandard.management.actions.view')}
                        >
                          <ViewIcon />
                        </IconButton>
                      {canEdit && (
                        <>
                          <IconButton
                            size="small"
                            onClick={() => navigate(`/travel-standards/${standard._id}/edit`)}
                            title={t('travelStandard.management.actions.edit')}
                          >
                            <EditIcon />
                          </IconButton>
                          {standard.status === 'active' ? (
                            <IconButton
                              size="small"
                              color="error"
                              onClick={() => handleDeactivate(standard._id)}
                            >
                              <DeactivateIcon />
                            </IconButton>
                          ) : (
                            <IconButton
                              size="small"
                              color="success"
                              onClick={() => handleActivate(standard._id)}
                            >
                              <ActivateIcon />
                            </IconButton>
                          )}
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => setDeleteDialog({ open: true, id: standard._id })}
                            disabled={standard.status === 'active'}
                          >
                            <DeleteIcon />
                          </IconButton>
                        </>
                      )}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {/* 删除确认对话框 */}
      <Dialog open={deleteDialog.open} onClose={() => setDeleteDialog({ open: false, id: null })}>
        <DialogTitle>{t('travelStandard.management.confirmDelete')}</DialogTitle>
        <DialogContent>
          <Typography>{t('travelStandard.management.deleteConfirmMessage')}</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialog({ open: false, id: null })}>{t('common.cancel')}</Button>
          <Button onClick={handleDelete} color="error" variant="contained">
            {t('common.delete')}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default StandardList;

