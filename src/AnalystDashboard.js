import React, { useEffect, useState } from 'react';
import './AnalystDashboard.css';
import Navbar from './navbar';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from './firebaseConfig';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import { useNavigate } from 'react-router-dom'; // Add at the top
import '@fortawesome/fontawesome-free/css/all.min.css';




const AnalystDashboard = ({ userMeta }) => {
  const [reports, setReports] = useState([]);
  const [expandedAnalyst, setExpandedAnalyst] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusMessage, setStatusMessage] = useState('');
  const navigate = useNavigate(); // Inside component
  const [selectedAnalyst, setSelectedAnalyst] = useState('All');



  const handleRefresh = () => {
    const unsubscribe = loadReports();
    setStatusMessage('Data refreshed!');
    setTimeout(() => setStatusMessage(''), 3000);
    return unsubscribe;
  };


  const toggleDropdown = (name) => {
    setExpandedAnalyst(prev => (prev === name ? null : name));
  };


  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'reports'), (snapshot) => {
      const fetchedReports = snapshot.docs.map(doc => doc.data());
      setReports(fetchedReports);
    });
    return () => unsubscribe();
  }, []);

  const totalReports = reports.length;
  const totalErrors = reports.reduce((sum, r) => sum + (r.errors?.length || 0), 0);
  const recentReports = [...reports].slice(-3).reverse();
  const totalAnalysts = new Set(reports.map(r => r.analystName)).size;
  // const uniqueAnalysts = [...new Set(reports.map(r => r.analystName))];
  const errorTypes = {};
  const gamesStats = {};
  const analystStats = {};
  const uniqueAnalysts = [...new Set(reports.map(r => r.analystName).filter(Boolean))]
    .filter(name => name.toLowerCase().includes(searchTerm.toLowerCase()));


  reports.forEach(report => {
    const name = report.analystName;
    if (!analystStats[name]) {
      analystStats[name] = { count: 0, errors: 0 };
    }
    analystStats[name].count += 1;
    analystStats[name].errors += report.errors?.length || 0;

    report.errors?.forEach(err => {
      errorTypes[err.type] = (errorTypes[err.type] || 0) + 1;
    });

    const game = report.gameName;
    if (!gamesStats[game]) {
      gamesStats[game] = { count: 0, errors: 0 };
    }
    gamesStats[game].count += 1;
    gamesStats[game].errors += report.errors?.length || 0;
  });

  const loadReports = () => {
    const unsubscribe = onSnapshot(collection(db, 'reports'), (snapshot) => {
      const fetchedReports = snapshot.docs.map(doc => doc.data());
      setReports(fetchedReports);
    });
    return unsubscribe;
  };

  useEffect(() => {
    const unsubscribe = loadReports();
    return () => unsubscribe();
  }, []);


  const exportToExcel = () => {
    const flattenedErrors = [];

    reports.forEach((r) => {
      if (r.errors && r.errors.length > 0) {
        r.errors.forEach((err) => {
          flattenedErrors.push({
            Analyst: r.analystName || "Unknown",
            Match: r.matchName,
            Game: r.gameName,
            QCDate: r.qcDate,
            Time: err.time || "N/A", // ⏱️ include timestamp
            ErrorDetail: err.full || "N/A"
          });
        });
      } else {
        flattenedErrors.push({
          Analyst: r.analystName || "Unknown",
          Match: r.matchName,
          Game: r.gameName,
          QCDate: r.qcDate,
          Time: "None",
          ErrorDetail: "No errors reported"
        });
      }
    });

    // Sort by QCDate + Time
    flattenedErrors.sort((a, b) => {
      const dateA = new Date(a.QCDate + 'T' + (a.Time || '00:00:00'));
      const dateB = new Date(b.QCDate + 'T' + (b.Time || '00:00:00'));
      return dateA - dateB;
    });

    const worksheet = XLSX.utils.json_to_sheet(flattenedErrors);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "DetailedErrors");

    const excelBuffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
    const fileData = new Blob([excelBuffer], { type: "application/octet-stream" });
    saveAs(fileData, "Errors_By_Time.xlsx");
  };




  return (
    <>
      <Navbar userMeta={userMeta} />
      <div className="dashboard-container">
        <div className="dashboard-header">
          <h1>Analyst Performance Center</h1>
          <p>Real-time performance tracking with Excel exports and error breakdowns.</p>
        </div>

<div className="dashboard-actions">
  <input
    type="text"
    placeholder="Search analyst..."
    value={searchTerm}
    onChange={(e) => setSearchTerm(e.target.value)}
  />
  <button onClick={exportToExcel}>
    <i className="fas fa-download"></i> Download Excel
  </button>
  <button onClick={handleRefresh}>
    <i className="fas fa-sync-alt"></i> Refresh
  </button>
</div>



        {statusMessage && (
          <div className="status-alert">
            {statusMessage}
          </div>
        )}

   <div className="dashboard-cards">
  <div className="card blue">
    <div className="card-content">
      <div className="card-text">
        <span className="label">Total Analysts</span>
        <span className="value">{totalAnalysts}</span>
      </div>
      <i className="fas fa-users icon"></i>
    </div>
  </div>

  <div className="card green">
    <div className="card-content">
      <div className="card-text">
        <span className="label">Total Reports</span>
        <span className="value">{totalReports}</span>
      </div>
      <i className="fas fa-file-alt icon"></i>
    </div>
  </div>

  <div className="card red">
    <div className="card-content">
      <div className="card-text">
        <span className="label">Total Errors</span>
        <span className="value">{totalErrors}</span>
      </div>
      <i className="fas fa-exclamation-triangle icon"></i>
    </div>
  </div>

  <div className="card purple">
    <div className="card-content">
      <div className="card-text">
        <span className="label">Avg Errors/Report</span>
        <span className="value">{totalReports ? (totalErrors / totalReports).toFixed(1) : 0}</span>
      </div>
      <i className="fas fa-chart-line icon"></i>
    </div>
  </div>
</div>



        <div className="analyst-section">
          <h2>🧑 Analysts Overview</h2>

          <ul className="analyst-list">
            {uniqueAnalysts.map((name, i) => {
              const analystReports = reports.filter(r => r.analystName === name);
              const errorCount = analystReports.reduce((sum, r) => sum + (r.errors?.length || 0), 0);
              const errorTypes = {};
              const gamesStats = {};
              analystReports.forEach(r => {
                const game = r.gameName;
                if (!gamesStats[game]) {
                  gamesStats[game] = { count: 0, errors: 0 };
                }
                gamesStats[game].count += 1;
                gamesStats[game].errors += r.errors?.length || 0;
              });

              const recentReports = [...analystReports].slice(-4).reverse();
              const keywordMap = {
                goal: 'Goal',
                substitution: 'Substitution',
                shot: 'Shot',
                foul: 'Foul',
                'free kick': 'Free kick',
                'penalty kick': 'Penalty kick',
                'throw in': 'Throw In',
                'start phase': 'Start Phase',
              };

              analystReports.forEach(r => {
                r.errors?.forEach(err => {
                  const typeText = err.type.toLowerCase();

                  let matchedKey = Object.keys(keywordMap).find(keyword =>
                    typeText.includes(keyword)
                  );

                  const key = matchedKey ? keywordMap[matchedKey] : 'Other';
                  errorTypes[key] = (errorTypes[key] || 0) + 1;
                });
              });

              const exportAnalystToExcel = () => {
                const formatted = analystReports.map(r => ({
                  Match: r.matchName,
                  Game: r.gameName,
                  QCDate: r.qcDate,
                  ErrorCount: r.errors?.length || 0,
                  Errors: r.errors?.map(e => e.full).join('\n') || ''
                }));

                const ws = XLSX.utils.json_to_sheet(formatted);
                const wb = XLSX.utils.book_new();
                XLSX.utils.book_append_sheet(wb, ws, name);

                const buffer = XLSX.write(wb, { bookType: "xlsx", type: "array" });
                const blob = new Blob([buffer], { type: "application/octet-stream" });
                saveAs(blob, `${name}_Report.xlsx`);
              };

              return (
                <li key={i} className="analyst-card">
                  <div className="analyst-header" onClick={() => toggleDropdown(name)}>
                    <div className="analyst-header-left">
                      <strong className="analyst-name">{name}</strong>
                      <div className="analyst-meta">
                        <span>{analystReports.length} report(s)</span>
                        <span>{errorCount} error(s)</span>
                      </div>
                    </div>
                    <div className="analyst-header-right">
                      <div className="analyst-stats">
                        <span className="stat-label">Avg</span>
                        <span className="stat-value">{(analystReports.length ? (errorCount / analystReports.length).toFixed(1) : 0)}</span>
                      </div>
                      <div className="analyst-stats">
                        <span className="stat-label">Total Errors</span>
                        <span className="stat-value">{errorCount}</span>
                      </div>
                      <span className="dropdown-icon">
                        <i className={`fas ${expandedAnalyst === name ? 'fa-chevron-up' : 'fa-chevron-down'}`}></i>
                      </span>
                    </div>
                  </div>


                  {expandedAnalyst === name && (
                    <div className="analyst-details">
                      <div className="analyst-details-grid">
                        <div className="breakdown-column scroll-section">
                          <h4>Error Types Breakdown</h4>
                          <ul>
                            {Object.entries(errorTypes).map(([type, count], i) => (
                              <li key={i}><span>{type}</span><strong>{count}</strong></li>
                            ))}
                          </ul>
                        </div>

                        <div className="breakdown-column scroll-section">
                          <h4>Game Statistics</h4>
                          <ul>
                            {Object.entries(gamesStats).map(([game, stats], i) => (
                              <li key={i}>
                                <span>{game}</span>
                                <strong>{stats.errors}</strong> errors in {stats.count} report(s)
                              </li>
                            ))}
                          </ul>
                        </div>

                      </div>
                      <button className="export-btns" onClick={exportAnalystToExcel}>
                        {/* Export {name}'s Report */}
                        Download Excel
                      </button>
                      <button className="export-btns" style={{ marginLeft: "10px" }} onClick={() => navigate(`/analyst/${name}/errors`)}>
                        Show All Errors
                      </button>
                      <div className="recent-reports-panel scroll-section">
                        <h4>Recent Reports</h4>
                        <ul>
                          {recentReports.map((r, i) => (
                            <li key={i}>
                              <strong>{r.matchName}</strong> ({r.gameName} – {r.qcDate}) →
                              <span>{r.errors?.length || 0} errors</span>
                            </li>
                          ))}
                        </ul>


                      </div>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>


        </div>
        <button className="export-btn">Export All Data</button>
      </div>
    </>
  );
};

export default AnalystDashboard;
