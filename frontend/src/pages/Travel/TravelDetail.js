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
  AccordionDetails
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
  AttachMoney as MoneyIcon
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

  useEffect(() => {
    fetchTravelDetail();
  }, [id]);

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
        {(user?.role === 'admin' || travel.employee?._id === user?.id) && travel.status === 'draft' && (
          <Box sx={{ display: 'flex', gap: 1 }}>
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
          </Box>
        )}
      </Box>

      <Grid container spacing={3}>
        {/* 基本信息 */}
        <Grid item xs={12}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <DescriptionIcon color="primary" />
              {t('travel.detail.basicInfo')}
            </Typography>
            <Divider sx={{ my: 2 }} />
            
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <Box sx={{ mb: 2 }}>
                  <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                    {t('travel.detail.applicant')}
                  </Typography>
                  <Typography variant="body1">
                    {travel.employee?.firstName} {travel.employee?.lastName}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {travel.employee?.email}
                  </Typography>
                </Box>
              </Grid>

              <Grid item xs={12} md={6}>
                <Box sx={{ mb: 2 }}>
                  <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                    {t('travel.detail.department')}
                  </Typography>
                  <Typography variant="body1">
                    {travel.costOwingDepartment || travel.employee?.department || '-'}
                  </Typography>
                </Box>
              </Grid>

              <Grid item xs={12} md={6}>
                <Box sx={{ mb: 2 }}>
                  <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                    {t('travel.detail.travelType')}
                  </Typography>
                  <Typography variant="body1">
                    {travel.tripType === 'international' ? t('travel.international') : t('travel.domestic')}
                  </Typography>
                </Box>
              </Grid>

              <Grid item xs={12} md={6}>
                <Box sx={{ mb: 2 }}>
                  <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                    {t('travel.detail.destination')}
                  </Typography>
                  <Typography variant="body1">
                    {typeof travel.destination === 'string' 
                      ? travel.destination 
                      : (travel.destination?.city || travel.destination?.name || '-')}
                  </Typography>
                </Box>
              </Grid>

              <Grid item xs={12} md={6}>
                <Box sx={{ mb: 2 }}>
                  <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                    {t('travel.detail.travelDates')}
                  </Typography>
                  <Typography variant="body1">
                    {formatDate(travel.startDate)} ~ {formatDate(travel.endDate)}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {dayjs(travel.endDate).diff(dayjs(travel.startDate), 'days')} {t('travel.detail.days')}
                  </Typography>
                </Box>
              </Grid>

              <Grid item xs={12}>
                <Box sx={{ mb: 2 }}>
                  <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                    {t('travel.detail.purpose')}
                  </Typography>
                  <Typography variant="body1">
                    {travel.purpose || travel.tripDescription || '-'}
                  </Typography>
                </Box>
              </Grid>

              {travel.comment && (
                <Grid item xs={12}>
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                      {t('travel.detail.comment')}
                    </Typography>
                    <Typography variant="body1">
                      {travel.comment}
                    </Typography>
                  </Box>
                </Grid>
              )}
            </Grid>
          </Paper>
        </Grid>

        {/* 行程信息 */}
        <Grid item xs={12}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <FlightIcon color="primary" />
              {t('travel.detail.itinerary')}
            </Typography>
            <Divider sx={{ my: 2 }} />

            {/* 去程 */}
            {travel.outbound && (travel.outbound.departure || travel.outbound.destination) && (
              <Box sx={{ mb: 3 }}>
                <Typography variant="subtitle1" fontWeight={600} gutterBottom>
                  {t('travel.detail.outbound')}
                </Typography>
                <Card variant="outlined" sx={{ p: 2 }}>
                  <Grid container spacing={2}>
                    <Grid item xs={12} md={3}>
                      <Typography variant="caption" color="text.secondary">
                        {t('travel.detail.date')}
                      </Typography>
                      <Typography variant="body2">
                        {formatDate(travel.outbound.date)}
                      </Typography>
                    </Grid>
                    <Grid item xs={12} md={3}>
                      <Typography variant="caption" color="text.secondary">
                        {t('travel.detail.from')}
                      </Typography>
                      <Typography variant="body2">
                        {travel.outbound.departure || '-'}
                      </Typography>
                    </Grid>
                    <Grid item xs={12} md={3}>
                      <Typography variant="caption" color="text.secondary">
                        {t('travel.detail.to')}
                      </Typography>
                      <Typography variant="body2">
                        {travel.outbound.destination || '-'}
                      </Typography>
                    </Grid>
                    <Grid item xs={12} md={3}>
                      <Typography variant="caption" color="text.secondary">
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
              <Box sx={{ mb: 3 }}>
                <Typography variant="subtitle1" fontWeight={600} gutterBottom>
                  {t('travel.detail.inbound')}
                </Typography>
                <Card variant="outlined" sx={{ p: 2 }}>
                  <Grid container spacing={2}>
                    <Grid item xs={12} md={3}>
                      <Typography variant="caption" color="text.secondary">
                        {t('travel.detail.date')}
                      </Typography>
                      <Typography variant="body2">
                        {formatDate(travel.inbound.date)}
                      </Typography>
                    </Grid>
                    <Grid item xs={12} md={3}>
                      <Typography variant="caption" color="text.secondary">
                        {t('travel.detail.from')}
                      </Typography>
                      <Typography variant="body2">
                        {travel.inbound.departure || '-'}
                      </Typography>
                    </Grid>
                    <Grid item xs={12} md={3}>
                      <Typography variant="caption" color="text.secondary">
                        {t('travel.detail.to')}
                      </Typography>
                      <Typography variant="body2">
                        {travel.inbound.destination || '-'}
                      </Typography>
                    </Grid>
                    <Grid item xs={12} md={3}>
                      <Typography variant="caption" color="text.secondary">
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
                <Typography variant="subtitle1" fontWeight={600} gutterBottom>
                  {t('travel.detail.multiCityRoutes')} ({travel.multiCityRoutes.length})
                </Typography>
                {travel.multiCityRoutes.map((route, index) => (
                  <Card key={index} variant="outlined" sx={{ p: 2, mb: 2 }}>
                    <Typography variant="caption" color="primary" gutterBottom>
                      {t('travel.detail.route')} {index + 1}
                    </Typography>
                    <Grid container spacing={2}>
                      <Grid item xs={12} md={3}>
                        <Typography variant="caption" color="text.secondary">
                          {t('travel.detail.date')}
                        </Typography>
                        <Typography variant="body2">
                          {formatDate(route.date)}
                        </Typography>
                      </Grid>
                      <Grid item xs={12} md={3}>
                        <Typography variant="caption" color="text.secondary">
                          {t('travel.detail.from')}
                        </Typography>
                        <Typography variant="body2">
                          {route.departure || '-'}
                        </Typography>
                      </Grid>
                      <Grid item xs={12} md={3}>
                        <Typography variant="caption" color="text.secondary">
                          {t('travel.detail.to')}
                        </Typography>
                        <Typography variant="body2">
                          {route.destination || '-'}
                        </Typography>
                      </Grid>
                      <Grid item xs={12} md={3}>
                        <Typography variant="caption" color="text.secondary">
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
        </Grid>

        {/* 费用预算 */}
        <Grid item xs={12}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <MoneyIcon color="primary" />
              {t('travel.detail.budgetInfo')}
            </Typography>
            <Divider sx={{ my: 2 }} />

            <Grid container spacing={3}>
              {/* 预算总览 */}
              <Grid item xs={12} md={4}>
                <Card variant="outlined" sx={{ p: 2, bgcolor: 'primary.50' }}>
                  <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                    {t('travel.detail.estimatedBudget')}
                  </Typography>
                  <Typography variant="h5" color="primary">
                    {formatCurrency(travel.estimatedBudget || 0)}
                  </Typography>
                </Card>
              </Grid>

              {travel.actualCost !== undefined && (
                <Grid item xs={12} md={4}>
                  <Card variant="outlined" sx={{ p: 2, bgcolor: 'success.50' }}>
                    <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                      {t('travel.detail.actualCost')}
                    </Typography>
                    <Typography variant="h5" color="success.main">
                      {formatCurrency(travel.actualCost || 0)}
                    </Typography>
                  </Card>
                </Grid>
              )}

              {travel.actualCost !== undefined && (
                <Grid item xs={12} md={4}>
                  <Card variant="outlined" sx={{ p: 2, bgcolor: travel.actualCost <= travel.estimatedBudget ? 'success.50' : 'error.50' }}>
                    <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                      {t('travel.detail.variance')}
                    </Typography>
                    <Typography 
                      variant="h5" 
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
                          {Object.entries(travel.outboundBudget).map(([key, value]) => (
                            <TableRow key={key}>
                              <TableCell>{key}</TableCell>
                              <TableCell align="right">{formatCurrency(value)}</TableCell>
                            </TableRow>
                          ))}
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
                          {Object.entries(travel.inboundBudget).map(([key, value]) => (
                            <TableRow key={key}>
                              <TableCell>{key}</TableCell>
                              <TableCell align="right">{formatCurrency(value)}</TableCell>
                            </TableRow>
                          ))}
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
                              {Object.entries(budget).map(([key, value]) => (
                                <TableRow key={key}>
                                  <TableCell>{key}</TableCell>
                                  <TableCell align="right">{formatCurrency(value)}</TableCell>
                                </TableRow>
                              ))}
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

        {/* 审批信息 */}
        {travel.approvals && travel.approvals.length > 0 && (
          <Grid item xs={12}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                {t('travel.detail.approvalHistory')}
              </Typography>
              <Divider sx={{ my: 2 }} />
              
              {travel.approvals.map((approval, index) => (
                <Card key={index} variant="outlined" sx={{ p: 2, mb: 2 }}>
                  <Grid container spacing={2} alignItems="center">
                    <Grid item xs={12} md={3}>
                      <Typography variant="subtitle2" color="text.secondary">
                        {t('travel.detail.approver')}
                      </Typography>
                      <Typography variant="body2">
                        {approval.approver?.firstName} {approval.approver?.lastName}
                      </Typography>
                    </Grid>
                    <Grid item xs={12} md={2}>
                      <Typography variant="subtitle2" color="text.secondary">
                        {t('travel.detail.level')}
                      </Typography>
                      <Typography variant="body2">
                        {t('travel.detail.levelNumber', { level: approval.level })}
                      </Typography>
                    </Grid>
                    <Grid item xs={12} md={2}>
                      <Chip
                        label={t(`travel.approvalStatus.${approval.status}`) || approval.status}
                        color={getStatusColor(approval.status)}
                        size="small"
                      />
                    </Grid>
                    <Grid item xs={12} md={3}>
                      <Typography variant="subtitle2" color="text.secondary">
                        {t('travel.detail.approvalDate')}
                      </Typography>
                      <Typography variant="body2">
                        {formatDate(approval.approvedAt)}
                      </Typography>
                    </Grid>
                    {approval.comments && (
                      <Grid item xs={12}>
                        <Typography variant="subtitle2" color="text.secondary">
                          {t('travel.detail.comments')}
                        </Typography>
                        <Typography variant="body2">
                          {approval.comments}
                        </Typography>
                      </Grid>
                    )}
                  </Grid>
                </Card>
              ))}
            </Paper>
          </Grid>
        )}
      </Grid>
    </Container>
  );
};

export default TravelDetail;
