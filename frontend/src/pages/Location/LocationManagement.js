/**
 * 地理位置管理页面
 * 提供地理位置数据的获取、管理和监控功能
 */

import React from 'react';
import { Container, Box, Typography } from '@mui/material';
import LocationDataManager from '../../components/Common/LocationDataManager';

const LocationManagement = () => {
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
          🌍 地理位置数据管理
        </Typography>
        
        <LocationDataManager />
      </Box>
    </Container>
  );
};

export default LocationManagement;



