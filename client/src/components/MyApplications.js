import React, { forwardRef, useState, useEffect, useImperativeHandle } from 'react';
import WithdrawButton from './WithdrawButton';

const MyApplications = forwardRef(({ userId, onRefresh, switchSection, onFooterBack }, ref) => {
    const [applications, setApplications] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [withdrawingId, setWithdrawingId] = useState(null);
    const [message, setMessage] = useState('');
    const [selectedApplication, setSelectedApplication] = useState(null);
    const [selectedCompany, setSelectedCompany] = useState(null);
    const [companyLoading, setCompanyLoading] = useState(false);
    const [companyError, setCompanyError] = useState('');
    
    useEffect(() => {
        fetchApplications();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [userId]);
    
    const fetchApplications = async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem('token');
            const response = await fetch(`${process.env.REACT_APP_API_URL || ''}/api/applications/user/${userId}`, {
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
            setError('Failed to load your applications. Please try again later.');
        } finally {
            setLoading(false);
        }
    };
    
    const handleWithdraw = async (applicationId) => {
        if (!window.confirm('Are you sure you want to withdraw this application?')) {
            return;
        }
        
        setWithdrawingId(applicationId);
        
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${process.env.REACT_APP_API_URL || ''}/api/applications/${applicationId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    status: 'Withdrawn'
                })
            });
            
            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || 'Failed to withdraw application');
            }
            
            setMessage('Application withdrawn successfully');
            
            
            fetchApplications();
            if (onRefresh) onRefresh();
            
           
            setTimeout(() => {
                setMessage('');
            }, 3000);
            
        } catch (error) {
            console.error('Error withdrawing application:', error);
            setMessage(`Error: ${error.message}`);
        } finally {
            setWithdrawingId(null);
        }
    };
    
    const handleBrowseJobs = () => {
      
        if (switchSection) {
            switchSection('job-feed');
        }
    };

    useImperativeHandle(ref, () => ({
        goBackOneStep: () => {
            if (selectedCompany) {
                setSelectedCompany(null);
                return true;
            }

            if (selectedApplication) {
                setSelectedApplication(null);
                return true;
            }

            return false;
        }
    }), [selectedApplication, selectedCompany]);

    const getJobTitle = (application) => {
        return application?.job?.title || 'Job no longer available';
    };

    const getCompanyName = (application) => {
        return application?.job?.company?.name || 'Company unavailable';
    };

    const getJobNumber = (application) => {
        return application?.job?.jobNumber || 'Generating...';
    };

    const getSubmittedProfile = (application) => {
        return application?.profileSnapshot || null;
    };

    const formatFoundedDate = (founded) => {
        if (!founded) {
            return 'Not specified';
        }

        if (/^\d{4}$/.test(founded)) {
            return `Founded in ${founded}`;
        }

        return founded;
    };

    const renderList = (items, emptyMessage) => {
        if (!items || (Array.isArray(items) && items.length === 0)) {
            return <p>{emptyMessage}</p>;
        }

        if (Array.isArray(items)) {
            return (
                <ul className="profile-list">
                    {items.map((item, index) => (
                        <li key={index}>{item}</li>
                    ))}
                </ul>
            );
        }

        return <p>{items}</p>;
    };

    const renderRichTextPreview = (html, emptyMessage) => {
        if (!html) {
            return <p>{emptyMessage}</p>;
        }

        return <div className="cover-letter-preview" dangerouslySetInnerHTML={{ __html: html }} />;
    };
    
    const getStatusBadgeClass = (status) => {
        switch (status) {
            case 'Submitted':
                return 'status-badge-submitted';
            case 'Reviewed':
                return 'status-badge-review';
            case 'Under Review':
                return 'status-badge-review';
            case 'Accepted':
                return 'status-badge-accepted';
            case 'On Hold':
                return 'status-badge-review';
            case 'Rejected':
                return 'status-badge-rejected';
            case 'Unsuccessful':
                return 'status-badge-rejected';
            case 'Withdrawn':
                return 'status-badge-withdrawn';
            default:
                return 'status-badge-submitted';
        }
    };

    const handleViewCompany = async () => {
        const companyId = selectedApplication?.job?.company?._id;

        if (!companyId) {
            setCompanyError('Company profile is not available for this application.');
            return;
        }

        setCompanyLoading(true);
        setCompanyError('');

        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${process.env.REACT_APP_API_URL || ''}/api/companies/${companyId}`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) {
                throw new Error('Failed to fetch company profile');
            }

            const data = await response.json();
            setSelectedCompany(data);
        } catch (err) {
            console.error('Error fetching company profile:', err);
            setCompanyError('Failed to load company profile. Please try again later.');
        } finally {
            setCompanyLoading(false);
        }
    };
    
    if (loading) {
        return (
            <div className="applications-container">
                <div className="section-header">
                    <h2>My Applications</h2>
                </div>
                <div className="loading-container">
                    <div className="loading-spinner"></div>
                    <p>Loading your applications...</p>
                </div>
            </div>
        );
    }

    if (selectedCompany) {
        return (
            <div className="applications-container">
                <div className="section-header">
                    <h2>Company Profile</h2>
                    <div className="section-actions">
                        <button className="back-button" onClick={() => setSelectedCompany(null)}>
                            Back to Application
                        </button>
                    </div>
                </div>

                <div className="application-detail-view">
                    <div className="profile-section">
                        <h3>{selectedCompany.name}</h3>
                        <p>{selectedCompany.industry || 'Industry not specified'}</p>
                    </div>

                    <div className="profile-section">
                        <h3>Company Details</h3>
                        <p><strong>Founded:</strong> {formatFoundedDate(selectedCompany.founded)}</p>
                        <p><strong>Headquarters:</strong> {selectedCompany.headquarters || 'Not specified'}</p>
                        <p><strong>Website:</strong> {selectedCompany.website || 'Not specified'}</p>
                    </div>

                    <div className="profile-section">
                        <h3>About</h3>
                        <p>{selectedCompany.description || 'No company description available.'}</p>
                    </div>

                    <div className="section-footer-nav">
                        <button className="back-button" onClick={() => setSelectedCompany(null)}>
                            Back
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    if (selectedApplication) {
        const submittedProfile = getSubmittedProfile(selectedApplication);

        return (
            <div className="applications-container">
                <div className="section-header">
                    <h2>Application Details</h2>
                    <div className="section-actions">
                        <button className="back-button" onClick={() => setSelectedApplication(null)}>
                            Back to Applications
                        </button>
                    </div>
                </div>

                <div className="application-detail-view">
                    <div className="profile-section">
                        <h3>Status</h3>
                        <div className="status-detail-row">
                            <span className={`status-badge ${getStatusBadgeClass(selectedApplication.status)}`}>
                                {selectedApplication.status}
                            </span>
                            <button
                                className="view-button"
                                onClick={handleViewCompany}
                                disabled={companyLoading}
                            >
                                {companyLoading ? 'Opening...' : 'View Company'}
                            </button>
                        </div>
                        {companyError && <div className="error-message">{companyError}</div>}
                    </div>

                    <div className="profile-section">
                        <h3>Job Information</h3>
                        <p><strong>Job Title:</strong> {getJobTitle(selectedApplication)}</p>
                        <p><strong>Job Number:</strong> {getJobNumber(selectedApplication)}</p>
                        <p><strong>Company:</strong> {getCompanyName(selectedApplication)}</p>
                        <p><strong>Applied On:</strong> {new Date(selectedApplication.createdAt).toLocaleDateString()}</p>
                    </div>

                    <div className="profile-section">
                        <h3>Application Message</h3>
                        <div className="application-message-preview">
                            <p>{selectedApplication.message || 'No message included.'}</p>
                        </div>
                    </div>

                    <div className="profile-section">
                        <h3>Submitted Cover Letter</h3>
                        {renderRichTextPreview(selectedApplication.coverLetterHtml, 'No cover letter included.')}
                    </div>

                    {submittedProfile && (
                        <div className="profile-section">
                            <h3>Submitted Profile Snapshot</h3>
                            <p><strong>Full Name:</strong> {submittedProfile.name || 'Not specified'}</p>
                            <p><strong>Email:</strong> {submittedProfile.email || 'Not specified'}</p>
                            <div className="profile-subsection">
                                <h4>Skills</h4>
                                {renderList(submittedProfile.skills, 'No skills included.')}
                            </div>
                            <div className="profile-subsection">
                                <h4>Education</h4>
                                {renderList(submittedProfile.education, 'No education included.')}
                            </div>
                            <div className="profile-subsection">
                                <h4>Experience</h4>
                                {renderList(submittedProfile.experience, 'No experience included.')}
                            </div>
                            <div className="profile-subsection">
                                <h4>Achievements</h4>
                                {renderList(submittedProfile.achievements, 'No achievements included.')}
                            </div>
                        </div>
                    )}

                    <div className="section-footer-nav">
                        <button className="back-button" onClick={handleBrowseJobs}>
                            Back to Job Feed
                        </button>
                    </div>
                </div>
            </div>
        );
    }
    
    return (
        <div className="applications-container">
            <div className="section-header">
                <h2>My Applications</h2>
                <div className="section-actions">
                    <button className="refresh-button" onClick={fetchApplications}>
                        Refresh
                    </button>
                </div>
            </div>
            
            {message && (
                <div className={`notification-message ${message.includes('Error') ? 'error' : 'success'}`}>
                    {message}
                </div>
            )}
            
            {error && <div className="error-message">{error}</div>}
            
            {applications.length === 0 ? (
                <div className="no-applications-message">
                    <h3>No applications yet</h3>
                    <p>You haven't applied to any jobs. Head over to the Job Feed to find opportunities.</p>
                    <button 
                        className="job-search-link" 
                        onClick={handleBrowseJobs}
                    >
                        Browse Jobs
                    </button>
                </div>
            ) : (
                <div className="fresh-applications-list">
                    {applications.map(app => {
                        const canWithdraw = app.status !== 'Withdrawn'
                            && app.status !== 'Rejected'
                            && app.status !== 'Unsuccessful';

                        return (
                            <article className="fresh-application-card" key={app._id}>
                                <div className="fresh-application-card-header">
                                    <div className="fresh-application-title-block">
                                        <span>Job Title</span>
                                        <h3>{getJobTitle(app)}</h3>
                                    </div>
                                    <span className={`status-badge ${getStatusBadgeClass(app.status)}`}>
                                        {app.status}
                                    </span>
                                </div>

                                <div className="fresh-application-meta-grid">
                                    <div>
                                        <span>Job Number</span>
                                        <strong>{getJobNumber(app)}</strong>
                                    </div>
                                    <div>
                                        <span>Company</span>
                                        <strong>{getCompanyName(app)}</strong>
                                    </div>
                                    <div>
                                        <span>Applied On</span>
                                        <strong>{new Date(app.createdAt).toLocaleDateString()}</strong>
                                    </div>
                                </div>

                                <div className="fresh-application-actions">
                                    {canWithdraw && (
                                        <WithdrawButton
                                            onClick={() => handleWithdraw(app._id)}
                                            disabled={withdrawingId === app._id}
                                            title={withdrawingId === app._id ? 'Withdrawing...' : 'Withdraw'}
                                        />
                                    )}
                                    <button className="view-button application-view-details-button" onClick={() => setSelectedApplication(app)}>
                                        View Details
                                    </button>
                                </div>
                            </article>
                        );
                    })}
                </div>
            )}

            <div className="page-footer-actions">
                <button 
                    className="back-button"
                    onClick={handleBrowseJobs}
                >
                    Back to Job Feed
                </button>
                <button
                    className="back-button"
                    onClick={onFooterBack || handleBrowseJobs}
                >
                    Back
                </button>
            </div>
        </div>
    );
});

export default MyApplications;
