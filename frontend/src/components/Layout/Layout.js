import React, { useState, useMemo } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
  Box,
  Drawer,
  AppBar,
  Toolbar,
  List,
  Typography,
  Divider,
  IconButton,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Avatar,
  Menu,
  MenuItem,
  useTheme,
  useMediaQuery
} from '@mui/material';
import {
  Menu as MenuIcon,
  Dashboard as DashboardIcon,
  Flight as TravelIcon,
  Receipt as ExpenseIcon,
  Approval as ApprovalIcon,
  Assessment as ReportIcon,
  Person as ProfileIcon,
  Settings as SettingsIcon,
  Logout as LogoutIcon,
  Language as LanguageIcon,
  LocationOn as LocationOnIcon,
  QueryBuilder as QueryBuilderIcon,
  AccountBalanceWallet as ExpenseItemsIcon,
  Security as SecurityIcon,
  Work as WorkIcon,
  People as PeopleIcon,
  Search as SearchIcon,
  PictureAsPdf as InvoiceIcon,
  AttachMoney as CurrencyIcon
} from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../contexts/AuthContext';
import { updateHtmlLang } from '../../utils/htmlLangUpdater';
import GlobalSearch from '../Common/GlobalSearch';
import NotificationBell from '../Common/NotificationBell';
import { MENU_PERMISSIONS } from '../../config/permissions';

const drawerWidth = 240;

const Layout = () => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [anchorEl, setAnchorEl] = useState(null);
  const [languageMenuAnchor, setLanguageMenuAnchor] = useState(null);
  const [globalSearchOpen, setGlobalSearchOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const { t, i18n } = useTranslation();
  const { user, logout } = useAuth();
  
  const isArabicLayout = (i18n.language || '').toLowerCase().startsWith('ar');
  const isDashboard = location.pathname === '/dashboard';

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const handleProfileMenuOpen = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleProfileMenuClose = () => {
    setAnchorEl(null);
  };

  const handleLanguageMenuOpen = (event) => {
    setLanguageMenuAnchor(event.currentTarget);
  };

  const handleLanguageMenuClose = () => {
    setLanguageMenuAnchor(null);
  };

  const handleLanguageChange = (language) => {
    i18n.changeLanguage(language);
    localStorage.setItem('language', language);
    updateHtmlLang(language); // 更新HTML语言
    handleLanguageMenuClose();
  };

  const handleLogout = () => {
    logout();
    handleProfileMenuClose();
  };

  const handleOpenGlobalSearch = () => {
    setGlobalSearchOpen(true);
  };

  const handleCloseGlobalSearch = () => {
    setGlobalSearchOpen(false);
  };

  // 监听键盘快捷键 Ctrl+K 或 Cmd+K 打开全局搜索
  React.useEffect(() => {
    const handleKeyDown = (event) => {
      if ((event.ctrlKey || event.metaKey) && event.key === 'k') {
        event.preventDefault();
        setGlobalSearchOpen(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // 使用 useMemo 确保菜单项在语言变化时重新计算
  const menuItems = useMemo(() => [
    { text: t('navigation.dashboard'), icon: <DashboardIcon />, path: '/dashboard', key: 'dashboard' },
    { text: t('navigation.travel'), icon: <TravelIcon />, path: '/travel', key: 'travel' },
    { text: t('navigation.expenses'), icon: <ExpenseIcon />, path: '/expenses', key: 'expenses' },
    { text: t('invoice.title'), icon: <InvoiceIcon />, path: '/invoices', key: 'invoices' },
    { text: t('navigation.approvals'), icon: <ApprovalIcon />, path: '/approvals', key: 'approvals' },
    { text: t('navigation.reports'), icon: <ReportIcon />, path: '/reports', key: 'reports' },
    { text: t('navigation.travelStandardQuery'), icon: <QueryBuilderIcon />, path: '/travel-standards/query', key: 'travelStandardQuery' },
    { text: t('navigation.travelStandardManagement'), icon: <SettingsIcon />, path: '/travel-standards', key: 'travelStandardManagement' },
    { text: t('navigation.expenseItemsManagement'), icon: <ExpenseItemsIcon />, path: '/expense-items', key: 'expenseItemsManagement' },
    { text: t('navigation.locationManagement'), icon: <LocationOnIcon />, path: '/location', key: 'locationManagement' },
    { text: t('navigation.i18nMonitor'), icon: <LanguageIcon />, path: '/i18n', key: 'i18nMonitor' },
  ], [t, i18n.language]);

  // Admin only menu items
  const adminMenuItems = useMemo(() => [
    { text: t('navigation.roleManagement'), icon: <SecurityIcon />, path: '/roles', key: 'roleManagement' },
    { text: t('navigation.positionManagement'), icon: <WorkIcon />, path: '/positions', key: 'positionManagement' },
    { text: t('navigation.userManagement'), icon: <PeopleIcon />, path: '/users', key: 'userManagement' },
    { text: t('navigation.currencyManagement'), icon: <CurrencyIcon />, path: '/currencies', key: 'currencyManagement' },
    { text: t('navigation.approvalWorkflows'), icon: <ApprovalIcon />, path: '/approval-workflows', key: 'approvalWorkflows' },
    { text: t('navigation.approvalStatistics'), icon: <ReportIcon />, path: '/approval-statistics', key: 'approvalStatistics' },
  ], [t, i18n.language]);

  // Settings menu item (always at the bottom)
  const settingsMenuItem = useMemo(() => [
    { text: t('navigation.settings'), icon: <SettingsIcon />, path: '/settings', key: 'settings' },
  ], [t, i18n.language]);

  // Check if user has permission for a menu item
  const hasPermission = (menuPath) => {
    // Admin role (case-insensitive) has all permissions
    if (user?.role && user.role.toUpperCase() === 'ADMIN') {
      return true;
    }
    
    // Check if user has the required permission
    const requiredPermission = MENU_PERMISSIONS[menuPath];
    if (!requiredPermission) {
      return true; // If no permission required, allow access
    }
    
    return user?.permissions?.includes(requiredPermission) || false;
  };

  // Filter menu items based on user permissions, with settings at the bottom
  const filteredMenuItems = useMemo(() => {
    const filtered = [
      ...menuItems.filter(item => hasPermission(item.path)),
      ...adminMenuItems.filter(item => hasPermission(item.path)),
      ...settingsMenuItem.filter(item => hasPermission(item.path))
    ];
    return filtered;
  }, [menuItems, adminMenuItems, settingsMenuItem, user?.permissions, user?.role]);

  // 根据当前路由获取对应的标题
  const getPageTitle = () => {
    // 先按路径长度排序，优先匹配更长的路径（更具体的路径）
    const sortedItems = [...filteredMenuItems].sort((a, b) => b.path.length - a.path.length);
    
    // 检查当前路径是否匹配某个菜单项
    const currentItem = sortedItems.find(item => {
      if (item.path === '/') {
        return location.pathname === '/';
      }
      // 精确匹配或路径以菜单项路径开头（需要确保是完整路径段）
      const pathMatch = location.pathname === item.path || 
        (item.path !== '/' && location.pathname.startsWith(item.path));
      
      if (pathMatch) {
        // 确保是完整的路径段（避免 /travel 匹配到 /travel-standards）
        const nextChar = location.pathname[item.path.length];
        return !nextChar || nextChar === '/';
      }
      
      return false;
    });

    if (currentItem) {
      return currentItem.text;
    }

    // 如果没有匹配的菜单项，返回默认标题
    return t('navigation.dashboard');
  };

  const drawer = (
    <div>
      <Toolbar>
        <Typography variant="h6" noWrap component="div" sx={{ fontWeight: 'bold' }}>
          {t('navigation.appTitle')}
        </Typography>
      </Toolbar>
      <Divider />
      <List>
        {(() => {
          // 先找到最匹配的菜单项（优先匹配更长的路径）
          const sortedItems = [...filteredMenuItems].sort((a, b) => b.path.length - a.path.length);
          const matchedItem = sortedItems.find(item => {
            if (item.path === '/') {
              return location.pathname === '/';
            }
            // 精确匹配或路径以菜单项路径开头且下一个字符是 '/' 或路径结束
            if (location.pathname === item.path) {
              return true;
            }
            if (item.path !== '/' && location.pathname.startsWith(item.path)) {
              // 确保是完整的路径段（避免 /travel 匹配到 /travel-standards）
              const nextChar = location.pathname[item.path.length];
              return !nextChar || nextChar === '/';
            }
            return false;
          });
          const selectedPath = matchedItem?.path;

          return filteredMenuItems.map((item) => {
            const isSelected = item.path === selectedPath;
            
            return (
              <ListItem key={item.key || item.path} disablePadding>
                <ListItemButton
                  onClick={() => navigate(item.path)}
                  selected={isSelected}
                  sx={{
                    '&.Mui-selected': {
                      backgroundColor: theme.palette.primary.light,
                      color: theme.palette.primary.contrastText,
                      '& .MuiListItemIcon-root': {
                        color: theme.palette.primary.contrastText,
                      },
                    },
                  }}
                >
                  <ListItemIcon>
                    {item.icon}
                  </ListItemIcon>
                  <ListItemText primary={item.text} />
                </ListItemButton>
              </ListItem>
            );
          });
        })()}
      </List>
    </div>
  );

  return (
    <Box sx={{ display: 'flex' }}>
      <AppBar
        position="fixed"
        sx={{
          width: { md: `calc(100% - ${drawerWidth}px)` },
          ...(isArabicLayout
            ? { mr: { md: `${drawerWidth}px` } }
            : { ml: { md: `${drawerWidth}px` } }
          ),
        }}
      >
        <Toolbar>
          <IconButton
            color="inherit"
            aria-label="open drawer"
            edge="start"
            onClick={handleDrawerToggle}
            sx={{ mr: 2, display: { md: 'none' } }}
          >
            <MenuIcon />
          </IconButton>
          
          <Typography variant="h6" noWrap component="div" sx={{ flexGrow: 1 }}>
            {getPageTitle()}
          </Typography>

          <IconButton
            color="inherit"
            onClick={handleOpenGlobalSearch}
            sx={{ mr: 1 }}
            title={t('search.globalSearch') + ' (Ctrl+K)'}
          >
            <SearchIcon />
          </IconButton>

          {/* 通知铃铛 */}
          <NotificationBell />

          <IconButton
            color="inherit"
            onClick={handleLanguageMenuOpen}
            sx={{ mr: 1 }}
          >
            <LanguageIcon />
          </IconButton>

          <IconButton
            size="large"
            edge="end"
            aria-label="account of current user"
            aria-controls="primary-search-account-menu"
            aria-haspopup="true"
            onClick={handleProfileMenuOpen}
            color="inherit"
          >
            <Avatar
              sx={{ width: 32, height: 32 }}
              src={user?.avatar}
              alt={user?.firstName}
            >
              {user?.firstName?.charAt(0)}
            </Avatar>
          </IconButton>
        </Toolbar>
      </AppBar>

      <Box
        component="nav"
        sx={{ 
          width: { md: drawerWidth }, 
          flexShrink: { md: 0 },
          order: isArabicLayout ? 1 : 0
        }}
        aria-label="mailbox folders"
      >
        <Drawer
          variant="temporary"
          anchor={isArabicLayout ? 'right' : 'left'}
          open={mobileOpen}
          onClose={handleDrawerToggle}
          ModalProps={{
            keepMounted: true,
          }}
          sx={{
            display: { xs: 'block', md: 'none' },
            '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth },
          }}
        >
          {drawer}
        </Drawer>
        <Drawer
          variant="permanent"
          anchor={isArabicLayout ? 'right' : 'left'}
          sx={{
            display: { xs: 'none', md: 'block' },
            '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth },
          }}
          open
        >
          {drawer}
        </Drawer>
      </Box>

      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 3,
          width: { md: `calc(100% - ${drawerWidth}px)` },
          display: 'flex',
          flexDirection: 'column',
          minHeight: '100vh',
          order: isArabicLayout ? 0 : 1,
        }}
      >
        <Toolbar />
        <Box
          sx={{
            width: '100%',
            maxWidth: isDashboard ? '100%' : '1536px',
            flex: 1,
            mx: isDashboard ? 0 : 'auto', // dashboard 全屏，其他页面居中
          }}
        >
          <Outlet />
        </Box>
      </Box>

      {/* Profile Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleProfileMenuClose}
        onClick={handleProfileMenuClose}
        PaperProps={{
          elevation: 0,
          sx: {
            overflow: 'visible',
            filter: 'drop-shadow(0px 2px 8px rgba(0,0,0,0.32))',
            mt: 1.5,
            '& .MuiAvatar-root': {
              width: 32,
              height: 32,
              ml: -0.5,
              mr: 1,
            },
            '&:before': {
              content: '""',
              display: 'block',
              position: 'absolute',
              top: 0,
              right: 14,
              width: 10,
              height: 10,
              bgcolor: 'background.paper',
              transform: 'translateY(-50%) rotate(45deg)',
              zIndex: 0,
            },
          },
        }}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
      >
        <MenuItem onClick={() => window.location.href = '/profile'}>
          <ProfileIcon sx={{ mr: 1 }} />
          {t('navigation.profile')}
        </MenuItem>
        <MenuItem onClick={() => window.location.href = '/settings'}>
          <SettingsIcon sx={{ mr: 1 }} />
          {t('navigation.settings')}
        </MenuItem>
        <Divider />
        <MenuItem onClick={handleLogout}>
          <LogoutIcon sx={{ mr: 1 }} />
          {t('navigation.logout')}
        </MenuItem>
      </Menu>

      {/* Language Menu */}
      <Menu
        anchorEl={languageMenuAnchor}
        open={Boolean(languageMenuAnchor)}
        onClose={handleLanguageMenuClose}
      >
        <MenuItem onClick={() => handleLanguageChange('en')}>
          {t('navigation.languages.en')}
        </MenuItem>
        <MenuItem onClick={() => handleLanguageChange('zh')}>
          {t('navigation.languages.zh')}
        </MenuItem>
        <MenuItem onClick={() => handleLanguageChange('ja')}>
          {t('navigation.languages.ja')}
        </MenuItem>
        <MenuItem onClick={() => handleLanguageChange('ko')}>
          {t('navigation.languages.ko')}
        </MenuItem>
        <MenuItem onClick={() => handleLanguageChange('vi')}>
          {t('navigation.languages.vi')}
        </MenuItem>
        <MenuItem onClick={() => handleLanguageChange('th')}>
          {t('navigation.languages.th')}
        </MenuItem>
      </Menu>

      {/* Global Search */}
      <GlobalSearch open={globalSearchOpen} onClose={handleCloseGlobalSearch} />
    </Box>
  );
};

export default Layout;
