import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import Home from './Home';
import AnalystDashboard from './AnalystDashboard';
import AdminPanel from './AdminPanel';
import Login from './Login';
import Register from './Register';
import { auth } from './firebaseConfig';
import { doc, getDoc } from "firebase/firestore";
import { db } from './firebaseConfig';
import AnalystFullErrorPage from './AnalystFullErrorPage';
import HeatmapPage from './HeatmapSection';

const App = () => {
  const [user, setUser] = useState(null);
  const [submittedReports, setSubmittedReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [userMeta, setUserMeta] = useState(null);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        const userDoc = await getDoc(doc(db, "users", currentUser.uid));
        if (userDoc.exists()) {
          setUserMeta(userDoc.data()); // 👈 role + approved yaha milega
        }
      } else {
        setUserMeta(null);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Debugging log
  useEffect(() => {
    console.log("User Meta Loaded:", userMeta);
  }, [userMeta]);

  // ⏩ Agar login hogya aur role milgya → uske role ke hisaab se default redirect
  const getDefaultRoute = () => {
    if (!user || !userMeta) return "/";
    if (userMeta.role === "admin") return "/admin";
    if (userMeta.role === "qc-manager") return "/home";
    if (userMeta.role === "analyst") return "/analysts";
    return "/";
  };

  if (loading) {
    return <div>Loading...</div>; // jab tak firebase se user/role aa nahi jata
  }

  return (
    <BrowserRouter>
      <Routes>
        {/* Auth routes */}
        <Route
          path="/"
          element={
            user ? <Navigate to={getDefaultRoute()} /> : <Login />
          }
        />
        <Route path="/register" element={<Register />} />

        {/* Protected routes */}
        <Route
          path="/home"
          element={
            user && (userMeta?.role === 'qc-manager' || userMeta?.role === 'admin')
              ? <Home submittedReports={submittedReports} setSubmittedReports={setSubmittedReports} userMeta={userMeta} />
              : <Navigate to="/" />
          }
        />

        <Route
          path="/analysts"
          element={
            user && (userMeta?.role === 'analyst' || userMeta?.role === 'qc-manager' || userMeta?.role === 'admin')
              ? <AnalystDashboard reports={submittedReports} userMeta={userMeta} />
              : <Navigate to="/" />
          }
        />

        <Route
          path="/admin"
          element={
            user && userMeta?.role === 'admin'
              ? <AdminPanel userMeta={userMeta} />
              : <Navigate to="/" />
          }
        />

        <Route
          path="/analyst/:analystName/errors"
          element={
            user
              ? <AnalystFullErrorPage userMeta={userMeta} />
              : <Navigate to="/" />
          }
        />

        <Route
          path="/error-heatmap"
          element={
            user && (userMeta?.role === 'analyst' || userMeta?.role === 'qc-manager' || userMeta?.role === 'admin')
              ? <HeatmapPage userMeta={userMeta} />
              : <Navigate to="/" />
          }
        />
      </Routes>
    </BrowserRouter>
  );
};

export default App;
