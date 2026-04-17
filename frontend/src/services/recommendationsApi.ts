import api from './api';
import type { RecommendationItem } from '../types';

const USE_MOCK = import.meta.env.VITE_MOCK_API === 'true';

const MOCK_RECS: RecommendationItem[] = [
  { id: 1, rec_code: 'REC-1-1', title: 'Обновить антивирусные базы', description: 'Установить последние обновления антивирусного ПО на всех узлах.', priority: 1, threatId: 1, threat: { code: 'THREAT-1', name: 'Вредоносное ПО (Malware)', cluster: '1' } },
  { id: 2, rec_code: 'REC-1-2', title: 'Включить поведенческий анализ', description: 'Активировать эвристический анализ.', priority: 2, threatId: 1, threat: { code: 'THREAT-1', name: 'Вредоносное ПО (Malware)', cluster: '1' } },
  { id: 3, rec_code: 'REC-1-3', title: 'Ограничить выполнение макросов', description: 'Запретить автоматическое выполнение макросов.', priority: 3, threatId: 1, threat: { code: 'THREAT-1', name: 'Вредоносное ПО (Malware)', cluster: '1' } },
  { id: 4, rec_code: 'REC-2-1', title: 'Включить DDoS-защиту провайдера', description: 'Активировать фильтрацию трафика.', priority: 1, threatId: 2, threat: { code: 'THREAT-2', name: 'Атаки типа DDoS', cluster: '2' } },
  { id: 5, rec_code: 'REC-2-2', title: 'Настроить rate limiting', description: 'Ограничить частоту запросов.', priority: 2, threatId: 2, threat: { code: 'THREAT-2', name: 'Атаки типа DDoS', cluster: '2' } },
  { id: 6, rec_code: 'REC-3-1', title: 'Внедрить MFA', description: 'Включить многофакторную аутентификацию.', priority: 1, threatId: 3, threat: { code: 'THREAT-3', name: 'Brute Force / Подбор паролей', cluster: '3' } },
];

export async function fetchRecommendations(): Promise<RecommendationItem[]> {
  if (USE_MOCK) {
    await new Promise(r => setTimeout(r, 300));
    return MOCK_RECS;
  }
  const { data } = await api.get<{ data: { recommendations: RecommendationItem[] } }>('/recommendations');
  return data.data.recommendations;
}
