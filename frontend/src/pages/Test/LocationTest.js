/**
 * 地理位置功能测试页面
 * 提供完整的功能测试和验证
 */

import React, { useState, useEffect } from 'react';
import {
  Container,
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  Grid,
  Chip,
  Alert,
  CircularProgress,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemIcon
} from '@mui/material';
import {
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Flight as FlightIcon,
  Train as TrainIcon,
  LocationCity as CityIcon,
  Refresh as RefreshIcon
} from '@mui/icons-material';
import { testLocationService } from '../../utils/locationTest';
import { getCacheStatus } from '../../services/locationService';

const LocationTest = () => {
  const [testing, setTesting] = useState(false);
  const [testResults, setTestResults] = useState(null);
  const [cacheStatus, setCacheStatus] = useState(null);

  // 获取缓存状态
  const fetchCacheStatus = () => {
    const status = getCacheStatus();
    setCacheStatus(status);
  };

  // 运行测试
  const handleRunTest = async () => {
    setTesting(true);
    setTestResults(null);
    
    try {
      const results = await testLocationService();
      setTestResults(results);
    } catch (error) {
      console.error('测试失败:', error);
    } finally {
      setTesting(false);
      fetchCacheStatus();
    }
  };

  // 组件挂载时获取缓存状态
  useEffect(() => {
    fetchCacheStatus();
  }, []);

  return (
    <Container maxWidth="xl">
      <Box sx={{ py: 3 }}>
        <Typography variant="h4" gutterBottom sx={{ 
          background: 'linear-gradient(45deg, #1976d2, #42a5f5)',
          backgroundClip: 'text',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          fontWeight: 700,
          mb: 3
        }}>
          🧪 地理位置功能测试
        </Typography>

        {/* 测试控制区域 */}
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
              <Button
                variant="contained"
                startIcon={testing ? <CircularProgress size={16} /> : <RefreshIcon />}
                onClick={handleRunTest}
                disabled={testing}
                size="large"
              >
                {testing ? '测试运行中...' : '开始测试'}
              </Button>
              
              <Button
                variant="outlined"
                onClick={fetchCacheStatus}
                size="large"
              >
                刷新缓存状态
              </Button>
            </Box>
            
            <Typography variant="body2" color="text.secondary">
              点击"开始测试"按钮将运行完整的地理位置功能测试，包括数据获取、缓存机制、搜索功能等。
            </Typography>
          </CardContent>
        </Card>

        {/* 缓存状态 */}
        {cacheStatus && (
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                💾 缓存状态
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} md={4}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <FlightIcon />
                    <Typography variant="subtitle2">机场数据</Typography>
                    <Chip
                      label={cacheStatus.airports.valid ? '有效' : '无效'}
                      color={cacheStatus.airports.valid ? 'success' : 'error'}
                      size="small"
                    />
                    {cacheStatus.airports.data && (
                      <Typography variant="body2" color="text.secondary">
                        ({cacheStatus.airports.data.length} 条)
                      </Typography>
                    )}
                  </Box>
                </Grid>
                <Grid item xs={12} md={4}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <TrainIcon />
                    <Typography variant="subtitle2">火车站数据</Typography>
                    <Chip
                      label={cacheStatus.stations.valid ? '有效' : '无效'}
                      color={cacheStatus.stations.valid ? 'success' : 'error'}
                      size="small"
                    />
                    {cacheStatus.stations.data && (
                      <Typography variant="body2" color="text.secondary">
                        ({cacheStatus.stations.data.length} 条)
                      </Typography>
                    )}
                  </Box>
                </Grid>
                <Grid item xs={12} md={4}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <CityIcon />
                    <Typography variant="subtitle2">城市数据</Typography>
                    <Chip
                      label={cacheStatus.cities.valid ? '有效' : '无效'}
                      color={cacheStatus.cities.valid ? 'success' : 'error'}
                      size="small"
                    />
                    {cacheStatus.cities.data && (
                      <Typography variant="body2" color="text.secondary">
                        ({cacheStatus.cities.data.length} 条)
                      </Typography>
                    )}
                  </Box>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        )}

        {/* 测试结果 */}
        {testResults && (
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                📊 测试结果
              </Typography>
              
              {/* 总体结果 */}
              <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', mb: 3 }}>
                <Chip
                  label={`总测试: ${testResults.total}`}
                  color="default"
                  variant="outlined"
                />
                <Chip
                  label={`通过: ${testResults.passed}`}
                  color="success"
                  variant="outlined"
                />
                <Chip
                  label={`失败: ${testResults.failed}`}
                  color={testResults.failed > 0 ? "error" : "default"}
                  variant="outlined"
                />
                <Chip
                  label={`成功率: ${((testResults.passed / testResults.total) * 100).toFixed(1)}%`}
                  color={testResults.failed === 0 ? "success" : "warning"}
                  variant="outlined"
                />
              </Box>

              {/* 成功/失败状态 */}
              {testResults.failed === 0 ? (
                <Alert severity="success" sx={{ mb: 2 }}>
                  🎉 所有测试通过！地理位置功能运行正常！
                </Alert>
              ) : (
                <Alert severity="warning" sx={{ mb: 2 }}>
                  ⚠️ 部分测试失败，请检查错误信息
                </Alert>
              )}

              {/* 错误详情 */}
              {testResults.errors.length > 0 && (
                <Alert severity="error" sx={{ mb: 2 }}>
                  <Typography variant="subtitle2" gutterBottom>
                    ❌ 错误详情:
                  </Typography>
                  <List dense>
                    {testResults.errors.map((error, index) => (
                      <ListItem key={index}>
                        <ListItemIcon>
                          <ErrorIcon color="error" />
                        </ListItemIcon>
                        <ListItemText
                          primary={`${index + 1}. ${error}`}
                        />
                      </ListItem>
                    ))}
                  </List>
                </Alert>
              )}
            </CardContent>
          </Card>
        )}

        {/* 测试说明 */}
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              📋 测试说明
            </Typography>
            <List>
              <ListItem>
                <ListItemIcon>
                  <CheckCircleIcon color="success" />
                </ListItemIcon>
                <ListItemText
                  primary="缓存状态检查"
                  secondary="验证localStorage中的缓存数据是否有效"
                />
              </ListItem>
              <ListItem>
                <ListItemIcon>
                  <CheckCircleIcon color="success" />
                </ListItemIcon>
                <ListItemText
                  primary="机场数据获取"
                  secondary="测试从携程API获取机场信息功能"
                />
              </ListItem>
              <ListItem>
                <ListItemIcon>
                  <CheckCircleIcon color="success" />
                </ListItemIcon>
                <ListItemText
                  primary="火车站数据获取"
                  secondary="测试从携程API获取火车站信息功能"
                />
              </ListItem>
              <ListItem>
                <ListItemIcon>
                  <CheckCircleIcon color="success" />
                </ListItemIcon>
                <ListItemText
                  primary="城市数据获取"
                  secondary="测试从携程API获取城市信息功能"
                />
              </ListItem>
              <ListItem>
                <ListItemIcon>
                  <CheckCircleIcon color="success" />
                </ListItemIcon>
                <ListItemText
                  primary="搜索功能测试"
                  secondary="测试中英文搜索、代码搜索功能"
                />
              </ListItem>
              <ListItem>
                <ListItemIcon>
                  <CheckCircleIcon color="success" />
                </ListItemIcon>
                <ListItemText
                  primary="缓存机制测试"
                  secondary="测试缓存清除和重新获取功能"
                />
              </ListItem>
            </List>
          </CardContent>
        </Card>
      </Box>
    </Container>
  );
};

export default LocationTest;



