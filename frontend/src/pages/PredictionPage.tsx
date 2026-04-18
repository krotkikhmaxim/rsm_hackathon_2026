// pages/PredictionPage.tsx
import { useState } from 'react';
import PredictionForm from '../components/forms/PredictionForm';
import { usePredictMutation } from '../services/api';
import type { PredictRequest, PredictResponse } from '../types/prediction';
import RiskCard from '../components/cards/RiskCard';
import RecommendationCard from '../components/cards/RecommendationCard';

import { ShapWaterfall } from '../components/charts/ShapWaterfall';

export default function PredictionPage() {
  const [predict, { isLoading }] = usePredictMutation();
  const [result, setResult] = useState<PredictResponse | null>(null);

  const handlePredict = async (formData: PredictRequest) => {
    try {
      const response = await predict(formData).unwrap();
      setResult(response);
    } catch (error) {
      console.error('Ошибка прогноза:', error);
    }
  };

  return (
    <div className="page">
      <h2 className="text-2xl font-bold mb-4">Прогнозирование киберугроз</h2>
      <PredictionForm onSubmit={handlePredict} isLoading={isLoading} />

      {result && (
        <div className="mt-6 space-y-6">
          {/* Общая информация */}
          <div className="bg-[#0f172a] rounded-lg shadow p-4 border border-white/5">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-semibold text-gray-200">Результаты прогноза</h3>
              <span className="text-sm text-gray-400">
                Время расчёта: {result.inference_time_ms} мс
              </span>
            </div>

            {/* Инцидент */}
            <div className="mt-3 flex items-center gap-4">
              <div>
                <p className="text-gray-400">Вероятность инцидента</p>
                <p className="text-3xl font-bold text-gray-100">
                  {(result.incident_prediction.probability * 100).toFixed(1)}%
                </p>
              </div>
              <div>
                <p className="text-gray-400">Уровень уверенности</p>
                <p className="text-lg text-gray-200">
                  {result.incident_prediction.confidence_label}
                </p>
              </div>
            </div>
          </div>
          {result.explanations?.top_features && (
      <ShapWaterfall features={result.explanations.top_features} />
        )}
          {/* Главная угроза и список угроз */}
          {result.threat_prediction && (
            <div className="bg-[#0f172a] rounded-lg shadow p-4 border border-white/5">
              <h4 className="font-bold text-lg text-gray-200 mb-3">Угрозы</h4>

              {/* Главная угроза */}
              {result.threat_prediction.primary && (
                <div className="mb-4 p-3 bg-red-950/30 border border-red-500/20 rounded">
                  <p className="text-sm text-gray-400">Основная угроза</p>
                  <p className="text-xl font-semibold text-gray-100">
                    {result.threat_prediction.primary.threat_name}
                  </p>
                  <p className="text-lg text-red-400">
                    {(result.threat_prediction.primary.probability * 100).toFixed(1)}%
                  </p>
                </div>
              )}

              {/* Топ-3 угроз */}
              {result.threat_prediction.top_3?.length > 0 && (
                <div>
                  <p className="text-sm text-gray-400 mb-2">Топ угроз</p>
                  <ul className="space-y-2">
                    {result.threat_prediction.top_3.map((threat, idx) => (
                      <li key={idx} className="flex justify-between items-center">
                        <span className="text-gray-300">{threat.threat_name}</span>
                        <span className="font-medium text-gray-200">
                          {(threat.probability * 100).toFixed(1)}%
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* Оценка уязвимости */}
          {result.vulnerability_assessment && (
            <RiskCard
              level={result.vulnerability_assessment.level}
              score={result.vulnerability_assessment.score}
              factors={result.vulnerability_assessment.factors}
            />
          )}

          {/* Рекомендации */}
          {result.recommendations?.length > 0 && (
            <div className="space-y-3">
              <h3 className="font-semibold text-lg text-gray-200">Рекомендации по защите</h3>
              {result.recommendations.map((rec) => (
                <RecommendationCard key={rec.rec_code} recommendation={rec} />
              ))}
            </div>
          )}

          {/* Бизнес-воздействие */}
          {result.business_impact && (
            <div className="bg-[#0f172a] rounded-lg shadow p-4 border border-white/5">
              <h4 className="font-bold text-lg text-gray-200 mb-2">Потенциальный ущерб</h4>
              <p className="text-2xl font-semibold text-red-400">
                {result.business_impact.damage_label}
              </p>
              {result.business_impact.calculation_basis && (
                <p className="text-sm text-gray-400 mt-1">
                  {result.business_impact.calculation_basis}
                </p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}