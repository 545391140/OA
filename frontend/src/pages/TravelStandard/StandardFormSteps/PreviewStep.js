import React from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Divider,
  Chip
} from '@mui/material';

const PreviewStep = ({ formData, options }) => {
  const getPriorityLabel = (priority) => {
    if (priority >= 90) return '高';
    if (priority >= 60) return '中';
    return '低';
  };

  const getPriorityColor = (priority) => {
    if (priority >= 90) return 'error';
    if (priority >= 60) return 'warning';
    return 'info';
  };

  const getLimitTypeLabel = (type) => {
    const map = {
      'FIXED': '固定限额',
      'RANGE': '范围限额',
      'ACTUAL': '实报实销',
      'PERCENTAGE': '按比例'
    };
    return map[type] || type;
  };

  const getCalcUnitLabel = (unit) => {
    const map = {
      'PER_DAY': '按天',
      'PER_TRIP': '按次',
      'PER_KM': '按公里'
    };
    return map[unit] || unit;
  };

  const getOperatorLabel = (op) => {
    const map = {
      'IN': '包含',
      'NOT_IN': '不包含',
      'EQUAL': '等于',
      '>=': '大于等于',
      '<=': '小于等于'
    };
    return map[op] || op;
  };

  const getConditionTypeLabel = (type) => {
    const map = {
      'country': '国家',
      'city': '城市',
      'city_level': '城市级别',
      'position_level': '岗位级别',
      'department': '部门',
      'project_code': '项目编码'
    };
    return map[type] || type;
  };

  const getExpenseItemName = (expenseItemId) => {
    const item = options.expenseItems.find(
      i => i._id === expenseItemId || i._id?.toString() === expenseItemId?.toString()
    );
    return item ? item.itemName : expenseItemId;
  };

  return (
    <Box>
      <Typography variant="h6" gutterBottom sx={{ mb: 3 }}>
        预览确认
      </Typography>

      {/* 基础信息 */}
      <Card variant="outlined" sx={{ mb: 2 }}>
        <CardContent>
          <Typography variant="subtitle1" fontWeight="medium" gutterBottom>
            📋 基础信息
          </Typography>
          <Divider sx={{ my: 2 }} />
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
              <Typography variant="body2" color="text.secondary">标准编码：</Typography>
              <Typography variant="body2" fontWeight="medium">{formData.standardCode || '-'}</Typography>
            </Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
              <Typography variant="body2" color="text.secondary">标准名称：</Typography>
              <Typography variant="body2" fontWeight="medium">{formData.standardName || '-'}</Typography>
            </Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
              <Typography variant="body2" color="text.secondary">优先级：</Typography>
              <Chip
                label={`${getPriorityLabel(formData.priority)} (${formData.priority})`}
                color={getPriorityColor(formData.priority)}
                size="small"
              />
            </Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
              <Typography variant="body2" color="text.secondary">生效期间：</Typography>
              <Typography variant="body2">
                {formData.effectiveDate ? formData.effectiveDate.format('YYYY-MM-DD') : '-'} ~ {formData.expiryDate ? formData.expiryDate.format('YYYY-MM-DD') : '长期有效'}
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
              <Typography variant="body2" color="text.secondary">状态：</Typography>
              <Typography variant="body2">{formData.status === 'draft' ? '草稿' : formData.status === 'active' ? '生效' : '失效'}</Typography>
            </Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
              <Typography variant="body2" color="text.secondary">描述：</Typography>
              <Typography variant="body2">{formData.description || '无'}</Typography>
            </Box>
          </Box>
        </CardContent>
      </Card>

      {/* 适用条件 */}
      <Card variant="outlined" sx={{ mb: 2 }}>
        <CardContent>
          <Typography variant="subtitle1" fontWeight="medium" gutterBottom>
            🎯 适用条件
          </Typography>
          <Divider sx={{ my: 2 }} />
          {formData.conditionGroups && formData.conditionGroups.length > 0 ? (
            formData.conditionGroups.map((group, groupIndex) => (
              <Box key={groupIndex} sx={{ mb: 2, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
                <Typography variant="body2" fontWeight="medium" sx={{ mb: 1 }}>
                  条件组 {groupIndex + 1}
                  {groupIndex > 0 && (
                    <Chip label="或 (OR)" size="small" color="warning" sx={{ ml: 1 }} />
                  )}
                </Typography>
                {group.conditions && group.conditions.length > 0 ? (
                  group.conditions.map((cond, condIndex) => (
                    <Box key={condIndex} sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                      {condIndex > 0 && (
                        <Chip label="且" size="small" color="primary" />
                      )}
                      <Chip
                        label={`${getConditionTypeLabel(cond.type)} ${getOperatorLabel(cond.operator)} ${cond.value}`}
                        size="small"
                        variant="outlined"
                      />
                    </Box>
                  ))
                ) : (
                  <Typography variant="body2" color="text.secondary">未配置条件</Typography>
                )}
              </Box>
            ))
          ) : (
            <Typography variant="body2" color="text.secondary">未配置条件</Typography>
          )}
        </CardContent>
      </Card>

      {/* 费用标准 */}
      <Card variant="outlined">
        <CardContent>
          <Typography variant="subtitle1" fontWeight="medium" gutterBottom>
            💰 费用标准
          </Typography>
          <Divider sx={{ my: 2 }} />
          {formData.expenseStandards && formData.expenseStandards.length > 0 ? (
            formData.expenseStandards.map((standard, index) => {
              const itemName = getExpenseItemName(standard.expenseItemId);
              return (
                <Box key={index} sx={{ mb: 2, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
                  <Typography variant="body2" fontWeight="medium" sx={{ mb: 1 }}>
                    {itemName}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    限额类型：{getLimitTypeLabel(standard.limitType)}
                    {standard.limitType === 'FIXED' && standard.limitAmount !== undefined && (
                      ` - ${standard.limitAmount}元/${getCalcUnitLabel(standard.calcUnit)}`
                    )}
                    {standard.limitType === 'RANGE' && (
                      ` - ${standard.limitMin || 0}~${standard.limitMax || 0}元`
                    )}
                    {standard.limitType === 'PERCENTAGE' && (
                      ` - ${standard.percentage || 0}% (基准: ${standard.baseAmount || 0}元)`
                    )}
                  </Typography>
                </Box>
              );
            })
          ) : (
            <Typography variant="body2" color="text.secondary">未配置费用项</Typography>
          )}
        </CardContent>
      </Card>
    </Box>
  );
};

export default PreviewStep;

