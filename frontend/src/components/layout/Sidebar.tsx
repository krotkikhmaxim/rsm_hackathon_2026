import { Link } from "react-router-dom";

export const Sidebar = () => {
  return (
    <div style={{
      width: "220px",
      height: "100vh",
      background: "#1e293b",
      color: "white",
      padding: "20px"
    }}>
      <h2>Cyber ML</h2>

      <nav style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
        <Link to="/" style={{ color: "white" }}>Dashboard</Link>

        <Link to="/prediction" style={{ color: "white" }}>
          Prediction
        </Link>

        <Link to="/vulnerability" style={{ color: "white" }}>
          Vulnerability
        </Link>

        <Link to="/recommendations" style={{ color: "white" }}>
          Recommendations
        </Link>

        <Link to="/threats" style={{ color: "white" }}>
          Threat Catalog
        </Link>
      </nav>
    </div>
  );
};