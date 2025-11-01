import React, { useState } from 'react';
import { 
  Container, 
  Box, 
  Typography, 
  Paper, 
  Tabs, 
  Tab,
  Grid
} from '@mui/material';
import I18nDashboard from '../../components/Common/I18nDashboard';
import LanguageSwitchTester from '../../components/Common/LanguageSwitchTester';

const I18nDashboardPage = () => {
  const [tabValue, setTabValue] = useState(0);

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  return (
    <Container maxWidth="xl">
      <Box sx={{ py: 3 }}>
        <Typography variant="h4" gutterBottom>
          国际化监控仪表板
        </Typography>
        
        <Paper sx={{ mt: 2 }}>
          <Tabs 
            value={tabValue} 
            onChange={handleTabChange}
            sx={{ borderBottom: 1, borderColor: 'divider' }}
          >
            <Tab label="监控指标" />
            <Tab label="性能测试" />
          </Tabs>
          
          <Box sx={{ p: 3 }}>
            {tabValue === 0 && <I18nDashboard />}
            {tabValue === 1 && <LanguageSwitchTester />}
          </Box>
        </Paper>
      </Box>
    </Container>
  );
};

export default I18nDashboardPage;
