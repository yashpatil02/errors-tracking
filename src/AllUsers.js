// --- AllUsers.js (New All Users Section) ---
import React, { useState, useEffect } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from './firebaseConfig';
import './AdminPanel.css';
import { FaEye, FaEdit, FaTrash } from 'react-icons/fa';

const AllUsers = () => {
  const [users, setUsers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const fetchUsers = async () => {
      const snap = await getDocs(collection(db, 'users'));
      const usersData = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setUsers(usersData);
    };
    fetchUsers();
  }, []);

  const getInitials = (name) => {
    const parts = name?.split(' ') || [];
    return (parts[0]?.[0] || '') + (parts[1]?.[0] || '');
  };

  const getLastLogin = (lastLogin) => {
    if (!lastLogin) return '—';
    const diff = Math.floor((Date.now() - lastLogin.toDate()) / 1000);
    if (diff < 60) return `${diff} sec ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)} min ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)} hr ago`;
    return `${Math.floor(diff / 86400)} days ago`;
  };

  const filteredUsers = users.filter(user =>
    user.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="user-panel">
      <div className="user-header">
        <h2>👥 User Management</h2>
        <div className="user-actions">
          <input
            type="text"
            placeholder="🔍 Search users..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <button className="btn export">⬇ Export</button>
          <button className="btn filter">⚙️ Filter</button>
          <button className="btn new-user">➕ Add New User</button>
        </div>
      </div>

      <div className="user-list">
        {filteredUsers.map((user, idx) => (
          <div className="user-card" key={idx}>
            <div className="user-info">
              <div className="user-avatar">{getInitials(user.name || user.email)}</div>
              <div className="user-details">
                <strong>{user.name || 'No Name'}</strong>
                <p>{user.email}</p>
                <div className="labels">
                  <span className={`label role ${user.role}`}>{user.role?.toUpperCase()}</span>
                  <span className={`label status ${user.status || 'active'}`}>{(user.status || 'active').toUpperCase()}</span>
                </div>
              </div>
            </div>
            <div className="user-meta">
              <p>Reports: {user.reportsCount || 0}</p>
              <p>Errors: {user.errorCount || 0}</p>
              <small>Last login: {getLastLogin(user.lastLogin)}</small>
            </div>
            <div className="user-tools">
              <button><FaEdit /></button>
              <button><FaEye /></button>
              <button><FaTrash /></button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AllUsers;
