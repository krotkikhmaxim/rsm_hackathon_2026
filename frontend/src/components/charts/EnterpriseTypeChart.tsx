// components/charts/EnterpriseTypeChart.tsx
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { useGetAnalyticsEnterpriseTypesQuery } from '../../services/api';

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{
    value: number;
    payload: {
      name: string;
      count: number;
    };
  }>;
  label?: string;
}

const CustomTooltip = ({ active, payload, label }: CustomTooltipProps) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-gray-800 p-3 border border-gray-600 rounded shadow text-gray-200">
        <p className="font-medium">{label}</p>
        <p className="text-blue-400">{payload[0].value} предприятий</p>
      </div>
    );
  }
  return null;
};

export const EnterpriseTypeChart = () => {
  const { data, isLoading } = useGetAnalyticsEnterpriseTypesQuery(undefined);

  if (isLoading) {
    return <div className="p-4 text-gray-400">Загрузка типов предприятий...</div>;
  }

  const chartData = (data ?? []).map((item) => ({
    name: item.enterprise_type,
    count: item.count,
  }));

  if (chartData.length === 0) {
    return <div className="p-4 text-gray-400">Нет данных по типам предприятий</div>;
  }

  return (
    <div className="chart-card p-4 bg-[#0f172a] rounded-lg shadow border border-white/5">
      <h3 className="text-lg font-semibold mb-2 text-gray-200">Распределение по отраслям</h3>
      <ResponsiveContainer width="100%" height={250}>
        <BarChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
          <XAxis dataKey="name" tick={{ fill: '#94a3b8', fontSize: 12 }} />
          <YAxis tick={{ fill: '#94a3b8' }} />
          <Tooltip content={<CustomTooltip />} />
          <Bar dataKey="count" fill="#3b82f6" radius={[6, 6, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};