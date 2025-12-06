import React, { useState } from 'react';
import {
  Card,
  CardContent,
  Typography,
  Grid,
  Box,
  Divider,
  Alert,
  IconButton,
  Collapse
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon
} from '@mui/icons-material';
import ModernExpenseItem from '../Common/ModernExpenseItem';
import dayjs from 'dayjs';
import { useTranslation } from 'react-i18next';
import { formatCurrency as formatCurrencyUtil } from '../../utils/icuFormatter';

const BudgetCard = ({
  title,
  icon = '💰',
  routeData,
  budgetData = {},
  matchedExpenseItems = {},
  currency = 'USD',
  onBudgetChange,
  tripType,
  purpose = '',
  routeIndex = null,
  defaultExpanded = true
}) => {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const { i18n } = useTranslation();
  
  // 确保currency是大写的有效货币代码
  const normalizedCurrency = (currency && typeof currency === 'string') 
    ? currency.toUpperCase() 
    : 'USD';

  // 计算总费用
  const calculateTotal = () => {
    return Object.values(budgetData).reduce((sum, item) => {
      return sum + (parseFloat(item.subtotal) || 0);
    }, 0);
  };

  const total = calculateTotal();

  const handleToggle = () => {
    setExpanded(!expanded);
  };

  // 判断是否为其他费用项
  const isOtherExpense = (expense) => {
    if (!expense) return false;

    if (expense.category === 'other') {
      return true;
    }

    if (expense.parentItem !== null && expense.parentItem !== undefined && expense.parentItem !== 'No field') {
      const parentItemStr = typeof expense.parentItem === 'string'
        ? expense.parentItem
        : (expense.parentItem?.toString?.() || '');
      if (parentItemStr && parentItemStr !== 'null' && parentItemStr !== 'No field') {
        return true;
      }
    }

    const itemName = expense.itemName || '';
    if (!itemName) return false;
    const name = itemName.toLowerCase();
    return name.includes('其他') ||
           name.includes('other') ||
           name.includes('其它') ||
           name.startsWith('其他') ||
           name.endsWith('其他');
  };

  // 获取费用项图标
  const getExpenseIcon = (itemName, unit) => {
    const name = itemName.toLowerCase();
    if (name.includes('机票') || name.includes('航班') || name.includes('flight') || name.includes('飞机')) {
      return '✈️';
    } else if (name.includes('住宿') || name.includes('酒店') || name.includes('accommodation')) {
      return '🏨';
    } else if (name.includes('交通') || name.includes('transport')) {
      return '🚗';
    } else if (name.includes('接送') || name.includes('transfer')) {
      return '🚌';
    } else if (name.includes('补助') || name.includes('津贴') || name.includes('allowance')) {
      return '💰';
    }
    return '💵';
  };

  // 获取单位标签
  const getUnitLabel = (unit, itemName) => {
    if (unit === '元/天' || unit === 'PER_DAY') {
      if (itemName.includes('住宿') || itemName.includes('酒店')) {
        return '单价/晚';
      }
      return '单价/天';
    } else if (unit === '元/次' || unit === 'PER_TRIP') {
      return '单价/次';
    } else if (unit === '元/公里' || unit === 'PER_KM') {
      return '单价/公里';
    }
    return '单价';
  };

  // 格式化地点信息（完整格式，用于详情显示）
  const formatLocation = (location) => {
    if (!location) return '未选择';
    if (typeof location === 'string') {
      return location;
    }
    return location.name || `${location.city || ''}, ${location.country || ''}`.trim() || '未选择';
  };


  // 格式化日期
  const formatDate = (date) => {
    if (!date) return '未选择';
    if (dayjs.isDayjs(date)) {
      return date.format('YYYY-MM-DD');
    }
    return dayjs(date).format('YYYY-MM-DD');
  };

  // 排序费用项（其他费用排在最后）
  const sortedExpenseEntries = Object.entries(matchedExpenseItems || {}).sort((a, b) => {
    const expenseA = a[1];
    const expenseB = b[1];
    const isOtherA = isOtherExpense(expenseA);
    const isOtherB = isOtherExpense(expenseB);

    if (isOtherA && !isOtherB) return 1;
    if (isOtherB && !isOtherA) return -1;
    return 0;
  });

  return (
    <Card
      variant="outlined"
      sx={{
        mb: 2,
        borderRadius: 2,
        boxShadow: '0 2px 8px rgba(0,0,0,0.08)'
      }}
    >
      <CardContent>
        {/* 标题和展开/收缩按钮 */}
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: expanded ? 2 : 1 }}>
          <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              {icon} {title}
            </Typography>
            {!expanded && (
              <>
                <Typography variant="body2" color="text.secondary">
                  {formatLocation(routeData?.departure)} → {formatLocation(routeData?.destination)}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {formatDate(routeData?.date)}
                </Typography>
                <Typography variant="body2" color="primary" sx={{ fontWeight: 500 }}>
                  总费用: {formatCurrencyUtil(total, normalizedCurrency, i18n.language || 'en')}
                </Typography>
              </>
            )}
          </Box>
          <IconButton
            onClick={handleToggle}
            size="small"
            sx={{
              transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)',
              transition: 'transform 0.3s ease',
              ml: 1
            }}
          >
            <ExpandMoreIcon />
          </IconButton>
        </Box>

        <Collapse in={expanded} timeout="auto" unmountOnExit>
          <Divider sx={{ mb: 2 }} />

          {/* 行程信息 */}
          <Box sx={{ mb: 3, p: 2, backgroundColor: '#f5f5f5', borderRadius: 2 }}>
            <Grid container spacing={2}>
              <Grid item xs={6}>
                <Typography variant="body2" color="text.secondary">From:</Typography>
                <Typography variant="body1">
                  {formatLocation(routeData?.departure)}
                </Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="body2" color="text.secondary">To:</Typography>
                <Typography variant="body1">
                  {formatLocation(routeData?.destination)}
                </Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="body2" color="text.secondary">Date:</Typography>
                <Typography variant="body1">
                  {formatDate(routeData?.date)}
                </Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="body2" color="text.secondary">Purpose:</Typography>
                <Typography variant="body1">{purpose || '未填写'}</Typography>
              </Grid>
            </Grid>
          </Box>

          {/* 费用项目列表 */}
          {sortedExpenseEntries.length > 0 ? (
            <Grid container spacing={2}>
              {sortedExpenseEntries.map(([itemId, expense]) => {
                const budgetItem = budgetData[itemId] || {
                  itemId: itemId,
                  itemName: expense.itemName || '未知费用项',
                  unitPrice: '',
                  quantity: 1,
                  subtotal: ''
                };

                // 生成计算提示
                const unitPriceValue = parseFloat(budgetItem.unitPrice) || 0;
                const quantityValue = parseInt(budgetItem.quantity) || 0;
                const subtotalValue = parseFloat(budgetItem.subtotal) || 0;
                let calculationText = '';
                if (unitPriceValue > 0 && quantityValue > 0 && subtotalValue > 0) {
                  calculationText = `${subtotalValue.toFixed(2)}=${unitPriceValue}×${quantityValue}。该金额只可向下调整。`;
                } else {
                  calculationText = '费用计算规则：总费用=差旅标准×天数。该金额只可向下调整。';
                }

                return (
                  <Grid item xs={12} key={itemId}>
                    <ModernExpenseItem
                      tripType={tripType}
                      category={itemId}
                      label={expense.itemName || '未知费用项'}
                      icon={getExpenseIcon(expense.itemName, expense.unit)}
                      unitLabel={getUnitLabel(expense.unit, expense.itemName)}
                      unitPrice={budgetItem.unitPrice}
                      quantity={budgetItem.quantity}
                      subtotal={budgetItem.subtotal}
                      currency={normalizedCurrency}
                      onUnitPriceChange={(e) => onBudgetChange(tripType, itemId, 'unitPrice', e.target.value, routeIndex)}
                      onQuantityChange={(e) => onBudgetChange(tripType, itemId, 'quantity', e.target.value, routeIndex)}
                      showInfo={true}
                      infoText={calculationText}
                      quantityDisabled={true}
                    />
                  </Grid>
                );
              })}
            </Grid>
          ) : (
            <Alert severity="info">
              {(() => {
                // 检查是否已填写目的地和出发日期
                const hasDestination = routeData?.destination && 
                  (typeof routeData.destination === 'string' ? routeData.destination.trim() !== '' : true);
                const hasDate = routeData?.date && 
                  (dayjs.isDayjs(routeData.date) ? routeData.date.isValid() : dayjs(routeData.date).isValid());
                
                if (hasDestination && hasDate) {
                  // 已填写目的地和日期，但未匹配到费用项
                  return '已填写目的地和出发日期，但未找到匹配的差旅标准。请检查差旅标准配置或联系管理员。';
                } else {
                  // 未填写目的地或日期
                  return '请先填写目的地和出发日期，系统将自动匹配差旅标准并显示费用项目';
                }
              })()}
            </Alert>
          )}
        </Collapse>
      </CardContent>
    </Card>
  );
};

export default BudgetCard;

