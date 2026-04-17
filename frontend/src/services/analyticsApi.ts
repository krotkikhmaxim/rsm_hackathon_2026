import api from './api';
import type { AnalyticsSummary } from '../types';

const MOCK_ANALYTICS: AnalyticsSummary = {
  total_predictions: 47,
  avg_probability: 0.42,
  total_enterprises: 12,
  top_threats: [
    { threat_name: 'Вредоносное ПО', count: 15, avg_probability: 0.68 },
    { threat_name: 'DDoS-атаки', count: 10, avg_probability: 0.51 },
    { threat_name: 'Фишинг', count: 8, avg_probability: 0.39 },
  ],
  by_horizon: [
    { horizon: '24h', count: 20 },
    { horizon: '7d', count: 27 },
  ],
  recent_predictions: [],
};

const USE_MOCK = import.meta.env.VITE_MOCK_API === 'true';

export async function fetchAnalytics(): Promise<AnalyticsSummary> {
  if (USE_MOCK) {
    await new Promise(r => setTimeout(r, 500));
    return MOCK_ANALYTICS;
  }
  const { data } = await api.get<{ data: AnalyticsSummary }>('/analytics');
  return data.data;
}
