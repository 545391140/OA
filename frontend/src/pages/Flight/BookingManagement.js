/**
 * 预订管理页面
 * 显示用户的所有机票预订
 */

import React, { useState, useEffect } from 'react';
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
  Alert,
} from '@mui/material';
import {
  Add as AddIcon,
  Search as SearchIcon,
  MoreVert as MoreVertIcon,
  Visibility as ViewIcon,
  Cancel as CancelIcon,
  Flight as FlightIcon,
} from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import { useNotification } from '../../contexts/NotificationContext';
import { getBookings, cancelBooking } from '../../services/flightService';
import dayjs from 'dayjs';

const BookingManagement = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { showNotification } = useNotification();

  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [anchorEl, setAnchorEl] = useState(null);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState('');

  useEffect(() => {
    fetchBookings();
  }, [statusFilter]);

  const fetchBookings = async () => {
    setLoading(true);
    try {
      const params = {};
      if (statusFilter) {
        params.status = statusFilter;
      }
      const response = await getBookings(params);
      if (response.data.success) {
        setBookings(response.data.data);
      }
    } catch (error) {
      showNotification('获取预订列表失败', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleMenuOpen = (event, booking) => {
    setAnchorEl(event.currentTarget);
    setSelectedBooking(booking);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedBooking(null);
  };

  const handleView = () => {
    if (selectedBooking) {
      navigate(`/flight/bookings/${selectedBooking._id}`);
    }
    handleMenuClose();
  };

  const handleCancelClick = () => {
    setCancelDialogOpen(true);
    handleMenuClose();
  };

  const handleCancelConfirm = async () => {
    if (!selectedBooking) return;

    try {
      await cancelBooking(selectedBooking._id, cancelReason);
      showNotification('预订已取消', 'success');
      setCancelDialogOpen(false);
      setCancelReason('');
      fetchBookings();
    } catch (error) {
      showNotification(error.response?.data?.message || '取消失败', 'error');
    }
  };

  const getStatusColor = (status) => {
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
  };

  const filteredBookings = bookings.filter((booking) => {
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      return (
        booking.bookingReference?.toLowerCase().includes(term) ||
        booking.travelId?.travelNumber?.toLowerCase().includes(term)
      );
    }
    return true;
  });

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      <Paper elevation={3} sx={{ p: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h4">
            {t('flight.booking.title') || '机票预订管理'}
          </Typography>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => navigate('/flight/search')}
          >
            {t('flight.booking.newBooking') || '新建预订'}
          </Button>
        </Box>

        <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
          <TextField
            placeholder={t('flight.booking.search') || '搜索预订...'}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
            }}
            sx={{ flex: 1 }}
          />
          <FormControl sx={{ minWidth: 150 }}>
            <InputLabel>{t('flight.booking.status') || '状态'}</InputLabel>
            <Select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              label={t('flight.booking.status') || '状态'}
            >
              <MenuItem value="">{t('common.all') || '全部'}</MenuItem>
              <MenuItem value="confirmed">{t('flight.booking.confirmed') || '已确认'}</MenuItem>
              <MenuItem value="pending">{t('flight.booking.pending') || '待确认'}</MenuItem>
              <MenuItem value="cancelled">{t('flight.booking.cancelled') || '已取消'}</MenuItem>
            </Select>
          </FormControl>
        </Box>

        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>{t('flight.booking.bookingReference') || '预订参考号'}</TableCell>
                <TableCell>{t('flight.booking.travelNumber') || '差旅单号'}</TableCell>
                <TableCell>{t('flight.booking.route') || '航线'}</TableCell>
                <TableCell>{t('flight.booking.date') || '日期'}</TableCell>
                <TableCell>{t('flight.booking.price') || '价格'}</TableCell>
                <TableCell>{t('flight.booking.status') || '状态'}</TableCell>
                <TableCell>{t('common.actions') || '操作'}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredBookings.map((booking) => (
                <TableRow key={booking._id} hover>
                  <TableCell>{booking.bookingReference || '-'}</TableCell>
                  <TableCell>{booking.travelId?.travelNumber || '-'}</TableCell>
                  <TableCell>
                    {booking.flightOffer?.itineraries?.[0]?.segments?.[0]?.departure?.iataCode} →{' '}
                    {booking.flightOffer?.itineraries?.[0]?.segments?.[
                      booking.flightOffer.itineraries[0].segments.length - 1
                    ]?.arrival?.iataCode}
                  </TableCell>
                  <TableCell>
                    {dayjs(
                      booking.flightOffer?.itineraries?.[0]?.segments?.[0]?.departure?.at
                    ).format('YYYY-MM-DD')}
                  </TableCell>
                  <TableCell>
                    {booking.price?.total} {booking.price?.currency}
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
                      onClick={(e) => handleMenuOpen(e, booking)}
                      size="small"
                    >
                      <MoreVertIcon />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>

        {filteredBookings.length === 0 && (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <Typography variant="body1" color="text.secondary">
              {t('flight.booking.noBookings') || '暂无预订记录'}
            </Typography>
          </Box>
        )}

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
      </Paper>
    </Container>
  );
};

export default BookingManagement;

