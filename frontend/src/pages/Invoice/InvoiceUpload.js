import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
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
  const [searchParams] = useSearchParams();
  const editInvoiceId = searchParams.get('edit');
  const hideUpload = searchParams.get('hideUpload') === 'true';

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
    buyerAddress: '', // 购买方地址
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
  const [loadingInvoice, setLoadingInvoice] = useState(false);

  // 加载发票数据（编辑模式）
  useEffect(() => {
    if (editInvoiceId) {
      loadInvoiceData(editInvoiceId);
    }
  }, [editInvoiceId]);

  const loadInvoiceData = async (invoiceId) => {
    try {
      setLoadingInvoice(true);
      const response = await apiClient.get(`/invoices/${invoiceId}`);
      
      if (response.data && response.data.success) {
        const invoiceData = response.data.data;
        setFormData({
          invoiceNumber: invoiceData.invoiceNumber || '',
          invoiceDate: invoiceData.invoiceDate || '',
          invoiceType: invoiceData.invoiceType || '',
          amount: invoiceData.amount || '',
          currency: invoiceData.currency || 'CNY',
          taxAmount: invoiceData.taxAmount || '',
          totalAmount: invoiceData.totalAmount || '',
          category: invoiceData.category || 'other',
          vendorName: invoiceData.vendor?.name || '',
          vendorTaxId: invoiceData.vendor?.taxId || '',
          vendorAddress: invoiceData.vendor?.address || '',
          buyerName: invoiceData.buyer?.name || '',
          buyerTaxId: invoiceData.buyer?.taxId || '',
          buyerAddress: invoiceData.buyer?.address || '',
          items: invoiceData.items || [],
          issuer: invoiceData.issuer || '',
          totalAmountInWords: invoiceData.totalAmountInWords || '',
          notes: invoiceData.notes || '',
          tags: invoiceData.tags || []
        });
        
        // 如果有文件，加载预览
        if (invoiceData.file?.mimeType?.startsWith('image/')) {
          loadFilePreview(invoiceId);
        }
      }
    } catch (err) {
      console.error('Load invoice error:', err);
      showNotification(t('invoice.upload.loadInvoiceFailed'), 'error');
    } finally {
      setLoadingInvoice(false);
    }
  };

  const loadFilePreview = async (invoiceId) => {
    try {
      const response = await apiClient.get(`/invoices/${invoiceId}/file`, {
        responseType: 'blob'
      });
      const blob = new Blob([response.data]);
      const url = URL.createObjectURL(blob);
      setFilePreview(url);
    } catch (err) {
      console.error('Load file preview error:', err);
    }
  };

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
        // 货币字段：如果OCR识别到了货币类型，自动填写（覆盖默认值）
        if (recognizedData?.currency) {
          setFormData(prev => ({ ...prev, currency: recognizedData.currency }));
        }
        // 发票分类：如果OCR识别到了分类，自动填写（覆盖默认值）
        if (recognizedData?.category) {
          // 将中文分类转换为英文（如果OCR返回的是中文）
          const categoryMap = {
            '交通': 'transportation',
            '住宿': 'accommodation',
            '餐饮': 'meals',
            '娱乐': 'entertainment',
            '通讯': 'communication',
            '办公用品': 'office_supplies',
            '培训': 'training',
            '其他': 'other'
          };
          const category = categoryMap[recognizedData.category] || recognizedData.category || 'other';
          setFormData(prev => ({ ...prev, category }));
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
        if (recognizedData?.buyerAddress && isEmpty(formData.buyerAddress)) {
          setFormData(prev => ({ ...prev, buyerAddress: recognizedData.buyerAddress }));
        }
        if (recognizedData?.items && recognizedData.items.length > 0 && (!formData.items || formData.items.length === 0)) {
          // 确保 items 中的数字字段被转换为数字类型
          const normalizedItems = recognizedData.items.map(item => ({
            ...item,
            unitPrice: item.unitPrice ? parseFloat(item.unitPrice) || 0 : 0,
            quantity: item.quantity ? parseFloat(item.quantity) || 0 : 0,
            amount: item.amount ? parseFloat(item.amount) || 0 : 0,
            taxAmount: item.taxAmount !== undefined && item.taxAmount !== null 
              ? (typeof item.taxAmount === 'string' && (item.taxAmount.includes('免税') || item.taxAmount.includes('***'))
                  ? 0 
                  : parseFloat(item.taxAmount) || 0)
              : 0
          }));
          setFormData(prev => ({ ...prev, items: normalizedItems }));
        }
        if (recognizedData?.issuer && isEmpty(formData.issuer)) {
          setFormData(prev => ({ ...prev, issuer: recognizedData.issuer }));
        }
        // 不自动填充 totalAmountInWords，由前端根据 totalAmount 自动计算
        // 如果识别到了 totalAmount，会自动触发大写金额的计算
        
        showNotification(t('invoice.upload.autoRecognitionSuccess'), 'success');
      } else {
        showNotification(t('invoice.upload.ocrFailed'), 'warning');
      }
    } catch (err) {
      console.error('OCR recognize error:', err);
      console.error('Error details:', {
        message: err.message,
        response: err.response?.data,
        status: err.response?.status,
        statusText: err.response?.statusText,
        code: err.code,
        config: {
          url: err.config?.url,
          method: err.config?.method,
          timeout: err.config?.timeout
        }
      });
      
      // OCR失败不影响文件选择，只显示警告
      let errorMessage = 'OCR服务暂时不可用';
      
      if (err.response) {
        // 服务器返回了响应
        errorMessage = err.response.data?.message || err.response.statusText || `服务器错误 (${err.response.status})`;
      } else if (err.request) {
        // 请求已发送但没有收到响应
        if (err.code === 'ECONNABORTED') {
          errorMessage = 'OCR识别超时，请稍后重试或手动填写';
        } else if (err.code === 'ERR_NETWORK') {
          errorMessage = '网络连接失败，请检查网络连接';
        } else {
          errorMessage = '无法连接到服务器，请检查后端服务是否运行';
        }
      } else {
        // 请求配置错误
        errorMessage = err.message || 'OCR请求配置错误';
      }
      
      showNotification(`${t('invoice.upload.autoRecognitionFailed')}: ${errorMessage}。${t('invoice.upload.manualFillHint')}`, 'warning');
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
    // 货币字段：如果OCR识别到了货币类型，自动填写（覆盖默认值）
    if (recognized.currency) {
      setFormData(prev => ({ ...prev, currency: recognized.currency }));
    }
    // 发票分类：如果OCR识别到了分类，自动填写（覆盖默认值）
    if (recognized.category) {
      // 将中文分类转换为英文（如果OCR返回的是中文）
      const categoryMap = {
        '交通': 'transportation',
        '住宿': 'accommodation',
        '餐饮': 'meals',
        '娱乐': 'entertainment',
        '通讯': 'communication',
        '办公用品': 'office_supplies',
        '培训': 'training',
        '其他': 'other'
      };
      const category = categoryMap[recognized.category] || recognized.category || 'other';
      setFormData(prev => ({ ...prev, category }));
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
    if (recognized.buyerAddress && isEmpty(formData.buyerAddress)) {
      setFormData(prev => ({ ...prev, buyerAddress: recognized.buyerAddress }));
    }
    if (recognized.items && recognized.items.length > 0 && (!formData.items || formData.items.length === 0)) {
      // 确保 items 中的数字字段被转换为数字类型
      const normalizedItems = recognized.items.map(item => ({
        ...item,
        unitPrice: item.unitPrice ? parseFloat(item.unitPrice) || 0 : 0,
        quantity: item.quantity ? parseFloat(item.quantity) || 0 : 0,
        amount: item.amount ? parseFloat(item.amount) || 0 : 0,
        taxAmount: item.taxAmount !== undefined && item.taxAmount !== null 
          ? (typeof item.taxAmount === 'string' && (item.taxAmount.includes('免税') || item.taxAmount.includes('***'))
              ? 0 
              : parseFloat(item.taxAmount) || 0)
          : 0
      }));
      setFormData(prev => ({ ...prev, items: normalizedItems }));
    }
    if (recognized.issuer && isEmpty(formData.issuer)) {
      setFormData(prev => ({ ...prev, issuer: recognized.issuer }));
    }
    // 不自动填充 totalAmountInWords，由前端根据 totalAmount 自动计算
    // 如果识别到了 totalAmount，会自动触发大写金额的计算

    setShowOcrDialog(false);
    showNotification(t('invoice.upload.ocrApplied'), 'success');
  };

  const validateForm = () => {
    const newErrors = {};

    // 编辑模式下不需要文件
    if (!editInvoiceId && !file) {
      newErrors.file = t('invoice.upload.fileRequired');
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

      // 编辑模式：调用更新API
      if (editInvoiceId) {
        const updateData = {
          invoiceNumber: formData.invoiceNumber,
          invoiceDate: formData.invoiceDate,
          invoiceType: formData.invoiceType,
          amount: formData.amount,
          currency: formData.currency,
          taxAmount: formData.taxAmount,
          totalAmount: formData.totalAmount,
          category: formData.category,
          vendor: {
            name: formData.vendorName,
            taxId: formData.vendorTaxId,
            address: formData.vendorAddress
          },
          buyer: {
            name: formData.buyerName,
            taxId: formData.buyerTaxId,
            address: formData.buyerAddress
          },
          items: formData.items || [],
          issuer: formData.issuer,
          totalAmountInWords: formData.totalAmountInWords,
          notes: formData.notes,
          tags: formData.tags || []
        };

        // 如果用户选择了新文件，需要上传
        if (file) {
          const formDataToSend = new FormData();
          formDataToSend.append('file', file);
          Object.keys(updateData).forEach(key => {
            if (updateData[key] !== undefined && updateData[key] !== null) {
              if (typeof updateData[key] === 'object' && !Array.isArray(updateData[key])) {
                formDataToSend.append(key, JSON.stringify(updateData[key]));
              } else if (Array.isArray(updateData[key])) {
                formDataToSend.append(key, JSON.stringify(updateData[key]));
              } else {
                formDataToSend.append(key, updateData[key]);
              }
            }
          });

          const response = await apiClient.put(`/invoices/${editInvoiceId}`, formDataToSend, {
            headers: {
              'Content-Type': 'multipart/form-data'
            }
          });

          if (response.data && response.data.success) {
            showNotification(t('invoice.upload.updateSuccess'), 'success');
            navigate('/invoices');
          } else {
            throw new Error(response.data?.message || t('invoice.upload.updateFailed'));
          }
        } else {
          // 没有新文件，直接更新数据
          const response = await apiClient.put(`/invoices/${editInvoiceId}`, updateData);

          if (response.data && response.data.success) {
            showNotification(t('invoice.upload.updateSuccess'), 'success');
            navigate('/invoices');
          } else {
            throw new Error(response.data?.message || t('invoice.upload.updateFailed'));
          }
        }
      } else {
        // 新建模式：调用上传API
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
        if (formData.buyerAddress) formDataToSend.append('buyerAddress', formData.buyerAddress);
        if (formData.items && formData.items.length > 0) {
          formDataToSend.append('items', JSON.stringify(formData.items));
        }
        if (formData.issuer) formDataToSend.append('issuer', formData.issuer);
        if (formData.totalAmountInWords) formDataToSend.append('totalAmountInWords', formData.totalAmountInWords);
        if (formData.notes) formDataToSend.append('notes', formData.notes);
        if (formData.tags.length > 0) {
          formDataToSend.append('tags', JSON.stringify(formData.tags));
        }

        // 如果前端已经进行过 OCR 识别，告诉后端跳过 OCR，并传递 OCR 结果
        if (ocrResult && ocrResult.ocrData) {
          formDataToSend.append('skipOcr', 'true');
          formDataToSend.append('ocrData', JSON.stringify({
            extracted: ocrResult.ocrData.extracted || true,
            confidence: ocrResult.ocrData.confidence || 0,
            rawData: ocrResult.ocrData.rawData || {},
            extractedAt: ocrResult.ocrData.extractedAt || new Date().toISOString()
          }));
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
            showNotification(t('invoice.upload.uploadSuccessWithOcr'), 'success');
          } else {
            showNotification(t('invoice.upload.uploadSuccess'), 'success');
          }
          
          // 跳转到列表页
          navigate('/invoices');
        } else {
          throw new Error(response.data?.message || t('invoice.upload.uploadFailed'));
        }
      }
    } catch (err) {
      console.error('Submit error:', err);
      const errorMsg = err.response?.data?.message || err.message || (editInvoiceId ? t('invoice.upload.updateFailed') : t('invoice.upload.uploadFailed'));
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
            {editInvoiceId ? t('invoice.detail.edit') : t('invoice.upload.title')}
          </Typography>
        </Box>

        {errors.submit && (
          <Alert severity="error" sx={{ mb: 3 }} onClose={() => setErrors({})}>
            {errors.submit}
          </Alert>
        )}

        {loadingInvoice && (
          <Box sx={{ mb: 3 }}>
            <LinearProgress />
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1, textAlign: 'center' }}>
              {t('invoice.upload.loadingInvoice')}
            </Typography>
          </Box>
        )}

        <Paper sx={{ p: 3 }}>
          <form onSubmit={handleSubmit}>
            {/* File Upload - 隐藏当 hideUpload 为 true */}
            {!hideUpload && (
              <Box sx={{ mb: 4 }}>
              <Typography variant="h6" gutterBottom>
                {t('invoice.upload.selectFile')}
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
                    {t('invoice.upload.clickOrDrag')}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {t('invoice.upload.supportedFormats')}
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
                    {ocrRecognizing ? t('invoice.upload.recognizing') : ocrResult ? t('invoice.upload.recognizedClickToView') : t('invoice.upload.selecting')}
                  </Typography>
                  {ocrResult && !ocrRecognizing && (
                    <Button
                      variant="outlined"
                      size="small"
                      startIcon={<OCRIcon />}
                      onClick={() => setShowOcrDialog(true)}
                    >
                      {t('invoice.upload.viewOcrResult')}
                    </Button>
                  )}
                </Box>
              )}
            </Box>
            )}

            {/* Basic Information */}
            <Typography variant="h6" gutterBottom sx={{ mb: 2 }}>
              {t('invoice.upload.basicInfo')}
            </Typography>
            <Grid container spacing={2} sx={{ mb: 3 }}>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label={t('invoice.upload.invoiceNumber')}
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
                  label={t('invoice.upload.invoiceDate')}
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
                  label={t('invoice.upload.invoiceType')}
                  value={formData.invoiceType}
                  onChange={handleChange('invoiceType')}
                  placeholder={t('invoice.upload.invoiceTypePlaceholder')}
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
                <TextField
                  fullWidth
                  label={t('invoice.upload.currency')}
                  value={formData.currency}
                  onChange={handleChange('currency')}
                  InputProps={{
                    endAdornment: ocrResult?.recognizedData?.currency ? (
                      <InputAdornment position="end">
                        <Chip label="OCR" size="small" color="info" sx={{ height: 20, fontSize: '0.65rem' }} />
                      </InputAdornment>
                    ) : undefined
                  }}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel>{t('invoice.upload.category')}</InputLabel>
                  <Select
                    value={formData.category}
                    label={t('invoice.upload.category')}
                    onChange={handleChange('category')}
                  >
                    <MenuItem value="transportation">{t('invoice.list.categories.transportation')}</MenuItem>
                    <MenuItem value="accommodation">{t('invoice.list.categories.accommodation')}</MenuItem>
                    <MenuItem value="meals">{t('invoice.list.categories.meals')}</MenuItem>
                    <MenuItem value="entertainment">{t('invoice.list.categories.entertainment')}</MenuItem>
                    <MenuItem value="communication">{t('invoice.list.categories.communication')}</MenuItem>
                    <MenuItem value="office_supplies">{t('invoice.list.categories.officeSupplies')}</MenuItem>
                    <MenuItem value="training">{t('invoice.list.categories.training')}</MenuItem>
                    <MenuItem value="other">{t('invoice.list.categories.other')}</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
            </Grid>

            {/* 购买方信息 */}
            <Typography variant="h6" gutterBottom sx={{ mb: 2 }}>
              {t('invoice.upload.buyerInfo')}
            </Typography>
            <Grid container spacing={2} sx={{ mb: 3 }}>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label={t('invoice.upload.buyerName')}
                  value={formData.buyerName}
                  onChange={handleChange('buyerName')}
                  placeholder={t('invoice.upload.buyerNamePlaceholder')}
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
                  label={t('invoice.upload.buyerTaxId')}
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
              {t('invoice.upload.vendorInfo')}
            </Typography>
            <Grid container spacing={2} sx={{ mb: 3 }}>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label={t('invoice.upload.vendorName')}
                  value={formData.vendorName}
                  onChange={handleChange('vendorName')}
                  placeholder={t('invoice.upload.vendorNamePlaceholder')}
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
                  label={t('invoice.upload.vendorTaxId')}
                  value={formData.vendorTaxId}
                  onChange={handleChange('vendorTaxId')}
                  placeholder={t('invoice.upload.vendorTaxIdPlaceholder')}
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
                  label={t('invoice.upload.vendorAddress')}
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
                    {t('invoice.upload.items')}
                  </Typography>
                  {ocrResult?.recognizedData?.items && ocrResult.recognizedData.items.length > 0 && (
                    <Chip 
                      label={`✓ ${t('invoice.upload.ocrRecognized')} ${ocrResult.recognizedData.items.length} ${t('invoice.upload.itemsRecognized')}`} 
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
                        <TableCell>{t('invoice.detail.itemName')}</TableCell>
                        <TableCell align="right">{t('invoice.detail.unitPrice')}</TableCell>
                        <TableCell align="right">{t('invoice.detail.quantity')}</TableCell>
                        <TableCell align="right">{t('invoice.detail.amount')}</TableCell>
                        <TableCell align="center">{t('invoice.detail.taxRate')}</TableCell>
                        <TableCell align="right">{t('invoice.detail.taxAmount')}</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {formData.items.map((item, index) => (
                        <TableRow key={index}>
                          <TableCell>{item.name || '-'}</TableCell>
                          <TableCell align="right">
                            {item.unitPrice !== undefined && item.unitPrice !== null
                              ? `¥${(typeof item.unitPrice === 'number' ? item.unitPrice : parseFloat(item.unitPrice) || 0).toFixed(2)}`
                              : '-'}
                          </TableCell>
                          <TableCell align="right">{item.quantity !== undefined && item.quantity !== null ? item.quantity : '-'}</TableCell>
                          <TableCell align="right">
                            {item.amount !== undefined && item.amount !== null
                              ? `¥${(typeof item.amount === 'number' ? item.amount : parseFloat(item.amount) || 0).toFixed(2)}`
                              : '-'}
                          </TableCell>
                          <TableCell align="center">{item.taxRate || '-'}</TableCell>
                          <TableCell align="right">
                            {item.taxAmount !== undefined && item.taxAmount !== null 
                              ? `¥${(typeof item.taxAmount === 'number' ? item.taxAmount : parseFloat(item.taxAmount) || 0).toFixed(2)}`
                              : '-'}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </>
            )}

            {/* 金额信息 */}
            <Typography variant="h6" gutterBottom sx={{ mb: 2 }}>
              {t('invoice.upload.amountInfo')}
            </Typography>
            <Grid container spacing={2} sx={{ mb: 3 }}>
              <Grid item xs={12} md={4}>
                <TextField
                  fullWidth
                  label={t('invoice.upload.amount')}
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
                  label={t('invoice.upload.taxAmount')}
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
                  label={t('invoice.upload.totalAmount')}
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
                  label={t('invoice.upload.totalAmountInWords')}
                  value={formData.totalAmountInWords}
                  onChange={handleChange('totalAmountInWords')}
                  placeholder={t('invoice.upload.autoGenerated')}
                  InputProps={{
                    readOnly: true,
                    sx: {
                      backgroundColor: 'action.disabledBackground',
                      '& .MuiInputBase-input': {
                        cursor: 'default'
                      }
                    }
                  }}
                  helperText={t('invoice.upload.autoGenerated')}
                />
              </Grid>
            </Grid>

            {/* 开票人 */}
            <Grid container spacing={2} sx={{ mb: 3 }}>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label={t('invoice.upload.issuer')}
                  value={formData.issuer}
                  onChange={handleChange('issuer')}
                  placeholder={t('invoice.upload.issuerPlaceholder')}
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
              label={t('invoice.upload.notes')}
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
                {t('invoice.upload.cancel')}
              </Button>
              <Button
                type="submit"
                variant="contained"
                startIcon={<UploadIcon />}
                disabled={uploading || (!editInvoiceId && !file)}
              >
                {uploading 
                  ? (editInvoiceId ? t('invoice.upload.updating') : t('invoice.upload.uploading'))
                  : (editInvoiceId ? t('invoice.upload.updateInvoice') : t('invoice.upload.uploadInvoice'))
                }
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
            {t('invoice.upload.ocrResult')}
            {ocrResult?.ocrData?.confidence && (
              <Chip 
                label={`${t('invoice.upload.confidence')}: ${Math.round(ocrResult.ocrData.confidence)}%`}
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
                  {t('invoice.upload.recognizedInfo')}:
                </Typography>
                <List>
                  {ocrResult.recognizedData.invoiceNumber && (
                    <ListItem>
                      <ListItemIcon>
                        <CheckCircleIcon color="success" />
                      </ListItemIcon>
                      <ListItemText 
                        primary={t('invoice.upload.invoiceNumber')}
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
                        primary={t('invoice.upload.invoiceDate')}
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
                        primary={t('invoice.upload.amount')}
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
                        primary={t('invoice.upload.vendorName')}
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
                        primary={t('invoice.upload.vendorTaxId')}
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
                        primary={t('invoice.upload.vendorAddress')}
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
                        primary={t('invoice.upload.buyerName')}
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
                        primary={t('invoice.upload.buyerTaxId')}
                        secondary={ocrResult.recognizedData.buyerTaxId}
                      />
                    </ListItem>
                  )}
                  {ocrResult.recognizedData.buyerAddress && (
                    <ListItem>
                      <ListItemIcon>
                        <CheckCircleIcon color="success" />
                      </ListItemIcon>
                      <ListItemText 
                        primary={t('invoice.upload.buyerAddress')}
                        secondary={ocrResult.recognizedData.buyerAddress}
                      />
                    </ListItem>
                  )}
                  {ocrResult.recognizedData.category && (
                    <ListItem>
                      <ListItemIcon>
                        <CheckCircleIcon color="success" />
                      </ListItemIcon>
                      <ListItemText 
                        primary={t('invoice.upload.category')}
                        secondary={ocrResult.recognizedData.category}
                      />
                    </ListItem>
                  )}
                  {ocrResult?.recognizedData?.currency && (
                    <ListItem>
                      <ListItemIcon>
                        <CheckCircleIcon color="success" />
                      </ListItemIcon>
                      <ListItemText 
                        primary={t('invoice.upload.currency')}
                        secondary={ocrResult.recognizedData.currency}
                      />
                    </ListItem>
                  )}
                  {ocrResult.recognizedData.items && ocrResult.recognizedData.items.length > 0 && (
                    <ListItem>
                      <ListItemIcon>
                        <CheckCircleIcon color="success" />
                      </ListItemIcon>
                      <ListItemText 
                        primary={t('invoice.upload.items')}
                        secondary={`${t('invoice.upload.ocrRecognized')} ${ocrResult.recognizedData.items.length} ${t('invoice.upload.itemsRecognized')}`}
                      />
                    </ListItem>
                  )}
                  {ocrResult.recognizedData.issuer && (
                    <ListItem>
                      <ListItemIcon>
                        <CheckCircleIcon color="success" />
                      </ListItemIcon>
                      <ListItemText 
                        primary={t('invoice.upload.issuer')}
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
                        primary={t('invoice.upload.totalAmountInWords')}
                        secondary={ocrResult.recognizedData.totalAmountInWords}
                      />
                    </ListItem>
                  )}
                </List>
                {ocrResult.text && (
                  <Box sx={{ mt: 2 }}>
                    <Typography variant="subtitle2" gutterBottom>
                      {t('invoice.upload.recognizedText')}:
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
              {t('invoice.upload.close')}
            </Button>
            <Button 
              onClick={() => {
                handleApplyOCR();
                setShowOcrDialog(false);
              }} 
              variant="contained" 
              color="primary"
            >
              {t('invoice.upload.applyToForm')}
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </Container>
  );
};

export default InvoiceUpload;

