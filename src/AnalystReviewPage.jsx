import React, { useState, useEffect } from "react";
import { collection, onSnapshot, deleteDoc, doc, updateDoc } from "firebase/firestore";
import { db } from "./firebaseConfig";
import "./AnalystReviewPage.css";

const AnalystReviewPage = ({ analystName, onBack }) => {
    const [reports, setReports] = useState([]);
    const [selectedMatchId, setSelectedMatchId] = useState(null);
    const [searchMatch, setSearchMatch] = useState("");
    const [selectedDate, setSelectedDate] = useState("");
    const [editIndex, setEditIndex] = useState(null);
    const [editText, setEditText] = useState("");
    const [confirmData, setConfirmData] = useState(null);

    useEffect(() => {
        const unsub = onSnapshot(collection(db, "reports"), (snapshot) => {
            const data = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
            setReports(data.filter((r) => r.analystName === analystName));
        });
        return () => unsub();
    }, [analystName]);

    const handleDeleteMatch = async (id) => {
        await deleteDoc(doc(db, "reports", id));
        if (selectedMatchId === id) setSelectedMatchId(null);
    };

    const handleDeleteError = async (reportId, index) => {
        const report = reports.find((r) => r.id === reportId);
        const updatedErrors = [...(report.errors || [])];
        updatedErrors.splice(index, 1);
        await updateDoc(doc(db, "reports", reportId), { errors: updatedErrors });
    };

    const handleSaveEdit = async (reportId, index) => {
        const report = reports.find((r) => r.id === reportId);
        const updatedErrors = [...(report.errors || [])];
        updatedErrors[index].full = editText;
        await updateDoc(doc(db, "reports", reportId), { errors: updatedErrors });
        setEditIndex(null);
    };

    const filteredMatches = reports.filter(
        (r) =>
            r.matchName.toLowerCase().includes(searchMatch.toLowerCase()) &&
            (selectedDate ? r.qcDate === selectedDate : true)
    );

    return (
        <div className="analyst-review">
            <button onClick={onBack} className="back-btn">⬅ Back</button>
            <h3>Reviewing Analyst: {analystName}</h3>

            {/* Filters */}
            <div className="filters">
                <input
                    type="text"
                    placeholder="🔍 Search match..."
                    value={searchMatch}
                    onChange={(e) => setSearchMatch(e.target.value)}
                />
                <input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                />
            </div>

            <div className="review-container">
                {/* Match List */}
                <div className="match-list">
                    {filteredMatches.map((match) => (
                        <div
                            key={match.id}
                            className={`match-item ${selectedMatchId === match.id ? "selected" : ""}`}
                            onClick={() => setSelectedMatchId(match.id)}
                        >
                            <strong>{match.matchName}</strong>
                            <small>📅 {match.qcDate}</small>
                        </div>
                    ))}
                </div>

                {/* Errors */}
                <div className="match-errors">
                    {filteredMatches
                        .filter((m) => m.id === selectedMatchId)
                        .map((match) => (
                            <div key={match.id}>
                                <div className="match-header">
                                    <h4>{match.matchName} - {match.qcDate}</h4>
                                    <button
                                        className="icon-btn delete"
                                        title="Delete Match"
                                        onClick={() => setConfirmData({ type: "match", id: match.id })}
                                    >
                                        🗑
                                    </button>
                                </div>

                                {match.errors?.map((err, idx) => {
                                    const severityClass =
                                        err.severity?.toLowerCase() === "high"
                                            ? "error-high"
                                            : err.severity?.toLowerCase() === "medium"
                                                ? "error-medium"
                                                : err.severity?.toLowerCase() === "low"
                                                    ? "error-low"
                                                    : "error-default";

                                    return (
                                        <div key={idx} className={`error-card ${severityClass}`}>
                                            {editIndex === idx ? (
                                                <>
                                                    <input
                                                        className="error-input"
                                                        value={editText}
                                                        onChange={(e) => setEditText(e.target.value)}
                                                    />
                                                    <div className="error-actions">
                                                        <button
                                                            className="icon-btn save"
                                                            title="Save"
                                                            onClick={() => handleSaveEdit(match.id, idx)}
                                                        >
                                                            💾
                                                        </button>
                                                        <button
                                                            className="icon-btn cancel"
                                                            title="Cancel"
                                                            onClick={() => setEditIndex(null)}
                                                        >
                                                            ❌
                                                        </button>
                                                    </div>
                                                </>
                                            ) : (
                                                <>
                                                    <span className="error-text">{err.full}</span>
                                                    <div className="error-actions">
                                                        <button
                                                            className="icon-btn edit"
                                                            title="Edit"
                                                            onClick={() => {
                                                                setEditIndex(idx);
                                                                setEditText(err.full);
                                                            }}
                                                        >
                                                            ✏️
                                                        </button>
                                                        <button
                                                            className="icon-btn delete"
                                                            title="Delete"
                                                            onClick={() =>
                                                                setConfirmData({ type: "error", reportId: match.id, index: idx })
                                                            }
                                                        >
                                                            🗑
                                                        </button>
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        ))}
                    {!selectedMatchId && <p className="select-message">⬅ Select a match to see its errors</p>}
                </div>
            </div>

            {/* Confirmation Modal */}
            {confirmData && (
                <div className="confirm-overlay">
                    <div className="confirm-box">
                        <h4>Are you sure?</h4>
                        <p>This action cannot be undone.</p>
                        <div className="confirm-actions">
                            <button
                                className="confirm-yes"
                                onClick={() => {
                                    if (confirmData.type === "match") {
                                        handleDeleteMatch(confirmData.id);
                                    } else if (confirmData.type === "error") {
                                        handleDeleteError(confirmData.reportId, confirmData.index);
                                    }
                                    setConfirmData(null);
                                }}
                            >
                                Yes, Delete
                            </button>
                            <button className="confirm-no" onClick={() => setConfirmData(null)}>
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AnalystReviewPage;
