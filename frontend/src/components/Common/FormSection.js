import React from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  Chip,
  IconButton,
  Collapse,
  useTheme,
  alpha
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  CheckCircle as CheckIcon,
  Warning as WarningIcon,
  Info as InfoIcon
} from '@mui/icons-material';
import { styled } from '@mui/material/styles';

const StyledCard = styled(Card)(({ theme, status }) => ({
  marginBottom: theme.spacing(3),
  borderRadius: 16,
  boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)',
  border: `2px solid ${theme.palette.divider}`,
  transition: 'all 0.3s ease',
  '&:hover': {
    boxShadow: '0 8px 30px rgba(0, 0, 0, 0.12)',
    transform: 'translateY(-2px)',
  },
  ...(status === 'completed' && {
    borderColor: theme.palette.success.main,
    backgroundColor: alpha(theme.palette.success.main, 0.02),
    '&:hover': {
      boxShadow: `0 8px 30px ${alpha(theme.palette.success.main, 0.2)}`,
    },
  }),
  ...(status === 'error' && {
    borderColor: theme.palette.error.main,
    backgroundColor: alpha(theme.palette.error.main, 0.02),
    '&:hover': {
      boxShadow: `0 8px 30px ${alpha(theme.palette.error.main, 0.2)}`,
    },
  }),
  ...(status === 'active' && {
    borderColor: theme.palette.primary.main,
    backgroundColor: alpha(theme.palette.primary.main, 0.02),
    boxShadow: `0 4px 20px ${alpha(theme.palette.primary.main, 0.15)}`,
    '&:hover': {
      boxShadow: `0 8px 30px ${alpha(theme.palette.primary.main, 0.25)}`,
    },
  }),
}));

const SectionHeader = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: theme.spacing(2, 3),
  borderBottom: `1px solid ${theme.palette.divider}`,
  backgroundColor: alpha(theme.palette.background.paper, 0.5),
  borderRadius: '16px 16px 0 0',
}));

const SectionTitle = styled(Typography)(({ theme, status }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing(1.5),
  fontWeight: 600,
  fontSize: '1.1rem',
  color: theme.palette.text.primary,
  ...(status === 'completed' && {
    color: theme.palette.success.main,
  }),
  ...(status === 'error' && {
    color: theme.palette.error.main,
  }),
  ...(status === 'active' && {
    color: theme.palette.primary.main,
  }),
}));

const StatusChip = styled(Chip)(({ theme, status }) => ({
  fontSize: '0.75rem',
  height: 24,
  fontWeight: 500,
  ...(status === 'completed' && {
    backgroundColor: theme.palette.success.main,
    color: theme.palette.success.contrastText,
  }),
  ...(status === 'error' && {
    backgroundColor: theme.palette.error.main,
    color: theme.palette.error.contrastText,
  }),
  ...(status === 'active' && {
    backgroundColor: theme.palette.primary.main,
    color: theme.palette.primary.contrastText,
  }),
  ...(status === 'pending' && {
    backgroundColor: theme.palette.grey[300],
    color: theme.palette.text.secondary,
  }),
}));

const FormSection = ({
  title,
  description,
  icon,
  children,
  status = 'pending', // pending, active, completed, error
  collapsible = false,
  defaultExpanded = true,
  required = false,
  stepNumber,
  onToggle,
  sx = {}
}) => {
  const theme = useTheme();
  const [expanded, setExpanded] = React.useState(defaultExpanded);

  const handleToggle = () => {
    if (collapsible) {
      setExpanded(!expanded);
      onToggle && onToggle(!expanded);
    }
  };

  const getStatusIcon = () => {
    switch (status) {
      case 'completed':
        return <CheckIcon sx={{ color: theme.palette.success.main }} />;
      case 'error':
        return <WarningIcon sx={{ color: theme.palette.error.main }} />;
      case 'active':
        return <InfoIcon sx={{ color: theme.palette.primary.main }} />;
      default:
        return icon;
    }
  };

  const getStatusText = () => {
    switch (status) {
      case 'completed':
        return '已完成';
      case 'error':
        return '需修正';
      case 'active':
        return '进行中';
      default:
        return '待填写';
    }
  };

  return (
    <StyledCard status={status} sx={sx}>
      <SectionHeader>
        <SectionTitle status={status}>
          {stepNumber && (
            <Box
              sx={{
                width: 32,
                height: 32,
                borderRadius: '50%',
                backgroundColor: status === 'active' 
                  ? theme.palette.primary.main 
                  : status === 'completed'
                  ? theme.palette.success.main
                  : status === 'error'
                  ? theme.palette.error.main
                  : theme.palette.grey[300],
                color: status === 'pending' 
                  ? theme.palette.text.secondary 
                  : 'white',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '0.875rem',
                fontWeight: 600,
                mr: 1,
              }}
            >
              {stepNumber}
            </Box>
          )}
          {getStatusIcon()}
          <Box>
            <Typography variant="h6" component="div">
              {title}
              {required && (
                <Typography
                  component="span"
                  sx={{ color: theme.palette.error.main, ml: 0.5 }}
                >
                  *
                </Typography>
              )}
            </Typography>
            {description && (
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{ mt: 0.5, fontSize: '0.875rem' }}
              >
                {description}
              </Typography>
            )}
          </Box>
        </SectionTitle>
        
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <StatusChip
            label={getStatusText()}
            size="small"
            status={status}
          />
          {collapsible && (
            <IconButton
              onClick={handleToggle}
              size="small"
              sx={{
                color: theme.palette.text.secondary,
                '&:hover': {
                  backgroundColor: alpha(theme.palette.primary.main, 0.1),
                  color: theme.palette.primary.main,
                },
              }}
            >
              {expanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
            </IconButton>
          )}
        </Box>
      </SectionHeader>
      
      <Collapse in={expanded} timeout="auto" unmountOnExit>
        <CardContent sx={{ p: 3 }}>
          {children}
        </CardContent>
      </Collapse>
    </StyledCard>
  );
};

export default FormSection;





