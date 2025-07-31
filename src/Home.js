import React, { useState } from 'react';
import './Home.css';
import Navbar from './navbar';
import { collection, addDoc } from "firebase/firestore";
import { db } from './firebaseConfig';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';


const Home = ({ submittedReports, setSubmittedReports, userMeta }) => {
  const [formData, setFormData] = useState({
    analystName: '',
    qcDate: '',
    matchName: '',
    gameName: '',
    errorLogs: '',
  });

  const [formErrors, setFormErrors] = useState({});
  const [processedErrors, setProcessedErrors] = useState([]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });

    if (name === 'errorLogs') {
      const lines = value.split('\n').filter(Boolean);
      const errors = lines.map(line => {
        const [time, ...rest] = line.split(' ');
        return {
          time,
          type: rest.slice(0, 3).join(' '),
          full: line
        };
      });
      setProcessedErrors(errors);
    }
  };


  const handleSubmit = async (e) => {
    e.preventDefault();
    const errors = {};
    let firstInvalidField = null;

    for (const [key, value] of Object.entries(formData)) {
      if (!value.trim()) {
        errors[key] = 'Required';
        if (!firstInvalidField) firstInvalidField = key;
      }
    }

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      const invalidElement = document.getElementsByName(firstInvalidField)[0];
      if (invalidElement) {
        invalidElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    } else {
      const newReport = { ...formData, errors: processedErrors, createdAt: new Date() };

      await addDoc(collection(db, 'reports'), newReport);
      setSubmittedReports(prev => [...prev, newReport]);

      setFormErrors({});
      setFormData({
        analystName: '',
        qcDate: '',
        matchName: '',
        gameName: '',
        errorLogs: '',
      });
      setProcessedErrors([]);

      toast.success("✅ Report submitted successfully!", {
        position: "top-center",
        autoClose: 3000,
      });
    }
  };


return (
  <>
    <Navbar userMeta={userMeta} />
    <ToastContainer />

    <main className="home-container">
      <header className="page-header">
        <h1>Sports Error Tracking System</h1>
        <h2>AI-Powered Error Tracking</h2>
        <p>Submit reports with precision. Paste error logs, and let the system auto-analyze everything.</p>
      </header>

      <form onSubmit={handleSubmit} className="report-form">
        {/* Basic Information */}
        <section className="form-block">
          <h3>Basic Information</h3>
        <div className="form-row">
  <input
    name="analystName"
    placeholder="Enter analyst name"
    value={formData.analystName}
    onChange={handleInputChange}
    className={`half-width ${formErrors.analystName ? 'shake' : ''}`}
  />
  <input
    name="qcDate"
    type="date"
    value={formData.qcDate}
    onChange={handleInputChange}
    className={`half-width ${formErrors.qcDate ? 'shake' : ''}`}
  />
</div>
          <div className="form-row">
            <input name="matchName" placeholder="e.g., Team A vs Team B" value={formData.matchName} onChange={handleInputChange} className={`half-width ${formErrors.matchName ? 'shake' : ''}`} />
            <select name="gameName" value={formData.gameName} onChange={handleInputChange} className={`half-width ${formErrors.gameName ? 'shake' : ''}`}>
              <option value="">Select a sport</option>
              <option value="Soccer">Soccer</option>
              <option value="Basketball">Basketball</option>
              <option value="FieldHockey">Field-Hockey</option>
              <option value="Icehockey">Ice-hockey</option>
              <option value="Handball">Handball</option>
            </select>
          </div>
        </section>

        {/* Error Logs */}
        <section className="form-block">
          <h3>Smart Error Processing</h3>
          <textarea name="errorLogs" rows="8" placeholder="Paste your error logs here..." value={formData.errorLogs} onChange={handleInputChange} className={formErrors.errorLogs ? 'shake' : ''} />
        </section>

        {/* Processed Output */}
        {processedErrors.length > 0 && (
          <section className="form-block">
            <h3>Auto-Extracted Data</h3>
            <ul>
              {processedErrors.map((err, index) => (
                <li key={index}><strong>{err.time}</strong>: {err.type}</li>
              ))}
            </ul>

            <h3>Structured Error Summary</h3>
            <ul>
              {processedErrors.map((err, index) => (
                <li key={index}>{err.full}</li>
              ))}
            </ul>
          </section>
        )}

        <div className="submit-button-container">
          <button type="submit" className="submit-report-btn">Submit Report</button>
        </div>
      </form>
    </main>
  </>
);


};

export default Home;
