import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import Markdown from 'react-markdown';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { runPrediction } from '../services/predictApi';
import { fetchEnterprises, type EnterpriseItem } from '../services/enterprisesApi';
import type { PredictResponse } from '../types';
import { getRiskColor, getRiskLevel, RISK_LABELS, formatProbability } from '../utils/constants';
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorMessage from '../components/ErrorMessage';

export default function PredictionPage() {
  const [searchParams] = useSearchParams();
  const [enterprises, setEnterprises] = useState<EnterpriseItem[]>([]);
  const [enterpriseCode, setEnterpriseCode] = useState('');
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [horizon, setHorizon] = useState<'24h' | '7d'>('7d');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<PredictResponse | null>(null);

  useEffect(() => {
    fetchEnterprises()
      .then(list => {
        setEnterprises(list);
        const fromUrl = searchParams.get('enterprise');
        const match = fromUrl && list.find(e => e.enterprise_code === fromUrl);
        setEnterpriseCode(match ? match.enterprise_code : list[0]?.enterprise_code || '');
      })
      .catch(() => setEnterprises([]));
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!enterpriseCode) return;
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const res = await runPrediction({ enterprise_code: enterpriseCode, date, horizon });
      setResult(res);
    } catch (err: any) {
      setError(err?.response?.data?.error || err.message || 'Ошибка при формировании прогноза');
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = () => {
    if (!result?.report_md) return;
    const blob = new Blob([result.report_md], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `threat_report_${horizon}_${date}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const chartData = result?.all_threats.map(t => ({
    name: t.threatname,
    probability: +(t.probability * 100).toFixed(1),
    fill: getRiskColor(t.probability),
  })) ?? [];

  return (
    <div>
      <h1 style={{ marginBottom: 24, fontSize: 24 }}>Прогноз киберугроз</h1>

      <form onSubmit={handleSubmit} style={{ display: 'flex', gap: 16, alignItems: 'flex-end', marginBottom: 32, flexWrap: 'wrap' }}>
        <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 14 }}>
          Предприятие
          <select
            value={enterpriseCode}
            onChange={e => setEnterpriseCode(e.target.value)}
            style={{ padding: '8px 12px', borderRadius: 6, border: '1px solid var(--color-border)', fontSize: 14, minWidth: 220 }}
          >
            {enterprises.map(e => (
              <option key={e.enterprise_code} value={e.enterprise_code}>
                {e.enterprise_code} ({e.type})
              </option>
            ))}
          </select>
        </label>

        <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 14 }}>
          Дата
          <input
            type="date"
            value={date}
            min="2025-07-19"
            max="2025-12-30"
            onChange={e => setDate(e.target.value)}
            style={{ padding: '8px 12px', borderRadius: 6, border: '1px solid var(--color-border)', fontSize: 14 }}
          />
        </label>

        <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 14 }}>
          Горизонт
          <select
            value={horizon}
            onChange={e => setHorizon(e.target.value as '24h' | '7d')}
            style={{ padding: '8px 12px', borderRadius: 6, border: '1px solid var(--color-border)', fontSize: 14 }}
          >
            <option value="24h">24 часа</option>
            <option value="7d">7 дней</option>
          </select>
        </label>

        <button
          type="submit"
          disabled={loading || !enterpriseCode}
          style={{
            padding: '8px 24px',
            background: 'var(--color-primary)',
            color: '#fff',
            border: 'none',
            borderRadius: 6,
            fontSize: 14,
            fontWeight: 600,
            cursor: loading ? 'wait' : 'pointer',
            opacity: loading ? 0.7 : 1,
          }}
        >
          {loading ? 'Анализ...' : 'Запустить прогноз'}
        </button>
      </form>

      {loading && <LoadingSpinner text="Формирование прогноза..." />}
      {error && <ErrorMessage message={error} />}

      {result && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
          {/* Top threat card */}
          <div style={{
            background: 'var(--color-surface)',
            borderRadius: 12,
            padding: 24,
            border: `2px solid ${getRiskColor(result.top_threat.probability)}`,
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
          }}>
            <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginBottom: 8 }}>ГЛАВНАЯ УГРОЗА</div>
            <div style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>{result.top_threat.threatname}</div>
            <div style={{
              fontSize: 36, fontWeight: 800,
              color: getRiskColor(result.top_threat.probability),
              marginBottom: 8,
            }}>
              {formatProbability(result.top_threat.probability)}
            </div>
            <div style={{
              display: 'inline-block',
              padding: '4px 12px',
              borderRadius: 20,
              fontSize: 12,
              fontWeight: 600,
              color: '#fff',
              background: getRiskColor(result.top_threat.probability),
              marginBottom: 12,
            }}>
              {RISK_LABELS[getRiskLevel(result.top_threat.probability)]} риск
            </div>
            <p style={{ fontSize: 14, color: 'var(--color-text-secondary)', marginBottom: 12 }}>
              {result.top_threat.description}
            </p>
            <p style={{ fontSize: 14, fontStyle: 'italic' }}>
              {result.top_threat.recommendation}
            </p>
          </div>

          {/* Bar chart */}
          <div style={{
            background: 'var(--color-surface)',
            borderRadius: 12,
            padding: 24,
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
          }}>
            <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginBottom: 16 }}>ВСЕ УГРОЗЫ</div>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={chartData} layout="vertical" margin={{ left: 120 }}>
                <XAxis type="number" domain={[0, 100]} tickFormatter={v => `${v}%`} />
                <YAxis type="category" dataKey="name" width={110} tick={{ fontSize: 12 }} />
                <Tooltip formatter={(v: number) => `${v}%`} />
                <Bar dataKey="probability" radius={[0, 4, 4, 0]}>
                  {chartData.map((entry, i) => (
                    <Cell key={i} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Report */}
          <div style={{
            gridColumn: '1 / -1',
            background: 'var(--color-surface)',
            borderRadius: 12,
            padding: 24,
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>ОТЧЁТ</div>
              <button
                onClick={handleDownload}
                style={{
                  padding: '6px 16px',
                  background: 'var(--color-primary)',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 6,
                  fontSize: 13,
                  cursor: 'pointer',
                }}
              >
                Скачать .md
              </button>
            </div>
            <div style={{ fontSize: 14, lineHeight: 1.8 }}>
              <Markdown>{result.report_md}</Markdown>
            </div>
          </div>
        </div>
      )}

      {!result && !loading && !error && (
        <div style={{ textAlign: 'center', padding: 48, color: 'var(--color-text-secondary)' }}>
          Выберите предприятие и нажмите "Запустить прогноз"
        </div>
      )}
    </div>
  );
}
