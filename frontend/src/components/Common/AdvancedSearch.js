import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Grid,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Box,
  Chip,
  IconButton,
  Typography,
  Accordion,
  AccordionSummary,
  AccordionDetails
} from '@mui/material';
import {
  Close as CloseIcon,
  ExpandMore as ExpandMoreIcon,
  Search as SearchIcon,
  Clear as ClearIcon
} from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import dayjs from 'dayjs';

const AdvancedSearch = ({ open, onClose, onSearch, searchType = 'all' }) => {
  const { t } = useTranslation();
  
  const [searchCriteria, setSearchCriteria] = useState({
    // 通用字段
    keyword: '',
    status: 'all',
    dateFrom: null,
    dateTo: null,
    
    // 差旅特定字段
    travelType: 'all',
    destination: '',
    purpose: '',
    
    // 费用特定字段
    category: 'all',
    amountMin: '',
    amountMax: '',
    
    // 用户特定字段
    department: 'all',
    role: 'all',
    
    // 标准特定字段
    standardType: 'all',
    priority: 'all'
  });

  const [savedSearches, setSavedSearches] = useState([]);

  const handleChange = (field, value) => {
    setSearchCriteria(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSearch = () => {
    // 过滤掉空值
    const filteredCriteria = Object.entries(searchCriteria).reduce((acc, [key, value]) => {
      if (value && value !== 'all' && value !== '') {
        acc[key] = value;
      }
      return acc;
    }, {});

    onSearch(filteredCriteria);
    onClose();
  };

  const handleReset = () => {
    setSearchCriteria({
      keyword: '',
      status: 'all',
      dateFrom: null,
      dateTo: null,
      travelType: 'all',
      destination: '',
      purpose: '',
      category: 'all',
      amountMin: '',
      amountMax: '',
      department: 'all',
      role: 'all',
      standardType: 'all',
      priority: 'all'
    });
  };

  const handleSaveSearch = () => {
    const searchName = prompt(t('search.advanced.saveSearchName'));
    if (searchName) {
      const newSearch = {
        name: searchName,
        criteria: searchCriteria,
        createdAt: new Date().toISOString()
      };
      const saved = JSON.parse(localStorage.getItem('savedSearches') || '[]');
      saved.push(newSearch);
      localStorage.setItem('savedSearches', JSON.stringify(saved));
      setSavedSearches(saved);
    }
  };

  const handleLoadSearch = (criteria) => {
    setSearchCriteria(criteria);
  };

  const statusOptions = [
    { value: 'all', label: t('search.advanced.allStatus') },
    { value: 'draft', label: t('travel.statuses.draft') },
    { value: 'submitted', label: t('travel.statuses.submitted') },
    { value: 'approved', label: t('travel.statuses.approved') },
    { value: 'rejected', label: t('travel.statuses.rejected') },
    { value: 'completed', label: t('travel.statuses.completed') },
    { value: 'cancelled', label: t('travel.statuses.cancelled') }
  ];

  const travelTypeOptions = [
    { value: 'all', label: t('search.advanced.allTypes') },
    { value: 'domestic', label: t('travel.domestic') },
    { value: 'international', label: t('travel.international') }
  ];

  const categoryOptions = [
    { value: 'all', label: t('search.advanced.allCategories') },
    { value: 'flight', label: t('expense.categories.flight') },
    { value: 'accommodation', label: t('expense.categories.accommodation') },
    { value: 'meal', label: t('expense.categories.meal') },
    { value: 'transport', label: t('expense.categories.transport') },
    { value: 'other', label: t('expense.categories.other') }
  ];

  const roleOptions = [
    { value: 'all', label: t('search.advanced.allRoles') },
    { value: 'admin', label: t('role.admin') },
    { value: 'manager', label: t('role.manager') },
    { value: 'employee', label: t('role.employee') },
    { value: 'finance', label: t('role.finance') }
  ];

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6">{t('search.advanced.title')}</Typography>
          <IconButton onClick={onClose} size="small">
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent dividers>
        <LocalizationProvider dateAdapter={AdapterDayjs}>
          <Grid container spacing={2}>
            {/* 通用搜索字段 */}
            <Grid item xs={12}>
              <TextField
                fullWidth
                label={t('search.advanced.keyword')}
                value={searchCriteria.keyword}
                onChange={(e) => handleChange('keyword', e.target.value)}
                placeholder={t('search.advanced.keywordPlaceholder')}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>{t('search.advanced.status')}</InputLabel>
                <Select
                  value={searchCriteria.status}
                  label={t('search.advanced.status')}
                  onChange={(e) => handleChange('status', e.target.value)}
                >
                  {statusOptions.map(option => (
                    <MenuItem key={option.value} value={option.value}>
                      {option.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} sm={6}>
              <DatePicker
                label={t('search.advanced.dateFrom')}
                value={searchCriteria.dateFrom}
                onChange={(date) => handleChange('dateFrom', date)}
                slotProps={{ textField: { fullWidth: true } }}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <DatePicker
                label={t('search.advanced.dateTo')}
                value={searchCriteria.dateTo}
                onChange={(date) => handleChange('dateTo', date)}
                slotProps={{ textField: { fullWidth: true } }}
              />
            </Grid>

            {/* 差旅特定字段 */}
            {(searchType === 'all' || searchType === 'travel') && (
              <Grid item xs={12}>
                <Accordion>
                  <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Typography>{t('search.advanced.travelFilters')}</Typography>
                  </AccordionSummary>
                  <AccordionDetails>
                    <Grid container spacing={2}>
                      <Grid item xs={12} sm={6}>
                        <FormControl fullWidth>
                          <InputLabel>{t('search.advanced.travelType')}</InputLabel>
                          <Select
                            value={searchCriteria.travelType}
                            label={t('search.advanced.travelType')}
                            onChange={(e) => handleChange('travelType', e.target.value)}
                          >
                            {travelTypeOptions.map(option => (
                              <MenuItem key={option.value} value={option.value}>
                                {option.label}
                              </MenuItem>
                            ))}
                          </Select>
                        </FormControl>
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <TextField
                          fullWidth
                          label={t('search.advanced.destination')}
                          value={searchCriteria.destination}
                          onChange={(e) => handleChange('destination', e.target.value)}
                        />
                      </Grid>
                      <Grid item xs={12}>
                        <TextField
                          fullWidth
                          label={t('search.advanced.purpose')}
                          value={searchCriteria.purpose}
                          onChange={(e) => handleChange('purpose', e.target.value)}
                        />
                      </Grid>
                    </Grid>
                  </AccordionDetails>
                </Accordion>
              </Grid>
            )}

            {/* 费用特定字段 */}
            {(searchType === 'all' || searchType === 'expense') && (
              <Grid item xs={12}>
                <Accordion>
                  <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Typography>{t('search.advanced.expenseFilters')}</Typography>
                  </AccordionSummary>
                  <AccordionDetails>
                    <Grid container spacing={2}>
                      <Grid item xs={12}>
                        <FormControl fullWidth>
                          <InputLabel>{t('search.advanced.category')}</InputLabel>
                          <Select
                            value={searchCriteria.category}
                            label={t('search.advanced.category')}
                            onChange={(e) => handleChange('category', e.target.value)}
                          >
                            {categoryOptions.map(option => (
                              <MenuItem key={option.value} value={option.value}>
                                {option.label}
                              </MenuItem>
                            ))}
                          </Select>
                        </FormControl>
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <TextField
                          fullWidth
                          type="number"
                          label={t('search.advanced.amountMin')}
                          value={searchCriteria.amountMin}
                          onChange={(e) => handleChange('amountMin', e.target.value)}
                          InputProps={{ startAdornment: '¥' }}
                        />
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <TextField
                          fullWidth
                          type="number"
                          label={t('search.advanced.amountMax')}
                          value={searchCriteria.amountMax}
                          onChange={(e) => handleChange('amountMax', e.target.value)}
                          InputProps={{ startAdornment: '¥' }}
                        />
                      </Grid>
                    </Grid>
                  </AccordionDetails>
                </Accordion>
              </Grid>
            )}

            {/* 用户特定字段 */}
            {(searchType === 'all' || searchType === 'user') && (
              <Grid item xs={12}>
                <Accordion>
                  <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Typography>{t('search.advanced.userFilters')}</Typography>
                  </AccordionSummary>
                  <AccordionDetails>
                    <Grid container spacing={2}>
                      <Grid item xs={12} sm={6}>
                        <TextField
                          fullWidth
                          label={t('search.advanced.department')}
                          value={searchCriteria.department}
                          onChange={(e) => handleChange('department', e.target.value)}
                        />
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <FormControl fullWidth>
                          <InputLabel>{t('search.advanced.role')}</InputLabel>
                          <Select
                            value={searchCriteria.role}
                            label={t('search.advanced.role')}
                            onChange={(e) => handleChange('role', e.target.value)}
                          >
                            {roleOptions.map(option => (
                              <MenuItem key={option.value} value={option.value}>
                                {option.label}
                              </MenuItem>
                            ))}
                          </Select>
                        </FormControl>
                      </Grid>
                    </Grid>
                  </AccordionDetails>
                </Accordion>
              </Grid>
            )}
          </Grid>
        </LocalizationProvider>
      </DialogContent>

      <DialogActions>
        <Button onClick={handleReset} startIcon={<ClearIcon />}>
          {t('common.reset')}
        </Button>
        <Button onClick={handleSaveSearch} variant="outlined">
          {t('search.advanced.saveSearch')}
        </Button>
        <Button onClick={handleSearch} variant="contained" startIcon={<SearchIcon />}>
          {t('common.search')}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default AdvancedSearch;

