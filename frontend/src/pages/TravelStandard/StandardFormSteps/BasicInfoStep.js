import React from 'react';
import {
  Box,
  Typography,
  TextField,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import dayjs from 'dayjs';

const BasicInfoStep = ({ formData, setFormData, errors, isEdit }) => {
  const handleChange = (field, value) => {
    if (field === 'standardCode') {
      value = value.toUpperCase();
    }
    setFormData((prev) => ({
      ...prev,
      [field]: value
    }));
  };

  const statusOptions = [
    { value: 'draft', label: '草稿' },
    { value: 'active', label: '生效' },
    { value: 'expired', label: '失效' }
  ];

  return (
    <Box>
      <Typography variant="h6" gutterBottom sx={{ mb: 3 }}>
        基础信息配置
      </Typography>

      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <TextField
            fullWidth
            label="标准编码"
            value={formData.standardCode}
            onChange={(e) => handleChange('standardCode', e.target.value)}
            error={!!errors.standardCode}
            helperText={errors.standardCode || '只能包含大写字母、数字和下划线'}
            required
            disabled={isEdit}
            inputProps={{
              style: { textTransform: 'uppercase' }
            }}
          />
        </Grid>

        <Grid item xs={12} md={6}>
          <TextField
            fullWidth
            label="标准名称"
            value={formData.standardName}
            onChange={(e) => handleChange('standardName', e.target.value)}
            error={!!errors.standardName}
            helperText={errors.standardName}
            required
            placeholder="如：国内一线城市高管标准"
          />
        </Grid>

        <Grid item xs={12} md={6}>
          <DatePicker
            label="生效日期"
            value={formData.effectiveDate}
            onChange={(date) => handleChange('effectiveDate', date)}
            slotProps={{
              textField: {
                fullWidth: true,
                required: true,
                error: !!errors.effectiveDate,
                helperText: errors.effectiveDate
              }
            }}
          />
        </Grid>

        <Grid item xs={12} md={6}>
          <DatePicker
            label="失效日期"
            value={formData.expiryDate}
            onChange={(date) => handleChange('expiryDate', date)}
            slotProps={{
              textField: {
                fullWidth: true,
                helperText: '留空表示长期有效',
                error: !!errors.expiryDate,
                helperText: errors.expiryDate || '留空表示长期有效'
              }
            }}
          />
        </Grid>

        <Grid item xs={12} md={6}>
          <TextField
            fullWidth
            label="优先级"
            type="number"
            value={formData.priority}
            onChange={(e) => handleChange('priority', parseInt(e.target.value) || 50)}
            error={!!errors.priority}
            helperText={errors.priority || '数值越大优先级越高，建议：50-100'}
            inputProps={{
              min: 0,
              max: 100
            }}
            required
          />
          <Alert severity="info" sx={{ mt: 1 }}>
            建议：高优先级 90-100，中优先级 60-89，低优先级 50-59
          </Alert>
        </Grid>

        <Grid item xs={12} md={6}>
          <FormControl fullWidth>
            <InputLabel>状态</InputLabel>
            <Select
              value={formData.status}
              onChange={(e) => handleChange('status', e.target.value)}
              label="状态"
            >
              {statusOptions.map((option) => (
                <MenuItem key={option.value} value={option.value}>
                  {option.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>

        <Grid item xs={12}>
          <TextField
            fullWidth
            multiline
            rows={3}
            label="描述"
            value={formData.description}
            onChange={(e) => handleChange('description', e.target.value)}
            placeholder="请输入标准的详细描述..."
          />
        </Grid>
      </Grid>
    </Box>
  );
};

export default BasicInfoStep;

