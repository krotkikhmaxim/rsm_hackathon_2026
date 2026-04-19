export interface PredictRequest {
  enterprise_code: string;
  date?: string;
  horizon?: '24h' | '7d' | '30d';
}

export interface ThreatResult {
  infrastructure_cluster?: string;
  threat_cluster: number | string;
  threatcode?: string;
  threatname: string;
  probability: number;
  description?: string;
  recommendation?: string;
  object?: string;
}

export interface MLServiceResponse {
  date: string;
  horizon: string;
  top_threat: ThreatResult;
  all_threats: ThreatResult[];
  report_md: string;
}

export interface EnterpriseItem {
  enterprise_code: string;
  type: string;
  host_count: number;
  region: string;
}

export interface RecommendationItem {
  id: number;
  rec_code: string;
  title: string;
  description: string;
  priority: number;
  threatId: number;
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
  recommendations?: RecommendationItem[];
}

export interface PredictionLogItem {
  request_id: string;
  enterprise_code: string;
  predicted_threat: string;
  probability: number;
  horizon: string | null;
  targetDate: Date | null;
  createdAt: Date;
  predicted_cluster?: string | null;
  predicted_object?: string | null;
  report_md?: string | null;
  estimated_damage?: number | null;
  threat_details?: {
    code: string;
    name: string;
    cluster: string | null;
  };
}

export interface PredictResponse {
  request_id: string;
  top_threat: ThreatResult & {
    threatcode?: string;
    threatname: string;
  };
  all_threats: ThreatResult[];
  report_md: string;
  prediction_log?: {
    id: string;
    predicted_threat: string;
    predicted_cluster: string | null;
    probability: number;
    createdAt: Date;
  };
  enterprise: EnterpriseItem;
}

export interface AnalyticsSummary {
  total_predictions: number;
  avg_probability: number;
  total_enterprises: number;
  top_threats: Array<{
    threat_name: string;
    threat_code: string;
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