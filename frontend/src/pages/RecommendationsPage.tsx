import { Link } from "react-router-dom";

export const RecommendationsPage = () => {
  return (
    <div>

      <nav style={{ marginBottom: "20px" }}>
        <Link to="/">Dashboard | </Link>

        <Link to="/prediction">
          Prediction |
        </Link>

        <Link to="/vulnerability">
          Vulnerability |
        </Link>

        <Link to="/recommendations">
          Recommendations |
        </Link>

        <Link to="/threats">
          Threat Catalog
        </Link>
      </nav>

      <h1>Recommendations</h1>

    </div>
  );
};