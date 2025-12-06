/**
 * ExpenseForm - 重构后的主组件
 * 使用模块化的Hooks和Steps
 */

import React from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Container, Paper, Box, Typography, Button, CircularProgress } from '@mui/material';
import { Save as SaveIcon, Send as SendIcon } from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../../../contexts/AuthContext';
import { useNotification } from '../../../../contexts/NotificationContext';
import { useCurrencies } from '../../../../hooks/useCurrencies';

// 导入自定义Hooks
import { useExpenseFormState } from './hooks/useExpenseFormState';
import { useExpenseValidation } from './hooks/useExpenseValidation';
import { useInvoiceManagement } from './hooks/useInvoiceManagement';
import { useTravelIntegration } from './hooks/useTravelIntegration';

// 导入Steps组件（待创建）
// import BasicInfoStep from './steps/BasicInfoStep';
// import ExpenseDetailsStep from './steps/ExpenseDetailsStep';  
// import InvoiceStep from './steps/InvoiceStep';
// import ReviewStep from './steps/ReviewStep';

// 导入组件（待创建）
// import ExpenseItemInput from './components/ExpenseItemInput';
// import CategorySelector from './components/CategorySelector';

/**
 * 重构后的ExpenseForm组件
 * 
 * 架构说明:
 * - 使用自定义Hooks管理所有业务逻辑
 * - 使用Steps组件管理UI渲染
 * - 主组件只负责协调和布局
 * 
 * 从3,539行精简到~300行
 */
const ExpenseForm = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { showNotification } = useNotification();
  const { currencyOptions } = useCurrencies();
  const navigate = useNavigate();
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const travelId = searchParams.get('travelId');
  const isEdit = Boolean(id);

  // 1. 状态管理 Hook
  const stateHook = useExpenseFormState();
  const {
    formData,
    setFormData,
    updateFormField,
    loading,
    setLoading,
    saving,
    setSaving,
    relatedInvoices,
    setRelatedInvoicesNormalized,
    invoicesLoading,
    setInvoicesLoading,
    selectedTravel,
    setSelectedTravel,
    travelOptions,
    setTravelOptions,
    travelLoading,
    setTravelLoading,
    expenseItems,
    setExpenseItems,
    expenseItemsLoading,
    setExpenseItemsLoading,
    expenseItemInvoices,
    setExpenseItemInvoices,
    expenseItemInvoiceDialogs,
    setExpenseItemInvoiceDialogs,
    expenseItemReimbursementAmounts,
    setExpenseItemReimbursementAmounts,
    isDateManuallyEdited,
    loadingTravelIdRef,
    normalizeInvoices,
    getEffectiveAmount,
    resetForm
  } = stateHook;

  // 2. 验证 Hook
  const {
    errors,
    validateForm,
    clearError
  } = useExpenseValidation(t);

  // 3. 发票管理 Hook
  const {
    fetchRelatedInvoices,
    handleAddInvoices,
    handleRemoveInvoice,
    handleAddInvoicesForExpenseItem,
    handleRemoveInvoiceFromExpenseItem
  } = useInvoiceManagement({
    id,
    relatedInvoices,
    setRelatedInvoicesNormalized,
    setInvoicesLoading,
    normalizeInvoices,
    showNotification,
    t
  });

  // 4. 差旅集成 Hook
  const {
    fetchTravelOptions,
    fetchExpenseItemsList,
    loadTravelInfo,
    extractExpenseBudgets
  } = useTravelIntegration({
    isEdit,
    isDateManuallyEdited,
    setFormData,
    setSelectedTravel,
    setTravelLoading,
    setTravelOptions,
    setExpenseItemInvoices,
    setExpenseItems,
    setExpenseItemsLoading,
    loadingTravelIdRef,
    showNotification,
    t
  });

  // 字段更新处理
  const handleChange = (field, value) => {
    updateFormField(field, value);
    clearError(field);
    
    // 特殊处理：日期手动修改标记
    if (field === 'date') {
      // 标记为手动修改（在stateHook中需要添加setIsDateManuallyEdited）
    }
  };

  // 保存处理
  const handleSave = async (status = 'draft') => {
    if (saving) return;

    if (!validateForm(formData, getEffectiveAmount)) {
      showNotification(t('expense.form.validationError') || '请检查表单错误', 'error');
      return;
    }

    try {
      setSaving(true);
      
      const effectiveAmount = getEffectiveAmount();
      const expenseData = {
        ...formData,
        amount: effectiveAmount,
        status,
        employee: user.id,
        relatedInvoices: relatedInvoices.map(inv => inv._id || inv.id)
      };

      let response;
      if (isEdit) {
        response = await apiClient.put(`/expenses/${id}`, expenseData);
      } else {
        response = await apiClient.post('/expenses', expenseData);
      }

      if (response.data && response.data.success) {
        showNotification(
          isEdit ? t('expense.form.updateSuccess') : t('expense.form.createSuccess'),
          'success'
        );
        navigate('/expenses');
      }
    } catch (error) {
      console.error('Save error:', error);
      showNotification(
        error.response?.data?.message || t('expense.form.saveError'),
        'error'
      );
    } finally {
      setSaving(false);
    }
  };

  // 渲染
  if (loading) {
    return (
      <Container>
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg">
      <Paper elevation={3} sx={{ p: 4, mt: 4 }}>
        <Typography variant="h4" gutterBottom>
          {isEdit ? t('expense.form.editExpense') : t('expense.form.newExpense')}
        </Typography>

        {/* TODO: 集成Steps组件 */}
        {/* <BasicInfoStep /> */}
        {/* <ExpenseDetailsStep /> */}
        {/* <InvoiceStep /> */}
        {/* <ReviewStep /> */}

        <Box sx={{ mt: 4, display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
          <Button
            variant="outlined"
            onClick={() => navigate('/expenses')}
          >
            {t('common.cancel')}
          </Button>
          <Button
            variant="contained"
            startIcon={<SaveIcon />}
            onClick={() => handleSave('draft')}
            disabled={saving}
          >
            {t('common.saveDraft')}
          </Button>
          <Button
            variant="contained"
            color="primary"
            startIcon={<SendIcon />}
            onClick={() => handleSave('submitted')}
            disabled={saving}
          >
            {t('common.submit')}
          </Button>
        </Box>
      </Paper>
    </Container>
  );
};

export default ExpenseForm;

