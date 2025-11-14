import React from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Chip,
  IconButton,
  Collapse,
  useTheme,
  alpha,
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Schedule as ScheduleIcon,
  RadioButtonUnchecked as PendingIcon,
} from '@mui/icons-material';
import { useState } from 'react';

const ModernFormSection = ({
  title,
  description,
  icon,
  stepNumber,
  status = 'pending',
  statusLabel, // 新增：自定义状态标签
  required = false,
  children,
  collapsible = false,
  defaultExpanded = true,
  sx = {},
}) => {
  const theme = useTheme();
  const [expanded, setExpanded] = useState(defaultExpanded);

  const getStatusConfig = () => {
    switch (status) {
      case 'completed':
        return {
          color: theme.palette.success.main,
          bgColor: alpha(theme.palette.success.main, 0.1),
          icon: <CheckCircleIcon />,
          label: statusLabel || '已完成',
        };
      case 'error':
        return {
          color: theme.palette.error.main,
          bgColor: alpha(theme.palette.error.main, 0.1),
          icon: <ErrorIcon />,
          label: statusLabel || '有错误',
        };
      case 'active':
        return {
          color: theme.palette.primary.main,
          bgColor: alpha(theme.palette.primary.main, 0.1),
          icon: <ScheduleIcon />,
          label: statusLabel || '进行中',
        };
      default:
        return {
          color: theme.palette.grey[500],
          bgColor: alpha(theme.palette.grey[500], 0.1),
          icon: <PendingIcon />,
          label: statusLabel || '待处理',
        };
    }
  };

  const statusConfig = getStatusConfig();

  const handleToggle = () => {
    if (collapsible) {
      setExpanded(!expanded);
    }
  };

  return (
    <Card
      sx={{
        mb: 3,
        border: 'none',
        borderRadius: 3,
        overflow: 'hidden',
        transition: 'all 0.3s ease',
        '&:hover': {
          boxShadow: '0 8px 25px rgba(0, 0, 0, 0.1)',
          transform: 'translateY(-2px)',
        },
        ...sx,
      }}
    >
      {/* 头部 */}
      <Box
        sx={{
          background: `linear-gradient(135deg, ${statusConfig.bgColor} 0%, ${alpha(statusConfig.color, 0.05)} 100%)`,
          p: 3,
          borderBottom: `1px solid ${theme.palette.grey[200]}`,
          cursor: collapsible ? 'pointer' : 'default',
        }}
        onClick={handleToggle}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            {/* 步骤编号 */}
            <Box
              sx={{
                width: 40,
                height: 40,
                borderRadius: '50%',
                backgroundColor: statusConfig.color,
                color: 'white',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.1rem',
                fontWeight: 600,
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
              }}
            >
              {stepNumber}
            </Box>

            {/* 标题和描述 */}
            <Box sx={{ flex: 1 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                <Typography
                  variant="h5"
                  sx={{
                    fontWeight: 600,
                    color: theme.palette.text.primary,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1,
                  }}
                >
                  {icon && <span style={{ fontSize: '1.5rem' }}>{icon}</span>}
                  {title}
                  {required && (
                    <Typography
                      component="span"
                      sx={{
                        color: theme.palette.error.main,
                        fontSize: '1.2rem',
                        ml: 0.5,
                      }}
                    >
                      *
                    </Typography>
                  )}
                </Typography>
              </Box>
              
              {description && (
                <Typography
                  variant="body2"
                  sx={{
                    color: theme.palette.text.secondary,
                    lineHeight: 1.5,
                  }}
                >
                  {description}
                </Typography>
              )}
            </Box>
          </Box>

          {/* 状态指示器和展开按钮 */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            {/* 状态芯片 */}
            <Chip
              icon={statusConfig.icon}
              label={statusConfig.label}
              size="small"
              sx={{
                backgroundColor: statusConfig.bgColor,
                color: statusConfig.color,
                border: `1px solid ${alpha(statusConfig.color, 0.3)}`,
                fontWeight: 500,
                '& .MuiChip-icon': {
                  color: statusConfig.color,
                },
              }}
            />

            {/* 展开/收起按钮 */}
            {collapsible && (
              <IconButton
                size="small"
                sx={{
                  transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)',
                  transition: 'transform 0.3s ease',
                  color: theme.palette.text.secondary,
                }}
              >
                <ExpandMoreIcon />
              </IconButton>
            )}
          </Box>
        </Box>
      </Box>

      {/* 内容区域 */}
      <Collapse in={expanded} timeout="auto" unmountOnExit>
        <CardContent sx={{ p: 3, '&:last-child': { pb: 3 } }}>
          {children}
        </CardContent>
      </Collapse>
    </Card>
  );
};

export default ModernFormSection;
