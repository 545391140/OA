/**
 * useInvoiceManagement Hook
 * 管理发票相关的所有逻辑
 */

import { useCallback } from 'react';
import apiClient from '../../../../utils/axiosConfig';

export const useInvoiceManagement = ({
  id,
  relatedInvoices,
  setRelatedInvoicesNormalized,
  setInvoicesLoading,
  normalizeInvoices,
  showNotification,
  t
}) => {
  // 获取关联发票
  const fetchRelatedInvoices = useCallback(async () => {
    try {
      setInvoicesLoading(true);
      const response = await apiClient.get(`/expenses/${id}`);
      if (response.data && response.data.success) {
        const normalized = setRelatedInvoicesNormalized(response.data.data.relatedInvoices || []);
        return normalized;
      }
      return [];
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Failed to load related invoices:', error);
      }
      
      // 如果不是404或403，显示错误
      if (error.response?.status !== 404 && error.response?.status !== 403) {
        const errorMessage = error.response?.status === 500 
          ? '服务器错误，请稍后重试'
          : error.response?.data?.message || '加载关联发票失败';
        showNotification(errorMessage, 'error');
      }
      
      return [];
    } finally {
      setInvoicesLoading(false);
    }
  }, [id, setInvoicesLoading, setRelatedInvoicesNormalized, showNotification]);

  // 添加发票
  const handleAddInvoices = useCallback(async (selectedInvoices) => {
    try {
      let successCount = 0;
      let failCount = 0;
      
      for (const invoice of selectedInvoices) {
        const invoiceId = invoice._id || invoice.id || invoice;
        const invoiceIdStr = invoiceId?.toString() || invoiceId;
        
        try {
          await apiClient.post(`/expenses/${id}/link-invoice`, {
            invoiceId: invoiceIdStr
          });
          successCount++;
        } catch (err) {
          failCount++;
          // 如果发票已关联，不算错误
          if (err.response?.status === 400 && 
              err.response?.data?.message?.includes('already linked')) {
            successCount++;
            failCount--;
          }
        }
      }
      
      if (successCount > 0) {
        showNotification(
          t('expense.invoices.added') || `成功关联 ${successCount} 张发票`,
          'success'
        );
        
        // 重新获取并验证
        const fetchedInvoices = await fetchRelatedInvoices();
        
        // 等待状态更新
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // 验证数据一致性
        const verifyResponse = await apiClient.get(`/expenses/${id}`);
        if (verifyResponse.data && verifyResponse.data.success) {
          const latestInvoices = verifyResponse.data.data.relatedInvoices || [];
          const normalizedLatest = normalizeInvoices(latestInvoices);
          
          // 确保状态和数据库一致
          if (normalizedLatest.length !== relatedInvoices.length) {
            setRelatedInvoicesNormalized(normalizedLatest);
          }
        }
      }
      
      if (failCount > 0) {
        showNotification(`关联失败 ${failCount} 张发票`, 'warning');
      }
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Failed to link invoices:', error);
      }
      showNotification(
        error.response?.data?.message || t('expense.invoices.addError') || '关联发票失败',
        'error'
      );
    }
  }, [id, fetchRelatedInvoices, normalizeInvoices, relatedInvoices.length, setRelatedInvoicesNormalized, showNotification, t]);

  // 移除发票
  const handleRemoveInvoice = useCallback(async (invoiceId) => {
    try {
      const invoiceIdStr = invoiceId?.toString() || invoiceId;
      await apiClient.delete(`/expenses/${id}/unlink-invoice/${invoiceIdStr}`);
      showNotification(t('expense.invoices.removed') || '取消关联成功', 'success');
      await fetchRelatedInvoices();
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Failed to unlink invoice:', error);
      }
      showNotification(
        error.response?.data?.message || t('expense.invoices.removeError') || '取消关联失败',
        'error'
      );
    }
  }, [id, fetchRelatedInvoices, showNotification, t]);

  // 为费用项添加发票
  const handleAddInvoicesForExpenseItem = useCallback(async (expenseItemId, selectedInvoices, setExpenseItemInvoices) => {
    try {
      // 更新费用项的发票列表
      setExpenseItemInvoices(prev => ({
        ...prev,
        [expenseItemId]: selectedInvoices
      }));
      
      showNotification(
        t('expense.invoices.added') || `成功添加 ${selectedInvoices.length} 张发票`,
        'success'
      );
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Failed to add invoices for expense item:', error);
      }
      showNotification('添加发票失败', 'error');
    }
  }, [showNotification, t]);

  // 从费用项移除发票
  const handleRemoveInvoiceFromExpenseItem = useCallback((expenseItemId, invoiceId, setExpenseItemInvoices) => {
    setExpenseItemInvoices(prev => {
      const invoices = prev[expenseItemId] || [];
      return {
        ...prev,
        [expenseItemId]: invoices.filter(inv => {
          const invId = inv._id || inv.id || inv;
          return invId !== invoiceId;
        })
      };
    });
    
    showNotification(
      t('expense.invoices.removed') || '发票已移除',
      'success'
    );
  }, [showNotification, t]);

  return {
    fetchRelatedInvoices,
    handleAddInvoices,
    handleRemoveInvoice,
    handleAddInvoicesForExpenseItem,
    handleRemoveInvoiceFromExpenseItem
  };
};

