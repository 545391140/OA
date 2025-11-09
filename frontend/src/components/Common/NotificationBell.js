import React, { useState, useEffect } from 'react';
import {
  IconButton,
  Badge,
  Menu,
  MenuItem,
  ListItemText,
  ListItemIcon,
  Typography,
  Box,
  Divider,
  Button,
  Chip,
  Avatar,
  List,
  ListItem,
  CircularProgress
} from '@mui/material';
import {
  Notifications as NotificationsIcon,
  CheckCircle as ApprovedIcon,
  Cancel as RejectedIcon,
  Assignment as RequestIcon,
  MarkEmailRead as MarkReadIcon,
  Delete as DeleteIcon
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import apiClient from '../../utils/axiosConfig';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import 'dayjs/locale/zh-cn';

dayjs.extend(relativeTime);

const NotificationBell = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [anchorEl, setAnchorEl] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  // 设置dayjs语言
  useEffect(() => {
    dayjs.locale(i18n.language === 'zh' ? 'zh-cn' : i18n.language);
  }, [i18n.language]);

  // 获取未读数量
  const fetchUnreadCount = async () => {
    try {
      const response = await apiClient.get('/notifications/unread-count');
      if (response.data && response.data.success) {
        setUnreadCount(response.data.count);
      }
    } catch (error) {
      console.error('Failed to fetch unread count:', error);
    }
  };

  // 获取通知列表
  const fetchNotifications = async (pageNum = 1) => {
    try {
      setLoading(true);
      const response = await apiClient.get('/notifications', {
        params: { page: pageNum, limit: 10 }
      });
      
      if (response.data && response.data.success) {
        const newNotifications = response.data.notifications || [];
        if (pageNum === 1) {
          setNotifications(newNotifications);
        } else {
          setNotifications(prev => [...prev, ...newNotifications]);
        }
        setHasMore(response.data.page < response.data.pages);
      }
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  // 初始化和定时刷新
  useEffect(() => {
    fetchUnreadCount();
    
    // 每30秒刷新一次未读数量
    const interval = setInterval(fetchUnreadCount, 30000);
    
    return () => clearInterval(interval);
  }, []);

  const handleOpen = (event) => {
    setAnchorEl(event.currentTarget);
    setPage(1);
    fetchNotifications(1);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleLoadMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    fetchNotifications(nextPage);
  };

  // 标记为已读
  const handleMarkAsRead = async (notificationId, event) => {
    event.stopPropagation();
    try {
      await apiClient.put(`/notifications/${notificationId}/read`);
      setNotifications(prev =>
        prev.map(n => n._id === notificationId ? { ...n, isRead: true } : n)
      );
      fetchUnreadCount();
    } catch (error) {
      console.error('Failed to mark as read:', error);
    }
  };

  // 全部标记为已读
  const handleMarkAllAsRead = async () => {
    try {
      await apiClient.put('/notifications/read-all');
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch (error) {
      console.error('Failed to mark all as read:', error);
    }
  };

  // 删除通知
  const handleDelete = async (notificationId, event) => {
    event.stopPropagation();
    try {
      await apiClient.delete(`/notifications/${notificationId}`);
      setNotifications(prev => prev.filter(n => n._id !== notificationId));
      fetchUnreadCount();
    } catch (error) {
      console.error('Failed to delete notification:', error);
    }
  };

  // 点击通知
  const handleNotificationClick = async (notification) => {
    // 标记为已读
    if (!notification.isRead) {
      await handleMarkAsRead(notification._id, { stopPropagation: () => {} });
    }
    
    // 跳转到相关页面
    if (notification.relatedData && notification.relatedData.url) {
      navigate(notification.relatedData.url);
      handleClose();
    }
  };

  // 获取通知图标
  const getNotificationIcon = (type) => {
    switch (type) {
      case 'approval_request':
        return <RequestIcon color="primary" />;
      case 'approval_approved':
        return <ApprovedIcon color="success" />;
      case 'approval_rejected':
        return <RejectedIcon color="error" />;
      default:
        return <NotificationsIcon />;
    }
  };

  // 获取优先级颜色
  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'urgent':
        return 'error';
      case 'high':
        return 'warning';
      case 'normal':
        return 'info';
      case 'low':
        return 'default';
      default:
        return 'default';
    }
  };

  return (
    <>
      <IconButton
        color="inherit"
        onClick={handleOpen}
        sx={{ ml: 1 }}
      >
        <Badge badgeContent={unreadCount} color="error">
          <NotificationsIcon />
        </Badge>
      </IconButton>

      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleClose}
        PaperProps={{
          sx: {
            width: 400,
            maxHeight: 600,
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column'
          }
        }}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
      >
        {/* 头部 */}
        <Box sx={{ p: 2, pb: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6" fontWeight={600}>
            {t('notifications.title') || '通知'}
          </Typography>
          {unreadCount > 0 && (
            <Button
              size="small"
              startIcon={<MarkReadIcon />}
              onClick={handleMarkAllAsRead}
            >
              {t('notifications.markAllRead') || '全部已读'}
            </Button>
          )}
        </Box>
        
        <Divider />

        {/* 通知列表 */}
        <List sx={{ flex: 1, overflow: 'auto', p: 0 }}>
          {loading && notifications.length === 0 ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
              <CircularProgress size={30} />
            </Box>
          ) : notifications.length === 0 ? (
            <Box sx={{ textAlign: 'center', p: 3 }}>
              <Typography variant="body2" color="text.secondary">
                {t('notifications.empty') || '暂无通知'}
              </Typography>
            </Box>
          ) : (
            notifications.map((notification) => (
              <ListItem
                key={notification._id}
                button
                onClick={() => handleNotificationClick(notification)}
                sx={{
                  bgcolor: notification.isRead ? 'transparent' : 'action.hover',
                  borderLeft: notification.isRead ? 'none' : '3px solid',
                  borderColor: 'primary.main',
                  '&:hover': {
                    bgcolor: 'action.selected'
                  }
                }}
              >
                <ListItemIcon>
                  <Avatar sx={{ bgcolor: notification.isRead ? 'grey.300' : 'primary.light' }}>
                    {getNotificationIcon(notification.type)}
                  </Avatar>
                </ListItemIcon>
                <ListItemText
                  primary={
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 0.5 }}>
                      <Typography
                        variant="subtitle2"
                        fontWeight={notification.isRead ? 400 : 600}
                        sx={{ flex: 1, pr: 1 }}
                      >
                        {notification.title}
                      </Typography>
                      {notification.priority !== 'normal' && (
                        <Chip
                          label={notification.priority}
                          size="small"
                          color={getPriorityColor(notification.priority)}
                          sx={{ height: 20, fontSize: '0.7rem' }}
                        />
                      )}
                    </Box>
                  }
                  secondary={
                    <Box>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                        {notification.content}
                      </Typography>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Typography variant="caption" color="text.disabled">
                          {dayjs(notification.createdAt).fromNow()}
                        </Typography>
                        <Box>
                          {!notification.isRead && (
                            <IconButton
                              size="small"
                              onClick={(e) => handleMarkAsRead(notification._id, e)}
                              sx={{ mr: 0.5 }}
                            >
                              <MarkReadIcon fontSize="small" />
                            </IconButton>
                          )}
                          <IconButton
                            size="small"
                            onClick={(e) => handleDelete(notification._id, e)}
                          >
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </Box>
                      </Box>
                    </Box>
                  }
                />
              </ListItem>
            ))
          )}
        </List>

        {/* 加载更多 */}
        {hasMore && notifications.length > 0 && (
          <>
            <Divider />
            <Box sx={{ p: 1, textAlign: 'center' }}>
              <Button
                size="small"
                onClick={handleLoadMore}
                disabled={loading}
              >
                {loading ? <CircularProgress size={20} /> : (t('notifications.loadMore') || '加载更多')}
              </Button>
            </Box>
          </>
        )}
      </Menu>
    </>
  );
};

export default NotificationBell;

