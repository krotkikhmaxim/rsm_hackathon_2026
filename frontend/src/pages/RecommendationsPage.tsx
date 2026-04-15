import { useState, useEffect } from 'react';
import { fetchRecommendations } from '../services/recommendationsApi';
import type { RecommendationItem } from '../types';
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorMessage from '../components/ErrorMessage';

const PRIORITY_COLORS: Record<number, string> = {
  1: '#dc2626',
  2: '#f59e0b',
  3: '#22c55e',
};

export default function RecommendationsPage() {
  const [recs, setRecs] = useState<RecommendationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchRecommendations()
      .then(setRecs)
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingSpinner text="Загрузка рекомендаций..." />;
  if (error) return <ErrorMessage message={error} />;

  // Группировка по угрозе
  const grouped = recs.reduce<Record<string, RecommendationItem[]>>((acc, rec) => {
    const key = rec.threat?.name || `Угроза #${rec.threatId}`;
    (acc[key] ||= []).push(rec);
    return acc;
  }, {});

  return (
    <div>
      <h1 style={{ marginBottom: 24, fontSize: 24 }}>Рекомендации по защите</h1>

      {Object.entries(grouped).map(([threatName, items]) => (
        <div key={threatName} style={{ marginBottom: 24 }}>
          <h3 style={{ fontSize: 16, marginBottom: 12, color: 'var(--color-primary)' }}>{threatName}</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {items.sort((a, b) => a.priority - b.priority).map(rec => (
              <div key={rec.id} style={{
                background: 'var(--color-surface)',
                borderRadius: 10,
                padding: 16,
                boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
                borderLeft: `4px solid ${PRIORITY_COLORS[rec.priority] || '#94a3b8'}`,
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                  <span style={{ fontWeight: 600, fontSize: 14 }}>{rec.title}</span>
                  <span style={{
                    fontSize: 11, padding: '2px 8px', borderRadius: 12,
                    background: PRIORITY_COLORS[rec.priority] || '#94a3b8', color: '#fff',
                  }}>
                    Приоритет {rec.priority}
                  </span>
                </div>
                <p style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>{rec.description}</p>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
