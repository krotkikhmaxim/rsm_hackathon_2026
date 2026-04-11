// frontend/src/types/prediction.ts

export interface PredictRequest {
  enterprise_type: string;
  region: string;
  host_count: number;
  // В будущих этапах добавятся timestamp, etc.
}

export interface IncidentPrediction {
  will_happen: boolean;
  probability: number;
  confidence_level: 'low' | 'medium' | 'high';
  confidence_label: string;
}

export interface AttackTimePrediction {
  time_bucket: 'night' | 'morning' | 'day' | 'evening';
  time_bucket_label: string;
  probable_hour: number;
  probable_day_of_week: string;
  probable_day_label: string;
  probable_season: string;
}

export interface ThreatItem {
  threat_code: string;
  threat_name: string;
  probability: number;
}

export interface ThreatPrediction {
  primary: ThreatItem;
  top_3: ThreatItem[];
}

export interface TargetObjectItem {
  object_code: string;
  object_name: string;
  probability: number;
}

export interface TargetObjectPrediction {
  primary: TargetObjectItem;
  top_3: TargetObjectItem[];
}

export interface VulnerabilityAssessment {
  level: 'low' | 'medium' | 'high' | 'critical';
  level_label: string;
  score: number;
  factors: string[];
}

export interface FeatureExplanation {
  feature: string;
  display_name: string;
  impact: number;
  direction: 'increases_risk' | 'decreases_risk';
  explanation: string;
}

export interface Explanations {
  method: string;
  top_features: FeatureExplanation[];
}

export interface RecommendationItem {
  rec_code: string;
  title: string;
  description: string;
  priority: number;
  priority_label: string;
  related_threat: string | null;
}

export interface BusinessImpact {
  estimated_damage_rub: number;
  damage_label: string;
  calculation_basis?: string;
}

export interface PredictResponse {
  request_id: string;
  model_version: string;
  inference_time_ms: number;
  incident_prediction: IncidentPrediction;
  attack_time_prediction: AttackTimePrediction | null;
  threat_prediction: ThreatPrediction | null;
  target_object_prediction: TargetObjectPrediction | null;
  vulnerability_assessment: VulnerabilityAssessment | null;
  recommendations: RecommendationItem[];
  explanations: Explanations | null;
  business_impact: BusinessImpact | null;
}