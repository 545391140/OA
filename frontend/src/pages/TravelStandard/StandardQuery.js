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
import RegionSelector from '../../components/Common/RegionSelector';

const StandardQuery = () => {
  const { t } = useTranslation();
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
      setError(t('travelStandard.query.selectDestination'));
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
        setError(response.data.message || t('travelStandard.query.queryFailed'));
      }
    } catch (err) {
      console.error('Query standard error:', err);
      setError(err.response?.data?.message || t('travelStandard.query.queryError'));
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount) => {
    return `¥${amount.toFixed(2)}`;
  };

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Paper elevation={3} sx={{ p: 4 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
          <QueryIcon sx={{ fontSize: 32, mr: 2, color: 'primary.main' }} />
          <Typography variant="h4" component="h1">
            {t('travelStandard.query.title')}
          </Typography>
        </Box>

        {/* 查询表单 */}
        <Paper variant="outlined" sx={{ p: 3, mb: 3 }}>
          <Typography variant="h6" gutterBottom>
            {t('travelStandard.query.tripInfo')}
          </Typography>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <RegionSelector
                label={t('travelStandard.query.destination')}
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
                label={t('travelStandard.query.departureDate')}
                type="date"
                value={queryParams.startDate}
                onChange={(e) => setQueryParams({ ...queryParams, startDate: e.target.value })}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12} md={3}>
              <TextField
                fullWidth
                label={t('travelStandard.query.tripDays')}
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
              {t('travelStandard.query.queryStandard')}
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
              {t('travelStandard.query.standardFound')}: {standardData.standard.name} ({t('travelStandard.query.version')} {standardData.standard.version})
            </Alert>

            {/* 用户信息 */}
            <Card sx={{ mb: 3 }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  {t('travelStandard.query.yourInfo')}
                </Typography>
                <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                  <Chip 
                    label={`${t('travelStandard.query.jobLevel')}: ${
                      standardData.userInfo.jobLevel 
                        ? (t(`travelStandard.query.jobLevels.${standardData.userInfo.jobLevel}`) || standardData.userInfo.jobLevel)
                        : t('travelStandard.query.notSet')
                    }`} 
                    color="primary" 
                  />
                  {standardData.userInfo.cityInfo && (
                    <Chip
                      label={`${t('travelStandard.query.destinationLevel')}: ${standardData.userInfo.cityInfo.levelName}`}
                      color="secondary"
                    />
                  )}
                  {standardData.userInfo.cityInfo && (
                    <Chip
                      label={`${t('travelStandard.query.city')}: ${standardData.userInfo.cityInfo.name}`}
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
                        <Typography variant="h6">{t('travelStandard.query.transportStandard')}</Typography>
                      </Box>
                      <Box sx={{ pl: 4 }}>
                        <Typography variant="body2" color="text.secondary" gutterBottom>
                          {t('travelStandard.query.transportType')}: {t(`travelStandard.query.transportTypes.${standardData.transport.type}`) || standardData.transport.type}
                        </Typography>
                        <Typography variant="body2" color="text.secondary" gutterBottom>
                          {t('travelStandard.query.seatClass')}: {standardData.transport.seatClass}
                        </Typography>
                        <Typography variant="h6" color="primary" sx={{ mt: 1 }}>
                          {t('travelStandard.query.maxAmount')}: {formatCurrency(standardData.transport.maxAmount)}{t('travelStandard.query.perTrip')}
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
                        <Typography variant="h6">{t('travelStandard.query.accommodationStandard')}</Typography>
                      </Box>
                      <Box sx={{ pl: 4 }}>
                        <Typography variant="h6" color="primary">
                          {t('travelStandard.query.max')} {formatCurrency(standardData.accommodation.maxAmountPerNight)}{t('travelStandard.query.perNight')}
                        </Typography>
                        {standardData.accommodation.starLevel && (
                          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                            {t('travelStandard.query.suggestedStarLevel')}: {standardData.accommodation.starLevel}
                          </Typography>
                        )}
                        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                          {standardData.accommodation.nights}{t('travelStandard.query.nightsTotal')}: {formatCurrency(standardData.accommodation.totalAmount)}
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
                        <Typography variant="h6">{t('travelStandard.query.mealStandard')}</Typography>
                      </Box>
                      <Box sx={{ pl: 4 }}>
                        <Box sx={{ display: 'flex', gap: 2, mb: 1 }}>
                          <Typography variant="body2">
                            {t('travelStandard.query.breakfast')}: {formatCurrency(standardData.meal.breakfast)}
                          </Typography>
                          <Typography variant="body2">
                            {t('travelStandard.query.lunch')}: {formatCurrency(standardData.meal.lunch)}
                          </Typography>
                          <Typography variant="body2">
                            {t('travelStandard.query.dinner')}: {formatCurrency(standardData.meal.dinner)}
                          </Typography>
                        </Box>
                        <Typography variant="h6" color="primary" sx={{ mt: 1 }}>
                          {t('travelStandard.query.dailyTotal')}: {formatCurrency(standardData.meal.dailyTotal)}
                        </Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                          {standardData.meal.days}{t('travelStandard.query.daysTotal')}: {formatCurrency(standardData.meal.totalAmount)}
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
                        <Typography variant="h6">{t('travelStandard.query.otherAllowances')}</Typography>
                      </Box>
                      <Box sx={{ pl: 4 }}>
                        {standardData.allowances.map((allowance, index) => (
                          <Box key={index} sx={{ mb: 1 }}>
                            <Typography variant="body2">
                              {allowance.type}: {formatCurrency(allowance.amount)}
                              {allowance.amountType === 'daily' && t('travelStandard.query.perDay')}
                              {allowance.amountType === 'per_trip' && t('travelStandard.query.perTrip')}
                            </Typography>
                            {allowance.amountType === 'daily' && (
                              <Typography variant="body2" color="text.secondary">
                                {t('travelStandard.query.subtotal')}: {formatCurrency(allowance.total)}
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
                    {t('travelStandard.query.estimatedCost')}
                  </Typography>
                  <Divider sx={{ my: 2, bgcolor: 'rgba(255,255,255,0.3)' }} />
                  <Grid container spacing={2}>
                    <Grid item xs={6} md={3}>
                      <Typography variant="body2">{t('travelStandard.query.transport')}</Typography>
                      <Typography variant="h6">{formatCurrency(standardData.estimatedCost.transport)}</Typography>
                    </Grid>
                    <Grid item xs={6} md={3}>
                      <Typography variant="body2">{t('travelStandard.query.accommodation')}</Typography>
                      <Typography variant="h6">{formatCurrency(standardData.estimatedCost.accommodation)}</Typography>
                    </Grid>
                    <Grid item xs={6} md={3}>
                      <Typography variant="body2">{t('travelStandard.query.meal')}</Typography>
                      <Typography variant="h6">{formatCurrency(standardData.estimatedCost.meal)}</Typography>
                    </Grid>
                    <Grid item xs={6} md={3}>
                      <Typography variant="body2">{t('travelStandard.query.other')}</Typography>
                      <Typography variant="h6">{formatCurrency(standardData.estimatedCost.allowance)}</Typography>
                    </Grid>
                    <Grid item xs={12}>
                      <Divider sx={{ my: 2, bgcolor: 'rgba(255,255,255,0.3)' }} />
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Typography variant="h6">{t('travelStandard.query.total')}</Typography>
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

