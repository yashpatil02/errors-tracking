import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Home from './Home';
import AnalystDashboard from './AnalystDashboard';
import AdminPanel from './AdminPanel';
import Login from './Login';
import Register from './Register';
import { auth } from './firebaseConfig';
import { doc, getDoc } from "firebase/firestore";
import { db } from './firebaseConfig';
import AnalystFullErrorPage from './AnalystFullErrorPage';
import Navbar from './navbar';
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
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  return (
    <BrowserRouter>
      {!loading && (
        <Routes>
          {/* Auth routes */}
          <Route path="/" element={<Login />} />
          <Route path="/register" element={<Register />} />

          {/* Protected routes */}
          <Route
            path="/home"
            element={
              user ? (
                <Home
                  submittedReports={submittedReports}
                  setSubmittedReports={setSubmittedReports}
                  userMeta={userMeta}  // 👈 Add this
                />
              ) : (
                <Navigate to="/" />
              )
            }
          />

          <Route
            path="/analysts"
            element={
              user ? <AnalystDashboard reports={submittedReports} userMeta={userMeta} /> : <Navigate to="/" />
            }
          />

          <Route
            path="/admin"
            element={
              user && userMeta?.role === 'admin' ? (
                <AdminPanel userMeta={userMeta} />
              ) : (
                <Navigate to="/" />
              )
            }
          />
             <Route path="/analyst/:analystName/errors" element={<AnalystFullErrorPage userMeta={userMeta} />} />
             <Route path="/error-heatmap" element={<HeatmapPage userMeta={userMeta} />} />


        </Routes>
      )}
    </BrowserRouter>
  );

};

export default App;
