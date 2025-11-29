import React, { useState, useEffect, useCallback, Suspense, lazy } from 'react';
import {
  Grid,
  Paper,
  Typography,
  Box,
  Card,
  CardContent,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Chip,
  Button,
  Avatar,
  LinearProgress,
  Alert,
  Skeleton,
  IconButton,
  Tooltip
} from '@mui/material';
import {
  Flight as TravelIcon,
  Receipt as ExpenseIcon,
  Approval as ApprovalIcon,
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  AttachMoney as MoneyIcon,
  Schedule as ScheduleIcon,
  Refresh as RefreshIcon,
  ErrorOutline as ErrorIcon,
  Public as PublicIcon
} from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useNotification } from '../../contexts/NotificationContext';
import apiClient from '../../utils/axiosConfig';
import dayjs from 'dayjs';

// 懒加载图表组件
const MonthlySpendingChart = lazy(() => import('./MonthlySpendingChart'));
const CategoryBreakdownChart = lazy(() => import('./CategoryBreakdownChart'));
const CountryTravelChart = lazy(() => import('./CountryTravelChart'));

const Dashboard = () => {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const { showNotification } = useNotification();
  const navigate = useNavigate();
  
  const [dashboardData, setDashboardData] = useState({
    stats: {
      totalTravelRequests: 0,
      pendingApprovals: 0,
      monthlySpending: 0,
      approvedRequests: 0,
      spendingTrend: 0,
      totalExpenses: 0,
      countryCount: 0
    },
    recentTravels: [],
    recentExpenses: [],
    monthlySpending: [],
    categoryBreakdown: [],
    pendingTasks: [],
    countryTravelData: []
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchDashboardData = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);

      // 使用单个API获取所有Dashboard数据
      const response = await apiClient.get('/dashboard');

      if (response.data && response.data.success) {
        const data = response.data.data;
        setDashboardData({
          stats: data.stats || {},
          recentTravels: data.recentTravels || [],
          recentExpenses: data.recentExpenses || [],
          monthlySpending: data.monthlySpending || [],
          categoryBreakdown: data.categoryBreakdown || [],
          pendingTasks: data.pendingTasks || [],
          countryTravelData: data.countryTravelData || []
        });
      }
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
      console.error('Error details:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
        url: error.config?.url
      });
      setError(error.response?.data?.message || error.message || t('dashboard.loadError'));
      showNotification(t('dashboard.loadError'), 'error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [showNotification, t]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  const handleRefresh = useCallback(() => {
    fetchDashboardData(true);
  }, [fetchDashboardData]);

  // 使用 useCallback 优化函数，避免不必要的重渲染
  const getStatusColor = useCallback((status) => {
    const colors = {
      draft: 'default',
      submitted: 'warning',
      pending: 'warning',
      approved: 'success',
      rejected: 'error',
      'in-progress': 'info',
      completed: 'success',
      cancelled: 'error'
    };
    return colors[status] || 'default';
  }, []);

  const formatCurrency = useCallback((amount) => {
    const numAmount = parseFloat(amount || 0);
    // 根据当前语言使用不同的货币符号和格式
    const locale = i18n.language || 'zh';
    if (locale.startsWith('zh')) {
      return `¥${numAmount.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    } else if (locale === 'ja') {
      return `¥${numAmount.toLocaleString('ja-JP', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    } else if (locale === 'ko') {
      return `₩${numAmount.toLocaleString('ko-KR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    } else {
      return `$${numAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }
  }, [i18n.language]);

  const formatDate = useCallback((dateString) => {
    if (!dateString) return t('common.nA') || '-';
    const locale = i18n.language || 'zh';
    return dayjs(dateString).format(t('common.dateFormat') || 'YYYY-MM-DD');
  }, [i18n.language, t]);

  // 使用 React.memo 优化 StatCard 组件，避免不必要的重渲染
  const StatCard = React.memo(({ title, value, icon, trend, trendValue, loading }) => (
    <Card sx={{ height: '100%' }}>
      <CardContent>
        {loading ? (
          <Box>
            <Skeleton variant="text" width="60%" height={30} />
            <Skeleton variant="text" width="40%" height={50} sx={{ mt: 1 }} />
            <Skeleton variant="text" width="30%" height={20} sx={{ mt: 1 }} />
          </Box>
        ) : (
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box>
            <Typography color="text.secondary" gutterBottom variant="h6">
              {title}
            </Typography>
            <Typography variant="h4" component="div">
              {value}
            </Typography>
              {trend !== undefined && trendValue !== undefined && (
              <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
                  {parseFloat(trendValue) >= 0 ? (
                  <TrendingUpIcon color="success" sx={{ fontSize: 16, mr: 0.5 }} />
                ) : (
                  <TrendingDownIcon color="error" sx={{ fontSize: 16, mr: 0.5 }} />
                )}
                  <Typography 
                    variant="body2" 
                    color={parseFloat(trendValue) >= 0 ? 'success.main' : 'error.main'}
                  >
                    {Math.abs(parseFloat(trendValue))}% {t('dashboard.vsLastMonth')}
                </Typography>
              </Box>
            )}
          </Box>
          <Avatar sx={{ bgcolor: 'primary.main', width: 56, height: 56 }}>
            {icon}
          </Avatar>
        </Box>
        )}
      </CardContent>
    </Card>
  ), (prevProps, nextProps) => {
    // 自定义比较函数，只在关键属性变化时重渲染
    return (
      prevProps.title === nextProps.title &&
      prevProps.value === nextProps.value &&
      prevProps.trend === nextProps.trend &&
      prevProps.trendValue === nextProps.trendValue &&
      prevProps.loading === nextProps.loading
    );
  });

  if (error && !dashboardData.stats.totalTravelRequests) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert 
          severity="error" 
          action={
            <Button color="inherit" size="small" onClick={() => fetchDashboardData()}>
              {t('common.retry')}
            </Button>
          }
        >
          {error}
        </Alert>
      </Box>
    );
  }

  return (
    <Box>
      {/* Header with Refresh Button */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5" fontWeight={600}>
          {t('dashboard.title')}
      </Typography>
        <Tooltip title={t('common.refresh')}>
          <IconButton onClick={handleRefresh} disabled={refreshing}>
            <RefreshIcon sx={{ animation: refreshing ? 'spin 1s linear infinite' : 'none' }} />
          </IconButton>
        </Tooltip>
      </Box>

      {refreshing && <LinearProgress sx={{ mb: 2 }} />}

      {/* Stats Cards */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={2}>
          <StatCard
            title={t('dashboard.totalTravelRequests')}
            value={dashboardData.stats.totalTravelRequests}
            icon={<TravelIcon />}
            loading={loading}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={2}>
          <StatCard
            title={t('dashboard.totalExpenses')}
            value={dashboardData.stats.totalExpenses}
            icon={<ExpenseIcon />}
            loading={loading}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={2}>
          <StatCard
            title={t('dashboard.monthlySpending')}
            value={formatCurrency(dashboardData.stats.monthlySpending)}
            icon={<MoneyIcon />}
            trend="trend"
            trendValue={dashboardData.stats.spendingTrend}
            loading={loading}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={2}>
          <StatCard
            title={t('dashboard.pendingApprovals')}
            value={dashboardData.stats.pendingApprovals}
            icon={<ApprovalIcon />}
            loading={loading}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={2}>
          <StatCard
            title={t('dashboard.approvedRequests')}
            value={dashboardData.stats.approvedRequests}
            icon={<ScheduleIcon />}
            loading={loading}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={2}>
          <StatCard
            title={t('dashboard.countryCount')}
            value={dashboardData.stats.countryCount}
            icon={<PublicIcon />}
            loading={loading}
          />
        </Grid>
      </Grid>

      <Grid container spacing={3}>
        {/* Monthly Spending Chart */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3, height: 400 }}>
            <Typography variant="h6" gutterBottom>
              {t('dashboard.monthlyTrend')}
            </Typography>
            {loading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 300 }}>
                <Skeleton variant="rectangular" width="100%" height={300} />
              </Box>
            ) : dashboardData.monthlySpending.length === 0 ? (
              <Box sx={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height: 300 }}>
                <ErrorIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
                <Typography variant="body2" color="text.secondary">
                  {t('dashboard.noData')}
                </Typography>
              </Box>
            ) : (
            <Suspense fallback={<Skeleton variant="rectangular" width="100%" height={300} />}>
              <MonthlySpendingChart data={dashboardData.monthlySpending} formatCurrency={formatCurrency} />
            </Suspense>
            )}
          </Paper>
        </Grid>

        {/* Second Column - Two Panels in a Row */}
        <Grid item xs={12} md={6}>
          <Grid container spacing={2}>
            {/* Category Breakdown */}
            <Grid item xs={6}>
              <Paper sx={{ p: 2, height: 400 }}>
                <Typography variant="h6" gutterBottom sx={{ fontSize: '0.875rem', mb: 1 }}>
                  {t('dashboard.categoryBreakdown')}
                </Typography>
                {loading ? (
                  <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 340 }}>
                    <Skeleton variant="circular" width={120} height={120} />
                  </Box>
                ) : dashboardData.categoryBreakdown.length === 0 ? (
                  <Box sx={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height: 340 }}>
                    <ErrorIcon sx={{ fontSize: 36, color: 'text.secondary', mb: 1 }} />
                    <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
                      {t('dashboard.noData')}
                    </Typography>
                  </Box>
                ) : (
                <Suspense fallback={<Skeleton variant="circular" width={120} height={120} sx={{ mx: 'auto', mt: 1 }} />}>
                  <CategoryBreakdownChart data={dashboardData.categoryBreakdown} formatCurrency={formatCurrency} />
                </Suspense>
                )}
              </Paper>
            </Grid>

            {/* Country Travel Distribution */}
            <Grid item xs={6}>
              <Paper sx={{ p: 2, height: 400 }}>
                <Typography variant="h6" gutterBottom sx={{ fontSize: '0.875rem', mb: 1 }}>
                  {t('dashboard.countryTravelDistribution')}
                </Typography>
                {loading ? (
                  <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 340 }}>
                    <Skeleton variant="circular" width={120} height={120} />
                  </Box>
                ) : dashboardData.countryTravelData.length === 0 ? (
                  <Box sx={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height: 340 }}>
                    <ErrorIcon sx={{ fontSize: 36, color: 'text.secondary', mb: 1 }} />
                    <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
                      {t('dashboard.noData')}
                    </Typography>
                  </Box>
                ) : (
                <Suspense fallback={<Skeleton variant="circular" width={120} height={120} sx={{ mx: 'auto', mt: 1 }} />}>
                  <CountryTravelChart data={dashboardData.countryTravelData} />
                </Suspense>
                )}
              </Paper>
            </Grid>
          </Grid>
        </Grid>

        {/* Recent Travel Requests */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6">
                {t('dashboard.recentTravel')}
              </Typography>
              <Button size="small" onClick={() => navigate('/travel')}>
                {t('common.viewAll')}
              </Button>
            </Box>
            {loading ? (
              <List>
                {[1, 2, 3].map((i) => (
                  <ListItem key={i}>
                    <Skeleton variant="rectangular" width="100%" height={60} />
                  </ListItem>
                ))}
              </List>
            ) : dashboardData.recentTravels.length === 0 ? (
              <Box sx={{ textAlign: 'center', py: 4 }}>
                <TravelIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
                <Typography variant="body2" color="text.secondary">
                  {t('dashboard.noRecentTravel')}
                </Typography>
              </Box>
            ) : (
            <List>
                {dashboardData.recentTravels.map((travel) => (
                  <ListItem 
                    key={travel._id} 
                    divider
                    sx={{ cursor: 'pointer', '&:hover': { bgcolor: 'action.hover' } }}
                    onClick={() => navigate(`/travel/${travel._id}`)}
                  >
                  <ListItemIcon>
                    <TravelIcon color="primary" />
                  </ListItemIcon>
                  <ListItemText
                      primary={
                        <React.Fragment>
                          <Typography variant="body1" component="span" fontWeight={500}>
                            {travel.travelNumber || travel._id?.slice(-8) || '-'}
                          </Typography>
                          <Typography variant="body2" component="span" color="text.secondary" sx={{ ml: 2 }}>
                            {travel.employee?.firstName} {travel.employee?.lastName}
                          </Typography>
                        </React.Fragment>
                      }
                      secondary={
                        <React.Fragment>
                          <Typography variant="body2" component="span">
                            {travel.destination || t('dashboard.noDestination')}
                          </Typography>
                          <Typography variant="body2" component="span" color="text.secondary" sx={{ ml: 2 }}>
                            {formatDate(travel.startDate)} - {formatDate(travel.endDate)}
                          </Typography>
                        </React.Fragment>
                      }
                  />
                  <Chip
                      label={t(`travel.statuses.${travel.status}`)}
                    color={getStatusColor(travel.status)}
                    size="small"
                  />
                </ListItem>
              ))}
            </List>
            )}
          </Paper>
        </Grid>

        {/* Recent Expenses */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6">
                {t('dashboard.recentExpenses')}
              </Typography>
              <Button size="small" onClick={() => navigate('/expenses')}>
                {t('common.viewAll')}
              </Button>
            </Box>
            {loading ? (
              <List>
                {[1, 2, 3].map((i) => (
                  <ListItem key={i}>
                    <Skeleton variant="rectangular" width="100%" height={60} />
                  </ListItem>
                ))}
              </List>
            ) : dashboardData.recentExpenses.length === 0 ? (
              <Box sx={{ textAlign: 'center', py: 4 }}>
                <ExpenseIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
                <Typography variant="body2" color="text.secondary">
                  {t('dashboard.noRecentExpenses')}
                </Typography>
              </Box>
            ) : (
            <List>
              {dashboardData.recentExpenses.map((expense) => (
                  <ListItem 
                    key={expense._id} 
                    divider
                    sx={{ cursor: 'pointer', '&:hover': { bgcolor: 'action.hover' } }}
                    onClick={() => navigate(`/expenses/${expense._id}`)}
                  >
                  <ListItemIcon>
                    <ExpenseIcon color="primary" />
                  </ListItemIcon>
                  <ListItemText
                      primary={expense.title || expense.description}
                      secondary={`${formatDate(expense.date)} • ${t(`expense.categories.${expense.category}`) || expense.category || t('common.nA') || '-'}`}
                  />
                  <Typography variant="body2" color="primary" sx={{ fontWeight: 'bold' }}>
                      {formatCurrency(expense.amount)}
                  </Typography>
                </ListItem>
              ))}
            </List>
            )}
          </Paper>
        </Grid>
      </Grid>

      {/* CSS for refresh animation */}
      <style>
        {`
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
        `}
      </style>
    </Box>
  );
};

export default Dashboard;
