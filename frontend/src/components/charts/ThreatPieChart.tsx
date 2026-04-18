// components/charts/ThreatPieChart.tsx

import {
  PieChart,
  Pie,
  Tooltip,
  ResponsiveContainer,
  Cell,
  Legend,
} from 'recharts';

import { useGetAnalyticsEnterpriseTypesQuery }
  from '../../services/api';

const COLORS = [
  '#3b82f6',
  '#22c55e',
  '#ef4444',
  '#f59e0b',
  '#8b5cf6',
];

export const ThreatPieChart = () => {

  const { data, isLoading } =
    useGetAnalyticsEnterpriseTypesQuery(undefined);

  if (isLoading) {

    return (
      <div className="p-4 text-gray-500">
        Загрузка типов предприятий...
      </div>
    );
  }

  const chartData =
    (data ?? []).map((item) => ({

      name: item.enterprise_type,

      value: item.count,

    }));

  if (chartData.length === 0) {

    return (
      <div className="p-4 text-gray-500">
        Нет данных по типам предприятий
      </div>
    );
  }

  return (

    <div className="chart-card p-4 bg-white rounded-lg shadow">

      <h3 className="text-lg font-semibold mb-2">
        Типы предприятий
      </h3>

      <ResponsiveContainer
        width="100%"
        height={250}
      >

        <PieChart>

          <Pie
            data={chartData}
            dataKey="value"
            nameKey="name"
            outerRadius={90}
            label
          >

            {chartData.map((_, index) => (

              <Cell
                key={`cell-${index}`}
                fill={
                  COLORS[index % COLORS.length]
                }
              />

            ))}

          </Pie>

          <Tooltip />

          <Legend />

        </PieChart>

      </ResponsiveContainer>

    </div>

  );
};

