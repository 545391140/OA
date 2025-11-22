import React from 'react';
import { PieChart, Pie, Cell, Legend, Tooltip as ChartTooltip, ResponsiveContainer } from 'recharts';
import { useTranslation } from 'react-i18next';

const CategoryBreakdownChart = ({ data, formatCurrency }) => {
  const { t } = useTranslation();

  return (
    <ResponsiveContainer width="100%" height={300}>
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          labelLine={false}
          label={({ name, value }) => {
            // 尝试翻译类别名称
            const categoryKey = `expense.categories.${name}`;
            const translatedName = t(categoryKey);
            const displayName = translatedName !== categoryKey ? translatedName : name;
            return `${displayName} ${value}%`;
          }}
          outerRadius={80}
          fill="#8884d8"
          dataKey="value"
        >
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={entry.color} />
          ))}
        </Pie>
        <ChartTooltip 
          formatter={(value, name, props) => {
            const categoryKey = `expense.categories.${name}`;
            const translatedName = t(categoryKey);
            const displayName = translatedName !== categoryKey ? translatedName : name;
            const amount = props.payload?.amount;
            // 如果有金额数据，显示金额和百分比；否则只显示百分比
            if (amount !== undefined) {
              return [`${formatCurrency(amount)} (${value}%)`, displayName];
            }
            return [`${value}%`, displayName];
          }}
        />
        <Legend 
          formatter={(value) => {
            const categoryKey = `expense.categories.${value}`;
            const translated = t(categoryKey);
            return translated !== categoryKey ? translated : value;
          }}
        />
      </PieChart>
    </ResponsiveContainer>
  );
};

export default CategoryBreakdownChart;

