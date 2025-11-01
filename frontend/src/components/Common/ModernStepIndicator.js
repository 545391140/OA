import React from 'react';
import {
  Box,
  Stepper,
  Step,
  StepLabel,
  StepConnector,
  Typography,
  Chip,
  useTheme,
} from '@mui/material';
import { styled } from '@mui/material/styles';
import {
  Check as CheckIcon,
  Circle as CircleIcon,
} from '@mui/icons-material';

// 自定义步骤连接器
const ModernStepConnector = styled(StepConnector)(({ theme }) => ({
  '&.MuiStepConnector-root': {
    top: 20,
    left: 'calc(-50% + 20px)',
    right: 'calc(50% + 20px)',
  },
  '&.MuiStepConnector-line': {
    borderTopWidth: 3,
    borderRadius: 1,
  },
  '&.MuiStepConnector-active .MuiStepConnector-line': {
    borderColor: theme.palette.primary.main,
  },
  '&.MuiStepConnector-completed .MuiStepConnector-line': {
    borderColor: theme.palette.success.main,
  },
  '&.MuiStepConnector-disabled .MuiStepConnector-line': {
    borderColor: theme.palette.grey[300],
  },
}));

// 自定义步骤图标
const ModernStepIcon = styled('div')(({ theme, ownerState }) => ({
  backgroundColor: 
    ownerState.completed 
      ? theme.palette.success.main 
      : ownerState.active 
        ? theme.palette.primary.main 
        : theme.palette.grey[300],
  zIndex: 1,
  color: '#fff',
  width: 40,
  height: 40,
  display: 'flex',
  borderRadius: '50%',
  justifyContent: 'center',
  alignItems: 'center',
  fontSize: '1rem',
  fontWeight: 600,
  boxShadow: ownerState.active || ownerState.completed 
    ? '0 4px 12px rgba(0, 0, 0, 0.15)' 
    : 'none',
  transition: 'all 0.3s ease',
  '&:hover': {
    transform: 'scale(1.05)',
  },
}));

const ModernStepIndicator = ({
  steps,
  activeStep,
  completedSteps = [],
  errorSteps = [],
  onStepClick,
  orientation = 'horizontal',
  showProgress = true,
}) => {
  const theme = useTheme();

  const getStepStatus = (stepIndex) => {
    if (completedSteps.includes(stepIndex)) return 'completed';
    if (errorSteps.includes(stepIndex)) return 'error';
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
        return theme.palette.grey[400];
    }
  };

  const renderStepIcon = (stepIndex) => {
    const status = getStepStatus(stepIndex);
    const step = steps[stepIndex];
    
    return (
      <ModernStepIcon
        ownerState={{
          active: status === 'active',
          completed: status === 'completed',
          error: status === 'error',
        }}
      >
        {status === 'completed' ? (
          <CheckIcon sx={{ fontSize: '1.2rem' }} />
        ) : (
          <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>
            {step.icon || stepIndex + 1}
          </span>
        )}
      </ModernStepIcon>
    );
  };

  const renderStepLabel = (step, stepIndex) => {
    const status = getStepStatus(stepIndex);
    const isClickable = onStepClick && (status === 'completed' || status === 'active');
    
    return (
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 1,
          cursor: isClickable ? 'pointer' : 'default',
          transition: 'all 0.2s ease',
          '&:hover': isClickable ? {
            transform: 'translateY(-2px)',
          } : {},
        }}
        onClick={() => isClickable && onStepClick(stepIndex)}
      >
        <Typography
          variant="subtitle2"
          sx={{
            fontWeight: status === 'active' ? 600 : 500,
            color: getStepColor(stepIndex),
            textAlign: 'center',
            maxWidth: 120,
            lineHeight: 1.3,
          }}
        >
          {step.label}
        </Typography>
        
        {step.description && (
          <Typography
            variant="caption"
            sx={{
              color: theme.palette.text.secondary,
              textAlign: 'center',
              maxWidth: 120,
              lineHeight: 1.2,
              display: { xs: 'none', sm: 'block' },
            }}
          >
            {step.description}
          </Typography>
        )}
        
        {/* 状态指示器 */}
        <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center' }}>
          {status === 'completed' && (
            <Chip
              label="完成"
              size="small"
              sx={{
                height: 20,
                fontSize: '0.7rem',
                backgroundColor: theme.palette.success.main,
                color: 'white',
                '& .MuiChip-label': {
                  px: 1,
                },
              }}
            />
          )}
          {status === 'error' && (
            <Chip
              label="错误"
              size="small"
              sx={{
                height: 20,
                fontSize: '0.7rem',
                backgroundColor: theme.palette.error.main,
                color: 'white',
                '& .MuiChip-label': {
                  px: 1,
                },
              }}
            />
          )}
          {status === 'active' && (
            <Chip
              label="进行中"
              size="small"
              sx={{
                height: 20,
                fontSize: '0.7rem',
                backgroundColor: theme.palette.primary.main,
                color: 'white',
                '& .MuiChip-label': {
                  px: 1,
                },
              }}
            />
          )}
        </Box>
      </Box>
    );
  };

  return (
    <Box sx={{ width: '100%', mb: 4 }}>
      <Stepper
        activeStep={activeStep}
        orientation={orientation}
        connector={<ModernStepConnector />}
        sx={{
          '& .MuiStepLabel-root': {
            padding: 0,
          },
        }}
      >
        {steps.map((step, index) => (
          <Step key={index}>
            <StepLabel
              StepIconComponent={() => renderStepIcon(index)}
              sx={{
                '& .MuiStepLabel-labelContainer': {
                  display: 'none', // 隐藏默认标签，使用自定义标签
                },
              }}
            >
              {renderStepLabel(step, index)}
            </StepLabel>
          </Step>
        ))}
      </Stepper>
      
      {/* 进度统计 */}
      {showProgress && (
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            gap: 2,
            mt: 3,
            p: 2,
            backgroundColor: theme.palette.background.paper,
            borderRadius: 2,
            border: `1px solid ${theme.palette.grey[200]}`,
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <CircleIcon sx={{ fontSize: '1rem', color: theme.palette.success.main }} />
            <Typography variant="body2" color="text.secondary">
              已完成: {completedSteps.length}
            </Typography>
          </Box>
          
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <CircleIcon sx={{ fontSize: '1rem', color: theme.palette.primary.main }} />
            <Typography variant="body2" color="text.secondary">
              进行中: {activeStep + 1}
            </Typography>
          </Box>
          
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <CircleIcon sx={{ fontSize: '1rem', color: theme.palette.grey[400] }} />
            <Typography variant="body2" color="text.secondary">
              总计: {steps.length}
            </Typography>
          </Box>
        </Box>
      )}
    </Box>
  );
};

export default ModernStepIndicator;
