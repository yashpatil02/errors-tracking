import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { auth } from "./firebaseConfig";
import "./navbar.css";

const Navbar = ({ userMeta }) => {
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  if (!userMeta) return null;

  const logout = () => {
    auth.signOut();
    window.location.href = "/";
  };

  return (
    <>
      <nav className="qc-navbar">
        {/* Left: Brand */}
        <div className="qc-brand">
          <div className="qc-icon">QC</div>
          <span>Smart Sports QC</span>
        </div>

        {/* Center: Desktop Links */}
        <div className="nav-links desktop-only">
          <button onClick={() => navigate("/home")}>
            <i className="fas fa-home"></i> Dashboard
          </button>
          <button onClick={() => navigate("/analysts")}>
            <i className="fas fa-chart-line"></i> Analysts
          </button>
          <button onClick={() => navigate("/error-heatmap")}>
            <i className="fas fa-th"></i> Heatmap
          </button>
          {userMeta.role === "admin" && (
            <button onClick={() => navigate("/admin")}>
              <i className="fas fa-shield-alt"></i> Admin Panel
            </button>
          )}
        </div>

        {/* Right: Desktop Logout & Mobile Hamburger */}
        <div className="desktop-only">
          <button className="logout-btn" onClick={logout}>
            🔓 Logout
          </button>
        </div>
        <button
          className="hamburger-btn mobile-only"
          onClick={() => setMenuOpen(true)}
        >
          <i className="fas fa-bars"></i>
        </button>
      </nav>

      {/* Mobile Menu */}
      {menuOpen && <div className="overlay" onClick={() => setMenuOpen(false)}></div>}
      <div className={`mobile-menu ${menuOpen ? "open" : ""}`}>
        <button className="close-menu" onClick={() => setMenuOpen(false)}>✖</button>
        <button onClick={() => { navigate("/home"); setMenuOpen(false); }}>
          <i className="fas fa-home"></i> Dashboard
        </button>
        <button onClick={() => { navigate("/analysts"); setMenuOpen(false); }}>
          <i className="fas fa-chart-line"></i> Analysts
        </button>
        <button onClick={() => { navigate("/error-heatmap"); setMenuOpen(false); }}>
          <i className="fas fa-th"></i> Heatmap
        </button>
        {userMeta.role === "admin" && (
          <button onClick={() => { navigate("/admin"); setMenuOpen(false); }}>
            <i className="fas fa-shield-alt"></i> Admin Panel
          </button>
        )}
        <button className="logout-btn" onClick={logout}>
          🔓 Logout
        </button>
      </div>
    </>
  );
};

export default Navbar;
