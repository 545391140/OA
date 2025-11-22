import React, { useState, useEffect } from 'react';
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
  Person as PersonIcon,
  CalendarToday as CalendarIcon,
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
import dayjs from 'dayjs';

const ExpenseForm = () => {
  const { t } = useTranslation();
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
    isBillable: false,
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

  const currencies = [
    { value: 'USD', label: 'USD - US Dollar' },
    { value: 'CNY', label: 'CNY - Chinese Yuan' },
    { value: 'JPY', label: 'JPY - Japanese Yen' },
    { value: 'KRW', label: 'KRW - Korean Won' },
    { value: 'EUR', label: 'EUR - Euro' }
  ];

  const categories = [
    { value: 'transportation', label: 'Transportation' },
    { value: 'accommodation', label: 'Accommodation' },
    { value: 'meals', label: 'Meals' },
    { value: 'entertainment', label: 'Entertainment' },
    { value: 'communication', label: 'Communication' },
    { value: 'office_supplies', label: 'Office Supplies' },
    { value: 'training', label: 'Training' },
    { value: 'other', label: 'Other' }
  ];

  const subcategories = {
    transportation: [
      'Flight', 'Train', 'Taxi', 'Rental Car', 'Public Transport', 'Parking', 'Fuel'
    ],
    accommodation: [
      'Hotel', 'Airbnb', 'Hostel', 'Apartment Rental'
    ],
    meals: [
      'Breakfast', 'Lunch', 'Dinner', 'Coffee/Tea', 'Snacks', 'Business Meal'
    ],
    entertainment: [
      'Client Entertainment', 'Team Building', 'Conference', 'Event'
    ],
    communication: [
      'Phone', 'Internet', 'Mobile Data', 'Postage', 'Courier'
    ],
    office_supplies: [
      'Stationery', 'Printing', 'Software', 'Hardware', 'Books'
    ],
    training: [
      'Course', 'Workshop', 'Certification', 'Conference', 'Online Training'
    ],
    other: [
      'Miscellaneous', 'Bank Fees', 'Insurance', 'Medical', 'Other'
    ]
  };

  const projects = [
    'Project Alpha',
    'Project Beta',
    'Project Gamma',
    'Client A Engagement',
    'Client B Engagement',
    'Internal Development'
  ];

  const costCenters = [
    'Sales',
    'Marketing',
    'Engineering',
    'Operations',
    'HR',
    'Finance',
    'Legal'
  ];

  const clients = [
    'Client A',
    'Client B',
    'Client C',
    'Internal',
    'Prospect A',
    'Prospect B'
  ];

  const commonTags = [
    'urgent',
    'client-related',
    'travel',
    'training',
    'equipment',
    'software',
    'hardware',
    'meeting',
    'conference'
  ];

  useEffect(() => {
    if (isEdit) {
      fetchExpenseData();
      // 编辑模式下也加载差旅单列表（用于 Autocomplete）
      fetchTravelOptions();
    } else if (travelId) {
      // 如果是从差旅页面跳转过来的，自动生成费用申请
      generateExpensesFromTravel();
    } else {
      // 新建费用申请时，加载差旅单列表和费用项列表
      fetchTravelOptions();
      fetchExpenseItemsList();
    }
  }, [id, isEdit, travelId]);

  useEffect(() => {
    if (selectedTravel) {
      loadTravelInfo(selectedTravel);
    }
  }, [selectedTravel]);

  // 编辑模式下，如果费用申请关联了差旅单，加载差旅信息
  useEffect(() => {
    if (isEdit && id && formData.travel) {
      loadTravelInfoById(formData.travel);
    }
  }, [isEdit, id, formData.travel]);

  useEffect(() => {
    if (isEdit && id) {
      fetchRelatedInvoices();
    }
  }, [id, isEdit]);

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
            t('travel.detail.expenses.generateSuccess') || `成功生成 ${generatedCount} 个费用申请`,
            'success'
          );
          
          // 获取费用申请的详细信息
          const expensesWithDetails = await Promise.all(
            expenses.map(async (expense) => {
              try {
                const detailResponse = await apiClient.get(`/expenses/${expense._id}`);
                return detailResponse.data?.data || expense;
              } catch (err) {
                console.error(`Failed to fetch expense ${expense._id}:`, err);
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
      console.error('Failed to generate expenses from travel:', error);
      console.error('Error details:', error.response?.data);
      
      // 如果已经生成过，尝试获取已生成的费用申请列表
      if (error.response?.status === 400 && error.response?.data?.data?.expenses) {
        const existingExpenses = error.response.data.data.expenses;
        if (existingExpenses.length > 0) {
          // 获取费用申请的详细信息
          const expensesWithDetails = await Promise.all(
            existingExpenses.map(async (expenseId) => {
              try {
                const detailResponse = await apiClient.get(`/expenses/${expenseId}`);
                return detailResponse.data?.data;
              } catch (err) {
                console.error(`Failed to fetch expense ${expenseId}:`, err);
                return null;
              }
            })
          );
          
          const validExpenses = expensesWithDetails.filter(exp => exp !== null);
          setGeneratedExpenses(validExpenses);
          
          if (validExpenses.length === 1) {
            // 如果只有一个费用申请，直接加载到表单中
            loadExpenseToForm(validExpenses[0]);
          } else if (validExpenses.length > 1) {
            // 如果有多个费用申请，显示选择对话框
            setExpenseSelectDialogOpen(true);
          } else {
            showNotification(
              t('travel.detail.expenses.alreadyGenerated') || '费用申请已生成',
              'info'
            );
          }
          return;
        }
      }
      // 显示详细的错误信息
      const errorMessage = error.response?.data?.message || 
                          error.message || 
                          t('travel.detail.expenses.generateError') || 
                          '生成费用申请失败';
      showNotification(errorMessage, 'error');
      
      // 如果是服务器错误，记录详细信息
      if (error.response?.status >= 500) {
        console.error('Server error details:', {
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
      isBillable: expenseData.isBillable || false,
      client: expenseData.client || '',
      tags: expenseData.tags || [],
      notes: expenseData.notes || '',
      receipts: expenseData.receipts || []
    });
    setRelatedInvoices(expenseData.relatedInvoices || []);
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
      console.error('Failed to fetch travel options:', error);
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
      console.error('Failed to fetch expense items:', error);
    } finally {
      setExpenseItemsLoading(false);
    }
  };

  // 加载差旅信息
  const loadTravelInfo = async (travel) => {
    try {
      const response = await apiClient.get(`/travel/${travel._id || travel}`);
      if (response.data && response.data.success) {
        const travelData = response.data.data;
        setSelectedTravel(travelData);
        
        // 填充表单基本信息
        setFormData(prev => ({
          ...prev,
          travel: travelData._id,
          currency: travelData.currency || prev.currency,
          date: travelData.endDate ? dayjs(travelData.endDate) : prev.date,
          title: travelData.title || `${travelData.travelNumber || ''} 费用申请`,
          description: travelData.purpose || travelData.tripDescription || prev.description
        }));

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
      }
    } catch (error) {
      console.error('Failed to load travel info:', error);
      showNotification('加载差旅信息失败', 'error');
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

  // 为费用项添加发票
  const handleAddInvoicesForExpenseItem = (expenseItemId, selectedInvoices) => {
    if (!selectedInvoices || selectedInvoices.length === 0) {
      return;
    }
    
    // 确保 expenseItemId 是字符串格式，用于状态键
    const expenseItemIdStr = expenseItemId?.toString() || expenseItemId;
    
    // 确保选中的发票对象包含必要的字段，创建新对象避免直接修改
    const invoicesToAdd = selectedInvoices.map(invoice => {
      // 创建新对象，确保有 _id 字段
      const invoiceId = invoice._id || invoice.id;
      return {
        ...invoice,
        _id: invoiceId,
        id: invoiceId
      };
    });
    
    setExpenseItemInvoices(prev => {
      // 尝试两种键格式
      const currentInvoices = prev[expenseItemIdStr] || prev[expenseItemId] || [];
      
      // 避免重复添加相同的发票
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
      setExpenseItemReimbursementAmounts(prevAmounts => {
        const currentReimbursement = prevAmounts[expenseItemIdStr] ?? prevAmounts[expenseItemId];
        
        // 如果报销金额还没有设置，或者当前报销金额等于之前的发票总金额，则自动更新
        if (currentReimbursement === undefined || currentReimbursement === previousTotal) {
          return {
            ...prevAmounts,
            [expenseItemIdStr]: totalAmount
          };
        }
        return prevAmounts;
      });
      
      return newState;
    });
    
    setExpenseItemInvoiceDialogs(prev => ({
      ...prev,
      [expenseItemIdStr]: false,
      [expenseItemId]: false
    }));
    
    showNotification(`成功为费用项添加 ${invoicesToAdd.length} 张发票`, 'success');
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
    
    showNotification('发票已移除', 'success');
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
          isBillable: expenseData.isBillable || false,
          client: expenseData.client || '',
          tags: expenseData.tags || [],
          notes: expenseData.notes || '',
          receipts: expenseData.receipts || [],
          travel: expenseData.travel?._id || expenseData.travel || null
        });
        // 后端已经populate了relatedInvoices，直接使用
        setRelatedInvoices(expenseData.relatedInvoices || []);
        
        // 如果关联了差旅单，加载差旅信息
        if (expenseData.travel) {
          const travelId = expenseData.travel._id || expenseData.travel;
          await loadTravelInfoById(travelId);
        }
        
        // 如果关联了费用项，初始化费用项发票管理
        if (expenseData.expenseItem) {
          const expenseItemId = expenseData.expenseItem._id || expenseData.expenseItem;
          const expenseItemIdStr = expenseItemId?.toString() || expenseItemId;
          setExpenseItemInvoices(prev => ({
            ...prev,
            [expenseItemIdStr]: expenseData.relatedInvoices || []
          }));
        }
        
        // 加载费用项列表（用于显示费用项名称）
        await fetchExpenseItemsList();
      }
    } catch (error) {
      console.error('Failed to load expense data:', error);
      showNotification('Failed to load expense data', 'error');
    } finally {
      setLoading(false);
    }
  };

  // 根据ID加载差旅信息（用于编辑模式）
  const loadTravelInfoById = async (travelId) => {
    try {
      const response = await apiClient.get(`/travel/${travelId}`);
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
      console.error('Failed to load travel info:', error);
    }
  };

  const fetchRelatedInvoices = async () => {
    try {
      setInvoicesLoading(true);
      const response = await apiClient.get(`/expenses/${id}`);
      if (response.data && response.data.success) {
        // 后端已经populate了relatedInvoices，直接使用
        setRelatedInvoices(response.data.data.relatedInvoices || []);
      }
    } catch (error) {
      console.error('Failed to load related invoices:', error);
    } finally {
      setInvoicesLoading(false);
    }
  };

  const handleAddInvoices = async (selectedInvoices) => {
    try {
      for (const invoice of selectedInvoices) {
        await apiClient.post(`/expenses/${id}/link-invoice`, {
          invoiceId: invoice._id
        });
      }
      showNotification(
        t('expense.invoices.added') || `成功关联 ${selectedInvoices.length} 张发票`,
        'success'
      );
      await fetchRelatedInvoices();
    } catch (error) {
      console.error('Failed to link invoices:', error);
      showNotification(
        error.response?.data?.message || t('expense.invoices.addError') || '关联发票失败',
        'error'
      );
    }
  };

  const handleRemoveInvoice = async (invoiceId) => {
    try {
      await apiClient.delete(`/expenses/${id}/unlink-invoice/${invoiceId}`);
      showNotification(t('expense.invoices.removed') || '取消关联成功', 'success');
      await fetchRelatedInvoices();
    } catch (error) {
      console.error('Failed to unlink invoice:', error);
      showNotification(t('expense.invoices.removeError') || '取消关联失败', 'error');
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
    showNotification(`${files.length} file(s) uploaded successfully`, 'success');
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
      newErrors.title = 'Title is required';
    }

    if (!formData.category) {
      newErrors.category = 'Category is required';
    }

    if (!formData.amount || formData.amount <= 0) {
      newErrors.amount = t('validation.validAmountRequired');
    }

    if (!formData.date) {
      newErrors.date = 'Date is required';
    }

    if (!formData.vendor.name.trim()) {
      newErrors.vendorName = 'Vendor name is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async (status = 'draft') => {
    if (!validateForm()) {
      return;
    }

    try {
      setSaving(true);
      
      // 如果选择了差旅单且有费用项发票，为每个费用项创建费用申请
      if (selectedTravel && !isEdit) {
        const budgets = extractExpenseBudgets(selectedTravel);
        const expensesToCreate = [];
        
        for (const budget of budgets) {
          const expenseItemIdStr = budget.expenseItemId?.toString() || budget.expenseItemId;
          const itemInvoices = expenseItemInvoices[expenseItemIdStr] || expenseItemInvoices[budget.expenseItemId] || [];
          if (itemInvoices.length > 0) {
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
            
            const expenseData = {
              travel: selectedTravel._id,
              expenseItem: budget.expenseItemId,
              title: `${selectedTravel.title || selectedTravel.travelNumber || '差旅'} - ${expenseItem?.itemName || budget.expenseItemId}`,
              description: `${formData.description || ''} ${budget.route === 'outbound' ? '去程' : budget.route === 'inbound' ? '返程' : '多程'}`.trim(),
              category: mapExpenseItemCategoryToExpenseCategory(expenseItem?.category || 'other'),
              amount: reimbursementAmount,
              currency: selectedTravel.currency || formData.currency || 'USD',
              date: selectedTravel.endDate || formData.date?.toISOString() || new Date().toISOString(),
              status: status,
              vendor: vendor,
              relatedInvoices: itemInvoices.map(inv => inv._id || inv.id).filter(Boolean),
              costCenter: formData.costCenter || '',
              isBillable: formData.isBillable || false,
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
                    try {
                      await apiClient.post(`/expenses/${response.data.data._id}/link-invoice`, {
                        invoiceId: invoiceId
                      });
                    } catch (err) {
                      console.error('Failed to link invoice:', err);
                    }
                  }
                }
              }
            } catch (error) {
              console.error('Failed to create expense:', error);
            }
          }
          
          if (createdExpenses.length > 0) {
            showNotification(
              `成功创建 ${createdExpenses.length} 个费用申请`,
              'success'
            );
            navigate('/expenses');
            return;
          }
        } else {
          showNotification('请至少为一个费用项添加发票', 'warning');
          return;
        }
      }
      
      // 原有的保存逻辑（编辑模式或没有选择差旅单）
      const submitData = {
        title: formData.title || '',
        description: formData.description || '',
        category: formData.category,
        subcategory: formData.subcategory || '',
        amount: parseFloat(formData.amount) || 0,
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
        isBillable: formData.isBillable || false,
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
          for (const budget of budgets) {
            const expenseItemIdStr = budget.expenseItemId?.toString() || budget.expenseItemId;
            const invoicesForItem = expenseItemInvoices[expenseItemIdStr] || [];
            
            if (invoicesForItem.length > 0) {
              // 获取当前费用申请关联的费用项
              const expenseResponse = await apiClient.get(`/expenses/${savedExpenseId}`);
              const currentExpenseItemId = expenseResponse.data?.data?.expenseItem?._id || expenseResponse.data?.data?.expenseItem;
              
              // 如果费用申请关联了当前费用项，更新发票关联
              if (currentExpenseItemId && (currentExpenseItemId.toString() === expenseItemIdStr || currentExpenseItemId === budget.expenseItemId)) {
                const currentInvoiceIds = new Set((expenseResponse.data.data.relatedInvoices || []).map(inv => inv._id || inv));
                const newInvoiceIds = new Set(invoicesForItem.map(inv => inv._id || inv.id).filter(Boolean));
                
                // 添加新关联的发票
                for (const invoice of invoicesForItem) {
                  const invoiceId = invoice._id || invoice.id;
                  if (invoiceId && !currentInvoiceIds.has(invoiceId)) {
                    try {
                      await apiClient.post(`/expenses/${savedExpenseId}/link-invoice`, { invoiceId });
                    } catch (err) {
                      console.error('Failed to link invoice:', err);
                    }
                  }
                }
                
                // 移除取消关联的发票
                for (const invoiceId of currentInvoiceIds) {
                  if (!newInvoiceIds.has(invoiceId)) {
                    try {
                      await apiClient.delete(`/expenses/${savedExpenseId}/unlink-invoice/${invoiceId}`);
                    } catch (err) {
                      console.error('Failed to unlink invoice:', err);
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
                      console.error('Failed to update reimbursement amount:', err);
                    }
                  }
                }
              }
            }
          }
        } else {
          // 没有关联差旅单的情况，处理 relatedInvoices
          if (isEdit) {
            // 编辑模式：更新发票关联
            const expenseResponse = await apiClient.get(`/expenses/${savedExpenseId}`);
            const currentInvoiceIds = new Set((expenseResponse.data?.data?.relatedInvoices || []).map(inv => inv._id || inv));
            const newInvoiceIds = new Set((relatedInvoices || []).map(inv => inv._id || inv).filter(Boolean));
            
            // 添加新关联的发票
            for (const invoice of relatedInvoices || []) {
              const invoiceId = invoice._id || invoice.id;
              if (invoiceId && !currentInvoiceIds.has(invoiceId)) {
                try {
                  await apiClient.post(`/expenses/${savedExpenseId}/link-invoice`, { invoiceId });
                } catch (err) {
                  console.error('Failed to link invoice:', err);
                }
              }
            }
            
            // 移除取消关联的发票
            for (const invoiceId of currentInvoiceIds) {
              if (!newInvoiceIds.has(invoiceId)) {
                try {
                  await apiClient.delete(`/expenses/${savedExpenseId}/unlink-invoice/${invoiceId}`);
                } catch (err) {
                  console.error('Failed to unlink invoice:', err);
                }
              }
            }
          } else {
            // 新建模式：关联发票
            if (relatedInvoices && relatedInvoices.length > 0) {
              for (const invoice of relatedInvoices) {
                const invoiceId = invoice._id || invoice.id;
                if (invoiceId) {
                  try {
                    await apiClient.post(`/expenses/${savedExpenseId}/link-invoice`, { invoiceId });
                  } catch (err) {
                    console.error('Failed to link invoice:', err);
                  }
                }
              }
            }
          }
        }
        
        showNotification(
          status === 'draft' 
            ? (t('expense.saved') || '费用申请已保存为草稿')
            : (t('expense.submitted') || '费用申请已提交'),
          'success'
        );
        navigate('/expenses');
      }
    } catch (error) {
      console.error('Failed to save expense:', error);
      console.error('Error details:', error.response?.data);
      showNotification(
        error.response?.data?.message || error.message || (t('expense.saveError') || '保存费用申请失败'),
        'error'
      );
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
                      const expenseItem = expenseItems.find(item => item._id === mergedBudget.expenseItemId);
                      // 确保正确获取发票列表，支持字符串和对象 ID
                      const expenseItemId = mergedBudget.expenseItemId?.toString() || mergedBudget.expenseItemId;
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
                                  {expenseItem?.itemName || mergedBudget.expenseItemId}
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
                                    value={expenseItemReimbursementAmounts[expenseItemId] ?? (() => {
                                      const totalAmount = itemInvoices.reduce((sum, inv) => {
                                        const amount = inv.totalAmount || inv.amount || 0;
                                        return sum + amount;
                                      }, 0);
                                      return totalAmount;
                                    })()}
                                    onChange={(e) => {
                                      const value = parseFloat(e.target.value) || 0;
                                      setExpenseItemReimbursementAmounts(prev => ({
                                        ...prev,
                                        [expenseItemId]: value
                                      }));
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
                Basic Information
              </Typography>
              <Divider sx={{ mb: 2 }} />
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Title *"
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
                  label="Currency *"
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

            {/* Category and Amount */}
            <Grid item xs={12} md={4}>
              <FormControl fullWidth>
                <InputLabel>{t('expense.category')} *</InputLabel>
                <Select
                  value={formData.category}
                  label="Category *"
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

            <Grid item xs={12} md={4}>
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

            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                label="Amount *"
                type="number"
                value={formData.amount}
                onChange={(e) => handleChange('amount', e.target.value)}
                error={!!errors.amount}
                helperText={errors.amount}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <MoneyIcon />
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>

            {/* Date and Vendor */}
            <Grid item xs={12} md={6}>
              <DatePicker
                label="Date *"
                value={formData.date}
                onChange={(date) => handleChange('date', date)}
                slotProps={{
                  textField: {
                    fullWidth: true,
                    error: !!errors.date,
                    helperText: errors.date
                  }
                }}
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Vendor Name *"
                value={formData.vendor.name}
                onChange={(e) => handleChange('vendor.name', e.target.value)}
                error={!!errors.vendorName}
                helperText={errors.vendorName}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <BusinessIcon />
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label={t('expense.vendorAddress')}
                value={formData.vendor.address}
                onChange={(e) => handleChange('vendor.address', e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <LocationIcon />
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label={t('expense.taxId')}
                value={formData.vendor.taxId}
                onChange={(e) => handleChange('vendor.taxId', e.target.value)}
              />
            </Grid>

            {/* Project and Cost Center */}
            <Grid item xs={12} md={6}>
              <Autocomplete
                freeSolo
                options={projects}
                value={formData.project}
                onChange={(event, newValue) => handleChange('project', newValue)}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label={t('expense.project')}
                    placeholder={t('expense.selectProject')}
                  />
                )}
              />
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

            {/* Billable and Client */}
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>{t('expense.client')}</InputLabel>
                <Select
                  value={formData.client}
                  label={t('expense.client')}
                  onChange={(e) => handleChange('client', e.target.value)}
                >
                  {clients.map((client) => (
                    <MenuItem key={client} value={client}>
                      {client}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} md={6}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mt: 2 }}>
                <FormControl>
                  <InputLabel>{t('expense.billable')}</InputLabel>
                  <Select
                    value={formData.isBillable}
                    label={t('expense.billable')}
                    onChange={(e) => handleChange('isBillable', e.target.value)}
                  >
                    <MenuItem value={false}>No</MenuItem>
                    <MenuItem value={true}>Yes</MenuItem>
                  </Select>
                </FormControl>
              </Box>
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
                    label={t('expense.tags')}
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
                      {relatedInvoices.map((invoice) => (
                        <ListItem key={invoice._id} divider>
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
                            onClick={() => handleRemoveInvoice(invoice._id)}
                            color="error"
                            size="small"
                          >
                            <DeleteIcon />
                          </IconButton>
                        </ListItem>
                      ))}
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
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 2 }}>
                <Typography variant="h6">
                  Receipts
                </Typography>
                <Button
                  startIcon={<UploadIcon />}
                  onClick={() => setUploadDialogOpen(true)}
                  variant="outlined"
                  size="small"
                >
                  Upload Receipts
                </Button>
              </Box>
              <Divider sx={{ mb: 2 }} />
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

            {/* Notes */}
            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={4}
                label={t('travel.additionalNotes')}
                value={formData.notes}
                onChange={(e) => handleChange('notes', e.target.value)}
                placeholder={t('placeholders.additionalExpenseInfo')}
              />
            </Grid>

            {/* Action Buttons */}
            <Grid item xs={12}>
              <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end', mt: 3 }}>
                <Button
                  variant="outlined"
                  onClick={() => navigate('/expenses')}
                  disabled={saving}
                >
                  Cancel
                </Button>
                <Button
                  variant="contained"
                  startIcon={<SaveIcon />}
                  onClick={() => handleSave('draft')}
                  disabled={saving}
                >
                  {saving ? <CircularProgress size={20} /> : 'Save Draft'}
                </Button>
                <Button
                  variant="contained"
                  color="primary"
                  startIcon={<SendIcon />}
                  onClick={handleSubmit}
                  disabled={saving}
                >
                  {saving ? <CircularProgress size={20} /> : 'Submit Expense'}
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
                  Choose Files
                </Button>
              </label>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                Supported formats: JPG, PNG, PDF (Max 10MB per file)
              </Typography>
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setUploadDialogOpen(false)}>
              Cancel
            </Button>
          </DialogActions>
        </Dialog>

        {/* Invoice Select Dialog */}
        {isEdit && (
          <InvoiceSelectDialog
            open={invoiceSelectDialogOpen}
            onClose={() => setInvoiceSelectDialogOpen(false)}
            onConfirm={handleAddInvoices}
            excludeInvoiceIds={relatedInvoices.map(inv => inv._id)}
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
