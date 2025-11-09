import React, { useState, useEffect } from 'react';
import {
  Container,
  Box,
  Typography,
  Paper,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  Card,
  CardContent,
  Stepper,
  Step,
  StepLabel,
  StepContent,
  Alert,
  Divider,
  Switch,
  FormControlLabel
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Visibility as ViewIcon,
  ContentCopy as CopyIcon,
  PlayArrow as TestIcon
} from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import { useNotification } from '../../contexts/NotificationContext';
import apiClient from '../../utils/axiosConfig';

const ApprovalWorkflowManagement = () => {
  const { t } = useTranslation();
  const { showNotification } = useNotification();
  const [workflows, setWorkflows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [selectedWorkflow, setSelectedWorkflow] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    type: 'travel',
    conditions: {
      amountRange: {
        min: 0,
        max: 999999999
      },
      departments: [],
      jobLevels: []
    },
    steps: [],
    priority: 0,
    isActive: true
  });

  useEffect(() => {
    fetchWorkflows();
  }, []);

  const fetchWorkflows = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get('/approval-workflows');
      if (response.data && response.data.success) {
        setWorkflows(response.data.data || []);
      }
    } catch (error) {
      console.error('Failed to fetch workflows:', error);
      showNotification('加载审批流程失败', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (workflow = null) => {
    if (workflow) {
      setSelectedWorkflow(workflow);
      setFormData({
        name: workflow.name,
        description: workflow.description || '',
        type: workflow.appliesTo || workflow.type || 'travel',
        conditions: {
          amountRange: {
            min: workflow.conditions?.minAmount || 0,
            max: workflow.conditions?.maxAmount || 999999999
          },
          departments: workflow.conditions?.department ? [workflow.conditions.department] : [],
          jobLevels: workflow.conditions?.jobLevel ? [workflow.conditions.jobLevel] : []
        },
        steps: workflow.steps || [],
        priority: workflow.priority || 0,
        isActive: workflow.isActive !== false
      });
    } else {
      setSelectedWorkflow(null);
      setFormData({
        name: '',
        description: '',
        type: 'travel',
        conditions: {
          amountRange: { min: 0, max: 999999999 },
          departments: [],
          jobLevels: []
        },
        steps: [],
        priority: 0,
        isActive: true
      });
    }
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setSelectedWorkflow(null);
  };

  const handleViewWorkflow = (workflow) => {
    setSelectedWorkflow(workflow);
    setViewDialogOpen(true);
  };

  const handleCloseViewDialog = () => {
    setViewDialogOpen(false);
    setSelectedWorkflow(null);
  };

  const handleAddStep = () => {
    setFormData(prev => ({
      ...prev,
      steps: [
        ...prev.steps,
        {
          level: prev.steps.length + 1,
          name: `第${prev.steps.length + 1}级审批`,
          approverType: 'manager',
          approverUsers: [],
          approverRoles: [],
          approvalMode: 'any',
          required: true,
          timeoutHours: 48
        }
      ]
    }));
  };

  const handleRemoveStep = (index) => {
    setFormData(prev => ({
      ...prev,
      steps: prev.steps.filter((_, i) => i !== index).map((step, i) => ({
        ...step,
        level: i + 1
      }))
    }));
  };

  const handleStepChange = (index, field, value) => {
    setFormData(prev => ({
      ...prev,
      steps: prev.steps.map((step, i) => 
        i === index ? { ...step, [field]: value } : step
      )
    }));
  };

  const handleSave = async () => {
    try {
      if (!formData.name.trim()) {
        showNotification('请输入流程名称', 'warning');
        return;
      }

      if (formData.steps.length === 0) {
        showNotification('请至少添加一个审批步骤', 'warning');
        return;
      }

      const url = selectedWorkflow 
        ? `/approval-workflows/${selectedWorkflow._id}`
        : '/approval-workflows';
      
      const method = selectedWorkflow ? 'put' : 'post';
      
      console.log('Sending workflow data:', JSON.stringify(formData, null, 2));
      
      const response = await apiClient[method](url, formData);
      
      if (response.data && response.data.success) {
        showNotification(
          selectedWorkflow ? '更新成功' : '创建成功',
          'success'
        );
        handleCloseDialog();
        fetchWorkflows();
      }
    } catch (error) {
      console.error('Save workflow error:', error);
      console.error('Error response:', error.response?.data);
      console.error('Error message:', error.response?.data?.error);
      showNotification(
        error.response?.data?.message || error.response?.data?.error || '保存失败',
        'error'
      );
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('确定要删除这个审批流程吗？')) {
      return;
    }

    try {
      await apiClient.delete(`/approval-workflows/${id}`);
      showNotification('删除成功', 'success');
      fetchWorkflows();
    } catch (error) {
      console.error('Delete workflow error:', error);
      showNotification('删除失败', 'error');
    }
  };

  const handleToggleActive = async (workflow) => {
    try {
      await apiClient.put(`/approval-workflows/${workflow._id}`, {
        ...workflow,
        isActive: !workflow.isActive
      });
      showNotification(
        workflow.isActive ? '已禁用' : '已启用',
        'success'
      );
      fetchWorkflows();
    } catch (error) {
      console.error('Toggle active error:', error);
      showNotification('操作失败', 'error');
    }
  };

  const getApproverTypeLabel = (type) => {
    const labels = {
      manager: '直接上级',
      role: '按角色',
      specific_user: '指定用户',
      department_head: '部门负责人',
      finance: '财务'
    };
    return labels[type] || type;
  };

  const getApprovalModeLabel = (mode) => {
    const labels = {
      any: '任一审批',
      all: '全部审批',
      sequence: '按顺序'
    };
    return labels[mode] || mode;
  };

  return (
    <Container maxWidth="xl" sx={{ py: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" fontWeight={600}>
          审批流程管理
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => handleOpenDialog()}
        >
          新建流程
        </Button>
      </Box>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>流程名称</TableCell>
              <TableCell>类型</TableCell>
              <TableCell>金额范围</TableCell>
              <TableCell>审批级别</TableCell>
              <TableCell>优先级</TableCell>
              <TableCell>状态</TableCell>
              <TableCell align="right">操作</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {workflows.map((workflow) => (
              <TableRow key={workflow._id}>
                <TableCell>
                  <Typography variant="subtitle2" fontWeight={600}>
                    {workflow.name}
                  </Typography>
                  {workflow.description && (
                    <Typography variant="caption" color="text.secondary">
                      {workflow.description}
                    </Typography>
                  )}
                </TableCell>
                <TableCell>
                  <Chip
                    label={workflow.type === 'travel' ? '差旅' : '费用'}
                    size="small"
                    color={workflow.type === 'travel' ? 'primary' : 'secondary'}
                  />
                </TableCell>
                <TableCell>
                  ¥{workflow.conditions?.amountRange?.min || 0} - 
                  ¥{workflow.conditions?.amountRange?.max === Number.MAX_SAFE_INTEGER 
                    ? '∞' 
                    : workflow.conditions?.amountRange?.max || 0}
                </TableCell>
                <TableCell>
                  <Chip
                    label={`${workflow.steps?.length || 0}级`}
                    size="small"
                    variant="outlined"
                  />
                </TableCell>
                <TableCell>
                  <Chip
                    label={workflow.priority || 0}
                    size="small"
                    color={workflow.priority > 5 ? 'error' : 'default'}
                  />
                </TableCell>
                <TableCell>
                  <Chip
                    label={workflow.isActive ? '启用' : '禁用'}
                    size="small"
                    color={workflow.isActive ? 'success' : 'default'}
                  />
                </TableCell>
                <TableCell align="right">
                  <IconButton
                    size="small"
                    onClick={() => handleViewWorkflow(workflow)}
                    title="查看"
                  >
                    <ViewIcon />
                  </IconButton>
                  <IconButton
                    size="small"
                    onClick={() => handleOpenDialog(workflow)}
                    title="编辑"
                  >
                    <EditIcon />
                  </IconButton>
                  <IconButton
                    size="small"
                    onClick={() => handleToggleActive(workflow)}
                    title={workflow.isActive ? '禁用' : '启用'}
                  >
                    <Switch checked={workflow.isActive} size="small" />
                  </IconButton>
                  <IconButton
                    size="small"
                    onClick={() => handleDelete(workflow._id)}
                    title="删除"
                    color="error"
                  >
                    <DeleteIcon />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
            {workflows.length === 0 && !loading && (
              <TableRow>
                <TableCell colSpan={7} align="center">
                  <Typography variant="body2" color="text.secondary" sx={{ py: 3 }}>
                    暂无审批流程
                  </Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* 编辑/创建对话框 */}
      <Dialog
        open={dialogOpen}
        onClose={handleCloseDialog}
        maxWidth="md"
        fullWidth
        PaperProps={{ elevation: 8 }}
      >
        <DialogTitle>
          {selectedWorkflow ? '编辑审批流程' : '新建审批流程'}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="流程名称"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
                error={!formData.name.trim()}
                helperText={!formData.name.trim() ? '流程名称为必填项' : ''}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="流程描述"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                multiline
                rows={2}
              />
            </Grid>
            <Grid item xs={6}>
              <FormControl fullWidth required>
                <InputLabel>类型 *</InputLabel>
                <Select
                  value={formData.type}
                  label="类型 *"
                  onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                >
                  <MenuItem value="travel">差旅</MenuItem>
                  <MenuItem value="expense">费用</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth
                label="优先级"
                type="number"
                value={formData.priority}
                onChange={(e) => setFormData({ ...formData, priority: parseInt(e.target.value) || 0 })}
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth
                label="最小金额"
                type="number"
                value={formData.conditions.amountRange.min}
                onChange={(e) => setFormData({
                  ...formData,
                  conditions: {
                    ...formData.conditions,
                    amountRange: {
                      ...formData.conditions.amountRange,
                      min: parseFloat(e.target.value) || 0
                    }
                  }
                })}
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth
                label="最大金额"
                type="number"
                value={formData.conditions.amountRange.max === Number.MAX_SAFE_INTEGER 
                  ? '' 
                  : formData.conditions.amountRange.max}
                onChange={(e) => setFormData({
                  ...formData,
                  conditions: {
                    ...formData.conditions,
                    amountRange: {
                      ...formData.conditions.amountRange,
                      max: e.target.value ? parseFloat(e.target.value) : Number.MAX_SAFE_INTEGER
                    }
                  }
                })}
                placeholder="不限"
              />
            </Grid>
            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Switch
                    checked={formData.isActive}
                    onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                  />
                }
                label="启用此流程"
              />
            </Grid>

            <Grid item xs={12}>
              <Divider sx={{ my: 2 }} />
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Typography variant="h6">审批步骤</Typography>
                  <Chip label="必填" size="small" color="error" />
                </Box>
                <Button
                  size="small"
                  startIcon={<AddIcon />}
                  onClick={handleAddStep}
                >
                  添加步骤
                </Button>
              </Box>

              <Stepper orientation="vertical">
                {formData.steps.map((step, index) => (
                  <Step key={index} active>
                    <StepLabel>
                      第 {step.level} 级审批
                    </StepLabel>
                    <StepContent>
                      <Grid container spacing={2}>
                        <Grid item xs={12}>
                          <TextField
                            fullWidth
                            size="small"
                            label="步骤名称"
                            value={step.name}
                            onChange={(e) => handleStepChange(index, 'name', e.target.value)}
                            required
                            error={!step.name.trim()}
                            helperText={!step.name.trim() ? '步骤名称为必填项' : ''}
                          />
                        </Grid>
                        <Grid item xs={6}>
                          <FormControl fullWidth size="small" required>
                            <InputLabel>审批人类型 *</InputLabel>
                            <Select
                              value={step.approverType}
                              label="审批人类型 *"
                              onChange={(e) => handleStepChange(index, 'approverType', e.target.value)}
                            >
                              <MenuItem value="manager">直接上级</MenuItem>
                              <MenuItem value="department_head">部门负责人</MenuItem>
                              <MenuItem value="finance">财务</MenuItem>
                              <MenuItem value="role">按角色</MenuItem>
                              <MenuItem value="specific_user">指定用户</MenuItem>
                            </Select>
                          </FormControl>
                        </Grid>
                        <Grid item xs={6}>
                          <FormControl fullWidth size="small">
                            <InputLabel>审批方式</InputLabel>
                            <Select
                              value={step.approvalMode}
                              label="审批方式"
                              onChange={(e) => handleStepChange(index, 'approvalMode', e.target.value)}
                            >
                              <MenuItem value="any">任一审批</MenuItem>
                              <MenuItem value="all">全部审批</MenuItem>
                              <MenuItem value="sequence">按顺序</MenuItem>
                            </Select>
                          </FormControl>
                        </Grid>
                        <Grid item xs={6}>
                          <TextField
                            fullWidth
                            size="small"
                            label="超时时间（小时）"
                            type="number"
                            value={step.timeoutHours}
                            onChange={(e) => handleStepChange(index, 'timeoutHours', parseInt(e.target.value) || 48)}
                          />
                        </Grid>
                        <Grid item xs={6}>
                          <FormControlLabel
                            control={
                              <Switch
                                checked={step.required}
                                onChange={(e) => handleStepChange(index, 'required', e.target.checked)}
                                size="small"
                              />
                            }
                            label="必须"
                          />
                        </Grid>
                        <Grid item xs={12}>
                          <Button
                            size="small"
                            color="error"
                            onClick={() => handleRemoveStep(index)}
                          >
                            删除此步骤
                          </Button>
                        </Grid>
                      </Grid>
                    </StepContent>
                  </Step>
                ))}
              </Stepper>

              {formData.steps.length === 0 && (
                <Alert severity="warning">
                  请添加至少一个审批步骤（必填）
                </Alert>
              )}
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>取消</Button>
          <Button onClick={handleSave} variant="contained">
            保存
          </Button>
        </DialogActions>
      </Dialog>

      {/* 查看对话框 */}
      <Dialog
        open={viewDialogOpen}
        onClose={handleCloseViewDialog}
        maxWidth="md"
        fullWidth
        PaperProps={{ elevation: 8 }}
      >
        <DialogTitle>审批流程详情</DialogTitle>
        <DialogContent>
          {selectedWorkflow && (
            <Box sx={{ mt: 2 }}>
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <Typography variant="h6">{selectedWorkflow.name}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    {selectedWorkflow.description}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary">类型</Typography>
                  <Typography>{selectedWorkflow.type === 'travel' ? '差旅' : '费用'}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary">优先级</Typography>
                  <Typography>{selectedWorkflow.priority}</Typography>
                </Grid>
                <Grid item xs={12}>
                  <Typography variant="caption" color="text.secondary">金额范围</Typography>
                  <Typography>
                    ¥{selectedWorkflow.conditions?.amountRange?.min || 0} - 
                    ¥{selectedWorkflow.conditions?.amountRange?.max === Number.MAX_SAFE_INTEGER 
                      ? '∞' 
                      : selectedWorkflow.conditions?.amountRange?.max || 0}
                  </Typography>
                </Grid>
                <Grid item xs={12}>
                  <Divider sx={{ my: 2 }} />
                  <Typography variant="h6" gutterBottom>审批步骤</Typography>
                  <Stepper orientation="vertical">
                    {selectedWorkflow.steps?.map((step, index) => (
                      <Step key={index} active>
                        <StepLabel>
                          第 {step.level} 级 - {step.name}
                        </StepLabel>
                        <StepContent>
                          <Typography variant="body2">
                            审批人类型: {getApproverTypeLabel(step.approverType)}
                          </Typography>
                          <Typography variant="body2">
                            审批方式: {getApprovalModeLabel(step.approvalMode)}
                          </Typography>
                          <Typography variant="body2">
                            超时时间: {step.timeoutHours}小时
                          </Typography>
                          <Typography variant="body2">
                            必须: {step.required ? '是' : '否'}
                          </Typography>
                        </StepContent>
                      </Step>
                    ))}
                  </Stepper>
                </Grid>
              </Grid>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseViewDialog}>关闭</Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default ApprovalWorkflowManagement;

