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
  Alert,
  TextField
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
import apiClient from '../../utils/axiosConfig';
import dayjs from 'dayjs';

const Reports = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { showNotification } = useNotification();

  const [loading, setLoading] = useState(true);
  const [tabValue, setTabValue] = useState(0);
  const [dateRange, setDateRange] = useState('last30days');
  const [department, setDepartment] = useState('all');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [departments, setDepartments] = useState([]);

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

  // 获取部门列表
  useEffect(() => {
    const fetchDepartments = async () => {
      try {
        const response = await apiClient.get('/reports/departments');
        if (response.data && response.data.success) {
          const deptList = response.data.data || [];
          setDepartments([
            { value: 'all', label: t('reports.allDepartments') || 'All Departments' },
            ...deptList.map(dept => ({ value: dept, label: dept }))
          ]);
        }
      } catch (error) {
        console.error('Failed to fetch departments:', error);
        // 使用默认部门列表
        setDepartments([
          { value: 'all', label: t('reports.allDepartments') || 'All Departments' }
        ]);
      }
    };
    fetchDepartments();
  }, [t]);

  const departmentOptions = departments.length > 0 ? departments : [
    { value: 'all', label: t('reports.allDepartments') || 'All Departments' }
  ];

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D'];

  useEffect(() => {
    fetchReportData();
  }, [dateRange, department, customStartDate, customEndDate]);

  // 计算日期范围
  const getDateRange = () => {
    const now = dayjs();
    let startDate, endDate;

    switch (dateRange) {
      case 'last7days':
        startDate = now.subtract(7, 'day').format('YYYY-MM-DD');
        endDate = now.format('YYYY-MM-DD');
        break;
      case 'last30days':
        startDate = now.subtract(30, 'day').format('YYYY-MM-DD');
        endDate = now.format('YYYY-MM-DD');
        break;
      case 'last90days':
        startDate = now.subtract(90, 'day').format('YYYY-MM-DD');
        endDate = now.format('YYYY-MM-DD');
        break;
      case 'thisYear':
        startDate = now.startOf('year').format('YYYY-MM-DD');
        endDate = now.format('YYYY-MM-DD');
        break;
      case 'custom':
        startDate = customStartDate || now.subtract(30, 'day').format('YYYY-MM-DD');
        endDate = customEndDate || now.format('YYYY-MM-DD');
        break;
      default:
        startDate = now.subtract(30, 'day').format('YYYY-MM-DD');
        endDate = now.format('YYYY-MM-DD');
    }

    return { startDate, endDate };
  };

  const fetchReportData = async () => {
    try {
      setLoading(true);
      const { startDate, endDate } = getDateRange();

      // 调用真实API
      const response = await apiClient.get('/reports/comprehensive', {
        params: {
          startDate,
          endDate,
          department: department !== 'all' ? department : undefined
        }
      });

      if (response.data && response.data.success) {
        const data = response.data.data;
        
        // 确保数据格式正确
        setReportData({
          summary: {
            totalExpenses: data.summary?.totalExpenses || 0,
            totalTravel: data.summary?.totalTravel || 0,
            pendingApprovals: data.summary?.pendingApprovals || 0,
            monthlyTrend: data.summary?.monthlyTrend || 0
          },
          monthlyData: data.monthlyData || [],
          categoryData: data.categoryData || [],
          departmentData: data.departmentData || [],
          travelData: data.travelData || [],
          expenseData: data.expenseData || []
        });
      } else {
        throw new Error('Failed to fetch report data');
      }
    } catch (error) {
      console.error('Failed to load report data:', error);
      showNotification(
        error.response?.data?.message || t('reports.loadError') || 'Failed to load report data',
        'error'
      );
      
      // 设置空数据以避免UI错误
      setReportData({
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
    } finally {
      setLoading(false);
    }
  };

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  const handleExport = async (format) => {
    try {
      const { startDate, endDate } = getDateRange();
      
      // 构建导出数据
      const exportData = {
        summary: reportData.summary,
        monthlyData: reportData.monthlyData,
        categoryData: reportData.categoryData,
        departmentData: reportData.departmentData,
        travelData: reportData.travelData,
        expenseData: reportData.expenseData,
        filters: {
          dateRange,
          startDate,
          endDate,
          department
        },
        generatedAt: new Date().toISOString()
      };

      if (format === 'PDF') {
        // PDF导出 - 使用浏览器打印功能
        const printWindow = window.open('', '_blank');
        const htmlContent = generatePDFContent(exportData);
        printWindow.document.write(htmlContent);
        printWindow.document.close();
        printWindow.print();
        showNotification(t('reports.exportPDF') || 'PDF export initiated', 'success');
      } else if (format === 'Excel') {
        // Excel导出 - 生成CSV格式
        const csvContent = generateCSVContent(exportData);
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `report_${startDate}_${endDate}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        showNotification(t('reports.exportExcel') || 'Excel export completed', 'success');
      }
    } catch (error) {
      console.error('Export error:', error);
      showNotification(t('reports.exportError') || 'Export failed', 'error');
    }
  };

  const generatePDFContent = (data) => {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Expense Report</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; }
            h1 { color: #333; }
            table { width: 100%; border-collapse: collapse; margin: 20px 0; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background-color: #f2f2f2; }
          </style>
        </head>
        <body>
          <h1>Expense & Travel Report</h1>
          <p><strong>Period:</strong> ${data.filters.startDate} to ${data.filters.endDate}</p>
          <p><strong>Generated:</strong> ${new Date(data.generatedAt).toLocaleString()}</p>
          
          <h2>Summary</h2>
          <table>
            <tr><th>Total Expenses</th><td>$${data.summary.totalExpenses.toLocaleString()}</td></tr>
            <tr><th>Total Travel</th><td>$${data.summary.totalTravel.toLocaleString()}</td></tr>
            <tr><th>Pending Approvals</th><td>${data.summary.pendingApprovals}</td></tr>
          </table>
          
          <h2>Monthly Data</h2>
          <table>
            <tr><th>Month</th><th>Expenses</th><th>Travel</th><th>Approved</th><th>Pending</th></tr>
            ${data.monthlyData.map(m => `
              <tr>
                <td>${m.month}</td>
                <td>$${m.expenses.toLocaleString()}</td>
                <td>$${m.travel.toLocaleString()}</td>
                <td>${m.approved}</td>
                <td>${m.pending}</td>
              </tr>
            `).join('')}
          </table>
        </body>
      </html>
    `;
  };

  const generateCSVContent = (data) => {
    let csv = 'Expense & Travel Report\n';
    csv += `Period: ${data.filters.startDate} to ${data.filters.endDate}\n`;
    csv += `Generated: ${new Date(data.generatedAt).toLocaleString()}\n\n`;
    
    csv += 'Summary\n';
    csv += 'Total Expenses,' + data.summary.totalExpenses + '\n';
    csv += 'Total Travel,' + data.summary.totalTravel + '\n';
    csv += 'Pending Approvals,' + data.summary.pendingApprovals + '\n\n';
    
    csv += 'Monthly Data\n';
    csv += 'Month,Expenses,Travel,Approved,Pending\n';
    data.monthlyData.forEach(m => {
      csv += `${m.month},${m.expenses},${m.travel},${m.approved},${m.pending}\n`;
    });
    
    csv += '\nCategory Data\n';
    csv += 'Category,Amount,Count\n';
    data.categoryData.forEach(c => {
      csv += `${c.name},${c.value},${c.count}\n`;
    });
    
    return csv;
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
            <Grid item xs={12} md={3}>
              <FormControl fullWidth>
                <InputLabel>{t('reports.dateRange')}</InputLabel>
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
            {dateRange === 'custom' && (
              <>
                <Grid item xs={12} md={2}>
                  <TextField
                    fullWidth
                    type="date"
                    label={t('reports.startDate') || 'Start Date'}
                    value={customStartDate}
                    onChange={(e) => setCustomStartDate(e.target.value)}
                    InputLabelProps={{ shrink: true }}
                  />
                </Grid>
                <Grid item xs={12} md={2}>
                  <TextField
                    fullWidth
                    type="date"
                    label={t('reports.endDate') || 'End Date'}
                    value={customEndDate}
                    onChange={(e) => setCustomEndDate(e.target.value)}
                    InputLabelProps={{ shrink: true }}
                  />
                </Grid>
              </>
            )}
            <Grid item xs={12} md={dateRange === 'custom' ? 2 : 3}>
              <FormControl fullWidth>
                <InputLabel>{t('reports.department')}</InputLabel>
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
            <Grid item xs={12} md={dateRange === 'custom' ? 3 : 3}>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Button
                  variant="outlined"
                  startIcon={<DownloadIcon />}
                  onClick={() => handleExport('PDF')}
                  disabled={loading}
                >
                  {t('reports.exportPDF') || 'Export PDF'}
                </Button>
                <Button
                  variant="outlined"
                  startIcon={<DownloadIcon />}
                  onClick={() => handleExport('Excel')}
                  disabled={loading}
                >
                  {t('reports.exportExcel') || 'Export Excel'}
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
