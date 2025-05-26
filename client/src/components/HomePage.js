import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from './Header';
import JobFeed from './JobFeed';
import MyApplications from './MyApplications';
import UserProfile from './UserProfile';
import UserSettings from './UserSettings';

const HomePage = () => {
    const [activeSection, setActiveSection] = useState('job-feed');
    const [jobs, setJobs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [user, setUser] = useState(null);
    const [jobSeekerData, setJobSeekerData] = useState(null);
    const navigate = useNavigate();

    useEffect(() => {
        
        const userData = localStorage.getItem('user');
        if (!userData || !localStorage.getItem('token')) {
            navigate('/job-seeker');
            return;
        }

        const parsedUser = JSON.parse(userData);
        setUser(parsedUser);
        
       
        fetchJobs();
        
        
        let seekerId = parsedUser.jobSeekerId;
        
       
        if (!seekerId) {
            seekerId = localStorage.getItem('jobSeekerId') || localStorage.getItem('tempJobSeekerId');
            
            
            if (seekerId && !parsedUser.jobSeekerId) {
                console.log('Found jobSeekerId in localStorage but not in user object, updating...');
                parsedUser.jobSeekerId = seekerId;
                localStorage.setItem('user', JSON.stringify(parsedUser));
                setUser(parsedUser);
                
                
                linkJobSeekerToUser(parsedUser.id, seekerId);
            }
        }
        
        
        if (seekerId) {
            fetchJobSeekerData(seekerId);
        } else {
            console.log('No jobSeekerId found, profile data will not be available');
            setLoading(false);
        }
    }, [navigate]);

    const linkJobSeekerToUser = async (userId, jobSeekerId) => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch('http://localhost:5000/api/resume/link', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    userId: userId,
                    jobSeekerId: jobSeekerId
                })
            });
            
            if (!response.ok) {
                console.error('Failed to link job seeker data to user');
            } else {
                console.log('Successfully linked job seeker data to user');
            }
        } catch (error) {
            console.error('Error linking job seeker data:', error);
        }
    };

    const fetchJobs = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch('http://localhost:5000/api/jobs', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) {
                throw new Error('Failed to fetch jobs');
            }

            const data = await response.json();
            setJobs(data);
            setLoading(false);
        } catch (err) {
            console.error('Error fetching jobs:', err);
            setError('Failed to load job listings. Please try again later.');
            setLoading(false);
        }
    };
    
    const fetchJobSeekerData = async (jobSeekerId) => {
        try {
            setLoading(true);
            console.log('Fetching job seeker data for ID:', jobSeekerId);
            
            const token = localStorage.getItem('token');
            const response = await fetch(`http://localhost:5000/api/job-seekers/${jobSeekerId}`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) {
                throw new Error('Failed to fetch profile data');
            }

            const data = await response.json();
            console.log('Job seeker data retrieved successfully');
            setJobSeekerData(data);
            
           
            try {
                const analysisResponse = await fetch(`http://localhost:5000/api/resume/analysis/${user.id}`, {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });
                
                if (analysisResponse.ok) {
                    const analysisData = await analysisResponse.json();
                    
                    if (analysisData && !data.skills && analysisData.skills) {
                        setJobSeekerData({...data, ...analysisData});
                    }
                }
            } catch (analysisError) {
                console.error('Error fetching resume analysis:', analysisError);
            }
        } catch (err) {
            console.error('Error fetching profile data:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        navigate('/');
    };
    
    const refreshData = () => {
       
        fetchJobs();
        if (user?.jobSeekerId) {
            fetchJobSeekerData(user.jobSeekerId);
        }
    };

    const renderContent = () => {
        if (loading && activeSection === 'job-feed') {
            return (
                <div className="loading-spinner">Loading job listings...</div>
            );
        }

        switch (activeSection) {
            case 'job-feed':
                return <JobFeed 
                    jobs={jobs} 
                    error={error} 
                    userId={user?.id}
                    onRefresh={refreshData}
                />;
            case 'applications':
                return <MyApplications 
                    userId={user?.id}
                    onRefresh={refreshData}
                    switchSection={setActiveSection} 
                />;
            case 'profile':
                console.log('Rendering profile with userId:', user?.id);
                return <UserProfile 
                    userId={user?.id}  
                    onUpdate={refreshData}
                />;
            case 'settings':
                return <UserSettings 
                    userId={user?.id}
                    user={user}  
                    onLogout={handleLogout}
                />;
            default:
                return <JobFeed 
                    jobs={jobs} 
                    error={error} 
                    userId={user?.id}
                    onRefresh={refreshData}
                />;
        }
    };

    if (loading && !jobSeekerData) {
        return (
            <div className="loading-container">
                <div className="dashboard-header">
                    <div className="dashboard-title">
                        <h1>Employee Dashboard</h1>
                        <p>Welcome back, {user?.email.split('@')[0] || 'User'}</p>
                    </div>
                </div>
                <div className="loading-spinner">Loading your dashboard...</div>
            </div>
        );
    }

    return (
        <div className="home-page">
            <div className="dashboard-header">
                <div className="dashboard-title">
                    <h1>Employee Dashboard</h1>
                    <p>Welcome back, {user?.email.split('@')[0] || 'User'}</p>
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
                            {user?.email.charAt(0).toUpperCase() || 'U'}
                        </div>
                        <div className="user-info">
                            <h3>{user?.email.split('@')[0] || 'User'}</h3>
                            <p>{user?.email}</p>
                        </div>
                    </div>
                    <nav className="dashboard-nav">
                        <ul>
                            <li 
                                className={activeSection === 'job-feed' ? 'active' : ''}
                                onClick={() => setActiveSection('job-feed')}
                            >
                                Job Feed
                            </li>
                            <li 
                                className={activeSection === 'applications' ? 'active' : ''}
                                onClick={() => setActiveSection('applications')}
                            >
                                My Applications
                            </li>
                            <li 
                                className={activeSection === 'profile' ? 'active' : ''}
                                onClick={() => setActiveSection('profile')}
                            >
                                My Profile
                            </li>
                            <li 
                                className={activeSection === 'settings' ? 'active' : ''}
                                onClick={() => setActiveSection('settings')}
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

export default HomePage;