import React from 'react';
import {
  Alert,
  AlertTitle,
  Box,
  Typography,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Chip,
  useTheme
} from '@mui/material';
import {
  CheckCircle as CheckIcon,
  Error as ErrorIcon,
  Warning as WarningIcon,
  Info as InfoIcon
} from '@mui/icons-material';
import { styled } from '@mui/material/styles';

const StyledAlert = styled(Alert)(({ theme, severity }) => ({
  borderRadius: 12,
  marginBottom: theme.spacing(2),
  '& .MuiAlert-icon': {
    fontSize: '1.5rem',
  },
  '& .MuiAlert-message': {
    width: '100%',
  },
}));

const ValidationItem = styled(ListItem)(({ theme, status }) => ({
  borderRadius: 8,
  marginBottom: theme.spacing(0.5),
  padding: theme.spacing(1, 2),
  backgroundColor: status === 'valid' 
    ? theme.palette.success.light + '20'
    : status === 'error'
    ? theme.palette.error.light + '20'
    : theme.palette.warning.light + '20',
  border: `1px solid ${
    status === 'valid' 
      ? theme.palette.success.main + '40'
      : status === 'error'
      ? theme.palette.error.main + '40'
      : theme.palette.warning.main + '40'
  }`,
}));

const FormValidationHelper = ({
  validationResults = [],
  showSummary = true,
  showDetails = true,
  compact = false
}) => {
  const theme = useTheme();

  const getValidationSummary = () => {
    const total = validationResults.length;
    const valid = validationResults.filter(r => r.status === 'valid').length;
    const errors = validationResults.filter(r => r.status === 'error').length;
    const warnings = validationResults.filter(r => r.status === 'warning').length;

    return { total, valid, errors, warnings };
  };

  const getSeverity = () => {
    const { errors, warnings } = getValidationSummary();
    if (errors > 0) return 'error';
    if (warnings > 0) return 'warning';
    return 'success';
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'valid':
        return <CheckIcon sx={{ color: theme.palette.success.main }} />;
      case 'error':
        return <ErrorIcon sx={{ color: theme.palette.error.main }} />;
      case 'warning':
        return <WarningIcon sx={{ color: theme.palette.warning.main }} />;
      default:
        return <InfoIcon sx={{ color: theme.palette.info.main }} />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'valid':
        return 'success';
      case 'error':
        return 'error';
      case 'warning':
        return 'warning';
      default:
        return 'default';
    }
  };

  const summary = getValidationSummary();
  const severity = getSeverity();

  if (validationResults.length === 0) {
    return null;
  }

  return (
    <Box sx={{ mb: 2 }}>
      {showSummary && (
        <StyledAlert severity={severity} sx={{ mb: 2 }}>
          <AlertTitle>
            {severity === 'warning' && '表单验证警告'}
            {severity === 'success' && '表单验证通过'}
          </AlertTitle>
          <Box sx={{ display: 'flex', gap: 1, mt: 1, flexWrap: 'wrap' }}>
            <Chip
              label={`总计: ${summary.total}`}
              size="small"
              variant="outlined"
            />
            <Chip
              label={`通过: ${summary.valid}`}
              size="small"
              color="success"
              variant="outlined"
            />
            {summary.warnings > 0 && (
              <Chip
                label={`警告: ${summary.warnings}`}
                size="small"
                color="warning"
                variant="outlined"
              />
            )}
            {summary.errors > 0 && (
              <Chip
                label={`错误: ${summary.errors}`}
                size="small"
                color="error"
                variant="outlined"
              />
            )}
          </Box>
        </StyledAlert>
      )}

      {showDetails && (
        <List sx={{ p: 0 }}>
          {validationResults.map((result, index) => (
            <ValidationItem key={index} status={result.status}>
              <ListItemIcon sx={{ minWidth: 36 }}>
                {getStatusIcon(result.status)}
              </ListItemIcon>
              <ListItemText
                primary={
                  <Typography
                    variant="body2"
                    sx={{
                      fontWeight: result.status === 'error' ? 600 : 400,
                      color: result.status === 'error' 
                        ? theme.palette.error.main
                        : result.status === 'warning'
                        ? theme.palette.warning.main
                        : theme.palette.text.primary,
                    }}
                  >
                    {result.message}
                  </Typography>
                }
                secondary={
                  result.details && (
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      sx={{ mt: 0.5, display: 'block' }}
                    >
                      {result.details}
                    </Typography>
                  )
                }
              />
              <Chip
                label={result.status === 'valid' ? '通过' : result.status === 'error' ? '错误' : '警告'}
                size="small"
                color={getStatusColor(result.status)}
                sx={{ ml: 1 }}
              />
            </ValidationItem>
          ))}
        </List>
      )}
    </Box>
  );
};

export default FormValidationHelper;

