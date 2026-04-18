// types/analytics.ts

export interface AnalyticsSummaryResponse {
  total: {
    total_incidents: number;
    successful_incidents: number;
    success_rate: number;
    unique_threats: number;
    unique_regions: number;
    unique_enterprises: number;
    avg_host_count: number;
  };
  top_threats: TopThreat[];
  top_regions: TopRegion[];
  top_enterprise_types: TopEnterpriseType[];
  filters_applied: Record<string, string | null>;
}

export interface TopThreat {
  threat_code: string;
  threat_name: string;
  count: number;
  success_rate: number;
}

export interface TopRegion {
  region: string;
  count: number;
  success_rate: number;
}

export interface TopEnterpriseType {
  enterprise_type: string;
  count: number;
  success_rate: number;
}

export interface TimeseriesPoint {
  period: string;          // например "2025-01"
  total: number;
  successful: number;
  failed: number;
}

export interface TimeseriesResponse {
  granularity: string;     // "day", "month", etc.
  series: TimeseriesPoint[];
}

export type RegionsResponse = TopRegion[];

export type EnterpriseTypesResponse = TopEnterpriseType[];