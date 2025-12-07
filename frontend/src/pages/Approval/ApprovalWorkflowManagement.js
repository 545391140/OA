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
import { useAuth } from '../../contexts/AuthContext';
import { PERMISSIONS } from '../../config/permissions';
import apiClient from '../../utils/axiosConfig';

const ApprovalWorkflowManagement = () => {
  const { t } = useTranslation();
  const { showNotification } = useNotification();
  const { hasPermission } = useAuth();
  const canView = hasPermission(PERMISSIONS.APPROVAL_WORKFLOW_VIEW);
  const canCreate = hasPermission(PERMISSIONS.APPROVAL_WORKFLOW_CREATE);
  const canEdit = hasPermission(PERMISSIONS.APPROVAL_WORKFLOW_EDIT);
  const canDelete = hasPermission(PERMISSIONS.APPROVAL_WORKFLOW_DELETE);
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

      showNotification(t('approval.workflow.loadError'), 'error');
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
          name: t('approval.workflow.stepLevel', { level: prev.steps.length + 1 }),
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
        showNotification(t('approval.workflow.nameRequired'), 'warning');
        return;
      }

      if (formData.steps.length === 0) {
        showNotification(t('approval.workflow.stepsRequired'), 'warning');
        return;
      }

      const url = selectedWorkflow 
        ? `/approval-workflows/${selectedWorkflow._id}`
        : '/approval-workflows';
      
      const method = selectedWorkflow ? 'put' : 'post';
      
      const response = await apiClient[method](url, formData);
      
      if (response.data && response.data.success) {
        showNotification(
          selectedWorkflow ? t('approval.workflow.updateSuccess') : t('approval.workflow.createSuccess'),
          'success'
        );
        handleCloseDialog();
        fetchWorkflows();
      }
    } catch (error) {



      showNotification(
        error.response?.data?.message || error.response?.data?.error || t('approval.workflow.saveError'),
        'error'
      );
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm(t('approval.workflow.confirmDelete'))) {
      return;
    }

    try {
      await apiClient.delete(`/approval-workflows/${id}`);
      showNotification(t('approval.workflow.deleteSuccess'), 'success');
      fetchWorkflows();
    } catch (error) {

      showNotification(t('approval.workflow.deleteError'), 'error');
    }
  };

  const handleToggleActive = async (workflow) => {
    try {
      await apiClient.put(`/approval-workflows/${workflow._id}`, {
        ...workflow,
        isActive: !workflow.isActive
      });
      showNotification(
        workflow.isActive ? t('approval.workflow.disabled') : t('approval.workflow.enabled'),
        'success'
      );
      fetchWorkflows();
    } catch (error) {

      showNotification(t('messages.error.general'), 'error');
    }
  };

  const getApproverTypeLabel = (type) => {
    return t(`approval.workflow.approverTypes.${type}`, type);
  };

  const getApprovalModeLabel = (mode) => {
    return t(`approval.workflow.approvalModes.${mode}`, mode);
  };

  return (
    <Container maxWidth="xl" sx={{ py: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" fontWeight={600}>
          {t('approval.workflow.title')}
        </Typography>
        {canCreate && (
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => handleOpenDialog()}
          >
            {t('approval.workflow.create')}
          </Button>
        )}
      </Box>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>{t('approval.workflow.workflowName')}</TableCell>
              <TableCell>{t('approval.workflow.workflowType')}</TableCell>
              <TableCell>{t('approval.workflow.amountRange')}</TableCell>
              <TableCell>{t('approval.workflow.approvalLevels')}</TableCell>
              <TableCell>{t('approval.workflow.priority')}</TableCell>
              <TableCell>{t('approval.workflow.status')}</TableCell>
              <TableCell align="right">{t('approval.workflow.actions')}</TableCell>
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
                    label={(workflow.appliesTo || workflow.type) === 'travel' ? t('approval.workflow.travel') : t('approval.workflow.expense')}
                    size="small"
                    color={(workflow.appliesTo || workflow.type) === 'travel' ? 'primary' : 'secondary'}
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
                    label={workflow.isActive ? t('approval.workflow.enabled') : t('approval.workflow.disabled')}
                    size="small"
                    color={workflow.isActive ? 'success' : 'default'}
                  />
                </TableCell>
                <TableCell align="right">
                  {canView && (
                    <IconButton
                      size="small"
                      onClick={() => handleViewWorkflow(workflow)}
                      title={t('approval.workflow.view')}
                    >
                      <ViewIcon />
                    </IconButton>
                  )}
                  {canEdit && (
                    <IconButton
                      size="small"
                      onClick={() => handleOpenDialog(workflow)}
                      title={t('approval.workflow.edit')}
                    >
                      <EditIcon />
                    </IconButton>
                  )}
                  {canEdit && (
                    <IconButton
                      size="small"
                      onClick={() => handleToggleActive(workflow)}
                      title={workflow.isActive ? t('approval.workflow.disabled') : t('approval.workflow.enabled')}
                    >
                      <Switch checked={workflow.isActive} size="small" />
                    </IconButton>
                  )}
                  {canDelete && (
                    <IconButton
                      size="small"
                      onClick={() => handleDelete(workflow._id)}
                      title={t('approval.workflow.delete')}
                      color="error"
                    >
                      <DeleteIcon />
                    </IconButton>
                  )}
                </TableCell>
              </TableRow>
            ))}
            {workflows.length === 0 && !loading && (
              <TableRow>
                <TableCell colSpan={7} align="center">
                  <Typography variant="body2" color="text.secondary" sx={{ py: 3 }}>
                    {t('approval.workflow.noWorkflows')}
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
          {selectedWorkflow ? t('approval.workflow.edit') : t('approval.workflow.create')}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label={t('approval.workflow.name')}
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
                error={!formData.name.trim()}
                helperText={!formData.name.trim() ? t('approval.workflow.nameRequired') : ''}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label={t('approval.workflow.description')}
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                multiline
                rows={2}
              />
            </Grid>
            <Grid item xs={6}>
              <FormControl fullWidth required>
                <InputLabel>{t('approval.workflow.type')} *</InputLabel>
                <Select
                  value={formData.type}
                  label={`${t('approval.workflow.type')} *`}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                >
                  <MenuItem value="travel">{t('approval.workflow.travel')}</MenuItem>
                  <MenuItem value="expense">{t('approval.workflow.expense')}</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth
                label={t('approval.workflow.priority')}
                type="number"
                value={formData.priority}
                onChange={(e) => setFormData({ ...formData, priority: parseInt(e.target.value) || 0 })}
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth
                label={t('approval.workflow.minAmount')}
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
                label={t('approval.workflow.maxAmount')}
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
                placeholder={t('approval.workflow.unlimited')}
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
                label={t('approval.workflow.enableWorkflow')}
              />
            </Grid>

            <Grid item xs={12}>
              <Divider sx={{ my: 2 }} />
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Typography variant="h6">{t('approval.workflow.steps')}</Typography>
                  <Chip label={t('common.required')} size="small" color="error" />
                </Box>
                <Button
                  size="small"
                  startIcon={<AddIcon />}
                  onClick={handleAddStep}
                >
                  {t('approval.workflow.addStep')}
                </Button>
              </Box>

              <Stepper orientation="vertical">
                {formData.steps.map((step, index) => (
                  <Step key={index} active>
                    <StepLabel>
                      {t('approval.workflow.stepLevel', { level: step.level })}
                    </StepLabel>
                    <StepContent>
                      <Grid container spacing={2}>
                        <Grid item xs={12}>
                          <TextField
                            fullWidth
                            size="small"
                            label={t('approval.workflow.stepName')}
                            value={step.name}
                            onChange={(e) => handleStepChange(index, 'name', e.target.value)}
                            required
                            error={!step.name.trim()}
                            helperText={!step.name.trim() ? t('approval.workflow.stepNameRequired') : ''}
                          />
                        </Grid>
                        <Grid item xs={6}>
                          <FormControl fullWidth size="small" required>
                            <InputLabel>{t('approval.workflow.approverType')} *</InputLabel>
                            <Select
                              value={step.approverType}
                              label={`${t('approval.workflow.approverType')} *`}
                              onChange={(e) => handleStepChange(index, 'approverType', e.target.value)}
                            >
                              <MenuItem value="manager">{t('approval.workflow.approverTypes.manager')}</MenuItem>
                              <MenuItem value="department_head">{t('approval.workflow.approverTypes.department_head')}</MenuItem>
                              <MenuItem value="finance">{t('approval.workflow.approverTypes.finance')}</MenuItem>
                              <MenuItem value="role">{t('approval.workflow.approverTypes.role')}</MenuItem>
                              <MenuItem value="specific_user">{t('approval.workflow.approverTypes.specific_user')}</MenuItem>
                            </Select>
                          </FormControl>
                        </Grid>
                        <Grid item xs={6}>
                          <FormControl fullWidth size="small">
                            <InputLabel>{t('approval.workflow.approvalMode')}</InputLabel>
                            <Select
                              value={step.approvalMode}
                              label={t('approval.workflow.approvalMode')}
                              onChange={(e) => handleStepChange(index, 'approvalMode', e.target.value)}
                            >
                              <MenuItem value="any">{t('approval.workflow.approvalModes.any')}</MenuItem>
                              <MenuItem value="all">{t('approval.workflow.approvalModes.all')}</MenuItem>
                              <MenuItem value="sequence">{t('approval.workflow.approvalModes.sequence')}</MenuItem>
                            </Select>
                          </FormControl>
                        </Grid>
                        <Grid item xs={6}>
                          <TextField
                            fullWidth
                            size="small"
                            label={t('approval.workflow.timeoutHours')}
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
                            label={t('approval.workflow.required')}
                          />
                        </Grid>
                        <Grid item xs={12}>
                          <Button
                            size="small"
                            color="error"
                            onClick={() => handleRemoveStep(index)}
                          >
                            {t('approval.workflow.deleteStep')}
                          </Button>
                        </Grid>
                      </Grid>
                    </StepContent>
                  </Step>
                ))}
              </Stepper>

              {formData.steps.length === 0 && (
                <Alert severity="warning">
                  {t('approval.workflow.stepsRequired')}
                </Alert>
              )}
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>{t('common.cancel')}</Button>
          <Button onClick={handleSave} variant="contained">
            {t('common.save')}
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
        <DialogTitle>{t('approval.workflow.view')}</DialogTitle>
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
                  <Typography variant="caption" color="text.secondary">{t('approval.workflow.workflowType')}</Typography>
                  <Typography>{(selectedWorkflow.appliesTo || selectedWorkflow.type) === 'travel' ? t('approval.workflow.travel') : t('approval.workflow.expense')}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary">{t('approval.workflow.priority')}</Typography>
                  <Typography>{selectedWorkflow.priority}</Typography>
                </Grid>
                <Grid item xs={12}>
                  <Typography variant="caption" color="text.secondary">{t('approval.workflow.amountRange')}</Typography>
                  <Typography>
                    ¥{selectedWorkflow.conditions?.amountRange?.min || 0} - 
                    ¥{selectedWorkflow.conditions?.amountRange?.max === Number.MAX_SAFE_INTEGER 
                      ? '∞' 
                      : selectedWorkflow.conditions?.amountRange?.max || 0}
                  </Typography>
                </Grid>
                <Grid item xs={12}>
                  <Divider sx={{ my: 2 }} />
                  <Typography variant="h6" gutterBottom>{t('approval.workflow.steps')}</Typography>
                  <Stepper orientation="vertical">
                    {selectedWorkflow.steps?.map((step, index) => (
                      <Step key={index} active>
                        <StepLabel>
                          {t('approval.workflow.stepLevelWithName', { level: step.level, name: step.name })}
                        </StepLabel>
                        <StepContent>
                          <Typography variant="body2">
                            {t('approval.workflow.approverType')}: {getApproverTypeLabel(step.approverType)}
                          </Typography>
                          <Typography variant="body2">
                            {t('approval.workflow.approvalMode')}: {getApprovalModeLabel(step.approvalMode)}
                          </Typography>
                          <Typography variant="body2">
                            {t('approval.workflow.timeoutHours')}: {step.timeoutHours}
                          </Typography>
                          <Typography variant="body2">
                            {t('approval.workflow.required')}: {step.required ? t('common.yes') : t('common.no')}
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
          <Button onClick={handleCloseViewDialog}>{t('common.close')}</Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default ApprovalWorkflowManagement;

