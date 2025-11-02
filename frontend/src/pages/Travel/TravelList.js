
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

  const statusOptions = [
    { value: 'all', label: 'All Status' },
    { value: 'draft', label: 'Draft' },
    { value: 'submitted', label: 'Submitted' },
    { value: 'approved', label: 'Approved' },
    { value: 'rejected', label: 'Rejected' },
    { value: 'in-progress', label: 'In Progress' },
    { value: 'completed', label: 'Completed' },
    { value: 'cancelled', label: 'Cancelled' }
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
  }, []);

  const fetchTravels = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get('/travel');
      
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
      } else {
        throw new Error(response.data?.message || '获取差旅申请列表失败');
      }
    } catch (error) {
      console.error('Fetch travels error:', error);
      showNotification(error.response?.data?.message || 'Failed to load travel requests', 'error');
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
      showNotification('无效的差旅申请ID', 'error');
    }
    handleMenuClose();
  };

  const handleEdit = () => {
    // 确保使用正确的 ID（_id 或 id）
    const travelId = selectedTravel._id || selectedTravel.id;
    if (travelId) {
      navigate(`/travel/${travelId}/edit`);
    } else {
      showNotification('无效的差旅申请ID', 'error');
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
        showNotification('无效的差旅申请ID', 'error');
        return;
      }
      
      await apiClient.delete(`/travel/${travelId}`);
      setTravels(prev => prev.filter(travel => {
        const id = travel._id || travel.id;
        return id !== travelId;
      }));
      showNotification('Travel request deleted successfully', 'success');
    } catch (error) {
      console.error('Delete travel error:', error);
      showNotification(error.response?.data?.message || 'Failed to delete travel request', 'error');
    } finally {
      setDeleteDialogOpen(false);
      setSelectedTravel(null);
    }
  };

  const filteredTravels = travels.filter(travel => {
    const destination = travel.destination || {};
    const destinationCity = destination.city || '';
    const destinationCountry = destination.country || '';
    const title = travel.title || '';
    
    const matchesSearch = !searchTerm || 
                         title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         destinationCity.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         destinationCountry.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || travel.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

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
            {t('travel.travelList')}
          </Typography>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => navigate('/travel/new')}
          >
            New Travel Request
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
                onChange={(e) => setSearchTerm(e.target.value)}
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
                  onChange={(e) => setStatusFilter(e.target.value)}
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
                  }}
                >
                  Clear Filters
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
                <TableCell>{t('travel.travelNumber')}</TableCell>
                <TableCell>Title</TableCell>
                <TableCell>Destination</TableCell>
                <TableCell>Dates</TableCell>
                <TableCell>Estimated Cost</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Created</TableCell>
                <TableCell>{t('common.actions')}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredTravels.map((travel) => (
                <TableRow key={travel._id || travel.id} hover>
                  <TableCell>
                    <Typography variant="body2" sx={{ fontWeight: 'medium', fontFamily: 'monospace' }}>
                      {travel.travelNumber || '-'}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Avatar sx={{ bgcolor: 'primary.main', width: 32, height: 32 }}>
                        <FlightIcon />
                      </Avatar>
                      <Box>
                        <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>
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
                              return `差旅至 ${destinationText}`;
                            } else if (tripDesc) {
                              return tripDesc.length > 30 ? tripDesc.substring(0, 30) + '...' : tripDesc;
                            } else if (travel.travelNumber) {
                              return `差旅申请 ${travel.travelNumber}`;
                            }
                            return '未命名差旅申请';
                          })()}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {travel.purpose || travel.tripDescription || '暂无描述'}
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
                      label={travel.status}
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
              ))}
            </TableBody>
          </Table>
        </TableContainer>

        {filteredTravels.length === 0 && (
          <Paper sx={{ p: 4, textAlign: 'center', mt: 2 }}>
            <Typography variant="h6" color="text.secondary">
              No travel requests found
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              {searchTerm || statusFilter !== 'all' 
                ? 'Try adjusting your search criteria'
                : 'Create your first travel request to get started'
              }
            </Typography>
            {!searchTerm && statusFilter === 'all' && (
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={() => navigate('/travel/new')}
                sx={{ mt: 2 }}
              >
                Create Travel Request
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
            View Details
          </MenuItem>
          <MenuItem onClick={handleEdit}>
            <EditIcon sx={{ mr: 1 }} />
            Edit
          </MenuItem>
          <MenuItem onClick={handleDelete} sx={{ color: 'error.main' }}>
            <DeleteIcon sx={{ mr: 1 }} />
            Delete
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
              Are you sure you want to delete the travel request "{selectedTravel?.title}"? 
              This action cannot be undone.
            </Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={confirmDelete} color="error" variant="contained">
              Delete
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </Container>
  );
};

export default TravelList;
