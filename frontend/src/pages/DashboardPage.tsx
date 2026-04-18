// pages/DashboardPage.tsx
import { useGetAnalyticsSummaryQuery } from '../services/api';
import KpiCard from '../components/cards/KpiCard';
import { ThreatBarChart } from '../components/charts/ThreatBarChart';
import { ThreatLineChart } from '../components/charts/ThreatLineChart';
import { ThreatPieChart } from '../components/charts/ThreatPieChart';

export default function DashboardPage() {
  const { data, isLoading, error } = useGetAnalyticsSummaryQuery(undefined);

  if (isLoading) return <div className="p-4">Загрузка дашборда...</div>;
  if (error) return <div className="p-4 text-red-600">Ошибка загрузки данных</div>;

  return (
    <div className="p-4">
      <h2 className="text-2xl font-bold mb-4">Обзорная аналитика</h2>

      {/* KPI-карточки */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <KpiCard title="Всего инцидентов" value={data?.total.total_incidents ?? 0} />
        <KpiCard title="Успешных атак" value={data?.total.successful_incidents ?? 0} />
        <KpiCard
          title="Успешность"
          value={`${((data?.total.success_rate ?? 0) * 100).toFixed(1)}%`}
        />
        <KpiCard title="Уникальных угроз" value={data?.total.unique_threats ?? 0} />
      </div>

      {/* Графики */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">

  <ThreatBarChart />

  <ThreatLineChart />

  <ThreatPieChart />

      </div>
    </div>
  );
}