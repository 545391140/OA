import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Container,
  Box,
  Typography,
  Paper,
  Grid,
  Card,
  CardContent,
  Chip,
  Button,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Avatar,
  LinearProgress,
  Stepper,
  Step,
  StepLabel,
  StepContent,
  Alert,
  IconButton,
  Badge
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Receipt as ReceiptIcon,
  AttachMoney as MoneyIcon,
  Business as BusinessIcon,
  CalendarToday as CalendarIcon,
  Person as PersonIcon,
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
  Schedule as ScheduleIcon,
  Download as DownloadIcon,
  Visibility as ViewIcon
} from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../contexts/AuthContext';
import { useNotification } from '../../contexts/NotificationContext';
import apiClient from '../../utils/axiosConfig';
import dayjs from 'dayjs';

const ExpenseDetail = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { showNotification } = useNotification();
  const { id } = useParams();
  const navigate = useNavigate();

  const [expense, setExpense] = useState(null);
  const [loading, setLoading] = useState(true);

  const getStatusColor = (status) => {
    const colors = {
      draft: 'default',
      submitted: 'warning',
      approved: 'success',
      rejected: 'error',
      paid: 'info',
      cancelled: 'error'
    };
    return colors[status] || 'default';
  };

  const getCategoryIcon = (category) => {
    const icons = {
      transportation: '🚗',
      accommodation: '🏨',
      meals: '🍽️',
      entertainment: '🎭',
      communication: '📞',
      office_supplies: '📋',
      training: '🎓',
      other: '📄'
    };
    return icons[category] || '📄';
  };

  const getApprovalIcon = (status) => {
    switch (status) {
      case 'approved':
        return <CheckCircleIcon color="success" />;
      case 'rejected':
        return <CancelIcon color="error" />;
      case 'pending':
        return <ScheduleIcon color="warning" />;
      default:
        return <ScheduleIcon color="disabled" />;
    }
  };

  useEffect(() => {
    fetchExpenseDetail();
  }, [id]);

  const fetchExpenseDetail = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get(`/expenses/${id}`);
      
      if (response.data && response.data.success) {
        setExpense(response.data.data);
      } else {
        throw new Error('Failed to load expense details');
      }
    } catch (error) {
      console.error('Failed to load expense details:', error);
      console.error('Error details:', {
        message: error.message,
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        expenseId: id
      });
      
      let errorMessage = t('expense.detail.loadError') || '加载费用详情失败';
      
      if (error.response?.status === 404) {
        errorMessage = '费用申请不存在';
      } else if (error.response?.status === 403) {
        errorMessage = '无权访问此费用申请';
      } else if (error.response?.status === 500) {
        errorMessage = '服务器错误，请稍后重试';
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      }
      
      showNotification(errorMessage, 'error');
      setExpense(null);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = () => {
    navigate(`/expenses/${id}/edit`);
  };

  const handleDelete = async () => {
    if (!window.confirm(t('expense.detail.confirmDelete') || `确定要删除费用申请 "${expense?.title || expense?.expenseItem?.itemName}" 吗？此操作无法撤销。`)) {
      return;
    }

    try {
      await apiClient.delete(`/expenses/${id}`);
      showNotification(
        t('expense.deleteSuccess') || '费用申请删除成功',
        'success'
      );
      navigate('/expenses');
    } catch (error) {
      console.error('Failed to delete expense:', error);
      showNotification(
        error.response?.data?.message || t('expense.deleteError') || '删除费用申请失败',
        'error'
      );
    }
  };

  const handleDownloadReceipt = (receipt) => {
    // Implement download functionality
    showNotification(`Downloading ${receipt.originalName}`, 'info');
  };

  if (loading) {
    return (
      <Container maxWidth="xl">
        <Box sx={{ width: '100%', mt: 2 }}>
          <LinearProgress />
        </Box>
      </Container>
    );
  }

  if (!expense) {
    return (
      <Container maxWidth="xl">
        <Box sx={{ py: 3 }}>
          <Alert severity="error">
            Expense not found
          </Alert>
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="xl">
      <Box sx={{ py: 3 }}>
        {/* Header */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
          <IconButton onClick={() => navigate('/expenses')}>
            <ArrowBackIcon />
          </IconButton>
          <Box sx={{ flexGrow: 1 }}>
            <Typography variant="h4" gutterBottom>
              {expense.title || expense.expenseItem?.itemName || t('expense.untitled')}
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Chip
                label={t(`expense.statuses.${expense.status}`) || expense.status}
                color={getStatusColor(expense.status)}
                size="small"
              />
              <Typography variant="body2" color="text.secondary">
                {t('expense.detail.createdOn') || 'Created on'} {dayjs(expense.createdAt).format('MMM DD, YYYY')}
              </Typography>
              {expense.isBillable && (
                <Chip label={t('expense.billable')} color="success" size="small" />
              )}
              {expense.autoMatched && (
                <Chip 
                  label={t('travel.detail.expenses.autoMatched') || 'Auto Matched'} 
                  color="info" 
                  size="small" 
                />
              )}
            </Box>
          </Box>
          <Box sx={{ display: 'flex', gap: 1 }}>
            {expense.status === 'draft' && (
              <>
                <Button
                  variant="outlined"
                  startIcon={<EditIcon />}
                  onClick={handleEdit}
                >
                  {t('common.edit')}
                </Button>
                <Button
                  variant="outlined"
                  color="error"
                  startIcon={<DeleteIcon />}
                  onClick={handleDelete}
                >
                  {t('common.delete')}
                </Button>
              </>
            )}
          </Box>
        </Box>

        <Grid container spacing={3}>
          {/* Main Content */}
          <Grid item xs={12} md={8}>
            {/* Basic Information */}
            <Paper sx={{ p: 3, mb: 3 }}>
              <Typography variant="h6" gutterBottom>
                Expense Information
              </Typography>
              <Divider sx={{ mb: 2 }} />
              
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Description
                  </Typography>
                  <Typography variant="body1" sx={{ mb: 2 }}>
                    {expense.description}
                  </Typography>
                </Grid>

                <Grid item xs={12} md={6}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                    <MoneyIcon color="action" />
                    <Typography variant="subtitle2" color="text.secondary">
                      Amount
                    </Typography>
                  </Box>
                  <Typography variant="h5" color="primary" sx={{ fontWeight: 'bold' }}>
                    {expense.currency} {expense.amount.toLocaleString()}
                  </Typography>
                </Grid>

                <Grid item xs={12} md={6}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                    <CalendarIcon color="action" />
                    <Typography variant="subtitle2" color="text.secondary">
                      Expense Date
                    </Typography>
                  </Box>
                  <Typography variant="body1">
                    {dayjs(expense.date).format('MMM DD, YYYY')}
                  </Typography>
                </Grid>

                <Grid item xs={12} md={6}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                    <Typography variant="subtitle2" color="text.secondary">
                      Category
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Avatar sx={{ bgcolor: 'primary.main', width: 32, height: 32 }}>
                      {getCategoryIcon(expense.category)}
                    </Avatar>
                    <Box>
                      <Typography variant="body1" sx={{ fontWeight: 'bold' }}>
                        {expense.category.charAt(0).toUpperCase() + expense.category.slice(1)}
                      </Typography>
                      {expense.subcategory && (
                        <Typography variant="body2" color="text.secondary">
                          {expense.subcategory}
                        </Typography>
                      )}
                    </Box>
                  </Box>
                </Grid>

                <Grid item xs={12} md={6}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                    <BusinessIcon color="action" />
                    <Typography variant="subtitle2" color="text.secondary">
                      Project & Cost Center
                    </Typography>
                  </Box>
                  <Typography variant="body1">
                    {expense.project}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {expense.costCenter}
                  </Typography>
                </Grid>
              </Grid>
            </Paper>

            {/* Vendor Information */}
            <Paper sx={{ p: 3, mb: 3 }}>
              <Typography variant="h6" gutterBottom>
                Vendor Information
              </Typography>
              <Divider sx={{ mb: 2 }} />
              
              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Vendor Name
                  </Typography>
                  <Typography variant="body1" sx={{ fontWeight: 'bold' }}>
                    {expense.vendor.name}
                  </Typography>
                </Grid>

                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Tax ID
                  </Typography>
                  <Typography variant="body1">
                    {expense.vendor.taxId}
                  </Typography>
                </Grid>

                <Grid item xs={12}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Address
                  </Typography>
                  <Typography variant="body1">
                    {expense.vendor.address}
                  </Typography>
                </Grid>

                {expense.vendor.phone && (
                  <Grid item xs={12} md={6}>
                    <Typography variant="subtitle2" color="text.secondary">
                      Phone
                    </Typography>
                    <Typography variant="body1">
                      {expense.vendor.phone}
                    </Typography>
                  </Grid>
                )}

                {expense.vendor.email && (
                  <Grid item xs={12} md={6}>
                    <Typography variant="subtitle2" color="text.secondary">
                      Email
                    </Typography>
                    <Typography variant="body1">
                      {expense.vendor.email}
                    </Typography>
                  </Grid>
                )}
              </Grid>
            </Paper>

            {/* Related Invoices */}
            {expense.relatedInvoices && expense.relatedInvoices.length > 0 && (
              <Paper sx={{ p: 3, mb: 3 }}>
                <Typography variant="h6" gutterBottom>
                  {t('expense.relatedInvoices') || 'Related Invoices'}
                </Typography>
                <Divider sx={{ mb: 2 }} />
                <List>
                  {expense.relatedInvoices.map((invoice) => (
                    <ListItem key={invoice._id} divider>
                      <ListItemIcon>
                        <Avatar sx={{ bgcolor: 'primary.main' }}>
                          <ReceiptIcon />
                        </Avatar>
                      </ListItemIcon>
                      <ListItemText
                        primary={invoice.invoiceNumber || t('invoice.noNumber') || 'No Invoice Number'}
                        secondary={`${invoice.currency} ${(invoice.totalAmount || invoice.amount || 0).toLocaleString()} • ${invoice.vendor?.name || '-'} • ${invoice.invoiceDate ? dayjs(invoice.invoiceDate).format('MMM DD, YYYY') : '-'}`}
                      />
                    </ListItem>
                  ))}
                </List>
              </Paper>
            )}

            {/* Receipts */}
            <Paper sx={{ p: 3, mb: 3 }}>
              <Typography variant="h6" gutterBottom>
                {t('expense.receipts') || 'Receipts & Attachments'}
              </Typography>
              <Divider sx={{ mb: 2 }} />
              
              {expense.receipts && expense.receipts.length > 0 ? (
                <List>
                  {expense.receipts.map((receipt, index) => (
                    <ListItem key={index} divider>
                      <ListItemIcon>
                        <Avatar sx={{ bgcolor: 'primary.main' }}>
                          <ReceiptIcon />
                        </Avatar>
                      </ListItemIcon>
                      <ListItemText
                        primary={receipt.originalName || receipt.filename}
                        secondary={`${receipt.size ? (receipt.size / 1024 / 1024).toFixed(2) + ' MB' : ''} • ${receipt.uploadedAt ? dayjs(receipt.uploadedAt).format('MMM DD, YYYY HH:mm') : ''}`}
                      />
                      <Box sx={{ display: 'flex', gap: 1 }}>
                        {receipt.path && (
                          <>
                            <IconButton
                              onClick={() => handleDownloadReceipt(receipt)}
                              size="small"
                            >
                              <DownloadIcon />
                            </IconButton>
                            <IconButton size="small">
                              <ViewIcon />
                            </IconButton>
                          </>
                        )}
                      </Box>
                    </ListItem>
                  ))}
                </List>
              ) : (
                <Typography variant="body2" color="text.secondary">
                  {t('expense.detail.noReceipts') || 'No receipts uploaded'}
                </Typography>
              )}
            </Paper>

            {/* Notes */}
            {expense.notes && (
              <Paper sx={{ p: 3, mb: 3 }}>
                <Typography variant="h6" gutterBottom>
                  Additional Notes
                </Typography>
                <Divider sx={{ mb: 2 }} />
                <Typography variant="body1">
                  {expense.notes}
                </Typography>
              </Paper>
            )}

            {/* Tags */}
            {expense.tags && expense.tags.length > 0 && (
              <Paper sx={{ p: 3 }}>
                <Typography variant="h6" gutterBottom>
                  Tags
                </Typography>
                <Divider sx={{ mb: 2 }} />
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                  {expense.tags.map((tag, index) => (
                    <Chip
                      key={index}
                      label={tag}
                      variant="outlined"
                      size="small"
                    />
                  ))}
                </Box>
              </Paper>
            )}
          </Grid>

          {/* Sidebar */}
          <Grid item xs={12} md={4}>
            {/* Employee Information */}
            <Paper sx={{ p: 3, mb: 3 }}>
              <Typography variant="h6" gutterBottom>
                Employee Information
              </Typography>
              <Divider sx={{ mb: 2 }} />
              
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                <Avatar sx={{ bgcolor: 'primary.main' }}>
                  <PersonIcon />
                </Avatar>
                <Box>
                  <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
                    {expense.employee.firstName} {expense.employee.lastName}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {expense.employee.position}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {expense.employee.department}
                  </Typography>
                </Box>
              </Box>
            </Paper>

            {/* Approval Status */}
            <Paper sx={{ p: 3, mb: 3 }}>
              <Typography variant="h6" gutterBottom>
                Approval Status
              </Typography>
              <Divider sx={{ mb: 2 }} />
              
              <Stepper orientation="vertical">
                {expense.approvals.map((approval, index) => (
                  <Step key={index} active={true} completed={approval.status === 'approved'}>
                    <StepLabel
                      icon={getApprovalIcon(approval.status)}
                    >
                      <Box>
                        <Typography variant="subtitle2">
                          {approval.approver?.firstName || ''} {approval.approver?.lastName || t('travel.detail.unknownApprover')}
                        </Typography>
                        {approval.approver?.position && (
                          <Typography variant="caption" color="text.secondary">
                            {approval.approver.position}
                          </Typography>
                        )}
                      </Box>
                    </StepLabel>
                    <StepContent>
                      <Box sx={{ mb: 2 }}>
                        <Chip
                          label={approval.status}
                          color={getStatusColor(approval.status)}
                          size="small"
                          sx={{ mb: 1 }}
                        />
                        {approval.comments && (
                          <Typography variant="body2" sx={{ mb: 1 }}>
                            {approval.comments}
                          </Typography>
                        )}
                        {approval.approvedAt && (
                          <Typography variant="caption" color="text.secondary">
                            {dayjs(approval.approvedAt).format('MMM DD, YYYY HH:mm')}
                          </Typography>
                        )}
                      </Box>
                    </StepContent>
                  </Step>
                ))}
              </Stepper>
            </Paper>

            {/* Payment Information */}
            {expense.payment && (
              <Paper sx={{ p: 3 }}>
                <Typography variant="h6" gutterBottom>
                  Payment Information
                </Typography>
                <Divider sx={{ mb: 2 }} />
                
                <Box sx={{ mb: 2 }}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Payment Method
                  </Typography>
                  <Typography variant="body1">
                    {expense.payment.method}
                  </Typography>
                </Box>

                <Box sx={{ mb: 2 }}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Transaction ID
                  </Typography>
                  <Typography variant="body1" sx={{ fontFamily: 'monospace' }}>
                    {expense.payment.transactionId}
                  </Typography>
                </Box>

                <Box sx={{ mb: 2 }}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Payment Date
                  </Typography>
                  <Typography variant="body1">
                    {dayjs(expense.payment.paidAt).format('MMM DD, YYYY HH:mm')}
                  </Typography>
                </Box>

                <Box>
                  <Chip
                    label={expense.payment.status}
                    color={expense.payment.status === 'completed' ? 'success' : 'warning'}
                    size="small"
                  />
                </Box>
              </Paper>
            )}
          </Grid>
        </Grid>
      </Box>
    </Container>
  );
};

export default ExpenseDetail;
