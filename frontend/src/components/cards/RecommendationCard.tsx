// components/cards/RecommendationCard.tsx
import type { RecommendationItem } from '../../types/recommendation';

interface RecommendationCardProps {
  recommendation: RecommendationItem;
  compact?: boolean;
  className?: string;
}

export default function RecommendationCard({ recommendation, compact = false, className = '' }: RecommendationCardProps) {
  const priorityColors = {
    1: { bg: '#7F1D1D', text: '#FCA5A5', label: 'Критический' }, // darker bg for dark theme
    2: { bg: '#78350F', text: '#FDE68A', label: 'Высокий' },
    3: { bg: '#713F12', text: '#FEF08A', label: 'Средний' },
    4: { bg: '#064E3B', text: '#A7F3D0', label: 'Низкий' },
  };

  const priority = recommendation.priority as keyof typeof priorityColors;
  const colors = priorityColors[priority] || priorityColors[3];

  return (
    <div className={`bg-[#0f172a] rounded-lg shadow p-4 border border-white/5 ${className}`}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-mono text-gray-500">{recommendation.rec_code}</span>
            <span
              className="px-2 py-0.5 rounded text-xs font-medium"
              style={{ backgroundColor: colors.bg, color: colors.text }}
            >
              {colors.label}
            </span>
          </div>
          <h4 className="font-semibold text-lg text-gray-200 mb-1">{recommendation.title}</h4>
          {!compact && (
            <p className="text-gray-400 text-sm mb-2">{recommendation.description}</p>
          )}
          {recommendation.related_threat && (
            <p className="text-sm text-gray-500">
              Связано с угрозой:{' '}
              <span className="font-mono">{recommendation.related_threat}</span>
            </p>
          )}
          {recommendation.target_object && (
            <p className="text-sm text-gray-500">
              Объект воздействия: {recommendation.target_object}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}