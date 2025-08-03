import React, { useState } from 'react';
import './Home.css';
import Navbar from './navbar';
import { collection, addDoc } from "firebase/firestore";
import { db } from './firebaseConfig';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const Home = ({ submittedReports, setSubmittedReports, userMeta }) => {
  const [formData, setFormData] = useState({
    qcAnalystName: '', // new field
    analystNames: [''],
    analystTimes: [{ start: '', end: '' }],
    qcDate: '',
    matchName: '',
    gameName: '',
    errorLogs: '',
  });

  const [formErrors, setFormErrors] = useState({});
  const [processedErrors, setProcessedErrors] = useState([]);
  const [distributedErrors, setDistributedErrors] = useState({});

  const handleAnalystChange = (index, value) => {
    const updated = [...formData.analystNames];
    updated[index] = value;
    setFormData({ ...formData, analystNames: updated });
  };

  const handleTimeChange = (index, field, value) => {
    const updated = [...formData.analystTimes];
    updated[index][field] = value;
    setFormData({ ...formData, analystTimes: updated });
  };

  const addAnalystField = () => {
    setFormData({
      ...formData,
      analystNames: [...formData.analystNames, ''],
      analystTimes: [...formData.analystTimes, { start: '', end: '' }]
    });
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });

    if (name === 'errorLogs') {
      const lines = value.split('\n').filter(Boolean);
      const errors = lines.map(line => {
        let [time, ...rest] = line.trim().split(' ');
        if (!/^\d{1,2}:\d{1,2}:\d{1,2}$/.test(time)) {
          time = "00:00:00"; // default if invalid
        }
        return {
          time,
          type: rest.slice(0, 3).join(' '),
          full: line
        };
      });
      setProcessedErrors(errors);

      // If multiple analysts, distribute by time
      if (formData.analystNames.length > 1) {
        const dist = {};
        formData.analystNames.forEach((name, idx) => {
          dist[name] = errors.filter(err => {
            const start = formData.analystTimes[idx]?.start || "00:00:00";
            const end = formData.analystTimes[idx]?.end || "99:59:59";
            return err.time >= start && err.time <= end;
          });
        });
        setDistributedErrors(dist);
      } else {
        setDistributedErrors({ [formData.analystNames[0]]: errors });
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errors = {};
    let firstInvalidField = null;

    // Validation
    formData.analystNames.forEach((name, idx) => {
      if (!name.trim()) {
        errors[`analyst-${idx}`] = 'Required';
        if (!firstInvalidField) firstInvalidField = `analyst-${idx}`;
      }
      if (formData.analystNames.length > 1) {
        if (!formData.analystTimes[idx].start || !formData.analystTimes[idx].end) {
          errors[`time-${idx}`] = 'Start & End time required';
          if (!firstInvalidField) firstInvalidField = `time-${idx}`;
        }
      }
    });

    ['qcAnalystName', 'qcDate', 'matchName', 'gameName', 'errorLogs'].forEach(field => {
      if (!formData[field].trim()) {
        errors[field] = 'Required';
        if (!firstInvalidField) firstInvalidField = field;
      }
    });

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      const invalidElement = document.getElementsByName(firstInvalidField)[0];
      if (invalidElement) {
        invalidElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      return;
    }

    // Save to Firebase
    if (formData.analystNames.length === 1) {
      // Only one analyst - save directly
      const newReport = {
          qcAnalystName: formData.qcAnalystName, // save QC analyst name
        analystName: formData.analystNames[0],
        qcDate: formData.qcDate,
        matchName: formData.matchName,
        gameName: formData.gameName,
        errors: processedErrors,
        createdAt: new Date()
      };
      await addDoc(collection(db, 'reports'), newReport);
    } else {
      // Multiple analysts - distribute and save one doc per analyst
      for (let idx = 0; idx < formData.analystNames.length; idx++) {
        const analyst = formData.analystNames[idx];
        const start = formData.analystTimes[idx].start || "00:00:00";
        const end = formData.analystTimes[idx].end || "99:59:59";

        const analystErrors = processedErrors.filter(
          err => err.time >= start && err.time <= end
        );

        const newReport = {
          analystName: analyst,
          qcDate: formData.qcDate,
          matchName: formData.matchName,
          gameName: formData.gameName,
          errors: analystErrors,
          createdAt: new Date()
        };

        await addDoc(collection(db, 'reports'), newReport);
      }
    }

    // Update state after submit
    setSubmittedReports(prev => [...prev]); // we can re-fetch later if needed
    setFormErrors({});
    setFormData({
      analystNames: [''],
      analystTimes: [{ start: '', end: '' }],
      qcDate: '',
      matchName: '',
      gameName: '',
      errorLogs: '',
    });
    setProcessedErrors([]);
    setDistributedErrors({});

    toast.success("✅ Report(s) submitted successfully!", {
      position: "top-center",
      autoClose: 3000,
    });
  };

  const removeAnalystField = (index) => {
    const updatedNames = [...formData.analystNames];
    const updatedTimes = [...formData.analystTimes];
    updatedNames.splice(index, 1);
    updatedTimes.splice(index, 1);
    setFormData({ ...formData, analystNames: updatedNames, analystTimes: updatedTimes });
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
                name="qcAnalystName"
                placeholder="Enter QC Analyst Name"
                value={formData.qcAnalystName}
                onChange={handleInputChange}
                className={`full-width ${formErrors.qcAnalystName ? 'shake' : ''}`}
                style={{
                  padding: '8px 10px',
                  borderRadius: '8px',
                  border: '1px solid #ccc',
                  fontSize: '14px'
                }}
              />
            </div>

            {formData.analystNames.map((name, idx) => (

              <div key={idx} className="form-row analyst-row">
                {/* Analyst Name */}
                <input
                  name={`analyst-${idx}`}
                  placeholder={`Enter analyst name ${idx + 1}`}
                  value={name}
                  onChange={(e) => handleAnalystChange(idx, e.target.value)}
                  className={`analyst-input ${formErrors[`analyst-${idx}`] ? 'shake' : ''}`}
                />

                {/* Start & End Time */}
                {formData.analystNames.length > 1 && (
                  <>
                    <input
                      type="text"
                      placeholder="Start"
                      value={formData.analystTimes[idx].start}
                      onChange={(e) => handleTimeChange(idx, 'start', e.target.value)}
                      className={`time-input ${formErrors[`time-${idx}`] ? 'shake' : ''}`}
                    />
                    <input
                      type="text"
                      placeholder="End"
                      value={formData.analystTimes[idx].end}
                      onChange={(e) => handleTimeChange(idx, 'end', e.target.value)}
                      className={`time-input ${formErrors[`time-${idx}`] ? 'shake' : ''}`}
                    />
                  </>
                )}

                {/* Plus Button (only on last row) */}
                {idx === formData.analystNames.length - 1 && (
                  <button
                    type="button"
                    className="add-analyst-btn"
                    onClick={addAnalystField}
                    title="Add Analyst"
                  >
                    +
                  </button>
                )}
                {formData.analystNames.length > 1 && (
                  <button
                    type="button"
                    className="remove-analyst-btn"
                    onClick={() => removeAnalystField(idx)}
                    title="Remove Analyst"
                  >
                    ❌
                  </button>
                )}
              </div>
            ))}

            <div className="form-row">
              <input
                name="qcDate"
                type="date"
                value={formData.qcDate}
                onChange={handleInputChange}
                className={`half-width ${formErrors.qcDate ? 'shake' : ''}`}
              />
            </div>
            <div className="form-row">
              <input
                name="matchName"
                placeholder="e.g., Team A vs Team B"
                value={formData.matchName}
                onChange={handleInputChange}
                className={`half-width ${formErrors.matchName ? 'shake' : ''}`}
              />
              <select
                name="gameName"
                value={formData.gameName}
                onChange={handleInputChange}
                className={`half-width ${formErrors.gameName ? 'shake' : ''}`}
              >
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
            <textarea
              name="errorLogs"
              rows="8"
              placeholder="Paste your error logs here..."
              value={formData.errorLogs}
              onChange={handleInputChange}
              className={formErrors.errorLogs ? 'shake' : ''}
            />
          </section>

          {/* Processed Output */}
          {processedErrors.length > 0 && (
            <section className="form-block">
              <h3>Auto-Extracted Data</h3>
              {formData.analystNames.length > 1 ? (
                Object.entries(distributedErrors).map(([analyst, errs], i) => (
                  <div key={i}>
                    <h4>{analyst}</h4>
                    <ul>
                      {errs.map((err, idx) => (
                        <li key={idx}><strong>{err.time}</strong>: {err.type}</li>
                      ))}
                    </ul>
                  </div>
                ))
              ) : (
                <ul>
                  {processedErrors.map((err, index) => (
                    <li key={index}><strong>{err.time}</strong>: {err.type}</li>
                  ))}
                </ul>
              )}

              <h3>Structured Error Summary</h3>
              {formData.analystNames.length > 1 ? (
                Object.entries(distributedErrors).map(([analyst, errs], i) => (
                  <div key={i}>
                    <h4>{analyst}</h4>
                    <ul>
                      {errs.map((err, idx) => (
                        <li key={idx}>{err.full}</li>
                      ))}
                    </ul>
                  </div>
                ))
              ) : (
                <ul>
                  {processedErrors.map((err, index) => (
                    <li key={index}>{err.full}</li>
                  ))}
                </ul>
              )}
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
