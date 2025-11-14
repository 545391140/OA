import React from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Chip,
  useTheme,
  alpha,
  IconButton,
  Tooltip,
} from '@mui/material';
import {
  AttachMoney as MoneyIcon,
  Info as InfoIcon,
} from '@mui/icons-material';
import ModernInput from './ModernInput';

const ModernExpenseItem = ({
  tripType,
  category,
  label,
  icon,
  unitLabel = '单价',
  unitPrice,
  quantity,
  subtotal,
  currency = 'USD',
  onUnitPriceChange,
  onQuantityChange,
  error,
  helperText,
  disabled = false,
  quantityDisabled = false,
  showInfo = false,
  infoText = '',
}) => {
  const theme = useTheme();

  const getCategoryColor = (category) => {
    const colors = {
      flight: theme.palette.primary.main,
      accommodation: theme.palette.secondary.main,
      localTransport: theme.palette.info.main,
      airportTransfer: theme.palette.warning.main,
      allowance: theme.palette.success.main,
    };
    return colors[category] || theme.palette.primary.main;
  };

  const categoryColor = getCategoryColor(category);

  return (
    <Card
      sx={{
        mb: 1,
        border: 'none',
        borderRadius: 2,
        overflow: 'hidden',
        transition: 'all 0.3s ease',
        '&:hover': {
          boxShadow: `0 4px 12px ${alpha(theme.palette.primary.main, 0.15)}`,
        },
      }}
    >
      <CardContent sx={{ p: 1.25 }}>
        {/* 头部 */}
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Box
              sx={{
                width: 32,
                height: 32,
                borderRadius: 1.5,
                backgroundColor: alpha(categoryColor, 0.1),
                color: categoryColor,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1rem',
              }}
            >
              {icon}
            </Box>
            <Box>
              <Typography
                variant="subtitle1"
                sx={{
                  fontWeight: 600,
                  color: theme.palette.text.primary,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 0.5,
                  fontSize: '1rem',
                }}
              >
                {label}
                {showInfo && (
                  <Tooltip title={infoText} arrow>
                    <IconButton size="small" sx={{ p: 0.25, ml: 0.25 }}>
                      <InfoIcon sx={{ fontSize: '0.9rem', color: theme.palette.text.secondary }} />
                    </IconButton>
                  </Tooltip>
                )}
              </Typography>
            </Box>
          </Box>
        </Box>

        {/* 输入区域 */}
        <Grid container spacing={1} alignItems="stretch">
          <Grid item xs={12} sm={3}>
            <Box
              sx={{
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'flex-end',
                p: 0.75,
                backgroundColor: alpha(theme.palette.grey[100], 0.5),
                borderRadius: 1,
                textAlign: 'center',
                // 匹配TextField的实际高度（small size约56px）
                height: '56px',
                boxSizing: 'border-box',
              }}
            >
              <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 0.25, fontSize: '0.65rem', lineHeight: 1.2 }}>
                货币
              </Typography>
              <Typography variant="body2" fontWeight={500} sx={{ fontSize: '0.8rem', lineHeight: 1.2 }}>
                {currency}
              </Typography>
            </Box>
          </Grid>

          <Grid item xs={12} sm={4}>
            <Box sx={{ height: '56px', display: 'flex', alignItems: 'flex-end' }}>
              <ModernInput
                type="number"
                label={`${unitLabel} *`}
                value={unitPrice}
                onChange={onUnitPriceChange}
                error={error}
                helperText=""
                disabled={disabled}
                startAdornment={<MoneyIcon sx={{ color: theme.palette.text.secondary, fontSize: '1rem' }} />}
                size="small"
                sx={{
                  width: '100%',
                  '& .MuiOutlinedInput-root': {
                    backgroundColor: theme.palette.background.paper,
                    height: '40px',
                  },
                  '& .MuiInputLabel-root': {
                    fontSize: '0.75rem',
                  },
                }}
              />
            </Box>
          </Grid>

          <Grid item xs={12} sm={2}>
            <Box sx={{ height: '56px', display: 'flex', alignItems: 'flex-end' }}>
              <ModernInput
                type="number"
                label="数量 *"
                value={quantity}
                onChange={onQuantityChange}
                disabled={disabled || quantityDisabled}
                size="small"
                helperText=""
                sx={{
                  width: '100%',
                  '& .MuiOutlinedInput-root': {
                    backgroundColor: quantityDisabled ? alpha(theme.palette.grey[100], 0.5) : theme.palette.background.paper,
                    height: '40px',
                  },
                  '& .MuiInputLabel-root': {
                    fontSize: '0.75rem',
                  },
                }}
              />
            </Box>
          </Grid>

          <Grid item xs={12} sm={3}>
            <Box
              sx={{
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                alignItems: 'center',
                p: 0.75,
                backgroundColor: alpha(categoryColor, 0.05),
                borderRadius: 1,
                border: `1px solid ${alpha(categoryColor, 0.2)}`,
                textAlign: 'center',
                // 匹配TextField的实际高度
                height: '56px',
                boxSizing: 'border-box',
              }}
            >
              <Typography
                variant="body2"
                sx={{
                  fontWeight: 600,
                  color: categoryColor,
                  lineHeight: 1.2,
                  fontSize: '0.9rem',
                }}
              >
                {currency} {subtotal || '0.00'}
              </Typography>
            </Box>
          </Grid>
        </Grid>
      </CardContent>
    </Card>
  );
};

export default ModernExpenseItem;
