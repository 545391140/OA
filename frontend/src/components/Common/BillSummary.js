import React from 'react';
import {
  Paper,
  Box,
  Typography,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Chip,
  Button,
  Alert,
  Card,
  CardContent
} from '@mui/material';
import {
  Flight as FlightIcon,
  Hotel as HotelIcon,
  DirectionsCar as CarIcon,
  Train as TrainIcon,
  Restaurant as RestaurantIcon,
  AttachMoney as MoneyIcon,
  Receipt as ReceiptIcon,
  Warning as WarningIcon
} from '@mui/icons-material';

const BillSummary = ({ 
  formData, 
  estimatedCost = 0,
  currency = 'USD'
}) => {
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
      grandTotal: 0
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

    // 计算总计
    costs.grandTotal = costs.outboundTotal + costs.inboundTotal;
    
    return costs;
  };

  const costs = calculateCosts();
  const hasEstimatedCost = estimatedCost > 0;

  // 费用项目配置
  const costItems = [
    {
      key: 'flight',
      label: 'Flight',
      icon: <FlightIcon />,
      amount: costs.flight,
      color: 'primary'
    },
    {
      key: 'accommodation',
      label: 'Accommodations',
      icon: <HotelIcon />,
      amount: costs.accommodation,
      color: 'secondary'
    },
    {
      key: 'localTransport',
      label: 'Intra-city Transportation',
      icon: <CarIcon />,
      amount: costs.localTransport,
      color: 'info'
    },
    {
      key: 'airportTransfer',
      label: 'After Hours Airport Transfer',
      icon: <TrainIcon />,
      amount: costs.airportTransfer,
      color: 'success'
    },
    {
      key: 'allowance',
      label: 'Travel Allowances',
      icon: <MoneyIcon />,
      amount: costs.allowance,
      color: 'warning'
    }
  ];

  // 格式化金额
  const formatAmount = (amount) => {
    if (amount === 0) return '-';
    return `${currency} ${amount.toLocaleString()}`;
  };

  return (
    <Paper 
      elevation={2} 
      sx={{ 
        p: 3, 
        height: 'fit-content',
        position: 'sticky',
        top: 20,
        borderRadius: 2
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
        <ReceiptIcon color="primary" sx={{ mr: 1 }} />
        <Typography variant="h6" fontWeight="bold">
          费用明细
        </Typography>
      </Box>

      {/* 预算概览 */}
      {hasEstimatedCost && (
        <Card sx={{ mb: 3, bgcolor: 'primary.50', border: '1px solid', borderColor: 'primary.200' }}>
          <CardContent sx={{ py: 2 }}>
            <Typography variant="subtitle2" color="primary" gutterBottom>
              预算金额
            </Typography>
            <Typography variant="h5" fontWeight="bold" color="primary">
              {formatAmount(parseFloat(estimatedCost))}
            </Typography>
          </CardContent>
        </Card>
      )}

      {/* 费用总览 */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="subtitle1" fontWeight="medium" gutterBottom>
          费用总览
        </Typography>
        
        {/* 去程费用 */}
        <Box sx={{ mb: 2 }}>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            去程: {formatAmount(costs.outboundTotal)}
          </Typography>
        </Box>
        
        {/* 返程费用（如果是往返行程） */}
        {formData.tripType === 'roundTrip' && (
          <Box sx={{ mb: 2 }}>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              返程: {formatAmount(costs.inboundTotal)}
            </Typography>
          </Box>
        )}
      </Box>

      {/* 按小项汇总 */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="subtitle1" fontWeight="medium" gutterBottom>
          按小项汇总
        </Typography>
        <List dense>
          {costItems.map((item) => (
            <ListItem key={item.key} sx={{ px: 0 }}>
              <ListItemIcon sx={{ minWidth: 36 }}>
                <Box sx={{ color: `${item.color}.main` }}>
                  {item.icon}
                </Box>
              </ListItemIcon>
              <ListItemText 
                primary={item.label}
                secondary={formatAmount(item.amount)}
                primaryTypographyProps={{ variant: 'body2' }}
                secondaryTypographyProps={{ 
                  variant: 'body2',
                  fontWeight: item.amount > 0 ? 'medium' : 'normal',
                  color: item.amount > 0 ? 'text.primary' : 'text.secondary'
                }}
              />
            </ListItem>
          ))}
        </List>
      </Box>

      <Divider sx={{ my: 2 }} />

      {/* 总计 */}
      <Box sx={{ mb: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6" fontWeight="bold">
            总计
          </Typography>
          <Typography variant="h5" fontWeight="bold" color="primary">
            {formatAmount(costs.grandTotal)}
          </Typography>
        </Box>
        
        {/* 预算对比 */}
        {hasEstimatedCost && (
          <Box sx={{ mt: 1 }}>
            {costs.grandTotal > parseFloat(estimatedCost) ? (
              <Alert severity="warning" size="small" sx={{ mt: 1 }}>
                <Typography variant="caption">
                  超出预算 {formatAmount(costs.grandTotal - parseFloat(estimatedCost))}
                </Typography>
              </Alert>
            ) : costs.grandTotal > 0 ? (
              <Alert severity="success" size="small" sx={{ mt: 1 }}>
                <Typography variant="caption">
                  预算内，剩余 {formatAmount(parseFloat(estimatedCost) - costs.grandTotal)}
                </Typography>
              </Alert>
            ) : null}
          </Box>
        )}
      </Box>


      {/* 提示信息 */}
      {!hasEstimatedCost && (
        <Alert severity="info" sx={{ mt: 2 }}>
          <Typography variant="body2">
            请填写费用预算以查看费用明细
          </Typography>
        </Alert>
      )}
    </Paper>
  );
};

export default BillSummary;
