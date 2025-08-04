import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth } from './firebaseConfig';
import './navbar.css';

const Navbar = ({ userMeta }) => {
  const navigate = useNavigate();
  const [showProfilePanel, setShowProfilePanel] = useState(false);
  const panelRef = useRef();

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target) && showProfilePanel) {
        setShowProfilePanel(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showProfilePanel]);

  if (!userMeta) return null;

  return (
    <>
      <nav className="qc-navbar">
        <div className="qc-brand">
          <div className="qc-icon">QC</div>
          <span>Smart Sports QC</span>
        </div>

        <div className="qc-actions">
          <div className="qc-links">
            <button onClick={() => navigate('/home')}>🏠 Dashboard</button>
            <button onClick={() => navigate('/analysts')}>👥 Analysts</button>
            {userMeta.role === 'admin' && (
              <button onClick={() => navigate('/admin')}>🛡️ Admin Panel</button>
            )}
          </div>
        </div>

        {/* Profile Button */}
        <div className="qc-profile-container">
          <button
            className="qc-profile-toggle"
            onClick={() => setShowProfilePanel(true)}
          >
            👤 {userMeta?.name?.split(' ')[0] || "Profile"}
          </button>
        </div>
      </nav>

      {/* Right Side Panel */}
      <div className={`profile-side-panel ${showProfilePanel ? 'open' : ''}`} ref={panelRef}>
        <div className="panel-header">
          <h2>👤 My Profile</h2>
          <button className="close-panel" onClick={() => setShowProfilePanel(false)}>✖</button>
        </div>
        <div className="panel-content">
          <p><strong>Name:</strong> {userMeta?.name || 'N/A'}</p>
          <p><strong>Email:</strong> {userMeta?.email}</p>
          <p><strong>Role:</strong> {userMeta?.role}</p>
        </div>
        <div className="panel-footer">
          <button
            className="logout-btn"
            onClick={() => {
              auth.signOut();
              window.location.href = "/";
            }}
          >
            🔓 Logout
          </button>
        </div>
      </div>
    </>
  );
};

export default Navbar;
