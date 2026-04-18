// types/recommendation.ts

export interface RecommendationItem {
  rec_code: string;
  title: string;
  description: string;
  priority: number;
  priority_label: string;
  related_threat: string | null;
  target_object?: string;
  vuln_level?: 'low' | 'medium' | 'high' | 'critical';
}