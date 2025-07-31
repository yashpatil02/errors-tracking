import React, { useEffect, useState } from 'react';
import './AnalystDashboard.css';
import Navbar from './navbar';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from './firebaseConfig';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import { useNavigate } from 'react-router-dom'; // Add at the top




const AnalystDashboard = ({ userMeta }) => {
  const [reports, setReports] = useState([]);
  const [expandedAnalyst, setExpandedAnalyst] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusMessage, setStatusMessage] = useState('');
  const navigate = useNavigate(); // Inside component


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

          <button onClick={exportToExcel}>Download Excel</button>
          <button onClick={handleRefresh}>Refresh</button>
        </div>

        {statusMessage && (
          <div className="status-alert">
            {statusMessage}
          </div>
        )}

        <div className="dashboard-stats">
          <div>Total Analysts: <strong>{totalAnalysts}</strong></div>
          <div>Total Reports: <strong>{totalReports}</strong></div>
          <div>Total Errors: <strong>{totalErrors}</strong></div>
          <div>Avg Errors/Report: <strong>{(totalReports ? (totalErrors / totalReports).toFixed(1) : 0)}</strong></div>
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


              // analystReports.forEach(r => {
              //   r.errors?.forEach(err => {
              //     let key = err.type.toLowerCase();

              //     if (key.includes('goal')) {
              //       key = 'Goal';
              //     } else if (key.includes('substitution')) {
              //       key = 'Substitution';
              //     } else if (key.includes('Shot')) {
              //       key = 'Shot';
              //     }
              //     else if (key.includes('Foul')) {
              //       key = 'Foul';
              //     }
              //     else if (key.includes('Free kick')) {
              //       key = 'Free kick';
              //     }
              //     else if (key.includes('penalty kick')) {
              //       key = 'penalty kick';
              //     }
              //     else if (key.includes('Throw In')) {
              //       key = 'Throw In';
              //     }
              //     else if (key.includes('start Phase')) {
              //       key = 'start Phase';
              //     }


              //     errorTypes[key] = (errorTypes[key] || 0) + 1;
              //   });
              // });
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
                    <strong>{name}</strong> — {analystReports.length} reports, {errorCount} errors
                    <span>{expandedAnalyst === name ? "▲" : "▼"}</span>

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
