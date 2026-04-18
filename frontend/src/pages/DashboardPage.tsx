// pages/DashboardPage.tsx
import { useGetAnalyticsSummaryQuery } from '../services/api';
import KpiCard from '../components/cards/KpiCard';
import { ThreatBarChart } from '../components/charts/ThreatBarChart';
import { ThreatLineChart } from '../components/charts/ThreatLineChart';
import { ThreatPieChart } from '../components/charts/ThreatPieChart';
import PageWrapper from '../components/layout/PageWrapper';

export default function DashboardPage() {
  const { data, isLoading, error } = useGetAnalyticsSummaryQuery(undefined);

  if (isLoading) return <div className="p-4 text-gray-300">Загрузка дашборда...</div>;
  if (error) return <div className="p-4 text-red-400">Ошибка загрузки данных</div>;

  const successRate = data?.total.success_rate ?? 0;
  const successColor = successRate >= 0.5 ? 'text-green-400' : successRate >= 0.3 ? 'text-yellow-400' : 'text-red-400';

  return (
    <PageWrapper title="Обзорная аналитика">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <KpiCard title="Всего инцидентов" value={data?.total.total_incidents ?? 0} />
        <KpiCard title="Успешных атак" value={data?.total.successful_incidents ?? 0} />
        <KpiCard
          title="Успешность"
          value={`${(successRate * 100).toFixed(1)}%`}
          color={successColor}
        />
        <KpiCard title="Уникальных угроз" value={data?.total.unique_threats ?? 0} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        <ThreatBarChart />
        <ThreatLineChart />
        <ThreatPieChart />
      </div>
    </PageWrapper>
  );
}