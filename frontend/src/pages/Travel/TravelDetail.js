import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Container,
  Box,
  Typography,
  Paper,
  Grid,
  Chip,
  Button,
  Divider,
  LinearProgress,
  Alert,
  IconButton,
  Card,
  CardContent,
  Table,
  TableBody,
  TableRow,
  TableCell,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  ExpandMore as ExpandMoreIcon,
  Flight as FlightIcon,
  Train as TrainIcon,
  DirectionsCar as CarIcon,
  DirectionsBus as BusIcon,
  LocationOn as LocationIcon,
  CalendarToday as CalendarIcon,
  Person as PersonIcon,
  Business as BusinessIcon,
  Description as DescriptionIcon,
  AttachMoney as MoneyIcon,
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
  Comment as CommentIcon
} from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../contexts/AuthContext';
import { useNotification } from '../../contexts/NotificationContext';
import apiClient from '../../utils/axiosConfig';
import dayjs from 'dayjs';

const TravelDetail = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { showNotification } = useNotification();
  const { id } = useParams();
  const navigate = useNavigate();

  const [travel, setTravel] = useState(null);
  const [loading, setLoading] = useState(true);
  const [approvalDialogOpen, setApprovalDialogOpen] = useState(false);
  const [approvalAction, setApprovalAction] = useState(''); // 'approve' or 'reject'
  const [approvalComment, setApprovalComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [expenseItems, setExpenseItems] = useState({});

  useEffect(() => {
    fetchExpenseItems();
    fetchTravelDetail();
  }, [id]);

  const fetchExpenseItems = async () => {
    try {
      const response = await apiClient.get('/expense-items');
      if (response.data && response.data.success) {
        // 创建ID到名称的映射
        const itemsMap = {};
        response.data.data.forEach(item => {
          itemsMap[item._id] = item.itemName;
        });
        setExpenseItems(itemsMap);
      }
    } catch (error) {
      console.error('Failed to load expense items:', error);
    }
  };

  const fetchTravelDetail = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get(`/travel/${id}`);
      
      if (response.data && response.data.success) {
        setTravel(response.data.data);
      } else {
        throw new Error('Failed to load travel details');
      }
    } catch (error) {
      console.error('Failed to load travel detail:', error);
      showNotification(t('travel.detail.loadError') || '加载失败', 'error');
      setTravel(null);
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
      completed: 'success',
      cancelled: 'error'
    };
    return colors[status] || 'default';
  };

  const getTransportIcon = (type) => {
    const icons = {
      flight: <FlightIcon />,
      train: <TrainIcon />,
      car: <CarIcon />,
      bus: <BusIcon />
    };
    return icons[type] || <FlightIcon />;
  };

  const formatCurrency = (amount) => {
    return `¥${parseFloat(amount || 0).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const formatDate = (date) => {
    return date ? dayjs(date).format('YYYY-MM-DD') : '-';
  };

  const handleEdit = () => {
    navigate(`/travel/${id}/edit`);
  };

  const handleDelete = async () => {
    if (window.confirm(t('travel.detail.confirmDelete') || '确定要删除这条差旅申请吗？')) {
      try {
        await apiClient.delete(`/travel/${id}`);
        showNotification(t('travel.detail.deleteSuccess') || '删除成功', 'success');
        navigate('/travel');
      } catch (error) {
        showNotification(t('travel.detail.deleteError') || '删除失败', 'error');
      }
    }
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
      showNotification(t('travel.detail.commentRequired') || '请输入审批意见', 'warning');
      return;
    }

    try {
      setSubmitting(true);
      const endpoint = approvalAction === 'approve' ? 'approve' : 'reject';
      await apiClient.post(`/travel/${id}/${endpoint}`, {
        comments: approvalComment
      });
      
      showNotification(
        approvalAction === 'approve' 
          ? (t('travel.detail.approveSuccess') || '审批通过') 
          : (t('travel.detail.rejectSuccess') || '已拒绝'),
        'success'
      );
      
      handleCloseApprovalDialog();
      fetchTravelDetail(); // 刷新数据
    } catch (error) {
      console.error('Approval error:', error);
      showNotification(
        error.response?.data?.message || t('travel.detail.approvalError') || '审批失败',
        'error'
      );
    } finally {
      setSubmitting(false);
    }
  };

  // 检查当前用户是否可以审批
  const canApprove = () => {
    if (!user || !travel) return false;
    if (user.role !== 'admin' && user.role !== 'manager') return false;
    if (travel.status !== 'submitted') return false;
    return true;
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

  if (!travel) {
    return (
      <Container maxWidth="xl">
        <Box sx={{ py: 3 }}>
          <Alert severity="error">
            {t('travel.detail.notFound') || '未找到差旅申请'}
          </Alert>
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ py: 3 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
        <IconButton onClick={() => navigate('/travel')}>
          <ArrowBackIcon />
        </IconButton>
        <Box sx={{ flexGrow: 1 }}>
          <Typography variant="h4" gutterBottom>
            {travel.title || t('travel.detail.title')}
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Chip
              label={t(`travel.statuses.${travel.status}`) || travel.status}
              color={getStatusColor(travel.status)}
              size="small"
            />
            {travel.travelNumber && (
              <Typography variant="body2" color="text.secondary">
                {t('travel.detail.travelNumber')}: {travel.travelNumber}
              </Typography>
            )}
            <Typography variant="body2" color="text.secondary">
              {t('travel.detail.createdOn')}: {formatDate(travel.createdAt)}
            </Typography>
          </Box>
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          {/* 编辑和删除按钮 - 仅草稿状态 */}
          {(user?.role === 'admin' || travel.employee?._id === user?.id) && travel.status === 'draft' && (
            <>
              <Button
                variant="contained"
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
          
          {/* 审批按钮 - 管理员和经理可见，仅已提交状态 */}
          {canApprove() && (
            <>
              <Button
                variant="contained"
                color="success"
                startIcon={<CheckCircleIcon />}
                onClick={() => handleOpenApprovalDialog('approve')}
              >
                {t('travel.detail.approve')}
              </Button>
              <Button
                variant="contained"
                color="error"
                startIcon={<CancelIcon />}
                onClick={() => handleOpenApprovalDialog('reject')}
              >
                {t('travel.detail.reject')}
              </Button>
            </>
          )}
        </Box>
      </Box>

      <Grid container spacing={2}>
        {/* 左侧主要内容 */}
        <Grid item xs={12} md={8}>
          {/* 基本信息 */}
          <Paper sx={{ p: 2, mb: 2 }}>
            <Typography variant="subtitle1" fontWeight={600} gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <DescriptionIcon color="primary" fontSize="small" />
              {t('travel.detail.basicInfo')}
            </Typography>
            <Divider sx={{ mb: 1.5 }} />
            
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <Box sx={{ mb: 1 }}>
                  <Typography variant="caption" color="text.secondary" display="block">
                    {t('travel.detail.applicant')}
                  </Typography>
                  <Typography variant="body2">
                    {travel.employee?.firstName} {travel.employee?.lastName}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {travel.employee?.email}
                  </Typography>
                </Box>
              </Grid>

              <Grid item xs={12} md={6}>
                <Box sx={{ mb: 1 }}>
                  <Typography variant="caption" color="text.secondary" display="block">
                    {t('travel.detail.department')}
                  </Typography>
                  <Typography variant="body2">
                    {travel.costOwingDepartment || travel.employee?.department || '-'}
                  </Typography>
                </Box>
              </Grid>

              <Grid item xs={12} md={6}>
                <Box sx={{ mb: 1 }}>
                  <Typography variant="caption" color="text.secondary" display="block">
                    {t('travel.detail.travelType')}
                  </Typography>
                  <Typography variant="body2">
                    {travel.tripType === 'international' ? t('travel.international') : t('travel.domestic')}
                  </Typography>
                </Box>
              </Grid>

              <Grid item xs={12} md={6}>
                <Box sx={{ mb: 1 }}>
                  <Typography variant="caption" color="text.secondary" display="block">
                    {t('travel.detail.destination')}
                  </Typography>
                  <Typography variant="body2">
                    {typeof travel.destination === 'string' 
                      ? travel.destination 
                      : (travel.destination?.city || travel.destination?.name || '-')}
                  </Typography>
                </Box>
              </Grid>

              <Grid item xs={12} md={6}>
                <Box sx={{ mb: 1 }}>
                  <Typography variant="caption" color="text.secondary" display="block">
                    {t('travel.detail.travelDates')}
                  </Typography>
                  <Typography variant="body2">
                    {formatDate(travel.startDate)} ~ {formatDate(travel.endDate)}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {dayjs(travel.endDate).diff(dayjs(travel.startDate), 'days')} {t('travel.detail.days')}
                  </Typography>
                </Box>
              </Grid>

              <Grid item xs={12} md={6}>
                <Box sx={{ mb: 1 }}>
                  <Typography variant="caption" color="text.secondary" display="block">
                    {t('travel.detail.purpose')}
                  </Typography>
                  <Typography variant="body2">
                    {travel.purpose || travel.tripDescription || '-'}
                  </Typography>
                </Box>
              </Grid>

              {travel.comment && (
                <Grid item xs={12}>
                  <Box sx={{ mb: 1 }}>
                    <Typography variant="caption" color="text.secondary" display="block">
                      {t('travel.detail.comment')}
                    </Typography>
                    <Typography variant="body2">
                      {travel.comment}
                    </Typography>
                  </Box>
                </Grid>
              )}
            </Grid>
          </Paper>

          {/* 行程信息 */}
          <Paper sx={{ p: 2, mb: 2 }}>
            <Typography variant="subtitle1" fontWeight={600} gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <FlightIcon color="primary" fontSize="small" />
              {t('travel.detail.itinerary')}
            </Typography>
            <Divider sx={{ mb: 1.5 }} />

            {/* 去程 */}
            {travel.outbound && (travel.outbound.departure || travel.outbound.destination) && (
              <Box sx={{ mb: 1.5 }}>
                <Typography variant="body2" fontWeight={600} gutterBottom>
                  {t('travel.detail.outbound')}
                </Typography>
                <Card variant="outlined" sx={{ p: 1.5 }}>
                  <Grid container spacing={1.5}>
                    <Grid item xs={6} md={3}>
                      <Typography variant="caption" color="text.secondary" display="block">
                        {t('travel.detail.date')}
                      </Typography>
                      <Typography variant="body2">
                        {formatDate(travel.outbound.date)}
                      </Typography>
                    </Grid>
                    <Grid item xs={6} md={3}>
                      <Typography variant="caption" color="text.secondary" display="block">
                        {t('travel.detail.from')}
                      </Typography>
                      <Typography variant="body2">
                        {travel.outbound.departure || '-'}
                      </Typography>
                    </Grid>
                    <Grid item xs={6} md={3}>
                      <Typography variant="caption" color="text.secondary" display="block">
                        {t('travel.detail.to')}
                      </Typography>
                      <Typography variant="body2">
                        {travel.outbound.destination || '-'}
                      </Typography>
                    </Grid>
                    <Grid item xs={6} md={3}>
                      <Typography variant="caption" color="text.secondary" display="block">
                        {t('travel.detail.transportation')}
                      </Typography>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        {getTransportIcon(travel.outbound.transportation)}
                        <Typography variant="body2">
                          {t(`travel.form.transportation.${travel.outbound.transportation}`) || travel.outbound.transportation || '-'}
                        </Typography>
                      </Box>
                    </Grid>
                  </Grid>
                </Card>
              </Box>
            )}

            {/* 返程 */}
            {travel.inbound && (travel.inbound.departure || travel.inbound.destination) && (
              <Box sx={{ mb: 1.5 }}>
                <Typography variant="body2" fontWeight={600} gutterBottom>
                  {t('travel.detail.inbound')}
                </Typography>
                <Card variant="outlined" sx={{ p: 1.5 }}>
                  <Grid container spacing={1.5}>
                    <Grid item xs={6} md={3}>
                      <Typography variant="caption" color="text.secondary" display="block">
                        {t('travel.detail.date')}
                      </Typography>
                      <Typography variant="body2">
                        {formatDate(travel.inbound.date)}
                      </Typography>
                    </Grid>
                    <Grid item xs={6} md={3}>
                      <Typography variant="caption" color="text.secondary" display="block">
                        {t('travel.detail.from')}
                      </Typography>
                      <Typography variant="body2">
                        {travel.inbound.departure || '-'}
                      </Typography>
                    </Grid>
                    <Grid item xs={6} md={3}>
                      <Typography variant="caption" color="text.secondary" display="block">
                        {t('travel.detail.to')}
                      </Typography>
                      <Typography variant="body2">
                        {travel.inbound.destination || '-'}
                      </Typography>
                    </Grid>
                    <Grid item xs={6} md={3}>
                      <Typography variant="caption" color="text.secondary" display="block">
                        {t('travel.detail.transportation')}
                      </Typography>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        {getTransportIcon(travel.inbound.transportation)}
                        <Typography variant="body2">
                          {t(`travel.form.transportation.${travel.inbound.transportation}`) || travel.inbound.transportation || '-'}
                        </Typography>
                      </Box>
                    </Grid>
                  </Grid>
                </Card>
              </Box>
            )}

            {/* 多程行程 */}
            {travel.multiCityRoutes && travel.multiCityRoutes.length > 0 && (
              <Box>
                <Typography variant="body2" fontWeight={600} gutterBottom>
                  {t('travel.detail.multiCityRoutes')} ({travel.multiCityRoutes.length})
                </Typography>
                {travel.multiCityRoutes.map((route, index) => (
                  <Card key={index} variant="outlined" sx={{ p: 1.5, mb: 1.5 }}>
                    <Typography variant="caption" color="primary" display="block" gutterBottom>
                      {t('travel.detail.route')} {index + 1}
                    </Typography>
                    <Grid container spacing={1.5}>
                      <Grid item xs={6} md={3}>
                        <Typography variant="caption" color="text.secondary" display="block">
                          {t('travel.detail.date')}
                        </Typography>
                        <Typography variant="body2">
                          {formatDate(route.date)}
                        </Typography>
                      </Grid>
                      <Grid item xs={6} md={3}>
                        <Typography variant="caption" color="text.secondary" display="block">
                          {t('travel.detail.from')}
                        </Typography>
                        <Typography variant="body2">
                          {route.departure || '-'}
                        </Typography>
                      </Grid>
                      <Grid item xs={6} md={3}>
                        <Typography variant="caption" color="text.secondary" display="block">
                          {t('travel.detail.to')}
                        </Typography>
                        <Typography variant="body2">
                          {route.destination || '-'}
                        </Typography>
                      </Grid>
                      <Grid item xs={6} md={3}>
                        <Typography variant="caption" color="text.secondary" display="block">
                          {t('travel.detail.transportation')}
                        </Typography>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          {getTransportIcon(route.transportation)}
                          <Typography variant="body2">
                            {t(`travel.form.transportation.${route.transportation}`) || route.transportation || '-'}
                          </Typography>
                        </Box>
                      </Grid>
                    </Grid>
                  </Card>
                ))}
              </Box>
            )}
          </Paper>

          {/* 费用预算 */}
          <Paper sx={{ p: 2, mb: 2 }}>
            <Typography variant="subtitle1" fontWeight={600} gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <MoneyIcon color="primary" fontSize="small" />
              {t('travel.detail.budgetInfo')}
            </Typography>
            <Divider sx={{ mb: 1.5 }} />

            <Grid container spacing={1.5}>
              {/* 预算总览 */}
              <Grid item xs={12} md={4}>
                <Card variant="outlined" sx={{ p: 1.5, bgcolor: 'primary.50' }}>
                  <Typography variant="caption" color="text.secondary" display="block">
                    {t('travel.detail.estimatedBudget')}
                  </Typography>
                  <Typography variant="h6" color="primary">
                    {formatCurrency(travel.estimatedBudget || 0)}
                  </Typography>
                </Card>
              </Grid>

              {travel.actualCost !== undefined && (
                <Grid item xs={12} md={4}>
                  <Card variant="outlined" sx={{ p: 1.5, bgcolor: 'success.50' }}>
                    <Typography variant="caption" color="text.secondary" display="block">
                      {t('travel.detail.actualCost')}
                    </Typography>
                    <Typography variant="h6" color="success.main">
                      {formatCurrency(travel.actualCost || 0)}
                    </Typography>
                  </Card>
                </Grid>
              )}

              {travel.actualCost !== undefined && (
                <Grid item xs={12} md={4}>
                  <Card variant="outlined" sx={{ p: 1.5, bgcolor: travel.actualCost <= travel.estimatedBudget ? 'success.50' : 'error.50' }}>
                    <Typography variant="caption" color="text.secondary" display="block">
                      {t('travel.detail.variance')}
                    </Typography>
                    <Typography 
                      variant="h6" 
                      color={travel.actualCost <= travel.estimatedBudget ? 'success.main' : 'error.main'}
                    >
                      {formatCurrency((travel.estimatedBudget || 0) - (travel.actualCost || 0))}
                    </Typography>
                  </Card>
                </Grid>
              )}

              {/* 去程预算明细 */}
              {travel.outboundBudget && Object.keys(travel.outboundBudget).length > 0 && (
                <Grid item xs={12}>
                  <Accordion>
                    <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                      <Typography variant="subtitle1" fontWeight={600}>
                        {t('travel.detail.outboundBudget')}
                      </Typography>
                    </AccordionSummary>
                    <AccordionDetails>
                      <Table size="small">
                        <TableBody>
                          {Object.entries(travel.outboundBudget).map(([key, value]) => {
                            // value可能是对象 {subtotal: number} 或直接是数字
                            const amount = typeof value === 'object' ? (value.subtotal || 0) : (typeof value === 'number' ? value : 0);
                            return (
                              <TableRow key={key}>
                                <TableCell>{expenseItems[key] || key}</TableCell>
                                <TableCell align="right">{formatCurrency(amount)}</TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </AccordionDetails>
                  </Accordion>
                </Grid>
              )}

              {/* 返程预算明细 */}
              {travel.inboundBudget && Object.keys(travel.inboundBudget).length > 0 && (
                <Grid item xs={12}>
                  <Accordion>
                    <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                      <Typography variant="subtitle1" fontWeight={600}>
                        {t('travel.detail.inboundBudget')}
                      </Typography>
                    </AccordionSummary>
                    <AccordionDetails>
                      <Table size="small">
                        <TableBody>
                          {Object.entries(travel.inboundBudget).map(([key, value]) => {
                            // value可能是对象 {subtotal: number} 或直接是数字
                            const amount = typeof value === 'object' ? (value.subtotal || 0) : (typeof value === 'number' ? value : 0);
                            return (
                              <TableRow key={key}>
                                <TableCell>{expenseItems[key] || key}</TableCell>
                                <TableCell align="right">{formatCurrency(amount)}</TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </AccordionDetails>
                  </Accordion>
                </Grid>
              )}

              {/* 多程预算明细 */}
              {travel.multiCityRoutesBudget && travel.multiCityRoutesBudget.length > 0 && (
                <Grid item xs={12}>
                  <Accordion>
                    <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                      <Typography variant="subtitle1" fontWeight={600}>
                        {t('travel.detail.multiCityBudget')} ({travel.multiCityRoutesBudget.length})
                      </Typography>
                    </AccordionSummary>
                    <AccordionDetails>
                      {travel.multiCityRoutesBudget.map((budget, index) => (
                        <Box key={index} sx={{ mb: 2 }}>
                          <Typography variant="subtitle2" color="primary" gutterBottom>
                            {t('travel.detail.route')} {index + 1}
                          </Typography>
                          <Table size="small">
                            <TableBody>
                              {Object.entries(budget).map(([key, value]) => {
                                // value可能是对象 {subtotal: number} 或直接是数字
                                const amount = typeof value === 'object' ? (value.subtotal || 0) : (typeof value === 'number' ? value : 0);
                                return (
                                  <TableRow key={key}>
                                    <TableCell>{expenseItems[key] || key}</TableCell>
                                    <TableCell align="right">{formatCurrency(amount)}</TableCell>
                                  </TableRow>
                                );
                              })}
                            </TableBody>
                          </Table>
                        </Box>
                      ))}
                    </AccordionDetails>
                  </Accordion>
                </Grid>
              )}
            </Grid>
          </Paper>
        </Grid>

        {/* 右侧边栏 */}
        <Grid item xs={12} md={4}>
          {/* 审批信息 */}
          <Paper sx={{ p: 2, mb: 2 }}>
            <Typography variant="subtitle1" fontWeight={600} gutterBottom>
              {t('travel.detail.approvalHistory')}
            </Typography>
            <Divider sx={{ mb: 1.5 }} />
            
            {travel.approvals && travel.approvals.length > 0 ? (
              travel.approvals.map((approval, index) => (
                <Card key={index} variant="outlined" sx={{ p: 1.5, mb: 1.5 }}>
                  <Grid container spacing={1}>
                    <Grid item xs={12}>
                      <Typography variant="caption" color="text.secondary" display="block">
                        {t('travel.detail.approver')}
                      </Typography>
                      <Typography variant="body2" fontWeight={500}>
                        {approval.approver?.firstName} {approval.approver?.lastName}
                      </Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="caption" color="text.secondary" display="block">
                        {t('travel.detail.level')}
                      </Typography>
                      <Typography variant="body2">
                        {t('travel.detail.levelNumber', { level: approval.level })}
                      </Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="caption" color="text.secondary" display="block">
                        {t('common.status')}
                      </Typography>
                      <Chip
                        label={t(`travel.approvalStatus.${approval.status}`) || approval.status}
                        color={getStatusColor(approval.status)}
                        size="small"
                      />
                    </Grid>
                    <Grid item xs={12}>
                      <Typography variant="caption" color="text.secondary" display="block">
                        {t('travel.detail.approvalDate')}
                      </Typography>
                      <Typography variant="body2">
                        {formatDate(approval.approvedAt)}
                      </Typography>
                    </Grid>
                    {approval.comments && (
                      <Grid item xs={12}>
                        <Typography variant="caption" color="text.secondary" display="block">
                          {t('travel.detail.comments')}
                        </Typography>
                        <Typography variant="body2">
                          {approval.comments}
                        </Typography>
                      </Grid>
                    )}
                  </Grid>
                </Card>
              ))
            ) : (
              <Typography variant="body2" color="text.secondary" textAlign="center" sx={{ py: 1 }}>
                {t('travel.detail.nA')}
              </Typography>
            )}
          </Paper>
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
            ? t('travel.detail.approveTitle') || '审批通过' 
            : t('travel.detail.rejectTitle') || '拒绝申请'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            <TextField
              fullWidth
              multiline
              rows={4}
              label={t('travel.detail.approvalComment') || '审批意见'}
              placeholder={
                approvalAction === 'approve'
                  ? (t('travel.detail.approveCommentPlaceholder') || '请输入审批意见...')
                  : (t('travel.detail.rejectCommentPlaceholder') || '请说明拒绝原因...')
              }
              value={approvalComment}
              onChange={(e) => setApprovalComment(e.target.value)}
              required
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseApprovalDialog} disabled={submitting}>
            {t('common.cancel')}
          </Button>
          <Button
            onClick={handleSubmitApproval}
            variant="contained"
            color={approvalAction === 'approve' ? 'success' : 'error'}
            disabled={submitting || !approvalComment.trim()}
            startIcon={approvalAction === 'approve' ? <CheckCircleIcon /> : <CancelIcon />}
          >
            {submitting 
              ? (t('common.submitting') || '提交中...') 
              : (approvalAction === 'approve' 
                  ? (t('travel.detail.confirmApprove') || '确认通过') 
                  : (t('travel.detail.confirmReject') || '确认拒绝')
                )
            }
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default TravelDetail;
