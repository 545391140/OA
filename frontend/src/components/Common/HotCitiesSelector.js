import React from 'react';
import {
  Box,
  Typography,
  Chip,
  Grid,
  Paper,
  Avatar
} from '@mui/material';
import {
  Star as StarIcon,
  LocationOn as LocationIcon
} from '@mui/icons-material';
import { getHotCities } from '../../data/ctripCities';

const HotCitiesSelector = ({ 
  onCitySelect, 
  travelType = 'all',
  title = "热门城市",
  maxCities = 8 
}) => {
  const hotCities = getHotCities(travelType).slice(0, maxCities);

  const handleCityClick = (city) => {
    onCitySelect(city.name);
  };

  return (
    <Paper 
      elevation={1} 
      sx={{ 
        p: 2, 
        mb: 2, 
        borderRadius: 2,
        border: '1px solid',
        borderColor: 'divider'
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
        <StarIcon color="warning" sx={{ mr: 1 }} />
        <Typography variant="subtitle1" fontWeight="medium">
          {title}
        </Typography>
      </Box>
      
      <Grid container spacing={1}>
        {hotCities.map((city) => (
          <Grid item key={city.id}>
            <Chip
              avatar={
                <Avatar sx={{ bgcolor: 'primary.main', width: 24, height: 24 }}>
                  <LocationIcon sx={{ fontSize: 14 }} />
                </Avatar>
              }
              label={
                <Box>
                  <Typography variant="body2" fontWeight="medium">
                    {city.name}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {city.country}
                  </Typography>
                </Box>
              }
              onClick={() => handleCityClick(city)}
              variant="outlined"
              sx={{
                height: 'auto',
                py: 1,
                px: 1,
                '& .MuiChip-label': {
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'flex-start',
                  gap: 0.5
                },
                '&:hover': {
                  bgcolor: 'primary.50',
                  borderColor: 'primary.main'
                },
                cursor: 'pointer',
                transition: 'all 0.2s ease-in-out'
              }}
            />
          </Grid>
        ))}
      </Grid>
    </Paper>
  );
};

export default HotCitiesSelector;
