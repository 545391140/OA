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
  Tooltip
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
  Download as DownloadIcon
} from '@mui/icons-material';
import apiClient from '../../utils/axiosConfig';
import { useNotification } from '../../contexts/NotificationContext';
import { useAuth } from '../../contexts/AuthContext';
import { useTranslation } from 'react-i18next';
import dayjs from 'dayjs';

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

  useEffect(() => {
    fetchInvoices();
  }, [page, statusFilter, categoryFilter]);

  const fetchInvoices = async () => {
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
        throw new Error(response.data?.message || '获取发票列表失败');
      }
    } catch (err) {
      console.error('Fetch invoices error:', err);
      setError(err.response?.data?.message || err.message || '获取发票列表失败');
      showNotification('获取发票列表失败', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    setPage(1);
    fetchInvoices();
  };

  const handleReset = () => {
    setSearchTerm('');
    setStatusFilter('all');
    setCategoryFilter('all');
    setPage(1);
    setTimeout(() => fetchInvoices(), 100);
  };

  const handleDelete = (invoice) => {
    setDeleteDialog({ open: true, invoice });
  };

  const confirmDelete = async () => {
    try {
      await apiClient.delete(`/invoices/${deleteDialog.invoice._id}`);
      showNotification('发票删除成功', 'success');
      fetchInvoices();
    } catch (err) {
      console.error('Delete invoice error:', err);
      const errorMsg = err.response?.data?.message || '删除发票失败';
      showNotification(errorMsg, 'error');
    } finally {
      setDeleteDialog({ open: false, invoice: null });
    }
  };

  const handleView = (invoice) => {
    navigate(`/invoices/${invoice._id}`);
  };

  const handleDownload = async (invoice) => {
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
      
      showNotification('文件下载成功', 'success');
    } catch (err) {
      console.error('Download error:', err);
      showNotification('文件下载失败', 'error');
    }
  };

  const getFileIcon = (mimeType) => {
    if (mimeType?.includes('pdf')) {
      return <PdfIcon />;
    }
    if (mimeType?.includes('image')) {
      return <ImageIcon />;
    }
    return <ImageIcon />;
  };

  const getStatusColor = (status) => {
    const colors = {
      pending: 'warning',
      verified: 'success',
      linked: 'info',
      archived: 'default'
    };
    return colors[status] || 'default';
  };

  const getStatusLabel = (status) => {
    const labels = {
      pending: '待审核',
      verified: '已审核',
      linked: '已关联',
      archived: '已归档'
    };
    return labels[status] || status;
  };

  const getCategoryLabel = (category) => {
    const labels = {
      transportation: '交通',
      accommodation: '住宿',
      meals: '餐饮',
      entertainment: '娱乐',
      communication: '通讯',
      office_supplies: '办公用品',
      training: '培训',
      other: '其他'
    };
    return labels[category] || category;
  };

  return (
    <Container maxWidth="xl">
      <Box sx={{ py: 3 }}>
        {/* Header */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <PdfIcon sx={{ fontSize: 32, color: 'primary.main' }} />
            <Typography variant="h4" fontWeight={600}>
              发票夹
            </Typography>
          </Box>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => navigate('/invoices/upload')}
            sx={{ borderRadius: 2 }}
          >
            上传发票
          </Button>
        </Box>

        {/* Filters */}
        <Paper sx={{ p: 2, mb: 3 }}>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                placeholder="搜索发票号、商户名称..."
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
                <InputLabel>状态</InputLabel>
                <Select
                  value={statusFilter}
                  label="状态"
                  onChange={(e) => setStatusFilter(e.target.value)}
                >
                  <MenuItem value="all">全部</MenuItem>
                  <MenuItem value="pending">待审核</MenuItem>
                  <MenuItem value="verified">已审核</MenuItem>
                  <MenuItem value="linked">已关联</MenuItem>
                  <MenuItem value="archived">已归档</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={3}>
              <FormControl fullWidth>
                <InputLabel>分类</InputLabel>
                <Select
                  value={categoryFilter}
                  label="分类"
                  onChange={(e) => setCategoryFilter(e.target.value)}
                >
                  <MenuItem value="all">全部</MenuItem>
                  <MenuItem value="transportation">交通</MenuItem>
                  <MenuItem value="accommodation">住宿</MenuItem>
                  <MenuItem value="meals">餐饮</MenuItem>
                  <MenuItem value="entertainment">娱乐</MenuItem>
                  <MenuItem value="communication">通讯</MenuItem>
                  <MenuItem value="office_supplies">办公用品</MenuItem>
                  <MenuItem value="training">培训</MenuItem>
                  <MenuItem value="other">其他</MenuItem>
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
                  搜索
                </Button>
                <Button
                  variant="outlined"
                  startIcon={<RefreshIcon />}
                  onClick={handleReset}
                  sx={{ flex: 1 }}
                >
                  重置
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
                <TableCell>预览</TableCell>
                <TableCell>发票号</TableCell>
                <TableCell>商户名称</TableCell>
                <TableCell>金额</TableCell>
                <TableCell>发票日期</TableCell>
                <TableCell>分类</TableCell>
                <TableCell>状态</TableCell>
                <TableCell>关联</TableCell>
                <TableCell>上传时间</TableCell>
                <TableCell align="right">操作</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {invoices.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={10} align="center" sx={{ py: 4 }}>
                    {loading ? <CircularProgress /> : '暂无发票数据'}
                  </TableCell>
                </TableRow>
              ) : (
                invoices.map((invoice) => (
                  <TableRow key={invoice._id} hover>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        {getFileIcon(invoice.file?.mimeType)}
                        <Typography variant="body2" color="text.secondary">
                          {invoice.file?.originalName || '-'}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" fontWeight={500}>
                        {invoice.invoiceNumber || '-'}
                      </Typography>
                    </TableCell>
                    <TableCell>{invoice.vendor?.name || '-'}</TableCell>
                    <TableCell>
                      {invoice.amount ? (
                        <Typography variant="body2" fontWeight={600}>
                          {invoice.currency || 'CNY'} {invoice.amount.toFixed(2)}
                        </Typography>
                      ) : (
                        '-'
                      )}
                    </TableCell>
                    <TableCell>
                      {invoice.invoiceDate
                        ? dayjs(invoice.invoiceDate).format('YYYY-MM-DD')
                        : '-'}
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
                          label="费用"
                          size="small"
                          color="info"
                        />
                      ) : invoice.relatedTravel ? (
                        <Chip
                          icon={<LinkIcon />}
                          label="差旅"
                          size="small"
                          color="info"
                        />
                      ) : (
                        '-'
                      )}
                    </TableCell>
                    <TableCell>
                      {dayjs(invoice.createdAt).format('YYYY-MM-DD HH:mm')}
                    </TableCell>
                    <TableCell align="right">
                      <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
                        <Tooltip title="查看">
                          <IconButton
                            size="small"
                            onClick={() => handleView(invoice)}
                            color="primary"
                          >
                            <VisibilityIcon />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="下载">
                          <IconButton
                            size="small"
                            onClick={() => handleDownload(invoice)}
                            color="primary"
                          >
                            <DownloadIcon />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="删除">
                          <IconButton
                            size="small"
                            onClick={() => handleDelete(invoice)}
                            color="error"
                          >
                            <DeleteIcon />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    </TableCell>
                  </TableRow>
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

        {/* Delete Dialog */}
        <Dialog open={deleteDialog.open} onClose={() => setDeleteDialog({ open: false, invoice: null })}>
          <DialogTitle>确认删除</DialogTitle>
          <DialogContent>
            <Typography>
              确定要删除发票 <strong>{deleteDialog.invoice?.invoiceNumber || deleteDialog.invoice?.file?.originalName}</strong> 吗？
            </Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDeleteDialog({ open: false, invoice: null })}>取消</Button>
            <Button onClick={confirmDelete} color="error" variant="contained">
              删除
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </Container>
  );
};

export default InvoiceList;

