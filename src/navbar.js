// navbar.js
import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth } from './firebaseConfig';
import './navbar.css';

const Navbar = ({ userMeta }) => {
  const navigate = useNavigate();
    const [showProfile, setShowProfile] = useState(false);
  const profileRef = useRef();


    useEffect(() => {
    const handleClickOutside = (e) => {
      if (profileRef.current && !profileRef.current.contains(e.target)) {
        setShowProfile(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Step 1: wait until userMeta is loaded
  if (!userMeta) return null; // or return a loading UI
console.log("Navbar loaded with userMeta:", userMeta);

  return (
    <nav className="qc-navbar">
      <div className="qc-brand">
        <div className="qc-icon">QC</div>
        <span>Smart Sports QC</span>
      </div>
      <div className="qc-actions">
        {/* <button className="qc-submit" onClick={() => navigate('/home')}>Submit Report</button> */}
        <div className="qc-links">
          <button onClick={() => navigate('/home')}>🏠 Dashboard</button>
          <button onClick={() => navigate('/analysts')}>👥 Analysts</button>

          {/* ✅ Step 2: role-based conditional rendering */}
          {userMeta.role === 'admin' && (
            <button onClick={() => navigate('/admin')}>🛡️ Admin Panel</button>
          )}

          {/* <button onClick={() => navigate(0)}>🔁</button> */}
        </div>
      </div>
      
  {/* 👤 Profile */}
        <div className="qc-profile-container" ref={profileRef}>
          <button className="qc-profile-toggle" onClick={() => setShowProfile(prev => !prev)}>
            👤 {userMeta?.name?.split(' ')[0] || "Profile"} ▾
          </button>

          {showProfile && (
            <div className="qc-profile-popup">
              <h4>👤 My Profile</h4>
              <p><strong>Name:</strong> {userMeta?.name || 'N/A'}</p>
              <p><strong>Email:</strong> {userMeta?.email}</p>
              <p><strong>Role:</strong> {userMeta?.role}</p>
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
          )}
        </div>
    

    </nav>
    
  );
};

export default Navbar;
