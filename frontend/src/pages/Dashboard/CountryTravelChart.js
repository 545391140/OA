import React, { useMemo, useCallback, useEffect } from 'react';
import { PieChart, Pie, Cell, Legend, Tooltip as ChartTooltip, ResponsiveContainer } from 'recharts';
import { useTranslation } from 'react-i18next';

const CountryTravelChart = ({ data }) => {
  const { t, i18n } = useTranslation();
  const currentLanguage = i18n.language || 'zh';
  const isChinese = currentLanguage.toLowerCase().startsWith('zh');

  // 根据语言选择显示名称
  const getDisplayName = useCallback((item) => {
    if (!item) return '';
    const displayName = isChinese ? (item.name || '') : (item.enName || item.name || '');
    return displayName;
  }, [isChinese]);

  // 处理数据，添加显示名称
  const processedData = useMemo(() => {
    if (!data || data.length === 0) return [];
    return data.map(item => {
      const displayName = getDisplayName(item);
      return {
        ...item,
        displayName: displayName
      };
    });
  }, [data, getDisplayName, isChinese]);

  // 监听语言变化，确保组件重新渲染
  useEffect(() => {
    // 语言变化时会触发重新渲染
  }, [currentLanguage, isChinese]);

  if (!data || data.length === 0) {
    return null;
  }

  return (
    <ResponsiveContainer width="100%" height={340}>
      <PieChart>
        <Pie
          data={processedData}
          cx="50%"
          cy="50%"
          labelLine={false}
          label={({ displayName, value }) => {
            return `${displayName} ${value}%`;
          }}
          outerRadius={90}
          fill="#8884d8"
          dataKey="value"
        >
          {processedData.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={entry.color} />
          ))}
        </Pie>
        <ChartTooltip 
          formatter={(value, name, props) => {
            const count = props.payload?.count || 0;
            const displayName = getDisplayName(props.payload);
            return [`${count} ${t('dashboard.travels')} (${value}%)`, displayName || name];
          }}
        />
        <Legend 
          formatter={(value, entry) => {
            // entry.payload 包含完整的数据项
            const item = entry.payload;
            if (item) {
              const displayName = getDisplayName(item);
              return `${displayName} (${item.count} ${t('dashboard.travels')})`;
            }
            return value;
          }}
        />
      </PieChart>
    </ResponsiveContainer>
  );
};

export default CountryTravelChart;

