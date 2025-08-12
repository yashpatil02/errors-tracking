import React, { useEffect, useState } from 'react';
import './Heatmap.css';
import Navbar from './navbar';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from './firebaseConfig';
import { format, subDays, isAfter, isBefore } from 'date-fns';
import * as XLSX from 'xlsx';

const HeatmapPage = ({ userMeta }) => {
  const [reports, setReports] = useState([]);
  const [selectedAnalyst, setSelectedAnalyst] = useState('All');
  const [selectedSport, setSelectedSport] = useState('All');
  const [showGraph, setShowGraph] = useState(false);
  const [showAllAnalysts, setShowAllAnalysts] = useState(false);
  const [expandedAnalysts, setExpandedAnalysts] = useState({});
  const [dateRange, setDateRange] = useState({
    start: subDays(new Date(), 13),
    end: new Date(),
  });

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'reports'), (snapshot) => {
      const data = snapshot.docs.map(doc => doc.data());
      setReports(data);
    });
    return () => unsubscribe();
  }, []);

  const getLastDates = () => {
    const dates = [];
    for (let i = 13; i >= 0; i--) {
      const date = subDays(new Date(), i);
      if (isAfter(date, dateRange.end) || isBefore(date, dateRange.start)) continue;
      dates.push(format(date, 'MM/dd'));
    }
    return dates;
  };

  const getAnalystErrorStats = () => {
    const stats = {};
    reports.forEach(r => {
      if (selectedAnalyst !== 'All' && r.analystName !== selectedAnalyst) return;
      if (selectedSport !== 'All' && r.gameName !== selectedSport) return;
      r.errors?.forEach(err => {
        const type = err.type || 'Other';
        if (!stats[r.analystName]) stats[r.analystName] = {};
        stats[r.analystName][type] = (stats[r.analystName][type] || 0) + 1;
      });
    });
    return stats;
  };

  const getAnalystErrorMatrix = () => {
    const matrix = {};
    const lastDates = getLastDates();
    reports.forEach(r => {
      const analyst = r.analystName;
      const sport = r.gameName || 'Unknown';
      const rawDate = r.qcDate;
      const parsedDate = new Date(rawDate);
      if (!rawDate || isNaN(parsedDate)) return;
      if (selectedAnalyst !== 'All' && analyst !== selectedAnalyst) return;
      if (selectedSport !== 'All' && sport !== selectedSport) return;

      const formattedDate = format(parsedDate, 'MM/dd');
      if (!lastDates.includes(formattedDate)) return;

      if (!matrix[analyst]) matrix[analyst] = {};
      matrix[analyst][formattedDate] = (matrix[analyst][formattedDate] || 0) + (r.errors?.length || 0);
    });
    return matrix;
  };

  const getSportTimeMatrix = () => {
    const matrix = {};
    reports.forEach(r => {
      const sport = r.gameName || 'Unknown';
      const analyst = r.analystName;
      const rawDate = r.qcDate;
      const parsedDate = new Date(rawDate);
      if (!rawDate || isNaN(parsedDate)) return;
      if (selectedAnalyst !== 'All' && analyst !== selectedAnalyst) return;
      if (selectedSport !== 'All' && sport !== selectedSport) return;
      if (isBefore(parsedDate, dateRange.start) || isAfter(parsedDate, dateRange.end)) return;

      if (!matrix[sport]) matrix[sport] = { Morning: 0, Afternoon: 0, Evening: 0, Night: 0 };
      r.errors?.forEach(err => {
        const hour = parseInt(err.time?.split(':')[0] || '0');
        let slot = 'Night';
        if (hour < 12) slot = 'Morning';
        else if (hour < 17) slot = 'Afternoon';
        else if (hour < 21) slot = 'Evening';
        matrix[sport][slot]++;
      });
    });
    return matrix;
  };

  const getColorClass = (count) => {
    if (count === 0) return 'box green';
    if (count <= 5) return 'box yellow';
    if (count <= 10) return 'box orange';
    if (count <= 20) return 'box red';
    return 'box critical';
  };

  const analystStats = getAnalystErrorStats();
  const analystMatrix = getAnalystErrorMatrix();
  const sportsMatrix = getSportTimeMatrix();
  const last14 = getLastDates();

  const analysts = Object.keys(analystStats);
  const visibleAnalysts = showAllAnalysts ? analysts : analysts.slice(0, 4);

  const colors = ['#4cafef', '#ff9800', '#e91e63', '#8bc34a', '#9c27b0', '#ffc107', '#00bcd4'];

  const toggleShowMore = (analyst) => {
    setExpandedAnalysts(prev => ({ ...prev, [analyst]: !prev[analyst] }));
  };

  const resetFilters = () => {
    setSelectedAnalyst('All');
    setSelectedSport('All');
    setDateRange({ start: subDays(new Date(), 13), end: new Date() });
  };

  const handleExport = () => {
    const wb = XLSX.utils.book_new();
    const analystData = [
      ['Analyst', ...last14],
      ...Object.entries(analystMatrix).map(([analyst, row]) => [
        analyst,
        ...last14.map(date => row[date] || 0)
      ])
    ];
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(analystData), 'Analyst Errors');

    const sportData = [
      ['Sport', 'Morning', 'Afternoon', 'Evening', 'Night'],
      ...Object.entries(sportsMatrix).map(([sport, timeSlots]) => [
        sport,
        timeSlots.Morning || 0,
        timeSlots.Afternoon || 0,
        timeSlots.Evening || 0,
        timeSlots.Night || 0
      ])
    ];
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(sportData), 'Sport Errors');

    XLSX.writeFile(wb, 'ErrorHeatmapData.xlsx');
  };

  return (
    <>
      <Navbar userMeta={userMeta} />
      <div className="dashboard-container">
        <div className="progressbar-header">
          <h2>📊 Analyst Error Type Overview</h2>
          <select
            value={selectedAnalyst}
            onChange={(e) => setSelectedAnalyst(e.target.value)}
            className="analyst-dropdown"
          >
            <option value="All">All Analysts</option>
            {Array.from(new Set(reports.map(r => r.analystName))).filter(Boolean).map((a, i) => (
              <option key={i} value={a}>{a}</option>
            ))}
          </select>
        </div>

        <div className="analyst-progress-grid">
          {visibleAnalysts.map((analyst, idx) => {
            const errors = analystStats[analyst] || {};
            const total = Object.values(errors).reduce((a, b) => a + b, 0);
            const sortedErrors = Object.entries(errors).sort((a, b) => b[1] - a[1]);
            const visibleErrors = expandedAnalysts[analyst] ? sortedErrors : sortedErrors.slice(0, 5);

            return (
              <div key={idx} className="analyst-progress-card">
                <h4>{analyst}</h4>  <p style={{ fontSize: '0.9rem', margin: '10px 0 30px', fontFamily: 'sans-serif' }}>
                  Total Errors: <span style={{ color: 'red', fontWeight: '700' }}>{total}</span>   Types: {Object.keys(errors).length}
                </p>

                {visibleErrors.map(([type, count], i) => {
                  const percent = total ? (count / total) * 100 : 0;
                  return (
                    <div key={i} className="progress-row">
                      <div className="progress-label">
                        <span>{type}</span>
                        <span>{count}</span>
                      </div>
                      <div className="progress-bar">
                        <div
                          className="progress-fill"
                          style={{
                            width: `${percent}%`,
                            backgroundColor: colors[i % colors.length]
                          }}
                        ></div>
                      </div>
                    </div>
                  );
                })}
                {sortedErrors.length > 5 && (
                  <button className="show-more-btn" onClick={() => toggleShowMore(analyst)}>
                    {expandedAnalysts[analyst] ? "Show Less" : "Show More"}
                  </button>
                )}
              </div>
            );
          })}
        </div>

        {analysts.length > 4 && (
          <div style={{ textAlign: 'center', marginTop: '1rem', marginBottom: '2rem' }}>
            <button
              className="show-more-btn"
              onClick={() => setShowAllAnalysts(!showAllAnalysts)}
            >
              {showAllAnalysts ? "Show Less Analysts" : "Show All Analysts"}
            </button>
          </div>
        )}

        {/* 🔍 Control Panel */}
        <div className="heatmap-controls">
          <h4>🔎 Heatmap Controls</h4>
          <select onChange={(e) => setSelectedSport(e.target.value)} value={selectedSport}>
            <option value="All">All Sports</option>
            {Array.from(new Set(reports.map(r => r.gameName))).filter(Boolean).map((s, i) => (
              <option key={i} value={s}>{s}</option>
            ))}
          </select>
          <input
            type="date"
            value={format(dateRange.start, 'yyyy-MM-dd')}
            onChange={(e) => setDateRange(prev => ({ ...prev, start: new Date(e.target.value) }))}
          />
          <input
            type="date"
            value={format(dateRange.end, 'yyyy-MM-dd')}
            onChange={(e) => setDateRange(prev => ({ ...prev, end: new Date(e.target.value) }))}
          />
          <button onClick={resetFilters} className="btn-orange">🔁 Refresh</button>
          <button className="btn-green" onClick={handleExport}>📥 Export</button>
          <button className="btn-blue" onClick={() => setShowGraph(!showGraph)}>
            📊 {showGraph ? "Hide Graph" : "Show Graph"}
          </button>
        </div>

        {/* Original heatmap tables remain */}
        {!showGraph && (
          <>
            <div className="form-block">
              <h3>👥 Analyst Error Patterns (Last 14 Days)</h3>
              <div className="scroll-section">
                <table className="heatmap-table">
                  <thead>
                    <tr>
                      <th>Analyst</th>
                      {last14.map(date => <th key={date}>{date}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(analystMatrix).map(([analyst, data]) => (
                      <tr key={analyst}>
                        <td><strong>{analyst}</strong></td>
                        {last14.map(date => (
                          <td key={date}>
                            <div className={getColorClass(data[date] || 0)}>{data[date] || 0}</div>
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="form-block">
              <h3>⚡ Sport Error Distribution by Time Slots</h3>
              <div className="scroll-section">
                <table className="heatmap-table">
                  <thead>
                    <tr>
                      <th>Sport</th>
                      <th>Morning</th>
                      <th>Afternoon</th>
                      <th>Evening</th>
                      <th>Night</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(sportsMatrix).map(([sport, slots]) => (
                      <tr key={sport}>
                        <td><strong>{sport}</strong></td>
                        {['Morning', 'Afternoon', 'Evening', 'Night'].map(slot => (
                          <td key={slot}>
                            <div className={getColorClass(slots[slot])}>{slots[slot]}</div>
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    </>
  );
};

export default HeatmapPage;
