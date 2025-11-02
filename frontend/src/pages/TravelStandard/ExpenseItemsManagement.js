import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Container,
  Paper,
  Box,
  Typography,
  Button,
  Tabs,
  Tab,
  Grid,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Alert,
  CircularProgress,
  Divider,
  FormControlLabel,
  Checkbox
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon
} from '@mui/icons-material';
import apiClient from '../../utils/axiosConfig';
import { useNotification } from '../../contexts/NotificationContext';

const ExpenseItemsManagement = () => {
  const { standardId } = useParams();
  const navigate = useNavigate();
  const { showNotification } = useNotification();
  const [currentTab, setCurrentTab] = useState(0);
  const [standardInfo, setStandardInfo] = useState(null);

  // 数据状态
  const [transportStandards, setTransportStandards] = useState([]);
  const [accommodationStandards, setAccommodationStandards] = useState([]);
  const [mealStandards, setMealStandards] = useState([]);
  const [allowanceStandards, setAllowanceStandards] = useState([]);
  const [otherExpenseStandards, setOtherExpenseStandards] = useState([]);

  // 加载状态
  const [loading, setLoading] = useState(true);
  const [loadingData, setLoadingData] = useState(false);

  // 对话框状态
  const [transportDialog, setTransportDialog] = useState({ open: false, data: null, mode: 'create' });
  const [accommodationDialog, setAccommodationDialog] = useState({ open: false, data: null, mode: 'create' });
  const [mealDialog, setMealDialog] = useState({ open: false, data: null, mode: 'create' });
  const [allowanceDialog, setAllowanceDialog] = useState({ open: false, data: null, mode: 'create' });
  const [otherExpenseDialog, setOtherExpenseDialog] = useState({ open: false, data: null, mode: 'create' });
  const [deleteDialog, setDeleteDialog] = useState({ open: false, type: '', id: null });

  // 表单数据
  const [transportForm, setTransportForm] = useState({
    jobLevelCode: '',
    transportType: '',
    seatClass: '',
    maxAmount: '',
    cityLevel: '',
    distanceRange: '',
    remark: ''
  });
  const [accommodationForm, setAccommodationForm] = useState({
    jobLevelCode: '',
    cityLevel: '',
    maxAmountPerNight: '',
    starLevel: '',
    remark: ''
  });
  const [mealForm, setMealForm] = useState({
    jobLevelCode: '',
    cityLevel: '',
    breakfastAmount: '',
    lunchAmount: '',
    dinnerAmount: '',
    dailyTotal: '',
    remark: ''
  });
  const [allowanceForm, setAllowanceForm] = useState({
    jobLevelCode: '',
    allowanceType: '',
    amountType: 'daily',
    amount: '',
    remark: ''
  });
  const [otherExpenseForm, setOtherExpenseForm] = useState({
    expenseType: '',
    expenseTypeName: '',
    jobLevelCode: '',
    cityLevel: '',
    amountType: 'fixed',
    amount: '',
    baseAmount: '',
    percentage: '',
    applicableScope: '',
    hasMaxLimit: false,
    maxLimit: '',
    requireReceipt: true,
    requireApproval: false,
    remark: ''
  });

  // 选项数据
  const [jobLevels, setJobLevels] = useState([]);

  useEffect(() => {
    fetchStandardInfo();
    fetchJobLevels();
  }, [standardId]);

  useEffect(() => {
    if (standardId) {
      fetchDataForTab(currentTab);
    }
  }, [currentTab, standardId]);

  const fetchStandardInfo = async () => {
    try {
      const response = await apiClient.get(`/api/travel-standards/${standardId}`);
      if (response.data.success) {
        setStandardInfo(response.data.data);
      }
    } catch (err) {
      console.error('Fetch standard info error:', err);
      showNotification('加载标准信息失败', 'error');
    }
  };

  const fetchJobLevels = async () => {
    try {
      const response = await apiClient.get('/job-levels');
      if (response.data.success) {
        setJobLevels(response.data.data || []);
      }
    } catch (err) {
      console.error('Fetch job levels error:', err);
    }
  };

  const fetchDataForTab = async (tabIndex) => {
    setLoadingData(true);
    try {
      switch (tabIndex) {
        case 0: // 交通
          const transportRes = await apiClient.get(`/api/expense-items/${standardId}/transport`);
          if (transportRes.data.success) {
            setTransportStandards(transportRes.data.data || []);
          }
          break;
        case 1: // 住宿
          const accommodationRes = await apiClient.get(`/expense-items/${standardId}/accommodation`);
          if (accommodationRes.data.success) {
            setAccommodationStandards(accommodationRes.data.data || []);
          }
          break;
        case 2: // 餐饮
          const mealRes = await apiClient.get(`/expense-items/${standardId}/meal`);
          if (mealRes.data.success) {
            setMealStandards(mealRes.data.data || []);
          }
          break;
        case 3: // 津贴
          const allowanceRes = await apiClient.get(`/expense-items/${standardId}/allowance`);
          if (allowanceRes.data.success) {
            setAllowanceStandards(allowanceRes.data.data || []);
          }
          break;
        case 4: // 其他费用
          const otherRes = await apiClient.get(`/expense-items/${standardId}/other`);
          if (otherRes.data.success) {
            setOtherExpenseStandards(otherRes.data.data || []);
          }
          break;
      }
    } catch (err) {
      console.error('Fetch data error:', err);
      showNotification('加载数据失败', 'error');
    } finally {
      setLoadingData(false);
      setLoading(false);
    }
  };

  const handleTabChange = (event, newValue) => {
    setCurrentTab(newValue);
  };

  // ==================== 交通标准处理 ====================
  const handleOpenTransportDialog = (data = null) => {
    if (data) {
      setTransportForm({
        jobLevelCode: data.jobLevelCode || '',
        transportType: data.transportType || '',
        seatClass: data.seatClass || '',
        maxAmount: data.maxAmount || '',
        cityLevel: data.cityLevel || '',
        distanceRange: data.distanceRange || '',
        remark: data.remark || ''
      });
      setTransportDialog({ open: true, data, mode: 'edit' });
    } else {
      setTransportForm({
        jobLevelCode: '',
        transportType: '',
        seatClass: '',
        maxAmount: '',
        cityLevel: '',
        distanceRange: '',
        remark: ''
      });
      setTransportDialog({ open: true, data: null, mode: 'create' });
    }
  };

  const handleSaveTransport = async () => {
    try {
      const payload = {
        ...transportForm,
        maxAmount: parseFloat(transportForm.maxAmount),
        cityLevel: transportForm.cityLevel ? parseInt(transportForm.cityLevel) : undefined
      };

      if (transportDialog.mode === 'create') {
        await apiClient.post(`/expense-items/${standardId}/transport`, payload);
        showNotification('交通标准创建成功', 'success');
      } else {
        await apiClient.put(`/expense-items/transport/${transportDialog.data._id}`, payload);
        showNotification('交通标准更新成功', 'success');
      }

      setTransportDialog({ open: false, data: null, mode: 'create' });
      fetchDataForTab(0);
      fetchStandardInfo(); // 刷新标准信息以更新配置状态
    } catch (err) {
      console.error('Save transport error:', err);
      showNotification('保存失败: ' + (err.response?.data?.message || '未知错误'), 'error');
    }
  };

  // ==================== 住宿标准处理 ====================
  const handleOpenAccommodationDialog = (data = null) => {
    if (data) {
      setAccommodationForm({
        jobLevelCode: data.jobLevelCode || '',
        cityLevel: data.cityLevel || '',
        maxAmountPerNight: data.maxAmountPerNight || '',
        starLevel: data.starLevel || '',
        remark: data.remark || ''
      });
      setAccommodationDialog({ open: true, data, mode: 'edit' });
    } else {
      setAccommodationForm({
        jobLevelCode: '',
        cityLevel: '',
        maxAmountPerNight: '',
        starLevel: '',
        remark: ''
      });
      setAccommodationDialog({ open: true, data: null, mode: 'create' });
    }
  };

  const handleSaveAccommodation = async () => {
    try {
      const payload = {
        ...accommodationForm,
        cityLevel: parseInt(accommodationForm.cityLevel),
        maxAmountPerNight: parseFloat(accommodationForm.maxAmountPerNight)
      };

      if (accommodationDialog.mode === 'create') {
        await apiClient.post(`/expense-items/${standardId}/accommodation`, payload);
        showNotification('住宿标准创建成功', 'success');
      } else {
        await apiClient.put(`/expense-items/accommodation/${accommodationDialog.data._id}`, payload);
        showNotification('住宿标准更新成功', 'success');
      }

      setAccommodationDialog({ open: false, data: null, mode: 'create' });
      fetchDataForTab(1);
      fetchStandardInfo();
    } catch (err) {
      console.error('Save accommodation error:', err);
      showNotification('保存失败: ' + (err.response?.data?.message || '未知错误'), 'error');
    }
  };

  // ==================== 餐饮标准处理 ====================
  const handleOpenMealDialog = (data = null) => {
    if (data) {
      setMealForm({
        jobLevelCode: data.jobLevelCode || '',
        cityLevel: data.cityLevel || '',
        breakfastAmount: data.breakfastAmount || '',
        lunchAmount: data.lunchAmount || '',
        dinnerAmount: data.dinnerAmount || '',
        dailyTotal: data.dailyTotal || '',
        remark: data.remark || ''
      });
      setMealDialog({ open: true, data, mode: 'edit' });
    } else {
      setMealForm({
        jobLevelCode: '',
        cityLevel: '',
        breakfastAmount: '',
        lunchAmount: '',
        dinnerAmount: '',
        dailyTotal: '',
        remark: ''
      });
      setMealDialog({ open: true, data: null, mode: 'create' });
    }
  };

  const handleSaveMeal = async () => {
    try {
      const payload = {
        ...mealForm,
        cityLevel: parseInt(mealForm.cityLevel),
        breakfastAmount: parseFloat(mealForm.breakfastAmount) || 0,
        lunchAmount: parseFloat(mealForm.lunchAmount) || 0,
        dinnerAmount: parseFloat(mealForm.dinnerAmount) || 0,
        dailyTotal: parseFloat(mealForm.dailyTotal)
      };

      if (mealDialog.mode === 'create') {
        await apiClient.post(`/expense-items/${standardId}/meal`, payload);
        showNotification('餐饮标准创建成功', 'success');
      } else {
        await apiClient.put(`/expense-items/meal/${mealDialog.data._id}`, payload);
        showNotification('餐饮标准更新成功', 'success');
      }

      setMealDialog({ open: false, data: null, mode: 'create' });
      fetchDataForTab(2);
      fetchStandardInfo();
    } catch (err) {
      console.error('Save meal error:', err);
      showNotification('保存失败: ' + (err.response?.data?.message || '未知错误'), 'error');
    }
  };

  // ==================== 津贴标准处理 ====================
  const handleOpenAllowanceDialog = (data = null) => {
    if (data) {
      setAllowanceForm({
        jobLevelCode: data.jobLevelCode || '',
        allowanceType: data.allowanceType || '',
        amountType: data.amountType || 'daily',
        amount: data.amount || '',
        remark: data.remark || ''
      });
      setAllowanceDialog({ open: true, data, mode: 'edit' });
    } else {
      setAllowanceForm({
        jobLevelCode: '',
        allowanceType: '',
        amountType: 'daily',
        amount: '',
        remark: ''
      });
      setAllowanceDialog({ open: true, data: null, mode: 'create' });
    }
  };

  const handleSaveAllowance = async () => {
    try {
      const payload = {
        ...allowanceForm,
        amount: parseFloat(allowanceForm.amount)
      };

      if (allowanceDialog.mode === 'create') {
        await apiClient.post(`/expense-items/${standardId}/allowance`, payload);
        showNotification('津贴标准创建成功', 'success');
      } else {
        await apiClient.put(`/expense-items/allowance/${allowanceDialog.data._id}`, payload);
        showNotification('津贴标准更新成功', 'success');
      }

      setAllowanceDialog({ open: false, data: null, mode: 'create' });
      fetchDataForTab(3);
      fetchStandardInfo();
    } catch (err) {
      console.error('Save allowance error:', err);
      showNotification('保存失败: ' + (err.response?.data?.message || '未知错误'), 'error');
    }
  };

  // ==================== 其他费用标准处理 ====================
  const handleOpenOtherExpenseDialog = (data = null) => {
    if (data) {
      setOtherExpenseForm({
        expenseType: data.expenseType || '',
        expenseTypeName: data.expenseTypeName || '',
        jobLevelCode: data.jobLevelCode || '',
        cityLevel: data.cityLevel || '',
        amountType: data.amountType || 'fixed',
        amount: data.amount || '',
        baseAmount: data.baseAmount || '',
        percentage: data.percentage || '',
        applicableScope: data.applicableScope || '',
        hasMaxLimit: data.hasMaxLimit || false,
        maxLimit: data.maxLimit || '',
        requireReceipt: data.requireReceipt !== undefined ? data.requireReceipt : true,
        requireApproval: data.requireApproval || false,
        remark: data.remark || ''
      });
      setOtherExpenseDialog({ open: true, data, mode: 'edit' });
    } else {
      setOtherExpenseForm({
        expenseType: '',
        expenseTypeName: '',
        jobLevelCode: '',
        cityLevel: '',
        amountType: 'fixed',
        amount: '',
        baseAmount: '',
        percentage: '',
        applicableScope: '',
        hasMaxLimit: false,
        maxLimit: '',
        requireReceipt: true,
        requireApproval: false,
        remark: ''
      });
      setOtherExpenseDialog({ open: true, data: null, mode: 'create' });
    }
  };

  const handleSaveOtherExpense = async () => {
    try {
      const payload = {
        ...otherExpenseForm,
        amount: parseFloat(otherExpenseForm.amount),
        cityLevel: otherExpenseForm.cityLevel ? parseInt(otherExpenseForm.cityLevel) : undefined,
        baseAmount: otherExpenseForm.baseAmount ? parseFloat(otherExpenseForm.baseAmount) : undefined,
        percentage: otherExpenseForm.percentage ? parseFloat(otherExpenseForm.percentage) : undefined,
        maxLimit: otherExpenseForm.hasMaxLimit && otherExpenseForm.maxLimit ? parseFloat(otherExpenseForm.maxLimit) : undefined
      };

      if (otherExpenseDialog.mode === 'create') {
        await apiClient.post(`/expense-items/${standardId}/other`, payload);
        showNotification('其他费用标准创建成功', 'success');
      } else {
        await apiClient.put(`/expense-items/other/${otherExpenseDialog.data._id}`, payload);
        showNotification('其他费用标准更新成功', 'success');
      }

      setOtherExpenseDialog({ open: false, data: null, mode: 'create' });
      fetchDataForTab(4);
      fetchStandardInfo();
    } catch (err) {
      console.error('Save other expense error:', err);
      showNotification('保存失败: ' + (err.response?.data?.message || '未知错误'), 'error');
    }
  };

  // ==================== 删除处理 ====================
  const handleDelete = async () => {
    try {
      const { type, id } = deleteDialog;
      let endpoint = '';

      switch (type) {
        case 'transport':
          endpoint = `/expense-items/transport/${id}`;
          break;
        case 'accommodation':
          endpoint = `/expense-items/accommodation/${id}`;
          break;
        case 'meal':
          endpoint = `/expense-items/meal/${id}`;
          break;
        case 'allowance':
          endpoint = `/expense-items/allowance/${id}`;
          break;
        case 'other':
          endpoint = `/expense-items/other/${id}`;
          break;
      }

      await apiClient.delete(endpoint);
      showNotification('删除成功', 'success');
      setDeleteDialog({ open: false, type: '', id: null });
      fetchDataForTab(currentTab);
      fetchStandardInfo();
    } catch (err) {
      console.error('Delete error:', err);
      showNotification('删除失败: ' + (err.response?.data?.message || '未知错误'), 'error');
    }
  };

  // 渲染表格内容
  const renderTransportTable = () => (
    <TableContainer>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>职级</TableCell>
            <TableCell>交通工具</TableCell>
            <TableCell>座位等级</TableCell>
            <TableCell>最高金额</TableCell>
            <TableCell>城市级别</TableCell>
            <TableCell>距离范围</TableCell>
            <TableCell align="right">操作</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {loadingData ? (
            <TableRow>
              <TableCell colSpan={7} align="center">
                <CircularProgress size={24} />
              </TableCell>
            </TableRow>
          ) : transportStandards.length === 0 ? (
            <TableRow>
              <TableCell colSpan={7} align="center">
                暂无数据，点击上方"新增"按钮添加
              </TableCell>
            </TableRow>
          ) : (
            transportStandards.map((item) => (
              <TableRow key={item._id}>
                <TableCell>{item.jobLevelCode}</TableCell>
                <TableCell>
                  {item.transportType === 'flight' ? '飞机' :
                   item.transportType === 'train' ? '火车' :
                   item.transportType === 'bus' ? '大巴' :
                   item.transportType === 'car' ? '汽车' : item.transportType}
                </TableCell>
                <TableCell>{item.seatClass}</TableCell>
                <TableCell>¥{item.maxAmount?.toLocaleString()}</TableCell>
                <TableCell>{item.cityLevel ? `${item.cityLevel}级` : '不限'}</TableCell>
                <TableCell>{item.distanceRange || '-'}</TableCell>
                <TableCell align="right">
                  <IconButton size="small" onClick={() => handleOpenTransportDialog(item)}>
                    <EditIcon />
                  </IconButton>
                  <IconButton
                    size="small"
                    color="error"
                    onClick={() => setDeleteDialog({ open: true, type: 'transport', id: item._id })}
                  >
                    <DeleteIcon />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </TableContainer>
  );

  const renderAccommodationTable = () => (
    <TableContainer>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>职级</TableCell>
            <TableCell>城市级别</TableCell>
            <TableCell>每晚最高金额</TableCell>
            <TableCell>星级要求</TableCell>
            <TableCell align="right">操作</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {loadingData ? (
            <TableRow>
              <TableCell colSpan={5} align="center">
                <CircularProgress size={24} />
              </TableCell>
            </TableRow>
          ) : accommodationStandards.length === 0 ? (
            <TableRow>
              <TableCell colSpan={5} align="center">
                暂无数据，点击上方"新增"按钮添加
              </TableCell>
            </TableRow>
          ) : (
            accommodationStandards.map((item) => (
              <TableRow key={item._id}>
                <TableCell>{item.jobLevelCode}</TableCell>
                <TableCell>{item.cityLevel}级</TableCell>
                <TableCell>¥{item.maxAmountPerNight?.toLocaleString()}</TableCell>
                <TableCell>{item.starLevel || '-'}</TableCell>
                <TableCell align="right">
                  <IconButton size="small" onClick={() => handleOpenAccommodationDialog(item)}>
                    <EditIcon />
                  </IconButton>
                  <IconButton
                    size="small"
                    color="error"
                    onClick={() => setDeleteDialog({ open: true, type: 'accommodation', id: item._id })}
                  >
                    <DeleteIcon />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </TableContainer>
  );

  const renderMealTable = () => (
    <TableContainer>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>职级</TableCell>
            <TableCell>城市级别</TableCell>
            <TableCell>早餐</TableCell>
            <TableCell>午餐</TableCell>
            <TableCell>晚餐</TableCell>
            <TableCell>每日总额</TableCell>
            <TableCell align="right">操作</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {loadingData ? (
            <TableRow>
              <TableCell colSpan={7} align="center">
                <CircularProgress size={24} />
              </TableCell>
            </TableRow>
          ) : mealStandards.length === 0 ? (
            <TableRow>
              <TableCell colSpan={7} align="center">
                暂无数据，点击上方"新增"按钮添加
              </TableCell>
            </TableRow>
          ) : (
            mealStandards.map((item) => (
              <TableRow key={item._id}>
                <TableCell>{item.jobLevelCode}</TableCell>
                <TableCell>{item.cityLevel}级</TableCell>
                <TableCell>¥{item.breakfastAmount?.toLocaleString()}</TableCell>
                <TableCell>¥{item.lunchAmount?.toLocaleString()}</TableCell>
                <TableCell>¥{item.dinnerAmount?.toLocaleString()}</TableCell>
                <TableCell>¥{item.dailyTotal?.toLocaleString()}</TableCell>
                <TableCell align="right">
                  <IconButton size="small" onClick={() => handleOpenMealDialog(item)}>
                    <EditIcon />
                  </IconButton>
                  <IconButton
                    size="small"
                    color="error"
                    onClick={() => setDeleteDialog({ open: true, type: 'meal', id: item._id })}
                  >
                    <DeleteIcon />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </TableContainer>
  );

  const renderAllowanceTable = () => (
    <TableContainer>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>职级</TableCell>
            <TableCell>津贴类型</TableCell>
            <TableCell>计算方式</TableCell>
            <TableCell>金额</TableCell>
            <TableCell align="right">操作</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {loadingData ? (
            <TableRow>
              <TableCell colSpan={5} align="center">
                <CircularProgress size={24} />
              </TableCell>
            </TableRow>
          ) : allowanceStandards.length === 0 ? (
            <TableRow>
              <TableCell colSpan={5} align="center">
                暂无数据，点击上方"新增"按钮添加
              </TableCell>
            </TableRow>
          ) : (
            allowanceStandards.map((item) => (
              <TableRow key={item._id}>
                <TableCell>{item.jobLevelCode}</TableCell>
                <TableCell>{item.allowanceType}</TableCell>
                <TableCell>
                  {item.amountType === 'daily' ? '按天' :
                   item.amountType === 'per_trip' ? '按次' : '固定'}
                </TableCell>
                <TableCell>¥{item.amount?.toLocaleString()}</TableCell>
                <TableCell align="right">
                  <IconButton size="small" onClick={() => handleOpenAllowanceDialog(item)}>
                    <EditIcon />
                  </IconButton>
                  <IconButton
                    size="small"
                    color="error"
                    onClick={() => setDeleteDialog({ open: true, type: 'allowance', id: item._id })}
                  >
                    <DeleteIcon />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </TableContainer>
  );

  const renderOtherExpenseTable = () => {
    const expenseTypeMap = {
      entertainment: '娱乐费用',
      communication: '通讯费用',
      office_supplies: '办公用品',
      training: '培训费用',
      parking: '停车费',
      toll: '过路费',
      insurance: '保险费用',
      visa: '签证费用',
      other: '其他费用'
    };

    const amountTypeMap = {
      daily: '按天',
      per_trip: '按次',
      per_item: '按项',
      percentage: '按比例',
      fixed: '固定'
    };

    return (
      <TableContainer>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>费用类型</TableCell>
              <TableCell>职级</TableCell>
              <TableCell>城市级别</TableCell>
              <TableCell>计算方式</TableCell>
              <TableCell>金额</TableCell>
              <TableCell>适用范围</TableCell>
              <TableCell align="right">操作</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loadingData ? (
              <TableRow>
                <TableCell colSpan={7} align="center">
                  <CircularProgress size={24} />
                </TableCell>
              </TableRow>
            ) : otherExpenseStandards.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} align="center">
                  暂无数据，点击上方"新增"按钮添加
                </TableCell>
              </TableRow>
            ) : (
              otherExpenseStandards.map((item) => (
                <TableRow key={item._id}>
                  <TableCell>
                    <Chip 
                      label={expenseTypeMap[item.expenseType] || item.expenseTypeName || item.expenseType} 
                      size="small" 
                      color="primary" 
                    />
                  </TableCell>
                  <TableCell>{item.jobLevelCode}</TableCell>
                  <TableCell>{item.cityLevel ? `${item.cityLevel}级` : '不限'}</TableCell>
                  <TableCell>{amountTypeMap[item.amountType] || item.amountType}</TableCell>
                  <TableCell>
                    {item.amountType === 'percentage' && item.percentage 
                      ? `${item.percentage}% (基础: ¥${item.baseAmount?.toLocaleString()})`
                      : `¥${item.amount?.toLocaleString()}`
                    }
                  </TableCell>
                  <TableCell>{item.applicableScope || '-'}</TableCell>
                  <TableCell align="right">
                    <IconButton size="small" onClick={() => handleOpenOtherExpenseDialog(item)}>
                      <EditIcon />
                    </IconButton>
                    <IconButton
                      size="small"
                      color="error"
                      onClick={() => setDeleteDialog({ open: true, type: 'other', id: item._id })}
                    >
                      <DeleteIcon />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>
    );
  };

  if (loading && !standardInfo) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      <Paper elevation={3} sx={{ p: 4 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
          <Button
            startIcon={<ArrowBackIcon />}
            onClick={() => navigate(`/travel-standards/${standardId}/edit`)}
            sx={{ mr: 2 }}
          >
            返回
          </Button>
          <Typography variant="h4">
            费用项维护 - {standardInfo?.standardName || standardId}
          </Typography>
        </Box>

        <Divider sx={{ mb: 3 }} />

        <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
          <Tabs value={currentTab} onChange={handleTabChange}>
            <Tab label="交通费用" />
            <Tab label="住宿费用" />
            <Tab label="餐饮费用" />
            <Tab label="津贴补贴" />
            <Tab label="其他费用" />
          </Tabs>
        </Box>

        {/* 交通费用 */}
        {currentTab === 0 && (
          <Card variant="outlined">
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6">交通费用标准</Typography>
                <Button
                  variant="contained"
                  startIcon={<AddIcon />}
                  onClick={() => handleOpenTransportDialog()}
                >
                  新增
                </Button>
              </Box>
              {renderTransportTable()}
            </CardContent>
          </Card>
        )}

        {/* 住宿费用 */}
        {currentTab === 1 && (
          <Card variant="outlined">
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6">住宿费用标准</Typography>
                <Button
                  variant="contained"
                  startIcon={<AddIcon />}
                  onClick={() => handleOpenAccommodationDialog()}
                >
                  新增
                </Button>
              </Box>
              {renderAccommodationTable()}
            </CardContent>
          </Card>
        )}

        {/* 餐饮费用 */}
        {currentTab === 2 && (
          <Card variant="outlined">
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6">餐饮费用标准</Typography>
                <Button
                  variant="contained"
                  startIcon={<AddIcon />}
                  onClick={() => handleOpenMealDialog()}
                >
                  新增
                </Button>
              </Box>
              {renderMealTable()}
            </CardContent>
          </Card>
        )}

        {/* 津贴补贴 */}
        {currentTab === 3 && (
          <Card variant="outlined">
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6">津贴补贴标准</Typography>
                <Button
                  variant="contained"
                  startIcon={<AddIcon />}
                  onClick={() => handleOpenAllowanceDialog()}
                >
                  新增
                </Button>
              </Box>
              {renderAllowanceTable()}
            </CardContent>
          </Card>
        )}

        {/* 其他费用 */}
        {currentTab === 4 && (
          <Card variant="outlined">
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6">其他费用标准</Typography>
                <Button
                  variant="contained"
                  startIcon={<AddIcon />}
                  onClick={() => handleOpenOtherExpenseDialog()}
                >
                  新增
                </Button>
              </Box>
              {renderOtherExpenseTable()}
            </CardContent>
          </Card>
        )}

        {/* 交通费用对话框 */}
        <Dialog open={transportDialog.open} onClose={() => setTransportDialog({ open: false, data: null, mode: 'create' })} maxWidth="md" fullWidth>
          <DialogTitle>{transportDialog.mode === 'create' ? '新增交通费用标准' : '编辑交通费用标准'}</DialogTitle>
          <DialogContent>
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid item xs={12} md={6}>
                <FormControl fullWidth required>
                  <InputLabel>职级</InputLabel>
                  <Select
                    value={transportForm.jobLevelCode}
                    onChange={(e) => setTransportForm({ ...transportForm, jobLevelCode: e.target.value })}
                    label="职级"
                  >
                    {jobLevels.map((jl) => (
                      <MenuItem key={jl.levelCode} value={jl.levelCode}>
                        {jl.levelName}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={6}>
                <FormControl fullWidth required>
                  <InputLabel>交通工具</InputLabel>
                  <Select
                    value={transportForm.transportType}
                    onChange={(e) => setTransportForm({ ...transportForm, transportType: e.target.value })}
                    label="交通工具"
                  >
                    <MenuItem value="flight">飞机</MenuItem>
                    <MenuItem value="train">火车</MenuItem>
                    <MenuItem value="bus">大巴</MenuItem>
                    <MenuItem value="car">汽车</MenuItem>
                    <MenuItem value="other">其他</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="座位等级"
                  value={transportForm.seatClass}
                  onChange={(e) => setTransportForm({ ...transportForm, seatClass: e.target.value })}
                  required
                  placeholder="如：经济舱、商务舱、一等座"
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  type="number"
                  label="最高金额"
                  value={transportForm.maxAmount}
                  onChange={(e) => setTransportForm({ ...transportForm, maxAmount: e.target.value })}
                  required
                  inputProps={{ min: 0, step: 0.01 }}
                  InputProps={{ startAdornment: '¥' }}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel>城市级别</InputLabel>
                  <Select
                    value={transportForm.cityLevel}
                    onChange={(e) => setTransportForm({ ...transportForm, cityLevel: e.target.value })}
                    label="城市级别"
                  >
                    <MenuItem value="">不限</MenuItem>
                    <MenuItem value={1}>1级 - 一线城市</MenuItem>
                    <MenuItem value={2}>2级 - 二线城市</MenuItem>
                    <MenuItem value={3}>3级 - 三线城市</MenuItem>
                    <MenuItem value={4}>4级 - 其他城市</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="距离范围"
                  value={transportForm.distanceRange}
                  onChange={(e) => setTransportForm({ ...transportForm, distanceRange: e.target.value })}
                  placeholder="如：>1000km、<500km、全部"
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  multiline
                  rows={2}
                  label="备注"
                  value={transportForm.remark}
                  onChange={(e) => setTransportForm({ ...transportForm, remark: e.target.value })}
                />
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setTransportDialog({ open: false, data: null, mode: 'create' })}>取消</Button>
            <Button onClick={handleSaveTransport} variant="contained">保存</Button>
          </DialogActions>
        </Dialog>

        {/* 住宿费用对话框 */}
        <Dialog open={accommodationDialog.open} onClose={() => setAccommodationDialog({ open: false, data: null, mode: 'create' })} maxWidth="md" fullWidth>
          <DialogTitle>{accommodationDialog.mode === 'create' ? '新增住宿费用标准' : '编辑住宿费用标准'}</DialogTitle>
          <DialogContent>
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid item xs={12} md={6}>
                <FormControl fullWidth required>
                  <InputLabel>职级</InputLabel>
                  <Select
                    value={accommodationForm.jobLevelCode}
                    onChange={(e) => setAccommodationForm({ ...accommodationForm, jobLevelCode: e.target.value })}
                    label="职级"
                  >
                    {jobLevels.map((jl) => (
                      <MenuItem key={jl.levelCode} value={jl.levelCode}>
                        {jl.levelName}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={6}>
                <FormControl fullWidth required>
                  <InputLabel>城市级别</InputLabel>
                  <Select
                    value={accommodationForm.cityLevel}
                    onChange={(e) => setAccommodationForm({ ...accommodationForm, cityLevel: e.target.value })}
                    label="城市级别"
                  >
                    <MenuItem value={1}>1级 - 一线城市</MenuItem>
                    <MenuItem value={2}>2级 - 二线城市</MenuItem>
                    <MenuItem value={3}>3级 - 三线城市</MenuItem>
                    <MenuItem value={4}>4级 - 其他城市</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  type="number"
                  label="每晚最高金额"
                  value={accommodationForm.maxAmountPerNight}
                  onChange={(e) => setAccommodationForm({ ...accommodationForm, maxAmountPerNight: e.target.value })}
                  required
                  inputProps={{ min: 0, step: 0.01 }}
                  InputProps={{ startAdornment: '¥' }}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="星级要求"
                  value={accommodationForm.starLevel}
                  onChange={(e) => setAccommodationForm({ ...accommodationForm, starLevel: e.target.value })}
                  placeholder="如：四星级及以下、五星级"
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  multiline
                  rows={2}
                  label="备注"
                  value={accommodationForm.remark}
                  onChange={(e) => setAccommodationForm({ ...accommodationForm, remark: e.target.value })}
                />
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setAccommodationDialog({ open: false, data: null, mode: 'create' })}>取消</Button>
            <Button onClick={handleSaveAccommodation} variant="contained">保存</Button>
          </DialogActions>
        </Dialog>

        {/* 餐饮费用对话框 */}
        <Dialog open={mealDialog.open} onClose={() => setMealDialog({ open: false, data: null, mode: 'create' })} maxWidth="md" fullWidth>
          <DialogTitle>{mealDialog.mode === 'create' ? '新增餐饮费用标准' : '编辑餐饮费用标准'}</DialogTitle>
          <DialogContent>
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid item xs={12} md={6}>
                <FormControl fullWidth required>
                  <InputLabel>职级</InputLabel>
                  <Select
                    value={mealForm.jobLevelCode}
                    onChange={(e) => setMealForm({ ...mealForm, jobLevelCode: e.target.value })}
                    label="职级"
                  >
                    {jobLevels.map((jl) => (
                      <MenuItem key={jl.levelCode} value={jl.levelCode}>
                        {jl.levelName}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={6}>
                <FormControl fullWidth required>
                  <InputLabel>城市级别</InputLabel>
                  <Select
                    value={mealForm.cityLevel}
                    onChange={(e) => setMealForm({ ...mealForm, cityLevel: e.target.value })}
                    label="城市级别"
                  >
                    <MenuItem value={1}>1级 - 一线城市</MenuItem>
                    <MenuItem value={2}>2级 - 二线城市</MenuItem>
                    <MenuItem value={3}>3级 - 三线城市</MenuItem>
                    <MenuItem value={4}>4级 - 其他城市</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={4}>
                <TextField
                  fullWidth
                  type="number"
                  label="早餐金额"
                  value={mealForm.breakfastAmount}
                  onChange={(e) => setMealForm({ ...mealForm, breakfastAmount: e.target.value })}
                  inputProps={{ min: 0, step: 0.01 }}
                  InputProps={{ startAdornment: '¥' }}
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <TextField
                  fullWidth
                  type="number"
                  label="午餐金额"
                  value={mealForm.lunchAmount}
                  onChange={(e) => setMealForm({ ...mealForm, lunchAmount: e.target.value })}
                  inputProps={{ min: 0, step: 0.01 }}
                  InputProps={{ startAdornment: '¥' }}
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <TextField
                  fullWidth
                  type="number"
                  label="晚餐金额"
                  value={mealForm.dinnerAmount}
                  onChange={(e) => setMealForm({ ...mealForm, dinnerAmount: e.target.value })}
                  inputProps={{ min: 0, step: 0.01 }}
                  InputProps={{ startAdornment: '¥' }}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  type="number"
                  label="每日总额"
                  value={mealForm.dailyTotal}
                  onChange={(e) => setMealForm({ ...mealForm, dailyTotal: e.target.value })}
                  required
                  inputProps={{ min: 0, step: 0.01 }}
                  InputProps={{ startAdornment: '¥' }}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  multiline
                  rows={2}
                  label="备注"
                  value={mealForm.remark}
                  onChange={(e) => setMealForm({ ...mealForm, remark: e.target.value })}
                />
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setMealDialog({ open: false, data: null, mode: 'create' })}>取消</Button>
            <Button onClick={handleSaveMeal} variant="contained">保存</Button>
          </DialogActions>
        </Dialog>

        {/* 津贴补贴对话框 */}
        <Dialog open={allowanceDialog.open} onClose={() => setAllowanceDialog({ open: false, data: null, mode: 'create' })} maxWidth="md" fullWidth>
          <DialogTitle>{allowanceDialog.mode === 'create' ? '新增津贴补贴标准' : '编辑津贴补贴标准'}</DialogTitle>
          <DialogContent>
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid item xs={12} md={6}>
                <FormControl fullWidth required>
                  <InputLabel>职级</InputLabel>
                  <Select
                    value={allowanceForm.jobLevelCode}
                    onChange={(e) => setAllowanceForm({ ...allowanceForm, jobLevelCode: e.target.value })}
                    label="职级"
                  >
                    {jobLevels.map((jl) => (
                      <MenuItem key={jl.levelCode} value={jl.levelCode}>
                        {jl.levelName}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="津贴类型"
                  value={allowanceForm.allowanceType}
                  onChange={(e) => setAllowanceForm({ ...allowanceForm, allowanceType: e.target.value })}
                  required
                  placeholder="如：通讯补贴、市内交通"
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <FormControl fullWidth required>
                  <InputLabel>计算方式</InputLabel>
                  <Select
                    value={allowanceForm.amountType}
                    onChange={(e) => setAllowanceForm({ ...allowanceForm, amountType: e.target.value })}
                    label="计算方式"
                  >
                    <MenuItem value="daily">按天</MenuItem>
                    <MenuItem value="per_trip">按次</MenuItem>
                    <MenuItem value="fixed">固定金额</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  type="number"
                  label="金额"
                  value={allowanceForm.amount}
                  onChange={(e) => setAllowanceForm({ ...allowanceForm, amount: e.target.value })}
                  required
                  inputProps={{ min: 0, step: 0.01 }}
                  InputProps={{ startAdornment: '¥' }}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  multiline
                  rows={2}
                  label="备注"
                  value={allowanceForm.remark}
                  onChange={(e) => setAllowanceForm({ ...allowanceForm, remark: e.target.value })}
                />
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setAllowanceDialog({ open: false, data: null, mode: 'create' })}>取消</Button>
            <Button onClick={handleSaveAllowance} variant="contained">保存</Button>
          </DialogActions>
        </Dialog>

        {/* 其他费用对话框 */}
        <Dialog open={otherExpenseDialog.open} onClose={() => setOtherExpenseDialog({ open: false, data: null, mode: 'create' })} maxWidth="md" fullWidth>
          <DialogTitle>{otherExpenseDialog.mode === 'create' ? '新增其他费用标准' : '编辑其他费用标准'}</DialogTitle>
          <DialogContent>
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid item xs={12} md={6}>
                <FormControl fullWidth required>
                  <InputLabel>费用类型</InputLabel>
                  <Select
                    value={otherExpenseForm.expenseType}
                    onChange={(e) => {
                      const typeMap = {
                        entertainment: '娱乐费用',
                        communication: '通讯费用',
                        office_supplies: '办公用品',
                        training: '培训费用',
                        parking: '停车费',
                        toll: '过路费',
                        insurance: '保险费用',
                        visa: '签证费用',
                        other: '其他费用'
                      };
                      setOtherExpenseForm({ 
                        ...otherExpenseForm, 
                        expenseType: e.target.value,
                        expenseTypeName: typeMap[e.target.value] || e.target.value
                      });
                    }}
                    label="费用类型"
                  >
                    <MenuItem value="entertainment">娱乐费用</MenuItem>
                    <MenuItem value="communication">通讯费用</MenuItem>
                    <MenuItem value="office_supplies">办公用品</MenuItem>
                    <MenuItem value="training">培训费用</MenuItem>
                    <MenuItem value="parking">停车费</MenuItem>
                    <MenuItem value="toll">过路费</MenuItem>
                    <MenuItem value="insurance">保险费用</MenuItem>
                    <MenuItem value="visa">签证费用</MenuItem>
                    <MenuItem value="other">其他费用</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="费用类型名称"
                  value={otherExpenseForm.expenseTypeName}
                  onChange={(e) => setOtherExpenseForm({ ...otherExpenseForm, expenseTypeName: e.target.value })}
                  required
                  placeholder="自定义费用类型名称"
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <FormControl fullWidth required>
                  <InputLabel>职级</InputLabel>
                  <Select
                    value={otherExpenseForm.jobLevelCode}
                    onChange={(e) => setOtherExpenseForm({ ...otherExpenseForm, jobLevelCode: e.target.value })}
                    label="职级"
                  >
                    {jobLevels.map((jl) => (
                      <MenuItem key={jl.levelCode} value={jl.levelCode}>
                        {jl.levelName}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel>城市级别</InputLabel>
                  <Select
                    value={otherExpenseForm.cityLevel}
                    onChange={(e) => setOtherExpenseForm({ ...otherExpenseForm, cityLevel: e.target.value })}
                    label="城市级别"
                  >
                    <MenuItem value="">不限</MenuItem>
                    <MenuItem value={1}>1级 - 一线城市</MenuItem>
                    <MenuItem value={2}>2级 - 二线城市</MenuItem>
                    <MenuItem value={3}>3级 - 三线城市</MenuItem>
                    <MenuItem value={4}>4级 - 其他城市</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={6}>
                <FormControl fullWidth required>
                  <InputLabel>计算方式</InputLabel>
                  <Select
                    value={otherExpenseForm.amountType}
                    onChange={(e) => setOtherExpenseForm({ ...otherExpenseForm, amountType: e.target.value })}
                    label="计算方式"
                  >
                    <MenuItem value="daily">按天</MenuItem>
                    <MenuItem value="per_trip">按次</MenuItem>
                    <MenuItem value="per_item">按项</MenuItem>
                    <MenuItem value="percentage">按比例</MenuItem>
                    <MenuItem value="fixed">固定金额</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              {otherExpenseForm.amountType === 'percentage' ? (
                <>
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      type="number"
                      label="比例 (%)"
                      value={otherExpenseForm.percentage}
                      onChange={(e) => setOtherExpenseForm({ ...otherExpenseForm, percentage: e.target.value })}
                      required
                      inputProps={{ min: 0, max: 100, step: 0.01 }}
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      type="number"
                      label="基础金额"
                      value={otherExpenseForm.baseAmount}
                      onChange={(e) => setOtherExpenseForm({ ...otherExpenseForm, baseAmount: e.target.value })}
                      required
                      inputProps={{ min: 0, step: 0.01 }}
                      InputProps={{ startAdornment: '¥' }}
                    />
                  </Grid>
                </>
              ) : (
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    type="number"
                    label="金额"
                    value={otherExpenseForm.amount}
                    onChange={(e) => setOtherExpenseForm({ ...otherExpenseForm, amount: e.target.value })}
                    required
                    inputProps={{ min: 0, step: 0.01 }}
                    InputProps={{ startAdornment: '¥' }}
                  />
                </Grid>
              )}
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="适用范围"
                  value={otherExpenseForm.applicableScope}
                  onChange={(e) => setOtherExpenseForm({ ...otherExpenseForm, applicableScope: e.target.value })}
                  placeholder="如：客户招待、团队聚餐、电话费等"
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={otherExpenseForm.hasMaxLimit}
                      onChange={(e) => setOtherExpenseForm({ ...otherExpenseForm, hasMaxLimit: e.target.checked })}
                    />
                  }
                  label="设置上限"
                />
              </Grid>
              {otherExpenseForm.hasMaxLimit && (
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    type="number"
                    label="上限金额"
                    value={otherExpenseForm.maxLimit}
                    onChange={(e) => setOtherExpenseForm({ ...otherExpenseForm, maxLimit: e.target.value })}
                    inputProps={{ min: 0, step: 0.01 }}
                    InputProps={{ startAdornment: '¥' }}
                  />
                </Grid>
              )}
              <Grid item xs={12} md={6}>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={otherExpenseForm.requireReceipt}
                      onChange={(e) => setOtherExpenseForm({ ...otherExpenseForm, requireReceipt: e.target.checked })}
                    />
                  }
                  label="需要票据"
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={otherExpenseForm.requireApproval}
                      onChange={(e) => setOtherExpenseForm({ ...otherExpenseForm, requireApproval: e.target.checked })}
                    />
                  }
                  label="需要审批"
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  multiline
                  rows={2}
                  label="备注"
                  value={otherExpenseForm.remark}
                  onChange={(e) => setOtherExpenseForm({ ...otherExpenseForm, remark: e.target.value })}
                />
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setOtherExpenseDialog({ open: false, data: null, mode: 'create' })}>取消</Button>
            <Button onClick={handleSaveOtherExpense} variant="contained">保存</Button>
          </DialogActions>
        </Dialog>

        {/* 删除确认对话框 */}
        <Dialog open={deleteDialog.open} onClose={() => setDeleteDialog({ open: false, type: '', id: null })}>
          <DialogTitle>确认删除</DialogTitle>
          <DialogContent>
            <Typography>确定要删除这条费用标准吗？此操作无法撤销。</Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDeleteDialog({ open: false, type: '', id: null })}>取消</Button>
            <Button onClick={handleDelete} color="error" variant="contained">
              删除
            </Button>
          </DialogActions>
        </Dialog>
      </Paper>
    </Container>
  );
};

export default ExpenseItemsManagement;
