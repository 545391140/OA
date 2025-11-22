import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Container,
  Paper,
  Box,
  Typography,
  TextField,
  Button,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  CircularProgress,
  Card,
  CardContent,
  Divider,
  Stepper,
  Step,
  StepLabel,
  IconButton
} from '@mui/material';
import {
  Save as SaveIcon,
  Cancel as CancelIcon,
  ArrowBack as ArrowBackIcon,
  Delete as DeleteIcon,
  Add as AddIcon
} from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { useAuth } from '../../contexts/AuthContext';
import { useNotification } from '../../contexts/NotificationContext';
import { useTranslation } from 'react-i18next';
import apiClient from '../../utils/axiosConfig';
import dayjs from 'dayjs';
import BasicInfoStep from './StandardFormSteps/BasicInfoStep';
import ConditionStep from './StandardFormSteps/ConditionStep';
import ExpenseStep from './StandardFormSteps/ExpenseStep';
import PreviewStep from './StandardFormSteps/PreviewStep';

const StandardForm = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { id } = useParams();
  const { user } = useAuth();
  const { showNotification } = useNotification();
  const isEdit = Boolean(id);
  
  const steps = [
    t('travelStandard.form.steps.basicInfo'),
    t('travelStandard.form.steps.conditions'),
    t('travelStandard.form.steps.expenses'),
    t('travelStandard.form.steps.preview')
  ];

  const [activeStep, setActiveStep] = useState(0);
  const [formData, setFormData] = useState({
    standardCode: '',
    standardName: '',
    description: '',
    effectiveDate: dayjs(),
    expiryDate: null,
    status: 'draft',
    priority: 50,
    conditionGroups: [],
    expenseItemsConfigured: {},
    expenseStandards: []
  });

  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [options, setOptions] = useState({
    jobLevels: [],
    cityLevels: [],
    expenseItems: [],
    roles: [],
    positions: []
  });
  const [loadingOptions, setLoadingOptions] = useState(false);

  useEffect(() => {
    fetchOptions();
    if (isEdit) {
      fetchStandard();
    }
  }, [id]);

  const fetchOptions = async () => {
    try {
      setLoadingOptions(true);
      const [jobLevelsRes, cityLevelsRes, expenseItemsRes, rolesRes, positionsRes] = await Promise.all([
        apiClient.get('/job-levels'),
        apiClient.get('/city-levels'),
        apiClient.get('/expense-items'),
        apiClient.get('/roles', { params: { isActive: true } }),
        apiClient.get('/positions', { params: { isActive: true } })
      ]);
      
      setOptions({
        jobLevels: jobLevelsRes.data.success ? (jobLevelsRes.data.data || []) : [],
        cityLevels: cityLevelsRes.data.success ? (cityLevelsRes.data.data || []) : [],
        expenseItems: expenseItemsRes.data.success 
          ? (expenseItemsRes.data.data || []).filter(item => item.status === 'enabled')
          : [],
        roles: rolesRes.data.success ? (rolesRes.data.data || []) : [],
        positions: positionsRes.data.success ? (positionsRes.data.data || []) : []
      });
    } catch (err) {
      console.error('Fetch options error:', err);
    } finally {
      setLoadingOptions(false);
    }
  };

  const fetchStandard = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get(`/travel-standards/${id}`);
      if (response.data.success) {
        const standard = response.data.data;
        
        // 重建expenseItemsConfigured对象（基于expenseStandards）
        const expenseItemsConfigured = {};
        
        // 处理expenseStandards，统一ID格式，并过滤掉无效的项
        const normalizedExpenseStandards = (standard.expenseStandards || [])
          .map(es => {
            // 提取expenseItemId（可能是对象或字符串）
            let expenseItemId = es.expenseItemId;
            if (expenseItemId !== null && expenseItemId !== undefined && typeof expenseItemId === 'object' && expenseItemId._id) {
              expenseItemId = expenseItemId._id;
            }
            const itemIdStr = expenseItemId?.toString() || expenseItemId;
            
            // 设置到expenseItemsConfigured
            if (itemIdStr) {
              expenseItemsConfigured[itemIdStr] = true;
            }
            
            // 返回标准化后的expenseStandard，确保expenseItemId是字符串ID
            return {
              ...es,
              expenseItemId: itemIdStr
            };
          })
          .filter(es => es.expenseItemId !== null && es.expenseItemId !== undefined && es.expenseItemId !== ''); // 过滤掉无效的项
        
        // 同时保留原有的expenseItemsConfigured中的配置（兼容旧数据）
        Object.keys(standard.expenseItemsConfigured || {}).forEach(key => {
          if (standard.expenseItemsConfigured[key]) {
            expenseItemsConfigured[key] = true;
          }
        });
        
        setFormData({
          standardCode: standard.standardCode,
          standardName: standard.standardName,
          description: standard.description || '',
          effectiveDate: dayjs(standard.effectiveDate),
          expiryDate: standard.expiryDate ? dayjs(standard.expiryDate) : null,
          status: standard.status,
          priority: standard.priority !== undefined ? standard.priority : 50,
          conditionGroups: standard.conditionGroups || [],
          expenseItemsConfigured: expenseItemsConfigured,
          expenseStandards: normalizedExpenseStandards
        });
      }
    } catch (err) {
      console.error('Fetch standard error:', err);
      showNotification(t('travelStandard.form.errors.loadFailed'), 'error');
      navigate('/travel-standards');
    } finally {
      setLoading(false);
    }
  };

  const validateStep = (step) => {
    const newErrors = {};
    
    if (step === 0) {
      // 基础信息验证
      const standardCode = formData.standardCode.trim().toUpperCase();
      if (!standardCode) {
        newErrors.standardCode = t('travelStandard.form.basicInfo.errors.standardCodeRequired');
      } else if (!/^[A-Z0-9_]+$/.test(standardCode)) {
        newErrors.standardCode = t('travelStandard.form.basicInfo.errors.standardCodeInvalid');
      }
      
      if (!formData.standardName.trim()) {
        newErrors.standardName = t('travelStandard.form.basicInfo.errors.standardNameRequired');
      }
      
      if (!formData.effectiveDate) {
        newErrors.effectiveDate = t('travelStandard.form.basicInfo.errors.effectiveDateRequired');
      }
      
      if (formData.expiryDate && formData.expiryDate.isBefore(formData.effectiveDate)) {
        newErrors.expiryDate = t('travelStandard.form.basicInfo.errors.expiryDateInvalid');
      }
      
      if (formData.priority < 0 || formData.priority > 100) {
        newErrors.priority = t('travelStandard.form.basicInfo.errors.priorityInvalid');
      }
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validateStep(activeStep)) {
      setActiveStep((prevActiveStep) => prevActiveStep + 1);
    } else {
      showNotification(t('travelStandard.form.errors.checkFormErrors'), 'error');
    }
  };

  const handleBack = () => {
    setActiveStep((prevActiveStep) => prevActiveStep - 1);
  };

  const handleSubmit = async () => {
    if (!validateStep(activeStep)) {
      showNotification(t('travelStandard.form.errors.checkFormErrors'), 'error');
      return;
    }

    try {
      setSaving(true);
      
      // 过滤掉 expenseItemId 为 null 或 undefined 的 expenseStandards 项
      const validExpenseStandards = (formData.expenseStandards || []).filter(es => {
        return es.expenseItemId !== null && es.expenseItemId !== undefined && es.expenseItemId !== '';
      });
      
      const payload = {
        standardCode: formData.standardCode.trim().toUpperCase(),
        standardName: formData.standardName.trim(),
        description: formData.description.trim(),
        effectiveDate: formData.effectiveDate.toISOString(),
        expiryDate: formData.expiryDate ? formData.expiryDate.toISOString() : null,
        status: formData.status,
        priority: formData.priority,
        conditionGroups: formData.conditionGroups || [],
        expenseItemsConfigured: formData.expenseItemsConfigured || {},
        expenseStandards: validExpenseStandards
      };

      let response;
      if (isEdit) {
        const { standardCode, ...updateData } = payload;
        response = await apiClient.put(`/travel-standards/${id}`, updateData);
      } else {
        response = await apiClient.post('/travel-standards', payload);
      }

      if (response.data.success) {
        showNotification(
          isEdit ? t('travelStandard.form.success.updateSuccess') : t('travelStandard.form.success.createSuccess'),
          'success'
        );
        navigate('/travel-standards');
      }
    } catch (err) {
      console.error('Save standard error:', err);
      let errorMessage = err.response?.data?.message || err.message || (isEdit ? t('travelStandard.form.errors.updateFailed') : t('travelStandard.form.errors.createFailed'));
      
      if (err.response?.data?.message) {
        errorMessage = err.response.data.message;
      } else if (err.response?.status === 503) {
        errorMessage = t('travelStandard.form.errors.dbNotConnected');
      } else if (err.response?.status >= 500) {
        errorMessage = t('travelStandard.form.errors.serverError');
      }
      
      showNotification(errorMessage, 'error');

      if (errorMessage.includes('已存在') || errorMessage.includes('already exists') || errorMessage.includes('code')) {
        setErrors({ standardCode: t('travelStandard.form.basicInfo.errors.standardCodeExists') });
      }
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    navigate('/travel-standards');
  };

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Paper elevation={3} sx={{ p: 4 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
          <Button
            startIcon={<ArrowBackIcon />}
            onClick={handleCancel}
            sx={{ mr: 2 }}
          >
            {t('travelStandard.form.buttons.back')}
          </Button>
          <Typography variant="h4">
            {isEdit ? t('travelStandard.form.title.edit') : t('travelStandard.form.title.create')}
          </Typography>
        </Box>

        <Divider sx={{ mb: 4 }} />

        <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
          {steps.map((label) => (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>

        <Box sx={{ mb: 4 }}>
          {activeStep === 0 && (
            <BasicInfoStep
              formData={formData}
              setFormData={setFormData}
              errors={errors}
              isEdit={isEdit}
            />
          )}
          {activeStep === 1 && (
            <ConditionStep
              formData={formData}
              setFormData={setFormData}
              options={options}
              loadingOptions={loadingOptions}
            />
          )}
          {activeStep === 2 && (
            <ExpenseStep
              formData={formData}
              setFormData={setFormData}
              options={options}
              loadingOptions={loadingOptions}
            />
          )}
          {activeStep === 3 && (
            <PreviewStep
              formData={formData}
              options={options}
            />
          )}
        </Box>

        <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
          <Button
            variant="outlined"
            startIcon={<CancelIcon />}
            onClick={handleCancel}
            disabled={saving}
          >
            {t('travelStandard.form.buttons.cancel')}
          </Button>
          {activeStep > 0 && (
            <Button
              variant="outlined"
              onClick={handleBack}
              disabled={saving}
            >
              {t('travelStandard.form.buttons.previous')}
            </Button>
          )}
          {activeStep < steps.length - 1 ? (
            <Button
              variant="contained"
              onClick={handleNext}
              disabled={saving}
            >
              {t('travelStandard.form.buttons.next')}
            </Button>
          ) : (
            <Button
              variant="contained"
              startIcon={saving ? <CircularProgress size={20} /> : <SaveIcon />}
              onClick={handleSubmit}
              disabled={saving}
            >
              {saving ? t('travelStandard.form.buttons.saving') : t('travelStandard.form.buttons.save')}
            </Button>
          )}
        </Box>
      </Paper>
    </Container>
  );
};

export default StandardForm;
