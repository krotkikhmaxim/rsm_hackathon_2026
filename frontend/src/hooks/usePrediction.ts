// hooks/usePrediction.ts
import { usePredictMutation } from '../services/api';
import { toast } from './useToast';
import type { PredictRequest, PredictResponse } from '../types/prediction';

export function usePrediction() {
  const [predict, { isLoading, error, reset }] = usePredictMutation();

  const makePrediction = async (request: PredictRequest): Promise<PredictResponse | null> => {
    try {
      const result = await predict(request).unwrap();
      toast.success('Прогноз успешно выполнен');
      return result;
    } catch (err) {
      toast.error('Ошибка при выполнении прогноза');
      console.error(err);
      return null;
    }
  };

  return {
    makePrediction,
    isLoading,
    error,
    reset,
  };
}