// components/charts/ShapWaterfall.tsx
import type { FeatureExplanation } from '../../types/prediction';

interface ShapWaterfallProps {
  features: FeatureExplanation[];
  className?: string;
}

export const ShapWaterfall = ({ features, className = '' }: ShapWaterfallProps) => {
  if (!features || features.length === 0) {
    return <div className="p-4 text-gray-400">Нет данных SHAP</div>;
  }

  // Сортируем по абсолютному влиянию
  const sorted = [...features].sort((a, b) => Math.abs(b.impact) - Math.abs(a.impact));

  return (
    <div className={`bg-[#0f172a] rounded-lg shadow p-4 border border-white/5 ${className}`}>
      <h3 className="text-lg font-semibold mb-3 text-gray-200">Объяснение прогноза (SHAP)</h3>
      <div className="space-y-3">
        {sorted.map((feature, idx) => {
          const isPositive = feature.impact > 0;
          const barColor = isPositive ? '#ef4444' : '#22c55e';
          const percent = Math.abs(feature.impact) * 100;

          return (
            <div key={idx}>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-300">{feature.display_name}</span>
                <span className={isPositive ? 'text-red-400' : 'text-green-400'}>
                  {isPositive ? '+' : '-'}{percent.toFixed(1)}%
                </span>
              </div>
              <div className="w-full bg-gray-700 rounded-full h-2">
                <div
                  className="h-2 rounded-full"
                  style={{
                    width: `${Math.min(percent, 100)}%`,
                    backgroundColor: barColor,
                  }}
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">{feature.explanation}</p>
            </div>
          );
        })}
      </div>
      <p className="text-xs text-gray-500 mt-3">Метод: SHAP TreeExplainer</p>
    </div>
  );
};