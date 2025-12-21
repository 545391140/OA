/**
 * 预订管理页面
 * 显示用户的所有机票预订
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container,
  Paper,
  Box,
  Typography,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Chip,
  IconButton,
  Menu,
  MenuItem,
  TextField,
  InputAdornment,
  FormControl,
  InputLabel,
  Select,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Grid,
  LinearProgress,
} from '@mui/material';
import {
  Add as AddIcon,
  Search as SearchIcon,
  FilterList as FilterIcon,
  MoreVert as MoreVertIcon,
  Visibility as ViewIcon,
  Cancel as CancelIcon,
  Flight as FlightIcon,
  LocationOn as LocationIcon,
  CalendarToday as CalendarIcon,
  AttachMoney as MoneyIcon,
  ContentCopy as ContentCopyIcon,
} from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import { useNotification } from '../../contexts/NotificationContext';
import { getBookings, cancelBooking } from '../../services/flightService';
import { useDateFormat } from '../../utils/dateFormatter';
import { getAirportInfoBatch } from '../../utils/flightUtils';

// 优化的表格行组件，使用React.memo避免不必要的重渲染
const BookingTableRow = React.memo(({ booking, onMenuOpen, getStatusColor, t, showNotification, airportInfoMap }) => {
  const formatDate = useDateFormat(false);
  
  const handleCopyNumber = useCallback((e, number) => {
    e.stopPropagation();
    if (number && number !== '-') {
      navigator.clipboard.writeText(number).then(() => {
        showNotification(t('common.copied') || '已复制', 'success');
      }).catch(() => {
        showNotification(t('common.copyFailed') || '复制失败', 'error');
      });
    }
  }, [showNotification, t]);

  const formattedDate = useMemo(() => {
    const departureDate = booking.flightOffer?.itineraries?.[0]?.segments?.[0]?.departure?.at;
    return departureDate ? formatDate(departureDate) : '-';
  }, [booking.flightOffer, formatDate]);

  const route = useMemo(() => {
    const segments = booking.flightOffer?.itineraries?.[0]?.segments;
    if (!segments || segments.length === 0) {
      return { routeText: '-', hasTransfer: false };
    }
    const originCode = segments[0]?.departure?.iataCode;
    const destinationCode = segments[segments.length - 1]?.arrival?.iataCode;
    
    if (!originCode || !destinationCode) {
      return { routeText: '-', hasTransfer: false };
    }
    
    // 判断是否有中转
    // 确保中转次数计算正确：segments.length - 1
    // 1个segment = 0次中转（直飞）
    // 2个segments = 1次中转
    // 3个segments = 2次中转
    const isTransfer = segments.length > 1;
    const transferCount = Math.max(0, segments.length - 1);
    
    // 获取机场信息
    const originInfo = airportInfoMap?.get(originCode);
    const destinationInfo = airportInfoMap?.get(destinationCode);
    
    // 获取显示名称：优先城市名称，其次机场名称（如果名称不等于代码），最后使用代码
    const getDisplayName = (info, code) => {
      if (!info) return code; // 如果信息还没加载，显示代码
      if (info.city && info.city.trim()) return info.city; // 优先显示城市名称
      if (info.name && info.name !== code && info.name.trim()) return info.name; // 其次显示机场名称（如果名称不等于代码）
      return code; // 最后显示代码
    };
    
    const originDisplay = getDisplayName(originInfo, originCode);
    const destinationDisplay = getDisplayName(destinationInfo, destinationCode);
    
    // 构建航线显示：出发地 → 目的地
    const routeText = `${originDisplay}(${originCode}) → ${destinationDisplay}(${destinationCode})`;
    
    // 如果有中转，生成中转标签文本
    let transferLabel = '';
    if (isTransfer) {
      if (transferCount === 1) {
        transferLabel = t('flight.list.transferOnce') || '转1次';
      } else {
        // 使用 transferCount 翻译键，替换 {count} 占位符
        const transferCountKey = t('flight.list.transferCount', { count: transferCount });
        transferLabel = transferCountKey || `转${transferCount}次`;
      }
    }
    
    return {
      routeText,
      hasTransfer: isTransfer,
      transferLabel
    };
  }, [booking.flightOffer, airportInfoMap, t]);

  return (
    <TableRow hover>
      <TableCell>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <Typography 
            variant="body2" 
            sx={{ 
              fontWeight: 500,
              fontFamily: 'monospace',
              fontSize: '0.875rem',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              maxWidth: '200px'
            }}
          >
            {booking.bookingReference || '-'}
          </Typography>
          {booking.bookingReference && booking.bookingReference !== '-' && (
            <IconButton
              size="small"
              onClick={(e) => handleCopyNumber(e, booking.bookingReference)}
              sx={{ 
                p: 0.5,
                '&:hover': { bgcolor: 'action.hover' }
              }}
            >
              <ContentCopyIcon fontSize="small" sx={{ fontSize: 14 }} />
            </IconButton>
          )}
        </Box>
      </TableCell>
      <TableCell>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <Typography 
            variant="body2" 
            sx={{ 
              fontWeight: 500,
              fontFamily: 'monospace',
              fontSize: '0.875rem',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              maxWidth: '200px'
            }}
          >
            {booking.travelId?.travelNumber || '-'}
          </Typography>
          {booking.travelId?.travelNumber && booking.travelId.travelNumber !== '-' && (
            <IconButton
              size="small"
              onClick={(e) => handleCopyNumber(e, booking.travelId.travelNumber)}
              sx={{ 
                p: 0.5,
                '&:hover': { bgcolor: 'action.hover' }
              }}
            >
              <ContentCopyIcon fontSize="small" sx={{ fontSize: 14 }} />
            </IconButton>
          )}
        </Box>
      </TableCell>
      <TableCell>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
          <LocationIcon color="action" fontSize="small" />
          <Typography variant="body2">
            {route.routeText}
          </Typography>
          {route.hasTransfer && (
            <Chip
              label={route.transferLabel}
              size="small"
              sx={{
                bgcolor: '#FF9800',
                color: '#fff',
                fontSize: '0.75rem',
                height: '20px',
                fontWeight: 500
              }}
            />
          )}
        </Box>
      </TableCell>
      <TableCell>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <CalendarIcon color="action" fontSize="small" />
          <Typography variant="body2">
            {formattedDate}
          </Typography>
        </Box>
      </TableCell>
      <TableCell>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <MoneyIcon color="action" fontSize="small" />
          <Typography variant="body2" sx={{ fontWeight: 'bold', whiteSpace: 'nowrap' }}>
            {booking.price?.total ? `${booking.price.total} ${booking.price.currency || ''}` : '-'}
          </Typography>
        </Box>
      </TableCell>
      <TableCell>
        <Chip
          label={t(`flight.booking.${booking.status}`) || booking.status}
          color={getStatusColor(booking.status)}
          size="small"
        />
      </TableCell>
      <TableCell>
        <IconButton
          onClick={(e) => onMenuOpen(e, booking)}
          size="small"
        >
          <MoreVertIcon />
        </IconButton>
      </TableCell>
    </TableRow>
  );
});

BookingTableRow.displayName = 'BookingTableRow';

const BookingManagement = ({ currentTabType = 'flight' }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { showNotification } = useNotification();

  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [anchorEl, setAnchorEl] = useState(null);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [airportInfoMap, setAirportInfoMap] = useState(new Map());
  
  // 分页状态
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(20);
  const [total, setTotal] = useState(0);

  // 搜索防抖
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  const statusOptions = useMemo(() => [
    { value: 'all', label: t('common.all') || '全部' },
    { value: 'confirmed', label: t('flight.booking.confirmed') || '已确认' },
    { value: 'pending', label: t('flight.booking.pending') || '待确认' },
    { value: 'cancelled', label: t('flight.booking.cancelled') || '已取消' },
  ], [t]);

  const getStatusColor = useCallback((status) => {
    switch (status) {
      case 'confirmed':
        return 'success';
      case 'pending':
        return 'warning';
      case 'cancelled':
        return 'error';
      case 'failed':
        return 'error';
      default:
        return 'default';
    }
  }, []);

  useEffect(() => {
    fetchBookings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, rowsPerPage, statusFilter, debouncedSearchTerm]);

  // 获取机场信息
  useEffect(() => {
    const fetchAirportInfo = async () => {
      const airportCodes = new Set();
      
      bookings.forEach(booking => {
        booking.flightOffer?.itineraries?.forEach(itinerary => {
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

      if (airportCodes.size > 0) {
        try {
          const infoMap = await getAirportInfoBatch(Array.from(airportCodes));
          console.log('[BookingManagement] 机场信息获取完成:', Array.from(infoMap.entries()));
          setAirportInfoMap(infoMap);
        } catch (error) {
          console.warn('Failed to fetch airport info:', error);
        }
      } else {
        // 如果没有机场代码，清空地图
        setAirportInfoMap(new Map());
      }
    };

    if (bookings.length > 0) {
      fetchAirportInfo();
    }
  }, [bookings]);

  const fetchBookings = async () => {
    setLoading(true);
    try {
      const params = {
        page: page + 1, // API使用1-based分页
        limit: rowsPerPage
      };
      
      if (statusFilter && statusFilter !== 'all') {
        params.status = statusFilter;
      }
      
      if (debouncedSearchTerm && debouncedSearchTerm.trim()) {
        params.search = debouncedSearchTerm.trim();
      }
      
      const response = await getBookings(params);
      if (response.data.success) {
        setBookings(response.data.data || []);
        setTotal(response.data.total || response.data.data?.length || 0);
      }
    } catch (error) {
      showNotification(
        error.response?.data?.message || t('flight.booking.fetchError') || '获取预订列表失败',
        'error'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleMenuOpen = useCallback((event, booking) => {
    setAnchorEl(event.currentTarget);
    setSelectedBooking(booking);
  }, []);

  const handleMenuClose = useCallback(() => {
    setAnchorEl(null);
    setSelectedBooking(null);
  }, []);

  const handleView = useCallback(() => {
    if (selectedBooking) {
      navigate(`/flight/bookings/${selectedBooking._id}`);
    }
    handleMenuClose();
  }, [selectedBooking, navigate, handleMenuClose]);

  const handleCancelClick = useCallback(() => {
    setCancelDialogOpen(true);
    handleMenuClose();
  }, [handleMenuClose]);

  const handleCancelConfirm = async () => {
    if (!selectedBooking) return;

    try {
      await cancelBooking(selectedBooking._id, cancelReason);
      showNotification(t('flight.booking.cancelSuccess') || '预订已取消', 'success');
      setCancelDialogOpen(false);
      setCancelReason('');
      fetchBookings();
    } catch (error) {
      showNotification(
        error.response?.data?.message || t('flight.booking.cancelError') || '取消失败',
        'error'
      );
    }
  };

  // 处理分页变化
  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0); // 重置到第一页
  };

  // 处理搜索变化
  const handleSearchChange = (event) => {
    setSearchTerm(event.target.value);
    setPage(0); // 重置到第一页
  };

  // 处理状态过滤变化
  const handleStatusFilterChange = (event) => {
    setStatusFilter(event.target.value);
    setPage(0); // 重置到第一页
  };

  if (loading && bookings.length === 0) {
    return (
      <Box sx={{ width: '100%', mt: 2 }}>
        <LinearProgress />
      </Box>
    );
  }

  return (
    <>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', mb: 3 }}>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => {
            // 根据当前Tab类型跳转到对应的搜索Tab
            navigate('/flight/search', { 
              state: { defaultTab: currentTabType } 
            });
          }}
        >
          {t('flight.booking.newBooking') || '新建预订'}
        </Button>
      </Box>

        {/* Filters */}
        <Paper sx={{ p: 2, mb: 3 }}>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                placeholder={t('flight.booking.search') || '搜索预订...'}
                value={searchTerm}
                onChange={handleSearchChange}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon />
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>
            <Grid item xs={12} md={3}>
              <FormControl fullWidth>
                <InputLabel>{t('flight.booking.status') || '状态'}</InputLabel>
                <Select
                  value={statusFilter}
                  label={t('flight.booking.status') || '状态'}
                  onChange={handleStatusFilterChange}
                >
                  {statusOptions.map((option) => (
                    <MenuItem key={option.value} value={option.value}>
                      {option.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={3}>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Button
                  variant="outlined"
                  startIcon={<FilterIcon />}
                  onClick={() => {
                    setSearchTerm('');
                    setStatusFilter('all');
                    setPage(0);
                  }}
                  fullWidth
                >
                  {t('common.reset') || '清除筛选'}
                </Button>
              </Box>
            </Grid>
          </Grid>
        </Paper>

        {/* Bookings Table */}
        {bookings.length > 0 ? (
          <TableContainer component={Paper}>
            {loading && <LinearProgress />}
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ minWidth: 150 }}>{t('flight.booking.bookingReference') || '预订参考号'}</TableCell>
                  <TableCell sx={{ minWidth: 150 }}>{t('flight.booking.travelNumber') || '差旅单号'}</TableCell>
                  <TableCell sx={{ minWidth: 150 }}>{t('flight.booking.route') || '航线'}</TableCell>
                  <TableCell sx={{ minWidth: 120 }}>{t('flight.booking.date') || '日期'}</TableCell>
                  <TableCell sx={{ minWidth: 120 }}>{t('flight.booking.price') || '价格'}</TableCell>
                  <TableCell sx={{ minWidth: 100 }}>{t('flight.booking.status') || '状态'}</TableCell>
                  <TableCell sx={{ minWidth: 100 }}>{t('common.actions') || '操作'}</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {bookings.map((booking) => (
                  <BookingTableRow
                    key={booking._id}
                    booking={booking}
                    onMenuOpen={handleMenuOpen}
                    getStatusColor={getStatusColor}
                    t={t}
                    showNotification={showNotification}
                    airportInfoMap={airportInfoMap}
                  />
                ))}
              </TableBody>
            </Table>
            <TablePagination
              component="div"
              count={total}
              page={page}
              onPageChange={handleChangePage}
              rowsPerPage={rowsPerPage}
              onRowsPerPageChange={handleChangeRowsPerPage}
              rowsPerPageOptions={[10, 20, 50, 100]}
              labelRowsPerPage={t('common.rowsPerPage') || '每页行数:'}
              labelDisplayedRows={({ from, to, count }) => 
                `${from}-${to} ${t('common.of') || '共'} ${count !== -1 ? count : `${t('common.moreThan') || '超过'} ${to}`}`
              }
            />
          </TableContainer>
        ) : (
          /* 空状态显示（当没有数据且不在加载中时） */
          <Paper sx={{ p: 4, textAlign: 'center', mt: 2 }}>
            <Typography variant="h6" color="text.secondary">
              {t('flight.booking.noBookings') || '暂无预订记录'}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              {(searchTerm || statusFilter !== 'all') 
                ? (t('flight.booking.tryAdjustingSearch') || '请尝试调整搜索条件')
                : (t('flight.booking.createFirstBooking') || '创建您的第一个预订')
              }
            </Typography>
            {!searchTerm && statusFilter === 'all' && (
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={() => {
                  // 根据当前Tab类型跳转到对应的搜索Tab
                  navigate('/flight/search', { 
                    state: { defaultTab: currentTabType } 
                  });
                }}
                sx={{ mt: 2 }}
              >
                {t('flight.booking.newBooking') || '新建预订'}
              </Button>
            )}
          </Paper>
        )}

        {/* Action Menu */}
        <Menu
          anchorEl={anchorEl}
          open={Boolean(anchorEl)}
          onClose={handleMenuClose}
        >
          <MenuItem onClick={handleView}>
            <ViewIcon sx={{ mr: 1.5, fontSize: 20 }} />
            {t('common.view') || '查看'}
          </MenuItem>
          {selectedBooking?.status === 'confirmed' && (
            <MenuItem onClick={handleCancelClick} sx={{ color: 'error.main' }}>
              <CancelIcon sx={{ mr: 1.5, fontSize: 20 }} />
              {t('flight.booking.cancel') || '取消'}
            </MenuItem>
          )}
        </Menu>

        {/* Cancel Dialog */}
        <Dialog open={cancelDialogOpen} onClose={() => setCancelDialogOpen(false)}>
          <DialogTitle>{t('flight.booking.cancelBooking') || '取消预订'}</DialogTitle>
          <DialogContent>
            <TextField
              fullWidth
              multiline
              rows={4}
              label={t('flight.booking.cancelReason') || '取消原因'}
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              sx={{ mt: 1 }}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setCancelDialogOpen(false)}>
              {t('common.cancel') || '取消'}
            </Button>
            <Button onClick={handleCancelConfirm} color="error" variant="contained">
              {t('common.confirm') || '确认'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default BookingManagement;

