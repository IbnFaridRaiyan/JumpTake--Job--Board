import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import JobFeed from './JobFeed';
import MyApplications from './MyApplications';
import MyAssessments from './MyAssessments';
import VideoInterviews from './VideoInterviews';
import DraftApplications from './DraftApplications';
import BookmarkedJobs from './BookmarkedJobs';
import UserProfile from './UserProfile';
import UserSettings from './UserSettings';
import Inbox from './Inbox';
import InterestedJobSuggestion from './InterestedJobSuggestion';
import logo from './media/logo3.png';

const JOB_INTEREST_OPTIONS = [
    'Software Engineering',
    'Frontend Development',
    'Backend Development',
    'Data Analysis',
    'Artificial Intelligence',
    'Cybersecurity',
    'Product Management',
    'Project Management',
    'Marketing',
    'Sales',
    'Finance',
    'Human Resources',
    'Healthcare',
    'Education',
    'Customer Support',
    'Design',
    'Operations',
    'Business Analysis',
    'Cloud Engineering',
    'Quality Assurance'
];

const HomePage = () => {
    const [activeSection, setActiveSection] = useState('job-feed');
    const [, setSectionHistory] = useState([]);
    const [jobs, setJobs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [user, setUser] = useState(null);
    const [jobSeekerData, setJobSeekerData] = useState(null);
    const [pendingAssessmentCount, setPendingAssessmentCount] = useState(0);
    const [pendingVideoInterviewCount, setPendingVideoInterviewCount] = useState(0);
    const [pendingInboxCount, setPendingInboxCount] = useState(0);
    const [showInterestPopup, setShowInterestPopup] = useState(false);
    const [selectedJobInterests, setSelectedJobInterests] = useState([]);
    const [interestError, setInterestError] = useState('');
    const [savingInterests, setSavingInterests] = useState(false);
    const [mobileSectionVisible, setMobileSectionVisible] = useState(false);
    const navigate = useNavigate();

    const sectionTitles = {
        'job-feed': 'Job Feed',
        applications: 'My Applications',
        assessments: 'My Assessments',
        'video-interviews': 'Video Interviews',
        'draft-applications': 'Draft Applications',
        'bookmarked-jobs': 'Bookmarked Jobs',
        inbox: 'Inbox',
        'interested-jobs': 'Interested Job Suggession',
        profile: 'My Profile',
        settings: 'Settings'
    };

    useEffect(() => {
        const userData = localStorage.getItem('user');
        if (!userData || !localStorage.getItem('token')) {
            navigate('/job-seeker');
            return;
        }

        const parsedUser = JSON.parse(userData);
        setUser(parsedUser);
        const savedInterests = Array.isArray(parsedUser.jobInterests) ? parsedUser.jobInterests : [];
        setSelectedJobInterests(savedInterests);
        setShowInterestPopup(savedInterests.length < 4);

        fetchJobs();
        fetchCandidateNotifications(parsedUser.id);
        fetchCandidateInboxNotifications(parsedUser.id);

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
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [navigate]);

    const fetchCandidateNotifications = async (userId) => {
        if (!userId) {
            setPendingAssessmentCount(0);
            setPendingVideoInterviewCount(0);
            return;
        }

        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${process.env.REACT_APP_API_URL || ''}/api/assessments/user/${userId}`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) {
                throw new Error('Failed to fetch candidate notifications');
            }

            const data = await response.json();
            setPendingAssessmentCount(data.filter((assessment) => assessment.status === 'Sent').length);
            setPendingVideoInterviewCount(data.filter((assessment) => (
                assessment?.videoInterview?.link &&
                (assessment?.videoInterview?.candidateSelection?.status || 'Pending') === 'Pending'
            )).length);
        } catch (notificationError) {
            console.error('Error fetching candidate notifications:', notificationError);
            setPendingAssessmentCount(0);
            setPendingVideoInterviewCount(0);
        }
    };

    const linkJobSeekerToUser = async (userId, jobSeekerId) => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch((process.env.REACT_APP_API_URL || '') + '/api/resume/link', {
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
            const response = await fetch((process.env.REACT_APP_API_URL || '') + '/api/jobs', {
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
            const response = await fetch(`${process.env.REACT_APP_API_URL || ''}/api/job-seekers/${jobSeekerId}`, {
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
                const analysisResponse = await fetch(`${process.env.REACT_APP_API_URL || ''}/api/resume/analysis/${user.id}`, {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });

                if (analysisResponse.ok) {
                    const analysisData = await analysisResponse.json();

                    if (analysisData && !data.skills && analysisData.skills) {
                        setJobSeekerData({ ...data, ...analysisData });
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

    const fetchCandidateInboxNotifications = async (userId) => {
        if (!userId) {
            setPendingInboxCount(0);
            return;
        }

        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${process.env.REACT_APP_API_URL || ''}/api/messages/user/${userId}`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) {
                throw new Error('Failed to fetch inbox notifications');
            }

            const threads = await response.json();
            const seenAt = Number(localStorage.getItem('jumptakeCandidateInboxSeenAt') || 0);
            const unseenCount = (Array.isArray(threads) ? threads : []).filter((thread) => {
                const lastMessage = thread.messages?.[thread.messages.length - 1];
                return lastMessage?.senderType === 'employer' && new Date(thread.lastMessageAt || lastMessage.createdAt).getTime() > seenAt;
            }).length;

            setPendingInboxCount(unseenCount);
        } catch (inboxError) {
            console.error('Error fetching inbox notifications:', inboxError);
            setPendingInboxCount(0);
        }
    };

    const toggleJobInterest = (interest) => {
        setSelectedJobInterests((prevInterests) => (
            prevInterests.includes(interest)
                ? prevInterests.filter((item) => item !== interest)
                : [...prevInterests, interest]
        ));
        setInterestError('');
    };

    const saveJobInterests = async () => {
        if (selectedJobInterests.length < 4) {
            setInterestError('Please select at least 4 job types.');
            return;
        }

        setSavingInterests(true);
        setInterestError('');

        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${process.env.REACT_APP_API_URL || ''}/api/users/${user.id}/job-interests`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    jobInterests: selectedJobInterests
                })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to save job interests');
            }

            const nextUser = {
                ...user,
                jobInterests: data.jobInterests || selectedJobInterests
            };

            setUser(nextUser);
            localStorage.setItem('user', JSON.stringify(nextUser));
            setShowInterestPopup(false);
            refreshData();
        } catch (saveError) {
            console.error('Error saving job interests:', saveError);
            setInterestError(saveError.message || 'Failed to save job interests.');
        } finally {
            setSavingInterests(false);
        }
    };

    const refreshData = () => {
        fetchJobs();
        if (user?.id) {
            fetchCandidateNotifications(user.id);
            fetchCandidateInboxNotifications(user.id);
        }
        if (user?.jobSeekerId) {
            fetchJobSeekerData(user.jobSeekerId);
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
            localStorage.setItem('jumptakeCandidateInboxSeenAt', String(Date.now()));
        }

        if (nextSection === activeSection) {
            setMobileSectionVisible(true);
            return;
        }

        switchSection(nextSection);
    };

    const handleLogoClick = () => {
        setSectionHistory([]);
        setActiveSection('job-feed');
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

        setActiveSection(previousSection || 'job-feed');
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
                    jobSeekerData={jobSeekerData}
                    currentUser={user}
                />;
            case 'applications':
                return <MyApplications
                    userId={user?.id}
                    onRefresh={refreshData}
                    switchSection={switchSection}
                    onFooterBack={goToPreviousSection}
                />;
            case 'assessments':
                return <MyAssessments
                    userId={user?.id}
                    onRefresh={refreshData}
                    onPendingCountChange={setPendingAssessmentCount}
                    switchSection={switchSection}
                    onFooterBack={goToPreviousSection}
                />;
            case 'video-interviews':
                return <VideoInterviews
                    userId={user?.id}
                    switchSection={switchSection}
                    onFooterBack={goToPreviousSection}
                />;
            case 'draft-applications':
                return <DraftApplications
                    userId={user?.id}
                    switchSection={switchSection}
                    onFooterBack={goToPreviousSection}
                />;
            case 'bookmarked-jobs':
                return <BookmarkedJobs
                    userId={user?.id}
                    switchSection={switchSection}
                    onFooterBack={goToPreviousSection}
                />;
            case 'inbox':
                return <Inbox
                    mode="candidate"
                    userId={user?.id}
                    onBack={() => setActiveSection('job-feed')}
                    onFooterBack={goToPreviousSection}
                />;
            case 'interested-jobs':
                return <InterestedJobSuggestion
                    user={user}
                    onInterestsSaved={(nextUser) => {
                        setUser(nextUser);
                        localStorage.setItem('user', JSON.stringify(nextUser));
                        refreshData();
                    }}
                    onFooterBack={goToPreviousSection}
                />;
            case 'profile':
                console.log('Rendering profile with userId:', user?.id);
                return <UserProfile
                    userId={user?.id}
                    onUpdate={refreshData}
                    switchSection={switchSection}
                    onFooterBack={goToPreviousSection}
                />;
            case 'settings':
                return <UserSettings
                    userId={user?.id}
                    user={user}
                    onLogout={handleLogout}
                    switchSection={switchSection}
                    onFooterBack={goToPreviousSection}
                />;
            default:
                return <JobFeed
                    jobs={jobs}
                    error={error}
                    userId={user?.id}
                    onRefresh={refreshData}
                    jobSeekerData={jobSeekerData}
                    currentUser={user}
                />;
        }
    };

    if (loading && !jobSeekerData) {
        return (
            <div className="loading-container">
                <div className="dashboard-header candidate-dashboard-header">
                    <div className="candidate-dashboard-brand">
                        <button
                            type="button"
                            className="dashboard-logo-button"
                            onClick={handleLogoClick}
                            aria-label="Go to Job Feed"
                        >
                            <img src={logo} alt="JumpTake Logo" className="candidate-dashboard-logo" />
                        </button>
                    </div>
                    <div className="dashboard-title candidate-dashboard-title">
                        <h1>Candidate Dashboard</h1>
                        <p>Welcome back, {user?.email.split('@')[0] || 'User'}</p>
                    </div>
                </div>
                <div className="loading-spinner">Loading your dashboard...</div>
            </div>
        );
    }

    return (
        <div className="home-page">
            <div className="dashboard-header candidate-dashboard-header">
                <div className="candidate-dashboard-brand">
                    <button
                        type="button"
                        className="dashboard-logo-button"
                        onClick={handleLogoClick}
                        aria-label="Go to Job Feed"
                    >
                        <img src={logo} alt="JumpTake Logo" className="candidate-dashboard-logo" />
                    </button>
                </div>
                <div className="dashboard-title candidate-dashboard-title">
                    <h1>Candidate Dashboard</h1>
                    <p>Welcome back, {user?.email.split('@')[0] || 'User'}</p>
                </div>
            </div>

            {showInterestPopup && (
                <div className="modal-overlay">
                    <div className="job-interest-modal">
                        <div className="modal-header">
                            <h2>What type of jobs are you interested in?</h2>
                        </div>
                        <p>Select at least 4 job types so your recommended jobs can be tuned to your goals.</p>

                        {interestError && <div className="error-message">{interestError}</div>}

                        <div className="job-interest-grid">
                            {JOB_INTEREST_OPTIONS.map((interest) => (
                                <button
                                    key={interest}
                                    type="button"
                                    className={selectedJobInterests.includes(interest) ? 'selected' : ''}
                                    onClick={() => toggleJobInterest(interest)}
                                >
                                    {interest}
                                </button>
                            ))}
                        </div>

                        <div className="message-compose-actions">
                            <button className="settings-button primary" onClick={saveJobInterests} disabled={savingInterests}>
                                {savingInterests ? 'Saving...' : 'Save Interests'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

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
                                onClick={() => openSection('job-feed')}
                            >
                                Job Feed
                            </li>
                            <li
                                className={activeSection === 'inbox' ? 'active' : ''}
                                onClick={() => openSection('inbox')}
                            >
                                <span className="dashboard-nav-label">Inbox</span>
                                {pendingInboxCount > 0 && <span className="nav-notification-dot"></span>}
                            </li>
                            <li
                                className={activeSection === 'applications' ? 'active' : ''}
                                onClick={() => openSection('applications')}
                            >
                                My Applications
                            </li>
                            <li
                                className={activeSection === 'assessments' ? 'active' : ''}
                                onClick={() => openSection('assessments')}
                            >
                                <span className="dashboard-nav-label">My Assessments</span>
                                {pendingAssessmentCount > 0 && <span className="nav-notification-dot"></span>}
                            </li>
                            <li
                                className={activeSection === 'video-interviews' ? 'active' : ''}
                                onClick={() => openSection('video-interviews')}
                            >
                                <span className="dashboard-nav-label">Video Interviews</span>
                                {pendingVideoInterviewCount > 0 && <span className="nav-notification-dot"></span>}
                            </li>
                            <li
                                className={activeSection === 'draft-applications' ? 'active' : ''}
                                onClick={() => openSection('draft-applications')}
                            >
                                Draft Applications
                            </li>
                            <li
                                className={activeSection === 'bookmarked-jobs' ? 'active' : ''}
                                onClick={() => openSection('bookmarked-jobs')}
                            >
                                Bookmarked Jobs
                            </li>
                            <li
                                className={activeSection === 'interested-jobs' ? 'active' : ''}
                                onClick={() => openSection('interested-jobs')}
                            >
                                Interested Job Suggession
                            </li>
                            <li
                                className={activeSection === 'profile' ? 'active' : ''}
                                onClick={() => openSection('profile')}
                            >
                                My Profile
                            </li>
                            <li
                                className={activeSection === 'settings' ? 'active' : ''}
                                onClick={() => openSection('settings')}
                            >
                                Settings
                            </li>
                            <li
                                className="dashboard-nav-logout"
                                onClick={handleLogout}
                            >
                                Log Out
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

export default HomePage;
