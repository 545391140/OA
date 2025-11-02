import React, { useState } from 'react';
import {
  Container,
  Paper,
  Box,
  Typography,
  Grid,
  TextField,
  Button,
  Card,
  CardContent,
  Chip,
  Alert,
  CircularProgress,
  Divider
} from '@mui/material';
import {
  Flight as FlightIcon,
  Hotel as HotelIcon,
  Restaurant as RestaurantIcon,
  LocalTaxi as TaxiIcon,
  QueryBuilder as QueryIcon
} from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import apiClient from '../../utils/axiosConfig';
import { useAuth } from '../../contexts/AuthContext';
import RegionSelector from '../../components/Common/RegionSelector';

const StandardQuery = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [standardData, setStandardData] = useState(null);
  const [error, setError] = useState(null);
  const [queryParams, setQueryParams] = useState({
    destination: '',
    startDate: new Date().toISOString().split('T')[0],
    transportType: 'flight',
    days: 1
  });

  const handleQuery = async () => {
    if (!queryParams.destination) {
      setError('请选择目的地');
      return;
    }

    setLoading(true);
    setError(null);
    setStandardData(null);

    try {
      const response = await apiClient.post('/standard-match/match', {
        destination: queryParams.destination.split(',')[0], // 提取城市名
        startDate: queryParams.startDate,
        transportType: queryParams.transportType,
        days: parseInt(queryParams.days) || 1
      });

      if (response.data.success) {
        setStandardData(response.data.data);
      } else {
        setError(response.data.message || '查询失败');
      }
    } catch (err) {
      console.error('Query standard error:', err);
      setError(err.response?.data?.message || '查询标准时出错');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount) => {
    return `¥${amount.toFixed(2)}`;
  };

  const getCityLevelName = (level) => {
    const levelMap = {
      1: '一线城市',
      2: '二线城市',
      3: '三线城市',
      4: '其他城市'
    };
    return levelMap[level] || '其他城市';
  };

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Paper elevation={3} sx={{ p: 4 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
          <QueryIcon sx={{ fontSize: 32, mr: 2, color: 'primary.main' }} />
          <Typography variant="h4" component="h1">
            我的差旅标准查询
          </Typography>
        </Box>

        {/* 查询表单 */}
        <Paper variant="outlined" sx={{ p: 3, mb: 3 }}>
          <Typography variant="h6" gutterBottom>
            出差信息
          </Typography>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <RegionSelector
                label="目的地"
                value={queryParams.destination}
                onChange={(value) => {
                  const cityName = typeof value === 'object' && value.city
                    ? `${value.city}, ${value.country}`
                    : value;
                  setQueryParams({ ...queryParams, destination: cityName });
                }}
                transportationType="flight"
              />
            </Grid>
            <Grid item xs={12} md={3}>
              <TextField
                fullWidth
                label="出发日期"
                type="date"
                value={queryParams.startDate}
                onChange={(e) => setQueryParams({ ...queryParams, startDate: e.target.value })}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12} md={3}>
              <TextField
                fullWidth
                label="出差天数"
                type="number"
                value={queryParams.days}
                onChange={(e) => setQueryParams({ ...queryParams, days: e.target.value })}
                inputProps={{ min: 1 }}
              />
            </Grid>
          </Grid>
          <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end' }}>
            <Button
              variant="contained"
              onClick={handleQuery}
              disabled={loading}
              startIcon={loading ? <CircularProgress size={20} /> : <QueryIcon />}
            >
              查询标准
            </Button>
          </Box>
        </Paper>

        {/* 错误提示 */}
        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        {/* 标准详情 */}
        {standardData && (
          <Box>
            <Alert severity="success" sx={{ mb: 3 }}>
              已找到适用标准: {standardData.standard.name} (版本 {standardData.standard.version})
            </Alert>

            {/* 用户信息 */}
            <Card sx={{ mb: 3 }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  您的信息
                </Typography>
                <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                  <Chip label={`职级: ${standardData.userInfo.jobLevel || '未设置'}`} color="primary" />
                  {standardData.userInfo.cityInfo && (
                    <Chip
                      label={`目的地级别: ${standardData.userInfo.cityInfo.levelName}`}
                      color="secondary"
                    />
                  )}
                  {standardData.userInfo.cityInfo && (
                    <Chip
                      label={`城市: ${standardData.userInfo.cityInfo.name}`}
                      variant="outlined"
                    />
                  )}
                </Box>
              </CardContent>
            </Card>

            <Grid container spacing={3}>
              {/* 交通标准 */}
              {standardData.transport && (
                <Grid item xs={12} md={6}>
                  <Card>
                    <CardContent>
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                        <FlightIcon sx={{ mr: 1, color: 'primary.main' }} />
                        <Typography variant="h6">交通标准</Typography>
                      </Box>
                      <Box sx={{ pl: 4 }}>
                        <Typography variant="body2" color="text.secondary" gutterBottom>
                          交通工具: {standardData.transport.type === 'flight' ? '飞机' : 
                                   standardData.transport.type === 'train' ? '火车' : 
                                   standardData.transport.type}
                        </Typography>
                        <Typography variant="body2" color="text.secondary" gutterBottom>
                          座位等级: {standardData.transport.seatClass}
                        </Typography>
                        <Typography variant="h6" color="primary" sx={{ mt: 1 }}>
                          最高限额: {formatCurrency(standardData.transport.maxAmount)}/次
                        </Typography>
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
              )}

              {/* 住宿标准 */}
              {standardData.accommodation && (
                <Grid item xs={12} md={6}>
                  <Card>
                    <CardContent>
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                        <HotelIcon sx={{ mr: 1, color: 'primary.main' }} />
                        <Typography variant="h6">住宿标准</Typography>
                      </Box>
                      <Box sx={{ pl: 4 }}>
                        <Typography variant="h6" color="primary">
                          最高 {formatCurrency(standardData.accommodation.maxAmountPerNight)}/晚
                        </Typography>
                        {standardData.accommodation.starLevel && (
                          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                            建议星级: {standardData.accommodation.starLevel}
                          </Typography>
                        )}
                        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                          {standardData.accommodation.nights}晚合计: {formatCurrency(standardData.accommodation.totalAmount)}
                        </Typography>
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
              )}

              {/* 餐饮标准 */}
              {standardData.meal && (
                <Grid item xs={12} md={6}>
                  <Card>
                    <CardContent>
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                        <RestaurantIcon sx={{ mr: 1, color: 'primary.main' }} />
                        <Typography variant="h6">餐饮标准</Typography>
                      </Box>
                      <Box sx={{ pl: 4 }}>
                        <Box sx={{ display: 'flex', gap: 2, mb: 1 }}>
                          <Typography variant="body2">
                            早餐: {formatCurrency(standardData.meal.breakfast)}
                          </Typography>
                          <Typography variant="body2">
                            午餐: {formatCurrency(standardData.meal.lunch)}
                          </Typography>
                          <Typography variant="body2">
                            晚餐: {formatCurrency(standardData.meal.dinner)}
                          </Typography>
                        </Box>
                        <Typography variant="h6" color="primary" sx={{ mt: 1 }}>
                          每日合计: {formatCurrency(standardData.meal.dailyTotal)}
                        </Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                          {standardData.meal.days}天合计: {formatCurrency(standardData.meal.totalAmount)}
                        </Typography>
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
              )}

              {/* 其他补贴 */}
              {standardData.allowances && standardData.allowances.length > 0 && (
                <Grid item xs={12} md={6}>
                  <Card>
                    <CardContent>
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                        <TaxiIcon sx={{ mr: 1, color: 'primary.main' }} />
                        <Typography variant="h6">其他补贴</Typography>
                      </Box>
                      <Box sx={{ pl: 4 }}>
                        {standardData.allowances.map((allowance, index) => (
                          <Box key={index} sx={{ mb: 1 }}>
                            <Typography variant="body2">
                              {allowance.type}: {formatCurrency(allowance.amount)}
                              {allowance.amountType === 'daily' && '/天'}
                              {allowance.amountType === 'per_trip' && '/次'}
                            </Typography>
                            {allowance.amountType === 'daily' && (
                              <Typography variant="body2" color="text.secondary">
                                小计: {formatCurrency(allowance.total)}
                              </Typography>
                            )}
                          </Box>
                        ))}
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
              )}
            </Grid>

            {/* 费用预估 */}
            {standardData.estimatedCost && (
              <Card sx={{ mt: 3, bgcolor: 'primary.light', color: 'primary.contrastText' }}>
                <CardContent>
                  <Typography variant="h5" gutterBottom>
                    预估费用
                  </Typography>
                  <Divider sx={{ my: 2, bgcolor: 'rgba(255,255,255,0.3)' }} />
                  <Grid container spacing={2}>
                    <Grid item xs={6} md={3}>
                      <Typography variant="body2">交通</Typography>
                      <Typography variant="h6">{formatCurrency(standardData.estimatedCost.transport)}</Typography>
                    </Grid>
                    <Grid item xs={6} md={3}>
                      <Typography variant="body2">住宿</Typography>
                      <Typography variant="h6">{formatCurrency(standardData.estimatedCost.accommodation)}</Typography>
                    </Grid>
                    <Grid item xs={6} md={3}>
                      <Typography variant="body2">餐饮</Typography>
                      <Typography variant="h6">{formatCurrency(standardData.estimatedCost.meal)}</Typography>
                    </Grid>
                    <Grid item xs={6} md={3}>
                      <Typography variant="body2">其他</Typography>
                      <Typography variant="h6">{formatCurrency(standardData.estimatedCost.allowance)}</Typography>
                    </Grid>
                    <Grid item xs={12}>
                      <Divider sx={{ my: 2, bgcolor: 'rgba(255,255,255,0.3)' }} />
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Typography variant="h6">总计</Typography>
                        <Typography variant="h4">{formatCurrency(standardData.estimatedCost.total)}</Typography>
                      </Box>
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>
            )}
          </Box>
        )}
      </Paper>
    </Container>
  );
};

export default StandardQuery;

