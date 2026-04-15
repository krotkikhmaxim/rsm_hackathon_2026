import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, PieChart, Pie } from 'recharts';
import { fetchAnalytics } from '../services/analyticsApi';
import { fetchEnterprises, type EnterpriseItem } from '../services/enterprisesApi';
import { fetchThreats } from '../services/threatsApi';
import type { AnalyticsSummary, ThreatItem } from '../types';
import { getRiskColor, formatProbability, RISK_COLORS } from '../utils/constants';
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorMessage from '../components/ErrorMessage';

function KpiCard({ label, value, subtitle, color, icon }: {
  label: string; value: string | number; subtitle?: string; color?: string; icon?: string;
}) {
  return (
    <div style={{
      background: 'var(--color-surface)', borderRadius: 12, padding: 20,
      boxShadow: '0 1px 3px rgba(0,0,0,0.1)', display: 'flex', flexDirection: 'column', gap: 4,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 12, color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</span>
        {icon && <span style={{ fontSize: 20 }}>{icon}</span>}
      </div>
      <div style={{ fontSize: 28, fontWeight: 700, color: color || 'var(--color-text)' }}>{value}</div>
      {subtitle && <div style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>{subtitle}</div>}
    </div>
  );
}

function EnterpriseCard({ enterprise, onPredict }: { enterprise: EnterpriseItem; onPredict: () => void }) {
  return (
    <div style={{
      background: 'var(--color-surface)', borderRadius: 12, padding: 20,
      boxShadow: '0 1px 3px rgba(0,0,0,0.1)', borderLeft: '4px solid var(--color-primary)',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
        <div>
          <div style={{ fontSize: 16, fontWeight: 700 }}>{enterprise.enterprise_code}</div>
          <div style={{ fontSize: 13, color: 'var(--color-text-secondary)', marginTop: 2 }}>{enterprise.type}</div>
        </div>
        <span style={{
          fontSize: 11, padding: '3px 10px', borderRadius: 12,
          background: '#f0f9ff', color: 'var(--color-primary)', fontWeight: 600,
        }}>
          {enterprise.region}
        </span>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>
          {enterprise.host_count.toLocaleString()} хостов
        </span>
        <button onClick={onPredict} style={{
          padding: '6px 16px', background: 'var(--color-primary)', color: '#fff',
          border: 'none', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer',
        }}>
          Прогноз →
        </button>
      </div>
    </div>
  );
}

function ThreatMiniCard({ threat }: { threat: ThreatItem }) {
  const clusterColors = ['#0ea5e9', '#8b5cf6', '#f59e0b', '#ef4444', '#10b981', '#ec4899'];
  const idx = Number(threat.cluster || 1) - 1;
  const color = clusterColors[idx % clusterColors.length];

  return (
    <div style={{
      background: 'var(--color-surface)', borderRadius: 10, padding: 16,
      boxShadow: '0 1px 3px rgba(0,0,0,0.08)', borderTop: `3px solid ${color}`,
    }}>
      <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 6 }}>{threat.name}</div>
      <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginBottom: 8, lineHeight: 1.5 }}>
        {(threat.description || '').slice(0, 80)}{(threat.description || '').length > 80 ? '...' : ''}
      </div>
      <div style={{ display: 'flex', gap: 6 }}>
        <span style={{
          fontSize: 10, padding: '2px 8px', borderRadius: 10,
          background: `${color}15`, color, fontWeight: 600,
        }}>
          Кластер {threat.cluster}
        </span>
        <span style={{
          fontSize: 10, padding: '2px 8px', borderRadius: 10,
          background: '#f1f5f9', color: 'var(--color-text-secondary)',
        }}>
          {threat.recommendations.length} рек.
        </span>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const navigate = useNavigate();
  const [analytics, setAnalytics] = useState<AnalyticsSummary | null>(null);
  const [enterprises, setEnterprises] = useState<EnterpriseItem[]>([]);
  const [threats, setThreats] = useState<ThreatItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([
      fetchAnalytics().catch(() => null),
      fetchEnterprises().catch(() => []),
      fetchThreats().then(r => r.items).catch(() => []),
    ])
      .then(([a, e, t]) => {
        setAnalytics(a);
        setEnterprises(e);
        setThreats(t);
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingSpinner text="Загрузка дашборда..." />;
  if (error) return <ErrorMessage message={error} />;

  const totalRecs = threats.reduce((sum, t) => sum + t.recommendations.length, 0);
  const hasPredictions = (analytics?.total_predictions || 0) > 0;

  const threatChartData = analytics?.top_threats.map(t => ({
    name: t.threat_name.length > 20 ? t.threat_name.slice(0, 18) + '...' : t.threat_name,
    count: t.count,
    fill: getRiskColor(t.avg_probability),
  })) ?? [];

  const horizonData = analytics?.by_horizon.map(h => ({
    name: h.horizon === '24h' ? '24 часа' : '7 дней',
    value: h.count,
    fill: h.horizon === '24h' ? '#3b82f6' : '#10b981',
  })) ?? [];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h1 style={{ fontSize: 24 }}>Дашборд</h1>
        <button
          onClick={() => navigate('/predict')}
          style={{
            padding: '8px 20px', background: 'var(--color-primary)', color: '#fff',
            border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer',
          }}
        >
          + Новый прогноз
        </button>
      </div>

      {/* KPI row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 28 }}>
        <KpiCard label="Модели CatBoost" value="48" subtitle="6 угроз × 4 кластера × 2 горизонта" icon="🤖" />
        <KpiCard label="Типы угроз" value={threats.length} subtitle={`${totalRecs} рекомендаций`} icon="🛡️" />
        <KpiCard label="Предприятия" value={enterprises.length} subtitle={`${enterprises.reduce((s, e) => s + e.host_count, 0).toLocaleString()} хостов`} icon="🏢" />
        <KpiCard
          label="Прогнозов выполнено"
          value={analytics?.total_predictions || 0}
          subtitle={hasPredictions ? `Ср. вероятность: ${formatProbability(analytics!.avg_probability)}` : 'Запустите первый прогноз'}
          color={hasPredictions ? getRiskColor(analytics!.avg_probability) : undefined}
          icon="📊"
        />
      </div>

      {/* Enterprises */}
      <div style={{ marginBottom: 28 }}>
        <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12 }}>Предприятия</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
          {enterprises.map(e => (
            <EnterpriseCard
              key={e.enterprise_code}
              enterprise={e}
              onPredict={() => navigate(`/predict?enterprise=${e.enterprise_code}`)}
            />
          ))}
        </div>
      </div>

      {/* Threats grid */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <h2 style={{ fontSize: 16, fontWeight: 600 }}>Каталог угроз</h2>
          <button onClick={() => navigate('/threats')} style={{
            background: 'none', border: 'none', color: 'var(--color-primary)',
            cursor: 'pointer', fontSize: 13, fontWeight: 500,
          }}>
            Все угрозы →
          </button>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
          {threats.slice(0, 6).map(t => <ThreatMiniCard key={t.id} threat={t} />)}
        </div>
      </div>

      {/* Charts — only if there are predictions */}
      {hasPredictions && (
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16, marginBottom: 28 }}>
          <div style={{
            background: 'var(--color-surface)', borderRadius: 12, padding: 24,
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
          }}>
            <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 16 }}>Топ угрозы (по количеству прогнозов)</div>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={threatChartData}>
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                  {threatChartData.map((entry, i) => (
                    <Cell key={i} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div style={{
            background: 'var(--color-surface)', borderRadius: 12, padding: 24,
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
          }}>
            <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 16 }}>По горизонтам</div>
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={horizonData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} label={({ name, value }) => `${name}: ${value}`}>
                  {horizonData.map((entry, i) => (
                    <Cell key={i} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Recent predictions */}
      {hasPredictions && analytics!.recent_predictions.length > 0 && (
        <div style={{
          background: 'var(--color-surface)', borderRadius: 12, padding: 24,
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <span style={{ fontSize: 14, fontWeight: 600 }}>Последние прогнозы</span>
            <button onClick={() => navigate('/history')} style={{
              background: 'none', border: 'none', color: 'var(--color-primary)',
              cursor: 'pointer', fontSize: 13,
            }}>
              Вся история →
            </button>
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: '2px solid var(--color-border)', textAlign: 'left' }}>
                <th style={{ padding: '8px 12px', fontWeight: 600 }}>Дата</th>
                <th style={{ padding: '8px 12px', fontWeight: 600 }}>Предприятие</th>
                <th style={{ padding: '8px 12px', fontWeight: 600 }}>Угроза</th>
                <th style={{ padding: '8px 12px', fontWeight: 600 }}>Вероятность</th>
                <th style={{ padding: '8px 12px', fontWeight: 600 }}>Горизонт</th>
              </tr>
            </thead>
            <tbody>
              {analytics!.recent_predictions.map(p => (
                <tr key={p.request_id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                  <td style={{ padding: '8px 12px' }}>{new Date(p.createdAt).toLocaleDateString('ru-RU')}</td>
                  <td style={{ padding: '8px 12px', fontWeight: 500 }}>{p.enterprise_code}</td>
                  <td style={{ padding: '8px 12px' }}>{p.predicted_threat}</td>
                  <td style={{ padding: '8px 12px', fontWeight: 600, color: getRiskColor(p.probability) }}>
                    {formatProbability(p.probability)}
                  </td>
                  <td style={{ padding: '8px 12px' }}>
                    <span style={{
                      fontSize: 11, padding: '2px 8px', borderRadius: 10,
                      background: p.horizon === '24h' ? '#eff6ff' : '#f0fdf4',
                      color: p.horizon === '24h' ? '#2563eb' : '#16a34a',
                    }}>
                      {p.horizon === '24h' ? '24 часа' : '7 дней'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Empty state prompt */}
      {!hasPredictions && (
        <div style={{
          background: 'linear-gradient(135deg, #f0fdfa, #f0f9ff)', borderRadius: 12, padding: 32,
          textAlign: 'center', border: '1px dashed var(--color-border)',
        }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>🔍</div>
          <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>Готово к анализу</div>
          <div style={{ fontSize: 14, color: 'var(--color-text-secondary)', marginBottom: 16 }}>
            48 моделей CatBoost загружены. Выберите предприятие выше или запустите прогноз.
          </div>
          <button onClick={() => navigate('/predict')} style={{
            padding: '10px 28px', background: 'var(--color-primary)', color: '#fff',
            border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer',
          }}>
            Запустить первый прогноз
          </button>
        </div>
      )}
    </div>
  );
}
