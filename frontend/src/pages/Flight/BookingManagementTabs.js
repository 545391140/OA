/**
 * 预订列表管理 Tab 容器
 * 包含机票预订列表和酒店预订列表两个 Tab
 * 
 * 注意：这是"预订列表"功能，不是"搜索"功能
 * - 搜索功能：/flight/search（FlightSearch.js）
 * - 预订列表：/flight/bookings（BookingManagementTabs.js）
 */

import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Container,
  Paper,
  Box,
  Typography,
  Tabs,
  Tab,
  Alert,
} from '@mui/material';
import {
  Flight as FlightIcon,
  Hotel as HotelIcon,
} from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../contexts/AuthContext';
import { PERMISSIONS } from '../../config/permissions';
import BookingManagement from './BookingManagement';
import HotelBookingManagement from '../Hotel/HotelBookingManagement';

const BookingManagementTabs = () => {
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const { hasPermission } = useAuth();

  // 权限检查
  const hasFlightPermission = hasPermission(PERMISSIONS.FLIGHT_BOOKING_VIEW);
  const hasHotelPermission = hasPermission(PERMISSIONS.HOTEL_BOOKING_VIEW);

  // Tab 索引映射：根据权限动态计算
  // 如果只有机票权限：Tab 0 = 机票
  // 如果只有酒店权限：Tab 0 = 酒店
  // 如果两个权限都有：Tab 0 = 机票，Tab 1 = 酒店
  const getTabIndex = (tabType) => {
    if (hasFlightPermission && hasHotelPermission) {
      // 两个权限都有，使用原始索引
      return tabType === 'hotel' ? 1 : 0;
    } else if (hasFlightPermission) {
      // 只有机票权限，只有 Tab 0
      return tabType === 'flight' ? 0 : null;
    } else {
      // 只有酒店权限，只有 Tab 0
      return tabType === 'hotel' ? 0 : null;
    }
  };

  const getTabType = (index) => {
    if (hasFlightPermission && hasHotelPermission) {
      // 两个权限都有
      return index === 0 ? 'flight' : 'hotel';
    } else if (hasFlightPermission) {
      // 只有机票权限
      return 'flight';
    } else {
      // 只有酒店权限
      return 'hotel';
    }
  };

  // 初始化 Tab
  const getInitialTab = () => {
    // 如果只有一个权限，固定返回 0
    if (!hasFlightPermission && hasHotelPermission) {
      return 0; // 只有酒店权限，Tab 0 = 酒店
    }
    if (hasFlightPermission && !hasHotelPermission) {
      return 0; // 只有机票权限，Tab 0 = 机票
    }
    
    // 如果两个权限都有，从 URL 参数或 sessionStorage 获取
    const searchParams = new URLSearchParams(location.search);
    const tabParam = searchParams.get('tab');
    if (tabParam === 'hotel') return getTabIndex('hotel');
    if (tabParam === 'flight') return getTabIndex('flight');
    
    // 从 sessionStorage 恢复
    const savedTab = sessionStorage.getItem('bookingManagementTab');
    if (savedTab === 'hotel') return getTabIndex('hotel');
    if (savedTab === 'flight') return getTabIndex('flight');
    
    return 0; // 默认机票 Tab
  };

  // 所有 Hooks 必须在条件返回之前调用
  const [activeTab, setActiveTab] = useState(getInitialTab);

  // 如果用户没有某个 Tab 的权限，但通过 URL 参数访问，自动切换到有权限的 Tab
  useEffect(() => {
    const currentTabType = getTabType(activeTab);
    
    if (currentTabType === 'flight' && !hasFlightPermission && hasHotelPermission) {
      // 尝试访问机票 Tab 但没有权限，切换到酒店 Tab
      setActiveTab(0); // 酒店 Tab 现在是索引 0
      const searchParams = new URLSearchParams(location.search);
      searchParams.set('tab', 'hotel');
      navigate({ search: searchParams.toString() }, { replace: true });
    } else if (currentTabType === 'hotel' && !hasHotelPermission && hasFlightPermission) {
      // 尝试访问酒店 Tab 但没有权限，切换到机票 Tab
      setActiveTab(0); // 机票 Tab 现在是索引 0
      const searchParams = new URLSearchParams(location.search);
      searchParams.set('tab', 'flight');
      navigate({ search: searchParams.toString() }, { replace: true });
    }
  }, [activeTab, hasFlightPermission, hasHotelPermission, location.search, navigate]);

  // 如果没有权限，理论上不会到达这里（路由已拦截），但为了安全起见还是检查
  // 注意：这个检查必须在所有 Hooks 调用之后
  if (!hasFlightPermission && !hasHotelPermission) {
    return (
      <Container maxWidth="xl">
        <Box sx={{ p: 4, textAlign: 'center' }}>
          <Alert severity="error">
            {t('errors.noPermission') || '您没有访问此页面的权限'}
          </Alert>
        </Box>
      </Container>
    );
  }

  // Tab 切换处理
  const handleTabChange = (event, newValue) => {
    const tabType = getTabType(newValue);
    
    // 权限检查：确保用户有权限访问该 Tab
    if (tabType === 'flight' && !hasFlightPermission) {
      return; // 没有机票权限，不允许切换
    }
    if (tabType === 'hotel' && !hasHotelPermission) {
      return; // 没有酒店权限，不允许切换
    }
    
    setActiveTab(newValue);
    
    // 更新 URL 参数
    const searchParams = new URLSearchParams(location.search);
    searchParams.set('tab', tabType);
    navigate({ search: searchParams.toString() }, { replace: true });
    
    // 保存到 sessionStorage
    sessionStorage.setItem('bookingManagementTab', tabType);
  };

  return (
    <Container maxWidth="xl">
      <Box sx={{ py: 3 }}>
        {/* Header */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h4" gutterBottom>
            {t('flight.booking.managementTitle') || '预订管理'}
          </Typography>
        </Box>

        {/* Tab 切换器 - 参考机/酒搜索页面的样式和布局 */}
        {(hasFlightPermission || hasHotelPermission) && (
          <Paper elevation={1} sx={{ mb: 3 }}>
            <Tabs 
              value={activeTab} 
              onChange={handleTabChange}
              variant="fullWidth"
              sx={{
                borderBottom: 1,
                borderColor: 'divider',
                '& .MuiTab-root': {
                  minHeight: 64,
                  fontSize: '16px',
                  fontWeight: 600,
                },
              }}
            >
              {hasFlightPermission && (
                <Tab 
                  label={t('flight.booking.title') || '机票预订列表'} 
                  icon={<FlightIcon />} 
                  iconPosition="start"
                />
              )}
              {hasHotelPermission && (
                <Tab 
                  label={t('hotel.booking.title') || '酒店预订列表'} 
                  icon={<HotelIcon />} 
                  iconPosition="start"
                />
              )}
            </Tabs>
          </Paper>
        )}

        {/* 根据 Tab 显示对应内容 */}
        {(() => {
          const currentTabType = getTabType(activeTab);
          
          if (currentTabType === 'flight') {
            return <BookingManagement currentTabType="flight" />;
          } else {
            return <HotelBookingManagement currentTabType="hotel" />;
          }
        })()}
      </Box>
    </Container>
  );
};

export default BookingManagementTabs;

