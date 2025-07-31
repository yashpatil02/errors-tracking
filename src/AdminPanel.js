import React, { useState, useEffect } from 'react';
import { db } from './firebaseConfig';
import {
  collection,
  onSnapshot,
  updateDoc,
  doc,
  deleteDoc,
  getDocs
} from 'firebase/firestore';
import "./AdminPanel.css";
import Navbar from './navbar';

const AdminPanel = ({ userMeta }) => {
  const [reports, setReports] = useState([]);
  const [selectedAnalyst, setSelectedAnalyst] = useState('');
  const [editIndex, setEditIndex] = useState(null);
  const [editText, setEditText] = useState('');
  const [pendingAdmins, setPendingAdmins] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [activeTab, setActiveTab] = useState("dashboard");
  const [selectedMatchId, setSelectedMatchId] = useState(null);
  const [matchSearchTerm, setMatchSearchTerm] = useState('');
  const [selectedDate, setSelectedDate] = useState('');
  const admins = allUsers.filter(u => u.role === 'admin');
  const analysts = allUsers.filter(u => u.role === 'analyst');

  useEffect(() => {
    const fetchUsers = async () => {
      const snapshot = await getDocs(collection(db, 'users'));
      const users = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setAllUsers(users);
    };
    fetchUsers();
  }, []);

  useEffect(() => {
    const unsubscribeReports = onSnapshot(collection(db, 'reports'), (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setReports(data);
    });

    const fetchPendingAdmins = async () => {
      const snapshot = await getDocs(collection(db, 'adminRequests'));
      const requests = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setPendingAdmins(requests);
    };

    fetchPendingAdmins();
    return () => unsubscribeReports();
  }, []);

  const filteredReports = reports.filter(r => r.analystName === selectedAnalyst);

  const handleDeleteReport = async (reportId) => {
    await deleteDoc(doc(db, 'reports', reportId));
  };

  const handleDeleteError = async (reportId, index) => {
    const report = reports.find(r => r.id === reportId);
    const updatedErrors = [...report.errors];
    updatedErrors.splice(index, 1);
    await updateDoc(doc(db, 'reports', reportId), { errors: updatedErrors });
  };

  const handleSaveEdit = async (reportId, index) => {
    const report = reports.find(r => r.id === reportId);
    const updatedErrors = [...report.errors];
    updatedErrors[index].full = editText;
    await updateDoc(doc(db, 'reports', reportId), { errors: updatedErrors });
    setEditIndex(null);
  };

  const handleApproveAdmin = async (request) => {
    await updateDoc(doc(db, "users", request.uid), {
      role: "admin",
      approved: true
    });
    await deleteDoc(doc(db, "adminRequests", request.id));
    setPendingAdmins(prev => prev.filter(r => r.id !== request.id));
  };

  const handleRejectAdmin = async (request) => {
    await updateDoc(doc(db, "users", request.uid), {
      role: "analyst",
      approved: true
    });
    await deleteDoc(doc(db, "adminRequests", request.id));
    setPendingAdmins(prev => prev.filter(r => r.id !== request.id));
  };

  const promoteToAdmin = async (user) => {
    await updateDoc(doc(db, "users", user.uid), {
      role: "admin"
    });
    setAllUsers(prev => prev.map(u => u.uid === user.uid ? { ...u, role: "admin" } : u));
  };

  const demoteToAnalyst = async (user) => {
    await updateDoc(doc(db, "users", user.uid), {
      role: "analyst"
    });
    setAllUsers(prev => prev.map(u => u.uid === user.uid ? { ...u, role: "analyst" } : u));
  };

  const deleteAnalyst = async (user) => {
    await deleteDoc(doc(db, "users", user.uid));
    setAllUsers(prev => prev.filter(u => u.uid !== user.uid));
  };

  const analystMatches = reports
    .filter(r => r.analystName === selectedAnalyst)
    .filter(r =>
      r.matchName.toLowerCase().includes(matchSearchTerm.toLowerCase()) &&
      (selectedDate ? r.qcDate === selectedDate : true)
    );



  return (
    <>
      <Navbar userMeta={userMeta} />
      <div className="dashboard-layout">
        <div className="sidebar">
          <h3>📁 Menu</h3>
          <ul>
            <li className={activeTab === 'dashboard' ? 'active' : ''} onClick={() => setActiveTab('dashboard')}>📊 Reports</li>
            <li className={activeTab === 'admins' ? 'active' : ''} onClick={() => setActiveTab('admins')}>👑 All Admins</li>
            <li className={activeTab === 'analysts' ? 'active' : ''} onClick={() => setActiveTab('analysts')}>👥 All Analysts</li>
            <li className={activeTab === 'requests' ? 'active' : ''} onClick={() => setActiveTab('requests')}>📥 Requests</li>

          </ul>
        </div>

        <div className="admin-panel">
          <h2>🛡️ Admin Dashboard</h2>

          {activeTab === 'dashboard' && (
            <>

              <hr />

              <section className="report-section">
                <h3>📊 Error Reports</h3>
                <select
                  value={selectedAnalyst}
                  onChange={(e) => {
                    setSelectedAnalyst(e.target.value);
                    setSelectedMatchId(null);
                  }}
                >
                  <option value="">Select Analyst</option>
                  {[...new Set(reports.map(r => r.analystName))].map((name, i) => (
                    <option key={i} value={name}>{name}</option>
                  ))}
                </select>

                {selectedAnalyst && (
                  <div className="report-body">
                    {/* Right side: Match Filter */}
                    <div className="match-filter-panel">
                      <input
                        type="text"
                        placeholder="🔍 Search match name"
                        value={matchSearchTerm}
                        onChange={(e) => setMatchSearchTerm(e.target.value)}
                      />

                      <input
                        type="date"
                        value={selectedDate}
                        onChange={(e) => setSelectedDate(e.target.value)}
                      />

                      <ul className="match-list">
                        {analystMatches.map((match) => (
                          <li
                            key={match.id}
                            className={`match-list-item ${selectedMatchId === match.id ? 'selected' : ''}`}
                            onClick={() => setSelectedMatchId(match.id)}
                          >
                            {match.matchName} <br />
                            <small>📅 {match.qcDate}</small>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Left side: Selected Match Error Details */}
                    <div className="match-error-panel">
                      {analystMatches.filter(r => r.id === selectedMatchId).map((report) => (
                        <div key={report.id} className="report-card">
                          <div className="report-header">
                            <h4>{report.matchName} ({report.qcDate})</h4>
                            <button className="delete-match-btn" onClick={() => handleDeleteReport(report.id)}>🗑️ Delete Match</button>
                          </div>

                          <ul className="error-list">
                            {report.errors?.map((err, idx) => (
                              <li key={idx} className="error-item">
                                {editIndex === idx ? (
                                  <>
                                    <input
                                      value={editText}
                                      onChange={(e) => setEditText(e.target.value)}
                                      className="error-input"
                                    />
                                    <div className="error-actions">
                                      <button className="icon-btn save" onClick={() => handleSaveEdit(report.id, idx)}>💾</button>
                                    </div>
                                  </>
                                ) : (
                                  <>
                                    <span className="error-text">{err.full}</span>
                                    <div className="error-actions">
                                      <button className="icon-btn edit" onClick={() => { setEditIndex(idx); setEditText(err.full); }}>✏️</button>
                                      <button className="icon-btn delete" onClick={() => handleDeleteError(report.id, idx)}>🗑️</button>
                                    </div>
                                  </>
                                )}
                              </li>
                            ))}
                          </ul>
                        </div>
                      ))}

                      {!selectedMatchId && <p>⬅️ Select a match to view its errors</p>}
                    </div>
                  </div>
                )}
              </section>


            </>
          )}

 {activeTab === 'requests' && (
                <section className="access-section">
                  <h3>📥 Pending Admin Requests</h3>
                  {pendingAdmins.length === 0 ? (
                    <p>No pending admin requests</p>
                  ) : (
                    pendingAdmins.map((req) => (
                      <div key={req.id} className="access-card">
                        <p><strong>{req.email}</strong> requested admin access</p>
                        <div className="action-buttons">
                          <button className="approve-btn" onClick={() => handleApproveAdmin(req)}>✅ Approve</button>
                          <button className="reject-btn" onClick={() => handleRejectAdmin(req)}>❌ Reject</button>
                        </div>
                      </div>
                    ))
                  )}
                </section>
              )}

          {activeTab === 'admins' && (
            <>
              <h3>Admins</h3>
              {admins.map((user) => (
                <div key={user.uid} className="access-card">
                  <p><strong>{user.name || user.email}</strong> ({user.email})</p>
                  <button className="reject-btn" onClick={() => demoteToAnalyst(user)}>🔄 Demote to Analyst</button>
                </div>
              ))}
            </>
          )}

          {activeTab === 'analysts' && (
            <>
              <h3> Analysts</h3>
              {analysts.map((user) => (
                <div key={user.uid} className="access-card">
                  <p><strong>{user.name || user.email}</strong> ({user.email})</p>
                  <div className="action-buttons">
                    <button className="approve-btn" onClick={() => promoteToAdmin(user)}>🔼 Promote to Admin</button>
                    <button className="reject-btn" onClick={() => deleteAnalyst(user)}>🗑️ Remove Analyst</button>
                  </div>
                </div>
              ))}
            </>
          )}
        </div>
      </div>
    </>
  );
};

export default AdminPanel;