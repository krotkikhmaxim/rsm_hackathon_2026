// components/charts/ThreatLineChart.tsx
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { useGetAnalyticsTimeseriesQuery } from '../../services/api';

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{
    name: string;
    value: number;
    color: string;
  }>;
  label?: string;
}

const CustomTooltip = ({ active, payload, label }: CustomTooltipProps) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white p-3 border border-gray-200 rounded shadow">
        <p className="font-medium">{label}</p>
        {payload.map((entry, index) => (
          <p key={index} style={{ color: entry.color }}>
            {entry.name}: {entry.value} инцидентов
          </p>
        ))}
      </div>
    );
  }
  return null;
};

export const ThreatLineChart = () => {
  const { data, isLoading } = useGetAnalyticsTimeseriesQuery({});

  if (isLoading) {
    return <div className="p-4 text-gray-500">Загрузка временного ряда...</div>;
  }

  const chartData = data?.series ?? [];

  if (chartData.length === 0) {
    return <div className="p-4 text-gray-500">Нет данных по временному ряду</div>;
  }

  return (
    <div className="chart-card p-4 bg-white rounded-lg shadow">
      <h3 className="text-lg font-semibold mb-2">Динамика инцидентов</h3>
      <ResponsiveContainer width="100%" height={250}>
        <LineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="period" tick={{ fontSize: 12 }} />
          <YAxis />
          <Tooltip content={<CustomTooltip />} />
          <Legend />
          <Line type="monotone" dataKey="total" stroke="#ef4444" name="Всего" />
          <Line type="monotone" dataKey="successful" stroke="#22c55e" name="Успешные" />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};