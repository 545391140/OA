import React, { useState } from 'react';
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
  CircularProgress
} from '@mui/material';
import {
  Save as SaveIcon,
  Security as SecurityIcon,
  Notifications as NotificationsIcon,
  Business as BusinessIcon,
  Settings as SettingsIcon
} from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../contexts/AuthContext';
import { useNotification } from '../../contexts/NotificationContext';

const Settings = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { showNotification } = useNotification();

  const [loading, setLoading] = useState(false);
  const [settings, setSettings] = useState({
    general: {
      companyName: t('settings.yourCompany'),
      timezone: 'UTC',
      currency: 'USD'
    },
    approval: {
      autoApprovalLimit: 100,
      requireReceipts: true,
      approvalLevels: 2
    },
    notifications: {
      emailNotifications: true,
      pushNotifications: true,
      approvalReminders: true
    },
    security: {
      passwordPolicy: 'strong',
      sessionTimeout: 30,
      twoFactorAuth: false
    }
  });

  const currencies = [
    { value: 'USD', label: 'USD - US Dollar' },
    { value: 'CNY', label: 'CNY - Chinese Yuan' },
    { value: 'JPY', label: 'JPY - Japanese Yen' },
    { value: 'EUR', label: 'EUR - Euro' }
  ];

  const timezones = [
    { value: 'UTC', label: 'UTC' },
    { value: 'America/New_York', label: 'Eastern Time (ET)' },
    { value: 'Asia/Tokyo', label: 'Tokyo (JST)' },
    { value: 'Asia/Shanghai', label: 'Shanghai (CST)' }
  ];

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
      console.log('Saving settings:', settings);
      await new Promise(resolve => setTimeout(resolve, 1000));
      showNotification('Settings saved successfully', 'success');
    } catch (error) {
      showNotification('Failed to save settings', 'error');
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

  return (
      <Container maxWidth="xl">
      <Box sx={{ py: 3 }}>
        <Typography variant="h4" gutterBottom>
          {t('navigation.settings')}
        </Typography>

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
                value={settings.general.companyName}
                onChange={(e) => handleSettingChange('general', 'companyName', e.target.value)}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Default Currency</InputLabel>
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

        {/* Approval Settings */}
        <SettingCard
          title={t('settings.approvalSettings')}
          icon={<BusinessIcon color="primary" />}
        >
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Auto-approval Limit"
                type="number"
                value={settings.approval.autoApprovalLimit}
                onChange={(e) => handleSettingChange('approval', 'autoApprovalLimit', parseFloat(e.target.value))}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label={t('settings.approvalLevels')}
                type="number"
                value={settings.approval.approvalLevels}
                onChange={(e) => handleSettingChange('approval', 'approvalLevels', parseInt(e.target.value))}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControlLabel
                control={
                  <Switch
                    checked={settings.approval.requireReceipts}
                    onChange={(e) => handleSettingChange('approval', 'requireReceipts', e.target.checked)}
                  />
                }
                label={t('settings.requireReceipts')}
              />
            </Grid>
          </Grid>
        </SettingCard>

        {/* Notification Settings */}
        <SettingCard
          title={t('settings.notificationSettings')}
          icon={<NotificationsIcon color="primary" />}
        >
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
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
            <Grid item xs={12} md={6}>
              <FormControlLabel
                control={
                  <Switch
                    checked={settings.notifications.pushNotifications}
                    onChange={(e) => handleSettingChange('notifications', 'pushNotifications', e.target.checked)}
                  />
                }
                label={t('settings.pushNotifications')}
              />
            </Grid>
            <Grid item xs={12} md={6}>
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
                label="Session Timeout (minutes)"
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
                label="Two-Factor Authentication"
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
            {loading ? <CircularProgress size={20} /> : 'Save Settings'}
          </Button>
        </Box>
      </Box>
    </Container>
  );
};

export default Settings;
