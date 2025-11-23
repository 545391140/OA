import React, { useState, useEffect, useCallback, useMemo } from 'react';
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
  TextField,
  InputAdornment,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  CircularProgress,
  LinearProgress,
  Grid,
  Card,
  CardMedia,
  CardContent,
  CardActionArea,
  Pagination,
  Tooltip,
  Menu
} from '@mui/material';
import {
  Add as AddIcon,
  Search as SearchIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Visibility as VisibilityIcon,
  PictureAsPdf as PdfIcon,
  Image as ImageIcon,
  Refresh as RefreshIcon,
  FilterList as FilterIcon,
  Link as LinkIcon,
  Download as DownloadIcon,
  MoreVert as MoreVertIcon,
  CalendarToday as CalendarIcon,
  ContentCopy as ContentCopyIcon
} from '@mui/icons-material';
import apiClient from '../../utils/axiosConfig';
import { useNotification } from '../../contexts/NotificationContext';
import { useAuth } from '../../contexts/AuthContext';
import { useTranslation } from 'react-i18next';
import dayjs from 'dayjs';
import { useDateFormat } from '../../utils/dateFormatter';

// 优化的表格行组件，使用React.memo避免不必要的重渲染
const InvoiceTableRow = React.memo(({ invoice, onMenuOpen, getFileIcon, getStatusColor, getStatusLabel, getCategoryLabel, t, showNotification }) => {
  const formatDate = useDateFormat(false);
  
  const handleCopyNumber = useCallback((e, number) => {
    e.stopPropagation();
    if (number && number !== '-') {
      navigator.clipboard.writeText(number).then(() => {
        showNotification(t('common.copied') || '已复制', 'success');
      }).catch(() => {
        showNotification(t('common.copyFailed') || '复制失败', 'error');
      });
    }
  }, [showNotification, t]);

  const formattedInvoiceDate = useMemo(() => 
    formatDate(invoice.invoiceDate),
    [invoice.invoiceDate, formatDate]
  );

  const formattedCreatedAt = useMemo(() => {
    if (!invoice.createdAt) return '-';
    const dateStr = formatDate(invoice.createdAt);
    const timeStr = dayjs(invoice.createdAt).format('HH:mm');
    return `${dateStr} ${timeStr}`;
  }, [invoice.createdAt, formatDate]);

  return (
    <TableRow hover>
      <TableCell>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {getFileIcon(invoice.file?.mimeType)}
          <Typography variant="body2" color="text.secondary">
            {invoice.file?.originalName || '-'}
          </Typography>
        </Box>
      </TableCell>
      <TableCell>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <Typography 
            variant="body2" 
            sx={{
              fontWeight: 500,
              fontFamily: 'monospace',
              fontSize: '0.875rem',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              maxWidth: '200px'
            }}
          >
            {invoice.invoiceNumber || '-'}
          </Typography>
          {invoice.invoiceNumber && invoice.invoiceNumber !== '-' && (
            <IconButton
              size="small"
              onClick={(e) => handleCopyNumber(e, invoice.invoiceNumber)}
              sx={{ 
                p: 0.5,
                '&:hover': { bgcolor: 'action.hover' }
              }}
            >
              <ContentCopyIcon fontSize="small" sx={{ fontSize: 14 }} />
            </IconButton>
          )}
        </Box>
      </TableCell>
      <TableCell>{invoice.vendor?.name || '-'}</TableCell>
      <TableCell sx={{ whiteSpace: 'nowrap' }}>
        {(invoice.totalAmount || invoice.amount) ? (
          <Typography variant="body2" fontWeight={600}>
            {invoice.currency || 'CNY'} {(invoice.totalAmount || invoice.amount).toFixed(2)}
          </Typography>
        ) : (
          '-'
        )}
      </TableCell>
      <TableCell sx={{ whiteSpace: 'nowrap' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <CalendarIcon color="action" fontSize="small" />
          <Typography variant="body2">
            {formattedInvoiceDate}
          </Typography>
        </Box>
      </TableCell>
      <TableCell>
        <Chip
          label={getCategoryLabel(invoice.category)}
          size="small"
          variant="outlined"
        />
      </TableCell>
      <TableCell>
        <Chip
          label={getStatusLabel(invoice.status)}
          color={getStatusColor(invoice.status)}
          size="small"
        />
      </TableCell>
      <TableCell>
        {invoice.relatedExpense ? (
          <Chip
            icon={<LinkIcon />}
            label={t('invoice.list.expense')}
            size="small"
            color="info"
          />
        ) : invoice.relatedTravel ? (
          <Chip
            icon={<LinkIcon />}
            label={t('invoice.list.travel')}
            size="small"
            color="info"
          />
        ) : (
          '-'
        )}
      </TableCell>
      <TableCell sx={{ whiteSpace: 'nowrap' }}>
        {formattedCreatedAt}
      </TableCell>
      <TableCell align="right">
        <IconButton
          onClick={(e) => onMenuOpen(e, invoice)}
          size="small"
        >
          <MoreVertIcon />
        </IconButton>
      </TableCell>
    </TableRow>
  );
}, (prevProps, nextProps) => {
  // 自定义比较函数，只在关键属性变化时重渲染
  return (
    prevProps.invoice._id === nextProps.invoice._id &&
    prevProps.invoice.status === nextProps.invoice.status &&
    prevProps.invoice.invoiceNumber === nextProps.invoice.invoiceNumber &&
    prevProps.invoice.totalAmount === nextProps.invoice.totalAmount
  );
});

InvoiceTableRow.displayName = 'InvoiceTableRow';

const InvoiceList = () => {
  const { t } = useTranslation();
  const { showNotification } = useNotification();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [deleteDialog, setDeleteDialog] = useState({ open: false, invoice: null });
  const [anchorEl, setAnchorEl] = useState(null);
  const [selectedInvoice, setSelectedInvoice] = useState(null);

  const fetchInvoices = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const params = {
        page,
        limit: 20,
        sortBy: 'createdAt',
        sortOrder: 'desc'
      };

      if (statusFilter !== 'all') {
        params.status = statusFilter;
      }

      if (categoryFilter !== 'all') {
        params.category = categoryFilter;
      }

      if (searchTerm) {
        params.search = searchTerm;
      }

      const response = await apiClient.get('/invoices', { params });

      if (response.data && response.data.success) {
        setInvoices(response.data.data || []);
        setTotalPages(response.data.pages || 1);
      } else {
        throw new Error(response.data?.message || t('invoice.list.fetchError'));
      }
    } catch (err) {
      console.error('Fetch invoices error:', err);
      setError(err.response?.data?.message || err.message || t('invoice.list.fetchError'));
      showNotification(t('invoice.list.fetchError'), 'error');
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter, categoryFilter, searchTerm, showNotification, t]);

  useEffect(() => {
    fetchInvoices();
  }, [fetchInvoices]);

  const handleSearch = useCallback(() => {
    setPage(1);
    fetchInvoices();
  }, [fetchInvoices]);

  const handleReset = useCallback(() => {
    setSearchTerm('');
    setStatusFilter('all');
    setCategoryFilter('all');
    setPage(1);
    setTimeout(() => fetchInvoices(), 100);
  }, [fetchInvoices]);

  const handleMenuOpen = useCallback((event, invoice) => {
    setAnchorEl(event.currentTarget);
    setSelectedInvoice(invoice);
  }, []);

  const handleMenuClose = useCallback(() => {
    setAnchorEl(null);
    setSelectedInvoice(null);
  }, []);

  const handleDelete = useCallback(() => {
    if (selectedInvoice) {
      setDeleteDialog({ open: true, invoice: selectedInvoice });
    }
    handleMenuClose();
  }, [selectedInvoice, handleMenuClose]);

  const confirmDelete = useCallback(async () => {
    try {
      await apiClient.delete(`/invoices/${deleteDialog.invoice._id}`);
      showNotification(t('invoice.list.deleteSuccess'), 'success');
      fetchInvoices();
    } catch (err) {
      console.error('Delete invoice error:', err);
      const errorMsg = err.response?.data?.message || t('invoice.list.deleteError');
      showNotification(errorMsg, 'error');
    } finally {
      setDeleteDialog({ open: false, invoice: null });
    }
  }, [deleteDialog.invoice, showNotification, t, fetchInvoices]);

  const handleView = useCallback(() => {
    if (selectedInvoice) {
      navigate(`/invoices/${selectedInvoice._id}`);
    }
    handleMenuClose();
  }, [selectedInvoice, navigate, handleMenuClose]);

  const handleDownload = useCallback(async () => {
    const invoice = selectedInvoice;
    if (!invoice) {
      handleMenuClose();
      return;
    }
    try {
      const response = await apiClient.get(`/invoices/${invoice._id}/file`, {
        responseType: 'blob'
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', invoice.file.originalName);
      document.body.appendChild(link);
      link.click();
      link.remove();
      
      showNotification(t('invoice.list.downloadSuccess'), 'success');
    } catch (err) {
      console.error('Download error:', err);
      showNotification(t('invoice.list.downloadError'), 'error');
    } finally {
      handleMenuClose();
    }
  }, [selectedInvoice, showNotification, t, handleMenuClose]);

  // 使用 useCallback 优化函数
  const getFileIcon = useCallback((mimeType) => {
    if (mimeType?.includes('pdf')) {
      return <PdfIcon />;
    }
    if (mimeType?.includes('image')) {
      return <ImageIcon />;
    }
    return <ImageIcon />;
  }, []);

  const getStatusColor = useCallback((status) => {
    const colors = {
      pending: 'warning',
      verified: 'success',
      linked: 'info',
      archived: 'default'
    };
    return colors[status] || 'default';
  }, []);

  const getStatusLabel = useCallback((status) => {
    const labels = {
      pending: t('invoice.list.statuses.pending'),
      verified: t('invoice.list.statuses.verified'),
      linked: t('invoice.list.statuses.linked'),
      archived: t('invoice.list.statuses.archived')
    };
    return labels[status] || status;
  }, [t]);

  const getCategoryLabel = useCallback((category) => {
    const labels = {
      transportation: t('invoice.list.categories.transportation'),
      accommodation: t('invoice.list.categories.accommodation'),
      meals: t('invoice.list.categories.meals'),
      entertainment: t('invoice.list.categories.entertainment'),
      communication: t('invoice.list.categories.communication'),
      office_supplies: t('invoice.list.categories.office_supplies'),
      training: t('invoice.list.categories.training'),
      other: t('invoice.list.categories.other')
    };
    return labels[category] || category;
  }, [t]);

  return (
    <Container maxWidth="xl">
      <Box sx={{ py: 3 }}>
        {/* Header */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <PdfIcon sx={{ fontSize: 32, color: 'primary.main' }} />
            <Typography variant="h4" fontWeight={600}>
              {t('invoice.list.title')}
            </Typography>
          </Box>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => navigate('/invoices/upload')}
            sx={{ borderRadius: 2 }}
          >
            {t('invoice.list.uploadInvoice')}
          </Button>
        </Box>

        {/* Filters */}
        <Paper sx={{ p: 2, mb: 3 }}>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                placeholder={t('invoice.list.searchPlaceholder')}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
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
                <InputLabel>{t('invoice.list.status')}</InputLabel>
                <Select
                  value={statusFilter}
                  label={t('invoice.list.status')}
                  onChange={(e) => setStatusFilter(e.target.value)}
                >
                  <MenuItem value="all">{t('invoice.list.all')}</MenuItem>
                  <MenuItem value="pending">{t('invoice.list.statuses.pending')}</MenuItem>
                  <MenuItem value="verified">{t('invoice.list.statuses.verified')}</MenuItem>
                  <MenuItem value="linked">{t('invoice.list.statuses.linked')}</MenuItem>
                  <MenuItem value="archived">{t('invoice.list.statuses.archived')}</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={3}>
              <FormControl fullWidth>
                <InputLabel>{t('invoice.list.category')}</InputLabel>
                <Select
                  value={categoryFilter}
                  label={t('invoice.list.category')}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                >
                  <MenuItem value="all">{t('invoice.list.all')}</MenuItem>
                  <MenuItem value="transportation">{t('invoice.list.categories.transportation')}</MenuItem>
                  <MenuItem value="accommodation">{t('invoice.list.categories.accommodation')}</MenuItem>
                  <MenuItem value="meals">{t('invoice.list.categories.meals')}</MenuItem>
                  <MenuItem value="entertainment">{t('invoice.list.categories.entertainment')}</MenuItem>
                  <MenuItem value="communication">{t('invoice.list.categories.communication')}</MenuItem>
                  <MenuItem value="office_supplies">{t('invoice.list.categories.office_supplies')}</MenuItem>
                  <MenuItem value="training">{t('invoice.list.categories.training')}</MenuItem>
                  <MenuItem value="other">{t('invoice.list.categories.other')}</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={2}>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Button
                  variant="outlined"
                  startIcon={<SearchIcon />}
                  onClick={handleSearch}
                  sx={{ flex: 1 }}
                >
                  {t('common.search')}
                </Button>
                <Button
                  variant="outlined"
                  startIcon={<RefreshIcon />}
                  onClick={handleReset}
                  sx={{ flex: 1 }}
                >
                  {t('common.refresh')}
                </Button>
              </Box>
            </Grid>
          </Grid>
        </Paper>

        {/* Error Alert */}
        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {/* Table */}
        <TableContainer component={Paper}>
          {loading && <LinearProgress />}
          <Table>
            <TableHead>
              <TableRow>
                <TableCell sx={{ whiteSpace: 'nowrap' }}>{t('invoice.list.columns.preview')}</TableCell>
                <TableCell sx={{ whiteSpace: 'nowrap' }}>{t('invoice.list.columns.invoiceNumber')}</TableCell>
                <TableCell sx={{ whiteSpace: 'nowrap' }}>{t('invoice.list.columns.vendorName')}</TableCell>
                <TableCell sx={{ whiteSpace: 'nowrap' }}>{t('invoice.list.columns.amount')}</TableCell>
                <TableCell sx={{ whiteSpace: 'nowrap' }}>{t('invoice.list.columns.invoiceDate')}</TableCell>
                <TableCell sx={{ whiteSpace: 'nowrap' }}>{t('invoice.list.columns.category')}</TableCell>
                <TableCell sx={{ whiteSpace: 'nowrap' }}>{t('invoice.list.columns.status')}</TableCell>
                <TableCell sx={{ whiteSpace: 'nowrap' }}>{t('invoice.list.columns.link')}</TableCell>
                <TableCell sx={{ whiteSpace: 'nowrap' }}>{t('invoice.list.columns.uploadTime')}</TableCell>
                <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>{t('invoice.list.columns.actions')}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {invoices.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={10} align="center" sx={{ py: 4 }}>
                    {loading ? <CircularProgress /> : t('invoice.list.noData')}
                  </TableCell>
                </TableRow>
              ) : (
                invoices.map((invoice) => (
                  <InvoiceTableRow
                    key={invoice._id}
                    invoice={invoice}
                    onMenuOpen={handleMenuOpen}
                    getFileIcon={getFileIcon}
                    getStatusColor={getStatusColor}
                    getStatusLabel={getStatusLabel}
                    getCategoryLabel={getCategoryLabel}
                    t={t}
                    showNotification={showNotification}
                  />
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>

        {/* Pagination */}
        {totalPages > 1 && (
          <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
            <Pagination
              count={totalPages}
              page={page}
              onChange={(e, value) => setPage(value)}
              color="primary"
            />
          </Box>
        )}

        {/* Action Menu */}
        <Menu
          anchorEl={anchorEl}
          open={Boolean(anchorEl)}
          onClose={handleMenuClose}
        >
          <MenuItem onClick={handleView}>
            <VisibilityIcon sx={{ mr: 1.5, fontSize: 20 }} />
            {t('common.view')}
          </MenuItem>
          <MenuItem onClick={handleDownload}>
            <DownloadIcon sx={{ mr: 1.5, fontSize: 20 }} />
            {t('invoice.list.download')}
          </MenuItem>
          <MenuItem onClick={handleDelete} sx={{ color: 'error.main' }}>
            <DeleteIcon sx={{ mr: 1.5, fontSize: 20 }} />
            {t('common.delete')}
          </MenuItem>
        </Menu>

        {/* Delete Dialog */}
        <Dialog open={deleteDialog.open} onClose={() => setDeleteDialog({ open: false, invoice: null })}>
          <DialogTitle>{t('invoice.list.confirmDelete')}</DialogTitle>
          <DialogContent>
            <Typography>
              {t('invoice.list.deleteMessage')} <strong>{deleteDialog.invoice?.invoiceNumber || deleteDialog.invoice?.file?.originalName}</strong>?
            </Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDeleteDialog({ open: false, invoice: null })}>{t('common.cancel')}</Button>
            <Button onClick={confirmDelete} color="error" variant="contained">
              {t('common.delete')}
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </Container>
  );
};

export default InvoiceList;

