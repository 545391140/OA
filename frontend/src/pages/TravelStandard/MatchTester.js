import React, { useState } from 'react';
import {
  Container,
  Paper,
  Box,
  Typography,
  TextField,
  Button,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  Card,
  CardContent,
  Divider,
  Chip
} from '@mui/material';
import {
  Science as ScienceIcon
} from '@mui/icons-material';
import axios from 'axios';

const MatchTester = () => {
  const [testData, setTestData] = useState({
    country: 'CN',
    city: '北京',
    cityLevel: 1,
    positionLevel: 8,
    department: '销售部',
    projectCode: ''
  });
  const [matchStrategy, setMatchStrategy] = useState('MERGE_BEST'); // 默认合并最优策略
  const [matchResult, setMatchResult] = useState(null);
  const [testing, setTesting] = useState(false);

  const handleChange = (field, value) => {
    setTestData({
      ...testData,
      [field]: value
    });
  };

  const handleTest = async () => {
    try {
      setTesting(true);
      setMatchResult(null);
      
      // 调用匹配API
        const response = await axios.post('/api/travel-standards/match', {
          country: testData.country,
          city: testData.city,
          cityLevel: testData.cityLevel,
          positionLevel: testData.positionLevel,
          department: testData.department,
          projectCode: testData.projectCode || '',
          matchStrategy: matchStrategy // 添加匹配策略参数
        });
      
      if (response.data.success) {
        setMatchResult(response.data.data);
      } else {
        setMatchResult({
          matched: false,
          message: response.data.message || '未找到匹配的标准'
        });
      }
    } catch (err) {
      console.error('Match test error:', err);
      setMatchResult({
        matched: false,
        message: err.response?.data?.message || '匹配测试失败'
      });
    } finally {
      setTesting(false);
    }
  };

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Paper elevation={3} sx={{ p: 4 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
          <ScienceIcon sx={{ mr: 1, fontSize: 28 }} />
          <Typography variant="h4">标准匹配测试</Typography>
        </Box>

        <Divider sx={{ mb: 4 }} />

        <Alert severity="info" sx={{ mb: 3 }}>
          💡 输入差旅信息，系统将自动匹配最合适的差旅标准
        </Alert>

        <FormControl fullWidth sx={{ mb: 3 }}>
          <InputLabel>匹配策略</InputLabel>
          <Select
            value={matchStrategy}
            label="匹配策略"
            onChange={(e) => setMatchStrategy(e.target.value)}
          >
            <MenuItem value="PRIORITY">优先级策略（只使用优先级最高的标准）</MenuItem>
            <MenuItem value="MERGE_BEST">合并最优策略（默认：合并所有匹配标准，每个费用项取最高限额）</MenuItem>
            <MenuItem value="MERGE_ALL">合并所有策略（合并所有匹配标准的所有费用项）</MenuItem>
          </Select>
        </FormControl>

        <Grid container spacing={3} sx={{ mb: 3 }}>
          <Grid item xs={12} md={6}>
            <FormControl fullWidth>
              <InputLabel>目的地国家</InputLabel>
              <Select
                value={testData.country}
                label="目的地国家"
                onChange={(e) => handleChange('country', e.target.value)}
              >
                <MenuItem value="CN">中国</MenuItem>
                <MenuItem value="US">美国</MenuItem>
                <MenuItem value="JP">日本</MenuItem>
                <MenuItem value="GB">英国</MenuItem>
                <MenuItem value="FR">法国</MenuItem>
                <MenuItem value="DE">德国</MenuItem>
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="目的地城市"
              value={testData.city}
              onChange={(e) => handleChange('city', e.target.value)}
              placeholder="如：北京"
            />
          </Grid>

          <Grid item xs={12} md={6}>
            <FormControl fullWidth>
              <InputLabel>城市级别</InputLabel>
              <Select
                value={testData.cityLevel}
                label="城市级别"
                onChange={(e) => handleChange('cityLevel', parseInt(e.target.value))}
              >
                <MenuItem value={1}>1级 - 一线城市</MenuItem>
                <MenuItem value={2}>2级 - 二线城市</MenuItem>
                <MenuItem value={3}>3级 - 三线城市</MenuItem>
                <MenuItem value={4}>4级 - 其他城市</MenuItem>
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="岗位级别"
              type="number"
              value={testData.positionLevel}
              onChange={(e) => handleChange('positionLevel', parseInt(e.target.value) || 0)}
              placeholder="如：8"
            />
          </Grid>

          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="所属部门"
              value={testData.department}
              onChange={(e) => handleChange('department', e.target.value)}
              placeholder="如：销售部"
            />
          </Grid>

          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="项目编码（可选）"
              value={testData.projectCode}
              onChange={(e) => handleChange('projectCode', e.target.value)}
              placeholder="如：PROJ-2024-001"
            />
          </Grid>
        </Grid>

        <Box sx={{ mb: 3 }}>
          <Button
            variant="contained"
            color="success"
            size="large"
            startIcon={<ScienceIcon />}
            onClick={handleTest}
            disabled={testing}
          >
            {testing ? '测试中...' : '🧪 开始匹配测试'}
          </Button>
        </Box>

        {matchResult && (
          <Card variant="outlined" sx={{ bgcolor: matchResult.matched ? 'success.light' : 'error.light' }}>
            <CardContent>
              {matchResult.matched ? (
                <>
                  <Typography variant="h6" gutterBottom color="success.dark">
                    ✅ 匹配成功
                  </Typography>
                  <Divider sx={{ my: 2 }} />
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      主标准：
                    </Typography>
                    <Typography variant="h6" gutterBottom>
                      {matchResult.primaryStandard?.standardName} ({matchResult.primaryStandard?.standardCode})
                    </Typography>
                    {matchResult.primaryStandard?.priority !== undefined && (
                      <Chip
                        label={`优先级: ${matchResult.primaryStandard.priority}`}
                        size="small"
                        sx={{ mt: 1, mr: 1 }}
                      />
                    )}
                    {matchResult.matchedCount > 1 && (
                      <>
                        <Chip
                          label={`匹配策略: ${matchResult.matchStrategy === 'PRIORITY' ? '优先级' : 
                                  matchResult.matchStrategy === 'MERGE_BEST' ? '合并最优' : 
                                  '合并所有'}`}
                          size="small"
                          color="primary"
                          sx={{ mt: 1, mr: 1 }}
                        />
                        <Chip
                          label={`共 ${matchResult.matchedCount} 个标准匹配`}
                          size="small"
                          color="warning"
                          sx={{ mt: 1 }}
                        />
                      </>
                    )}
                    {matchResult.allMatchedStandards && matchResult.allMatchedStandards.length > 1 && (
                      <Box sx={{ mt: 2 }}>
                        <Typography variant="body2" fontWeight="medium" sx={{ mb: 1 }}>
                          所有匹配的标准:
                        </Typography>
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                          {matchResult.allMatchedStandards.map((std, index) => (
                            <Chip
                              key={std._id}
                              label={`${std.standardName} (优先级: ${std.priority})`}
                              size="small"
                              color={index === 0 ? 'primary' : 'default'}
                            />
                          ))}
                        </Box>
                      </Box>
                    )}
                  </Box>
                  {matchResult.expenses && Object.keys(matchResult.expenses).length > 0 && (
                    <>
                      <Typography variant="subtitle2" gutterBottom sx={{ mt: 2 }}>
                        费用标准明细：
                      </Typography>
                      {Object.entries(matchResult.expenses).map(([key, value]) => (
                        <Box key={key} sx={{ py: 1, borderBottom: '1px solid', borderColor: 'divider' }}>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <Typography variant="body2" fontWeight="medium">
                              {value.itemName || (key === 'accommodation' ? '住宿费' : 
                               key === 'meal' ? '餐饮费' : 
                               key === 'transport' ? '交通费' : 
                               key === 'allowance' ? '补贴' : key)}：
                            </Typography>
                            <Typography variant="body2" fontWeight="medium">
                              {value.limit ? `${value.limit} ${value.unit || ''}` : value.type || '未配置'}
                            </Typography>
                          </Box>
                          {value.sourceStandard && (
                            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                              来源标准: {value.sourceStandard}
                            </Typography>
                          )}
                          {value.sourceStandards && value.sourceStandards.length > 0 && (
                            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                              来源标准: {value.sourceStandards.join(', ')}
                            </Typography>
                          )}
                        </Box>
                      ))}
                    </>
                  )}
                </>
              ) : (
                <>
                  <Typography variant="h6" gutterBottom color="error.dark">
                    ❌ 未找到匹配标准
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {matchResult.message || '请调整测试条件后重试'}
                  </Typography>
                </>
              )}
            </CardContent>
          </Card>
        )}
      </Paper>
    </Container>
  );
};

export default MatchTester;

