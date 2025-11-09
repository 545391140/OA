import React, { useState, useEffect } from 'react';
import {
  Container,
  Box,
  Typography,
  Paper,
  Grid,
  Card,
  CardContent,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  CircularProgress,
  Alert
} from '@mui/material';
import {
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  CheckCircle as ApprovedIcon,
  Cancel as RejectedIcon,
  HourglassEmpty as PendingIcon,
  Speed as SpeedIcon
} from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import { useNotification } from '../../contexts/NotificationContext';
import apiClient from '../../utils/axiosConfig';
import {
  LineChart,
  Line,
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
import dayjs from 'dayjs';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

const ApprovalStatistics = () => {
  const { t } = useTranslation();
  const { showNotification } = useNotification();
  const [loading, setLoading] = useState(false);
  const [dateRange, setDateRange] = useState({
    startDate: dayjs().subtract(30, 'day').format('YYYY-MM-DD'),
    endDate: dayjs().format('YYYY-MM-DD')
  });
  const [type, setType] = useState('all');
  const [statistics, setStatistics] = useState({
    travel: null,
    expense: null
  });
  const [approverWorkload, setApproverWorkload] = useState([]);
  const [trendData, setTrendData] = useState([]);

  useEffect(() => {
    fetchStatistics();
  }, [dateRange, type]);

  const fetchStatistics = async () => {
    try {
      setLoading(true);
      
      // 获取审批统计
      const statsResponse = await apiClient.get('/approvals/statistics', {
        params: {
          startDate: dateRange.startDate,
          endDate: dateRange.endDate,
          type: type === 'all' ? undefined : type
        }
      });

      if (statsResponse.data && statsResponse.data.success) {
        setStatistics(statsResponse.data.data);
      }

      // 获取审批人工作量
      const workloadResponse = await apiClient.get('/approvals/approver-workload', {
        params: {
          startDate: dateRange.startDate,
          endDate: dateRange.endDate
        }
      });

      if (workloadResponse.data && workloadResponse.data.success) {
        setApproverWorkload(workloadResponse.data.data || []);
      }

      // 获取趋势数据
      const trendResponse = await apiClient.get('/approvals/trend', {
        params: {
          startDate: dateRange.startDate,
          endDate: dateRange.endDate,
          type: type === 'all' ? undefined : type
        }
      });

      if (trendResponse.data && trendResponse.data.success) {
        setTrendData(trendResponse.data.data || []);
      }

    } catch (error) {
      console.error('Failed to fetch statistics:', error);
      showNotification('加载统计数据失败', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDateRangeChange = (field, value) => {
    setDateRange(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const renderStatCard = (title, value, icon, color, subtitle) => (
    <Card sx={{ height: '100%' }}>
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <Box>
            <Typography variant="caption" color="text.secondary" gutterBottom>
              {title}
            </Typography>
            <Typography variant="h4" fontWeight={600} color={color}>
              {value}
            </Typography>
            {subtitle && (
              <Typography variant="caption" color="text.secondary">
                {subtitle}
              </Typography>
            )}
          </Box>
          <Box
            sx={{
              bgcolor: `${color}.light`,
              borderRadius: 2,
              p: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            {icon}
          </Box>
        </Box>
      </CardContent>
    </Card>
  );

  const getApprovalRateColor = (rate) => {
    if (rate >= 80) return 'success.main';
    if (rate >= 60) return 'warning.main';
    return 'error.main';
  };

  const formatCurrency = (amount) => {
    return `¥${amount?.toLocaleString() || 0}`;
  };

  const formatDuration = (hours) => {
    if (hours < 24) return `${hours.toFixed(1)}小时`;
    return `${(hours / 24).toFixed(1)}天`;
  };

  const currentStats = type === 'travel' ? statistics.travel : 
                       type === 'expense' ? statistics.expense :
                       statistics.travel || statistics.expense;

  return (
    <Container maxWidth="xl" sx={{ py: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" fontWeight={600}>
          审批统计分析
        </Typography>
      </Box>

      {/* 筛选条件 */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} sm={3}>
            <TextField
              fullWidth
              label="开始日期"
              type="date"
              value={dateRange.startDate}
              onChange={(e) => handleDateRangeChange('startDate', e.target.value)}
              InputLabelProps={{ shrink: true }}
            />
          </Grid>
          <Grid item xs={12} sm={3}>
            <TextField
              fullWidth
              label="结束日期"
              type="date"
              value={dateRange.endDate}
              onChange={(e) => handleDateRangeChange('endDate', e.target.value)}
              InputLabelProps={{ shrink: true }}
            />
          </Grid>
          <Grid item xs={12} sm={3}>
            <FormControl fullWidth>
              <InputLabel>类型</InputLabel>
              <Select
                value={type}
                label="类型"
                onChange={(e) => setType(e.target.value)}
              >
                <MenuItem value="all">全部</MenuItem>
                <MenuItem value="travel">差旅</MenuItem>
                <MenuItem value="expense">费用</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={3}>
            <Button
              fullWidth
              variant="contained"
              onClick={fetchStatistics}
              disabled={loading}
            >
              {loading ? <CircularProgress size={24} /> : '查询'}
            </Button>
          </Grid>
        </Grid>
      </Paper>

      {loading && !currentStats ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 5 }}>
          <CircularProgress />
        </Box>
      ) : currentStats ? (
        <>
          {/* 统计卡片 */}
          <Grid container spacing={3} sx={{ mb: 3 }}>
            <Grid item xs={12} sm={6} md={3}>
              {renderStatCard(
                '待审批',
                currentStats.pending || 0,
                <PendingIcon sx={{ color: 'warning.main' }} />,
                'warning.main'
              )}
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              {renderStatCard(
                '已通过',
                currentStats.approved || 0,
                <ApprovedIcon sx={{ color: 'success.main' }} />,
                'success.main'
              )}
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              {renderStatCard(
                '已拒绝',
                currentStats.rejected || 0,
                <RejectedIcon sx={{ color: 'error.main' }} />,
                'error.main'
              )}
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              {renderStatCard(
                '通过率',
                `${currentStats.approvalRate?.toFixed(1) || 0}%`,
                <SpeedIcon sx={{ color: getApprovalRateColor(currentStats.approvalRate) }} />,
                getApprovalRateColor(currentStats.approvalRate)
              )}
            </Grid>
          </Grid>

          <Grid container spacing={3} sx={{ mb: 3 }}>
            <Grid item xs={12} sm={6} md={4}>
              <Card>
                <CardContent>
                  <Typography variant="caption" color="text.secondary" gutterBottom>
                    平均审批金额
                  </Typography>
                  <Typography variant="h5" fontWeight={600}>
                    {formatCurrency(currentStats.avgAmount)}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={4}>
              <Card>
                <CardContent>
                  <Typography variant="caption" color="text.secondary" gutterBottom>
                    平均审批时长
                  </Typography>
                  <Typography variant="h5" fontWeight={600}>
                    {formatDuration(currentStats.avgApprovalTime || 0)}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={4}>
              <Card>
                <CardContent>
                  <Typography variant="caption" color="text.secondary" gutterBottom>
                    总审批金额
                  </Typography>
                  <Typography variant="h5" fontWeight={600}>
                    {formatCurrency(currentStats.totalAmount)}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          {/* 审批状态分布饼图 */}
          <Grid container spacing={3} sx={{ mb: 3 }}>
            <Grid item xs={12} md={6}>
              <Paper sx={{ p: 3 }}>
                <Typography variant="h6" gutterBottom>
                  审批状态分布
                </Typography>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={[
                        { name: '待审批', value: currentStats.pending || 0 },
                        { name: '已通过', value: currentStats.approved || 0 },
                        { name: '已拒绝', value: currentStats.rejected || 0 }
                      ]}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {[0, 1, 2].map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </Paper>
            </Grid>

            {/* 审批趋势图 */}
            <Grid item xs={12} md={6}>
              <Paper sx={{ p: 3 }}>
                <Typography variant="h6" gutterBottom>
                  审批趋势
                </Typography>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={trendData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="approved" stroke="#00C49F" name="通过" />
                    <Line type="monotone" dataKey="rejected" stroke="#FF8042" name="拒绝" />
                    <Line type="monotone" dataKey="pending" stroke="#FFBB28" name="待审" />
                  </LineChart>
                </ResponsiveContainer>
              </Paper>
            </Grid>
          </Grid>

          {/* 审批人工作量统计 */}
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              审批人工作量统计
            </Typography>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>审批人</TableCell>
                    <TableCell align="right">待审批</TableCell>
                    <TableCell align="right">已审批</TableCell>
                    <TableCell align="right">通过</TableCell>
                    <TableCell align="right">拒绝</TableCell>
                    <TableCell align="right">通过率</TableCell>
                    <TableCell align="right">平均审批时长</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {approverWorkload.map((approver) => (
                    <TableRow key={approver._id}>
                      <TableCell>
                        <Typography variant="subtitle2">
                          {approver.approverName || '未知'}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Chip
                          label={approver.pending || 0}
                          size="small"
                          color="warning"
                        />
                      </TableCell>
                      <TableCell align="right">{approver.total || 0}</TableCell>
                      <TableCell align="right">
                        <Chip
                          label={approver.approved || 0}
                          size="small"
                          color="success"
                        />
                      </TableCell>
                      <TableCell align="right">
                        <Chip
                          label={approver.rejected || 0}
                          size="small"
                          color="error"
                        />
                      </TableCell>
                      <TableCell align="right">
                        <Typography
                          variant="body2"
                          color={getApprovalRateColor(approver.approvalRate)}
                          fontWeight={600}
                        >
                          {approver.approvalRate?.toFixed(1) || 0}%
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        {formatDuration(approver.avgApprovalTime || 0)}
                      </TableCell>
                    </TableRow>
                  ))}
                  {approverWorkload.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} align="center">
                        <Typography variant="body2" color="text.secondary">
                          暂无数据
                        </Typography>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </>
      ) : (
        <Alert severity="info">暂无统计数据</Alert>
      )}
    </Container>
  );
};

export default ApprovalStatistics;

