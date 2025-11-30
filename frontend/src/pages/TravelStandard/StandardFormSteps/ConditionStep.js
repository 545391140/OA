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
  
  // 用于存储每个条件的搜索结果（key: `${groupIndex}_${condIndex}`, value: 搜索结果数组）
  const [searchResults, setSearchResults] = useState({});
  
  // 用于存储每个条件的加载状态
  const [searchLoading, setSearchLoading] = useState({});
  
  // 用于存储每个条件的输入值（用于搜索）
  const [inputValues, setInputValues] = useState({});
  
  // 防抖定时器
  const searchTimers = React.useRef({});

  // 确保conditionGroups是数组
  useEffect(() => {
    if (!Array.isArray(formData.conditionGroups)) {
      setFormData({
        ...formData,
        conditionGroups: []
      });
    }
  }, []);

  // 异步搜索地理位置数据（按需加载，避免一次性加载过多数据）
  const searchLocations = async (type, searchTerm = '', limit = 500) => {
    try {
      const params = {
        type,
        status: 'active',
        limit,
        page: 1
      };
      
      // 如果有搜索关键词，添加搜索参数
      if (searchTerm && searchTerm.trim()) {
        params.search = searchTerm.trim();
      }
      
      const response = await apiClient.get('/locations', { params });
      
      if (response.data?.success) {
        return response.data.data || [];
      }
      return [];
    } catch (error) {
      // 搜索失败，返回空数组
      return [];
    }
  };
  
  // 处理异步搜索（带防抖）
  const handleSearchInput = async (groupIndex, condIndex, type, inputValue) => {
    const key = `${groupIndex}_${condIndex}`;
    
    // 清除之前的定时器
    if (searchTimers.current[key]) {
      clearTimeout(searchTimers.current[key]);
    }
    
    // 如果输入为空，加载前500条数据
    const searchTerm = inputValue || '';
    
    // 设置加载状态
    setSearchLoading(prev => ({ ...prev, [key]: true }));
    
    // 防抖：500ms 后执行搜索
    searchTimers.current[key] = setTimeout(async () => {
      try {
        const results = await searchLocations(type, searchTerm, 500);
        setSearchResults(prev => ({ ...prev, [key]: results }));
      } catch (error) {
        // 搜索失败，设置空结果
        setSearchResults(prev => ({ ...prev, [key]: [] }));
      } finally {
        setSearchLoading(prev => ({ ...prev, [key]: false }));
      }
    }, 500);
  };
  
  // 初始化时只加载少量常用数据（可选）
  useEffect(() => {
    // 不再一次性加载所有数据，改为按需搜索加载
    // 这样可以避免页面卡死
    setLocationsData({
      countries: [],
      cities: [],
      loading: false
    });
  }, []);
  const conditionTypes = [
    { value: 'country', label: '国家' },
    { value: 'city', label: '城市' },
    { value: 'city_level', label: '城市级别' },
    { value: 'position_level', label: '岗位级别' },
    { value: 'role', label: '角色' },
    { value: 'position', label: '岗位' },
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

  const updateCondition = (groupIndex, condIndex, field, value, locationIds = null) => {
    const newGroups = [...formData.conditionGroups];
    newGroups[groupIndex].conditions[condIndex][field] = value;
    
    // 如果改变了类型，清空值、locationIds 和搜索结果
    if (field === 'type') {
      newGroups[groupIndex].conditions[condIndex].value = '';
      newGroups[groupIndex].conditions[condIndex].locationIds = [];
      
      // 清空该条件的搜索结果和输入值
      const key = `${groupIndex}_${condIndex}`;
      setSearchResults(prev => {
        const newResults = { ...prev };
        delete newResults[key];
        return newResults;
      });
      setInputValues(prev => {
        const newInputValues = { ...prev };
        delete newInputValues[key];
        return newInputValues;
      });
      
      // 如果新类型是 country 或 city，初始化搜索
      if (value === 'country' || value === 'city') {
        // 延迟初始化，确保状态更新完成
        setTimeout(() => {
          handleSearchInput(groupIndex, condIndex, value, '');
        }, 100);
      }
    }
    
    // 如果提供了 locationIds，同时更新 locationIds 字段
    if (locationIds !== null) {
      newGroups[groupIndex].conditions[condIndex].locationIds = locationIds;
    }
    
    setFormData({ ...formData, conditionGroups: newGroups });
  };

  // 根据条件类型获取选项列表（包含全选选项）
  const getOptionsForType = (type, groupIndex = null, condIndex = null) => {
    let baseOptions = [];
    
    switch (type) {
      case 'country':
        // 使用搜索结果，如果没有则返回空数组（通过异步搜索加载）
        const countryKey = groupIndex !== null && condIndex !== null ? `${groupIndex}_${condIndex}` : null;
        const countryResults = countryKey ? (searchResults[countryKey] || []) : [];
        baseOptions = countryResults.map(country => ({
          id: country._id || country.id || `country_${country.name || country.country}`,
          name: country.name || country.country,
          label: `${country.name || country.country}${country.countryCode ? ` (${country.countryCode})` : ''}`,
          isSelectAll: false,
          // 保存 Location ID 用于匹配（优先使用 _id，如果是从城市数据提取的国家可能没有 _id）
          locationId: country._id || country.id || null
        }));
        // 按名称排序
        baseOptions.sort((a, b) => a.name.localeCompare(b.name, 'zh-CN'));
        break;
      case 'city':
        // 使用搜索结果，如果没有则返回空数组（通过异步搜索加载）
        const cityKey = groupIndex !== null && condIndex !== null ? `${groupIndex}_${condIndex}` : null;
        const cityResults = cityKey ? (searchResults[cityKey] || []) : [];
        baseOptions = cityResults.map(city => ({
          id: city._id || city.id || `city_${city.name || city.city}`,
          name: city.name || city.city,
          label: `${city.name || city.city}${city.province ? `, ${city.province}` : ''}${city.country ? `, ${city.country}` : ''}`,
          isSelectAll: false,
          // 保存 Location ID 用于匹配（优先使用 _id）
          locationId: city._id || city.id || null
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
      case 'role':
        // 从角色管理获取数据
        baseOptions = (options.roles || []).map(role => ({
          id: role.code || role._id,
          name: role.code, // 保存时使用code
          label: role.name ? `${role.name} (${role.code})` : role.code,
          isSelectAll: false
        }));
        // 按名称排序
        baseOptions.sort((a, b) => {
          const nameA = options.roles?.find(r => r.code === a.name)?.name || a.name;
          const nameB = options.roles?.find(r => r.code === b.name)?.name || b.name;
          return nameA.localeCompare(nameB, 'zh-CN');
        });
        break;
      case 'position':
        // 从岗位管理获取数据
        baseOptions = (options.positions || []).map(position => ({
          id: position.code || position._id,
          name: position.code, // 保存时使用code
          label: position.name 
            ? `${position.name} (${position.code})${position.department ? ` - ${position.department}` : ''}`
            : position.code,
          isSelectAll: false
        }));
        // 按名称排序
        baseOptions.sort((a, b) => {
          const nameA = options.positions?.find(p => p.code === a.name)?.name || a.name;
          const nameB = options.positions?.find(p => p.code === b.name)?.name || b.name;
          return nameA.localeCompare(nameB, 'zh-CN');
        });
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
    const conditionType = formData.conditionGroups[groupIndex].conditions[condIndex].type;
    const allOptions = getOptionsForType(conditionType, groupIndex, condIndex);
    const realOptions = allOptions.filter(opt => !opt.isSelectAll);
    
    // 检查是否点击了全选选项
    const selectAllOption = selectedOptions.find(opt => opt.isSelectAll);
    const wasSelectAllSelected = getSelectedOptions(
      conditionType,
      formData.conditionGroups[groupIndex].conditions[condIndex].value,
      groupIndex,
      condIndex
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
    
    // 对于城市和国家类型，同时保存 Location ID 数组
    let locationIds = null;
    
    if (conditionType === 'city' || conditionType === 'country') {
      // 提取有效的 Location ID（排除全选选项和无效 ID）
      locationIds = finalSelectedOptions
        .filter(opt => opt.locationId && opt.locationId !== '__SELECT_ALL__')
        .map(opt => opt.locationId)
        .filter(id => id && typeof id === 'string' && id.length > 0);
    }
    
    updateCondition(groupIndex, condIndex, 'value', valuesToString(values), locationIds);
  };
  
  // 获取显示用的选中选项（包含全选状态判断）
  const getDisplaySelectedOptions = (type, valueString, groupIndex, condIndex) => {
    const allOptions = getOptionsForType(type, groupIndex, condIndex);
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
  const getSelectedOptions = (type, valueString, groupIndex, condIndex) => {
    const allOptions = getOptionsForType(type, groupIndex, condIndex);
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
                    {['country', 'city', 'city_level', 'role', 'position'].includes(condition.type) ? (
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
                            options={getOptionsForType(condition.type, groupIndex, condIndex)}
                            value={getDisplaySelectedOptions(condition.type, condition.value, groupIndex, condIndex)}
                            inputValue={inputValues[`${groupIndex}_${condIndex}`] || ''}
                            onInputChange={(event, newInputValue, reason) => {
                              const key = `${groupIndex}_${condIndex}`;
                              
                              // 更新输入值状态
                              setInputValues(prev => ({ ...prev, [key]: newInputValue || '' }));
                              
                              // 当用户输入时，触发异步搜索
                              // reason 可能是 'input', 'clear', 'reset'
                              if (condition.type === 'country' || condition.type === 'city') {
                                // 只要输入值发生变化，就触发搜索
                                // 这样可以确保搜索功能正常工作
                                if (reason === 'input' || (reason === 'reset' && newInputValue && newInputValue.trim())) {
                                  // 用户输入时触发搜索
                                  handleSearchInput(groupIndex, condIndex, condition.type, newInputValue);
                                } else if (reason === 'clear' || (reason === 'reset' && !newInputValue)) {
                                  // 清空时重新加载初始数据
                                  handleSearchInput(groupIndex, condIndex, condition.type, '');
                                } else if (newInputValue && newInputValue.trim()) {
                                  // 如果输入值不为空，也触发搜索（兜底逻辑）
                                  handleSearchInput(groupIndex, condIndex, condition.type, newInputValue);
                                }
                              }
                            }}
                            onChange={(event, newValue) => {
                              handleMultiSelectChange(groupIndex, condIndex, newValue);
                            }}
                            onOpen={() => {
                              // 当打开下拉框时，如果没有数据，加载初始数据
                              const key = `${groupIndex}_${condIndex}`;
                              if ((condition.type === 'country' || condition.type === 'city')) {
                                // 如果没有搜索结果或搜索结果为空，加载初始数据
                                if (!searchResults[key] || searchResults[key].length === 0) {
                                handleSearchInput(groupIndex, condIndex, condition.type, '');
                                }
                              }
                            }}
                            loading={searchLoading[`${groupIndex}_${condIndex}`] || false}
                            getOptionLabel={(option) => option.label || option.name}
                            isOptionEqualToValue={(option, value) => option.id === value.id || option.name === value.name}
                            // 禁用默认过滤，使用异步搜索（关键：允许输入搜索）
                            filterOptions={(options) => options}
                            // 确保可以输入搜索文本
                            selectOnFocus={false}
                            clearOnBlur={false}
                            handleHomeEndKeys={true}
                            // 允许输入任意文本进行搜索
                            openOnFocus={true}
                            renderInput={(params) => (
                              <TextField
                                {...params}
                                placeholder={`请选择${conditionTypes.find(t => t.value === condition.type)?.label || ''}（支持搜索和多选）`}
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
                            noOptionsText={
                              searchLoading[`${groupIndex}_${condIndex}`] 
                                ? "搜索中..." 
                                : (condition.type === 'country' || condition.type === 'city')
                                  ? "请输入关键词搜索（支持中文、英文、拼音）"
                                  : "暂无数据"
                            }
                            limitTags={5}
                          />
                        )}
                        <FormHelperText>
                          {condition.value ? `已选择 ${getSelectedValues(condition.value).length} 项` : 
                            (condition.type === 'country' || condition.type === 'city')
                              ? '支持搜索和多选，输入关键词可搜索'
                              : '支持多选，可全选'}
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

