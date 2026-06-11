import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import PostJob from './PostJob';
import ManageJobs from './ManageJobs';
import MakeAssessment from './MakeAssessment';
import GeneralAssessments from './GeneralAssessments';
import CompanyProfile from './CompanyProfile';
import TalentPool from './TalentPool';
import BookmarkedTalents from './BookmarkedTalents';
import EmployerSettings from './EmployerSettings';
import Inbox from './Inbox';
import logo from './media/logo3.png';

const EmployerDashboard = () => {
    const [employer, setEmployer] = useState(null);
    const [loading, setLoading] = useState(true);
    const [activeSection, setActiveSection] = useState('dashboard');
    const [, setSectionHistory] = useState([]);
    const [companyData, setCompanyData] = useState(null);
    const [jobs, setJobs] = useState([]);
    const [applicationCount, setApplicationCount] = useState(0);
    const [pendingInboxCount, setPendingInboxCount] = useState(0);
    const [mobileSectionVisible, setMobileSectionVisible] = useState(false);
    const navigate = useNavigate();

    const sectionTitles = {
        dashboard: 'Dashboard',
        'post-job': 'Post a Job',
        'manage-jobs': 'Manage Jobs',
        'make-assessment': 'Make an Assessment',
        'general-assessment': 'General Assessment',
        'talent-pool': 'Talent Pool',
        'bookmarked-talents': 'Bookmarked Talents',
        inbox: 'Inbox',
        'company-profile': 'Company Profile',
        settings: 'Settings'
    };

    useEffect(() => {
        const employerData = localStorage.getItem('employer');
        if (!employerData || !localStorage.getItem('employerToken')) {
            navigate('/company');
            return;
        }

        const parsedEmployer = JSON.parse(employerData);
        setEmployer(parsedEmployer);

        fetchCompanyData(parsedEmployer.companyId);
        fetchCompanyJobs(parsedEmployer.companyId);
        fetchApplicationCount(parsedEmployer.companyId);
        fetchEmployerInboxNotifications(parsedEmployer.companyId);
    }, [navigate]);

    const fetchCompanyData = async (companyId) => {
        try {
            const response = await fetch(`${process.env.REACT_APP_API_URL || ''}/api/companies/${companyId}`);
            if (response.ok) {
                const data = await response.json();
                setCompanyData(data);
            } else {
                console.error('Failed to fetch company data');
            }
        } catch (error) {
            console.error('Error fetching company data:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchCompanyJobs = async (companyId) => {
        try {
            const token = localStorage.getItem('employerToken');
            const response = await fetch(`${process.env.REACT_APP_API_URL || ''}/api/companies/${companyId}/jobs`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (response.ok) {
                const data = await response.json();
                setJobs(data);
            } else {
                console.error('Failed to fetch company jobs');
            }
        } catch (error) {
            console.error('Error fetching company jobs:', error);
        }
    };

    const fetchApplicationCount = async (companyId) => {
        try {
            const token = localStorage.getItem('employerToken');
            const response = await fetch(`${process.env.REACT_APP_API_URL || ''}/api/applications/company/${companyId}`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (response.ok) {
                const data = await response.json();
                setApplicationCount(data.length);
            } else {
                console.error('Failed to fetch application count');
            }
        } catch (error) {
            console.error('Error fetching application count:', error);
        }
    };

    const fetchEmployerInboxNotifications = async (companyId) => {
        if (!companyId) {
            setPendingInboxCount(0);
            return;
        }

        try {
            const token = localStorage.getItem('employerToken');
            const response = await fetch(`${process.env.REACT_APP_API_URL || ''}/api/messages/company/${companyId}`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) {
                throw new Error('Failed to fetch inbox notifications');
            }

            const threads = await response.json();
            const seenAt = Number(localStorage.getItem('jumptakeEmployerInboxSeenAt') || 0);
            const unseenCount = (Array.isArray(threads) ? threads : []).filter((thread) => {
                const lastMessage = thread.messages?.[thread.messages.length - 1];
                return lastMessage?.senderType === 'candidate' && new Date(thread.lastMessageAt || lastMessage.createdAt).getTime() > seenAt;
            }).length;

            setPendingInboxCount(unseenCount);
        } catch (inboxError) {
            console.error('Error fetching inbox notifications:', inboxError);
            setPendingInboxCount(0);
        }
    };

    const handleLogout = () => {
        localStorage.removeItem('employerToken');
        localStorage.removeItem('employer');
        navigate('/');
    };

    const handleCompanyUpdated = (updatedCompany) => {
        setCompanyData(updatedCompany);

        setEmployer((prevEmployer) => {
            if (!prevEmployer) {
                return prevEmployer;
            }

            const nextEmployer = {
                ...prevEmployer,
                companyName: updatedCompany.name || prevEmployer.companyName
            };

            localStorage.setItem('employer', JSON.stringify(nextEmployer));
            return nextEmployer;
        });
    };

    const handleEmployerUpdated = (updatedEmployer) => {
        setEmployer((prevEmployer) => {
            if (!prevEmployer) {
                localStorage.setItem('employer', JSON.stringify(updatedEmployer));
                return updatedEmployer;
            }

            const nextEmployer = {
                ...prevEmployer,
                ...updatedEmployer
            };

            localStorage.setItem('employer', JSON.stringify(nextEmployer));
            return nextEmployer;
        });
    };

    const refreshJobs = () => {
        if (employer) {
            fetchCompanyJobs(employer.companyId);
            fetchApplicationCount(employer.companyId);
            fetchEmployerInboxNotifications(employer.companyId);
        }
    };

    const switchSection = (nextSection) => {
        if (!nextSection || nextSection === activeSection) {
            setMobileSectionVisible(true);
            return;
        }

        setSectionHistory((prev) => [...prev, activeSection]);
        setActiveSection(nextSection);
        setMobileSectionVisible(true);
    };

    const openSection = (nextSection) => {
        if (!nextSection) {
            return;
        }

        if (nextSection === 'inbox') {
            setPendingInboxCount(0);
            localStorage.setItem('jumptakeEmployerInboxSeenAt', String(Date.now()));
        }

        if (nextSection === activeSection) {
            setMobileSectionVisible(true);
            return;
        }

        switchSection(nextSection);
    };

    const handleLogoClick = () => {
        setSectionHistory([]);
        setActiveSection('dashboard');
        setMobileSectionVisible(false);
    };

    const closeMobileSectionPanel = () => {
        setMobileSectionVisible(false);
    };

    const goToPreviousSection = () => {
        let previousSection = null;

        setSectionHistory((prev) => {
            if (!prev.length) {
                return prev;
            }

            previousSection = prev[prev.length - 1];
            return prev.slice(0, -1);
        });

        setActiveSection(previousSection || 'dashboard');
    };

    const renderContent = () => {
        switch (activeSection) {
            case 'post-job':
                return <PostJob
                    companyId={employer?.companyId}
                    onJobPosted={refreshJobs}
                    onCancel={() => setActiveSection('dashboard')}
                    onFooterBack={goToPreviousSection}
                />;
            case 'manage-jobs':
                return <ManageJobs
                    jobs={jobs}
                    companyId={employer?.companyId}
                    onJobUpdated={refreshJobs}
                    onBack={() => setActiveSection('dashboard')}
                    onFooterBack={goToPreviousSection}
                />;
            case 'make-assessment':
                return <MakeAssessment
                    companyId={employer?.companyId}
                    jobs={jobs}
                    onBack={() => setActiveSection('dashboard')}
                    onFooterBack={goToPreviousSection}
                />;
            case 'general-assessment':
                return <GeneralAssessments
                    companyId={employer?.companyId}
                    jobs={jobs}
                    onBack={() => setActiveSection('dashboard')}
                    onFooterBack={goToPreviousSection}
                />;
            case 'company-profile':
                return <CompanyProfile
                    company={companyData}
                    jobStats={{
                        activeJobs: jobs.length,
                        totalJobs: jobs.length,
                        applicationsReceived: applicationCount
                    }}
                    onCompanyUpdated={handleCompanyUpdated}
                    onBack={() => setActiveSection('dashboard')}
                    onFooterBack={goToPreviousSection}
                />;
            case 'talent-pool':
                return <TalentPool
                    jobs={jobs}
                    companyId={employer?.companyId}
                    onBack={() => setActiveSection('dashboard')}
                    onFooterBack={goToPreviousSection}
                />;
            case 'bookmarked-talents':
                return <BookmarkedTalents
                    companyId={employer?.companyId}
                    onBack={() => setActiveSection('dashboard')}
                    onFooterBack={goToPreviousSection}
                />;
            case 'inbox':
                return <Inbox
                    mode="employer"
                    companyId={employer?.companyId}
                    onBack={() => setActiveSection('dashboard')}
                    onFooterBack={goToPreviousSection}
                />;
            case 'settings':
                return <EmployerSettings
                    employer={employer}
                    switchSection={switchSection}
                    onEmployerUpdated={handleEmployerUpdated}
                    onLogout={handleLogout}
                    onFooterBack={goToPreviousSection}
                />;
            default:
                return (
                    <div className="dashboard-content">
                        <h2>Welcome to your Employer Dashboard</h2>
                        <p>From here you can post new job listings and manage applications.</p>

                        <div className="dashboard-stats">
                            <div className="stat-card">
                                <h3>{jobs.length}</h3>
                                <p>Active Job Listings</p>
                            </div>
                            <div className="stat-card">
                                <h3>{applicationCount}</h3>
                                <p>New Applicants</p>
                            </div>
                        </div>

                        <div className="dashboard-cards">
                            <div className="dashboard-card">
                                <h3>Post a New Job</h3>
                                <p>Create a new job listing to attract candidates</p>
                                <button
                                    className="card-button"
                                    onClick={() => switchSection('post-job')}
                                >
                                    Post Job
                                </button>
                            </div>

                            <div className="dashboard-card">
                                <h3>Manage Job Listings</h3>
                                <p>Edit or update your current job postings</p>
                                <button
                                    className="card-button"
                                    onClick={() => switchSection('manage-jobs')}
                                >
                                    Manage Jobs
                                </button>
                            </div>

                            <div className="dashboard-card">
                                <h3>Make an Assessment</h3>
                                <p>Create reusable assessments for a job or your general library</p>
                                <button
                                    className="card-button"
                                    onClick={() => switchSection('make-assessment')}
                                >
                                    Open Builder
                                </button>
                            </div>

                            <div className="dashboard-card">
                                <h3>General Assessment</h3>
                                <p>View assessments saved without a specific job</p>
                                <button
                                    className="card-button"
                                    onClick={() => switchSection('general-assessment')}
                                >
                                    View General
                                </button>
                            </div>

                            <div className="dashboard-card">
                                <h3>Talent Pool</h3>
                                <p>Browse and search potential candidates</p>
                                <button
                                    className="card-button"
                                    onClick={() => switchSection('talent-pool')}
                                >
                                    View Candidates
                                </button>
                            </div>

                            <div className="dashboard-card">
                                <h3>Company Profile</h3>
                                <p>View and update your company information</p>
                                <button
                                    className="card-button"
                                    onClick={() => switchSection('company-profile')}
                                >
                                    View Profile
                                </button>
                            </div>

                            <div className="dashboard-card">
                                <h3>Inbox</h3>
                                <p>Read and reply to candidate messages</p>
                                <button
                                    className="card-button"
                                    onClick={() => switchSection('inbox')}
                                >
                                    Open Inbox
                                </button>
                            </div>

                            <div className="dashboard-card">
                                <h3>Settings</h3>
                                <p>Manage security, information shortcuts, and notifications</p>
                                <button
                                    className="card-button"
                                    onClick={() => switchSection('settings')}
                                >
                                    Open Settings
                                </button>
                            </div>
                        </div>
                    </div>
                );
        }
    };

    if (loading) {
        return (
            <div className="loading-container">
                <div className="dashboard-header employer-dashboard-header">
                    <div className="employer-dashboard-brand">
                        <button
                            type="button"
                            className="dashboard-logo-button"
                            onClick={handleLogoClick}
                            aria-label="Go to Dashboard"
                        >
                            <img src={logo} alt="JumpTake" className="employer-dashboard-logo" />
                        </button>
                    </div>
                    <div className="dashboard-title employer-dashboard-title">
                        <h1>Employer Dashboard</h1>
                        <p>Welcome, {employer?.companyName || 'Employer'}</p>
                    </div>
                </div>
                <div className="loading-spinner">Loading...</div>
            </div>
        );
    }

    return (
        <div className="home-page">
            <div className="dashboard-header employer-dashboard-header">
                <div className="employer-dashboard-brand">
                    <button
                        type="button"
                        className="dashboard-logo-button"
                        onClick={handleLogoClick}
                        aria-label="Go to Dashboard"
                    >
                        <img src={logo} alt="JumpTake" className="employer-dashboard-logo" />
                    </button>
                </div>
                <div className="dashboard-title employer-dashboard-title">
                    <h1>Employer Dashboard</h1>
                    <p>Welcome, {employer?.companyName || 'Employer'}</p>
                </div>
            </div>

            <div className="dashboard-container">
                <div className="sidebar">
                    <div className="user-profile">
                        <div className="avatar">
                            {employer?.companyName.charAt(0).toUpperCase() || 'C'}
                        </div>
                        <div className="user-info">
                            <h3>{employer?.companyName || 'Company'}</h3>
                            <p>{employer?.username}</p>
                        </div>
                    </div>
                    <nav className="dashboard-nav">
                        <ul>
                            <li
                                className={activeSection === 'dashboard' ? 'active' : ''}
                                onClick={() => openSection('dashboard')}
                            >
                                Dashboard
                            </li>
                            <li
                                className={activeSection === 'post-job' ? 'active' : ''}
                                onClick={() => openSection('post-job')}
                            >
                                Post a Job
                            </li>
                            <li
                                className={activeSection === 'manage-jobs' ? 'active' : ''}
                                onClick={() => openSection('manage-jobs')}
                            >
                                Manage Jobs
                            </li>
                            <li
                                className={activeSection === 'make-assessment' ? 'active' : ''}
                                onClick={() => openSection('make-assessment')}
                            >
                                Make an Assessment
                            </li>
                            <li
                                className={activeSection === 'general-assessment' ? 'active' : ''}
                                onClick={() => openSection('general-assessment')}
                            >
                                General Assessment
                            </li>
                            <li
                                className={activeSection === 'talent-pool' ? 'active' : ''}
                                onClick={() => openSection('talent-pool')}
                            >
                                Talent Pool
                            </li>
                            <li
                                className={activeSection === 'bookmarked-talents' ? 'active' : ''}
                                onClick={() => openSection('bookmarked-talents')}
                            >
                                Bookmarked Talents
                            </li>
                            <li
                                className={activeSection === 'inbox' ? 'active' : ''}
                                onClick={() => openSection('inbox')}
                            >
                                <span className="dashboard-nav-label">Inbox</span>
                                {pendingInboxCount > 0 && <span className="nav-notification-dot"></span>}
                            </li>
                            <li
                                className={activeSection === 'company-profile' ? 'active' : ''}
                                onClick={() => openSection('company-profile')}
                            >
                                Company Profile
                            </li>
                            <li
                                className={activeSection === 'settings' ? 'active' : ''}
                                onClick={() => openSection('settings')}
                            >
                                Settings
                            </li>
                        </ul>
                    </nav>
                </div>

                <main className={`main-content mobile-dashboard-section-panel ${mobileSectionVisible ? 'is-open' : ''}`}>
                    {mobileSectionVisible && (
                        <div className="mobile-section-panel-header">
                            <button type="button" className="back-button" onClick={closeMobileSectionPanel}>
                                Back
                            </button>
                            <h2>{sectionTitles[activeSection] || 'Dashboard Section'}</h2>
                        </div>
                    )}
                    {renderContent()}
                </main>
            </div>
        </div>
    );
};

export default EmployerDashboard;
