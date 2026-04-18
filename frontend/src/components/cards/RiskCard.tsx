// components/cards/RiskCard.tsx
import { getRiskColor } from '../../utils/riskColors';

interface RiskCardProps {
  level: 'low' | 'medium' | 'high' | 'critical';
  score: number;
  factors?: string[];
  className?: string;
}

export default function RiskCard({ level, score, factors = [], className = '' }: RiskCardProps) {
  const colors = getRiskColor(level);
  const levelLabels = {
    low: 'Низкий',
    medium: 'Средний',
    high: 'Высокий',
    critical: 'Критический',
  };

  return (
    <div className={`bg-[#0f172a] rounded-lg shadow p-4 border border-white/5 ${className}`}>
      <div className="flex items-center justify-between mb-2">
        <h4 className="font-semibold text-lg text-gray-200">Уровень уязвимости</h4>
        <span
          className="px-3 py-1 rounded-full text-sm font-medium"
          style={{ backgroundColor: colors.bg, color: colors.text }}
        >
          {levelLabels[level]}
        </span>
      </div>
      <div className="mb-3">
        <div className="flex items-baseline">
          <span className="text-3xl font-bold" style={{ color: colors.text }}>
            {score.toFixed(2)}
          </span>
          <span className="text-gray-400 ml-2">/ 1.00</span>
        </div>
        <div className="w-full bg-gray-700 rounded-full h-2 mt-2">
          <div
            className="h-2 rounded-full"
            style={{
              width: `${score * 100}%`,
              backgroundColor: colors.border,
            }}
          />
        </div>
      </div>
      {factors.length > 0 && (
        <div>
          <p className="text-sm font-medium text-gray-300 mb-1">Факторы риска:</p>
          <ul className="text-sm text-gray-400 space-y-1">
            {factors.map((factor, idx) => (
              <li key={idx} className="flex items-start">
                <span className="mr-2">•</span>
                {factor}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}