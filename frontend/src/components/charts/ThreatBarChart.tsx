// components/charts/ThreatBarChart.tsx
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { useGetAnalyticsRegionsQuery } from '../../services/api';

// Определяем свой интерфейс для пропсов тултипа
interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{
    name: string;
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
      <div className="bg-white p-3 border border-gray-200 rounded shadow">
        <p className="font-medium">{label}</p>
        <p style={{ color: '#3b82f6' }}>
          {payload[0].value} инцидентов
        </p>
      </div>
    );
  }
  return null;
};

export const ThreatBarChart = () => {
  const { data, isLoading } = useGetAnalyticsRegionsQuery(undefined);

  if (isLoading) {
    return <div className="p-4 text-gray-500">Загрузка данных по регионам...</div>;
  }

  const chartData = (data ?? []).map((item) => ({
    name: item.region,
    count: item.count,
  }));

  if (chartData.length === 0) {
    return <div className="p-4 text-gray-500">Нет данных по регионам</div>;
  }

  return (
    <div className="chart-card p-4 bg-white rounded-lg shadow">
      <h3 className="text-lg font-semibold mb-2">Инциденты по регионам</h3>
      <ResponsiveContainer width="100%" height={250}>
        <BarChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="name" tick={{ fontSize: 12 }} />
          <YAxis />
          <Tooltip content={<CustomTooltip />} />
          <Bar dataKey="count" fill="#3b82f6" radius={[6, 6, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};