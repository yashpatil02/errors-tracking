import React, { useState, useEffect } from 'react';
import './Home.css';
import Navbar from './navbar';
import { collection, addDoc } from "firebase/firestore";
import { db } from './firebaseConfig';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

// Icons
import { FaUser, FaCalendarAlt, FaClipboardList, FaFutbol, FaFileAlt, FaPlus, FaTimes } from 'react-icons/fa';

const Home = ({ submittedReports, setSubmittedReports, userMeta }) => {
  const [formData, setFormData] = useState({
    qcAnalystName: '',
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

  const removeAnalystField = (index) => {
    const updatedNames = [...formData.analystNames];
    const updatedTimes = [...formData.analystTimes];
    updatedNames.splice(index, 1);
    updatedTimes.splice(index, 1);
    setFormData({ ...formData, analystNames: updatedNames, analystTimes: updatedTimes });
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });

    if (name === 'errorLogs') {
      const lines = value.split('\n').filter(Boolean);
      const errors = lines.map(line => {
        let [time, ...rest] = line.trim().split(' ');
        if (!/^\d{1,2}:\d{1,2}:\d{1,2}$/.test(time)) {
          time = "00:00:00";
        }
        return {
          time,
          type: rest.join(' '),
          full: line
        };
      });
      setProcessedErrors(errors);
    }
  };

  useEffect(() => {
    if (processedErrors.length === 0) return;

    const grouped = {};
    formData.analystNames.forEach((name, idx) => {
      const start = formData.analystTimes[idx]?.start || "00:00:00";
      const end = formData.analystTimes[idx]?.end || "99:59:59";
      grouped[name || `Analyst ${idx + 1}`] = processedErrors.filter(
        err => err.time >= start && err.time <= end
      );
    });

    setDistributedErrors(grouped);
  }, [processedErrors, formData.analystNames, formData.analystTimes]);


  const handleSubmit = async (e) => {
    e.preventDefault();
    const errors = {};
    let firstInvalidField = null;

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

    if (formData.analystNames.length === 1) {
      const newReport = {
        qcAnalystName: formData.qcAnalystName,
        analystName: formData.analystNames[0],
        qcDate: formData.qcDate,
        matchName: formData.matchName,
        gameName: formData.gameName,
        errors: processedErrors,
        createdAt: new Date()
      };
      await addDoc(collection(db, 'reports'), newReport);
    } else {
      for (let idx = 0; idx < formData.analystNames.length; idx++) {
        const analyst = formData.analystNames[idx];
        const start = formData.analystTimes[idx].start || "00:00:00";
        const end = formData.analystTimes[idx].end || "99:59:59";

        const analystErrors = processedErrors.filter(
          err => err.time >= start && err.time <= end
        );

        const newReport = {
         qcAnalystName: formData.qcAnalystName,
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

    setSubmittedReports(prev => [...prev]);
    setFormErrors({});
    setFormData({
      qcAnalystName: '',
      analystNames: [''],
      analystTimes: [{ start: '', end: '' }],
      qcDate: '',
      matchName: '',
      gameName: '',
      errorLogs: '',
    });
    setProcessedErrors([]);
    setDistributedErrors({});

    toast.success(" Report submitted successfully!", {
      position: "bottom-right", // 👈 moved to bottom right
      autoClose: 3000,
    });
  };

  return (
    <>
     <div className="layout">
      <Navbar userMeta={userMeta} />
      <ToastContainer />

      <div className="home-header">
        <h1>Sports Error Tracking System</h1>
        <p>AI-Powered Error Tracking and QC Management</p>
      </div>

      <main className="home-container">
        <form onSubmit={handleSubmit} className="report-form">
          <section className="form-block">
            <h3>Basic Information</h3>
            <div className="input-icon">
              <FaUser />
              <input
                name="qcAnalystName"
                placeholder="Enter QC Analyst Name"
                value={formData.qcAnalystName}
                onChange={handleInputChange}
                className={formErrors.qcAnalystName ? 'shake' : ''}
              />
            </div>

            {formData.analystNames.map((name, idx) => (
              <div key={idx} className="analyst-row">
                {/* Analyst Name - Full width like QC field */}
                <div className="input-icon analyst-wide">
                  <FaUser />
                  <input
                    name={`analyst-${idx}`}
                    placeholder={`Enter analyst name ${idx + 1}`}
                    value={name}
                    onChange={(e) => handleAnalystChange(idx, e.target.value)}
                    className={formErrors[`analyst-${idx}`] ? 'shake' : ''}
                  />
                </div>

                {/* Start & End Time - Small to right */}
                {formData.analystNames.length > 1 && (
                  <div className="time-group">
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
                  </div>
                )}

                {/* Buttons small and aligned */}
                <div className="analyst-actions">
                  {idx === formData.analystNames.length - 1 && (
                    <button type="button" className="add-btn small-btn" onClick={addAnalystField}>
                      <FaPlus />
                    </button>
                  )}
                  {formData.analystNames.length > 1 && (
                    <button type="button" className="remove-btn small-btn" onClick={() => removeAnalystField(idx)}>
                      <FaTimes />
                    </button>
                  )}
                </div>
              </div>
            ))}


            {/* Date, Match Name & Sport in One Row */}
            <div className="form-row three-input-row">
              <div className="input-icon">
                <FaCalendarAlt />
                <input
                  name="qcDate"
                  type="date"
                  value={formData.qcDate}
                  onChange={handleInputChange}
                  className={formErrors.qcDate ? 'shake' : ''}
                />
              </div>
              <div className="input-icon">
                <FaClipboardList />
                <input
                  name="matchName"
                  placeholder="e.g., Team A vs Team B"
                  value={formData.matchName}
                  onChange={handleInputChange}
                  className={formErrors.matchName ? 'shake' : ''}
                />
              </div>
              <div className="input-icon">
                <FaFutbol />
                <select
                  name="gameName"
                  value={formData.gameName}
                  onChange={handleInputChange}
                  className={formErrors.gameName ? 'shake' : ''}
                >
                  <option value="">Select a sport</option>
                  <option value="Soccer">Soccer</option>
                  <option value="Basketball">Basketball</option>
                  <option value="FieldHockey">Field-Hockey</option>
                  <option value="Icehockey">Ice-hockey</option>
                  <option value="Handball">Handball</option>
                </select>
              </div>
            </div>

          </section>

          <section className="form-block">
            <h3>Smart Error Processing</h3>
            <div className="input-icon textarea-icon">
              <FaFileAlt />
              <textarea
                name="errorLogs"
                rows="8"
                placeholder="Paste your error logs here..."
                value={formData.errorLogs}
                onChange={handleInputChange}
                className={formErrors.errorLogs ? 'shake' : ''}
              />
            </div>
          </section>

          {processedErrors.length > 0 && (
            <section className="form-block">
              <h3>Auto-Extracted Data</h3>
              {formData.analystNames.length > 1 ? (
                Object.entries(distributedErrors).map(([analyst, errs], i) => (
                  <div className="error-card" key={i}>
                    <h4>{analyst}</h4>
                    <ul>
                      {errs.map((err, idx) => (
                        <li key={idx}>
                          <span className="error-time">{err.time}</span>
                          <span>{err.type}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))
              ) : (
                <div className="error-card">
                  <h4>{formData.analystNames[0]}</h4>
                  <ul>
                    {processedErrors.map((err, index) => (
                      <li key={index}>
                        <span className="error-time">{err.time}</span>
                        <span>{err.type}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </section>
          )}
          {/* Structured Error Summary Below Auto-Extracted Data */}

          <div className="submit-button-container">
            <button type="submit" className="submit-report-btn">Submit Report</button>
          </div>
        </form>
      </main>
      </div>
    </>
  );
};

export default Home;
