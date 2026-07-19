import React, { forwardRef, useState, useEffect, useImperativeHandle } from 'react';
import WithdrawButton from './WithdrawButton';
import ResumeFilePreview from './ResumeFilePreview';
import ProfileAvatar from './ProfileAvatar';
import MyAssessments from './MyAssessments';
import VideoInterviews from './VideoInterviews';
import DraftApplications from './DraftApplications';
import confirmAction from '../utils/confirmAction';

const APPLICATION_HUB_TABS = [
    { id: 'applications', label: 'Applications', title: 'My Applications', icon: 'applications' },
    { id: 'assessments', label: 'Assessments', title: 'My Assessments', icon: 'assessments' },
    { id: 'video-interviews', label: 'Video Interviews', title: 'Video Interviews', icon: 'video' },
    { id: 'draft-applications', label: 'Drafts', title: 'Draft Applications', icon: 'drafts' }
];

const MyApplications = forwardRef(({
    userId,
    onRefresh,
    switchSection,
    initialTab = 'applications',
    onPendingAssessmentCountChange
}, ref) => {
    const [applications, setApplications] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [withdrawingId, setWithdrawingId] = useState(null);
    const [message, setMessage] = useState('');
    const [selectedApplication, setSelectedApplication] = useState(null);
    const [selectedCompany, setSelectedCompany] = useState(null);
    const [companyLoading, setCompanyLoading] = useState(false);
    const [companyError, setCompanyError] = useState('');
    const [activeHubTab, setActiveHubTab] = useState(initialTab);
    
    useEffect(() => {
        fetchApplications();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [userId]);

    useEffect(() => {
        setActiveHubTab(initialTab);
    }, [initialTab]);
    
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
        const confirmed = await confirmAction({
            title: 'Withdraw application?',
            message: 'Withdraw this application?'
        });
        if (!confirmed) {
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
            if (activeHubTab !== 'applications') {
                setActiveHubTab('applications');
                return true;
            }

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
    }), [activeHubTab, selectedApplication, selectedCompany]);

    const getTabTitle = () => (
        APPLICATION_HUB_TABS.find((tab) => tab.id === activeHubTab)?.title || 'My Applications'
    );

    const renderHubIcon = (icon) => {
        const paths = {
            applications: 'M4 3.5h8.5L17 8v12.5H4v-17Zm8 1.8V8.5h3.2L12 5.3ZM6 6v12.5h9V10h-5V6H6Zm1.5 6h6v1.4h-6V12Zm0 3h5v1.4h-5V15Z',
            assessments: 'M4 3h12l4 4v14H4V3Zm11 2v3h3l-3-3ZM6 5v14h12V10h-5V5H6Zm2.2 7.4 1.5 1.5 3.8-4 1 1-4.8 5.1-2.5-2.5 1-1.1Z',
            video: 'M4 6h9.5A2.5 2.5 0 0 1 16 8.5v.75l4-2.25v10l-4-2.25v.75a2.5 2.5 0 0 1-2.5 2.5H4A2.5 2.5 0 0 1 1.5 15.5v-7A2.5 2.5 0 0 1 4 6Zm0 2a.5.5 0 0 0-.5.5v7A.5.5 0 0 0 4 16h9.5a.5.5 0 0 0 .5-.5v-7a.5.5 0 0 0-.5-.5H4Z',
            drafts: 'M5 3h10l4 4v14H5V3Zm9 2v4h4l-4-4ZM7 5v14h10v-8h-5V5H7Zm2 8h6v1.4H9V13Zm0 3h4.5v1.4H9V16Z'
        };

        return (
            <svg className="applications-hub-tab-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                <path d={paths[icon] || paths.applications} />
            </svg>
        );
    };

    const renderHubShell = (children) => (
        <div className="applications-container applications-hub-container">
            <div className="section-header applications-hub-header">
                <h2>{getTabTitle()}</h2>
                {activeHubTab === 'applications' && (
                    <div className="section-actions">
                        <button className="refresh-button" onClick={fetchApplications}>
                            Refresh
                        </button>
                    </div>
                )}
            </div>

            <nav className="applications-hub-nav" aria-label="My applications sections">
                {APPLICATION_HUB_TABS.map((tab) => (
                    <button
                        type="button"
                        key={tab.id}
                        className={`applications-hub-tab ${activeHubTab === tab.id ? 'active' : ''}`}
                        onClick={() => setActiveHubTab(tab.id)}
                        aria-pressed={activeHubTab === tab.id}
                        title={tab.title}
                    >
                        {renderHubIcon(tab.icon)}
                        <span>{tab.label}</span>
                    </button>
                ))}
            </nav>

            <div className="applications-hub-panel">
                {children}
            </div>
        </div>
    );

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
    
    if (activeHubTab === 'assessments') {
        return renderHubShell(
            <MyAssessments
                userId={userId}
                onRefresh={onRefresh}
                onPendingCountChange={onPendingAssessmentCountChange}
                switchSection={switchSection}
                onFooterBack={() => setActiveHubTab('applications')}
                embedded
            />
        );
    }

    if (activeHubTab === 'video-interviews') {
        return renderHubShell(
            <VideoInterviews
                userId={userId}
                switchSection={switchSection}
                onFooterBack={() => setActiveHubTab('applications')}
                embedded
            />
        );
    }

    if (activeHubTab === 'draft-applications') {
        return renderHubShell(
            <DraftApplications
                userId={userId}
                switchSection={switchSection}
                onFooterBack={() => setActiveHubTab('applications')}
                embedded
            />
        );
    }

    if (loading) {
        return renderHubShell(
                <div className="loading-container">
                    <div className="loading-spinner"></div>
                    <p>Loading your applications...</p>
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
                    <div className="profile-section company-profile-summary">
                        <ProfileAvatar imageSrc={selectedCompany.logo} name={selectedCompany.name} className="application-company-logo" imageClassName="profile-avatar-image" />
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
                            Back to Application
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    if (selectedApplication) {
        const submittedProfile = getSubmittedProfile(selectedApplication);
        const uploadedResume = selectedApplication.uploadedResume;
        const canWithdrawSelectedApplication = selectedApplication.status !== 'Withdrawn'
            && selectedApplication.status !== 'Rejected'
            && selectedApplication.status !== 'Unsuccessful';

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

                    {uploadedResume ? (
                        <div className="profile-section">
                            <h3>Resume Preview</h3>
                            <ResumeFilePreview resume={uploadedResume} className="application-uploaded-resume-preview-readonly" />
                        </div>
                    ) : submittedProfile && (
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
                        {canWithdrawSelectedApplication && (
                            <WithdrawButton
                                onClick={() => handleWithdraw(selectedApplication._id)}
                                disabled={withdrawingId === selectedApplication._id}
                                title={withdrawingId === selectedApplication._id ? 'Withdrawing...' : 'Withdraw'}
                            />
                        )}
                        <button
                            className="back-button application-detail-back-icon"
                            onClick={() => setSelectedApplication(null)}
                            aria-label="Back to My Applications"
                            title="Back"
                        >
                            <span aria-hidden="true">&lt;</span>
                        </button>
                    </div>
                </div>
            </div>
        );
    }
    
    return renderHubShell(
        <>
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
                        <svg className="application-empty-action-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" aria-hidden="true" focusable="false">
                            <path d="M6.5 1A1.5 1.5 0 0 0 5 2.5V3H1.5A1.5 1.5 0 0 0 0 4.5v1.384l7.614 2.03a1.5 1.5 0 0 0 .772 0L16 5.884V4.5A1.5 1.5 0 0 0 14.5 3H11v-.5A1.5 1.5 0 0 0 9.5 1zm0 1h3a.5.5 0 0 1 .5.5V3H6v-.5a.5.5 0 0 1 .5-.5M0 12.5A1.5 1.5 0 0 0 1.5 14h13a1.5 1.5 0 0 0 1.5-1.5V6.85L8.129 8.947a.5.5 0 0 1-.258 0L0 6.85z" />
                        </svg>
                        Browse Jobs
                    </button>
                </div>
            ) : (
                <div className="fresh-applications-list">
                    {applications.map(app => {
                        return (
                            <article
                                className="fresh-application-card fresh-application-card-clickable"
                                key={app._id}
                                role="button"
                                tabIndex={0}
                                onClick={() => setSelectedApplication(app)}
                                onKeyDown={(event) => {
                                    if (event.key === 'Enter' || event.key === ' ') {
                                        event.preventDefault();
                                        setSelectedApplication(app);
                                    }
                                }}
                                aria-label={`View details for ${getJobTitle(app)}`}
                            >
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
                            </article>
                        );
                    })}
                </div>
            )}

        </>
    );
});

export default MyApplications;
