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
  LinearProgress
} from '@mui/material';
import {
  Flight as TravelIcon,
  Receipt as ExpenseIcon,
  Approval as ApprovalIcon,
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  AttachMoney as MoneyIcon,
  Schedule as ScheduleIcon
} from '@mui/icons-material';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../contexts/AuthContext';
import { useNotification } from '../../contexts/NotificationContext';

const Dashboard = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { showNotification } = useNotification();
  
  const [dashboardData, setDashboardData] = useState({
    stats: {
      totalTravelRequests: 0,
      pendingApprovals: 0,
      monthlySpending: 0,
      approvedRequests: 0
    },
    recentTravel: [],
    recentExpenses: [],
    monthlySpending: [],
    categoryBreakdown: []
  });

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      // Mock data - replace with actual API calls
      const mockData = {
        stats: {
          totalTravelRequests: 12,
          pendingApprovals: 3,
          monthlySpending: 2450.50,
          approvedRequests: 8
        },
        recentTravel: [
          { id: 1, title: 'Business Trip to Tokyo', status: 'approved', date: '2024-01-15' },
          { id: 2, title: 'Client Meeting in Seoul', status: 'pending', date: '2024-01-20' },
          { id: 3, title: 'Conference in Singapore', status: 'draft', date: '2024-01-25' }
        ],
        recentExpenses: [
          { id: 1, description: 'Hotel accommodation', amount: 450.00, category: 'accommodation', date: '2024-01-15' },
          { id: 2, description: 'Flight ticket', amount: 320.00, category: 'transportation', date: '2024-01-14' },
          { id: 3, description: 'Business dinner', amount: 85.50, category: 'meals', date: '2024-01-13' }
        ],
        monthlySpending: [
          { month: 'Jan', amount: 2450.50 },
          { month: 'Feb', amount: 1890.25 },
          { month: 'Mar', amount: 3200.75 },
          { month: 'Apr', amount: 2100.00 },
          { month: 'May', amount: 2750.30 },
          { month: 'Jun', amount: 1980.45 }
        ],
        categoryBreakdown: [
          { name: 'Transportation', value: 35, color: '#8884d8' },
          { name: 'Accommodation', value: 30, color: '#82ca9d' },
          { name: 'Meals', value: 20, color: '#ffc658' },
          { name: 'Other', value: 15, color: '#ff7300' }
        ]
      };
      
      setDashboardData(mockData);
      setLoading(false);
    } catch (error) {
      showNotification('Failed to load dashboard data', 'error');
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      draft: 'default',
      pending: 'warning',
      approved: 'success',
      rejected: 'error',
      'in-progress': 'info',
      completed: 'success',
      cancelled: 'error'
    };
    return colors[status] || 'default';
  };

  const StatCard = ({ title, value, icon, trend, trendValue }) => (
    <Card sx={{ height: '100%' }}>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box>
            <Typography color="text.secondary" gutterBottom variant="h6">
              {title}
            </Typography>
            <Typography variant="h4" component="div">
              {value}
            </Typography>
            {trend && (
              <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
                {trend === 'up' ? (
                  <TrendingUpIcon color="success" sx={{ fontSize: 16, mr: 0.5 }} />
                ) : (
                  <TrendingDownIcon color="error" sx={{ fontSize: 16, mr: 0.5 }} />
                )}
                <Typography variant="body2" color={trend === 'up' ? 'success.main' : 'error.main'}>
                  {trendValue}%
                </Typography>
              </Box>
            )}
          </Box>
          <Avatar sx={{ bgcolor: 'primary.main', width: 56, height: 56 }}>
            {icon}
          </Avatar>
        </Box>
      </CardContent>
    </Card>
  );

  if (loading) {
    return (
      <Box sx={{ width: '100%' }}>
        <LinearProgress />
      </Box>
    );
  }

  return (
    <Box>
      {/* Stats Cards */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title={t('dashboard.totalTravelRequests')}
            value={dashboardData.stats.totalTravelRequests}
            icon={<TravelIcon />}
            trend="up"
            trendValue="12"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title={t('dashboard.pendingApprovals')}
            value={dashboardData.stats.pendingApprovals}
            icon={<ApprovalIcon />}
            trend="down"
            trendValue="5"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title={t('dashboard.monthlySpending')}
            value={`$${dashboardData.stats.monthlySpending.toLocaleString()}`}
            icon={<MoneyIcon />}
            trend="up"
            trendValue="8"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title={t('dashboard.approvedRequests')}
            value={dashboardData.stats.approvedRequests}
            icon={<ScheduleIcon />}
            trend="up"
            trendValue="15"
          />
        </Grid>
      </Grid>

      <Grid container spacing={3}>
        {/* Monthly Spending Chart */}
        <Grid item xs={12} md={8}>
          <Paper sx={{ p: 3, height: 400 }}>
            <Typography variant="h6" gutterBottom>
              {t('dashboard.monthlySpending')}
            </Typography>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={dashboardData.monthlySpending}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip formatter={(value) => [`$${value}`, 'Amount']} />
                <Line type="monotone" dataKey="amount" stroke="#1976d2" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>

        {/* Category Breakdown */}
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 3, height: 400 }}>
            <Typography variant="h6" gutterBottom>
              {t('dashboard.expenseStats')}
            </Typography>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={dashboardData.categoryBreakdown}
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                >
                  {dashboardData.categoryBreakdown.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>

        {/* Recent Travel Requests */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6">
                {t('dashboard.recentTravel')}
              </Typography>
              <Button size="small" href="/travel">
                View All
              </Button>
            </Box>
            <List>
              {dashboardData.recentTravel.map((travel) => (
                <ListItem key={travel.id} divider>
                  <ListItemIcon>
                    <TravelIcon color="primary" />
                  </ListItemIcon>
                  <ListItemText
                    primary={travel.title}
                    secondary={travel.date}
                  />
                  <Chip
                    label={travel.status}
                    color={getStatusColor(travel.status)}
                    size="small"
                  />
                </ListItem>
              ))}
            </List>
          </Paper>
        </Grid>

        {/* Recent Expenses */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6">
                {t('dashboard.recentExpenses')}
              </Typography>
              <Button size="small" href="/expenses">
                View All
              </Button>
            </Box>
            <List>
              {dashboardData.recentExpenses.map((expense) => (
                <ListItem key={expense.id} divider>
                  <ListItemIcon>
                    <ExpenseIcon color="primary" />
                  </ListItemIcon>
                  <ListItemText
                    primary={expense.description}
                    secondary={`${expense.date} • ${expense.category}`}
                  />
                  <Typography variant="body2" color="primary" sx={{ fontWeight: 'bold' }}>
                    ${expense.amount}
                  </Typography>
                </ListItem>
              ))}
            </List>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default Dashboard;
