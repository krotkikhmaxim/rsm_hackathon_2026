// app/router.tsx
import { createBrowserRouter } from 'react-router-dom';
import MainLayout from '../components/layout/MainLayout';
import DashboardPage from '../pages/DashboardPage';
import PredictionPage from '../pages/PredictionPage';
import VulnerabilityPage from '../pages/VulnerabilityPage';
import { RecommendationsPage } from '../pages/RecommendationsPage';
import ThreatCatalogPage from '../pages/ThreatCatalogPage';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <MainLayout />,
    children: [
      { index: true, element: <DashboardPage /> },
      { path: 'predict', element: <PredictionPage /> },
      { path: 'vulnerability', element: <VulnerabilityPage /> },
      { path: 'recommendations', element: <RecommendationsPage /> },
      { path: 'threats', element: <ThreatCatalogPage /> },
    ],
  },
]);