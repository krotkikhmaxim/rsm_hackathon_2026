export interface ThreatResult {
  infrastructure_cluster: string;
  threat_cluster: number;
  threatname: string;
  probability: number;
  description: string;
  recommendation: string;
}

export interface PredictRequest {
  enterprise_code: string;
  date: string;          // YYYY-MM-DD
  horizon: '24h' | '7d';
}

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

export interface PredictionLogItem {
  request_id: string;
  enterprise_code: string;
  predicted_threat: string;
  probability: number;
  horizon: string | null;
  prediction_date: string | null;
  createdAt: string;
}
