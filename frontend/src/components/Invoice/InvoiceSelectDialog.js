import React, { useState, useEffect, useRef } from 'react';
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
  Typography,
  Chip,
  CircularProgress,
  Alert,
  Grid,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  LinearProgress,
  InputAdornment
} from '@mui/material';
import {
  PictureAsPdf as PdfIcon,
  Image as ImageIcon,
  Search as SearchIcon
} from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import apiClient from '../../utils/axiosConfig';
import dayjs from 'dayjs';

const InvoiceSelectDialog = ({ open, onClose, onConfirm, excludeInvoiceIds = [], linkedInvoices = [] }) => {
  const { t } = useTranslation();
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedInvoices, setSelectedInvoices] = useState([]);
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const fetchingRef = useRef(false); // 防止重复请求
  const prevLinkedIdsRef = useRef(''); // 存储上一次的ID列表字符串
  
  // 获取已关联发票的ID列表（统一转换为字符串格式）
  const linkedInvoiceIds = React.useMemo(() => {
    return linkedInvoices
      .map(inv => {
        const id = inv._id || inv.id;
        return id ? id.toString() : null;
      })
      .filter(Boolean)
      .sort();
  }, [linkedInvoices]);

  useEffect(() => {
    if (open && !fetchingRef.current) {
      fetchInvoices();
      setCategoryFilter('all');
      setSearchTerm('');
      // 对话框打开时，立即初始化已关联的发票为选中状态
      if (linkedInvoiceIds.length > 0) {
        setSelectedInvoices([...linkedInvoiceIds]);
        prevLinkedIdsRef.current = linkedInvoiceIds.join(',');
      } else {
        setSelectedInvoices([]);
        prevLinkedIdsRef.current = '';
      }
    } else if (!open) {
      // 对话框关闭时，清空选中状态和重置ref
      setSelectedInvoices([]);
      prevLinkedIdsRef.current = '';
    }
  }, [open]);
  
  // 当已关联发票列表变化时，更新选中状态（仅在对话框打开时）
  useEffect(() => {
    if (open && linkedInvoiceIds.length > 0) {
      const currentIdsString = linkedInvoiceIds.join(',');
      const prevIdsString = prevLinkedIdsRef.current;
      
      // 只在ID列表改变时更新选中状态
      if (currentIdsString !== prevIdsString) {
          setSelectedInvoices(prev => {
            // 合并已关联的发票ID，避免重复
            const merged = [...new Set([...prev, ...linkedInvoiceIds])];
            return merged;
          });
        prevLinkedIdsRef.current = currentIdsString; // 保存当前的ID列表字符串
      }
    }
  }, [open, linkedInvoiceIds]); // 依赖数组本身，useMemo 已经稳定化了

  const fetchInvoices = async () => {
    // 防止重复请求
    if (fetchingRef.current) {
      return;
    }
    
    try {
      fetchingRef.current = true;
      setLoading(true);
      const response = await apiClient.get('/invoices', {
        params: {
          // 不限制 status，显示所有发票（包括 pending 和 verified）
          // 只过滤掉已关联到费用申请的发票
          limit: 200
        }
      });
      if (response.data && response.data.success) {
        const allInvoices = response.data.data || [];
        // 只过滤掉当前费用项中已存在的发票（允许同一发票在不同费用项中使用）
        const availableInvoices = allInvoices.filter(
          invoice => {
            const invoiceId = invoice._id || invoice.id;
            const invoiceIdStr = invoiceId?.toString() || invoiceId;
            // 只检查是否在当前费用项的排除列表中（已关联到当前费用项的发票保留）
            const isLinkedToCurrent = linkedInvoiceIds.includes(invoiceIdStr);
            // 排除在排除列表中的发票（但保留已关联到当前费用项的发票）
            // 统一转换为字符串进行比较
            const excludeIdsStr = excludeInvoiceIds.map(id => id?.toString() || id);
            const isExcluded = excludeIdsStr.includes(invoiceIdStr) && !isLinkedToCurrent;
            // 不再全局排除已关联到其他费用申请的发票，允许同一发票在不同费用项中使用
            return !isExcluded;
          }
        );
        
        // 合并已关联的发票（如果它们不在列表中）
        const linkedInvoicesToAdd = linkedInvoices.filter(linkedInv => {
          const linkedId = linkedInv._id || linkedInv.id;
          const linkedIdStr = linkedId?.toString() || linkedId;
          return !availableInvoices.some(inv => {
            const invId = inv._id || inv.id;
            const invIdStr = invId?.toString() || invId;
            return invIdStr === linkedIdStr;
          });
        });
        
        setInvoices([...availableInvoices, ...linkedInvoicesToAdd]);
      } else {
        setInvoices([]);
      }
    } catch (error) {

      // 处理 429 错误（请求过于频繁）
      if (error.response?.status === 429) {
        // 可以显示提示信息，但这里先静默处理

      }
      setInvoices([]);
    } finally {
      setLoading(false);
      fetchingRef.current = false;
    }
  };

  const handleToggleInvoice = (invoiceId) => {
    // 统一转换为字符串格式进行比较
    const invoiceIdStr = invoiceId?.toString() || invoiceId;
    setSelectedInvoices(prev => {
      // 将 prev 中的ID也转换为字符串进行比较
      const prevStr = prev.map(id => id?.toString() || id);
      if (prevStr.includes(invoiceIdStr)) {
        return prev.filter(id => {
          const idStr = id?.toString() || id;
          return idStr !== invoiceIdStr;
        });
      } else {
        return [...prev, invoiceIdStr];
      }
    });
  };

  const handleConfirm = () => {
    // 统一将 selectedInvoices 转换为字符串数组进行比较
    const selectedInvoiceIdsStr = selectedInvoices.map(id => id?.toString() || id);
    
    // 获取选中的发票对象（包括已关联的发票）
    const selectedInvoiceObjects = invoices.filter(inv => {
      const invoiceId = inv._id || inv.id;
      const invoiceIdStr = invoiceId?.toString() || invoiceId;
      return selectedInvoiceIdsStr.includes(invoiceIdStr);
    });
    
    // 如果已关联的发票不在 invoices 列表中，也要包含它们
    const linkedInvoicesToAdd = linkedInvoices.filter(linkedInv => {
      const linkedId = linkedInv._id || linkedInv.id;
      const linkedIdStr = linkedId?.toString() || linkedId;
      return selectedInvoiceIdsStr.includes(linkedIdStr) && 
             !selectedInvoiceObjects.some(inv => {
               const invId = inv._id || inv.id;
               const invIdStr = invId?.toString() || invId;
               return invIdStr === linkedIdStr;
             });
    });
    
    onConfirm([...selectedInvoiceObjects, ...linkedInvoicesToAdd]);
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

  const getFileIcon = (mimeType) => {
    if (mimeType?.includes('pdf')) {
      return <PdfIcon fontSize="small" />;
    }
    if (mimeType?.includes('image')) {
      return <ImageIcon fontSize="small" />;
    }
    return <ImageIcon fontSize="small" />;
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
      pending: t('invoice.list.statuses.pending'),
      verified: t('invoice.list.statuses.verified'),
      linked: t('invoice.list.statuses.linked'),
      archived: t('invoice.list.statuses.archived')
    };
    return labels[status] || status;
  };

  const getCategoryLabel = (category) => {
    return categories.find(c => c.value === category)?.label || category;
  };

  return (
    <Dialog 
      open={open} 
      onClose={() => {
        fetchingRef.current = false; // 关闭时重置请求标志
        onClose();
      }}
      maxWidth={false}
      fullWidth
      sx={{
        '& .MuiDialog-paper': {
          width: '90%',
          maxWidth: '1350px', // md (900px) + 50% = 1350px
          maxHeight: '90vh', // 限制最大高度
          display: 'flex',
          flexDirection: 'column'
        },
        '& .MuiDialogContent-root': {
          overflow: 'visible', // 允许内容溢出，确保 label 显示
          flex: '1 1 auto',
          minHeight: 0
        }
      }}
    >
      <DialogTitle sx={{ pb: 3 }}>
        {t('expense.selectInvoices') || '选择发票'}
      </DialogTitle>
      <DialogContent sx={{ pt: 4, overflow: 'visible' }}>
        <Box sx={{ mb: 2, minHeight: 'auto' }}>
          <Grid container spacing={2}>
            <Grid item xs={12} md={7}>
              <TextField
                fullWidth
                size="small"
                label={t('common.search') || '搜索'}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder={t('invoice.list.searchPlaceholder') || '搜索发票号、商户名称...'}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon fontSize="small" />
                    </InputAdornment>
                  ),
                }}
                sx={{ minWidth: 0 }} // 确保在小屏幕上也能正常显示
              />
            </Grid>
            <Grid item xs={12} md={5}>
              <FormControl fullWidth size="small">
                <InputLabel>{t('invoice.list.category') || '分类'}</InputLabel>
                <Select
                  value={categoryFilter}
                  label={t('invoice.list.category') || '分类'}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  sx={{ minWidth: 0 }} // 确保在小屏幕上也能正常显示
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

        <TableContainer component={Paper} sx={{ maxHeight: 'calc(90vh - 300px)', overflow: 'auto' }}>
          {loading && <LinearProgress />}
          <Table size="small" stickyHeader>
            <TableHead>
              <TableRow>
                <TableCell padding="checkbox" sx={{ width: 48 }}></TableCell>
                <TableCell sx={{ whiteSpace: 'nowrap' }}>{t('invoice.list.columns.preview')}</TableCell>
                <TableCell sx={{ whiteSpace: 'nowrap' }}>{t('invoice.list.columns.invoiceNumber')}</TableCell>
                <TableCell sx={{ whiteSpace: 'nowrap' }}>{t('invoice.list.columns.vendorName')}</TableCell>
                <TableCell sx={{ whiteSpace: 'nowrap' }}>{t('invoice.list.columns.amount')}</TableCell>
                <TableCell sx={{ whiteSpace: 'nowrap' }}>{t('invoice.list.columns.invoiceDate')}</TableCell>
                <TableCell sx={{ whiteSpace: 'nowrap' }}>{t('invoice.list.columns.category')}</TableCell>
                <TableCell sx={{ whiteSpace: 'nowrap' }}>{t('invoice.list.columns.status')}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={8} align="center" sx={{ py: 4 }}>
                    <CircularProgress />
                  </TableCell>
                </TableRow>
              ) : filteredInvoices.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} align="center" sx={{ py: 4 }}>
                    <Alert severity="info" sx={{ width: '100%' }}>
                      {invoices.length === 0 
                        ? (t('expense.noAvailableInvoices') || '没有可用的发票')
                        : (t('invoice.list.noSearchResults') || '没有匹配的发票，请尝试调整搜索条件')
                      }
                    </Alert>
                  </TableCell>
                </TableRow>
              ) : (
                filteredInvoices.map((invoice) => {
                  const invoiceId = invoice._id || invoice.id;
                  const invoiceIdStr = invoiceId?.toString() || invoiceId;
                  const isLinked = linkedInvoiceIds.includes(invoiceIdStr);
                  // 统一转换为字符串进行比较
                  const selectedInvoicesStr = selectedInvoices.map(id => id?.toString() || id);
                  const isSelected = selectedInvoicesStr.includes(invoiceIdStr);
                  
                  return (
                    <TableRow 
                      key={invoiceIdStr} 
                      hover={!isLinked}
                      onClick={() => !isLinked && handleToggleInvoice(invoiceIdStr)}
                      sx={{ 
                        cursor: isLinked ? 'default' : 'pointer',
                        opacity: isLinked ? 0.7 : 1,
                        bgcolor: isLinked ? 'action.selected' : 'transparent'
                      }}
                      selected={isSelected}
                    >
                      <TableCell padding="checkbox">
                        <Checkbox
                          checked={isSelected}
                          onChange={() => !isLinked && handleToggleInvoice(invoiceIdStr)}
                          onClick={(e) => e.stopPropagation()}
                          disabled={isLinked}
                          indeterminate={isLinked}
                        />
                      </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        {getFileIcon(invoice.file?.mimeType)}
                        <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 150, overflow: 'hidden', textOverflow: 'ellipsis' }}>
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
                    <TableCell sx={{ whiteSpace: 'nowrap' }}>
                      {invoice.amount || invoice.totalAmount ? (
                        <Typography variant="body2" fontWeight={600}>
                          {invoice.currency || 'CNY'} {(invoice.totalAmount || invoice.amount)?.toFixed(2)}
                        </Typography>
                      ) : (
                        '-'
                      )}
                    </TableCell>
                    <TableCell sx={{ whiteSpace: 'nowrap' }}>
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
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Chip
                          label={getStatusLabel(invoice.status)}
                          color={getStatusColor(invoice.status)}
                          size="small"
                        />
                        {isLinked && (
                          <Chip
                            label={t('invoice.linked') || '已关联'}
                            color="info"
                            size="small"
                            variant="outlined"
                          />
                        )}
                      </Box>
                    </TableCell>
                  </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </TableContainer>
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

