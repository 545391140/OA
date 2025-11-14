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
import { useTranslation } from 'react-i18next';

const ModernCostOverview = ({
  formData,
  matchedExpenseItems = null,
  routeMatchedExpenseItems = null, // 每个行程的匹配费用项列表 { outbound, inbound, multiCity: { [index]: {...} } }
  currency = 'USD',
  sx = {},
}) => {
  const theme = useTheme();
  const { t } = useTranslation();

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

      // 计算多程行程费用（旧方式，向后兼容）
      if (formData.multiCityRoutesBudget && Array.isArray(formData.multiCityRoutesBudget)) {
        formData.multiCityRoutesBudget.forEach((budget) => {
          if (budget && typeof budget === 'object') {
            const multiCityFlight = parseFloat(budget.flight?.subtotal || 0);
            const multiCityAccommodation = parseFloat(budget.accommodation?.subtotal || 0);
            const multiCityLocalTransport = parseFloat(budget.localTransport?.subtotal || 0);
            const multiCityAirportTransfer = parseFloat(budget.airportTransfer?.subtotal || 0);
            const multiCityAllowance = parseFloat(budget.allowance?.subtotal || 0);
            
            const routeTotal = multiCityFlight + multiCityAccommodation + multiCityLocalTransport + multiCityAirportTransfer + multiCityAllowance;
            
            if (!costs.multiCityTotal) {
              costs.multiCityTotal = 0;
            }
            costs.multiCityTotal += routeTotal;
            
            costs.flight += multiCityFlight;
            costs.accommodation += multiCityAccommodation;
            costs.localTransport += multiCityLocalTransport;
            costs.airportTransfer += multiCityAirportTransfer;
            costs.allowance += multiCityAllowance;
          }
        });
      }
    } else {
      // 新方式：根据matchedExpenseItems动态计算
      // 计算去程费用
      if (formData.outboundBudget) {
        // 如果有 routeMatchedExpenseItems，使用它来获取去程的匹配费用项
        const outboundMatchedItems = routeMatchedExpenseItems?.outbound || matchedExpenseItems;
        Object.entries(formData.outboundBudget).forEach(([itemId, budgetItem]) => {
          const expense = outboundMatchedItems?.[itemId] || matchedExpenseItems?.[itemId];
          const subtotal = parseFloat(budgetItem.subtotal || 0);
          const category = categorizeExpense(expense);
          costs[category] += subtotal;
          costs.outboundTotal += subtotal;
        });
      }

      // 计算返程费用（如果是往返行程）
      const isRoundTrip = formData.tripType === 'roundTrip' || (formData.inbound && formData.inbound.date);
      if (isRoundTrip && formData.inboundBudget) {
        // 如果有 routeMatchedExpenseItems，使用它来获取返程的匹配费用项
        const inboundMatchedItems = routeMatchedExpenseItems?.inbound || matchedExpenseItems;
        Object.entries(formData.inboundBudget).forEach(([itemId, budgetItem]) => {
          const expense = inboundMatchedItems?.[itemId] || matchedExpenseItems?.[itemId];
          const subtotal = parseFloat(budgetItem.subtotal || 0);
          const category = categorizeExpense(expense);
          costs[category] += subtotal;
          costs.inboundTotal += subtotal;
        });
      }

      // 计算多程行程费用
      if (formData.multiCityRoutesBudget && Array.isArray(formData.multiCityRoutesBudget)) {
        formData.multiCityRoutesBudget.forEach((budget, index) => {
          if (budget && typeof budget === 'object') {
            // 获取该多程行程的匹配费用项
            const multiCityMatchedItems = routeMatchedExpenseItems?.multiCity?.[index] || matchedExpenseItems;
            let routeTotal = 0;
            
            Object.entries(budget).forEach(([itemId, budgetItem]) => {
              const expense = multiCityMatchedItems?.[itemId] || matchedExpenseItems?.[itemId];
              const subtotal = parseFloat(budgetItem.subtotal || 0);
              const category = categorizeExpense(expense);
              costs[category] += subtotal;
              routeTotal += subtotal;
            });
            
            // 累加到多程行程总费用
            if (!costs.multiCityTotal) {
              costs.multiCityTotal = 0;
            }
            costs.multiCityTotal += routeTotal;
          }
        });
      }
    }

    // 计算总费用：去程 + 返程 + 多程行程
    costs.grandTotal = costs.outboundTotal + costs.inboundTotal + (costs.multiCityTotal || 0);
    return costs;
  };

  const costs = calculateCosts();

  // 动态生成费用项汇总：根据实际的费用项来显示
  const generateDynamicCostItems = () => {
    const expenseItemMap = new Map(); // key: itemId, value: { itemName, totalAmount, itemId }
    
    // 收集所有行程中的费用项
    const collectExpenseItems = (budget, matchedItems) => {
      if (!budget || typeof budget !== 'object') return;
      
      Object.entries(budget).forEach(([itemId, budgetItem]) => {
        if (!budgetItem || typeof budgetItem !== 'object') return;
        
        const subtotal = parseFloat(budgetItem.subtotal || 0);
        if (subtotal <= 0) return; // 只收集有金额的项
        
        const expense = matchedItems?.[itemId];
        const itemName = budgetItem.itemName || expense?.itemName || itemId;
        
        if (expenseItemMap.has(itemId)) {
          // 累加金额
          const existing = expenseItemMap.get(itemId);
          existing.totalAmount += subtotal;
        } else {
          // 新增项
          expenseItemMap.set(itemId, {
            itemId,
            itemName,
            totalAmount: subtotal,
            category: categorizeExpense(expense)
          });
        }
      });
    };
    
    // 收集去程费用项
    if (formData.outboundBudget) {
      const outboundMatchedItems = routeMatchedExpenseItems?.outbound || matchedExpenseItems;
      collectExpenseItems(formData.outboundBudget, outboundMatchedItems);
    }
    
    // 收集返程费用项
    const isRoundTrip = formData.tripType === 'roundTrip' || (formData.inbound && formData.inbound.date);
    if (isRoundTrip && formData.inboundBudget) {
      const inboundMatchedItems = routeMatchedExpenseItems?.inbound || matchedExpenseItems;
      collectExpenseItems(formData.inboundBudget, inboundMatchedItems);
    }
    
    // 收集多程行程费用项
    if (formData.multiCityRoutesBudget && Array.isArray(formData.multiCityRoutesBudget)) {
      formData.multiCityRoutesBudget.forEach((budget, index) => {
        const multiCityMatchedItems = routeMatchedExpenseItems?.multiCity?.[index] || matchedExpenseItems;
        collectExpenseItems(budget, multiCityMatchedItems);
      });
    }
    
    // 转换为数组并按金额排序（从大到小）
    const items = Array.from(expenseItemMap.values())
      .sort((a, b) => b.totalAmount - a.totalAmount);
    
    // 为每个费用项分配颜色和图标
    const colors = [
      theme.palette.primary.main,
      theme.palette.secondary.main,
      theme.palette.info.main,
      theme.palette.warning.main,
      theme.palette.success.main,
      theme.palette.error.main,
    ];
    const icons = ['💰', '✈️', '🏨', '🍽️', '🚗', '🚌', '💵'];
    
    return items.map((item, index) => ({
      key: item.itemId,
      label: item.itemName,
      amount: item.totalAmount,
      color: colors[index % colors.length],
      icon: icons[index % icons.length],
      category: item.category
    }));
  };

  // 费用项目配置：优先使用动态生成的费用项，否则使用固定类别
  const dynamicCostItems = generateDynamicCostItems();
  const costItemsConfig = dynamicCostItems.length > 0 ? dynamicCostItems : [
    {
      key: 'flight',
      label: t('travel.costOverview.flight'),
      amount: costs.flight,
      color: theme.palette.primary.main,
      icon: '✈️',
    },
    {
      key: 'accommodation',
      label: t('travel.costOverview.accommodation'),
      amount: costs.accommodation,
      color: theme.palette.secondary.main,
      icon: '🏨',
    },
    {
      key: 'meal',
      label: t('travel.costOverview.meal'),
      amount: costs.meal,
      color: theme.palette.info.main,
      icon: '🍽️',
    },
    {
      key: 'localTransport',
      label: t('travel.costOverview.localTransport'),
      amount: costs.localTransport,
      color: theme.palette.info.main,
      icon: '🚗',
    },
    {
      key: 'airportTransfer',
      label: t('travel.costOverview.airportTransfer'),
      amount: costs.airportTransfer,
      color: theme.palette.warning.main,
      icon: '🚌',
    },
    {
      key: 'allowance',
      label: t('travel.costOverview.allowance'),
      amount: costs.allowance,
      color: theme.palette.success.main,
      icon: '💰',
    },
    {
      key: 'other',
      label: t('travel.costOverview.other'),
      amount: costs.other,
      color: theme.palette.grey[600],
      icon: '💵',
    },
  ];

  // 只显示有金额的费用项
  const costItems = costItemsConfig.filter(item => item.amount > 0);

  // 格式化金额
  const formatAmount = (amount) => {
    if (amount === 0) return '0.00';
    return amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  // 计算完成度（需要在dynamicCostItems和costItemsConfig定义之后）
  const getCompletionStatus = () => {
    // 判断是否为往返行程
    const isRoundTrip = formData.tripType === 'roundTrip' || (formData.inbound && formData.inbound.date);
    
    // 如果有matchedExpenseItems或routeMatchedExpenseItems，基于实际费用项数量计算
    const expenseItemsToCheck = routeMatchedExpenseItems?.outbound || matchedExpenseItems;
    if (expenseItemsToCheck && Object.keys(expenseItemsToCheck).length > 0) {
      let totalRequiredFields = 0; // 总需要填写的字段数
      let completedFields = 0; // 已完成的字段数
      
      // 检查去程
      Object.entries(expenseItemsToCheck).forEach(([itemId, expense]) => {
        const outboundItem = formData.outboundBudget?.[itemId];
        
        // 检查去程
        const outboundUnitPrice = parseFloat(outboundItem?.unitPrice || 0);
        const outboundSubtotal = parseFloat(outboundItem?.subtotal || 0);
        const outboundCompleted = outboundUnitPrice > 0 || (expense.limitType === 'ACTUAL' && outboundSubtotal > 0);
        
        totalRequiredFields += 1;
        if (outboundCompleted) completedFields += 1;
      });
      
      // 检查返程（如果是往返行程）
      if (isRoundTrip) {
        const inboundExpenseItems = routeMatchedExpenseItems?.inbound || matchedExpenseItems;
        if (inboundExpenseItems) {
          Object.entries(inboundExpenseItems).forEach(([itemId, expense]) => {
            const inboundItem = formData.inboundBudget?.[itemId];
            
            const inboundUnitPrice = parseFloat(inboundItem?.unitPrice || 0);
            const inboundSubtotal = parseFloat(inboundItem?.subtotal || 0);
            const inboundCompleted = inboundUnitPrice > 0 || (expense.limitType === 'ACTUAL' && inboundSubtotal > 0);
            
            totalRequiredFields += 1;
            if (inboundCompleted) completedFields += 1;
          });
        }
      }
      
      // 检查多程行程
      if (formData.multiCityRoutesBudget && Array.isArray(formData.multiCityRoutesBudget)) {
        formData.multiCityRoutesBudget.forEach((budget, index) => {
          const multiCityExpenseItems = routeMatchedExpenseItems?.multiCity?.[index] || matchedExpenseItems;
          if (multiCityExpenseItems) {
            Object.entries(multiCityExpenseItems).forEach(([itemId, expense]) => {
              const multiCityItem = budget?.[itemId];
              
              const multiCityUnitPrice = parseFloat(multiCityItem?.unitPrice || 0);
              const multiCitySubtotal = parseFloat(multiCityItem?.subtotal || 0);
              const multiCityCompleted = multiCityUnitPrice > 0 || (expense.limitType === 'ACTUAL' && multiCitySubtotal > 0);
              
              totalRequiredFields += 1;
              if (multiCityCompleted) completedFields += 1;
            });
          }
        });
      }
      
      const completionPercentage = totalRequiredFields > 0 
        ? (completedFields / totalRequiredFields) * 100 
        : 0;
      
      // 返回完成状态和统计信息
      return {
        status: completionPercentage === 100 ? 'completed' 
          : completionPercentage >= 50 ? 'partial' 
          : 'pending',
        color: completionPercentage === 100 ? theme.palette.success.main
          : completionPercentage >= 50 ? theme.palette.warning.main
          : theme.palette.grey[500],
        text: completionPercentage === 100 ? t('travel.costOverview.budgetComplete')
          : completionPercentage >= 50 ? t('travel.costOverview.budgetInProgress')
          : t('travel.costOverview.budgetPending'),
        completedFields,
        totalRequiredFields,
        percentage: completionPercentage
      };
    } else {
      // 基于固定类别计算（向后兼容）
      // 使用动态生成的费用项或固定类别来计算完成度
      const itemsToCheck = dynamicCostItems.length > 0 ? dynamicCostItems : costItemsConfig;
      const totalItems = itemsToCheck.length;
      const completedItems = itemsToCheck.filter(item => item.amount > 0).length;
      const completionPercentage = totalItems > 0 
        ? (completedItems / totalItems) * 100 
        : 0;
      
      return {
        status: completionPercentage === 100 ? 'completed' 
          : completionPercentage >= 50 ? 'partial' 
          : 'pending',
        color: completionPercentage === 100 ? theme.palette.success.main
          : completionPercentage >= 50 ? theme.palette.warning.main
          : theme.palette.grey[500],
        text: completionPercentage === 100 ? t('travel.costOverview.budgetComplete')
          : completionPercentage >= 50 ? t('travel.costOverview.budgetInProgress')
          : t('travel.costOverview.budgetPending'),
        completedFields: completedItems,
        totalRequiredFields: totalItems,
        percentage: completionPercentage
      };
    }
  };

  const completionStatus = getCompletionStatus();

  return (
    <Card
      sx={{
        position: 'sticky',
        top: 80, // 导航栏高度(64px) + 间距(16px) = 80px，确保在固定导航栏下方
        borderRadius: 3,
        border: 'none',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)',
        zIndex: 10, // 确保在其他内容之上，但低于导航栏(AppBar 的 zIndex 通常是 1100)
        maxHeight: 'calc(100vh - 96px)', // 限制最大高度，避免超出视口
        overflowY: 'auto', // 如果内容过多，允许滚动
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
              {t('travel.costOverview.title')}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {t('travel.costOverview.realTimeBudget')}
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
              {t('travel.costOverview.budgetCompletion')}
            </Typography>
            <Typography variant="body2" fontWeight={500}>
              {completionStatus.completedFields !== undefined && completionStatus.totalRequiredFields !== undefined
                ? `${completionStatus.completedFields} / ${completionStatus.totalRequiredFields}`
                : '0 / 0'}
            </Typography>
          </Box>
          <LinearProgress
            variant="determinate"
            value={completionStatus.percentage || 0}
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
            {t('travel.costOverview.costSummary')}
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
                  {t('travel.form.outboundTitle')}
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
                    {t('travel.form.inboundTitle')}
                  </Typography>
                  <Typography variant="h6" fontWeight={600} color="secondary">
                    {currency} {formatAmount(costs.inboundTotal)}
                  </Typography>
                </Box>
              </Grid>
            )}
            
            {/* 多程行程费用 */}
            {costs.multiCityTotal > 0 && (
              <Grid item xs={12}>
                <Box
                  sx={{
                    p: 2,
                    backgroundColor: alpha(theme.palette.info.main, 0.05),
                    borderRadius: 2,
                    border: `1px solid ${alpha(theme.palette.info.main, 0.2)}`,
                  }}
                >
                  <Typography variant="caption" color="text.secondary" display="block">
                    {t('travel.costOverview.multiCityRoutes', { count: formData.multiCityRoutesBudget?.length || 0 })}
                  </Typography>
                  <Typography variant="h6" fontWeight={600} color="info.main">
                    {currency} {formatAmount(costs.multiCityTotal)}
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
            {t('travel.costOverview.byItem')}
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
              {t('travel.costOverview.total')}
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
                ? t('travel.costOverview.budgetSetupComplete') 
                : completionStatus.status === 'partial'
                  ? t('travel.costOverview.partialBudgetSetup')
                  : t('travel.costOverview.pleaseCompleteBudget')
              }
            </Typography>
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
};

export default ModernCostOverview;
