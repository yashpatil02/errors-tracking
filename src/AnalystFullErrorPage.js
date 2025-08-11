// AnalystFullErrorPage.js
import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from './firebaseConfig';
import Navbar from './navbar';
import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
} from 'recharts';

const AnalystFullErrorPage = ({ userMeta }) => {
    const { analystName } = useParams();
    const [reports, setReports] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedDate, setSelectedDate] = useState('');
    const totalMatches = reports.length;
    const totalErrors = reports.reduce((acc, report) => acc + (report.errors?.length || 0), 0);


    useEffect(() => {
        const unsub = onSnapshot(collection(db, 'reports'), (snapshot) => {
            const data = snapshot.docs.map(doc => doc.data());
            setReports(data.filter(r => r.analystName === analystName));
        });

        return () => unsub();
    }, [analystName]);

    const getPerformanceData = () => {
        const dateMap = {};

        reports.forEach((report) => {
            const date = report.qcDate;
            if (!dateMap[date]) {
                dateMap[date] = { date, matches: 0, errors: 0 };
            }
            dateMap[date].matches += 1;
            dateMap[date].errors += report.errors?.length || 0;
        });

        return Object.values(dateMap).sort((a, b) => new Date(a.date) - new Date(b.date));
    };

    const performanceData = getPerformanceData();

    const getImprovementRate = () => {
        if (performanceData.length < 2) return 'Not enough data';
        const first = performanceData[0];
        const last = performanceData[performanceData.length - 1];

        const errorDrop = first.errors - last.errors;
        const improvement = ((errorDrop / first.errors) * 100).toFixed(1);

        return improvement > 0 ? `${improvement}% improvement` : `No improvement`;
    };

    return (
        <>
            <Navbar userMeta={userMeta} />
            <div style={{ padding: '120px 2rem' }}>
                <h2>📋 All Errors for: {analystName}</h2>
                <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginTop: '1rem',
                    marginBottom: '1.5rem',
                    flexWrap: 'wrap'
                }}>
                    <div></div> {/* Placeholder for left side if needed */}

                    <div style={{
                        display: 'flex',
                        gap: '2rem',
                        fontSize: '16px',
                        fontWeight: '500'
                    }}>
                        <div>📁 Total Matches: <strong>{totalMatches}</strong></div>
                        <div>❌ Total Errors: <strong>{totalErrors}</strong></div>
                    </div>
                </div>


                <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    margin: '1.5rem 0',
                    flexWrap: 'wrap',
                    gap: '1rem'
                }}>
                    {/* Search Input */}
                    <input
                        type="text"
                        placeholder="🔍 Search match name"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        style={{
                            flex: 2,
                            minWidth: '220px',
                            padding: '0.6rem 0.8rem',
                            borderRadius: '8px',
                            border: '1px solid #ccc',
                            fontSize: '15px'
                        }}
                    />

                    {/* Date Input */}
                    <input
                        type="date"
                        value={selectedDate}
                        onChange={(e) => setSelectedDate(e.target.value)}
                        style={{
                            flex: 1,
                            minWidth: '150px',
                            padding: '0.6rem 0.8rem',
                            borderRadius: '8px',
                            border: '1px solid #ccc',
                            fontSize: '15px'
                        }}
                    />

                    {/* Reset Button */}
                    <button
                        onClick={() => {
                            setSearchTerm('');
                            setSelectedDate('');
                        }}
                        style={{
                            padding: '0.6rem 1.2rem',
                            backgroundColor: '#f44336',
                            color: 'white',
                            border: 'none',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            fontSize: '14px'
                        }}
                    >
                        🔄 Reset
                    </button>
                </div>


                {reports.length === 0 ? (
                    <p>No reports found.</p>
                ) : (
                    reports
                        .filter((report) =>
                            report.matchName.toLowerCase().includes(searchTerm.toLowerCase()) &&
                            (selectedDate ? report.qcDate === selectedDate : true)
                        )
                        .map((report, idx) => (

                            <div
                                key={idx}
                                style={{
                                    marginBottom: '2rem',
                                    padding: '1rem',
                                    border: '1px solid #ccc',
                                    borderRadius: '8px',
                                    background: '#fff',
                                }}
                            >
                                <h3>{report.matchName} ({report.gameName})</h3>
                                <p>QC Date: {report.qcDate}</p>
                                <p>👤 QC Analyst: {report.qcAnalystName || 'Not Assigned'}</p>
                                <ul>
                                    {report.errors?.length > 0 ? (
                                        report.errors.map((err, i) => (
                                            <li key={i}>⏱️ {err.time || 'N/A'} — {err.full}</li>
                                        ))
                                    ) : (
                                        <li>No errors found</li>
                                    )}
                                </ul>
                            </div>
                        ))
                )}

                <div style={{ marginTop: '40px' }}>
                    <h3>📈 Analyst Performance Overview</h3>
                    <ResponsiveContainer width="100%" height={350}>
                        <AreaChart
                            data={performanceData}
                            margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                        >
                            <defs>
                                <linearGradient id="colorErrors" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#FF5733" stopOpacity={0.4} />
                                    <stop offset="95%" stopColor="#FF5733" stopOpacity={0} />
                                </linearGradient>
                                <linearGradient id="colorMatches" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#3366FF" stopOpacity={0.4} />
                                    <stop offset="95%" stopColor="#3366FF" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="5 5" stroke="#ccc" />
                            <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                            <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
                            <Tooltip
                                contentStyle={{
                                    backgroundColor: '#f5f5f5',
                                    borderRadius: '10px',
                                    fontSize: '14px',
                                }}
                                labelStyle={{ fontWeight: 'bold' }}
                            />
                            <Legend verticalAlign="top" height={36} />
                            <Area
                                type="monotone"
                                dataKey="errors"
                                stroke="#FF5733"
                                fill="url(#colorErrors)"
                                name="Errors"
                            />
                            <Area
                                type="monotone"
                                dataKey="matches"
                                stroke="#3366FF"
                                fill="url(#colorMatches)"
                                name="Matches"
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                    <p style={{ color: 'green', fontWeight: 'bold' }}>
                        📊 {getImprovementRate()}
                    </p>
                </div>
            </div>
        </>
    );
};

export default AnalystFullErrorPage;
