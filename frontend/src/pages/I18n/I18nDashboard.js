import React from 'react';
import { 
  Container, 
  Box, 
  Typography, 
  Paper
} from '@mui/material';
import { useTranslation } from 'react-i18next';
import I18nDashboard from '../../components/Common/I18nDashboard';

const I18nDashboardPage = () => {
  const { t } = useTranslation();
  
  return (
    <Container maxWidth="xl">
      <Box sx={{ py: 3 }}>
        <Typography variant="h4" gutterBottom>
          {t('navigation.i18nMonitor')}
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
