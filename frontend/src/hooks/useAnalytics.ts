// hooks/useAnalytics.ts
import { useMemo } from 'react';
import {
  useGetAnalyticsSummaryQuery,
  useGetAnalyticsTimeseriesQuery,
  useGetAnalyticsRegionsQuery,
  useGetAnalyticsEnterpriseTypesQuery,
} from '../services/api';

export function useAnalyticsSummary() {
  const { data, isLoading, error, refetch } = useGetAnalyticsSummaryQuery(undefined);
  return { data, isLoading, error, refetch };
}

export function useAnalyticsTimeseries(params?: { start?: string; end?: string }) {
  const { data, isLoading, error, refetch } = useGetAnalyticsTimeseriesQuery(params);
  return { data, isLoading, error, refetch };
}

export function useAnalyticsRegions() {
  const { data, isLoading, error, refetch } = useGetAnalyticsRegionsQuery(undefined);
  return { data, isLoading, error, refetch };
}

export function useAnalyticsEnterpriseTypes() {
  const { data, isLoading, error, refetch } = useGetAnalyticsEnterpriseTypesQuery(undefined);
  return { data, isLoading, error, refetch };
}

// Комбинированный хук для дашборда
export function useDashboardData() {
  const summary = useAnalyticsSummary();
  const timeseries = useAnalyticsTimeseries();
  const regions = useAnalyticsRegions();
  const enterpriseTypes = useAnalyticsEnterpriseTypes();

  const isLoading = summary.isLoading || timeseries.isLoading || regions.isLoading || enterpriseTypes.isLoading;
  const error = summary.error || timeseries.error || regions.error || enterpriseTypes.error;

  const refetchAll = () => {
    summary.refetch();
    timeseries.refetch();
    regions.refetch();
    enterpriseTypes.refetch();
  };

  return {
    summary: summary.data,
    timeseries: timeseries.data,
    regions: regions.data,
    enterpriseTypes: enterpriseTypes.data,
    isLoading,
    error,
    refetchAll,
  };
}