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
import apiClient from '../../utils/axiosConfig';
import dayjs from 'dayjs';
import BasicInfoStep from './StandardFormSteps/BasicInfoStep';
import ConditionStep from './StandardFormSteps/ConditionStep';
import ExpenseStep from './StandardFormSteps/ExpenseStep';
import PreviewStep from './StandardFormSteps/PreviewStep';

const steps = [
  '基础信息',
  '适用条件',
  '费用标准',
  '预览确认'
];

const StandardForm = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const { user } = useAuth();
  const { showNotification } = useNotification();
  const isEdit = Boolean(id);

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
    expenseItems: []
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
      const [jobLevelsRes, cityLevelsRes, expenseItemsRes] = await Promise.all([
        apiClient.get('/api/job-levels'),
        apiClient.get('/api/city-levels'),
        apiClient.get('/api/expense-items')
      ]);
      
      setOptions({
        jobLevels: jobLevelsRes.data.success ? (jobLevelsRes.data.data || []) : [],
        cityLevels: cityLevelsRes.data.success ? (cityLevelsRes.data.data || []) : [],
        expenseItems: expenseItemsRes.data.success 
          ? (expenseItemsRes.data.data || []).filter(item => item.status === 'enabled')
          : []
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
      const response = await apiClient.get(`/api/travel-standards/${id}`);
      if (response.data.success) {
        const standard = response.data.data;
        
        // 重建expenseItemsConfigured对象（基于expenseStandards）
        const expenseItemsConfigured = {};
        
        // 处理expenseStandards，统一ID格式
        const normalizedExpenseStandards = (standard.expenseStandards || []).map(es => {
          // 提取expenseItemId（可能是对象或字符串）
          let expenseItemId = es.expenseItemId;
          if (typeof expenseItemId === 'object' && expenseItemId._id) {
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
        });
        
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
      showNotification('加载标准失败', 'error');
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
        newErrors.standardCode = '标准编码不能为空';
      } else if (!/^[A-Z0-9_]+$/.test(standardCode)) {
        newErrors.standardCode = '标准编码只能包含大写字母、数字和下划线';
      }
      
      if (!formData.standardName.trim()) {
        newErrors.standardName = '标准名称不能为空';
      }
      
      if (!formData.effectiveDate) {
        newErrors.effectiveDate = '生效日期不能为空';
      }
      
      if (formData.expiryDate && formData.expiryDate.isBefore(formData.effectiveDate)) {
        newErrors.expiryDate = '失效日期不能早于生效日期';
      }
      
      if (formData.priority < 0 || formData.priority > 100) {
        newErrors.priority = '优先级必须在0-100之间';
      }
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validateStep(activeStep)) {
      setActiveStep((prevActiveStep) => prevActiveStep + 1);
    } else {
      showNotification('请检查表单错误', 'error');
    }
  };

  const handleBack = () => {
    setActiveStep((prevActiveStep) => prevActiveStep - 1);
  };

  const handleSubmit = async () => {
    if (!validateStep(activeStep)) {
      showNotification('请检查表单错误', 'error');
      return;
    }

    try {
      setSaving(true);
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
        expenseStandards: formData.expenseStandards || []
      };

      console.log('[FRONTEND] Submit payload:', JSON.stringify({
        ...payload,
        conditionGroupsLength: payload.conditionGroups?.length,
        expenseStandardsLength: payload.expenseStandards?.length,
        expenseStandards: payload.expenseStandards?.map(es => ({
          ...es,
          expenseItemId: es.expenseItemId?.toString() || es.expenseItemId
        }))
      }, null, 2));

      let response;
      if (isEdit) {
        const { standardCode, ...updateData } = payload;
        console.log('[FRONTEND] Update data (without standardCode):', JSON.stringify({
          ...updateData,
          conditionGroupsLength: updateData.conditionGroups?.length,
          expenseStandardsLength: updateData.expenseStandards?.length
        }, null, 2));
        response = await apiClient.put(`/api/travel-standards/${id}`, updateData);
      } else {
        response = await apiClient.post('/api/travel-standards', payload);
      }

      if (response.data.success) {
        showNotification(
          isEdit ? '标准更新成功' : '标准创建成功',
          'success'
        );
        navigate('/travel-standards');
      }
    } catch (err) {
      console.error('Save standard error:', err);
      let errorMessage = err.response?.data?.message || err.message || (isEdit ? '更新失败' : '创建失败');
      
      if (err.response?.data?.message) {
        errorMessage = err.response.data.message;
      } else if (err.response?.status === 503) {
        errorMessage = '数据库未连接，无法保存标准。请检查数据库连接或联系管理员。';
      } else if (err.response?.status >= 500) {
        errorMessage = '服务器错误，请稍后重试或联系管理员。';
      }
      
      showNotification(errorMessage, 'error');

      if (errorMessage.includes('已存在') || errorMessage.includes('already exists') || errorMessage.includes('code')) {
        setErrors({ standardCode: '标准编码已存在' });
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
            返回
          </Button>
          <Typography variant="h4">
            {isEdit ? '编辑差旅标准' : '创建差旅标准'}
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
            取消
          </Button>
          {activeStep > 0 && (
            <Button
              variant="outlined"
              onClick={handleBack}
              disabled={saving}
            >
              上一步
            </Button>
          )}
          {activeStep < steps.length - 1 ? (
            <Button
              variant="contained"
              onClick={handleNext}
              disabled={saving}
            >
              下一步
            </Button>
          ) : (
            <Button
              variant="contained"
              startIcon={saving ? <CircularProgress size={20} /> : <SaveIcon />}
              onClick={handleSubmit}
              disabled={saving}
            >
              {saving ? '保存中...' : '保存标准'}
            </Button>
          )}
        </Box>
      </Paper>
    </Container>
  );
};

export default StandardForm;
