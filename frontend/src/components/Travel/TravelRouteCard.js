import React from 'react';
import {
  Card,
  CardContent,
  Typography,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Box,
  IconButton,
  Alert
} from '@mui/material';
import { Delete as DeleteIcon } from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import RegionSelector from '../Common/RegionSelector';

const TravelRouteCard = ({
  title,
  icon = '✈️',
  routeData,
  transportationOptions = [],
  errors = {},
  onTransportationChange,
  onDateChange,
  onDepartureChange,
  onDestinationChange,
  onDelete,
  showDelete = false,
  distance = null,
  formatDistance = null
}) => {
  return (
    <Card 
      variant="outlined" 
      sx={{ 
        mb: 1.5,
        borderRadius: 2,
        boxShadow: '0 2px 8px rgba(0,0,0,0.08)'
      }}
    >
      <CardContent>
        {/* 标题和删除按钮 */}
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
          <Typography variant="h6" sx={{ fontWeight: 600 }}>
            {icon} {title}
          </Typography>
          {showDelete && (
            <IconButton
              onClick={onDelete}
              color="error"
              size="small"
            >
              <DeleteIcon />
            </IconButton>
          )}
        </Box>

        <Grid container spacing={2}>
          {/* 交通工具 */}
          <Grid item xs={12} md={3}>
            <FormControl fullWidth>
              <InputLabel>交通工具 *</InputLabel>
              <Select
                value={routeData.transportation || ''}
                onChange={onTransportationChange}
                label="交通工具 *"
                error={!!errors.transportation}
              >
                {transportationOptions.map((option) => (
                  <MenuItem key={option.value} value={option.value}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      {option.icon}
                      {option.label}
                    </Box>
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          {/* 出发日期 */}
          <Grid item xs={12} md={3}>
            <DatePicker
              label="出发日期 *"
              value={routeData.date}
              onChange={onDateChange}
              slotProps={{
                textField: {
                  fullWidth: true,
                  error: !!errors.date,
                  helperText: errors.date,
                }
              }}
            />
          </Grid>

          {/* 出发地 */}
          <Grid item xs={12} md={3}>
            <RegionSelector
              label="出发地"
              value={routeData.departure}
              onChange={onDepartureChange}
              placeholder="搜索城市或机场"
              error={!!errors.departure}
              helperText={errors.departure}
              required
              transportationType={routeData.transportation}
            />
          </Grid>

          {/* 目的地 */}
          <Grid item xs={12} md={3}>
            <RegionSelector
              label="目的地"
              value={routeData.destination}
              onChange={onDestinationChange}
              placeholder="搜索城市或机场"
              error={!!errors.destination}
              helperText={errors.destination}
              required
              transportationType={routeData.transportation}
            />
          </Grid>
        </Grid>

        {/* 距离显示 */}
        {distance !== null && formatDistance && (
          <Box sx={{ mt: 2 }}>
            <Alert 
              severity="info" 
              sx={{ 
                backgroundColor: '#e3f2fd',
                '& .MuiAlert-icon': {
                  color: '#1976d2'
                }
              }}
            >
              <Typography variant="body2">
                📏 距离信息：{typeof routeData.departure === 'string' 
                  ? routeData.departure 
                  : (routeData.departure?.name || `${routeData.departure?.city || ''}, ${routeData.departure?.country || ''}`.trim() || '未选择')} 
                → {typeof routeData.destination === 'string' 
                  ? routeData.destination 
                  : (routeData.destination?.name || `${routeData.destination?.city || ''}, ${routeData.destination?.country || ''}`.trim() || '未选择')} 
                <strong> {formatDistance(distance)}</strong>
                {distance && distance > 1000 && (
                  <span style={{ marginLeft: '8px', color: '#666' }}>
                    (约 {Math.round(distance / 800)} 小时飞行时间)
                  </span>
                )}
              </Typography>
            </Alert>
          </Box>
        )}
      </CardContent>
    </Card>
  );
};

export default TravelRouteCard;

