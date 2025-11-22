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
  Badge,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
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
  Visibility as ViewIcon,
  OpenInNew as OpenInNewIcon,
  AccessTime as AccessTimeIcon,
  Update as UpdateIcon,
  PictureAsPdf as PdfIcon,
  Image as ImageIcon,
  Link as LinkIcon,
  Info as InfoIcon
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
  const [receiptPreviewOpen, setReceiptPreviewOpen] = useState(false);
  const [selectedReceipt, setSelectedReceipt] = useState(null);
  const [receiptPreviewUrl, setReceiptPreviewUrl] = useState(null);

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
      
      let errorMessage = t('expense.detail.loadError');
      
      if (error.response?.status === 404) {
        errorMessage = t('expense.detail.notFound');
      } else if (error.response?.status === 403) {
        errorMessage = t('expense.detail.noPermission');
      } else if (error.response?.status === 500) {
        errorMessage = t('expense.detail.serverError');
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
    if (!window.confirm(`${t('expense.detail.confirmDelete')} "${expense?.title || expense?.expenseItem?.itemName}"? ${t('expense.list.deleteWarning')}`)) {
      return;
    }

    try {
      await apiClient.delete(`/expenses/${id}`);
      showNotification(
        t('expense.deleteSuccess'),
        'success'
      );
      navigate('/expenses');
    } catch (error) {
      console.error('Failed to delete expense:', error);
      showNotification(
        error.response?.data?.message || t('expense.deleteError'),
        'error'
      );
    }
  };

  const handleDownloadReceipt = async (receipt) => {
    try {
      if (receipt.path) {
        // 使用API下载文件
        const response = await apiClient.get(`/expenses/${id}/receipts/${encodeURIComponent(receipt.path)}`, {
          responseType: 'blob',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        });
        
        const url = window.URL.createObjectURL(new Blob([response.data]));
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', receipt.originalName || receipt.filename);
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.URL.revokeObjectURL(url);
        showNotification(t('expense.receipt.downloadSuccess'), 'success');
      } else {
        showNotification(t('expense.receipt.downloadError'), 'error');
      }
    } catch (error) {
      console.error('Failed to download receipt:', error);
      // 如果API不存在，尝试直接下载
      if (receipt.path) {
        const fileUrl = `${apiClient.defaults.baseURL}/expenses/${id}/receipts/${encodeURIComponent(receipt.path)}`;
        window.open(fileUrl, '_blank');
      } else {
        showNotification(t('expense.receipt.downloadError'), 'error');
      }
    }
  };

  const handleViewReceipt = async (receipt) => {
    try {
      setSelectedReceipt(receipt);
      if (receipt.path) {
        // 尝试通过API获取文件
        try {
          const response = await apiClient.get(`/expenses/${id}/receipts/${encodeURIComponent(receipt.path)}`, {
            responseType: 'blob',
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
          });
          const url = window.URL.createObjectURL(new Blob([response.data]));
          setReceiptPreviewUrl(url);
          setReceiptPreviewOpen(true);
        } catch (apiError) {
          // 如果API不存在，尝试直接使用URL
          const fileUrl = `${apiClient.defaults.baseURL}/expenses/${id}/receipts/${encodeURIComponent(receipt.path)}`;
          setReceiptPreviewUrl(fileUrl);
          setReceiptPreviewOpen(true);
        }
      } else {
        showNotification(t('expense.receipt.previewError'), 'error');
      }
    } catch (error) {
      console.error('Failed to preview receipt:', error);
      showNotification(t('expense.receipt.previewError'), 'error');
    }
  };

  const handleCloseReceiptPreview = () => {
    setReceiptPreviewOpen(false);
    if (receiptPreviewUrl) {
      window.URL.revokeObjectURL(receiptPreviewUrl);
      setReceiptPreviewUrl(null);
    }
    setSelectedReceipt(null);
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
            {t('expense.detail.expenseNotFound')}
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
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
              <Chip
                label={t(`expense.statuses.${expense.status}`) || expense.status}
                color={getStatusColor(expense.status)}
                size="small"
              />
              {expense.reimbursementNumber && (
                <Typography variant="body2" color="text.secondary">
                  {t('expense.reimbursementNumber')}: {expense.reimbursementNumber}
                </Typography>
              )}
              <Typography variant="body2" color="text.secondary">
                {t('expense.detail.createdOn')}: {dayjs(expense.createdAt).format('YYYY-MM-DD')}
              </Typography>
              {expense.isBillable && (
                <Chip label={t('expense.billable')} color="success" size="small" />
              )}
              {expense.matchSource === 'auto' || expense.autoMatched ? (
                <Chip 
                  label={t('expense.generationType.ai')} 
                  color="primary" 
                  size="small"
                  variant="filled"
                />
              ) : (
                <Chip 
                  label={t('expense.generationType.manual')} 
                  color="default" 
                  size="small"
                  variant="outlined"
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
                {t('expense.detail.expenseInformation')}
              </Typography>
              <Divider sx={{ mb: 2 }} />
              
              <Grid container spacing={2}>
                {expense.description && (
                  <Grid item xs={12}>
                    <Typography variant="subtitle2" color="text.secondary">
                      {t('expense.detail.description')}
                    </Typography>
                    <Typography variant="body1" sx={{ mb: 2 }}>
                      {expense.description}
                    </Typography>
                  </Grid>
                )}

                <Grid item xs={12} md={6}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                    <MoneyIcon color="action" />
                    <Typography variant="subtitle2" color="text.secondary">
                      {t('expense.detail.amount')}
                    </Typography>
                  </Box>
                  <Typography variant="h5" color="primary" sx={{ fontWeight: 'bold' }}>
                    {expense.currency} {expense.amount?.toLocaleString() || 0}
                  </Typography>
                  {expense.localAmount && expense.localCurrency && (
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                      ({expense.localCurrency} {expense.localAmount?.toLocaleString()})
                      {expense.exchangeRate && expense.exchangeRate !== 1 && (
                        <span> • {t('expense.exchangeRate')}: {expense.exchangeRate}</span>
                      )}
                    </Typography>
                  )}
                </Grid>

                <Grid item xs={12} md={6}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                    <CalendarIcon color="action" />
                    <Typography variant="subtitle2" color="text.secondary">
                      {t('expense.detail.expenseDate')}
                    </Typography>
                  </Box>
                  <Typography variant="body1">
                    {dayjs(expense.date).format('MMM DD, YYYY')}
                  </Typography>
                </Grid>

                <Grid item xs={12} md={6}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                    <Typography variant="subtitle2" color="text.secondary">
                      {t('expense.detail.category')}
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Avatar sx={{ bgcolor: 'primary.main', width: 32, height: 32 }}>
                      {getCategoryIcon(expense.category)}
                    </Avatar>
                    <Box>
                      <Typography variant="body1" sx={{ fontWeight: 'bold' }}>
                        {t(`expense.categories.${expense.category}`) || expense.category?.charAt(0).toUpperCase() + expense.category?.slice(1)}
                      </Typography>
                      {expense.subcategory && (
                        <Typography variant="body2" color="text.secondary">
                          {expense.subcategory}
                        </Typography>
                      )}
                    </Box>
                  </Box>
                </Grid>

                {(expense.project || expense.costCenter) && (
                  <Grid item xs={12} md={6}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                      <BusinessIcon color="action" />
                      <Typography variant="subtitle2" color="text.secondary">
                        {t('expense.detail.projectCostCenter')}
                      </Typography>
                    </Box>
                    {expense.project && (
                      <Typography variant="body1">
                        {t('expense.project')}: {expense.project}
                      </Typography>
                    )}
                    {expense.costCenter && (
                      <Typography variant="body2" color="text.secondary">
                        {t('expense.costCenter')}: {expense.costCenter}
                      </Typography>
                    )}
                  </Grid>
                )}

                {expense.client && (
                  <Grid item xs={12} md={6}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                      <BusinessIcon color="action" />
                      <Typography variant="subtitle2" color="text.secondary">
                        {t('expense.client')}
                      </Typography>
                    </Box>
                    <Typography variant="body1">
                      {expense.client}
                    </Typography>
                  </Grid>
                )}
              </Grid>
            </Paper>

            {/* Vendor Information */}
            <Paper sx={{ p: 3, mb: 3 }}>
              <Typography variant="h6" gutterBottom>
                {t('expense.detail.vendorInformation')}
              </Typography>
              <Divider sx={{ mb: 2 }} />
              
              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle2" color="text.secondary">
                    {t('expense.detail.vendorName')}
                  </Typography>
                  <Typography variant="body1" sx={{ fontWeight: 'bold' }}>
                    {expense.vendor.name}
                  </Typography>
                </Grid>

                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle2" color="text.secondary">
                    {t('expense.detail.taxId')}
                  </Typography>
                  <Typography variant="body1">
                    {expense.vendor.taxId}
                  </Typography>
                </Grid>

                <Grid item xs={12}>
                  <Typography variant="subtitle2" color="text.secondary">
                    {t('expense.detail.address')}
                  </Typography>
                  <Typography variant="body1">
                    {expense.vendor.address}
                  </Typography>
                </Grid>

                {expense.vendor.phone && (
                  <Grid item xs={12} md={6}>
                    <Typography variant="subtitle2" color="text.secondary">
                      {t('expense.detail.phone')}
                    </Typography>
                    <Typography variant="body1">
                      {expense.vendor.phone}
                    </Typography>
                  </Grid>
                )}

                {expense.vendor.email && (
                  <Grid item xs={12} md={6}>
                    <Typography variant="subtitle2" color="text.secondary">
                      {t('expense.detail.email')}
                    </Typography>
                    <Typography variant="body1">
                      {expense.vendor.email}
                    </Typography>
                  </Grid>
                )}
              </Grid>
            </Paper>

            {/* Related Travel */}
            {expense.travel && (
              <Paper sx={{ p: 3, mb: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                  <Typography variant="h6">
                    {t('expense.relatedTravel')}
                  </Typography>
                  <Button
                    size="small"
                    variant="outlined"
                    startIcon={<OpenInNewIcon />}
                    onClick={() => {
                      const travelId = expense.travel?._id || expense.travel;
                      if (travelId) {
                        navigate(`/travel/${travelId}`);
                      }
                    }}
                  >
                    {t('common.view')}
                  </Button>
                </Box>
                <Divider sx={{ mb: 2 }} />
                <Card variant="outlined" sx={{ cursor: 'pointer', '&:hover': { boxShadow: 2 } }} onClick={() => {
                  const travelId = expense.travel?._id || expense.travel;
                  if (travelId) {
                    navigate(`/travel/${travelId}`);
                  }
                }}>
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <Avatar sx={{ bgcolor: 'primary.main', width: 48, height: 48 }}>
                        <CalendarIcon />
                      </Avatar>
                      <Box sx={{ flexGrow: 1 }}>
                        <Typography variant="body1" sx={{ fontWeight: 'bold', mb: 0.5 }}>
                          {expense.travel?.travelNumber || expense.travel?.title || t('travel.title')}
                        </Typography>
                        {expense.travel?.purpose && (
                          <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                            {expense.travel.purpose}
                          </Typography>
                        )}
                        {expense.travel?.departureDate && expense.travel?.returnDate && (
                          <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                            {dayjs(expense.travel.departureDate).format('MMM DD')} - {dayjs(expense.travel.returnDate).format('MMM DD, YYYY')}
                          </Typography>
                        )}
                        {expense.travel?.destination && (
                          <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                            {typeof expense.travel.destination === 'object' 
                              ? `${expense.travel.destination.city || ''}${expense.travel.destination.country ? `, ${expense.travel.destination.country}` : ''}`
                              : expense.travel.destination}
                          </Typography>
                        )}
                        {expense.travel?.status && (
                          <Chip
                            label={t(`travel.statuses.${expense.travel.status}`) || expense.travel.status}
                            size="small"
                            sx={{ mt: 0.5 }}
                            color={expense.travel.status === 'completed' ? 'success' : expense.travel.status === 'approved' ? 'success' : 'default'}
                          />
                        )}
                      </Box>
                    </Box>
                  </CardContent>
                </Card>
              </Paper>
            )}

            {/* Related Expense Item */}
            {expense.expenseItem && (
              <Paper sx={{ p: 3, mb: 3 }}>
                <Typography variant="h6" gutterBottom>
                  {t('expense.expenseItem')}
                </Typography>
                <Divider sx={{ mb: 2 }} />
                <Card variant="outlined">
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <Avatar sx={{ bgcolor: 'secondary.main', width: 48, height: 48 }}>
                        <ReceiptIcon />
                      </Avatar>
                      <Box sx={{ flexGrow: 1 }}>
                        <Typography variant="body1" sx={{ fontWeight: 'bold', mb: 0.5 }}>
                          {expense.expenseItem?.itemName || expense.expenseItem?.code || '-'}
                        </Typography>
                        {expense.expenseItem?.category && (
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                            <Avatar sx={{ bgcolor: 'primary.main', width: 24, height: 24 }}>
                              {getCategoryIcon(expense.expenseItem.category)}
                            </Avatar>
                            <Typography variant="body2" color="text.secondary">
                              {t(`expense.categories.${expense.expenseItem.category}`) || expense.expenseItem.category}
                            </Typography>
                          </Box>
                        )}
                        {expense.expenseItem?.code && (
                          <Typography variant="caption" color="text.secondary" sx={{ fontFamily: 'monospace', display: 'block' }}>
                            {t('expense.expenseItemCode')}: {expense.expenseItem.code}
                          </Typography>
                        )}
                      </Box>
                    </Box>
                  </CardContent>
                </Card>
              </Paper>
            )}

            {/* Related Invoices */}
            {expense.relatedInvoices && expense.relatedInvoices.length > 0 && (
              <Paper sx={{ p: 3, mb: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                  <Typography variant="h6">
                    {t('expense.relatedInvoices')}
                  </Typography>
                  <Badge badgeContent={expense.relatedInvoices.length} color="primary">
                    <ReceiptIcon />
                  </Badge>
                </Box>
                <Divider sx={{ mb: 2 }} />
                <Grid container spacing={2}>
                  {expense.relatedInvoices.map((invoice) => (
                    <Grid item xs={12} key={invoice._id}>
                      <Card 
                        variant="outlined" 
                        sx={{ 
                          cursor: 'pointer', 
                          '&:hover': { boxShadow: 2, bgcolor: 'action.hover' },
                          transition: 'all 0.2s'
                        }}
                        onClick={() => navigate(`/invoices/${invoice._id}`)}
                      >
                        <CardContent>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                            <Avatar sx={{ bgcolor: 'primary.main' }}>
                              <ReceiptIcon />
                            </Avatar>
                            <Box sx={{ flexGrow: 1 }}>
                              <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
                                {invoice.invoiceNumber || t('invoice.noNumber')}
                              </Typography>
                              <Typography variant="body2" color="text.secondary">
                                {invoice.currency} {(invoice.totalAmount || invoice.amount || 0).toLocaleString()}
                              </Typography>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5, flexWrap: 'wrap' }}>
                                {invoice.vendor?.name && (
                                  <Chip 
                                    label={invoice.vendor.name} 
                                    size="small" 
                                    variant="outlined"
                                    icon={<BusinessIcon />}
                                  />
                                )}
                                {invoice.invoiceDate && (
                                  <Typography variant="caption" color="text.secondary">
                                    {dayjs(invoice.invoiceDate).format('MMM DD, YYYY')}
                                  </Typography>
                                )}
                                {invoice.category && (
                                  <Chip 
                                    label={t(`expense.categories.${invoice.category}`) || invoice.category}
                                    size="small"
                                    sx={{ height: 20 }}
                                  />
                                )}
                              </Box>
                            </Box>
                            <IconButton size="small" onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/invoices/${invoice._id}`);
                            }}>
                              <OpenInNewIcon />
                            </IconButton>
                          </Box>
                        </CardContent>
                      </Card>
                    </Grid>
                  ))}
                </Grid>
              </Paper>
            )}

            {/* Receipts */}
            <Paper sx={{ p: 3, mb: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                <Typography variant="h6">
                  {t('expense.receipts')}
                </Typography>
                {expense.receipts && expense.receipts.length > 0 && (
                  <Badge badgeContent={expense.receipts.length} color="primary">
                    <ReceiptIcon />
                  </Badge>
                )}
              </Box>
              <Divider sx={{ mb: 2 }} />
              
              {expense.receipts && expense.receipts.length > 0 ? (
                <Grid container spacing={2}>
                  {expense.receipts.map((receipt, index) => {
                    const isImage = receipt.mimeType?.startsWith('image/') || receipt.filename?.match(/\.(jpg|jpeg|png|gif|webp)$/i);
                    const isPdf = receipt.mimeType === 'application/pdf' || receipt.filename?.match(/\.pdf$/i);
                    
                    return (
                      <Grid item xs={12} sm={6} md={4} key={index}>
                        <Card variant="outlined" sx={{ height: '100%' }}>
                          <CardContent>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                              {isImage ? (
                                <ImageIcon color="primary" />
                              ) : isPdf ? (
                                <PdfIcon color="error" />
                              ) : (
                                <ReceiptIcon color="action" />
                              )}
                              <Typography variant="subtitle2" sx={{ flexGrow: 1, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {receipt.originalName || receipt.filename}
                              </Typography>
                            </Box>
                            <Typography variant="caption" color="text.secondary" display="block">
                              {receipt.size ? `${(receipt.size / 1024 / 1024).toFixed(2)} MB` : ''}
                              {receipt.uploadedAt && ` • ${dayjs(receipt.uploadedAt).format('MMM DD, YYYY HH:mm')}`}
                            </Typography>
                            <Box sx={{ display: 'flex', gap: 1, mt: 2 }}>
                              {receipt.path && (
                                <>
                                  <Tooltip title={t('common.view')}>
                                    <IconButton
                                      size="small"
                                      onClick={() => handleViewReceipt(receipt)}
                                    >
                                      <ViewIcon />
                                    </IconButton>
                                  </Tooltip>
                                  <Tooltip title={t('common.download')}>
                                    <IconButton
                                      size="small"
                                      onClick={() => handleDownloadReceipt(receipt)}
                                    >
                                      <DownloadIcon />
                                    </IconButton>
                                  </Tooltip>
                                </>
                              )}
                            </Box>
                          </CardContent>
                        </Card>
                      </Grid>
                    );
                  })}
                </Grid>
              ) : (
                <Box sx={{ textAlign: 'center', py: 4 }}>
                  <ReceiptIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }} />
                  <Typography variant="body2" color="text.secondary">
                    {t('expense.detail.noReceipts')}
                  </Typography>
                </Box>
              )}
            </Paper>

            {/* Notes */}
            {expense.notes && (
              <Paper sx={{ p: 3, mb: 3 }}>
                <Typography variant="h6" gutterBottom>
                  {t('expense.detail.additionalNotes')}
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
                  {t('expense.detail.tags')}
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
            {/* Quick Stats */}
            <Grid container spacing={2} sx={{ mb: 3 }}>
              <Grid item xs={6}>
                <Card>
                  <CardContent sx={{ textAlign: 'center', py: 2 }}>
                    <MoneyIcon color="primary" sx={{ fontSize: 32, mb: 1 }} />
                    <Typography variant="h6" color="primary">
                      {expense.currency} {expense.amount?.toLocaleString() || 0}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {t('expense.amount')}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={6}>
                <Card>
                  <CardContent sx={{ textAlign: 'center', py: 2 }}>
                    <ReceiptIcon color="secondary" sx={{ fontSize: 32, mb: 1 }} />
                    <Typography variant="h6" color="secondary">
                      {expense.relatedInvoices?.length || 0}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {t('expense.relatedInvoices')}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>

            {/* Employee Information */}
            <Paper sx={{ p: 3, mb: 3 }}>
              <Typography variant="h6" gutterBottom>
                {t('expense.detail.employeeInformation')}
              </Typography>
              <Divider sx={{ mb: 2 }} />
              
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                <Avatar sx={{ bgcolor: 'primary.main', width: 56, height: 56 }}>
                  {expense.employee.firstName?.[0] || expense.employee.lastName?.[0] || <PersonIcon />}
                </Avatar>
                <Box sx={{ flexGrow: 1 }}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
                    {expense.employee.firstName} {expense.employee.lastName}
                  </Typography>
                  {expense.employee.position && (
                    <Typography variant="body2" color="text.secondary">
                      {expense.employee.position}
                    </Typography>
                  )}
                  {expense.employee.department && (
                    <Typography variant="body2" color="text.secondary">
                      {expense.employee.department}
                    </Typography>
                  )}
                  {expense.employee.email && (
                    <Typography variant="caption" color="text.secondary">
                      {expense.employee.email}
                    </Typography>
                  )}
                </Box>
              </Box>
            </Paper>

            {/* Activity History */}
            <Paper sx={{ p: 3, mb: 3 }}>
              <Typography variant="h6" gutterBottom>
                {t('expense.activityHistory') || 'Activity History'}
              </Typography>
              <Divider sx={{ mb: 2 }} />
              <List>
                <ListItem>
                  <ListItemIcon>
                    <Avatar sx={{ bgcolor: 'primary.main', width: 40, height: 40 }}>
                      <AccessTimeIcon />
                    </Avatar>
                  </ListItemIcon>
                  <ListItemText
                    primary={t('expense.created') || 'Created'}
                    secondary={
                      <Box>
                        <Typography variant="caption" color="text.secondary" display="block">
                          {dayjs(expense.createdAt).format('MMM DD, YYYY HH:mm')}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {t('expense.detail.createdOn')} {dayjs(expense.createdAt).format('MMM DD, YYYY')}
                        </Typography>
                      </Box>
                    }
                  />
                </ListItem>
                
                {expense.updatedAt && dayjs(expense.updatedAt).diff(dayjs(expense.createdAt), 'minute') > 1 && (
                  <ListItem>
                    <ListItemIcon>
                      <Avatar sx={{ bgcolor: 'info.main', width: 40, height: 40 }}>
                        <UpdateIcon />
                      </Avatar>
                    </ListItemIcon>
                    <ListItemText
                      primary={t('expense.updated') || 'Updated'}
                      secondary={
                        <Box>
                          <Typography variant="caption" color="text.secondary" display="block">
                            {dayjs(expense.updatedAt).format('MMM DD, YYYY HH:mm')}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {t('expense.lastUpdated')} {dayjs(expense.updatedAt).fromNow()}
                          </Typography>
                        </Box>
                      }
                    />
                  </ListItem>
                )}

                {expense.status === 'submitted' && (
                  <ListItem>
                    <ListItemIcon>
                      <Avatar sx={{ bgcolor: 'warning.main', width: 40, height: 40 }}>
                        <ScheduleIcon />
                      </Avatar>
                    </ListItemIcon>
                    <ListItemText
                      primary={t('expense.submitted') || 'Submitted'}
                      secondary={
                        <Typography variant="caption" color="text.secondary">
                          {dayjs(expense.updatedAt || expense.createdAt).format('MMM DD, YYYY HH:mm')} • {t('expense.statuses.submitted')}
                        </Typography>
                      }
                    />
                  </ListItem>
                )}

                {expense.status === 'approved' && (
                  <ListItem>
                    <ListItemIcon>
                      <Avatar sx={{ bgcolor: 'success.main', width: 40, height: 40 }}>
                        <CheckCircleIcon />
                      </Avatar>
                    </ListItemIcon>
                    <ListItemText
                      primary={t('expense.approved') || 'Approved'}
                      secondary={
                        <Typography variant="caption" color="text.secondary">
                          {expense.approvals?.find(a => a.status === 'approved')?.approvedAt 
                            ? dayjs(expense.approvals.find(a => a.status === 'approved').approvedAt).format('MMM DD, YYYY HH:mm')
                            : dayjs(expense.updatedAt || expense.createdAt).format('MMM DD, YYYY HH:mm')} • {t('expense.statuses.approved')}
                        </Typography>
                      }
                    />
                  </ListItem>
                )}

                {expense.status === 'paid' && expense.payment?.paidAt && (
                  <ListItem>
                    <ListItemIcon>
                      <Avatar sx={{ bgcolor: 'info.main', width: 40, height: 40 }}>
                        <MoneyIcon />
                      </Avatar>
                    </ListItemIcon>
                    <ListItemText
                      primary={t('expense.paid') || 'Paid'}
                      secondary={
                        <Typography variant="caption" color="text.secondary">
                          {dayjs(expense.payment.paidAt).format('MMM DD, YYYY HH:mm')} • {t('expense.statuses.paid')}
                        </Typography>
                      }
                    />
                  </ListItem>
                )}
              </List>
            </Paper>

            {/* Approval Status */}
            <Paper sx={{ p: 3, mb: 3 }}>
              <Typography variant="h6" gutterBottom>
                {t('expense.detail.approvalStatus')}
              </Typography>
              <Divider sx={{ mb: 2 }} />
              
              {expense.approvals && expense.approvals.length > 0 ? (
                <Stepper orientation="vertical">
                  {expense.approvals.map((approval, index) => (
                    <Step key={index} active={true} completed={approval.status === 'approved'}>
                      <StepLabel
                        icon={getApprovalIcon(approval.status)}
                      >
                        <Box>
                          <Typography variant="subtitle2" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <span>
                              {approval.approver?.firstName || ''} {approval.approver?.lastName || t('travel.detail.unknownApprover')}
                            </span>
                            {approval.level && (
                              <Chip 
                                label={`${t('approval.level')} ${approval.level}`}
                                size="small" 
                                sx={{ height: 20, fontSize: '0.7rem' }}
                              />
                            )}
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
                            label={t(`approval.${approval.status}`) || approval.status}
                            color={getStatusColor(approval.status)}
                            size="small"
                            sx={{ mb: 1 }}
                          />
                          {approval.comments && (
                            <Typography variant="body2" sx={{ mb: 1, mt: 1 }}>
                              {t('approval.comments')}: {approval.comments}
                            </Typography>
                          )}
                          {approval.approvedAt && (
                            <Typography variant="caption" color="text.secondary">
                              {t('approval.approvedAt')}: {dayjs(approval.approvedAt).format('MMM DD, YYYY HH:mm')}
                            </Typography>
                          )}
                        </Box>
                      </StepContent>
                    </Step>
                  ))}
                </Stepper>
              ) : (
                <Typography variant="body2" color="text.secondary">
                  {t('approval.noApprovalHistory')}
                </Typography>
              )}
            </Paper>

            {/* Payment Information */}
            {expense.payment && (
              <Paper sx={{ p: 3 }}>
                <Typography variant="h6" gutterBottom>
                  {t('expense.detail.paymentInformation')}
                </Typography>
                <Divider sx={{ mb: 2 }} />
                
                <Box sx={{ mb: 2 }}>
                  <Typography variant="subtitle2" color="text.secondary">
                    {t('expense.detail.paymentMethod')}
                  </Typography>
                  <Typography variant="body1">
                    {expense.payment.method ? t(`expense.paymentMethods.${expense.payment.method}`) || expense.payment.method : '-'}
                  </Typography>
                </Box>

                {expense.payment.reference && (
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="subtitle2" color="text.secondary">
                      {t('expense.paymentReference')}
                    </Typography>
                    <Typography variant="body1" sx={{ fontFamily: 'monospace' }}>
                      {expense.payment.reference}
                    </Typography>
                  </Box>
                )}

                {expense.payment.paidAt && (
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="subtitle2" color="text.secondary">
                      {t('expense.detail.paymentDate')}
                    </Typography>
                    <Typography variant="body1">
                      {dayjs(expense.payment.paidAt).format('MMM DD, YYYY HH:mm')}
                    </Typography>
                  </Box>
                )}

                {expense.payment.paidBy && (
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="subtitle2" color="text.secondary">
                      {t('expense.paidBy')}
                    </Typography>
                    <Typography variant="body1">
                      {expense.payment.paidBy?.firstName} {expense.payment.paidBy?.lastName}
                    </Typography>
                  </Box>
                )}
              </Paper>
            )}
          </Grid>
        </Grid>

        {/* Receipt Preview Dialog */}
        <Dialog
          open={receiptPreviewOpen}
          onClose={handleCloseReceiptPreview}
          maxWidth="lg"
          fullWidth
        >
          <DialogTitle>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Typography variant="h6">
                {selectedReceipt?.originalName || selectedReceipt?.filename || t('expense.receipt.preview')}
              </Typography>
              <IconButton onClick={handleCloseReceiptPreview}>
                <CancelIcon />
              </IconButton>
            </Box>
          </DialogTitle>
          <DialogContent>
            {receiptPreviewUrl && (
              <Box sx={{ textAlign: 'center', mt: 2 }}>
                {selectedReceipt?.mimeType?.startsWith('image/') || selectedReceipt?.filename?.match(/\.(jpg|jpeg|png|gif|webp)$/i) ? (
                  <img
                    src={receiptPreviewUrl}
                    alt={selectedReceipt?.originalName || selectedReceipt?.filename}
                    style={{ maxWidth: '100%', maxHeight: '70vh', objectFit: 'contain' }}
                  />
                ) : selectedReceipt?.mimeType === 'application/pdf' || selectedReceipt?.filename?.match(/\.pdf$/i) ? (
                  <iframe
                    src={receiptPreviewUrl}
                    width="100%"
                    height="600px"
                    style={{ border: 'none' }}
                    title={selectedReceipt?.originalName || selectedReceipt?.filename}
                  />
                ) : (
                  <Alert severity="info">
                    {t('expense.receipt.previewNotSupported') || '此文件类型不支持预览'}
                  </Alert>
                )}
              </Box>
            )}
          </DialogContent>
          <DialogActions>
            {selectedReceipt && (
              <Button
                startIcon={<DownloadIcon />}
                onClick={() => {
                  handleDownloadReceipt(selectedReceipt);
                }}
              >
                {t('common.download')}
              </Button>
            )}
            <Button onClick={handleCloseReceiptPreview}>
              {t('common.close')}
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </Container>
  );
};

export default ExpenseDetail;
