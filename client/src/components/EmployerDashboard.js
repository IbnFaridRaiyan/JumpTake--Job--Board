import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import PostJob from './PostJob';
import ManageJobs from './ManageJobs';
import MakeAssessment from './MakeAssessment';
import GeneralAssessments from './GeneralAssessments';
import CompanyProfile from './CompanyProfile';
import TalentPool from './TalentPool';
import BookmarkedTalents from './BookmarkedTalents';
import EmployerSettings from './EmployerSettings';
import AboutJumpTake from './AboutJumpTake';
import PerformanceAnalytics from './PerformanceAnalytics';
import PortalSidebar from './PortalSidebar';
import Notifications from './Notifications';
import FloatingMessenger from './FloatingMessenger';
import Inbox from './Inbox';
import ResumePlayground from './ResumePlayground';
import PortalHomeFeed from './PortalHomeFeed';
import PortalDefaultLanding from './PortalDefaultLanding';
import PortalAiButton from './PortalAiButton';
import SavedPosts from './SavedPosts';
import { clearBrowserAccountState } from '../utils/authStorage';
import logoDark from './media/logo4.png';
import logoLight from './media/jumptake-logo-main-light.png';

const EMPLOYER_SECTION_IDS = new Set([
    'home',
    'inbox',
    'home-feed',
    'dashboard',
    'post-job',
    'manage-jobs',
    'make-assessment',
    'general-assessment',
    'talent-pool',
    'bookmarked-talents',
    'saved-posts',
    'notifications',
    'create-document',
    'company-profile',
    'about-jumptake',
    'application-tracking',
    'settings'
]);

const EMPLOYER_SECTION_STORAGE_KEY = 'jumptakeEmployerSection';

const normalizeEmployerSection = (section) => (
    section === 'dashboard' ? 'home' : section
);

const isMobileViewport = () => (
    typeof window !== 'undefined'
    && window.matchMedia('(max-width: 768px)').matches
);

const EmployerDashboard = ({ appMode = 'dark', onAppModeChange }) => {
    const [employer, setEmployer] = useState(null);
    const [loading, setLoading] = useState(true);
    const [activeSection, setActiveSection] = useState('home');
    const [titleAnimationReplayKey, setTitleAnimationReplayKey] = useState(0);
    const sectionHistoryRef = useRef([]);
    const manageJobsRef = useRef(null);
    const generalAssessmentsRef = useRef(null);
    const [companyData, setCompanyData] = useState(null);
    const [jobs, setJobs] = useState([]);
    const [applicationCount, setApplicationCount] = useState(0);
    const [pendingInboxCount, setPendingInboxCount] = useState(0);
    const [pendingNotificationCount, setPendingNotificationCount] = useState(0);
    const [mobileSectionVisible, setMobileSectionVisible] = useState(false);
    const [isManagingEmployerJob, setIsManagingEmployerJob] = useState(false);
    const mobilePanelRef = useRef(null);
    const navigate = useNavigate();
    const dashboardLogo = appMode === 'dark' ? logoDark : logoLight;

    const updateActiveSection = (section, { push = true } = {}) => {
        const nextSectionValue = normalizeEmployerSection(section);

        if (!EMPLOYER_SECTION_IDS.has(nextSectionValue)) {
            return;
        }

        setTitleAnimationReplayKey((key) => key + 1);
        setActiveSection(nextSectionValue);
        sessionStorage.setItem(EMPLOYER_SECTION_STORAGE_KEY, nextSectionValue);

        const nextHash = `#employer:${nextSectionValue}`;
        if (window.location.hash !== nextHash) {
            if (push) {
                window.history.pushState(null, '', nextHash);
            } else {
                window.history.replaceState(null, '', nextHash);
            }
        }
    };

    const sectionTitles = {
        home: 'Dashboard',
        inbox: 'Inbox',
        'home-feed': 'Dashboard',
        dashboard: 'Dashboard',
        'post-job': 'Post a Job',
        'manage-jobs': 'Manage Jobs',
        'make-assessment': 'Make an Assessment',
        'general-assessment': 'General Assessment',
        'talent-pool': 'Talent Pool',
        'bookmarked-talents': 'Bookmarked Talents',
        'saved-posts': 'Saved Posts',
        notifications: 'Notifications',
        'create-document': 'Create Document',
        'company-profile': 'Company Profile',
        'about-jumptake': 'About JumpTake',
        'application-tracking': 'Application Tracking System',
        settings: 'Settings'
    };

    useEffect(() => {
        const employerData = localStorage.getItem('employer');
        const token = localStorage.getItem('employerToken');
        if (!employerData || !token) {
            clearBrowserAccountState();
            navigate('/company');
            return;
        }

        let parsedEmployer = null;
        try {
            parsedEmployer = JSON.parse(employerData);
        } catch (error) {
            console.error('Could not restore employer session:', error);
            clearBrowserAccountState();
            navigate('/company');
            return;
        }

        const initializeEmployer = (nextEmployer) => {
            setEmployer(nextEmployer);
            fetchCompanyData(nextEmployer.companyId);
            fetchCompanyJobs(nextEmployer.companyId);
            fetchApplicationCount(nextEmployer.companyId);
            fetchEmployerInboxNotifications(nextEmployer.companyId);
            fetchEmployerPortalNotifications(nextEmployer.companyId);
        };

        const restoreLiveEmployerSession = async () => {
            try {
                const response = await fetch(`${process.env.REACT_APP_API_URL || ''}/api/session/employer`, {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });

                if (!response.ok) {
                    throw new Error('Employer session is no longer valid');
                }

                const data = await response.json();
                const liveEmployer = data.employer || parsedEmployer;
                localStorage.setItem('employer', JSON.stringify(liveEmployer));
                initializeEmployer(liveEmployer);
            } catch (error) {
                console.error('Could not restore live employer session:', error);
                clearBrowserAccountState();
                navigate('/company');
            }
        };

        restoreLiveEmployerSession();
    }, [navigate]);

    useEffect(() => {
        const applyHashSection = () => {
            const hashValue = window.location.hash.replace(/^#/, '');
            const [portal, section] = hashValue.split(':');
            if (portal !== 'employer' || !EMPLOYER_SECTION_IDS.has(section)) {
                return;
            }

            const nextSection = normalizeEmployerSection(section);
            setTitleAnimationReplayKey((key) => key + 1);
            setActiveSection(nextSection);
            sessionStorage.setItem(EMPLOYER_SECTION_STORAGE_KEY, nextSection);
            if (isMobileViewport()) {
                setMobileSectionVisible(nextSection !== 'home');
            }
        };

        const hasFeedDeepLink = Boolean(
            new URLSearchParams(window.location.search).get('jtPost')
            || new URLSearchParams(window.location.search).get('jtJob')
        );
        const initialSection = hasFeedDeepLink ? 'home-feed' : 'home';
        sessionStorage.setItem(EMPLOYER_SECTION_STORAGE_KEY, initialSection);
        sessionStorage.removeItem('jumptakeHomeFeedRequest');
        sessionStorage.removeItem('jumptakeEmployerJobSearch');
        sessionStorage.removeItem('jumptakeEmployerTalentSearch');
        window.history.replaceState(null, '', `#employer:${initialSection}`);
        setMobileSectionVisible(hasFeedDeepLink && isMobileViewport());
        window.scrollTo({ top: 0, left: 0, behavior: 'auto' });

        window.addEventListener('hashchange', applyHashSection);
        return () => window.removeEventListener('hashchange', applyHashSection);
    }, []);

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

    const fetchEmployerPortalNotifications = async (companyId) => {
        if (!companyId) {
            setPendingNotificationCount(0);
            return;
        }

        try {
            const token = localStorage.getItem('employerToken');
            const params = new URLSearchParams({
                recipientType: 'employer',
                recipientId: String(companyId)
            });
            const response = await fetch(`${process.env.REACT_APP_API_URL || ''}/api/notifications?${params.toString()}`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) {
                throw new Error('Failed to fetch notifications');
            }

            const notifications = await response.json();
            setPendingNotificationCount((Array.isArray(notifications) ? notifications : []).filter((notification) => !notification.read).length);
        } catch (notificationError) {
            console.error('Error fetching employer notifications:', notificationError);
            setPendingNotificationCount(0);
        }
    };

    const handleLogout = () => {
        clearBrowserAccountState();
        window.history.replaceState(null, '', window.location.pathname);
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
            fetchEmployerPortalNotifications(employer.companyId);
        }
    };

    const switchSection = (nextSection) => {
        if (!nextSection || nextSection === activeSection) {
            setTitleAnimationReplayKey((key) => key + 1);
            setMobileSectionVisible(!isMobileViewport() || nextSection !== 'home');
            resetMobilePanelScroll();
            return;
        }

        const openedFromMobileNav = isMobileViewport() && !mobileSectionVisible;
        sectionHistoryRef.current = openedFromMobileNav
            ? []
            : [...sectionHistoryRef.current, activeSection];
        if (nextSection !== 'manage-jobs') {
            setIsManagingEmployerJob(false);
        }
        updateActiveSection(nextSection);
        setMobileSectionVisible(!isMobileViewport() || nextSection !== 'home');
        resetMobilePanelScroll();
    };

    const openSection = (nextSection) => {
        if (!nextSection) {
            return;
        }

        if (nextSection === 'notifications') {
            fetchEmployerPortalNotifications(employer?.companyId);
        }

        if (nextSection === activeSection) {
            setTitleAnimationReplayKey((key) => key + 1);
            setMobileSectionVisible(!isMobileViewport() || nextSection !== 'home');
            return;
        }

        switchSection(nextSection);
    };

    const openPortalAssistant = () => {
        setPendingInboxCount(0);
        localStorage.setItem('jumptakeEmployerInboxSeenAt', String(Date.now()));
        window.dispatchEvent(new CustomEvent('jumptake-open-employer-messenger', {
            detail: { assistant: true }
        }));
    };

    useEffect(() => {
        if (typeof window === 'undefined') {
            return undefined;
        }

        const handleAiOpenSection = (event) => {
            const { mode, section } = event.detail || {};
            if (mode && mode !== 'employer') {
                return;
            }
            if (section && EMPLOYER_SECTION_IDS.has(section)) {
                openSection(section);
            }
        };

        window.addEventListener('jumptake-ai-open-section', handleAiOpenSection);
        return () => window.removeEventListener('jumptake-ai-open-section', handleAiOpenSection);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activeSection, mobileSectionVisible, employer?.companyId]);

    const employerPrimaryNavItems = [
        { id: 'home', label: 'Dashboard', icon: 'dashboard' },
        { id: 'post-job', label: 'Post a Job', icon: 'briefcase' },
        { id: 'manage-jobs', label: 'Manage Jobs', icon: 'briefcase' },
        { id: 'make-assessment', label: 'Make an Assessment', icon: 'assessment' },
        { id: 'general-assessment', label: 'General Assessment', icon: 'assessment' },
        { id: 'talent-pool', label: 'Talent Pool', icon: 'users' },
        { id: 'bookmarked-talents', label: 'Bookmarked Talents', icon: 'star' },
        { id: 'saved-posts', label: 'Saved Posts', icon: 'star' },
        { id: 'notifications', label: 'Notifications', icon: 'bell', notification: pendingNotificationCount > 0 },
        { id: 'create-document', label: 'Create Document', icon: 'profile' }
    ].map((item) => ({
        ...item,
        active: item.id === 'home' ? ['home', 'home-feed'].includes(activeSection) : activeSection === item.id,
        onClick: () => openSection(item.id)
    }));

    const employerSecondaryNavItems = [
        { id: 'company-profile', label: 'Company Profile', icon: 'profile' },
        { id: 'about-jumptake', label: 'About JumpTake', icon: 'info' },
        { id: 'application-tracking', label: 'Application Tracking System', icon: 'chart' },
        { id: 'settings', label: 'Settings', icon: 'settings' }
    ].map((item) => ({
        ...item,
        active: activeSection === item.id,
        onClick: () => openSection(item.id)
    }));

    const handleOpenNotification = (notification) => {
        const payload = notification?.payload || {};
        const nextSection = notification?.section || 'notifications';

        if (nextSection === 'inbox') {
            setPendingInboxCount(0);
            localStorage.setItem('jumptakeEmployerInboxSeenAt', String(Date.now()));
            window.dispatchEvent(new CustomEvent('jumptake-open-employer-messenger'));
            return;
        }

        if (nextSection === 'manage-jobs' && payload.jobId) {
            localStorage.setItem('jumptakeEmployerManagedJobId', String(payload.jobId));
            if (payload.subSection) {
                localStorage.setItem('jumptakeEmployerManagedJobSection', String(payload.subSection));
            }
        }

        if (nextSection === 'talent-pool' && payload.search) {
            sessionStorage.setItem('jumptakeEmployerTalentSearch', payload.search);
        }

        const normalizedSection = normalizeEmployerSection(nextSection);
        openSection(EMPLOYER_SECTION_IDS.has(normalizedSection) ? normalizedSection : 'notifications');
    };

    const resetMobilePanelScroll = () => {
        window.requestAnimationFrame(() => {
            if (mobilePanelRef.current) {
                mobilePanelRef.current.scrollTop = 0;
            }
        });
    };

    const goToPreviousSection = () => {
        if (activeSection === 'manage-jobs' && manageJobsRef.current?.goBackOneStep?.()) {
            resetMobilePanelScroll();
            return;
        }

        if (activeSection === 'general-assessment' && generalAssessmentsRef.current?.goBackOneStep?.()) {
            resetMobilePanelScroll();
            return;
        }

        const previousSection = sectionHistoryRef.current.pop();

        if (previousSection) {
            if (previousSection !== 'manage-jobs') {
                setIsManagingEmployerJob(false);
            }
            updateActiveSection(previousSection);
            setMobileSectionVisible(!isMobileViewport() || previousSection !== 'home');
            resetMobilePanelScroll();
            return;
        }

        if (isMobileViewport()) {
            setMobileSectionVisible(false);
            resetMobilePanelScroll();
            return;
        }

        updateActiveSection('home');
        setIsManagingEmployerJob(false);
        resetMobilePanelScroll();
    };

    const renderContent = () => {
        switch (activeSection) {
            case 'home':
                return <PortalDefaultLanding
                    mode="employer"
                    displayName={employer?.companyName || employer?.username || 'Employer'}
                    jobs={jobs}
                    applicationCount={applicationCount}
                    notificationCount={pendingNotificationCount}
                    inboxCount={pendingInboxCount}
                    switchSection={switchSection}
                />;
            case 'inbox':
                return <Inbox
                    mode="employer"
                    companyId={employer?.companyId}
                    onBack={goToPreviousSection}
                    onFooterBack={goToPreviousSection}
                />;
            case 'home-feed':
                return <PortalHomeFeed
                    mode="employer"
                    currentUser={employer}
                    companyData={companyData}
                    jobs={jobs}
                    switchSection={switchSection}
                    onRefresh={refreshJobs}
                />;
            case 'post-job':
                return <PostJob
                    companyId={employer?.companyId}
                    onJobPosted={refreshJobs}
                    onCancel={goToPreviousSection}
                    onFooterBack={goToPreviousSection}
                />;
            case 'manage-jobs':
                return <ManageJobs
                    ref={manageJobsRef}
                    jobs={jobs}
                    companyId={employer?.companyId}
                    onJobUpdated={refreshJobs}
                    onBack={goToPreviousSection}
                    onFooterBack={goToPreviousSection}
                    onManagingChange={setIsManagingEmployerJob}
                />;
            case 'make-assessment':
                return <MakeAssessment
                    companyId={employer?.companyId}
                    jobs={jobs}
                    onBack={goToPreviousSection}
                    onFooterBack={goToPreviousSection}
                />;
            case 'general-assessment':
                return <GeneralAssessments
                    ref={generalAssessmentsRef}
                    companyId={employer?.companyId}
                    jobs={jobs}
                    onBack={goToPreviousSection}
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
                    onBack={goToPreviousSection}
                    onFooterBack={goToPreviousSection}
                />;
            case 'talent-pool':
                return <TalentPool
                    jobs={jobs}
                    companyId={employer?.companyId}
                    onBack={goToPreviousSection}
                    onFooterBack={goToPreviousSection}
                />;
            case 'bookmarked-talents':
                return <BookmarkedTalents
                    companyId={employer?.companyId}
                    onBack={goToPreviousSection}
                    onFooterBack={goToPreviousSection}
                />;
            case 'saved-posts':
                return <SavedPosts
                    viewerId={employer?.companyId || employer?._id || employer?.id || 'employer-guest'}
                    mode="employer"
                    onFooterBack={goToPreviousSection}
                />;
            case 'notifications':
                return <Notifications
                    mode="employer"
                    recipientId={employer?.companyId}
                    onOpenNotification={handleOpenNotification}
                    onUnreadCountChange={setPendingNotificationCount}
                />;
            case 'create-document':
                return <ResumePlayground
                    user={employer}
                    onFooterBack={goToPreviousSection}
                    mode="document"
                />;
            case 'about-jumptake':
                return <AboutJumpTake mode="employer" />;
            case 'application-tracking':
                return <PerformanceAnalytics
                    mode="employer"
                    jobs={jobs}
                    employer={employer}
                    applicationCount={applicationCount}
                />;
            case 'settings':
                return <EmployerSettings
                    employer={employer}
                    switchSection={switchSection}
                    onEmployerUpdated={handleEmployerUpdated}
                    onLogout={handleLogout}
                    onFooterBack={goToPreviousSection}
                    appMode={appMode}
                    onAppModeChange={onAppModeChange}
                />;
            default:
                return (
                    <div className="dashboard-content">
                        <div className="employer-dashboard-content-title">
                            <h2>Dashboard</h2>
                        </div>

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
                                <h3>Messages</h3>
                                <p>Read and reply to candidate messages</p>
                                <button
                                    className="card-button"
                                    onClick={() => {
                                        setPendingInboxCount(0);
                                        localStorage.setItem('jumptakeEmployerInboxSeenAt', String(Date.now()));
                                        window.dispatchEvent(new CustomEvent('jumptake-open-employer-messenger'));
                                    }}
                                >
                                    Open Messages
                                </button>
                            </div>

                            <div className="dashboard-card">
                                <h3>Notifications</h3>
                                <p>Track new applications, assessments, interviews, and inbox activity</p>
                                <button
                                    className="card-button"
                                    onClick={() => switchSection('notifications')}
                                >
                                    Open Notifications
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

    const showSectionTitle = !['home', 'home-feed'].includes(activeSection);

    if (loading) {
        return (
            <div className="loading-container">
                <div className="dashboard-header employer-dashboard-header">
                    <div className="portal-header-ai-action">
                        <PortalAiButton onClick={openPortalAssistant} />
                    </div>
                    <div className="portal-dashboard-identity employer-dashboard-identity">
                        <div
                            className="dashboard-logo-button dashboard-logo-static"
                            aria-label="JumpTake"
                        >
                            <img src={dashboardLogo} alt="JumpTake" className="employer-dashboard-logo" />
                        </div>
                    </div>
                </div>
                <div className="loading-spinner">Loading...</div>
            </div>
        );
    }

    return (
        <div className="home-page">
            <div className="dashboard-header employer-dashboard-header">
                <div className="portal-header-ai-action">
                    <PortalAiButton onClick={openPortalAssistant} />
                </div>
                <div className="portal-dashboard-identity employer-dashboard-identity">
                    <div
                        className="dashboard-logo-button dashboard-logo-static"
                        aria-label="JumpTake"
                    >
                        <img src={dashboardLogo} alt="JumpTake" className="employer-dashboard-logo" />
                    </div>
                </div>
            </div>

            <div className={`dashboard-container ${mobileSectionVisible ? 'mobile-section-open' : ''}`}>
                <PortalSidebar
                    userName={employer?.companyName || 'Company'}
                    userSubtitle={employer?.username || ''}
                    userInitial={(employer?.companyName || 'C').charAt(0).toUpperCase()}
                    userImage={companyData?.logo || ''}
                    primaryItems={employerPrimaryNavItems}
                    secondaryItems={employerSecondaryNavItems}
                    onLogout={handleLogout}
                    mobileSectionOpen={mobileSectionVisible}
                />

                <main ref={mobilePanelRef} className={`main-content mobile-dashboard-section-panel mobile-section-${activeSection} ${mobileSectionVisible ? 'is-open' : ''}`}>
                    {showSectionTitle && (
                        <div className="dashboard-section-title">
                            <h2><span key={`desktop-${activeSection}-${titleAnimationReplayKey}`} className="portal-title-jello-text">{sectionTitles[activeSection] || 'Dashboard Section'}</span></h2>
                        </div>
                    )}
                    {showSectionTitle && mobileSectionVisible && (
                        <div className="mobile-section-panel-header">
                            <button type="button" className="back-button" onClick={goToPreviousSection}>
                                {activeSection === 'manage-jobs' && isManagingEmployerJob ? 'Back to Manage Jobs' : 'Back'}
                            </button>
                            <h2><span key={`mobile-${activeSection}-${titleAnimationReplayKey}`} className="portal-title-jello-text">{sectionTitles[activeSection] || 'Dashboard Section'}</span></h2>
                        </div>
                    )}
                    <div
                        key={`employer-section-${activeSection}`}
                        className="portal-section-transition-shell"
                        data-section={activeSection}
                    >
                        {renderContent()}
                    </div>
                </main>
            </div>
            <FloatingMessenger
                mode="employer"
                companyId={employer?.companyId}
                currentUser={employer}
                companyData={companyData}
                jobs={jobs}
                activeSection={activeSection}
                unreadCount={pendingInboxCount}
                onSeen={() => {
                    setPendingInboxCount(0);
                    localStorage.setItem('jumptakeEmployerInboxSeenAt', String(Date.now()));
                }}
            />
        </div>
    );
};

export default EmployerDashboard;
