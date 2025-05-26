import React, { useState, useEffect } from 'react';

const CompanyProfile = ({ company, onBack }) => {
    const [jobStats, setJobStats] = useState({
        activeJobs: 0,
        totalJobs: 0,
        applicationsReceived: 0
    });
    
    useEffect(() => {
        
        if (company) {
            setJobStats({
                activeJobs: Math.floor(Math.random() * 5) + 1,
                totalJobs: Math.floor(Math.random() * 10) + 5,
                applicationsReceived: Math.floor(Math.random() * 20) + 10
            });
        }
    }, [company]);
    
    if (!company) {
        return (
            <div className="company-profile-container">
                <div className="company-profile-header">
                    <h2>Company Profile</h2>
                    <button 
                        className="back-button"
                        onClick={onBack}
                    >
                        Back to Dashboard
                    </button>
                </div>
                <div className="loading-message">
                    Loading company profile...
                </div>
            </div>
        );
    }
    
   
    const formatFoundedDate = (founded) => {
        if (!founded) return 'Not specified';
        
        
        if (/^\d{4}$/.test(founded)) {
            return `Founded in ${founded}`;
        }
        
        return founded;
    };
    
    return (
        <div className="company-profile-container">
            <div className="company-profile-header">
                <h2>Company Profile</h2>
                <button 
                    className="back-button"
                    onClick={onBack}
                >
                    Back to Dashboard
                </button>
            </div>
            
            <div className="company-profile-content">
                <div className="company-profile-card">
                    <div className="company-header">
                        <div className="company-avatar">
                            {company.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="company-title">
                            <h3>{company.name}</h3>
                            <span className="company-industry">{company.industry || 'Industry not specified'}</span>
                        </div>
                    </div>
                    
                    <div className="company-details">
                        <div className="detail-item">
                            <span className="detail-label founded">Founded</span>
                            <span className="detail-value">{formatFoundedDate(company.founded)}</span>
                        </div>
                        
                        <div className="detail-item">
                            <span className="detail-label headquarters">Headquarters</span>
                            <span className="detail-value">{company.headquarters || 'Not specified'}</span>
                        </div>
                        
                        <div className="detail-item">
                            <span className="detail-label website">Website</span>
                            <span className="detail-value">
                                {company.website ? (
                                    <a href={company.website} target="_blank" rel="noopener noreferrer">
                                        {company.website}
                                    </a>
                                ) : 'Not specified'}
                            </span>
                        </div>
                        
                        <div className="detail-item full-width">
                            <span className="detail-label about">About</span>
                            <div className="company-description">
                                {company.description || 'No company description available.'}
                            </div>
                        </div>
                    </div>
                    
                    <div className="company-stats">
                        <div className="stat-box">
                            <div className="stat-number">{jobStats.activeJobs}</div>
                            <div className="stat-label">Active Jobs</div>
                        </div>
                        
                        <div className="stat-box">
                            <div className="stat-number">{jobStats.totalJobs}</div>
                            <div className="stat-label">Total Job Posts</div>
                        </div>
                        
                        <div className="stat-box">
                            <div className="stat-number">{jobStats.applicationsReceived}</div>
                            <div className="stat-label">Applications</div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CompanyProfile;