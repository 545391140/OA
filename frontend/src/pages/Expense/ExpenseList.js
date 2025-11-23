import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
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
  TablePagination,
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
  Business as BusinessIcon
} from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../contexts/AuthContext';
import { useNotification } from '../../contexts/NotificationContext';
import apiClient from '../../utils/axiosConfig';
import dayjs from 'dayjs';

// 开发环境日志辅助函数
const devError = (...args) => {
  if (process.env.NODE_ENV === 'development') {
    console.error(...args);
  }
};

// 优化的表格行组件，使用React.memo避免不必要的重渲染
const ExpenseTableRow = React.memo(({ expense, onMenuOpen, getStatusColor, getCategoryIcon, t }) => {
  const formattedDate = useMemo(() => 
    expense.date ? dayjs(expense.date).format('MMM DD, YYYY') : '-',
    [expense.date]
  );

  return (
    <TableRow hover>
      <TableCell>
        <Typography variant="body2" sx={{ fontWeight: 'bold', fontFamily: 'monospace' }}>
          {expense.reimbursementNumber || '-'}
        </Typography>
      </TableCell>
      <TableCell>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Avatar sx={{ bgcolor: 'primary.main', width: 32, height: 32 }}>
            {getCategoryIcon(expense.category)}
          </Avatar>
          <Box>
            <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>
              {expense.title || expense.expenseItem?.itemName || t('expense.untitled')}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {(expense.travel?.title && expense.travel.title.trim()) || 
               (expense.travel?.purpose && expense.travel.purpose.trim()) || 
               (expense.travel?.destination && (typeof expense.travel.destination === 'string' ? expense.travel.destination : expense.travel.destination.name || expense.travel.destination.city)) || 
               '-'}
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
            {expense.category ? (expense.category.charAt(0).toUpperCase() + expense.category.slice(1)) : '-'}
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
              {expense.vendor?.name || '-'}
            </Typography>
            {expense.vendor?.address && (
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
            {expense.currency || 'USD'} {(expense.amount || 0).toLocaleString()}
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
            {formattedDate}
          </Typography>
        </Box>
      </TableCell>
      <TableCell>
        <Chip
          label={
            expense.matchSource === 'auto' || expense.autoMatched === true
              ? (t('expense.generationType.ai') || 'AI生成')
              : (t('expense.generationType.manual') || '手动生成')
          }
          color={expense.matchSource === 'auto' || expense.autoMatched === true ? 'primary' : 'default'}
          size="small"
          variant={expense.matchSource === 'auto' || expense.autoMatched === true ? 'filled' : 'outlined'}
        />
      </TableCell>
      <TableCell>
        <Chip
          label={t(`expense.statuses.${expense.status}`) || expense.status}
          color={getStatusColor(expense.status)}
          size="small"
        />
      </TableCell>
      <TableCell>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <ReceiptIcon color="action" fontSize="small" />
          <Typography variant="body2">
            {(expense.receipts?.length || 0) + (expense.relatedInvoices?.length || 0)}
          </Typography>
        </Box>
      </TableCell>
      <TableCell>
        <IconButton
          onClick={(e) => onMenuOpen(e, expense)}
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
    prevProps.expense._id === nextProps.expense._id &&
    prevProps.expense.status === nextProps.expense.status &&
    prevProps.expense.title === nextProps.expense.title &&
    prevProps.expense.amount === nextProps.expense.amount
  );
});

ExpenseTableRow.displayName = 'ExpenseTableRow';

const ExpenseList = () => {
  const { t } = useTranslation();
  const { showNotification } = useNotification();
  const navigate = useNavigate();
  const location = useLocation();

  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [anchorEl, setAnchorEl] = useState(null);
  const [selectedExpense, setSelectedExpense] = useState(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(20);
  const [total, setTotal] = useState(0);

  // 使用 useMemo 缓存选项数组，避免每次渲染都重新创建
  const statusOptions = useMemo(() => [
    { value: 'all', label: t('expense.statuses.all') || 'All Status' },
    { value: 'draft', label: t('expense.statuses.draft') || 'Draft' },
    { value: 'submitted', label: t('expense.statuses.submitted') || 'Submitted' },
    { value: 'approved', label: t('expense.statuses.approved') || 'Approved' },
    { value: 'rejected', label: t('expense.statuses.rejected') || 'Rejected' },
    { value: 'paid', label: t('expense.statuses.paid') || 'Paid' },
    { value: 'cancelled', label: t('expense.statuses.cancelled') || 'Cancelled' }
  ], [t]);

  const categoryOptions = useMemo(() => [
    { value: 'all', label: t('expense.categories.all') || 'All Categories' },
    { value: 'transportation', label: t('expense.categories.transportation') || 'Transportation' },
    { value: 'accommodation', label: t('expense.categories.accommodation') || 'Accommodation' },
    { value: 'meals', label: t('expense.categories.meals') || 'Meals' },
    { value: 'entertainment', label: t('expense.categories.entertainment') || 'Entertainment' },
    { value: 'communication', label: t('expense.categories.communication') || 'Communication' },
    { value: 'office_supplies', label: t('expense.categories.officeSupplies') || 'Office Supplies' },
    { value: 'training', label: t('expense.categories.training') || 'Training' },
    { value: 'other', label: t('expense.categories.other') || 'Other' }
  ], [t]);

  // 使用 useCallback 优化函数，避免不必要的重渲染
  const getStatusColor = useCallback((status) => {
    const colors = {
      draft: 'default',
      submitted: 'warning',
      approved: 'success',
      rejected: 'error',
      paid: 'info',
      cancelled: 'error'
    };
    return colors[status] || 'default';
  }, []);

  const getCategoryIcon = useCallback((category) => {
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
  }, []);

  // 使用 ref 跟踪是否正在加载，避免并发请求
  const isLoadingRef = React.useRef(false);
  // 使用 ref 跟踪是否是首次加载
  const isInitialMount = React.useRef(true);
  // 使用 ref 跟踪上一次的路由路径
  const prevPathnameRef = React.useRef(location.pathname);
  // 使用 ref 存储上一次的搜索词，用于防抖判断
  const prevSearchTermRef = React.useRef(searchTerm);
  // 使用 ref 存储 fetchExpenses 函数，避免依赖变化导致 useEffect 重复执行
  const fetchExpensesRef = React.useRef(null);
  
  const fetchExpenses = useCallback(async () => {
    // 如果正在加载，跳过本次请求
    if (isLoadingRef.current) {
      return;
    }
    
    try {
      isLoadingRef.current = true;
      setLoading(true);
      const params = {
        page: page + 1,
        limit: rowsPerPage,
        status: statusFilter !== 'all' ? statusFilter : undefined,
        category: categoryFilter !== 'all' ? categoryFilter : undefined,
        search: searchTerm || undefined
      };

      const response = await apiClient.get('/expenses', { params });
      
      if (response.data && response.data.success) {
        setExpenses(response.data.data || []);
        setTotal(response.data.count || 0);
      } else {
        throw new Error('Failed to load expenses');
      }
    } catch (error) {
      devError('Failed to load expenses:', error);
      showNotification(
        error.response?.data?.message || t('expense.list.loadError') || '加载费用申请失败',
        'error'
      );
      setExpenses([]);
    } finally {
      setLoading(false);
      isLoadingRef.current = false;
    }
  }, [page, rowsPerPage, statusFilter, categoryFilter, searchTerm, showNotification, t]);

  // 更新 ref 中的函数引用
  fetchExpensesRef.current = fetchExpenses;

  // 主数据获取：处理 page, rowsPerPage, statusFilter, categoryFilter 的变化
  useEffect(() => {
    // 首次加载时执行
    if (isInitialMount.current) {
      isInitialMount.current = false;
      prevPathnameRef.current = location.pathname;
      prevSearchTermRef.current = searchTerm;
      fetchExpensesRef.current?.();
      return;
    }
    
    // 后续依赖变化时执行（排除搜索词变化，搜索词由单独的useEffect处理）
    fetchExpensesRef.current?.();
  }, [page, rowsPerPage, statusFilter, categoryFilter]); // 移除 fetchExpenses 依赖

  // 监听路由变化，当从编辑页面返回时刷新数据
  useEffect(() => {
    // 跳过首次渲染（避免与第一个 useEffect 重复）
    if (isInitialMount.current) {
      return;
    }
    
    // 只有当路径从非 /expenses 变为 /expenses 时才刷新（表示从其他页面返回）
    if (location.pathname === '/expenses' && prevPathnameRef.current !== '/expenses') {
      fetchExpensesRef.current?.();
    }
    prevPathnameRef.current = location.pathname;
  }, [location.pathname]); // 移除 fetchExpenses 依赖

  // 搜索防抖：只在 searchTerm 变化时执行
  useEffect(() => {
    // 跳过首次渲染
    if (isInitialMount.current) {
      prevSearchTermRef.current = searchTerm;
      return;
    }
    
    // 如果搜索词没有变化，跳过
    if (prevSearchTermRef.current === searchTerm) {
      return;
    }
    
    prevSearchTermRef.current = searchTerm;
    
    const timer = setTimeout(() => {
      if (page === 0) {
        fetchExpensesRef.current?.();
      } else {
        setPage(0);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [searchTerm, page]); // 移除 fetchExpenses 依赖

  // 使用 useCallback 优化事件处理函数
  const handleMenuOpen = useCallback((event, expense) => {
    setAnchorEl(event.currentTarget);
    setSelectedExpense(expense);
  }, []);

  const handleMenuClose = useCallback(() => {
    setAnchorEl(null);
    setSelectedExpense(null);
  }, []);

  const handleView = useCallback(() => {
    if (!selectedExpense || !selectedExpense._id) {
      return;
    }
    navigate(`/expenses/${selectedExpense._id}`);
    handleMenuClose();
  }, [selectedExpense, navigate, handleMenuClose]);

  const handleEdit = useCallback(() => {
    if (!selectedExpense || !selectedExpense._id) {
      return;
    }
    navigate(`/expenses/${selectedExpense._id}/edit`);
    handleMenuClose();
  }, [selectedExpense, navigate, handleMenuClose]);

  const handleDelete = useCallback(() => {
    setDeleteDialogOpen(true);
    // 不要在这里关闭菜单和清空 selectedExpense，因为删除对话框需要它
    setAnchorEl(null); // 只关闭菜单
  }, []);

  const confirmDelete = useCallback(async () => {
    // 添加空值检查
    if (!selectedExpense || !selectedExpense._id) {
      showNotification(
        t('expense.deleteError') || '删除费用申请失败：未选择费用申请',
        'error'
      );
      setDeleteDialogOpen(false);
      setSelectedExpense(null);
      return;
    }

    try {
      await apiClient.delete(`/expenses/${selectedExpense._id}`);
      showNotification(
        t('expense.deleteSuccess') || '费用申请删除成功',
        'success'
      );
      // 刷新列表
      await fetchExpenses();
    } catch (error) {
      devError('Failed to delete expense:', error);
      showNotification(
        error.response?.data?.message || t('expense.deleteError') || '删除费用申请失败',
        'error'
      );
    } finally {
      setDeleteDialogOpen(false);
      setSelectedExpense(null);
    }
  }, [selectedExpense, showNotification, t, fetchExpenses]);

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
            {t('expense.newExpense') || 'New Expense'}
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
                  onChange={(e) => {
                    setStatusFilter(e.target.value);
                    setPage(0);
                  }}
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
                  onChange={(e) => {
                    setCategoryFilter(e.target.value);
                    setPage(0);
                  }}
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
                  setPage(0);
                }}
                fullWidth
              >
                {t('common.reset') || 'Clear'}
              </Button>
            </Grid>
          </Grid>
        </Paper>

        {/* Expenses Table */}
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>{t('expense.reimbursementNumber') || '核销单号'}</TableCell>
                <TableCell>{t('expense.title') || 'Expense'}</TableCell>
                <TableCell>{t('expense.category')}</TableCell>
                <TableCell>{t('expense.vendor')}</TableCell>
                <TableCell>{t('expense.amount')}</TableCell>
                <TableCell>{t('expense.date')}</TableCell>
                <TableCell>{t('expense.generationType') || '生成类型'}</TableCell>
                <TableCell>{t('expense.status')}</TableCell>
                <TableCell>{t('expense.receipts') || 'Receipts'}</TableCell>
                <TableCell>{t('common.actions')}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {expenses.map((expense) => (
                <ExpenseTableRow
                  key={expense._id}
                  expense={expense}
                  onMenuOpen={handleMenuOpen}
                  getStatusColor={getStatusColor}
                  getCategoryIcon={getCategoryIcon}
                  t={t}
                />
              ))}
            </TableBody>
          </Table>
        </TableContainer>

        {expenses.length === 0 && !loading && (
          <Paper sx={{ p: 4, textAlign: 'center', mt: 2 }}>
            <Typography variant="h6" color="text.secondary">
              {t('expense.list.noExpenses') || 'No expenses found'}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              {searchTerm || statusFilter !== 'all' || categoryFilter !== 'all'
                ? (t('expense.list.tryAdjusting') || 'Try adjusting your search criteria')
                : (t('expense.list.createFirst') || 'Create your first expense to get started')
              }
            </Typography>
            {!searchTerm && statusFilter === 'all' && categoryFilter === 'all' && (
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={() => navigate('/expenses/new')}
                sx={{ mt: 2 }}
              >
                {t('expense.newExpense') || 'Create Expense'}
              </Button>
            )}
          </Paper>
        )}

        {/* Pagination */}
        {total > 0 && (
          <TablePagination
            component="div"
            count={total}
            page={page}
            onPageChange={(event, newPage) => setPage(newPage)}
            rowsPerPage={rowsPerPage}
            onRowsPerPageChange={(event) => {
              setRowsPerPage(parseInt(event.target.value, 10));
              setPage(0);
            }}
            rowsPerPageOptions={[10, 20, 50, 100]}
            labelRowsPerPage={t('common.rowsPerPage') || 'Rows per page:'}
          />
        )}

        {/* Action Menu */}
        <Menu
          anchorEl={anchorEl}
          open={Boolean(anchorEl)}
          onClose={handleMenuClose}
        >
          <MenuItem onClick={handleView}>
            <ViewIcon sx={{ mr: 1.5, fontSize: 20 }} />
            {t('common.view')}
          </MenuItem>
          {(selectedExpense?.status === 'draft' || selectedExpense?.status === 'submitted') && (
            <MenuItem onClick={handleEdit}>
              <EditIcon sx={{ mr: 1.5, fontSize: 20 }} />
              {t('common.edit')}
            </MenuItem>
          )}
          <MenuItem onClick={handleDelete} sx={{ color: 'error.main' }}>
            <DeleteIcon sx={{ mr: 1.5, fontSize: 20 }} />
            {t('common.delete')}
          </MenuItem>
        </Menu>

        {/* Delete Confirmation Dialog */}
        <Dialog
          open={deleteDialogOpen}
          onClose={() => {
            setDeleteDialogOpen(false);
            setSelectedExpense(null);
          }}
        >
          <DialogTitle>{t('dialogs.confirmDelete') || '确认删除'}</DialogTitle>
          <DialogContent>
            <Typography>
              {t('expense.list.confirmDelete') || '确定要删除费用申请'} "{selectedExpense?.title || selectedExpense?.expenseItem?.itemName || t('expense.untitled') || '未命名费用'}"? 
              {t('expense.list.deleteWarning') || '此操作无法撤销。'}
            </Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => {
              setDeleteDialogOpen(false);
              setSelectedExpense(null);
            }}>
              {t('common.cancel')}
            </Button>
            <Button onClick={confirmDelete} color="error" variant="contained">
              {t('common.delete')}
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </Container>
  );
};

export default ExpenseList;
