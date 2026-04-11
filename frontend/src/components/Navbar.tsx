import { Link } from "react-router-dom";

export const Navbar = () => {
  return (
    <nav className="navbar">

      <Link to="/">
        Dashboard
      </Link>

      <Link to="/prediction">
        Prediction
      </Link>

    </nav>
  );
};