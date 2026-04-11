import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Navbar } from "../components/Navbar";
import { DashboardPage } from "../pages/DashboardPage";
import { PredictionPage } from "../pages/PredictionPage";

export const AppRouter = () => {
  return (
    <BrowserRouter>

      <Navbar />

      <Routes>

        <Route
          path="/"
          element={<DashboardPage />}
        />

        <Route
          path="/prediction"
          element={<PredictionPage />}
        />

      </Routes>

    </BrowserRouter>
  );
};