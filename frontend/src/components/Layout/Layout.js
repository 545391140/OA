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
  Badge,
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
  Notifications as NotificationIcon,
  Logout as LogoutIcon,
  Language as LanguageIcon,
  LocationOn as LocationOnIcon,
  QueryBuilder as QueryBuilderIcon,
  AccountBalanceWallet as ExpenseItemsIcon,
  Security as SecurityIcon,
  Work as WorkIcon,
  People as PeopleIcon
} from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../contexts/AuthContext';
import { useNotification } from '../../contexts/NotificationContext';
import { updateHtmlLang } from '../../utils/htmlLangUpdater';

const drawerWidth = 240;

const Layout = () => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [anchorEl, setAnchorEl] = useState(null);
  const [languageMenuAnchor, setLanguageMenuAnchor] = useState(null);
  const navigate = useNavigate();
  const location = useLocation();
  
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const { t, i18n } = useTranslation();
  const { user, logout } = useAuth();
  const { notifications } = useNotification();

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

  // 使用 useMemo 确保菜单项在语言变化时重新计算
  const menuItems = useMemo(() => [
    { text: t('navigation.dashboard'), icon: <DashboardIcon />, path: '/dashboard', key: 'dashboard' },
    { text: t('navigation.travel'), icon: <TravelIcon />, path: '/travel', key: 'travel' },
    { text: t('navigation.expenses'), icon: <ExpenseIcon />, path: '/expenses', key: 'expenses' },
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
  ], [t, i18n.language]);

  // Filter menu items based on user role
  const filteredMenuItems = useMemo(() => [
    ...menuItems,
    ...(user?.role === 'admin' ? adminMenuItems : [])
  ], [menuItems, adminMenuItems, user?.role]);

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
        {filteredMenuItems.map((item) => {
          const isSelected = location.pathname === item.path || 
            (item.path !== '/' && location.pathname.startsWith(item.path));
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
        })}
      </List>
    </div>
  );

  return (
    <Box sx={{ display: 'flex' }}>
      <AppBar
        position="fixed"
        sx={{
          width: { md: `calc(100% - ${drawerWidth}px)` },
          ml: { md: `${drawerWidth}px` },
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
            onClick={handleLanguageMenuOpen}
            sx={{ mr: 1 }}
          >
            <LanguageIcon />
          </IconButton>

          <IconButton color="inherit" sx={{ mr: 1 }}>
            <Badge badgeContent={notifications.length} color="error">
              <NotificationIcon />
            </Badge>
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
        sx={{ width: { md: drawerWidth }, flexShrink: { md: 0 } }}
        aria-label="mailbox folders"
      >
        <Drawer
          variant="temporary"
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
        }}
      >
        <Toolbar />
        <Outlet />
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
      </Menu>
    </Box>
  );
};

export default Layout;
