import api from './api';
import type { ThreatItem, PaginatedResponse } from '../types';

const USE_MOCK = import.meta.env.VITE_MOCK_API === 'true';

const MOCK_THREATS: ThreatItem[] = [
  { id: 1, code: 'THREAT-1', name: 'Вредоносное ПО (Malware)', description: 'Распространение вредоносного ПО, включая вирусы, трояны и ransomware.', object: null, source: null, cia_flags: null, cluster: '1', recommendations: [
    { id: 1, rec_code: 'REC-1-1', title: 'Обновить антивирусные базы', description: 'Установить последние обновления антивирусного ПО.', priority: 1, threatId: 1 },
    { id: 2, rec_code: 'REC-1-2', title: 'Включить поведенческий анализ', description: 'Активировать эвристику.', priority: 2, threatId: 1 },
  ]},
  { id: 2, code: 'THREAT-2', name: 'Атаки типа DDoS', description: 'Распределенные атаки на отказ в обслуживании.', object: null, source: null, cia_flags: null, cluster: '2', recommendations: [
    { id: 4, rec_code: 'REC-2-1', title: 'Включить DDoS-защиту провайдера', description: 'Фильтрация трафика.', priority: 1, threatId: 2 },
  ]},
  { id: 3, code: 'THREAT-3', name: 'Brute Force / Подбор паролей', description: 'Попытки подбора учетных данных.', object: null, source: null, cia_flags: null, cluster: '3', recommendations: [] },
  { id: 4, code: 'THREAT-4', name: 'Социальная инженерия / Фишинг', description: 'Фишинговые атаки на сотрудников.', object: null, source: null, cia_flags: null, cluster: '4', recommendations: [] },
  { id: 5, code: 'THREAT-5', name: 'Эксплуатация уязвимостей', description: 'Использование известных уязвимостей.', object: null, source: null, cia_flags: null, cluster: '5', recommendations: [] },
  { id: 6, code: 'THREAT-6', name: 'Инсайдерские угрозы', description: 'Несанкционированные действия сотрудников.', object: null, source: null, cia_flags: null, cluster: '6', recommendations: [] },
];

export async function fetchThreats(search = ''): Promise<{ items: ThreatItem[]; pagination: { total: number } }> {
  if (USE_MOCK) {
    await new Promise(r => setTimeout(r, 300));
    const filtered = search
      ? MOCK_THREATS.filter(t => t.name.toLowerCase().includes(search.toLowerCase()))
      : MOCK_THREATS;
    return { items: filtered, pagination: { total: filtered.length } };
  }
  const { data } = await api.get<{ data: PaginatedResponse<ThreatItem> }>(`/threats?search=${encodeURIComponent(search)}&limit=50`);
  return data.data;
}
