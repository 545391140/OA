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
  Description as DescriptionIcon
} from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../contexts/AuthContext';
import { useNotification } from '../../contexts/NotificationContext';
import apiClient from '../../utils/axiosConfig';
import dayjs from 'dayjs';

const ApprovalDetail = () => {
  const { t } = useTranslation();
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
                      {t('travel.detail.purpose') || 'Purpose'}
                    </Typography>
                    <Typography variant="body1">
                      {item.purpose || '-'}
                    </Typography>
                  </Box>
                </Grid>

                <Grid item xs={12} md={6}>
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="caption" color="text.secondary" display="block" gutterBottom>
                      {t('travel.detail.destination') || 'Destination'}
                    </Typography>
                    <Typography variant="body1">
                      {item.destination?.city || item.destination?.name || item.destination || '-'}
                    </Typography>
                  </Box>
                </Grid>

                <Grid item xs={12} md={6}>
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="caption" color="text.secondary" display="block" gutterBottom>
                      {t('travel.detail.travelDates') || 'Travel Dates'}
                    </Typography>
                    <Typography variant="body1">
                      {item.outbound?.date ? formatDate(item.outbound.date) : '-'}
                      {item.inbound?.date && ` - ${formatDate(item.inbound.date)}`}
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
              </Grid>
            )}
          </Paper>

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
                            label={t('travel.detail.levelNumber', { level: approval.level })}
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
