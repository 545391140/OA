import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  Typography,
  Grid,
  Box,
  Chip,
  LinearProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Button,
  Alert,
  AlertTitle,
  Divider,
  IconButton,
  Tooltip
} from '@mui/material';
import {
  Refresh as RefreshIcon,
  Warning as WarningIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Info as InfoIcon,
  Download as DownloadIcon
} from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import i18nMonitor from '../../utils/i18nMonitor';

const I18nDashboard = () => {
  const { t } = useTranslation();
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);

  // 获取监控报告
  const fetchReport = () => {
    setLoading(true);
    try {
      const newReport = i18nMonitor.getReport();
      setReport(newReport);
      setLastUpdated(new Date());
    } catch (error) {
      console.error('Failed to fetch i18n report:', error);
    } finally {
      setLoading(false);
    }
  };

  // 初始加载
  useEffect(() => {
    fetchReport();
  }, []);

  // 导出报告
  const exportReport = () => {
    const exportData = i18nMonitor.exportMetrics();
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `i18n-report-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // 重置指标
  const resetMetrics = () => {
    i18nMonitor.reset();
    fetchReport();
  };

  if (!report) {
    return (
      <Card>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', py: 4 }}>
            <Typography color="text.secondary">
              {t('common.loading')}...
            </Typography>
          </Box>
        </CardContent>
      </Card>
    );
  }

  // 计算状态
  const getStatusColor = (value, threshold, isLowerBetter = false) => {
    if (isLowerBetter) {
      return value <= threshold ? 'success' : 'error';
    }
    return value >= threshold ? 'success' : 'error';
  };

  const getStatusIcon = (value, threshold, isLowerBetter = false) => {
    if (isLowerBetter) {
      return value <= threshold ? <CheckCircleIcon /> : <ErrorIcon />;
    }
    return value >= threshold ? <CheckCircleIcon /> : <ErrorIcon />;
  };

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" gutterBottom>
          国际化监控仪表板
        </Typography>
        <Box>
          <Tooltip title="导出报告">
            <IconButton onClick={exportReport} sx={{ mr: 1 }}>
              <DownloadIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title="重置指标">
            <IconButton onClick={resetMetrics} sx={{ mr: 1 }}>
              <RefreshIcon />
            </IconButton>
          </Tooltip>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={fetchReport}
            disabled={loading}
          >
            刷新
          </Button>
        </Box>
      </Box>

      {lastUpdated && (
        <Typography variant="caption" color="text.secondary" sx={{ mb: 2, display: 'block' }}>
          最后更新: {lastUpdated.toLocaleString()}
        </Typography>
      )}

      {/* 关键指标卡片 */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                {getStatusIcon(report.avgCoverage, 98)}
                <Typography variant="h6" sx={{ ml: 1 }}>
                  翻译覆盖率
                </Typography>
              </Box>
              <Typography variant="h4" color={getStatusColor(report.avgCoverage, 98)}>
                {report.avgCoverage.toFixed(1)}%
              </Typography>
              <Typography variant="body2" color="text.secondary">
                目标: ≥98%
              </Typography>
              <LinearProgress
                variant="determinate"
                value={Math.min(report.avgCoverage, 100)}
                color={getStatusColor(report.avgCoverage, 98)}
                sx={{ mt: 1 }}
              />
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                {getStatusIcon(report.missingKeyRate, 0, true)}
                <Typography variant="h6" sx={{ ml: 1 }}>
                  缺失键率
                </Typography>
              </Box>
              <Typography variant="h4" color={getStatusColor(report.missingKeyRate, 0, true)}>
                {report.missingKeyRate}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                目标: =0 (24h滚动)
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                {getStatusIcon(report.p95SwitchTime, 150, true)}
                <Typography variant="h6" sx={{ ml: 1 }}>
                  切换性能
                </Typography>
              </Box>
              <Typography variant="h4" color={getStatusColor(report.p95SwitchTime, 150, true)}>
                {report.p95SwitchTime.toFixed(0)}ms
              </Typography>
              <Typography variant="body2" color="text.secondary">
                目标: P95 ≤150ms
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                {getStatusIcon(report.hardcodedRate, 0.2, true)}
                <Typography variant="h6" sx={{ ml: 1 }}>
                  硬编码率
                </Typography>
              </Box>
              <Typography variant="h4" color={getStatusColor(report.hardcodedRate, 0.2, true)}>
                {report.hardcodedRate.toFixed(1)}%
              </Typography>
              <Typography variant="body2" color="text.secondary">
                目标: ≤0.2%
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* 警告信息 */}
      {(report.missingKeyRate > 0 || report.avgCoverage < 98 || report.p95SwitchTime > 150 || report.hardcodedRate > 0.2) && (
        <Alert severity="warning" sx={{ mb: 3 }}>
          <AlertTitle>指标异常</AlertTitle>
          以下指标未达到目标值，请检查并修复相关问题。
        </Alert>
      )}

      {/* 详细统计 */}
      <Grid container spacing={3}>
        {/* 回退命中统计 */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                回退命中统计
              </Typography>
              {Object.keys(report.fallbackHits).length > 0 ? (
                <TableContainer component={Paper} variant="outlined">
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>语言对</TableCell>
                        <TableCell align="right">命中次数</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {Object.entries(report.fallbackHits).map(([key, count]) => (
                        <TableRow key={key}>
                          <TableCell>
                            <Chip label={key} size="small" variant="outlined" />
                          </TableCell>
                          <TableCell align="right">{count}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              ) : (
                <Typography color="text.secondary">
                  无回退命中记录
                </Typography>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* 最近语言切换 */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                最近语言切换
              </Typography>
              {report.recentSwitchTimes.length > 0 ? (
                <TableContainer component={Paper} variant="outlined">
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>语言对</TableCell>
                        <TableCell align="right">耗时(ms)</TableCell>
                        <TableCell>时间</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {report.recentSwitchTimes.map((switch_, index) => (
                        <TableRow key={index}>
                          <TableCell>
                            <Chip 
                              label={`${switch_.fromLocale} → ${switch_.toLocale}`} 
                              size="small" 
                              variant="outlined" 
                            />
                          </TableCell>
                          <TableCell align="right">
                            <Chip
                              label={`${switch_.switchTime}ms`}
                              size="small"
                              color={switch_.switchTime > 150 ? 'error' : 'success'}
                            />
                          </TableCell>
                          <TableCell>
                            {new Date(switch_.timestamp).toLocaleTimeString()}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              ) : (
                <Typography color="text.secondary">
                  无语言切换记录
                </Typography>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* 翻译覆盖率详情 */}
        {report.translationCoverage && Object.keys(report.translationCoverage).length > 0 && (
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  翻译覆盖率详情
                </Typography>
                <TableContainer component={Paper} variant="outlined">
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>语言/命名空间</TableCell>
                        <TableCell align="right">总键数</TableCell>
                        <TableCell align="right">已翻译</TableCell>
                        <TableCell align="right">覆盖率</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {Object.entries(report.translationCoverage).map(([key, data]) => (
                        <TableRow key={key}>
                          <TableCell>
                            <Chip label={key} size="small" variant="outlined" />
                          </TableCell>
                          <TableCell align="right">{data.totalKeys}</TableCell>
                          <TableCell align="right">{data.translatedKeys}</TableCell>
                          <TableCell align="right">
                            <Chip
                              label={`${data.coverage.toFixed(1)}%`}
                              size="small"
                              color={data.coverage >= 98 ? 'success' : 'warning'}
                            />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </CardContent>
            </Card>
          </Grid>
        )}

        {/* 缺失键列表 */}
        {report.missingKeys.length > 0 && (
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  缺失的翻译键 ({report.missingKeys.length})
                </Typography>
                <Box sx={{ maxHeight: 300, overflow: 'auto' }}>
                  {report.missingKeys.map((key, index) => (
                    <Chip
                      key={index}
                      label={key}
                      size="small"
                      color="error"
                      sx={{ m: 0.5 }}
                    />
                  ))}
                </Box>
              </CardContent>
            </Card>
          </Grid>
        )}

        {/* 硬编码字符串列表 */}
        {report.hardcodedStrings.length > 0 && (
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  硬编码字符串 ({report.hardcodedStrings.length})
                </Typography>
                <Box sx={{ maxHeight: 300, overflow: 'auto' }}>
                  {report.hardcodedStrings.map((str, index) => (
                    <Chip
                      key={index}
                      label={str}
                      size="small"
                      color="warning"
                      sx={{ m: 0.5 }}
                    />
                  ))}
                </Box>
              </CardContent>
            </Card>
          </Grid>
        )}
      </Grid>
    </Box>
  );
};

export default I18nDashboard;
