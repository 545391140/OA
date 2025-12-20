/**
 * 航班列表组件
 * 显示搜索结果中的航班列表
 */

import React from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Chip,
  Button,
  Divider,
} from '@mui/material';
import {
  Flight as FlightIcon,
  Schedule as ScheduleIcon,
  AttachMoney as MoneyIcon,
} from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import dayjs from 'dayjs';

const FlightList = ({ flights, searchParams, onSelectFlight }) => {
  const { t } = useTranslation();

  const formatDuration = (duration) => {
    // 将 PT14H30M 格式转换为 "14小时30分钟"
    const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?/);
    if (!match) return duration;
    
    const hours = match[1] || 0;
    const minutes = match[2] || 0;
    
    const parts = [];
    if (hours > 0) parts.push(`${hours}小时`);
    if (minutes > 0) parts.push(`${minutes}分钟`);
    
    return parts.join('') || '0分钟';
  };

  const formatPrice = (price) => {
    if (!price) return '-';
    return `${price.total} ${price.currency}`;
  };

  return (
    <Box sx={{ mt: 3 }}>
      <Typography variant="h6" sx={{ mb: 2 }}>
        {t('flight.list.results') || '搜索结果'} ({flights.length})
      </Typography>

      {flights.length === 0 ? (
        <Typography variant="body1" color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
          {t('flight.list.noResults') || '未找到符合条件的航班'}
        </Typography>
      ) : (
        <Grid container spacing={2}>
          {flights.map((flight, index) => (
            <Grid item xs={12} key={flight.id || index}>
              <Card
                sx={{
                  cursor: 'pointer',
                  '&:hover': {
                    boxShadow: 4,
                  },
                }}
                onClick={() => onSelectFlight && onSelectFlight(flight)}
              >
                <CardContent>
                  <Grid container spacing={2} alignItems="center">
                    {/* 航班信息 */}
                    <Grid item xs={12} md={6}>
                      {flight.itineraries && flight.itineraries.map((itinerary, idx) => (
                        <Box key={idx} sx={{ mb: idx > 0 ? 2 : 0 }}>
                          {itinerary.segments && itinerary.segments.map((segment, segIdx) => (
                            <Box key={segIdx} sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                              <Box sx={{ minWidth: 80 }}>
                                <Typography variant="h6" color="primary">
                                  {segment.departure?.iataCode}
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                  {dayjs(segment.departure?.at).format('HH:mm')}
                                </Typography>
                              </Box>
                              <Box sx={{ flex: 1, mx: 2, textAlign: 'center' }}>
                                <Typography variant="caption" color="text.secondary">
                                  {formatDuration(itinerary.duration)}
                                </Typography>
                                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', mt: 0.5 }}>
                                  <FlightIcon sx={{ fontSize: 16, color: 'text.secondary', mr: 0.5 }} />
                                  <Typography variant="caption" color="text.secondary">
                                    {segment.carrierCode} {segment.number}
                                  </Typography>
                                </Box>
                              </Box>
                              <Box sx={{ minWidth: 80, textAlign: 'right' }}>
                                <Typography variant="h6" color="primary">
                                  {segment.arrival?.iataCode}
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                  {dayjs(segment.arrival?.at).format('HH:mm')}
                                </Typography>
                              </Box>
                            </Box>
                          ))}
                        </Box>
                      ))}
                    </Grid>

                    {/* 价格和操作 */}
                    <Grid item xs={12} md={6}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Box>
                          <Typography variant="h5" color="primary">
                            {formatPrice(flight.price)}
                          </Typography>
                          {flight.numberOfBookableSeats && (
                            <Typography variant="caption" color="text.secondary">
                              {t('flight.list.availableSeats') || '可预订座位'}: {flight.numberOfBookableSeats}
                            </Typography>
                          )}
                        </Box>
                        <Button
                          variant="contained"
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectFlight && onSelectFlight(flight);
                          }}
                        >
                          {t('flight.list.select') || '选择'}
                        </Button>
                      </Box>
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}
    </Box>
  );
};

export default FlightList;

