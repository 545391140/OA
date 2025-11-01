import React, { useState } from 'react';
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
  Paper,
  List,
  ListItem,
  ListItemText,
  ListItemIcon
} from '@mui/material';
import {
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Warning as WarningIcon,
  NetworkCheck as NetworkIcon,
  Storage as StorageIcon,
  Api as ApiIcon
} from '@mui/icons-material';
import { runFullDiagnosis, testApiConnection, testNetworkConnection, checkLocalStorage } from '../../utils/apiTest';

const ApiTest = () => {
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);
  const [error, setError] = useState(null);

  const handleRunTest = async () => {
    setLoading(true);
    setError(null);
    setResults(null);

    try {
      const diagnosisResults = await runFullDiagnosis();
      setResults(diagnosisResults);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (success) => {
    if (success === true) return <CheckCircleIcon color="success" />;
    if (success === false) return <ErrorIcon color="error" />;
    return <WarningIcon color="warning" />;
  };

  const getStatusChip = (success) => {
    if (success === true) return <Chip label="成功" color="success" size="small" />;
    if (success === false) return <Chip label="失败" color="error" size="small" />;
    return <Chip label="未知" color="warning" size="small" />;
  };

  return (
    <Container maxWidth="xl">
      <Box sx={{ py: 3 }}>
        <Typography variant="h4" gutterBottom>
          API连接测试
        </Typography>
        
        <Typography variant="body1" color="text.secondary" paragraph>
          测试携程API的连接状态、数据获取和本地缓存情况
        </Typography>

        <Box sx={{ mb: 3 }}>
          <Button
            variant="contained"
            size="large"
            onClick={handleRunTest}
            disabled={loading}
            startIcon={loading ? <CircularProgress size={20} /> : <ApiIcon />}
          >
            {loading ? '测试中...' : '开始测试'}
          </Button>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        {results && (
          <Grid container spacing={3}>
            {/* 网络连接状态 */}
            <Grid item xs={12} md={4}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <NetworkIcon sx={{ mr: 1 }} />
                    <Typography variant="h6">网络连接</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    {getStatusIcon(results.network)}
                    {getStatusChip(results.network)}
                  </Box>
                </CardContent>
              </Card>
            </Grid>

            {/* 本地缓存状态 */}
            <Grid item xs={12} md={8}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <StorageIcon sx={{ mr: 1 }} />
                    <Typography variant="h6">本地缓存</Typography>
                  </Box>
                  <Grid container spacing={2}>
                    {results.cache && Object.entries(results.cache).map(([key, status]) => (
                      <Grid item xs={12} sm={6} key={key}>
                        <Paper sx={{ p: 2 }}>
                          <Typography variant="subtitle2" gutterBottom>
                            {key.replace('ctrip_', '').replace('_cache', '')}
                          </Typography>
                          {status.exists ? (
                            <Box>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                                {getStatusIcon(status.valid)}
                                {getStatusChip(status.valid)}
                              </Box>
                              <Typography variant="body2" color="text.secondary">
                                数据量: {status.dataCount} 条
                              </Typography>
                              <Typography variant="body2" color="text.secondary">
                                缓存时间: {status.age} 小时前
                              </Typography>
                            </Box>
                          ) : (
                            <Typography variant="body2" color="text.secondary">
                              无缓存数据
                            </Typography>
                          )}
                        </Paper>
                      </Grid>
                    ))}
                  </Grid>
                </CardContent>
              </Card>
            </Grid>

            {/* API测试结果 */}
            {results.api && (
              <Grid item xs={12}>
                <Card>
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                      <ApiIcon sx={{ mr: 1 }} />
                      <Typography variant="h6">API测试结果</Typography>
                    </Box>
                    <Grid container spacing={2}>
                      {Object.entries(results.api).map(([apiName, result]) => (
                        <Grid item xs={12} md={4} key={apiName}>
                          <Paper sx={{ p: 2 }}>
                            <Typography variant="subtitle1" gutterBottom>
                              {apiName === 'ticket' ? 'Ticket获取' : 
                               apiName === 'cities' ? '城市API' : 
                               apiName === 'countries' ? '国家API' : apiName}
                            </Typography>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                              {getStatusIcon(result.success)}
                              {getStatusChip(result.success)}
                            </Box>
                            {result.error && (
                              <Alert severity="error" sx={{ mt: 1 }}>
                                {result.error}
                              </Alert>
                            )}
                            {result.data && (
                              <Typography variant="body2" color="text.secondary">
                                {apiName === 'ticket' ? 
                                  `Ticket: ${result.data.substring(0, 20)}...` :
                                  `返回数据: ${JSON.stringify(result.data).length} 字符`
                                }
                              </Typography>
                            )}
                          </Paper>
                        </Grid>
                      ))}
                    </Grid>
                  </CardContent>
                </Card>
              </Grid>
            )}

            {/* 详细日志 */}
            <Grid item xs={12}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    测试详情
                  </Typography>
                  <Typography variant="body2" color="text.secondary" paragraph>
                    测试时间: {results.timestamp}
                  </Typography>
                  <Alert severity="info">
                    请查看浏览器控制台获取详细的测试日志信息
                  </Alert>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        )}
      </Box>
    </Container>
  );
};

export default ApiTest;
