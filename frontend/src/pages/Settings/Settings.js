import React, { useState, useEffect, useMemo } from 'react';
import {
  Container,
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Switch,
  FormControlLabel,
  Divider,
  CircularProgress,
  Alert
} from '@mui/material';
import {
  Save as SaveIcon,
  Security as SecurityIcon,
  Notifications as NotificationsIcon,
  Settings as SettingsIcon
} from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../contexts/AuthContext';
import { useNotification } from '../../contexts/NotificationContext';
import apiClient from '../../utils/axiosConfig';
import pushNotificationService from '../../services/pushNotificationService';

const Settings = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { showNotification } = useNotification();

  const [loading, setLoading] = useState(false);
  const [loadingSettings, setLoadingSettings] = useState(true);
  const [error, setError] = useState(null);
  const [pushSubscribed, setPushSubscribed] = useState(false);
  const [pushLoading, setPushLoading] = useState(false);
  const [settings, setSettings] = useState({
    general: {
      companyName: '',
      timezone: 'UTC',
      currency: 'USD'
    },
    notifications: {
      emailNotifications: true,
      pushNotifications: true,
      approvalReminders: true,
      preferences: {
        approvalRequest: { email: true, push: true, inApp: true },
        approvalApproved: { email: true, push: true, inApp: true },
        approvalRejected: { email: true, push: true, inApp: true },
        travelSubmitted: { email: false, push: true, inApp: true },
        expenseSubmitted: { email: false, push: true, inApp: true },
        system: { email: true, push: true, inApp: true },
        reminder: { email: true, push: true, inApp: true }
      }
    },
    security: {
      passwordPolicy: 'strong',
      sessionTimeout: 30,
      twoFactorAuth: false
    }
  });

  // Load settings on component mount
  useEffect(() => {
    loadSettings();
    checkPushSubscription();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const checkPushSubscription = async () => {
    try {
      const isSubscribed = await pushNotificationService.isSubscribed();
      setPushSubscribed(isSubscribed);
    } catch (error) {
      console.error('Failed to check push subscription:', error);
    }
  };

  const handlePushSubscribe = async () => {
    try {
      setPushLoading(true);
      await pushNotificationService.subscribe();
      setPushSubscribed(true);
      showNotification(t('settings.pushNotificationSubscribed') || 'Push notifications enabled', 'success');
    } catch (error) {
      console.error('Failed to subscribe to push notifications:', error);
      showNotification(t('settings.pushNotificationSubscribeFailed') || 'Failed to enable push notifications', 'error');
    } finally {
      setPushLoading(false);
    }
  };

  const handlePushUnsubscribe = async () => {
    try {
      setPushLoading(true);
      await pushNotificationService.unsubscribe();
      setPushSubscribed(false);
      showNotification(t('settings.pushNotificationUnsubscribed') || 'Push notifications disabled', 'success');
    } catch (error) {
      console.error('Failed to unsubscribe from push notifications:', error);
      showNotification(t('settings.pushNotificationUnsubscribeFailed') || 'Failed to disable push notifications', 'error');
    } finally {
      setPushLoading(false);
    }
  };

  const loadSettings = async () => {
    try {
      setLoadingSettings(true);
      setError(null);
      const response = await apiClient.get('/settings');
      if (response.data.success) {
        setSettings(response.data.data);
      }
    } catch (error) {
      console.error('Load settings error:', error);
      setError(error.response?.data?.message || t('settings.loadFailed') || 'Failed to load settings');
      // Set default values if loading fails
      setSettings({
        general: {
          companyName: t('settings.yourCompany'),
          timezone: 'UTC',
          currency: 'USD'
        },
        notifications: {
          emailNotifications: true,
          pushNotifications: true,
          approvalReminders: true,
          preferences: {
            approvalRequest: { email: true, push: true, inApp: true },
            approvalApproved: { email: true, push: true, inApp: true },
            approvalRejected: { email: true, push: true, inApp: true },
            travelSubmitted: { email: false, push: true, inApp: true },
            expenseSubmitted: { email: false, push: true, inApp: true },
            system: { email: true, push: true, inApp: true },
            reminder: { email: true, push: true, inApp: true }
          }
        },
        security: {
          passwordPolicy: 'strong',
          sessionTimeout: 30,
          twoFactorAuth: false
        }
      });
    } finally {
      setLoadingSettings(false);
    }
  };

  const currencies = useMemo(() => [
    { value: 'USD', label: 'USD - US Dollar' },
    { value: 'CNY', label: 'CNY - Chinese Yuan' },
    { value: 'JPY', label: 'JPY - Japanese Yen' },
    { value: 'EUR', label: 'EUR - Euro' }
  ], []);

  const timezones = useMemo(() => {
    const timezoneLabels = {
      'UTC': 'UTC',
      'America/New_York': t('settings.timezoneEastern') || 'Eastern Time (ET)',
      'Asia/Tokyo': t('settings.timezoneTokyo') || 'Tokyo (JST)',
      'Asia/Shanghai': t('settings.timezoneShanghai') || 'Shanghai (CST)'
    };
    return [
      { value: 'UTC', label: timezoneLabels['UTC'] },
      { value: 'America/New_York', label: timezoneLabels['America/New_York'] },
      { value: 'Asia/Tokyo', label: timezoneLabels['Asia/Tokyo'] },
      { value: 'Asia/Shanghai', label: timezoneLabels['Asia/Shanghai'] }
    ];
  }, [t]);

  const handleSettingChange = (section, field, value) => {
    setSettings(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [field]: value
      }
    }));
  };

  const handleSaveSettings = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // 准备保存的数据：如果不是管理员，不包含companyName（公司名称只能由管理员修改）
      const saveData = { ...settings };
      if (user?.role !== 'admin') {
        // 普通用户不能修改公司名称，删除该字段
        delete saveData.general.companyName;
      }
      
      const response = await apiClient.put('/settings', saveData);
      if (response.data.success) {
        setSettings(response.data.data);
        showNotification(t('settings.savedSuccessfully') || 'Settings saved successfully', 'success');
      }
    } catch (error) {
      console.error('Save settings error:', error);
      const errorMessage = error.response?.data?.message || t('settings.saveFailed') || 'Failed to save settings';
      setError(errorMessage);
      showNotification(errorMessage, 'error');
    } finally {
      setLoading(false);
    }
  };

  const SettingCard = ({ title, icon, children }) => (
    <Card sx={{ mb: 3 }}>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
          {icon}
          <Typography variant="h6">{title}</Typography>
        </Box>
        <Divider sx={{ mb: 2 }} />
        {children}
      </CardContent>
    </Card>
  );

  if (loadingSettings) {
    return (
      <Container maxWidth="xl">
        <Box sx={{ py: 3, display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  return (
      <Container maxWidth="xl">
      <Box sx={{ py: 3 }}>
        <Typography variant="h4" gutterBottom>
          {t('navigation.settings')}
        </Typography>

        {error && (
          <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {/* General Settings */}
        <SettingCard
          title={t('settings.generalSettings')}
          icon={<SettingsIcon color="primary" />}
        >
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label={t('settings.companyName')}
                value={settings.general.companyName || ''}
                onChange={(e) => handleSettingChange('general', 'companyName', e.target.value)}
                disabled={user?.role !== 'admin'}
                helperText={user?.role !== 'admin' ? t('settings.companyNameReadOnly') || 'Only administrators can modify company name' : ''}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>{t('settings.defaultCurrency')}</InputLabel>
                <Select
                  value={settings.general.currency}
                  label={t('settings.defaultCurrency')}
                  onChange={(e) => handleSettingChange('general', 'currency', e.target.value)}
                >
                  {currencies.map((currency) => (
                    <MenuItem key={currency.value} value={currency.value}>
                      {currency.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>{t('settings.timezone')}</InputLabel>
                <Select
                  value={settings.general.timezone}
                  label={t('settings.timezone')}
                  onChange={(e) => handleSettingChange('general', 'timezone', e.target.value)}
                >
                  {timezones.map((timezone) => (
                    <MenuItem key={timezone.value} value={timezone.value}>
                      {timezone.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </SettingCard>

        {/* Notification Settings */}
        <SettingCard
          title={t('settings.notificationSettings')}
          icon={<NotificationsIcon color="primary" />}
        >
          <Grid container spacing={3}>
            {/* 全局通知开关 */}
            <Grid item xs={12}>
              <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 'bold' }}>
                {t('settings.globalNotificationSettings') || 'Global Notification Settings'}
              </Typography>
            </Grid>
            <Grid item xs={12} md={4}>
              <FormControlLabel
                control={
                  <Switch
                    checked={settings.notifications.emailNotifications}
                    onChange={(e) => handleSettingChange('notifications', 'emailNotifications', e.target.checked)}
                  />
                }
                label={t('settings.emailNotifications')}
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={settings.notifications.pushNotifications}
                      onChange={(e) => handleSettingChange('notifications', 'pushNotifications', e.target.checked)}
                    />
                  }
                  label={t('settings.pushNotifications')}
                />
                {settings.notifications.pushNotifications && (
                  <Button
                    size="small"
                    variant={pushSubscribed ? "outlined" : "contained"}
                    onClick={pushSubscribed ? handlePushUnsubscribe : handlePushSubscribe}
                    disabled={pushLoading}
                    sx={{ ml: 1 }}
                  >
                    {pushLoading ? <CircularProgress size={16} /> : (pushSubscribed ? (t('settings.disablePush') || 'Disable') : (t('settings.enablePush') || 'Enable'))}
                  </Button>
                )}
              </Box>
            </Grid>
            <Grid item xs={12} md={4}>
              <FormControlLabel
                control={
                  <Switch
                    checked={settings.notifications.approvalReminders}
                    onChange={(e) => handleSettingChange('notifications', 'approvalReminders', e.target.checked)}
                  />
                }
                label={t('settings.approvalReminders')}
              />
            </Grid>

            {/* 详细通知偏好 */}
            <Grid item xs={12}>
              <Divider sx={{ my: 2 }} />
              <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 'bold' }}>
                {t('settings.detailedNotificationPreferences') || 'Detailed Notification Preferences'}
              </Typography>
            </Grid>

            {/* 审批请求通知 */}
            <Grid item xs={12}>
              <Typography variant="body2" sx={{ mb: 1, fontWeight: 'medium' }}>
                {t('settings.approvalRequestNotifications') || 'Approval Request Notifications'}
              </Typography>
              <Box sx={{ pl: 2 }}>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={4}>
                    <FormControlLabel
                      control={
                        <Switch
                          size="small"
                          checked={settings.notifications.preferences?.approvalRequest?.email !== false}
                          onChange={(e) => {
                            const prefs = settings.notifications.preferences || {};
                            handleSettingChange('notifications', 'preferences', {
                              ...prefs,
                              approvalRequest: {
                                ...prefs.approvalRequest,
                                email: e.target.checked
                              }
                            });
                          }}
                        />
                      }
                      label={t('settings.email') || 'Email'}
                    />
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <FormControlLabel
                      control={
                        <Switch
                          size="small"
                          checked={settings.notifications.preferences?.approvalRequest?.push !== false}
                          onChange={(e) => {
                            const prefs = settings.notifications.preferences || {};
                            handleSettingChange('notifications', 'preferences', {
                              ...prefs,
                              approvalRequest: {
                                ...prefs.approvalRequest,
                                push: e.target.checked
                              }
                            });
                          }}
                        />
                      }
                      label={t('settings.push') || 'Push'}
                    />
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <FormControlLabel
                      control={
                        <Switch
                          size="small"
                          checked={settings.notifications.preferences?.approvalRequest?.inApp !== false}
                          onChange={(e) => {
                            const prefs = settings.notifications.preferences || {};
                            handleSettingChange('notifications', 'preferences', {
                              ...prefs,
                              approvalRequest: {
                                ...prefs.approvalRequest,
                                inApp: e.target.checked
                              }
                            });
                          }}
                        />
                      }
                      label={t('settings.inApp') || 'In-App'}
                    />
                  </Grid>
                </Grid>
              </Box>
            </Grid>

            {/* 审批通过通知 */}
            <Grid item xs={12}>
              <Typography variant="body2" sx={{ mb: 1, fontWeight: 'medium' }}>
                {t('settings.approvalApprovedNotifications') || 'Approval Approved Notifications'}
              </Typography>
              <Box sx={{ pl: 2 }}>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={4}>
                    <FormControlLabel
                      control={
                        <Switch
                          size="small"
                          checked={settings.notifications.preferences?.approvalApproved?.email !== false}
                          onChange={(e) => {
                            const prefs = settings.notifications.preferences || {};
                            handleSettingChange('notifications', 'preferences', {
                              ...prefs,
                              approvalApproved: {
                                ...prefs.approvalApproved,
                                email: e.target.checked
                              }
                            });
                          }}
                        />
                      }
                      label={t('settings.email') || 'Email'}
                    />
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <FormControlLabel
                      control={
                        <Switch
                          size="small"
                          checked={settings.notifications.preferences?.approvalApproved?.push !== false}
                          onChange={(e) => {
                            const prefs = settings.notifications.preferences || {};
                            handleSettingChange('notifications', 'preferences', {
                              ...prefs,
                              approvalApproved: {
                                ...prefs.approvalApproved,
                                push: e.target.checked
                              }
                            });
                          }}
                        />
                      }
                      label={t('settings.push') || 'Push'}
                    />
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <FormControlLabel
                      control={
                        <Switch
                          size="small"
                          checked={settings.notifications.preferences?.approvalApproved?.inApp !== false}
                          onChange={(e) => {
                            const prefs = settings.notifications.preferences || {};
                            handleSettingChange('notifications', 'preferences', {
                              ...prefs,
                              approvalApproved: {
                                ...prefs.approvalApproved,
                                inApp: e.target.checked
                              }
                            });
                          }}
                        />
                      }
                      label={t('settings.inApp') || 'In-App'}
                    />
                  </Grid>
                </Grid>
              </Box>
            </Grid>

            {/* 审批拒绝通知 */}
            <Grid item xs={12}>
              <Typography variant="body2" sx={{ mb: 1, fontWeight: 'medium' }}>
                {t('settings.approvalRejectedNotifications') || 'Approval Rejected Notifications'}
              </Typography>
              <Box sx={{ pl: 2 }}>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={4}>
                    <FormControlLabel
                      control={
                        <Switch
                          size="small"
                          checked={settings.notifications.preferences?.approvalRejected?.email !== false}
                          onChange={(e) => {
                            const prefs = settings.notifications.preferences || {};
                            handleSettingChange('notifications', 'preferences', {
                              ...prefs,
                              approvalRejected: {
                                ...prefs.approvalRejected,
                                email: e.target.checked
                              }
                            });
                          }}
                        />
                      }
                      label={t('settings.email') || 'Email'}
                    />
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <FormControlLabel
                      control={
                        <Switch
                          size="small"
                          checked={settings.notifications.preferences?.approvalRejected?.push !== false}
                          onChange={(e) => {
                            const prefs = settings.notifications.preferences || {};
                            handleSettingChange('notifications', 'preferences', {
                              ...prefs,
                              approvalRejected: {
                                ...prefs.approvalRejected,
                                push: e.target.checked
                              }
                            });
                          }}
                        />
                      }
                      label={t('settings.push') || 'Push'}
                    />
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <FormControlLabel
                      control={
                        <Switch
                          size="small"
                          checked={settings.notifications.preferences?.approvalRejected?.inApp !== false}
                          onChange={(e) => {
                            const prefs = settings.notifications.preferences || {};
                            handleSettingChange('notifications', 'preferences', {
                              ...prefs,
                              approvalRejected: {
                                ...prefs.approvalRejected,
                                inApp: e.target.checked
                              }
                            });
                          }}
                        />
                      }
                      label={t('settings.inApp') || 'In-App'}
                    />
                  </Grid>
                </Grid>
              </Box>
            </Grid>
          </Grid>
        </SettingCard>

        {/* Security Settings */}
        <SettingCard
          title={t('settings.securitySettings')}
          icon={<SecurityIcon color="primary" />}
        >
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label={t('settings.sessionTimeout')}
                type="number"
                value={settings.security.sessionTimeout}
                onChange={(e) => handleSettingChange('security', 'sessionTimeout', parseInt(e.target.value))}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControlLabel
                control={
                  <Switch
                    checked={settings.security.twoFactorAuth}
                    onChange={(e) => handleSettingChange('security', 'twoFactorAuth', e.target.checked)}
                  />
                }
                label={t('settings.twoFactorAuth')}
              />
            </Grid>
          </Grid>
        </SettingCard>

        {/* Save Button */}
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 3 }}>
          <Button
            variant="contained"
            startIcon={<SaveIcon />}
            onClick={handleSaveSettings}
            disabled={loading}
            size="large"
          >
            {loading ? <CircularProgress size={20} /> : t('settings.saveSettings')}
          </Button>
        </Box>
      </Box>
    </Container>
  );
};

export default Settings;
