import React from 'react';
import { 
  Container, 
  Box, 
  Typography, 
  Paper
} from '@mui/material';
import I18nDashboard from '../../components/Common/I18nDashboard';

const I18nDashboardPage = () => {
  return (
    <Container maxWidth="xl">
      <Box sx={{ py: 3 }}>
        <Typography variant="h4" gutterBottom>
          国际化监控仪表板
        </Typography>
        
        <Paper sx={{ mt: 2 }}>
          <Box sx={{ p: 3 }}>
            <I18nDashboard />
          </Box>
        </Paper>
      </Box>
    </Container>
  );
};

export default I18nDashboardPage;
