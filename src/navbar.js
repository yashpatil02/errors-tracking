import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { auth } from "./firebaseConfig";
import "./navbar.css";

const Navbar = ({ userMeta }) => {
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  if (!userMeta) return null;

  const logout = () => {
    auth.signOut();
    window.location.href = "/";
  };

  // Get initials for avatar
  const getInitials = (name) => {
    if (!name) return "U";
    return name
      .split(" ")
      .map((n) => n[0].toUpperCase())
      .join("");
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
          {(userMeta.role === "admin" || userMeta.role === "qc-manager") && (
            <button onClick={() => navigate("/home")}>
              <i className="fas fa-home"></i> Dashboard
            </button>
          )}
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

        {/* Right: Profile Avatar (Desktop) */}
        <div className="nav-right desktop-only">
          <div
            className="profile-avatar"
            onClick={() => setProfileOpen(!profileOpen)}
          >
            {getInitials(userMeta.name)}
          </div>

          {profileOpen && (
            <div className="profile-dropdown">
              <div className="profile-info">
                <div className="profile-avatar big">
                  {getInitials(userMeta.name)}
                </div>
                <div>
                  <strong className="profile-name">{userMeta.name}</strong>
                  <p className="profile-email">{userMeta.email}</p>
                </div>
              </div>
              <hr />
              <button>
                <i className="fas fa-user"></i> Profile
              </button>
              <button>
                <i className="fas fa-cog"></i> Account Settings
              </button>
              <button>
                <i className="fas fa-paint-brush"></i> Theme
              </button>
              <hr />
              <button className="logout-btn" onClick={logout}>
                <i className="fas fa-sign-out-alt"></i> Log out
              </button>
            </div>
          )}

        </div>


        {/* Mobile Hamburger */}
        <button
          className="hamburger-btn mobile-only"
          onClick={() => setMenuOpen(true)}
        >
          <i className="fas fa-bars"></i>
        </button>
      </nav>

      {/* Mobile Menu */}
      {/* Mobile Menu */}
      {menuOpen && <div className="overlay" onClick={() => setMenuOpen(false)}></div>}
      <div className={`mobile-menu ${menuOpen ? "open" : ""}`}>
        <button className="close-menu" onClick={() => setMenuOpen(false)}>✖</button>

        {/* 🔹 Scrollable Links */}
        <div className="mobile-links">
          {(userMeta.role === "admin" || userMeta.role === "qc-manager") && (
            <button onClick={() => { navigate("/home"); setMenuOpen(false); }}>
              <i className="fas fa-home"></i> Dashboard
            </button>
          )}
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
        </div>

        {/* 🔹 Fixed Bottom Profile */}
        <div className="mobile-profile">
          <div
            className="profile-summary"
            onClick={() => setProfileOpen(!profileOpen)}
          >
            <div className="profile-avatar small">{getInitials(userMeta.name)}</div>
            <div className="profile-texts">
              <strong>{userMeta.name}</strong>
              <p>{userMeta.email}</p>
            </div>
            <i className={`fas fa-chevron-up arrow ${profileOpen ? "open" : ""}`}></i>
          </div>

          {profileOpen && (
            <div className="mobile-profile-dropdown">
              <button><i className="fas fa-user"></i> Profile</button>
              <button><i className="fas fa-cog"></i> Account Settings</button>
              <button><i className="fas fa-paint-brush"></i> Theme</button>
              <hr />
              <button className="logout-btn" onClick={logout}>
                <i className="fas fa-sign-out-alt"></i> Log out
              </button>
            </div>
          )}
        </div>
      </div>


    </>
  );
};

export default Navbar;
