/**
 * useExpenseValidation Hook
 * 管理费用表单的验证逻辑
 */

import { useState, useCallback } from 'react';

export const useExpenseValidation = (t) => {
  const [errors, setErrors] = useState({});

  // 验证表单
  const validateForm = useCallback((formData, getEffectiveAmount) => {
    const newErrors = {};

    // 标题验证
    if (!formData.title || !formData.title.trim()) {
      newErrors.title = t('expense.form.titleRequired');
    }

    // 分类验证
    if (!formData.category) {
      newErrors.category = t('expense.form.categoryRequired');
    }

    // 金额验证
    const effectiveAmount = getEffectiveAmount();
    if (isNaN(effectiveAmount) || effectiveAmount <= 0) {
      newErrors.amount = t('validation.validAmountRequired');
    }

    // 日期验证
    if (!formData.date) {
      newErrors.date = t('expense.form.dateRequired');
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [t]);

  // 清除单个字段错误
  const clearError = useCallback((field) => {
    setErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors[field];
      return newErrors;
    });
  }, []);

  // 清除所有错误
  const clearAllErrors = useCallback(() => {
    setErrors({});
  }, []);

  // 设置单个字段错误
  const setFieldError = useCallback((field, message) => {
    setErrors(prev => ({
      ...prev,
      [field]: message
    }));
  }, []);

  return {
    errors,
    setErrors,
    validateForm,
    clearError,
    clearAllErrors,
    setFieldError
  };
};

