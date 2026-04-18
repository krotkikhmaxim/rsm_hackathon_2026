// mocks/data.ts
import type { AnalyticsSummaryResponse, TimeseriesResponse, RegionsResponse } from '../types/analytics';
import type { PredictResponse } from '../types/prediction';
import type { ThreatCatalogItem } from '../types/threat';

export const mockSummary: AnalyticsSummaryResponse = {
  total: {
    total_incidents: 1247,
    successful_incidents: 489,
    success_rate: 0.392,
    unique_threats: 28,
    unique_regions: 42,
    unique_enterprises: 156,
    avg_host_count: 320,
  },
  top_threats: [
    { threat_code: 'UBI.190', threat_name: 'Вредоносное ПО', count: 156, success_rate: 0.52 },
    { threat_code: 'UBI.152', threat_name: 'Эксплуатация уязвимостей', count: 112, success_rate: 0.47 },
    { threat_code: 'UBI.163', threat_name: 'Социальная инженерия', count: 98, success_rate: 0.41 },
  ],
  top_regions: [
    { region: 'Москва', count: 234, success_rate: 0.45 },
    { region: 'Якутия', count: 187, success_rate: 0.38 },
    { region: 'Краснодарский край', count: 143, success_rate: 0.33 },
  ],
  top_enterprise_types: [
    { enterprise_type: 'Медицина', count: 312, success_rate: 0.51 },
    { enterprise_type: 'НКО', count: 205, success_rate: 0.44 },
    { enterprise_type: 'Образование', count: 178, success_rate: 0.36 },
  ],
  filters_applied: {},
};

export const mockTimeseries: TimeseriesResponse = {
  granularity: 'month',
  series: [
    { period: '2025-01', total: 89, successful: 34, failed: 55 },
    { period: '2025-02', total: 102, successful: 41, failed: 61 },
    { period: '2025-03', total: 115, successful: 48, failed: 67 },
    { period: '2025-04', total: 98, successful: 37, failed: 61 },
    { period: '2025-05', total: 131, successful: 55, failed: 76 },
    { period: '2025-06', total: 144, successful: 62, failed: 82 },
  ],
};

export const mockRegions: RegionsResponse = [
  { region: 'Москва', count: 234, success_rate: 0.45 },
  { region: 'Якутия', count: 187, success_rate: 0.38 },
  { region: 'Краснодарский край', count: 143, success_rate: 0.33 },
  { region: 'Хабаровский край', count: 98, success_rate: 0.28 },
  { region: 'Свердловская область', count: 76, success_rate: 0.31 },
];

export const mockPredictResponse: PredictResponse = {
  request_id: 'mock-req-001',
  model_version: 'v1.0.0',
  inference_time_ms: 87,
  incident_prediction: {
    will_happen: true,
    probability: 0.73,
    confidence_level: 'high',
    confidence_label: 'Высокая',
  },
  attack_time_prediction: {
    time_bucket: 'day',
    time_bucket_label: 'День',
    probable_hour: 14,
    probable_day_of_week: 'Среда',
    probable_day_label: 'Будний день',
    probable_season: 'Лето',
  },
  threat_prediction: {
    primary: {
      threat_code: 'UBI.190',
      threat_name: 'Вредоносное ПО (Malware)',
      probability: 0.52,
    },
    top_3: [
      { threat_code: 'UBI.190', threat_name: 'Вредоносное ПО', probability: 0.52 },
      { threat_code: 'UBI.152', threat_name: 'Эксплуатация уязвимостей', probability: 0.47 },
      { threat_code: 'UBI.163', threat_name: 'Социальная инженерия', probability: 0.41 },
    ],
  },
  target_object_prediction: {
    primary: { object_code: 'BIOS', object_name: 'BIOS/UEFI', probability: 0.62 },
    top_3: [
      { object_code: 'BIOS', object_name: 'BIOS/UEFI', probability: 0.62 },
      { object_code: 'SERVER', object_name: 'Сервер', probability: 0.21 },
      { object_code: 'NETWORK', object_name: 'Сеть', probability: 0.09 },
    ],
  },
  vulnerability_assessment: {
    level: 'critical',
    level_label: 'Критический',
    score: 0.87,
    factors: ['Высокая доля успешных атак', 'Большая поверхность атаки', 'Регион с повышенной активностью'],
  },
  recommendations: [
    {
      rec_code: 'REC-BIOS-001',
      title: 'Обновить прошивки BIOS/UEFI',
      description: 'Обновить прошивки BIOS/UEFI на всех хостах',
      priority: 1,
      priority_label: 'Критический',
      related_threat: 'UBI.190',
    },
    {
      rec_code: 'REC-NET-002',
      title: 'Усилить сегментацию сети',
      description: 'Усилить сегментацию сети',
      priority: 2,
      priority_label: 'Высокий',
      related_threat: 'UBI.152',
    },
  ],
  explanations: {
    method: 'SHAP',
    top_features: [
      { feature: 'host_count', display_name: 'Количество хостов', impact: 0.32, direction: 'increases_risk', explanation: 'Большое количество хостов увеличивает риск' },
      { feature: 'enterprise_type_Медицина', display_name: 'Отрасль: Медицина', impact: 0.21, direction: 'increases_risk', explanation: 'Медицинские учреждения чаще подвергаются атакам' },
    ],
  },
  business_impact: {
    estimated_damage_rub: 15200000,
    damage_label: '~15.2 млн ₽',
    calculation_basis: 'По отрасли и количеству хостов',
  },
};

export const mockThreatsCatalog: ThreatCatalogItem[] = [
  { ubi_code: 'UBI.190', name: 'Вредоносное ПО', description: 'Распространение вредоносного ПО, включая вирусы, трояны и шифровальщики.' },
  { ubi_code: 'UBI.152', name: 'Эксплуатация уязвимостей', description: 'Использование известных уязвимостей в ПО и оборудовании.' },
  { ubi_code: 'UBI.163', name: 'Социальная инженерия', description: 'Фишинг, обман пользователей для получения доступа.' },
];