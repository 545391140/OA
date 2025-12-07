import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Container,
  Paper,
  Box,
  Typography,
  Button,
  Grid,
  Chip,
  Divider,
  Alert,
  CircularProgress,
  Card,
  CardContent,
  Table,
  TableBody,
  TableRow,
  TableCell,
  IconButton,
  Accordion,
  AccordionSummary,
  AccordionDetails
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  Edit as EditIcon,
  ExpandMore as ExpandMoreIcon
} from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../contexts/AuthContext';
import { useNotification } from '../../contexts/NotificationContext';
import apiClient from '../../utils/axiosConfig';
import dayjs from 'dayjs';
import { PERMISSIONS } from '../../config/permissions';

const StandardDetail = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { id } = useParams();
  const { user } = useAuth();
  const { showNotification } = useNotification();
  const [standard, setStandard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchStandard();
  }, [id]);

  const fetchStandard = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await apiClient.get(`/travel-standards/${id}`);
      
      if (response.data && response.data.success) {
        setStandard(response.data.data);
      } else {
        setError(response.data?.message || t('travelStandard.management.fetchError'));
      }
    } catch (err) {

      setError(err.response?.data?.message || t('travelStandard.management.fetchError'));
    } finally {
      setLoading(false);
    }
  };

  const { hasPermission } = useAuth();
  const canView = hasPermission(PERMISSIONS.TRAVEL_STANDARD_VIEW);
  const canCreate = hasPermission(PERMISSIONS.TRAVEL_STANDARD_CREATE);
  const canEdit = hasPermission(PERMISSIONS.TRAVEL_STANDARD_EDIT);
  const canDelete = hasPermission(PERMISSIONS.TRAVEL_STANDARD_DELETE);

  const getStatusColor = (status) => {
    const colorMap = {
      draft: 'default',
      active: 'success',
      expired: 'error'
    };
    return colorMap[status] || 'default';
  };

  const getStatusLabel = (status) => {
    return t(`travelStandard.management.statuses.${status}`) || status;
  };

  const getPriorityLabel = (priority) => {
    if (priority >= 90) return t('travelStandard.management.priorities.high');
    if (priority >= 60) return t('travelStandard.management.priorities.medium');
    return t('travelStandard.management.priorities.low');
  };

  const getPriorityColor = (priority) => {
    if (priority >= 90) return 'error';
    if (priority >= 60) return 'warning';
    return 'info';
  };

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  if (error || !standard) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Alert severity="error" sx={{ mb: 3 }}>
          {error || t('travelStandard.management.fetchError')}
        </Alert>
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate('/travel-standards')}
        >
          {t('common.back')}
        </Button>
      </Container>
    );
  }

  // 计算费用项数量
  const expenseItemCount = Object.values(standard.expenseItemsConfigured || {})
    .filter(configured => configured === true).length;

  // 计算条件组数量
  const conditionCount = standard.conditionGroups?.length || 0;
  const totalConditionCount = standard.conditionGroups?.reduce((sum, group) => 
    sum + (group.conditions?.length || 0), 0
  ) || 0;

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Paper elevation={3} sx={{ p: 4 }}>
        {/* Header */}
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <IconButton onClick={() => navigate('/travel-standards')}>
              <ArrowBackIcon />
            </IconButton>
            <Box>
              <Typography variant="h4" gutterBottom>
                {standard.standardName}
              </Typography>
              <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
                <Chip
                  label={standard.standardCode}
                  color="primary"
                  size="small"
                />
                <Chip
                  label={getStatusLabel(standard.status)}
                  color={getStatusColor(standard.status)}
                  size="small"
                />
                <Chip
                  label={`${getPriorityLabel(standard.priority || 50)} (${standard.priority || 50})`}
                  color={getPriorityColor(standard.priority || 50)}
                  size="small"
                />
                <Typography variant="body2" color="text.secondary">
                  {t('travelStandard.management.tableHeaders.version')}: V{standard.version}
                </Typography>
              </Box>
            </Box>
          </Box>
          {canEdit && (
            <Button
              variant="contained"
              startIcon={<EditIcon />}
              onClick={() => navigate(`/travel-standards/${id}/edit`)}
            >
              {t('common.edit')}
            </Button>
          )}
        </Box>

        <Divider sx={{ mb: 3 }} />

        {/* Basic Information */}
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              {t('travelStandard.form.steps.basicInfo')}
            </Typography>
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid item xs={12} md={6}>
                <Typography variant="body2" color="text.secondary">
                  {t('travelStandard.form.basicInfo.standardCode')}
                </Typography>
                <Typography variant="body1">{standard.standardCode}</Typography>
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="body2" color="text.secondary">
                  {t('travelStandard.form.basicInfo.standardName')}
                </Typography>
                <Typography variant="body1">{standard.standardName}</Typography>
              </Grid>
              {standard.description && (
                <Grid item xs={12}>
                  <Typography variant="body2" color="text.secondary">
                    {t('travelStandard.form.basicInfo.description')}
                  </Typography>
                  <Typography variant="body1">{standard.description}</Typography>
                </Grid>
              )}
              <Grid item xs={12} md={6}>
                <Typography variant="body2" color="text.secondary">
                  {t('travelStandard.management.tableHeaders.effectiveDate')}
                </Typography>
                <Typography variant="body1">
                  {dayjs(standard.effectiveDate).format('YYYY-MM-DD')}
                </Typography>
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="body2" color="text.secondary">
                  {t('travelStandard.management.tableHeaders.expiryDate')}
                </Typography>
                <Typography variant="body1">
                  {standard.expiryDate 
                    ? dayjs(standard.expiryDate).format('YYYY-MM-DD')
                    : t('travelStandard.management.expiryDate.permanent')
                  }
                </Typography>
              </Grid>
            </Grid>
          </CardContent>
        </Card>

        {/* Conditions */}
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              {t('travelStandard.form.steps.conditions')}
            </Typography>
            {conditionCount > 0 ? (
              <Box sx={{ mt: 2 }}>
                {standard.conditionGroups.map((group, groupIndex) => (
                  <Accordion key={groupIndex} sx={{ mb: 1 }}>
                    <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                      <Typography>
                        {t('travelStandard.form.conditions.conditionGroup')} {group.groupId}
                        {` (${group.conditions?.length || 0} ${t('travelStandard.management.conditions.conditions')})`}
                      </Typography>
                    </AccordionSummary>
                    <AccordionDetails>
                      <Table size="small">
                        <TableBody>
                          {group.conditions?.map((condition, condIndex) => (
                            <TableRow key={condIndex}>
                              <TableCell>
                                <Typography variant="body2" fontWeight="medium">
                                  {t(`travelStandard.form.conditions.types.${condition.type}`) || condition.type}
                                </Typography>
                              </TableCell>
                              <TableCell>
                                {t(`travelStandard.form.conditions.operators.${condition.operator}`) || condition.operator}
                              </TableCell>
                              <TableCell>
                                {condition.value}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </AccordionDetails>
                  </Accordion>
                ))}
              </Box>
            ) : (
              <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                {t('travelStandard.management.conditions.notConfigured')}
              </Typography>
            )}
          </CardContent>
        </Card>

        {/* Expense Standards */}
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              {t('travelStandard.form.steps.expenses')}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1, mb: 2 }}>
              {t('travelStandard.management.tableHeaders.expenseItemCount')}: {expenseItemCount}
            </Typography>
            {standard.expenseStandards && standard.expenseStandards.length > 0 ? (
              <Table size="small">
                <TableBody>
                  {standard.expenseStandards.map((es, index) => {
                    // 根据限额类型决定显示内容
                    const getAmountDisplay = () => {
                      if (es.limitType === 'ACTUAL') {
                        return '-'; // 实报实销不显示金额
                      } else if (es.limitType === 'RANGE') {
                        return `${es.limitMin || 0} ~ ${es.limitMax || 0}`;
                      } else if (es.limitType === 'PERCENTAGE') {
                        return `${es.percentage || 0}% (基准: ${es.baseAmount || 0})`;
                      } else if (es.limitType === 'FIXED') {
                        return es.limitAmount !== undefined ? `${es.limitAmount}` : '-';
                      }
                      return es.limitAmount !== undefined ? `${es.limitAmount}` : '-';
                    };

                    const getCalcUnitDisplay = () => {
                      // 实报实销和范围限额不需要显示计算单位
                      if (es.limitType === 'ACTUAL' || es.limitType === 'RANGE' || es.limitType === 'PERCENTAGE') {
                        return '-';
                      }
                      return t(`travelStandard.form.expenseItems.calcUnits.${es.calcUnit}`) || es.calcUnit || '-';
                    };

                    return (
                      <TableRow key={index}>
                        <TableCell>
                          {es.expenseItemId?.itemName || es.expenseItemId || t('common.unknown')}
                        </TableCell>
                        <TableCell>
                          {t(`travelStandard.form.expenseItems.limitTypes.${es.limitType}`) || es.limitType}
                        </TableCell>
                        <TableCell>
                          {getAmountDisplay()}
                        </TableCell>
                        <TableCell>
                          {getCalcUnitDisplay()}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            ) : (
              <Typography variant="body2" color="text.secondary">
                {t('travelStandard.management.noData')}
              </Typography>
            )}
          </CardContent>
        </Card>
      </Paper>
    </Container>
  );
};

export default StandardDetail;

