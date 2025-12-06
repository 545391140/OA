/**
 * useExpenseFormState Hook
 * 管理费用表单的所有状态
 */

import { useState, useCallback, useRef } from 'react';
import { getInitialFormData } from '../utils/constants';

export const useExpenseFormState = (initialData = {}) => {
  // 主表单数据
  const [formData, setFormData] = useState(() => ({
    ...getInitialFormData(),
    ...initialData
  }));

  // UI状态
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [invoiceSelectDialogOpen, setInvoiceSelectDialogOpen] = useState(false);
  const [expenseSelectDialogOpen, setExpenseSelectDialogOpen] = useState(false);
  
  // 发票相关状态
  const [relatedInvoices, setRelatedInvoices] = useState([]);
  const [invoicesLoading, setInvoicesLoading] = useState(false);
  
  // 差旅相关状态
  const [selectedTravel, setSelectedTravel] = useState(null);
  const [travelOptions, setTravelOptions] = useState([]);
  const [travelLoading, setTravelLoading] = useState(false);
  const [generatedExpenses, setGeneratedExpenses] = useState([]);
  const [generatingExpenses, setGeneratingExpenses] = useState(false);
  
  // 费用项相关状态
  const [expenseItems, setExpenseItems] = useState([]);
  const [expenseItemsLoading, setExpenseItemsLoading] = useState(false);
  const [expenseItemInvoices, setExpenseItemInvoices] = useState({});
  const [expenseItemInvoiceDialogs, setExpenseItemInvoiceDialogs] = useState({});
  const [expenseItemReimbursementAmounts, setExpenseItemReimbursementAmounts] = useState({});
  
  // 其他状态
  const [isDateManuallyEdited, setIsDateManuallyEdited] = useState(false);
  
  // Refs
  const generatingExpensesRef = useRef(false);
  const loadingTravelIdRef = useRef(null);

  // 统一的数据规范化函数
  const normalizeInvoices = useCallback((invoices) => {
    if (!Array.isArray(invoices)) {
      return [];
    }
    return invoices.map(inv => {
      if (typeof inv === 'string') {
        return { _id: inv, id: inv };
      }
      const invoiceId = inv._id || inv.id || inv;
      return {
        ...inv,
        _id: invoiceId,
        id: invoiceId
      };
    });
  }, []);

  // 统一设置发票的函数
  const setRelatedInvoicesNormalized = useCallback((invoices) => {
    const normalized = normalizeInvoices(invoices);
    setRelatedInvoices(normalized);
    return normalized;
  }, [normalizeInvoices]);

  // 计算有效金额
  const getEffectiveAmount = useCallback(() => {
    const rawAmount = parseFloat(formData.amount);
    if (!isNaN(rawAmount) && rawAmount > 0) {
      return rawAmount;
    }

    const autoAmount = Object.values(expenseItemReimbursementAmounts || {}).reduce((sum, val) => {
      const num = parseFloat(val);
      return sum + (isNaN(num) ? 0 : num);
    }, 0);

    if (autoAmount > 0) {
      return autoAmount;
    }

    return NaN;
  }, [formData.amount, expenseItemReimbursementAmounts]);

  // 重置表单
  const resetForm = useCallback(() => {
    setFormData(getInitialFormData());
    setRelatedInvoices([]);
    setSelectedTravel(null);
    setExpenseItems([]);
    setExpenseItemInvoices({});
    setExpenseItemInvoiceDialogs({});
    setExpenseItemReimbursementAmounts({});
    setIsDateManuallyEdited(false);
  }, []);

  // 更新表单字段
  const updateFormField = useCallback((field, value) => {
    setFormData(prev => {
      // 处理嵌套字段 (如 vendor.name)
      if (field.includes('.')) {
        const [parent, child] = field.split('.');
        return {
          ...prev,
          [parent]: {
            ...prev[parent],
            [child]: value
          }
        };
      }
      return {
        ...prev,
        [field]: value
      };
    });
  }, []);

  return {
    // 表单数据
    formData,
    setFormData,
    updateFormField,
    
    // UI状态
    loading,
    setLoading,
    saving,
    setSaving,
    uploadDialogOpen,
    setUploadDialogOpen,
    invoiceSelectDialogOpen,
    setInvoiceSelectDialogOpen,
    expenseSelectDialogOpen,
    setExpenseSelectDialogOpen,
    
    // 发票状态
    relatedInvoices,
    setRelatedInvoices,
    setRelatedInvoicesNormalized,
    invoicesLoading,
    setInvoicesLoading,
    
    // 差旅状态
    selectedTravel,
    setSelectedTravel,
    travelOptions,
    setTravelOptions,
    travelLoading,
    setTravelLoading,
    generatedExpenses,
    setGeneratedExpenses,
    generatingExpenses,
    setGeneratingExpenses,
    
    // 费用项状态
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
    
    // 其他状态
    isDateManuallyEdited,
    setIsDateManuallyEdited,
    
    // Refs
    generatingExpensesRef,
    loadingTravelIdRef,
    
    // 工具函数
    normalizeInvoices,
    getEffectiveAmount,
    resetForm
  };
};
