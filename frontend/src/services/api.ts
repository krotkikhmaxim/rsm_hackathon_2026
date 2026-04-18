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

// Временный тип для DemoScenario (если файл scenario.ts не найден)
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

// Импорт моков – убедитесь, что файл mocks/data.ts существует
import {
  mockSummary,
  mockTimeseries,
  mockRegions,
  mockPredictResponse,
  mockThreatsCatalog,
} from '../mocks/data';

const USE_MOCKS = import.meta.env.VITE_USE_MOCKS === 'true';

const customBaseQuery: ReturnType<typeof fetchBaseQuery> = async (args, api, extraOptions) => {
  if (USE_MOCKS) {
    const url = typeof args === 'string' ? args : args.url;
    const method = typeof args === 'string' ? 'GET' : args.method || 'GET';

    // Имитация задержки сети
    await new Promise(resolve => setTimeout(resolve, 200));

    // Мокирование запросов
    if (url.includes('/analytics/summary')) return { data: mockSummary };
    if (url.includes('/analytics/timeseries')) return { data: mockTimeseries };
    if (url.includes('/analytics/regions')) return { data: mockRegions };
    if (url.includes('/analytics/enterprise-types')) return { data: [] };
    if (url.includes('/predict') && method === 'POST') return { data: mockPredictResponse };
    if (url.includes('/threats')) {
      if (url.match(/\/threats\/\w+/)) {
        // Детальная угроза
        return { data: { ...mockThreatsCatalog[0], incident_stats: { total: 10, successful: 4, success_rate: 0.4 }, related_recommendations: [] } };
      }
      return { data: mockThreatsCatalog };
    }
    if (url.includes('/recommendations')) return { data: mockPredictResponse.recommendations };
    if (url.includes('/scenarios/demo')) return { data: [] };
    if (url.includes('/health')) return { data: { status: 'ok', database: 'mock', models_loaded: 1 } };

    return { error: { status: 404, data: 'Not found in mocks' } };
  }

  // Реальный запрос
  const baseQuery = fetchBaseQuery({ baseUrl: '/api/v1' });
  return baseQuery(args, api, extraOptions);
};

export const api = createApi({
  reducerPath: 'api',
  baseQuery: customBaseQuery,
  tagTypes: ['Threats', 'Recommendations'],
  endpoints: (builder) => ({
    getHealth: builder.query<{ status: string; database: string; models_loaded: number }, void>({
      query: () => '/health',
    }),
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
    predict: builder.mutation<PredictResponse, PredictRequest>({
      query: (body) => ({
        url: '/predict',
        method: 'POST',
        body,
      }),
    }),
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
    getRecommendations: builder.query<
      RecommendationItem[],
      { threat_code?: string; vuln_level?: string; target_object?: string } | void
    >({
      query: (params) => ({ url: '/recommendations', params: params || {} }),
      providesTags: ['Recommendations'],
    }),
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