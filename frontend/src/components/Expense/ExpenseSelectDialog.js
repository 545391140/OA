import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  ListItemIcon,
  Avatar,
  Typography,
  Box,
  Chip,
  Divider
} from '@mui/material';
import {
  Receipt as ReceiptIcon,
  AttachMoney as MoneyIcon,
  CalendarToday as CalendarTodayIcon,
  Category as CategoryIcon
} from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import dayjs from 'dayjs';

const ExpenseSelectDialog = ({ open, onClose, expenses, onSelect }) => {
  const { t } = useTranslation();

  const handleSelect = (expense) => {
    onSelect(expense);
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        {t('expense.selectExpense') || '选择要编辑的费用申请'}
      </DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          {t('expense.selectExpenseDescription') || '已自动生成以下费用申请，请选择要编辑的费用申请：'}
        </Typography>
        <List>
          {expenses.map((expense, index) => (
            <React.Fragment key={expense._id}>
              <ListItem disablePadding>
                <ListItemButton onClick={() => handleSelect(expense)}>
                  <ListItemIcon>
                    <Avatar sx={{ bgcolor: 'primary.main' }}>
                      <ReceiptIcon />
                    </Avatar>
                  </ListItemIcon>
                  <ListItemText
                    primary={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography variant="subtitle1" fontWeight={600}>
                          {expense.title || t('expense.noTitle') || '无标题'}
                        </Typography>
                        {expense.autoMatched && (
                          <Chip
                            label={t('expense.autoMatched') || '自动匹配'}
                            size="small"
                            color="success"
                            variant="outlined"
                          />
                        )}
                        <Chip
                          label={expense.status || 'draft'}
                          size="small"
                          color={expense.status === 'draft' ? 'default' : 'primary'}
                        />
                      </Box>
                    }
                    secondary={
                      <Box sx={{ mt: 0.5, display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <CategoryIcon fontSize="small" color="action" />
                            <Typography variant="caption" color="text.secondary">
                              {expense.category || '-'}
                            </Typography>
                          </Box>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <MoneyIcon fontSize="small" color="action" />
                            <Typography variant="caption" color="text.secondary" fontWeight={600}>
                              {expense.currency} {expense.amount?.toLocaleString() || 0}
                            </Typography>
                          </Box>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <CalendarTodayIcon fontSize="small" color="action" />
                            <Typography variant="caption" color="text.secondary">
                              {expense.date ? dayjs(expense.date).format('YYYY-MM-DD') : '-'}
                            </Typography>
                          </Box>
                        </Box>
                        {expense.description && (
                          <Typography variant="caption" color="text.secondary">
                            {expense.description}
                          </Typography>
                        )}
                        {expense.relatedInvoices && expense.relatedInvoices.length > 0 && (
                          <Typography variant="caption" color="text.secondary">
                            {t('expense.relatedInvoicesCount') || '关联发票'}：{expense.relatedInvoices.length} {t('common.sheet') || '张'}
                          </Typography>
                        )}
                      </Box>
                    }
                  />
                </ListItemButton>
              </ListItem>
              {index < expenses.length - 1 && <Divider />}
            </React.Fragment>
          ))}
        </List>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>
          {t('common.cancel') || '取消'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ExpenseSelectDialog;

