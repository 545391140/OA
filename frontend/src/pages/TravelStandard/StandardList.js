import React, { useState, useEffect } from 'react';
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
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  CheckCircle as ActivateIcon,
  Cancel as DeactivateIcon,
  Visibility as ViewIcon
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../../contexts/AuthContext';

const StandardList = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [standards, setStandards] = useState([]);
  const [expenseItemsMap, setExpenseItemsMap] = useState({}); // 费用项ID到名称的映射
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [deleteDialog, setDeleteDialog] = useState({ open: false, id: null });

  useEffect(() => {
    fetchStandards();
    fetchExpenseItems();
  }, []);

  const fetchExpenseItems = async () => {
    try {
      const response = await axios.get('/api/expense-items');
      if (response.data && response.data.success) {
        const items = response.data.data || [];
        // 创建ID到名称的映射
        const map = {};
        items.forEach(item => {
          map[item._id] = item.itemName;
        });
        setExpenseItemsMap(map);
      }
    } catch (err) {
      console.error('Fetch expense items error:', err);
      // 不影响标准列表的显示，只记录错误
    }
  };

  const fetchStandards = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await axios.get('/api/travel-standards');
      // 处理不同的响应格式
      if (response.data) {
        if (response.data.success === true || response.data.success === false) {
          // 标准格式: { success: true/false, data: [...], message: '...' }
          if (response.data.success) {
            setStandards(response.data.data || []);
          } else {
            setError(response.data.message || '获取标准列表失败');
          }
        } else if (response.data.error) {
          // Rate limit 或其他错误格式: { error: '...' }
          setError(response.data.error);
        } else if (Array.isArray(response.data)) {
          // 直接返回数组
          setStandards(response.data);
        } else if (response.data.data) {
          // 有data字段但无success字段
          setStandards(response.data.data || []);
        } else {
          setError('无法解析服务器响应');
        }
      } else {
        setError('服务器响应为空');
      }
    } catch (err) {
      console.error('Fetch standards error:', err);
      let errorMessage = '获取标准列表失败';
      
      if (err.response) {
        // 服务器返回了错误响应
        if (err.response.data) {
          if (err.response.data.error) {
            errorMessage = err.response.data.error;
          } else if (err.response.data.message) {
            errorMessage = err.response.data.message;
          } else {
            errorMessage = `请求失败 (${err.response.status})`;
          }
        } else {
          errorMessage = `请求失败 (${err.response.status})`;
        }
      } else if (err.message) {
        errorMessage = err.message;
      }
      
      // 特殊处理 rate limit 错误
      if (errorMessage.includes('Too many requests') || errorMessage.includes('rate limit')) {
        errorMessage = '请求过于频繁，请稍后再试';
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    try {
      await axios.delete(`/api/travel-standards/${deleteDialog.id}`);
      setDeleteDialog({ open: false, id: null });
      fetchStandards();
    } catch (err) {
      console.error('Delete standard error:', err);
      alert('删除失败: ' + (err.response?.data?.message || '未知错误'));
    }
  };

  const handleActivate = async (id) => {
    try {
      await axios.put(`/api/travel-standards/${id}/activate`);
      fetchStandards();
    } catch (err) {
      console.error('Activate standard error:', err);
      alert('启用失败: ' + (err.response?.data?.message || '未知错误'));
    }
  };

  const handleDeactivate = async (id) => {
    try {
      await axios.put(`/api/travel-standards/${id}/deactivate`);
      fetchStandards();
    } catch (err) {
      console.error('Deactivate standard error:', err);
      alert('停用失败: ' + (err.response?.data?.message || '未知错误'));
    }
  };

  const getStatusColor = (status) => {
    const colorMap = {
      draft: 'default',
      active: 'success',
      expired: 'error'
    };
    return colorMap[status] || 'default';
  };

  const getStatusLabel = (status) => {
    const labelMap = {
      draft: '草稿',
      active: '生效',
      expired: '失效'
    };
    return labelMap[status] || status;
  };

  const canEdit = user?.role === 'admin' || user?.role === 'finance';

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      <Paper elevation={3} sx={{ p: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h4">差旅标准管理</Typography>
          <Button
            variant="contained"
            color="primary"
            startIcon={<AddIcon />}
            onClick={() => navigate('/travel-standards/new')}
            sx={{ minWidth: 140 }}
          >
            新增差旅标准
          </Button>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        <TableContainer>
          <Table>
            <TableHead>
                    <TableRow>
                      <TableCell>标准编码</TableCell>
                      <TableCell>标准名称</TableCell>
                      <TableCell>优先级</TableCell>
                      <TableCell>适用条件</TableCell>
                      <TableCell>费用项数</TableCell>
                      <TableCell>版本</TableCell>
                      <TableCell>生效日期</TableCell>
                      <TableCell>失效日期</TableCell>
                      <TableCell>状态</TableCell>
                      <TableCell align="right">操作</TableCell>
                    </TableRow>
            </TableHead>
            <TableBody>
                     {loading ? (
                       <TableRow>
                         <TableCell colSpan={10} align="center">
                           加载中...
                         </TableCell>
                       </TableRow>
                     ) : standards.length === 0 ? (
                       <TableRow>
                         <TableCell colSpan={10} align="center">
                           暂无数据
                         </TableCell>
                       </TableRow>
              ) : (
                       standards.map((standard) => {
                         // 计算条件组数量
                         const conditionCount = standard.conditionGroups?.length || 0;
                         const totalConditionCount = standard.conditionGroups?.reduce((sum, group) => 
                           sum + (group.conditions?.length || 0), 0
                         ) || 0;
                         
                         // 计算费用项数量
                         const expenseItemCount = Object.values(standard.expenseItemsConfigured || {})
                           .filter(configured => configured === true).length;
                         
                         // 获取优先级标签
                         const getPriorityLabel = (priority) => {
                           if (priority >= 90) return '高';
                           if (priority >= 60) return '中';
                           return '低';
                         };
                         
                         const getPriorityColor = (priority) => {
                           if (priority >= 90) return 'error';
                           if (priority >= 60) return 'warning';
                           return 'info';
                         };
                         
                         return (
                           <TableRow key={standard._id} hover>
                             <TableCell>{standard.standardCode}</TableCell>
                             <TableCell>
                               <Box>
                                 <Typography variant="body2" fontWeight="medium">
                                   {standard.standardName}
                                 </Typography>
                                 {standard.description && (
                                   <Typography variant="caption" color="text.secondary">
                                     {standard.description}
                                   </Typography>
                                 )}
                               </Box>
                             </TableCell>
                             <TableCell>
                               <Chip
                                 label={`${getPriorityLabel(standard.priority || 50)} (${standard.priority || 50})`}
                                 color={getPriorityColor(standard.priority || 50)}
                                 size="small"
                               />
                             </TableCell>
                             <TableCell>
                               {conditionCount > 0 ? (
                                 <Typography variant="body2">
                                   {conditionCount}个组 ({totalConditionCount}个条件)
                                 </Typography>
                               ) : (
                                 <Typography variant="body2" color="text.secondary">未配置</Typography>
                               )}
                             </TableCell>
                             <TableCell>
                               <Typography variant="body2">{expenseItemCount}</Typography>
                             </TableCell>
                             <TableCell>V{standard.version}</TableCell>
                             <TableCell>
                               {new Date(standard.effectiveDate).toLocaleDateString()}
                             </TableCell>
                             <TableCell>
                               {standard.expiryDate ? new Date(standard.expiryDate).toLocaleDateString() : '长期有效'}
                             </TableCell>
                             <TableCell>
                               <Chip
                                 label={getStatusLabel(standard.status)}
                                 color={getStatusColor(standard.status)}
                                 size="small"
                               />
                             </TableCell>
                      <TableCell align="right">
                        <IconButton
                          size="small"
                          onClick={() => navigate(`/travel-standards/${standard._id}`)}
                          title="查看详情"
                        >
                          <ViewIcon />
                        </IconButton>
                      {canEdit && (
                        <>
                          <IconButton
                            size="small"
                            onClick={() => navigate(`/travel-standards/${standard._id}/edit`)}
                            title="编辑"
                          >
                            <EditIcon />
                          </IconButton>
                          {standard.status === 'active' ? (
                            <IconButton
                              size="small"
                              color="error"
                              onClick={() => handleDeactivate(standard._id)}
                            >
                              <DeactivateIcon />
                            </IconButton>
                          ) : (
                            <IconButton
                              size="small"
                              color="success"
                              onClick={() => handleActivate(standard._id)}
                            >
                              <ActivateIcon />
                            </IconButton>
                          )}
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => setDeleteDialog({ open: true, id: standard._id })}
                            disabled={standard.status === 'active'}
                          >
                            <DeleteIcon />
                          </IconButton>
                        </>
                      )}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {/* 删除确认对话框 */}
      <Dialog open={deleteDialog.open} onClose={() => setDeleteDialog({ open: false, id: null })}>
        <DialogTitle>确认删除</DialogTitle>
        <DialogContent>
          <Typography>确定要删除这个标准吗？此操作无法撤销。</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialog({ open: false, id: null })}>取消</Button>
          <Button onClick={handleDelete} color="error" variant="contained">
            删除
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default StandardList;

