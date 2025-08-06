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
            <button onClick={() => navigate('/home')}><i className="fas fa-home"></i> Dashboard</button>
            <button onClick={() => navigate('/analysts')}><i className="fas fa-chart-line"></i> Analysts</button>
            
            {/* 🔥 NEW Heatmap Button */}
            <button onClick={() => navigate('/error-heatmap')}><i className="fas fa-th"></i> Heatmap</button>
            
            {userMeta.role === 'admin' && (
              <button onClick={() => navigate('/admin')}><i className="fas fa-shield-alt"></i> Admin Panel</button>
            )}
          </div>
        </div>

        <div className="qc-profile-container">
          <button className="qc-profile-toggle" onClick={() => setShowProfilePanel(true)}>
            <i className="fas fa-user-circle"></i> {userMeta?.name?.split(' ')[0] || "Profile"}
          </button>
        </div>
      </nav>

      {/* Right Side Profile Panel */}
      <div className={`profile-side-panel ${showProfilePanel ? 'open' : ''}`} ref={panelRef}>
        <div className="panel-header">
          <h2><i className="fas fa-user-circle"></i> My Profile</h2>
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
