import React, { useEffect, useState } from 'react';
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
  Alert,
  Card,
  CardContent,
  Divider,
  CircularProgress,
  Checkbox,
  ListItemText,
  Chip,
  Autocomplete,
  FormHelperText
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  CheckBox as CheckBoxIcon,
  CheckBoxOutlineBlank as CheckBoxOutlineBlankIcon
} from '@mui/icons-material';
import apiClient from '../../../utils/axiosConfig';

const ConditionStep = ({ formData, setFormData, options, loadingOptions }) => {
  const [locationsData, setLocationsData] = useState({
    countries: [],
    cities: [],
    loading: false
  });

  // 确保conditionGroups是数组
  useEffect(() => {
    if (!Array.isArray(formData.conditionGroups)) {
      setFormData({
        ...formData,
        conditionGroups: []
      });
    }
  }, []);

  // 加载地理位置数据
  useEffect(() => {
    const fetchLocationData = async () => {
      setLocationsData(prev => ({ ...prev, loading: true }));
      try {
        // 从地理位置管理API获取数据
        const [citiesResponse] = await Promise.all([
          apiClient.get('/locations', {
            params: { type: 'city', status: 'active' }
          })
        ]);
        
        const citiesResult = citiesResponse.data?.success ? (citiesResponse.data.data || []) : [];
        
        // 从城市数据中提取唯一的国家信息
        const countryMap = new Map();
        citiesResult.forEach(city => {
          if (city.country) {
            const countryKey = city.country.toLowerCase();
            if (!countryMap.has(countryKey)) {
              countryMap.set(countryKey, {
                name: city.country,
                countryCode: city.countryCode || '',
                type: 'country'
              });
            }
          }
        });
        const countries = Array.from(countryMap.values());
        
        setLocationsData({
          countries: countries || [],
          cities: citiesResult || [],
          loading: false
        });
      } catch (error) {
        console.error('Fetch location data error:', error);
        setLocationsData(prev => ({ ...prev, loading: false }));
      }
    };

    fetchLocationData();
  }, []);
  const conditionTypes = [
    { value: 'country', label: '国家' },
    { value: 'city', label: '城市' },
    { value: 'city_level', label: '城市级别' },
    { value: 'position_level', label: '岗位级别' },
    { value: 'department', label: '部门' },
    { value: 'project_code', label: '项目编码' }
  ];

  const operators = [
    { value: 'IN', label: '包含' },
    { value: 'NOT_IN', label: '不包含' },
    { value: 'EQUAL', label: '等于' },
    { value: '>=', label: '大于等于' },
    { value: '<=', label: '小于等于' }
  ];

  const addConditionGroup = () => {
    const newGroupId = formData.conditionGroups.length > 0
      ? Math.max(...formData.conditionGroups.map(g => g.groupId)) + 1
      : 1;
    
    setFormData({
      ...formData,
      conditionGroups: [
        ...formData.conditionGroups,
        {
          groupId: newGroupId,
          logicOperator: 'AND',
          conditions: [
            { type: 'country', operator: 'IN', value: '' }
          ]
        }
      ]
    });
  };

  const removeConditionGroup = (groupIndex) => {
    setFormData({
      ...formData,
      conditionGroups: formData.conditionGroups.filter((_, i) => i !== groupIndex)
    });
  };

  const addCondition = (groupIndex) => {
    const newGroups = [...formData.conditionGroups];
    newGroups[groupIndex].conditions.push({ type: 'country', operator: 'IN', value: '' });
    setFormData({ ...formData, conditionGroups: newGroups });
  };

  const removeCondition = (groupIndex, condIndex) => {
    const newGroups = [...formData.conditionGroups];
    newGroups[groupIndex].conditions = newGroups[groupIndex].conditions.filter((_, i) => i !== condIndex);
    setFormData({ ...formData, conditionGroups: newGroups });
  };

  const updateCondition = (groupIndex, condIndex, field, value) => {
    const newGroups = [...formData.conditionGroups];
    newGroups[groupIndex].conditions[condIndex][field] = value;
    
    // 如果改变了类型，清空值
    if (field === 'type') {
      newGroups[groupIndex].conditions[condIndex].value = '';
    }
    
    setFormData({ ...formData, conditionGroups: newGroups });
  };

  // 根据条件类型获取选项列表（包含全选选项）
  const getOptionsForType = (type) => {
    let baseOptions = [];
    
    switch (type) {
      case 'country':
        baseOptions = locationsData.countries.map(country => ({
          id: country._id || country.id || `country_${country.name || country.country}`,
          name: country.name || country.country,
          label: `${country.name || country.country}${country.countryCode ? ` (${country.countryCode})` : ''}`,
          isSelectAll: false
        }));
        // 按名称排序
        baseOptions.sort((a, b) => a.name.localeCompare(b.name, 'zh-CN'));
        break;
      case 'city':
        baseOptions = locationsData.cities.map(city => ({
          id: city._id || city.id || `city_${city.name || city.city}`,
          name: city.name || city.city,
          label: `${city.name || city.city}${city.province ? `, ${city.province}` : ''}${city.country ? `, ${city.country}` : ''}`,
          isSelectAll: false
        }));
        // 按名称排序
        baseOptions.sort((a, b) => a.name.localeCompare(b.name, 'zh-CN'));
        break;
      case 'city_level':
        baseOptions = [
          { id: '1', name: '1', label: '1级 - 一线城市', isSelectAll: false },
          { id: '2', name: '2', label: '2级 - 二线城市', isSelectAll: false },
          { id: '3', name: '3', label: '3级 - 三线城市', isSelectAll: false },
          { id: '4', name: '4', label: '4级 - 其他城市', isSelectAll: false }
        ];
        break;
      default:
        return [];
    }
    
    // 添加全选选项到列表开头
    if (baseOptions.length > 0) {
      return [
        {
          id: '__SELECT_ALL__',
          name: '__SELECT_ALL__',
          label: '【全选】',
          isSelectAll: true
        },
        ...baseOptions
      ];
    }
    
    return baseOptions;
  };

  // 将选中的值字符串转换为数组
  const getSelectedValues = (valueString) => {
    if (!valueString || valueString.trim() === '') return [];
    return valueString.split(',').map(v => v.trim()).filter(v => v);
  };

  // 将数组转换为值字符串
  const valuesToString = (values) => {
    return values.join(',');
  };

  // 处理多选变化（包含全选逻辑）
  const handleMultiSelectChange = (groupIndex, condIndex, selectedOptions) => {
    const allOptions = getOptionsForType(formData.conditionGroups[groupIndex].conditions[condIndex].type);
    const realOptions = allOptions.filter(opt => !opt.isSelectAll);
    
    // 检查是否点击了全选选项
    const selectAllOption = selectedOptions.find(opt => opt.isSelectAll);
    const wasSelectAllSelected = getSelectedOptions(
      formData.conditionGroups[groupIndex].conditions[condIndex].type,
      formData.conditionGroups[groupIndex].conditions[condIndex].value
    ).some(opt => opt.isSelectAll);
    
    let finalSelectedOptions;
    
    if (selectAllOption && !wasSelectAllSelected) {
      // 如果点击了全选，选中所有真实选项
      finalSelectedOptions = realOptions;
    } else if (!selectAllOption && wasSelectAllSelected) {
      // 如果之前全选，现在取消全选，则清除所有选择
      finalSelectedOptions = [];
    } else if (selectedOptions.length === realOptions.length && !selectedOptions.some(opt => opt.isSelectAll)) {
      // 如果所有真实选项都被选中，自动添加全选标记（但实际值不包括全选）
      finalSelectedOptions = selectedOptions;
    } else {
      // 正常选择，排除全选选项
      finalSelectedOptions = selectedOptions.filter(opt => !opt.isSelectAll);
      
      // 如果选择了所有项，可以考虑自动添加全选
      if (finalSelectedOptions.length === realOptions.length && realOptions.length > 0) {
        // 所有项都被选中，保持选中状态但不添加全选标记
      }
    }
    
    const values = finalSelectedOptions.map(opt => opt.name || opt.id);
    updateCondition(groupIndex, condIndex, 'value', valuesToString(values));
  };
  
  // 获取显示用的选中选项（包含全选状态判断）
  const getDisplaySelectedOptions = (type, valueString) => {
    const allOptions = getOptionsForType(type);
    const realOptions = allOptions.filter(opt => !opt.isSelectAll);
    const selectedValues = getSelectedValues(valueString);
    const selectedRealOptions = realOptions.filter(opt => 
      selectedValues.includes(opt.name) || selectedValues.includes(opt.id)
    );
    
    // 如果所有真实选项都被选中，显示时包含全选选项
    if (selectedRealOptions.length === realOptions.length && realOptions.length > 0) {
      const selectAllOption = allOptions.find(opt => opt.isSelectAll);
      return selectAllOption ? [selectAllOption, ...selectedRealOptions] : selectedRealOptions;
    }
    
    return selectedRealOptions;
  };

  // 获取已选中的选项
  const getSelectedOptions = (type, valueString) => {
    const allOptions = getOptionsForType(type);
    const selectedValues = getSelectedValues(valueString);
    return allOptions.filter(opt => selectedValues.includes(opt.name) || selectedValues.includes(opt.id));
  };

  if (loadingOptions) {
    return (
      <Box display="flex" justifyContent="center" py={4}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h6" gutterBottom sx={{ mb: 3 }}>
        适用条件配置
      </Typography>

      <Alert severity="info" sx={{ mb: 3 }}>
        💡 提示：条件组之间是"或"关系（OR），组内条件是"且"关系（AND）
      </Alert>

      {formData.conditionGroups.length === 0 ? (
        <Box textAlign="center" py={4}>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            暂未配置适用条件
          </Typography>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={addConditionGroup}
          >
            添加条件组
          </Button>
        </Box>
      ) : (
        <Box>
          {formData.conditionGroups.map((group, groupIndex) => (
            <Card key={groupIndex} variant="outlined" sx={{ mb: 2 }}>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Typography variant="subtitle1" fontWeight="medium">
                    条件组 {groupIndex + 1}
                    {groupIndex > 0 && (
                      <Typography component="span" variant="body2" color="warning.main" sx={{ ml: 1 }}>
                        (或 OR)
                      </Typography>
                    )}
                  </Typography>
                  <Box>
                    <Button
                      size="small"
                      startIcon={<AddIcon />}
                      onClick={() => addCondition(groupIndex)}
                      sx={{ mr: 1 }}
                    >
                      添加条件
                    </Button>
                    {formData.conditionGroups.length > 1 && (
                      <IconButton
                        size="small"
                        color="error"
                        onClick={() => removeConditionGroup(groupIndex)}
                      >
                        <DeleteIcon />
                      </IconButton>
                    )}
                  </Box>
                </Box>

                <Divider sx={{ mb: 2 }} />

                {group.conditions.map((condition, condIndex) => (
                  <Box
                    key={condIndex}
                    sx={{
                      display: 'flex',
                      gap: 2,
                      alignItems: 'center',
                      mb: 2,
                      p: 2,
                      bgcolor: 'grey.50',
                      borderRadius: 1
                    }}
                  >
                    {condIndex > 0 && (
                      <Typography variant="body2" color="primary.main" fontWeight="medium" sx={{ minWidth: 40 }}>
                        且
                      </Typography>
                    )}
                    <FormControl size="small" sx={{ minWidth: 120 }}>
                      <InputLabel>条件类型</InputLabel>
                      <Select
                        value={condition.type}
                        label="条件类型"
                        onChange={(e) => updateCondition(groupIndex, condIndex, 'type', e.target.value)}
                      >
                        {conditionTypes.map(type => (
                          <MenuItem key={type.value} value={type.value}>
                            {type.label}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                    <FormControl size="small" sx={{ minWidth: 120 }}>
                      <InputLabel>运算符</InputLabel>
                      <Select
                        value={condition.operator}
                        label="运算符"
                        onChange={(e) => updateCondition(groupIndex, condIndex, 'operator', e.target.value)}
                      >
                        {operators.map(op => (
                          <MenuItem key={op.value} value={op.value}>
                            {op.label}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                    {/* 根据条件类型显示不同的输入组件 */}
                    {['country', 'city', 'city_level'].includes(condition.type) ? (
                      <FormControl size="small" fullWidth>
                        {locationsData.loading ? (
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, py: 1 }}>
                            <CircularProgress size={20} />
                            <Typography variant="body2" color="text.secondary">
                              加载数据中...
                            </Typography>
                          </Box>
                        ) : (
                          <Autocomplete
                            multiple
                            size="small"
                            options={getOptionsForType(condition.type)}
                            value={getDisplaySelectedOptions(condition.type, condition.value)}
                            onChange={(event, newValue) => {
                              handleMultiSelectChange(groupIndex, condIndex, newValue);
                            }}
                            getOptionLabel={(option) => option.label || option.name}
                            isOptionEqualToValue={(option, value) => option.id === value.id || option.name === value.name}
                            renderInput={(params) => (
                              <TextField
                                {...params}
                                placeholder={`请选择${conditionTypes.find(t => t.value === condition.type)?.label || ''}（支持全选）`}
                              />
                            )}
                            renderOption={(props, option, { selected }) => (
                              <li {...props}>
                                <Checkbox
                                  icon={<CheckBoxOutlineBlankIcon fontSize="small" />}
                                  checkedIcon={<CheckBoxIcon fontSize="small" />}
                                  checked={selected}
                                  sx={{ mr: 1 }}
                                />
                                <ListItemText 
                                  primary={option.label}
                                  primaryTypographyProps={{
                                    sx: option.isSelectAll ? { fontWeight: 600, color: 'primary.main' } : {}
                                  }}
                                />
                              </li>
                            )}
                            renderTags={(value, getTagProps) => {
                              const realValues = value.filter(opt => !opt.isSelectAll);
                              const hasSelectAll = value.some(opt => opt.isSelectAll);
                              const displayCount = hasSelectAll ? value.length : realValues.length;
                              
                              return (
                                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                                  {hasSelectAll && (
                                    <Chip
                                      label="全选"
                                      size="small"
                                      color="primary"
                                      sx={{ fontWeight: 600 }}
                                    />
                                  )}
                                  {realValues.slice(0, hasSelectAll ? 2 : 3).map((option, index) => (
                                    <Chip
                                      {...getTagProps({ index: hasSelectAll ? index + 1 : index })}
                                      key={option.id}
                                      label={option.name || option.label}
                                      size="small"
                                    />
                                  ))}
                                  {realValues.length > (hasSelectAll ? 2 : 3) && (
                                    <Chip
                                      label={`+${realValues.length - (hasSelectAll ? 2 : 3)}`}
                                      size="small"
                                      variant="outlined"
                                    />
                                  )}
                                </Box>
                              );
                            }}
                            disableCloseOnSelect
                            noOptionsText="暂无数据"
                            limitTags={5}
                          />
                        )}
                        <FormHelperText>
                          {condition.value ? `已选择 ${getSelectedValues(condition.value).length} 项` : '支持多选，可全选'}
                        </FormHelperText>
                      </FormControl>
                    ) : (
                      <TextField
                        size="small"
                        fullWidth
                        placeholder="输入值，多个值用逗号分隔"
                        value={condition.value}
                        onChange={(e) => updateCondition(groupIndex, condIndex, 'value', e.target.value)}
                      />
                    )}
                    {group.conditions.length > 1 && (
                      <IconButton
                        size="small"
                        color="error"
                        onClick={() => removeCondition(groupIndex, condIndex)}
                      >
                        <DeleteIcon />
                      </IconButton>
                    )}
                  </Box>
                ))}
              </CardContent>
            </Card>
          ))}

          <Button
            variant="outlined"
            startIcon={<AddIcon />}
            onClick={addConditionGroup}
          >
            添加条件组 (OR)
          </Button>
        </Box>
      )}
    </Box>
  );
};

export default ConditionStep;

