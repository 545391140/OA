import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Checkbox,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Typography,
  Chip,
  CircularProgress,
  Alert,
  Grid
} from '@mui/material';
import {
  Receipt as ReceiptIcon,
  CalendarToday as CalendarIcon,
  AttachMoney as MoneyIcon,
  Business as BusinessIcon
} from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import apiClient from '../../utils/axiosConfig';
import dayjs from 'dayjs';

const InvoiceSelectDialog = ({ open, onClose, onConfirm, excludeInvoiceIds = [] }) => {
  const { t } = useTranslation();
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedInvoices, setSelectedInvoices] = useState([]);
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (open) {
      fetchInvoices();
      setSelectedInvoices([]);
      setCategoryFilter('all');
      setSearchTerm('');
    }
  }, [open]);

  const fetchInvoices = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get('/invoices', {
        params: {
          status: 'verified', // 只显示已验证的发票
          limit: 100
        }
      });
      if (response.data && response.data.success) {
        // 过滤掉已关联的发票和排除的发票
        const availableInvoices = response.data.data.filter(
          invoice => !invoice.relatedExpense && !excludeInvoiceIds.includes(invoice._id)
        );
        setInvoices(availableInvoices);
      }
    } catch (error) {
      console.error('Failed to fetch invoices:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleInvoice = (invoiceId) => {
    setSelectedInvoices(prev => {
      if (prev.includes(invoiceId)) {
        return prev.filter(id => id !== invoiceId);
      } else {
        return [...prev, invoiceId];
      }
    });
  };

  const handleConfirm = () => {
    const selectedInvoiceObjects = invoices.filter(inv => selectedInvoices.includes(inv._id));
    onConfirm(selectedInvoiceObjects);
    onClose();
  };

  const filteredInvoices = invoices.filter(invoice => {
    const matchesCategory = categoryFilter === 'all' || invoice.category === categoryFilter;
    const matchesSearch = !searchTerm || 
      invoice.invoiceNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      invoice.vendor?.name?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const categories = [
    { value: 'all', label: t('invoice.list.categories.all') || 'All' },
    { value: 'transportation', label: t('invoice.list.categories.transportation') || 'Transportation' },
    { value: 'accommodation', label: t('invoice.list.categories.accommodation') || 'Accommodation' },
    { value: 'meals', label: t('invoice.list.categories.meals') || 'Meals' },
    { value: 'entertainment', label: t('invoice.list.categories.entertainment') || 'Entertainment' },
    { value: 'communication', label: t('invoice.list.categories.communication') || 'Communication' },
    { value: 'office_supplies', label: t('invoice.list.categories.officeSupplies') || 'Office Supplies' },
    { value: 'training', label: t('invoice.list.categories.training') || 'Training' },
    { value: 'other', label: t('invoice.list.categories.other') || 'Other' }
  ];

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        {t('expense.selectInvoices') || '选择发票'}
      </DialogTitle>
      <DialogContent>
        <Box sx={{ mb: 2 }}>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                size="small"
                label={t('common.search') || '搜索'}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder={t('invoice.list.searchPlaceholder') || '搜索发票号、商户名称...'}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth size="small">
                <InputLabel>{t('invoice.list.category') || '分类'}</InputLabel>
                <Select
                  value={categoryFilter}
                  label={t('invoice.list.category') || '分类'}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                >
                  {categories.map(cat => (
                    <MenuItem key={cat.value} value={cat.value}>
                      {cat.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </Box>

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress />
          </Box>
        ) : filteredInvoices.length === 0 ? (
          <Alert severity="info">
            {t('expense.noAvailableInvoices') || '没有可用的发票'}
          </Alert>
        ) : (
          <List sx={{ maxHeight: 400, overflow: 'auto' }}>
            {filteredInvoices.map((invoice) => (
              <ListItem key={invoice._id} disablePadding>
                <ListItemButton
                  onClick={() => handleToggleInvoice(invoice._id)}
                  selected={selectedInvoices.includes(invoice._id)}
                >
                  <ListItemIcon>
                    <Checkbox
                      edge="start"
                      checked={selectedInvoices.includes(invoice._id)}
                      tabIndex={-1}
                      disableRipple
                    />
                  </ListItemIcon>
                  <ListItemIcon>
                    <ReceiptIcon color="primary" />
                  </ListItemIcon>
                  <ListItemText
                    primary={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography variant="body2" fontWeight={600}>
                          {invoice.invoiceNumber || t('invoice.noNumber') || '无发票号'}
                        </Typography>
                        <Chip
                          label={categories.find(c => c.value === invoice.category)?.label || invoice.category}
                          size="small"
                          color="primary"
                          variant="outlined"
                        />
                      </Box>
                    }
                    secondary={
                      <Box sx={{ mt: 0.5 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                          <BusinessIcon fontSize="small" color="action" />
                          <Typography variant="caption" color="text.secondary">
                            {invoice.vendor?.name || '-'}
                          </Typography>
                        </Box>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <MoneyIcon fontSize="small" color="action" />
                            <Typography variant="caption" color="text.secondary">
                              {invoice.currency} {invoice.totalAmount?.toLocaleString() || invoice.amount?.toLocaleString() || 0}
                            </Typography>
                          </Box>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <CalendarIcon fontSize="small" color="action" />
                            <Typography variant="caption" color="text.secondary">
                              {invoice.invoiceDate ? dayjs(invoice.invoiceDate).format('YYYY-MM-DD') : '-'}
                            </Typography>
                          </Box>
                        </Box>
                      </Box>
                    }
                  />
                </ListItemButton>
              </ListItem>
            ))}
          </List>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>
          {t('common.cancel')}
        </Button>
        <Button
          onClick={handleConfirm}
          variant="contained"
          disabled={selectedInvoices.length === 0}
        >
          {t('common.confirm')} ({selectedInvoices.length})
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default InvoiceSelectDialog;

