export const API_BASE = '/api/v1';

export const RISK_COLORS = {
  high: '#dc2626',
  medium: '#f59e0b',
  low: '#22c55e',
} as const;

export const RISK_LABELS = {
  high: 'Высокий',
  medium: 'Средний',
  low: 'Низкий',
} as const;

export function getRiskLevel(probability: number): 'high' | 'medium' | 'low' {
  if (probability >= 0.7) return 'high';
  if (probability >= 0.4) return 'medium';
  return 'low';
}

export function getRiskColor(probability: number): string {
  return RISK_COLORS[getRiskLevel(probability)];
}

export function formatProbability(probability: number): string {
  return `${(probability * 100).toFixed(1)}%`;
}

export const DEMO_ENTERPRISES = [
  { code: 'DEMO-01', label: 'DEMO-01 (Высокий риск)' },
  { code: 'DEMO-02', label: 'DEMO-02 (Средний риск)' },
  { code: 'DEMO-03', label: 'DEMO-03 (Низкий риск)' },
];
