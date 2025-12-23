import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import LoadingSpinner from '../Common/LoadingSpinner';
import { Alert, Box, Button } from '@mui/material';
import { useTranslation } from 'react-i18next';

/**
 * 权限保护路由组件
 * 检查用户是否已认证，以及是否有访问该路由所需的权限
 * 
 * @param {React.ReactNode} children - 要渲染的子组件
 * @param {string|string[]} requiredPermissions - 所需的权限（单个权限字符串或权限数组）
 * @param {boolean} requireAll - 如果为true，需要所有权限；如果为false，只需要任一权限（默认false）
 */
const PermissionRoute = ({ 
  children, 
  requiredPermissions, 
  requireAll = false 
}) => {
  const { isAuthenticated, loading, hasPermission, hasAnyPermission, hasAllPermissions } = useAuth();
  const { t } = useTranslation();

  if (loading) {
    return <LoadingSpinner />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // 如果没有指定权限要求，只检查认证即可
  if (!requiredPermissions) {
    return children;
  }

  // 检查权限
  const permissions = Array.isArray(requiredPermissions) 
    ? requiredPermissions 
    : [requiredPermissions];
  
  const hasAccess = requireAll
    ? hasAllPermissions(permissions)
    : hasAnyPermission(permissions);

  if (!hasAccess) {
    return (
      <Box sx={{ p: 4, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '50vh' }}>
        <Alert severity="error" sx={{ mb: 2, maxWidth: 600 }}>
          {t('errors.noPermission') || '您没有访问此页面的权限'}
        </Alert>
        <Button variant="contained" onClick={() => window.history.back()}>
          {t('common.back') || '返回'}
        </Button>
      </Box>
    );
  }

  return children;
};

export default PermissionRoute;



