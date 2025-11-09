
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container,
  Box,
  Typography,
  Button,
  Paper,
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
  Grid,
  Card,
  CardContent,
  Avatar,
  LinearProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions
} from '@mui/material';
import {
  Add as AddIcon,
  Search as SearchIcon,
  FilterList as FilterIcon,
  MoreVert as MoreVertIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Visibility as ViewIcon,
  Flight as FlightIcon,
  LocationOn as LocationIcon,
  CalendarToday as CalendarIcon,
  AttachMoney as MoneyIcon
} from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../contexts/AuthContext';
import { useNotification } from '../../contexts/NotificationContext';
import apiClient from '../../utils/axiosConfig';
import dayjs from 'dayjs';

const TravelList = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { showNotification } = useNotification();
  const navigate = useNavigate();

  const [travels, setTravels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [anchorEl, setAnchorEl] = useState(null);
  const [selectedTravel, setSelectedTravel] = useState(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  
  // 分页状态
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(20);
  const [total, setTotal] = useState(0);

  const statusOptions = [
    { value: 'all', label: t('travel.list.allStatus') },
    { value: 'draft', label: t('travel.statuses.draft') },
    { value: 'submitted', label: t('travel.statuses.submitted') },
    { value: 'approved', label: t('travel.statuses.approved') },
    { value: 'rejected', label: t('travel.statuses.rejected') },
    { value: 'in-progress', label: t('travel.statuses.in-progress') },
    { value: 'completed', label: t('travel.statuses.completed') },
    { value: 'cancelled', label: t('travel.statuses.cancelled') }
  ];

  const getStatusColor = (status) => {
    const colors = {
      draft: 'default',
      submitted: 'warning',
      approved: 'success',
      rejected: 'error',
      'in-progress': 'info',
      completed: 'success',
      cancelled: 'error'
    };
    return colors[status] || 'default';
  };

  useEffect(() => {
    fetchTravels();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, rowsPerPage, statusFilter, searchTerm]);

  const fetchTravels = async () => {
    try {
      setLoading(true);
      
      // 构建查询参数
      const params = {
        page: page + 1, // API使用1-based分页
        limit: rowsPerPage
      };
      
      // 添加状态过滤
      if (statusFilter && statusFilter !== 'all') {
        params.status = statusFilter;
      }
      
      // 添加搜索关键词
      if (searchTerm && searchTerm.trim()) {
        params.search = searchTerm.trim();
      }
      
      const response = await apiClient.get('/travel', { params });
      
      if (response.data && response.data.success) {
        // 处理返回的数据，确保每个 travel 都有 id 字段（使用 _id 或 id）
        const travels = (response.data.data || []).map(travel => {
          // 处理 destination 字段：可能是字符串或对象
          let processedDestination = {
            city: '',
            country: '',
            address: travel.destinationAddress || ''
          };
          
          if (travel.destination) {
            if (typeof travel.destination === 'string') {
              // 如果是字符串，解析为 city, country
              const parts = travel.destination.split(',');
              processedDestination.city = parts[0]?.trim() || '';
              processedDestination.country = parts[1]?.trim() || '';
            } else if (typeof travel.destination === 'object') {
              // 如果是对象，提取字段
              processedDestination.city = travel.destination.city || travel.destination.name || '';
              processedDestination.country = travel.destination.country || '';
              processedDestination.address = travel.destination.address || travel.destinationAddress || processedDestination.address;
            }
          }
          
          return {
            ...travel,
            id: travel._id || travel.id, // 统一使用 id 字段
            title: travel.title || '', // 确保 title 字段存在
            // 处理 destination 字段
            destination: processedDestination,
            dates: {
              departure: travel.startDate || travel.outbound?.date || '',
              return: travel.endDate || travel.inbound?.date || ''
            }
          };
        });
        setTravels(travels);
        setTotal(response.data.total || 0);
      } else {
        throw new Error(response.data?.message || t('travel.list.fetchError'));
      }
    } catch (error) {
      console.error('Fetch travels error:', error);
      showNotification(error.response?.data?.message || t('travel.list.fetchError'), 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleMenuOpen = (event, travel) => {
    setAnchorEl(event.currentTarget);
    setSelectedTravel(travel);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedTravel(null);
  };

  const handleView = () => {
    // 确保使用正确的 ID（_id 或 id）
    const travelId = selectedTravel._id || selectedTravel.id;
    if (travelId) {
      navigate(`/travel/${travelId}`);
    } else {
      showNotification(t('travel.list.invalidTravelId'), 'error');
    }
    handleMenuClose();
  };

  const handleEdit = () => {
    // 确保使用正确的 ID（_id 或 id）
    const travelId = selectedTravel._id || selectedTravel.id;
    if (travelId) {
      navigate(`/travel/${travelId}/edit`);
    } else {
      showNotification(t('travel.list.invalidTravelId'), 'error');
    }
    handleMenuClose();
  };

  const handleDelete = () => {
    setDeleteDialogOpen(true);
    handleMenuClose();
  };

  const confirmDelete = async () => {
    try {
      const travelId = selectedTravel._id || selectedTravel.id;
      if (!travelId) {
        showNotification(t('travel.list.invalidTravelId'), 'error');
        return;
      }
      
      const response = await apiClient.delete(`/travel/${travelId}`);
      
      // 检查响应是否成功
      if (response.data && response.data.success) {
        showNotification(response.data.message || t('travel.list.deleteSuccess'), 'success');
        // 重新获取数据（而不是从前端移除，因为可能有分页）
        await fetchTravels();
      } else {
        showNotification(response.data?.message || t('travel.list.deleteError'), 'error');
      }
    } catch (error) {
      console.error('Delete travel error:', error);
      console.error('Error response:', error.response);
      
      // 处理不同类型的错误
      let errorMessage = t('travel.list.deleteFailed');
      
      if (error.response) {
        // 服务器返回了错误响应
        if (error.response.data && error.response.data.message) {
          errorMessage = error.response.data.message;
        } else if (error.response.status === 404) {
          errorMessage = t('travel.list.notFound');
        } else if (error.response.status === 403) {
          errorMessage = t('travel.list.noPermission');
        } else if (error.response.status === 400) {
          errorMessage = error.response.data?.message || t('travel.list.onlyDraftCanDelete');
        } else if (error.response.status === 401) {
          errorMessage = t('travel.list.unauthorized');
        }
      } else if (error.request) {
        // 请求已发出但没有收到响应
        errorMessage = t('travel.list.networkError');
      } else {
        // 其他错误
        errorMessage = error.message || t('travel.list.deleteError');
      }
      
      showNotification(errorMessage, 'error');
    } finally {
      setDeleteDialogOpen(false);
      setSelectedTravel(null);
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

  // 处理搜索变化（使用防抖）
  const handleSearchChange = (event) => {
    setSearchTerm(event.target.value);
    setPage(0); // 重置到第一页
  };

  // 处理状态过滤变化
  const handleStatusFilterChange = (event) => {
    setStatusFilter(event.target.value);
    setPage(0); // 重置到第一页
  };

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
        {/* Header */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h4" gutterBottom>
            {t('travel.list.title')}
          </Typography>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => navigate('/travel/new')}
          >
            {t('travel.list.newTravelRequest')}
          </Button>
        </Box>

        {/* Filters */}
        <Paper sx={{ p: 2, mb: 3 }}>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                placeholder={t('placeholders.searchTravel')}
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
                <InputLabel>{t('travel.status')}</InputLabel>
                <Select
                  value={statusFilter}
                  label={t('travel.status')}
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
                >
                  {t('travel.list.clearFilters')}
                </Button>
              </Box>
            </Grid>
          </Grid>
        </Paper>

        {/* Travel Requests Table */}
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell sx={{ minWidth: 120 }}>{t('travel.travelNumber')}</TableCell>
                <TableCell sx={{ minWidth: 250 }}>{t('travel.list.titleColumn')}</TableCell>
                <TableCell sx={{ minWidth: 150 }}>{t('travel.list.destinationColumn')}</TableCell>
                <TableCell sx={{ minWidth: 180 }}>{t('travel.list.datesColumn')}</TableCell>
                <TableCell sx={{ minWidth: 120 }}>{t('travel.list.estimatedCostColumn')}</TableCell>
                <TableCell sx={{ minWidth: 100 }}>{t('travel.list.statusColumn')}</TableCell>
                <TableCell sx={{ minWidth: 150 }}>{t('travel.list.createdColumn')}</TableCell>
                <TableCell sx={{ minWidth: 100 }}>{t('common.actions')}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {travels.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} align="center">
                    <Box sx={{ py: 4 }}>
                      <Typography variant="h6" color="text.secondary">
                        {t('travel.list.noTravelRequests')}
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                        {t('travel.list.noResultsFound')}
                      </Typography>
                    </Box>
                  </TableCell>
                </TableRow>
              ) : (
                travels.map((travel) => (
                  <TableRow key={travel._id || travel.id} hover>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontWeight: 'medium', fontFamily: 'monospace' }}>
                        {travel.travelNumber || '-'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 0 }}>
                        <Avatar sx={{ bgcolor: 'primary.main', width: 32, height: 32, flexShrink: 0 }}>
                          <FlightIcon />
                        </Avatar>
                        <Box sx={{ minWidth: 0, flex: 1 }}>
                          <Typography 
                            variant="subtitle2" 
                            sx={{ 
                              fontWeight: 'bold',
                              wordBreak: 'break-word',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              display: '-webkit-box',
                              WebkitLineClamp: 2,
                              WebkitBoxOrient: 'vertical'
                            }}
                          >
                            {(() => {
                              // 如果 title 有值，显示 title
                              if (travel.title && travel.title.trim()) {
                                return travel.title;
                              }
                              // 否则，使用目的地或差旅描述作为标题
                              const destination = travel.destination || {};
                              const city = destination.city || '';
                              const country = destination.country || '';
                              const destinationText = city && country 
                                ? `${city}, ${country}` 
                                : (city || country || '');
                              const tripDesc = travel.tripDescription?.trim() || '';
                              
                              if (destinationText) {
                                return `${t('travel.list.travelTo')} ${destinationText}`;
                              } else if (tripDesc) {
                                return tripDesc;
                              } else if (travel.travelNumber) {
                                return `${t('travel.list.travelRequest')} ${travel.travelNumber}`;
                              }
                              return t('travel.list.unnamedTravelRequest');
                            })()}
                          </Typography>
                          <Typography 
                            variant="body2" 
                            color="text.secondary"
                            sx={{
                              mt: 0.5,
                              wordBreak: 'break-word',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              display: '-webkit-box',
                              WebkitLineClamp: 1,
                              WebkitBoxOrient: 'vertical'
                            }}
                          >
                            {travel.purpose || travel.tripDescription || t('travel.list.noDescription')}
                          </Typography>
                        </Box>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <LocationIcon color="action" fontSize="small" />
                        <Box>
                          <Typography variant="body2">
                            {(() => {
                              const city = travel.destination?.city || '';
                              const country = travel.destination?.country || '';
                              if (city && country) {
                                return `${city}, ${country}`;
                              } else if (city) {
                                return city;
                              } else if (country) {
                                return country;
                              }
                              return '-';
                            })()}
                          </Typography>
                          {travel.destination?.address && (
                            <Typography variant="caption" color="text.secondary">
                              {travel.destination.address}
                            </Typography>
                          )}
                        </Box>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <CalendarIcon color="action" fontSize="small" />
                        <Box>
                          <Typography variant="body2">
                            {dayjs(travel.dates.departure).format('MMM DD')} - {dayjs(travel.dates.return).format('MMM DD')}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {dayjs(travel.dates.departure).format('YYYY')}
                          </Typography>
                        </Box>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <MoneyIcon color="action" fontSize="small" />
                        <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                          {travel.currency} {travel.estimatedCost.toLocaleString()}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={t(`travel.statuses.${travel.status}`) || travel.status}
                        color={getStatusColor(travel.status)}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {dayjs(travel.createdAt).format('MMM DD, YYYY')}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {dayjs(travel.createdAt).format('HH:mm')}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <IconButton
                        onClick={(e) => handleMenuOpen(e, travel)}
                        size="small"
                      >
                        <MoreVertIcon />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))
              )}
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
            labelRowsPerPage={t('common.rowsPerPage')}
            labelDisplayedRows={({ from, to, count }) => 
              `${from}-${to} ${t('common.of')} ${count !== -1 ? count : `${t('common.moreThan')} ${to}`}`
            }
          />
        </TableContainer>

        {/* 空状态显示（当没有数据且不在加载中时） */}
        {!loading && travels.length === 0 && (
          <Paper sx={{ p: 4, textAlign: 'center', mt: 2 }}>
            <Typography variant="h6" color="text.secondary">
              {t('travel.list.noResultsFound')}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              {searchTerm || statusFilter !== 'all' 
                ? t('travel.list.tryAdjustingSearch')
                : t('travel.list.createFirstRequest')
              }
            </Typography>
            {!searchTerm && statusFilter === 'all' && (
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={() => navigate('/travel/new')}
                sx={{ mt: 2 }}
              >
                {t('travel.list.createTravelRequest')}
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
            <ViewIcon sx={{ mr: 1 }} />
            {t('travel.list.viewDetails')}
          </MenuItem>
          <MenuItem onClick={handleEdit}>
            <EditIcon sx={{ mr: 1 }} />
            {t('travel.list.edit')}
          </MenuItem>
          <MenuItem onClick={handleDelete} sx={{ color: 'error.main' }}>
            <DeleteIcon sx={{ mr: 1 }} />
            {t('travel.list.delete')}
          </MenuItem>
        </Menu>

        {/* Delete Confirmation Dialog */}
        <Dialog
          open={deleteDialogOpen}
          onClose={() => setDeleteDialogOpen(false)}
        >
          <DialogTitle>{t('dialogs.confirmDelete')}</DialogTitle>
          <DialogContent>
            <Typography>
              {t('travel.list.confirmDeleteMessage')} "{selectedTravel?.title}"? 
              {t('travel.list.actionCannotUndone')}
            </Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDeleteDialogOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button onClick={confirmDelete} color="error" variant="contained">
              {t('travel.list.delete')}
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </Container>
  );
};

export default TravelList;
