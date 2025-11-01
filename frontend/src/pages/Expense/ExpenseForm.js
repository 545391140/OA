import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Container,
  Paper,
  Box,
  Typography,
  TextField,
  Button,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  IconButton,
  Card,
  CardContent,
  Divider,
  Alert,
  CircularProgress,
  InputAdornment,
  Chip,
  Autocomplete,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Avatar
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Save as SaveIcon,
  Send as SendIcon,
  AttachMoney as MoneyIcon,
  CloudUpload as UploadIcon,
  Receipt as ReceiptIcon,
  Business as BusinessIcon,
  Person as PersonIcon,
  CalendarToday as CalendarIcon,
  LocationOn as LocationIcon
} from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../contexts/AuthContext';
import { useNotification } from '../../contexts/NotificationContext';
import dayjs from 'dayjs';

const ExpenseForm = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { showNotification } = useNotification();
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = Boolean(id);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: '',
    subcategory: '',
    amount: '',
    currency: 'USD',
    date: dayjs(),
    vendor: {
      name: '',
      address: '',
      taxId: ''
    },
    project: '',
    costCenter: '',
    isBillable: false,
    client: '',
    tags: [],
    notes: '',
    receipts: []
  });

  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);

  const currencies = [
    { value: 'USD', label: 'USD - US Dollar' },
    { value: 'CNY', label: 'CNY - Chinese Yuan' },
    { value: 'JPY', label: 'JPY - Japanese Yen' },
    { value: 'KRW', label: 'KRW - Korean Won' },
    { value: 'EUR', label: 'EUR - Euro' }
  ];

  const categories = [
    { value: 'transportation', label: 'Transportation' },
    { value: 'accommodation', label: 'Accommodation' },
    { value: 'meals', label: 'Meals' },
    { value: 'entertainment', label: 'Entertainment' },
    { value: 'communication', label: 'Communication' },
    { value: 'office_supplies', label: 'Office Supplies' },
    { value: 'training', label: 'Training' },
    { value: 'other', label: 'Other' }
  ];

  const subcategories = {
    transportation: [
      'Flight', 'Train', 'Taxi', 'Rental Car', 'Public Transport', 'Parking', 'Fuel'
    ],
    accommodation: [
      'Hotel', 'Airbnb', 'Hostel', 'Apartment Rental'
    ],
    meals: [
      'Breakfast', 'Lunch', 'Dinner', 'Coffee/Tea', 'Snacks', 'Business Meal'
    ],
    entertainment: [
      'Client Entertainment', 'Team Building', 'Conference', 'Event'
    ],
    communication: [
      'Phone', 'Internet', 'Mobile Data', 'Postage', 'Courier'
    ],
    office_supplies: [
      'Stationery', 'Printing', 'Software', 'Hardware', 'Books'
    ],
    training: [
      'Course', 'Workshop', 'Certification', 'Conference', 'Online Training'
    ],
    other: [
      'Miscellaneous', 'Bank Fees', 'Insurance', 'Medical', 'Other'
    ]
  };

  const projects = [
    'Project Alpha',
    'Project Beta',
    'Project Gamma',
    'Client A Engagement',
    'Client B Engagement',
    'Internal Development'
  ];

  const costCenters = [
    'Sales',
    'Marketing',
    'Engineering',
    'Operations',
    'HR',
    'Finance',
    'Legal'
  ];

  const clients = [
    'Client A',
    'Client B',
    'Client C',
    'Internal',
    'Prospect A',
    'Prospect B'
  ];

  const commonTags = [
    'urgent',
    'client-related',
    'travel',
    'training',
    'equipment',
    'software',
    'hardware',
    'meeting',
    'conference'
  ];

  useEffect(() => {
    if (isEdit) {
      fetchExpenseData();
    }
  }, [id, isEdit]);

  const fetchExpenseData = async () => {
    try {
      setLoading(true);
      // Mock data - replace with actual API call
      const mockData = {
        title: 'Business Lunch with Client',
        description: 'Lunch meeting with key client to discuss project requirements',
        category: 'meals',
        subcategory: 'Business Meal',
        amount: 85.50,
        currency: 'USD',
        date: dayjs('2024-01-15'),
        vendor: {
          name: 'Restaurant ABC',
          address: '123 Main St, City, State',
          taxId: 'TAX123456'
        },
        project: 'Client A Engagement',
        costCenter: 'Sales',
        isBillable: true,
        client: 'Client A',
        tags: ['client-related', 'meeting'],
        notes: 'Important client discussion about upcoming project',
        receipts: [
          {
            filename: 'receipt_001.jpg',
            originalName: 'Restaurant Receipt.jpg',
            size: 1024000,
            uploadedAt: '2024-01-15T14:30:00Z'
          }
        ]
      };
      setFormData(mockData);
    } catch (error) {
      showNotification('Failed to load expense data', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field, value) => {
    if (field.includes('.')) {
      const [parent, child] = field.split('.');
      setFormData(prev => ({
        ...prev,
        [parent]: {
          ...prev[parent],
          [child]: value
        }
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [field]: value
      }));
    }

    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: ''
      }));
    }
  };

  const handleFileUpload = (event) => {
    const files = Array.from(event.target.files);
    const newReceipts = files.map(file => ({
      filename: file.name,
      originalName: file.name,
      size: file.size,
      uploadedAt: new Date().toISOString(),
      file: file
    }));

    setFormData(prev => ({
      ...prev,
      receipts: [...prev.receipts, ...newReceipts]
    }));

    setUploadDialogOpen(false);
    showNotification(`${files.length} file(s) uploaded successfully`, 'success');
  };

  const removeReceipt = (index) => {
    setFormData(prev => ({
      ...prev,
      receipts: prev.receipts.filter((_, i) => i !== index)
    }));
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.title.trim()) {
      newErrors.title = 'Title is required';
    }

    if (!formData.category) {
      newErrors.category = 'Category is required';
    }

    if (!formData.amount || formData.amount <= 0) {
      newErrors.amount = t('validation.validAmountRequired');
    }

    if (!formData.date) {
      newErrors.date = 'Date is required';
    }

    if (!formData.vendor.name.trim()) {
      newErrors.vendorName = 'Vendor name is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async (status = 'draft') => {
    if (!validateForm()) {
      return;
    }

    try {
      setSaving(true);
      
      const submitData = {
        ...formData,
        status,
        amount: parseFloat(formData.amount)
      };

      // Mock API call - replace with actual implementation
      console.log('Saving expense:', submitData);
      
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 1000));

      showNotification(
        status === 'draft' ? 'Expense saved as draft' : 'Expense submitted successfully',
        'success'
      );
      
      navigate('/expenses');
    } catch (error) {
      showNotification('Failed to save expense', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleSubmit = () => handleSave('submitted');

  if (loading) {
    return (
      <Container maxWidth="xl">
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="xl">
      <Box sx={{ py: 3 }}>
        <Typography variant="h4" gutterBottom>
          {isEdit ? t('expense.editExpense') : t('expense.newExpense')}
        </Typography>

        <Paper sx={{ p: 3 }}>
          <Grid container spacing={3}>
            {/* Basic Information */}
            <Grid item xs={12}>
              <Typography variant="h6" gutterBottom>
                Basic Information
              </Typography>
              <Divider sx={{ mb: 2 }} />
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Title *"
                value={formData.title}
                onChange={(e) => handleChange('title', e.target.value)}
                error={!!errors.title}
                helperText={errors.title}
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>{t('user.currency')} *</InputLabel>
                <Select
                  value={formData.currency}
                  label="Currency *"
                  onChange={(e) => handleChange('currency', e.target.value)}
                >
                  {currencies.map((currency) => (
                    <MenuItem key={currency.value} value={currency.value}>
                      {currency.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={3}
                label={t('expense.description')}
                value={formData.description}
                onChange={(e) => handleChange('description', e.target.value)}
                placeholder={t('placeholders.describeExpense')}
              />
            </Grid>

            {/* Category and Amount */}
            <Grid item xs={12} md={4}>
              <FormControl fullWidth>
                <InputLabel>{t('expense.category')} *</InputLabel>
                <Select
                  value={formData.category}
                  label="Category *"
                  onChange={(e) => {
                    handleChange('category', e.target.value);
                    handleChange('subcategory', ''); // Reset subcategory
                  }}
                  error={!!errors.category}
                >
                  {categories.map((category) => (
                    <MenuItem key={category.value} value={category.value}>
                      {category.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} md={4}>
              <FormControl fullWidth>
                <InputLabel>{t('expense.subcategory')}</InputLabel>
                <Select
                  value={formData.subcategory}
                  label={t('expense.subcategory')}
                  onChange={(e) => handleChange('subcategory', e.target.value)}
                  disabled={!formData.category}
                >
                  {formData.category && subcategories[formData.category]?.map((sub) => (
                    <MenuItem key={sub} value={sub}>
                      {sub}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                label="Amount *"
                type="number"
                value={formData.amount}
                onChange={(e) => handleChange('amount', e.target.value)}
                error={!!errors.amount}
                helperText={errors.amount}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <MoneyIcon />
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>

            {/* Date and Vendor */}
            <Grid item xs={12} md={6}>
              <DatePicker
                label="Date *"
                value={formData.date}
                onChange={(date) => handleChange('date', date)}
                slotProps={{
                  textField: {
                    fullWidth: true,
                    error: !!errors.date,
                    helperText: errors.date
                  }
                }}
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Vendor Name *"
                value={formData.vendor.name}
                onChange={(e) => handleChange('vendor.name', e.target.value)}
                error={!!errors.vendorName}
                helperText={errors.vendorName}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <BusinessIcon />
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label={t('expense.vendorAddress')}
                value={formData.vendor.address}
                onChange={(e) => handleChange('vendor.address', e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <LocationIcon />
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label={t('expense.taxId')}
                value={formData.vendor.taxId}
                onChange={(e) => handleChange('vendor.taxId', e.target.value)}
              />
            </Grid>

            {/* Project and Cost Center */}
            <Grid item xs={12} md={6}>
              <Autocomplete
                freeSolo
                options={projects}
                value={formData.project}
                onChange={(event, newValue) => handleChange('project', newValue)}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label={t('expense.project')}
                    placeholder={t('expense.selectProject')}
                  />
                )}
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>{t('expense.costCenter')}</InputLabel>
                <Select
                  value={formData.costCenter}
                  label={t('expense.costCenter')}
                  onChange={(e) => handleChange('costCenter', e.target.value)}
                >
                  {costCenters.map((center) => (
                    <MenuItem key={center} value={center}>
                      {center}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            {/* Billable and Client */}
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>{t('expense.client')}</InputLabel>
                <Select
                  value={formData.client}
                  label={t('expense.client')}
                  onChange={(e) => handleChange('client', e.target.value)}
                >
                  {clients.map((client) => (
                    <MenuItem key={client} value={client}>
                      {client}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} md={6}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mt: 2 }}>
                <FormControl>
                  <InputLabel>{t('expense.billable')}</InputLabel>
                  <Select
                    value={formData.isBillable}
                    label={t('expense.billable')}
                    onChange={(e) => handleChange('isBillable', e.target.value)}
                  >
                    <MenuItem value={false}>No</MenuItem>
                    <MenuItem value={true}>Yes</MenuItem>
                  </Select>
                </FormControl>
              </Box>
            </Grid>

            {/* Tags */}
            <Grid item xs={12}>
              <Autocomplete
                multiple
                freeSolo
                options={commonTags}
                value={formData.tags}
                onChange={(event, newValue) => handleChange('tags', newValue)}
                renderTags={(value, getTagProps) =>
                  value.map((option, index) => (
                    <Chip
                      variant="outlined"
                      label={option}
                      {...getTagProps({ index })}
                      key={option}
                    />
                  ))
                }
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label={t('expense.tags')}
                    placeholder={t('expense.addTags')}
                  />
                )}
              />
            </Grid>

            {/* Receipts */}
            <Grid item xs={12}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 2 }}>
                <Typography variant="h6">
                  Receipts
                </Typography>
                <Button
                  startIcon={<UploadIcon />}
                  onClick={() => setUploadDialogOpen(true)}
                  variant="outlined"
                  size="small"
                >
                  Upload Receipts
                </Button>
              </Box>
              <Divider sx={{ mb: 2 }} />
            </Grid>

            {formData.receipts.length > 0 && (
              <Grid item xs={12}>
                <List>
                  {formData.receipts.map((receipt, index) => (
                    <ListItem key={index} divider>
                      <ListItemIcon>
                        <Avatar sx={{ bgcolor: 'primary.main' }}>
                          <ReceiptIcon />
                        </Avatar>
                      </ListItemIcon>
                      <ListItemText
                        primary={receipt.originalName}
                        secondary={`${(receipt.size / 1024 / 1024).toFixed(2)} MB • ${dayjs(receipt.uploadedAt).format('MMM DD, YYYY')}`}
                      />
                      <IconButton
                        onClick={() => removeReceipt(index)}
                        color="error"
                        size="small"
                      >
                        <DeleteIcon />
                      </IconButton>
                    </ListItem>
                  ))}
                </List>
              </Grid>
            )}

            {/* Notes */}
            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={4}
                label={t('travel.additionalNotes')}
                value={formData.notes}
                onChange={(e) => handleChange('notes', e.target.value)}
                placeholder={t('placeholders.additionalExpenseInfo')}
              />
            </Grid>

            {/* Action Buttons */}
            <Grid item xs={12}>
              <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end', mt: 3 }}>
                <Button
                  variant="outlined"
                  onClick={() => navigate('/expenses')}
                  disabled={saving}
                >
                  Cancel
                </Button>
                <Button
                  variant="contained"
                  startIcon={<SaveIcon />}
                  onClick={() => handleSave('draft')}
                  disabled={saving}
                >
                  {saving ? <CircularProgress size={20} /> : 'Save Draft'}
                </Button>
                <Button
                  variant="contained"
                  color="primary"
                  startIcon={<SendIcon />}
                  onClick={handleSubmit}
                  disabled={saving}
                >
                  {saving ? <CircularProgress size={20} /> : 'Submit Expense'}
                </Button>
              </Box>
            </Grid>
          </Grid>
        </Paper>

        {/* File Upload Dialog */}
        <Dialog
          open={uploadDialogOpen}
          onClose={() => setUploadDialogOpen(false)}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle>{t('dialogs.uploadReceipts')}</DialogTitle>
          <DialogContent>
            <Box sx={{ textAlign: 'center', py: 3 }}>
              <input
                accept="image/*,.pdf"
                style={{ display: 'none' }}
                id="receipt-upload"
                multiple
                type="file"
                onChange={handleFileUpload}
              />
              <label htmlFor="receipt-upload">
                <Button
                  variant="contained"
                  component="span"
                  startIcon={<UploadIcon />}
                  size="large"
                >
                  Choose Files
                </Button>
              </label>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                Supported formats: JPG, PNG, PDF (Max 10MB per file)
              </Typography>
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setUploadDialogOpen(false)}>
              Cancel
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </Container>
  );
};

export default ExpenseForm;
