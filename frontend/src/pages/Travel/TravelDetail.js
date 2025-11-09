
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
  IconButton
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  AttachMoney as MoneyIcon,
  LocationOn as LocationIcon,
  CalendarToday as CalendarIcon,
  Person as PersonIcon,
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
  Schedule as ScheduleIcon
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

  const getStatusColor = (status) => {
    const colors = {
      draft: 'default',
      submitted: 'warning',
      approved: 'success',
      rejected: 'error',
      'in-progress': 'info',
      completed: 'success',
      cancelled: 'error'
    };
    return colors[status] || 'default';
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
      showNotification(t('travel.detail.loadError'), 'error');
      setTravel(null);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = () => {
    navigate(`/travel/${id}/edit`);
  };

  const handleDelete = () => {
    // Implement delete functionality
    showNotification(t('travel.detail.deleteNotImplemented'), 'info');
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
            {t('travel.detail.notFound')}
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
          <IconButton onClick={() => navigate('/travel')}>
            <ArrowBackIcon />
          </IconButton>
          <Box sx={{ flexGrow: 1 }}>
            <Typography variant="h4" gutterBottom>
              {travel.title}
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Chip
                label={t(`travel.statuses.${travel.status}`) || travel.status}
                color={getStatusColor(travel.status)}
                size="small"
              />
              <Typography variant="body2" color="text.secondary">
                {t('travel.detail.createdOn')} {dayjs(travel.createdAt).format('MMM DD, YYYY')}
              </Typography>
            </Box>
          </Box>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button
              variant="outlined"
              startIcon={<EditIcon />}
              onClick={handleEdit}
            >
              {t('travel.detail.edit')}
            </Button>
            <Button
              variant="outlined"
              color="error"
              startIcon={<DeleteIcon />}
              onClick={handleDelete}
            >
              {t('travel.detail.delete')}
            </Button>
          </Box>
        </Box>

        <Grid container spacing={3}>
          {/* Basic Information */}
          <Grid item xs={12} md={8}>
            <Paper sx={{ p: 3, mb: 3 }}>
              <Typography variant="h6" gutterBottom>
                {t('travel.detail.basicInformation')}
              </Typography>
              <Divider sx={{ mb: 2 }} />
              
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <Typography variant="subtitle2" color="text.secondary">
                    {t('travel.detail.purpose')}
                  </Typography>
                  <Typography variant="body1" sx={{ mb: 2 }}>
                    {travel.purpose}
                  </Typography>
                </Grid>

                <Grid item xs={12} md={6}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                    <LocationIcon color="action" />
                    <Typography variant="subtitle2" color="text.secondary">
                      {t('travel.detail.destination')}
                    </Typography>
                  </Box>
                  <Typography variant="body1">
                    {typeof travel.destination === 'string' ? travel.destination : (travel.destination?.city || travel.destination?.name || t('travel.detail.nA'))}
                  </Typography>
                  {travel.destination?.address && (
                    <Typography variant="body2" color="text.secondary">
                      {travel.destination.address}
                    </Typography>
                  )}
                </Grid>

                <Grid item xs={12} md={6}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                    <CalendarIcon color="action" />
                    <Typography variant="subtitle2" color="text.secondary">
                      {t('travel.detail.travelDates')}
                    </Typography>
                  </Box>
                  <Typography variant="body1">
                    {dayjs(travel.startDate || travel.dates?.departure).format('MMM DD, YYYY')} - {dayjs(travel.endDate || travel.dates?.return).format('MMM DD, YYYY')}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {dayjs(travel.endDate || travel.dates?.return).diff(dayjs(travel.startDate || travel.dates?.departure), 'days')} {t('travel.detail.days')}
                  </Typography>
                </Grid>

                <Grid item xs={12} md={6}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                    <MoneyIcon color="action" />
                    <Typography variant="subtitle2" color="text.secondary">
                      {t('travel.detail.estimatedCost')}
                    </Typography>
                  </Box>
                  <Typography variant="h6" color="primary">
                    ¥{(travel.estimatedBudget || travel.estimatedCost || 0).toLocaleString()}
                  </Typography>
                </Grid>

                <Grid item xs={12} md={6}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                    <MoneyIcon color="action" />
                    <Typography variant="subtitle2" color="text.secondary">
                      {t('travel.detail.actualCost')}
                    </Typography>
                  </Box>
                  <Typography variant="h6" color={(travel.actualCost || travel.actualBudget || 0) <= (travel.estimatedBudget || travel.estimatedCost || 0) ? 'success.main' : 'error.main'}>
                    ¥{(travel.actualCost || travel.actualBudget || 0).toLocaleString() || t('travel.detail.nA')}
                  </Typography>
                </Grid>
              </Grid>
            </Paper>


            {/* Notes */}
            {travel.notes && (
              <Paper sx={{ p: 3, mb: 3 }}>
                <Typography variant="h6" gutterBottom>
                  {t('travel.detail.additionalNotes')}
                </Typography>
                <Divider sx={{ mb: 2 }} />
                <Typography variant="body1">
                  {travel.notes}
                </Typography>
              </Paper>
            )}
          </Grid>

          {/* Sidebar */}
          <Grid item xs={12} md={4}>
            {/* Employee Information */}
            <Paper sx={{ p: 3, mb: 3 }}>
              <Typography variant="h6" gutterBottom>
                {t('travel.detail.employeeInformation')}
              </Typography>
              <Divider sx={{ mb: 2 }} />
              
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                <Avatar sx={{ bgcolor: 'primary.main' }}>
                  <PersonIcon />
                </Avatar>
                <Box>
                  <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
                    {travel.employee?.firstName} {travel.employee?.lastName}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {travel.employee?.position || t('travel.detail.nA')}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {travel.employee?.department || t('travel.detail.nA')}
                  </Typography>
                </Box>
              </Box>
            </Paper>

            {/* Approval Status */}
            <Paper sx={{ p: 3, mb: 3 }}>
              <Typography variant="h6" gutterBottom>
                {t('travel.detail.approvalStatus')}
              </Typography>
              <Divider sx={{ mb: 2 }} />
              
              <Stepper orientation="vertical">
                {travel.approvals.map((approval, index) => (
                  <Step key={index} active={true} completed={approval.status === 'approved'}>
                    <StepLabel
                      icon={getApprovalIcon(approval.status)}
                    >
                      <Box>
                        <Typography variant="subtitle2">
                          {approval.approver.firstName} {approval.approver.lastName}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {approval.approver.position}
                        </Typography>
                      </Box>
                    </StepLabel>
                    <StepContent>
                      <Box sx={{ mb: 2 }}>
                        <Chip
                          label={t(`travel.detail.${approval.status}`) || approval.status}
                          color={getStatusColor(approval.status)}
                          size="small"
                          sx={{ mb: 1 }}
                        />
                        {approval.comments && (
                          <Typography variant="body2" sx={{ mb: 1 }}>
                            <strong>{t('travel.detail.comments')}:</strong> {approval.comments}
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

            {/* Attachments */}
            {travel.attachments && travel.attachments.length > 0 && (
              <Paper sx={{ p: 3 }}>
                <Typography variant="h6" gutterBottom>
                  {t('travel.detail.attachments')}
                </Typography>
                <Divider sx={{ mb: 2 }} />
                
                <List>
                  {travel.attachments.map((attachment, index) => (
                    <ListItem key={index} divider>
                      <ListItemIcon>
                        <Avatar sx={{ bgcolor: 'secondary.main', width: 32, height: 32 }}>
                          📄
                        </Avatar>
                      </ListItemIcon>
                      <ListItemText
                        primary={attachment.originalName}
                        secondary={`${(attachment.size / 1024 / 1024).toFixed(2)} MB • ${dayjs(attachment.uploadedAt).format('MMM DD, YYYY')}`}
                      />
                    </ListItem>
                  ))}
                </List>
              </Paper>
            )}
          </Grid>
        </Grid>
      </Box>
    </Container>
  );
};

export default TravelDetail;
