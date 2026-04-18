// services/api.ts
import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import type {
  AnalyticsSummaryResponse,
  TimeseriesResponse,
  RegionsResponse,
  EnterpriseTypesResponse,
} from '../types/analytics';
import type { PredictRequest, PredictResponse } from '../types/prediction';
import type { ThreatCatalogItem, ThreatDetail } from '../types/threat';
import type { RecommendationItem } from '../types/recommendation';
// Вместо импорта из '../types/scenario'
// Определите тип прямо в api.ts
interface DemoScenario {
  id: string;
  name: string;
  description: string;
  form_data: {
    enterprise_type: string;
    region: string;
    host_count: number;
  };
}

export const api = createApi({
  reducerPath: 'api',
  baseQuery: fetchBaseQuery({ baseUrl: '/api/v1' }),
  tagTypes: ['Threats', 'Recommendations'],
  endpoints: (builder) => ({
    // Health check
    getHealth: builder.query<{ status: string; database: string; models_loaded: number }, void>({
      query: () => '/health',
    }),

    // Analytics
    getAnalyticsSummary: builder.query<AnalyticsSummaryResponse, void>({
      query: () => '/analytics/summary',
    }),
    getAnalyticsTimeseries: builder.query<
      TimeseriesResponse,
      { start?: string; end?: string } | void
    >({
      query: (params) => ({
        url: '/analytics/timeseries',
        params: params || {},
      }),
    }),
    getAnalyticsRegions: builder.query<RegionsResponse, void>({
      query: () => '/analytics/regions',
    }),
    getAnalyticsEnterpriseTypes: builder.query<EnterpriseTypesResponse, void>({
      query: () => '/analytics/enterprise-types',
    }),

    // Prediction
    predict: builder.mutation<PredictResponse, PredictRequest>({
      query: (body) => ({
        url: '/predict',
        method: 'POST',
        body,
      }),
    }),

    // Threats catalog
    getThreats: builder.query<
      ThreatCatalogItem[],
      { search?: string; page?: number; limit?: number } | void
    >({
      query: (params) => ({ url: '/threats', params: params || {} }),
      providesTags: ['Threats'],
    }),
    getThreatByCode: builder.query<ThreatDetail, string>({
      query: (code) => `/threats/${code}`,
      providesTags: (_result, _error, code) => [{ type: 'Threats', id: code }],
    }),

    // Recommendations
    getRecommendations: builder.query<
      RecommendationItem[],
      { threat_code?: string; vuln_level?: string; target_object?: string } | void
    >({
      query: (params) => ({ url: '/recommendations', params: params || {} }),
      providesTags: ['Recommendations'],
    }),

    // Demo scenarios
    getDemoScenarios: builder.query<DemoScenario[], void>({
      query: () => '/scenarios/demo',
    }),
    runDemoScenario: builder.mutation<PredictResponse, string>({
      query: (id) => ({
        url: `/scenarios/demo/${id}/run`,
        method: 'POST',
      }),
    }),
  }),
});

export const {
  useGetHealthQuery,
  useGetAnalyticsSummaryQuery,
  useGetAnalyticsTimeseriesQuery,
  useGetAnalyticsRegionsQuery,
  useGetAnalyticsEnterpriseTypesQuery,
  usePredictMutation,
  useGetThreatsQuery,
  useGetThreatByCodeQuery,
  useGetRecommendationsQuery,
  useGetDemoScenariosQuery,
  useRunDemoScenarioMutation,
} = api;