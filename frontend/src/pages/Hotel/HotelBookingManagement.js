/**
 * 酒店预订管理页面
 * 显示用户的所有酒店预订
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
  Hotel as HotelIcon,
  LocationOn as LocationIcon,
  CalendarToday as CalendarIcon,
  AttachMoney as MoneyIcon,
  ContentCopy as ContentCopyIcon,
} from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import { useNotification } from '../../contexts/NotificationContext';
import { getHotelBookings, cancelHotelBooking } from '../../services/hotelService';
import { useDateFormat } from '../../utils/dateFormatter';

// 优化的表格行组件
const HotelBookingTableRow = React.memo(({ 
  booking, 
  onMenuOpen, 
  getStatusColor, 
  t, 
  showNotification 
}) => {
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

  const hotelName = useMemo(() => {
    return booking.hotelOffer?.hotel?.name || '-';
  }, [booking.hotelOffer]);

  const location = useMemo(() => {
    // 尝试多个数据源获取地址信息
    const address = booking.hotel?.address || 
                    booking.hotelOffer?.hotel?.address ||
                    booking.hotelOffer?.hotel?.contact?.address;
    
    // 调试：打印地址信息（开发环境）
    if (process.env.NODE_ENV === 'development' && !address) {
      console.log('酒店预订位置信息调试:', {
        'booking.hotel': booking.hotel,
        'booking.hotel.address': booking.hotel?.address,
        'booking.hotelOffer?.hotel?.address': booking.hotelOffer?.hotel?.address,
        'booking.hotel.cityCode': booking.hotel?.cityCode,
        'booking.hotelOffer?.hotel?.cityCode': booking.hotelOffer?.hotel?.cityCode,
      });
    }
    
    if (!address) {
      // 如果地址不存在，尝试从其他字段构建位置信息
      const cityCode = booking.hotel?.cityCode || booking.hotelOffer?.hotel?.cityCode;
      const countryCode = booking.hotel?.address?.countryCode || 
                         booking.hotelOffer?.hotel?.address?.countryCode ||
                         booking.hotelOffer?.hotel?.countryCode;
      
      if (cityCode || countryCode) {
        return [cityCode, countryCode].filter(Boolean).join(', ') || '-';
      }
      return '-';
    }
    
    // 尝试多种可能的字段名
    const city = address.cityName || address.city || address.cityCode || '';
    const country = address.countryCode || address.country || '';
    const state = address.stateCode || address.state || '';
    
    // 构建位置字符串：城市, 州, 国家
    const parts = [city, state, country].filter(Boolean);
    return parts.length > 0 ? parts.join(', ') : '-';
  }, [booking.hotel, booking.hotelOffer]);

  const checkInDate = useMemo(() => {
    // 优先使用 booking.checkIn，如果没有则使用 booking.hotelOffer?.checkInDate
    const date = booking.checkIn || booking.hotelOffer?.checkInDate;
    return date ? formatDate(date) : '-';
  }, [booking.checkIn, booking.hotelOffer, formatDate]);

  const checkOutDate = useMemo(() => {
    // 优先使用 booking.checkOut，如果没有则使用 booking.hotelOffer?.checkOutDate
    const date = booking.checkOut || booking.hotelOffer?.checkOutDate;
    return date ? formatDate(date) : '-';
  }, [booking.checkOut, booking.hotelOffer, formatDate]);

  const price = useMemo(() => {
    const priceObj = booking.hotelOffer?.offers?.[0]?.price || booking.price;
    if (!priceObj) return '-';
    const total = priceObj.total || '0';
    const currency = priceObj.currency || 'USD';
    return `${total} ${currency}`;
  }, [booking.hotelOffer, booking.price]);

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
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <HotelIcon color="action" fontSize="small" />
          <Typography variant="body2" sx={{ maxWidth: 250, overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {hotelName}
          </Typography>
        </Box>
      </TableCell>
      <TableCell>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <LocationIcon color="action" fontSize="small" />
          <Typography variant="body2">
            {location}
          </Typography>
        </Box>
      </TableCell>
      <TableCell>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <CalendarIcon color="action" fontSize="small" />
          <Typography variant="body2">
            {checkInDate} - {checkOutDate}
          </Typography>
        </Box>
      </TableCell>
      <TableCell>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <MoneyIcon color="action" fontSize="small" />
          <Typography variant="body2" sx={{ fontWeight: 'bold', whiteSpace: 'nowrap' }}>
            {price}
          </Typography>
        </Box>
      </TableCell>
      <TableCell>
        <Chip
          label={t(`hotel.booking.${booking.status}`) || booking.status}
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

HotelBookingTableRow.displayName = 'HotelBookingTableRow';

const HotelBookingManagement = ({ currentTabType = 'hotel' }) => {
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
    { value: 'confirmed', label: t('hotel.booking.confirmed') || '已确认' },
    { value: 'pending', label: t('hotel.booking.pending') || '待确认' },
    { value: 'cancelled', label: t('hotel.booking.cancelled') || '已取消' },
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
      
      const response = await getHotelBookings(params);
      if (response.data.success) {
        setBookings(response.data.data || []);
        // 支持多种响应格式（兼容旧版本和新版本）
        setTotal(
          response.data.total || 
          response.data.count || 
          response.data.data?.length || 
          0
        );
      }
    } catch (error) {
      showNotification(
        error.response?.data?.message || t('hotel.booking.fetchError') || '获取预订列表失败',
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
      navigate(`/hotel/bookings/${selectedBooking._id}`);
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
      await cancelHotelBooking(selectedBooking._id, cancelReason);
      showNotification(t('hotel.booking.cancelSuccess') || '预订已取消', 'success');
      setCancelDialogOpen(false);
      setCancelReason('');
      fetchBookings();
    } catch (error) {
      showNotification(
        error.response?.data?.message || t('hotel.booking.cancelError') || '取消失败',
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
    setPage(0);
  };

  // 处理搜索变化
  const handleSearchChange = (event) => {
    setSearchTerm(event.target.value);
    setPage(0);
  };

  // 处理状态过滤变化
  const handleStatusFilterChange = (event) => {
    setStatusFilter(event.target.value);
    setPage(0);
  };

  if (loading && bookings.length === 0) {
    return (
      <Container maxWidth="xl">
        <Box sx={{ width: '100%', mt: 2 }}>
          <LinearProgress />
        </Box>
      </Container>
    );
  }

  return (
    <>
      {/* Header - 参考机票预订列表的布局 */}
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
          {t('hotel.booking.newBooking') || '新建预订'}
        </Button>
        {/* 注意：新建预订跳转到"机/酒搜索"页面，根据当前Tab跳转到对应的搜索Tab */}
      </Box>

      {/* Filters */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              placeholder={t('hotel.booking.search') || '搜索预订...'}
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
              <InputLabel>{t('hotel.booking.status') || '状态'}</InputLabel>
              <Select
                value={statusFilter}
                label={t('hotel.booking.status') || '状态'}
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
                <TableCell sx={{ minWidth: 150 }}>{t('hotel.booking.bookingReference') || '预订参考号'}</TableCell>
                <TableCell sx={{ minWidth: 150 }}>{t('hotel.booking.travelNumber') || '差旅单号'}</TableCell>
                <TableCell sx={{ minWidth: 200 }}>{t('hotel.booking.hotelName') || '酒店名称'}</TableCell>
                <TableCell sx={{ minWidth: 150 }}>{t('hotel.booking.location') || '位置'}</TableCell>
                <TableCell sx={{ minWidth: 200 }}>{t('hotel.booking.dates') || '入住日期'}</TableCell>
                <TableCell sx={{ minWidth: 120 }}>{t('hotel.booking.price') || '价格'}</TableCell>
                <TableCell sx={{ minWidth: 100 }}>{t('hotel.booking.status') || '状态'}</TableCell>
                <TableCell sx={{ minWidth: 100 }}>{t('common.actions') || '操作'}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {bookings.map((booking) => (
                <HotelBookingTableRow
                  key={booking._id}
                  booking={booking}
                  onMenuOpen={handleMenuOpen}
                  getStatusColor={getStatusColor}
                  t={t}
                  showNotification={showNotification}
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
        <Paper sx={{ p: 4, textAlign: 'center', mt: 2 }}>
          <Typography variant="h6" color="text.secondary">
            {t('hotel.booking.noBookings') || '暂无预订记录'}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            {(searchTerm || statusFilter !== 'all') 
              ? (t('hotel.booking.tryAdjustingSearch') || '请尝试调整搜索条件')
              : (t('hotel.booking.createFirstBooking') || '创建您的第一个预订')
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
              {t('hotel.booking.newBooking') || '新建预订'}
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
            {t('hotel.booking.cancel') || '取消'}
          </MenuItem>
        )}
      </Menu>

      {/* Cancel Dialog */}
      <Dialog open={cancelDialogOpen} onClose={() => setCancelDialogOpen(false)}>
        <DialogTitle>{t('hotel.booking.cancelBooking') || '取消预订'}</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            multiline
            rows={4}
            label={t('hotel.booking.cancelReason') || '取消原因'}
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

export default HotelBookingManagement;

