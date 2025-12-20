/**
 * 航班列表组件
 * 显示搜索结果中的航班列表
 */

import React, { useState, useEffect, useMemo } from 'react';
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
import FlightFilterBar from './FlightFilterBar';

const FlightList = ({ flights, searchParams, originLocation, destinationLocation, isRoundTrip, onSelectFlight }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [airportInfoMap, setAirportInfoMap] = useState(new Map());
  const [airlineLogoErrors, setAirlineLogoErrors] = useState(new Set());
  
  // 过滤和排序状态
  const [filters, setFilters] = useState({
    directOnly: false,
    transfer: null,
    airlines: [],
    timeRange: null,
    airport: null,
    cabin: null,
  });
  const [sortType, setSortType] = useState('price-low');

  const formatDuration = (duration) => {
    // 将 PT14H30M 格式转换为 "14小时30分钟"
    const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?/);
    if (!match) return duration;
    
    const hours = match[1] || 0;
    const minutes = match[2] || 0;
    
    const parts = [];
    if (hours > 0) parts.push(`${hours}${t('flight.list.hours') || '小时'}`);
    if (minutes > 0) parts.push(`${minutes}${t('flight.list.minutes') || '分钟'}`);
    
    return parts.join('') || `0${t('flight.list.minutes') || '分钟'}`;
  };

  // 计算中转时间
  const calculateTransferTime = (arrivalTime, nextDepartureTime) => {
    if (!arrivalTime || !nextDepartureTime) return null;
    const arrival = dayjs(arrivalTime);
    const departure = dayjs(nextDepartureTime);
    const diffMinutes = departure.diff(arrival, 'minute');
    
    if (diffMinutes < 0) return null;
    
    const hours = Math.floor(diffMinutes / 60);
    const minutes = diffMinutes % 60;
    
    const parts = [];
    if (hours > 0) parts.push(`${hours}${t('flight.list.hours') || '小时'}`);
    if (minutes > 0) parts.push(`${minutes}${t('flight.list.minutes') || '分钟'}`);
    
    return parts.join('') || `0${t('flight.list.minutes') || '分钟'}`;
  };

  // 检查是否跨天
  const getDayOffset = (departureTime, arrivalTime) => {
    if (!departureTime || !arrivalTime) return null;
    const departure = dayjs(departureTime);
    const arrival = dayjs(arrivalTime);
    const daysDiff = arrival.diff(departure, 'day');
    return daysDiff > 0 ? daysDiff : null;
  };

  const formatPrice = (price) => {
    if (!price) return '-';
    return `${price.total} ${price.currency}`;
  };

  // 检查航班是否直飞
  const isDirectFlight = (flight) => {
    return flight.itineraries?.every(itinerary => 
      itinerary.segments?.length === 1
    ) || false;
  };

  // 检查航班是否包含指定航空公司
  const hasAirline = (flight, airlineCodes) => {
    if (!airlineCodes || airlineCodes.length === 0) return true;
    return flight.itineraries?.some(itinerary =>
      itinerary.segments?.some(segment =>
        airlineCodes.includes(segment.carrierCode)
      )
    ) || false;
  };

  // 检查航班时间是否在指定范围内
  const isInTimeRange = (flight, timeRange) => {
    if (!timeRange) return true;
    const range = {
      'morning': { start: 6, end: 12 },
      'afternoon': { start: 12, end: 18 },
      'evening': { start: 18, end: 24 },
      'night': { start: 0, end: 6 },
    }[timeRange];
    if (!range) return true;

    return flight.itineraries?.some(itinerary => {
      const firstSegment = itinerary.segments?.[0];
      if (!firstSegment?.departure?.at) return false;
      const hour = dayjs(firstSegment.departure.at).hour();
      if (range.start < range.end) {
        return hour >= range.start && hour < range.end;
      } else {
        // 跨夜情况（night: 0-6）
        return hour >= range.start || hour < range.end;
      }
    }) || false;
  };

  // 检查航班是否经过指定机场
  const passesThroughAirport = (flight, airportCode) => {
    if (!airportCode) return true;
    return flight.itineraries?.some(itinerary =>
      itinerary.segments?.some(segment =>
        segment.departure?.iataCode === airportCode ||
        segment.arrival?.iataCode === airportCode
      )
    ) || false;
  };

  // 检查航班舱位等级
  const hasCabinClass = (flight, cabinClass) => {
    if (!cabinClass) return true;
    return flight.itineraries?.some(itinerary =>
      itinerary.segments?.some(segment =>
        segment.cabin === cabinClass
      )
    ) || false;
  };

  // 过滤航班
  const filteredFlights = useMemo(() => {
    return flights.filter(flight => {
      // 直飞筛选
      if (filters.directOnly && !isDirectFlight(flight)) {
        return false;
      }

      // 中转筛选
      if (filters.transfer === 'direct' && !isDirectFlight(flight)) {
        return false;
      }
      if (filters.transfer === 'transfer' && isDirectFlight(flight)) {
        return false;
      }

      // 航空公司筛选
      if (!hasAirline(flight, filters.airlines)) {
        return false;
      }

      // 时间范围筛选
      if (!isInTimeRange(flight, filters.timeRange)) {
        return false;
      }

      // 机场筛选
      if (!passesThroughAirport(flight, filters.airport)) {
        return false;
      }

      // 舱位筛选
      if (!hasCabinClass(flight, filters.cabin)) {
        return false;
      }

      return true;
    });
  }, [flights, filters]);

  // 排序航班
  const sortedFlights = useMemo(() => {
    const sorted = [...filteredFlights];
    
    sorted.sort((a, b) => {
      switch (sortType) {
        case 'price-low': {
          const priceA = parseFloat(a.price?.total || 0);
          const priceB = parseFloat(b.price?.total || 0);
          return priceA - priceB;
        }
        case 'price-high': {
          const priceA = parseFloat(a.price?.total || 0);
          const priceB = parseFloat(b.price?.total || 0);
          return priceB - priceA;
        }
        case 'departure-early': {
          const timeA = a.itineraries?.[0]?.segments?.[0]?.departure?.at;
          const timeB = b.itineraries?.[0]?.segments?.[0]?.departure?.at;
          if (!timeA) return 1;
          if (!timeB) return -1;
          return dayjs(timeA).valueOf() - dayjs(timeB).valueOf();
        }
        case 'departure-late': {
          const timeA = a.itineraries?.[0]?.segments?.[0]?.departure?.at;
          const timeB = b.itineraries?.[0]?.segments?.[0]?.departure?.at;
          if (!timeA) return 1;
          if (!timeB) return -1;
          return dayjs(timeB).valueOf() - dayjs(timeA).valueOf();
        }
        case 'arrival-early': {
          const lastSegmentA = a.itineraries?.[0]?.segments?.[a.itineraries[0].segments.length - 1];
          const lastSegmentB = b.itineraries?.[0]?.segments?.[b.itineraries[0].segments.length - 1];
          const timeA = lastSegmentA?.arrival?.at;
          const timeB = lastSegmentB?.arrival?.at;
          if (!timeA) return 1;
          if (!timeB) return -1;
          return dayjs(timeA).valueOf() - dayjs(timeB).valueOf();
        }
        case 'arrival-late': {
          const lastSegmentA = a.itineraries?.[0]?.segments?.[a.itineraries[0].segments.length - 1];
          const lastSegmentB = b.itineraries?.[0]?.segments?.[b.itineraries[0].segments.length - 1];
          const timeA = lastSegmentA?.arrival?.at;
          const timeB = lastSegmentB?.arrival?.at;
          if (!timeA) return 1;
          if (!timeB) return -1;
          return dayjs(timeB).valueOf() - dayjs(timeA).valueOf();
        }
        case 'duration-short': {
          const durationA = a.itineraries?.[0]?.duration || '';
          const durationB = b.itineraries?.[0]?.duration || '';
          const matchA = durationA.match(/PT(?:(\d+)H)?(?:(\d+)M)?/);
          const matchB = durationB.match(/PT(?:(\d+)H)?(?:(\d+)M)?/);
          const minutesA = (parseInt(matchA?.[1] || 0) * 60) + parseInt(matchA?.[2] || 0);
          const minutesB = (parseInt(matchB?.[1] || 0) * 60) + parseInt(matchB?.[2] || 0);
          return minutesA - minutesB;
        }
        case 'duration-long': {
          const durationA = a.itineraries?.[0]?.duration || '';
          const durationB = b.itineraries?.[0]?.duration || '';
          const matchA = durationA.match(/PT(?:(\d+)H)?(?:(\d+)M)?/);
          const matchB = durationB.match(/PT(?:(\d+)H)?(?:(\d+)M)?/);
          const minutesA = (parseInt(matchA?.[1] || 0) * 60) + parseInt(matchA?.[2] || 0);
          const minutesB = (parseInt(matchB?.[1] || 0) * 60) + parseInt(matchB?.[2] || 0);
          return minutesB - minutesA;
        }
        default:
          return 0;
      }
    });

    return sorted;
  }, [filteredFlights, sortType]);

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
        {t('flight.list.results') || '搜索结果'} ({sortedFlights.length})
      </Typography>

      {/* 过滤和排序栏 */}
      {flights.length > 0 && (
        <FlightFilterBar
          flights={flights}
          onFilterChange={setFilters}
          onSortChange={setSortType}
        />
      )}

      {sortedFlights.length === 0 ? (
        <Typography variant="body1" color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
          {t('flight.list.noResults') || '未找到符合条件的航班'}
        </Typography>
      ) : (
        <Grid container spacing={2}>
          {sortedFlights.map((flight, index) => (
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
                <CardContent sx={{ py: 2 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: 1.5, md: 2 }, flexWrap: { xs: 'wrap', md: 'nowrap' }, '& > *:nth-of-type(3)': { mr: { xs: 0, md: 2 } } }}>
                    {flight.itineraries && flight.itineraries.map((itinerary, idx) => {
                      const segments = itinerary.segments || [];
                      const firstSegment = segments[0];
                      const lastSegment = segments[segments.length - 1];
                      
                      if (!firstSegment || !lastSegment) return null;
                      
                      const isTransfer = segments.length > 1;
                      const transferCount = segments.length - 1;
                      
                      // 计算中转时间（如果有中转）
                      let transferTimes = [];
                      if (isTransfer) {
                        for (let i = 0; i < segments.length - 1; i++) {
                          const currentArrival = segments[i].arrival?.at;
                          const nextDeparture = segments[i + 1].departure?.at;
                          const transferTime = calculateTransferTime(currentArrival, nextDeparture);
                          if (transferTime) {
                            transferTimes.push({
                              time: transferTime,
                              transferAirport: segments[i].arrival?.iataCode,
                            });
                          }
                        }
                      }
                      
                      const departureCode = firstSegment.departure?.iataCode;
                      const arrivalCode = lastSegment.arrival?.iataCode;
                      const departureInfo = airportInfoMap.get(departureCode) || { name: departureCode, city: '' };
                      const arrivalInfo = airportInfoMap.get(arrivalCode) || { name: arrivalCode, city: '' };
                      const airlineInfo = getAirlineInfo(firstSegment.carrierCode);
                      const departureTime = dayjs(firstSegment.departure?.at).format('HH:mm');
                      const arrivalTime = dayjs(lastSegment.arrival?.at).format('HH:mm');
                      
                      // 检查是否跨天
                      const dayOffset = getDayOffset(firstSegment.departure?.at, lastSegment.arrival?.at);
                      
                      // 获取航站楼信息
                      const departureTerminal = firstSegment.departure?.terminal || '';
                      const arrivalTerminal = lastSegment.arrival?.terminal || '';

                      return (
                        <React.Fragment key={idx}>
                          {/* 1. 航空公司和航班号（左侧）- 中转航班显示所有航段 */}
                          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', justifyContent: 'center', width: { xs: '100%', md: 180 }, order: { xs: 1, md: 1 }, gap: isTransfer ? 1 : 0 }}>
                            {segments.map((segment, segIdx) => {
                              const segAirlineInfo = getAirlineInfo(segment.carrierCode);
                              return (
                                <Box key={segIdx} sx={{ display: 'flex', alignItems: 'center', width: '100%' }}>
                                  {segAirlineInfo.logo && !airlineLogoErrors.has(segment.carrierCode) ? (
                                    <Avatar
                                      src={segAirlineInfo.logo}
                                      alt={segAirlineInfo.name}
                                      sx={{ 
                                        width: 32, 
                                        height: 32, 
                                        mr: 0.75,
                                        bgcolor: 'primary.main',
                                        flexShrink: 0,
                                        '& img': {
                                          objectFit: 'contain',
                                          width: '100%',
                                          height: '100%',
                                          padding: '3px'
                                        }
                                      }}
                                      imgProps={{
                                        onError: (e) => {
                                          setAirlineLogoErrors(prev => new Set(prev).add(segment.carrierCode));
                                        },
                                        loading: 'lazy'
                                      }}
                                    />
                                  ) : (
                                    <Avatar
                                      sx={{
                                        width: 32,
                                        height: 32,
                                        bgcolor: 'primary.main',
                                        color: 'white',
                                        fontSize: '0.75rem',
                                        fontWeight: 600,
                                        mr: 0.75,
                                        flexShrink: 0
                                      }}
                                    >
                                      {segment.carrierCode}
                                    </Avatar>
                                  )}
                                  <Box sx={{ flex: 1, minWidth: 0 }}>
                                    <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.75rem', lineHeight: 1.2 }}>
                                      {segAirlineInfo.name || segment.carrierCode}
                                    </Typography>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flexWrap: 'wrap' }}>
                                      {segment.number && (
                                        <Typography variant="body2" color="primary" sx={{ fontWeight: 600, fontSize: '0.875rem', lineHeight: 1.2 }}>
                                          {segment.carrierCode} {segment.number}
                                        </Typography>
                                      )}
                                      {getAircraftName(segment.aircraft?.code) && (
                                        <>
                                          <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.875rem', lineHeight: 1.2 }}>
                                            ·
                                          </Typography>
                                          <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.875rem', lineHeight: 1.2 }}>
                                            {getAircraftName(segment.aircraft?.code)}
                                          </Typography>
                                        </>
                                      )}
                                    </Box>
                                  </Box>
                                </Box>
                              );
                            })}
                          </Box>

                          {/* 2. 出发地-目的地（包含中转信息） */}
                          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 0, width: { xs: '100%', md: 240 }, order: { xs: 2, md: 2 }, flex: { xs: '1 1 100%', md: '0 0 auto' } }}>
                            {/* 出发地 */}
                            <Box sx={{ flex: '0 0 auto', textAlign: 'left', mr: 0.5 }}>
                              <Typography variant="h6" color="primary" sx={{ fontWeight: 600, fontSize: { xs: '1rem', md: '1.1rem' }, lineHeight: 1.2 }}>
                                {departureInfo.city || departureInfo.name || departureCode}
                              </Typography>
                              <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.75rem', fontWeight: 500 }}>
                                {departureCode}{departureTerminal ? ` T${departureTerminal}` : ''}
                              </Typography>
                            </Box>
                            
                            {/* 中转信息（如果有） */}
                            {isTransfer ? (
                              <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.5, position: 'relative', px: 0, flex: '1 1 auto', minWidth: 80 }}>
                                {/* 连接线 */}
                                <Box sx={{ 
                                  position: 'absolute', 
                                  top: '50%', 
                                  left: 0, 
                                  right: 0, 
                                  height: '2px', 
                                  bgcolor: '#d1d5db',
                                  zIndex: 0,
                                  transform: 'translateY(-50%)'
                                }} />
                                
                                {/* 中转时间（上方） */}
                                {transferTimes.length > 0 && (
                                  <Typography 
                                    variant="caption" 
                                    color="text.secondary" 
                                    sx={{ 
                                      fontSize: '0.7rem', 
                                      zIndex: 1, 
                                      bgcolor: 'background.paper', 
                                      px: 0.5,
                                      fontWeight: 500,
                                      whiteSpace: 'nowrap'
                                    }}
                                  >
                                    {t('flight.list.transfer') || '中转'}{transferTimes[0].time}
                                  </Typography>
                                )}
                                
                                {/* 中转信息气泡（中间） */}
                                <Chip
                                  label={transferCount === 1 ? (t('flight.list.transferOnce') || '转1次') : (t('flight.list.transferCount', { count: transferCount }) || `转${transferCount}次`)}
                                  size="small"
                                  sx={{
                                    bgcolor: '#ff9800',
                                    color: 'white',
                                    fontSize: '0.7rem',
                                    height: 22,
                                    zIndex: 1,
                                    fontWeight: 600,
                                    borderRadius: '12px',
                                    '& .MuiChip-label': {
                                      px: 1
                                    }
                                  }}
                                />
                              </Box>
                            ) : (
                              <Box sx={{ flex: '0 0 auto', px: 0.5 }}>
                                <Typography variant="body1" color="text.secondary" sx={{ fontWeight: 500, fontSize: '1.2rem' }}>
                                  →
                                </Typography>
                              </Box>
                            )}
                            
                            {/* 目的地 */}
                            <Box sx={{ flex: '0 0 auto', textAlign: 'right', ml: 0.5 }}>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, justifyContent: 'flex-end' }}>
                                <Typography variant="h6" color="primary" sx={{ fontWeight: 600, fontSize: { xs: '1rem', md: '1.1rem' }, lineHeight: 1.2 }}>
                                  {arrivalInfo.city || arrivalInfo.name || arrivalCode}
                                </Typography>
                                {dayOffset && (
                                  <Typography variant="caption" color="primary" sx={{ fontSize: '0.7rem', fontWeight: 600 }}>
                                    +{dayOffset}{t('flight.list.days') || '天'}
                                  </Typography>
                                )}
                              </Box>
                              <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.75rem', fontWeight: 500 }}>
                                {arrivalCode}{arrivalTerminal ? ` T${arrivalTerminal}` : ''}
                              </Typography>
                            </Box>
                          </Box>

                          {/* 3. 起飞时间 飞行时长 */}
                          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: { xs: '100%', md: 180 }, order: { xs: 3, md: 3 }, whiteSpace: 'nowrap', ml: { xs: 0, md: 3 }, mr: { xs: 0, md: 2 }, minHeight: '100%' }}>
                            {/* 起飞时间（左侧） */}
                            <Box sx={{ textAlign: 'left', flex: '0 0 auto' }}>
                              <Typography variant="body1" color="text.primary" sx={{ fontWeight: 600, fontSize: { xs: '0.95rem', md: '1rem' }, whiteSpace: 'nowrap' }}>
                                {departureTime}
                              </Typography>
                            </Box>
                            
                            {/* 飞行时长（中间） */}
                            <Box sx={{ textAlign: 'center', flex: '1 1 auto', px: 1 }}>
                              <Typography variant="body2" color="text.secondary" sx={{ fontSize: { xs: '0.8rem', md: '0.875rem' }, whiteSpace: 'nowrap' }}>
                                {formatDuration(itinerary.duration)}
                              </Typography>
                            </Box>
                            
                            {/* 到达时间（右侧） */}
                            <Box sx={{ textAlign: 'right', flex: '0 0 auto' }}>
                              <Typography variant="body1" color="text.primary" sx={{ fontWeight: 600, fontSize: { xs: '0.95rem', md: '1rem' }, whiteSpace: 'nowrap' }}>
                                {arrivalTime}
                              </Typography>
                            </Box>
                          </Box>

                          {/* 4. 价格和可预订座位 */}
                          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: { xs: 'flex-start', md: 'flex-end' }, justifyContent: 'center', width: { xs: '100%', md: 140 }, order: { xs: 4, md: 4 }, ml: { xs: 0, md: 'auto' } }}>
                            <Typography variant="h5" color="primary" sx={{ fontWeight: 600, mb: 0.5, fontSize: { xs: '1.25rem', md: '1.5rem' } }}>
                              {formatPrice(flight.price)}
                            </Typography>
                            {flight.numberOfBookableSeats && (
                              <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
                                {t('flight.list.availableSeats') || '可预订座位'}: {flight.numberOfBookableSeats}
                              </Typography>
                            )}
                          </Box>

                          {/* 操作按钮 */}
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, width: { xs: '100%', md: 200 }, order: { xs: 5, md: 5 }, justifyContent: { xs: 'flex-start', md: 'flex-end' }, flexShrink: 0 }}>
                            <Button
                              variant="contained"
                              size="medium"
                              sx={{ 
                                fontSize: { xs: '0.875rem', md: '0.9375rem' },
                                px: { xs: 1.5, md: 2 },
                                py: { xs: 0.75, md: 1 },
                                height: { xs: '36px', md: '40px' },
                                minHeight: { xs: '36px', md: '40px' }
                              }}
                              onClick={(e) => {
                                e.stopPropagation();
                                onSelectFlight && onSelectFlight(flight);
                              }}
                            >
                              {t('flight.list.book') || '预订'}
                            </Button>
                            <Button
                              variant="outlined"
                              size="medium"
                              sx={{ 
                                fontSize: { xs: '0.875rem', md: '0.9375rem' },
                                px: { xs: 1.5, md: 2 },
                                py: { xs: 0.75, md: 1 },
                                height: { xs: '36px', md: '40px' },
                                minHeight: { xs: '36px', md: '40px' },
                                whiteSpace: 'nowrap'
                              }}
                              onClick={(e) => {
                                e.stopPropagation();
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
                        </React.Fragment>
                      );
                    })}
                  </Box>
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

