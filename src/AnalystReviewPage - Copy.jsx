// AnalystReviewPage.jsx
import React, { useState } from 'react';
import { updateDoc, doc, deleteDoc } from 'firebase/firestore';
import { db } from './firebaseConfig';
// import './AnalystReviewPage.css';

const AnalystReviewPage = ({ analyst, reports, goBack }) => {
  const [matchSearch, setMatchSearch] = useState('');
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedMatchId, setSelectedMatchId] = useState(null);
  const [editIndex, setEditIndex] = useState(null);
  const [editText, setEditText] = useState('');

  const analystMatches = reports
    .filter(r => r.analystName === analyst)
    .filter(r =>
      r.matchName.toLowerCase().includes(matchSearch.toLowerCase()) &&
      (selectedDate ? r.qcDate === selectedDate : true)
    );

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

  const handleDeleteMatch = async (reportId) => {
    if (window.confirm('Delete this match and all its errors?')) {
      await deleteDoc(doc(db, 'reports', reportId));
    }
  };

  return (
    <div className="analyst-review">
      <div className="review-header">
        <button onClick={goBack} className="back-btn">⬅ Back</button>
        <h2>Reviewing: {analyst}</h2>
      </div>

      <div className="filter-panel">
        <input
          type="text"
          placeholder="🔍 Search match name"
          value={matchSearch}
          onChange={(e) => setMatchSearch(e.target.value)}
        />
        <input
          type="date"
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
        />
      </div>

      <div className="review-body">
        {/* Left: Match list */}
        <div className="match-list-panel">
          {analystMatches.map(match => (
            <div
              key={match.id}
              className={`match-item ${selectedMatchId === match.id ? 'selected' : ''}`}
              onClick={() => setSelectedMatchId(match.id)}
            >
              <strong>{match.matchName}</strong>
              <small>📅 {match.qcDate}</small>
            </div>
          ))}
        </div>

        {/* Right: Errors for selected match */}
        <div className="match-errors-panel">
          {analystMatches.filter(m => m.id === selectedMatchId).map(report => (
            <div key={report.id} className="report-card">
              <div className="report-header">
                <h3>{report.matchName} ({report.qcDate})</h3>
                <button onClick={() => handleDeleteMatch(report.id)} className="delete-match">🗑 Delete Match</button>
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
                        <button onClick={() => handleSaveEdit(report.id, idx)}>💾 Save</button>
                      </>
                    ) : (
                      <>
                        <span>{err.full}</span>
                        <div className="error-actions">
                          <button onClick={() => { setEditIndex(idx); setEditText(err.full); }}>✏️ Edit</button>
                          <button onClick={() => handleDeleteError(report.id, idx)}>🗑 Delete</button>
                        </div>
                      </>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
          {!selectedMatchId && <p>⬅ Select a match to view errors</p>}
        </div>
      </div>
    </div>
  );
};

export default AnalystReviewPage;
