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
  Alert
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
          title: travel.title || travel.travelNumber || '差旅申请',
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
          title: expense.title || expense.expenseNumber || '费用申请',
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
      showNotification('请输入审批意见', 'warning');
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
        approvalAction === 'approve' ? '审批通过' : '已拒绝',
        'success'
      );

      setApprovalDialogOpen(false);
      setSelectedItem(null);
      setApprovalAction('');
      setApprovalComments('');
    } catch (error) {
      console.error('Approval error:', error);
      showNotification(
        error.response?.data?.message || '审批失败',
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

  const ApprovalCard = ({ item, showActions = true }) => (
    <Card sx={{ mb: 2 }}>
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Avatar sx={{ bgcolor: 'primary.main' }}>
              {getTypeIcon(item.type)}
            </Avatar>
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                {item.title}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {item.type === 'travel' ? 'Travel Request' : 'Expense Report'}
              </Typography>
            </Box>
          </Box>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Chip
              label={item.priority}
              color={getPriorityColor(item.priority)}
              size="small"
            />
            <Chip
              label={item.status}
              color={getStatusColor(item.status)}
              size="small"
            />
          </Box>
        </Box>

        <Grid container spacing={2} sx={{ mb: 2 }}>
          <Grid item xs={12} md={6}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
              <PersonIcon color="action" fontSize="small" />
              <Typography variant="body2">
                <strong>Employee:</strong> {item.employee.firstName} {item.employee.lastName}
              </Typography>
            </Box>
            <Typography variant="body2" color="text.secondary" sx={{ ml: 4 }}>
              {item.employee.department} • {item.employee.email}
            </Typography>
          </Grid>
          <Grid item xs={12} md={6}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
              <MoneyIcon color="action" fontSize="small" />
              <Typography variant="body2">
                <strong>Amount:</strong> {item.currency} {item.amount.toLocaleString()}
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <CalendarIcon color="action" fontSize="small" />
              <Typography variant="body2">
                <strong>Date:</strong> {dayjs(item.date).format('MMM DD, YYYY')}
              </Typography>
            </Box>
          </Grid>
        </Grid>

        {item.approver && (
          <Box sx={{ mb: 2 }}>
            <Typography variant="body2" color="text.secondary">
              <strong>Approved by:</strong> {item.approver.firstName} {item.approver.lastName} ({item.approver.position})
            </Typography>
            <Typography variant="body2" color="text.secondary">
              <strong>Approved on:</strong> {dayjs(item.approvedAt).format('MMM DD, YYYY HH:mm')}
            </Typography>
            {item.comments && (
              <Typography variant="body2" sx={{ mt: 1 }}>
                <strong>Comments:</strong> {item.comments}
              </Typography>
            )}
          </Box>
        )}

        {showActions && item.status === 'submitted' && (
          <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
            <Button
              variant="outlined"
              color="error"
              startIcon={<RejectIcon />}
              onClick={() => handleApproval(item, 'reject')}
            >
              Reject
            </Button>
            <Button
              variant="contained"
              color="success"
              startIcon={<ApproveIcon />}
              onClick={() => handleApproval(item, 'approve')}
            >
              Approve
            </Button>
          </Box>
        )}
      </CardContent>
    </Card>
  );

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
              label={`Pending Approvals (${pendingApprovals.length})`}
              icon={<ApprovalIcon />}
              iconPosition="start"
            />
            <Tab
              label={`Approval History (${approvalHistory.length})`}
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
                    No pending approvals at this time.
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
                    No approval history available.
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
            {approvalAction === 'approve' ? 'Approve Request' : 'Reject Request'}
          </DialogTitle>
          <DialogContent>
            {selectedItem && (
              <Box sx={{ mb: 2 }}>
                <Typography variant="h6" gutterBottom>
                  {selectedItem.title}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Employee: {selectedItem.employee.firstName} {selectedItem.employee.lastName}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Amount: {selectedItem.currency} {selectedItem.amount.toLocaleString()}
                </Typography>
              </Box>
            )}
            
            <TextField
              fullWidth
              multiline
              rows={4}
              label={t('approval.comments')}
              value={approvalComments}
              onChange={(e) => setApprovalComments(e.target.value)}
              placeholder={approvalAction === 'approve' 
                ? 'Add any comments about this approval...' 
                : 'Please explain why this request is being rejected...'
              }
              sx={{ mt: 2 }}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setApprovalDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleApprovalSubmit}
              variant="contained"
              color={approvalAction === 'approve' ? 'success' : 'error'}
            >
              {approvalAction === 'approve' ? 'Approve' : 'Reject'}
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </Container>
  );
};

export default ApprovalList;
