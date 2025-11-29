import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as ChartTooltip, ResponsiveContainer } from 'recharts';
import { useTranslation } from 'react-i18next';

const MonthlySpendingChart = ({ data, formatCurrency }) => {
  const { t } = useTranslation();

  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis 
          dataKey="month" 
          tickFormatter={(value) => {
            // 尝试翻译月份名称
            const monthKey = `common.months.${value}`;
            const translated = t(monthKey);
            return translated !== monthKey ? translated : value;
          }}
        />
        <YAxis />
        <ChartTooltip formatter={(value) => [formatCurrency(value), t('dashboard.amount')]} />
        <Line type="monotone" dataKey="amount" stroke="#1976d2" strokeWidth={2} />
      </LineChart>
    </ResponsiveContainer>
  );
};

export default MonthlySpendingChart;




