import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  Typography,
  Button,
  Box,
  Grid,
  Chip,
  LinearProgress,
  Alert,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper
} from '@mui/material';
import { useTranslation } from 'react-i18next';
import { SUPPORTED_LOCALES } from '../../utils/localeResolver';
import i18nMonitor from '../../utils/i18nMonitor';

const LanguageSwitchTester = () => {
  const { i18n } = useTranslation();
  const [testResults, setTestResults] = useState([]);
  const [isRunning, setIsRunning] = useState(false);
  const [currentTest, setCurrentTest] = useState(null);

  const languageConfig = {
    'en': { name: 'English', flag: '🇺🇸' },
    'zh': { name: '中文', flag: '🇨🇳' },
    'zh-Hans': { name: '简体中文', flag: '🇨🇳' },
    'zh-Hans-CN': { name: '简体中文（中国）', flag: '🇨🇳' },
    'zh-Hant': { name: '繁體中文', flag: '🇹🇼' },
    'zh-Hant-TW': { name: '繁體中文（台灣）', flag: '🇹🇼' },
    'ja': { name: '日本語', flag: '🇯🇵' },
    'ko': { name: '한국어', flag: '🇰🇷' },
    'ar': { name: 'العربية', flag: '🇸🇦' },
    'he': { name: 'עברית', flag: '🇮🇱' }
  };

  const runPerformanceTest = async () => {
    setIsRunning(true);
    setTestResults([]);
    const results = [];

    const languages = Object.keys(SUPPORTED_LOCALES);
    
    for (let i = 0; i < languages.length; i++) {
      const fromLang = i === 0 ? languages[languages.length - 1] : languages[i - 1];
      const toLang = languages[i];
      
      setCurrentTest(`${fromLang} → ${toLang}`);
      
      // 测试语言切换性能
      const startTime = performance.now();
      
      await new Promise(resolve => {
        i18n.changeLanguage(toLang);
        // 等待语言切换完成
        setTimeout(resolve, 100);
      });
      
      const endTime = performance.now();
      const switchTime = endTime - startTime;
      
      results.push({
        from: fromLang,
        to: toLang,
        switchTime: Math.round(switchTime * 100) / 100,
        timestamp: new Date().toISOString(),
        success: switchTime < 150 // P95目标
      });
      
      setTestResults([...results]);
      
      // 短暂延迟
      await new Promise(resolve => setTimeout(resolve, 200));
    }
    
    setIsRunning(false);
    setCurrentTest(null);
  };

  const calculateStats = () => {
    if (testResults.length === 0) return null;
    
    const times = testResults.map(r => r.switchTime);
    const avg = times.reduce((a, b) => a + b, 0) / times.length;
    const min = Math.min(...times);
    const max = Math.max(...times);
    const p95 = times.sort((a, b) => a - b)[Math.floor(times.length * 0.95)];
    const successRate = (testResults.filter(r => r.success).length / testResults.length) * 100;
    
    return { avg, min, max, p95, successRate };
  };

  const stats = calculateStats();

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h5" gutterBottom>
        语言切换性能测试
      </Typography>
      
      <Grid container spacing={3}>
        <Grid item xs={12} md={8}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                测试控制
              </Typography>
              
              <Box sx={{ mb: 3 }}>
                <Button
                  variant="contained"
                  onClick={runPerformanceTest}
                  disabled={isRunning}
                  sx={{ mr: 2 }}
                >
                  {isRunning ? '测试中...' : '开始性能测试'}
                </Button>
                
                {isRunning && (
                  <Box sx={{ mt: 2 }}>
                    <Typography variant="body2" color="text.secondary">
                      当前测试: {currentTest}
                    </Typography>
                    <LinearProgress sx={{ mt: 1 }} />
                  </Box>
                )}
              </Box>

              {testResults.length > 0 && (
                <TableContainer component={Paper} variant="outlined">
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>语言对</TableCell>
                        <TableCell align="right">切换时间(ms)</TableCell>
                        <TableCell align="center">状态</TableCell>
                        <TableCell>时间戳</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {testResults.map((result, index) => (
                        <TableRow key={index}>
                          <TableCell>
                            <Box sx={{ display: 'flex', alignItems: 'center' }}>
                              <span style={{ marginRight: 8 }}>
                                {languageConfig[result.from]?.flag}
                              </span>
                              {languageConfig[result.from]?.name} → 
                              <span style={{ marginLeft: 8, marginRight: 8 }}>
                                {languageConfig[result.to]?.flag}
                              </span>
                              {languageConfig[result.to]?.name}
                            </Box>
                          </TableCell>
                          <TableCell align="right">
                            <Chip
                              label={`${result.switchTime}ms`}
                              size="small"
                              color={result.success ? 'success' : 'error'}
                            />
                          </TableCell>
                          <TableCell align="center">
                            <Chip
                              label={result.success ? '通过' : '超时'}
                              size="small"
                              color={result.success ? 'success' : 'error'}
                            />
                          </TableCell>
                          <TableCell>
                            {new Date(result.timestamp).toLocaleTimeString()}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                测试统计
              </Typography>
              
              {stats ? (
                <Box>
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="body2" color="text.secondary">
                      平均切换时间
                    </Typography>
                    <Typography variant="h6">
                      {stats.avg.toFixed(2)}ms
                    </Typography>
                  </Box>
                  
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="body2" color="text.secondary">
                      P95切换时间
                    </Typography>
                    <Typography variant="h6" color={stats.p95 <= 150 ? 'success.main' : 'error.main'}>
                      {stats.p95.toFixed(2)}ms
                    </Typography>
                  </Box>
                  
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="body2" color="text.secondary">
                      成功率
                    </Typography>
                    <Typography variant="h6" color={stats.successRate >= 95 ? 'success.main' : 'error.main'}>
                      {stats.successRate.toFixed(1)}%
                    </Typography>
                  </Box>
                  
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="body2" color="text.secondary">
                      最快/最慢
                    </Typography>
                    <Typography variant="body1">
                      {stats.min.toFixed(2)}ms / {stats.max.toFixed(2)}ms
                    </Typography>
                  </Box>
                  
                  {stats.p95 > 150 && (
                    <Alert severity="warning" sx={{ mt: 2 }}>
                      P95切换时间超过150ms目标，需要优化
                    </Alert>
                  )}
                  
                  {stats.successRate < 95 && (
                    <Alert severity="error" sx={{ mt: 2 }}>
                      成功率低于95%，需要检查语言切换逻辑
                    </Alert>
                  )}
                </Box>
              ) : (
                <Typography color="text.secondary">
                  运行测试以查看统计信息
                </Typography>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default LanguageSwitchTester;
