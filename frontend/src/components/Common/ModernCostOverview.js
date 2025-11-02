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
  matchedExpenseItems = null,
  currency = 'USD',
  sx = {},
}) => {
  const theme = useTheme();

  // 根据费用项信息将其分类到对应的费用类别
  const categorizeExpense = (expense) => {
    if (!expense) return 'other';
    
    const category = expense.category?.toLowerCase() || '';
    const itemName = (expense.itemName || '').toLowerCase();
    
    // 根据category分类
    if (category === 'transport' || itemName.includes('机票') || itemName.includes('航班') || itemName.includes('flight') || itemName.includes('飞机')) {
      return 'flight';
    }
    if (category === 'accommodation' || itemName.includes('住宿') || itemName.includes('酒店') || itemName.includes('hotel')) {
      return 'accommodation';
    }
    if (category === 'meal' || itemName.includes('餐饮') || itemName.includes('餐费') || itemName.includes('meal')) {
      return 'meal';
    }
    if (category === 'allowance' || itemName.includes('补助') || itemName.includes('津贴') || itemName.includes('allowance')) {
      return 'allowance';
    }
    if (itemName.includes('交通') || itemName.includes('transport') || itemName.includes('市内') || itemName.includes('local')) {
      return 'localTransport';
    }
    if (itemName.includes('接送') || itemName.includes('transfer') || itemName.includes('机场')) {
      return 'airportTransfer';
    }
    
    return 'other';
  };

  // 计算各项费用
  const calculateCosts = () => {
    const costs = {
      flight: 0,
      accommodation: 0,
      meal: 0,
      localTransport: 0,
      airportTransfer: 0,
      allowance: 0,
      other: 0,
      outboundTotal: 0,
      inboundTotal: 0,
      grandTotal: 0,
    };

    // 如果没有matchedExpenseItems，尝试旧的固定字段方式（向后兼容）
    if (!matchedExpenseItems || Object.keys(matchedExpenseItems).length === 0) {
      // 计算去程费用（旧方式，向后兼容）
      if (formData.outboundBudget) {
        costs.flight += parseFloat(formData.outboundBudget.flight?.subtotal || 0);
        costs.accommodation += parseFloat(formData.outboundBudget.accommodation?.subtotal || 0);
        costs.localTransport += parseFloat(formData.outboundBudget.localTransport?.subtotal || 0);
        costs.airportTransfer += parseFloat(formData.outboundBudget.airportTransfer?.subtotal || 0);
        costs.allowance += parseFloat(formData.outboundBudget.allowance?.subtotal || 0);
        costs.outboundTotal = costs.flight + costs.accommodation + costs.localTransport + costs.airportTransfer + costs.allowance;
      }

      // 计算返程费用（旧方式，向后兼容）
      const isRoundTrip = formData.tripType === 'roundTrip' || (formData.inbound && formData.inbound.date);
      if (isRoundTrip && formData.inboundBudget) {
        const inboundFlight = parseFloat(formData.inboundBudget.flight?.subtotal || 0);
        const inboundAccommodation = parseFloat(formData.inboundBudget.accommodation?.subtotal || 0);
        const inboundLocalTransport = parseFloat(formData.inboundBudget.localTransport?.subtotal || 0);
        const inboundAirportTransfer = parseFloat(formData.inboundBudget.airportTransfer?.subtotal || 0);
        const inboundAllowance = parseFloat(formData.inboundBudget.allowance?.subtotal || 0);
        
        costs.inboundTotal = inboundFlight + inboundAccommodation + inboundLocalTransport + inboundAirportTransfer + inboundAllowance;
        
        costs.flight += inboundFlight;
        costs.accommodation += inboundAccommodation;
        costs.localTransport += inboundLocalTransport;
        costs.airportTransfer += inboundAirportTransfer;
        costs.allowance += inboundAllowance;
      }
    } else {
      // 新方式：根据matchedExpenseItems动态计算
      // 计算去程费用
      if (formData.outboundBudget) {
        Object.entries(formData.outboundBudget).forEach(([itemId, budgetItem]) => {
          const expense = matchedExpenseItems[itemId];
          const subtotal = parseFloat(budgetItem.subtotal || 0);
          const category = categorizeExpense(expense);
          costs[category] += subtotal;
          costs.outboundTotal += subtotal;
        });
      }

      // 计算返程费用（如果是往返行程）
      const isRoundTrip = formData.tripType === 'roundTrip' || (formData.inbound && formData.inbound.date);
      if (isRoundTrip && formData.inboundBudget) {
        Object.entries(formData.inboundBudget).forEach(([itemId, budgetItem]) => {
          const expense = matchedExpenseItems[itemId];
          const subtotal = parseFloat(budgetItem.subtotal || 0);
          const category = categorizeExpense(expense);
          costs[category] += subtotal;
          costs.inboundTotal += subtotal;
        });
      }
    }

    costs.grandTotal = costs.outboundTotal + costs.inboundTotal;
    return costs;
  };

  const costs = calculateCosts();

  // 费用项目配置
  const costItemsConfig = [
    {
      key: 'flight',
      label: '机票',
      enLabel: 'Flight',
      amount: costs.flight,
      color: theme.palette.primary.main,
      icon: '✈️',
    },
    {
      key: 'accommodation',
      label: '住宿',
      enLabel: 'Accommodations',
      amount: costs.accommodation,
      color: theme.palette.secondary.main,
      icon: '🏨',
    },
    {
      key: 'meal',
      label: '餐饮',
      enLabel: 'Meals',
      amount: costs.meal,
      color: theme.palette.info.main,
      icon: '🍽️',
    },
    {
      key: 'localTransport',
      label: '市内交通',
      enLabel: 'Intra-city Transportation',
      amount: costs.localTransport,
      color: theme.palette.info.main,
      icon: '🚗',
    },
    {
      key: 'airportTransfer',
      label: '机场接送',
      enLabel: 'Airport Transfer',
      amount: costs.airportTransfer,
      color: theme.palette.warning.main,
      icon: '🚌',
    },
    {
      key: 'allowance',
      label: '津贴补助',
      enLabel: 'Travel Allowances',
      amount: costs.allowance,
      color: theme.palette.success.main,
      icon: '💰',
    },
    {
      key: 'other',
      label: '其他费用',
      enLabel: 'Other Expenses',
      amount: costs.other,
      color: theme.palette.grey[600],
      icon: '💵',
    },
  ];

  // 只显示有金额或所有预算项的类别（如果matchedExpenseItems存在则显示所有匹配的类别）
  const costItems = matchedExpenseItems && Object.keys(matchedExpenseItems).length > 0
    ? costItemsConfig.filter(item => item.amount > 0)
    : costItemsConfig.filter(item => item.key !== 'other' || item.amount > 0);

  // 格式化金额
  const formatAmount = (amount) => {
    if (amount === 0) return '0.00';
    return amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  // 计算完成度
  const getCompletionStatus = () => {
    // 如果有matchedExpenseItems，基于实际费用项数量计算
    if (matchedExpenseItems && Object.keys(matchedExpenseItems).length > 0) {
      const totalExpenseItems = Object.keys(matchedExpenseItems).length;
      const completedItems = Object.entries(matchedExpenseItems).filter(([itemId, expense]) => {
        const outboundAmount = parseFloat(formData.outboundBudget?.[itemId]?.subtotal || 0);
        const isRoundTrip = formData.tripType === 'roundTrip' || (formData.inbound && formData.inbound.date);
        const inboundAmount = isRoundTrip 
          ? parseFloat(formData.inboundBudget?.[itemId]?.subtotal || 0) 
          : 0;
        return outboundAmount > 0 || inboundAmount > 0;
      }).length;
      const completionPercentage = totalExpenseItems > 0 ? (completedItems / totalExpenseItems) * 100 : 0;
      
      if (completionPercentage === 100) {
        return { status: 'completed', color: theme.palette.success.main, text: '预算完整' };
      } else if (completionPercentage >= 50) {
        return { status: 'partial', color: theme.palette.warning.main, text: '预算进行中' };
      } else {
        return { status: 'pending', color: theme.palette.grey[500], text: '预算待完善' };
      }
    } else {
      // 基于固定类别计算
      const totalItems = costItemsConfig.length;
      const completedItems = costItemsConfig.filter(item => item.amount > 0).length;
      const completionPercentage = (completedItems / totalItems) * 100;
      
      if (completionPercentage === 100) {
        return { status: 'completed', color: theme.palette.success.main, text: '预算完整' };
      } else if (completionPercentage >= 50) {
        return { status: 'partial', color: theme.palette.warning.main, text: '预算进行中' };
      } else {
        return { status: 'pending', color: theme.palette.grey[500], text: '预算待完善' };
      }
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
              {matchedExpenseItems && Object.keys(matchedExpenseItems).length > 0
                ? `${Object.entries(matchedExpenseItems).filter(([itemId, expense]) => {
                    const outboundAmount = parseFloat(formData.outboundBudget?.[itemId]?.subtotal || 0);
                    const inboundAmount = formData.tripType === 'roundTrip' 
                      ? parseFloat(formData.inboundBudget?.[itemId]?.subtotal || 0) 
                      : 0;
                    return outboundAmount > 0 || inboundAmount > 0;
                  }).length} / ${Object.keys(matchedExpenseItems).length}`
                : `${costItems.filter(item => item.amount > 0).length} / ${costItems.length}`
              }
            </Typography>
          </Box>
          <LinearProgress
            variant="determinate"
            value={(() => {
              if (matchedExpenseItems && Object.keys(matchedExpenseItems).length > 0) {
                const totalExpenseItems = Object.keys(matchedExpenseItems).length;
                const completedItems = Object.entries(matchedExpenseItems).filter(([itemId, expense]) => {
                  const outboundAmount = parseFloat(formData.outboundBudget?.[itemId]?.subtotal || 0);
                  const inboundAmount = formData.tripType === 'roundTrip' 
                    ? parseFloat(formData.inboundBudget?.[itemId]?.subtotal || 0) 
                    : 0;
                  return outboundAmount > 0 || inboundAmount > 0;
                }).length;
                return totalExpenseItems > 0 ? (completedItems / totalExpenseItems) * 100 : 0;
              } else {
                return costItems.length > 0 ? (costItems.filter(item => item.amount > 0).length / costItems.length) * 100 : 0;
              }
            })()}
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
            
            {(() => {
              const isRoundTrip = formData.tripType === 'roundTrip' || (formData.inbound && formData.inbound.date);
              return isRoundTrip;
            })() && (
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
