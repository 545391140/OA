import React, { useState, useEffect, useRef } from 'react';
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
  Card,
  CardContent,
  Table,
  TableBody,
  TableRow,
  TableCell,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Tooltip
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  ExpandMore as ExpandMoreIcon,
  Flight as FlightIcon,
  Train as TrainIcon,
  DirectionsCar as CarIcon,
  DirectionsBus as BusIcon,
  LocationOn as LocationIcon,
  CalendarToday as CalendarIcon,
  Person as PersonIcon,
  Business as BusinessIcon,
  Description as DescriptionIcon,
  AttachMoney as MoneyIcon,
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
  Comment as CommentIcon,
  AccessTime as AccessTimeIcon,
  PersonOutline as PersonOutlineIcon,
  Label as LabelIcon,
  Schedule as ScheduleIcon,
  Receipt as ReceiptIcon,
  Add as AddIcon,
  Visibility as VisibilityIcon,
  AutoAwesome as AutoAwesomeIcon
} from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../contexts/AuthContext';
import { useNotification } from '../../contexts/NotificationContext';
import apiClient from '../../utils/axiosConfig';
import dayjs from 'dayjs';
import { numberToChinese } from '../../utils/numberToChinese';

const TravelDetail = () => {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const { showNotification } = useNotification();
  const { id } = useParams();
  const navigate = useNavigate();

  const [travel, setTravel] = useState(null);
  const [loading, setLoading] = useState(true);
  const [approvalDialogOpen, setApprovalDialogOpen] = useState(false);
  const [approvalAction, setApprovalAction] = useState(''); // 'approve' or 'reject'
  const [approvalComment, setApprovalComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [expenseItems, setExpenseItems] = useState({});
  const [budgetValidation, setBudgetValidation] = useState(null);
  const [expenses, setExpenses] = useState([]);
  const [expensesLoading, setExpensesLoading] = useState(false);
  const [generatingExpenses, setGeneratingExpenses] = useState(false);

  useEffect(() => {
    fetchExpenseItems();
    fetchTravelDetail();
  }, [id]);

  // 使用 useRef 防止重复请求
  const expensesFetchedRef = useRef(false);
  
  useEffect(() => {
    // 只有当差旅状态为 completed 且还没有加载过费用时才加载
    if (travel && travel.status === 'completed' && !expensesFetchedRef.current) {
      expensesFetchedRef.current = true;
      fetchTravelExpenses();
    }
    // 如果差旅状态不是 completed，重置标记
    if (travel && travel.status !== 'completed') {
      expensesFetchedRef.current = false;
    }
  }, [travel?.status, travel?._id]);

  const fetchExpenseItems = async () => {
    try {
      const response = await apiClient.get('/expense-items');
      if (response.data && response.data.success) {
        // 创建ID到名称的映射
        const itemsMap = {};
        response.data.data.forEach(item => {
          itemsMap[item._id] = item.itemName;
        });
        setExpenseItems(itemsMap);
      }
    } catch (error) {
      console.error('Failed to load expense items:', error);
    }
  };

  const fetchTravelExpenses = async () => {
    // 防止重复请求
    if (expensesLoading) {
      return;
    }
    
    try {
      setExpensesLoading(true);
      console.log(`[TravelDetail] Fetching expenses for travel ${id}`);
      const response = await apiClient.get(`/travel/${id}/expenses`);
      console.log(`[TravelDetail] Expenses response:`, response.data);
      
      if (response.data && response.data.success) {
        const expenses = response.data.data || [];
        console.log(`[TravelDetail] Loaded ${expenses.length} expenses`);
        
        // 过滤掉 null、undefined 或没有 _id 的费用项
        const validExpenses = expenses.filter(expense => {
          if (!expense) {
            console.warn(`[TravelDetail] Found null/undefined expense, skipping`);
            return false;
          }
          if (!expense._id) {
            console.warn(`[TravelDetail] Found expense without _id:`, expense);
            return false;
          }
          return true;
        });
        
        console.log(`[TravelDetail] Valid expenses: ${validExpenses.length} out of ${expenses.length}`);
        setExpenses(validExpenses);
      } else {
        console.warn(`[TravelDetail] Unexpected response format:`, response.data);
        setExpenses([]);
      }
    } catch (error) {
      console.error(`[TravelDetail] Failed to load travel expenses:`, error);
      console.error(`[TravelDetail] Error response:`, error.response);
      console.error(`[TravelDetail] Error details:`, error.response?.data);
      
      // 429 错误是请求频率过高，不显示错误提示，避免干扰用户
      if (error.response?.status === 429) {
        console.log(`[TravelDetail] Rate limit hit, suppressing error notification`);
        return;
      }
      
      // 500 错误显示详细错误信息
      if (error.response?.status === 500) {
        const errorMessage = error.response?.data?.message || 
                            error.response?.data?.error?.message ||
                            '加载费用申请失败，服务器错误';
        console.error(`[TravelDetail] Server error:`, errorMessage);
        showNotification(errorMessage, 'error');
      } else if (error.response?.status === 404) {
        // 404 错误可能是差旅单不存在，不显示错误
        console.log(`[TravelDetail] Travel not found`);
        setExpenses([]);
      } else if (error.response?.status === 403) {
        // 403 错误是权限问题
        showNotification('无权访问此差旅的费用申请', 'error');
      } else {
        // 其他错误显示通用错误信息
        showNotification(t('travel.detail.expenses.loadError') || '加载费用申请失败', 'error');
      }
      
      // 请求失败时重置标记，允许重试
      expensesFetchedRef.current = false;
      // 设置空数组，避免显示错误状态
      setExpenses([]);
    } finally {
      setExpensesLoading(false);
    }
  };

  const handleGenerateExpenses = async () => {
    try {
      setGeneratingExpenses(true);
      const response = await apiClient.post(`/travel/${id}/generate-expenses`);
      if (response.data && response.data.success) {
        showNotification(
          t('travel.detail.expenses.generateSuccess') || `成功生成 ${response.data.data.generatedCount} 个费用申请`,
          'success'
        );
        // 刷新费用申请列表
        await fetchTravelExpenses();
        // 刷新差旅详情
        await fetchTravelDetail();
      }
    } catch (error) {
      console.error('Failed to generate expenses:', error);
      showNotification(
        error.response?.data?.message || t('travel.detail.expenses.generateError') || '生成费用申请失败',
        'error'
      );
    } finally {
      setGeneratingExpenses(false);
    }
  };

  const fetchTravelDetail = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get(`/travel/${id}`);
      
      if (response.data && response.data.success) {
        const travelData = response.data.data;
        setTravel(travelData);
        
        // 延迟验证，确保travel state已更新
        setTimeout(() => {
          const validation = validateBudgetTotal();
          setBudgetValidation(validation);
        }, 100);
      } else {
        throw new Error('Failed to load travel details');
      }
    } catch (error) {
      console.error('Failed to load travel detail:', error);
      showNotification(t('travel.detail.loadError') || '加载失败', 'error');
      setTravel(null);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      draft: 'default',
      submitted: 'warning',
      approved: 'success',
      rejected: 'error',
      completed: 'success',
      cancelled: 'error',
      pending: 'warning'
    };
    return colors[status] || 'default';
  };

  const getApprovalStatusIcon = (status) => {
    switch (status) {
      case 'approved':
        return <CheckCircleIcon sx={{ fontSize: 20 }} />;
      case 'rejected':
        return <CancelIcon sx={{ fontSize: 20 }} />;
      case 'pending':
        return <ScheduleIcon sx={{ fontSize: 20 }} />;
      default:
        return <AccessTimeIcon sx={{ fontSize: 20 }} />;
    }
  };

  const formatDateTime = (date) => {
    if (!date) return '-';
    return dayjs(date).format('YYYY-MM-DD HH:mm');
  };

  const getTransportIcon = (type) => {
    const icons = {
      flight: <FlightIcon />,
      train: <TrainIcon />,
      car: <CarIcon />,
      bus: <BusIcon />
    };
    return icons[type] || <FlightIcon />;
  };

  const formatCurrency = (amount) => {
    return `¥${parseFloat(amount || 0).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  // 统一的金额提取函数 - 从数据库预算项中提取subtotal
  const extractAmount = (item) => {
    if (typeof item === 'number') {
      return item;
    }
    if (typeof item === 'object' && item !== null) {
      // 数据库中的预算项结构：{ itemId, itemName, quantity, unitPrice, subtotal }
      // 优先使用subtotal字段
      const subtotal = item.subtotal;
      if (subtotal !== undefined && subtotal !== null) {
        return parseFloat(subtotal) || 0;
      }
      // 降级处理：尝试其他可能的字段
      return parseFloat(item.amount) || parseFloat(item.total) || 0;
    }
    return 0;
  };

  // 获取费用项名称 - 优先使用数据库中的itemName，其次通过itemId查找
  const getExpenseItemName = (budgetItem, fallbackKey) => {
    // 如果budgetItem不是对象，使用fallbackKey查找
    if (!budgetItem || typeof budgetItem !== 'object') {
      return expenseItems[fallbackKey] || fallbackKey;
    }
    
    // 优先使用数据库存储的itemName（最可靠）
    if (budgetItem.itemName && budgetItem.itemName.trim()) {
      return budgetItem.itemName;
    }
    
    // 其次使用itemId查找费用项名称
    const itemId = budgetItem.itemId || fallbackKey;
    if (expenseItems[itemId]) {
      return expenseItems[itemId];
    }
    
    // 最后降级显示itemId或fallbackKey
    return itemId || fallbackKey;
  };

  // 计算预算总和 - 累加所有预算项的subtotal
  const calculateBudgetTotal = (budget) => {
    if (!budget) return 0;
    if (Array.isArray(budget)) {
      // 多程预算是数组
      return budget.reduce((total, routeBudget) => {
        if (!routeBudget || typeof routeBudget !== 'object') return total;
        return total + Object.values(routeBudget).reduce((sum, item) => {
          return sum + extractAmount(item);
        }, 0);
      }, 0);
    } else {
      // 单程预算是对象
      return Object.values(budget).reduce((sum, item) => {
        return sum + extractAmount(item);
      }, 0);
    }
  };

  // 计算所有预算的总和（去程+返程+多程）
  const calculateTotalBudget = () => {
    if (!travel) return 0;
    const outboundTotal = calculateBudgetTotal(travel.outboundBudget);
    const inboundTotal = calculateBudgetTotal(travel.inboundBudget);
    const multiCityTotal = calculateBudgetTotal(travel.multiCityRoutesBudget);
    return outboundTotal + inboundTotal + multiCityTotal;
  };

  // 验证总预算是否等于各项之和
  const validateBudgetTotal = () => {
    if (!travel) return { isValid: true, message: '' };
    
    const outboundTotal = calculateBudgetTotal(travel.outboundBudget);
    const inboundTotal = calculateBudgetTotal(travel.inboundBudget);
    const multiCityTotal = calculateBudgetTotal(travel.multiCityRoutesBudget);
    const calculatedTotal = outboundTotal + inboundTotal + multiCityTotal;
    const estimatedBudget = travel.estimatedBudget || 0;
    
    const difference = Math.abs(calculatedTotal - estimatedBudget);
    const isValid = difference < 0.01; // 允许0.01的误差（浮点数精度问题）
    
    return {
      isValid,
      message: isValid ? '' : `预算总额与明细之和不一致，差异：${formatCurrency(difference)}`,
      outboundTotal,
      inboundTotal,
      multiCityTotal,
      calculatedTotal,
      estimatedBudget,
      difference
    };
  };

  const formatDate = (date) => {
    return date ? dayjs(date).format('YYYY-MM-DD') : '-';
  };

  const handleEdit = () => {
    navigate(`/travel/${id}/edit`);
  };

  const handleMarkAsCompleted = async () => {
    if (!window.confirm(t('travel.detail.confirmMarkAsCompleted') || '确定要将此差旅标记为已完成吗？标记后将自动匹配发票并生成费用申请。')) {
      return;
    }

    try {
      setSubmitting(true);
      // 1. 先将状态改为 completed
      const response = await apiClient.put(`/travel/${id}`, {
        status: 'completed'
      });

      if (response.data && response.data.success) {
        showNotification(
          t('travel.detail.markAsCompletedSuccess') || '差旅已标记为已完成',
          'success'
        );
        
        // 2. 刷新差旅详情以获取最新状态
        await fetchTravelDetail();
        
        // 3. 自动调用费用生成API，匹配发票并生成费用申请
        try {
          setGeneratingExpenses(true);
          const generateResponse = await apiClient.post(`/travel/${id}/generate-expenses`);
          if (generateResponse.data && generateResponse.data.success) {
            const generatedCount = generateResponse.data.data.generatedCount || 0;
            showNotification(
              t('travel.detail.expenses.generateSuccess') || `成功生成 ${generatedCount} 个费用申请`,
              'success'
            );
            // 刷新费用申请列表
            await fetchTravelExpenses();
            // 再次刷新差旅详情以更新状态
            await fetchTravelDetail();
          }
        } catch (generateError) {
          console.error('Failed to generate expenses:', generateError);
          console.error('Error response data:', generateError.response?.data);
          console.error('Error status:', generateError.response?.status);
          
          const errorMessage = generateError.response?.data?.message || '';
          const errorStatus = generateError.response?.status;
          const errorData = generateError.response?.data?.data || {};
          
          // 根据不同的错误情况显示不同的提示
          let userMessage = '';
          if (errorStatus === 400) {
            if (errorMessage.includes('already generated') || errorMessage.includes('Expenses already generated')) {
              // 费用已经生成过，检查实际费用数量
              await fetchTravelExpenses();
              await fetchTravelDetail();
              
              // 检查费用列表是否为空
              const expensesCount = expenses.length;
              const relatedExpenses = errorData.expenses || [];
              
              console.log('Expenses check:', {
                expensesCount,
                relatedExpensesCount: relatedExpenses.length,
                expenseGenerationStatus: errorData.expenseGenerationStatus
              });
              
              // 如果费用列表为空，说明状态不一致，需要重置状态
              if (expensesCount === 0 && relatedExpenses.length === 0) {
                console.warn('Expense generation status is completed but no expenses found, resetting status');
                try {
                  // 重置费用生成状态为 pending，允许重新生成
                  await apiClient.put(`/travel/${id}`, {
                    expenseGenerationStatus: 'pending'
                  });
                  showNotification('费用生成状态已重置，请重新点击"生成费用申请"按钮', 'info');
                  await fetchTravelDetail();
                } catch (resetError) {
                  console.error('Failed to reset expense generation status:', resetError);
                  showNotification('费用生成状态异常，请联系管理员', 'error');
                }
              } else {
                // 费用确实存在，这是正常的，不需要警告
                userMessage = '费用申请已存在，无需重复生成';
              }
            } else if (errorMessage.includes('Expense generation in progress')) {
              // 正在生成中，提示用户等待
              const timeout = errorData.timeout || 0;
              userMessage = `费用申请正在生成中，请稍候...（预计剩余 ${timeout} 秒）`;
              showNotification(userMessage, 'warning');
            } else if (errorMessage.includes('Travel has no employee assigned')) {
              // 差旅单没有分配员工
              userMessage = '差旅单未分配员工，无法自动生成费用申请';
              showNotification(userMessage, 'error');
            } else {
              // 显示完整的错误消息以便调试
              userMessage = errorMessage || '自动生成费用申请失败，您可以稍后手动生成';
              console.warn('Unknown 400 error:', {
                message: errorMessage,
                data: errorData,
                fullResponse: generateError.response?.data
              });
              showNotification(userMessage, 'warning');
            }
          } else {
            userMessage = errorMessage || t('travel.detail.expenses.generateError') || '自动生成费用申请失败，您可以稍后手动生成';
            showNotification(userMessage, 'error');
          }
        } finally {
          setGeneratingExpenses(false);
        }
      }
    } catch (error) {
      console.error('Failed to mark travel as completed:', error);
      showNotification(
        error.response?.data?.message || t('travel.detail.markAsCompletedError') || '标记失败',
        'error'
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (window.confirm(t('travel.detail.confirmDelete') || '确定要删除这条差旅申请吗？')) {
      try {
        await apiClient.delete(`/travel/${id}`);
        showNotification(t('travel.detail.deleteSuccess') || '删除成功', 'success');
        navigate('/travel');
      } catch (error) {
        showNotification(t('travel.detail.deleteError') || '删除失败', 'error');
      }
    }
  };

  const handleOpenApprovalDialog = (action) => {
    setApprovalAction(action);
    setApprovalDialogOpen(true);
  };

  const handleCloseApprovalDialog = () => {
    setApprovalDialogOpen(false);
    setApprovalComment('');
    setApprovalAction('');
  };

  const handleSubmitApproval = async () => {
    if (!approvalComment.trim()) {
      showNotification(t('travel.detail.commentRequired') || '请输入审批意见', 'warning');
      return;
    }

    try {
      setSubmitting(true);
      // 使用正确的API路径：PUT /api/approvals/travel/:id
      await apiClient.put(`/approvals/travel/${id}`, {
        status: approvalAction === 'approve' ? 'approved' : 'rejected',
        comments: approvalComment
      });
      
      showNotification(
        approvalAction === 'approve' 
          ? (t('travel.detail.approveSuccess') || '审批通过') 
          : (t('travel.detail.rejectSuccess') || '已拒绝'),
        'success'
      );
      
      handleCloseApprovalDialog();
      fetchTravelDetail(); // 刷新数据
    } catch (error) {
      console.error('Approval error:', error);
      showNotification(
        error.response?.data?.message || t('travel.detail.approvalError') || '审批失败',
        'error'
      );
    } finally {
      setSubmitting(false);
    }
  };

  // 检查当前用户是否可以审批
  const canApprove = () => {
    if (!user || !travel) return false;
    
    // 只有已提交状态的申请才能审批
    if (travel.status !== 'submitted') return false;
    
    // 检查当前用户是否在审批列表中且状态为pending
    if (!travel.approvals || !Array.isArray(travel.approvals)) return false;
    
    const pendingApproval = travel.approvals.find(approval => {
      const approverId = approval.approver?._id || approval.approver;
      return approverId && approverId.toString() === user.id && approval.status === 'pending';
    });
    
    return !!pendingApproval;
  };

  if (loading) {
    return (
      <Container maxWidth="xl">
        <Box sx={{ width: '100%', mt: 2 }}>
          <LinearProgress />
        </Box>
      </Container>
    );
  }

  if (!travel) {
    return (
      <Container maxWidth="xl">
        <Box sx={{ py: 3 }}>
          <Alert severity="error">
            {t('travel.detail.notFound') || '未找到差旅申请'}
          </Alert>
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ py: 3 }}>
        {/* Header */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
          <IconButton onClick={() => navigate('/travel')}>
            <ArrowBackIcon />
          </IconButton>
          <Box sx={{ flexGrow: 1 }}>
            <Typography variant="h4" gutterBottom>
            {travel.title || t('travel.detail.title')}
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Chip
                label={t(`travel.statuses.${travel.status}`) || travel.status}
                color={getStatusColor(travel.status)}
                size="small"
              />
            {travel.travelNumber && (
              <Typography variant="body2" color="text.secondary">
                {t('travel.detail.travelNumber')}: {travel.travelNumber}
              </Typography>
            )}
            <Typography variant="body2" color="text.secondary">
              {t('travel.detail.createdOn')}: {formatDate(travel.createdAt)}
            </Typography>
            </Box>
          </Box>
          <Box sx={{ display: 'flex', gap: 1 }}>
          {/* 编辑和删除按钮 - 仅草稿状态 */}
          {(user?.role === 'admin' || travel.employee?._id === user?.id) && travel.status === 'draft' && (
            <>
            <Button
                variant="contained"
              startIcon={<EditIcon />}
              onClick={handleEdit}
            >
                {t('common.edit')}
            </Button>
            <Button
              variant="outlined"
              color="error"
              startIcon={<DeleteIcon />}
              onClick={handleDelete}
            >
                {t('common.delete')}
              </Button>
            </>
          )}
          
          {/* 审批按钮 - 管理员和经理可见，仅已提交状态 */}
          {canApprove() && (
            <>
              <Button
                variant="contained"
                color="success"
                startIcon={<CheckCircleIcon />}
                onClick={() => handleOpenApprovalDialog('approve')}
              >
                {t('travel.detail.approve')}
              </Button>
              <Button
                variant="contained"
                color="error"
                startIcon={<CancelIcon />}
                onClick={() => handleOpenApprovalDialog('reject')}
              >
                {t('travel.detail.reject')}
            </Button>
            </>
          )}
          
          {/* 标记为已完成按钮 - 仅已批准状态，申请人或管理员可见 */}
          {(user?.role === 'admin' || travel.employee?._id === user?.id) && 
           travel.status === 'approved' && (
            <Button
              variant="contained"
              color="primary"
              startIcon={<CheckCircleIcon />}
              onClick={handleMarkAsCompleted}
            >
              {t('travel.detail.markAsCompleted') || '标记为已完成'}
            </Button>
          )}
          </Box>
        </Box>

      <Grid container spacing={2}>
        {/* 左侧主要内容 */}
          <Grid item xs={12} md={8}>
          {/* 基本信息 */}
          <Paper sx={{ p: 2, mb: 2 }}>
            <Typography variant="subtitle1" fontWeight={600} gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <DescriptionIcon color="primary" fontSize="small" />
              {t('travel.detail.basicInfo')}
              </Typography>
            <Divider sx={{ mb: 1.5 }} />
              
              <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <Box sx={{ mb: 1 }}>
                  <Typography variant="caption" color="text.secondary" display="block">
                    {t('travel.detail.applicant')}
                  </Typography>
                  <Typography variant="body2">
                    {travel.employee?.firstName} {travel.employee?.lastName}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {travel.employee?.email}
                  </Typography>
                </Box>
                </Grid>

                <Grid item xs={12} md={6}>
                <Box sx={{ mb: 1 }}>
                  <Typography variant="caption" color="text.secondary" display="block">
                    {t('travel.detail.department')}
                  </Typography>
                  <Typography variant="body2">
                    {travel.costOwingDepartment || travel.employee?.department || '-'}
                    </Typography>
                  </Box>
              </Grid>

              <Grid item xs={12} md={6}>
                <Box sx={{ mb: 1 }}>
                  <Typography variant="caption" color="text.secondary" display="block">
                    {t('travel.detail.travelType')}
                  </Typography>
                  <Typography variant="body2">
                    {travel.tripType === 'international' ? t('travel.international') : t('travel.domestic')}
                    </Typography>
                </Box>
                </Grid>

                <Grid item xs={12} md={6}>
                <Box sx={{ mb: 1 }}>
                  <Typography variant="caption" color="text.secondary" display="block">
                    {t('travel.detail.destination')}
                  </Typography>
                  <Typography variant="body2">
                    {typeof travel.destination === 'string' 
                      ? travel.destination 
                      : (travel.destination?.city || travel.destination?.name || '-')}
                  </Typography>
                </Box>
                </Grid>

                <Grid item xs={12} md={6}>
                <Box sx={{ mb: 1 }}>
                  <Typography variant="caption" color="text.secondary" display="block">
                    {t('travel.detail.travelDates')}
                  </Typography>
                  <Typography variant="body2">
                    {formatDate(travel.startDate)} ~ {formatDate(travel.endDate)}
                    </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {dayjs(travel.endDate).diff(dayjs(travel.startDate), 'days')} {t('travel.detail.days')}
                  </Typography>
                </Box>
                </Grid>

                <Grid item xs={12} md={6}>
                <Box sx={{ mb: 1 }}>
                  <Typography variant="caption" color="text.secondary" display="block">
                    {t('travel.detail.purpose')}
                  </Typography>
                  <Typography variant="body2">
                    {travel.purpose || travel.tripDescription || '-'}
                  </Typography>
                </Box>
              </Grid>

              {travel.comment && (
                <Grid item xs={12}>
                  <Box sx={{ mb: 1 }}>
                    <Typography variant="caption" color="text.secondary" display="block">
                      {t('travel.detail.comment')}
                    </Typography>
                    <Typography variant="body2">
                      {travel.comment}
                    </Typography>
                  </Box>
                </Grid>
              )}
              </Grid>
            </Paper>

          {/* 行程信息 */}
          <Paper sx={{ p: 2, mb: 2 }}>
            <Typography variant="subtitle1" fontWeight={600} gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <FlightIcon color="primary" fontSize="small" />
              {t('travel.detail.itinerary')}
            </Typography>
            <Divider sx={{ mb: 1.5 }} />

            {/* 去程 */}
            {travel.outbound && (travel.outbound.departure || travel.outbound.destination) && (
              <Box sx={{ mb: 1.5 }}>
                <Typography variant="body2" fontWeight={600} gutterBottom>
                  {t('travel.detail.outbound')}
                </Typography>
                <Card variant="outlined" sx={{ p: 1.5 }}>
                  <Grid container spacing={1.5}>
                    <Grid item xs={6} md={3}>
                      <Typography variant="caption" color="text.secondary" display="block">
                        {t('travel.detail.date')}
                      </Typography>
                      <Typography variant="body2">
                        {formatDate(travel.outbound.date)}
                      </Typography>
                    </Grid>
                    <Grid item xs={6} md={3}>
                      <Typography variant="caption" color="text.secondary" display="block">
                        {t('travel.detail.from')}
                      </Typography>
                      <Typography variant="body2">
                        {travel.outbound.departure || '-'}
                      </Typography>
                    </Grid>
                    <Grid item xs={6} md={3}>
                      <Typography variant="caption" color="text.secondary" display="block">
                        {t('travel.detail.to')}
                      </Typography>
                      <Typography variant="body2">
                        {travel.outbound.destination || '-'}
                      </Typography>
                    </Grid>
                    <Grid item xs={6} md={3}>
                      <Typography variant="caption" color="text.secondary" display="block">
                        {t('travel.detail.transportation')}
                      </Typography>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        {getTransportIcon(travel.outbound.transportation)}
                        <Typography variant="body2">
                          {t(`travel.form.transportation.${travel.outbound.transportation}`) || travel.outbound.transportation || '-'}
                </Typography>
                      </Box>
                    </Grid>
                  </Grid>
                </Card>
              </Box>
            )}

            {/* 返程 */}
            {travel.inbound && (travel.inbound.departure || travel.inbound.destination) && (
              <Box sx={{ mb: 1.5 }}>
                <Typography variant="body2" fontWeight={600} gutterBottom>
                  {t('travel.detail.inbound')}
                </Typography>
                <Card variant="outlined" sx={{ p: 1.5 }}>
                  <Grid container spacing={1.5}>
                    <Grid item xs={6} md={3}>
                      <Typography variant="caption" color="text.secondary" display="block">
                        {t('travel.detail.date')}
                      </Typography>
                      <Typography variant="body2">
                        {formatDate(travel.inbound.date)}
                      </Typography>
                    </Grid>
                    <Grid item xs={6} md={3}>
                      <Typography variant="caption" color="text.secondary" display="block">
                        {t('travel.detail.from')}
                      </Typography>
                      <Typography variant="body2">
                        {travel.inbound.departure || '-'}
                      </Typography>
          </Grid>
                    <Grid item xs={6} md={3}>
                      <Typography variant="caption" color="text.secondary" display="block">
                        {t('travel.detail.to')}
              </Typography>
                      <Typography variant="body2">
                        {travel.inbound.destination || '-'}
                  </Typography>
                    </Grid>
                    <Grid item xs={6} md={3}>
                      <Typography variant="caption" color="text.secondary" display="block">
                        {t('travel.detail.transportation')}
                  </Typography>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        {getTransportIcon(travel.inbound.transportation)}
                        <Typography variant="body2">
                          {t(`travel.form.transportation.${travel.inbound.transportation}`) || travel.inbound.transportation || '-'}
                  </Typography>
                </Box>
                    </Grid>
                  </Grid>
                </Card>
              </Box>
            )}

            {/* 多程行程 */}
            {travel.multiCityRoutes && travel.multiCityRoutes.length > 0 && (
                      <Box>
                <Typography variant="body2" fontWeight={600} gutterBottom>
                  {t('travel.detail.multiCityRoutes')} ({travel.multiCityRoutes.length})
                </Typography>
                {travel.multiCityRoutes.map((route, index) => (
                  <Card key={index} variant="outlined" sx={{ p: 1.5, mb: 1.5 }}>
                    <Typography variant="caption" color="primary" display="block" gutterBottom>
                      {t('travel.detail.route')} {index + 1}
                    </Typography>
                    <Grid container spacing={1.5}>
                      <Grid item xs={6} md={3}>
                        <Typography variant="caption" color="text.secondary" display="block">
                          {t('travel.detail.date')}
                        </Typography>
                        <Typography variant="body2">
                          {formatDate(route.date)}
                        </Typography>
                      </Grid>
                      <Grid item xs={6} md={3}>
                        <Typography variant="caption" color="text.secondary" display="block">
                          {t('travel.detail.from')}
                        </Typography>
                        <Typography variant="body2">
                          {route.departure || '-'}
                        </Typography>
                      </Grid>
                      <Grid item xs={6} md={3}>
                        <Typography variant="caption" color="text.secondary" display="block">
                          {t('travel.detail.to')}
                        </Typography>
                        <Typography variant="body2">
                          {route.destination || '-'}
                        </Typography>
                      </Grid>
                      <Grid item xs={6} md={3}>
                        <Typography variant="caption" color="text.secondary" display="block">
                          {t('travel.detail.transportation')}
                          </Typography>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          {getTransportIcon(route.transportation)}
                          <Typography variant="body2">
                            {t(`travel.form.transportation.${route.transportation}`) || route.transportation || '-'}
                          </Typography>
                      </Box>
                      </Grid>
                    </Grid>
                  </Card>
                ))}
              </Box>
            )}
            </Paper>

          {/* 费用预算 */}
          <Paper sx={{ p: 2, mb: 2 }}>
            <Typography variant="subtitle1" fontWeight={600} gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <MoneyIcon color="primary" fontSize="small" />
              {t('travel.detail.budgetInfo')}
            </Typography>
            <Divider sx={{ mb: 1.5 }} />

            {/* 预算验证警告 */}
            {budgetValidation && !budgetValidation.isValid && (
              <Alert severity="warning" sx={{ mb: 1.5 }}>
                <Typography variant="body2">
                  {budgetValidation.message}
                </Typography>
                <Typography variant="caption" display="block" sx={{ mt: 0.5 }}>
                  计算总和: {formatCurrency(budgetValidation.calculatedTotal)} | 
                  预算总额: {formatCurrency(budgetValidation.estimatedBudget)}
                </Typography>
              </Alert>
            )}

            <Grid container spacing={1.5}>
              {/* 总额 */}
              <Grid item xs={6} md={3}>
                <Card variant="outlined" sx={{ p: 1.5, bgcolor: 'primary.50' }}>
                  <Typography variant="caption" color="text.secondary" display="block">
                    {t('travel.detail.totalBudget')}
                  </Typography>
                  <Typography variant="h6" color="primary">
                    {formatCurrency(calculateTotalBudget())}
                  </Typography>
                </Card>
              </Grid>

              {/* 去程预算 */}
              {travel.outboundBudget && Object.keys(travel.outboundBudget).length > 0 && (
                <Grid item xs={6} md={3}>
                  <Card variant="outlined" sx={{ p: 1.5, bgcolor: 'info.50' }}>
                    <Typography variant="caption" color="text.secondary" display="block">
                      {t('travel.detail.outbound')}
                    </Typography>
                    <Typography variant="h6" color="info.main">
                      {formatCurrency(calculateBudgetTotal(travel.outboundBudget))}
                    </Typography>
                  </Card>
                </Grid>
              )}

              {/* 返程预算 */}
              {travel.inboundBudget && Object.keys(travel.inboundBudget).length > 0 && (
                <Grid item xs={6} md={3}>
                  <Card variant="outlined" sx={{ p: 1.5, bgcolor: 'success.50' }}>
                    <Typography variant="caption" color="text.secondary" display="block">
                      {t('travel.detail.inbound')}
                    </Typography>
                    <Typography variant="h6" color="success.main">
                      {formatCurrency(calculateBudgetTotal(travel.inboundBudget))}
                    </Typography>
                  </Card>
                </Grid>
              )}

              {/* 多程预算 */}
              {travel.multiCityRoutesBudget && travel.multiCityRoutesBudget.length > 0 && (
                <Grid item xs={6} md={3}>
                  <Card variant="outlined" sx={{ p: 1.5, bgcolor: 'warning.50' }}>
                    <Typography variant="caption" color="text.secondary" display="block">
                      {t('travel.detail.multiCity')} ({travel.multiCityRoutesBudget.length})
                    </Typography>
                    <Typography variant="h6" color="warning.main">
                      {formatCurrency(calculateBudgetTotal(travel.multiCityRoutesBudget))}
                    </Typography>
                  </Card>
                </Grid>
              )}

              {/* 去程预算明细 */}
              {travel.outboundBudget && Object.keys(travel.outboundBudget).length > 0 && (
                <Grid item xs={12}>
                  <Accordion>
                    <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                      <Typography variant="subtitle1" fontWeight={600}>
                        {t('travel.detail.outboundBudget')}
                      </Typography>
                    </AccordionSummary>
                    <AccordionDetails>
                      <Table size="small">
                        <TableBody>
                          {Object.entries(travel.outboundBudget).map(([key, budgetItem]) => {
                            // 从数据库预算项中提取金额和名称
                            const amount = extractAmount(budgetItem);
                            const itemName = getExpenseItemName(budgetItem, key);
                            return (
                              <TableRow key={key}>
                                <TableCell>{itemName}</TableCell>
                                <TableCell align="right">{formatCurrency(amount)}</TableCell>
                              </TableRow>
                            );
                          })}
                          {/* 小计行 */}
                          <TableRow>
                            <TableCell sx={{ fontWeight: 600, borderTop: 2, borderColor: 'divider' }}>
                              {t('common.subtotal')}
                            </TableCell>
                            <TableCell align="right" sx={{ fontWeight: 600, borderTop: 2, borderColor: 'divider', color: 'info.main' }}>
                              {formatCurrency(calculateBudgetTotal(travel.outboundBudget))}
                            </TableCell>
                          </TableRow>
                        </TableBody>
                      </Table>
                    </AccordionDetails>
                  </Accordion>
                </Grid>
              )}

              {/* 返程预算明细 */}
              {travel.inboundBudget && Object.keys(travel.inboundBudget).length > 0 && (
                <Grid item xs={12}>
                  <Accordion>
                    <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                      <Typography variant="subtitle1" fontWeight={600}>
                        {t('travel.detail.inboundBudget')}
                      </Typography>
                    </AccordionSummary>
                    <AccordionDetails>
                      <Table size="small">
                        <TableBody>
                          {Object.entries(travel.inboundBudget).map(([key, budgetItem]) => {
                            // 从数据库预算项中提取金额和名称
                            const amount = extractAmount(budgetItem);
                            const itemName = getExpenseItemName(budgetItem, key);
                            return (
                              <TableRow key={key}>
                                <TableCell>{itemName}</TableCell>
                                <TableCell align="right">{formatCurrency(amount)}</TableCell>
                              </TableRow>
                            );
                          })}
                          {/* 小计行 */}
                          <TableRow>
                            <TableCell sx={{ fontWeight: 600, borderTop: 2, borderColor: 'divider' }}>
                              {t('common.subtotal')}
                            </TableCell>
                            <TableCell align="right" sx={{ fontWeight: 600, borderTop: 2, borderColor: 'divider', color: 'success.main' }}>
                              {formatCurrency(calculateBudgetTotal(travel.inboundBudget))}
                            </TableCell>
                          </TableRow>
                        </TableBody>
                      </Table>
                    </AccordionDetails>
                  </Accordion>
                </Grid>
              )}

              {/* 多程预算明细 */}
              {travel.multiCityRoutesBudget && travel.multiCityRoutesBudget.length > 0 && (
                <Grid item xs={12}>
                  <Accordion>
                    <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                      <Typography variant="subtitle1" fontWeight={600}>
                        {t('travel.detail.multiCityBudget')} ({travel.multiCityRoutesBudget.length})
                      </Typography>
                    </AccordionSummary>
                    <AccordionDetails>
                      {travel.multiCityRoutesBudget.map((budget, index) => {
                        const routeTotal = calculateBudgetTotal([budget]);
                        return (
                          <Box key={index} sx={{ mb: 2 }}>
                            <Typography variant="subtitle2" color="primary" gutterBottom>
                              {t('travel.detail.route')} {index + 1}
                            </Typography>
                            <Table size="small">
                              <TableBody>
                                {Object.entries(budget).map(([key, budgetItem]) => {
                                  // 从数据库预算项中提取金额和名称
                                  const amount = extractAmount(budgetItem);
                                  const itemName = getExpenseItemName(budgetItem, key);
                                  return (
                                    <TableRow key={key}>
                                      <TableCell>{itemName}</TableCell>
                                      <TableCell align="right">{formatCurrency(amount)}</TableCell>
                                    </TableRow>
                                  );
                                })}
                                {/* 小计行 */}
                                <TableRow>
                                  <TableCell sx={{ fontWeight: 600, borderTop: 2, borderColor: 'divider' }}>
                                    {t('common.subtotal')}
                                  </TableCell>
                                  <TableCell align="right" sx={{ fontWeight: 600, borderTop: 2, borderColor: 'divider', color: 'warning.main' }}>
                                    {formatCurrency(routeTotal)}
                                  </TableCell>
                                </TableRow>
                              </TableBody>
                            </Table>
                          </Box>
                        );
                      })}
                    </AccordionDetails>
                  </Accordion>
                </Grid>
              )}
            </Grid>
          </Paper>
        </Grid>

        {/* 右侧边栏 */}
        <Grid item xs={12} md={4}>
          {/* 审批信息 */}
          <Paper sx={{ p: 2, mb: 2 }}>
            <Typography variant="subtitle1" fontWeight={600} gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <CommentIcon color="primary" fontSize="small" />
              {t('travel.detail.approvalHistory')}
            </Typography>
            <Divider sx={{ mb: 2 }} />
            
            {travel.approvals && travel.approvals.length > 0 ? (
              <Box sx={{ position: 'relative' }}>
                {/* 时间线连接线 */}
                <Box
                  sx={{
                    position: 'absolute',
                    left: 20,
                    top: 0,
                    bottom: 0,
                    width: 2,
                    bgcolor: 'divider',
                    zIndex: 0
                  }}
                />
                
                {travel.approvals.map((approval, index) => {
                  const isLast = index === travel.approvals.length - 1;
                  const isPending = approval.status === 'pending';
                  const isApproved = approval.status === 'approved';
                  const isRejected = approval.status === 'rejected';
                  // 确保审批级别有效：如果 approval.level 不存在或为0，使用 index + 1
                  const approvalLevel = (approval.level && approval.level > 0) ? approval.level : (index + 1);
                  // 如果是中文，将数字转换为中文数字
                  const displayLevel = i18n.language === 'zh' ? numberToChinese(approvalLevel) : approvalLevel;
                  
                  return (
                    <Box
                      key={index}
                      sx={{
                        position: 'relative',
                        mb: isLast ? 0 : 2,
                        pl: 4
                      }}
                    >
                      {/* 时间线节点 */}
                      <Box
                        sx={{
                          position: 'absolute',
                          left: 12,
                          top: 8,
                          width: 16,
                          height: 16,
                          borderRadius: '50%',
                          border: 2,
                          borderColor: isPending 
                            ? 'warning.main' 
                            : isApproved 
                            ? 'success.main' 
                            : isRejected 
                            ? 'error.main' 
                            : 'divider',
                          bgcolor: 'background.paper',
                          zIndex: 1,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}
                      >
                        <Box
                          sx={{
                            width: 8,
                            height: 8,
                            borderRadius: '50%',
                            bgcolor: isPending 
                              ? 'warning.main' 
                              : isApproved 
                              ? 'success.main' 
                              : isRejected 
                              ? 'error.main' 
                              : 'divider'
                          }}
                        />
                      </Box>
                      
                      {/* 审批卡片 */}
                      <Card
                        variant="outlined"
                        sx={{
                          p: 2,
                          bgcolor: isPending 
                            ? 'warning.50' 
                            : isApproved 
                            ? 'success.50' 
                            : isRejected 
                            ? 'error.50' 
                            : 'grey.50',
                          borderLeft: 3,
                          borderLeftColor: isPending 
                            ? 'warning.main' 
                            : isApproved 
                            ? 'success.main' 
                            : isRejected 
                            ? 'error.main' 
                            : 'divider',
                          transition: 'all 0.2s ease-in-out',
                          '&:hover': {
                            boxShadow: 2,
                            transform: 'translateX(4px)'
                          }
                        }}
                      >
                        {/* 审批人信息 */}
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
                          <PersonOutlineIcon sx={{ fontSize: 18, color: 'text.secondary' }} />
                          <Typography variant="body2" fontWeight={600} color="text.primary">
                            {approval.approver?.firstName} {approval.approver?.lastName || t('travel.detail.unknownApprover')}
                          </Typography>
                        </Box>
                        
                        {/* 状态和级别 */}
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1.5, flexWrap: 'wrap' }}>
                          <Chip
                            icon={getApprovalStatusIcon(approval.status)}
                            label={t(`travel.approvalStatus.${approval.status}`) || approval.status}
                            color={getStatusColor(approval.status)}
                            size="small"
                            sx={{ fontWeight: 500 }}
                          />
                          <Chip
                            icon={<LabelIcon sx={{ fontSize: 14 }} />}
                            label={t('travel.detail.levelNumber', { level: displayLevel })}
                            variant="outlined"
                            size="small"
                            sx={{ fontSize: '0.75rem' }}
                          />
                        </Box>
                        
                        {/* 审批时间 */}
                        {approval.approvedAt && (
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: approval.comments ? 1.5 : 0 }}>
                            <AccessTimeIcon sx={{ fontSize: 14, color: 'text.secondary' }} />
                            <Typography variant="caption" color="text.secondary">
                              {t('travel.detail.approvalDate')}: {formatDateTime(approval.approvedAt)}
                            </Typography>
                          </Box>
                        )}
                        
                        {/* 审批意见 */}
                        {approval.comments && (
                          <Box
                            sx={{
                              mt: 1.5,
                              pt: 1.5,
                              borderTop: 1,
                              borderColor: 'divider'
                            }}
                          >
                            <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 0.5 }}>
                              <CommentIcon sx={{ fontSize: 16, color: 'text.secondary', mt: 0.25 }} />
                              <Box sx={{ flex: 1 }}>
                                <Typography variant="caption" color="text.secondary" display="block" gutterBottom>
                                  {t('travel.detail.comments')}
                                </Typography>
                                <Typography 
                                  variant="body2" 
                                  sx={{ 
                                    color: 'text.primary',
                                    whiteSpace: 'pre-wrap',
                                    wordBreak: 'break-word'
                                  }}
                                >
                                  {approval.comments}
                                </Typography>
                              </Box>
                            </Box>
                          </Box>
                        )}
                        
                        {/* 待审批提示 */}
                        {isPending && !approval.approvedAt && (
                          <Box
                            sx={{
                              mt: 1.5,
                              pt: 1.5,
                              borderTop: 1,
                              borderColor: 'divider'
                            }}
                          >
                            <Typography variant="caption" color="warning.main" sx={{ fontStyle: 'italic' }}>
                              {t('travel.detail.pendingApproval')}
                            </Typography>
                          </Box>
                        )}
                      </Card>
                    </Box>
                  );
                })}
              </Box>
            ) : (
              <Box
                sx={{
                  py: 4,
                  textAlign: 'center',
                  color: 'text.secondary'
                }}
              >
                <CommentIcon sx={{ fontSize: 48, opacity: 0.3, mb: 1 }} />
                <Typography variant="body2">
                  {t('travel.detail.noApprovalHistory')}
                </Typography>
              </Box>
            )}
          </Paper>

          {/* 费用申请区域 */}
          {travel.status === 'completed' && (
            <Paper sx={{ p: 2, mb: 2 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="subtitle1" fontWeight={600} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <ReceiptIcon color="primary" fontSize="small" />
                  {t('travel.detail.expenses.title') || '费用申请'}
                </Typography>
                {travel.expenseGenerationStatus === 'pending' && (
                  <Button
                    variant="contained"
                    startIcon={<AutoAwesomeIcon />}
                    onClick={handleGenerateExpenses}
                    disabled={generatingExpenses}
                  >
                    {generatingExpenses 
                      ? (t('travel.detail.expenses.generating') || '生成中...')
                      : (t('travel.detail.expenses.generate') || '生成费用申请')
                    }
                  </Button>
                )}
                {travel.expenseGenerationStatus === 'generating' && (
                  <Chip
                    label={t('travel.detail.expenses.generating') || '生成中...'}
                    color="info"
                    size="small"
                  />
                )}
                {travel.expenseGenerationStatus === 'completed' && expenses.length > 0 && (
                  <Chip
                    label={`${expenses.length} ${t('travel.detail.expenses.count') || '个费用申请'}`}
                    color="success"
                    size="small"
                  />
                )}
              </Box>
              <Divider sx={{ mb: 2 }} />

              {expensesLoading ? (
                <Box sx={{ py: 4, textAlign: 'center' }}>
                  <LinearProgress />
                </Box>
              ) : expenses.length > 0 ? (
                <Box>
                  {expenses.filter(expense => expense && expense._id).map((expense) => (
                    <Card key={expense._id} variant="outlined" sx={{ mb: 2 }}>
                      <CardContent>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                          <Box>
                            <Typography variant="subtitle2" fontWeight={600}>
                              {expense.expenseItem?.itemName || expense.title}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {expense.description}
                            </Typography>
                          </Box>
                          <Chip
                            label={t(`expense.statuses.${expense.status}`) || expense.status}
                            size="small"
                            color={expense.status === 'draft' ? 'default' : expense.status === 'submitted' ? 'info' : 'success'}
                          />
                        </Box>
                        <Grid container spacing={2} sx={{ mt: 1 }}>
                          <Grid item xs={6} sm={3}>
                            <Typography variant="caption" color="text.secondary" display="block">
                              {t('expense.amount') || '金额'}
                            </Typography>
                            <Typography variant="body2" fontWeight={600}>
                              {expense.currency} {expense.amount?.toLocaleString() || 0}
                            </Typography>
                          </Grid>
                          <Grid item xs={6} sm={3}>
                            <Typography variant="caption" color="text.secondary" display="block">
                              {t('travel.detail.expenses.invoiceCount') || '关联发票'}
                            </Typography>
                            <Typography variant="body2">
                              {expense.relatedInvoices?.length || 0} {t('travel.detail.expenses.invoices') || '张'}
                            </Typography>
                          </Grid>
                          <Grid item xs={6} sm={3}>
                            <Typography variant="caption" color="text.secondary" display="block">
                              {t('expense.date') || '日期'}
                            </Typography>
                            <Typography variant="body2">
                              {formatDate(expense.date)}
                            </Typography>
                          </Grid>
                          <Grid item xs={12} sm={3}>
                            <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end', alignItems: 'center' }}>
                              {/* 编辑按钮 - 仅草稿和已提交状态可编辑 */}
                              {(expense.status === 'draft' || expense.status === 'submitted') && (
                                <Tooltip title={t('common.edit') || '编辑'}>
                                  <IconButton
                                    size="small"
                                    color="primary"
                                    onClick={() => {
                                      if (!expense._id) {
                                        showNotification('费用申请ID无效', 'error');
                                        return;
                                      }
                                      navigate(`/expenses/${expense._id}/edit`);
                                    }}
                                    sx={{
                                      border: '1px solid',
                                      borderColor: 'primary.main',
                                      borderRadius: 1,
                                      '&:hover': {
                                        backgroundColor: 'primary.light',
                                        borderColor: 'primary.dark'
                                      }
                                    }}
                                  >
                                    <EditIcon fontSize="small" />
                                  </IconButton>
                                </Tooltip>
                              )}
                              {/* 删除按钮 - 仅草稿状态可删除 */}
                              {expense.status === 'draft' && (
                                <Tooltip title={t('common.delete') || '删除'}>
                                  <IconButton
                                    size="small"
                                    color="error"
                                    onClick={async () => {
                                      if (!expense._id) {
                                        showNotification('费用申请ID无效', 'error');
                                        return;
                                      }
                                      
                                      const expenseName = expense.expenseItem?.itemName || expense.title || '此费用申请';
                                      if (window.confirm(
                                        t('travel.detail.expenses.confirmDelete') || 
                                        `确定删除费用申请"${expenseName}"吗？此操作无法撤销。`
                                      )) {
                                        try {
                                          setExpensesLoading(true);
                                          const response = await apiClient.delete(`/expenses/${expense._id}`);
                                          
                                          if (response.data && response.data.success) {
                                            showNotification(
                                              t('travel.detail.expenses.deleteSuccess') || '删除成功',
                                              'success'
                                            );
                                            // 刷新费用列表和差旅详情
                                            await fetchTravelExpenses();
                                            await fetchTravelDetail();
                                          } else {
                                            throw new Error(response.data?.message || '删除失败');
                                          }
                                        } catch (error) {
                                          console.error('Failed to delete expense:', error);
                                          showNotification(
                                            error.response?.data?.message || 
                                            t('travel.detail.expenses.deleteError') || 
                                            '删除失败',
                                            'error'
                                          );
                                        } finally {
                                          setExpensesLoading(false);
                                        }
                                      }
                                    }}
                                    sx={{
                                      border: '1px solid',
                                      borderColor: 'error.main',
                                      borderRadius: 1,
                                      '&:hover': {
                                        backgroundColor: 'error.light',
                                        borderColor: 'error.dark'
                                      }
                                    }}
                                  >
                                    <DeleteIcon fontSize="small" />
                                  </IconButton>
                                </Tooltip>
                              )}
                            </Box>
                          </Grid>
                        </Grid>
                        {expense.autoMatched && (
                          <Box sx={{ mt: 1, pt: 1, borderTop: 1, borderColor: 'divider' }}>
                            <Chip
                              label={t('travel.detail.expenses.autoMatched') || '自动匹配'}
                              size="small"
                              color="info"
                              icon={<AutoAwesomeIcon />}
                            />
                          </Box>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </Box>
              ) : travel.expenseGenerationStatus === 'completed' ? (
                <Box sx={{ py: 4, textAlign: 'center', color: 'text.secondary' }}>
                  <ReceiptIcon sx={{ fontSize: 48, opacity: 0.3, mb: 1 }} />
                  <Typography variant="body2">
                    {t('travel.detail.expenses.noExpenses') || '暂无费用申请'}
                  </Typography>
                </Box>
              ) : (
                <Box sx={{ py: 4, textAlign: 'center', color: 'text.secondary' }}>
                  <ReceiptIcon sx={{ fontSize: 48, opacity: 0.3, mb: 1 }} />
                  <Typography variant="body2" sx={{ mb: 2 }}>
                    {t('travel.detail.expenses.notGenerated') || '尚未生成费用申请'}
                  </Typography>
                  <Button
                    variant="contained"
                    startIcon={<AutoAwesomeIcon />}
                    onClick={handleGenerateExpenses}
                    disabled={generatingExpenses}
                  >
                    {generatingExpenses 
                      ? (t('travel.detail.expenses.generating') || '生成中...')
                      : (t('travel.detail.expenses.generate') || '生成费用申请')
                    }
                  </Button>
                </Box>
              )}
            </Paper>
          )}
        </Grid>
      </Grid>

      {/* 审批对话框 */}
      <Dialog 
        open={approvalDialogOpen} 
        onClose={handleCloseApprovalDialog}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          {approvalAction === 'approve' 
            ? t('travel.detail.approveTitle') || '审批通过' 
            : t('travel.detail.rejectTitle') || '拒绝申请'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            <TextField
              fullWidth
              multiline
              rows={4}
              label={t('travel.detail.approvalComment') || '审批意见'}
              placeholder={
                approvalAction === 'approve'
                  ? (t('travel.detail.approveCommentPlaceholder') || '请输入审批意见...')
                  : (t('travel.detail.rejectCommentPlaceholder') || '请说明拒绝原因...')
              }
              value={approvalComment}
              onChange={(e) => setApprovalComment(e.target.value)}
              required
            />
      </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseApprovalDialog} disabled={submitting}>
            {t('common.cancel')}
          </Button>
          <Button
            onClick={handleSubmitApproval}
            variant="contained"
            color={approvalAction === 'approve' ? 'success' : 'error'}
            disabled={submitting || !approvalComment.trim()}
            startIcon={approvalAction === 'approve' ? <CheckCircleIcon /> : <CancelIcon />}
          >
            {submitting 
              ? (t('common.submitting') || '提交中...') 
              : (approvalAction === 'approve' 
                  ? (t('travel.detail.confirmApprove') || '确认通过') 
                  : (t('travel.detail.confirmReject') || '确认拒绝')
                )
            }
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default TravelDetail;
