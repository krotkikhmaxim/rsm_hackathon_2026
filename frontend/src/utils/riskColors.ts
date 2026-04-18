export const RISK_COLORS = {
  critical: { bg: '#FEE2E2', text: '#991B1B', border: '#EF4444' },
  high: { bg: '#FEF3C7', text: '#92400E', border: '#F59E0B' },
  medium: { bg: '#FEF9C3', text: '#854D0E', border: '#EAB308' },
  low: { bg: '#DCFCE7', text: '#166534', border: '#22C55E' },
} as const;

export type RiskLevel = keyof typeof RISK_COLORS;

export function getRiskColor(level: RiskLevel | string) {
  return RISK_COLORS[level as RiskLevel] ?? RISK_COLORS.medium;
}

export function getRiskLevel(score: number): RiskLevel {
  if (score >= 0.75) return 'critical';
  if (score >= 0.5) return 'high';
  if (score >= 0.25) return 'medium';
  return 'low';
}