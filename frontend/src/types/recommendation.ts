export interface RecommendationItem {
  id: number;
  rec_code: string;
  title: string;
  description: string;
  priority: number;
  threatId: number;
  threat?: {
    code: string;
    name: string;
    cluster: string | null;
  };
}
