/**
 * 航班列表组件
 * 显示搜索结果中的航班列表
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Chip,
  Button,
  Divider,
  Avatar,
} from '@mui/material';
import {
  Flight as FlightIcon,
  Schedule as ScheduleIcon,
  AttachMoney as MoneyIcon,
} from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import dayjs from 'dayjs';
import { getAirportInfo, getAirlineInfo, getAircraftName } from '../../utils/flightUtils';

const FlightList = ({ flights, searchParams, originLocation, destinationLocation, isRoundTrip, onSelectFlight }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [airportInfoMap, setAirportInfoMap] = useState(new Map());
  const [airlineLogoErrors, setAirlineLogoErrors] = useState(new Set());

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

  // 获取所有航班中使用的机场代码
  useEffect(() => {
    const fetchAirportInfo = async () => {
      const airportCodes = new Set();
      
      flights.forEach(flight => {
        flight.itineraries?.forEach(itinerary => {
          itinerary.segments?.forEach(segment => {
            if (segment.departure?.iataCode) {
              airportCodes.add(segment.departure.iataCode);
            }
            if (segment.arrival?.iataCode) {
              airportCodes.add(segment.arrival.iataCode);
            }
          });
        });
      });

      // 串行获取机场信息，避免并发过多触发速率限制
      const infoMap = new Map();
      const codesArray = Array.from(airportCodes);
      
      for (const code of codesArray) {
        try {
          const info = await getAirportInfo(code);
          infoMap.set(code, info);
        } catch (error) {
          console.warn(`Failed to fetch airport info for ${code}:`, error);
          // 设置默认值
          infoMap.set(code, { name: code, city: '' });
        }
      }

      setAirportInfoMap(infoMap);
    };

    if (flights.length > 0) {
      fetchAirportInfo();
    }
  }, [flights]);

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
                          {itinerary.segments && itinerary.segments.map((segment, segIdx) => {
                            const departureCode = segment.departure?.iataCode;
                            const arrivalCode = segment.arrival?.iataCode;
                            const departureInfo = airportInfoMap.get(departureCode) || { name: departureCode, city: '' };
                            const arrivalInfo = airportInfoMap.get(arrivalCode) || { name: arrivalCode, city: '' };
                            const airlineInfo = getAirlineInfo(segment.carrierCode);
                            const aircraftName = getAircraftName(segment.aircraft?.code);

                            return (
                              <Box key={segIdx} sx={{ mb: 2 }}>
                                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                                  {/* 出发地 */}
                                  <Box sx={{ minWidth: 100 }}>
                                    <Typography variant="h6" color="primary" sx={{ fontWeight: 600 }}>
                                      {departureInfo.city || departureInfo.name || departureCode}
                                    </Typography>
                                    <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.75rem', fontWeight: 500 }}>
                                      {departureCode}
                                    </Typography>
                                    <Typography variant="caption" color="text.secondary">
                                      {dayjs(segment.departure?.at).format('HH:mm')}
                                    </Typography>
                                  </Box>

                                  {/* 中间：航空公司信息和飞行时间 */}
                                  <Box sx={{ flex: 1, mx: 2 }}>
                                    {/* 航空公司信息 */}
                                    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mb: 0.5 }}>
                                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 0.5 }}>
                                        {airlineInfo.logo && !airlineLogoErrors.has(segment.carrierCode) ? (
                                          <Avatar
                                            src={airlineInfo.logo}
                                            alt={airlineInfo.name}
                                            sx={{ 
                                              width: 32, 
                                              height: 32, 
                                              mr: 0.5,
                                              bgcolor: 'transparent',
                                              '& img': {
                                                objectFit: 'contain',
                                                width: '100%',
                                                height: '100%'
                                              }
                                            }}
                                            imgProps={{
                                              onError: (e) => {
                                                console.warn(`[FlightList] Logo加载失败: ${segment.carrierCode} - ${airlineInfo.logo}`);
                                                setAirlineLogoErrors(prev => new Set(prev).add(segment.carrierCode));
                                              },
                                              loading: 'lazy'
                                            }}
                                          />
                                        ) : (
                                          <Box
                                            sx={{
                                              width: 32,
                                              height: 32,
                                              borderRadius: '50%',
                                              bgcolor: 'primary.light',
                                              display: 'flex',
                                              alignItems: 'center',
                                              justifyContent: 'center',
                                              mr: 0.5,
                                              color: 'primary.main',
                                              fontSize: '0.75rem',
                                              fontWeight: 600
                                            }}
                                          >
                                            {segment.carrierCode}
                                          </Box>
                                        )}
                                        <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500 }}>
                                          {airlineInfo.name || segment.carrierCode}
                                        </Typography>
                                      </Box>
                                      {/* 航班号 */}
                                      {segment.number && (
                                        <Typography variant="body2" color="primary" sx={{ fontWeight: 600, fontSize: '0.875rem' }}>
                                          {segment.carrierCode} {segment.number}
                                        </Typography>
                                      )}
                                    </Box>
                                    
                                    {/* 飞行时间和飞机型号 */}
                                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
                                      <Typography variant="caption" color="text.secondary">
                                        {formatDuration(itinerary.duration)}
                                      </Typography>
                                      {aircraftName && (
                                        <>
                                          <Typography variant="caption" color="text.secondary">•</Typography>
                                          <Typography variant="caption" color="text.secondary">
                                            {aircraftName}
                                          </Typography>
                                        </>
                                      )}
                                    </Box>
                                  </Box>

                                  {/* 目的地 */}
                                  <Box sx={{ minWidth: 100, textAlign: 'right' }}>
                                    <Typography variant="h6" color="primary" sx={{ fontWeight: 600 }}>
                                      {arrivalInfo.city || arrivalInfo.name || arrivalCode}
                                    </Typography>
                                    <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.75rem', fontWeight: 500 }}>
                                      {arrivalCode}
                                    </Typography>
                                    <Typography variant="caption" color="text.secondary">
                                      {dayjs(segment.arrival?.at).format('HH:mm')}
                                    </Typography>
                                  </Box>
                                </Box>
                              </Box>
                            );
                          })}
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
                        <Box sx={{ display: 'flex', gap: 1 }}>
                          <Button
                            variant="contained"
                            onClick={(e) => {
                              e.stopPropagation();
                              onSelectFlight && onSelectFlight(flight);
                            }}
                          >
                            {t('flight.list.select') || '选择'}
                          </Button>
                          <Button
                            variant="outlined"
                            onClick={(e) => {
                              e.stopPropagation();
                              // 传递搜索结果和搜索条件，以便返回时恢复
                              navigate('/flight/detail', { 
                                state: { 
                                  flight, 
                                  searchParams,
                                  searchResults: flights,
                                  originLocation: originLocation,
                                  destinationLocation: destinationLocation,
                                  isRoundTrip: isRoundTrip
                                } 
                              });
                            }}
                          >
                            {t('flight.list.viewDetail') || '查看详情'}
                          </Button>
                        </Box>
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

