import api from './api';
import type { PredictRequest, PredictResponse } from '../types';

const MOCK_RESPONSE: PredictResponse = {
  request_id: 'mock-001',
  top_threat: {
    infrastructure_cluster: '1',
    threat_cluster: 1,
    threatname: 'Вредоносное ПО',
    probability: 0.73,
    description: 'Распространение вредоносного ПО, включая вирусы, трояны и ransomware',
    recommendation: 'Обновить антивирусное ПО, провести сканирование всех узлов',
  },
  all_threats: [
    { infrastructure_cluster: '1', threat_cluster: 1, threatname: 'Вредоносное ПО', probability: 0.73, description: 'Распространение вредоносного ПО', recommendation: 'Обновить антивирусное ПО' },
    { infrastructure_cluster: '1', threat_cluster: 2, threatname: 'DDoS-атаки', probability: 0.52, description: 'Распределенные атаки на отказ в обслуживании', recommendation: 'Настроить защиту от DDoS' },
    { infrastructure_cluster: '1', threat_cluster: 3, threatname: 'Подбор учётных данных', probability: 0.41, description: 'Brute force атаки', recommendation: 'Включить двухфакторную аутентификацию' },
    { infrastructure_cluster: '1', threat_cluster: 4, threatname: 'Фишинг', probability: 0.35, description: 'Фишинговые атаки на сотрудников', recommendation: 'Провести обучение персонала' },
    { infrastructure_cluster: '1', threat_cluster: 5, threatname: 'Эксплуатация уязвимостей', probability: 0.28, description: 'Использование известных уязвимостей', recommendation: 'Применить последние патчи' },
    { infrastructure_cluster: '1', threat_cluster: 6, threatname: 'Инсайдерские угрозы', probability: 0.15, description: 'Несанкционированные действия сотрудников', recommendation: 'Усилить контроль доступа' },
  ],
  report_md: '## Отчет по прогнозу угроз\n\n- **Дата прогноза:** 2024-06-01\n- **Горизонт:** 7 дней\n\n### Главная угроза\n- **Тип угрозы:** Вредоносное ПО\n- **Вероятность:** 73.0%\n- **Уровень:** Высокий\n\n### Все угрозы\n- **Вредоносное ПО** — 73.0% (Высокий риск)\n- **DDoS-атаки** — 52.0% (Средний риск)\n- **Подбор учётных данных** — 41.0% (Средний риск)\n- **Фишинг** — 35.0% (Низкий риск)\n- **Эксплуатация уязвимостей** — 28.0% (Низкий риск)\n- **Инсайдерские угрозы** — 15.0% (Низкий риск)',
  enterprise: {
    enterprise_code: 'DEMO-01',
    type: 'Финансовые и IT-компании',
    host_count: 1500,
    region: 'Москва',
  },
};

const USE_MOCK = import.meta.env.VITE_MOCK_API === 'true';

export async function runPrediction(req: PredictRequest): Promise<PredictResponse> {
  if (USE_MOCK) {
    await new Promise(r => setTimeout(r, 1200));
    return MOCK_RESPONSE;
  }
  const { data } = await api.post<{ data: PredictResponse }>('/predict', req);
  return data.data;
}
