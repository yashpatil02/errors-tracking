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

  const getSlot = (timeStr) => {
    const hour = parseInt(timeStr?.split(':')[0]);
    if (hour < 12) return 'Morning';
    if (hour < 17) return 'Afternoon';
    if (hour < 21) return 'Evening';
    return 'Night';
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
        const slot = getSlot(err.time || '00:00:00');
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
  return 'box critical'; // critical = very high error
};


  const analystMatrix = getAnalystErrorMatrix();
  const sportsMatrix = getSportTimeMatrix();
  const last14 = getLastDates();

  const analysts = Array.from(new Set(reports.map(r => r.analystName))).filter(Boolean);
  const sports = Array.from(new Set(reports.map(r => r.gameName))).filter(Boolean);

  const resetFilters = () => {
    setSelectedAnalyst('All');
    setSelectedSport('All');
    setDateRange({ start: subDays(new Date(), 13), end: new Date() });
  };

  const handleExport = () => {
    const wb = XLSX.utils.book_new();

    // Analyst Sheet
    const analystData = [
      ['Analyst', ...last14],
      ...Object.entries(analystMatrix).map(([analyst, row]) => [
        analyst,
        ...last14.map(date => row[date] || 0)
      ])
    ];
    const analystSheet = XLSX.utils.aoa_to_sheet(analystData);
    XLSX.utils.book_append_sheet(wb, analystSheet, 'Analyst Errors');

    // Sport Sheet
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
    const sportSheet = XLSX.utils.aoa_to_sheet(sportData);
    XLSX.utils.book_append_sheet(wb, sportSheet, 'Sport Errors');

    // Export
    XLSX.writeFile(wb, 'ErrorHeatmapData.xlsx');
  };



  return (
    <>
      <Navbar userMeta={userMeta} />
      <div className="dashboard-container">
        <div className="dashboard-header">
          <h1>Error Pattern Heatmaps</h1>
          <p>Visualize error patterns across analysts and time slots</p>
        </div>

        {/* 🔍 Control Panel */}
        <div className="heatmap-controls">
          <h4>🔎 Heatmap Controls</h4>
          <select onChange={(e) => setSelectedSport(e.target.value)} value={selectedSport}>
            <option value="All">All Sports</option>
            {sports.map((s, i) => <option key={i} value={s}>{s}</option>)}
          </select>
          <select onChange={(e) => setSelectedAnalyst(e.target.value)} value={selectedAnalyst}>
            <option value="All">All Analysts</option>
            {analysts.map((a, i) => <option key={i} value={a}>{a}</option>)}
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

        {/* 🟩 Heatmap Tables (if graph not shown) */}
        {!showGraph && (
          <>
            {/* Analyst Error Table */}
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
              {/* 🔵 Error Intensity Legend */}
<div className="error-legend">
  <strong>Error Intensity:</strong>
  <span className="legend-box green">None</span>
  <span className="legend-box yellow">Low</span>
  <span className="legend-box orange">Medium</span>
  <span className="legend-box red">High</span>
  <span className="legend-box critical">Critical</span>
</div>

            </div>

            {/* Sport Slot Table */}
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
