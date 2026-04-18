export interface Threat {
  name: string;
  probability: number;
}

export interface PredictionResult {
  probability: number;
  threat_code: string;
  threat_name: string;
  days?: number;  // добавить как необязательное поле
}

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
// types/threat.ts

export interface ThreatItem {
  name: string;
  probability: number;
}

export interface PredictionResult {
  probability: number;
  threat_code: string;
  threat_name: string;
  threats: ThreatItem[];      // ← добавьте это поле
  days?: number;
}