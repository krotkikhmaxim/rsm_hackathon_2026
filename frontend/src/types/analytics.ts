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
  top_threats: Array<{
    threat_code: string;
    threat_name: string;
    count: number;
    success_rate: number;
  }>;
  top_regions: Array<{
    region: string;
    count: number;
    success_rate: number;
  }>;
  top_enterprise_types: Array<{
    enterprise_type: string;
    count: number;
    success_rate: number;
  }>;
  filters_applied: Record<string, string | null>;
}

export interface TimeseriesPoint {
  period: string;
  total: number;
  successful: number;
  failed: number;
}

export interface TimeseriesResponse {
  granularity: string;
  series: TimeseriesPoint[];
}

export type RegionsResponse = Array<{
  region: string;
  count: number;
  success_rate: number;
}>;

export type EnterpriseTypesResponse = Array<{
  enterprise_type: string;
  count: number;
  success_rate: number;
}>;