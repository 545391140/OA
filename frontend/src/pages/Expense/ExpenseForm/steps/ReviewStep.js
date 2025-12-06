/**
 * ReviewStep - 审核预览步骤
 * 显示所有表单数据的预览
 */

import React from 'react';
import {
  Grid,
  Card,
  CardContent,
  Typography,
  Divider,
  Chip,
  Box,
  Table,
  TableBody,
  TableRow,
  TableCell,
  List,
  ListItem,
  ListItemText
} from '@mui/material';
import dayjs from 'dayjs';

const ReviewStep = ({
  formData,
  selectedTravel,
  relatedInvoices,
  getEffectiveAmount,
  t
}) => {
  const effectiveAmount = getEffectiveAmount();

  return (
    <Grid container spacing={3}>
      {/* 基本信息 */}
      <Grid item xs={12}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              {t('expense.basicInfo') || '基本信息'}
            </Typography>
            <Divider sx={{ mb: 2 }} />
            <Table size="small">
              <TableBody>
                <TableRow>
                  <TableCell width="30%"><strong>{t('expense.title')}</strong></TableCell>
                  <TableCell>{formData.title}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell><strong>{t('expense.category')}</strong></TableCell>
                  <TableCell>{formData.category}</TableCell>
                </TableRow>
                {formData.subcategory && (
                  <TableRow>
                    <TableCell><strong>{t('expense.subcategory')}</strong></TableCell>
                    <TableCell>{formData.subcategory}</TableCell>
                  </TableRow>
                )}
                <TableRow>
                  <TableCell><strong>{t('expense.amount')}</strong></TableCell>
                  <TableCell>
                    {effectiveAmount} {formData.currency}
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell><strong>{t('expense.date')}</strong></TableCell>
                  <TableCell>
                    {formData.date ? dayjs(formData.date).format('YYYY-MM-DD') : ''}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </Grid>

      {/* 供应商信息 */}
      {(formData.vendor?.name || formData.vendor?.taxId) && (
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                {t('expense.vendorInfo') || '供应商信息'}
              </Typography>
              <Divider sx={{ mb: 2 }} />
              <Table size="small">
                <TableBody>
                  {formData.vendor?.name && (
                    <TableRow>
                      <TableCell width="30%"><strong>{t('expense.vendorName')}</strong></TableCell>
                      <TableCell>{formData.vendor.name}</TableCell>
                    </TableRow>
                  )}
                  {formData.vendor?.taxId && (
                    <TableRow>
                      <TableCell><strong>{t('expense.vendorTaxId')}</strong></TableCell>
                      <TableCell>{formData.vendor.taxId}</TableCell>
                    </TableRow>
                  )}
                  {formData.vendor?.address && (
                    <TableRow>
                      <TableCell><strong>{t('expense.vendorAddress')}</strong></TableCell>
                      <TableCell>{formData.vendor.address}</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </Grid>
      )}

      {/* 关联差旅 */}
      {selectedTravel && (
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                {t('expense.relatedTravel') || '关联差旅'}
              </Typography>
              <Divider sx={{ mb: 2 }} />
              <Typography>
                {selectedTravel.travelNumber} - {selectedTravel.title}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      )}

      {/* 关联发票 */}
      {relatedInvoices && relatedInvoices.length > 0 && (
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                {t('expense.relatedInvoices') || '关联发票'}
              </Typography>
              <Divider sx={{ mb: 2 }} />
              <List>
                {relatedInvoices.map((invoice, index) => (
                  <ListItem key={invoice._id || invoice.id || index}>
                    <ListItemText
                      primary={invoice.invoiceNumber || invoice._id}
                      secondary={`${invoice.amount || ''} ${invoice.currency || ''}`}
                    />
                  </ListItem>
                ))}
              </List>
            </CardContent>
          </Card>
        </Grid>
      )}

      {/* 标签 */}
      {formData.tags && formData.tags.length > 0 && (
        <Grid item xs={12}>
          <Box>
            <Typography variant="subtitle2" gutterBottom>
              {t('expense.tags')}
            </Typography>
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              {formData.tags.map((tag, index) => (
                <Chip key={index} label={tag} size="small" />
              ))}
            </Box>
          </Box>
        </Grid>
      )}

      {/* 备注 */}
      {formData.notes && (
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                {t('expense.notes') || '备注'}
              </Typography>
              <Divider sx={{ mb: 2 }} />
              <Typography>{formData.notes}</Typography>
            </CardContent>
          </Card>
        </Grid>
      )}
    </Grid>
  );
};

export default ReviewStep;

