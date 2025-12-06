/**
 * ExpenseDetailsStep - 费用明细步骤
 * 包含: 供应商信息、项目、成本中心、标签等
 */

import React from 'react';
import {
  Grid,
  TextField,
  Autocomplete,
  Chip,
  Box,
  Typography,
  Divider
} from '@mui/material';
import { getProjects, getCostCenters, getClients, getCommonTags } from '../utils/constants';

const ExpenseDetailsStep = ({
  formData,
  errors,
  handleChange,
  t
}) => {
  const projects = getProjects(t);
  const costCenters = getCostCenters(t);
  const clients = getClients(t);
  const commonTags = getCommonTags(t);

  return (
    <Grid container spacing={3}>
      {/* 供应商信息 */}
      <Grid item xs={12}>
        <Typography variant="h6" gutterBottom>
          {t('expense.vendorInfo') || '供应商信息'}
        </Typography>
        <Divider sx={{ mb: 2 }} />
      </Grid>

      <Grid item xs={12} md={6}>
        <TextField
          fullWidth
          label={t('expense.vendorName')}
          value={formData.vendor?.name || ''}
          onChange={(e) => handleChange('vendor.name', e.target.value)}
        />
      </Grid>

      <Grid item xs={12} md={6}>
        <TextField
          fullWidth
          label={t('expense.vendorTaxId')}
          value={formData.vendor?.taxId || ''}
          onChange={(e) => handleChange('vendor.taxId', e.target.value)}
        />
      </Grid>

      <Grid item xs={12}>
        <TextField
          fullWidth
          label={t('expense.vendorAddress')}
          value={formData.vendor?.address || ''}
          onChange={(e) => handleChange('vendor.address', e.target.value)}
          multiline
          rows={2}
        />
      </Grid>

      {/* 项目和成本中心 */}
      <Grid item xs={12}>
        <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
          {t('expense.projectInfo') || '项目信息'}
        </Typography>
        <Divider sx={{ mb: 2 }} />
      </Grid>

      <Grid item xs={12} md={6}>
        <Autocomplete
          freeSolo
          options={projects}
          value={formData.project || ''}
          onChange={(event, newValue) => handleChange('project', newValue || '')}
          onInputChange={(event, newInputValue) => handleChange('project', newInputValue)}
          renderInput={(params) => (
            <TextField
              {...params}
              label={t('expense.project')}
            />
          )}
        />
      </Grid>

      <Grid item xs={12} md={6}>
        <Autocomplete
          freeSolo
          options={costCenters}
          value={formData.costCenter || ''}
          onChange={(event, newValue) => handleChange('costCenter', newValue || '')}
          onInputChange={(event, newInputValue) => handleChange('costCenter', newInputValue)}
          renderInput={(params) => (
            <TextField
              {...params}
              label={t('expense.costCenter')}
            />
          )}
        />
      </Grid>

      <Grid item xs={12} md={6}>
        <Autocomplete
          freeSolo
          options={clients}
          value={formData.client || ''}
          onChange={(event, newValue) => handleChange('client', newValue || '')}
          onInputChange={(event, newInputValue) => handleChange('client', newInputValue)}
          renderInput={(params) => (
            <TextField
              {...params}
              label={t('expense.client')}
            />
          )}
        />
      </Grid>

      {/* 标签 */}
      <Grid item xs={12}>
        <Autocomplete
          multiple
          freeSolo
          options={commonTags}
          value={formData.tags || []}
          onChange={(event, newValue) => handleChange('tags', newValue)}
          renderTags={(value, getTagProps) =>
            value.map((option, index) => (
              <Chip
                label={option}
                {...getTagProps({ index })}
                key={index}
              />
            ))
          }
          renderInput={(params) => (
            <TextField
              {...params}
              label={t('expense.tags')}
              placeholder={t('expense.addTag')}
            />
          )}
        />
      </Grid>

      {/* 备注 */}
      <Grid item xs={12}>
        <TextField
          fullWidth
          label={t('expense.notes')}
          value={formData.notes || ''}
          onChange={(e) => handleChange('notes', e.target.value)}
          multiline
          rows={4}
          placeholder={t('expense.notesPlaceholder')}
        />
      </Grid>
    </Grid>
  );
};

export default BasicInfoStep;

