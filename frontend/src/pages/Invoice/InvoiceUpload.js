import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container,
  Box,
  Typography,
  Button,
  Paper,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  Alert,
  LinearProgress,
  CircularProgress,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  InputAdornment
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  CloudUpload as UploadIcon,
  Delete as DeleteIcon,
  PictureAsPdf as PdfIcon,
  Image as ImageIcon,
  AutoAwesome as OCRIcon,
  CheckCircle as CheckCircleIcon
} from '@mui/icons-material';
import apiClient from '../../utils/axiosConfig';
import { useNotification } from '../../contexts/NotificationContext';
import { useTranslation } from 'react-i18next';
import dayjs from 'dayjs';
import { amountToChinese } from '../../utils/amountToChinese';

const InvoiceUpload = () => {
  const { t } = useTranslation();
  const { showNotification } = useNotification();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    invoiceNumber: '',
    invoiceDate: dayjs().format('YYYY-MM-DD'),
    invoiceType: '', // 发票类型
    amount: '',
    currency: 'CNY',
    taxAmount: '',
    totalAmount: '',
    category: 'other',
    vendorName: '',
    vendorTaxId: '',
    vendorAddress: '',
    buyerName: '', // 购买方名称
    buyerTaxId: '', // 购买方税号
    items: [], // 项目明细
    issuer: '', // 开票人
    totalAmountInWords: '', // 价税合计（大写）
    notes: '',
    tags: []
  });

  const [file, setFile] = useState(null);
  const [filePreview, setFilePreview] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [errors, setErrors] = useState({});
  const [ocrRecognizing, setOcrRecognizing] = useState(false);
  const [ocrResult, setOcrResult] = useState(null);
  const [showOcrDialog, setShowOcrDialog] = useState(false);
  const [uploadedInvoiceId, setUploadedInvoiceId] = useState(null);

  const handleChange = (field) => (e) => {
    const value = e.target.value;
    setFormData(prev => {
      const updated = {
        ...prev,
        [field]: value
      };
      
      // 当价税合计（小写）变化时，自动计算大写金额
      if (field === 'totalAmount') {
        const amount = parseFloat(value);
        if (!isNaN(amount) && amount >= 0) {
          updated.totalAmountInWords = amountToChinese(amount);
        } else {
          updated.totalAmountInWords = '';
        }
      }
      
      return updated;
    });
    
    // 清除该字段的错误
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const handleFileSelect = async (e) => {
    const selectedFile = e.target.files[0];
    if (!selectedFile) return;

    // 验证文件类型
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'application/pdf'];
    if (!allowedTypes.includes(selectedFile.type)) {
      showNotification('不支持的文件类型。仅支持图片和PDF文件。', 'error');
      return;
    }

    // 验证文件大小（10MB）
    if (selectedFile.size > 10 * 1024 * 1024) {
      showNotification('文件大小不能超过10MB', 'error');
      return;
    }

    setFile(selectedFile);
    setOcrResult(null); // 重置之前的识别结果

    // 如果是图片，创建预览
    if (selectedFile.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFilePreview(reader.result);
      };
      reader.readAsDataURL(selectedFile);
    } else {
      setFilePreview(null);
    }

    // 对于图片和PDF文件，立即自动进行OCR识别
    if (selectedFile.type.startsWith('image/') || selectedFile.type === 'application/pdf') {
      handleAutoOCR(selectedFile);
    }
  };

  const handleAutoOCR = async (fileToRecognize) => {
    // 支持图片和PDF文件
    if (!fileToRecognize || (!fileToRecognize.type.startsWith('image/') && fileToRecognize.type !== 'application/pdf')) {
      return;
    }

    try {
      setOcrRecognizing(true);
      
      // 调用OCR识别API（不创建发票记录）
      const formDataToSend = new FormData();
      formDataToSend.append('file', fileToRecognize);
      
      const ocrResponse = await apiClient.post('/invoices/recognize-image', formDataToSend, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      
      if (ocrResponse.data && ocrResponse.data.success) {
        const recognizedData = ocrResponse.data.data.recognizedData;
        
        setOcrResult(ocrResponse.data.data);
        
        // 自动应用识别结果到表单（如果表单字段为空或空字符串）
        // 辅助函数：检查字段是否为空
        const isEmpty = (value) => !value || (typeof value === 'string' && value.trim() === '');
        
        if (recognizedData?.invoiceNumber && isEmpty(formData.invoiceNumber)) {
          setFormData(prev => ({ ...prev, invoiceNumber: recognizedData.invoiceNumber }));
        }
        // 发票日期特殊处理：如果OCR识别到了日期，优先使用识别到的日期（覆盖默认日期）
        if (recognizedData?.invoiceDate) {
          setFormData(prev => ({ ...prev, invoiceDate: recognizedData.invoiceDate }));
        }
        if (recognizedData?.invoiceType && isEmpty(formData.invoiceType)) {
          setFormData(prev => ({ ...prev, invoiceType: recognizedData.invoiceType }));
        }
        if (recognizedData?.amount && isEmpty(formData.amount)) {
          setFormData(prev => ({ ...prev, amount: recognizedData.amount.toString() }));
        }
        if (recognizedData?.taxAmount && isEmpty(formData.taxAmount)) {
          setFormData(prev => ({ ...prev, taxAmount: recognizedData.taxAmount.toString() }));
        }
        if (recognizedData?.totalAmount && isEmpty(formData.totalAmount)) {
          const totalAmount = recognizedData.totalAmount.toString();
          setFormData(prev => {
            const updated = { ...prev, totalAmount };
            // 自动计算大写金额
            const amount = parseFloat(totalAmount);
            if (!isNaN(amount) && amount >= 0) {
              updated.totalAmountInWords = amountToChinese(amount);
            }
            return updated;
          });
        }
        if (recognizedData?.vendorName && isEmpty(formData.vendorName)) {
          setFormData(prev => ({ ...prev, vendorName: recognizedData.vendorName }));
        }
        if (recognizedData?.vendorTaxId && isEmpty(formData.vendorTaxId)) {
          setFormData(prev => ({ ...prev, vendorTaxId: recognizedData.vendorTaxId }));
        }
        if (recognizedData?.vendorAddress && isEmpty(formData.vendorAddress)) {
          setFormData(prev => ({ ...prev, vendorAddress: recognizedData.vendorAddress }));
        }
        if (recognizedData?.buyerName && isEmpty(formData.buyerName)) {
          setFormData(prev => ({ ...prev, buyerName: recognizedData.buyerName }));
        }
        if (recognizedData?.buyerTaxId && isEmpty(formData.buyerTaxId)) {
          setFormData(prev => ({ ...prev, buyerTaxId: recognizedData.buyerTaxId }));
        }
        if (recognizedData?.items && recognizedData.items.length > 0 && (!formData.items || formData.items.length === 0)) {
          setFormData(prev => ({ ...prev, items: recognizedData.items }));
        }
        if (recognizedData?.issuer && isEmpty(formData.issuer)) {
          setFormData(prev => ({ ...prev, issuer: recognizedData.issuer }));
        }
        // 不自动填充 totalAmountInWords，由前端根据 totalAmount 自动计算
        // 如果识别到了 totalAmount，会自动触发大写金额的计算
        
        showNotification('发票信息已自动识别并填充', 'success');
      } else {
        showNotification('OCR识别失败，您可以手动填写', 'warning');
      }
    } catch (err) {
      console.error('OCR recognize error:', err);
      // OCR失败不影响文件选择，只显示警告
      const errorMessage = err.response?.data?.message || err.message || 'OCR服务暂时不可用';
      showNotification(`自动识别失败: ${errorMessage}，您可以手动填写`, 'warning');
    } finally {
      setOcrRecognizing(false);
    }
  };

  const handleRemoveFile = () => {
    setFile(null);
    setFilePreview(null);
    setOcrResult(null);
    setOcrRecognizing(false);
  };

  const handleApplyOCR = () => {
    if (!ocrResult || !ocrResult.recognizedData) return;

    const recognized = ocrResult.recognizedData;
    
    // 辅助函数：检查字段是否为空
    const isEmpty = (value) => !value || (typeof value === 'string' && value.trim() === '');
    
    // 应用识别结果到表单（如果表单字段为空或空字符串）
    if (recognized.invoiceNumber && isEmpty(formData.invoiceNumber)) {
      setFormData(prev => ({ ...prev, invoiceNumber: recognized.invoiceNumber }));
    }
    // 发票日期特殊处理：如果OCR识别到了日期，优先使用识别到的日期（覆盖默认日期）
    if (recognized.invoiceDate) {
      setFormData(prev => ({ ...prev, invoiceDate: recognized.invoiceDate }));
    }
    if (recognized.invoiceType && isEmpty(formData.invoiceType)) {
      setFormData(prev => ({ ...prev, invoiceType: recognized.invoiceType }));
    }
    if (recognized.amount && isEmpty(formData.amount)) {
      setFormData(prev => ({ ...prev, amount: recognized.amount.toString() }));
    }
    if (recognized.taxAmount && isEmpty(formData.taxAmount)) {
      setFormData(prev => ({ ...prev, taxAmount: recognized.taxAmount.toString() }));
    }
    if (recognized.totalAmount && isEmpty(formData.totalAmount)) {
      const totalAmount = recognized.totalAmount.toString();
      setFormData(prev => {
        const updated = { ...prev, totalAmount };
        // 自动计算大写金额
        const amount = parseFloat(totalAmount);
        if (!isNaN(amount) && amount >= 0) {
          updated.totalAmountInWords = amountToChinese(amount);
        }
        return updated;
      });
    }
    if (recognized.vendorName && isEmpty(formData.vendorName)) {
      setFormData(prev => ({ ...prev, vendorName: recognized.vendorName }));
    }
    if (recognized.vendorTaxId && isEmpty(formData.vendorTaxId)) {
      setFormData(prev => ({ ...prev, vendorTaxId: recognized.vendorTaxId }));
    }
    if (recognized.vendorAddress && isEmpty(formData.vendorAddress)) {
      setFormData(prev => ({ ...prev, vendorAddress: recognized.vendorAddress }));
    }
    if (recognized.buyerName && isEmpty(formData.buyerName)) {
      setFormData(prev => ({ ...prev, buyerName: recognized.buyerName }));
    }
    if (recognized.buyerTaxId && isEmpty(formData.buyerTaxId)) {
      setFormData(prev => ({ ...prev, buyerTaxId: recognized.buyerTaxId }));
    }
    if (recognized.items && recognized.items.length > 0 && (!formData.items || formData.items.length === 0)) {
      setFormData(prev => ({ ...prev, items: recognized.items }));
    }
    if (recognized.issuer && isEmpty(formData.issuer)) {
      setFormData(prev => ({ ...prev, issuer: recognized.issuer }));
    }
    // 不自动填充 totalAmountInWords，由前端根据 totalAmount 自动计算
    // 如果识别到了 totalAmount，会自动触发大写金额的计算

    setShowOcrDialog(false);
    showNotification('OCR识别结果已应用到表单', 'success');
  };

  const validateForm = () => {
    const newErrors = {};

    if (!file) {
      newErrors.file = '请选择要上传的文件';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    try {
      setUploading(true);

      const formDataToSend = new FormData();
      formDataToSend.append('file', file);
      
      if (formData.invoiceNumber) formDataToSend.append('invoiceNumber', formData.invoiceNumber);
      if (formData.invoiceDate) formDataToSend.append('invoiceDate', formData.invoiceDate);
      if (formData.invoiceType) formDataToSend.append('invoiceType', formData.invoiceType);
      if (formData.amount) formDataToSend.append('amount', formData.amount);
      if (formData.currency) formDataToSend.append('currency', formData.currency);
      if (formData.taxAmount) formDataToSend.append('taxAmount', formData.taxAmount);
      if (formData.totalAmount) formDataToSend.append('totalAmount', formData.totalAmount);
      if (formData.category) formDataToSend.append('category', formData.category);
      if (formData.vendorName) formDataToSend.append('vendorName', formData.vendorName);
      if (formData.vendorTaxId) formDataToSend.append('vendorTaxId', formData.vendorTaxId);
      if (formData.vendorAddress) formDataToSend.append('vendorAddress', formData.vendorAddress);
      if (formData.buyerName) formDataToSend.append('buyerName', formData.buyerName);
      if (formData.buyerTaxId) formDataToSend.append('buyerTaxId', formData.buyerTaxId);
      if (formData.items && formData.items.length > 0) {
        formDataToSend.append('items', JSON.stringify(formData.items));
      }
      if (formData.issuer) formDataToSend.append('issuer', formData.issuer);
      if (formData.totalAmountInWords) formDataToSend.append('totalAmountInWords', formData.totalAmountInWords);
      if (formData.notes) formDataToSend.append('notes', formData.notes);
      if (formData.tags.length > 0) {
        formDataToSend.append('tags', JSON.stringify(formData.tags));
      }

      const response = await apiClient.post('/invoices/upload', formDataToSend, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      if (response.data && response.data.success) {
        const uploadedInvoice = response.data.data;
        
        // 检查是否有 OCR 识别结果
        if (uploadedInvoice.ocrData?.extracted) {
          showNotification('发票上传成功，已自动识别发票信息', 'success');
        } else {
          showNotification('发票上传成功', 'success');
        }
        
        // 跳转到详情页（识别结果会在详情页显示）
        navigate(`/invoices/${uploadedInvoice._id}`);
      } else {
        throw new Error(response.data?.message || '上传失败');
      }
    } catch (err) {
      console.error('Upload error:', err);
      const errorMsg = err.response?.data?.message || err.message || '发票上传失败';
      showNotification(errorMsg, 'error');
      setErrors({ submit: errorMsg });
    } finally {
      setUploading(false);
    }
  };

  const getFileIcon = () => {
    if (!file) return null;
    if (file.type.includes('pdf')) {
      return <PdfIcon sx={{ fontSize: 48 }} />;
    }
    return <ImageIcon sx={{ fontSize: 48 }} />;
  };

  return (
    <Container maxWidth="md">
      <Box sx={{ py: 3 }}>
        {/* Header */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
          <IconButton onClick={() => navigate('/invoices')}>
            <ArrowBackIcon />
          </IconButton>
          <Typography variant="h4" fontWeight={600}>
            上传发票
          </Typography>
        </Box>

        {errors.submit && (
          <Alert severity="error" sx={{ mb: 3 }} onClose={() => setErrors({})}>
            {errors.submit}
          </Alert>
        )}

        <Paper sx={{ p: 3 }}>
          <form onSubmit={handleSubmit}>
            {/* File Upload */}
            <Box sx={{ mb: 4 }}>
              <Typography variant="h6" gutterBottom>
                选择文件
              </Typography>
              {!file ? (
                <Box
                  sx={{
                    border: '2px dashed',
                    borderColor: 'divider',
                    borderRadius: 2,
                    p: 4,
                    textAlign: 'center',
                    cursor: 'pointer',
                    '&:hover': {
                      borderColor: 'primary.main',
                      bgcolor: 'action.hover'
                    }
                  }}
                  onClick={() => document.getElementById('file-input').click()}
                >
                  <input
                    id="file-input"
                    type="file"
                    accept="image/*,.pdf"
                    style={{ display: 'none' }}
                    onChange={handleFileSelect}
                  />
                  <UploadIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
                  <Typography variant="body1" gutterBottom>
                    点击选择文件或拖拽文件到此处
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    支持格式：JPG, PNG, GIF, WEBP, PDF（最大10MB）
                  </Typography>
                </Box>
              ) : (
                <Box sx={{ position: 'relative' }}>
                  {filePreview ? (
                    <Box
                      component="img"
                      src={filePreview}
                      alt="Preview"
                      sx={{
                        width: '100%',
                        maxHeight: 400,
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
                        bgcolor: 'grey.50'
                      }}
                    >
                      {getFileIcon()}
                      <Typography variant="body1" sx={{ mt: 2 }}>
                        {file.name}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {(file.size / 1024 / 1024).toFixed(2)} MB
                      </Typography>
                    </Box>
                  )}
                  <IconButton
                    sx={{ position: 'absolute', top: 8, right: 8 }}
                    onClick={handleRemoveFile}
                    color="error"
                  >
                    <DeleteIcon />
                  </IconButton>
                </Box>
              )}
              {errors.file && (
                <Typography variant="caption" color="error" sx={{ mt: 1, display: 'block' }}>
                  {errors.file}
                </Typography>
              )}
              {file && (file.type.startsWith('image/') || file.type === 'application/pdf') && (
                <Box sx={{ mt: 2, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 1 }}>
                  {ocrRecognizing && (
                    <CircularProgress size={20} />
                  )}
                  <Typography variant="body2" color="text.secondary">
                    {ocrRecognizing ? '正在自动识别发票信息...' : ocrResult ? '已自动识别，可点击查看详情' : '已选择图片，正在识别...'}
                  </Typography>
                  {ocrResult && !ocrRecognizing && (
                    <Button
                      variant="outlined"
                      size="small"
                      startIcon={<OCRIcon />}
                      onClick={() => setShowOcrDialog(true)}
                    >
                      查看识别结果
                    </Button>
                  )}
                </Box>
              )}
            </Box>

            {/* Basic Information */}
            <Typography variant="h6" gutterBottom sx={{ mb: 2 }}>
              基本信息
            </Typography>
            <Grid container spacing={2} sx={{ mb: 3 }}>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="发票号"
                  value={formData.invoiceNumber}
                  onChange={handleChange('invoiceNumber')}
                  InputProps={{
                    endAdornment: ocrResult?.recognizedData?.invoiceNumber ? (
                      <InputAdornment position="end">
                        <Chip label="OCR" size="small" color="info" sx={{ height: 20, fontSize: '0.65rem' }} />
                      </InputAdornment>
                    ) : undefined
                  }}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="发票日期（开票日期）"
                  type="date"
                  value={formData.invoiceDate}
                  onChange={handleChange('invoiceDate')}
                  InputLabelProps={{ shrink: true }}
                  InputProps={{
                    endAdornment: ocrResult?.recognizedData?.invoiceDate ? (
                      <InputAdornment position="end">
                        <Chip label="OCR" size="small" color="info" sx={{ height: 20, fontSize: '0.65rem' }} />
                      </InputAdornment>
                    ) : undefined
                  }}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="发票类型"
                  value={formData.invoiceType}
                  onChange={handleChange('invoiceType')}
                  placeholder="如：电子发票(普通发票)"
                  InputProps={{
                    endAdornment: ocrResult?.recognizedData?.invoiceType ? (
                      <InputAdornment position="end">
                        <Chip label="OCR" size="small" color="info" sx={{ height: 20, fontSize: '0.65rem' }} />
                      </InputAdornment>
                    ) : undefined
                  }}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel>货币</InputLabel>
                  <Select
                    value={formData.currency}
                    label="货币"
                    onChange={handleChange('currency')}
                  >
                    <MenuItem value="CNY">CNY</MenuItem>
                    <MenuItem value="USD">USD</MenuItem>
                    <MenuItem value="JPY">JPY</MenuItem>
                    <MenuItem value="KRW">KRW</MenuItem>
                    <MenuItem value="EUR">EUR</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel>分类</InputLabel>
                  <Select
                    value={formData.category}
                    label="分类"
                    onChange={handleChange('category')}
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
            </Grid>

            {/* 购买方信息 */}
            <Typography variant="h6" gutterBottom sx={{ mb: 2 }}>
              购买方信息
            </Typography>
            <Grid container spacing={2} sx={{ mb: 3 }}>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="购买方名称"
                  value={formData.buyerName}
                  onChange={handleChange('buyerName')}
                  placeholder="如：刘旨践(个人)"
                  InputProps={{
                    endAdornment: ocrResult?.recognizedData?.buyerName ? (
                      <InputAdornment position="end">
                        <Chip label="OCR" size="small" color="info" sx={{ height: 20, fontSize: '0.65rem' }} />
                      </InputAdornment>
                    ) : undefined
                  }}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="购买方税号/统一社会信用代码"
                  value={formData.buyerTaxId}
                  onChange={handleChange('buyerTaxId')}
                  InputProps={{
                    endAdornment: ocrResult?.recognizedData?.buyerTaxId ? (
                      <InputAdornment position="end">
                        <Chip label="OCR" size="small" color="info" sx={{ height: 20, fontSize: '0.65rem' }} />
                      </InputAdornment>
                    ) : undefined
                  }}
                />
              </Grid>
            </Grid>

            {/* Vendor Information */}
            <Typography variant="h6" gutterBottom sx={{ mb: 2 }}>
              销售方信息（商户信息）
            </Typography>
            <Grid container spacing={2} sx={{ mb: 3 }}>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="销售方名称"
                  value={formData.vendorName}
                  onChange={handleChange('vendorName')}
                  placeholder="如：北京滴滴出行科技有限公司"
                  InputProps={{
                    endAdornment: ocrResult?.recognizedData?.vendorName ? (
                      <InputAdornment position="end">
                        <Chip label="OCR" size="small" color="info" sx={{ height: 20, fontSize: '0.65rem' }} />
                      </InputAdornment>
                    ) : undefined
                  }}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="统一社会信用代码/税号"
                  value={formData.vendorTaxId}
                  onChange={handleChange('vendorTaxId')}
                  placeholder="如：91110108MA01G0FB09"
                  InputProps={{
                    endAdornment: ocrResult?.recognizedData?.vendorTaxId ? (
                      <InputAdornment position="end">
                        <Chip label="OCR" size="small" color="info" sx={{ height: 20, fontSize: '0.65rem' }} />
                      </InputAdornment>
                    ) : undefined
                  }}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="商户地址"
                  value={formData.vendorAddress}
                  onChange={handleChange('vendorAddress')}
                  multiline
                  rows={2}
                  InputProps={{
                    endAdornment: ocrResult?.recognizedData?.vendorAddress ? (
                      <InputAdornment position="end">
                        <Chip label="OCR" size="small" color="info" sx={{ height: 20, fontSize: '0.65rem' }} />
                      </InputAdornment>
                    ) : undefined
                  }}
                />
              </Grid>
            </Grid>

            {/* 项目明细 */}
            {formData.items && formData.items.length > 0 && (
              <>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                  <Typography variant="h6">
                    项目明细
                  </Typography>
                  {ocrResult?.recognizedData?.items && ocrResult.recognizedData.items.length > 0 && (
                    <Chip 
                      label={`✓ OCR已识别 ${ocrResult.recognizedData.items.length} 项`} 
                      size="small" 
                      color="info"
                      icon={<OCRIcon />}
                    />
                  )}
                </Box>
                <TableContainer component={Paper} variant="outlined" sx={{ mb: 3 }}>
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
              </>
            )}

            {/* 金额信息 */}
            <Typography variant="h6" gutterBottom sx={{ mb: 2 }}>
              金额信息
            </Typography>
            <Grid container spacing={2} sx={{ mb: 3 }}>
              <Grid item xs={12} md={4}>
                <TextField
                  fullWidth
                  label="合计金额"
                  type="number"
                  value={formData.amount}
                  onChange={handleChange('amount')}
                  InputProps={{
                    endAdornment: ocrResult?.recognizedData?.amount ? (
                      <InputAdornment position="end">
                        <Chip label="OCR" size="small" color="info" sx={{ height: 20, fontSize: '0.65rem' }} />
                      </InputAdornment>
                    ) : undefined
                  }}
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <TextField
                  fullWidth
                  label="税额合计"
                  type="number"
                  value={formData.taxAmount}
                  onChange={handleChange('taxAmount')}
                  InputProps={{
                    endAdornment: ocrResult?.recognizedData?.taxAmount ? (
                      <InputAdornment position="end">
                        <Chip label="OCR" size="small" color="info" sx={{ height: 20, fontSize: '0.65rem' }} />
                      </InputAdornment>
                    ) : undefined
                  }}
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <TextField
                  fullWidth
                  label="价税合计（小写）"
                  type="number"
                  value={formData.totalAmount}
                  onChange={handleChange('totalAmount')}
                  InputProps={{
                    endAdornment: ocrResult?.recognizedData?.totalAmount ? (
                      <InputAdornment position="end">
                        <Chip label="OCR" size="small" color="info" sx={{ height: 20, fontSize: '0.65rem' }} />
                      </InputAdornment>
                    ) : undefined
                  }}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="价税合计（大写）"
                  value={formData.totalAmountInWords}
                  onChange={handleChange('totalAmountInWords')}
                  placeholder="根据价税合计（小写）自动生成"
                  InputProps={{
                    readOnly: true,
                    sx: {
                      backgroundColor: 'action.disabledBackground',
                      '& .MuiInputBase-input': {
                        cursor: 'default'
                      }
                    }
                  }}
                  helperText="根据价税合计（小写）自动生成，无需手动输入"
                />
              </Grid>
            </Grid>

            {/* 开票人 */}
            <Grid container spacing={2} sx={{ mb: 3 }}>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="开票人"
                  value={formData.issuer}
                  onChange={handleChange('issuer')}
                  placeholder="如：于秋红"
                  InputProps={{
                    endAdornment: ocrResult?.recognizedData?.issuer ? (
                      <InputAdornment position="end">
                        <Chip label="OCR" size="small" color="info" sx={{ height: 20, fontSize: '0.65rem' }} />
                      </InputAdornment>
                    ) : undefined
                  }}
                />
              </Grid>
            </Grid>

            {/* Notes */}
            <TextField
              fullWidth
              label="备注"
              value={formData.notes}
              onChange={handleChange('notes')}
              multiline
              rows={3}
              sx={{ mb: 3 }}
            />

            {/* Actions */}
            <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
              <Button
                variant="outlined"
                onClick={() => navigate('/invoices')}
                disabled={uploading}
              >
                取消
              </Button>
              <Button
                type="submit"
                variant="contained"
                startIcon={<UploadIcon />}
                disabled={uploading || !file}
              >
                {uploading ? '上传中...' : '上传发票'}
              </Button>
            </Box>

            {uploading && <LinearProgress sx={{ mt: 2 }} />}
          </form>
        </Paper>

        {/* OCR识别结果对话框 */}
        <Dialog 
          open={showOcrDialog} 
          onClose={() => setShowOcrDialog(false)}
          maxWidth="md"
          fullWidth
        >
          <DialogTitle>
            OCR识别结果
            {ocrResult?.ocrData?.confidence && (
              <Chip 
                label={`置信度: ${Math.round(ocrResult.ocrData.confidence)}%`}
                color={ocrResult.ocrData.confidence > 80 ? 'success' : 'warning'}
                size="small"
                sx={{ ml: 2 }}
              />
            )}
          </DialogTitle>
          <DialogContent>
            {ocrResult?.recognizedData && (
              <Box>
                <Typography variant="subtitle2" gutterBottom sx={{ mt: 1 }}>
                  识别到的信息：
                </Typography>
                <List>
                  {ocrResult.recognizedData.invoiceNumber && (
                    <ListItem>
                      <ListItemIcon>
                        <CheckCircleIcon color="success" />
                      </ListItemIcon>
                      <ListItemText 
                        primary="发票号"
                        secondary={ocrResult.recognizedData.invoiceNumber}
                      />
                    </ListItem>
                  )}
                  {ocrResult.recognizedData.invoiceDate && (
                    <ListItem>
                      <ListItemIcon>
                        <CheckCircleIcon color="success" />
                      </ListItemIcon>
                      <ListItemText 
                        primary="发票日期"
                        secondary={ocrResult.recognizedData.invoiceDate}
                      />
                    </ListItem>
                  )}
                  {ocrResult.recognizedData.amount && (
                    <ListItem>
                      <ListItemIcon>
                        <CheckCircleIcon color="success" />
                      </ListItemIcon>
                      <ListItemText 
                        primary="金额"
                        secondary={`${ocrResult.recognizedData.amount}`}
                      />
                    </ListItem>
                  )}
                  {ocrResult.recognizedData.vendorName && (
                    <ListItem>
                      <ListItemIcon>
                        <CheckCircleIcon color="success" />
                      </ListItemIcon>
                      <ListItemText 
                        primary="商户名称"
                        secondary={ocrResult.recognizedData.vendorName}
                      />
                    </ListItem>
                  )}
                  {ocrResult.recognizedData.vendorTaxId && (
                    <ListItem>
                      <ListItemIcon>
                        <CheckCircleIcon color="success" />
                      </ListItemIcon>
                      <ListItemText 
                        primary="税号"
                        secondary={ocrResult.recognizedData.vendorTaxId}
                      />
                    </ListItem>
                  )}
                  {ocrResult.recognizedData.vendorAddress && (
                    <ListItem>
                      <ListItemIcon>
                        <CheckCircleIcon color="success" />
                      </ListItemIcon>
                      <ListItemText 
                        primary="商户地址"
                        secondary={ocrResult.recognizedData.vendorAddress}
                      />
                    </ListItem>
                  )}
                  {ocrResult.recognizedData.buyerName && (
                    <ListItem>
                      <ListItemIcon>
                        <CheckCircleIcon color="success" />
                      </ListItemIcon>
                      <ListItemText 
                        primary="购买方名称"
                        secondary={ocrResult.recognizedData.buyerName}
                      />
                    </ListItem>
                  )}
                  {ocrResult.recognizedData.buyerTaxId && (
                    <ListItem>
                      <ListItemIcon>
                        <CheckCircleIcon color="success" />
                      </ListItemIcon>
                      <ListItemText 
                        primary="购买方税号"
                        secondary={ocrResult.recognizedData.buyerTaxId}
                      />
                    </ListItem>
                  )}
                  {ocrResult.recognizedData.items && ocrResult.recognizedData.items.length > 0 && (
                    <ListItem>
                      <ListItemIcon>
                        <CheckCircleIcon color="success" />
                      </ListItemIcon>
                      <ListItemText 
                        primary="项目明细"
                        secondary={`已识别 ${ocrResult.recognizedData.items.length} 项`}
                      />
                    </ListItem>
                  )}
                  {ocrResult.recognizedData.issuer && (
                    <ListItem>
                      <ListItemIcon>
                        <CheckCircleIcon color="success" />
                      </ListItemIcon>
                      <ListItemText 
                        primary="开票人"
                        secondary={ocrResult.recognizedData.issuer}
                      />
                    </ListItem>
                  )}
                  {ocrResult.recognizedData.totalAmountInWords && (
                    <ListItem>
                      <ListItemIcon>
                        <CheckCircleIcon color="success" />
                      </ListItemIcon>
                      <ListItemText 
                        primary="价税合计（大写）"
                        secondary={ocrResult.recognizedData.totalAmountInWords}
                      />
                    </ListItem>
                  )}
                </List>
                {ocrResult.text && (
                  <Box sx={{ mt: 2 }}>
                    <Typography variant="subtitle2" gutterBottom>
                      识别文本：
                    </Typography>
                    <Paper sx={{ p: 2, bgcolor: 'grey.50', maxHeight: 200, overflow: 'auto' }}>
                      <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', fontFamily: 'monospace' }}>
                        {ocrResult.text}
                      </Typography>
                    </Paper>
                  </Box>
                )}
              </Box>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setShowOcrDialog(false)}>
              关闭
            </Button>
            <Button 
              onClick={() => {
                handleApplyOCR();
                setShowOcrDialog(false);
              }} 
              variant="contained" 
              color="primary"
            >
              应用到表单
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </Container>
  );
};

export default InvoiceUpload;

