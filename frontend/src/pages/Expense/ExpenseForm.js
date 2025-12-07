import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
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
  IconButton,
  Card,
  CardContent,
  Divider,
  Alert,
  CircularProgress,
  InputAdornment,
  Chip,
  Autocomplete,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Avatar,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Table,
  TableBody,
  TableCell,
  TableRow
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Save as SaveIcon,
  Send as SendIcon,
  AttachMoney as MoneyIcon,
  CloudUpload as UploadIcon,
  Receipt as ReceiptIcon,
  Business as BusinessIcon,
  LocationOn as LocationIcon,
  Flight as FlightIcon,
  Train as TrainIcon,
  DirectionsCar as CarIcon,
  DirectionsBus as BusIcon,
  ExpandMore as ExpandMoreIcon
} from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../contexts/AuthContext';
import { useNotification } from '../../contexts/NotificationContext';
import InvoiceSelectDialog from '../../components/Invoice/InvoiceSelectDialog';
import ExpenseSelectDialog from '../../components/Expense/ExpenseSelectDialog';
import apiClient from '../../utils/axiosConfig';
import { useCurrencies } from '../../hooks/useCurrencies';
import dayjs from 'dayjs';

// 开发环境日志辅助函数
const devLog = (...args) => {
  // Console logging disabled
};

const devError = (...args) => {
  // Console logging disabled
};

const devWarn = (...args) => {
  // Console logging disabled
};

const ExpenseForm = () => {
  const { t } = useTranslation();
  const { currencyOptions } = useCurrencies();
  const { user } = useAuth();
  const { showNotification } = useNotification();
  const navigate = useNavigate();
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const travelId = searchParams.get('travelId');
  const isEdit = Boolean(id);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: '',
    subcategory: '',
    amount: '',
    currency: 'USD',
    date: dayjs(),
    vendor: {
      name: '',
      address: '',
      taxId: ''
    },
    project: '',
    costCenter: '',
    client: '',
    tags: [],
    notes: '',
    receipts: []
  });

  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [invoiceSelectDialogOpen, setInvoiceSelectDialogOpen] = useState(false);
  const [relatedInvoices, setRelatedInvoices] = useState([]);
  const [invoicesLoading, setInvoicesLoading] = useState(false);
  
  // 统一的数据规范化函数：确保发票数据格式统一
  const normalizeInvoices = (invoices) => {
    if (!Array.isArray(invoices)) {
      return [];
    }
    return invoices.map(inv => {
      // 如果是字符串，转换为对象格式
      if (typeof inv === 'string') {
        return { _id: inv, id: inv };
      }
      // 如果是对象，确保有 _id 和 id 字段
      const invoiceId = inv._id || inv.id || inv;
      return {
        ...inv,
        _id: invoiceId,
        id: invoiceId
      };
    });
  };
  
  // 统一设置 relatedInvoices 的函数：确保数据规范化
  const setRelatedInvoicesNormalized = (invoices) => {
    const normalized = normalizeInvoices(invoices);
    setRelatedInvoices(normalized);
    return normalized;
  };
  // 自动生成的费用申请相关状态
  const [generatedExpenses, setGeneratedExpenses] = useState([]);
  const [expenseSelectDialogOpen, setExpenseSelectDialogOpen] = useState(false);
  const [generatingExpenses, setGeneratingExpenses] = useState(false);
  // 差旅单相关状态
  const [selectedTravel, setSelectedTravel] = useState(null);
  const [travelOptions, setTravelOptions] = useState([]);
  const [travelLoading, setTravelLoading] = useState(false);
  const [expenseItems, setExpenseItems] = useState([]);
  const [expenseItemsLoading, setExpenseItemsLoading] = useState(false);
  // 每个费用项的发票管理
  const [expenseItemInvoices, setExpenseItemInvoices] = useState({}); // { expenseItemId: [invoices] }
  const [expenseItemInvoiceDialogs, setExpenseItemInvoiceDialogs] = useState({}); // { expenseItemId: open }
  const [expenseItemReimbursementAmounts, setExpenseItemReimbursementAmounts] = useState({}); // { expenseItemId: amount }
  // 标记用户是否手动修改过日期，一旦手动修改，就不再被差旅/发票自动覆盖
  const [isDateManuallyEdited, setIsDateManuallyEdited] = useState(false);

  // 统一获取“有效金额”：优先使用用户填写的金额，如果未填写则回退到各费用项自动计算的核销金额之和
  const getEffectiveAmount = useCallback(() => {
    const rawAmount = parseFloat(formData.amount);
    if (!isNaN(rawAmount) && rawAmount > 0) {
      return rawAmount;
    }

    // 根据各费用项的报销金额求和（这些金额已根据发票自动计算）
    const autoAmount = Object.values(expenseItemReimbursementAmounts || {}).reduce((sum, val) => {
      const num = parseFloat(val);
      return sum + (isNaN(num) ? 0 : num);
    }, 0);

    if (autoAmount > 0) {
      return autoAmount;
    }

    return NaN;
  }, [formData.amount, expenseItemReimbursementAmounts]);

  // 货币选项（从API获取，已包含国际化处理）
  const currencies = currencyOptions;

  const categories = [
    { value: 'transportation', label: t('expense.categories.transportation') },
    { value: 'accommodation', label: t('expense.categories.accommodation') },
    { value: 'meals', label: t('expense.categories.meals') },
    { value: 'entertainment', label: t('expense.categories.entertainment') },
    { value: 'communication', label: t('expense.categories.communication') },
    { value: 'office_supplies', label: t('expense.categories.office_supplies') },
    { value: 'training', label: t('expense.categories.training') },
    { value: 'other', label: t('expense.categories.other') }
  ];

  const subcategories = {
    transportation: [
      t('expense.subcategories.transportation.flight'),
      t('expense.subcategories.transportation.train'),
      t('expense.subcategories.transportation.taxi'),
      t('expense.subcategories.transportation.rentalCar'),
      t('expense.subcategories.transportation.publicTransport'),
      t('expense.subcategories.transportation.parking'),
      t('expense.subcategories.transportation.fuel')
    ],
    accommodation: [
      t('expense.subcategories.accommodation.hotel'),
      t('expense.subcategories.accommodation.airbnb'),
      t('expense.subcategories.accommodation.hostel'),
      t('expense.subcategories.accommodation.apartmentRental')
    ],
    meals: [
      t('expense.subcategories.meals.breakfast'),
      t('expense.subcategories.meals.lunch'),
      t('expense.subcategories.meals.dinner'),
      t('expense.subcategories.meals.coffeeTea'),
      t('expense.subcategories.meals.snacks'),
      t('expense.subcategories.meals.businessMeal')
    ],
    entertainment: [
      t('expense.subcategories.entertainment.clientEntertainment'),
      t('expense.subcategories.entertainment.teamBuilding'),
      t('expense.subcategories.entertainment.conference'),
      t('expense.subcategories.entertainment.event')
    ],
    communication: [
      t('expense.subcategories.communication.phone'),
      t('expense.subcategories.communication.internet'),
      t('expense.subcategories.communication.mobileData'),
      t('expense.subcategories.communication.postage'),
      t('expense.subcategories.communication.courier')
    ],
    office_supplies: [
      t('expense.subcategories.office_supplies.stationery'),
      t('expense.subcategories.office_supplies.printing'),
      t('expense.subcategories.office_supplies.software'),
      t('expense.subcategories.office_supplies.hardware'),
      t('expense.subcategories.office_supplies.books')
    ],
    training: [
      t('expense.subcategories.training.course'),
      t('expense.subcategories.training.workshop'),
      t('expense.subcategories.training.certification'),
      t('expense.subcategories.training.conference'),
      t('expense.subcategories.training.onlineTraining')
    ],
    other: [
      t('expense.subcategories.other.miscellaneous'),
      t('expense.subcategories.other.bankFees'),
      t('expense.subcategories.other.insurance'),
      t('expense.subcategories.other.medical'),
      t('expense.subcategories.other.other')
    ]
  };

  const projects = [
    t('expense.projects.projectAlpha'),
    t('expense.projects.projectBeta'),
    t('expense.projects.projectGamma'),
    t('expense.projects.clientAEngagement'),
    t('expense.projects.clientBEngagement'),
    t('expense.projects.internalDevelopment')
  ];

  const costCenters = [
    t('expense.costCenters.sales'),
    t('expense.costCenters.marketing'),
    t('expense.costCenters.engineering'),
    t('expense.costCenters.operations'),
    t('expense.costCenters.hr'),
    t('expense.costCenters.finance'),
    t('expense.costCenters.legal')
  ];

  const clients = [
    t('expense.clients.clientA'),
    t('expense.clients.clientB'),
    t('expense.clients.clientC'),
    t('expense.clients.internal'),
    t('expense.clients.prospectA'),
    t('expense.clients.prospectB')
  ];

  const commonTags = [
    t('expense.tags.urgent'),
    t('expense.tags.clientRelated'),
    t('expense.tags.travel'),
    t('expense.tags.training'),
    t('expense.tags.equipment'),
    t('expense.tags.software'),
    t('expense.tags.hardware'),
    t('expense.tags.meeting'),
    t('expense.tags.conference')
  ];

  // 使用 useRef 防止重复生成费用申请
  const generatingExpensesRef = useRef(false);

  useEffect(() => {
    if (isEdit) {
      fetchExpenseData();
      // 编辑模式下也加载差旅单列表（用于 Autocomplete）
      fetchTravelOptions();
    } else if (travelId) {
      // 如果是从差旅页面跳转过来的，自动生成费用申请
      // 防止重复调用
      if (!generatingExpensesRef.current && !generatingExpenses) {
        generatingExpensesRef.current = true;
        generateExpensesFromTravel().finally(() => {
          // 延迟重置，避免快速切换时的重复调用
          setTimeout(() => {
            generatingExpensesRef.current = false;
          }, 1000);
        });
      }
    } else {
      // 新建费用申请时，加载差旅单列表和费用项列表
      fetchTravelOptions();
      fetchExpenseItemsList();
    }
  }, [id, isEdit, travelId]);

  // 使用 useRef 跟踪正在加载的差旅单ID，避免重复请求
  const loadingTravelIdRef = useRef(null);

  useEffect(() => {
    // 如果 selectedTravel 变化，且不是正在加载的同一个差旅单，则加载
    if (selectedTravel && selectedTravel._id !== loadingTravelIdRef.current) {
      const travelId = selectedTravel._id || selectedTravel;
      // 避免重复请求：如果已经在加载这个差旅单，跳过
      if (travelLoading && loadingTravelIdRef.current === travelId) {
        return;
      }
      loadTravelInfo(selectedTravel);
    }
  }, [selectedTravel]);

  // 编辑模式下，如果费用申请关联了差旅单，加载差旅信息
  useEffect(() => {
    // 避免重复请求：如果 selectedTravel 已经设置且匹配，跳过
    if (isEdit && id && formData.travel) {
      const travelIdStr = formData.travel?.toString() || formData.travel;
      const selectedTravelIdStr = selectedTravel?._id?.toString() || selectedTravel?._id;
      
      // 如果 selectedTravel 已经设置且匹配当前 travel，跳过
      if (selectedTravel && selectedTravelIdStr === travelIdStr) {
        return;
      }
      
      // 避免重复请求：如果正在加载同一个差旅单，跳过
      if (travelLoading && loadingTravelIdRef.current === travelIdStr) {
        return;
      }
      
      loadTravelInfoById(formData.travel);
    }
  }, [isEdit, id, formData.travel]);

  useEffect(() => {
    if (isEdit && id) {
      fetchRelatedInvoices();
    }
  }, [id, isEdit]);

  // 监听发票变化，自动更新报销金额
  // 规则：如果报销金额未设置，自动设置为发票总金额
  // 如果发票被清空（总金额为0），自动更新报销金额为0
  // 如果用户已经手动修改过报销金额（不等于发票总金额），则保持用户的修改
  useEffect(() => {
    Object.keys(expenseItemInvoices).forEach(expenseItemIdKey => {
      const invoices = expenseItemInvoices[expenseItemIdKey];
      if (Array.isArray(invoices) && invoices.length > 0) {
        // 计算当前发票总金额
        const totalAmount = invoices.reduce((sum, inv) => {
          const amount = inv.totalAmount || inv.amount || 0;
          return sum + amount;
        }, 0);
        
        if (totalAmount > 0) {
          setExpenseItemReimbursementAmounts(prevAmounts => {
            // 支持多种ID格式的查找：字符串、对象ID等
            const currentReimbursement = prevAmounts[expenseItemIdKey] ?? 
                                         prevAmounts[expenseItemIdKey?.toString()] ??
                                         prevAmounts[expenseItemIdKey?.valueOf?.()];
            
            // 如果报销金额未设置，自动设置为发票总金额
            if (currentReimbursement === undefined || currentReimbursement === null) {
              const updated = {
                ...prevAmounts,
                [expenseItemIdKey]: totalAmount
              };
              // 同时设置字符串格式的键（如果不同）
              if (expenseItemIdKey?.toString && expenseItemIdKey.toString() !== expenseItemIdKey) {
                updated[expenseItemIdKey.toString()] = totalAmount;
              }
              return updated;
            }
            
            return prevAmounts;
          });
        }
      } else if (Array.isArray(invoices) && invoices.length === 0) {
        // 如果发票被清空（总金额为0），自动更新报销金额为0
        setExpenseItemReimbursementAmounts(prevAmounts => {
          const currentReimbursement = prevAmounts[expenseItemIdKey] ?? 
                                       prevAmounts[expenseItemIdKey?.toString()] ??
                                       prevAmounts[expenseItemIdKey?.valueOf?.()];
          
          // 只有当报销金额不为0时才更新（避免不必要的更新）
          if (currentReimbursement !== undefined && currentReimbursement !== null && currentReimbursement !== 0) {
            const updated = {
              ...prevAmounts,
              [expenseItemIdKey]: 0
            };
            // 同时设置字符串格式的键（如果不同）
            if (expenseItemIdKey?.toString && expenseItemIdKey.toString() !== expenseItemIdKey) {
              updated[expenseItemIdKey.toString()] = 0;
            }
            return updated;
          }
          
          return prevAmounts;
        });
      }
    });
  }, [expenseItemInvoices]);

  const generateExpensesFromTravel = async () => {
    try {
      setGeneratingExpenses(true);
      // 调用生成费用申请的API
      const response = await apiClient.post(`/travel/${travelId}/generate-expenses`);
      if (response.data && response.data.success) {
        const generatedCount = response.data.data.generatedCount || 0;
        const expenses = response.data.data.expenses || [];
        
        if (generatedCount > 0 && expenses.length > 0) {
          // 如果有生成的费用申请
          showNotification(
            t('travel.detail.expenses.generateSuccess', { count: generatedCount }),
            'success'
          );
          
          // 获取费用申请的详细信息
          const expensesWithDetails = await Promise.all(
            expenses.map(async (expense) => {
              try {
                const detailResponse = await apiClient.get(`/expenses/${expense._id}`);
                return detailResponse.data?.data || expense;
              } catch (err) {
                devError(`Failed to fetch expense ${expense._id}:`, err);
                return expense;
              }
            })
          );
          
          setGeneratedExpenses(expensesWithDetails);
          
          if (expensesWithDetails.length === 1) {
            // 如果只生成了一个费用申请，直接加载到表单中
            loadExpenseToForm(expensesWithDetails[0]);
          } else {
            // 如果生成了多个费用申请，显示选择对话框
            setExpenseSelectDialogOpen(true);
          }
        } else {
          // 如果没有生成费用申请，提示用户手动创建
          showNotification(
            t('travel.detail.expenses.noExpensesGenerated') || '未找到匹配的发票，请手动创建费用申请',
            'info'
          );
        }
      }
    } catch (error) {
      devError('Failed to generate expenses from travel:', error);
      devError('Error response:', error.response);
      devError('Error details:', error.response?.data);
      devError('Error status:', error.response?.status);
      
      const errorData = error.response?.data || {};
      const errorMessage = errorData.message || error.message || t('expense.form.expenseGenerationFailed');
      
      // 如果错误是 "Expense generation in progress"，等待后重试
      if (error.response?.status === 400 && 
          (errorMessage === 'Expense generation in progress' || 
           errorMessage.includes('generation in progress'))) {
        const timeout = errorData.data?.timeout || 3;
        showNotification(
          t('expense.form.expenseGenerationInProgress', { timeout }),
          'info'
        );
        // 等待3秒后重试一次
        setTimeout(async () => {
          try {
            await generateExpensesFromTravel();
          } catch (retryError) {
            // 如果重试仍然失败，显示错误
            const retryErrorMessage = retryError.response?.data?.message || 
                                retryError.message || 
                                t('expense.form.expenseGenerationFailed');
            showNotification(retryErrorMessage, 'error');
          }
        }, 3000);
        return;
      }
      
      // 如果已经生成过，尝试获取已生成的费用申请列表
      if (error.response?.status === 400 && 
          (errorMessage === 'Expenses already generated' || 
           errorMessage.includes('already generated'))) {
        const existingExpenses = errorData.data?.expenses || [];
        devLog('Found existing expenses:', existingExpenses);
        
        if (existingExpenses.length > 0) {
          showNotification(
            t('expense.form.expensesAlreadyGenerated'),
            'info'
          );
          // 获取费用申请的详细信息
          const expensesWithDetails = await Promise.all(
            existingExpenses.map(async (expenseId) => {
              try {
                const detailResponse = await apiClient.get(`/expenses/${expenseId}`);
                return detailResponse.data?.data;
              } catch (err) {
                devError(`Failed to fetch expense ${expenseId}:`, err);
                return null;
              }
            })
          );
          
          const validExpenses = expensesWithDetails.filter(exp => exp !== null);
          devLog('Loaded valid expenses:', validExpenses.length);
          setGeneratedExpenses(validExpenses);
          
          if (validExpenses.length === 1) {
            // 如果只有一个费用申请，直接加载到表单中
            loadExpenseToForm(validExpenses[0]);
            showNotification(
              t('expense.form.loadedGeneratedExpense'),
              'success'
            );
          } else if (validExpenses.length > 1) {
            // 如果有多个费用申请，显示选择对话框
            setExpenseSelectDialogOpen(true);
            showNotification(
              t('expense.form.foundExpenses', { count: validExpenses.length }),
              'info'
            );
          } else {
            showNotification(
              t('expense.form.expenseGeneratedButCannotLoad'),
              'warning'
            );
          }
          return;
        } else {
          showNotification(
            t('expense.form.expenseGeneratedButNotFound'),
            'warning'
          );
          return;
        }
      }
      
      // 显示详细的错误信息
      devError('Unhandled error:', {
        status: error.response?.status,
        message: errorMessage,
        data: errorData
      });
      showNotification(errorMessage, 'error');
      
      // 如果是服务器错误，记录详细信息
      if (error.response?.status >= 500) {
        devError('Server error details:', {
          status: error.response?.status,
          data: error.response?.data,
          message: errorMessage
        });
      }
    } finally {
      setGeneratingExpenses(false);
    }
  };

  const loadExpenseToForm = (expenseData) => {
    // 加载费用申请数据到表单中
    setFormData({
      title: expenseData.title || '',
      description: expenseData.description || '',
      category: expenseData.category || '',
      subcategory: expenseData.subcategory || '',
      amount: expenseData.amount || '',
      currency: expenseData.currency || 'USD',
      date: expenseData.date ? dayjs(expenseData.date) : dayjs(),
      vendor: expenseData.vendor || { name: '', address: '', taxId: '' },
      project: expenseData.project || '',
      costCenter: expenseData.costCenter || '',
      client: expenseData.client || '',
      tags: expenseData.tags || [],
      notes: expenseData.notes || '',
      receipts: expenseData.receipts || []
    });
    // 从后端加载的数据视为“系统默认值”，此时尚未手动修改日期
    setIsDateManuallyEdited(false);
    setRelatedInvoicesNormalized(expenseData.relatedInvoices || []);
    // 更新URL为编辑模式
    navigate(`/expenses/${expenseData._id}`, { replace: true });
  };

  const handleSelectExpense = (expense) => {
    loadExpenseToForm(expense);
    setExpenseSelectDialogOpen(false);
  };

  // 获取差旅单列表
  const fetchTravelOptions = async () => {
    try {
      setTravelLoading(true);
      const response = await apiClient.get('/travel', {
        params: {
          status: 'completed', // 只显示已完成的差旅
          limit: 100
        }
      });
      if (response.data && response.data.success) {
        setTravelOptions(response.data.data || []);
      }
    } catch (error) {
      devError('Failed to fetch travel options:', error);
    } finally {
      setTravelLoading(false);
    }
  };

  // 获取费用项列表
  const fetchExpenseItemsList = async () => {
    try {
      setExpenseItemsLoading(true);
      const response = await apiClient.get('/expense-items');
      if (response.data && response.data.success) {
        setExpenseItems(response.data.data || []);
      }
    } catch (error) {
      devError('Failed to fetch expense items:', error);
    } finally {
      setExpenseItemsLoading(false);
    }
  };

  // 加载差旅信息
  const loadTravelInfo = async (travel) => {
    const travelId = travel._id || travel;
    
    // 防止重复请求
    if (travelLoading && loadingTravelIdRef.current === travelId) {
      devLog('Already loading travel info, skipping:', travelId);
      return;
    }
    
    try {
      setTravelLoading(true);
      loadingTravelIdRef.current = travelId;
      
      const response = await apiClient.get(`/travel/${travelId}`);
      if (response.data && response.data.success) {
        const travelData = response.data.data;
        setSelectedTravel(travelData);
        
        // 填充表单基本信息：
        // - 初次从差旅生成时可以用差旅结束日期作为默认值
        // - 一旦用户手动修改过日期（isDateManuallyEdited=true），就不再覆盖
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

        // 初始化费用项发票管理
        const budgets = extractExpenseBudgets(travelData);
        // 保留已有的发票数据，只初始化新的费用项（不覆盖已有数据）
        setExpenseItemInvoices(prev => {
          const updated = { ...prev };
          budgets.forEach(budget => {
            // 确保使用字符串键
            const expenseItemIdStr = budget.expenseItemId?.toString() || budget.expenseItemId;
            // 只有当该费用项不存在时才初始化为空数组
            if (!updated[expenseItemIdStr]) {
              updated[expenseItemIdStr] = [];
            }
          });
          return updated;
        });

        // 自动匹配发票到费用项（仅在新建模式下）
        if (!isEdit) {
          await autoMatchInvoicesToExpenseItems(travelData, budgets);
        }
      }
    } catch (error) {
      devError('Failed to load travel info:', error);
      // 429 错误是请求频率过高，不显示错误提示，避免干扰用户
      if (error.response?.status !== 429) {
      showNotification('加载差旅信息失败', 'error');
      }
    } finally {
      setTravelLoading(false);
      // 延迟清除 loadingTravelIdRef，避免快速切换时的重复请求
      setTimeout(() => {
        if (loadingTravelIdRef.current === travelId) {
          loadingTravelIdRef.current = null;
        }
      }, 500);
    }
  };

  // 提取差旅单的费用预算（与后端逻辑一致）
  const extractExpenseBudgets = (travel) => {
    const budgets = [];
    
    const extractAmount = (budgetItem) => {
      if (typeof budgetItem === 'number') {
        return budgetItem;
      }
      if (typeof budgetItem === 'object' && budgetItem !== null) {
        return parseFloat(budgetItem.subtotal) || 
               parseFloat(budgetItem.amount) || 
               parseFloat(budgetItem.total) || 
               0;
      }
      return 0;
    };
    
    // 去程预算
    if (travel.outboundBudget && typeof travel.outboundBudget === 'object') {
      Object.keys(travel.outboundBudget).forEach(expenseItemId => {
        const budgetItem = travel.outboundBudget[expenseItemId];
        const amount = extractAmount(budgetItem);
        if (amount > 0) {
          budgets.push({
            expenseItemId: expenseItemId,
            route: 'outbound',
            amount: amount,
            budgetItem: budgetItem
          });
        }
      });
    }
    
    // 返程预算
    if (travel.inboundBudget && typeof travel.inboundBudget === 'object') {
      Object.keys(travel.inboundBudget).forEach(expenseItemId => {
        const budgetItem = travel.inboundBudget[expenseItemId];
        const amount = extractAmount(budgetItem);
        if (amount > 0) {
          budgets.push({
            expenseItemId: expenseItemId,
            route: 'inbound',
            amount: amount,
            budgetItem: budgetItem
          });
        }
      });
    }
    
    // 多程行程预算
    if (travel.multiCityRoutesBudget && Array.isArray(travel.multiCityRoutesBudget)) {
      travel.multiCityRoutesBudget.forEach((routeBudget, index) => {
        if (routeBudget && typeof routeBudget === 'object') {
          Object.keys(routeBudget).forEach(expenseItemId => {
            const budgetItem = routeBudget[expenseItemId];
            const amount = extractAmount(budgetItem);
            if (amount > 0) {
              budgets.push({
                expenseItemId: expenseItemId,
                route: `multiCity-${index}`,
                amount: amount,
                budgetItem: budgetItem
              });
            }
          });
        }
      });
    }
    
    return budgets;
  };

  // 合并相同费用项的预算
  const mergeExpenseBudgetsByItem = (budgets) => {
    const merged = {};
    
    budgets.forEach(budget => {
      const expenseItemId = budget.expenseItemId;
      if (!merged[expenseItemId]) {
        merged[expenseItemId] = {
          expenseItemId: expenseItemId,
          routes: [],
          totalAmount: 0,
          budgets: []
        };
      }
      merged[expenseItemId].routes.push(budget.route);
      merged[expenseItemId].totalAmount += budget.amount || 0;
      merged[expenseItemId].budgets.push(budget);
    });
    
    return Object.values(merged);
  };

  // 计算预算金额、发票金额、核销金额（仅当关联差旅单时）
  const calculatedAmounts = useMemo(() => {
    if (!selectedTravel || extractExpenseBudgets(selectedTravel).length === 0) {
      return { budgetAmount: 0, invoiceAmount: 0, reimbursementAmount: 0 };
    }

    // 计算预算金额：所有费用项预算金额总和
    const mergedBudgets = mergeExpenseBudgetsByItem(extractExpenseBudgets(selectedTravel));
    const budgetAmount = mergedBudgets.reduce((sum, budget) => sum + (budget.totalAmount || 0), 0);

    // 计算发票金额：所有费用项关联的发票金额总和
    let invoiceAmount = 0;
    Object.values(expenseItemInvoices).forEach((invoices) => {
      if (Array.isArray(invoices)) {
        invoices.forEach((inv) => {
          const amount = inv.totalAmount || inv.amount || 0;
          invoiceAmount += amount;
        });
      }
    });

    // 计算核销金额：所有费用项核销金额总和
    const reimbursementAmount = Object.values(expenseItemReimbursementAmounts).reduce((sum, amount) => {
      return sum + (parseFloat(amount) || 0);
    }, 0);

    return { budgetAmount, invoiceAmount, reimbursementAmount };
  }, [selectedTravel, expenseItemInvoices, expenseItemReimbursementAmounts]);

  // 自动匹配发票到费用项
  const autoMatchInvoicesToExpenseItems = async (travel, budgets) => {
    if (!travel || !budgets || budgets.length === 0) {
      return;
    }

    try {
      devLog('[AUTO_MATCH] Starting auto match invoices for travel:', travel._id);
      
      // 1. 查询可用发票（在差旅日期范围内，未关联的发票）
      const startDate = travel.startDate ? new Date(travel.startDate).toISOString().split('T')[0] : null;
      const endDate = travel.endDate ? new Date(travel.endDate).toISOString().split('T')[0] : null;
      
      if (!startDate || !endDate) {
        devLog('[AUTO_MATCH] Travel dates missing, skipping auto match');
        return;
      }

      // 查询发票：日期在差旅范围内，状态为 pending 或 verified，未关联费用
      // 先查询 pending 状态的发票
      const pendingResponse = await apiClient.get('/invoices', {
        params: {
          status: 'pending',
          startDate: startDate,
          endDate: endDate,
          limit: 500
        }
      });
      
      // 再查询 verified 状态的发票
      const verifiedResponse = await apiClient.get('/invoices', {
        params: {
          status: 'verified',
          startDate: startDate,
          endDate: endDate,
          limit: 500
        }
      });

      const pendingInvoices = pendingResponse.data?.data || [];
      const verifiedInvoices = verifiedResponse.data?.data || [];
      const allInvoices = [...pendingInvoices, ...verifiedInvoices];
      
      // 过滤出未关联费用的发票
      const availableInvoices = allInvoices.filter(inv => {
        return !inv.relatedExpense || inv.relatedExpense === null;
      });
      
      devLog('[AUTO_MATCH] Found', availableInvoices.length, 'available invoices');

      if (availableInvoices.length === 0) {
        return;
      }

      // 2. 获取费用项详细信息（需要分类信息）
      const expenseItemIds = budgets.map(b => b.expenseItemId?.toString() || b.expenseItemId);
      const expenseItemsMap = {};
      
      // 确保费用项列表已加载
      if (expenseItems.length === 0) {
        await fetchExpenseItemsList();
      }
      
      // 从已有的 expenseItems 中获取
      expenseItemIds.forEach(itemId => {
        const item = expenseItems.find(i => {
          const id = i._id?.toString() || i._id;
          return id === itemId || id === itemId?.toString();
        });
        if (item) {
          expenseItemsMap[itemId] = item;
        } else {
          devWarn('[AUTO_MATCH] Expense item not found in list:', itemId, 'Available items:', expenseItems.map(i => i._id?.toString() || i._id));
        }
      });

      // 如果费用项信息不完整，再次尝试加载费用项列表
      if (Object.keys(expenseItemsMap).length < expenseItemIds.length) {
        devLog('[AUTO_MATCH] Some expense items not found, reloading expense items list...');
        await fetchExpenseItemsList();
        // 重新构建费用项映射
        expenseItemIds.forEach(itemId => {
          const item = expenseItems.find(i => {
            const id = i._id?.toString() || i._id;
            return id === itemId || id === itemId?.toString();
          });
          if (item) {
            expenseItemsMap[itemId] = item;
          } else {
            devWarn('[AUTO_MATCH] Expense item still not found after reload:', itemId);
          }
        });
      }
      
      devLog('[AUTO_MATCH] Expense items map:', Object.keys(expenseItemsMap).length, 'of', expenseItemIds.length, 'found');

      // 3. 为每个费用项匹配发票
      const matchedInvoices = {};
      const usedInvoiceIds = new Set();

      budgets.forEach(budget => {
        const expenseItemId = budget.expenseItemId?.toString() || budget.expenseItemId;
        const expenseItem = expenseItemsMap[expenseItemId];
        
        if (!expenseItem) {
          devWarn('[AUTO_MATCH] Expense item not found:', expenseItemId, 'Skipping invoice matching for this expense item.');
          devWarn('[AUTO_MATCH] Available expense item IDs:', Object.keys(expenseItemsMap));
          devWarn('[AUTO_MATCH] Budget expense item ID:', expenseItemId, 'Type:', typeof expenseItemId);
          // 跳过这个费用项，继续处理其他费用项
          return;
        }

        const matched = [];
        
        availableInvoices.forEach(invoice => {
          // 跳过已使用的发票
          const invoiceId = invoice._id?.toString() || invoice._id;
          if (usedInvoiceIds.has(invoiceId)) {
            return;
          }

          let score = 0;

          // 1. 分类匹配（权重：40%）
          const categoryMatch = matchInvoiceCategory(invoice.category, expenseItem.category);
          score += categoryMatch * 40;

          // 2. 时间匹配（权重：30%）
          const dateMatch = isInvoiceDateInRange(invoice.invoiceDate, travel.startDate, travel.endDate);
          score += dateMatch * 30;

          // 3. 地点匹配（仅交通类，权重：30%）
          if (invoice.category === 'transportation') {
            const locationMatch = matchInvoiceLocation(invoice, travel);
            score += locationMatch * 30;
          } else {
            // 非交通类发票，地点匹配不适用，给予默认分数（30分）
            score += 30;
          }

          // 4. 出行人匹配（交通类，额外加分）
          if (invoice.category === 'transportation') {
            const travelerMatch = matchInvoiceTraveler(invoice, travel);
            score += travelerMatch * 10;
          }

          // 匹配阈值：60分以上认为匹配
          if (score >= 60) {
            matched.push({ invoice, score });
          }
        });

        // 按分数排序，选择匹配的发票
        matched.sort((a, b) => b.score - a.score);
        const selectedInvoices = matched.map(m => m.invoice);
        
        if (selectedInvoices.length > 0) {
          matchedInvoices[expenseItemId] = selectedInvoices;
          selectedInvoices.forEach(inv => {
            usedInvoiceIds.add(inv._id?.toString() || inv._id);
          });
          devLog(`[AUTO_MATCH] Matched ${selectedInvoices.length} invoices for expense item ${expenseItemId}`);
        }
      });

      // 4. 更新状态，将匹配的发票添加到对应的费用项
      if (Object.keys(matchedInvoices).length > 0) {
        setExpenseItemInvoices(prev => {
          const updated = { ...prev };
          Object.keys(matchedInvoices).forEach(expenseItemId => {
            const expenseItemIdStr = expenseItemId?.toString() || expenseItemId;
            // 合并匹配的发票，避免重复
            const existingInvoices = updated[expenseItemIdStr] || [];
            const newInvoices = matchedInvoices[expenseItemId];
            const existingIds = new Set(existingInvoices.map(inv => (inv._id || inv.id)?.toString()));
            const invoicesToAdd = newInvoices.filter(inv => {
              const invId = (inv._id || inv.id)?.toString();
              return !existingIds.has(invId);
            });
            updated[expenseItemIdStr] = [...existingInvoices, ...invoicesToAdd];
          });
          return updated;
        });

        const totalMatched = Object.values(matchedInvoices).reduce((sum, invs) => sum + invs.length, 0);
        showNotification(
          t('expense.form.autoMatchedInvoices', { count: totalMatched }),
          'success'
        );
      }
    } catch (error) {
      devError('[AUTO_MATCH] Failed to auto match invoices:', error);
      // 不显示错误提示，避免干扰用户
    }
  };

  // 匹配发票分类到费用项分类
  const matchInvoiceCategory = (invoiceCategory, expenseItemCategory) => {
    if (!invoiceCategory || !expenseItemCategory) {
      return 0;
    }

    // 分类映射
    const categoryMapping = {
      'transportation': ['transport', 'transportation'],
      'accommodation': ['accommodation'],
      'meals': ['meal', 'meals'],
      'entertainment': ['entertainment'],
      'communication': ['communication'],
      'office_supplies': ['office_supplies', 'officeSupplies'],
      'training': ['training'],
      'other': ['other', 'general']
    };

    const allowedCategories = categoryMapping[expenseItemCategory] || [expenseItemCategory];
    return allowedCategories.includes(invoiceCategory) ? 1 : 0;
  };

  // 检查发票日期是否在差旅日期范围内
  const isInvoiceDateInRange = (invoiceDate, travelStartDate, travelEndDate) => {
    if (!invoiceDate || !travelStartDate || !travelEndDate) {
      return false;
    }
    const invoiceDateObj = new Date(invoiceDate);
    const startDate = new Date(travelStartDate);
    const endDate = new Date(travelEndDate);
    return invoiceDateObj >= startDate && invoiceDateObj <= endDate;
  };

  // 匹配发票地点（仅交通类）
  const matchInvoiceLocation = (invoice, travel) => {
    if (invoice.category !== 'transportation' || !invoice.traveler) {
      return 1; // 非交通类或无地点信息，默认匹配
    }

    const invoiceDeparture = invoice.traveler.departure;
    const invoiceDestination = invoice.traveler.destination;

    if (!invoiceDeparture || !invoiceDestination) {
      return 1; // 无地点信息，默认匹配
    }

    // 匹配去程
    if (travel.outbound) {
      const outboundMatch = (
        (compareLocation(invoiceDeparture, travel.outbound.departure) ||
         compareLocation(invoiceDeparture, travel.destination)) &&
        (compareLocation(invoiceDestination, travel.outbound.destination) ||
         compareLocation(invoiceDestination, travel.destination))
      );
      if (outboundMatch) return 1;
    }

    // 匹配返程
    if (travel.inbound) {
      const inboundMatch = (
        (compareLocation(invoiceDeparture, travel.inbound.departure) ||
         compareLocation(invoiceDeparture, travel.destination)) &&
        (compareLocation(invoiceDestination, travel.inbound.destination) ||
         compareLocation(invoiceDestination, travel.destination))
      );
      if (inboundMatch) return 1;
    }

    // 匹配多程行程
    if (travel.multiCityRoutes && Array.isArray(travel.multiCityRoutes)) {
      for (const route of travel.multiCityRoutes) {
        if (route.departure && route.destination) {
          const routeMatch = (
            compareLocation(invoiceDeparture, route.departure) &&
            compareLocation(invoiceDestination, route.destination)
          );
          if (routeMatch) return 1;
        }
      }
    }

    return 0;
  };

  // 匹配发票出行人（仅交通类）
  const matchInvoiceTraveler = (invoice, travel) => {
    if (invoice.category !== 'transportation' || !invoice.traveler) {
      return 0;
    }

    // 如果发票有出行人信息，检查是否匹配差旅单的员工
    if (invoice.traveler.name && travel.employee) {
      const employeeName = travel.employee.firstName + ' ' + travel.employee.lastName;
      return invoice.traveler.name.includes(employeeName) || employeeName.includes(invoice.traveler.name) ? 1 : 0;
    }

    return 0;
  };

  // 比较地点（支持字符串和对象）
  const compareLocation = (loc1, loc2) => {
    if (!loc1 || !loc2) return false;
    if (typeof loc1 === 'string' && typeof loc2 === 'string') {
      return loc1 === loc2 || loc1.includes(loc2) || loc2.includes(loc1);
    }
    if (typeof loc1 === 'object' && typeof loc2 === 'object') {
      return loc1.name === loc2.name || loc1._id?.toString() === loc2._id?.toString();
    }
    if (typeof loc1 === 'object') {
      return loc1.name === loc2 || loc1._id?.toString() === loc2;
    }
    if (typeof loc2 === 'object') {
      return loc1 === loc2.name || loc1 === loc2._id?.toString();
    }
    return false;
  };

  // 为费用项添加发票
  const handleAddInvoicesForExpenseItem = (expenseItemId, selectedInvoices) => {
    if (!selectedInvoices || selectedInvoices.length === 0) {
      return;
    }
    
    // 确保 expenseItemId 是字符串格式，用于状态键
    const expenseItemIdStr = expenseItemId?.toString() || expenseItemId;
    
    // 获取当前费用项信息
    const currentExpenseItem = expenseItems.find(item => {
      const itemId = item._id?.toString() || item._id;
      return itemId === expenseItemIdStr || itemId === expenseItemId;
    });
    
    // 检查发票是否已被其他费用项使用
    const duplicateInvoices = [];
    const invoicesToAdd = [];
    
    selectedInvoices.forEach(invoice => {
      const invoiceId = invoice._id || invoice.id;
      const invoiceIdStr = invoiceId?.toString() || invoiceId;
      
      // 检查所有费用项，看是否有其他费用项使用了这个发票
      let usedByExpenseItem = null;
      for (const [otherExpenseItemId, otherInvoices] of Object.entries(expenseItemInvoices)) {
        // 跳过当前费用项
        const otherExpenseItemIdStr = otherExpenseItemId?.toString() || otherExpenseItemId;
        if (otherExpenseItemIdStr === expenseItemIdStr || otherExpenseItemIdStr === expenseItemId) {
          continue;
        }
        
        // 检查该费用项是否包含这个发票
        const hasInvoice = (otherInvoices || []).some(inv => {
          const invId = inv._id || inv.id;
          const invIdStr = invId?.toString() || invId;
          return invIdStr === invoiceIdStr;
        });
        
        if (hasInvoice) {
          // 找到使用该发票的费用项
          const otherExpenseItem = expenseItems.find(item => {
            const itemId = item._id?.toString() || item._id;
            return itemId === otherExpenseItemIdStr || itemId === otherExpenseItemId;
          });
          usedByExpenseItem = otherExpenseItem;
          break;
        }
      }
      
      if (usedByExpenseItem) {
        // 发票已被其他费用项使用
        duplicateInvoices.push({
          invoice: invoice,
          usedBy: usedByExpenseItem
        });
      } else {
        // 发票未被其他费用项使用，可以添加
        invoicesToAdd.push({
        ...invoice,
        _id: invoiceId,
        id: invoiceId
        });
      }
    });
    
    // 如果有重复发票，显示提示信息
    if (duplicateInvoices.length > 0) {
      const duplicateMessages = duplicateInvoices.map(dup => {
        const invoiceNumber = dup.invoice.invoiceNumber || `ID: ${dup.invoice._id || dup.invoice.id}`;
        const expenseItemName = dup.usedBy?.itemName || dup.usedBy?._id || t('travel.form.unknownExpenseItem');
        return t('expense.form.invoiceAlreadyLinked', { invoiceNumber, expenseItemName });
      });
      
      const message = duplicateInvoices.length === 1
        ? duplicateMessages[0] + t('expense.form.invoicesAlreadyLinked', { count: 0, messages: '' }).split('：')[1] || ''
        : t('expense.form.invoicesAlreadyLinked', { count: duplicateInvoices.length, messages: duplicateMessages.join('；') });
      
      showNotification(message, 'warning');
    }
    
    // 如果没有可添加的发票，直接返回
    if (invoicesToAdd.length === 0) {
      setExpenseItemInvoiceDialogs(prev => ({
        ...prev,
        [expenseItemIdStr]: false,
        [expenseItemId]: false
      }));
      return;
    }
    
    setExpenseItemInvoices(prev => {
      // 尝试两种键格式
      const currentInvoices = prev[expenseItemIdStr] || prev[expenseItemId] || [];
      
      // 避免重复添加相同的发票（检查当前费用项中是否已有）
      const existingIds = new Set(currentInvoices.map(inv => {
        const id = inv._id || inv.id;
        return id ? String(id) : null;
      }).filter(Boolean));
      
      const newInvoices = invoicesToAdd.filter(inv => {
        const id = inv._id || inv.id;
        return id && !existingIds.has(String(id));
      });
      
      if (newInvoices.length === 0) {
        // 如果没有新发票，返回原状态
        return prev;
      }
      
      const updatedInvoices = [...currentInvoices, ...newInvoices];
      
      // 创建新对象确保 React 检测到变化
      const newState = {
        ...prev,
        [expenseItemIdStr]: updatedInvoices
      };
      
      // 如果 expenseItemId 和 expenseItemIdStr 不同，也更新原键
      if (expenseItemId !== expenseItemIdStr && prev[expenseItemId]) {
        delete newState[expenseItemId];
      }
      
      // 计算新的发票总金额
      const totalAmount = updatedInvoices.reduce((sum, inv) => {
        const amount = inv.totalAmount || inv.amount || 0;
        return sum + amount;
      }, 0);
      
      // 计算之前的发票总金额
      const previousTotal = currentInvoices.reduce((sum, inv) => {
        const amount = inv.totalAmount || inv.amount || 0;
        return sum + amount;
      }, 0);
      
      // 自动更新报销金额为发票总金额
      // 规则：如果报销金额未设置，或者等于之前的发票总金额（说明是自动设置的），则自动更新为新总金额
      // 如果用户已经手动修改过报销金额（不等于之前的发票总金额），则保持用户的修改
      setExpenseItemReimbursementAmounts(prevAmounts => {
        const currentReimbursement = prevAmounts[expenseItemIdStr] ?? prevAmounts[expenseItemId];
        
        // 如果报销金额还没有设置，自动设置为新的发票总金额
        if (currentReimbursement === undefined || currentReimbursement === null) {
          return {
            ...prevAmounts,
            [expenseItemIdStr]: totalAmount
          };
        }
        
        // 如果当前报销金额等于之前的发票总金额（说明是自动设置的），则自动更新为新总金额
        if (currentReimbursement === previousTotal) {
          return {
            ...prevAmounts,
            [expenseItemIdStr]: totalAmount
          };
        }
        
        // 如果用户已经手动修改过报销金额（不等于之前的发票总金额），保持用户的修改
        return prevAmounts;
      });
      
      return newState;
    });
    
    setExpenseItemInvoiceDialogs(prev => ({
      ...prev,
      [expenseItemIdStr]: false,
      [expenseItemId]: false
    }));
    
    // 显示成功提示（如果有添加发票）
    if (invoicesToAdd.length > 0) {
      const successMessage = duplicateInvoices.length > 0
        ? `成功添加 ${invoicesToAdd.length} 张发票（已跳过 ${duplicateInvoices.length} 张重复发票）`
        : `成功为费用项添加 ${invoicesToAdd.length} 张发票`;
      showNotification(successMessage, 'success');
    }
  };

  // 移除费用项的发票
  const handleRemoveInvoiceFromExpenseItem = (expenseItemId, invoiceId) => {
    const expenseItemIdStr = expenseItemId?.toString() || expenseItemId;
    
    setExpenseItemInvoices(prev => {
      const currentInvoices = prev[expenseItemIdStr] || prev[expenseItemId] || [];
      const previousTotal = currentInvoices.reduce((sum, inv) => {
        const amount = inv.totalAmount || inv.amount || 0;
        return sum + amount;
      }, 0);
      
      const updatedInvoices = currentInvoices.filter(inv => {
        const id = inv._id || inv.id;
        return id !== invoiceId;
      });
      
      // 计算新的发票总金额
      const totalAmount = updatedInvoices.reduce((sum, inv) => {
        const amount = inv.totalAmount || inv.amount || 0;
        return sum + amount;
      }, 0);
      
      // 如果报销金额等于之前的发票总金额，则自动更新为新总金额
      setExpenseItemReimbursementAmounts(prevAmounts => {
        const currentReimbursement = prevAmounts[expenseItemIdStr] ?? prevAmounts[expenseItemId];
        if (currentReimbursement === previousTotal) {
          return {
            ...prevAmounts,
            [expenseItemIdStr]: totalAmount
          };
        }
        return prevAmounts;
      });
      
      return {
        ...prev,
        [expenseItemIdStr]: updatedInvoices
      };
    });
    
    showNotification(t('expense.form.invoiceRemoved'), 'success');
  };

  const fetchExpenseData = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get(`/expenses/${id}`);
      if (response.data && response.data.success) {
        const expenseData = response.data.data;
        setFormData({
          title: expenseData.title || '',
          description: expenseData.description || '',
          category: expenseData.category || '',
          subcategory: expenseData.subcategory || '',
          amount: expenseData.amount || '',
          currency: expenseData.currency || 'USD',
          date: expenseData.date ? dayjs(expenseData.date) : dayjs(),
          vendor: expenseData.vendor || { name: '', address: '', taxId: '' },
          project: expenseData.project || '',
          costCenter: expenseData.costCenter || '',
          client: expenseData.client || '',
          tags: expenseData.tags || [],
          notes: expenseData.notes || '',
          receipts: expenseData.receipts || [],
          travel: expenseData.travel?._id || expenseData.travel || null
        });
        // 从后端加载现有费用时，当前日期是服务器真实值，尚未手动编辑
        setIsDateManuallyEdited(false);
        // 后端已经populate了relatedInvoices，直接使用
        // 使用统一的规范化函数
        setRelatedInvoicesNormalized(expenseData.relatedInvoices || []);
        
        // 如果关联了差旅单，加载差旅信息
        if (expenseData.travel) {
          const travelId = expenseData.travel?._id || expenseData.travel;
          if (travelId) {
          await loadTravelInfoById(travelId);
          }
        }
        
        // 如果关联了费用项，初始化费用项发票管理
        if (expenseData.expenseItem) {
          const expenseItemId = expenseData.expenseItem?._id || expenseData.expenseItem;
          if (expenseItemId) {
          const expenseItemIdStr = expenseItemId?.toString() || expenseItemId;
          const invoices = expenseData.relatedInvoices || [];
          setExpenseItemInvoices(prev => ({
            ...prev,
            [expenseItemIdStr]: invoices
          }));
          
          // 自动计算并设置报销金额为发票总金额
          // 规则：如果报销金额未设置，或者等于费用申请的金额（说明是自动生成的），则更新为发票总金额
          // 如果费用申请中已经有报销金额（可能是用户修改过的），则保持原值
          const totalAmount = invoices.reduce((sum, inv) => {
            const amount = inv.totalAmount || inv.amount || 0;
            return sum + amount;
          }, 0);
          
          setExpenseItemReimbursementAmounts(prevAmounts => {
            const currentReimbursement = prevAmounts[expenseItemIdStr] ?? prevAmounts[expenseItemId];
            
            // 如果报销金额还没有设置，自动设置为发票总金额
            if (currentReimbursement === undefined || currentReimbursement === null) {
              return {
                ...prevAmounts,
                [expenseItemIdStr]: totalAmount
              };
            }
            
            // 如果报销金额等于费用申请的金额（说明是自动生成的），更新为发票总金额
            if (currentReimbursement === expenseData.amount) {
              return {
                ...prevAmounts,
                [expenseItemIdStr]: totalAmount
              };
            }
            
            // 如果费用申请中已经有报销金额（可能是用户修改过的），保持原值
            return prevAmounts;
          });
          }
        }
        
        // 加载费用项列表（用于显示费用项名称）
        await fetchExpenseItemsList();
      }
    } catch (error) {
      devError('Failed to load expense data:', error);
      devError('Error details:', {
        message: error.message,
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        expenseId: id
      });
      
      let errorMessage = t('expense.form.loadExpenseDataFailed');
      
      if (error.response?.status === 404) {
        errorMessage = t('expense.form.expenseNotFound');
      } else if (error.response?.status === 403) {
        errorMessage = t('expense.form.noPermission');
      } else if (error.response?.status === 500) {
        errorMessage = t('expense.form.serverError');
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      }
      
      showNotification(errorMessage, 'error');
    } finally {
      setLoading(false);
    }
  };

  // 根据ID加载差旅信息（用于编辑模式）
  const loadTravelInfoById = async (travelId) => {
    const travelIdStr = travelId?.toString() || travelId;
    
    // 防止重复请求
    if (travelLoading && loadingTravelIdRef.current === travelIdStr) {
      devLog('Already loading travel info by ID, skipping:', travelIdStr);
      return;
    }
    
    try {
      setTravelLoading(true);
      loadingTravelIdRef.current = travelIdStr;
      
      const response = await apiClient.get(`/travel/${travelIdStr}`);
      if (response.data && response.data.success) {
        const travelData = response.data.data;
        setSelectedTravel(travelData);
        
        // 确保差旅单在选项中（用于 Autocomplete 匹配）
        setTravelOptions(prev => {
          const exists = prev.some(opt => opt._id === travelData._id);
          if (!exists) {
            return [...prev, travelData];
          }
          return prev;
        });
        
        // 初始化费用项发票管理
        const budgets = extractExpenseBudgets(travelData);
        
        // 如果费用申请关联了费用项，将发票添加到对应的费用项
        const expenseResponse = await apiClient.get(`/expenses/${id}`);
        let expenseItemInvoicesToSet = null;
        if (expenseResponse.data?.data?.expenseItem) {
          const expenseItemId = expenseResponse.data.data.expenseItem._id || expenseResponse.data.data.expenseItem;
          const expenseItemIdStr = expenseItemId?.toString() || expenseItemId;
          if (expenseResponse.data.data.relatedInvoices) {
            expenseItemInvoicesToSet = {
              [expenseItemIdStr]: expenseResponse.data.data.relatedInvoices || []
            };
          }
        }
        
        // 保留已有的发票数据，只初始化新的费用项（不覆盖已有数据）
        setExpenseItemInvoices(prev => {
          const updated = { ...prev };
          budgets.forEach(budget => {
            // 确保使用字符串键
            const expenseItemIdStr = budget.expenseItemId?.toString() || budget.expenseItemId;
            // 只有当该费用项不存在时才初始化为空数组
            if (!updated[expenseItemIdStr]) {
              updated[expenseItemIdStr] = [];
            }
          });
          // 如果有关联的费用项发票，设置它们（但不要覆盖已有的）
          if (expenseItemInvoicesToSet) {
            Object.keys(expenseItemInvoicesToSet).forEach(key => {
              // 只有当该费用项没有发票时才设置
              if (!updated[key] || updated[key].length === 0) {
                updated[key] = expenseItemInvoicesToSet[key];
              }
            });
          }
          return updated;
        });
      }
    } catch (error) {
      devError('Failed to load travel info:', error);
      // 429 错误是请求频率过高，不显示错误提示，避免干扰用户
      if (error.response?.status !== 429) {
        showNotification('加载差旅信息失败', 'error');
      }
    } finally {
      setTravelLoading(false);
      // 延迟清除 loadingTravelIdRef，避免快速切换时的重复请求
      setTimeout(() => {
        if (loadingTravelIdRef.current === travelIdStr) {
          loadingTravelIdRef.current = null;
        }
      }, 500);
    }
  };

  const fetchRelatedInvoices = async () => {
    try {
      setInvoicesLoading(true);
      const response = await apiClient.get(`/expenses/${id}`);
      if (response.data && response.data.success) {
        // 后端已经populate了relatedInvoices，使用统一的规范化函数
        const normalizedInvoices = setRelatedInvoicesNormalized(response.data.data.relatedInvoices || []);
        return normalizedInvoices; // 返回规范化后的数据
      }
      return [];
    } catch (error) {
      devError('Failed to load related invoices:', error);
      devError('Error details:', {
        message: error.message,
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        expenseId: id
      });
      
      // 如果是404或403错误，不显示通知（可能是费用不存在或无权访问，已在fetchExpenseData中处理）
      if (error.response?.status !== 404 && error.response?.status !== 403) {
        let errorMessage = '加载关联发票失败';
        
        if (error.response?.status === 500) {
          errorMessage = '服务器错误，请稍后重试';
        } else if (error.response?.data?.message) {
          errorMessage = error.response.data.message;
        }
        
        showNotification(errorMessage, 'error');
      }
      
      return [];
    } finally {
      setInvoicesLoading(false);
    }
  };

  const handleAddInvoices = async (selectedInvoices) => {
    try {
      let successCount = 0;
      let failCount = 0;
      
      for (const invoice of selectedInvoices) {
        // 确保发票ID是字符串格式（在 try 块外定义，以便在 catch 块中使用）
        const invoiceId = invoice._id || invoice.id || invoice;
        const invoiceIdStr = invoiceId?.toString() || invoiceId;
        
        try {
        await apiClient.post(`/expenses/${id}/link-invoice`, {
            invoiceId: invoiceIdStr
        });
          successCount++;
        } catch (err) {
          devError(`✗ 关联发票失败: ${invoiceIdStr}`, err);
          failCount++;
          // 如果发票已经关联，不算错误
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
        // 重新获取发票列表，确保数据同步
        const fetchedInvoices = await fetchRelatedInvoices();
        
        // 等待状态更新完成
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // 再次验证数据库中的数据，确保状态和数据库一致
        const verifyResponse = await apiClient.get(`/expenses/${id}`);
        if (verifyResponse.data && verifyResponse.data.success) {
          const latestInvoices = verifyResponse.data.data.relatedInvoices || [];
          const normalizedLatestInvoices = normalizeInvoices(latestInvoices);
          
          // 确保状态和数据库一致
          if (normalizedLatestInvoices.length !== relatedInvoices.length) {
            setRelatedInvoicesNormalized(normalizedLatestInvoices);
          } else {
            // 验证每个发票ID是否一致
            const dbIds = new Set(normalizedLatestInvoices.map(inv => (inv._id || inv.id)?.toString()).filter(Boolean));
            const stateIds = new Set(relatedInvoices.map(inv => (inv._id || inv.id)?.toString()).filter(Boolean));
            if (dbIds.size !== stateIds.size || ![...dbIds].every(id => stateIds.has(id))) {
              setRelatedInvoicesNormalized(normalizedLatestInvoices);
            }
          }
        }
      }
      
      if (failCount > 0) {
        showNotification(
          `关联失败 ${failCount} 张发票`,
          'warning'
        );
      }
    } catch (error) {
      devError('Failed to link invoices:', error);
      showNotification(
        error.response?.data?.message || t('expense.invoices.addError') || '关联发票失败',
        'error'
      );
    }
  };

  const handleRemoveInvoice = async (invoiceId) => {
    try {
      // 确保发票ID是字符串格式
      const invoiceIdStr = invoiceId?.toString() || invoiceId;
      await apiClient.delete(`/expenses/${id}/unlink-invoice/${invoiceIdStr}`);
      showNotification(t('expense.invoices.removed') || '取消关联成功', 'success');
      await fetchRelatedInvoices();
    } catch (error) {
      devError('Failed to unlink invoice:', error);
      showNotification(
        error.response?.data?.message || t('expense.invoices.removeError') || '取消关联失败',
        'error'
      );
    }
  };

  const handleChange = (field, value) => {
    if (field.includes('.')) {
      const [parent, child] = field.split('.');
      setFormData(prev => ({
        ...prev,
        [parent]: {
          ...prev[parent],
          [child]: value
        }
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [field]: value
      }));
    }

    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: ''
      }));
    }
  };

  const handleFileUpload = (event) => {
    const files = Array.from(event.target.files);
    const newReceipts = files.map(file => ({
      filename: file.name,
      originalName: file.name,
      size: file.size,
      uploadedAt: new Date().toISOString(),
      file: file
    }));

    setFormData(prev => ({
      ...prev,
      receipts: [...prev.receipts, ...newReceipts]
    }));

    setUploadDialogOpen(false);
    showNotification(t('expense.form.filesUploaded', { count: files.length }), 'success');
  };

  const removeReceipt = (index) => {
    setFormData(prev => ({
      ...prev,
      receipts: prev.receipts.filter((_, i) => i !== index)
    }));
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.title.trim()) {
      newErrors.title = t('expense.form.titleRequired');
    }

    if (!formData.category) {
      newErrors.category = t('expense.form.categoryRequired');
    }

    const effectiveAmount = getEffectiveAmount();
    if (isNaN(effectiveAmount) || effectiveAmount <= 0) {
      newErrors.amount = t('validation.validAmountRequired');
    }

    if (!formData.date) {
      newErrors.date = t('expense.form.dateRequired');
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async (status = 'draft') => {
    // 防止重复提交
    if (saving) {
      return;
    }

    if (!validateForm()) {
      showNotification(t('expense.form.validationError') || '请检查表单错误', 'error');
      return;
    }

    // 使用统一的有效金额（用户填写优先，其次是自动计算的核销金额）
    const effectiveAmount = getEffectiveAmount();

    try {
      setSaving(true);
      
      // 在保存前，重新获取最新的发票列表，确保状态是最新的
      // 这对于关联差旅单的费用申请特别重要，因为用户可能刚刚添加了发票
      let latestRelatedInvoices = relatedInvoices; // 默认使用当前状态
      if (isEdit) {
        const fetchedInvoices = await fetchRelatedInvoices();
        
        // 等待状态更新完成
        await new Promise(resolve => setTimeout(resolve, 150));
        
        // 验证状态：确保状态包含所有新增的发票
        const verifyResponse = await apiClient.get(`/expenses/${id}`);
        if (verifyResponse.data && verifyResponse.data.success) {
          const dbInvoicesVerify = normalizeInvoices(verifyResponse.data.data.relatedInvoices || []);
          const fetchedInvoiceIds = new Set(
            fetchedInvoices.map(inv => (inv._id || inv.id)?.toString()).filter(Boolean)
          );
          const dbInvoiceIdsVerify = new Set(
            dbInvoicesVerify.map(inv => (inv._id || inv.id)?.toString()).filter(Boolean)
          );
          
          // 合并：使用数据库中的发票作为基础，添加fetchRelatedInvoices返回中有但数据库中没有的发票
          const mergedVerifyInvoices = [...dbInvoicesVerify];
          for (const fetchedInv of fetchedInvoices) {
            const fetchedInvId = (fetchedInv._id || fetchedInv.id)?.toString();
            if (fetchedInvId && !dbInvoiceIdsVerify.has(fetchedInvId)) {
              mergedVerifyInvoices.push(fetchedInv);
            }
          }
          
          // 使用合并后的最新发票列表
          latestRelatedInvoices = mergedVerifyInvoices;
          
          // 更新状态以确保UI同步
          setRelatedInvoicesNormalized(latestRelatedInvoices);
          // 再次等待状态更新
          await new Promise(resolve => setTimeout(resolve, 100));
        } else {
          // 如果验证失败，使用fetchRelatedInvoices返回的数据
          latestRelatedInvoices = fetchedInvoices || relatedInvoices;
        }
      }
      
      // 如果选择了差旅单且有费用项发票，为每个费用项创建费用申请
      if (selectedTravel && !isEdit) {
        const budgets = extractExpenseBudgets(selectedTravel);
        const expensesToCreate = [];
        // 用于跟踪已经处理的费用项，避免重复创建
        const processedExpenseItems = new Set();
        
        for (const budget of budgets) {
          const expenseItemIdStr = budget.expenseItemId?.toString() || budget.expenseItemId;
          const itemInvoices = expenseItemInvoices[expenseItemIdStr] || expenseItemInvoices[budget.expenseItemId] || [];
          
          // 如果该费用项已经有发票，且还没有处理过，创建费用申请
          if (itemInvoices.length > 0 && !processedExpenseItems.has(expenseItemIdStr)) {
            processedExpenseItems.add(expenseItemIdStr);
            
            const expenseItem = expenseItems.find(item => item._id === budget.expenseItemId);
            const invoiceTotalAmount = itemInvoices.reduce((sum, inv) => 
              sum + (inv.totalAmount || inv.amount || 0), 0
            );
            
            // 使用报销金额（如果用户修改了），否则使用发票总金额
            const reimbursementAmount = expenseItemReimbursementAmounts[expenseItemIdStr] ?? 
                                       expenseItemReimbursementAmounts[budget.expenseItemId] ?? 
                                       invoiceTotalAmount;
            
            // 从发票中提取商户信息
            const vendor = itemInvoices[0]?.vendor || { name: '', address: '', taxId: '' };
            
            // 合并去程和返程的描述
            const routeDescriptions = budgets
              .filter(b => b.expenseItemId?.toString() === expenseItemIdStr)
              .map(b => {
                if (b.route === 'outbound') return t('expense.form.routeOutbound');
                if (b.route === 'inbound') return t('expense.form.routeInbound');
                if (b.route.startsWith('multiCity-')) {
                  const index = parseInt(b.route.replace('multiCity-', '')) + 1;
                  return t('expense.form.routeMultiCity', { index });
                }
                return '';
              })
              .filter(Boolean);
            
            const routeDescription = routeDescriptions.length > 0 
              ? routeDescriptions.join('、')
              : '';
            
            const expenseData = {
              travel: selectedTravel._id,
              expenseItem: budget.expenseItemId,
              title: t('expense.form.expenseTitle', {
                travelTitle: selectedTravel.title || selectedTravel.travelNumber || t('travel.title'),
                expenseItemName: expenseItem?.itemName || budget.expenseItemId
              }),
              description: `${formData.description || ''} ${routeDescription ? `(${routeDescription})` : ''}`.trim(),
              category: mapExpenseItemCategoryToExpenseCategory(expenseItem?.category || 'other'),
              amount: reimbursementAmount,
              currency: selectedTravel.currency || formData.currency || 'USD',
              date: selectedTravel.endDate || formData.date?.toISOString() || new Date().toISOString(),
              status: status,
              vendor: vendor,
              relatedInvoices: itemInvoices.map(inv => inv._id || inv.id).filter(Boolean),
              costCenter: formData.costCenter || '',
              client: formData.client || '',
              tags: formData.tags || [],
              notes: formData.notes || '',
              receipts: (formData.receipts || []).map(receipt => ({
                filename: receipt.filename || receipt.originalName,
                originalName: receipt.originalName || receipt.filename,
                path: receipt.path || '',
                size: receipt.size || 0,
                mimeType: receipt.mimeType || receipt.type || '',
                uploadedAt: receipt.uploadedAt || new Date().toISOString()
              })).filter(receipt => receipt.filename)
            };
            
            if (formData.project && formData.project.trim() !== '') {
              expenseData.project = formData.project;
            }
            
            expensesToCreate.push(expenseData);
          }
        }
        
        if (expensesToCreate.length > 0) {
          // 批量创建费用申请
          const createdExpenses = [];
          for (const expenseData of expensesToCreate) {
            try {
              const response = await apiClient.post('/expenses', expenseData);
              if (response.data && response.data.success) {
                createdExpenses.push(response.data.data);
                
                // 关联发票
                if (expenseData.relatedInvoices && expenseData.relatedInvoices.length > 0) {
                  for (const invoiceId of expenseData.relatedInvoices) {
                    // 确保发票ID是字符串格式（在循环开始处定义，以便在 catch 块中使用）
                    const invoiceIdStr = invoiceId?.toString() || invoiceId;
                    try {
                      await apiClient.post(`/expenses/${response.data.data._id}/link-invoice`, {
                        invoiceId: invoiceIdStr
                      });
                    } catch (err) {
                      devError('Failed to link invoice:', err);
                      // 如果发票已经关联到当前费用申请，忽略错误（幂等操作）
                      if (err.response?.status === 400 && 
                          err.response?.data?.message?.includes('already linked')) {
                        // 检查是否是关联到当前费用申请
                        try {
                          const expenseResponse = await apiClient.get(`/expenses/${response.data.data._id}`);
                          const currentInvoiceIds = new Set(
                            (expenseResponse.data?.data?.relatedInvoices || [])
                              .map(inv => (inv._id || inv).toString())
                          );
                          if (currentInvoiceIds.has(invoiceIdStr)) {
                            // 已经关联到当前费用申请，忽略错误
                            continue;
                          }
                        } catch (checkErr) {
                          devError('Failed to check invoice link status:', checkErr);
                        }
                      }
                      // 其他错误显示通知
                      showNotification(
                        `关联发票失败: ${err.response?.data?.message || err.message}`,
                        'warning'
                      );
                    }
                  }
                }
              }
            } catch (error) {
              devError('Failed to create expense:', error);
            }
          }
          
          if (createdExpenses.length > 0) {
            showNotification(
              t('expense.form.batchCreateSuccess', { count: createdExpenses.length }),
              'success'
            );
            setSaving(false); // 重置保存状态
            navigate('/expenses');
            return;
          }
        } else {
          // 如果选择了差旅单但没有为费用项添加发票，不允许创建费用申请
          showNotification(t('expense.form.noExpenseItems'), 'warning');
          setSaving(false); // 重置保存状态
          return;
        }
      }
      
      // 原有的保存逻辑（编辑模式或没有选择差旅单）
      // 注意：如果选择了差旅单且在新建模式下，上面的代码已经处理并返回了
      const submitData = {
        title: formData.title || '',
        description: formData.description || '',
        category: formData.category,
        subcategory: formData.subcategory || '',
        amount: effectiveAmount || 0,
        currency: formData.currency || 'USD',
        date: formData.date ? (formData.date.toISOString ? formData.date.toISOString() : new Date(formData.date).toISOString()) : new Date().toISOString(),
        status: status,
        vendor: {
          name: formData.vendor?.name || '',
          address: formData.vendor?.address || '',
          taxId: formData.vendor?.taxId || ''
        },
        // 如果关联了差旅单，添加travel字段
        ...(selectedTravel && { travel: selectedTravel._id }),
        costCenter: formData.costCenter || '',
        client: formData.client || '',
        tags: formData.tags || [],
        notes: formData.notes || '',
        receipts: (formData.receipts || []).map(receipt => ({
          filename: receipt.filename || receipt.originalName,
          originalName: receipt.originalName || receipt.filename,
          path: receipt.path || '',
          size: receipt.size || 0,
          mimeType: receipt.mimeType || receipt.type || '',
          uploadedAt: receipt.uploadedAt || new Date().toISOString()
        })).filter(receipt => receipt.filename)
      };

      if (formData.project && formData.project.trim() !== '') {
        submitData.project = formData.project;
      }
      
      // 如果关联了差旅单，添加travel字段（新建和编辑模式都支持）
      if (selectedTravel) {
        submitData.travel = selectedTravel._id;
      }
      
      let response;
      if (isEdit) {
        response = await apiClient.put(`/expenses/${id}`, submitData);
      } else {
        response = await apiClient.post('/expenses', submitData);
      }

      if (response.data && response.data.success) {
        const savedExpenseId = response.data.data._id || id;
        
        // 处理发票关联（新建和编辑模式都需要）
        if (selectedTravel) {
          // 如果关联了差旅单，处理费用项发票
          const budgets = extractExpenseBudgets(selectedTravel);
          let hasExpenseItemInvoices = false;
          
          for (const budget of budgets) {
            const expenseItemIdStr = budget.expenseItemId?.toString() || budget.expenseItemId;
            const invoicesForItem = expenseItemInvoices[expenseItemIdStr] || [];
            
            if (invoicesForItem.length > 0) {
              hasExpenseItemInvoices = true;
              // 获取当前费用申请关联的费用项
              const expenseResponse = await apiClient.get(`/expenses/${savedExpenseId}`);
              const currentExpenseItemId = expenseResponse.data?.data?.expenseItem?._id || expenseResponse.data?.data?.expenseItem;
              const currentExpenseItemIdStr = currentExpenseItemId?.toString() || currentExpenseItemId;
              
              // 检查费用申请是否需要更新费用项关联
              const needsUpdateExpenseItem = !currentExpenseItemId || 
                (currentExpenseItemIdStr !== expenseItemIdStr && currentExpenseItemId !== budget.expenseItemId);
              
              // 如果费用申请没有关联费用项，或者关联的费用项与当前费用项不匹配，先更新费用项关联
              if (needsUpdateExpenseItem && isEdit) {
                try {
                  await apiClient.put(`/expenses/${savedExpenseId}`, {
                    expenseItem: budget.expenseItemId
                  });
                } catch (err) {
                  devError('Failed to update expense item:', err);
                  showNotification(t('expense.saveError'), 'error');
                  // 继续处理发票关联，即使费用项更新失败
                }
              }
              
              // 处理发票关联（无论费用项是否匹配，只要有发票就处理）
              const currentInvoiceIds = new Set((expenseResponse.data.data.relatedInvoices || []).map(inv => {
                const id = inv._id || inv.id || inv;
                return id ? id.toString() : null;
              }).filter(Boolean));
              const newInvoiceIds = new Set(invoicesForItem.map(inv => {
                const id = inv._id || inv.id;
                return id ? id.toString() : null;
              }).filter(Boolean));
                
                // 添加新关联的发票
                for (const invoice of invoicesForItem) {
                  const invoiceId = invoice._id || invoice.id;
                const invoiceIdStr = invoiceId?.toString() || invoiceId;
                
                if (invoiceIdStr && !currentInvoiceIds.has(invoiceIdStr)) {
                    try {
                    await apiClient.post(`/expenses/${savedExpenseId}/link-invoice`, { 
                      invoiceId: invoiceIdStr 
                    });
                    } catch (err) {
                      devError('Failed to link invoice:', err);
                    // 如果发票已经关联到当前费用申请，忽略错误（幂等操作）
                    if (err.response?.status === 400 && 
                        err.response?.data?.message?.includes('already linked')) {
                      // 检查是否是关联到当前费用申请
                      try {
                        const checkResponse = await apiClient.get(`/expenses/${savedExpenseId}`);
                        const checkInvoiceIds = new Set(
                          (checkResponse.data?.data?.relatedInvoices || [])
                            .map(inv => {
                              const id = inv._id || inv.id || inv;
                              return id ? id.toString() : null;
                            })
                            .filter(Boolean)
                        );
                        if (checkInvoiceIds.has(invoiceIdStr)) {
                          // 已经关联到当前费用申请，忽略错误
                          continue;
                        }
                      } catch (checkErr) {
                        devError('Failed to check invoice link status:', checkErr);
                      }
                    }
                    // 其他错误显示通知
                    showNotification(
                      `关联发票失败: ${err.response?.data?.message || err.message}`,
                      'warning'
                    );
                    }
                  }
                }
                
                // 移除取消关联的发票
              for (const invoiceIdStr of currentInvoiceIds) {
                if (!newInvoiceIds.has(invoiceIdStr)) {
                    try {
                    await apiClient.delete(`/expenses/${savedExpenseId}/unlink-invoice/${invoiceIdStr}`);
                    } catch (err) {
                      devError('Failed to unlink invoice:', err);
                    }
                  }
                }
                
                // 更新报销金额（如果有修改）
                const reimbursementAmount = expenseItemReimbursementAmounts[expenseItemIdStr];
                if (reimbursementAmount !== undefined && reimbursementAmount !== null) {
                  const invoiceTotalAmount = invoicesForItem.reduce((sum, inv) => {
                    return sum + (inv.totalAmount || inv.amount || 0);
                  }, 0);
                  
                  // 如果报销金额与发票总金额不同，更新费用申请的金额
                  if (reimbursementAmount !== invoiceTotalAmount) {
                    try {
                      await apiClient.put(`/expenses/${savedExpenseId}`, {
                        amount: reimbursementAmount
                      });
                    } catch (err) {
                      devError('Failed to update reimbursement amount:', err);
                    }
                  }
              }
            }
          }
          
          // 如果费用申请没有关联费用项，或者用户通过"关联发票"按钮添加了发票，也需要处理 relatedInvoices
          // 注意：即使是新建模式，也需要处理 relatedInvoices（因为用户可能在选择差旅单后又手动添加了发票）
          if (!hasExpenseItemInvoices || (latestRelatedInvoices && latestRelatedInvoices.length > 0)) {
            // 关键修复：使用保存前验证时获取的最新发票列表（latestRelatedInvoices）
            // 这个列表已经合并了数据库和状态中的发票，确保包含所有新增的发票
            
            // 为了确保数据一致性，我们还是需要从数据库获取一次
            // 然后合并数据库和最新发票列表中的发票
            const expenseResponse = await apiClient.get(`/expenses/${savedExpenseId}`);
            const currentInvoiceIds = new Set(
              (expenseResponse.data?.data?.relatedInvoices || [])
                .map(inv => {
                  const id = inv._id || inv;
                  return id ? id.toString() : null;
                })
                .filter(Boolean)
            );
            
            // 关键修复：使用保存前验证时获取的最新发票列表，而不是依赖状态
            // latestRelatedInvoices 已经包含了所有新增的发票
            
            const dbInvoices = normalizeInvoices(expenseResponse.data?.data?.relatedInvoices || []);
            const latestInvoices = normalizeInvoices(latestRelatedInvoices || []);
            
            // 合并：使用数据库中的发票作为基础，添加最新发票列表中有但数据库中没有的发票
            const dbInvoiceIds = new Set(
              dbInvoices.map(inv => (inv._id || inv.id)?.toString()).filter(Boolean)
            );
            const latestInvoiceIdsSet = new Set(
              latestInvoices.map(inv => (inv._id || inv.id)?.toString()).filter(Boolean)
            );
            
            // 合并发票列表：数据库中的发票 + 最新发票列表中有但数据库中没有的发票
            const mergedInvoices = [...dbInvoices];
            for (const latestInv of latestInvoices) {
              const latestInvId = (latestInv._id || latestInv.id)?.toString();
              if (latestInvId && !dbInvoiceIds.has(latestInvId)) {
                mergedInvoices.push(latestInv);
              }
            }
            
            const invoicesToProcess = mergedInvoices;
            
            // 处理发票列表：invoicesToProcess 已经是规范化后的数据，直接使用
            const normalizedRelatedInvoices = invoicesToProcess;
            
            const newInvoiceIds = new Set(
              normalizedRelatedInvoices
                .map(inv => {
                  const id = inv._id || inv.id;
                  return id ? id.toString() : null;
                })
                .filter(Boolean)
            );
            
            // 添加新关联的发票
            for (const invoice of normalizedRelatedInvoices) {
              const invoiceId = invoice._id || invoice.id;
              if (invoiceId) {
                const invoiceIdStr = invoiceId.toString();
                
                if (!currentInvoiceIds.has(invoiceIdStr)) {
                  try {
                    await apiClient.post(`/expenses/${savedExpenseId}/link-invoice`, { 
                      invoiceId: invoiceIdStr 
                    });
                    currentInvoiceIds.add(invoiceIdStr);
                  } catch (err) {
                    devError(`✗ 关联发票失败 ${invoiceIdStr}:`, err);
                    if (err.response?.status === 400 && 
                        err.response?.data?.message?.includes('already linked')) {
                      try {
                        const checkResponse = await apiClient.get(`/expenses/${savedExpenseId}`);
                        const latestInvoiceIds = new Set(
                          (checkResponse.data?.data?.relatedInvoices || [])
                            .map(inv => {
                              const id = inv._id || inv;
                              return id ? id.toString() : null;
                            })
                            .filter(Boolean)
                        );
                        if (latestInvoiceIds.has(invoiceIdStr)) {
                          currentInvoiceIds.add(invoiceIdStr);
                          continue;
                        }
                      } catch (checkErr) {
                        devError('检查发票关联状态失败:', checkErr);
                      }
                    }
                    showNotification(
                      `关联发票失败: ${err.response?.data?.message || err.message}`,
                      'warning'
                    );
                  }
                }
              }
            }
            
            // 移除取消关联的发票
            for (const invoiceIdStr of currentInvoiceIds) {
              if (!newInvoiceIds.has(invoiceIdStr)) {
                try {
                  await apiClient.delete(`/expenses/${savedExpenseId}/unlink-invoice/${invoiceIdStr}`);
                } catch (err) {
                  devError('Failed to unlink invoice:', err);
                  showNotification(
                    `取消关联发票失败: ${err.response?.data?.message || err.message}`,
                    'warning'
                  );
                }
              }
            }
          }
        } else {
          // 没有关联差旅单的情况，处理 relatedInvoices
          if (isEdit) {
            // 编辑模式：更新发票关联
            const expenseResponse = await apiClient.get(`/expenses/${savedExpenseId}`);
            // 统一使用字符串格式的ID进行比较
            const currentInvoiceIds = new Set(
              (expenseResponse.data?.data?.relatedInvoices || [])
                .map(inv => {
                  const id = inv._id || inv;
                  return id ? id.toString() : null;
                })
                .filter(Boolean)
            );
            
            // 关键修复：使用保存前验证时获取的最新发票列表（latestRelatedInvoices）
            // 这个列表已经合并了数据库和状态中的发票，确保包含所有新增的发票
            
            const dbInvoices = normalizeInvoices(expenseResponse.data?.data?.relatedInvoices || []);
            const latestInvoices = normalizeInvoices(latestRelatedInvoices || []);
            
            // 合并：使用数据库中的发票作为基础，添加最新发票列表中有但数据库中没有的发票
            const dbInvoiceIds = new Set(
              dbInvoices.map(inv => (inv._id || inv.id)?.toString()).filter(Boolean)
            );
            const latestInvoiceIds = new Set(
              latestInvoices.map(inv => (inv._id || inv.id)?.toString()).filter(Boolean)
            );
            
            // 合并发票列表：数据库中的发票 + 最新发票列表中有但数据库中没有的发票
            const mergedInvoices = [...dbInvoices];
            for (const latestInv of latestInvoices) {
              const latestInvId = (latestInv._id || latestInv.id)?.toString();
              if (latestInvId && !dbInvoiceIds.has(latestInvId)) {
                mergedInvoices.push(latestInv);
              }
            }
            
            const normalizedRelatedInvoices = mergedInvoices;
            
            const newInvoiceIds = new Set(
              normalizedRelatedInvoices
                .map(inv => {
                  const id = inv._id || inv.id;
                  return id ? id.toString() : null;
                })
                .filter(Boolean)
            );
            
            // 添加新关联的发票
            for (const invoice of normalizedRelatedInvoices) {
              const invoiceId = invoice._id || invoice.id;
              if (invoiceId) {
                const invoiceIdStr = invoiceId.toString();
                
                // 检查是否已经关联（使用字符串格式比较）
                if (!currentInvoiceIds.has(invoiceIdStr)) {
                try {
                    await apiClient.post(`/expenses/${savedExpenseId}/link-invoice`, { 
                      invoiceId: invoiceIdStr 
                    });
                    // 关联成功后，更新 currentInvoiceIds，避免重复关联
                    currentInvoiceIds.add(invoiceIdStr);
                } catch (err) {
                    devError(`✗ 关联发票失败 ${invoiceIdStr}:`, err);
                    // 如果发票已经关联到当前费用申请，忽略错误（幂等操作）
                    if (err.response?.status === 400 && 
                        err.response?.data?.message?.includes('already linked')) {
                      // 重新获取最新数据检查
                      try {
                        const checkResponse = await apiClient.get(`/expenses/${savedExpenseId}`);
                        const latestInvoiceIds = new Set(
                          (checkResponse.data?.data?.relatedInvoices || [])
                            .map(inv => {
                              const id = inv._id || inv;
                              return id ? id.toString() : null;
                            })
                            .filter(Boolean)
                        );
                        if (latestInvoiceIds.has(invoiceIdStr)) {
                          // 已经关联到当前费用申请，忽略错误
                          currentInvoiceIds.add(invoiceIdStr);
                          continue;
                        }
                      } catch (checkErr) {
                        devError('检查发票关联状态失败:', checkErr);
                      }
                    }
                    // 其他错误显示通知
                    showNotification(
                      `关联发票失败: ${err.response?.data?.message || err.message}`,
                      'warning'
                    );
                  }
                }
              }
            }
            
            // 移除取消关联的发票
            for (const invoiceIdStr of currentInvoiceIds) {
              if (!newInvoiceIds.has(invoiceIdStr)) {
                try {
                  await apiClient.delete(`/expenses/${savedExpenseId}/unlink-invoice/${invoiceIdStr}`);
                } catch (err) {
                  devError('Failed to unlink invoice:', err);
                  showNotification(
                    `取消关联发票失败: ${err.response?.data?.message || err.message}`,
                    'warning'
                  );
                }
              }
            }
          } else {
            // 新建模式：关联发票
            // 使用 latestRelatedInvoices（如果已设置），否则使用 relatedInvoices
            const invoicesToLink = latestRelatedInvoices && latestRelatedInvoices.length > 0 
              ? latestRelatedInvoices 
              : relatedInvoices;
            if (invoicesToLink && invoicesToLink.length > 0) {
              for (const invoice of invoicesToLink) {
                const invoiceId = invoice._id || invoice.id;
                if (invoiceId) {
                  try {
                    // 确保发票ID是字符串格式
                    const invoiceIdStr = invoiceId.toString();
                    await apiClient.post(`/expenses/${savedExpenseId}/link-invoice`, { 
                      invoiceId: invoiceIdStr 
                    });
                  } catch (err) {
                    devError('Failed to link invoice:', err);
                    // 如果发票已经关联到当前费用申请，忽略错误（幂等操作）
                    if (err.response?.status === 400 && 
                        err.response?.data?.message?.includes('already linked')) {
                      // 检查是否是关联到当前费用申请
                      try {
                        const expenseResponse = await apiClient.get(`/expenses/${savedExpenseId}`);
                        const currentInvoiceIds = new Set(
                          (expenseResponse.data?.data?.relatedInvoices || [])
                            .map(inv => (inv._id || inv).toString())
                        );
                        if (currentInvoiceIds.has((invoice._id || invoice.id).toString())) {
                          // 已经关联到当前费用申请，忽略错误
                          continue;
                        }
                      } catch (checkErr) {
                        devError('Failed to check invoice link status:', checkErr);
                      }
                    }
                    // 其他错误显示通知
                    showNotification(
                      `关联发票失败: ${err.response?.data?.message || err.message}`,
                      'warning'
                    );
                  }
                }
              }
            }
          }
        }
        
        // 如果是编辑模式，重新获取最新数据以更新表单
        if (isEdit) {
          // 重新获取费用数据，确保发票关联已更新
          await fetchExpenseData();
          // 同时重新获取发票列表，确保状态同步
          await fetchRelatedInvoices();
        }
        
        showNotification(
          status === 'draft' 
            ? (t('expense.saved') || '费用申请已保存为草稿')
            : (t('expense.submitted') || '费用申请已提交'),
          'success'
        );
        
        // 延迟导航，确保数据已更新
        setTimeout(() => {
        navigate('/expenses');
        }, 100);
      }
    } catch (error) {
      const errorMessage = error.response?.data?.message || error.message || (t('expense.saveError') || '保存费用申请失败');
      showNotification(errorMessage, 'error');
    } finally {
      setSaving(false);
    }
  };

  // 费用项分类到费用分类的映射
  const mapExpenseItemCategoryToExpenseCategory = (expenseItemCategory) => {
    const mapping = {
      'transport': 'transportation',
      'transportation': 'transportation',
      'accommodation': 'accommodation',
      'meal': 'meals',
      'meals': 'meals',
      'entertainment': 'entertainment',
      'communication': 'communication',
      'office_supplies': 'office_supplies',
      'training': 'training',
      'other': 'other',
      'allowance': 'other',
      'general': 'other'
    };
    return mapping[expenseItemCategory] || 'other';
  };

  const handleSubmit = () => handleSave('submitted');

  if (loading || generatingExpenses) {
    return (
      <Container maxWidth="xl">
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mt: 4, gap: 2 }}>
          <CircularProgress />
          {generatingExpenses && (
            <Typography variant="body2" color="text.secondary">
              {t('expense.generatingExpenses') || '正在自动匹配发票并生成费用申请...'}
            </Typography>
          )}
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="xl">
      <Box sx={{ py: 3 }}>
        <Typography variant="h4" gutterBottom>
          {isEdit ? t('expense.editExpense') : t('expense.newExpense')}
        </Typography>

        <Paper sx={{ p: 3 }}>
          <Grid container spacing={3}>
            {/* 差旅单选择（新建时显示选择器，编辑时显示已关联的差旅信息） */}
            <Grid item xs={12}>
              <Typography variant="h6" gutterBottom>
                {isEdit && selectedTravel 
                  ? (t('expense.relatedTravel') || '关联差旅单')
                  : (t('expense.selectTravel') || '选择差旅单')}
              </Typography>
              <Divider sx={{ mb: 2 }} />
            </Grid>
            {!isEdit && (
              <Grid item xs={12} md={6}>
                <Autocomplete
                  options={travelOptions}
                  getOptionLabel={(option) => 
                    `${option.travelNumber || ''} - ${option.title || ''} (${option.employee?.firstName || ''} ${option.employee?.lastName || ''})`
                  }
                  isOptionEqualToValue={(option, value) => {
                    // 使用 _id 进行比较，因为对象结构可能不完全一致
                    return option?._id === value?._id;
                  }}
                  loading={travelLoading}
                  value={selectedTravel}
                  onChange={(event, newValue) => {
                    setSelectedTravel(newValue);
                  }}
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
            {isEdit && selectedTravel && (
              <Grid item xs={12}>
                <Alert severity="info">
                  {t('expense.relatedTravelInfo') || '此费用申请关联了差旅单'}：{selectedTravel.travelNumber || selectedTravel._id}
                </Alert>
              </Grid>
            )}

            {/* 差旅基本信息显示 */}
            {selectedTravel && (
              <>
                <Grid item xs={12}>
                  <Card variant="outlined">
                    <CardContent>
                      <Typography variant="h6" gutterBottom>
                        {t('expense.travelInfo') || '差旅基本信息'}
                      </Typography>
                      <Grid container spacing={2}>
                        <Grid item xs={12} md={6}>
                          <Table size="small">
                            <TableBody>
                              <TableRow>
                                <TableCell><strong>{t('travel.travelNumber') || '差旅单号'}</strong></TableCell>
                                <TableCell>{selectedTravel.travelNumber || '-'}</TableCell>
                              </TableRow>
                              <TableRow>
                                <TableCell><strong>{t('travel.employee') || '申请人'}</strong></TableCell>
                                <TableCell>
                                  {selectedTravel.employee?.firstName || ''} {selectedTravel.employee?.lastName || ''}
                                </TableCell>
                              </TableRow>
                              <TableRow>
                                <TableCell><strong>{t('travel.startDate') || '开始日期'}</strong></TableCell>
                                <TableCell>
                                  {selectedTravel.startDate ? dayjs(selectedTravel.startDate).format('YYYY-MM-DD') : '-'}
                                </TableCell>
                              </TableRow>
                              <TableRow>
                                <TableCell><strong>{t('travel.endDate') || '结束日期'}</strong></TableCell>
                                <TableCell>
                                  {selectedTravel.endDate ? dayjs(selectedTravel.endDate).format('YYYY-MM-DD') : '-'}
                                </TableCell>
                              </TableRow>
                            </TableBody>
                          </Table>
                        </Grid>
                        <Grid item xs={12} md={6}>
                          <Table size="small">
                            <TableBody>
                              <TableRow>
                                <TableCell><strong>{t('travel.destination') || '目的地'}</strong></TableCell>
                                <TableCell>
                                  {typeof selectedTravel.destination === 'object' 
                                    ? selectedTravel.destination?.name || selectedTravel.destinationAddress || '-'
                                    : selectedTravel.destination || selectedTravel.destinationAddress || '-'}
                                </TableCell>
                              </TableRow>
                              <TableRow>
                                <TableCell><strong>{t('travel.purpose') || '出差目的'}</strong></TableCell>
                                <TableCell>{selectedTravel.purpose || selectedTravel.tripDescription || '-'}</TableCell>
                              </TableRow>
                              <TableRow>
                                <TableCell><strong>{t('travel.currency') || '币种'}</strong></TableCell>
                                <TableCell>{selectedTravel.currency || 'USD'}</TableCell>
                              </TableRow>
                              <TableRow>
                                <TableCell><strong>{t('travel.status') || '状态'}</strong></TableCell>
                                <TableCell>
                                  <Chip 
                                    label={selectedTravel.status || 'draft'} 
                                    size="small"
                                    color={selectedTravel.status === 'completed' ? 'success' : 'default'}
                                  />
                                </TableCell>
                              </TableRow>
                            </TableBody>
                          </Table>
                        </Grid>
                      </Grid>
                    </CardContent>
                  </Card>
                </Grid>

                {/* 行程信息显示 */}
                <Grid item xs={12}>
                  <Accordion>
                    <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                      <Typography variant="h6">
                        {t('expense.travelRoutes') || '行程信息'}
                      </Typography>
                    </AccordionSummary>
                    <AccordionDetails>
                      <Grid container spacing={2}>
                        {/* 去程 */}
                        {selectedTravel.outbound && (
                          <Grid item xs={12} md={6}>
                            <Card variant="outlined">
                              <CardContent>
                                <Typography variant="subtitle1" gutterBottom>
                                  {t('travel.outbound') || '去程'}
                                </Typography>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                                  {selectedTravel.outbound.transportation === 'flight' && <FlightIcon />}
                                  {selectedTravel.outbound.transportation === 'train' && <TrainIcon />}
                                  {selectedTravel.outbound.transportation === 'car' && <CarIcon />}
                                  {selectedTravel.outbound.transportation === 'bus' && <BusIcon />}
                                  <Typography variant="body2">
                                    {selectedTravel.outbound.date ? dayjs(selectedTravel.outbound.date).format('YYYY-MM-DD') : '-'}
                                  </Typography>
                                </Box>
                                <Typography variant="body2" color="text.secondary">
                                  {typeof selectedTravel.outbound.departure === 'object' 
                                    ? selectedTravel.outbound.departure?.name || '-'
                                    : selectedTravel.outbound.departure || '-'}
                                  {' → '}
                                  {typeof selectedTravel.outbound.destination === 'object'
                                    ? selectedTravel.outbound.destination?.name || '-'
                                    : selectedTravel.outbound.destination || '-'}
                                </Typography>
                              </CardContent>
                            </Card>
                          </Grid>
                        )}

                        {/* 返程 */}
                        {selectedTravel.inbound && (
                          <Grid item xs={12} md={6}>
                            <Card variant="outlined">
                              <CardContent>
                                <Typography variant="subtitle1" gutterBottom>
                                  {t('travel.inbound') || '返程'}
                                </Typography>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                                  {selectedTravel.inbound.transportation === 'flight' && <FlightIcon />}
                                  {selectedTravel.inbound.transportation === 'train' && <TrainIcon />}
                                  {selectedTravel.inbound.transportation === 'car' && <CarIcon />}
                                  {selectedTravel.inbound.transportation === 'bus' && <BusIcon />}
                                  <Typography variant="body2">
                                    {selectedTravel.inbound.date ? dayjs(selectedTravel.inbound.date).format('YYYY-MM-DD') : '-'}
                                  </Typography>
                                </Box>
                                <Typography variant="body2" color="text.secondary">
                                  {typeof selectedTravel.inbound.departure === 'object'
                                    ? selectedTravel.inbound.departure?.name || '-'
                                    : selectedTravel.inbound.departure || '-'}
                                  {' → '}
                                  {typeof selectedTravel.inbound.destination === 'object'
                                    ? selectedTravel.inbound.destination?.name || '-'
                                    : selectedTravel.inbound.destination || '-'}
                                </Typography>
                              </CardContent>
                            </Card>
                          </Grid>
                        )}

                        {/* 多程行程 */}
                        {selectedTravel.multiCityRoutes && selectedTravel.multiCityRoutes.length > 0 && (
                          <Grid item xs={12}>
                            <Typography variant="subtitle1" gutterBottom>
                              {t('travel.multiCityRoutes') || '多程行程'}
                            </Typography>
                            {selectedTravel.multiCityRoutes.map((route, index) => (
                              <Card key={`multiCity-${index}-${route.date || index}`} variant="outlined" sx={{ mb: 1 }}>
                                <CardContent>
                                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                                    {route.transportation === 'flight' && <FlightIcon />}
                                    {route.transportation === 'train' && <TrainIcon />}
                                    {route.transportation === 'car' && <CarIcon />}
                                    {route.transportation === 'bus' && <BusIcon />}
                                    <Typography variant="body2">
                                      {route.date ? dayjs(route.date).format('YYYY-MM-DD') : '-'}
                                    </Typography>
                                  </Box>
                                  <Typography variant="body2" color="text.secondary">
                                    {typeof route.departure === 'object'
                                      ? route.departure?.name || '-'
                                      : route.departure || '-'}
                                    {' → '}
                                    {typeof route.destination === 'object'
                                      ? route.destination?.name || '-'
                                      : route.destination || '-'}
                                  </Typography>
                                </CardContent>
                              </Card>
                            ))}
                          </Grid>
                        )}
                      </Grid>
                    </AccordionDetails>
                  </Accordion>
                </Grid>

                {/* 费用项发票管理（新建和编辑模式都显示，如果关联了差旅单） */}
                {selectedTravel && extractExpenseBudgets(selectedTravel).length > 0 && (
                  <Grid item xs={12}>
                    <Typography variant="h6" gutterBottom>
                      {t('expense.expenseItemsInvoices') || '费用项发票管理'}
                    </Typography>
                    <Divider sx={{ mb: 2 }} />
                    {mergeExpenseBudgetsByItem(extractExpenseBudgets(selectedTravel)).map((mergedBudget) => {
                      // 确保正确获取发票列表，支持字符串和对象 ID
                      const expenseItemId = mergedBudget.expenseItemId?.toString() || mergedBudget.expenseItemId;
                      
                      // 正确查找费用项，支持字符串和对象 ID 的比较
                      const expenseItem = expenseItems.find(item => {
                        const itemId = item._id?.toString() || item._id;
                        return itemId === expenseItemId || itemId === mergedBudget.expenseItemId?.toString() || itemId === mergedBudget.expenseItemId;
                      });
                      
                      const itemInvoices = (expenseItemInvoices[expenseItemId] || expenseItemInvoices[mergedBudget.expenseItemId] || []).filter(Boolean);
                      
                      // 格式化预算明细标签
                      const budgetDetails = mergedBudget.budgets.map((budget) => {
                        const routeLabel = budget.route === 'outbound' ? t('travel.outbound') || '去程' :
                                         budget.route === 'inbound' ? t('travel.inbound') || '返程' :
                                         budget.route.startsWith('multiCity-') ? 
                                         `${t('travel.multiCity') || '多程'}${parseInt(budget.route.replace('multiCity-', '')) + 1}` :
                                         budget.route;
                        return `${routeLabel}：${selectedTravel.currency} ${budget.amount?.toLocaleString() || 0}`;
                      });
                      
                      return (
                        <Accordion key={mergedBudget.expenseItemId} sx={{ mb: 2 }}>
                          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', pr: 2 }}>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap', flex: 1 }}>
                                <Typography variant="subtitle1">
                                  {expenseItem?.itemName || t('expense.form.unknownExpenseItem') || '未知费用项'}
                                </Typography>
                                {budgetDetails.length > 0 && (
                                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                                    {budgetDetails.map((detail, index) => (
                                      <Typography key={index} variant="caption" color="text.secondary">
                                        {detail}
                                      </Typography>
                                    ))}
                                  </Box>
                                )}
                              </Box>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <Chip 
                                  label={`${selectedTravel.currency} ${mergedBudget.totalAmount?.toLocaleString() || 0}`}
                                  size="small"
                                  variant="outlined"
                                  color="info"
                                />
                                <Chip 
                                  label={`${itemInvoices.length} ${t('common.sheet') || '张'}发票`}
                                  size="small"
                                  color={itemInvoices.length > 0 ? 'primary' : 'default'}
                                />
                              </Box>
                            </Box>
                          </AccordionSummary>
                          <AccordionDetails>
                            <Box sx={{ mb: 2 }}>
                              <Grid container spacing={2}>
                                <Grid item xs={12} sx={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center' }}>
                                  <Button
                                    startIcon={<AddIcon />}
                                    onClick={() => setExpenseItemInvoiceDialogs(prev => ({
                                      ...prev,
                                      [mergedBudget.expenseItemId]: true
                                    }))}
                                    variant="outlined"
                                    size="small"
                                  >
                                    {t('expense.addInvoices') || '添加发票'}
                                  </Button>
                                </Grid>
                              </Grid>
                            </Box>
                            
                            {itemInvoices.length > 0 ? (
                              <Box>
                                {itemInvoices.map((invoice) => {
                                  const invoiceId = invoice._id || invoice.id;
                                  return (
                                    <Box
                                      key={invoiceId}
                                      sx={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 2,
                                        p: 1.5,
                                        borderBottom: '1px solid',
                                        borderColor: 'divider',
                                        '&:last-child': {
                                          borderBottom: 'none'
                                        }
                                      }}
                                    >
                                      <Avatar sx={{ bgcolor: 'primary.main', width: 32, height: 32, flexShrink: 0 }}>
                                        <ReceiptIcon fontSize="small" />
                                      </Avatar>
                                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flex: 1, minWidth: 0 }}>
                                        <Box sx={{ width: 150, flexShrink: 0 }}>
                                          <Typography variant="body2" fontWeight={600} noWrap>
                                            {invoice.invoiceNumber || t('invoice.noNumber') || '无发票号'}
                                          </Typography>
                                        </Box>
                                        <Box sx={{ width: 200, flexShrink: 0 }}>
                                          <Chip
                                            label={invoice.vendor?.name || '-'}
                                            size="small"
                                            variant="outlined"
                                          />
                                        </Box>
                                        <Box sx={{ width: 120, flexShrink: 0 }}>
                                          <Typography variant="body2" color="text.secondary" noWrap>
                                            {invoice.currency || 'CNY'} {(invoice.totalAmount || invoice.amount || 0).toLocaleString()}
                                          </Typography>
                                        </Box>
                                        <Box sx={{ width: 100, flexShrink: 0 }}>
                                          <Typography variant="body2" color="text.secondary" noWrap>
                                            {invoice.invoiceDate ? dayjs(invoice.invoiceDate).format('YYYY-MM-DD') : '-'}
                                          </Typography>
                                        </Box>
                                        <Box sx={{ ml: 'auto', flexShrink: 0 }}>
                                          <IconButton
                                            onClick={() => handleRemoveInvoiceFromExpenseItem(mergedBudget.expenseItemId, invoiceId)}
                                            color="error"
                                            size="small"
                                          >
                                            <DeleteIcon />
                                          </IconButton>
                                        </Box>
                                      </Box>
                                    </Box>
                                  );
                                })}
                              </Box>
                            ) : (
                              <Box sx={{ py: 2, textAlign: 'center', color: 'text.secondary' }}>
                                <Typography variant="body2">
                                  {t('expense.noInvoicesForExpenseItem') || '暂无发票'}
                                </Typography>
                              </Box>
                            )}
                            
                            {/* 发票金额和报销金额 */}
                            {itemInvoices.length > 0 && (
                              <Box sx={{ 
                                mt: 2, 
                                pt: 2, 
                                borderTop: '1px solid', 
                                borderColor: 'divider',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'flex-end',
                                gap: 3
                              }}>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                  <Typography variant="body2" color="text.secondary">
                                    {t('expense.invoiceTotalAmount') || '发票金额'}：
                                  </Typography>
                                  <Typography variant="body2" fontWeight={600}>
                                    {selectedTravel.currency} {(() => {
                                      const totalAmount = itemInvoices.reduce((sum, inv) => {
                                        const amount = inv.totalAmount || inv.amount || 0;
                                        return sum + amount;
                                      }, 0);
                                      return totalAmount.toLocaleString();
                                    })()}
                                  </Typography>
                                </Box>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                  <Typography variant="body2" color="text.secondary">
                                    {t('expense.reimbursementAmount') || '报销金额'}：
                                  </Typography>
                                  <TextField
                                    size="small"
                                    type="number"
                                    value={(() => {
                                      // 计算发票总金额
                                      const totalAmount = itemInvoices.reduce((sum, inv) => {
                                        const amount = inv.totalAmount || inv.amount || 0;
                                        return sum + amount;
                                      }, 0);
                                      
                                      // 优先使用已设置的报销金额，支持字符串和对象ID格式
                                      const reimbursementAmount = expenseItemReimbursementAmounts[expenseItemId] ?? 
                                                                  expenseItemReimbursementAmounts[mergedBudget.expenseItemId?.toString()] ??
                                                                  expenseItemReimbursementAmounts[mergedBudget.expenseItemId];
                                      
                                      // 如果报销金额已设置，使用已设置的值
                                      if (reimbursementAmount !== undefined && reimbursementAmount !== null) {
                                        return reimbursementAmount;
                                      }
                                      
                                      // 如果报销金额未设置，但有发票，立即设置报销金额为发票总金额
                                      if (totalAmount > 0) {
                                        // 使用 useEffect 的依赖来触发更新，避免在渲染时直接修改状态
                                        // 这里先返回发票总金额，useEffect 会在下次渲染时设置
                                        // 但为了确保立即生效，我们使用 useRef 来跟踪是否已经设置
                                        const shouldSet = !expenseItemReimbursementAmounts[expenseItemId] && 
                                                         !expenseItemReimbursementAmounts[mergedBudget.expenseItemId?.toString()] &&
                                                         !expenseItemReimbursementAmounts[mergedBudget.expenseItemId];
                                        
                                        if (shouldSet) {
                                          // 使用 setTimeout 异步设置，避免在渲染时修改状态
                                          setTimeout(() => {
                                            setExpenseItemReimbursementAmounts(prev => {
                                              // 再次检查是否已经设置（避免重复设置）
                                              const current = prev[expenseItemId] ?? 
                                                             prev[mergedBudget.expenseItemId?.toString()] ??
                                                             prev[mergedBudget.expenseItemId];
                                              if (current === undefined || current === null) {
                                                const updated = {
                                                  ...prev,
                                                  [expenseItemId]: totalAmount
                                                };
                                                // 同时设置其他格式的键
                                                if (mergedBudget.expenseItemId?.toString() && mergedBudget.expenseItemId.toString() !== expenseItemId) {
                                                  updated[mergedBudget.expenseItemId.toString()] = totalAmount;
                                                }
                                                if (mergedBudget.expenseItemId && mergedBudget.expenseItemId !== expenseItemId && mergedBudget.expenseItemId.toString() !== expenseItemId) {
                                                  updated[mergedBudget.expenseItemId] = totalAmount;
                                                }
                                                return updated;
                                              }
                                              return prev;
                                            });
                                          }, 0);
                                        }
                                      }
                                      
                                      // 返回发票总金额作为默认值
                                      return totalAmount;
                                    })()}
                                    onChange={(e) => {
                                      const value = parseFloat(e.target.value) || 0;
                                      // 同时更新字符串和对象ID格式的键，确保一致性
                                      setExpenseItemReimbursementAmounts(prev => {
                                        const updated = {
                                          ...prev,
                                          [expenseItemId]: value
                                        };
                                        // 如果 expenseItemId 和 mergedBudget.expenseItemId 不同，也更新原键
                                        if (expenseItemId !== mergedBudget.expenseItemId?.toString() && 
                                            expenseItemId !== mergedBudget.expenseItemId) {
                                          updated[mergedBudget.expenseItemId?.toString()] = value;
                                          updated[mergedBudget.expenseItemId] = value;
                                        }
                                        return updated;
                                      });
                                    }}
                                    InputProps={{
                                      startAdornment: (
                                        <InputAdornment position="start">
                                          <Typography variant="body2" color="text.secondary">
                                            {selectedTravel.currency}
                                          </Typography>
                                        </InputAdornment>
                                      ),
                                    }}
                                    sx={{ 
                                      width: 150,
                                      '& .MuiInputBase-root': {
                                        height: '21px'
                                      },
                                      '& .MuiInputBase-input': {
                                        padding: '4px 10px',
                                        fontSize: '0.8125rem'
                                      },
                                      '& .MuiInputAdornment-root': {
                                        marginLeft: '8px',
                                        '& .MuiTypography-root': {
                                          fontSize: '0.8125rem'
                                        }
                                      }
                                    }}
                                  />
                                </Box>
                              </Box>
                            )}
                            
                            {/* 费用项发票选择对话框 */}
                            <InvoiceSelectDialog
                              open={expenseItemInvoiceDialogs[mergedBudget.expenseItemId] || false}
                              onClose={() => setExpenseItemInvoiceDialogs(prev => ({
                                ...prev,
                                [mergedBudget.expenseItemId]: false
                              }))}
                              onConfirm={(selectedInvoices) => handleAddInvoicesForExpenseItem(mergedBudget.expenseItemId, selectedInvoices)}
                              excludeInvoiceIds={itemInvoices.map(inv => inv._id || inv.id).filter(Boolean)}
                              linkedInvoices={itemInvoices}
                            />
                          </AccordionDetails>
                        </Accordion>
                      );
                    })}
                  </Grid>
                )}
              </>
            )}

            {/* Basic Information */}
            <Grid item xs={12}>
              <Typography variant="h6" gutterBottom>
                {t('expense.detail.expenseInformation')}
              </Typography>
              <Divider sx={{ mb: 2 }} />
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label={`${t('expense.title')} *`}
                value={formData.title}
                onChange={(e) => handleChange('title', e.target.value)}
                error={!!errors.title}
                helperText={errors.title}
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>{t('user.currency')} *</InputLabel>
                <Select
                  value={formData.currency}
                  label={`${t('user.currency')} *`}
                  onChange={(e) => handleChange('currency', e.target.value)}
                >
                  {currencies.map((currency) => (
                    <MenuItem key={currency.value} value={currency.value}>
                      {currency.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>{t('expense.costCenter')}</InputLabel>
                <Select
                  value={formData.costCenter}
                  label={t('expense.costCenter')}
                  onChange={(e) => handleChange('costCenter', e.target.value)}
                >
                  {costCenters.map((center) => (
                    <MenuItem key={center} value={center}>
                      {center}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={3}
                label={t('expense.description')}
                value={formData.description}
                onChange={(e) => handleChange('description', e.target.value)}
                placeholder={t('placeholders.describeExpense')}
              />
            </Grid>

            {/* Category */}
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>{t('expense.category')} *</InputLabel>
                <Select
                  value={formData.category}
                  label={`${t('expense.category')} *`}
                  onChange={(e) => {
                    handleChange('category', e.target.value);
                    handleChange('subcategory', ''); // Reset subcategory
                  }}
                  error={!!errors.category}
                >
                  {categories.map((category) => (
                    <MenuItem key={category.value} value={category.value}>
                      {category.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>{t('expense.subcategory')}</InputLabel>
                <Select
                  value={formData.subcategory}
                  label={t('expense.subcategory')}
                  onChange={(e) => handleChange('subcategory', e.target.value)}
                  disabled={!formData.category}
                >
                  {formData.category && subcategories[formData.category]?.map((sub) => (
                    <MenuItem key={sub} value={sub}>
                      {sub}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            {/* 预算金额、发票金额、核销金额（仅当关联差旅单时显示） */}
            {selectedTravel && extractExpenseBudgets(selectedTravel).length > 0 && (
              <>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label={t('expense.budgetAmount') || '预算金额'}
                    value={calculatedAmounts.budgetAmount.toLocaleString()}
                    InputProps={{
                      readOnly: true,
                      startAdornment: (
                        <InputAdornment position="start">
                          <Typography variant="body2" color="text.secondary">
                            {selectedTravel.currency}
                          </Typography>
                        </InputAdornment>
                      ),
                    }}
                    sx={{
                      '& .MuiInputBase-input': {
                        color: 'text.primary',
                        fontWeight: 500
                      }
                    }}
                  />
                </Grid>

                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label={t('expense.invoiceAmount') || '发票金额'}
                    value={calculatedAmounts.invoiceAmount.toLocaleString()}
                    InputProps={{
                      readOnly: true,
                      startAdornment: (
                        <InputAdornment position="start">
                          <Typography variant="body2" color="text.secondary">
                            {selectedTravel.currency}
                          </Typography>
                        </InputAdornment>
                      ),
                    }}
                    sx={{
                      '& .MuiInputBase-input': {
                        color: 'text.primary',
                        fontWeight: 500
                      }
                    }}
                  />
                </Grid>

                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label={t('expense.reimbursementAmount') || '核销金额'}
                    value={calculatedAmounts.reimbursementAmount.toLocaleString()}
                    InputProps={{
                      readOnly: true,
                      startAdornment: (
                        <InputAdornment position="start">
                          <Typography variant="body2" color="text.secondary">
                            {selectedTravel.currency}
                          </Typography>
                        </InputAdornment>
                      ),
                    }}
                    sx={{
                      '& .MuiInputBase-input': {
                        color: 'text.primary',
                        fontWeight: 500
                      }
                    }}
                  />
                </Grid>
              </>
            )}

            {/* Date and Vendor */}
            <Grid item xs={12} md={6}>
              <DatePicker
                label={`${t('expense.date')} *`}
                value={formData.date}
                onChange={(date) => {
                  // 用户手动修改日期时，标记为已手动编辑，之后不再被差旅/发票自动覆盖
                  setIsDateManuallyEdited(true);
                  handleChange('date', date);
                }}
                slotProps={{
                  textField: {
                    fullWidth: true,
                    error: !!errors.date,
                    helperText: errors.date
                  }
                }}
              />
            </Grid>

            {/* Tags */}
            <Grid item xs={12}>
              <Autocomplete
                multiple
                freeSolo
                options={commonTags}
                value={formData.tags}
                onChange={(event, newValue) => handleChange('tags', newValue)}
                renderTags={(value, getTagProps) =>
                  value.map((option, index) => (
                    <Chip
                      variant="outlined"
                      label={option}
                      {...getTagProps({ index })}
                      key={option}
                    />
                  ))
                }
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label={t('expense.tagsLabel')}
                    placeholder={t('expense.addTags')}
                  />
                )}
              />
            </Grid>

            {/* Related Invoices - 仅在编辑模式且没有关联差旅单时显示 */}
            {isEdit && !selectedTravel && (
              <>
                <Grid item xs={12}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 2 }}>
                    <Typography variant="h6">
                      {t('expense.relatedInvoices') || '关联发票'}
                    </Typography>
                    <Button
                      startIcon={<AddIcon />}
                      onClick={() => setInvoiceSelectDialogOpen(true)}
                      variant="outlined"
                      size="small"
                    >
                      {t('expense.addInvoices') || '从发票夹添加发票'}
                    </Button>
                  </Box>
                  <Divider sx={{ mb: 2 }} />
                </Grid>

                {invoicesLoading ? (
                  <Grid item xs={12}>
                    <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
                      <CircularProgress size={24} />
                    </Box>
                  </Grid>
                ) : relatedInvoices.length > 0 ? (
                  <Grid item xs={12}>
                    <List>
                      {relatedInvoices.map((invoice) => {
                        const invoiceId = invoice._id || invoice.id || invoice;
                        return (
                        <ListItem key={invoiceId} divider>
                          <ListItemIcon>
                            <Avatar sx={{ bgcolor: 'primary.main' }}>
                              <ReceiptIcon />
                            </Avatar>
                          </ListItemIcon>
                          <ListItemText
                            primaryTypographyProps={{ component: 'div' }}
                            secondaryTypographyProps={{ component: 'div' }}
                            primary={
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <Typography variant="body2" fontWeight={600}>
                                  {invoice.invoiceNumber || t('invoice.noNumber') || '无发票号'}
                                </Typography>
                                <Chip
                                  label={invoice.vendor?.name || '-'}
                                  size="small"
                                  variant="outlined"
                                />
                              </Box>
                            }
                            secondary={
                              <Box sx={{ mt: 0.5 }}>
                                <Typography variant="caption" color="text.secondary" sx={{ mr: 2 }}>
                                  {invoice.currency} {invoice.totalAmount?.toLocaleString() || invoice.amount?.toLocaleString() || 0}
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                  {invoice.invoiceDate ? dayjs(invoice.invoiceDate).format('YYYY-MM-DD') : '-'}
                                </Typography>
                              </Box>
                            }
                          />
                          <IconButton
                            onClick={() => handleRemoveInvoice(invoiceId)}
                            color="error"
                            size="small"
                          >
                            <DeleteIcon />
                          </IconButton>
                        </ListItem>
                        );
                      })}
                    </List>
                  </Grid>
                ) : (
                  <Grid item xs={12}>
                    <Box sx={{ py: 2, textAlign: 'center', color: 'text.secondary' }}>
                      <Typography variant="body2">
                        {t('expense.noRelatedInvoices') || '暂无关联发票'}
                      </Typography>
                    </Box>
                  </Grid>
                )}
              </>
            )}

            {/* Receipts */}
            <Grid item xs={12}>
              <Box sx={{ mt: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                  <Typography variant="h6">
                    {t('expense.receipts')}
                  </Typography>
                  <Button
                    startIcon={<UploadIcon />}
                    onClick={() => setUploadDialogOpen(true)}
                    variant="outlined"
                    size="small"
                  >
                    {t('expense.uploadReceipts')}
                  </Button>
                </Box>
                <Divider sx={{ mb: 2 }} />
              </Box>
            </Grid>

            {formData.receipts.length > 0 && (
              <Grid item xs={12}>
                <List>
                  {formData.receipts.map((receipt, index) => (
                    <ListItem key={index} divider>
                      <ListItemIcon>
                        <Avatar sx={{ bgcolor: 'primary.main' }}>
                          <ReceiptIcon />
                        </Avatar>
                      </ListItemIcon>
                      <ListItemText
                        primary={receipt.originalName}
                        secondary={`${(receipt.size / 1024 / 1024).toFixed(2)} MB • ${dayjs(receipt.uploadedAt).format('MMM DD, YYYY')}`}
                      />
                      <IconButton
                        onClick={() => removeReceipt(index)}
                        color="error"
                        size="small"
                      >
                        <DeleteIcon />
                      </IconButton>
                    </ListItem>
                  ))}
                </List>
              </Grid>
            )}

            {/* Action Buttons */}
            <Grid item xs={12}>
              <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end', mt: 3 }}>
                <Button
                  variant="outlined"
                  onClick={() => navigate('/expenses')}
                  disabled={saving}
                >
                  {t('common.cancel')}
                </Button>
                <Button
                  variant="contained"
                  startIcon={<SaveIcon />}
                  onClick={() => handleSave('draft')}
                  disabled={saving}
                >
                  {saving ? <CircularProgress size={20} /> : t('expense.saveDraft')}
                </Button>
                <Button
                  variant="contained"
                  color="primary"
                  startIcon={<SendIcon />}
                  onClick={handleSubmit}
                  disabled={saving}
                >
                  {saving ? <CircularProgress size={20} /> : t('expense.submitExpense')}
                </Button>
              </Box>
            </Grid>
          </Grid>
        </Paper>

        {/* File Upload Dialog */}
        <Dialog
          open={uploadDialogOpen}
          onClose={() => setUploadDialogOpen(false)}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle>{t('dialogs.uploadReceipts')}</DialogTitle>
          <DialogContent>
            <Box sx={{ textAlign: 'center', py: 3 }}>
              <input
                accept="image/*,.pdf"
                style={{ display: 'none' }}
                id="receipt-upload"
                multiple
                type="file"
                onChange={handleFileUpload}
              />
              <label htmlFor="receipt-upload">
                <Button
                  variant="contained"
                  component="span"
                  startIcon={<UploadIcon />}
                  size="large"
                >
                  {t('expense.chooseFiles')}
                </Button>
              </label>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                {t('expense.supportedFormats')}
              </Typography>
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setUploadDialogOpen(false)}>
              {t('common.cancel')}
            </Button>
          </DialogActions>
        </Dialog>

        {/* Invoice Select Dialog */}
        {isEdit && (
          <InvoiceSelectDialog
            open={invoiceSelectDialogOpen}
            onClose={() => setInvoiceSelectDialogOpen(false)}
            onConfirm={handleAddInvoices}
            excludeInvoiceIds={relatedInvoices.map(inv => {
              const id = inv._id || inv.id || inv;
              return id ? id.toString() : null;
            }).filter(Boolean)}
            linkedInvoices={relatedInvoices}
          />
        )}

        {/* Expense Select Dialog - 当有多个自动生成的费用申请时显示 */}
        <ExpenseSelectDialog
          open={expenseSelectDialogOpen}
          onClose={() => setExpenseSelectDialogOpen(false)}
          expenses={generatedExpenses}
          onSelect={handleSelectExpense}
        />
      </Box>
    </Container>
  );
};

export default ExpenseForm;
