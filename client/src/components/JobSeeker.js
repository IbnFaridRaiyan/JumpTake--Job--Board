import React from 'react';
import { useNavigate } from 'react-router-dom';
import ResumeDropbox from './ResumeDropbox';
import logoDark from './media/logo4.png';
import logoLight from './media/jumptake-logo-9.png';

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
                    <div className="candidate-entry-brand" aria-label="JumpTake">
                        <img src={logoDark} className="is-dark-logo" alt="JumpTake" />
                        <img src={logoLight} className="is-light-logo" alt="JumpTake" />
                    </div>
                    <h1 className="container-title">Candidate Portal</h1>
                    <p className="container-subtitle">Upload your resume to get started and discover job opportunities that match your skills</p>
                </div>
                
                <ResumeDropbox onLoginClick={handleLoginClick} goBack={goBack} />
            </div>
        </div>
    );
};

export default JobSeeker;
