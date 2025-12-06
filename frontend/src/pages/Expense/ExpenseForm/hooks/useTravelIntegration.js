/**
 * useTravelIntegration Hook  
 * 管理差旅相关的集成逻辑
 */

import { useCallback } from 'react';
import apiClient from '../../../../utils/axiosConfig';
import dayjs from 'dayjs';

export const useTravelIntegration = ({
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
}) => {
  // 获取差旅选项
  const fetchTravelOptions = useCallback(async () => {
    try {
      setTravelLoading(true);
      const response = await apiClient.get('/travel', {
        params: {
          status: 'completed',
          limit: 100
        }
      });
      if (response.data && response.data.success) {
        setTravelOptions(response.data.data || []);
      }
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Failed to fetch travel options:', error);
      }
    } finally {
      setTravelLoading(false);
    }
  }, [setTravelLoading, setTravelOptions]);

  // 获取费用项列表
  const fetchExpenseItemsList = useCallback(async () => {
    try {
      setExpenseItemsLoading(true);
      const response = await apiClient.get('/expense-items');
      if (response.data && response.data.success) {
        setExpenseItems(response.data.data || []);
      }
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Failed to fetch expense items:', error);
      }
    } finally {
      setExpenseItemsLoading(false);
    }
  }, [setExpenseItemsLoading, setExpenseItems]);

  // 提取差旅预算
  const extractExpenseBudgets = useCallback((travel) => {
    const budgets = [];
    
    const extractAmount = (budgetItem) => {
      if (typeof budgetItem === 'number') return budgetItem;
      if (typeof budgetItem === 'object' && budgetItem !== null) {
        return parseFloat(budgetItem.subtotal) || 
               parseFloat(budgetItem.amount) || 
               parseFloat(budgetItem.total) || 0;
      }
      return 0;
    };
    
    // 去程预算
    if (travel.outboundBudget && typeof travel.outboundBudget === 'object') {
      Object.keys(travel.outboundBudget).forEach(expenseItemId => {
        const amount = extractAmount(travel.outboundBudget[expenseItemId]);
        if (amount > 0) {
          budgets.push({
            expenseItemId,
            route: 'outbound',
            amount,
            budgetItem: travel.outboundBudget[expenseItemId]
          });
        }
      });
    }
    
    // 返程预算
    if (travel.inboundBudget && typeof travel.inboundBudget === 'object') {
      Object.keys(travel.inboundBudget).forEach(expenseItemId => {
        const amount = extractAmount(travel.inboundBudget[expenseItemId]);
        if (amount > 0) {
          budgets.push({
            expenseItemId,
            route: 'inbound',
            amount,
            budgetItem: travel.inboundBudget[expenseItemId]
          });
        }
      });
    }
    
    // 多程预算
    if (Array.isArray(travel.multiCityRoutesBudget)) {
      travel.multiCityRoutesBudget.forEach((routeBudget, index) => {
        if (routeBudget && typeof routeBudget === 'object') {
          Object.keys(routeBudget).forEach(expenseItemId => {
            const amount = extractAmount(routeBudget[expenseItemId]);
            if (amount > 0) {
              budgets.push({
                expenseItemId,
                route: `multiCity${index}`,
                amount,
                budgetItem: routeBudget[expenseItemId]
              });
            }
          });
        }
      });
    }
    
    return budgets;
  }, []);

  // 加载差旅信息
  const loadTravelInfo = useCallback(async (travel) => {
    const travelId = travel._id || travel;
    
    // 防止重复请求
    if (loadingTravelIdRef.current === travelId) {
      return;
    }
    
    try {
      setTravelLoading(true);
      loadingTravelIdRef.current = travelId;
      
      const response = await apiClient.get(`/travel/${travelId}`);
      if (response.data && response.data.success) {
        const travelData = response.data.data;
        setSelectedTravel(travelData);
        
        // 填充表单
        setFormData(prev => {
          const nextDate = (!isDateManuallyEdited && travelData.endDate)
            ? dayjs(travelData.endDate)
            : prev.date;

          return {
            ...prev,
            travel: travelData._id,
            currency: travelData.currency || prev.currency,
            date: nextDate,
            title: travelData.title || `${travelData.travelNumber || ''} 费用申请`,
            description: travelData.purpose || travelData.tripDescription || prev.description
          };
        });

        // 初始化费用项发票映射
        const budgets = extractExpenseBudgets(travelData);
        setExpenseItemInvoices(prev => {
          const updated = { ...prev };
          budgets.forEach(budget => {
            const key = budget.expenseItemId?.toString() || budget.expenseItemId;
            if (!updated[key]) {
              updated[key] = [];
            }
          });
          return updated;
        });
      }
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Failed to load travel info:', error);
      }
      if (error.response?.status !== 429) {
        showNotification('加载差旅信息失败', 'error');
      }
    } finally {
      setTravelLoading(false);
      setTimeout(() => {
        if (loadingTravelIdRef.current === travelId) {
          loadingTravelIdRef.current = null;
        }
      }, 500);
    }
  }, [isDateManuallyEdited, isEdit, setFormData, setSelectedTravel, setTravelLoading, setExpenseItemInvoices, extractExpenseBudgets, loadingTravelIdRef, showNotification]);

  return {
    fetchTravelOptions,
    fetchExpenseItemsList,
    loadTravelInfo,
    extractExpenseBudgets
  };
};

