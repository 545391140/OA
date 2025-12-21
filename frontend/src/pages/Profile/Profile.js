import React, { useState, useEffect } from 'react';
import {
  Container,
  Box,
  Typography,
  Paper,
  Grid,
  Avatar,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Divider,
  Card,
  CardContent,
  Chip,
  Alert,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions
} from '@mui/material';
import {
  Edit as EditIcon,
  Save as SaveIcon,
  Cancel as CancelIcon,
  Person as PersonIcon,
  Email as EmailIcon,
  Phone as PhoneIcon,
  Business as BusinessIcon,
  LocationOn as LocationIcon,
  Security as SecurityIcon,
  Language as LanguageIcon,
  AttachMoney as MoneyIcon,
  Schedule as ScheduleIcon
} from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../contexts/AuthContext';
import { useNotification } from '../../contexts/NotificationContext';
import apiClient from '../../utils/axiosConfig';
import { useCurrencies } from '../../hooks/useCurrencies';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import dayjs from 'dayjs';

const Profile = () => {
  const { t } = useTranslation();
  const { user: authUser, updatePreferences, changePassword } = useAuth();
  const { showNotification } = useNotification();
  const { currencyOptions } = useCurrencies();

  const [isEditing, setIsEditing] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingUser, setLoadingUser] = useState(true);
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
  const [user, setUser] = useState(authUser);

  // 从API获取最新的用户数据
  useEffect(() => {
    const fetchUserData = async () => {
      try {
        setLoadingUser(true);
        const response = await apiClient.get('/auth/me');
        if (response.data && response.data.success) {
          setUser(response.data.user);
          // 更新 profileData
          setProfileData({
            firstName: response.data.user.firstName || '',
            lastName: response.data.user.lastName || '',
            email: response.data.user.email || '',
            phone: response.data.user.phone || '',
            dateOfBirth: response.data.user.dateOfBirth ? dayjs(response.data.user.dateOfBirth) : null,
            department: response.data.user.department || '',
            position: response.data.user.position || '',
            jobLevel: response.data.user.jobLevel || '',
            preferences: response.data.user.preferences || {
              language: 'en',
              currency: 'USD',
              timezone: 'UTC'
            }
          });
        }
      } catch (error) {

        // 如果API失败，使用auth context中的用户数据
        if (authUser) {
          setUser(authUser);
          setProfileData({
            firstName: authUser.firstName || '',
            lastName: authUser.lastName || '',
            email: authUser.email || '',
            phone: authUser.phone || '',
            dateOfBirth: authUser.dateOfBirth ? dayjs(authUser.dateOfBirth) : null,
            department: authUser.department || '',
            position: authUser.position || '',
            jobLevel: authUser.jobLevel || '',
            preferences: authUser.preferences || {
              language: 'en',
              currency: 'USD',
              timezone: 'UTC'
            }
          });
        }
      } finally {
        setLoadingUser(false);
      }
    };

    fetchUserData();
  }, [authUser]);

  // 初始化 profileData，会在 useEffect 中从API更新
  const [profileData, setProfileData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    dateOfBirth: null,
    department: '',
    position: '',
    jobLevel: '',
    preferences: {
      language: 'en',
      currency: 'USD',
      timezone: 'UTC'
    }
  });

  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  const [errors, setErrors] = useState({});

  const languages = [
    { value: 'en', label: 'English' },
    { value: 'zh', label: '中文' },
    { value: 'ja', label: '日本語' },
    { value: 'ko', label: '한국어' },
    { value: 'ar', label: 'العربية' },
    { value: 'vi', label: 'Tiếng Việt' },
    { value: 'th', label: 'ไทย' }
  ];

  // 货币选项（使用国际化）
  const currencies = currencyOptions;

  const timezones = [
    { value: 'UTC', label: 'UTC' },
    { value: 'America/New_York', label: 'Eastern Time (ET)' },
    { value: 'America/Chicago', label: 'Central Time (CT)' },
    { value: 'America/Denver', label: 'Mountain Time (MT)' },
    { value: 'America/Los_Angeles', label: 'Pacific Time (PT)' },
    { value: 'Europe/London', label: 'London (GMT)' },
    { value: 'Europe/Paris', label: 'Paris (CET)' },
    { value: 'Asia/Tokyo', label: 'Tokyo (JST)' },
    { value: 'Asia/Shanghai', label: 'Shanghai (CST)' },
    { value: 'Asia/Seoul', label: 'Seoul (KST)' }
  ];

  const handleInputChange = (field, value) => {
    if (field.includes('.')) {
      const [parent, child] = field.split('.');
      setProfileData(prev => ({
        ...prev,
        [parent]: {
          ...prev[parent],
          [child]: value
        }
      }));
    } else {
      setProfileData(prev => ({
        ...prev,
        [field]: value
      }));
    }

    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: ''
      }));
    }
  };

  const handlePasswordChange = (field, value) => {
    setPasswordData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const validateProfile = () => {
    const newErrors = {};

    if (!profileData.firstName.trim()) {
      newErrors.firstName = 'First name is required';
    }

    if (!profileData.lastName.trim()) {
      newErrors.lastName = 'Last name is required';
    }

    if (!profileData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(profileData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validatePassword = () => {
    const newErrors = {};

    if (!passwordData.currentPassword) {
      newErrors.currentPassword = 'Current password is required';
    }

    if (!passwordData.newPassword) {
      newErrors.newPassword = 'New password is required';
    } else if (passwordData.newPassword.length < 6) {
      newErrors.newPassword = 'Password must be at least 6 characters';
    }

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSaveProfile = async () => {
    if (!validateProfile()) {
      return;
    }

    try {
      setLoading(true);
      
      // Update basic profile information (firstName, lastName, email, phone, department, jobLevel, dateOfBirth)
      const profileUpdateData = {
        firstName: profileData.firstName,
        lastName: profileData.lastName,
        email: profileData.email,
        phone: profileData.phone,
        department: profileData.department,
        jobLevel: profileData.jobLevel,
        dateOfBirth: profileData.dateOfBirth ? dayjs(profileData.dateOfBirth).format('YYYY-MM-DD') : null
      };

      const profileResponse = await apiClient.put('/auth/profile', profileUpdateData);
      
      if (!profileResponse.data.success) {
        showNotification(profileResponse.data.message || 'Failed to update profile', 'error');
        setLoading(false);
        return;
      }

      // Update preferences
      const preferencesResult = await updatePreferences(profileData.preferences);
      
      if (preferencesResult.success) {
        // Refresh user data from API
        const userResponse = await apiClient.get('/auth/me');
        if (userResponse.data && userResponse.data.success) {
          setUser(userResponse.data.user);
        }
        showNotification('Profile updated successfully', 'success');
        setIsEditing(false);
      } else {
        showNotification(preferencesResult.message, 'error');
      }
    } catch (error) {
      const errorMessage = error.response?.data?.message || error.message || 'Failed to update profile';
      showNotification(errorMessage, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async () => {
    if (!validatePassword()) {
      return;
    }

    try {
      setLoading(true);
      
      const result = await changePassword(passwordData.currentPassword, passwordData.newPassword);
      
      if (result.success) {
        showNotification('Password changed successfully', 'success');
        setPasswordDialogOpen(false);
        setPasswordData({
          currentPassword: '',
          newPassword: '',
          confirmPassword: ''
        });
      } else {
        showNotification(result.message, 'error');
      }
    } catch (error) {
      showNotification('Failed to change password', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setProfileData({
      firstName: user?.firstName || '',
      lastName: user?.lastName || '',
      email: user?.email || '',
      phone: user?.phone || '',
      dateOfBirth: user?.dateOfBirth ? dayjs(user.dateOfBirth) : null,
      department: user?.department || '',
      position: user?.position || '',
      jobLevel: user?.jobLevel || '',
      preferences: user?.preferences || {
        language: 'en',
        currency: 'USD',
        timezone: 'UTC'
      }
    });
    setErrors({});
    setIsEditing(false);
  };

  if (loadingUser) {
    return (
      <Container maxWidth="xl">
        <Box sx={{ py: 3, display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  return (
    <LocalizationProvider dateAdapter={AdapterDayjs}>
      <Container maxWidth="xl">
        <Box sx={{ py: 3 }}>
          <Typography variant="h4" gutterBottom>
            {t('navigation.profile')}
          </Typography>

        <Grid container spacing={3}>
          {/* Profile Overview */}
          <Grid item xs={12} md={4}>
            <Paper sx={{ p: 3, textAlign: 'center' }}>
              <Avatar
                sx={{
                  width: 120,
                  height: 120,
                  mx: 'auto',
                  mb: 2,
                  bgcolor: 'primary.main',
                  fontSize: '3rem'
                }}
              >
                {user?.firstName?.charAt(0)}{user?.lastName?.charAt(0)}
              </Avatar>
              
              <Typography variant="h5" gutterBottom>
                {user?.firstName} {user?.lastName}
              </Typography>
              
              <Typography variant="body1" color="text.secondary" gutterBottom>
                {user?.positionInfo?.name || user?.position || '-'}
              </Typography>
              
              <Typography variant="body2" color="text.secondary" gutterBottom>
                {user?.department || '-'}
              </Typography>

              {user?.jobLevel && (
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  职级: {user.jobLevel}
                </Typography>
              )}

              <Box sx={{ mt: 2, display: 'flex', gap: 1, justifyContent: 'center', flexWrap: 'wrap' }}>
                <Chip
                  label={user?.roleInfo?.name || user?.role || '-'}
                  color="primary"
                  variant="outlined"
                  size="small"
                />
                {user?.employeeId && (
                  <Chip
                    label={`工号: ${user.employeeId}`}
                    color="default"
                    variant="outlined"
                    size="small"
                  />
                )}
              </Box>

              <Box sx={{ mt: 3 }}>
                <Button
                  variant="contained"
                  startIcon={<EditIcon />}
                  onClick={() => setIsEditing(true)}
                  fullWidth
                >
                  Edit Profile
                </Button>
              </Box>

              <Box sx={{ mt: 2 }}>
                <Button
                  variant="outlined"
                  startIcon={<SecurityIcon />}
                  onClick={() => setPasswordDialogOpen(true)}
                  fullWidth
                >
                  Change Password
                </Button>
              </Box>
            </Paper>
          </Grid>

          {/* 个人资料详情 */}
          <Grid item xs={12} md={8}>
            <Paper sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Typography variant="h6">
                  {t('user.personalInformation')}
                </Typography>
                {isEditing && (
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <Button
                      variant="outlined"
                      startIcon={<CancelIcon />}
                      onClick={handleCancel}
                      disabled={loading}
                    >
                      Cancel
                    </Button>
                    <Button
                      variant="contained"
                      startIcon={<SaveIcon />}
                      onClick={handleSaveProfile}
                      disabled={loading}
                    >
                      {loading ? <CircularProgress size={20} /> : 'Save'}
                    </Button>
                  </Box>
                )}
              </Box>

              <Divider sx={{ mb: 3 }} />

              <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label={t('user.firstName')}
                    value={profileData.firstName}
                    onChange={(e) => handleInputChange('firstName', e.target.value)}
                    disabled={!isEditing}
                    error={!!errors.firstName}
                    helperText={errors.firstName}
                    InputProps={{
                      startAdornment: <PersonIcon color="action" sx={{ mr: 1 }} />
                    }}
                  />
                </Grid>

                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label={t('user.lastName')}
                    value={profileData.lastName}
                    onChange={(e) => handleInputChange('lastName', e.target.value)}
                    disabled={!isEditing}
                    error={!!errors.lastName}
                    helperText={errors.lastName}
                  />
                </Grid>

                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label={t('auth.email')}
                    value={profileData.email}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                    disabled={!isEditing}
                    error={!!errors.email}
                    helperText={errors.email}
                    InputProps={{
                      startAdornment: <EmailIcon color="action" sx={{ mr: 1 }} />
                    }}
                  />
                </Grid>

                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label={t('user.phone')}
                    value={profileData.phone}
                    onChange={(e) => handleInputChange('phone', e.target.value)}
                    disabled={!isEditing}
                    InputProps={{
                      startAdornment: <PhoneIcon color="action" sx={{ mr: 1 }} />
                    }}
                  />
                </Grid>

                <Grid item xs={12} md={6}>
                  <DatePicker
                    label={t('user.dateOfBirth') || '出生日期'}
                    value={profileData.dateOfBirth ? dayjs(profileData.dateOfBirth) : null}
                    onChange={(date) => handleInputChange('dateOfBirth', date)}
                    maxDate={dayjs()}
                    disabled={!isEditing}
                    slotProps={{ 
                      textField: { 
                        fullWidth: true,
                        InputProps: {
                          startAdornment: <ScheduleIcon color="action" sx={{ mr: 1 }} />
                        }
                      } 
                    }}
                  />
                </Grid>

                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label={t('user.department')}
                    value={profileData.department}
                    onChange={(e) => handleInputChange('department', e.target.value)}
                    disabled={!isEditing}
                    InputProps={{
                      startAdornment: <BusinessIcon color="action" sx={{ mr: 1 }} />
                    }}
                  />
                </Grid>

                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label={t('user.position')}
                    value={user?.positionInfo?.name || profileData.position || '-'}
                    onChange={(e) => handleInputChange('position', e.target.value)}
                    disabled={true}
                    helperText={user?.positionInfo?.name ? `岗位代码: ${user.position}` : '岗位信息'}
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="职级"
                    value={profileData.jobLevel || ''}
                    onChange={(e) => handleInputChange('jobLevel', e.target.value)}
                    disabled={!isEditing}
                  />
                </Grid>
              </Grid>

              <Divider sx={{ my: 3 }} />

              <Typography variant="h6" gutterBottom>
                Preferences
              </Typography>

              <Grid container spacing={3}>
                <Grid item xs={12} md={4}>
                  <FormControl fullWidth>
                    <InputLabel>Language</InputLabel>
                    <Select
                      value={profileData.preferences.language}
                      label={t('user.language')}
                      onChange={(e) => handleInputChange('preferences.language', e.target.value)}
                      disabled={!isEditing}
                      startAdornment={<LanguageIcon color="action" sx={{ mr: 1 }} />}
                    >
                      {languages.map((language) => (
                        <MenuItem key={language.value} value={language.value}>
                          {language.label}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>

                <Grid item xs={12} md={4}>
                  <FormControl fullWidth>
                    <InputLabel>Currency</InputLabel>
                    <Select
                      value={profileData.preferences.currency}
                      label={t('user.currency')}
                      onChange={(e) => handleInputChange('preferences.currency', e.target.value)}
                      disabled={!isEditing}
                      startAdornment={<MoneyIcon color="action" sx={{ mr: 1 }} />}
                    >
                      {currencies.map((currency) => (
                        <MenuItem key={currency.value} value={currency.value}>
                          {currency.label}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>

                <Grid item xs={12} md={4}>
                  <FormControl fullWidth>
                    <InputLabel>Timezone</InputLabel>
                    <Select
                      value={profileData.preferences.timezone}
                      label={t('user.timezone')}
                      onChange={(e) => handleInputChange('preferences.timezone', e.target.value)}
                      disabled={!isEditing}
                      startAdornment={<ScheduleIcon color="action" sx={{ mr: 1 }} />}
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
            </Paper>
          </Grid>
        </Grid>

        {/* 修改密码对话框 */}
        <Dialog
          open={passwordDialogOpen}
          onClose={() => setPasswordDialogOpen(false)}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle>{t('dialogs.changePassword')}</DialogTitle>
          <DialogContent>
            <TextField
              fullWidth
              label={t('auth.password')}
              type="password"
              value={passwordData.currentPassword}
              onChange={(e) => handlePasswordChange('currentPassword', e.target.value)}
              error={!!errors.currentPassword}
              helperText={errors.currentPassword}
              sx={{ mt: 2 }}
            />
            
            <TextField
              fullWidth
              label={t('auth.password')}
              type="password"
              value={passwordData.newPassword}
              onChange={(e) => handlePasswordChange('newPassword', e.target.value)}
              error={!!errors.newPassword}
              helperText={errors.newPassword}
              sx={{ mt: 2 }}
            />
            
            <TextField
              fullWidth
              label={t('auth.confirmPassword')}
              type="password"
              value={passwordData.confirmPassword}
              onChange={(e) => handlePasswordChange('confirmPassword', e.target.value)}
              error={!!errors.confirmPassword}
              helperText={errors.confirmPassword}
              sx={{ mt: 2 }}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setPasswordDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleChangePassword}
              variant="contained"
              disabled={loading}
            >
              {loading ? <CircularProgress size={20} /> : 'Change Password'}
            </Button>
          </DialogActions>
        </Dialog>
        </Box>
      </Container>
    </LocalizationProvider>
  );
};

export default Profile;

