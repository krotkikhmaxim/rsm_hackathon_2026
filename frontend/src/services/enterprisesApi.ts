import api from './api';

export interface EnterpriseItem {
  enterprise_code: string;
  type: string;
  host_count: number;
  region: string;
}

const MOCK_ENTERPRISES: EnterpriseItem[] = [
  { enterprise_code: 'DEMO-01', type: 'Финансовые и IT-компании', host_count: 1500, region: 'Москва' },
  { enterprise_code: 'DEMO-02', type: 'Промышленные предприятия', host_count: 800, region: 'Санкт-Петербург' },
  { enterprise_code: 'DEMO-03', type: 'Государственные учреждения', host_count: 200, region: 'Новосибирск' },
];

const USE_MOCK = import.meta.env.VITE_MOCK_API === 'true';

export async function fetchEnterprises(): Promise<EnterpriseItem[]> {
  if (USE_MOCK) {
    await new Promise(r => setTimeout(r, 300));
    return MOCK_ENTERPRISES;
  }
  const { data } = await api.get<{ data: { enterprises: EnterpriseItem[] } }>('/enterprises');
  return data.data.enterprises;
}
