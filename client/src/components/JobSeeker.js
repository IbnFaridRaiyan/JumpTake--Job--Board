import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import ResumeDropbox from './ResumeDropbox';
import Login from './Login';
import candidateVideo from './media/employee.mp4';

const JobSeeker = ({ onLoginClick }) => {
    const [showLogin, setShowLogin] = useState(false);
    const navigate = useNavigate();

    const handleLoginClick = () => {
        if (onLoginClick) {
            onLoginClick();
        } else {
            setShowLogin(true);
        }
    };

    const handleCloseLogin = () => {
        setShowLogin(false);
    };

    const goBack = () => {
        navigate('/');
    };

    return (
        <div className="job-seeker-page">
            {/* Video Background */}
            <div className="candidate-video-background">
                <video autoPlay loop muted playsInline>
                    <source src={candidateVideo} type="video/mp4" />
                    Your browser does not support the video tag.
                </video>
                <div className="candidate-video-overlay"></div>
            </div>
            
            {showLogin && <Login onClose={handleCloseLogin} />}
            
            <div className="job-seeker-container">
                <div className="container-header">
                    <h1 className="container-title">Candidate Portal</h1>
                    <p className="container-subtitle">Upload your resume to get started and discover job opportunities that match your skills</p>
                </div>
                
                <ResumeDropbox onLoginClick={handleLoginClick} goBack={goBack} />
            </div>
        </div>
    );
};

export default JobSeeker;