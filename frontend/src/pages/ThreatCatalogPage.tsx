import { useState, useEffect } from 'react';
import { fetchThreats } from '../services/threatsApi';
import type { ThreatItem } from '../types';
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorMessage from '../components/ErrorMessage';

export default function ThreatCatalogPage() {
  const [threats, setThreats] = useState<ThreatItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const loadThreats = (q: string) => {
    setLoading(true);
    fetchThreats(q)
      .then(res => setThreats(res.items))
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadThreats(''); }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    loadThreats(search);
  };

  return (
    <div>
      <h1 style={{ marginBottom: 24, fontSize: 24 }}>Каталог угроз</h1>

      <form onSubmit={handleSearch} style={{ display: 'flex', gap: 12, marginBottom: 24 }}>
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Поиск по названию..."
          style={{ flex: 1, padding: '8px 12px', borderRadius: 6, border: '1px solid var(--color-border)', fontSize: 14 }}
        />
        <button type="submit" style={{
          padding: '8px 20px', background: 'var(--color-primary)', color: '#fff',
          border: 'none', borderRadius: 6, fontSize: 14, cursor: 'pointer',
        }}>
          Найти
        </button>
      </form>

      {loading && <LoadingSpinner />}
      {error && <ErrorMessage message={error} />}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {threats.map(threat => (
          <div
            key={threat.id}
            style={{
              background: 'var(--color-surface)',
              borderRadius: 10,
              padding: 16,
              boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
              cursor: 'pointer',
              borderLeft: `4px solid var(--color-primary)`,
            }}
            onClick={() => setExpandedId(expandedId === threat.id ? null : threat.id)}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <span style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginRight: 8 }}>{threat.code}</span>
                <span style={{ fontWeight: 600 }}>{threat.name}</span>
              </div>
              <span style={{
                fontSize: 11, padding: '2px 8px', borderRadius: 12,
                background: 'var(--color-primary)', color: '#fff',
              }}>
                Кластер {threat.cluster}
              </span>
            </div>

            {expandedId === threat.id && (
              <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--color-border)' }}>
                <p style={{ fontSize: 14, color: 'var(--color-text-secondary)', marginBottom: 12 }}>
                  {threat.description}
                </p>
                {threat.recommendations.length > 0 && (
                  <>
                    <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 8 }}>Рекомендации:</div>
                    {threat.recommendations.map(rec => (
                      <div key={rec.id} style={{
                        padding: '8px 12px', background: '#f0fdf4', borderRadius: 6, marginBottom: 6, fontSize: 13,
                      }}>
                        <strong>P{rec.priority}:</strong> {rec.title} — {rec.description}
                      </div>
                    ))}
                  </>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
