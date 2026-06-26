import React from 'react';
import { useNavigate } from 'react-router-dom';
import ResumeDropbox from './ResumeDropbox';

const JobSeeker = () => {
    const navigate = useNavigate();

    const handleLoginClick = () => {
        navigate('/#login');
    };

    const goBack = () => {
        navigate('/');
    };

    return (
        <div className="job-seeker-page">
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
