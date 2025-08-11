// ReviewedErrorReports.jsx
import React, { useState, useEffect } from "react";
import { collection, onSnapshot } from "firebase/firestore";
import { db } from "./firebaseConfig";
import "./ReviewedErrorReports.css";

const ReviewedErrorReports = ({ setSelectedAnalyst, setActiveTab }) => {
  const [reports, setReports] = useState([]);
  const [analystStats, setAnalystStats] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, "reports"), (snapshot) => {
      const data = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setReports(data);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const statsMap = {};

    reports.forEach((r) => {
      if (!r.analystName) return;
      if (!statsMap[r.analystName]) {
        statsMap[r.analystName] = {
          analyst: r.analystName,
          totalReports: 0,
          totalErrors: 0,
          sports: new Set(),
        };
      }
      statsMap[r.analystName].totalReports += 1;
      statsMap[r.analystName].totalErrors += r.errors?.length || 0;
      if (r.sport) statsMap[r.analystName].sports.add(r.sport);
    });

    setAnalystStats(Object.values(statsMap));
  }, [reports]);

  const filteredAnalysts = analystStats.filter((a) =>
    a.analyst.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="reviewed-reports-container">
      <div className="header-row">
        <h3>📋 Reviewed Error Reports</h3>
        <input
          type="text"
          placeholder="🔍 Search analyst..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <table className="reviewed-table">
        <thead>
          <tr>
            <th>Analyst</th>
            <th>Total Reports</th>
            <th>Total Errors</th>

            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          {filteredAnalysts.length > 0 ? (
            filteredAnalysts.map((a, idx) => (
              <tr key={idx}>
                <td>{a.analyst}</td>
                <td>{a.totalReports}</td>
                <td>{a.totalErrors}</td>

                <td>
                  <button
                    className="review-btn"
                    onClick={() => {
                      setSelectedAnalyst(a.analyst);
                      setActiveTab("analystReview");
                    }}
                  >
                    🔍 Review
                  </button>
                </td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan="5" style={{ textAlign: "center" }}>
                No analysts found.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
};

export default ReviewedErrorReports;
