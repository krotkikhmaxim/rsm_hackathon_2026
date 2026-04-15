import type { PredictionLogItem } from './prediction';

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
  recent_predictions: PredictionLogItem[];
}
