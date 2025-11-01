import React from 'react';
import {
  Stepper,
  Step,
  StepLabel,
  StepConnector,
  Box,
  Typography,
  Chip,
  useTheme
} from '@mui/material';
import {
  Check as CheckIcon,
  Info as InfoIcon,
  Warning as WarningIcon
} from '@mui/icons-material';
import { styled } from '@mui/material/styles';

const ColorlibConnector = styled(StepConnector)(({ theme }) => ({
  '& .MuiStepConnector-line': {
    height: 3,
    border: 0,
    backgroundColor: theme.palette.divider,
    borderRadius: 1,
  },
  '&.Mui-active .MuiStepConnector-line': {
    background: `linear-gradient(45deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
  },
  '&.Mui-completed .MuiStepConnector-line': {
    background: `linear-gradient(45deg, ${theme.palette.success.main}, ${theme.palette.primary.main})`,
  },
}));

const ColorlibStepIconRoot = styled('div')(({ theme, ownerState }) => ({
  backgroundColor: theme.palette.mode === 'dark' ? theme.palette.grey[700] : theme.palette.grey[300],
  zIndex: 1,
  color: theme.palette.text.secondary,
  width: 50,
  height: 50,
  display: 'flex',
  borderRadius: '50%',
  justifyContent: 'center',
  alignItems: 'center',
  fontSize: '1.2rem',
  fontWeight: 'bold',
  ...(ownerState.active && {
    background: `linear-gradient(45deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
    color: theme.palette.primary.contrastText,
    boxShadow: `0 4px 12px ${theme.palette.primary.main}40`,
    transform: 'scale(1.1)',
    transition: 'all 0.3s ease',
  }),
  ...(ownerState.completed && {
    backgroundColor: theme.palette.success.main,
    color: theme.palette.success.contrastText,
    boxShadow: `0 4px 12px ${theme.palette.success.main}40`,
  }),
  ...(ownerState.error && {
    backgroundColor: theme.palette.error.main,
    color: theme.palette.error.contrastText,
    boxShadow: `0 4px 12px ${theme.palette.error.main}40`,
  }),
}));

const ColorlibStepIcon = (props) => {
  const { active, completed, className, error, icon } = props;

  return (
    <ColorlibStepIconRoot ownerState={{ completed, active, error }} className={className}>
      {completed ? (
        <CheckIcon sx={{ fontSize: '1.5rem' }} />
      ) : (
        <span style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>{icon}</span>
      )}
    </ColorlibStepIconRoot>
  );
};

const StepIndicator = ({ 
  steps, 
  activeStep, 
  completedSteps = [], 
  errorSteps = [],
  orientation = 'horizontal',
  showProgress = true 
}) => {
  const theme = useTheme();

  const getStepStatus = (stepIndex) => {
    if (errorSteps.includes(stepIndex)) return 'error';
    if (completedSteps.includes(stepIndex)) return 'completed';
    if (activeStep === stepIndex) return 'active';
    return 'pending';
  };

  const getStepColor = (stepIndex) => {
    const status = getStepStatus(stepIndex);
    switch (status) {
      case 'completed':
        return theme.palette.success.main;
      case 'error':
        return theme.palette.error.main;
      case 'active':
        return theme.palette.primary.main;
      default:
        return theme.palette.text.secondary;
    }
  };

  return (
    <Box sx={{ width: '100%', mb: 4 }}>
      <Stepper
        alternativeLabel={orientation === 'horizontal'}
        activeStep={activeStep}
        connector={<ColorlibConnector />}
        orientation={orientation}
        sx={{
          '& .MuiStepLabel-root': {
            padding: '0 8px',
          },
        }}
      >
        {steps.map((step, index) => {
          const status = getStepStatus(index);
          const isCompleted = completedSteps.includes(index);
          const hasError = errorSteps.includes(index);
          
          return (
            <Step key={step.label} completed={isCompleted}>
              <StepLabel
                StepIconComponent={(props) => <ColorlibStepIcon {...props} icon={step.icon || index + 1} />}
                error={hasError}
                sx={{
                  '& .MuiStepLabel-label': {
                    fontSize: '0.875rem',
                    fontWeight: status === 'active' ? 600 : 400,
                    color: getStepColor(index),
                    mt: 1,
                  },
                  '& .MuiStepLabel-labelContainer': {
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 0.5,
                  },
                }}
              >
                <Box sx={{ textAlign: 'center' }}>
                  <Typography
                    variant="body2"
                    sx={{
                      fontWeight: status === 'active' ? 600 : 400,
                      color: getStepColor(index),
                      mb: 0.5,
                    }}
                  >
                    {step.label}
                  </Typography>
                  {step.description && (
                    <Typography
                      variant="caption"
                      sx={{
                        color: theme.palette.text.secondary,
                        fontSize: '0.75rem',
                        display: 'block',
                        maxWidth: 120,
                        textAlign: 'center',
                        lineHeight: 1.2,
                      }}
                    >
                      {step.description}
                    </Typography>
                  )}
                  {status === 'completed' && (
                    <Chip
                      label="完成"
                      size="small"
                      color="success"
                      sx={{ mt: 0.5, fontSize: '0.7rem', height: 20 }}
                    />
                  )}
                  {hasError && (
                    <Chip
                      label="需修正"
                      size="small"
                      color="error"
                      sx={{ mt: 0.5, fontSize: '0.7rem', height: 20 }}
                    />
                  )}
                </Box>
              </StepLabel>
            </Step>
          );
        })}
      </Stepper>
      
      {showProgress && (
        <Box sx={{ mt: 2, textAlign: 'center' }}>
          <Typography variant="body2" color="text.secondary">
            进度: {completedSteps.length} / {steps.length} 步骤完成
          </Typography>
        </Box>
      )}
    </Box>
  );
};

export default StepIndicator;

