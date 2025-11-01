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
      // Mock data - replace with actual API call
      const mockData = [
        {
          id: 1,
          title: 'Business Trip to Tokyo',
          purpose: 'Client meeting and product demonstration',
          destination: {
            country: 'Japan',
            city: 'Tokyo',
            address: 'Shibuya, Tokyo'
          },
          dates: {
            departure: '2024-02-15',
            return: '2024-02-20'
          },
          estimatedCost: 2500,
          currency: 'USD',
          status: 'approved',
          createdAt: '2024-01-15T10:30:00Z',
          employee: {
            firstName: 'John',
            lastName: 'Doe',
            email: 'john.doe@company.com'
          }
        },
        {
          id: 2,
          title: 'Conference in Singapore',
          purpose: 'Tech conference and networking',
          destination: {
            country: 'Singapore',
            city: 'Singapore',
            address: 'Marina Bay Sands'
          },
          dates: {
            departure: '2024-03-10',
            return: '2024-03-15'
          },
          estimatedCost: 1800,
          currency: 'USD',
          status: 'submitted',
          createdAt: '2024-01-20T14:15:00Z',
          employee: {
            firstName: 'Jane',
            lastName: 'Smith',
            email: 'jane.smith@company.com'
          }
        },
        {
          id: 3,
          title: 'Client Meeting in Seoul',
          purpose: 'Quarterly business review',
          destination: {
            country: 'South Korea',
            city: 'Seoul',
            address: 'Gangnam, Seoul'
          },
          dates: {
            departure: '2024-04-05',
            return: '2024-04-08'
          },
          estimatedCost: 1200,
          currency: 'USD',
          status: 'draft',
          createdAt: '2024-01-25T09:45:00Z',
          employee: {
            firstName: 'Mike',
            lastName: 'Johnson',
            email: 'mike.johnson@company.com'
          }
        }
      ];
      setTravels(mockData);
    } catch (error) {
      showNotification('Failed to load travel requests', 'error');
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
    navigate(`/travel/${selectedTravel.id}`);
    handleMenuClose();
  };

  const handleEdit = () => {
    navigate(`/travel/${selectedTravel.id}/edit`);
    handleMenuClose();
  };

  const handleDelete = () => {
    setDeleteDialogOpen(true);
    handleMenuClose();
  };

  const confirmDelete = async () => {
    try {
      // Mock API call - replace with actual implementation
      console.log('Deleting travel request:', selectedTravel.id);
      
      setTravels(prev => prev.filter(travel => travel.id !== selectedTravel.id));
      showNotification('Travel request deleted successfully', 'success');
    } catch (error) {
      showNotification('Failed to delete travel request', 'error');
    } finally {
      setDeleteDialogOpen(false);
      setSelectedTravel(null);
    }
  };

  const filteredTravels = travels.filter(travel => {
    const matchesSearch = travel.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         travel.destination.city.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         travel.destination.country.toLowerCase().includes(searchTerm.toLowerCase());
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
                <TableRow key={travel.id} hover>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Avatar sx={{ bgcolor: 'primary.main', width: 32, height: 32 }}>
                        <FlightIcon />
                      </Avatar>
                      <Box>
                        <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>
                          {travel.title}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {travel.purpose}
                        </Typography>
                      </Box>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <LocationIcon color="action" fontSize="small" />
                      <Box>
                        <Typography variant="body2">
                          {travel.destination.city}, {travel.destination.country}
                        </Typography>
                        {travel.destination.address && (
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
