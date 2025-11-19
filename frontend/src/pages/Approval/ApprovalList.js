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
  InputAdornment
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
  FlightLand as ReturnIcon,
  Search as SearchIcon,
  Refresh as RefreshIcon
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
  const [travelStats, setTravelStats] = useState({}); // 存储员工差旅统计
  const [approvalDialogOpen, setApprovalDialogOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [approvalAction, setApprovalAction] = useState('');
  const [approvalComments, setApprovalComments] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('all'); // all, travel, expense
  const [statusFilter, setStatusFilter] = useState('all'); // all, submitted, approved, rejected

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
        
        // 获取差旅申请的员工统计数据
        const employeeIds = [...new Set(travelItems
          .map(item => {
            const emp = item.employee;
            if (!emp) return null;
            // 处理不同的employee对象格式
            if (typeof emp === 'string') return emp;
            if (emp._id) return String(emp._id);
            if (emp.id) return String(emp.id);
            return null;
          })
          .filter(id => id !== null)
        )];
        
        console.log('Employee IDs to fetch stats:', employeeIds);
        
        const statsPromises = employeeIds.map(async (employeeId) => {
          try {
            const statsResponse = await apiClient.get(`/approvals/travel-statistics/${employeeId}`);
            console.log(`Stats response for ${employeeId}:`, statsResponse.data);
            if (statsResponse.data && statsResponse.data.success) {
              return { employeeId, stats: statsResponse.data.data };
            }
          } catch (error) {
            console.error(`Failed to fetch stats for employee ${employeeId}:`, error);
            console.error('Error details:', error.response?.data);
          }
          return null;
        });
        
        const statsResults = await Promise.all(statsPromises);
        const statsMap = {};
        statsResults.forEach(result => {
          if (result) {
            statsMap[result.employeeId] = result.stats;
          }
        });
        console.log('Final stats map:', statsMap);
        setTravelStats(statsMap);
        
        // 获取审批历史
        try {
          const historyResponse = await apiClient.get('/approvals/history', {
            params: { limit: 100 } // 获取最近100条审批历史
          });
          
          console.log('=== Approval History Response ===');
          console.log('Response:', historyResponse.data);
          
          if (historyResponse.data && historyResponse.data.success) {
            const { travels = [], expenses = [] } = historyResponse.data.data;
            
            console.log('Travels count:', travels.length);
            console.log('Expenses count:', expenses.length);
            console.log('Current user ID:', user.id);
            
            // 转换差旅申请历史数据格式
            const historyTravelItems = travels.map(travel => {
              // 找到当前用户审批的记录
              // 注意：使用lean()后，_id是字符串，approver可能是ObjectId或字符串
              const userApproval = travel.approvals?.find(
                a => {
                  const approverId = a.approver?._id || a.approver;
                  const approverIdStr = approverId ? String(approverId) : null;
                  const userIdStr = String(user.id);
                  const matches = approverIdStr === userIdStr && 
                                 (a.status === 'approved' || a.status === 'rejected');
                  if (matches) {
                    console.log('Found matching approval:', {
                      travelId: travel._id,
                      approverId: approverIdStr,
                      userId: userIdStr,
                      status: a.status
                    });
                  }
                  return matches;
                }
              );
              
              if (!userApproval) return null;
              
              // 计算日期信息
              const dates = [];
              if (travel.outbound?.date) dates.push(new Date(travel.outbound.date));
              if (travel.inbound?.date) dates.push(new Date(travel.inbound.date));
              if (travel.multiCityRoutes && Array.isArray(travel.multiCityRoutes)) {
                travel.multiCityRoutes.forEach(route => {
                  if (route.date) dates.push(new Date(route.date));
                });
              }
              
              let earliestDate = null;
              let latestDate = null;
              let days = 0;
              
              if (dates.length > 0) {
                const validDates = dates.filter(d => !isNaN(d.getTime()));
                if (validDates.length > 0) {
                  earliestDate = new Date(Math.min(...validDates.map(d => d.getTime())));
                  latestDate = new Date(Math.max(...validDates.map(d => d.getTime())));
                  days = Math.ceil((latestDate.getTime() - earliestDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
                }
              }
              
              // 提取出发地和目的地
              const getLocationName = (location) => {
                if (!location) return null;
                if (typeof location === 'string') return location;
                if (location.name) return location.name;
                if (location.city) return location.city;
                return null;
              };
              
              const departureCity = getLocationName(travel.outbound?.departure) || null;
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
                status: userApproval.status === 'approved' ? 'approved' : 'rejected',
                submittedAt: travel.createdAt,
                approvedAt: userApproval.approvedAt || userApproval.createdAt,
                approver: userApproval.approver || {},
                comments: userApproval.comments || '',
                travelNumber: travel.travelNumber,
                destination: destinationCity,
                departureCity,
                earliestDate,
                latestDate,
                days,
                _raw: travel
              };
            }).filter(item => item !== null);
            
            // 转换费用申请历史数据格式
            const historyExpenseItems = expenses.map(expense => {
              // 找到当前用户审批的记录
              const userApproval = expense.approvals?.find(
                a => {
                  const approverId = a.approver?._id || a.approver;
                  const approverIdStr = approverId ? String(approverId) : null;
                  const userIdStr = String(user.id);
                  return approverIdStr === userIdStr && 
                         (a.status === 'approved' || a.status === 'rejected');
                }
              );
              
              if (!userApproval) return null;
              
              return {
                id: expense._id,
                type: 'expense',
                title: expense.title || expense.expenseNumber || t('approval.expenseReport'),
                employee: expense.employee || {},
                amount: expense.totalAmount || expense.amount || 0,
                currency: expense.currency || 'CNY',
                date: expense.expenseDate || expense.createdAt,
                status: userApproval.status === 'approved' ? 'approved' : 'rejected',
                submittedAt: expense.createdAt,
                approvedAt: userApproval.approvedAt || userApproval.createdAt,
                approver: userApproval.approver || {},
                comments: userApproval.comments || '',
                _raw: expense
              };
            }).filter(item => item !== null);
            
            const allHistoryItems = [...historyTravelItems, ...historyExpenseItems];
            console.log('Total history items:', allHistoryItems.length);
            console.log('Travel history items:', historyTravelItems.length);
            console.log('Expense history items:', historyExpenseItems.length);
            setApprovalHistory(allHistoryItems);
          } else {
            console.warn('History API response not successful:', historyResponse.data);
            setApprovalHistory([]);
          }
        } catch (historyError) {
          console.error('Failed to fetch approval history:', historyError);
          console.error('Error details:', historyError.response?.data);
          // 不显示错误通知，因为审批历史不是必需的
          setApprovalHistory([]);
        }
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

  const handleSearch = () => {
    // 实时搜索已经在 filterItems 中处理，此函数保留以保持与其他页面的一致性
    // 可以在这里添加额外的搜索逻辑，如记录搜索历史等
  };

  const handleReset = () => {
    setSearchTerm('');
    setTypeFilter('all');
    setStatusFilter('all');
    fetchApprovals(); // 重新加载数据
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

  // 搜索和过滤逻辑
  const filterItems = (items) => {
    return items.filter(item => {
      // 类型过滤
      if (typeFilter !== 'all' && item.type !== typeFilter) {
        return false;
      }

      // 状态过滤（仅对审批历史有效）
      if (tabValue === 1 && statusFilter !== 'all' && item.status !== statusFilter) {
        return false;
      }

      // 搜索过滤
      if (searchTerm.trim()) {
        const search = searchTerm.toLowerCase();
        const matchSearch = 
          item.title?.toLowerCase().includes(search) ||
          item.employee?.firstName?.toLowerCase().includes(search) ||
          item.employee?.lastName?.toLowerCase().includes(search) ||
          item.employee?.department?.toLowerCase().includes(search) ||
          item.travelNumber?.toLowerCase().includes(search) ||
          item.destination?.toLowerCase().includes(search) ||
          item.departureCity?.toLowerCase().includes(search) ||
          item.amount?.toString().includes(search) ||
          item.currency?.toLowerCase().includes(search);
        
        if (!matchSearch) return false;
      }

      return true;
    });
  };

  const filteredPendingApprovals = filterItems(pendingApprovals);
  const filteredApprovalHistory = filterItems(approvalHistory);

  const ApprovalCard = ({ item, showActions = true }) => {
    // 获取员工差旅统计
    const emp = item.employee;
    let employeeId = null;
    if (emp) {
      if (typeof emp === 'string') {
        employeeId = emp;
      } else if (emp._id) {
        employeeId = String(emp._id);
      } else if (emp.id) {
        employeeId = String(emp.id);
      }
    }
    const stats = employeeId ? travelStats[employeeId] || null : null;
    
    // 调试日志
    if (item.type === 'travel') {
      console.log('Card item:', {
        title: item.title,
        employeeId,
        employee: emp,
        stats,
        travelStatsKeys: Object.keys(travelStats)
      });
    }
    
    return (
    <Card sx={{ mb: 1 }} elevation={1}>
      <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
        {/* 标题行：图标、标题、状态标签、操作按钮 */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flex: 1, minWidth: 0 }}>
            <Avatar sx={{ bgcolor: 'primary.main', width: 32, height: 32, flexShrink: 0 }}>
              {getTypeIcon(item.type)}
            </Avatar>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 600, lineHeight: 1.2, mb: 0.25 }}>
                {item.title}
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, flexWrap: 'wrap' }}>
                <Chip
                  label={item.type === 'travel' ? t('approval.travelRequest') : t('approval.expenseReport')}
                  color={item.type === 'travel' ? 'primary' : 'secondary'}
                  size="small"
                  sx={{ 
                    height: 20, 
                    fontWeight: 600,
                    px: 0.75,
                    '& .MuiChip-label': {
                      px: 0.75,
                      lineHeight: 1.2
                    }
                  }}
                />
                {/* 差旅申请副标题：出发地-目的地   出发日期-返回日期 共X天 */}
                {item.type === 'travel' && (item.departureCity || item.destination || (item.earliestDate && item.latestDate)) && (
                  <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1.3 }}>
                    {item.departureCity || '?'}-{item.destination || '?'}
                    {(item.earliestDate && item.latestDate) && (
                      <> • {dayjs(item.earliestDate).format('MMM DD')}-{dayjs(item.latestDate).format('MMM DD')}
                      {item.days > 0 && <> • {t('approval.totalDays')}{item.days}{t('approval.days')}</>}
                      </>
                    )}
                  </Typography>
                )}
              </Box>
            </Box>
          </Box>
          <Box sx={{ display: 'flex', gap: 0.5, flexShrink: 0, alignItems: 'center' }}>
            <Chip
              label={item.status}
              color={getStatusColor(item.status)}
              size="small"
              sx={{ 
                height: 20, 
                fontWeight: 600,
                px: 0.75,
                '& .MuiChip-label': {
                  px: 0.75,
                  lineHeight: 1.2
                }
              }}
            />
          </Box>
        </Box>

        {/* 主要信息：员工、金额、日期 */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap', mb: item.type === 'travel' && stats ? 1 : 0.5 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <PersonIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
            <Typography variant="body2" sx={{ lineHeight: 1.3 }}>
              {item.employee.firstName} {item.employee.lastName}
              {item.employee.department && (
                <Typography component="span" variant="body2" color="text.secondary" sx={{ ml: 0.5 }}>
                  ({item.employee.department})
                </Typography>
              )}
            </Typography>
          </Box>
          <Typography component="span" variant="body2" color="text.secondary">
            •
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <CalendarIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
            <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.3 }}>
              {dayjs(item.date).format('MMM DD, YYYY')}
            </Typography>
          </Box>
          <Typography component="span" variant="body2" color="text.secondary">
            •
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <MoneyIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
            <Typography variant="body2" sx={{ lineHeight: 1.3, fontWeight: 500 }}>
              {item.currency} {item.amount.toLocaleString()}
            </Typography>
          </Box>
        </Box>

        {/* 差旅统计信息（仅差旅申请显示） */}
        {item.type === 'travel' && stats && (
          <Box sx={{ 
            mb: 0.5, 
            p: 1, 
            bgcolor: 'grey.50', 
            borderRadius: 0.75, 
            border: '1px solid', 
            borderColor: 'grey.300'
          }}>
            <Typography variant="caption" sx={{ fontWeight: 600, color: 'text.primary', mb: 0.75, display: 'block' }}>
              {t('approval.employeeTravelStats')} ({stats.year})
            </Typography>
            <Grid container spacing={1}>
              <Grid item xs={6} sm={3}>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.25 }}>
                  {t('approval.totalTrips')}
                </Typography>
                <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.primary', lineHeight: 1.3 }}>
                  {stats.totalTrips}
                </Typography>
              </Grid>
              <Grid item xs={6} sm={3}>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.25 }}>
                  {t('approval.totalAmount')}
                </Typography>
                <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.primary', lineHeight: 1.3 }}>
                  {item.currency} {stats.totalAmount.toLocaleString()}
                </Typography>
              </Grid>
              <Grid item xs={6} sm={3}>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.25 }}>
                  {t('approval.totalDays')}
                </Typography>
                <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.primary', lineHeight: 1.3 }}>
                  {stats.totalDays} {t('approval.days')}
                </Typography>
              </Grid>
              <Grid item xs={6} sm={3}>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.25 }}>
                  {t('approval.efficiency')}
                </Typography>
                <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.primary', lineHeight: 1.3 }}>
                  {item.currency} {stats.efficiency}/{t('approval.day')}
                </Typography>
              </Grid>
              {stats.budgetUsage !== null && (
                <Grid item xs={12}>
                  <Box sx={{ mt: 0.75 }}>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
                      {t('approval.budgetUsage')}
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                      <Box sx={{ flex: 1, height: 6, bgcolor: 'grey.200', borderRadius: 0.5, overflow: 'hidden' }}>
                        <Box 
                          sx={{ 
                            height: '100%', 
                            bgcolor: stats.budgetUsage > 80 ? 'error.main' : stats.budgetUsage > 60 ? 'warning.main' : 'success.main',
                            width: `${Math.min(stats.budgetUsage, 100)}%`,
                            transition: 'width 0.3s ease'
                          }} 
                        />
                      </Box>
                      <Typography variant="body2" sx={{ fontWeight: 600, minWidth: 40, color: 'text.primary' }}>
                        {stats.budgetUsage}%
                      </Typography>
                    </Box>
                  </Box>
                </Grid>
              )}
            </Grid>
          </Box>
        )}


        {/* 审批信息（紧凑显示） */}
        {item.approver && (
          <Box sx={{ mt: 0.5, mb: 0.5 }}>
            <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.3, display: 'block' }}>
              {t('approval.approvedBy')}: {item.approver.firstName} {item.approver.lastName} ({item.approver.position}) • {dayjs(item.approvedAt).format('MMM DD, YYYY HH:mm')}
            </Typography>
            {item.comments && (
              <Typography variant="body2" sx={{ lineHeight: 1.3, color: 'text.secondary' }}>
                {t('approval.comments')}: {item.comments}
              </Typography>
            )}
          </Box>
        )}

        {/* 操作按钮：拒绝、通过、查看详情 */}
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1, pt: 0.5, alignItems: 'center' }}>
          {showActions && item.status === 'submitted' && (
            <>
              <Button
                variant="outlined"
                color="error"
                onClick={() => handleApproval(item, 'reject')}
                size="small"
                sx={{ 
                  minWidth: 'auto',
                  px: 1,
                  py: 0.5,
                  textTransform: 'none',
                  lineHeight: 1.3
                }}
              >
                {t('approval.reject')}
              </Button>
              <Button
                variant="outlined"
                color="success"
                onClick={() => handleApproval(item, 'approve')}
                size="small"
                sx={{ 
                  minWidth: 'auto',
                  px: 1,
                  py: 0.5,
                  textTransform: 'none',
                  fontWeight: 600,
                  lineHeight: 1.3
                }}
              >
                {t('approval.approve')}
              </Button>
            </>
          )}
          <Button
            variant="outlined"
            size="small"
            onClick={() => navigate(`/approvals/${item.type}/${item.id}`)}
            sx={{ 
              minWidth: 'auto',
              px: 1,
              py: 0.5,
              textTransform: 'none',
              lineHeight: 1.3
            }}
          >
            {t('approval.viewDetail') || 'Detail'}
          </Button>
        </Box>
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

        {/* 搜索和过滤栏 */}
        <Paper sx={{ p: 2, mb: 3 }}>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                placeholder={t('approval.searchPlaceholder') || '搜索标题、员工、部门、金额...'}
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
                <InputLabel>{t('approval.type') || '类型'}</InputLabel>
                <Select
                  value={typeFilter}
                  label={t('approval.type') || '类型'}
                  onChange={(e) => setTypeFilter(e.target.value)}
                >
                  <MenuItem value="all">{t('common.all') || '全部'}</MenuItem>
                  <MenuItem value="travel">{t('approval.travelRequest') || '差旅申请'}</MenuItem>
                  <MenuItem value="expense">{t('approval.expenseReport') || '费用报告'}</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            {tabValue === 1 && (
              <Grid item xs={12} md={3}>
                <FormControl fullWidth>
                  <InputLabel>{t('approval.status') || '状态'}</InputLabel>
                  <Select
                    value={statusFilter}
                    label={t('approval.status') || '状态'}
                    onChange={(e) => setStatusFilter(e.target.value)}
                  >
                    <MenuItem value="all">{t('common.all') || '全部'}</MenuItem>
                    <MenuItem value="approved">{t('approval.approved') || '已通过'}</MenuItem>
                    <MenuItem value="rejected">{t('approval.rejected') || '已拒绝'}</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
            )}
            <Grid item xs={12} md={2}>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Button
                  variant="outlined"
                  startIcon={<SearchIcon />}
                  onClick={handleSearch}
                  sx={{ flex: 1 }}
                >
                  {t('common.search')}
                </Button>
                <Button
                  variant="outlined"
                  startIcon={<RefreshIcon />}
                  onClick={handleReset}
                  sx={{ flex: 1 }}
                >
                  {t('common.refresh')}
                </Button>
              </Box>
            </Grid>
          </Grid>
        </Paper>

        <Paper elevation={2}>
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
                  {filteredPendingApprovals.length !== pendingApprovals.length && (
                    <Typography component="span" variant="body2" color="text.secondary" sx={{ ml: 1 }}>
                      ({filteredPendingApprovals.length} / {pendingApprovals.length})
                    </Typography>
                  )}
                </Typography>
                {pendingApprovals.length === 0 ? (
                  <Alert severity="info">
                    {t('approval.noPendingApprovals')}
                  </Alert>
                ) : filteredPendingApprovals.length === 0 ? (
                  <Alert severity="info">
                    {t('approval.noSearchResults') || '没有找到匹配的审批项'}
                  </Alert>
                ) : (
                  filteredPendingApprovals.map((item) => (
                    <ApprovalCard key={item.id} item={item} showActions={true} />
                  ))
                )}
              </Box>
            )}

            {tabValue === 1 && (
              <Box>
                <Typography variant="h6" gutterBottom>
                  {t('approval.approvalHistory')}
                  {filteredApprovalHistory.length !== approvalHistory.length && (
                    <Typography component="span" variant="body2" color="text.secondary" sx={{ ml: 1 }}>
                      ({filteredApprovalHistory.length} / {approvalHistory.length})
                    </Typography>
                  )}
                </Typography>
                {approvalHistory.length === 0 ? (
                  <Alert severity="info">
                    {t('approval.noApprovalHistory')}
                  </Alert>
                ) : filteredApprovalHistory.length === 0 ? (
                  <Alert severity="info">
                    {t('approval.noSearchResults') || '没有找到匹配的审批项'}
                  </Alert>
                ) : (
                  filteredApprovalHistory.map((item) => (
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
