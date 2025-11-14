import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container,
  Box,
  Typography,
  Button,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  IconButton,
  Menu,
  MenuItem,
  TextField,
  InputAdornment,
  FormControl,
  InputLabel,
  Select,
  Grid,
  Avatar,
  LinearProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions
} from '@mui/material';
import {
  Add as AddIcon,
  Search as SearchIcon,
  FilterList as FilterIcon,
  MoreVert as MoreVertIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Visibility as ViewIcon,
  Receipt as ReceiptIcon,
  AttachMoney as MoneyIcon,
  CalendarToday as CalendarIcon,
  Business as BusinessIcon,
  CloudUpload as UploadIcon
} from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../contexts/AuthContext';
import { useNotification } from '../../contexts/NotificationContext';
import dayjs from 'dayjs';

const ExpenseList = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { showNotification } = useNotification();
  const navigate = useNavigate();

  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [anchorEl, setAnchorEl] = useState(null);
  const [selectedExpense, setSelectedExpense] = useState(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const statusOptions = [
    { value: 'all', label: 'All Status' },
    { value: 'draft', label: 'Draft' },
    { value: 'submitted', label: 'Submitted' },
    { value: 'approved', label: 'Approved' },
    { value: 'rejected', label: 'Rejected' },
    { value: 'paid', label: 'Paid' },
    { value: 'cancelled', label: 'Cancelled' }
  ];

  const categoryOptions = [
    { value: 'all', label: 'All Categories' },
    { value: 'transportation', label: 'Transportation' },
    { value: 'accommodation', label: 'Accommodation' },
    { value: 'meals', label: 'Meals' },
    { value: 'entertainment', label: 'Entertainment' },
    { value: 'communication', label: 'Communication' },
    { value: 'office_supplies', label: 'Office Supplies' },
    { value: 'training', label: 'Training' },
    { value: 'other', label: 'Other' }
  ];

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

  useEffect(() => {
    fetchExpenses();
  }, []);

  const fetchExpenses = async () => {
    try {
      setLoading(true);
      // Mock data - replace with actual API call
      const mockData = [
        {
          id: 1,
          title: 'Business Lunch with Client',
          description: 'Lunch meeting with key client to discuss project requirements',
          category: 'meals',
          subcategory: 'Business Meal',
          amount: 85.50,
          currency: 'USD',
          date: '2024-01-15',
          status: 'approved',
          vendor: {
            name: 'Restaurant ABC',
            address: '123 Main St, City, State'
          },
          project: 'Client A Engagement',
          costCenter: 'Sales',
          isBillable: true,
          client: 'Client A',
          tags: ['client-related', 'meeting'],
          createdAt: '2024-01-15T14:30:00Z',
          employee: {
            firstName: 'John',
            lastName: 'Doe',
            email: 'john.doe@company.com'
          },
          receipts: [
            {
              filename: 'receipt_001.jpg',
              originalName: 'Restaurant Receipt.jpg',
              size: 1024000
            }
          ]
        },
        {
          id: 2,
          title: 'Flight to Tokyo',
          description: 'Business class flight for client meeting',
          category: 'transportation',
          subcategory: 'Flight',
          amount: 1200.00,
          currency: 'USD',
          date: '2024-01-20',
          status: 'submitted',
          vendor: {
            name: 'Japan Airlines',
            address: 'Tokyo, Japan'
          },
          project: 'Client B Engagement',
          costCenter: 'Sales',
          isBillable: true,
          client: 'Client B',
          tags: ['travel', 'client-related'],
          createdAt: '2024-01-20T09:15:00Z',
          employee: {
            firstName: 'Jane',
            lastName: 'Smith',
            email: 'jane.smith@company.com'
          },
          receipts: []
        },
        {
          id: 3,
          title: 'Office Supplies',
          description: 'Stationery and office materials',
          category: 'office_supplies',
          subcategory: 'Stationery',
          amount: 45.75,
          currency: 'USD',
          date: '2024-01-25',
          status: 'draft',
          vendor: {
            name: 'Office Depot',
            address: '456 Business Ave, City, State'
          },
          project: 'Internal Development',
          costCenter: 'Operations',
          isBillable: false,
          client: 'Internal',
          tags: ['office', 'supplies'],
          createdAt: '2024-01-25T16:45:00Z',
          employee: {
            firstName: 'Mike',
            lastName: 'Johnson',
            email: 'mike.johnson@company.com'
          },
          receipts: []
        }
      ];
      setExpenses(mockData);
    } catch (error) {
      showNotification('Failed to load expenses', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleMenuOpen = (event, expense) => {
    setAnchorEl(event.currentTarget);
    setSelectedExpense(expense);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedExpense(null);
  };

  const handleView = () => {
    navigate(`/expenses/${selectedExpense.id}`);
    handleMenuClose();
  };

  const handleEdit = () => {
    navigate(`/expenses/${selectedExpense.id}/edit`);
    handleMenuClose();
  };

  const handleDelete = () => {
    setDeleteDialogOpen(true);
    handleMenuClose();
  };

  const confirmDelete = async () => {
    try {
      // Mock API call - replace with actual implementation
      console.log('Deleting expense:', selectedExpense.id);
      
      setExpenses(prev => prev.filter(expense => expense.id !== selectedExpense.id));
      showNotification('Expense deleted successfully', 'success');
    } catch (error) {
      showNotification('Failed to delete expense', 'error');
    } finally {
      setDeleteDialogOpen(false);
      setSelectedExpense(null);
    }
  };

  const filteredExpenses = expenses.filter(expense => {
    const matchesSearch = expense.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         expense.vendor.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         expense.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || expense.status === statusFilter;
    const matchesCategory = categoryFilter === 'all' || expense.category === categoryFilter;
    return matchesSearch && matchesStatus && matchesCategory;
  });

  if (loading) {
    return (
      <Container maxWidth="xl">
        <Box sx={{ width: '100%', mt: 2 }}>
          <LinearProgress />
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="xl">
      <Box sx={{ py: 3 }}>
        {/* Header */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h4" gutterBottom>
            {t('expense.expenseList')}
          </Typography>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => navigate('/expenses/new')}
          >
            New Expense
          </Button>
        </Box>

        {/* Filters */}
        <Paper sx={{ p: 2, mb: 3 }}>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                placeholder={t('placeholders.searchExpense')}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon />
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>
            <Grid item xs={12} md={3}>
              <FormControl fullWidth>
                <InputLabel>{t('expense.status')}</InputLabel>
                <Select
                  value={statusFilter}
                  label={t('expense.status')}
                  onChange={(e) => setStatusFilter(e.target.value)}
                >
                  {statusOptions.map((option) => (
                    <MenuItem key={option.value} value={option.value}>
                      {option.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={3}>
              <FormControl fullWidth>
                <InputLabel>{t('expense.category')}</InputLabel>
                <Select
                  value={categoryFilter}
                  label={t('expense.category')}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                >
                  {categoryOptions.map((option) => (
                    <MenuItem key={option.value} value={option.value}>
                      {option.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={2}>
              <Button
                variant="outlined"
                startIcon={<FilterIcon />}
                onClick={() => {
                  setSearchTerm('');
                  setStatusFilter('all');
                  setCategoryFilter('all');
                }}
                fullWidth
              >
                Clear
              </Button>
            </Grid>
          </Grid>
        </Paper>

        {/* Expenses Table */}
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Expense</TableCell>
                <TableCell>Category</TableCell>
                <TableCell>Vendor</TableCell>
                <TableCell>Amount</TableCell>
                <TableCell>Date</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Receipts</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredExpenses.map((expense) => (
                <TableRow key={expense.id} hover>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Avatar sx={{ bgcolor: 'primary.main', width: 32, height: 32 }}>
                        {getCategoryIcon(expense.category)}
                      </Avatar>
                      <Box>
                        <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>
                          {expense.title}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {expense.description}
                        </Typography>
                        {expense.project && (
                          <Typography variant="caption" color="primary">
                            {expense.project}
                          </Typography>
                        )}
                      </Box>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Box>
                      <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                        {expense.category.charAt(0).toUpperCase() + expense.category.slice(1)}
                      </Typography>
                      {expense.subcategory && (
                        <Typography variant="caption" color="text.secondary">
                          {expense.subcategory}
                        </Typography>
                      )}
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <BusinessIcon color="action" fontSize="small" />
                      <Box>
                        <Typography variant="body2">
                          {expense.vendor.name}
                        </Typography>
                        {expense.vendor.address && (
                          <Typography variant="caption" color="text.secondary">
                            {expense.vendor.address}
                          </Typography>
                        )}
                      </Box>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <MoneyIcon color="action" fontSize="small" />
                      <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                        {expense.currency} {expense.amount.toLocaleString()}
                      </Typography>
                    </Box>
                    {expense.isBillable && (
                      <Chip label={t('expense.billable')} size="small" color="success" sx={{ mt: 0.5 }} />
                    )}
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <CalendarIcon color="action" fontSize="small" />
                      <Typography variant="body2">
                        {dayjs(expense.date).format('MMM DD, YYYY')}
                      </Typography>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={expense.status}
                      color={getStatusColor(expense.status)}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <ReceiptIcon color="action" fontSize="small" />
                      <Typography variant="body2">
                        {expense.receipts.length}
                      </Typography>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <IconButton
                      onClick={(e) => handleMenuOpen(e, expense)}
                      size="small"
                    >
                      <MoreVertIcon />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>

        {filteredExpenses.length === 0 && (
          <Paper sx={{ p: 4, textAlign: 'center', mt: 2 }}>
            <Typography variant="h6" color="text.secondary">
              No expenses found
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              {searchTerm || statusFilter !== 'all' || categoryFilter !== 'all'
                ? 'Try adjusting your search criteria'
                : 'Create your first expense to get started'
              }
            </Typography>
            {!searchTerm && statusFilter === 'all' && categoryFilter === 'all' && (
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={() => navigate('/expenses/new')}
                sx={{ mt: 2 }}
              >
                Create Expense
              </Button>
            )}
          </Paper>
        )}

        {/* Action Menu */}
        <Menu
          anchorEl={anchorEl}
          open={Boolean(anchorEl)}
          onClose={handleMenuClose}
        >
          <MenuItem onClick={handleView}>
            <ViewIcon sx={{ mr: 1 }} />
            View Details
          </MenuItem>
          <MenuItem onClick={handleEdit}>
            <EditIcon sx={{ mr: 1 }} />
            Edit
          </MenuItem>
          <MenuItem onClick={handleDelete} sx={{ color: 'error.main' }}>
            <DeleteIcon sx={{ mr: 1 }} />
            Delete
          </MenuItem>
        </Menu>

        {/* Delete Confirmation Dialog */}
        <Dialog
          open={deleteDialogOpen}
          onClose={() => setDeleteDialogOpen(false)}
        >
          <DialogTitle>{t('dialogs.confirmDelete')}</DialogTitle>
          <DialogContent>
            <Typography>
              Are you sure you want to delete the expense "{selectedExpense?.title}"? 
              This action cannot be undone.
            </Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={confirmDelete} color="error" variant="contained">
              Delete
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </Container>
  );
};

export default ExpenseList;
