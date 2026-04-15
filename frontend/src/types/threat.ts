import type { RecommendationItem } from './recommendation';

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
