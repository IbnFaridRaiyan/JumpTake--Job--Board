import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import PostJob from './PostJob';
import ManageJobs from './ManageJobs';
import ManageApplications from './ManageApplications';
import MakeAssessment from './MakeAssessment';
import CompanyProfile from './CompanyProfile';
import TalentPool from './TalentPool';
import EmployerSettings from './EmployerSettings';

const EmployerDashboard = () => {
    const [employer, setEmployer] = useState(null);
    const [loading, setLoading] = useState(true);
    const [activeSection, setActiveSection] = useState('dashboard');
    const [, setSectionHistory] = useState([]);
    const [companyData, setCompanyData] = useState(null);
    const [jobs, setJobs] = useState([]);
    const [applicationCount, setApplicationCount] = useState(0);
    const navigate = useNavigate();

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
        }
    };

    const switchSection = (nextSection) => {
        if (!nextSection || nextSection === activeSection) {
            return;
        }

        setSectionHistory((prev) => [...prev, activeSection]);
        setActiveSection(nextSection);
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
            case 'manage-applications':
                return <ManageApplications
                    companyId={employer?.companyId}
                    onBack={() => setActiveSection('dashboard')}
                    onFooterBack={goToPreviousSection}
                />;
            case 'make-assessment':
                return <MakeAssessment
                    companyId={employer?.companyId}
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
                                <h3>Manage Applications</h3>
                                <p>Review candidate applications and profile details</p>
                                <button
                                    className="card-button"
                                    onClick={() => switchSection('manage-applications')}
                                >
                                    View Applications
                                </button>
                            </div>

                            <div className="dashboard-card">
                                <h3>Make an Assessment</h3>
                                <p>Create question sets for candidates with options or written responses</p>
                                <button
                                    className="card-button"
                                    onClick={() => switchSection('make-assessment')}
                                >
                                    Open Builder
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
                <div className="dashboard-header">
                    <div className="dashboard-title">
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
            <div className="dashboard-header">
                <div className="dashboard-title">
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
                                onClick={() => setActiveSection('dashboard')}
                            >
                                Dashboard
                            </li>
                            <li
                                className={activeSection === 'post-job' ? 'active' : ''}
                                onClick={() => switchSection('post-job')}
                            >
                                Post a Job
                            </li>
                            <li
                                className={activeSection === 'manage-jobs' ? 'active' : ''}
                                onClick={() => switchSection('manage-jobs')}
                            >
                                Manage Jobs
                            </li>
                            <li
                                className={activeSection === 'manage-applications' ? 'active' : ''}
                                onClick={() => switchSection('manage-applications')}
                            >
                                Manage Applications
                            </li>
                            <li
                                className={activeSection === 'make-assessment' ? 'active' : ''}
                                onClick={() => switchSection('make-assessment')}
                            >
                                Make an Assessment
                            </li>
                            <li
                                className={activeSection === 'talent-pool' ? 'active' : ''}
                                onClick={() => switchSection('talent-pool')}
                            >
                                Talent Pool
                            </li>
                            <li
                                className={activeSection === 'company-profile' ? 'active' : ''}
                                onClick={() => switchSection('company-profile')}
                            >
                                Company Profile
                            </li>
                            <li
                                className={activeSection === 'settings' ? 'active' : ''}
                                onClick={() => switchSection('settings')}
                            >
                                Settings
                            </li>
                        </ul>
                    </nav>
                </div>

                <main className="main-content">
                    {renderContent()}
                </main>
            </div>
        </div>
    );
};

export default EmployerDashboard;
