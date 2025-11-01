import React, { useEffect } from 'react';
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
  CircularProgress
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon
} from '@mui/icons-material';

const ConditionStep = ({ formData, setFormData, options, loadingOptions }) => {
  // 确保conditionGroups是数组
  useEffect(() => {
    if (!Array.isArray(formData.conditionGroups)) {
      setFormData({
        ...formData,
        conditionGroups: []
      });
    }
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
    setFormData({ ...formData, conditionGroups: newGroups });
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
                    <TextField
                      size="small"
                      fullWidth
                      placeholder="输入值，多个值用逗号分隔"
                      value={condition.value}
                      onChange={(e) => updateCondition(groupIndex, condIndex, 'value', e.target.value)}
                    />
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

