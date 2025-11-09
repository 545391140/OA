import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container,
  Box,
  Typography,
  Paper,
  Grid,
  Card,
  CardContent,
  Chip,
  Button,
  Avatar,
  LinearProgress,
  Tabs,
  Tab,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Divider,
  Alert,
  useTheme,
  alpha
} from '@mui/material';
import {
  Approval as ApprovalIcon,
  Flight as TravelIcon,
  Receipt as ExpenseIcon,
  CheckCircle as ApproveIcon,
  Cancel as RejectIcon,
  Person as PersonIcon,
  CalendarToday as CalendarIcon,
  AttachMoney as MoneyIcon,
  Business as BusinessIcon,
  LocationOn as LocationIcon
} from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../contexts/AuthContext';
import { useNotification } from '../../contexts/NotificationContext';
import apiClient from '../../utils/axiosConfig';
import dayjs from 'dayjs';

const ApprovalList = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { showNotification } = useNotification();
  const navigate = useNavigate();
  const theme = useTheme();

  const [pendingApprovals, setPendingApprovals] = useState([]);
  const [approvalHistory, setApprovalHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tabValue, setTabValue] = useState(0);
  const [approvalDialogOpen, setApprovalDialogOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [approvalAction, setApprovalAction] = useState('');
  const [approvalComments, setApprovalComments] = useState('');

  useEffect(() => {
    fetchApprovals();
  }, []);

  const fetchApprovals = async () => {
    try {
      setLoading(true);
      
      // 获取待审批列表
      const response = await apiClient.get('/approvals');
      
      if (response.data && response.data.success) {
        const { travels = [], expenses = [] } = response.data.data;
        
        // 转换差旅申请数据格式
        const travelItems = travels.map(travel => ({
          id: travel._id,
          type: 'travel',
          title: travel.title || travel.travelNumber || t('approval.travelRequest'),
          employee: travel.employee || {},
          amount: travel.estimatedBudget || travel.estimatedCost || 0,
          currency: travel.currency || 'CNY',
          date: travel.startDate || travel.outbound?.date || travel.createdAt,
          status: travel.status,
          submittedAt: travel.createdAt,
          level: travel.approvals?.find(a => a.status === 'pending')?.level || 1,
          travelNumber: travel.travelNumber,
          destination: travel.destination,
          _raw: travel // 保存原始数据用于后续操作
        }));
        
        // 转换费用申请数据格式
        const expenseItems = expenses.map(expense => ({
          id: expense._id,
          type: 'expense',
          title: expense.title || expense.expenseNumber || t('approval.expenseReport'),
          employee: expense.employee || {},
          amount: expense.totalAmount || expense.amount || 0,
          currency: expense.currency || 'CNY',
          date: expense.expenseDate || expense.createdAt,
          status: expense.status,
          submittedAt: expense.createdAt,
          level: expense.approvals?.find(a => a.status === 'pending')?.level || 1,
          _raw: expense // 保存原始数据用于后续操作
        }));
        
        setPendingApprovals([...travelItems, ...expenseItems]);
        
        // TODO: 获取审批历史（可以从已审批的申请中获取）
        setApprovalHistory([]);
      }
    } catch (error) {
      console.error('Failed to fetch approvals:', error);
      showNotification(
        error.response?.data?.message || t('messages.error.failedToLoadApprovals') || '加载审批列表失败',
        'error'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  const handleApproval = (item, action) => {
    setSelectedItem(item);
    setApprovalAction(action);
    setApprovalComments('');
    setApprovalDialogOpen(true);
  };

  const handleApprovalSubmit = async () => {
    if (!approvalComments.trim()) {
      showNotification(t('approval.approvalCommentsRequired'), 'warning');
      return;
    }

    try {
      const itemId = selectedItem.id || selectedItem._id;
      const endpoint = selectedItem.type === 'travel' 
        ? `/approvals/travel/${itemId}`
        : `/approvals/expense/${itemId}`;
      
      await apiClient.put(endpoint, {
        status: approvalAction === 'approve' ? 'approved' : 'rejected',
        comments: approvalComments
      });

      // 更新本地状态
      setPendingApprovals(prev => prev.filter(item => {
        const itemIdToCheck = item.id || item._id;
        return itemIdToCheck !== itemId;
      }));
      
      const historyItem = {
        ...selectedItem,
        status: approvalAction === 'approve' ? 'approved' : 'rejected',
        approvedAt: new Date().toISOString(),
        approver: {
          firstName: user.firstName,
          lastName: user.lastName,
          position: user.position
        },
        comments: approvalComments
      };
      
      setApprovalHistory(prev => [historyItem, ...prev]);

      showNotification(
        approvalAction === 'approve' ? t('approval.approved') : t('approval.rejected'),
        'success'
      );

      setApprovalDialogOpen(false);
      setSelectedItem(null);
      setApprovalAction('');
      setApprovalComments('');
    } catch (error) {
      console.error('Approval error:', error);
      showNotification(
        error.response?.data?.message || t('messages.error.general'),
        'error'
      );
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      submitted: 'warning',
      approved: 'success',
      rejected: 'error',
      pending: 'info'
    };
    return colors[status] || 'default';
  };

  const getPriorityColor = (priority) => {
    const colors = {
      high: 'error',
      medium: 'warning',
      low: 'success'
    };
    return colors[priority] || 'default';
  };

  const getTypeIcon = (type) => {
    return type === 'travel' ? <TravelIcon /> : <ExpenseIcon />;
  };

  const ApprovalCard = ({ item, showActions = true }) => {
    const statusColor = getStatusColor(item.status);
    const statusColorValue = theme.palette[statusColor]?.main || theme.palette.grey[500];
    
    return (
      <Card 
        sx={{ 
          mb: 2.5,
          borderRadius: 2,
          boxShadow: `0 2px 8px ${alpha(statusColorValue, 0.15)}, 0 1px 3px ${alpha(statusColorValue, 0.1)}`,
          border: `1px solid ${alpha(statusColorValue, 0.2)}`,
          transition: 'all 0.3s ease',
          '&:hover': {
            boxShadow: `0 4px 16px ${alpha(statusColorValue, 0.25)}, 0 2px 6px ${alpha(statusColorValue, 0.15)}`,
            transform: 'translateY(-2px)',
            borderColor: alpha(statusColorValue, 0.4),
          },
          backgroundColor: alpha(statusColorValue, 0.02),
        }}
      >
        <CardContent sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Avatar 
              sx={{ 
                bgcolor: statusColorValue,
                width: 56,
                height: 56,
                boxShadow: `0 2px 8px ${alpha(statusColorValue, 0.3)}`,
              }}
            >
              {getTypeIcon(item.type)}
            </Avatar>
            <Box sx={{ flex: 1 }}>
              <Typography variant="h6" sx={{ fontWeight: 700, mb: 0.5 }}>
                {item.title}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500 }}>
                {item.type === 'travel' ? t('approval.travelRequest') : t('approval.expenseReport')}
              </Typography>
            </Box>
          </Box>
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            <Chip
              label={item.priority}
              color={getPriorityColor(item.priority)}
              size="small"
              sx={{ fontWeight: 600 }}
            />
            <Chip
              label={item.status}
              color={getStatusColor(item.status)}
              size="small"
              sx={{ 
                fontWeight: 600,
                boxShadow: `0 1px 4px ${alpha(statusColorValue, 0.3)}`,
              }}
            />
          </Box>
        </Box>

        <Grid container spacing={2} sx={{ mb: 2 }}>
          <Grid item xs={12} md={6}>
            <Box 
              sx={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: 1.5, 
                mb: 1.5,
                p: 1.5,
                borderRadius: 1,
                backgroundColor: alpha(theme.palette.primary.main, 0.04),
              }}
            >
              <PersonIcon sx={{ color: theme.palette.primary.main }} fontSize="small" />
              <Box>
                <Typography variant="caption" color="text.secondary" display="block">
                  {t('approval.employee')}
                </Typography>
                <Typography variant="body1" sx={{ fontWeight: 600 }}>
                  {item.employee.firstName} {item.employee.lastName}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {item.employee.department} • {item.employee.email}
                </Typography>
              </Box>
            </Box>
          </Grid>
          <Grid item xs={12} md={6}>
            <Box 
              sx={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: 1.5, 
                mb: 1.5,
                p: 1.5,
                borderRadius: 1,
                backgroundColor: alpha(theme.palette.info.main, 0.04),
              }}
            >
              <MoneyIcon sx={{ color: theme.palette.info.main }} fontSize="small" />
              <Box>
                <Typography variant="caption" color="text.secondary" display="block">
                  {t('approval.amount')}
                </Typography>
                <Typography variant="body1" sx={{ fontWeight: 600, color: theme.palette.info.main }}>
                  {item.currency} {item.amount.toLocaleString()}
                </Typography>
              </Box>
            </Box>
            <Box 
              sx={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: 1.5,
                p: 1.5,
                borderRadius: 1,
                backgroundColor: alpha(theme.palette.secondary.main, 0.04),
              }}
            >
              <CalendarIcon sx={{ color: theme.palette.secondary.main }} fontSize="small" />
              <Box>
                <Typography variant="caption" color="text.secondary" display="block">
                  {t('approval.date')}
                </Typography>
                <Typography variant="body1" sx={{ fontWeight: 600 }}>
                  {dayjs(item.date).format('MMM DD, YYYY')}
                </Typography>
              </Box>
            </Box>
          </Grid>
        </Grid>

        {item.approver && (
          <Box 
            sx={{ 
              mb: 2,
              p: 2,
              borderRadius: 1,
              backgroundColor: alpha(theme.palette.success.main, 0.05),
              border: `1px solid ${alpha(theme.palette.success.main, 0.2)}`,
            }}
          >
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              <strong>{t('approval.approvedBy')}:</strong> {item.approver.firstName} {item.approver.lastName} ({item.approver.position})
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: item.comments ? 1 : 0 }}>
              <strong>{t('approval.approvedOn')}:</strong> {dayjs(item.approvedAt).format('MMM DD, YYYY HH:mm')}
            </Typography>
            {item.comments && (
              <Box sx={{ mt: 1.5, pt: 1.5, borderTop: `1px solid ${alpha(theme.palette.divider, 0.5)}` }}>
                <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 0.5 }}>
                  {t('approval.comments')}
                </Typography>
                <Typography variant="body2" sx={{ fontWeight: 500 }}>
                  {item.comments}
                </Typography>
              </Box>
            )}
          </Box>
        )}

        {showActions && item.status === 'submitted' && (
          <Box sx={{ 
            display: 'flex', 
            gap: 2, 
            justifyContent: 'flex-end',
            pt: 2,
            borderTop: `1px solid ${alpha(theme.palette.divider, 0.5)}`,
            mt: 2
          }}>
            <Button
              variant="outlined"
              color="error"
              startIcon={<RejectIcon />}
              onClick={() => handleApproval(item, 'reject')}
              sx={{
                minWidth: 120,
                fontWeight: 600,
                '&:hover': {
                  backgroundColor: alpha(theme.palette.error.main, 0.1),
                  borderWidth: 2,
                }
              }}
            >
              {t('approval.reject')}
            </Button>
            <Button
              variant="contained"
              color="success"
              startIcon={<ApproveIcon />}
              onClick={() => handleApproval(item, 'approve')}
              sx={{
                minWidth: 120,
                fontWeight: 600,
                boxShadow: `0 2px 8px ${alpha(theme.palette.success.main, 0.3)}`,
                '&:hover': {
                  boxShadow: `0 4px 12px ${alpha(theme.palette.success.main, 0.4)}`,
                  transform: 'translateY(-1px)',
                }
              }}
            >
              {t('approval.approve')}
            </Button>
          </Box>
        )}
      </CardContent>
    </Card>
    );
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

  return (
    <Container maxWidth="xl">
      <Box sx={{ py: 3 }}>
        <Typography variant="h4" gutterBottom>
          {t('approval.title')}
        </Typography>

        <Paper sx={{ mt: 3 }}>
          <Tabs
            value={tabValue}
            onChange={handleTabChange}
            indicatorColor="primary"
            textColor="primary"
          >
            <Tab
              label={`${t('approval.pendingApprovals')} (${pendingApprovals.length})`}
              icon={<ApprovalIcon />}
              iconPosition="start"
            />
            <Tab
              label={`${t('approval.approvalHistory')} (${approvalHistory.length})`}
              icon={<ApprovalIcon />}
              iconPosition="start"
            />
          </Tabs>

          <Box sx={{ p: 3 }}>
            {tabValue === 0 && (
              <Box>
                <Typography variant="h6" gutterBottom>
                  {t('approval.pendingApprovals')}
                </Typography>
                {pendingApprovals.length === 0 ? (
                  <Alert severity="info">
                    {t('approval.noPendingApprovals')}
                  </Alert>
                ) : (
                  pendingApprovals.map((item) => (
                    <ApprovalCard key={item.id} item={item} showActions={true} />
                  ))
                )}
              </Box>
            )}

            {tabValue === 1 && (
              <Box>
                <Typography variant="h6" gutterBottom>
                  {t('approval.approvalHistory')}
                </Typography>
                {approvalHistory.length === 0 ? (
                  <Alert severity="info">
                    {t('approval.noApprovalHistory')}
                  </Alert>
                ) : (
                  approvalHistory.map((item) => (
                    <ApprovalCard key={item.id} item={item} showActions={false} />
                  ))
                )}
              </Box>
            )}
          </Box>
        </Paper>

        {/* Approval Dialog */}
        <Dialog
          open={approvalDialogOpen}
          onClose={() => setApprovalDialogOpen(false)}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle>
            {approvalAction === 'approve' ? t('approval.approveRequest') : t('approval.rejectRequest')}
          </DialogTitle>
          <DialogContent>
            {selectedItem && (
              <Box sx={{ mb: 2 }}>
                <Typography variant="h6" gutterBottom>
                  {selectedItem.title}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {t('approval.employee')}: {selectedItem.employee.firstName} {selectedItem.employee.lastName}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {t('approval.amount')}: {selectedItem.currency} {selectedItem.amount.toLocaleString()}
                </Typography>
              </Box>
            )}
            
            <TextField
              fullWidth
              multiline
              rows={4}
              label={t('approval.approvalComments')}
              value={approvalComments}
              onChange={(e) => setApprovalComments(e.target.value)}
              placeholder={t('approval.approvalCommentsPlaceholder')}
              sx={{ mt: 2 }}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setApprovalDialogOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button
              onClick={handleApprovalSubmit}
              variant="contained"
              color={approvalAction === 'approve' ? 'success' : 'error'}
            >
              {approvalAction === 'approve' ? t('approval.approve') : t('approval.reject')}
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </Container>
  );
};

export default ApprovalList;
