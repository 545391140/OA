import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container,
  Paper,
  Box,
  Typography,
  Button,
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
  Alert,
  CircularProgress,
  Divider,
  Grid,
  Chip
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon
} from '@mui/icons-material';
import axios from 'axios';
import { useNotification } from '../../contexts/NotificationContext';
import { useAuth } from '../../contexts/AuthContext';

const ExpenseItemsMaintenance = () => {
  const navigate = useNavigate();
  const { showNotification } = useNotification();
  const { user } = useAuth();
  const canEdit = user?.role === 'admin' || user?.role === 'finance';

  // 数据状态
  const [expenseItems, setExpenseItems] = useState([]);
  const [standards, setStandards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deleteDialog, setDeleteDialog] = useState({ open: false, item: null });

  // 新增/编辑对话框状态
  const [formDialog, setFormDialog] = useState({ open: false, item: null, mode: 'create' });
  const [formData, setFormData] = useState({
    standardId: '',
    itemName: '',
    amount: '',
    description: '',
    status: 'enabled',
    parentItemId: ''
  });
  const [parentItemId, setParentItemId] = useState(null); // 当前选择的父费用项ID（用于添加子项）

  useEffect(() => {
    fetchAllData();
  }, []);

  const fetchAllData = async () => {
    try {
      setLoading(true);
      const [standardsRes, expenseItemsRes] = await Promise.all([
        axios.get('/api/travel-standards'),
        axios.get('/api/expense-items') // 获取所有费用项
      ]);

      if (standardsRes.data && standardsRes.data.success) {
        setStandards(standardsRes.data.data || []);
      }

      if (expenseItemsRes.data && expenseItemsRes.data.success) {
        const items = expenseItemsRes.data.data || [];
        
        // 创建标准映射以便显示标准信息
        const standardMap = {};
        if (standardsRes.data && standardsRes.data.success) {
          standardsRes.data.data.forEach(standard => {
            standardMap[standard._id] = {
              code: standard.standardCode,
              name: standard.standardName
            };
          });
        }

        // 为每个费用项添加标准信息和父项信息
        const enrichedItems = items.map(item => {
          const standardInfo = item.standard && typeof item.standard === 'object' 
            ? { code: item.standard.standardCode, name: item.standard.standardName }
            : (item.standard ? standardMap[item.standard] : null);

          // 处理父项信息：可能是populated对象、ID字符串或null
          let parentInfo = null;
          if (item.parentItem) {
            if (typeof item.parentItem === 'object' && item.parentItem._id) {
              // populated对象
              parentInfo = { 
                id: item.parentItem._id.toString(), 
                name: item.parentItem.itemName 
              };
            } else if (typeof item.parentItem === 'string') {
              // 只是ID字符串，需要查找对应的费用项名称
              const parentItemObj = items.find(p => p._id === item.parentItem || p._id?.toString() === item.parentItem);
              if (parentItemObj) {
                parentInfo = {
                  id: parentItemObj._id.toString(),
                  name: parentItemObj.itemName
                };
              } else {
                parentInfo = { id: item.parentItem, name: '其他费用' };
              }
            }
          }

          return {
            ...item,
            standardCode: standardInfo?.code || '-',
            standardName: standardInfo?.name || '-',
            standard: item.standard?._id || item.standard || null,
            parentItem: parentInfo,
            _idStr: item._id?.toString() || item._id // 用于匹配的字符串ID
          };
        });

        // 按层级关系组织费用项：父项在前，子项紧随其后
        const organizedItems = [];
        const processedIds = new Set();
        
        // 先添加所有父项（没有parentItem的项）
        enrichedItems.forEach(item => {
          if (!item.parentItem && !processedIds.has(item._idStr)) {
            organizedItems.push(item);
            processedIds.add(item._idStr);
            
            // 然后添加该父项的所有子项
            const children = enrichedItems.filter(child => {
              if (!child.parentItem || processedIds.has(child._idStr)) {
                return false;
              }
              // 匹配父项ID：支持多种格式
              const parentId = child.parentItem.id || child.parentItem;
              const itemId = item._idStr || item._id?.toString();
              return parentId === itemId || parentId === item._id || parentId?.toString() === itemId;
            });
            
            children.forEach(child => {
              organizedItems.push(child);
              processedIds.add(child._idStr);
            });
          }
        });
        
        // 添加剩余的项（可能是数据不一致的情况）
        enrichedItems.forEach(item => {
          if (!processedIds.has(item._idStr)) {
            organizedItems.push(item);
          }
        });

        setExpenseItems(organizedItems);
      }
    } catch (err) {
      console.error('Fetch data error:', err);
      showNotification('加载数据失败', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenAddDialog = (parentItem = null) => {
    setFormData({
      standardId: '',
      itemName: '',
      amount: '',
      description: '',
      status: 'enabled',
      parentItemId: parentItem ? parentItem._id : ''
    });
    setParentItemId(parentItem ? parentItem._id : null);
    setFormDialog({ open: true, item: null, mode: 'create' });
  };

  const handleOpenEditDialog = (item) => {
    // 处理parentItem：可能是对象（包含id和name）或字符串ID或null
    let parentItemIdValue = '';
    if (item.parentItem) {
      if (typeof item.parentItem === 'object' && item.parentItem.id) {
        // 如果是对象，提取id
        parentItemIdValue = item.parentItem.id;
      } else if (typeof item.parentItem === 'string') {
        // 如果是字符串，直接使用
        parentItemIdValue = item.parentItem;
      } else if (item.parentItem._id) {
        // 如果是populated对象，使用_id
        parentItemIdValue = item.parentItem._id;
      }
    }
    
    // 处理standard：可能是对象或字符串ID或null
    let standardIdValue = '';
    if (item.standard) {
      if (typeof item.standard === 'object' && item.standard._id) {
        standardIdValue = item.standard._id;
      } else if (typeof item.standard === 'string') {
        standardIdValue = item.standard;
      }
    }
    
    setFormData({
      standardId: standardIdValue,
      itemName: item.itemName || '',
      amount: item.amount || '',
      description: item.description || '',
      status: item.status || 'enabled',
      parentItemId: parentItemIdValue
    });
    setParentItemId(parentItemIdValue || null);
    setFormDialog({ open: true, item, mode: 'edit' });
  };

  const handleSave = async () => {
    try {
      if (!formData.itemName || !formData.itemName.trim()) {
        showNotification('请输入费用项目名称', 'warning');
        return;
      }

      const payload = {
        itemName: formData.itemName.trim(),
        description: formData.description.trim() || undefined,
        status: formData.status || 'enabled'
      };

      // 如果选择了父费用项，则添加到payload中
      if (formData.parentItemId || parentItemId) {
        payload.parentItem = formData.parentItemId || parentItemId;
      }

      // 如果填写了金额，则添加到payload中
      if (formData.amount && formData.amount.trim()) {
        const amountValue = parseFloat(formData.amount);
        if (amountValue >= 0) {
          payload.amount = amountValue;
        } else {
          showNotification('金额必须大于等于0', 'warning');
          return;
        }
      }

      // 如果选择了标准，则添加到payload中
      if (formData.standardId) {
        payload.standardId = formData.standardId;
      }

      if (formDialog.mode === 'create') {
        await axios.post('/api/expense-items', payload);
        showNotification('费用项创建成功', 'success');
      } else {
        // 编辑时也包含standardId（如果修改了标准）
        if (formData.standardId !== undefined && formData.standardId !== null && formData.standardId !== '') {
          payload.standardId = formData.standardId;
        } else if (formData.standardId === '' || formData.standardId === null) {
          payload.standardId = null; // 空字符串或null表示解除关联
        }
        // 编辑时也包含parentItem（确保是字符串ID，不是对象）
        const parentItemIdToSend = formData.parentItemId || parentItemId;
        if (parentItemIdToSend !== undefined && parentItemIdToSend !== null && parentItemIdToSend !== '') {
          // 如果是对象，提取id；如果是字符串，直接使用
          payload.parentItem = typeof parentItemIdToSend === 'object' && parentItemIdToSend.id 
            ? parentItemIdToSend.id 
            : parentItemIdToSend;
        } else if (parentItemIdToSend === '' || parentItemIdToSend === null) {
          payload.parentItem = null; // 空字符串或null表示解除关联
        }
        await axios.put(`/api/expense-items/item/${formDialog.item._id}`, payload);
        showNotification('费用项更新成功', 'success');
      }

      setFormDialog({ open: false, item: null, mode: 'create' });
      fetchAllData();
    } catch (err) {
      console.error('Save expense item error:', err);
      showNotification('保存失败: ' + (err.response?.data?.message || '未知错误'), 'error');
    }
  };

  const handleDelete = async () => {
    try {
      const { item } = deleteDialog;
      await axios.delete(`/api/expense-items/item/${item._id}`);
      showNotification('删除成功', 'success');
      setDeleteDialog({ open: false, item: null });
      fetchAllData();
    } catch (err) {
      console.error('Delete error:', err);
      showNotification('删除失败: ' + (err.response?.data?.message || '未知错误'), 'error');
    }
  };

  if (loading) {
    return (
      <Container maxWidth="xl" sx={{ py: 4 }}>
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      <Paper elevation={3} sx={{ p: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h4">费用项目维护</Typography>
          {canEdit && (
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={handleOpenAddDialog}
            >
              新增费用项
            </Button>
          )}
        </Box>

        <Divider sx={{ mb: 3 }} />

        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>标准编码</TableCell>
                <TableCell>标准名称</TableCell>
                <TableCell>费用项目名称</TableCell>
                <TableCell>费用项目金额</TableCell>
                <TableCell>费用项目说明</TableCell>
                <TableCell>状态</TableCell>
                <TableCell align="right">操作</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {expenseItems.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} align="center">
                    {canEdit ? (
                      <Box sx={{ py: 4 }}>
                        <Typography variant="body2" color="text.secondary" gutterBottom>
                          暂无费用项
                        </Typography>
                        <Button
                          variant="outlined"
                          startIcon={<AddIcon />}
                          onClick={handleOpenAddDialog}
                          sx={{ mt: 2 }}
                        >
                          创建第一个费用项
                        </Button>
                      </Box>
                    ) : (
                      <Typography variant="body2" color="text.secondary">
                        暂无数据
                      </Typography>
                    )}
                  </TableCell>
                </TableRow>
              ) : (
                expenseItems.map((item) => (
                  <TableRow 
                    key={item._id} 
                    hover
                    sx={{
                      backgroundColor: item.parentItem ? 'action.hover' : 'transparent',
                      '&:hover': {
                        backgroundColor: item.parentItem ? 'action.selected' : 'action.hover'
                      }
                    }}
                  >
                    <TableCell>{item.standardCode}</TableCell>
                    <TableCell>{item.standardName}</TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                        {item.parentItem && (
                          <Box sx={{ 
                            display: 'inline-flex', 
                            alignItems: 'center',
                            ml: 3,
                            pl: 2,
                            borderLeft: '2px solid',
                            borderColor: 'primary.light',
                            position: 'relative',
                            '&::before': {
                              content: '""',
                              position: 'absolute',
                              left: '-2px',
                              top: '-8px',
                              width: '2px',
                              height: '8px',
                              backgroundColor: 'primary.light'
                            }
                          }}>
                            <Typography variant="body2" color="primary.main" sx={{ mr: 1, fontWeight: 'medium' }}>
                              └─
                            </Typography>
                            <Chip 
                              label={item.parentItem?.name || '其他费用'}
                              size="small" 
                              color="primary" 
                              variant="outlined"
                              sx={{ height: '20px', fontSize: '0.7rem' }}
                            />
                            <Typography variant="body2" color="text.secondary" sx={{ mx: 0.5 }}>
                              ›
                            </Typography>
                          </Box>
                        )}
                        <Typography 
                          variant={item.parentItem ? 'body2' : 'body1'}
                          sx={{ 
                            fontWeight: item.parentItem ? 'normal' : 'medium',
                            color: item.parentItem ? 'text.secondary' : 'text.primary'
                          }}
                        >
                          {item.itemName}
                        </Typography>
                        {item.isSystemDefault && (
                          <Chip label="系统默认" size="small" color="info" variant="outlined" sx={{ ml: 1 }} />
                        )}
                      </Box>
                    </TableCell>
                    <TableCell>
                      {item.amount !== undefined && item.amount !== null 
                        ? `¥${item.amount.toLocaleString()}` 
                        : '-'}
                    </TableCell>
                    <TableCell>{item.description || '-'}</TableCell>
                    <TableCell>
                      <Chip
                        label={item.status === 'enabled' ? '启用' : '禁用'}
                        color={item.status === 'enabled' ? 'success' : 'default'}
                        size="small"
                      />
                    </TableCell>
                    <TableCell align="right">
                      {canEdit && (
                        <>
                          {item.status === 'enabled' ? (
                            <IconButton
                              size="small"
                              color="error"
                              onClick={async () => {
                                try {
                                  await axios.put(`/api/expense-items/item/${item._id}/disable`);
                                  showNotification('费用项已禁用', 'success');
                                  fetchAllData();
                                } catch (err) {
                                  showNotification('操作失败: ' + (err.response?.data?.message || '未知错误'), 'error');
                                }
                              }}
                              title="禁用"
                            >
                              <CancelIcon />
                            </IconButton>
                          ) : (
                            <IconButton
                              size="small"
                              color="success"
                              onClick={async () => {
                                try {
                                  await axios.put(`/api/expense-items/item/${item._id}/enable`);
                                  showNotification('费用项已启用', 'success');
                                  fetchAllData();
                                } catch (err) {
                                  showNotification('操作失败: ' + (err.response?.data?.message || '未知错误'), 'error');
                                }
                              }}
                              title="启用"
                            >
                              <CheckCircleIcon />
                            </IconButton>
                          )}
                          <IconButton
                            size="small"
                            onClick={() => handleOpenEditDialog(item)}
                            title="编辑"
                          >
                            <EditIcon />
                          </IconButton>
                          {!item.isSystemDefault && (
                            <IconButton
                              size="small"
                              color="error"
                              onClick={() => setDeleteDialog({ open: true, item })}
                              title="删除"
                            >
                              <DeleteIcon />
                            </IconButton>
                          )}
                          {item.itemName === '其他费用' && (
                            <IconButton
                              size="small"
                              color="primary"
                              onClick={() => handleOpenAddDialog(item)}
                              title="添加子费用项"
                            >
                              <AddIcon />
                            </IconButton>
                          )}
                        </>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>

        {/* 新增/编辑费用项对话框 */}
        <Dialog 
          open={formDialog.open} 
          onClose={() => setFormDialog({ open: false, item: null, mode: 'create' })} 
          maxWidth="md" 
          fullWidth
        >
          <DialogTitle>
            {formDialog.mode === 'create' ? '新增费用项' : '编辑费用项'}
          </DialogTitle>
          <DialogContent>
            <Grid container spacing={2} sx={{ mt: 1 }}>
              {parentItemId && (
                <Grid item xs={12}>
                  <Alert severity="info">
                    正在为"其他费用"添加子费用项
                  </Alert>
                </Grid>
              )}
              <Grid item xs={12}>
                <FormControl fullWidth>
                  <InputLabel>差旅标准</InputLabel>
                  <Select
                    value={formData.standardId || ''} // 确保null转换为空字符串
                    onChange={(e) => setFormData({ ...formData, standardId: e.target.value || '' })}
                    label="差旅标准"
                    disabled={formDialog.mode === 'edit' || !!parentItemId} // 编辑模式下或添加子项时不允许修改标准
                  >
                    <MenuItem value="">
                      <em>不关联标准（可选）</em>
                    </MenuItem>
                    {standards.map((standard) => (
                      <MenuItem key={standard._id} value={standard._id}>
                        {standard.standardCode} - {standard.standardName}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              {parentItemId && (
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="父费用项"
                    value="其他费用"
                    disabled
                    helperText='此费用项将作为"其他费用"的子项'
                  />
                </Grid>
              )}
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="费用项目名称"
                  value={formData.itemName}
                  onChange={(e) => setFormData({ ...formData, itemName: e.target.value })}
                  required
                  placeholder="如：交通费、住宿费、餐饮费等"
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  type="number"
                  label="费用项目金额"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  inputProps={{ min: 0, step: 0.01 }}
                  InputProps={{ startAdornment: '¥' }}
                  placeholder="请输入金额（可选）"
                  helperText="可选字段，如果不填写则表示无金额限制"
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  multiline
                  rows={4}
                  label="费用项目说明"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="请输入费用项目的详细说明..."
                />
              </Grid>
              <Grid item xs={12}>
                <FormControl fullWidth>
                  <InputLabel>状态</InputLabel>
                  <Select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    label="状态"
                  >
                    <MenuItem value="enabled">启用</MenuItem>
                    <MenuItem value="disabled">禁用</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setFormDialog({ open: false, item: null, mode: 'create' })}>
              取消
            </Button>
            <Button onClick={handleSave} variant="contained">
              保存
            </Button>
          </DialogActions>
        </Dialog>

        {/* 删除确认对话框 */}
        <Dialog open={deleteDialog.open} onClose={() => setDeleteDialog({ open: false, item: null })}>
          <DialogTitle>确认删除</DialogTitle>
          <DialogContent>
            <Typography>确定要删除费用项 "{deleteDialog.item?.itemName}" 吗？此操作无法撤销。</Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDeleteDialog({ open: false, item: null })}>取消</Button>
            <Button onClick={handleDelete} color="error" variant="contained">
              删除
            </Button>
          </DialogActions>
        </Dialog>
      </Paper>
    </Container>
  );
};

export default ExpenseItemsMaintenance;
