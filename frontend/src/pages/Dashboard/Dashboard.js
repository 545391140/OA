import React, { useState, useEffect } from 'react';
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
  ErrorOutline as ErrorIcon
} from '@mui/icons-material';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as ChartTooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useNotification } from '../../contexts/NotificationContext';
import apiClient from '../../utils/axiosConfig';

const Dashboard = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { showNotification } = useNotification();
  const navigate = useNavigate();
  
  const [dashboardData, setDashboardData] = useState({
    stats: {
      totalTravelRequests: 0,
      pendingApprovals: 0,
      monthlySpending: 0,
      approvedRequests: 0,
      spendingTrend: 0
    },
    recentTravels: [],
    recentExpenses: [],
    monthlySpending: [],
    categoryBreakdown: [],
    pendingTasks: []
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async (isRefresh = false) => {
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
          pendingTasks: data.pendingTasks || []
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
  };

  const handleRefresh = () => {
    fetchDashboardData(true);
  };

  const getStatusColor = (status) => {
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
  };

  const formatCurrency = (amount) => {
    return `¥${parseFloat(amount || 0).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit' });
  };

  const StatCard = ({ title, value, icon, trend, trendValue, loading }) => (
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
  );

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
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title={t('dashboard.totalTravelRequests')}
            value={dashboardData.stats.totalTravelRequests}
            icon={<TravelIcon />}
            loading={loading}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title={t('dashboard.pendingApprovals')}
            value={dashboardData.stats.pendingApprovals}
            icon={<ApprovalIcon />}
            loading={loading}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title={t('dashboard.monthlySpending')}
            value={formatCurrency(dashboardData.stats.monthlySpending)}
            icon={<MoneyIcon />}
            trend="trend"
            trendValue={dashboardData.stats.spendingTrend}
            loading={loading}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title={t('dashboard.approvedRequests')}
            value={dashboardData.stats.approvedRequests}
            icon={<ScheduleIcon />}
            loading={loading}
          />
        </Grid>
      </Grid>

      <Grid container spacing={3}>
        {/* Monthly Spending Chart */}
        <Grid item xs={12} md={8}>
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
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={dashboardData.monthlySpending}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <ChartTooltip formatter={(value) => [formatCurrency(value), t('dashboard.amount')]} />
                  <Line type="monotone" dataKey="amount" stroke="#1976d2" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </Paper>
        </Grid>

        {/* Category Breakdown */}
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 3, height: 400 }}>
            <Typography variant="h6" gutterBottom>
              {t('dashboard.categoryBreakdown')}
            </Typography>
            {loading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 300 }}>
                <Skeleton variant="circular" width={200} height={200} />
              </Box>
            ) : dashboardData.categoryBreakdown.length === 0 ? (
              <Box sx={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height: 300 }}>
                <ErrorIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
                <Typography variant="body2" color="text.secondary">
                  {t('dashboard.noData')}
                </Typography>
              </Box>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={dashboardData.categoryBreakdown}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, value }) => `${name} ${value}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {dashboardData.categoryBreakdown.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <ChartTooltip formatter={(value) => [`${value}%`, t('dashboard.percentage')]} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            )}
          </Paper>
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
                        <Box>
                          <Typography variant="body1" component="span" fontWeight={500}>
                            {travel.travelNumber || travel._id?.slice(-8) || '-'}
                          </Typography>
                          <Typography variant="body2" component="span" color="text.secondary" sx={{ ml: 2 }}>
                            {travel.user?.firstName} {travel.user?.lastName}
                          </Typography>
                        </Box>
                      }
                      secondary={
                        <Box sx={{ mt: 0.5 }}>
                          <Typography variant="body2" component="span">
                            {travel.destination || t('dashboard.noDestination')}
                          </Typography>
                          <Typography variant="body2" component="span" color="text.secondary" sx={{ ml: 2 }}>
                            {formatDate(travel.startDate)} - {formatDate(travel.endDate)}
                          </Typography>
                        </Box>
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
                      secondary={`${formatDate(expense.date)} • ${expense.category || '-'}`}
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
