import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import PostJob from './PostJob';
import ManageJobs from './ManageJobs';
import ManageApplications from './ManageApplications';
import CompanyProfile from './CompanyProfile';
import TalentPool from './TalentPool'; 

const EmployerDashboard = () => {
    const [employer, setEmployer] = useState(null);
    const [loading, setLoading] = useState(true);
    const [activeSection, setActiveSection] = useState('dashboard');
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
    
    const refreshJobs = () => {
        
        if (employer) {
            fetchCompanyJobs(employer.companyId);
            fetchApplicationCount(employer.companyId);
        }
    };

    const renderContent = () => {
        switch(activeSection) {
            case 'post-job':
                return <PostJob 
                    companyId={employer?.companyId} 
                    onJobPosted={refreshJobs}
                    onCancel={() => setActiveSection('dashboard')}
                />;
            case 'manage-jobs':
                return <ManageJobs 
                    jobs={jobs} 
                    companyId={employer?.companyId}
                    onJobUpdated={refreshJobs}
                    onBack={() => setActiveSection('dashboard')}
                />;
            case 'manage-applications':
                return <ManageApplications
                    companyId={employer?.companyId}
                    onBack={() => setActiveSection('dashboard')}
                />;
            case 'company-profile':
                return <CompanyProfile
                    company={companyData}
                    onBack={() => setActiveSection('dashboard')}
                />;
            case 'talent-pool':
                return <TalentPool
                    jobs={jobs}
                    onBack={() => setActiveSection('dashboard')}
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
                                    onClick={() => setActiveSection('post-job')}
                                >
                                    Post Job
                                </button>
                            </div>
                            
                            <div className="dashboard-card">
                                <h3>Manage Job Listings</h3>
                                <p>Edit or update your current job postings</p>
                                <button 
                                    className="card-button" 
                                    onClick={() => setActiveSection('manage-jobs')}
                                >
                                    Manage Jobs
                                </button>
                            </div>

                            <div className="dashboard-card">
                                <h3>Manage Applications</h3>
                                <p>Review candidate applications and profile details</p>
                                <button 
                                    className="card-button" 
                                    onClick={() => setActiveSection('manage-applications')}
                                >
                                    View Applications
                                </button>
                            </div>
                            
                            {/* Add new card for Talent Pool */}
                            <div className="dashboard-card">
                                <h3>Talent Pool</h3>
                                <p>Browse and search potential candidates</p>
                                <button 
                                    className="card-button" 
                                    onClick={() => setActiveSection('talent-pool')}
                                >
                                    View Candidates
                                </button>
                            </div>
                            
                            <div className="dashboard-card">
                                <h3>Company Profile</h3>
                                <p>View and update your company information</p>
                                <button 
                                    className="card-button"
                                    onClick={() => setActiveSection('company-profile')}
                                >
                                    View Profile
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
                <div className="header-actions">
                    <button onClick={handleLogout} className="logout-button">
                        <span className="logout-icon">⏻</span> Log Out
                    </button>
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
                                onClick={() => setActiveSection('post-job')}
                            >
                                Post a Job
                            </li>
                            <li 
                                className={activeSection === 'manage-jobs' ? 'active' : ''}
                                onClick={() => setActiveSection('manage-jobs')}
                            >
                                Manage Jobs
                            </li>
                            <li 
                                className={activeSection === 'manage-applications' ? 'active' : ''}
                                onClick={() => setActiveSection('manage-applications')}
                            >
                                Manage Applications
                            </li>
                            {/* Add new sidebar item for Talent Pool */}
                            <li 
                                className={activeSection === 'talent-pool' ? 'active' : ''}
                                onClick={() => setActiveSection('talent-pool')}
                            >
                                Talent Pool
                            </li>
                            <li 
                                className={activeSection === 'company-profile' ? 'active' : ''}
                                onClick={() => setActiveSection('company-profile')}
                            >
                                Company Profile
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
