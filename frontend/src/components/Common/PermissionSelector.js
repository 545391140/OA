import React, { useState, useEffect } from 'react';
import {
  Box,
  FormControl,
  FormLabel,
  FormGroup,
  FormControlLabel,
  Checkbox,
  Paper,
  Typography,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Chip,
  TextField,
  InputAdornment
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  Search as SearchIcon,
  CheckBox as CheckBoxIcon,
  CheckBoxOutlineBlank as CheckBoxOutlineBlankIcon
} from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import apiClient from '../../utils/axiosConfig';

const PermissionSelector = ({ selectedPermissions = [], onChange, disabled = false }) => {
  const { t, i18n } = useTranslation();
  const [permissionGroups, setPermissionGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedGroups, setExpandedGroups] = useState({});

  useEffect(() => {
    fetchPermissions();
  }, []);

  const fetchPermissions = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get('/roles/permissions');
      if (response.data && response.data.success) {
        setPermissionGroups(response.data.data || []);
        // 默认展开所有组
        const expanded = {};
        response.data.data.forEach(group => {
          expanded[group.name] = true;
        });
        setExpandedGroups(expanded);
      }
    } catch (error) {

    } finally {
      setLoading(false);
    }
  };

  const handleTogglePermission = (permissionCode) => {
    if (disabled) return;
    
    const newPermissions = selectedPermissions.includes(permissionCode)
      ? selectedPermissions.filter(p => p !== permissionCode)
      : [...selectedPermissions, permissionCode];
    
    onChange(newPermissions);
  };

  const handleToggleGroup = (groupName) => {
    setExpandedGroups(prev => ({
      ...prev,
      [groupName]: !prev[groupName]
    }));
  };

  const handleSelectAllInGroup = (groupPermissions) => {
    if (disabled) return;
    
    const allSelected = groupPermissions.every(p => selectedPermissions.includes(p.code));
    const newPermissions = allSelected
      ? selectedPermissions.filter(p => !groupPermissions.some(gp => gp.code === p))
      : [...new Set([...selectedPermissions, ...groupPermissions.map(p => p.code)])];
    
    onChange(newPermissions);
  };

  const getGroupLabel = (group) => {
    // 根据当前语言返回对应的标签
    const lang = i18n.language || 'zh';
    if (lang === 'zh' || lang.startsWith('zh')) return group.label;
    if (lang === 'ja' || lang.startsWith('ja')) return group.labelJa || group.labelEn;
    if (lang === 'ko' || lang.startsWith('ko')) return group.labelKo || group.labelEn;
    return group.labelEn;
  };

  const getPermissionLabel = (permission) => {
    // 根据当前语言返回对应的标签
    const lang = i18n.language || 'zh';
    if (lang === 'zh' || lang.startsWith('zh')) return permission.label;
    if (lang === 'ja' || lang.startsWith('ja')) return permission.labelJa || permission.labelEn;
    if (lang === 'ko' || lang.startsWith('ko')) return permission.labelKo || permission.labelEn;
    return permission.labelEn;
  };

  const filteredGroups = permissionGroups.filter(group => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    const groupLabel = getGroupLabel(group);
    return (
      groupLabel.toLowerCase().includes(search) ||
      group.permissions.some(p => {
        const permLabel = getPermissionLabel(p);
        return permLabel.toLowerCase().includes(search) || p.code.toLowerCase().includes(search);
      })
    );
  });

  if (loading) {
    return <Box sx={{ p: 2 }}>{t('role.permissions.loading')}</Box>;
  }

  return (
    <Box>
      <TextField
        fullWidth
        size="small"
        placeholder={t('common.search')}
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <SearchIcon />
            </InputAdornment>
          ),
        }}
        sx={{ mb: 2 }}
      />
      
      <Box sx={{ maxHeight: 500, overflowY: 'auto' }}>
        {filteredGroups.map((group) => {
          const groupLabel = getGroupLabel(group);
          const groupSelectedCount = group.permissions.filter(p => 
            selectedPermissions.includes(p.code)
          ).length;
          const allSelected = group.permissions.length > 0 && 
            groupSelectedCount === group.permissions.length;
          const someSelected = groupSelectedCount > 0 && !allSelected;
          
          return (
            <Accordion
              key={group.name}
              expanded={expandedGroups[group.name] !== false}
              onChange={() => handleToggleGroup(group.name)}
              sx={{ mb: 1 }}
            >
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Box sx={{ display: 'flex', alignItems: 'center', width: '100%', mr: 2 }}>
                  <Checkbox
                    checked={allSelected}
                    indeterminate={someSelected}
                    onChange={(e) => {
                      e.stopPropagation();
                      handleSelectAllInGroup(group.permissions);
                    }}
                    disabled={disabled}
                    sx={{ mr: 1 }}
                  />
                  <Typography variant="subtitle1" sx={{ flexGrow: 1 }}>
                    {groupLabel}
                  </Typography>
                  <Chip
                    label={`${groupSelectedCount}/${group.permissions.length}`}
                    size="small"
                    color={allSelected ? 'primary' : someSelected ? 'warning' : 'default'}
                  />
                </Box>
              </AccordionSummary>
              <AccordionDetails>
                <FormGroup>
                  {group.permissions.map((permission) => {
                    const permLabel = getPermissionLabel(permission);
                    const isSelected = selectedPermissions.includes(permission.code);
                    
                    return (
                      <FormControlLabel
                        key={permission.code}
                        control={
                          <Checkbox
                            checked={isSelected}
                            onChange={() => handleTogglePermission(permission.code)}
                            disabled={disabled}
                            icon={<CheckBoxOutlineBlankIcon />}
                            checkedIcon={<CheckBoxIcon />}
                          />
                        }
                        label={
                          <Box>
                            <Typography variant="body2">{permLabel}</Typography>
                            <Typography variant="caption" color="text.secondary">
                              {permission.code}
                            </Typography>
                          </Box>
                        }
                      />
                    );
                  })}
                </FormGroup>
              </AccordionDetails>
            </Accordion>
          );
        })}
      </Box>
      
      <Paper sx={{ p: 2, mt: 2, bgcolor: 'background.default' }}>
        <Typography variant="body2" color="text.secondary">
          {t('role.permissions.selected')}: {selectedPermissions.length}
        </Typography>
      </Paper>
    </Box>
  );
};

export default PermissionSelector;

