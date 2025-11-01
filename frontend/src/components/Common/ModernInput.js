import React from 'react';
import {
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Box,
  Typography,
  InputAdornment,
  useTheme,
  alpha,
} from '@mui/material';
import { styled } from '@mui/material/styles';

// 自定义TextField样式
const ModernTextField = styled(TextField)(({ theme }) => ({
  '& .MuiOutlinedInput-root': {
    borderRadius: 8,
    backgroundColor: 'transparent',
    border: 'none',
    transition: 'all 0.3s ease',
    '& .MuiOutlinedInput-notchedOutline': {
      borderRadius: 8,
      borderColor: '#d1d5db',
      borderWidth: '1px',
    },
    '&:hover': {
      backgroundColor: alpha(theme.palette.primary.main, 0.02),
      '& .MuiOutlinedInput-notchedOutline': {
        borderColor: theme.palette.primary.main,
        borderWidth: '2px',
      },
    },
    '&.Mui-focused': {
      backgroundColor: alpha(theme.palette.primary.main, 0.05),
      '& .MuiOutlinedInput-notchedOutline': {
        borderColor: theme.palette.primary.main,
        borderWidth: '2px',
        boxShadow: `0 0 0 3px ${alpha(theme.palette.primary.main, 0.1)}`,
      },
    },
    '&.Mui-error': {
      '& .MuiOutlinedInput-notchedOutline': {
        borderColor: theme.palette.error.main,
        borderWidth: '2px',
      },
    },
  },
  '& .MuiInputLabel-root': {
    fontWeight: 500,
    '&.Mui-focused': {
      color: theme.palette.primary.main,
    },
  },
  '& .MuiFormHelperText-root': {
    fontSize: '0.8rem',
    marginTop: '4px',
  },
}));

// 自定义Select样式
const ModernSelect = styled(Select)(({ theme }) => ({
  '& .MuiOutlinedInput-root': {
    borderRadius: 8,
    backgroundColor: 'transparent',
    border: 'none',
    minHeight: 56,
    transition: 'all 0.3s ease',
    '& .MuiOutlinedInput-notchedOutline': {
      borderRadius: 8,
      borderColor: '#d1d5db',
      borderWidth: '1px',
    },
    '&:hover': {
      backgroundColor: alpha(theme.palette.primary.main, 0.02),
      '& .MuiOutlinedInput-notchedOutline': {
        borderColor: theme.palette.primary.main,
        borderWidth: '2px',
      },
    },
    '&.Mui-focused': {
      backgroundColor: alpha(theme.palette.primary.main, 0.05),
      '& .MuiOutlinedInput-notchedOutline': {
        borderColor: theme.palette.primary.main,
        borderWidth: '2px',
        boxShadow: `0 0 0 3px ${alpha(theme.palette.primary.main, 0.1)}`,
      },
    },
    '&.Mui-error': {
      '& .MuiOutlinedInput-notchedOutline': {
        borderColor: theme.palette.error.main,
        borderWidth: '2px',
      },
    },
  },
}));

const ModernInput = ({
  type = 'text',
  label,
  value,
  onChange,
  error,
  helperText,
  required = false,
  disabled = false,
  placeholder,
  options = [],
  startAdornment,
  endAdornment,
  multiline = false,
  rows = 1,
  fullWidth = true,
  size = 'medium',
  sx = {},
  ...props
}) => {
  const theme = useTheme();

  const renderInput = () => {
    if (type === 'select') {
      return (
        <FormControl fullWidth={fullWidth} error={!!error} size={size}>
          <InputLabel
            sx={{
              fontWeight: 500,
              '&.Mui-focused': {
                color: theme.palette.primary.main,
              },
            }}
          >
            {label} {required && '*'}
          </InputLabel>
          <ModernSelect
            value={value}
            label={label}
            onChange={onChange}
            disabled={disabled}
            startAdornment={startAdornment}
            endAdornment={endAdornment}
            sx={sx}
            {...props}
          >
            {options.map((option) => (
              <MenuItem key={option.value} value={option.value}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  {option.icon && <span>{option.icon}</span>}
                  <Typography variant="body2">{option.label}</Typography>
                </Box>
              </MenuItem>
            ))}
          </ModernSelect>
          {helperText && (
            <Typography
              variant="caption"
              sx={{
                color: error ? theme.palette.error.main : theme.palette.text.secondary,
                mt: 0.5,
                ml: 1.5,
                fontSize: '0.8rem',
              }}
            >
              {helperText}
            </Typography>
          )}
        </FormControl>
      );
    }

    return (
      <ModernTextField
        type={type}
        label={label}
        value={value}
        onChange={onChange}
        error={!!error}
        helperText={helperText}
        required={required}
        disabled={disabled}
        placeholder={placeholder}
        multiline={multiline}
        rows={rows}
        fullWidth={fullWidth}
        size={size}
        InputProps={{
          startAdornment: startAdornment ? (
            <InputAdornment position="start">{startAdornment}</InputAdornment>
          ) : undefined,
          endAdornment: endAdornment ? (
            <InputAdornment position="end">{endAdornment}</InputAdornment>
          ) : undefined,
        }}
        sx={sx}
        {...props}
      />
    );
  };

  return renderInput();
};

export default ModernInput;
