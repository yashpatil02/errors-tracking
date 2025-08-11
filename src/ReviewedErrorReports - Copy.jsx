// ReviewedErrorReports.jsx
import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import * as XLSX from 'xlsx';
import { db } from './firebaseConfig';
import './ReviewedErrorReports.css';
import "./AdminPanel.css";



const ReviewedErrorReports = () => {
  const [reports, setReports] = useState([]);
  const [selectedAnalyst, setSelectedAnalyst] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'reports'), (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setReports(data);
    });

    return () => unsubscribe();
  }, []);

  const filteredReports = reports.filter(report => {
    return (
      (!selectedAnalyst || report.analystName === selectedAnalyst) &&
      (report.matchName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
       report.analystName?.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  });

  const exportToExcel = () => {
    const exportData = filteredReports.map(report => ({
      Match: report.matchName,
      Analyst: report.analystName,
      Sport: report.sport,
      Date: report.qcDate,
      Errors: report.errors?.length || 0,
      Priority: report.priority,
      Status: report.status
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Error Reports");
    XLSX.writeFile(wb, "Reviewed_Error_Reports.xlsx");
  };

  const handleDelete = async (id) => {
    if (window.confirm("Are you sure you want to delete this report?")) {
      await deleteDoc(doc(db, 'reports', id));
    }
  };

  return (
    <div className="reviewed-reports">
      <div className="report-header">
        <h3>📋 Reviewed Error Reports</h3>
        <div className="filters-row">
          <select value={selectedAnalyst} onChange={(e) => setSelectedAnalyst(e.target.value)}>
            <option value="">All Analysts</option>
            {[...new Set(reports.map(r => r.analystName))].map((name, i) => (
              <option key={i} value={name}>{name}</option>
            ))}
          </select>
          <input
            type="text"
            placeholder="🔍 Search match or analyst..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <button className="export-btn" onClick={exportToExcel}>⬇️ Export Reports</button>
        </div>
      </div>

      <div className="report-list">
        {filteredReports.map(report => (
          <div key={report.id} className="report-item">
            <div className="report-info">
              <h4>{report.matchName}</h4>
              <div className="tags">
                <span className={`priority ${report.priority?.toLowerCase()}`}>{report.priority?.toUpperCase()}</span>
                <span className={`status ${report.status?.toLowerCase()}`}>{report.status?.toUpperCase()}</span>
              </div>
              <p><strong>Analyst:</strong> {report.analystName}</p>
              <p><strong>Sport:</strong> {report.sport}</p>
              <p><strong>Date:</strong> {report.qcDate}</p>
              <p><strong>Errors:</strong> {report.errors?.length || 0}</p>
            </div>
            <div className="report-actions">
              <button onClick={() => alert('View functionality pending')}>👁️ View</button>
              <button onClick={() => alert('Edit functionality pending')}>✏️ Edit</button>
              <button onClick={() => handleDelete(report.id)}>🗑️ Delete</button>
            </div>
          </div>
        ))}

        {filteredReports.length === 0 && <p>No reports found.</p>}
      </div>
    </div>
  );
};

export default ReviewedErrorReports;
