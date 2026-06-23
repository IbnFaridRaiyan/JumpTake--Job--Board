import React, { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Landing from './Landing';
import Company from './Company';
import Login from './Login';
import HomePage from './HomePage';
import EmployerDashboard from './EmployerDashboard';
import JobSeeker from './JobSeeker'; 
import ResetPasswordPage from './ResetPasswordPage';
import AdminPanel from './AdminPanel';

const APP_MODE_STORAGE_KEY = 'jumptakeAppMode';
const ADMIN_PANEL_PATH = process.env.REACT_APP_ADMIN_PANEL_PATH || '/jt-owner-console-9x4k2-admin';

const getInitialAppMode = () => {
  if (typeof window === 'undefined') {
    return 'dark';
  }

  return localStorage.getItem(APP_MODE_STORAGE_KEY) === 'light' ? 'light' : 'dark';
};

function App() {
  const [showLogin, setShowLogin] = useState(false);
  const [appMode, setAppMode] = useState(getInitialAppMode);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', appMode);
    document.body.setAttribute('data-theme', appMode);
    localStorage.setItem(APP_MODE_STORAGE_KEY, appMode);
  }, [appMode]);

  const handleLoginClick = () => {
    setShowLogin(true);
  };

  const handleCloseLogin = () => {
    setShowLogin(false);
  };

  return (
    <BrowserRouter>
      <div className="app-container">
        {showLogin && <Login onClose={handleCloseLogin} />}
        
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/job-seeker" element={<JobSeeker onLoginClick={handleLoginClick} />} />
          <Route path="/company" element={<Company />} />
          <Route path="/home" element={<HomePage appMode={appMode} onAppModeChange={setAppMode} />} />
          <Route path="/employer-dashboard" element={<EmployerDashboard appMode={appMode} onAppModeChange={setAppMode} />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route path={ADMIN_PANEL_PATH} element={<AdminPanel />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}

export default App;
