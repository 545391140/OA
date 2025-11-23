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
  Avatar,
  LinearProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Alert,
  IconButton,
  Stepper,
  Step,
  StepLabel,
  StepContent
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  Approval as ApprovalIcon,
  Flight as TravelIcon,
  Receipt as ExpenseIcon,
  CheckCircle as ApproveIcon,
  Cancel as RejectIcon,
  Person as PersonIcon,
  CalendarToday as CalendarIcon,
  AttachMoney as MoneyIcon,
  Business as BusinessIcon,
  LocationOn as LocationIcon,
  FlightTakeoff as DepartureIcon,
  FlightLand as ReturnIcon,
  AccessTime as AccessTimeIcon,
  Comment as CommentIcon,
  Label as LabelIcon,
  Schedule as ScheduleIcon,
  Description as DescriptionIcon,
  AttachFile as AttachFileIcon
} from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../contexts/AuthContext';
import { useNotification } from '../../contexts/NotificationContext';
import apiClient from '../../utils/axiosConfig';
import dayjs from 'dayjs';
import { numberToChinese } from '../../utils/numberToChinese';

const ApprovalDetail = () => {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const { showNotification } = useNotification();
  const { id, type } = useParams(); // type: 'travel' or 'expense'
  const navigate = useNavigate();

  const [item, setItem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [approvalDialogOpen, setApprovalDialogOpen] = useState(false);
  const [approvalAction, setApprovalAction] = useState(''); // 'approve' or 'reject'
  const [approvalComment, setApprovalComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (id && type) {
      fetchDetail();
    }
  }, [id, type]);

  const fetchDetail = async () => {
    try {
      setLoading(true);
      const endpoint = type === 'travel' ? `/travel/${id}` : `/expenses/${id}`;
      const response = await apiClient.get(endpoint);

      if (response.data && response.data.success) {
        setItem(response.data.data);
      } else {
        showNotification(t('approval.detail.loadError') || 'Failed to load detail', 'error');
      }
    } catch (error) {
      console.error('Fetch detail error:', error);
      showNotification(
        error.response?.data?.message || t('approval.detail.loadError') || 'Failed to load detail',
        'error'
      );
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      draft: 'default',
      submitted: 'warning',
      approved: 'success',
      rejected: 'error',
      'in-progress': 'info',
      paid: 'info',
      cancelled: 'error'
    };
    return colors[status] || 'default';
  };

  const getApprovalStatusIcon = (status) => {
    switch (status) {
      case 'approved':
        return <ApproveIcon color="success" fontSize="small" />;
      case 'rejected':
        return <RejectIcon color="error" fontSize="small" />;
      case 'pending':
        return <ScheduleIcon color="warning" fontSize="small" />;
      default:
        return <ScheduleIcon color="disabled" fontSize="small" />;
    }
  };

  const formatDateTime = (date) => {
    if (!date) return '-';
    return dayjs(date).format('YYYY-MM-DD HH:mm');
  };

  const formatDate = (date) => {
    if (!date) return '-';
    return dayjs(date).format('YYYY-MM-DD');
  };

  const formatCurrency = (amount, currency = 'CNY') => {
    if (amount === null || amount === undefined) return '-';
    return new Intl.NumberFormat('zh-CN', {
      style: 'currency',
      currency: currency || 'CNY'
    }).format(amount);
  };

  const handleOpenApprovalDialog = (action) => {
    setApprovalAction(action);
    setApprovalDialogOpen(true);
  };

  const handleCloseApprovalDialog = () => {
    setApprovalDialogOpen(false);
    setApprovalComment('');
    setApprovalAction('');
  };

  const handleSubmitApproval = async () => {
    if (!approvalComment.trim()) {
      showNotification(t('approval.detail.commentRequired') || 'Please enter approval comment', 'warning');
      return;
    }

    try {
      setSubmitting(true);
      const endpoint = type === 'travel' ? `/approvals/travel/${id}` : `/approvals/expense/${id}`;
      await apiClient.put(endpoint, {
        status: approvalAction === 'approve' ? 'approved' : 'rejected',
        comments: approvalComment
      });

      showNotification(
        approvalAction === 'approve'
          ? (t('approval.detail.approveSuccess') || 'Approved successfully')
          : (t('approval.detail.rejectSuccess') || 'Rejected successfully'),
        'success'
      );

      handleCloseApprovalDialog();
      fetchDetail(); // 刷新数据
    } catch (error) {
      console.error('Approval error:', error);
      showNotification(
        error.response?.data?.message || t('approval.detail.approvalError') || 'Approval failed',
        'error'
      );
    } finally {
      setSubmitting(false);
    }
  };

  // 检查当前用户是否可以审批
  const canApprove = () => {
    if (!user || !item) return false;

    // 只有已提交状态的申请才能审批
    if (item.status !== 'submitted' && item.status !== 'in-progress') return false;

    // 检查当前用户是否在审批列表中且状态为pending
    if (!item.approvals || !Array.isArray(item.approvals)) return false;

    const pendingApproval = item.approvals.find(approval => {
      const approverId = approval.approver?._id || approval.approver;
      return approverId && approverId.toString() === user.id && approval.status === 'pending';
    });

    return !!pendingApproval;
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

  if (!item) {
    return (
      <Container maxWidth="xl">
        <Box sx={{ py: 3 }}>
          <Alert severity="error">
            {t('approval.detail.notFound') || 'Item not found'}
          </Alert>
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ py: 3 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
        <IconButton onClick={() => navigate('/approval')}>
          <ArrowBackIcon />
        </IconButton>
        <Box sx={{ flexGrow: 1 }}>
          <Typography variant="h4" gutterBottom>
            {type === 'travel' 
              ? (item.title || item.travelNumber || t('approval.detail.travelRequest'))
              : (item.title || item.expenseNumber || t('approval.detail.expenseRequest'))
            }
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
            <Chip
              icon={type === 'travel' ? <TravelIcon /> : <ExpenseIcon />}
              label={type === 'travel' ? t('approval.travelRequest') : t('approval.expenseReport')}
              color="primary"
              size="small"
            />
            <Chip
              label={t(`travel.statuses.${item.status}`) || item.status}
              color={getStatusColor(item.status)}
              size="small"
            />
            {item.travelNumber && (
              <Typography variant="body2" color="text.secondary">
                {t('travel.detail.travelNumber')}: {item.travelNumber}
              </Typography>
            )}
            <Typography variant="body2" color="text.secondary">
              {t('approval.detail.createdOn')}: {formatDate(item.createdAt)}
            </Typography>
          </Box>
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          {canApprove() && (
            <>
              <Button
                variant="contained"
                color="success"
                startIcon={<ApproveIcon />}
                onClick={() => handleOpenApprovalDialog('approve')}
              >
                {t('approval.detail.approve') || 'Approve'}
              </Button>
              <Button
                variant="contained"
                color="error"
                startIcon={<RejectIcon />}
                onClick={() => handleOpenApprovalDialog('reject')}
              >
                {t('approval.detail.reject') || 'Reject'}
              </Button>
            </>
          )}
        </Box>
      </Box>

      <Grid container spacing={3}>
        {/* 左侧主要内容 */}
        <Grid item xs={12} md={8}>
          {/* 基本信息 */}
          <Paper sx={{ p: 3, mb: 3 }}>
            <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <DescriptionIcon color="primary" fontSize="small" />
              {t('approval.detail.basicInformation') || 'Basic Information'}
            </Typography>
            <Divider sx={{ mb: 2 }} />

            {type === 'travel' ? (
              // 差旅申请详情
              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="caption" color="text.secondary" display="block" gutterBottom>
                      {t('approval.detail.applicant') || 'Applicant'}
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Avatar sx={{ width: 32, height: 32 }}>
                        {item.employee?.firstName?.[0] || 'U'}
                      </Avatar>
                      <Box>
                        <Typography variant="body1" fontWeight={500}>
                          {item.employee?.firstName} {item.employee?.lastName}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {item.employee?.email}
                        </Typography>
                      </Box>
                    </Box>
                  </Box>
                </Grid>

                <Grid item xs={12} md={6}>
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="caption" color="text.secondary" display="block" gutterBottom>
                      {t('travel.detail.department') || 'Department'}
                    </Typography>
                    <Typography variant="body1">
                      {item.costOwingDepartment || item.employee?.department || '-'}
                    </Typography>
                  </Box>
                </Grid>

                <Grid item xs={12} md={6}>
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="caption" color="text.secondary" display="block" gutterBottom>
                      {t('travel.detail.travelType') || 'Travel Type'}
                    </Typography>
                    <Typography variant="body1">
                      {item.tripType === 'international' ? t('travel.international') : t('travel.domestic')}
                    </Typography>
                  </Box>
                </Grid>

                <Grid item xs={12} md={6}>
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="caption" color="text.secondary" display="block" gutterBottom>
                      {t('travel.detail.destination') || 'Destination'}
                    </Typography>
                    <Typography variant="body1">
                      {typeof item.destination === 'string' 
                        ? item.destination 
                        : (item.destination?.city || item.destination?.name || '-')}
                    </Typography>
                  </Box>
                </Grid>

                <Grid item xs={12} md={6}>
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="caption" color="text.secondary" display="block" gutterBottom>
                      {t('travel.detail.travelDates') || 'Travel Dates'}
                    </Typography>
                    <Typography variant="body1">
                      {item.startDate ? formatDate(item.startDate) : (item.outbound?.date ? formatDate(item.outbound.date) : '-')}
                      {item.endDate ? ` - ${formatDate(item.endDate)}` : (item.inbound?.date ? ` - ${formatDate(item.inbound.date)}` : '')}
                    </Typography>
                    {(item.startDate && item.endDate) && (
                      <Typography variant="caption" color="text.secondary">
                        {dayjs(item.endDate).diff(dayjs(item.startDate), 'days')} {t('travel.detail.days') || 'days'}
                      </Typography>
                    )}
                  </Box>
                </Grid>

                <Grid item xs={12} md={6}>
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="caption" color="text.secondary" display="block" gutterBottom>
                      {t('travel.detail.purpose') || 'Purpose'}
                    </Typography>
                    <Typography variant="body1">
                      {item.purpose || item.tripDescription || '-'}
                    </Typography>
                  </Box>
                </Grid>

                <Grid item xs={12} md={6}>
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="caption" color="text.secondary" display="block" gutterBottom>
                      {t('travel.detail.estimatedCost') || 'Estimated Cost'}
                    </Typography>
                    <Typography variant="h6" color="primary">
                      {formatCurrency(item.estimatedBudget || item.estimatedCost, item.currency)}
                    </Typography>
                  </Box>
                </Grid>

                {item.comment && (
                  <Grid item xs={12}>
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="caption" color="text.secondary" display="block" gutterBottom>
                        {t('travel.detail.comment') || 'Comment'}
                      </Typography>
                      <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                        {item.comment}
                      </Typography>
                    </Box>
                  </Grid>
                )}
              </Grid>
            ) : (
              // 费用申请详情
              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="caption" color="text.secondary" display="block" gutterBottom>
                      {t('approval.detail.applicant') || 'Applicant'}
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Avatar sx={{ width: 32, height: 32 }}>
                        {item.employee?.firstName?.[0] || 'U'}
                      </Avatar>
                      <Box>
                        <Typography variant="body1" fontWeight={500}>
                          {item.employee?.firstName} {item.employee?.lastName}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {item.employee?.email}
                        </Typography>
                      </Box>
                    </Box>
                  </Box>
                </Grid>

                <Grid item xs={12} md={6}>
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="caption" color="text.secondary" display="block" gutterBottom>
                      {t('expense.category') || 'Category'}
                    </Typography>
                    <Typography variant="body1">
                      {t(`expense.categories.${item.category}`) || item.category}
                      {item.subcategory && (
                        <Typography component="span" variant="caption" color="text.secondary" sx={{ ml: 1 }}>
                          ({item.subcategory})
                        </Typography>
                      )}
                    </Typography>
                  </Box>
                </Grid>

                <Grid item xs={12} md={6}>
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="caption" color="text.secondary" display="block" gutterBottom>
                      {t('expense.amount') || 'Amount'}
                    </Typography>
                    <Typography variant="h6" color="primary">
                      {formatCurrency(item.amount || item.totalAmount, item.currency)}
                    </Typography>
                  </Box>
                </Grid>

                <Grid item xs={12} md={6}>
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="caption" color="text.secondary" display="block" gutterBottom>
                      {t('expense.date') || 'Date'}
                    </Typography>
                    <Typography variant="body1">
                      {formatDate(item.expenseDate || item.date || item.createdAt)}
                    </Typography>
                  </Box>
                </Grid>

                {(item.project || item.costCenter) && (
                  <Grid item xs={12} md={6}>
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="caption" color="text.secondary" display="block" gutterBottom>
                        {t('expense.project') || 'Project'} / {t('expense.costCenter') || 'Cost Center'}
                      </Typography>
                      <Typography variant="body1">
                        {item.project || '-'} {item.costCenter && ` / ${item.costCenter}`}
                      </Typography>
                    </Box>
                  </Grid>
                )}

                {item.isBillable !== undefined && (
                  <Grid item xs={12} md={6}>
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="caption" color="text.secondary" display="block" gutterBottom>
                        {t('expense.billable') || 'Billable'}
                      </Typography>
                      <Chip 
                        label={item.isBillable ? t('common.yes') : t('common.no')} 
                        color={item.isBillable ? 'success' : 'default'} 
                        size="small" 
                      />
                    </Box>
                  </Grid>
                )}

                {item.description && (
                  <Grid item xs={12}>
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="caption" color="text.secondary" display="block" gutterBottom>
                        {t('expense.description') || 'Description'}
                      </Typography>
                      <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                        {item.description}
                      </Typography>
                    </Box>
                  </Grid>
                )}

                {item.notes && (
                  <Grid item xs={12}>
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="caption" color="text.secondary" display="block" gutterBottom>
                        {t('expense.notes') || 'Notes'}
                      </Typography>
                      <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                        {item.notes}
                      </Typography>
                    </Box>
                  </Grid>
                )}
              </Grid>
            )}
          </Paper>

          {/* 行程信息（仅差旅申请） */}
          {type === 'travel' && (item.outbound || item.inbound || (item.multiCityRoutes && item.multiCityRoutes.length > 0)) && (
            <Paper sx={{ p: 3, mb: 3 }}>
              <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <TravelIcon color="primary" fontSize="small" />
                {t('travel.detail.itinerary') || 'Itinerary'}
              </Typography>
              <Divider sx={{ mb: 2 }} />

              {/* 去程 */}
              {item.outbound && (item.outbound.departure || item.outbound.destination) && (
                <Box sx={{ mb: 2 }}>
                  <Typography variant="subtitle2" fontWeight={600} gutterBottom>
                    {t('travel.detail.outbound') || 'Outbound'}
                  </Typography>
                  <Card variant="outlined" sx={{ p: 2 }}>
                    <Grid container spacing={2}>
                      <Grid item xs={6} md={3}>
                        <Typography variant="caption" color="text.secondary" display="block">
                          {t('travel.detail.date') || 'Date'}
                        </Typography>
                        <Typography variant="body2">
                          {formatDate(item.outbound.date)}
                        </Typography>
                      </Grid>
                      <Grid item xs={6} md={3}>
                        <Typography variant="caption" color="text.secondary" display="block">
                          {t('travel.detail.from') || 'From'}
                        </Typography>
                        <Typography variant="body2">
                          {typeof item.outbound.departure === 'string' 
                            ? item.outbound.departure 
                            : (item.outbound.departure?.city || item.outbound.departure?.name || '-')}
                        </Typography>
                      </Grid>
                      <Grid item xs={6} md={3}>
                        <Typography variant="caption" color="text.secondary" display="block">
                          {t('travel.detail.to') || 'To'}
                        </Typography>
                        <Typography variant="body2">
                          {typeof item.outbound.destination === 'string' 
                            ? item.outbound.destination 
                            : (item.outbound.destination?.city || item.outbound.destination?.name || '-')}
                        </Typography>
                      </Grid>
                      {item.outbound.transportation && (
                        <Grid item xs={6} md={3}>
                          <Typography variant="caption" color="text.secondary" display="block">
                            {t('travel.detail.transportation') || 'Transportation'}
                          </Typography>
                          <Typography variant="body2">
                            {t(`travel.form.transportation.${item.outbound.transportation}`) || item.outbound.transportation}
                          </Typography>
                        </Grid>
                      )}
                    </Grid>
                  </Card>
                </Box>
              )}

              {/* 返程 */}
              {item.inbound && (item.inbound.departure || item.inbound.destination) && (
                <Box sx={{ mb: 2 }}>
                  <Typography variant="subtitle2" fontWeight={600} gutterBottom>
                    {t('travel.detail.inbound') || 'Inbound'}
                  </Typography>
                  <Card variant="outlined" sx={{ p: 2 }}>
                    <Grid container spacing={2}>
                      <Grid item xs={6} md={3}>
                        <Typography variant="caption" color="text.secondary" display="block">
                          {t('travel.detail.date') || 'Date'}
                        </Typography>
                        <Typography variant="body2">
                          {formatDate(item.inbound.date)}
                        </Typography>
                      </Grid>
                      <Grid item xs={6} md={3}>
                        <Typography variant="caption" color="text.secondary" display="block">
                          {t('travel.detail.from') || 'From'}
                        </Typography>
                        <Typography variant="body2">
                          {typeof item.inbound.departure === 'string' 
                            ? item.inbound.departure 
                            : (item.inbound.departure?.city || item.inbound.departure?.name || '-')}
                        </Typography>
                      </Grid>
                      <Grid item xs={6} md={3}>
                        <Typography variant="caption" color="text.secondary" display="block">
                          {t('travel.detail.to') || 'To'}
                        </Typography>
                        <Typography variant="body2">
                          {typeof item.inbound.destination === 'string' 
                            ? item.inbound.destination 
                            : (item.inbound.destination?.city || item.inbound.destination?.name || '-')}
                        </Typography>
                      </Grid>
                      {item.inbound.transportation && (
                        <Grid item xs={6} md={3}>
                          <Typography variant="caption" color="text.secondary" display="block">
                            {t('travel.detail.transportation') || 'Transportation'}
                          </Typography>
                          <Typography variant="body2">
                            {t(`travel.form.transportation.${item.inbound.transportation}`) || item.inbound.transportation}
                          </Typography>
                        </Grid>
                      )}
                    </Grid>
                  </Card>
                </Box>
              )}

              {/* 多程行程 */}
              {item.multiCityRoutes && item.multiCityRoutes.length > 0 && (
                <Box>
                  <Typography variant="subtitle2" fontWeight={600} gutterBottom>
                    {t('travel.detail.multiCityRoutes') || 'Multi-City Routes'} ({item.multiCityRoutes.length})
                  </Typography>
                  {item.multiCityRoutes.map((route, index) => (
                    <Card key={index} variant="outlined" sx={{ p: 2, mb: 1.5 }}>
                      <Typography variant="caption" color="primary" display="block" gutterBottom fontWeight={600}>
                        {t('travel.detail.route') || 'Route'} {index + 1}
                      </Typography>
                      <Grid container spacing={2}>
                        <Grid item xs={6} md={3}>
                          <Typography variant="caption" color="text.secondary" display="block">
                            {t('travel.detail.date') || 'Date'}
                          </Typography>
                          <Typography variant="body2">
                            {formatDate(route.date)}
                          </Typography>
                        </Grid>
                        <Grid item xs={6} md={3}>
                          <Typography variant="caption" color="text.secondary" display="block">
                            {t('travel.detail.from') || 'From'}
                          </Typography>
                          <Typography variant="body2">
                            {typeof route.departure === 'string' 
                              ? route.departure 
                              : (route.departure?.city || route.departure?.name || '-')}
                          </Typography>
                        </Grid>
                        <Grid item xs={6} md={3}>
                          <Typography variant="caption" color="text.secondary" display="block">
                            {t('travel.detail.to') || 'To'}
                          </Typography>
                          <Typography variant="body2">
                            {typeof route.destination === 'string' 
                              ? route.destination 
                              : (route.destination?.city || route.destination?.name || '-')}
                          </Typography>
                        </Grid>
                        {route.transportation && (
                          <Grid item xs={6} md={3}>
                            <Typography variant="caption" color="text.secondary" display="block">
                              {t('travel.detail.transportation') || 'Transportation'}
                            </Typography>
                            <Typography variant="body2">
                              {t(`travel.form.transportation.${route.transportation}`) || route.transportation}
                            </Typography>
                          </Grid>
                        )}
                      </Grid>
                    </Card>
                  ))}
                </Box>
              )}
            </Paper>
          )}

          {/* 供应商信息（仅费用申请） */}
          {type === 'expense' && item.vendor && item.vendor.name && (
            <Paper sx={{ p: 3, mb: 3 }}>
              <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <BusinessIcon color="primary" fontSize="small" />
                {t('expense.vendor') || 'Vendor Information'}
              </Typography>
              <Divider sx={{ mb: 2 }} />
              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <Typography variant="caption" color="text.secondary" display="block">
                    {t('expense.vendorName') || 'Vendor Name'}
                  </Typography>
                  <Typography variant="body1" fontWeight={500}>
                    {item.vendor.name}
                  </Typography>
                </Grid>
                {item.vendor.taxId && (
                  <Grid item xs={12} md={6}>
                    <Typography variant="caption" color="text.secondary" display="block">
                      {t('expense.taxId') || 'Tax ID'}
                    </Typography>
                    <Typography variant="body1">
                      {item.vendor.taxId}
                    </Typography>
                  </Grid>
                )}
                {item.vendor.address && (
                  <Grid item xs={12}>
                    <Typography variant="caption" color="text.secondary" display="block">
                      {t('expense.address') || 'Address'}
                    </Typography>
                    <Typography variant="body1">
                      {item.vendor.address}
                    </Typography>
                  </Grid>
                )}
              </Grid>
            </Paper>
          )}

          {/* 审批历史 */}
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <CommentIcon color="primary" fontSize="small" />
              {t('travel.detail.approvalHistory') || 'Approval History'}
            </Typography>
            <Divider sx={{ mb: 2 }} />

            {item.approvals && item.approvals.length > 0 ? (
              <Box sx={{ position: 'relative' }}>
                {/* 时间线连接线 */}
                <Box
                  sx={{
                    position: 'absolute',
                    left: 20,
                    top: 0,
                    bottom: 0,
                    width: 2,
                    bgcolor: 'divider',
                    zIndex: 0
                  }}
                />

                {item.approvals.map((approval, index) => {
                  const isLast = index === item.approvals.length - 1;
                  const isPending = approval.status === 'pending';
                  const isApproved = approval.status === 'approved';
                  const isRejected = approval.status === 'rejected';
                  // 确保审批级别有效：如果 approval.level 不存在或为0，使用 index + 1
                  const approvalLevel = (approval.level && approval.level > 0) ? approval.level : (index + 1);
                  // 如果是中文，将数字转换为中文数字
                  const displayLevel = i18n.language === 'zh' ? numberToChinese(approvalLevel) : approvalLevel;

                  return (
                    <Box
                      key={index}
                      sx={{
                        position: 'relative',
                        mb: isLast ? 0 : 2,
                        pl: 4
                      }}
                    >
                      {/* 时间线节点 */}
                      <Box
                        sx={{
                          position: 'absolute',
                          left: 12,
                          top: 8,
                          width: 16,
                          height: 16,
                          borderRadius: '50%',
                          border: 2,
                          borderColor: isPending
                            ? 'warning.main'
                            : isApproved
                            ? 'success.main'
                            : isRejected
                            ? 'error.main'
                            : 'divider',
                          bgcolor: 'background.paper',
                          zIndex: 1,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}
                      >
                        <Box
                          sx={{
                            width: 8,
                            height: 8,
                            borderRadius: '50%',
                            bgcolor: isPending
                              ? 'warning.main'
                              : isApproved
                              ? 'success.main'
                              : isRejected
                              ? 'error.main'
                              : 'divider'
                          }}
                        />
                      </Box>

                      {/* 审批卡片 */}
                      <Card
                        variant="outlined"
                        sx={{
                          p: 2,
                          bgcolor: isPending
                            ? 'warning.50'
                            : isApproved
                            ? 'success.50'
                            : isRejected
                            ? 'error.50'
                            : 'grey.50',
                          borderLeft: 3,
                          borderLeftColor: isPending
                            ? 'warning.main'
                            : isApproved
                            ? 'success.main'
                            : isRejected
                            ? 'error.main'
                            : 'divider',
                          transition: 'all 0.2s ease-in-out',
                          '&:hover': {
                            boxShadow: 2,
                            transform: 'translateX(4px)'
                          }
                        }}
                      >
                        {/* 审批人信息 */}
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
                          <PersonIcon sx={{ fontSize: 18, color: 'text.secondary' }} />
                          <Typography variant="body2" fontWeight={600} color="text.primary">
                            {approval.approver?.firstName} {approval.approver?.lastName || t('travel.detail.unknownApprover')}
                          </Typography>
                        </Box>

                        {/* 状态和级别 */}
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1.5, flexWrap: 'wrap' }}>
                          <Chip
                            icon={getApprovalStatusIcon(approval.status)}
                            label={t(`travel.approvalStatus.${approval.status}`) || approval.status}
                            color={getStatusColor(approval.status)}
                            size="small"
                            sx={{ fontWeight: 500 }}
                          />
                          <Chip
                            icon={<LabelIcon sx={{ fontSize: 14 }} />}
                            label={t('travel.detail.levelNumber', { level: displayLevel })}
                            variant="outlined"
                            size="small"
                            sx={{ fontSize: '0.75rem' }}
                          />
                        </Box>

                        {/* 审批时间 */}
                        {approval.approvedAt && (
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: approval.comments ? 1.5 : 0 }}>
                            <AccessTimeIcon sx={{ fontSize: 14, color: 'text.secondary' }} />
                            <Typography variant="caption" color="text.secondary">
                              {t('travel.detail.approvalDate')}: {formatDateTime(approval.approvedAt)}
                            </Typography>
                          </Box>
                        )}

                        {/* 审批意见 */}
                        {approval.comments && (
                          <Box
                            sx={{
                              mt: 1.5,
                              pt: 1.5,
                              borderTop: 1,
                              borderColor: 'divider'
                            }}
                          >
                            <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 0.5 }}>
                              <CommentIcon sx={{ fontSize: 16, color: 'text.secondary', mt: 0.25 }} />
                              <Box sx={{ flex: 1 }}>
                                <Typography variant="caption" color="text.secondary" display="block" gutterBottom>
                                  {t('travel.detail.comments')}
                                </Typography>
                                <Typography
                                  variant="body2"
                                  sx={{
                                    color: 'text.primary',
                                    whiteSpace: 'pre-wrap',
                                    wordBreak: 'break-word'
                                  }}
                                >
                                  {approval.comments}
                                </Typography>
                              </Box>
                            </Box>
                          </Box>
                        )}

                        {/* 待审批提示 */}
                        {isPending && !approval.approvedAt && (
                          <Box
                            sx={{
                              mt: 1.5,
                              pt: 1.5,
                              borderTop: 1,
                              borderColor: 'divider'
                            }}
                          >
                            <Typography variant="caption" color="warning.main" sx={{ fontStyle: 'italic' }}>
                              {t('travel.detail.pendingApproval')}
                            </Typography>
                          </Box>
                        )}
                      </Card>
                    </Box>
                  );
                })}
              </Box>
            ) : (
              <Box
                sx={{
                  py: 4,
                  textAlign: 'center',
                  color: 'text.secondary'
                }}
              >
                <CommentIcon sx={{ fontSize: 48, opacity: 0.3, mb: 1 }} />
                <Typography variant="body2">
                  {t('travel.detail.noApprovalHistory')}
                </Typography>
              </Box>
            )}
          </Paper>

          {/* 附件（如果有） */}
          {((type === 'travel' && item.attachments && item.attachments.length > 0) || 
            (type === 'expense' && item.receipts && item.receipts.length > 0)) && (
            <Paper sx={{ p: 3, mb: 3 }}>
              <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <AttachFileIcon color="primary" fontSize="small" />
                {type === 'travel' 
                  ? (t('travel.detail.attachments') || 'Attachments')
                  : (t('expense.receipts') || 'Receipts & Attachments')}
              </Typography>
              <Divider sx={{ mb: 2 }} />
              <List dense>
                {(type === 'travel' ? item.attachments : item.receipts).map((file, index) => (
                  <ListItem key={index}>
                    <ListItemIcon>
                      <AttachFileIcon />
                    </ListItemIcon>
                    <ListItemText
                      primary={file.originalName || file.filename}
                      secondary={file.size ? `${(file.size / 1024 / 1024).toFixed(2)} MB` : ''}
                    />
                  </ListItem>
                ))}
              </List>
            </Paper>
          )}

          {/* 标签（仅费用申请） */}
          {type === 'expense' && item.tags && item.tags.length > 0 && (
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                {t('expense.tagsLabel') || 'Tags'}
              </Typography>
              <Divider sx={{ mb: 2 }} />
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                {item.tags.map((tag, index) => (
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

        {/* 右侧信息栏 */}
        <Grid item xs={12} md={4}>
          {/* 审批操作卡片 */}
          {canApprove() && (
            <Card sx={{ mb: 3 }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  {t('approval.detail.approvalActions') || 'Approval Actions'}
                </Typography>
                <Divider sx={{ mb: 2 }} />
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  <Button
                    variant="contained"
                    color="success"
                    fullWidth
                    startIcon={<ApproveIcon />}
                    onClick={() => handleOpenApprovalDialog('approve')}
                  >
                    {t('approval.detail.approve') || 'Approve'}
                  </Button>
                  <Button
                    variant="contained"
                    color="error"
                    fullWidth
                    startIcon={<RejectIcon />}
                    onClick={() => handleOpenApprovalDialog('reject')}
                  >
                    {t('approval.detail.reject') || 'Reject'}
                  </Button>
                </Box>
              </CardContent>
            </Card>
          )}

          {/* 申请信息摘要 */}
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                {t('approval.detail.summary') || 'Summary'}
              </Typography>
              <Divider sx={{ mb: 2 }} />
              <List dense>
                <ListItem>
                  <ListItemIcon>
                    <PersonIcon fontSize="small" />
                  </ListItemIcon>
                  <ListItemText
                    primary={t('approval.detail.applicant') || 'Applicant'}
                    secondary={`${item.employee?.firstName} ${item.employee?.lastName}`}
                  />
                </ListItem>
                <ListItem>
                  <ListItemIcon>
                    <CalendarIcon fontSize="small" />
                  </ListItemIcon>
                  <ListItemText
                    primary={t('approval.detail.createdOn') || 'Created On'}
                    secondary={formatDate(item.createdAt)}
                  />
                </ListItem>
                <ListItem>
                  <ListItemIcon>
                    <MoneyIcon fontSize="small" />
                  </ListItemIcon>
                  <ListItemText
                    primary={t('approval.detail.amount') || 'Amount'}
                    secondary={formatCurrency(
                      type === 'travel' 
                        ? (item.estimatedBudget || item.estimatedCost)
                        : (item.amount || item.totalAmount),
                      item.currency
                    )}
                  />
                </ListItem>
                <ListItem>
                  <ListItemIcon>
                    <ApprovalIcon fontSize="small" />
                  </ListItemIcon>
                  <ListItemText
                    primary={t('approval.detail.status') || 'Status'}
                    secondary={
                      <Chip
                        label={t(`travel.statuses.${item.status}`) || item.status}
                        color={getStatusColor(item.status)}
                        size="small"
                      />
                    }
                  />
                </ListItem>
              </List>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* 审批对话框 */}
      <Dialog
        open={approvalDialogOpen}
        onClose={handleCloseApprovalDialog}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          {approvalAction === 'approve'
            ? (t('approval.detail.approveTitle') || 'Approve Request')
            : (t('approval.detail.rejectTitle') || 'Reject Request')
          }
        </DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label={t('approval.detail.approvalComment') || 'Approval Comment'}
            placeholder={
              approvalAction === 'approve'
                ? (t('approval.detail.approveCommentPlaceholder') || 'Please enter approval comments...')
                : (t('approval.detail.rejectCommentPlaceholder') || 'Please explain the reason for rejection...')
            }
            fullWidth
            multiline
            rows={4}
            value={approvalComment}
            onChange={(e) => setApprovalComment(e.target.value)}
            required
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseApprovalDialog}>
            {t('common.cancel') || t('approval.detail.cancel') || 'Cancel'}
          </Button>
          <Button
            onClick={handleSubmitApproval}
            variant="contained"
            color={approvalAction === 'approve' ? 'success' : 'error'}
            disabled={submitting || !approvalComment.trim()}
          >
            {submitting
              ? (t('common.submitting') || t('approval.detail.submitting') || 'Submitting...')
              : approvalAction === 'approve'
              ? (t('approval.detail.confirmApprove') || 'Confirm Approval')
              : (t('approval.detail.confirmReject') || 'Confirm Rejection')
            }
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default ApprovalDetail;
