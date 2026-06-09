import React, { useEffect, useState } from 'react';

const ManageApplications = ({ companyId, onBack }) => {
    const [applications, setApplications] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const [selectedApplication, setSelectedApplication] = useState(null);
    const [selectedView, setSelectedView] = useState(null);

    useEffect(() => {
        fetchApplications();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [companyId]);

    const fetchApplications = async () => {
        if (!companyId) {
            setApplications([]);
            setIsLoading(false);
            return;
        }

        setIsLoading(true);
        setError('');

        try {
            const token = localStorage.getItem('employerToken');
            const response = await fetch(`${process.env.REACT_APP_API_URL || ''}/api/applications/company/${companyId}`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) {
                throw new Error('Failed to fetch applications');
            }

            const data = await response.json();
            setApplications(data);
        } catch (err) {
            console.error('Error fetching applications:', err);
            setError('Failed to load applications. Please try again later.');
        } finally {
            setIsLoading(false);
        }
    };

    const getCandidateProfile = (application) => {
        return application?.user?.jobSeekerId || null;
    };

    const getStatusClassName = (status) => {
        return status ? status.toLowerCase().replace(/\s+/g, '-') : 'submitted';
    };

    const formatDate = (dateString) => {
        if (!dateString) {
            return 'Not available';
        }

        return new Date(dateString).toLocaleDateString(undefined, {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    };

    const formatDataForDisplay = (data) => {
        if (Array.isArray(data)) {
            return data.join(', ');
        }

        if (typeof data === 'string') {
            return data;
        }

        if (data === null || data === undefined) {
            return 'Not specified';
        }

        return JSON.stringify(data);
    };

    const renderList = (items, defaultMessage) => {
        if (!items || (Array.isArray(items) && items.length === 0)) {
            return <p className="empty-info">{defaultMessage}</p>;
        }

        if (Array.isArray(items)) {
            return (
                <ul className="profile-list">
                    {items.map((item, index) => (
                        <li key={index}>
                            {typeof item === 'object'
                                ? `${item.company || item.institution || ''} - ${item.role || item.degree || ''} (${item.dates || ''})`
                                : item}
                        </li>
                    ))}
                </ul>
            );
        }

        return <p>{items}</p>;
    };

    const renderCandidateProfile = () => {
        const candidate = getCandidateProfile(selectedApplication);

        if (!candidate) {
            return (
                <div className="candidate-profile">
                    <div className="candidate-profile-header">
                        <div className="candidate-profile-back">
                            <button onClick={() => setSelectedApplication(null)} className="back-button">
                                Back to Applications
                            </button>
                        </div>
                        <div className="candidate-header-info">
                            <div className="candidate-initial">C</div>
                            <div className="candidate-header-text">
                                <h2>Candidate Profile Unavailable</h2>
                                <p>{selectedApplication?.user?.email || 'Email not available'}</p>
                            </div>
                        </div>
                    </div>
                    <div className="candidate-profile-body">
                        <p className="empty-info">This application is linked to a user account, but no resume profile is available.</p>

                        <div className="section-footer-nav">
                            <button className="back-button responsive-back-button" onClick={onBack}>
                                Back to Dashboard
                            </button>
                        </div>
                    </div>
                </div>
            );
        }

        return (
            <div className="candidate-profile">
                <div className="candidate-profile-header">
                    <div className="candidate-profile-back">
                        <button onClick={() => setSelectedApplication(null)} className="back-button">
                            Back to Applications
                        </button>
                    </div>
                    <div className="candidate-header-info">
                        <div className="candidate-initial">
                            {candidate.name ? candidate.name.charAt(0).toUpperCase() : 'C'}
                        </div>
                        <div className="candidate-header-text">
                            <h2>{candidate.name || 'Unnamed Candidate'}</h2>
                            <p>{candidate.email || selectedApplication?.user?.email || 'Email not available'}</p>
                        </div>
                    </div>
                </div>

                <div className="candidate-profile-body">
                    <div className="profile-section">
                        <h3>Application Message</h3>
                        <p>{selectedApplication.message || 'No message included.'}</p>
                    </div>

                    <div className="profile-section">
                        <h3>Applied Job</h3>
                        <p><strong>{selectedApplication.job?.title || 'Unknown job'}</strong></p>
                        <p>{selectedApplication.job?.location || 'Location not specified'} · {selectedApplication.job?.jobType || 'Type not specified'}</p>
                    </div>

                    <div className="profile-section">
                        <h3>Skills</h3>
                        <div className="skills-container">
                            {Array.isArray(candidate.skills) && candidate.skills.length > 0 ? (
                                candidate.skills.map((skill, index) => (
                                    <span key={index} className="skill-tag">{skill}</span>
                                ))
                            ) : (
                                <p>No skills listed</p>
                            )}
                        </div>
                    </div>

                    <div className="profile-section">
                        <h3>Education</h3>
                        {renderList(candidate.education, 'No education information available')}
                    </div>

                    <div className="profile-section">
                        <h3>Experience</h3>
                        {renderList(candidate.experience, 'No experience information available')}
                    </div>

                    {candidate.achievements && (
                        <div className="profile-section">
                            <h3>Achievements</h3>
                            {renderList(candidate.achievements, 'No achievements listed')}
                        </div>
                    )}

                    {(candidate.interests || candidate.hobbies) && (
                        <div className="profile-section">
                            <h3>Interests & Hobbies</h3>
                            {candidate.interests && (
                                <div className="profile-subsection">
                                    <h4>Interests</h4>
                                    <p>{formatDataForDisplay(candidate.interests)}</p>
                                </div>
                            )}
                            {candidate.hobbies && (
                                <div className="profile-subsection">
                                    <h4>Hobbies</h4>
                                    <p>{formatDataForDisplay(candidate.hobbies)}</p>
                                </div>
                            )}
                        </div>
                    )}

                    <div className="section-footer-nav">
                        <button className="back-button responsive-back-button" onClick={onBack}>
                            Back to Dashboard
                        </button>
                    </div>
                </div>
            </div>
        );
    };

    const handleViewCandidateProfile = (application) => {
        setSelectedApplication(application);
        setSelectedView('profile');
    };

    const handleCloseApplicationView = () => {
        setSelectedApplication(null);
        setSelectedView(null);
    };

    const handleOpenApplication = async (application) => {
        let applicationToOpen = application;

        if (application.status === 'Submitted') {
            try {
                const token = localStorage.getItem('employerToken');
                const response = await fetch(`${process.env.REACT_APP_API_URL || ''}/api/applications/${application._id}`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({
                        status: 'Reviewed'
                    })
                });

                if (!response.ok) {
                    throw new Error('Failed to mark application as reviewed');
                }

                applicationToOpen = {
                    ...application,
                    status: 'Reviewed'
                };

                setApplications(prevApplications => (
                    prevApplications.map(item => (
                        item._id === application._id
                            ? { ...item, status: 'Reviewed' }
                            : item
                    ))
                ));
            } catch (err) {
                console.error('Error updating application status:', err);
                setError('Failed to update application status. Please try again later.');
                return;
            }
        }

        setSelectedApplication(applicationToOpen);
        setSelectedView('application');
    };

    const renderApplicationDetails = () => {
        const candidate = getCandidateProfile(selectedApplication);

        return (
            <div className="application-detail-view">
                <div className="candidate-profile-header">
                    <div className="candidate-profile-back">
                        <button onClick={handleCloseApplicationView} className="back-button">
                            Back to Applications
                        </button>
                    </div>
                    <div className="candidate-header-info">
                        <div className="candidate-initial">
                            {candidate?.name ? candidate.name.charAt(0).toUpperCase() : 'A'}
                        </div>
                        <div className="candidate-header-text">
                            <h2>{selectedApplication.job?.title || 'Application Details'}</h2>
                            <p>{candidate?.name || selectedApplication.user?.email || 'Candidate not available'}</p>
                        </div>
                    </div>
                </div>

                <div className="candidate-profile-body">
                    <div className="profile-section">
                        <h3>Status</h3>
                        <span className={`status-badge ${getStatusClassName(selectedApplication.status)}`}>
                            {selectedApplication.status || 'Submitted'}
                        </span>
                    </div>

                    <div className="profile-section">
                        <h3>Application Details</h3>
                        <p><strong>Candidate:</strong> {candidate?.name || 'Unnamed Candidate'}</p>
                        <p><strong>Email:</strong> {candidate?.email || selectedApplication.user?.email || 'Email not available'}</p>
                        <p><strong>Company:</strong> {selectedApplication.job?.company?.name || 'Not specified'}</p>
                        <p><strong>Location:</strong> {selectedApplication.job?.location || 'Not specified'}</p>
                        <p><strong>Job Type:</strong> {selectedApplication.job?.jobType || 'Not specified'}</p>
                        {selectedApplication.job?.salary && (
                            <p><strong>Salary:</strong> {selectedApplication.job.salary}</p>
                        )}
                        <p><strong>Applied On:</strong> {formatDate(selectedApplication.createdAt)}</p>
                    </div>

                    <div className="profile-section">
                        <h3>Candidate Message</h3>
                        <div className="application-message-preview">
                            <p>{selectedApplication.message || 'No message included.'}</p>
                        </div>
                    </div>

                    <div className="section-footer-nav">
                        <button className="back-button responsive-back-button" onClick={onBack}>
                            Back to Dashboard
                        </button>
                    </div>
                </div>
            </div>
        );
    };

    if (selectedApplication && selectedView === 'profile') {
        return renderCandidateProfile();
    }

    if (selectedApplication && selectedView === 'application') {
        return renderApplicationDetails();
    }

    return (
        <div className="manage-applications-container">
            <div className="manage-jobs-header">
                <h2>Manage Applications</h2>
                <button
                    className="back-button responsive-back-button"
                    onClick={onBack}
                >
                    Back to Dashboard
                </button>
            </div>

            {error && <div className="error-message">{error}</div>}

            {applications.length > 0 && (
                <div className="job-count">
                    {applications.length} application{applications.length !== 1 ? 's' : ''} found
                </div>
            )}

            {isLoading ? (
                <div className="job-list-loading">
                    <div className="loading-spinner"></div>
                    <p>Loading applications...</p>
                </div>
            ) : applications.length === 0 ? (
                <div className="no-jobs-message">
                    <div className="empty-state-image">
                        <svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                        </svg>
                    </div>
                    <h3>No applications yet</h3>
                    <p>Applications submitted from the candidate portal will appear here with their messages and candidate profiles.</p>
                </div>
            ) : (
                <div className="applications-list">
                    {applications.map(application => {
                        const candidate = getCandidateProfile(application);

                        return (
                            <div className="application-card" key={application._id}>
                                <div className="application-card-header">
                                    <div>
                                        <h3>{candidate?.name || 'Unnamed Candidate'}</h3>
                                        <p>{candidate?.email || application.user?.email || 'Email not available'}</p>
                                    </div>
                                    <span className={`status-badge ${getStatusClassName(application.status)}`}>
                                        {application.status || 'Submitted'}
                                    </span>
                                </div>

                                <div className="application-job-summary">
                                    <strong>{application.job?.title || 'Unknown job'}</strong>
                                    <span>{application.job?.location || 'Location not specified'}</span>
                                    <span>Applied {formatDate(application.createdAt)}</span>
                                </div>

                                <div className="application-message-preview">
                                    <h4>Application Message</h4>
                                    <p>{application.message || 'No message included.'}</p>
                                </div>

                                {candidate?.skills && Array.isArray(candidate.skills) && candidate.skills.length > 0 && (
                                    <div className="candidate-skills">
                                        {candidate.skills.slice(0, 5).map((skill, index) => (
                                            <span key={index} className="candidate-skill-tag">{skill}</span>
                                        ))}
                                        {candidate.skills.length > 5 && (
                                            <span className="candidate-skill-tag more">+{candidate.skills.length - 5}</span>
                                        )}
                                    </div>
                                )}

                                <button
                                    className="view-profile-btn secondary-action"
                                    onClick={() => handleOpenApplication(application)}
                                >
                                    Open Application
                                </button>

                                <button
                                    className="view-profile-btn"
                                    onClick={() => handleViewCandidateProfile(application)}
                                >
                                    View Candidate Profile
                                </button>
                            </div>
                        );
                    })}
                </div>
            )}

            <div className="section-footer-nav">
                <button
                    className="back-button responsive-back-button"
                    onClick={onBack}
                >
                    Back to Dashboard
                </button>
            </div>
        </div>
    );
};

export default ManageApplications;
