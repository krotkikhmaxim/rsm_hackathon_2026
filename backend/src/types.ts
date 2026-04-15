// ─── Запросы ───

export interface PredictRequest {
  enterprise_code: string;
  date: string;          // YYYY-MM-DD
  horizon: '24h' | '7d';
}

// ─── Ответы ML-сервиса ───

export interface ThreatResult {
  infrastructure_cluster: string;
  threat_cluster: number;
  threatname: string;
  probability: number;
  description: string;
  recommendation: string;
}

export interface MLServiceResponse {
  date: string;
  horizon: string;
  top_threat: ThreatResult;
  all_threats: ThreatResult[];
  report_md: string;
}

// ─── Ответы API ───

export interface PredictResponse {
  request_id: string;
  top_threat: ThreatResult;
  all_threats: ThreatResult[];
  report_md: string;
  enterprise: {
    enterprise_code: string;
    type: string;
    host_count: number;
    region: string;
  };
}

export interface AnalyticsSummary {
  total_predictions: number;
  avg_probability: number;
  total_enterprises: number;
  top_threats: Array<{
    threat_name: string;
    count: number;
    avg_probability: number;
  }>;
  by_horizon: Array<{
    horizon: string;
    count: number;
  }>;
  recent_predictions: Array<{
    request_id: string;
    enterprise_code: string;
    predicted_threat: string;
    probability: number;
    horizon: string | null;
    prediction_date: string | null;
    createdAt: Date;
  }>;
}

export interface ThreatItem {
  id: number;
  code: string;
  name: string;
  description: string | null;
  object: string | null;
  source: string | null;
  cia_flags: string | null;
  cluster: string | null;
  recommendations: RecommendationItem[];
}

export interface RecommendationItem {
  id: number;
  rec_code: string;
  title: string;
  description: string;
  priority: number;
  threatId: number;
}

export interface EnterpriseItem {
  enterprise_code: string;
  type: string;
  host_count: number;
  region: string;
}
