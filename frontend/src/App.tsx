import { Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import PredictionPage from './pages/PredictionPage';
import DashboardPage from './pages/DashboardPage';
import ThreatCatalogPage from './pages/ThreatCatalogPage';
import RecommendationsPage from './pages/RecommendationsPage';
import VulnerabilityPage from './pages/VulnerabilityPage';

export default function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Navigate to="/predict" replace />} />
        <Route path="/predict" element={<PredictionPage />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/threats" element={<ThreatCatalogPage />} />
        <Route path="/recommendations" element={<RecommendationsPage />} />
        <Route path="/vulnerability" element={<VulnerabilityPage />} />
      </Routes>
    </Layout>
  );
}
