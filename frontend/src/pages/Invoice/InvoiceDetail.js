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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Download as DownloadIcon,
  PictureAsPdf as PdfIcon,
  Image as ImageIcon,
  Link as LinkIcon,
  Business as BusinessIcon,
  CalendarToday as CalendarIcon,
  AttachMoney as MoneyIcon,
  Description as DescriptionIcon,
  AutoAwesome as OCRIcon,
  ExpandMore as ExpandMoreIcon,
  Visibility as VisibilityIcon
} from '@mui/icons-material';
import apiClient from '../../utils/axiosConfig';
import { useNotification } from '../../contexts/NotificationContext';
import { useTranslation } from 'react-i18next';
import dayjs from 'dayjs';

const InvoiceDetail = () => {
  const { t } = useTranslation();
  const { showNotification } = useNotification();
  const { id } = useParams();
  const navigate = useNavigate();

  const [invoice, setInvoice] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [formData, setFormData] = useState({});
  const [filePreview, setFilePreview] = useState(null);
  const [showOcrInfo, setShowOcrInfo] = useState(false);

  useEffect(() => {
    fetchInvoiceDetail();
  }, [id]);

  const fetchInvoiceDetail = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get(`/invoices/${id}`);

      if (response.data && response.data.success) {
        const invoiceData = response.data.data;
        setInvoice(invoiceData);
        // 初始化表单数据，确保包含所有字段
        setFormData({
          invoiceNumber: invoiceData.invoiceNumber || '',
          invoiceDate: invoiceData.invoiceDate || '',
          invoiceType: invoiceData.invoiceType || '',
          amount: invoiceData.amount || '',
          currency: invoiceData.currency || 'CNY',
          taxAmount: invoiceData.taxAmount || '',
          totalAmount: invoiceData.totalAmount || '',
          category: invoiceData.category || 'other',
          vendor: invoiceData.vendor || {},
          buyer: invoiceData.buyer || {},
          items: invoiceData.items || [],
          issuer: invoiceData.issuer || '',
          traveler: invoiceData.traveler || {},
          totalAmountInWords: invoiceData.totalAmountInWords || '',
          notes: invoiceData.notes || ''
        });
        
        // 如果是图片，加载预览
        if (invoiceData.file?.mimeType?.startsWith('image/')) {
          loadFilePreview(invoiceData._id);
        }
      } else {
        throw new Error(response.data?.message || '获取发票详情失败');
      }
    } catch (err) {
      console.error('Fetch invoice error:', err);
      setError(err.response?.data?.message || err.message || '获取发票详情失败');
      showNotification('获取发票详情失败', 'error');
    } finally {
      setLoading(false);
    }
  };

  const loadFilePreview = async (invoiceId) => {
    try {
      const response = await apiClient.get(`/invoices/${invoiceId}/file`, {
        responseType: 'blob'
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      setFilePreview(url);
    } catch (err) {
      console.error('Load preview error:', err);
    }
  };

  const handleDownload = async () => {
    try {
      const response = await apiClient.get(`/invoices/${id}/file`, {
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

  const handleDelete = async () => {
    try {
      await apiClient.delete(`/invoices/${id}`);
      showNotification('发票删除成功', 'success');
      navigate('/invoices');
    } catch (err) {
      console.error('Delete error:', err);
      showNotification('删除发票失败', 'error');
    }
  };

  const handleUpdate = async () => {
    try {
      // 构建更新数据
      const updateData = {
        invoiceNumber: formData.invoiceNumber || null,
        invoiceDate: formData.invoiceDate || null,
        invoiceType: formData.invoiceType || null,
        amount: formData.amount ? parseFloat(formData.amount) : null,
        currency: formData.currency || 'CNY',
        taxAmount: formData.taxAmount ? parseFloat(formData.taxAmount) : null,
        totalAmount: formData.totalAmount ? parseFloat(formData.totalAmount) : null,
        category: formData.category || 'other',
        notes: formData.notes || null,
        vendor: {
          name: formData.vendor?.name || null,
          taxId: formData.vendor?.taxId || null,
          address: formData.vendor?.address || null
        },
        buyer: {
          name: formData.buyer?.name || null,
          taxId: formData.buyer?.taxId || null,
          address: formData.buyer?.address || null
        },
        items: formData.items || [],
        issuer: formData.issuer || null,
        traveler: {
          name: formData.traveler?.name || null,
          idNumber: formData.traveler?.idNumber || null,
          travelDate: formData.traveler?.travelDate || null,
          departure: formData.traveler?.departure || null,
          destination: formData.traveler?.destination || null,
          class: formData.traveler?.class || null,
          vehicleType: formData.traveler?.vehicleType || null
        },
        totalAmountInWords: formData.totalAmountInWords || null
      };

      const response = await apiClient.put(`/invoices/${id}`, updateData);
      if (response.data && response.data.success) {
        const updatedInvoice = response.data.data;
        setInvoice(updatedInvoice);
        // 更新表单数据
        setFormData({
          invoiceNumber: updatedInvoice.invoiceNumber || '',
          invoiceDate: updatedInvoice.invoiceDate || '',
          invoiceType: updatedInvoice.invoiceType || '',
          amount: updatedInvoice.amount || '',
          currency: updatedInvoice.currency || 'CNY',
          taxAmount: updatedInvoice.taxAmount || '',
          totalAmount: updatedInvoice.totalAmount || '',
          category: updatedInvoice.category || 'other',
          vendor: updatedInvoice.vendor || {},
          buyer: updatedInvoice.buyer || {},
          items: updatedInvoice.items || [],
          issuer: updatedInvoice.issuer || '',
          traveler: updatedInvoice.traveler || {},
          totalAmountInWords: updatedInvoice.totalAmountInWords || '',
          notes: updatedInvoice.notes || ''
        });
        setEditDialogOpen(false);
        showNotification('发票更新成功', 'success');
      }
    } catch (err) {
      console.error('Update error:', err);
      showNotification('更新发票失败', 'error');
    }
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

  if (loading) {
    return (
      <Container maxWidth="lg">
        <Box sx={{ py: 3 }}>
          <LinearProgress />
        </Box>
      </Container>
    );
  }

  if (error || !invoice) {
    return (
      <Container maxWidth="lg">
        <Box sx={{ py: 3 }}>
          <Alert severity="error">{error || '发票不存在'}</Alert>
          <Button sx={{ mt: 2 }} onClick={() => navigate('/invoices')}>
            返回列表
          </Button>
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg">
      <Box sx={{ py: 3 }}>
        {/* Header */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
          <IconButton onClick={() => navigate('/invoices')}>
            <ArrowBackIcon />
          </IconButton>
          <Typography variant="h4" fontWeight={600}>
            发票详情
          </Typography>
          <Box sx={{ flexGrow: 1 }} />
          {invoice.ocrData?.extracted && (
            <Chip
              icon={<OCRIcon />}
              label={`OCR识别 (${Math.round(invoice.ocrData.confidence || 0)}%)`}
              color="info"
              sx={{ mr: 2 }}
            />
          )}
          <Chip
            label={getStatusLabel(invoice.status)}
            color={getStatusColor(invoice.status)}
            sx={{ mr: 2 }}
          />
          <Button
            variant="outlined"
            startIcon={<DownloadIcon />}
            onClick={handleDownload}
            sx={{ mr: 1 }}
          >
            下载
          </Button>
          <Button
            variant="outlined"
            startIcon={<EditIcon />}
            onClick={() => setEditDialogOpen(true)}
            sx={{ mr: 1 }}
          >
            编辑
          </Button>
          <Button
            variant="outlined"
            color="error"
            startIcon={<DeleteIcon />}
            onClick={() => setDeleteDialogOpen(true)}
          >
            删除
          </Button>
        </Box>

        <Grid container spacing={3}>
          {/* Left Column - File Preview and Related Info */}
          <Grid item xs={12} lg={5}>
            {/* File Preview */}
            <Paper sx={{ p: 2, mb: 2 }}>
              <Typography variant="h6" gutterBottom>
                发票文件
              </Typography>
              <Divider sx={{ mb: 2 }} />
              {filePreview ? (
                <Box
                  component="img"
                  src={filePreview}
                  alt="Invoice"
                  sx={{
                    width: '100%',
                    maxHeight: 500,
                    objectFit: 'contain',
                    borderRadius: 2,
                    border: 1,
                    borderColor: 'divider'
                  }}
                />
              ) : (
                <Box
                  sx={{
                    border: 1,
                    borderColor: 'divider',
                    borderRadius: 2,
                    p: 4,
                    textAlign: 'center',
                    bgcolor: 'grey.50',
                    minHeight: 300
                  }}
                >
                  {invoice.file?.mimeType?.includes('pdf') ? (
                    <PdfIcon sx={{ fontSize: 64, color: 'text.secondary' }} />
                  ) : (
                    <ImageIcon sx={{ fontSize: 64, color: 'text.secondary' }} />
                  )}
                  <Typography variant="body1" sx={{ mt: 2 }}>
                    {invoice.file?.originalName}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {invoice.file?.size ? `${(invoice.file.size / 1024 / 1024).toFixed(2)} MB` : '-'}
                  </Typography>
                </Box>
              )}
            </Paper>

            {/* File Information */}
            <Paper sx={{ p: 2, mb: 2 }}>
              <Typography variant="h6" gutterBottom>
                文件信息
              </Typography>
              <Divider sx={{ mb: 2 }} />
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                    <DescriptionIcon sx={{ fontSize: 18, color: 'text.secondary' }} />
                    <Typography variant="body2" color="text.secondary">文件名</Typography>
                  </Box>
                  <Typography variant="body2" sx={{ wordBreak: 'break-word' }}>
                    {invoice.file?.originalName || '-'}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                    <Typography variant="body2" color="text.secondary">文件大小</Typography>
                  </Box>
                  <Typography variant="body2">
                    {invoice.file?.size ? `${(invoice.file.size / 1024 / 1024).toFixed(2)} MB` : '-'}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                    <Typography variant="body2" color="text.secondary">文件类型</Typography>
                  </Box>
                  <Typography variant="body2">{invoice.file?.mimeType || '-'}</Typography>
                </Grid>
                {invoice.file?.uploadedAt && (
                  <Grid item xs={12}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                      <CalendarIcon sx={{ fontSize: 18, color: 'text.secondary' }} />
                      <Typography variant="body2" color="text.secondary">上传时间</Typography>
                    </Box>
                    <Typography variant="body2">
                      {dayjs(invoice.file.uploadedAt).format('YYYY-MM-DD HH:mm:ss')}
                    </Typography>
                  </Grid>
                )}
              </Grid>
            </Paper>

            {/* Related Information */}
            {(invoice.relatedExpense || invoice.relatedTravel) && (
              <Paper sx={{ p: 2, mb: 2 }}>
                <Typography variant="h6" gutterBottom>
                  关联信息
                </Typography>
                <Divider sx={{ mb: 2 }} />
                {invoice.relatedExpense && (
                  <Box sx={{ mb: 1 }}>
                    <Chip
                      icon={<LinkIcon />}
                      label={`费用: ${invoice.relatedExpense.title || invoice.relatedExpense._id}`}
                      color="info"
                      onClick={() => navigate(`/expenses/${invoice.relatedExpense._id}`)}
                      sx={{ cursor: 'pointer' }}
                    />
                  </Box>
                )}
                {invoice.relatedTravel && (
                  <Box>
                    <Chip
                      icon={<LinkIcon />}
                      label={`差旅: ${invoice.relatedTravel.title || invoice.relatedTravel._id}`}
                      color="info"
                      onClick={() => navigate(`/travel/${invoice.relatedTravel._id}`)}
                      sx={{ cursor: 'pointer' }}
                    />
                  </Box>
                )}
              </Paper>
            )}

            {/* Tags */}
            {invoice.tags && invoice.tags.length > 0 && (
              <Paper sx={{ p: 2, mb: 2 }}>
                <Typography variant="h6" gutterBottom>
                  标签
                </Typography>
                <Divider sx={{ mb: 2 }} />
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                  {invoice.tags.map((tag, index) => (
                    <Chip key={index} label={tag} size="small" variant="outlined" />
                  ))}
                </Box>
              </Paper>
            )}

            {/* System Information */}
            <Paper sx={{ p: 2 }}>
              <Typography variant="h6" gutterBottom>
                系统信息
              </Typography>
              <Divider sx={{ mb: 2 }} />
              <Grid container spacing={2}>
                {invoice.uploadedBy && typeof invoice.uploadedBy === 'object' && (
                  <Grid item xs={12}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                      <Typography variant="body2" color="text.secondary">上传人</Typography>
                    </Box>
                    <Typography variant="body2">
                      {invoice.uploadedBy.firstName} {invoice.uploadedBy.lastName}
                    </Typography>
                  </Grid>
                )}
                {invoice.createdAt && (
                  <Grid item xs={12}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                      <CalendarIcon sx={{ fontSize: 18, color: 'text.secondary' }} />
                      <Typography variant="body2" color="text.secondary">创建时间</Typography>
                    </Box>
                    <Typography variant="body2">
                      {dayjs(invoice.createdAt).format('YYYY-MM-DD HH:mm:ss')}
                    </Typography>
                  </Grid>
                )}
                {invoice.updatedAt && (
                  <Grid item xs={12}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                      <CalendarIcon sx={{ fontSize: 18, color: 'text.secondary' }} />
                      <Typography variant="body2" color="text.secondary">更新时间</Typography>
                    </Box>
                    <Typography variant="body2">
                      {dayjs(invoice.updatedAt).format('YYYY-MM-DD HH:mm:ss')}
                    </Typography>
                  </Grid>
                )}
                {invoice.verifiedBy && typeof invoice.verifiedBy === 'object' && (
                  <Grid item xs={12}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                      <Typography variant="body2" color="text.secondary">审核人</Typography>
                    </Box>
                    <Typography variant="body2">
                      {invoice.verifiedBy.firstName} {invoice.verifiedBy.lastName}
                    </Typography>
                  </Grid>
                )}
                {invoice.verifiedAt && (
                  <Grid item xs={12}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                      <CalendarIcon sx={{ fontSize: 18, color: 'text.secondary' }} />
                      <Typography variant="body2" color="text.secondary">审核时间</Typography>
                    </Box>
                    <Typography variant="body2">
                      {dayjs(invoice.verifiedAt).format('YYYY-MM-DD HH:mm:ss')}
                    </Typography>
                  </Grid>
                )}
              </Grid>
            </Paper>
          </Grid>

          {/* Right Column - Invoice Information */}
          <Grid item xs={12} lg={7}>
            {/* Basic Information */}
            <Paper sx={{ p: 2, mb: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                <Typography variant="h6">
                  基本信息
                </Typography>
                {invoice.ocrData?.extracted && (
                  <Chip
                    icon={<OCRIcon />}
                    label="已自动识别"
                    color="info"
                    size="small"
                  />
                )}
              </Box>
              <Divider sx={{ mb: 2 }} />
              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                    <DescriptionIcon sx={{ fontSize: 18, color: 'text.secondary' }} />
                    <Typography variant="body2" color="text.secondary">发票号</Typography>
                    {invoice.ocrData?.extracted && invoice.invoiceNumber && (
                      <Chip label="OCR" size="small" color="info" sx={{ height: 18, fontSize: '0.65rem' }} />
                    )}
                  </Box>
                  <Typography variant="body1" fontWeight={500}>
                    {invoice.invoiceNumber || '-'}
                  </Typography>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                    <DescriptionIcon sx={{ fontSize: 18, color: 'text.secondary' }} />
                    <Typography variant="body2" color="text.secondary">发票类型</Typography>
                    {invoice.ocrData?.extracted && invoice.invoiceType && (
                      <Chip label="OCR" size="small" color="info" sx={{ height: 18, fontSize: '0.65rem' }} />
                    )}
                  </Box>
                  <Typography variant="body1">
                    {invoice.invoiceType || '-'}
                  </Typography>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                    <CalendarIcon sx={{ fontSize: 18, color: 'text.secondary' }} />
                    <Typography variant="body2" color="text.secondary">发票日期</Typography>
                    {invoice.ocrData?.extracted && invoice.invoiceDate && (
                      <Chip label="OCR" size="small" color="info" sx={{ height: 18, fontSize: '0.65rem' }} />
                    )}
                  </Box>
                  <Typography variant="body1">
                    {invoice.invoiceDate
                      ? dayjs(invoice.invoiceDate).format('YYYY-MM-DD')
                      : '-'}
                  </Typography>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                    <DescriptionIcon sx={{ fontSize: 18, color: 'text.secondary' }} />
                    <Typography variant="body2" color="text.secondary">分类</Typography>
                  </Box>
                  <Chip label={getCategoryLabel(invoice.category)} size="small" />
                </Grid>
                <Grid item xs={12} md={6}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                    <MoneyIcon sx={{ fontSize: 18, color: 'text.secondary' }} />
                    <Typography variant="body2" color="text.secondary">合计金额</Typography>
                    {invoice.ocrData?.extracted && invoice.amount && (
                      <Chip label="OCR" size="small" color="info" sx={{ height: 18, fontSize: '0.65rem' }} />
                    )}
                  </Box>
                  <Typography variant="body1" fontWeight={600}>
                    {invoice.amount
                      ? `${invoice.currency || 'CNY'} ${invoice.amount.toFixed(2)}`
                      : '-'}
                  </Typography>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                    <MoneyIcon sx={{ fontSize: 18, color: 'text.secondary' }} />
                    <Typography variant="body2" color="text.secondary">税额</Typography>
                    {invoice.ocrData?.extracted && invoice.taxAmount && (
                      <Chip label="OCR" size="small" color="info" sx={{ height: 18, fontSize: '0.65rem' }} />
                    )}
                  </Box>
                  <Typography variant="body1">
                    {invoice.taxAmount !== undefined && invoice.taxAmount !== null
                      ? `${invoice.currency || 'CNY'} ${invoice.taxAmount.toFixed(2)}`
                      : '-'}
                  </Typography>
                </Grid>
                <Grid item xs={12}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                    <MoneyIcon sx={{ fontSize: 18, color: 'text.secondary' }} />
                    <Typography variant="body2" color="text.secondary">价税合计（小写）</Typography>
                    {invoice.ocrData?.extracted && invoice.totalAmount && (
                      <Chip label="OCR" size="small" color="info" sx={{ height: 18, fontSize: '0.65rem' }} />
                    )}
                  </Box>
                  <Typography variant="body1" fontWeight={600} color="primary">
                    {invoice.totalAmount
                      ? `${invoice.currency || 'CNY'} ${invoice.totalAmount.toFixed(2)}`
                      : '-'}
                  </Typography>
                </Grid>
                {invoice.totalAmountInWords && (
                  <Grid item xs={12}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                      <MoneyIcon sx={{ fontSize: 18, color: 'text.secondary' }} />
                      <Typography variant="body2" color="text.secondary">价税合计（大写）</Typography>
                    </Box>
                    <Typography variant="body1" fontWeight={500}>
                      {invoice.totalAmountInWords}
                    </Typography>
                  </Grid>
                )}
              </Grid>
            </Paper>

            {/* Vendor Information */}
            {(invoice.vendor?.name || invoice.vendor?.taxId || invoice.vendor?.address || invoice.vendor?.phone) && (
              <Paper sx={{ p: 2, mb: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="h6">
                    销售方信息
                  </Typography>
                  {invoice.ocrData?.extracted && invoice.vendor?.name && (
                    <Chip
                      icon={<OCRIcon />}
                      label="已自动识别"
                      color="info"
                      size="small"
                    />
                  )}
                </Box>
                <Divider sx={{ mb: 2 }} />
                <Grid container spacing={2}>
                  {invoice.vendor.name && (
                    <Grid item xs={12}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                        <BusinessIcon sx={{ fontSize: 18, color: 'text.secondary' }} />
                        <Typography variant="body2" color="text.secondary">销售方名称</Typography>
                        {invoice.ocrData?.extracted && invoice.vendor?.name && (
                          <Chip label="OCR" size="small" color="info" sx={{ height: 18, fontSize: '0.65rem' }} />
                        )}
                      </Box>
                      <Typography variant="body1">{invoice.vendor.name}</Typography>
                    </Grid>
                  )}
                  {invoice.vendor.taxId && (
                    <Grid item xs={12} md={6}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                        <Typography variant="body2" color="text.secondary">销售方税号</Typography>
                        {invoice.ocrData?.extracted && invoice.vendor?.taxId && (
                          <Chip label="OCR" size="small" color="info" sx={{ height: 18, fontSize: '0.65rem' }} />
                        )}
                      </Box>
                      <Typography variant="body1">{invoice.vendor.taxId}</Typography>
                    </Grid>
                  )}
                  {invoice.vendor.phone && (
                    <Grid item xs={12} md={6}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                        <Typography variant="body2" color="text.secondary">联系电话</Typography>
                        {invoice.ocrData?.extracted && invoice.vendor?.phone && (
                          <Chip label="OCR" size="small" color="info" sx={{ height: 18, fontSize: '0.65rem' }} />
                        )}
                      </Box>
                      <Typography variant="body1">{invoice.vendor.phone}</Typography>
                    </Grid>
                  )}
                  {invoice.vendor.address && (
                    <Grid item xs={12}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                        <Typography variant="body2" color="text.secondary">地址</Typography>
                        {invoice.ocrData?.extracted && invoice.vendor?.address && (
                          <Chip label="OCR" size="small" color="info" sx={{ height: 18, fontSize: '0.65rem' }} />
                        )}
                      </Box>
                      <Typography variant="body1">{invoice.vendor.address}</Typography>
                    </Grid>
                  )}
                </Grid>
              </Paper>
            )}

            {/* Buyer Information */}
            {(invoice.buyer?.name || invoice.buyer?.taxId || invoice.buyer?.address || invoice.buyer?.phone) && (
              <Paper sx={{ p: 2, mb: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="h6">
                    购买方信息
                  </Typography>
                  {invoice.ocrData?.extracted && invoice.buyer?.name && (
                    <Chip
                      icon={<OCRIcon />}
                      label="已自动识别"
                      color="info"
                      size="small"
                    />
                  )}
                </Box>
                <Divider sx={{ mb: 2 }} />
                <Grid container spacing={2}>
                  {invoice.buyer.name && (
                    <Grid item xs={12}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                        <BusinessIcon sx={{ fontSize: 18, color: 'text.secondary' }} />
                        <Typography variant="body2" color="text.secondary">购买方名称</Typography>
                        {invoice.ocrData?.extracted && invoice.buyer?.name && (
                          <Chip label="OCR" size="small" color="info" sx={{ height: 18, fontSize: '0.65rem' }} />
                        )}
                      </Box>
                      <Typography variant="body1">{invoice.buyer.name}</Typography>
                    </Grid>
                  )}
                  {invoice.buyer.taxId && (
                    <Grid item xs={12} md={6}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                        <Typography variant="body2" color="text.secondary">购买方税号</Typography>
                        {invoice.ocrData?.extracted && invoice.buyer?.taxId && (
                          <Chip label="OCR" size="small" color="info" sx={{ height: 18, fontSize: '0.65rem' }} />
                        )}
                      </Box>
                      <Typography variant="body1">{invoice.buyer.taxId}</Typography>
                    </Grid>
                  )}
                  {invoice.buyer.phone && (
                    <Grid item xs={12} md={6}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                        <Typography variant="body2" color="text.secondary">联系电话</Typography>
                        {invoice.ocrData?.extracted && invoice.buyer?.phone && (
                          <Chip label="OCR" size="small" color="info" sx={{ height: 18, fontSize: '0.65rem' }} />
                        )}
                      </Box>
                      <Typography variant="body1">{invoice.buyer.phone}</Typography>
                    </Grid>
                  )}
                  {invoice.buyer.address && (
                    <Grid item xs={12}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                        <Typography variant="body2" color="text.secondary">地址</Typography>
                        {invoice.ocrData?.extracted && invoice.buyer?.address && (
                          <Chip label="OCR" size="small" color="info" sx={{ height: 18, fontSize: '0.65rem' }} />
                        )}
                      </Box>
                      <Typography variant="body1">{invoice.buyer.address}</Typography>
                    </Grid>
                  )}
                </Grid>
              </Paper>
            )}

            {/* Invoice Items */}
            {invoice.items && invoice.items.length > 0 && (
              <Paper sx={{ p: 2, mb: 2 }}>
                <Typography variant="h6" gutterBottom>
                  发票项目明细
                </Typography>
                <Divider sx={{ mb: 2 }} />
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>项目名称</TableCell>
                        <TableCell align="right">单价</TableCell>
                        <TableCell align="right">数量</TableCell>
                        <TableCell align="right">金额</TableCell>
                        <TableCell align="center">税率</TableCell>
                        <TableCell align="right">税额</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {invoice.items.map((item, index) => (
                        <TableRow key={index}>
                          <TableCell>{item.name || '-'}</TableCell>
                          <TableCell align="right">
                            {item.unitPrice !== undefined && item.unitPrice !== null
                              ? `${invoice.currency || 'CNY'} ${item.unitPrice.toFixed(2)}`
                              : '-'}
                          </TableCell>
                          <TableCell align="right">{item.quantity || '-'}</TableCell>
                          <TableCell align="right">
                            {item.amount !== undefined && item.amount !== null
                              ? `${invoice.currency || 'CNY'} ${item.amount.toFixed(2)}`
                              : '-'}
                          </TableCell>
                          <TableCell align="center">{item.taxRate || '-'}</TableCell>
                          <TableCell align="right">
                            {item.taxAmount !== undefined && item.taxAmount !== null
                              ? `${invoice.currency || 'CNY'} ${item.taxAmount.toFixed(2)}`
                              : '-'}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Paper>
            )}

            {/* Issuer Information */}
            {invoice.issuer && (
              <Paper sx={{ p: 2, mb: 2 }}>
                <Typography variant="h6" gutterBottom>
                  开票信息
                </Typography>
                <Divider sx={{ mb: 2 }} />
                <Grid container spacing={2}>
                  <Grid item xs={12}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                      <DescriptionIcon sx={{ fontSize: 18, color: 'text.secondary' }} />
                      <Typography variant="body2" color="text.secondary">开票人</Typography>
                      {invoice.ocrData?.extracted && invoice.issuer && (
                        <Chip label="OCR" size="small" color="info" sx={{ height: 18, fontSize: '0.65rem' }} />
                      )}
                    </Box>
                    <Typography variant="body1">{invoice.issuer}</Typography>
                  </Grid>
                </Grid>
              </Paper>
            )}

            {/* Traveler Information */}
            {(invoice.traveler?.name || invoice.traveler?.departure || invoice.traveler?.destination || invoice.traveler?.idNumber) && (
              <Paper sx={{ p: 2, mb: 2 }}>
                <Typography variant="h6" gutterBottom>
                  出行人信息
                </Typography>
                <Divider sx={{ mb: 2 }} />
                <Grid container spacing={2}>
                  {invoice.traveler.name && (
                    <Grid item xs={12} md={6}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                        <Typography variant="body2" color="text.secondary">出行人姓名</Typography>
                        {invoice.ocrData?.extracted && invoice.traveler?.name && (
                          <Chip label="OCR" size="small" color="info" sx={{ height: 18, fontSize: '0.65rem' }} />
                        )}
                      </Box>
                      <Typography variant="body1">{invoice.traveler.name}</Typography>
                    </Grid>
                  )}
                  {invoice.traveler.idNumber && (
                    <Grid item xs={12} md={6}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                        <Typography variant="body2" color="text.secondary">身份证号</Typography>
                        {invoice.ocrData?.extracted && invoice.traveler?.idNumber && (
                          <Chip label="OCR" size="small" color="info" sx={{ height: 18, fontSize: '0.65rem' }} />
                        )}
                      </Box>
                      <Typography variant="body1">{invoice.traveler.idNumber}</Typography>
                    </Grid>
                  )}
                  {invoice.traveler.travelDate && (
                    <Grid item xs={12} md={6}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                        <CalendarIcon sx={{ fontSize: 18, color: 'text.secondary' }} />
                        <Typography variant="body2" color="text.secondary">出行日期</Typography>
                        {invoice.ocrData?.extracted && invoice.traveler?.travelDate && (
                          <Chip label="OCR" size="small" color="info" sx={{ height: 18, fontSize: '0.65rem' }} />
                        )}
                      </Box>
                      <Typography variant="body1">
                        {dayjs(invoice.traveler.travelDate).format('YYYY-MM-DD')}
                      </Typography>
                    </Grid>
                  )}
                  {invoice.traveler.departure && (
                    <Grid item xs={12} md={6}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                        <Typography variant="body2" color="text.secondary">出发地</Typography>
                        {invoice.ocrData?.extracted && invoice.traveler?.departure && (
                          <Chip label="OCR" size="small" color="info" sx={{ height: 18, fontSize: '0.65rem' }} />
                        )}
                      </Box>
                      <Typography variant="body1">{invoice.traveler.departure}</Typography>
                    </Grid>
                  )}
                  {invoice.traveler.destination && (
                    <Grid item xs={12} md={6}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                        <Typography variant="body2" color="text.secondary">到达地</Typography>
                        {invoice.ocrData?.extracted && invoice.traveler?.destination && (
                          <Chip label="OCR" size="small" color="info" sx={{ height: 18, fontSize: '0.65rem' }} />
                        )}
                      </Box>
                      <Typography variant="body1">{invoice.traveler.destination}</Typography>
                    </Grid>
                  )}
                  {invoice.traveler.class && (
                    <Grid item xs={12} md={6}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                        <Typography variant="body2" color="text.secondary">舱位/座位</Typography>
                        {invoice.ocrData?.extracted && invoice.traveler?.class && (
                          <Chip label="OCR" size="small" color="info" sx={{ height: 18, fontSize: '0.65rem' }} />
                        )}
                      </Box>
                      <Typography variant="body1">{invoice.traveler.class}</Typography>
                    </Grid>
                  )}
                  {invoice.traveler.vehicleType && (
                    <Grid item xs={12} md={6}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                        <Typography variant="body2" color="text.secondary">交通工具</Typography>
                        {invoice.ocrData?.extracted && invoice.traveler?.vehicleType && (
                          <Chip label="OCR" size="small" color="info" sx={{ height: 18, fontSize: '0.65rem' }} />
                        )}
                      </Box>
                      <Typography variant="body1">{invoice.traveler.vehicleType}</Typography>
                    </Grid>
                  )}
                </Grid>
              </Paper>
            )}

            {/* Notes */}
            {invoice.notes && (
              <Paper sx={{ p: 2 }}>
                <Typography variant="h6" gutterBottom>
                  备注
                </Typography>
                <Divider sx={{ mb: 2 }} />
                <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>{invoice.notes}</Typography>
              </Paper>
            )}
          </Grid>
        </Grid>

        {/* Edit Dialog */}
        <Dialog open={editDialogOpen} onClose={() => setEditDialogOpen(false)} maxWidth="sm" fullWidth>
          <DialogTitle>
            编辑发票
            {invoice?.ocrData?.extracted && (
              <Chip
                icon={<OCRIcon />}
                label={`OCR识别 (置信度: ${Math.round(invoice.ocrData.confidence || 0)}%)`}
                color="info"
                size="small"
                sx={{ ml: 2 }}
                onClick={() => setShowOcrInfo(!showOcrInfo)}
                style={{ cursor: 'pointer' }}
              />
            )}
          </DialogTitle>
          <DialogContent>
            {/* OCR识别详细信息展示 */}
            {invoice?.ocrData?.extracted && showOcrInfo && (
              <Box sx={{ mb: 2 }}>
                <Accordion defaultExpanded>
                  <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, width: '100%' }}>
                      <OCRIcon color="primary" />
                      <Typography variant="subtitle1" sx={{ flexGrow: 1 }}>
                        OCR识别详细信息
                      </Typography>
                      <Chip 
                        label={`置信度: ${Math.round(invoice.ocrData.confidence || 0)}%`} 
                        size="small" 
                        color="info"
                      />
                    </Box>
                  </AccordionSummary>
                  <AccordionDetails>
                    {/* 显示Markdown格式的OCR结果 */}
                    {(() => {
                      // 优先使用pages中的markdown数据
                      let markdownContent = '';
                      if (invoice.ocrData.rawData?.pages && Array.isArray(invoice.ocrData.rawData.pages)) {
                        markdownContent = invoice.ocrData.rawData.pages
                          .sort((a, b) => (a.index || 0) - (b.index || 0))
                          .map(page => page.markdown || '')
                          .filter(text => text.trim().length > 0)
                          .join('\n\n');
                      } else if (invoice.ocrData.rawData?.text) {
                        markdownContent = invoice.ocrData.rawData.text;
                      } else if (invoice.ocrData.rawData?.fullResponse?.pages) {
                        markdownContent = invoice.ocrData.rawData.fullResponse.pages
                          .sort((a, b) => (a.index || 0) - (b.index || 0))
                          .map(page => page.markdown || '')
                          .filter(text => text.trim().length > 0)
                          .join('\n\n');
                      }

                      if (!markdownContent) {
                        return (
                          <Typography variant="body2" color="text.secondary">
                            暂无OCR识别内容
                          </Typography>
                        );
                      }

                      // Markdown表格解析和渲染
                      const parseMarkdownTable = (markdown) => {
                        const lines = markdown.split('\n');
                        const tables = [];
                        let currentTable = null;
                        let headerRow = null;
                        let separatorRow = null;

                        lines.forEach((line, index) => {
                          const trimmed = line.trim();
                          // 检测表格行（包含 | 符号，且至少3个部分：|内容|内容|）
                          if (trimmed.includes('|') && trimmed.split('|').length > 2) {
                            // 移除首尾的空|，然后分割
                            const cells = trimmed.split('|')
                              .map(c => c.trim())
                              .filter((c, i, arr) => {
                                // 保留第一个和最后一个空字符串（如果存在），以及所有非空内容
                                if (i === 0 || i === arr.length - 1) return true;
                                return c.length > 0;
                              })
                              .map(c => c.trim());
                            
                            // 检测分隔符行（通常是 |---|---| 或 |:---:| 等）
                            const isSeparator = cells.every(c => /^:?-+:?$/.test(c) || c === '');
                            
                            if (isSeparator) {
                              separatorRow = index;
                              // 如果已经有表头，确认表格开始
                              if (headerRow !== null && headerRow === index - 1) {
                                if (!currentTable) {
                                  currentTable = {
                                    header: lines[headerRow].split('|')
                                      .map(c => c.trim())
                                      .filter((c, i, arr) => {
                                        if (i === 0 || i === arr.length - 1) return c.length === 0 ? false : true;
                                        return true;
                                      })
                                      .map(c => c.trim()),
                                    rows: []
                                  };
                                }
                              }
                              return;
                            }

                            // 如果是表头（分隔符之前的第一行）
                            if (separatorRow === null && cells.length > 1) {
                              headerRow = index;
                            } 
                            // 如果是数据行（分隔符之后）
                            else if (currentTable && separatorRow !== null && index > separatorRow) {
                              const rowCells = trimmed.split('|')
                                .map(c => c.trim())
                                .filter((c, i, arr) => {
                                  if (i === 0 || i === arr.length - 1) return c.length === 0 ? false : true;
                                  return true;
                                })
                                .map(c => c.trim());
                              
                              // 确保列数匹配
                              if (rowCells.length === currentTable.header.length) {
                                currentTable.rows.push(rowCells);
                              }
                            }
                          } else {
                            // 非表格行，结束当前表格
                            if (currentTable && currentTable.rows.length > 0) {
                              tables.push(currentTable);
                              currentTable = null;
                            }
                            headerRow = null;
                            separatorRow = null;
                          }
                        });

                        // 添加最后一个表格
                        if (currentTable && currentTable.rows.length > 0) {
                          tables.push(currentTable);
                        }

                        return tables;
                      };

                      const tables = parseMarkdownTable(markdownContent);
                      const nonTableContent = markdownContent.split('\n').filter(line => {
                        const trimmed = line.trim();
                        return !trimmed.includes('|') || trimmed.split('|').length <= 2;
                      }).join('\n');

                      return (
                        <Box>
                          {/* 非表格内容 */}
                          {nonTableContent.trim() && (
                            <Box sx={{ mb: 2, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
                              <Typography 
                                variant="body2" 
                                sx={{ 
                                  fontFamily: 'monospace', 
                                  whiteSpace: 'pre-wrap',
                                  fontSize: '0.875rem',
                                  lineHeight: 1.6
                                }}
                              >
                                {nonTableContent}
                              </Typography>
                            </Box>
                          )}

                          {/* 表格内容 */}
                          {tables.map((table, tableIndex) => (
                            <TableContainer 
                              key={tableIndex} 
                              component={Paper} 
                              sx={{ mb: 2, maxHeight: 400, overflow: 'auto' }}
                            >
                              <Table size="small" stickyHeader>
                                <TableHead>
                                  <TableRow>
                                    {table.header.map((cell, cellIndex) => (
                                      <TableCell 
                                        key={cellIndex}
                                        sx={{ 
                                          fontWeight: 'bold',
                                          bgcolor: 'primary.light',
                                          color: 'primary.contrastText'
                                        }}
                                      >
                                        {cell}
                                      </TableCell>
                                    ))}
                                  </TableRow>
                                </TableHead>
                                <TableBody>
                                  {table.rows.map((row, rowIndex) => (
                                    <TableRow key={rowIndex}>
                                      {row.map((cell, cellIndex) => (
                                        <TableCell key={cellIndex}>
                                          {cell || '-'}
                                        </TableCell>
                                      ))}
                                    </TableRow>
                                  ))}
                                </TableBody>
                              </Table>
                            </TableContainer>
                          ))}

                          {/* 如果没有解析到表格，显示原始markdown */}
                          {tables.length === 0 && (
                            <Box sx={{ p: 2, bgcolor: 'grey.50', borderRadius: 1, maxHeight: 400, overflow: 'auto' }}>
                              <Typography 
                                variant="body2" 
                                sx={{ 
                                  fontFamily: 'monospace', 
                                  whiteSpace: 'pre-wrap',
                                  fontSize: '0.875rem',
                                  lineHeight: 1.6
                                }}
                              >
                                {markdownContent}
                              </Typography>
                            </Box>
                          )}
                        </Box>
                      );
                    })()}
                  </AccordionDetails>
                </Accordion>
              </Box>
            )}
            
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="发票号"
                  value={formData.invoiceNumber || ''}
                  onChange={(e) => setFormData({ ...formData, invoiceNumber: e.target.value })}
                  helperText={invoice?.ocrData?.extracted && invoice.invoiceNumber ? '已通过OCR自动识别' : ''}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="发票日期"
                  type="date"
                  value={formData.invoiceDate ? dayjs(formData.invoiceDate).format('YYYY-MM-DD') : ''}
                  onChange={(e) => setFormData({ ...formData, invoiceDate: e.target.value })}
                  InputLabelProps={{ shrink: true }}
                  helperText={invoice?.ocrData?.extracted && invoice.invoiceDate ? '已通过OCR自动识别' : ''}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="发票类型"
                  value={formData.invoiceType || ''}
                  onChange={(e) => setFormData({ ...formData, invoiceType: e.target.value })}
                  placeholder="如：电子发票(普通发票)"
                  helperText={invoice?.ocrData?.extracted && invoice.invoiceType ? '已通过OCR自动识别' : ''}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel>货币</InputLabel>
                  <Select
                    value={formData.currency || 'CNY'}
                    label="货币"
                    onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                  >
                    <MenuItem value="CNY">CNY</MenuItem>
                    <MenuItem value="USD">USD</MenuItem>
                    <MenuItem value="JPY">JPY</MenuItem>
                    <MenuItem value="KRW">KRW</MenuItem>
                    <MenuItem value="EUR">EUR</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={4}>
                <TextField
                  fullWidth
                  label="合计金额"
                  type="number"
                  value={formData.amount || ''}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  helperText={invoice?.ocrData?.extracted && invoice.amount ? '已通过OCR自动识别' : ''}
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <TextField
                  fullWidth
                  label="税额合计"
                  type="number"
                  value={formData.taxAmount || ''}
                  onChange={(e) => setFormData({ ...formData, taxAmount: e.target.value })}
                  helperText={invoice?.ocrData?.extracted && invoice.taxAmount ? '已通过OCR自动识别' : ''}
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <TextField
                  fullWidth
                  label="价税合计（小写）"
                  type="number"
                  value={formData.totalAmount || ''}
                  onChange={(e) => setFormData({ ...formData, totalAmount: e.target.value })}
                  helperText={invoice?.ocrData?.extracted && invoice.totalAmount ? '已通过OCR自动识别' : ''}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel>分类</InputLabel>
                  <Select
                    value={formData.category || 'other'}
                    label="分类"
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  >
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
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="商户名称"
                  value={formData.vendor?.name || ''}
                  onChange={(e) => setFormData({ 
                    ...formData, 
                    vendor: { ...formData.vendor, name: e.target.value }
                  })}
                  helperText={invoice?.ocrData?.extracted && invoice.vendor?.name ? '已通过OCR自动识别' : ''}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="税号"
                  value={formData.vendor?.taxId || ''}
                  onChange={(e) => setFormData({ 
                    ...formData, 
                    vendor: { ...formData.vendor, taxId: e.target.value }
                  })}
                  helperText={invoice?.ocrData?.extracted && invoice.vendor?.taxId ? '已通过OCR自动识别' : ''}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="商户地址"
                  value={formData.vendor?.address || ''}
                  onChange={(e) => setFormData({ 
                    ...formData, 
                    vendor: { ...formData.vendor, address: e.target.value }
                  })}
                  helperText={invoice?.ocrData?.extracted && invoice.vendor?.address ? '已通过OCR自动识别' : ''}
                />
              </Grid>

              {/* 购买方信息 */}
              <Grid item xs={12}>
                <Divider sx={{ my: 1 }} />
                <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 'bold' }}>购买方信息</Typography>
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="购买方名称"
                  value={formData.buyer?.name || ''}
                  onChange={(e) => setFormData({ 
                    ...formData, 
                    buyer: { ...formData.buyer, name: e.target.value }
                  })}
                  helperText={invoice?.ocrData?.extracted && invoice.buyer?.name ? '已通过OCR自动识别' : ''}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="购买方税号"
                  value={formData.buyer?.taxId || ''}
                  onChange={(e) => setFormData({ 
                    ...formData, 
                    buyer: { ...formData.buyer, taxId: e.target.value }
                  })}
                  helperText={invoice?.ocrData?.extracted && invoice.buyer?.taxId ? '已通过OCR自动识别' : ''}
                />
              </Grid>

              {/* 发票项目明细 */}
              {formData.items && formData.items.length > 0 && (
                <>
                  <Grid item xs={12}>
                    <Divider sx={{ my: 1 }} />
                    <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 'bold' }}>发票项目明细</Typography>
                  </Grid>
                  <Grid item xs={12}>
                    <TableContainer component={Paper} variant="outlined">
                      <Table size="small">
                        <TableHead>
                          <TableRow>
                            <TableCell>项目名称</TableCell>
                            <TableCell align="right">单价</TableCell>
                            <TableCell align="right">数量</TableCell>
                            <TableCell align="right">金额</TableCell>
                            <TableCell align="center">税率</TableCell>
                            <TableCell align="right">税额</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {formData.items.map((item, index) => (
                            <TableRow key={index}>
                              <TableCell>{item.name || '-'}</TableCell>
                              <TableCell align="right">{item.unitPrice ? `¥${item.unitPrice.toFixed(2)}` : '-'}</TableCell>
                              <TableCell align="right">{item.quantity || '-'}</TableCell>
                              <TableCell align="right">{item.amount ? `¥${item.amount.toFixed(2)}` : '-'}</TableCell>
                              <TableCell align="center">{item.taxRate || '-'}</TableCell>
                              <TableCell align="right">{item.taxAmount ? `¥${item.taxAmount.toFixed(2)}` : '-'}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  </Grid>
                </>
              )}

              {/* 开票人 */}
              {formData.issuer && (
                <>
                  <Grid item xs={12}>
                    <Divider sx={{ my: 1 }} />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      label="开票人"
                      value={formData.issuer || ''}
                      onChange={(e) => setFormData({ ...formData, issuer: e.target.value })}
                      helperText={invoice?.ocrData?.extracted && invoice.issuer ? '已通过OCR自动识别' : ''}
                    />
                  </Grid>
                </>
              )}

              {/* 出行人信息 */}
              {(formData.traveler?.name || formData.traveler?.departure || formData.traveler?.destination) && (
                <>
                  <Grid item xs={12}>
                    <Divider sx={{ my: 1 }} />
                    <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 'bold' }}>出行人信息</Typography>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      label="出行人姓名"
                      value={formData.traveler?.name || ''}
                      onChange={(e) => setFormData({ 
                        ...formData, 
                        traveler: { ...formData.traveler, name: e.target.value }
                      })}
                      helperText={invoice?.ocrData?.extracted && invoice.traveler?.name ? '已通过OCR自动识别' : ''}
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      label="身份证号"
                      value={formData.traveler?.idNumber || ''}
                      onChange={(e) => setFormData({ 
                        ...formData, 
                        traveler: { ...formData.traveler, idNumber: e.target.value }
                      })}
                      helperText={invoice?.ocrData?.extracted && invoice.traveler?.idNumber ? '已通过OCR自动识别' : ''}
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      label="出发地"
                      value={formData.traveler?.departure || ''}
                      onChange={(e) => setFormData({ 
                        ...formData, 
                        traveler: { ...formData.traveler, departure: e.target.value }
                      })}
                      helperText={invoice?.ocrData?.extracted && invoice.traveler?.departure ? '已通过OCR自动识别' : ''}
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      label="到达地"
                      value={formData.traveler?.destination || ''}
                      onChange={(e) => setFormData({ 
                        ...formData, 
                        traveler: { ...formData.traveler, destination: e.target.value }
                      })}
                      helperText={invoice?.ocrData?.extracted && invoice.traveler?.destination ? '已通过OCR自动识别' : ''}
                    />
                  </Grid>
                </>
              )}

              {/* 价税合计（大写） */}
              {formData.totalAmountInWords && (
                <>
                  <Grid item xs={12}>
                    <Divider sx={{ my: 1 }} />
                  </Grid>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      label="价税合计（大写）"
                      value={formData.totalAmountInWords || ''}
                      onChange={(e) => setFormData({ ...formData, totalAmountInWords: e.target.value })}
                      helperText={invoice?.ocrData?.extracted && invoice.totalAmountInWords ? '已通过OCR自动识别' : ''}
                    />
                  </Grid>
                </>
              )}

              <Grid item xs={12}>
                <Divider sx={{ my: 1 }} />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="备注"
                  value={formData.notes || ''}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  multiline
                  rows={3}
                />
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setEditDialogOpen(false)}>取消</Button>
            <Button onClick={handleUpdate} variant="contained">
              保存
            </Button>
          </DialogActions>
        </Dialog>

        {/* Delete Dialog */}
        <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
          <DialogTitle>确认删除</DialogTitle>
          <DialogContent>
            <Typography>
              确定要删除发票 <strong>{invoice.invoiceNumber || invoice.file?.originalName}</strong> 吗？
            </Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDeleteDialogOpen(false)}>取消</Button>
            <Button onClick={handleDelete} color="error" variant="contained">
              删除
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </Container>
  );
};

export default InvoiceDetail;

