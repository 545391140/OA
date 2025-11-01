import React from 'react';
import { Typography, Box } from '@mui/material';
import { useTranslation } from 'react-i18next';

const ApprovalDetail = () => {
  const { t } = useTranslation();

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Approval Detail
      </Typography>
      <Typography variant="body1">
        Approval detail page - Coming soon!
      </Typography>
    </Box>
  );
};

export default ApprovalDetail;
