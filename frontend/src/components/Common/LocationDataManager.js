/**
 * 地理位置数据管理组件
 * 提供数据获取、缓存管理和状态监控功能
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Grid,
  Chip,
  LinearProgress,
  Alert,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Divider,
  CircularProgress
} from '@mui/material';
import {
  Refresh as RefreshIcon,
  Storage as StorageIcon,
  Flight as FlightIcon,
  Train as TrainIcon,
  LocationCity as CityIcon,
  Delete as DeleteIcon,
  Info as InfoIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Warning as WarningIcon
} from '@mui/icons-material';
import apiClient from '../../utils/axiosConfig';
import {
  clearAllCache,
  getCacheStatus
} from '../../services/locationService';

const LocationDataManager = () => {
  const [loading, setLoading] = useState(false);
  const [cacheStatus, setCacheStatus] = useState(null);
  const [locations, setLocations] = useState([]);
  const [error, setError] = useState(null);
  const [showDetails, setShowDetails] = useState(false);

  // 获取缓存状态
  const fetchCacheStatus = () => {
    const status = getCacheStatus();
    setCacheStatus(status);
  };

  // 获取所有地理位置数据
  const fetchAllLocations = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // 从地理位置管理API获取所有启用的地理位置数据
      const response = await apiClient.get('/locations', {
        params: { status: 'active' }
      });
      
      if (response.data && response.data.success) {
        const allLocations = response.data.data || [];
        setLocations(allLocations);
        fetchCacheStatus();
        console.log('地理位置数据获取成功:', allLocations.length);
      } else {
        throw new Error(response.data?.message || '获取地理位置数据失败');
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || '获取地理位置数据失败');
      console.error('获取地理位置数据失败:', err);
    } finally {
      setLoading(false);
    }
  };

  // 清除缓存
  const handleClearCache = () => {
    clearAllCache();
    fetchCacheStatus();
    setLocations([]);
  };

  // 组件挂载时获取缓存状态
  useEffect(() => {
    fetchCacheStatus();
  }, []);

  // 获取状态图标
  const getStatusIcon = (valid) => {
    if (valid) {
      return <CheckCircleIcon color="success" />;
    }
    return <ErrorIcon color="error" />;
  };

  // 获取状态颜色
  const getStatusColor = (valid) => {
    return valid ? 'success' : 'error';
  };

  // 获取数据类型图标
  const getTypeIcon = (type) => {
    switch (type) {
      case 'airport':
        return <FlightIcon />;
      case 'station':
        return <TrainIcon />;
      case 'city':
        return <CityIcon />;
      default:
        return <CityIcon />;
    }
  };

  // 获取数据类型颜色
  const getTypeColor = (type) => {
    switch (type) {
      case 'airport':
        return 'primary';
      case 'station':
        return 'secondary';
      case 'city':
        return 'success';
      default:
        return 'default';
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h5" gutterBottom sx={{ mb: 3 }}>
        🌍 地理位置数据管理
      </Typography>

      {/* 操作按钮区域 */}
      <Box sx={{ mb: 3, display: 'flex', gap: 2, flexWrap: 'wrap' }}>
        <Button
          variant="contained"
          startIcon={<RefreshIcon />}
          onClick={fetchAllLocations}
          disabled={loading}
          sx={{ minWidth: 150 }}
        >
          {loading ? '获取中...' : '获取所有数据'}
        </Button>
        
        <Button
          variant="outlined"
          startIcon={<StorageIcon />}
          onClick={fetchCacheStatus}
          sx={{ minWidth: 120 }}
        >
          刷新缓存状态
        </Button>
        
        <Button
          variant="outlined"
          color="error"
          startIcon={<DeleteIcon />}
          onClick={handleClearCache}
          sx={{ minWidth: 120 }}
        >
          清除缓存
        </Button>
        
        <Button
          variant="outlined"
          startIcon={<InfoIcon />}
          onClick={() => setShowDetails(true)}
          disabled={locations.length === 0}
          sx={{ minWidth: 120 }}
        >
          查看详情
        </Button>
      </Box>

      {/* 加载进度条 */}
      {loading && (
        <Box sx={{ mb: 3 }}>
          <LinearProgress />
          <Typography variant="body2" sx={{ mt: 1, textAlign: 'center' }}>
            正在获取地理位置数据...
          </Typography>
        </Box>
      )}

      {/* 错误提示 */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {/* 缓存状态卡片 */}
      {cacheStatus && (
        <Grid container spacing={3} sx={{ mb: 3 }}>
          <Grid item xs={12} md={4}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <FlightIcon sx={{ mr: 1 }} />
                  <Typography variant="h6">机场数据</Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                  {getStatusIcon(cacheStatus.airports.valid)}
                  <Typography variant="body2" sx={{ ml: 1 }}>
                    状态: {cacheStatus.airports.valid ? '有效' : '无效/缺失'}
                  </Typography>
                </Box>
                {cacheStatus.airports.data && (
                  <Typography variant="body2" color="text.secondary">
                    数量: {cacheStatus.airports.data.length} 个机场
                  </Typography>
                )}
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={4}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <TrainIcon sx={{ mr: 1 }} />
                  <Typography variant="h6">火车站数据</Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                  {getStatusIcon(cacheStatus.stations.valid)}
                  <Typography variant="body2" sx={{ ml: 1 }}>
                    状态: {cacheStatus.stations.valid ? '有效' : '无效/缺失'}
                  </Typography>
                </Box>
                {cacheStatus.stations.data && (
                  <Typography variant="body2" color="text.secondary">
                    数量: {cacheStatus.stations.data.length} 个火车站
                  </Typography>
                )}
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={4}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <CityIcon sx={{ mr: 1 }} />
                  <Typography variant="h6">城市数据</Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                  {getStatusIcon(cacheStatus.cities.valid)}
                  <Typography variant="body2" sx={{ ml: 1 }}>
                    状态: {cacheStatus.cities.valid ? '有效' : '无效/缺失'}
                  </Typography>
                </Box>
                {cacheStatus.cities.data && (
                  <Typography variant="body2" color="text.secondary">
                    数量: {cacheStatus.cities.data.length} 个城市
                  </Typography>
                )}
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* 数据统计 */}
      {locations.length > 0 && (
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              📊 数据统计
            </Typography>
            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
              <Chip
                icon={<FlightIcon />}
                label={`机场: ${locations.filter(l => l.type === 'airport').length}`}
                color="primary"
                variant="outlined"
              />
              <Chip
                icon={<TrainIcon />}
                label={`火车站: ${locations.filter(l => l.type === 'station').length}`}
                color="secondary"
                variant="outlined"
              />
              <Chip
                icon={<CityIcon />}
                label={`城市: ${locations.filter(l => l.type === 'city').length}`}
                color="success"
                variant="outlined"
              />
              <Chip
                label={`总计: ${locations.length}`}
                color="default"
                variant="outlined"
              />
            </Box>
          </CardContent>
        </Card>
      )}

      {/* 详情对话框 */}
      <Dialog
        open={showDetails}
        onClose={() => setShowDetails(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          地理位置数据详情
        </DialogTitle>
        <DialogContent>
          <List>
            {locations.slice(0, 50).map((location, index) => (
              <React.Fragment key={location.id}>
                <ListItem>
                  <ListItemIcon>
                    {getTypeIcon(location.type)}
                  </ListItemIcon>
                  <ListItemText
                    primary={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography variant="subtitle1">
                          {location.name}
                        </Typography>
                        <Chip
                          label={location.type}
                          size="small"
                          color={getTypeColor(location.type)}
                        />
                        <Chip
                          label={location.code}
                          size="small"
                          variant="outlined"
                        />
                      </Box>
                    }
                    secondary={
                      <Typography variant="body2" color="text.secondary">
                        {location.city}, {location.country}
                        {location.coordinates && (
                          <span> • {location.coordinates.latitude}, {location.coordinates.longitude}</span>
                        )}
                      </Typography>
                    }
                  />
                </ListItem>
                {index < Math.min(locations.length - 1, 49) && <Divider />}
              </React.Fragment>
            ))}
            {locations.length > 50 && (
              <ListItem>
                <ListItemText
                  primary={
                    <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center' }}>
                      显示前50条记录，共{locations.length}条
                    </Typography>
                  }
                />
              </ListItem>
            )}
          </List>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowDetails(false)}>
            关闭
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default LocationDataManager;
