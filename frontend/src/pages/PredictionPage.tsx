// pages/PredictionPage.tsx
import { useState } from 'react';
import PredictionForm from '../components/forms/PredictionForm';
import { usePredictMutation } from '../services/api';
import type { PredictRequest, PredictResponse } from '../types/prediction';

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
    <div className="p-4">
      <h2 className="text-2xl font-bold mb-4">Прогнозирование киберугроз</h2>
      <PredictionForm onSubmit={handlePredict} isLoading={isLoading} />

      {result && (
        <div className="mt-6 space-y-4">
          <h3 className="text-xl font-semibold">Результаты прогноза</h3>

          {/* Главная угроза */}
          {result.threat_prediction?.primary && (
            <div className="bg-white rounded-lg shadow p-4">
              <h4 className="font-bold text-lg">Главная угроза</h4>
              <p>
                {result.threat_prediction.primary.threat_name} —{' '}
                {(result.threat_prediction.primary.probability * 100).toFixed(1)}%
              </p>
            </div>
          )}

          {/* Список угроз */}
          {result.threat_prediction?.top_3 && (
            <div className="bg-white rounded-lg shadow p-4">
              <h4 className="font-bold text-lg mb-2">Все угрозы</h4>
              <ul className="space-y-1">
                {result.threat_prediction.top_3.map((threat, idx) => (
                  <li key={idx} className="flex justify-between">
                    <span>{threat.threat_name}</span>
                    <span className="font-medium">
                      {(threat.probability * 100).toFixed(1)}%
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Рекомендации */}
          {result.recommendations?.length > 0 && (
            <div className="bg-blue-50 rounded-lg p-4">
              <h4 className="font-bold text-lg mb-2">Рекомендации</h4>
              <ul className="list-disc list-inside">
                {result.recommendations.map((rec) => (
                  <li key={rec.rec_code}>{rec.description}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}