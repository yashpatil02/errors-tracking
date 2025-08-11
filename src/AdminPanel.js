import React, { useState, useEffect } from 'react';
import { db } from './firebaseConfig';
import * as XLSX from "xlsx";
import ReviewedErrorReports from './ReviewedErrorReports';
import AnalystReviewPage from './AnalystReviewPage';

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
  const [recentActivities, setRecentActivities] = useState([]);
  const [showFilters, setShowFilters] = useState(false);
  const [filterRole, setFilterRole] = useState('');
  const [filterStatus, setFilterStatus] = useState('');



  const handleExport = () => {
    const exportData = allUsers.map((user) => {
      const userReports = reports.filter(r => r.analystName === user.name);
      const errorCount = userReports.reduce((sum, r) => sum + (r.errors?.length || 0), 0);

      return {
        Name: user.name || 'Unnamed',
        Email: user.email,
        Role: user.role,
        Status: user.active ? 'Active' : 'Inactive',
        Reports: userReports.length,
        Errors: errorCount,
        LastLogin: user.lastLogin || 'N/A',
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Users");

    XLSX.writeFile(workbook, "All_Users_Export.xlsx");
  };

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

  useEffect(() => {
    const unsubscribeReports = onSnapshot(collection(db, 'reports'), async (snapshot) => {
      const reportData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setReports(reportData);

      const userSnap = await getDocs(collection(db, 'users'));
      const userData = userSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      const activities = [];

      // Recent reports
      reportData.forEach(report => {
        if (report.createdAt) {
          activities.push({
            type: 'report',
            message: `${report.qcAnalystName} submitted an error report for ${report.analystName}`,
            time: report.createdAt.toDate()
          });
        }
      });

      // Recent users
      userData.forEach(user => {
        if (user.createdAt) {
          activities.push({
            type: 'user',
            message: `New user registered: ${user.name || user.email}`,
            time: user.createdAt.toDate()
          });
        }
      });

      // Sort by time descending
      activities.sort((a, b) => b.time - a.time);
      setRecentActivities(activities.slice(0, 5)); // only latest 5
    });

    return () => unsubscribeReports();
  }, []);

  const timeAgo = (date) => {
    const diff = Math.floor((new Date() - date) / 1000);
    if (diff < 60) return `${diff} sec ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)} min ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)} hr ago`;
    return `${Math.floor(diff / 86400)} days ago`;
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
  const totalErrors = reports.reduce((acc, r) => acc + (r.errors?.length || 0), 0);



  return (
    <>
      <Navbar userMeta={userMeta} />
      <div className="dashboard-layout">
        <div className="sidebar">
          <h3>📁 Menu</h3>
          <ul>
            <li className={activeTab === 'dashboard' ? 'active' : ''} onClick={() => setActiveTab('dashboard')}>📊 Reports</li>
            <li className={activeTab === 'analysts' ? 'active' : ''} onClick={() => setActiveTab('analysts')}>👥 All Analysts</li>
            <li className={activeTab === 'requests' ? 'active' : ''} onClick={() => setActiveTab('requests')}>📥 Requests</li>
            <li
              className={activeTab === 'errorReports' ? 'active' : ''}
              onClick={() => setActiveTab('errorReports')}
            >
              🧾 Error Reports
            </li>

          </ul>
        </div>

        <div className="admin-panel">
          <h2>🛡️ Admin Dashboard</h2>

          {activeTab === 'dashboard' && (
            <>

              <hr />
              {activeTab === 'dashboard' && (
                <>
                  <div className="dashboard-cards">
                    <div className="stat-card users">
                      <div className="stat-content">
                        <p>Total Users</p>
                        <h2>{allUsers.length}</h2>
                        <span>{allUsers.filter(u => u.active).length} active</span>
                      </div>
                      <div className="stat-icon">👥</div>
                    </div>

                    <div className="stat-card reports">
                      <div className="stat-content">
                        <p>Total Reports</p>
                        <h2>{reports.length}</h2>
                        <span>This month</span>
                      </div>
                      <div className="stat-icon">📄</div>
                    </div>

                    <div className="stat-card errors">
                      <div className="stat-content">
                        <p>Total Errors</p>
                        <h2>{totalErrors}</h2>
                        <span>Needs attention</span>
                      </div>
                      <div className="stat-icon">⚠️</div>
                    </div>

                    <div className="stat-card health">
                      <div className="stat-content">
                        <p>System Health</p>
                        <h2>98.5%</h2>
                        <span>Uptime</span>
                      </div>
                      <div className="stat-icon">📈</div>
                    </div>
                  </div>

                  <div className="recent-activity-box">
                    <h3>🕒 Recent Activity</h3>
                    <ul>
                      {recentActivities.length === 0 ? (
                        <li>No recent activity</li>
                      ) : (
                        recentActivities.map((act, i) => (
                          <li key={i} className={`activity ${act.type === 'report' ? 'success' : 'info'}`}>
                            {act.type === 'report' ? '✅' : '🆕'} {act.message}
                            <span>{timeAgo(act.time)}</span>
                          </li>
                        ))
                      )}
                    </ul>
                  </div>

                </>
              )}
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

          {activeTab === "errorReports" && (
            <ReviewedErrorReports
              setSelectedAnalyst={setSelectedAnalyst}
              setActiveTab={setActiveTab}
            />
          )}

          {activeTab === "analystReview" && (
            <AnalystReviewPage
              analystName={selectedAnalyst}
              onBack={() => setActiveTab("errorReports")}
            />
          )}

          {activeTab === 'analysts' && (
            <>
              <div className="users-header">
                <h3>User Management</h3>
                <div className="users-actions">
                  <input
                    type="text"
                    placeholder="🔍 Search users..."
                    onChange={(e) => setMatchSearchTerm(e.target.value)}
                  />
                  <div>
                    <button className="export-btn" onClick={handleExport}>⬇️ Export</button>
                    <button className="filter-btn" onClick={() => setShowFilters(!showFilters)}>⚙️ Filter</button>

                  </div>
                  {showFilters && (
                    <div className="filter-panel">
                      <select value={filterRole} onChange={(e) => setFilterRole(e.target.value)}>
                        <option value="">All Roles</option>
                        <option value="admin">Admin</option>
                        <option value="analyst">Analyst</option>
                      </select>

                    </div>
                  )}

                </div>
              </div>

              <div className="users-list">
                {allUsers
                  .filter(user =>
                    (user.name || '').toLowerCase().includes(matchSearchTerm.toLowerCase()) ||
                    (user.email || '').toLowerCase().includes(matchSearchTerm.toLowerCase())
                  )
                  .filter(user => !filterRole || user.role === filterRole)
                  .filter(user => !filterStatus || (filterStatus === 'active' ? user.active : !user.active))
                  .map((user, index) => (
                    <div key={user.uid || index} className="user-card">
                      <div className="user-left">
                        <div className="avatar-circle">{(user.name || user.email)[0]?.toUpperCase()}</div>
                        <div>
                          <p className="user-name">{user.name || "Unnamed User"}</p>
                          <p className="user-email">{user.email}</p>
                          <div className="tags">
                            <span className={`role-tag ${user.role?.toLowerCase()}`}>{user.role?.toUpperCase()}</span>
                            <span className={`status-tag ${user.active ? "active" : "inactive"}`}>{user.active ? "ACTIVE" : "INACTIVE"}</span>
                          </div>
                        </div>
                      </div>

                      <div className="user-right">
                        <p>Reports: {reports.filter(r => r.analystName === user.name).length}</p>
                        <p>Errors: {
                          reports
                            .filter(r => r.analystName === user.name)
                            .reduce((sum, r) => sum + (r.errors?.length || 0), 0)
                        }</p>
                        <p className="last-login">Last login: {user.lastLogin || "N/A"}</p>

                        <div className="user-actions">
                          <button title="Edit"><i className="fas fa-edit"></i> ✏️</button>
                          <button title="View"><i className="fas fa-eye"></i> 👁️</button>
                          <button title="Delete" onClick={() => deleteAnalyst(user)}><i className="fas fa-trash"></i> 🗑️</button>
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            </>
          )}

        </div>
      </div>
    </>
  );
};

export default AdminPanel;