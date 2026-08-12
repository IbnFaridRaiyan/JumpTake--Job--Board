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
import SavedPosts from './SavedPosts';
import { clearBrowserAccountState } from '../utils/authStorage';
import GuidedPortalTour from './GuidedPortalTour';
import PortalPageSkeleton from './PortalPageSkeleton';
import Pricing from './Pricing';
import PortalSideWidgets from './PortalSideWidgets';
import {
    PORTAL_REMINDER_ALERT_EVENT,
    PORTAL_REMINDERS_UPDATED_EVENT,
    getUnreadPortalReminderCount
} from '../utils/portalReminders';

const EMPLOYER_SECTION_IDS = new Set([
    'inbox',
    'talent-stories',
    'work-news',
    'create-post',
    'my-company-posts',
    'my-job-posts',
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
    'settings',
    'pricing'
]);

const EMPLOYER_SECTION_STORAGE_KEY = 'jumptakeEmployerSection';

const normalizeEmployerSection = (section) => ['home', 'home-feed'].includes(section) ? 'talent-stories' : section;

const isMobileViewport = () => (
    typeof window !== 'undefined'
    && window.matchMedia('(max-width: 768px)').matches
);

const EmployerDashboard = ({ appMode = 'dark', onAppModeChange }) => {
    const [employer, setEmployer] = useState(null);
    const [loading, setLoading] = useState(true);
    const [activeSection, setActiveSection] = useState('talent-stories');
    const [previousSection, setPreviousSection] = useState(null);
    const previousSectionRef = useRef(null);
    const [openedSections, setOpenedSections] = useState(() => ['talent-stories']);
    const [titleAnimationReplayKey, setTitleAnimationReplayKey] = useState(0);
    const sectionHistoryRef = useRef([]);
    const manageJobsRef = useRef(null);
    const generalAssessmentsRef = useRef(null);
    const [companyData, setCompanyData] = useState(null);
    const [jobs, setJobs] = useState([]);
    const [applicationCount, setApplicationCount] = useState(0);
    const [pendingInboxCount, setPendingInboxCount] = useState(0);
    const [pendingNotificationCount, setPendingNotificationCount] = useState(0);
    const [mobileSectionVisible, setMobileSectionVisible] = useState(() => isMobileViewport());
    const [isManagingEmployerJob, setIsManagingEmployerJob] = useState(false);
    const mobilePanelRef = useRef(null);
    const navigate = useNavigate();

    useEffect(() => {
        setOpenedSections((currentSections) => (
            currentSections.includes(activeSection)
                ? currentSections
                : [...currentSections, activeSection]
        ));
    }, [activeSection]);

    useEffect(() => {
        setPreviousSection(previousSectionRef.current);
        previousSectionRef.current = activeSection;
    }, [activeSection]);

    const updateActiveSection = (section, { push = true } = {}) => {
        const nextSectionValue = normalizeEmployerSection(section);

        if (!EMPLOYER_SECTION_IDS.has(nextSectionValue)) {
            return;
        }

        setTitleAnimationReplayKey((key) => key + 1);
        setOpenedSections((currentSections) => (
            currentSections.includes(nextSectionValue)
                ? currentSections
                : [...currentSections, nextSectionValue]
        ));
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
        inbox: 'Inbox',
        'talent-stories': 'Talent Stories',
        'work-news': 'Work News',
        'create-post': 'Create Post',
        'my-company-posts': 'My News',
        'my-job-posts': 'My Jobs',
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
        settings: 'Settings',
        pricing: 'Pricing'
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
            setOpenedSections((currentSections) => (
                currentSections.includes(nextSection)
                    ? currentSections
                    : [...currentSections, nextSection]
            ));
            setActiveSection(nextSection);
            sessionStorage.setItem(EMPLOYER_SECTION_STORAGE_KEY, nextSection);
            if (isMobileViewport()) {
                setMobileSectionVisible(nextSection !== 'home');
            }
        };

        const hashValue = window.location.hash.replace(/^#/, '');
        const [hashPortal, hashSection] = hashValue.split(':');
        const savedSection = sessionStorage.getItem(EMPLOYER_SECTION_STORAGE_KEY);
        const initialSection = hashPortal === 'employer' && EMPLOYER_SECTION_IDS.has(hashSection)
            ? normalizeEmployerSection(hashSection)
            : EMPLOYER_SECTION_IDS.has(savedSection)
                ? normalizeEmployerSection(savedSection)
                : 'talent-stories';

        setTitleAnimationReplayKey((key) => key + 1);
        setOpenedSections((currentSections) => (
            currentSections.includes(initialSection)
                ? currentSections
                : [...currentSections, initialSection]
        ));
        setActiveSection(initialSection);
        sessionStorage.setItem(EMPLOYER_SECTION_STORAGE_KEY, initialSection);
        sessionStorage.removeItem('jumptakeHomeFeedRequest');
        sessionStorage.removeItem('jumptakeEmployerJobSearch');
        sessionStorage.removeItem('jumptakeEmployerTalentSearch');
        const initialHash = `#employer:${initialSection}`;
        if (window.location.hash !== initialHash) {
            // Preserve billing query parameters so the pricing screen can report a Stripe return.
            window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}${initialHash}`);
        }
        setMobileSectionVisible(isMobileViewport());
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
            const reminderStorageKey = `jumptakeAssistantChat:employer:${companyId}`;
            const reminderCount = getUnreadPortalReminderCount(reminderStorageKey);
            setPendingNotificationCount(
                (Array.isArray(notifications) ? notifications : []).filter((notification) => !notification.read).length
                + reminderCount
            );
        } catch (notificationError) {
            console.error('Error fetching employer notifications:', notificationError);
            setPendingNotificationCount(getUnreadPortalReminderCount(`jumptakeAssistantChat:employer:${companyId}`));
        }
    };

    useEffect(() => {
        if (!employer?.companyId) return undefined;
        const reminderStorageKey = `jumptakeAssistantChat:employer:${employer.companyId}`;
        const refreshReminderNotifications = (event) => {
            if (event?.detail?.storageKey && event.detail.storageKey !== reminderStorageKey) return;
            fetchEmployerPortalNotifications(employer.companyId);
        };

        window.addEventListener(PORTAL_REMINDERS_UPDATED_EVENT, refreshReminderNotifications);
        window.addEventListener(PORTAL_REMINDER_ALERT_EVENT, refreshReminderNotifications);
        return () => {
            window.removeEventListener(PORTAL_REMINDERS_UPDATED_EVENT, refreshReminderNotifications);
            window.removeEventListener(PORTAL_REMINDER_ALERT_EVENT, refreshReminderNotifications);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [employer?.companyId]);

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

    const switchSection = (requestedSection) => {
        const nextSection = normalizeEmployerSection(requestedSection);
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

    const openSection = (requestedSection) => {
        const nextSection = normalizeEmployerSection(requestedSection);
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

        const handleOpenPricing = () => openSection('pricing');
        window.addEventListener('jumptake-ai-open-section', handleAiOpenSection);
        window.addEventListener('jumptake-open-pricing', handleOpenPricing);
        return () => {
            window.removeEventListener('jumptake-ai-open-section', handleAiOpenSection);
            window.removeEventListener('jumptake-open-pricing', handleOpenPricing);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activeSection, mobileSectionVisible, employer?.companyId]);

    const employerPrimaryNavItems = [
        { id: 'talent-stories', label: 'Talent Stories', icon: 'users' },
        { id: 'work-news', label: 'Work News', icon: 'briefcase' },
        { id: 'create-post', label: 'Create Post', icon: 'draft' },
        { id: 'my-company-posts', label: 'My News', icon: 'inbox' },
        { id: 'my-job-posts', label: 'My Jobs', icon: 'profile' },
        { id: 'dashboard', label: 'Dashboard', icon: 'dashboard' },
        { id: 'post-job', label: 'Post a Job', icon: 'briefcase' },
        { id: 'manage-jobs', label: 'Manage Jobs', icon: 'briefcase' },
        { id: 'make-assessment', label: 'Make an Assessment', icon: 'assessment' },
        { id: 'general-assessment', label: 'General Assessment', icon: 'assessment' },
        { id: 'talent-pool', label: 'Talent Pool', icon: 'users' },
        { id: 'bookmarked-talents', label: 'Bookmarked Talents', icon: 'star' },
        { id: 'saved-posts', label: 'Saved Posts', icon: 'star' },
        { id: 'notifications', label: 'Notifications', icon: 'bell', notification: pendingNotificationCount > 0 },
        { id: 'create-document', label: 'Create Document', icon: 'profile' },
        { id: 'pricing', label: 'Pricing', icon: 'pricing' }
    ].map((item) => ({
        ...item,
        active: activeSection === item.id,
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
            updateActiveSection('talent-stories');
            setMobileSectionVisible(true);
            resetMobilePanelScroll();
            return;
        }

        updateActiveSection('talent-stories');
        setIsManagingEmployerJob(false);
        resetMobilePanelScroll();
    };

    const renderContent = (section = activeSection) => {
        switch (section) {
            case 'talent-stories':
            case 'work-news':
            case 'create-post':
            case 'my-company-posts':
            case 'my-job-posts': {
                const tabBySection = {
                    'talent-stories': 'talent-stories',
                    'work-news': 'work-news',
                    'create-post': 'create-post',
                    'my-company-posts': 'my-company-posts',
                    'my-job-posts': 'my-job-posts'
                };
                return <PortalHomeFeed
                    mode="employer"
                    currentUser={employer}
                    companyData={companyData}
                    jobs={jobs}
                    switchSection={switchSection}
                    onRefresh={refreshJobs}
                    initialTab={tabBySection[section]}
                    portalSection={section}
                    hideTabs
                />;
            }
            case 'dashboard':
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
                    portalMode="employer"
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
            case 'pricing':
                return <Pricing mode="employer" />;
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

    // The analytics dashboard renders its own animated title inside the panel.
    const showSectionTitle = !['talent-stories', 'work-news', 'create-post', 'my-company-posts', 'my-job-posts', 'dashboard', 'application-tracking'].includes(activeSection);

    if (loading) {
        return (
            <div className={`loading-container ${appMode === 'dark' ? 'portal-modern' : ''}`.trim()}>
                <PortalPageSkeleton label="Loading your dashboard" />
            </div>
        );
    }

    return (
        <div className={`home-page ${appMode === 'dark' ? 'portal-modern ' : ''}portal-dock-open`.trim()}>
            <div className={`dashboard-container ${mobileSectionVisible ? 'mobile-section-open' : ''}`}>
                <main ref={mobilePanelRef} className={`main-content mobile-dashboard-section-panel mobile-section-${activeSection} ${mobileSectionVisible ? 'is-open' : ''}`}>
                    <PortalSidebar
                        userName={employer?.companyName || 'Company'}
                        userSubtitle={employer?.username || ''}
                        userInitial={(employer?.companyName || 'C').charAt(0).toUpperCase()}
                        userImage={companyData?.logo || ''}
                        primaryItems={employerPrimaryNavItems}
                        secondaryItems={employerSecondaryNavItems}
                        onLogout={handleLogout}
                        appMode={appMode}
                        onAppModeChange={onAppModeChange}
                        onSearch={(query = '') => {
                            window.dispatchEvent(new CustomEvent('jumptake-open-employer-messenger', {
                                detail: { assistant: true }
                            }));
                            if (String(query).trim()) {
                                const prompt = String(query).trim();
                                window.setTimeout(() => {
                                    window.dispatchEvent(new CustomEvent('jumptake-widget-assistant-prompt', {
                                        detail: { prompt }
                                    }));
                                    window.dispatchEvent(new CustomEvent('jumptake-assistant-submit', {
                                        detail: { prompt }
                                    }));
                                }, 80);
                            }
                        }}
                        onSettings={() => openSection('settings')}
                        searchContext={{
                            mode: 'employer',
                            profileName: companyData?.name || employer?.companyName || employer?.username || 'Company',
                            profileSubtitle: employer?.username || '',
                            companyName: companyData?.name || employer?.companyName || '',
                            jobs: Array.isArray(jobs) ? jobs : []
                        }}
                        mobileSectionOpen={mobileSectionVisible}
                    />
                    {showSectionTitle && !isMobileViewport() && (
                        <div className="dashboard-section-title">
                            <h2><span key={`desktop-${activeSection}-${titleAnimationReplayKey}`} className="portal-title-jello-text">{sectionTitles[activeSection] || 'Dashboard Section'}</span></h2>
                        </div>
                    )}
                    {showSectionTitle && mobileSectionVisible && isMobileViewport() && (
                        <div className="mobile-section-panel-header">
                            <button type="button" className="back-button" onClick={goToPreviousSection}>
                                {activeSection === 'manage-jobs' && isManagingEmployerJob ? 'Back to Manage Jobs' : 'Back'}
                            </button>
                            <h2><span key={`mobile-${activeSection}-${titleAnimationReplayKey}`} className="portal-title-jello-text">{sectionTitles[activeSection] || 'Dashboard Section'}</span></h2>
                        </div>
                    )}
                    {openedSections.map((section) => (
                        <div
                            key={`employer-section-${section}`}
                            className={`portal-section-transition-shell ${section === activeSection ? 'is-active-portal-section' : 'is-cached-portal-section'}`}
                            data-section={section}
                            aria-hidden={section === activeSection ? undefined : 'true'}
                        >
                            {renderContent(section)}
                        </div>
                    ))}
                </main>
            </div>
            <PortalSideWidgets
                mode="employer"
                theme={appMode}
                renderSection={renderContent}
                previousSection={previousSection}
                previousSectionTitle={previousSection ? (sectionTitles[previousSection] || previousSection) : ''}
                chatStorageKey={`jumptakeAssistantChat:employer:${employer?.companyId || 'guest'}`}
                chatContext={() => ({
                    portalMode: 'employer',
                    activeSection,
                    availablePages: Object.entries(sectionTitles).map(([id, title]) => ({ id, title })),
                    user: employer,
                    company: companyData,
                    jobs: Array.isArray(jobs) ? jobs : []
                })}
                performanceProps={{
                    jobs: Array.isArray(jobs) ? jobs : [],
                    employer,
                    applicationCount
                }}
                profile={{
                    name: companyData?.name || employer?.companyName || employer?.username || 'Company',
                    profileImage: companyData?.logo || companyData?.profileImage,
                    coverImage: companyData?.coverImage,
                    jumptakeId: '',
                    likes: companyData?.likes || employer?.likes,
                    rating: companyData?.rating || employer?.rating
                }}
                onOpenProfile={() => openSection('company-profile')}
            />
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
            <GuidedPortalTour mode="employer" />
        </div>
    );
};

export default EmployerDashboard;
