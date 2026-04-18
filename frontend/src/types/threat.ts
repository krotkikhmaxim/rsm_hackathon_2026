// types/threat.ts

export interface ThreatCatalogItem {
  ubi_code: string;
  name: string;
  description?: string;
}

export interface ThreatDetail extends ThreatCatalogItem {
  incident_stats: {
    total: number;
    successful: number;
    success_rate: number;
  };
  related_recommendations: Array<{
    rec_code: string;
    title: string;
  }>;
}