import { useState, useEffect } from 'react';
import api from '../services/api';
import type { PredictionLogItem } from '../types';
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorMessage from '../components/ErrorMessage';
import { getRiskColor, formatProbability } from '../utils/constants';

const USE_MOCK = import.meta.env.VITE_MOCK_API === 'true';

const MOCK_HISTORY: PredictionLogItem[] = [
  { request_id: 'req-001', enterprise_code: 'DEMO-01', predicted_threat: 'Вредоносное ПО (Malware)', probability: 0.73, horizon: '7d', prediction_date: '2026-04-15', createdAt: '2026-04-15T10:30:00Z' },
  { request_id: 'req-002', enterprise_code: 'DEMO-02', predicted_threat: 'Атаки типа DDoS', probability: 0.52, horizon: '24h', prediction_date: '2026-04-14', createdAt: '2026-04-14T14:00:00Z' },
  { request_id: 'req-003', enterprise_code: 'DEMO-03', predicted_threat: 'Фишинг', probability: 0.28, horizon: '7d', prediction_date: '2026-04-13', createdAt: '2026-04-13T09:15:00Z' },
  { request_id: 'req-004', enterprise_code: 'DEMO-01', predicted_threat: 'Brute Force / Подбор паролей', probability: 0.45, horizon: '24h', prediction_date: '2026-04-12', createdAt: '2026-04-12T16:45:00Z' },
];

export default function HistoryPage() {
  const [predictions, setPredictions] = useState<PredictionLogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (USE_MOCK) {
      setTimeout(() => { setPredictions(MOCK_HISTORY); setLoading(false); }, 400);
      return;
    }
    api.get<{ data: { predictions: PredictionLogItem[] } }>('/predict/history')
      .then(res => setPredictions(res.data.data.predictions))
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingSpinner text="Загрузка истории..." />;
  if (error) return <ErrorMessage message={error} />;

  return (
    <div>
      <h1 style={{ marginBottom: 24, fontSize: 24 }}>История прогнозов</h1>

      {predictions.length === 0 ? (
        <p style={{ color: 'var(--color-text-secondary)' }}>Прогнозов пока нет. Запустите первый прогноз на странице "Прогноз".</p>
      ) : (
        <div style={{
          background: 'var(--color-surface)',
          borderRadius: 12,
          overflow: 'hidden',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
            <thead>
              <tr style={{ background: '#f1f5f9', textAlign: 'left' }}>
                <th style={{ padding: '12px 16px' }}>Дата</th>
                <th style={{ padding: '12px 16px' }}>Предприятие</th>
                <th style={{ padding: '12px 16px' }}>Угроза</th>
                <th style={{ padding: '12px 16px' }}>Вероятность</th>
                <th style={{ padding: '12px 16px' }}>Горизонт</th>
              </tr>
            </thead>
            <tbody>
              {predictions.map(p => (
                <tr key={p.request_id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                  <td style={{ padding: '10px 16px' }}>
                    {new Date(p.createdAt).toLocaleDateString('ru-RU')}
                  </td>
                  <td style={{ padding: '10px 16px', fontWeight: 500 }}>{p.enterprise_code}</td>
                  <td style={{ padding: '10px 16px' }}>{p.predicted_threat}</td>
                  <td style={{ padding: '10px 16px' }}>
                    <span style={{
                      fontWeight: 600,
                      color: getRiskColor(p.probability),
                    }}>
                      {formatProbability(p.probability)}
                    </span>
                  </td>
                  <td style={{ padding: '10px 16px' }}>
                    <span style={{
                      fontSize: 12, padding: '2px 8px', borderRadius: 12,
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
    </div>
  );
}
