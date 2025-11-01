import React from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Divider,
  Chip,
  useTheme,
  alpha,
  LinearProgress,
} from '@mui/material';
import {
  Receipt as ReceiptIcon,
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  CheckCircle as CheckCircleIcon,
  Warning as WarningIcon,
} from '@mui/icons-material';

const ModernCostOverview = ({
  formData,
  currency = 'USD',
  sx = {},
}) => {
  const theme = useTheme();

  // 计算各项费用
  const calculateCosts = () => {
    const costs = {
      flight: 0,
      accommodation: 0,
      localTransport: 0,
      airportTransfer: 0,
      allowance: 0,
      outboundTotal: 0,
      inboundTotal: 0,
      grandTotal: 0,
    };

    // 计算去程费用
    if (formData.outboundBudget) {
      costs.flight += parseFloat(formData.outboundBudget.flight?.subtotal || 0);
      costs.accommodation += parseFloat(formData.outboundBudget.accommodation?.subtotal || 0);
      costs.localTransport += parseFloat(formData.outboundBudget.localTransport?.subtotal || 0);
      costs.airportTransfer += parseFloat(formData.outboundBudget.airportTransfer?.subtotal || 0);
      costs.allowance += parseFloat(formData.outboundBudget.allowance?.subtotal || 0);
      costs.outboundTotal = costs.flight + costs.accommodation + costs.localTransport + costs.airportTransfer + costs.allowance;
    }

    // 计算返程费用（如果是往返行程）
    if (formData.tripType === 'roundTrip' && formData.inboundBudget) {
      const inboundFlight = parseFloat(formData.inboundBudget.flight?.subtotal || 0);
      const inboundAccommodation = parseFloat(formData.inboundBudget.accommodation?.subtotal || 0);
      const inboundLocalTransport = parseFloat(formData.inboundBudget.localTransport?.subtotal || 0);
      const inboundAirportTransfer = parseFloat(formData.inboundBudget.airportTransfer?.subtotal || 0);
      const inboundAllowance = parseFloat(formData.inboundBudget.allowance?.subtotal || 0);
      
      costs.inboundTotal = inboundFlight + inboundAccommodation + inboundLocalTransport + inboundAirportTransfer + inboundAllowance;
      
      // 累加到总费用中
      costs.flight += inboundFlight;
      costs.accommodation += inboundAccommodation;
      costs.localTransport += inboundLocalTransport;
      costs.airportTransfer += inboundAirportTransfer;
      costs.allowance += inboundAllowance;
    }

    costs.grandTotal = costs.outboundTotal + costs.inboundTotal;
    return costs;
  };

  const costs = calculateCosts();

  // 费用项目配置
  const costItems = [
    {
      key: 'flight',
      label: 'Flight',
      amount: costs.flight,
      color: theme.palette.primary.main,
      icon: '✈️',
    },
    {
      key: 'accommodation',
      label: 'Accommodations',
      amount: costs.accommodation,
      color: theme.palette.secondary.main,
      icon: '🏨',
    },
    {
      key: 'localTransport',
      label: 'Intra-city Transportation',
      amount: costs.localTransport,
      color: theme.palette.info.main,
      icon: '🚗',
    },
    {
      key: 'airportTransfer',
      label: 'After Hours Airport Transfer',
      amount: costs.airportTransfer,
      color: theme.palette.warning.main,
      icon: '🚌',
    },
    {
      key: 'allowance',
      label: 'Travel Allowances',
      amount: costs.allowance,
      color: theme.palette.success.main,
      icon: '💰',
    },
  ];

  // 格式化金额
  const formatAmount = (amount) => {
    if (amount === 0) return '0.00';
    return amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  // 计算完成度
  const getCompletionStatus = () => {
    const totalItems = costItems.length;
    const completedItems = costItems.filter(item => item.amount > 0).length;
    const completionPercentage = (completedItems / totalItems) * 100;
    
    if (completionPercentage === 100) {
      return { status: 'completed', color: theme.palette.success.main, text: '预算完整' };
    } else if (completionPercentage >= 50) {
      return { status: 'partial', color: theme.palette.warning.main, text: '预算进行中' };
    } else {
      return { status: 'pending', color: theme.palette.grey[500], text: '预算待完善' };
    }
  };

  const completionStatus = getCompletionStatus();

  return (
    <Card
      sx={{
        position: 'sticky',
        top: 20,
        borderRadius: 3,
        border: 'none',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)',
        ...sx,
      }}
    >
      <CardContent sx={{ p: 3 }}>
        {/* 头部 */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
          <Box
            sx={{
              width: 48,
              height: 48,
              borderRadius: 2,
              backgroundColor: alpha(theme.palette.primary.main, 0.1),
              color: theme.palette.primary.main,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.5rem',
            }}
          >
            <ReceiptIcon />
          </Box>
          <Box sx={{ flex: 1 }}>
            <Typography variant="h6" fontWeight={600}>
              费用总览
            </Typography>
            <Typography variant="body2" color="text.secondary">
              实时预算统计
            </Typography>
          </Box>
          <Chip
            label={completionStatus.text}
            size="small"
            sx={{
              backgroundColor: alpha(completionStatus.color, 0.1),
              color: completionStatus.color,
              border: `1px solid ${alpha(completionStatus.color, 0.3)}`,
              fontWeight: 500,
            }}
          />
        </Box>

        {/* 完成度进度条 */}
        <Box sx={{ mb: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
            <Typography variant="body2" color="text.secondary">
              预算完成度
            </Typography>
            <Typography variant="body2" fontWeight={500}>
              {costItems.filter(item => item.amount > 0).length} / {costItems.length}
            </Typography>
          </Box>
          <LinearProgress
            variant="determinate"
            value={(costItems.filter(item => item.amount > 0).length / costItems.length) * 100}
            sx={{
              height: 8,
              borderRadius: 4,
              backgroundColor: alpha(theme.palette.grey[300], 0.3),
              '& .MuiLinearProgress-bar': {
                backgroundColor: completionStatus.color,
                borderRadius: 4,
              },
            }}
          />
        </Box>

        {/* 费用总览 */}
        <Box sx={{ mb: 3 }}>
          <Typography variant="subtitle2" fontWeight={600} gutterBottom>
            费用总览
          </Typography>
          
          <Grid container spacing={2}>
            <Grid item xs={6}>
              <Box
                sx={{
                  p: 2,
                  backgroundColor: alpha(theme.palette.primary.main, 0.05),
                  borderRadius: 2,
                  border: `1px solid ${alpha(theme.palette.primary.main, 0.2)}`,
                }}
              >
                <Typography variant="caption" color="text.secondary" display="block">
                  去程
                </Typography>
                <Typography variant="h6" fontWeight={600} color="primary">
                  {currency} {formatAmount(costs.outboundTotal)}
                </Typography>
              </Box>
            </Grid>
            
            {formData.tripType === 'roundTrip' && (
              <Grid item xs={6}>
                <Box
                  sx={{
                    p: 2,
                    backgroundColor: alpha(theme.palette.secondary.main, 0.05),
                    borderRadius: 2,
                    border: `1px solid ${alpha(theme.palette.secondary.main, 0.2)}`,
                  }}
                >
                  <Typography variant="caption" color="text.secondary" display="block">
                    返程
                  </Typography>
                  <Typography variant="h6" fontWeight={600} color="secondary">
                    {currency} {formatAmount(costs.inboundTotal)}
                  </Typography>
                </Box>
              </Grid>
            )}
          </Grid>
        </Box>

        <Divider sx={{ my: 2 }} />

        {/* 按小项汇总 */}
        <Box sx={{ mb: 3 }}>
          <Typography variant="subtitle2" fontWeight={600} gutterBottom>
            按小项汇总
          </Typography>
          
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
            {costItems.map((item) => (
              <Box
                key={item.key}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  p: 1.5,
                  backgroundColor: item.amount > 0 ? alpha(item.color, 0.05) : alpha(theme.palette.grey[100], 0.5),
                  borderRadius: 1.5,
                  border: `1px solid ${item.amount > 0 ? alpha(item.color, 0.2) : alpha(theme.palette.grey[300], 0.5)}`,
                  transition: 'all 0.2s ease',
                  '&:hover': {
                    backgroundColor: item.amount > 0 ? alpha(item.color, 0.1) : alpha(theme.palette.grey[200], 0.3),
                  },
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                  <Typography sx={{ fontSize: '1.2rem' }}>{item.icon}</Typography>
                  <Typography
                    variant="body2"
                    sx={{
                      fontWeight: item.amount > 0 ? 500 : 400,
                      color: item.amount > 0 ? theme.palette.text.primary : theme.palette.text.secondary,
                    }}
                  >
                    {item.label}
                  </Typography>
                </Box>
                <Typography
                  variant="body2"
                  sx={{
                    fontWeight: 600,
                    color: item.amount > 0 ? item.color : theme.palette.text.secondary,
                  }}
                >
                  {currency} {formatAmount(item.amount)}
                </Typography>
              </Box>
            ))}
          </Box>
        </Box>

        <Divider sx={{ my: 2 }} />

        {/* 总计 */}
        <Box
          sx={{
            p: 2.5,
            backgroundColor: alpha(theme.palette.primary.main, 0.05),
            borderRadius: 2,
            border: `2px solid ${alpha(theme.palette.primary.main, 0.2)}`,
          }}
        >
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6" fontWeight={600}>
              总计
            </Typography>
            <Typography
              variant="h4"
              fontWeight={700}
              sx={{
                color: theme.palette.primary.main,
                background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.secondary.main} 100%)`,
                backgroundClip: 'text',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              {currency} {formatAmount(costs.grandTotal)}
            </Typography>
          </Box>
          
          {/* 状态指示器 */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}>
            {completionStatus.status === 'completed' ? (
              <CheckCircleIcon sx={{ fontSize: '1rem', color: theme.palette.success.main }} />
            ) : completionStatus.status === 'partial' ? (
              <WarningIcon sx={{ fontSize: '1rem', color: theme.palette.warning.main }} />
            ) : (
              <TrendingUpIcon sx={{ fontSize: '1rem', color: theme.palette.grey[500] }} />
            )}
            <Typography variant="caption" color="text.secondary">
              {completionStatus.status === 'completed' 
                ? '预算设置完整' 
                : completionStatus.status === 'partial'
                  ? '部分预算已设置'
                  : '请完善预算信息'
              }
            </Typography>
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
};

export default ModernCostOverview;
