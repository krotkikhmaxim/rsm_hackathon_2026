import { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { fetchAnalytics } from '../services/analyticsApi';
import type { AnalyticsSummary } from '../types';
import { getRiskColor, formatProbability } from '../utils/constants';
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorMessage from '../components/ErrorMessage';

function KpiCard({ label, value, color }: { label: string; value: string | number; color?: string }) {
  return (
    <div style={{
      background: 'var(--color-surface)',
      borderRadius: 12,
      padding: 20,
      boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
      textAlign: 'center',
    }}>
      <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginBottom: 8 }}>{label}</div>
      <div style={{ fontSize: 28, fontWeight: 700, color: color || 'var(--color-text)' }}>{value}</div>
    </div>
  );
}

export default function DashboardPage() {
  const [data, setData] = useState<AnalyticsSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchAnalytics()
      .then(setData)
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingSpinner text="Загрузка аналитики..." />;
  if (error) return <ErrorMessage message={error} />;
  if (!data) return null;

  const threatChartData = data.top_threats.map(t => ({
    name: t.threat_name,
    count: t.count,
    fill: getRiskColor(t.avg_probability),
  }));

  return (
    <div>
      <h1 style={{ marginBottom: 24, fontSize: 24 }}>Дашборд</h1>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 32 }}>
        <KpiCard label="Всего прогнозов" value={data.total_predictions} />
        <KpiCard label="Средняя вероятность" value={formatProbability(data.avg_probability)} color={getRiskColor(data.avg_probability)} />
        <KpiCard label="Предприятий" value={data.total_enterprises} />
        <KpiCard label="Горизонтов" value={data.by_horizon.length} />
      </div>

      <div style={{
        background: 'var(--color-surface)',
        borderRadius: 12,
        padding: 24,
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
      }}>
        <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 16 }}>Топ угрозы</div>
        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={threatChartData}>
            <XAxis dataKey="name" tick={{ fontSize: 12 }} />
            <YAxis />
            <Tooltip />
            <Bar dataKey="count" radius={[4, 4, 0, 0]}>
              {threatChartData.map((entry, i) => (
                <Cell key={i} fill={entry.fill} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
