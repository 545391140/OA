import React, { useState, useEffect } from 'react';
import {
  Container,
  Box,
  Typography,
  Paper,
  Grid,
  Card,
  CardContent,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Tabs,
  Tab,
  Chip,
  LinearProgress,
  Alert
} from '@mui/material';
import {
  Assessment as AssessmentIcon,
  TrendingUp as TrendingUpIcon,
  AttachMoney as MoneyIcon,
  Flight as TravelIcon,
  Receipt as ExpenseIcon,
  Download as DownloadIcon,
  FilterList as FilterIcon,
  CalendarToday as CalendarIcon
} from '@mui/icons-material';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../contexts/AuthContext';
import { useNotification } from '../../contexts/NotificationContext';
import dayjs from 'dayjs';

const Reports = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { showNotification } = useNotification();

  const [loading, setLoading] = useState(true);
  const [tabValue, setTabValue] = useState(0);
  const [dateRange, setDateRange] = useState('last30days');
  const [department, setDepartment] = useState('all');

  const [reportData, setReportData] = useState({
    summary: {
      totalExpenses: 0,
      totalTravel: 0,
      pendingApprovals: 0,
      monthlyTrend: 0
    },
    monthlyData: [],
    categoryData: [],
    departmentData: [],
    travelData: [],
    expenseData: []
  });

  const dateRangeOptions = [
    { value: 'last7days', label: 'Last 7 Days' },
    { value: 'last30days', label: 'Last 30 Days' },
    { value: 'last90days', label: 'Last 90 Days' },
    { value: 'thisYear', label: 'This Year' },
    { value: 'custom', label: t('reports.customRange') }
  ];

  const departmentOptions = [
    { value: 'all', label: 'All Departments' },
    { value: 'sales', label: 'Sales' },
    { value: 'marketing', label: 'Marketing' },
    { value: 'engineering', label: 'Engineering' },
    { value: 'operations', label: t('reports.operations') },
    { value: 'hr', label: 'HR' },
    { value: 'finance', label: 'Finance' }
  ];

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D'];

  useEffect(() => {
    fetchReportData();
  }, [dateRange, department]);

  const fetchReportData = async () => {
    try {
      setLoading(true);
      // Mock data - replace with actual API call
      const mockData = {
        summary: {
          totalExpenses: 45680.50,
          totalTravel: 23450.00,
          pendingApprovals: 12,
          monthlyTrend: 8.5
        },
        monthlyData: [
          { month: 'Jan', expenses: 4200, travel: 2100, approved: 15, pending: 3 },
          { month: 'Feb', expenses: 4800, travel: 2400, approved: 18, pending: 2 },
          { month: 'Mar', expenses: 5200, travel: 2600, approved: 22, pending: 4 },
          { month: 'Apr', expenses: 4500, travel: 2250, approved: 19, pending: 3 },
          { month: 'May', expenses: 5100, travel: 2550, approved: 21, pending: 2 },
          { month: 'Jun', expenses: 5800, travel: 2900, approved: 25, pending: 5 }
        ],
        categoryData: [
          { name: 'Transportation', value: 12000, count: 45 },
          { name: 'Accommodation', value: 8500, count: 28 },
          { name: 'Meals', value: 6800, count: 67 },
          { name: 'Entertainment', value: 3200, count: 15 },
          { name: 'Office Supplies', value: 2100, count: 23 },
          { name: 'Other', value: 1500, count: 12 }
        ],
        departmentData: [
          { department: 'Sales', expenses: 18500, travel: 12000, count: 45 },
          { department: 'Marketing', expenses: 12500, travel: 8000, count: 32 },
          { department: 'Engineering', expenses: 9800, travel: 6000, count: 28 },
          { department: 'Operations', expenses: 4200, travel: 2000, count: 15 },
          { department: 'HR', expenses: 1800, travel: 1000, count: 8 }
        ],
        travelData: [
          { destination: 'Tokyo', trips: 8, cost: 12000, avgCost: 1500 },
          { destination: 'Singapore', trips: 6, cost: 9000, avgCost: 1500 },
          { destination: 'Seoul', trips: 4, cost: 6000, avgCost: 1500 },
          { destination: 'New York', trips: 3, cost: 4500, avgCost: 1500 },
          { destination: 'London', trips: 2, cost: 3000, avgCost: 1500 }
        ],
        expenseData: [
          { vendor: 'Restaurant ABC', amount: 2500, count: 15, category: 'Meals' },
          { vendor: 'Hotel XYZ', amount: 4200, count: 8, category: 'Accommodation' },
          { vendor: 'Airline Co', amount: 8500, count: 12, category: 'Transportation' },
          { vendor: 'Office Depot', amount: 1200, count: 6, category: 'Office Supplies' },
          { vendor: 'Taxi Service', amount: 800, count: 20, category: 'Transportation' }
        ]
      };
      setReportData(mockData);
    } catch (error) {
      showNotification('Failed to load report data', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  const handleExport = (format) => {
    showNotification(`Exporting report as ${format}...`, 'info');
  };

  const SummaryCard = ({ title, value, icon, trend, color = 'primary' }) => (
    <Card>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box>
            <Typography color="textSecondary" gutterBottom variant="h6">
              {title}
            </Typography>
            <Typography variant="h4" component="div" color={color}>
              {typeof value === 'number' ? value.toLocaleString() : value}
            </Typography>
            {trend && (
              <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
                <TrendingUpIcon color="success" fontSize="small" />
                <Typography variant="body2" color="success.main">
                  +{trend}% from last month
                </Typography>
              </Box>
            )}
          </Box>
          <Box sx={{ color: `${color}.main` }}>
            {icon}
          </Box>
        </Box>
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
          {t('reports.title')}
        </Typography>

        {/* Filters */}
        <Paper sx={{ p: 2, mb: 3 }}>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={4}>
              <FormControl fullWidth>
                <InputLabel>Date Range</InputLabel>
                <Select
                  value={dateRange}
                  label={t('reports.dateRange')}
                  onChange={(e) => setDateRange(e.target.value)}
                >
                  {dateRangeOptions.map((option) => (
                    <MenuItem key={option.value} value={option.value}>
                      {option.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={4}>
              <FormControl fullWidth>
                <InputLabel>Department</InputLabel>
                <Select
                  value={department}
                  label={t('reports.department')}
                  onChange={(e) => setDepartment(e.target.value)}
                >
                  {departmentOptions.map((option) => (
                    <MenuItem key={option.value} value={option.value}>
                      {option.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={4}>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Button
                  variant="outlined"
                  startIcon={<DownloadIcon />}
                  onClick={() => handleExport('PDF')}
                >
                  Export PDF
                </Button>
                <Button
                  variant="outlined"
                  startIcon={<DownloadIcon />}
                  onClick={() => handleExport('Excel')}
                >
                  Export Excel
                </Button>
              </Box>
            </Grid>
          </Grid>
        </Paper>

        {/* Summary Cards */}
        <Grid container spacing={3} sx={{ mb: 3 }}>
          <Grid item xs={12} sm={6} md={3}>
            <SummaryCard
              title={t('reports.totalExpenses')}
              value={`$${reportData.summary.totalExpenses.toLocaleString()}`}
              icon={<MoneyIcon sx={{ fontSize: 40 }} />}
              trend={reportData.summary.monthlyTrend}
              color="primary"
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <SummaryCard
              title={t('reports.travelCosts')}
              value={`$${reportData.summary.totalTravel.toLocaleString()}`}
              icon={<TravelIcon sx={{ fontSize: 40 }} />}
              trend={5.2}
              color="info"
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <SummaryCard
              title={t('reports.pendingApprovals')}
              value={reportData.summary.pendingApprovals}
              icon={<AssessmentIcon sx={{ fontSize: 40 }} />}
              color="warning"
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <SummaryCard
              title={t('reports.approvalRate')}
              value="94.5%"
              icon={<TrendingUpIcon sx={{ fontSize: 40 }} />}
              trend={2.1}
              color="success"
            />
          </Grid>
        </Grid>

        {/* Report Tabs */}
        <Paper sx={{ mt: 3 }}>
          <Tabs
            value={tabValue}
            onChange={handleTabChange}
            indicatorColor="primary"
            textColor="primary"
          >
            <Tab label={t('reports.overview')} icon={<AssessmentIcon />} iconPosition="start" />
            <Tab label={t('reports.expenses')} icon={<ExpenseIcon />} iconPosition="start" />
            <Tab label={t('reports.travel')} icon={<TravelIcon />} iconPosition="start" />
            <Tab label={t('reports.departments')} icon={<FilterIcon />} iconPosition="start" />
          </Tabs>

          <Box sx={{ p: 3 }}>
            {tabValue === 0 && (
              <Box>
                <Typography variant="h6" gutterBottom>
                  Monthly Trends
                </Typography>
                <Box sx={{ height: 400, mb: 3 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={reportData.monthlyData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Area
                        type="monotone"
                        dataKey="expenses"
                        stackId="1"
                        stroke="#8884d8"
                        fill="#8884d8"
                        name={t('reports.expenses')}
                      />
                      <Area
                        type="monotone"
                        dataKey="travel"
                        stackId="1"
                        stroke="#82ca9d"
                        fill="#82ca9d"
                        name={t('reports.travel')}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </Box>

                <Grid container spacing={3}>
                  <Grid item xs={12} md={6}>
                    <Typography variant="h6" gutterBottom>
                      Expense Categories
                    </Typography>
                    <Box sx={{ height: 300 }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={reportData.categoryData}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                            outerRadius={80}
                            fill="#8884d8"
                            dataKey="value"
                          >
                            {reportData.categoryData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip />
                        </PieChart>
                      </ResponsiveContainer>
                    </Box>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <Typography variant="h6" gutterBottom>
                      Approval Status
                    </Typography>
                    <Box sx={{ height: 300 }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={reportData.monthlyData}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="month" />
                          <YAxis />
                          <Tooltip />
                          <Legend />
                          <Bar dataKey="approved" fill="#4caf50" name={t('reports.approved')} />
                          <Bar dataKey="pending" fill="#ff9800" name={t('reports.pending')} />
                        </BarChart>
                      </ResponsiveContainer>
                    </Box>
                  </Grid>
                </Grid>
              </Box>
            )}

            {tabValue === 1 && (
              <Box>
                <Typography variant="h6" gutterBottom>
                  Expense Analysis
                </Typography>
                <Box sx={{ height: 400, mb: 3 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={reportData.expenseData} layout="horizontal">
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" />
                      <YAxis dataKey="vendor" type="category" width={150} />
                      <Tooltip />
                      <Bar dataKey="amount" fill="#8884d8" />
                    </BarChart>
                  </ResponsiveContainer>
                </Box>
              </Box>
            )}

            {tabValue === 2 && (
              <Box>
                <Typography variant="h6" gutterBottom>
                  Travel Analysis
                </Typography>
                <Box sx={{ height: 400, mb: 3 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={reportData.travelData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="destination" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="cost" fill="#82ca9d" name={t('reports.totalCost')} />
                    </BarChart>
                  </ResponsiveContainer>
                </Box>
              </Box>
            )}

            {tabValue === 3 && (
              <Box>
                <Typography variant="h6" gutterBottom>
                  Department Analysis
                </Typography>
                <Box sx={{ height: 400, mb: 3 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={reportData.departmentData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="department" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="expenses" fill="#8884d8" name={t('reports.expenses')} />
                      <Bar dataKey="travel" fill="#82ca9d" name={t('reports.travel')} />
                    </BarChart>
                  </ResponsiveContainer>
                </Box>
              </Box>
            )}
          </Box>
        </Paper>
      </Box>
    </Container>
  );
};

export default Reports;
