import React, { useState } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import ResumeDropbox from './ResumeDropbox';
import Header from './Header';
import Landing from './Landing';
import Company from './Company';
import Login from './Login';
import HomePage from './HomePage';
import EmployerDashboard from './EmployerDashboard';
import JobSeeker from './JobSeeker'; 

function App() {
  const [showLogin, setShowLogin] = useState(false);

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
          <Route path="/home" element={<HomePage />} />
          <Route path="/employer-dashboard" element={<EmployerDashboard />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}

export default App;