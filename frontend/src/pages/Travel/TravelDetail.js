
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
      // Mock data - replace with actual API call
      const mockData = {
        id: parseInt(id),
        title: 'Business Trip to Tokyo',
        purpose: 'Client meeting and product demonstration for our new software solution. This trip is crucial for maintaining our relationship with key clients in the Japanese market.',
        destination: {
          country: 'Japan',
          city: 'Tokyo',
          address: 'Shibuya, Tokyo, Japan'
        },
        dates: {
          departure: '2024-02-15',
          return: '2024-02-20'
        },
        estimatedCost: 2500,
        actualCost: 2350,
        currency: 'USD',
        status: 'approved',
        createdAt: '2024-01-15T10:30:00Z',
        updatedAt: '2024-01-20T14:15:00Z',
        employee: {
          firstName: 'John',
          lastName: 'Doe',
          email: 'john.doe@company.com',
          department: 'Sales',
          position: 'Senior Sales Manager'
        },
        approvals: [
          {
            approver: {
              firstName: 'Sarah',
              lastName: 'Wilson',
              email: 'sarah.wilson@company.com',
              position: 'Sales Director'
            },
            level: 1,
            status: 'approved',
            comments: 'Approved. This is an important client meeting.',
            approvedAt: '2024-01-16T09:30:00Z'
          },
          {
            approver: {
              firstName: 'Michael',
              lastName: 'Brown',
              email: 'michael.brown@company.com',
              position: 'VP of Sales'
            },
            level: 2,
            status: 'approved',
            comments: 'Approved. Budget is within limits.',
            approvedAt: '2024-01-17T11:15:00Z'
          }
        ],
        notes: 'Important client meeting with our key Japanese partner. Need to prepare presentation materials and product demos.',
        attachments: [
          {
            filename: 'presentation.pdf',
            originalName: 'Client Presentation.pdf',
            size: 2048576,
            uploadedAt: '2024-01-15T10:45:00Z'
          },
          {
            filename: 'agenda.docx',
            originalName: 'Meeting Agenda.docx',
            size: 512000,
            uploadedAt: '2024-01-15T11:00:00Z'
          }
        ]
      };
      setTravel(mockData);
    } catch (error) {
      showNotification('Failed to load travel details', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = () => {
    navigate(`/travel/${id}/edit`);
  };

  const handleDelete = () => {
    // Implement delete functionality
    showNotification('Delete functionality not implemented yet', 'info');
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
            Travel request not found
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
                label={travel.status}
                color={getStatusColor(travel.status)}
                size="small"
              />
              <Typography variant="body2" color="text.secondary">
                Created on {dayjs(travel.createdAt).format('MMM DD, YYYY')}
              </Typography>
            </Box>
          </Box>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button
              variant="outlined"
              startIcon={<EditIcon />}
              onClick={handleEdit}
            >
              Edit
            </Button>
            <Button
              variant="outlined"
              color="error"
              startIcon={<DeleteIcon />}
              onClick={handleDelete}
            >
              Delete
            </Button>
          </Box>
        </Box>

        <Grid container spacing={3}>
          {/* Basic Information */}
          <Grid item xs={12} md={8}>
            <Paper sx={{ p: 3, mb: 3 }}>
              <Typography variant="h6" gutterBottom>
                Basic Information
              </Typography>
              <Divider sx={{ mb: 2 }} />
              
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Purpose
                  </Typography>
                  <Typography variant="body1" sx={{ mb: 2 }}>
                    {travel.purpose}
                  </Typography>
                </Grid>

                <Grid item xs={12} md={6}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                    <LocationIcon color="action" />
                    <Typography variant="subtitle2" color="text.secondary">
                      Destination
                    </Typography>
                  </Box>
                  <Typography variant="body1">
                    {travel.destination.city}, {travel.destination.country}
                  </Typography>
                  {travel.destination.address && (
                    <Typography variant="body2" color="text.secondary">
                      {travel.destination.address}
                    </Typography>
                  )}
                </Grid>

                <Grid item xs={12} md={6}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                    <CalendarIcon color="action" />
                    <Typography variant="subtitle2" color="text.secondary">
                      Travel Dates
                    </Typography>
                  </Box>
                  <Typography variant="body1">
                    {dayjs(travel.dates.departure).format('MMM DD, YYYY')} - {dayjs(travel.dates.return).format('MMM DD, YYYY')}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {dayjs(travel.dates.return).diff(dayjs(travel.dates.departure), 'days')} days
                  </Typography>
                </Grid>

                <Grid item xs={12} md={6}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                    <MoneyIcon color="action" />
                    <Typography variant="subtitle2" color="text.secondary">
                      Estimated Cost
                    </Typography>
                  </Box>
                  <Typography variant="h6" color="primary">
                    {travel.currency} {travel.estimatedCost.toLocaleString()}
                  </Typography>
                </Grid>

                <Grid item xs={12} md={6}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                    <MoneyIcon color="action" />
                    <Typography variant="subtitle2" color="text.secondary">
                      Actual Cost
                    </Typography>
                  </Box>
                  <Typography variant="h6" color={travel.actualCost <= travel.estimatedCost ? 'success.main' : 'error.main'}>
                    {travel.currency} {travel.actualCost?.toLocaleString() || 'N/A'}
                  </Typography>
                </Grid>
              </Grid>
            </Paper>


            {/* Notes */}
            {travel.notes && (
              <Paper sx={{ p: 3, mb: 3 }}>
                <Typography variant="h6" gutterBottom>
                  Additional Notes
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
                Employee Information
              </Typography>
              <Divider sx={{ mb: 2 }} />
              
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                <Avatar sx={{ bgcolor: 'primary.main' }}>
                  <PersonIcon />
                </Avatar>
                <Box>
                  <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
                    {travel.employee.firstName} {travel.employee.lastName}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {travel.employee.position}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {travel.employee.department}
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

            {/* Attachments */}
            {travel.attachments && travel.attachments.length > 0 && (
              <Paper sx={{ p: 3 }}>
                <Typography variant="h6" gutterBottom>
                  Attachments
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
