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
        mb: 2,
        border: 'none',
        borderRadius: 2,
        overflow: 'hidden',
        transition: 'all 0.3s ease',
        '&:hover': {
          boxShadow: `0 4px 12px ${alpha(theme.palette.primary.main, 0.15)}`,
        },
      }}
    >
      <CardContent sx={{ p: 2.5 }}>
        {/* 头部 */}
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Box
              sx={{
                width: 40,
                height: 40,
                borderRadius: 2,
                backgroundColor: alpha(categoryColor, 0.1),
                color: categoryColor,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.2rem',
              }}
            >
              {icon}
            </Box>
            <Box>
              <Typography
                variant="h6"
                sx={{
                  fontWeight: 600,
                  color: theme.palette.text.primary,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1,
                }}
              >
                {label}
                {showInfo && (
                  <Tooltip title={infoText} arrow>
                    <IconButton size="small" sx={{ p: 0.5 }}>
                      <InfoIcon sx={{ fontSize: '1rem', color: theme.palette.text.secondary }} />
                    </IconButton>
                  </Tooltip>
                )}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {tripType === 'outbound' ? '去程' : '返程'} • {category}
              </Typography>
            </Box>
          </Box>

          {/* 小计显示 */}
          <Box sx={{ textAlign: 'right' }}>
            <Typography
              variant="h5"
              sx={{
                fontWeight: 700,
                color: categoryColor,
                lineHeight: 1,
              }}
            >
              {currency} {subtotal || '0.00'}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              小计
            </Typography>
          </Box>
        </Box>

        {/* 输入区域 */}
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} sm={3}>
            <Box
              sx={{
                p: 1.5,
                backgroundColor: alpha(theme.palette.grey[100], 0.5),
                borderRadius: 1.5,
                textAlign: 'center',
              }}
            >
              <Typography variant="caption" color="text.secondary" display="block">
                货币
              </Typography>
              <Typography variant="body2" fontWeight={500}>
                {currency}
              </Typography>
            </Box>
          </Grid>

          <Grid item xs={12} sm={4}>
            <ModernInput
              type="number"
              label={`${unitLabel} *`}
              value={unitPrice}
              onChange={onUnitPriceChange}
              error={error}
              helperText={helperText}
              disabled={disabled}
              startAdornment={<MoneyIcon sx={{ color: theme.palette.text.secondary }} />}
              size="small"
              sx={{
                '& .MuiOutlinedInput-root': {
                  backgroundColor: theme.palette.background.paper,
                },
              }}
            />
          </Grid>

          <Grid item xs={12} sm={2}>
            <ModernInput
              type="number"
              label="数量 *"
              value={quantity}
              onChange={onQuantityChange}
              disabled={disabled}
              size="small"
              sx={{
                '& .MuiOutlinedInput-root': {
                  backgroundColor: theme.palette.background.paper,
                },
              }}
            />
          </Grid>

          <Grid item xs={12} sm={3}>
            <Box
              sx={{
                p: 2,
                backgroundColor: alpha(categoryColor, 0.05),
                borderRadius: 1.5,
                border: `1px solid ${alpha(categoryColor, 0.2)}`,
                textAlign: 'center',
              }}
            >
              <Typography variant="caption" color="text.secondary" display="block">
                自动计算
              </Typography>
              <Typography
                variant="h6"
                sx={{
                  fontWeight: 600,
                  color: categoryColor,
                  mt: 0.5,
                }}
              >
                {currency} {subtotal || '0.00'}
              </Typography>
            </Box>
          </Grid>
        </Grid>

        {/* 底部提示 */}
        {showInfo && infoText && (
          <Box
            sx={{
              mt: 2,
              p: 1.5,
              backgroundColor: alpha(theme.palette.info.main, 0.05),
              borderRadius: 1,
              border: `1px solid ${alpha(theme.palette.info.main, 0.2)}`,
            }}
          >
            <Typography variant="caption" color="info.main">
              💡 {infoText}
            </Typography>
          </Box>
        )}
      </CardContent>
    </Card>
  );
};

export default ModernExpenseItem;
