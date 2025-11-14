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
      // Mock data - replace with actual API call
      const mockData = {
        id: parseInt(id),
        title: 'Business Lunch with Client',
        description: 'Lunch meeting with key client to discuss project requirements and upcoming deliverables. This was an important strategic meeting to maintain our relationship with our top client.',
        category: 'meals',
        subcategory: 'Business Meal',
        amount: 85.50,
        currency: 'USD',
        date: '2024-01-15',
        status: 'approved',
        createdAt: '2024-01-15T14:30:00Z',
        updatedAt: '2024-01-16T10:15:00Z',
        vendor: {
          name: 'Restaurant ABC',
          address: '123 Main Street, Downtown, City, State 12345',
          taxId: 'TAX123456789',
          phone: '+1 (555) 123-4567',
          email: 'info@restaurantabc.com'
        },
        project: 'Client A Engagement',
        costCenter: 'Sales',
        isBillable: true,
        client: 'Client A',
        tags: ['client-related', 'meeting', 'strategic'],
        notes: 'Important client discussion about upcoming project milestones and budget allocation. The client expressed satisfaction with our current progress.',
        employee: {
          firstName: 'John',
          lastName: 'Doe',
          email: 'john.doe@company.com',
          department: 'Sales',
          position: 'Senior Sales Manager'
        },
        receipts: [
          {
            filename: 'receipt_001.jpg',
            originalName: 'Restaurant ABC Receipt.jpg',
            size: 1024000,
            uploadedAt: '2024-01-15T14:45:00Z',
            type: 'image/jpeg'
          },
          {
            filename: 'invoice_001.pdf',
            originalName: 'Restaurant ABC Invoice.pdf',
            size: 512000,
            uploadedAt: '2024-01-15T14:50:00Z',
            type: 'application/pdf'
          }
        ],
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
            comments: 'Approved. This is a legitimate business expense for client relationship management.',
            approvedAt: '2024-01-16T09:30:00Z'
          }
        ],
        payment: {
          method: 'Company Credit Card',
          transactionId: 'TXN123456789',
          paidAt: '2024-01-20T15:30:00Z',
          status: 'completed'
        }
      };
      setExpense(mockData);
    } catch (error) {
      showNotification('Failed to load expense details', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = () => {
    navigate(`/expenses/${id}/edit`);
  };

  const handleDelete = () => {
    // Implement delete functionality
    showNotification('Delete functionality not implemented yet', 'info');
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
              {expense.title}
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Chip
                label={expense.status}
                color={getStatusColor(expense.status)}
                size="small"
              />
              <Typography variant="body2" color="text.secondary">
                Created on {dayjs(expense.createdAt).format('MMM DD, YYYY')}
              </Typography>
              {expense.isBillable && (
                <Chip label={t('expense.billable')} color="success" size="small" />
              )}
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

            {/* Receipts */}
            <Paper sx={{ p: 3, mb: 3 }}>
              <Typography variant="h6" gutterBottom>
                Receipts & Attachments
              </Typography>
              <Divider sx={{ mb: 2 }} />
              
              {expense.receipts.length > 0 ? (
                <List>
                  {expense.receipts.map((receipt, index) => (
                    <ListItem key={index} divider>
                      <ListItemIcon>
                        <Avatar sx={{ bgcolor: 'primary.main' }}>
                          <ReceiptIcon />
                        </Avatar>
                      </ListItemIcon>
                      <ListItemText
                        primary={receipt.originalName}
                        secondary={`${(receipt.size / 1024 / 1024).toFixed(2)} MB • ${dayjs(receipt.uploadedAt).format('MMM DD, YYYY HH:mm')}`}
                      />
                      <Box sx={{ display: 'flex', gap: 1 }}>
                        <IconButton
                          onClick={() => handleDownloadReceipt(receipt)}
                          size="small"
                        >
                          <DownloadIcon />
                        </IconButton>
                        <IconButton size="small">
                          <ViewIcon />
                        </IconButton>
                      </Box>
                    </ListItem>
                  ))}
                </List>
              ) : (
                <Typography variant="body2" color="text.secondary">
                  No receipts uploaded
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
