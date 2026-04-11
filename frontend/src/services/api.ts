import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";

export const api = createApi({
  reducerPath: "api",
  baseQuery: fetchBaseQuery({ baseUrl: "/api/v1" }),
  endpoints: (builder) => ({
    getHealth: builder.query({
      query: () => "/health",
    }),
    getAnalyticsSummary: builder.query({
      query: () => "/analytics/summary",
    }),
    predict: builder.mutation({
      query: (body) => ({
        url: "/predict",
        method: "POST",
        body,
      }),
    }),
    getThreats: builder.query({
      query: () => "/threats",
    }),
  }),
});

export const {
  useGetHealthQuery,
  useGetAnalyticsSummaryQuery,
  usePredictMutation,
  useGetThreatsQuery,
} = api;