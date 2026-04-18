// hooks/useDemo.ts
import { useGetDemoScenariosQuery, useRunDemoScenarioMutation } from '../services/api';
import { toast } from './useToast';
import type { PredictResponse } from '../types/prediction';

export function useDemoScenarios() {
  const { data, isLoading, error, refetch } = useGetDemoScenariosQuery(undefined);
  return { scenarios: data, isLoading, error, refetch };
}

export function useRunDemo() {
  const [runDemo, { isLoading }] = useRunDemoScenarioMutation();

  const executeDemo = async (scenarioId: string): Promise<PredictResponse | null> => {
    try {
      const result = await runDemo(scenarioId).unwrap();
      toast.success(`Демо-сценарий "${scenarioId}" выполнен`);
      return result;
    } catch (err) {
      toast.error('Ошибка выполнения демо-сценария');
      console.error(err);
      return null;
    }
  };

  return { executeDemo, isLoading };
}