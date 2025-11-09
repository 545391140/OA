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
  LocationOn as LocationIcon,
  FlightTakeoff as DepartureIcon,
  FlightLand as ReturnIcon
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
        const travelItems = travels.map(travel => {
          // 计算最早出发日期和最晚返回日期
          const dates = [];
          
          // 收集所有日期：去程、返程、多程
          if (travel.outbound?.date) {
            dates.push(new Date(travel.outbound.date));
          }
          if (travel.inbound?.date) {
            dates.push(new Date(travel.inbound.date));
          }
          if (travel.multiCityRoutes && Array.isArray(travel.multiCityRoutes)) {
            travel.multiCityRoutes.forEach(route => {
              if (route.date) {
                dates.push(new Date(route.date));
              }
            });
          }
          
          // 如果没有找到任何日期，尝试其他字段
          if (dates.length === 0) {
            if (travel.startDate) dates.push(new Date(travel.startDate));
            if (travel.endDate) dates.push(new Date(travel.endDate));
            if (travel.departureDate) dates.push(new Date(travel.departureDate));
            if (travel.returnDate) dates.push(new Date(travel.returnDate));
          }
          
          let earliestDate = null;
          let latestDate = null;
          let days = 0;
          
          if (dates.length > 0) {
            // 过滤掉无效日期
            const validDates = dates.filter(d => !isNaN(d.getTime()));
            if (validDates.length > 0) {
              earliestDate = new Date(Math.min(...validDates.map(d => d.getTime())));
              latestDate = new Date(Math.max(...validDates.map(d => d.getTime())));
              // 计算天数差（包含首尾两天）
              days = Math.ceil((latestDate.getTime() - earliestDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
            }
          }
          
          // 提取出发地名称
          const getLocationName = (location) => {
            if (!location) return null;
            if (typeof location === 'string') return location;
            if (location.name) return location.name;
            if (location.city) return location.city;
            return null;
          };
          
          // 提取出发地（优先从outbound.departure获取）
          const departureCity = getLocationName(travel.outbound?.departure) || 
                                getLocationName(travel.departureCity) || 
                                null;
          
          // 提取目的地（优先从outbound.destination获取，其次destination字段，最后inbound.destination）
          const destinationCity = getLocationName(travel.outbound?.destination) ||
                                  getLocationName(travel.destination) ||
                                  getLocationName(travel.inbound?.destination) ||
                                  null;
          
          return {
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
            destination: destinationCity,
            departureCity,
            earliestDate,
            latestDate,
            days,
            _raw: travel // 保存原始数据用于后续操作
          };
        });
        
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

  const ApprovalCard = ({ item, showActions = true }) => (
    <Card sx={{ mb: 1.5 }} elevation={2}>
      <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
        {/* 标题行：图标、标题、类型、状态标签 */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1.5 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flex: 1 }}>
            <Avatar sx={{ bgcolor: 'primary.main', width: 40, height: 40 }}>
              {getTypeIcon(item.type)}
            </Avatar>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 0.25, lineHeight: 1.3 }}>
                {item.title}
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                <Typography variant="caption" color="text.secondary">
                  {item.type === 'travel' ? t('approval.travelRequest') : t('approval.expenseReport')}
                </Typography>
                {item.travelNumber && (
                  <>
                    <Typography variant="caption" color="text.secondary">•</Typography>
                    <Typography variant="caption" color="text.secondary">{item.travelNumber}</Typography>
                  </>
                )}
                {/* 差旅申请副标题：出发地-目的地   出发日期-返回日期 共X天 */}
                {item.type === 'travel' && (item.departureCity || item.destination || (item.earliestDate && item.latestDate)) && (
                  <>
                    <Typography variant="caption" color="text.secondary">•</Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5 }}>
                      {item.departureCity || '?'}-{item.destination || '?'}
                      {(item.earliestDate && item.latestDate) && (
                        <>
                          <Typography component="span" variant="caption" color="text.secondary" sx={{ mx: 0.5 }}>  </Typography>
                          {dayjs(item.earliestDate).format('MMM DD')}-{dayjs(item.latestDate).format('MMM DD')}
                          {item.days > 0 && (
                            <>
                              <Typography component="span" variant="caption" color="text.secondary" sx={{ mx: 0.5 }}>
                                {t('approval.totalDays')}{item.days}{t('approval.days')}
                              </Typography>
                            </>
                          )}
                        </>
                      )}
                    </Typography>
                  </>
                )}
              </Box>
            </Box>
          </Box>
          <Box sx={{ display: 'flex', gap: 0.75, flexShrink: 0 }}>
            <Chip
              label={item.priority}
              color={getPriorityColor(item.priority)}
              size="small"
              sx={{ height: 22, fontSize: '0.7rem' }}
            />
            <Chip
              label={item.status}
              color={getStatusColor(item.status)}
              size="small"
              sx={{ height: 22, fontSize: '0.7rem' }}
            />
          </Box>
        </Box>

        {/* 主要信息：员工、金额、日期 */}
        <Grid container spacing={1.5} sx={{ mb: 1.5 }}>
          <Grid item xs={12} sm={6}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
              <PersonIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
              <Typography variant="body2" sx={{ fontSize: '0.8125rem', lineHeight: 1.5 }}>
                <strong>{t('approval.employee')}:</strong> {item.employee.firstName} {item.employee.lastName}
                {item.employee.department && (
                  <Typography component="span" variant="caption" color="text.secondary" sx={{ ml: 0.5 }}>
                    ({item.employee.department})
                  </Typography>
                )}
              </Typography>
            </Box>
          </Grid>
          <Grid item xs={12} sm={6}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
              <MoneyIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
              <Typography variant="body2" sx={{ fontSize: '0.8125rem', lineHeight: 1.5 }}>
                <strong>{t('approval.amount')}:</strong> {item.currency} {item.amount.toLocaleString()}
              </Typography>
            </Box>
          </Grid>
          <Grid item xs={12} sm={6}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
              <CalendarIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
              <Typography variant="body2" sx={{ fontSize: '0.8125rem', lineHeight: 1.5 }}>
                <strong>{t('approval.date')}:</strong> {dayjs(item.date).format('MMM DD, YYYY')}
              </Typography>
            </Box>
          </Grid>
        </Grid>


        {/* 审批信息（紧凑显示） */}
        {item.approver && (
          <Box sx={{ mb: 1.5, pt: 1, borderTop: '1px solid', borderColor: 'divider' }}>
            <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.75rem', lineHeight: 1.5, display: 'block', mb: 0.5 }}>
              <strong>{t('approval.approvedBy')}:</strong> {item.approver.firstName} {item.approver.lastName} ({item.approver.position}) • {dayjs(item.approvedAt).format('MMM DD, YYYY HH:mm')}
            </Typography>
            {item.comments && (
              <Typography variant="caption" sx={{ fontSize: '0.75rem', lineHeight: 1.5 }}>
                <strong>{t('approval.comments')}:</strong> {item.comments}
              </Typography>
            )}
          </Box>
        )}

        {/* 操作按钮 */}
        {showActions && item.status === 'submitted' && (
          <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end', pt: 1, borderTop: '1px solid', borderColor: 'divider' }}>
            <Button
              variant="outlined"
              color="error"
              startIcon={<RejectIcon />}
              onClick={() => handleApproval(item, 'reject')}
              size="small"
              sx={{ minWidth: 90 }}
            >
              {t('approval.reject')}
            </Button>
            <Button
              variant="contained"
              color="success"
              startIcon={<ApproveIcon />}
              onClick={() => handleApproval(item, 'approve')}
              size="small"
              sx={{ minWidth: 90 }}
            >
              {t('approval.approve')}
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

        <Paper sx={{ mt: 3 }} elevation={2}>
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
