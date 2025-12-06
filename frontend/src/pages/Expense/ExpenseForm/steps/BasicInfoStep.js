/**
 * BasicInfoStep - 基本信息步骤
 * 包含: 标题、描述、分类、金额、日期、差旅选择等
 */

import React from 'react';
import {
  Grid,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Autocomplete,
  InputAdornment,
  CircularProgress,
  Alert,
  Card,
  CardContent,
  Typography,
  Table,
  TableBody,
  TableRow,
  TableCell
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { AttachMoney as MoneyIcon } from '@mui/icons-material';
import { getCategories, getSubcategories } from '../utils/constants';

const BasicInfoStep = ({
  formData,
  errors,
  handleChange,
  currencies,
  selectedTravel,
  setSelectedTravel,
  travelOptions,
  travelLoading,
  isEdit,
  t
}) => {
  const categories = getCategories(t);
  const subcategories = getSubcategories(t);

  return (
    <Grid container spacing={3}>
      {/* 差旅选择 */}
      {!isEdit && (
        <Grid item xs={12} md={6}>
          <Autocomplete
            options={travelOptions}
            getOptionLabel={(option) => 
              `${option.travelNumber || ''} - ${option.title || ''}`
            }
            loading={travelLoading}
            value={selectedTravel}
            onChange={(event, newValue) => setSelectedTravel(newValue)}
            renderInput={(params) => (
              <TextField
                {...params}
                label={t('expense.travelNumber') || '差旅单号'}
                placeholder={t('expense.searchTravelNumber') || '搜索差旅单号...'}
                InputProps={{
                  ...params.InputProps,
                  endAdornment: (
                    <>
                      {travelLoading ? <CircularProgress size={20} /> : null}
                      {params.InputProps.endAdornment}
                    </>
                  ),
                }}
              />
            )}
          />
        </Grid>
      )}

      {/* 关联差旅信息显示 */}
      {isEdit && selectedTravel && (
        <Grid item xs={12}>
          <Alert severity="info">
            {t('expense.relatedTravelInfo') || '关联差旅单'}: {selectedTravel.travelNumber}
          </Alert>
        </Grid>
      )}

      {/* 差旅详情卡片 */}
      {selectedTravel && (
        <Grid item xs={12}>
          <Card variant="outlined">
            <CardContent>
              <Typography variant="h6" gutterBottom>
                {t('expense.travelInfo') || '差旅信息'}
              </Typography>
              <Table size="small">
                <TableBody>
                  <TableRow>
                    <TableCell>{t('travel.title')}</TableCell>
                    <TableCell>{selectedTravel.title}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>{t('travel.destination')}</TableCell>
                    <TableCell>{selectedTravel.destination}</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </Grid>
      )}

      {/* 标题 */}
      <Grid item xs={12} md={6}>
        <TextField
          fullWidth
          label={t('expense.title')}
          value={formData.title}
          onChange={(e) => handleChange('title', e.target.value)}
          error={!!errors.title}
          helperText={errors.title}
          required
        />
      </Grid>

      {/* 描述 */}
      <Grid item xs={12}>
        <TextField
          fullWidth
          label={t('expense.description')}
          value={formData.description}
          onChange={(e) => handleChange('description', e.target.value)}
          multiline
          rows={3}
        />
      </Grid>

      {/* 分类 */}
      <Grid item xs={12} md={6}>
        <FormControl fullWidth required error={!!errors.category}>
          <InputLabel>{t('expense.category')}</InputLabel>
          <Select
            value={formData.category}
            onChange={(e) => handleChange('category', e.target.value)}
            label={t('expense.category')}
          >
            {categories.map((cat) => (
              <MenuItem key={cat.value} value={cat.value}>
                {cat.label}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Grid>

      {/* 子分类 */}
      {formData.category && (
        <Grid item xs={12} md={6}>
          <Autocomplete
            freeSolo
            options={subcategories[formData.category] || []}
            value={formData.subcategory || ''}
            onChange={(event, newValue) => handleChange('subcategory', newValue || '')}
            onInputChange={(event, newInputValue) => handleChange('subcategory', newInputValue)}
            renderInput={(params) => (
              <TextField
                {...params}
                label={t('expense.subcategory')}
              />
            )}
          />
        </Grid>
      )}

      {/* 金额 */}
      <Grid item xs={12} md={6}>
        <TextField
          fullWidth
          label={t('expense.amount')}
          value={formData.amount}
          onChange={(e) => handleChange('amount', e.target.value)}
          error={!!errors.amount}
          helperText={errors.amount}
          required
          type="number"
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <MoneyIcon />
              </InputAdornment>
            ),
          }}
        />
      </Grid>

      {/* 币种 */}
      <Grid item xs={12} md={6}>
        <FormControl fullWidth>
          <InputLabel>{t('expense.currency')}</InputLabel>
          <Select
            value={formData.currency}
            onChange={(e) => handleChange('currency', e.target.value)}
            label={t('expense.currency')}
          >
            {currencies.map((curr) => (
              <MenuItem key={curr.value} value={curr.value}>
                {curr.label}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Grid>

      {/* 日期 */}
      <Grid item xs={12} md={6}>
        <DatePicker
          label={t('expense.date')}
          value={formData.date}
          onChange={(newValue) => handleChange('date', newValue)}
          slotProps={{
            textField: {
              fullWidth: true,
              error: !!errors.date,
              helperText: errors.date,
              required: true
            }
          }}
        />
      </Grid>
    </Grid>
  );
};

export default BasicInfoStep;

