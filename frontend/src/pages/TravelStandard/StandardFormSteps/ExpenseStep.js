import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  TextField,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  IconButton,
  Card,
  CardContent,
  Divider,
  CircularProgress,
  Alert,
  Checkbox,
  FormControlLabel,
  Chip
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon
} from '@mui/icons-material';

const ExpenseStep = ({ formData, setFormData, options, loadingOptions }) => {
  const limitTypes = [
    { value: 'FIXED', label: '固定限额' },
    { value: 'RANGE', label: '范围限额' },
    { value: 'ACTUAL', label: '实报实销' },
    { value: 'PERCENTAGE', label: '按比例' }
  ];

  const calcUnits = [
    { value: 'PER_DAY', label: '按天' },
    { value: 'PER_TRIP', label: '按次' },
    { value: 'PER_KM', label: '按公里' }
  ];

  // 统一ID比较的辅助函数
  const compareIds = (id1, id2) => {
    // 处理 null 和 undefined
    if (id1 === null || id1 === undefined) {
      return id2 === null || id2 === undefined;
    }
    if (id2 === null || id2 === undefined) {
      return false;
    }
    
    // 处理对象类型（排除 null）
    const str1 = (id1 !== null && typeof id1 === 'object' && id1._id) 
      ? (id1._id?.toString() || id1.toString()) 
      : (id1?.toString() || id1);
    const str2 = (id2 !== null && typeof id2 === 'object' && id2._id)
      ? (id2._id?.toString() || id2.toString())
      : (id2?.toString() || id2);
    return str1 === str2;
  };

  // 当费用项被选中时，自动创建或更新expenseStandards
  const handleExpenseItemToggle = (expenseItemId, checked) => {
    const newConfigured = { ...formData.expenseItemsConfigured };
    if (checked) {
      newConfigured[expenseItemId] = true;
      // 检查是否已有对应的expenseStandards配置
      const existingIndex = formData.expenseStandards.findIndex(
        es => compareIds(es.expenseItemId, expenseItemId)
      );
      if (existingIndex === -1) {
        // 创建新的费用标准配置
        setFormData({
          ...formData,
          expenseItemsConfigured: newConfigured,
          expenseStandards: [
            ...formData.expenseStandards,
            {
              expenseItemId: expenseItemId,
              limitType: 'FIXED',
              limitAmount: 0,
              calcUnit: 'PER_DAY'
            }
          ]
        });
      } else {
        setFormData({
          ...formData,
          expenseItemsConfigured: newConfigured
        });
      }
    } else {
      delete newConfigured[expenseItemId];
      setFormData({
        ...formData,
        expenseItemsConfigured: newConfigured,
        expenseStandards: formData.expenseStandards.filter(
          es => !compareIds(es.expenseItemId, expenseItemId)
        )
      });
    }
  };

  const updateExpenseStandard = (expenseItemId, field, value) => {
    const newStandards = [...formData.expenseStandards];
    const index = newStandards.findIndex(
      es => compareIds(es.expenseItemId, expenseItemId)
    );
    
    if (index !== -1) {
      newStandards[index] = {
        ...newStandards[index],
        [field]: value
      };
      setFormData({
        ...formData,
        expenseStandards: newStandards
      });
    }
  };

  const getExpenseStandard = (expenseItemId) => {
    return formData.expenseStandards.find(
      es => compareIds(es.expenseItemId, expenseItemId)
    );
  };

  if (loadingOptions) {
    return (
      <Box display="flex" justifyContent="center" py={4}>
        <CircularProgress />
      </Box>
    );
  }

  // 对费用项进行排序：将"其他费用"放到最后
  const sortedExpenseItems = [...options.expenseItems].sort((a, b) => {
    // 检查是否是"其他费用"（系统默认的父费用项）
    const aIsOtherExpense = a.itemName === '其他费用' || (a.isSystemDefault && !a.parentItem);
    const bIsOtherExpense = b.itemName === '其他费用' || (b.isSystemDefault && !b.parentItem);
    
    // 如果一个是"其他费用"，另一个不是，将"其他费用"排到后面
    if (aIsOtherExpense && !bIsOtherExpense) return 1;
    if (!aIsOtherExpense && bIsOtherExpense) return -1;
    
    // 如果都是或都不是"其他费用"，保持原顺序（按名称排序）
    return a.itemName.localeCompare(b.itemName, 'zh-CN');
  });

  // 对已选择的费用项也进行排序：将"其他费用"放到最后
  const selectedExpenseItems = sortedExpenseItems
    .filter(item => formData.expenseItemsConfigured[item._id])
    .sort((a, b) => {
      // 检查是否是"其他费用"（系统默认的父费用项）
      const aIsOtherExpense = a.itemName === '其他费用' || (a.isSystemDefault && !a.parentItem);
      const bIsOtherExpense = b.itemName === '其他费用' || (b.isSystemDefault && !b.parentItem);
      
      // 如果一个是"其他费用"，另一个不是，将"其他费用"排到后面
      if (aIsOtherExpense && !bIsOtherExpense) return 1;
      if (!aIsOtherExpense && bIsOtherExpense) return -1;
      
      // 如果都是或都不是"其他费用"，保持原顺序（按名称排序）
      return a.itemName.localeCompare(b.itemName, 'zh-CN');
    });

  // 查找"其他费用"父项，用于判断子项
  const otherExpenseParent = sortedExpenseItems.find(
    item => (item.itemName === '其他费用' || (item.isSystemDefault && !item.parentItem)) && !item.parentItem
  );

  // 判断是否是"其他费用"的子项
  const isChildOfOtherExpense = (item) => {
    if (!item.parentItem) return false;
    const parentId = typeof item.parentItem === 'object' ? item.parentItem._id?.toString() : item.parentItem?.toString();
    return otherExpenseParent && (otherExpenseParent._id?.toString() || otherExpenseParent._id) === parentId;
  };

  return (
    <Box>
      <Typography variant="h6" gutterBottom sx={{ mb: 3 }}>
        费用标准配置
      </Typography>

      <Alert severity="info" sx={{ mb: 3 }}>
        选择需要配置的费用项，并设置对应的限额标准
      </Alert>

      {options.expenseItems.length === 0 ? (
        <Alert severity="warning">
          暂无已启用的费用项，请先在"费用项目维护"中创建并启用费用项
        </Alert>
      ) : (
        <Box>
          <Box sx={{ mb: 3 }}>
            <Typography variant="subtitle1" gutterBottom>
              选择费用项
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
              {sortedExpenseItems.map((item) => {
                const isChild = isChildOfOtherExpense(item);
                return (
                  <FormControlLabel
                    key={item._id}
                    control={
                      <Checkbox
                        checked={formData.expenseItemsConfigured[item._id] || false}
                        onChange={(e) => handleExpenseItemToggle(item._id, e.target.checked)}
                      />
                    }
                    label={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        {isChild && (
                          <Chip
                            label="其他费用子项"
                            size="small"
                            color="primary"
                            variant="outlined"
                            sx={{ fontSize: '0.7rem', height: '20px' }}
                          />
                        )}
                        <Typography variant="body2">{item.itemName}</Typography>
                      </Box>
                    }
                  />
                );
              })}
            </Box>
          </Box>

          {selectedExpenseItems.length === 0 ? (
            <Alert severity="info">
              请先选择至少一个费用项进行配置
            </Alert>
          ) : (
            <Box>
              {selectedExpenseItems.map((item) => {
                const standard = getExpenseStandard(item._id);
                if (!standard) return null;

                return (
                  <Card key={item._id} variant="outlined" sx={{ mb: 2 }}>
                    <CardContent>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                        <Typography variant="subtitle1" fontWeight="medium">
                          {item.itemName}
                        </Typography>
                        {isChildOfOtherExpense(item) && (
                          <Chip
                            label="其他费用子项"
                            size="small"
                            color="primary"
                            variant="outlined"
                          />
                        )}
                      </Box>
                      <Divider sx={{ mb: 2 }} />

                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        <Box sx={{ display: 'flex', gap: 2 }}>
                          <FormControl fullWidth>
                            <InputLabel>限额类型</InputLabel>
                            <Select
                              value={standard.limitType || 'FIXED'}
                              label="限额类型"
                              onChange={(e) => updateExpenseStandard(item._id, 'limitType', e.target.value)}
                            >
                              {limitTypes.map(type => (
                                <MenuItem key={type.value} value={type.value}>
                                  {type.label}
                                </MenuItem>
                              ))}
                            </Select>
                          </FormControl>

                          {standard.limitType === 'FIXED' && (
                            <>
                              <TextField
                                fullWidth
                                label="限额金额 (元)"
                                type="number"
                                value={standard.limitAmount || 0}
                                onChange={(e) => updateExpenseStandard(item._id, 'limitAmount', parseFloat(e.target.value) || 0)}
                                inputProps={{ min: 0 }}
                              />
                              <FormControl fullWidth>
                                <InputLabel>计算单位</InputLabel>
                                <Select
                                  value={standard.calcUnit || 'PER_DAY'}
                                  label="计算单位"
                                  onChange={(e) => updateExpenseStandard(item._id, 'calcUnit', e.target.value)}
                                >
                                  {calcUnits.map(unit => (
                                    <MenuItem key={unit.value} value={unit.value}>
                                      {unit.label}
                                    </MenuItem>
                                  ))}
                                </Select>
                              </FormControl>
                            </>
                          )}

                          {standard.limitType === 'RANGE' && (
                            <>
                              <TextField
                                fullWidth
                                label="最小金额 (元)"
                                type="number"
                                value={standard.limitMin || 0}
                                onChange={(e) => updateExpenseStandard(item._id, 'limitMin', parseFloat(e.target.value) || 0)}
                                inputProps={{ min: 0 }}
                              />
                              <TextField
                                fullWidth
                                label="最大金额 (元)"
                                type="number"
                                value={standard.limitMax || 0}
                                onChange={(e) => updateExpenseStandard(item._id, 'limitMax', parseFloat(e.target.value) || 0)}
                                inputProps={{ min: 0 }}
                              />
                            </>
                          )}

                          {standard.limitType === 'PERCENTAGE' && (
                            <>
                              <TextField
                                fullWidth
                                label="比例 (%)"
                                type="number"
                                value={standard.percentage || 0}
                                onChange={(e) => updateExpenseStandard(item._id, 'percentage', parseFloat(e.target.value) || 0)}
                                inputProps={{ min: 0, max: 100 }}
                              />
                              <TextField
                                fullWidth
                                label="基准金额 (元)"
                                type="number"
                                value={standard.baseAmount || 0}
                                onChange={(e) => updateExpenseStandard(item._id, 'baseAmount', parseFloat(e.target.value) || 0)}
                                inputProps={{ min: 0 }}
                              />
                            </>
                          )}
                        </Box>
                      </Box>
                    </CardContent>
                  </Card>
                );
              })}
            </Box>
          )}
        </Box>
      )}
    </Box>
  );
};

export default ExpenseStep;

