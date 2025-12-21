# 酒店预订列表页面设计方案

## 1. 概述

### 1.1 功能说明

**重要：区分两个不同的功能**

1. **机/酒搜索**（FlightSearch.js）
   - 路由：`/flight/search`
   - 功能：搜索航班和酒店，选择后创建预订
   - 已有 Tab 切换：机票搜索、酒店搜索
   - **不在本文档范围内**

2. **机/酒预订列表**（BookingManagement.js）
   - 路由：`/flight/bookings`
   - 功能：查看和管理已创建的预订列表
   - 需要添加 Tab 切换：机票预订、酒店预订
   - **本文档的设计范围**

### 1.2 需求描述
- 实现酒店预订列表页面，参考机票预订列表实现
- 与机票预订列表共用一个菜单项（`/flight/bookings`）
- 通过 Tab 页切换：机票预订列表、酒店预订列表
- **重要：实现新功能时不修改机票相关代码**
- **注意：不要与"机/酒搜索"功能混淆**

### 1.3 设计原则
- **功能区分**：明确区分"机/酒搜索"和"机/酒预订列表"两个功能
- **代码隔离**：机票和酒店预订列表代码完全独立，互不影响
- **复用菜单**：共用同一个菜单项（`/flight/bookings`），通过 Tab 切换
- **统一体验**：酒店预订列表的交互和样式与机票预订列表保持一致
- **向后兼容**：不破坏现有机票预订列表功能

## 2. 架构设计

### 2.1 组件结构

```
frontend/src/pages/
├── Flight/
│   ├── BookingManagement.js          # 现有：机票预订列表（保持不变）
│   └── BookingManagementTabs.js     # 新增：Tab容器组件
└── Hotel/
    └── HotelBookingManagement.js     # 新增：酒店预订列表
```

### 2.2 组件职责

#### 2.2.1 BookingManagementTabs.js（新增）
- **职责**：预订列表 Tab 容器组件，管理机票预订列表和酒店预订列表两个 Tab 的切换
- **功能**：
  - 显示两个 Tab：机票预订列表、酒店预订列表
  - 管理当前激活的 Tab
  - 根据 Tab 渲染对应的子组件
  - 保持 Tab 状态（通过 URL 参数或 sessionStorage）
- **样式参考**：Tab 样式和布局完全参考机/酒搜索页面（FlightSearch.js）
- **注意**：这是"预订列表"功能的 Tab，不是"搜索"功能的 Tab

#### 2.2.2 HotelBookingManagement.js（新增）
- **职责**：酒店预订列表页面组件（显示已创建的酒店预订）
- **功能**：
  - 显示酒店预订列表（表格形式）
  - 搜索和筛选功能（搜索已创建的预订）
  - 分页功能
  - 查看详情、取消预订等操作
  - 参考 `BookingManagement.js`（机票预订列表）的实现风格
- **注意**：这是"预订列表"功能，不是"搜索酒店"功能

#### 2.2.3 BookingManagement.js（现有，需要小幅修改）
- **职责**：机票预订列表页面组件（显示已创建的机票预订）
- **修改内容**：
  - 接收 `currentTabType` prop（从父组件传递，默认值为 `'flight'`）
  - 更新"新建预订"按钮，根据 `currentTabType` 跳转到对应的搜索 Tab
  - 更新空状态中的"新建预订"按钮，同样根据 `currentTabType` 跳转
- **向后兼容**：如果不传递 `currentTabType`，默认跳转到机票搜索 Tab（保持原有行为）
- **注意**：这是"预订列表"功能，不是"搜索航班"功能

## 3. 详细设计

### 3.1 BookingManagementTabs.js 设计

#### 3.1.1 Tab 样式和布局参考

**参考来源**：`frontend/src/pages/Flight/FlightSearch.js`（机/酒搜索页面）

**完整样式对比**：

| 样式项 | 机/酒搜索页面 | 预订列表页面（需保持一致） |
|--------|--------------|------------------------|
| Container | `maxWidth="xl"` | `maxWidth="xl"` ✅ |
| 外层 Box | `sx={{ py: 3 }}` | `sx={{ py: 3 }}` ✅ |
| Header Box | `mb: 3` | `mb: 3` ✅ |
| Tab 容器 Paper | `elevation={1} sx={{ mb: 3 }}` | `elevation={1} sx={{ mb: 3 }}` ✅ |
| Tabs variant | `variant="fullWidth"` | `variant="fullWidth"` ✅ |
| Tabs borderBottom | `borderBottom: 1` | `borderBottom: 1` ✅ |
| Tabs borderColor | `borderColor: 'divider'` | `borderColor: 'divider'` ✅ |
| Tab minHeight | `minHeight: 64` | `minHeight: 64` ✅ |
| Tab fontSize | `fontSize: '16px'` | `fontSize: '16px'` ✅ |
| Tab fontWeight | `fontWeight: 600` | `fontWeight: 600` ✅ |
| Tab iconPosition | `iconPosition="start"` | `iconPosition="start"` ✅ |

**样式代码示例**：

```javascript
// 机/酒搜索页面的 Tab 样式（参考）
<Container maxWidth="xl">
  <Box sx={{ py: 3 }}>
    {/* Header */}
    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
      <Typography variant="h4" gutterBottom>
        {t('flight.search.title') || '预订搜索'}
      </Typography>
    </Box>

    {/* Tab 切换器 */}
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
        <Tab 
          label={t('flight.search.tab') || '机/酒预订'} 
          icon={<FlightTakeoffIcon />} 
          iconPosition="start"
        />
        <Tab 
          label={t('hotel.search.tab') || '酒店预订'} 
          icon={<HotelIcon />} 
          iconPosition="start"
        />
      </Tabs>
    </Paper>
  </Box>
</Container>
```

**预订列表页面需要完全一致的样式**：
- Container、Box、Paper 的样式完全一致
- Tabs 的 variant 和 sx 样式完全一致
- Tab 项的 iconPosition 和图标使用方式完全一致

#### 3.1.2 组件结构

```javascript
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

  // 如果没有权限，理论上不会到达这里（路由已拦截），但为了安全起见还是检查
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
        })()}
      </Box>
    </Container>
  );
};

export default BookingManagementTabs;
```

#### 3.1.3 关键特性
- **URL 参数同步**：Tab 状态同步到 URL，支持直接访问和分享
- **状态持久化**：使用 sessionStorage 保存 Tab 状态
- **独立渲染**：两个 Tab 的内容完全独立，互不干扰

### 3.2 BookingManagement.js 修改说明

#### 3.2.1 需要修改的地方

**文件**：`frontend/src/pages/Flight/BookingManagement.js`

**修改内容**：

1. **组件签名**：接收 `currentTabType` prop
```javascript
const BookingManagement = ({ currentTabType = 'flight' }) => {
  // ... 现有代码
```

2. **Header 中的"新建预订"按钮**：
```javascript
<Button
  variant="contained"
  startIcon={<AddIcon />}
  onClick={() => {
    // 根据当前Tab类型跳转到对应的搜索Tab
    navigate('/flight/search', { 
      state: { defaultTab: currentTabType } 
    });
  }}
>
  {t('flight.booking.newBooking') || '新建预订'}
</Button>
```

3. **空状态中的"新建预订"按钮**（如果存在）：
```javascript
<Button
  variant="contained"
  startIcon={<AddIcon />}
  onClick={() => {
    navigate('/flight/search', { 
      state: { defaultTab: currentTabType } 
    });
  }}
  sx={{ mt: 2 }}
>
  {t('flight.booking.newBooking') || '新建预订'}
</Button>
```

**向后兼容性**：
- 如果不传递 `currentTabType`，默认值为 `'flight'`，保持原有行为
- 单独使用 BookingManagement 组件时，仍然可以正常工作

### 3.3 HotelBookingManagement.js 设计

#### 3.3.1 组件结构（参考 BookingManagement.js）

```javascript
/**
 * 酒店预订管理页面
 * 显示用户的所有酒店预订
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container,
  Paper,
  Box,
  Typography,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Chip,
  IconButton,
  Menu,
  MenuItem,
  TextField,
  InputAdornment,
  FormControl,
  InputLabel,
  Select,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Grid,
  LinearProgress,
} from '@mui/material';
import {
  Add as AddIcon,
  Search as SearchIcon,
  FilterList as FilterIcon,
  MoreVert as MoreVertIcon,
  Visibility as ViewIcon,
  Cancel as CancelIcon,
  Hotel as HotelIcon,
  LocationOn as LocationIcon,
  CalendarToday as CalendarIcon,
  AttachMoney as MoneyIcon,
  ContentCopy as ContentCopyIcon,
} from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import { useNotification } from '../../contexts/NotificationContext';
import { getHotelBookings, cancelHotelBooking } from '../../services/hotelService';
import { useDateFormat } from '../../utils/dateFormatter';

// 优化的表格行组件
const HotelBookingTableRow = React.memo(({ 
  booking, 
  onMenuOpen, 
  getStatusColor, 
  t, 
  showNotification 
}) => {
  const formatDate = useDateFormat(false);
  
  const handleCopyNumber = useCallback((e, number) => {
    e.stopPropagation();
    if (number && number !== '-') {
      navigator.clipboard.writeText(number).then(() => {
        showNotification(t('common.copied') || '已复制', 'success');
      }).catch(() => {
        showNotification(t('common.copyFailed') || '复制失败', 'error');
      });
    }
  }, [showNotification, t]);

  const hotelName = useMemo(() => {
    return booking.hotelOffer?.hotel?.name || '-';
  }, [booking.hotelOffer]);

  const location = useMemo(() => {
    const address = booking.hotelOffer?.hotel?.address;
    if (!address) return '-';
    
    const city = address.cityName || '';
    const country = address.countryCode || '';
    return city ? `${city}${country ? `, ${country}` : ''}` : '-';
  }, [booking.hotelOffer]);

  const checkInDate = useMemo(() => {
    const date = booking.hotelOffer?.checkInDate;
    return date ? formatDate(date) : '-';
  }, [booking.hotelOffer, formatDate]);

  const checkOutDate = useMemo(() => {
    const date = booking.hotelOffer?.checkOutDate;
    return date ? formatDate(date) : '-';
  }, [booking.hotelOffer, formatDate]);

  const price = useMemo(() => {
    const priceObj = booking.hotelOffer?.offers?.[0]?.price || booking.price;
    if (!priceObj) return '-';
    const total = priceObj.total || '0';
    const currency = priceObj.currency || 'USD';
    return `${total} ${currency}`;
  }, [booking.hotelOffer, booking.price]);

  return (
    <TableRow hover>
      <TableCell>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <Typography 
            variant="body2" 
            sx={{ 
              fontWeight: 500,
              fontFamily: 'monospace',
              fontSize: '0.875rem',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              maxWidth: '200px'
            }}
          >
            {booking.bookingReference || '-'}
          </Typography>
          {booking.bookingReference && booking.bookingReference !== '-' && (
            <IconButton
              size="small"
              onClick={(e) => handleCopyNumber(e, booking.bookingReference)}
              sx={{ 
                p: 0.5,
                '&:hover': { bgcolor: 'action.hover' }
              }}
            >
              <ContentCopyIcon fontSize="small" sx={{ fontSize: 14 }} />
            </IconButton>
          )}
        </Box>
      </TableCell>
      <TableCell>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <Typography 
            variant="body2" 
            sx={{ 
              fontWeight: 500,
              fontFamily: 'monospace',
              fontSize: '0.875rem',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              maxWidth: '200px'
            }}
          >
            {booking.travelId?.travelNumber || '-'}
          </Typography>
          {booking.travelId?.travelNumber && booking.travelId.travelNumber !== '-' && (
            <IconButton
              size="small"
              onClick={(e) => handleCopyNumber(e, booking.travelId.travelNumber)}
              sx={{ 
                p: 0.5,
                '&:hover': { bgcolor: 'action.hover' }
              }}
            >
              <ContentCopyIcon fontSize="small" sx={{ fontSize: 14 }} />
            </IconButton>
          )}
        </Box>
      </TableCell>
      <TableCell>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <HotelIcon color="action" fontSize="small" />
          <Typography variant="body2" sx={{ maxWidth: 250, overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {hotelName}
          </Typography>
        </Box>
      </TableCell>
      <TableCell>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <LocationIcon color="action" fontSize="small" />
          <Typography variant="body2">
            {location}
          </Typography>
        </Box>
      </TableCell>
      <TableCell>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <CalendarIcon color="action" fontSize="small" />
          <Typography variant="body2">
            {checkInDate} - {checkOutDate}
          </Typography>
        </Box>
      </TableCell>
      <TableCell>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <MoneyIcon color="action" fontSize="small" />
          <Typography variant="body2" sx={{ fontWeight: 'bold', whiteSpace: 'nowrap' }}>
            {price}
          </Typography>
        </Box>
      </TableCell>
      <TableCell>
        <Chip
          label={t(`hotel.booking.${booking.status}`) || booking.status}
          color={getStatusColor(booking.status)}
          size="small"
        />
      </TableCell>
      <TableCell>
        <IconButton
          onClick={(e) => onMenuOpen(e, booking)}
          size="small"
        >
          <MoreVertIcon />
        </IconButton>
      </TableCell>
    </TableRow>
  );
});

HotelBookingTableRow.displayName = 'HotelBookingTableRow';

const HotelBookingManagement = ({ currentTabType = 'hotel' }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { showNotification } = useNotification();

  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [anchorEl, setAnchorEl] = useState(null);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  
  // 分页状态
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(20);
  const [total, setTotal] = useState(0);

  // 搜索防抖
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  const statusOptions = useMemo(() => [
    { value: 'all', label: t('common.all') || '全部' },
    { value: 'confirmed', label: t('hotel.booking.confirmed') || '已确认' },
    { value: 'pending', label: t('hotel.booking.pending') || '待确认' },
    { value: 'cancelled', label: t('hotel.booking.cancelled') || '已取消' },
  ], [t]);

  const getStatusColor = useCallback((status) => {
    switch (status) {
      case 'confirmed':
        return 'success';
      case 'pending':
        return 'warning';
      case 'cancelled':
        return 'error';
      case 'failed':
        return 'error';
      default:
        return 'default';
    }
  }, []);

  useEffect(() => {
    fetchBookings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, rowsPerPage, statusFilter, debouncedSearchTerm]);

  const fetchBookings = async () => {
    setLoading(true);
    try {
      const params = {
        page: page + 1, // API使用1-based分页
        limit: rowsPerPage
      };
      
      if (statusFilter && statusFilter !== 'all') {
        params.status = statusFilter;
      }
      
      if (debouncedSearchTerm && debouncedSearchTerm.trim()) {
        params.search = debouncedSearchTerm.trim();
      }
      
      const response = await getHotelBookings(params);
      if (response.data.success) {
        setBookings(response.data.data || []);
        // 支持多种响应格式（兼容旧版本和新版本）
        setTotal(
          response.data.total || 
          response.data.count || 
          response.data.data?.length || 
          0
        );
      }
    } catch (error) {
      showNotification(
        error.response?.data?.message || t('hotel.booking.fetchError') || '获取预订列表失败',
        'error'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleMenuOpen = useCallback((event, booking) => {
    setAnchorEl(event.currentTarget);
    setSelectedBooking(booking);
  }, []);

  const handleMenuClose = useCallback(() => {
    setAnchorEl(null);
    setSelectedBooking(null);
  }, []);

  const handleView = useCallback(() => {
    if (selectedBooking) {
      navigate(`/hotel/bookings/${selectedBooking._id}`);
    }
    handleMenuClose();
  }, [selectedBooking, navigate, handleMenuClose]);

  const handleCancelClick = useCallback(() => {
    setCancelDialogOpen(true);
    handleMenuClose();
  }, [handleMenuClose]);

  const handleCancelConfirm = async () => {
    if (!selectedBooking) return;

    try {
      await cancelHotelBooking(selectedBooking._id, cancelReason);
      showNotification(t('hotel.booking.cancelSuccess') || '预订已取消', 'success');
      setCancelDialogOpen(false);
      setCancelReason('');
      fetchBookings();
    } catch (error) {
      showNotification(
        error.response?.data?.message || t('hotel.booking.cancelError') || '取消失败',
        'error'
      );
    }
  };

  // 处理分页变化
  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  // 处理搜索变化
  const handleSearchChange = (event) => {
    setSearchTerm(event.target.value);
    setPage(0);
  };

  // 处理状态过滤变化
  const handleStatusFilterChange = (event) => {
    setStatusFilter(event.target.value);
    setPage(0);
  };

  if (loading && bookings.length === 0) {
    return (
      <Container maxWidth="xl">
        <Box sx={{ width: '100%', mt: 2 }}>
          <LinearProgress />
        </Box>
      </Container>
    );
  }

  return (
    <>
      {/* Header - 参考机票预订列表的布局 */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" gutterBottom>
          {t('hotel.booking.title') || '酒店预订列表'}
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => {
            // 根据当前Tab类型跳转到对应的搜索Tab
            navigate('/flight/search', { 
              state: { defaultTab: currentTabType } 
            });
          }}
        >
          {t('hotel.booking.newBooking') || '新建预订'}
        </Button>
        {/* 注意：新建预订跳转到"机/酒搜索"页面，根据当前Tab跳转到对应的搜索Tab */}
      </Box>

      {/* Filters */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              placeholder={t('hotel.booking.search') || '搜索预订...'}
              value={searchTerm}
              onChange={handleSearchChange}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                ),
              }}
            />
          </Grid>
          <Grid item xs={12} md={3}>
            <FormControl fullWidth>
              <InputLabel>{t('hotel.booking.status') || '状态'}</InputLabel>
              <Select
                value={statusFilter}
                label={t('hotel.booking.status') || '状态'}
                onChange={handleStatusFilterChange}
              >
                {statusOptions.map((option) => (
                  <MenuItem key={option.value} value={option.value}>
                    {option.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={3}>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button
                variant="outlined"
                startIcon={<FilterIcon />}
                onClick={() => {
                  setSearchTerm('');
                  setStatusFilter('all');
                  setPage(0);
                }}
                fullWidth
              >
                {t('common.reset') || '清除筛选'}
              </Button>
            </Box>
          </Grid>
        </Grid>
      </Paper>

      {/* Bookings Table */}
      {bookings.length > 0 ? (
        <TableContainer component={Paper}>
          {loading && <LinearProgress />}
          <Table>
            <TableHead>
              <TableRow>
                <TableCell sx={{ minWidth: 150 }}>{t('hotel.booking.bookingReference') || '预订参考号'}</TableCell>
                <TableCell sx={{ minWidth: 150 }}>{t('hotel.booking.travelNumber') || '差旅单号'}</TableCell>
                <TableCell sx={{ minWidth: 200 }}>{t('hotel.booking.hotelName') || '酒店名称'}</TableCell>
                <TableCell sx={{ minWidth: 150 }}>{t('hotel.booking.location') || '位置'}</TableCell>
                <TableCell sx={{ minWidth: 200 }}>{t('hotel.booking.dates') || '入住日期'}</TableCell>
                <TableCell sx={{ minWidth: 120 }}>{t('hotel.booking.price') || '价格'}</TableCell>
                <TableCell sx={{ minWidth: 100 }}>{t('hotel.booking.status') || '状态'}</TableCell>
                <TableCell sx={{ minWidth: 100 }}>{t('common.actions') || '操作'}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {bookings.map((booking) => (
                <HotelBookingTableRow
                  key={booking._id}
                  booking={booking}
                  onMenuOpen={handleMenuOpen}
                  getStatusColor={getStatusColor}
                  t={t}
                  showNotification={showNotification}
                />
              ))}
            </TableBody>
          </Table>
          <TablePagination
            component="div"
            count={total}
            page={page}
            onPageChange={handleChangePage}
            rowsPerPage={rowsPerPage}
            onRowsPerPageChange={handleChangeRowsPerPage}
            rowsPerPageOptions={[10, 20, 50, 100]}
            labelRowsPerPage={t('common.rowsPerPage') || '每页行数:'}
            labelDisplayedRows={({ from, to, count }) => 
              `${from}-${to} ${t('common.of') || '共'} ${count !== -1 ? count : `${t('common.moreThan') || '超过'} ${to}`}`
            }
          />
        </TableContainer>
      ) : (
        <Paper sx={{ p: 4, textAlign: 'center', mt: 2 }}>
          <Typography variant="h6" color="text.secondary">
            {t('hotel.booking.noBookings') || '暂无预订记录'}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            {(searchTerm || statusFilter !== 'all') 
              ? (t('hotel.booking.tryAdjustingSearch') || '请尝试调整搜索条件')
              : (t('hotel.booking.createFirstBooking') || '创建您的第一个预订')
            }
          </Typography>
          {!searchTerm && statusFilter === 'all' && (
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => {
                // 根据当前Tab类型跳转到对应的搜索Tab
                navigate('/flight/search', { 
                  state: { defaultTab: currentTabType } 
                });
              }}
              sx={{ mt: 2 }}
            >
              {t('hotel.booking.newBooking') || '新建预订'}
            </Button>
          )}
        </Paper>
      )}

      {/* Action Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
      >
        <MenuItem onClick={handleView}>
          <ViewIcon sx={{ mr: 1.5, fontSize: 20 }} />
          {t('common.view') || '查看'}
        </MenuItem>
        {selectedBooking?.status === 'confirmed' && (
          <MenuItem onClick={handleCancelClick} sx={{ color: 'error.main' }}>
            <CancelIcon sx={{ mr: 1.5, fontSize: 20 }} />
            {t('hotel.booking.cancel') || '取消'}
          </MenuItem>
        )}
      </Menu>

      {/* Cancel Dialog */}
      <Dialog open={cancelDialogOpen} onClose={() => setCancelDialogOpen(false)}>
        <DialogTitle>{t('hotel.booking.cancelBooking') || '取消预订'}</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            multiline
            rows={4}
            label={t('hotel.booking.cancelReason') || '取消原因'}
            value={cancelReason}
            onChange={(e) => setCancelReason(e.target.value)}
            sx={{ mt: 1 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCancelDialogOpen(false)}>
            {t('common.cancel') || '取消'}
          </Button>
          <Button onClick={handleCancelConfirm} color="error" variant="contained">
            {t('common.confirm') || '确认'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default HotelBookingManagement;
```

#### 3.2.2 表格列设计

| 列名 | 字段 | 说明 |
|------|------|------|
| 预订参考号 | `bookingReference` | 可复制 |
| 差旅单号 | `travelId.travelNumber` | 可复制 |
| 酒店名称 | `hotelOffer.hotel.name` | 显示酒店名称 |
| 位置 | `hotelOffer.hotel.address` | 城市、国家 |
| 入住日期 | `checkInDate` - `checkOutDate` | 入住和退房日期 |
| 价格 | `price.total` + `price.currency` | 总价和货币 |
| 状态 | `status` | 状态标签（已确认/待确认/已取消） |
| 操作 | - | 查看、取消等操作菜单 |

#### 3.2.3 功能特性
- **搜索功能**：支持搜索预订参考号、差旅单号、酒店名称等
- **状态筛选**：全部、已确认、待确认、已取消
- **分页功能**：支持 10/20/50/100 条每页
- **操作功能**：查看详情、取消预订（仅已确认状态）
- **空状态**：无数据时显示友好提示

### 3.4 路由配置修改

**重要说明**：
- `/flight/search`：机/酒搜索页面（FlightSearch.js）- **已有，不修改**
- `/flight/bookings`：机/酒预订列表页面（BookingManagementTabs.js）- **需要修改**

#### 3.3.1 App.js 路由修改

```javascript
// 修改前
<Route 
  path="flight/bookings" 
  element={
    <PermissionRoute requiredPermissions={PERMISSIONS.FLIGHT_BOOKING_VIEW}>
      <BookingManagement />
    </PermissionRoute>
  } 
/>

// 修改后
<Route 
  path="flight/bookings" 
  element={
    <PermissionRoute 
      requiredPermissions={[
        PERMISSIONS.FLIGHT_BOOKING_VIEW, 
        PERMISSIONS.HOTEL_BOOKING_VIEW
      ]}
      requireAll={false}
    >
      <BookingManagementTabs />
    </PermissionRoute>
  } 
/>

// 新增：酒店预订详情路由（如果还没有）
<Route 
  path="hotel/bookings/:id" 
  element={
    <PermissionRoute requiredPermissions={PERMISSIONS.HOTEL_BOOKING_VIEW}>
      <HotelBookingDetail />
    </PermissionRoute>
  } 
/>
```

#### 3.3.2 权限配置

**权限已存在**（已确认）：
- `PERMISSIONS.FLIGHT_BOOKING_VIEW: 'flight.booking.view'`：查看机票预订（已有）
- `PERMISSIONS.HOTEL_BOOKING_VIEW: 'hotel.booking.view'`：查看酒店预订（已存在）

**权限控制策略**：

1. **路由级别权限**：
   - Tab 容器路由需要检查用户是否有**任一权限**（机票或酒店）
   - 使用 `PermissionRoute` 的 `requireAll={false}`（默认值），表示只需要任一权限即可访问

2. **Tab 级别权限**：
   - 在 `BookingManagementTabs` 组件内部，根据用户实际权限动态显示 Tab
   - 如果用户只有机票权限，只显示机票 Tab
   - 如果用户只有酒店权限，只显示酒店 Tab
   - 如果两个权限都有，显示两个 Tab
   - 如果都没有（理论上不会发生，因为路由已拦截），显示无权限提示

3. **子组件权限**：
   - `BookingManagement`（机票）：组件内部不进行权限检查，由路由控制
   - `HotelBookingManagement`（酒店）：组件内部不进行权限检查，由路由控制
   - 如果用户通过 URL 参数直接访问没有权限的 Tab，自动切换到有权限的 Tab

### 3.5 国际化配置

#### 3.4.1 新增翻译键（zh.json, en.json, ja.json, ko.json）

```json
{
  "hotel": {
    "booking": {
      "title": "酒店预订管理",
      "newBooking": "新建预订",
      "search": "搜索预订...",
      "status": "状态",
      "bookingReference": "预订参考号",
      "travelNumber": "差旅单号",
      "hotelName": "酒店名称",
      "location": "位置",
      "dates": "入住日期",
      "price": "价格",
      "confirmed": "已确认",
      "pending": "待确认",
      "cancelled": "已取消",
      "noBookings": "暂无预订记录",
      "tryAdjustingSearch": "请尝试调整搜索条件",
      "createFirstBooking": "创建您的第一个预订",
      "cancel": "取消",
      "cancelBooking": "取消预订",
      "cancelReason": "取消原因",
      "cancelSuccess": "预订已取消",
      "cancelError": "取消失败",
      "fetchError": "获取预订列表失败"
    }
  }
}
```

## 4. 数据流设计

### 4.1 API 调用流程

```
HotelBookingManagement
  ↓
getHotelBookings(params)
  ↓
GET /api/hotels/bookings?page=1&limit=20&status=confirmed&search=xxx
  ↓
Backend: hotelController.getBookings
  ↓
返回: { success: true, data: [...], total: 100 }
```

### 4.2 数据权限控制

#### 4.2.1 数据权限范围

系统支持以下数据权限范围（通过角色配置）：

| 权限范围 | 说明 | 查询条件 |
|---------|------|---------|
| `SELF` | 仅本人数据 | `{ employee: req.user.id }` |
| `DEPARTMENT` | 本部门数据 | `{ employee: { $in: departmentUserIds } }` |
| `SUB_DEPARTMENT` | 本部门及下属部门数据 | `{ employee: { $in: allSubDeptUserIds } }` |
| `ALL` | 全部数据 | `{}`（无限制） |

#### 4.2.2 数据权限实现

**后端实现**（`hotelController.getBookings`）：

```javascript
// 1. 检查功能权限
const hasPermission = role && (
  role.code === 'ADMIN' || 
  role.permissions?.includes('hotel.booking.view') ||
  role.permissions?.includes('hotels:manage:all')
);

// 2. 使用统一的数据权限管理构建查询条件
const dataScopeQuery = await buildDataScopeQuery(user, role, 'employee');

// 3. 合并查询条件
let query = { ...dataScopeQuery };

// 4. 添加其他筛选条件
if (travelId) {
  query.travelId = travelId;
}
if (status && status !== 'all') {
  query.status = status;
}

// 5. 搜索功能（需要补充）：搜索时也要考虑数据权限
if (search && search.trim()) {
  const searchTerm = search.trim();
  const searchRegex = { $regex: searchTerm, $options: 'i' };
  
  // 搜索差旅单号时，需要先查找有权限访问的差旅申请
  const travelDataScopeQuery = await buildDataScopeQuery(user, role, 'employee');
  const travelQuery = {
    ...travelDataScopeQuery,
    travelNumber: searchRegex,
  };
  
  const matchingTravels = await Travel.find(travelQuery).select('_id').lean();
  const travelIds = matchingTravels.map(t => t._id);
  
  query.$or = [
    { bookingReference: searchRegex },
    { hotelName: searchRegex }, // 酒店名称搜索
    ...(travelIds.length > 0 ? [{ travelId: { $in: travelIds } }] : [])
  ];
}

// 6. 分页查询（需要补充）
const pageNum = parseInt(page, 10) || 1;
const limitNum = parseInt(limit, 10) || 20;
const skip = (pageNum - 1) * limitNum;

const total = await HotelBooking.countDocuments(query);
const bookings = await HotelBooking.find(query)
  .populate('travelId', 'travelNumber title status')
  .populate('employee', 'firstName lastName email')
  .sort({ createdAt: -1 })
  .skip(skip)
  .limit(limitNum)
  .lean();
```

#### 4.2.3 数据权限检查点

1. **列表查询**：使用 `buildDataScopeQuery` 构建查询条件，自动过滤无权限数据
2. **搜索功能**：搜索差旅单号时，先查找有权限访问的差旅申请，再查询关联的预订
3. **详情查询**：使用 `checkResourceAccess` 检查单个资源的访问权限
4. **操作权限**：取消预订等操作也需要检查数据权限

#### 4.2.4 需要补充的功能

酒店预订列表 API 需要补充以下功能（参考机票预订列表）：

1. **分页功能**：
   - 支持 `page` 和 `limit` 参数
   - 返回 `total`、`page`、`limit`、`pages` 字段

2. **搜索功能**：
   - 支持按预订参考号搜索
   - 支持按差旅单号搜索（需考虑数据权限）
   - 支持按酒店名称搜索

3. **响应格式统一**：
   - 与机票预订列表保持一致的响应格式

### 4.3 数据格式

#### 4.3.1 预订列表响应格式

```javascript
{
  success: true,
  data: [
    {
      _id: "booking_id",
      bookingReference: "HOTEL123456",
      travelId: {
        _id: "travel_id",
        travelNumber: "TRV20240101001"
      },
      hotelOffer: {
        hotel: {
          hotelId: "hotel_id",
          name: "Grand Hotel",
          address: {
            cityName: "北京",
            countryCode: "CN"
          }
        },
        checkInDate: "2024-01-15",
        checkOutDate: "2024-01-18",
        offers: [{
          id: "offer_id",
          price: {
            total: "500.00",
            currency: "USD"
          }
        }]
      },
      price: {
        total: "500.00",
        currency: "USD"
      },
      status: "confirmed",
      createdAt: "2024-01-01T00:00:00Z"
    }
  ],
  total: 100
}
```

## 5. 实现步骤

### 5.1 第一阶段：创建 Tab 容器组件
1. 创建 `BookingManagementTabs.js`
2. 实现 Tab 切换逻辑
3. 集成现有的 `BookingManagement` 组件

### 5.2 第二阶段：完善后端 API（数据权限和分页搜索）
1. **更新 `hotelController.getBookings`**：
   - ✅ 已实现数据权限控制（使用 `buildDataScopeQuery`）
   - ⚠️ 需要补充分页功能（`page`、`limit`、`total`）
   - ⚠️ 需要补充搜索功能（预订参考号、差旅单号、酒店名称）
   - ⚠️ 搜索时也要考虑数据权限（参考机票预订列表实现）

2. **数据权限验证**：
   - 确保搜索差旅单号时，只搜索有权限访问的差旅申请
   - 确保返回的数据都符合用户的数据权限范围

### 5.2.1 修改 BookingManagement.js（机票预订列表）
1. 添加 `currentTabType` prop 参数（默认值 `'flight'`）
2. 更新 Header 中的"新建预订"按钮，根据 `currentTabType` 跳转
3. 更新空状态中的"新建预订"按钮（如果存在），根据 `currentTabType` 跳转
4. 确保向后兼容（不传递 prop 时使用默认值）

### 5.3 第三阶段：创建酒店预订列表组件
1. 创建 `HotelBookingManagement.js`
2. 实现表格展示
3. 实现搜索和筛选功能（依赖后端 API）
4. 实现分页功能（依赖后端 API）
5. 实现操作菜单（查看、取消）

### 5.4 第四阶段：路由和权限配置
1. 修改 `App.js` 路由配置
2. 确认权限配置
3. 添加国际化翻译

### 5.5 第五阶段：测试和优化
1. 测试 Tab 切换功能
2. 测试酒店预订列表各项功能
3. 测试与机票预订列表的隔离性
4. 优化用户体验

## 6. 注意事项

### 6.1 代码隔离
- **不修改** `BookingManagement.js` 的任何代码
- 两个 Tab 的组件完全独立，互不影响
- 使用不同的状态管理和 API 调用

### 6.2 菜单保持不变
- 菜单项路径仍然是 `/flight/bookings`（预订列表功能）
- 菜单文本可以保持"机/酒预订"或"预订管理"
- Tab 切换在页面内部完成
- **注意**：不要与 `/flight/search`（机/酒搜索）菜单混淆

### 6.3 向后兼容
- 现有的机票预订功能完全不受影响
- BookingManagement 组件添加 `currentTabType` prop，默认值为 `'flight'`，保持原有行为
- 单独使用 BookingManagement 组件时，仍然可以正常工作
- URL 参数支持直接访问特定 Tab（`?tab=flight` 或 `?tab=hotel`）
- 默认显示机票预订 Tab（保持原有行为）
- 如果用户只有机票权限，自动显示机票 Tab
- 如果用户只有酒店权限，自动显示酒店 Tab

### 6.3.1 "新建预订"按钮跳转逻辑
- **机票预订列表 Tab**：点击"新建预订" → 跳转到 `/flight/search`，默认显示机票搜索 Tab
- **酒店预订列表 Tab**：点击"新建预订" → 跳转到 `/flight/search`，默认显示酒店搜索 Tab
- 通过 `location.state.defaultTab` 传递 Tab 类型，机/酒搜索页面会自动切换到对应的 Tab

### 6.4 权限控制
- **路由级别**：检查用户是否有任一权限（机票或酒店），任一权限即可访问页面
- **Tab 级别**：根据用户实际权限动态显示 Tab
  - 只有机票权限：只显示机票 Tab
  - 只有酒店权限：只显示酒店 Tab
  - 两个权限都有：显示两个 Tab，支持切换
- **URL 参数保护**：如果用户通过 URL 参数访问没有权限的 Tab，自动切换到有权限的 Tab
- **权限验证**：组件内部进行权限检查，确保安全性

### 6.5 数据权限考虑
- **后端数据权限**：
  - 使用 `buildDataScopeQuery` 构建查询条件，自动过滤无权限数据
  - 搜索功能也要考虑数据权限（搜索差旅单号时）
  - 确保用户只能看到有权限访问的预订数据
  
- **数据权限范围**：
  - `SELF`：仅本人数据
  - `DEPARTMENT`：本部门数据
  - `SUB_DEPARTMENT`：本部门及下属部门数据
  - `ALL`：全部数据（管理员）
  
- **权限检查点**：
  - 列表查询：自动应用数据权限范围
  - 搜索查询：搜索差旅单号时，先查找有权限的差旅申请
  - 详情查询：使用 `checkResourceAccess` 检查单个资源权限
  - 操作权限：取消预订等操作也需要检查数据权限

### 6.6 性能考虑
- 使用 `React.memo` 优化表格行组件
- 搜索使用防抖（300ms）
- 分页加载，避免一次性加载大量数据
- 数据权限查询使用缓存机制（部门用户列表缓存）

## 7. 后续扩展

### 7.1 酒店预订详情页面
- 创建 `HotelBookingDetail.js` 组件
- 参考 `BookingDetail.js` 的实现
- 路由：`/hotel/bookings/:id`

### 7.2 批量操作
- 批量取消预订
- 批量导出预订信息

### 7.3 高级筛选
- 按日期范围筛选
- 按价格范围筛选
- 按城市筛选

## 8. 权限控制详细说明

### 8.1 权限检查流程

```
用户访问 /flight/bookings
    ↓
路由权限检查（PermissionRoute）
    ├─ 检查是否有 FLIGHT_BOOKING_VIEW 或 HOTEL_BOOKING_VIEW
    ├─ 任一权限即可通过
    └─ 都没有 → 显示无权限提示
    ↓
BookingManagementTabs 组件
    ↓
组件内部权限检查
    ├─ 检查 FLIGHT_BOOKING_VIEW → hasFlightPermission
    ├─ 检查 HOTEL_BOOKING_VIEW → hasHotelPermission
    └─ 根据权限动态显示 Tab
    ↓
Tab 显示逻辑
    ├─ 只有机票权限 → 只显示机票 Tab，自动设置 activeTab = 0
    ├─ 只有酒店权限 → 只显示酒店 Tab，自动设置 activeTab = 1
    └─ 两个权限都有 → 显示两个 Tab，根据 URL 参数或默认值设置 activeTab
    ↓
URL 参数保护
    ├─ 如果 URL 参数指定了没有权限的 Tab
    └─ 自动切换到有权限的 Tab
```

### 8.2 权限场景示例

| 用户权限 | Tab 显示 | 默认 Tab | URL 参数 `?tab=hotel` | URL 参数 `?tab=flight` |
|---------|---------|---------|----------------------|----------------------|
| 只有机票权限 | 机票 Tab | 机票 Tab | 自动切换到机票 Tab | 显示机票 Tab |
| 只有酒店权限 | 酒店 Tab | 酒店 Tab | 显示酒店 Tab | 自动切换到酒店 Tab |
| 两个权限都有 | 两个 Tab | 机票 Tab（默认） | 显示酒店 Tab | 显示机票 Tab |
| 都没有权限 | - | - | 路由拦截，无法访问 | 路由拦截，无法访问 |

### 8.4 数据权限场景示例

| 用户角色 | 数据权限范围 | 可见数据 | 说明 |
|---------|------------|---------|------|
| 普通员工 | SELF | 仅本人的预订 | 只能查看自己创建的预订 |
| 部门经理 | DEPARTMENT | 本部门所有员工的预订 | 可以查看本部门所有员工的预订 |
| 高级经理 | SUB_DEPARTMENT | 本部门及下属部门所有员工的预订 | 可以查看本部门及下属部门所有员工的预订 |
| 管理员 | ALL | 全部预订 | 可以查看所有预订 |

**数据权限实现**：
- 后端使用 `buildDataScopeQuery(user, role, 'employee')` 自动构建查询条件
- 查询条件自动应用到列表查询、搜索查询等所有数据查询
- 确保用户只能看到有权限访问的数据

### 8.3 权限配置检查清单

**功能权限**：
- [x] `PERMISSIONS.FLIGHT_BOOKING_VIEW` 已定义
- [x] `PERMISSIONS.HOTEL_BOOKING_VIEW` 已定义
- [x] 后端 `MENU_PERMISSIONS` 已配置 `/hotel/bookings`
- [ ] 前端路由使用 `requireAll={false}` 检查任一权限
- [ ] Tab 组件内部进行权限检查
- [ ] URL 参数保护机制已实现

**数据权限**：
- [x] 后端使用 `buildDataScopeQuery` 构建数据权限查询条件
- [x] 支持数据权限范围：SELF、DEPARTMENT、SUB_DEPARTMENT、ALL
- [ ] 搜索功能考虑数据权限（搜索差旅单号时）
- [ ] 分页功能实现（需要补充）
- [ ] 搜索功能实现（需要补充）

## 9. 后端 API 更新需求

### 9.1 酒店预订列表 API 更新

**文件**：`backend/controllers/hotelController.js`

**当前状态**：
- ✅ 已实现功能权限检查
- ✅ 已实现数据权限控制（`buildDataScopeQuery`）
- ⚠️ 缺少分页功能
- ⚠️ 缺少搜索功能

**需要更新的代码**：

```javascript
/**
 * 获取预订列表（支持按差旅申请筛选、分页和搜索）
 * @route GET /api/hotels/bookings
 * @access Private
 */
exports.getBookings = async (req, res) => {
  try {
    const { travelId, status, page = 1, limit = 20, search } = req.query;
    
    // 获取用户和角色信息
    const [user, role] = await Promise.all([
      User.findById(req.user.id),
      Role.findOne({ code: req.user.role, isActive: true }).lean(),
    ]);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: '用户不存在',
      });
    }
    
    // 检查功能权限：是否有查看酒店预订的权限
    const hasPermission = role && (
      role.code === 'ADMIN' || 
      role.permissions?.includes('hotel.booking.view') ||
      role.permissions?.includes('hotels:manage:all')
    );
    
    if (!hasPermission) {
      return res.status(403).json({
        success: false,
        message: '无权查看酒店预订列表',
      });
    }
    
    // 使用统一的数据权限管理构建查询条件
    const dataScopeQuery = await buildDataScopeQuery(user, role, 'employee');
    
    // 合并查询条件
    let query = { ...dataScopeQuery };
    
    if (travelId) {
      query.travelId = travelId;
    }
    
    if (status && status !== 'all') {
      query.status = status;
    }
    
    // 搜索功能：支持按预订参考号、差旅单号、酒店名称搜索
    if (search && search.trim()) {
      const searchTerm = search.trim();
      const searchRegex = { $regex: searchTerm, $options: 'i' };
      
      // 搜索差旅单号时，需要先查找有权限访问的差旅申请
      const travelDataScopeQuery = await buildDataScopeQuery(user, role, 'employee');
      const travelQuery = {
        ...travelDataScopeQuery,
        travelNumber: searchRegex,
      };
      
      const matchingTravels = await Travel.find(travelQuery).select('_id').lean();
      const travelIds = matchingTravels.map(t => t._id);
      
      // 搜索酒店名称（需要从 hotelOffer.hotel.name 中搜索）
      // 注意：由于 hotelOffer 是嵌套对象，可能需要使用聚合查询或先查询再过滤
      query.$or = [
        { bookingReference: searchRegex },
        ...(travelIds.length > 0 ? [{ travelId: { $in: travelIds } }] : [])
      ];
      
      // 如果搜索酒店名称，需要特殊处理（可能需要使用聚合查询）
      // 暂时先支持预订参考号和差旅单号搜索
    }
    
    // 分页参数
    const pageNum = parseInt(page, 10) || 1;
    const limitNum = parseInt(limit, 10) || 20;
    const skip = (pageNum - 1) * limitNum;
    
    // 获取总数
    const total = await HotelBooking.countDocuments(query);
    
    // 获取数据
    const bookings = await HotelBooking.find(query)
      .populate('travelId', 'travelNumber title status')
      .populate('employee', 'firstName lastName email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum)
      .lean();
    
    res.json({
      success: true,
      data: bookings,
      total,
      page: pageNum,
      limit: limitNum,
      pages: Math.ceil(total / limitNum),
    });
  } catch (error) {
    logger.error('获取预订列表失败:', error);
    res.status(500).json({
      success: false,
      message: error.message || '获取预订列表失败',
    });
  }
};
```

### 9.2 数据权限验证清单

- [x] 功能权限检查（`hotel.booking.view`）
- [x] 数据权限查询条件构建（`buildDataScopeQuery`）
- [ ] 分页功能实现
- [ ] 搜索功能实现（预订参考号、差旅单号）
- [ ] 搜索时的数据权限验证（差旅单号搜索）
- [ ] 响应格式统一（与机票预订列表一致）

## 10. 功能区分说明

### 10.1 两个独立的功能

| 功能 | 路由 | 组件 | Tab 内容 | 功能说明 |
|------|------|------|---------|---------|
| **机/酒搜索** | `/flight/search` | FlightSearch.js | 机票搜索、酒店搜索 | 搜索航班和酒店，选择后创建预订 |
| **机/酒预订列表** | `/flight/bookings` | BookingManagementTabs.js | 机票预订列表、酒店预订列表 | 查看和管理已创建的预订 |

### 10.2 功能关系

```
用户流程：
1. 进入"机/酒搜索"页面（/flight/search）
   └─> 搜索航班或酒店
   └─> 选择航班或酒店
   └─> 创建预订

2. 进入"机/酒预订列表"页面（/flight/bookings）
   └─> 查看已创建的预订
   └─> 管理预订（查看详情、取消等）
   └─> 点击"新建预订"按钮 → 跳转到"机/酒搜索"页面
       ├─> 如果在"机票预订列表"Tab → 跳转到搜索页面的"机票搜索"Tab
       └─> 如果在"酒店预订列表"Tab → 跳转到搜索页面的"酒店搜索"Tab
```

### 10.3 "新建预订"按钮跳转逻辑

**实现方式**：
- 通过 `location.state.defaultTab` 传递当前 Tab 类型
- 机/酒搜索页面（FlightSearch.js）会自动识别并切换到对应的 Tab

**跳转映射**：
| 预订列表 Tab | 跳转目标 | 搜索页面 Tab |
|------------|---------|-------------|
| 机票预订列表 | `/flight/search` | 机票搜索 Tab（defaultTab: 'flight'） |
| 酒店预订列表 | `/flight/search` | 酒店搜索 Tab（defaultTab: 'hotel'） |

**代码实现**：
```javascript
// BookingManagementTabs.js 中传递 currentTabType
<BookingManagement currentTabType="flight" />
<HotelBookingManagement currentTabType="hotel" />

// 子组件中根据 currentTabType 跳转
onClick={() => {
  navigate('/flight/search', { 
    state: { defaultTab: currentTabType } 
  });
}}
```

### 10.4 本文档范围

- ✅ **包含**：机/酒预订列表功能（`/flight/bookings`）
- ❌ **不包含**：机/酒搜索功能（`/flight/search`）- 已有，不修改

## 11. 总结

本设计方案实现了：
1. ✅ 酒店预订列表页面
2. ✅ 与机票预订列表共用菜单，通过 Tab 切换
3. ✅ 不修改机票预订列表相关代码
4. ✅ 保持代码隔离和向后兼容
5. ✅ 统一的用户体验
6. ✅ **明确区分两个功能**：
   - 机/酒搜索（`/flight/search`）- 已有，不修改
   - 机/酒预订列表（`/flight/bookings`）- 本文档设计范围
7. ✅ **完善的权限控制机制**：
   - **功能权限**：路由级别和 Tab 级别的权限控制
   - **数据权限**：基于角色的数据范围控制（本人/部门/全部）
   - URL 参数保护：防止访问无权限的 Tab
8. ✅ **数据权限管理**：
   - 使用统一的数据权限查询构建器（`buildDataScopeQuery`）
   - 搜索功能也考虑数据权限
   - 确保用户只能访问有权限的数据

通过 Tab 容器组件统一管理两个预订列表，既满足了共用菜单的需求，又保持了代码的独立性和可维护性，同时确保了功能权限和数据权限的双重安全性。

