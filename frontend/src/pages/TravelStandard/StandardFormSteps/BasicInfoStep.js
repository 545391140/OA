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
import { useTranslation } from 'react-i18next';
import dayjs from 'dayjs';

const BasicInfoStep = ({ formData, setFormData, errors, isEdit }) => {
  const { t } = useTranslation();
  
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
    { value: 'draft', label: t('travelStandard.form.basicInfo.statuses.draft') },
    { value: 'active', label: t('travelStandard.form.basicInfo.statuses.active') },
    { value: 'expired', label: t('travelStandard.form.basicInfo.statuses.expired') }
  ];

  return (
    <Box>
      <Typography variant="h6" gutterBottom sx={{ mb: 3 }}>
        {t('travelStandard.form.basicInfo.title')}
      </Typography>

      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <TextField
            fullWidth
            label={t('travelStandard.form.basicInfo.standardCode')}
            value={formData.standardCode}
            onChange={(e) => handleChange('standardCode', e.target.value)}
            error={!!errors.standardCode}
            helperText={errors.standardCode || t('travelStandard.form.basicInfo.standardCodeHelper')}
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
            label={t('travelStandard.form.basicInfo.standardName')}
            value={formData.standardName}
            onChange={(e) => handleChange('standardName', e.target.value)}
            error={!!errors.standardName}
            helperText={errors.standardName}
            required
            placeholder={t('travelStandard.form.basicInfo.standardNamePlaceholder')}
          />
        </Grid>

        <Grid item xs={12} md={6}>
          <DatePicker
            label={t('travelStandard.form.basicInfo.effectiveDate')}
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
            label={t('travelStandard.form.basicInfo.expiryDate')}
            value={formData.expiryDate}
            onChange={(date) => handleChange('expiryDate', date)}
            slotProps={{
              textField: {
                fullWidth: true,
                helperText: errors.expiryDate || t('travelStandard.form.basicInfo.expiryDateHelper'),
                error: !!errors.expiryDate
              }
            }}
          />
        </Grid>

        <Grid item xs={12} md={6}>
          <TextField
            fullWidth
            label={t('travelStandard.form.basicInfo.priority')}
            type="number"
            value={formData.priority}
            onChange={(e) => handleChange('priority', parseInt(e.target.value) || 50)}
            error={!!errors.priority}
            helperText={errors.priority || t('travelStandard.form.basicInfo.priorityHelper')}
            inputProps={{
              min: 0,
              max: 100
            }}
            required
          />
          <Alert severity="info" sx={{ mt: 1 }}>
            {t('travelStandard.form.basicInfo.priorityInfo')}
          </Alert>
        </Grid>

        <Grid item xs={12} md={6}>
          <FormControl fullWidth>
            <InputLabel>{t('travelStandard.form.basicInfo.status')}</InputLabel>
            <Select
              value={formData.status}
              onChange={(e) => handleChange('status', e.target.value)}
              label={t('travelStandard.form.basicInfo.status')}
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
            label={t('travelStandard.form.basicInfo.description')}
            value={formData.description}
            onChange={(e) => handleChange('description', e.target.value)}
            placeholder={t('travelStandard.form.basicInfo.descriptionPlaceholder')}
          />
        </Grid>
      </Grid>
    </Box>
  );
};

export default BasicInfoStep;

