import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import MyApplications from './MyApplications';
import MyAssessments from './MyAssessments';
import VideoInterviews from './VideoInterviews';
import DraftApplications from './DraftApplications';
import BookmarkedJobs from './BookmarkedJobs';
import BookmarkedCandidates from './BookmarkedCandidates';
import UserProfile from './UserProfile';
import UserSettings from './UserSettings';
import TalentPool from './TalentPool';
import InterestedJobSuggestion from './InterestedJobSuggestion';
import AboutJumpTake from './AboutJumpTake';
import PerformanceAnalytics from './PerformanceAnalytics';
import PortalSidebar from './PortalSidebar';
import Notifications from './Notifications';
import FriendInvitations from './FriendInvitations';
import FloatingMessenger from './FloatingMessenger';
import Inbox from './Inbox';
import ResumePlayground from './ResumePlayground';
import PortalHomeFeed from './PortalHomeFeed';
import PortalDefaultLanding from './PortalDefaultLanding';
import PortalAiButton from './PortalAiButton';
import SavedPosts from './SavedPosts';
import logoDark from './media/logo4.png';
import logoLight from './media/jumptake-logo-main-light.png';

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

const CANDIDATE_SECTION_IDS = new Set([
    'home',
    'inbox',
    'job-feed',
    'notifications',
    'view-candidates',
    'friend-invitations',
    'bookmarked-candidates',
    'applications',
    'assessments',
    'video-interviews',
    'draft-applications',
    'bookmarked-jobs',
    'saved-posts',
    'interested-jobs',
    'resume-playground',
    'profile',
    'about-jumptake',
    'progress-check',
    'settings'
]);

const CANDIDATE_SECTION_STORAGE_KEY = 'jumptakeCandidateSection';

const normalizeCandidateSection = (section) => section;

const isMobileViewport = () => (
    typeof window !== 'undefined'
    && window.matchMedia('(max-width: 768px)').matches
);

class CandidatePortalErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false };
    }

    static getDerivedStateFromError() {
        return { hasError: true };
    }

    componentDidCatch(error, info) {
        console.error('Candidate portal section failed:', error, info);
    }

    componentDidUpdate(previousProps) {
        if (previousProps.resetKey !== this.props.resetKey && this.state.hasError) {
            this.setState({ hasError: false });
        }
    }

    render() {
        if (this.state.hasError) {
            return (
                <div className="candidate-section-error">
                    <h3>We could not load this section.</h3>
                    <p>One of the records returned unexpected data. Try refreshing, or go back home.</p>
                    <div className="candidate-section-error-actions">
                        <button type="button" onClick={() => window.location.reload()}>
                            Refresh
                        </button>
                        <button type="button" onClick={this.props.onHome}>
                            Go Home
                        </button>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

const normalizeStringList = (value) => {
    if (Array.isArray(value)) {
        return value
            .flatMap((item) => (
                typeof item === 'string'
                    ? item.split(/[\n,;|]+/)
                    : [String(item ?? '')]
            ))
            .map((item) => String(item).trim())
            .filter(Boolean);
    }

    if (typeof value === 'string') {
        return value
            .split(/[\n,;|]+/)
            .map((item) => item.trim())
            .filter(Boolean);
    }

    return [];
};

const normalizeCandidateProfile = (profile) => {
    if (!profile || typeof profile !== 'object') {
        return profile;
    }

    return {
        ...profile,
        skills: normalizeStringList(profile.skills),
        interests: normalizeStringList(profile.interests),
        hobbies: normalizeStringList(profile.hobbies),
        achievements: Array.isArray(profile.achievements) ? profile.achievements : normalizeStringList(profile.achievements)
    };
};

const HomePage = ({ appMode = 'dark', onAppModeChange }) => {
    const [activeSection, setActiveSection] = useState('home');
    const [sectionErrorResetKey, setSectionErrorResetKey] = useState(0);
    const sectionHistoryRef = useRef([]);
    const [jobs, setJobs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [, setError] = useState(null);
    const [user, setUser] = useState(null);
    const [jobSeekerData, setJobSeekerData] = useState(null);
    const [pendingAssessmentCount, setPendingAssessmentCount] = useState(0);
    const [pendingVideoInterviewCount, setPendingVideoInterviewCount] = useState(0);
    const [pendingInboxCount, setPendingInboxCount] = useState(0);
    const [pendingNotificationCount, setPendingNotificationCount] = useState(0);
    const [pendingFriendInvitationCount, setPendingFriendInvitationCount] = useState(0);
    const [showInterestPopup, setShowInterestPopup] = useState(false);
    const [selectedJobInterests, setSelectedJobInterests] = useState([]);
    const [interestError, setInterestError] = useState('');
    const [savingInterests, setSavingInterests] = useState(false);
    const [mobileSectionVisible, setMobileSectionVisible] = useState(false);
    const myApplicationsRef = useRef(null);
    const videoInterviewsRef = useRef(null);
    const mobilePanelRef = useRef(null);
    const navigate = useNavigate();
    const dashboardLogo = appMode === 'dark' ? logoDark : logoLight;
    const displayEmail = typeof user?.email === 'string' ? user.email : '';
    const displayName = displayEmail.includes('@') ? displayEmail.split('@')[0] : (displayEmail || 'User');
    const displayInitial = displayName ? displayName.charAt(0).toUpperCase() : 'U';

    const updateActiveSection = (section, { push = true } = {}) => {
        const nextSectionValue = normalizeCandidateSection(section);

        if (!CANDIDATE_SECTION_IDS.has(nextSectionValue)) {
            return;
        }

        setSectionErrorResetKey((key) => key + 1);
        setActiveSection(nextSectionValue);
        sessionStorage.setItem(CANDIDATE_SECTION_STORAGE_KEY, nextSectionValue);

        const nextHash = `#candidate:${nextSectionValue}`;
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
        'job-feed': 'Dashboard',
        applications: 'My Applications',
        assessments: 'My Assessments',
        'video-interviews': 'Video Interviews',
        'draft-applications': 'Draft Applications',
        'bookmarked-jobs': 'Bookmarked Jobs',
        'saved-posts': 'Saved Posts',
        notifications: 'Notifications',
        'view-candidates': 'Candidates',
        'friend-invitations': 'Friends',
        'bookmarked-candidates': 'Bookmarked Candidates',
        'interested-jobs': 'Job Preferences',
        'resume-playground': 'Resume Playground',
        profile: 'My Profile',
        'about-jumptake': 'About JumpTake',
        'progress-check': 'Progress Check',
        settings: 'Settings'
    };

    useEffect(() => {
        const userData = localStorage.getItem('user');
        if (!userData || !localStorage.getItem('token')) {
            sessionStorage.removeItem(CANDIDATE_SECTION_STORAGE_KEY);
            navigate('/job-seeker');
            return;
        }

        let parsedUser;
        try {
            parsedUser = JSON.parse(userData);
        } catch (error) {
            console.error('Could not restore candidate session:', error);
            localStorage.removeItem('user');
            localStorage.removeItem('token');
            sessionStorage.removeItem(CANDIDATE_SECTION_STORAGE_KEY);
            navigate('/job-seeker');
            return;
        }
        setUser(parsedUser);
        const savedInterests = Array.isArray(parsedUser.jobInterests) ? parsedUser.jobInterests : [];
        setSelectedJobInterests(savedInterests);
        setShowInterestPopup(false);

        fetchJobs();
        fetchCandidateNotifications(parsedUser.id);
        fetchCandidateInboxNotifications(parsedUser.id);
        fetchCandidatePortalNotifications(parsedUser.id);
        fetchCandidateFriendNotifications(parsedUser.id);

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

    useEffect(() => {
        const applyHashSection = () => {
            const hashValue = window.location.hash.replace(/^#/, '');
            const [portal, section] = hashValue.split(':');
            if (portal !== 'candidate' || !CANDIDATE_SECTION_IDS.has(section)) {
                return;
            }

            const nextSection = normalizeCandidateSection(section);
            setActiveSection(nextSection);
            sessionStorage.setItem(CANDIDATE_SECTION_STORAGE_KEY, nextSection);
            if (isMobileViewport()) {
                setMobileSectionVisible(nextSection !== 'home');
            }
        };

        const hasFeedDeepLink = Boolean(
            new URLSearchParams(window.location.search).get('jtPost')
            || new URLSearchParams(window.location.search).get('jtJob')
        );
        const initialSection = hasFeedDeepLink ? 'job-feed' : 'home';
        sessionStorage.setItem(CANDIDATE_SECTION_STORAGE_KEY, initialSection);
        sessionStorage.removeItem('jumptakeHomeFeedRequest');
        sessionStorage.removeItem('jumptakeCandidateJobSearch');
        window.history.replaceState(null, '', `#candidate:${initialSection}`);
        setMobileSectionVisible(hasFeedDeepLink && isMobileViewport());
        window.scrollTo({ top: 0, left: 0, behavior: 'auto' });

        window.addEventListener('hashchange', applyHashSection);
        return () => window.removeEventListener('hashchange', applyHashSection);
    }, []);

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
            const normalizedData = normalizeCandidateProfile(data);
            setJobSeekerData(normalizedData);

            try {
                const analysisResponse = await fetch(`${process.env.REACT_APP_API_URL || ''}/api/resume/analysis/${user.id}`, {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });

                if (analysisResponse.ok) {
                    const analysisData = await analysisResponse.json();

                    if (analysisData && !data.skills && analysisData.skills) {
                        setJobSeekerData(normalizeCandidateProfile({ ...data, ...analysisData }));
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
        sessionStorage.removeItem(CANDIDATE_SECTION_STORAGE_KEY);
        window.history.replaceState(null, '', window.location.pathname);
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
                const isDirectCandidateThread = thread?.conversationType === 'candidate-candidate';
                const isIncomingDirectMessage = isDirectCandidateThread && String(lastMessage?.senderUser || '') !== String(userId || '');
                const isIncomingEmployerMessage = !isDirectCandidateThread && lastMessage?.senderType === 'employer';
                return (isIncomingEmployerMessage || isIncomingDirectMessage)
                    && new Date(thread.lastMessageAt || lastMessage.createdAt).getTime() > seenAt;
            }).length;

            setPendingInboxCount(unseenCount);
        } catch (inboxError) {
            console.error('Error fetching inbox notifications:', inboxError);
            setPendingInboxCount(0);
        }
    };

    const fetchCandidatePortalNotifications = async (userId) => {
        if (!userId) {
            setPendingNotificationCount(0);
            return;
        }

        try {
            const token = localStorage.getItem('token');
            const params = new URLSearchParams({
                recipientType: 'candidate',
                recipientId: String(userId)
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
            console.error('Error fetching candidate portal notifications:', notificationError);
            setPendingNotificationCount(0);
        }
    };

    const fetchCandidateFriendNotifications = async (userId) => {
        if (!userId) {
            setPendingFriendInvitationCount(0);
            return;
        }

        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${process.env.REACT_APP_API_URL || ''}/api/candidate-connections/user/${userId}`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) {
                throw new Error('Failed to fetch friend invitations');
            }

            const data = await response.json();
            setPendingFriendInvitationCount(Array.isArray(data?.incoming) ? data.incoming.length : 0);
        } catch (friendError) {
            console.error('Error fetching candidate friend notifications:', friendError);
            setPendingFriendInvitationCount(0);
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
            fetchCandidatePortalNotifications(user.id);
            fetchCandidateFriendNotifications(user.id);
        }
        if (user?.jobSeekerId) {
            fetchJobSeekerData(user.jobSeekerId);
        }
    };

    const switchSection = (nextSection) => {
        if (!nextSection || nextSection === activeSection) {
            setMobileSectionVisible(!isMobileViewport() || nextSection !== 'home');
            resetMobilePanelScroll();
            return;
        }

        const openedFromMobileNav = isMobileViewport() && !mobileSectionVisible;
        sectionHistoryRef.current = openedFromMobileNav
            ? []
            : [...sectionHistoryRef.current, activeSection];
        updateActiveSection(nextSection);
        setMobileSectionVisible(!isMobileViewport() || nextSection !== 'home');
        resetMobilePanelScroll();
    };

    const openSection = (nextSection) => {
        if (!nextSection) {
            return;
        }

        if (nextSection === 'notifications') {
            fetchCandidatePortalNotifications(user?.id);
        }

        if (nextSection === activeSection) {
            setMobileSectionVisible(!isMobileViewport() || nextSection !== 'home');
            return;
        }

        switchSection(nextSection);
    };

    const openPortalAssistant = () => {
        setPendingInboxCount(0);
        localStorage.setItem('jumptakeCandidateInboxSeenAt', String(Date.now()));
        window.dispatchEvent(new CustomEvent('jumptake-open-candidate-messenger', {
            detail: { assistant: true }
        }));
    };

    useEffect(() => {
        if (typeof window === 'undefined') {
            return undefined;
        }

        const handleAiOpenSection = (event) => {
            const { mode, section } = event.detail || {};
            if (mode && mode !== 'candidate') {
                return;
            }
            if (section && CANDIDATE_SECTION_IDS.has(section)) {
                openSection(section);
            }
        };

        window.addEventListener('jumptake-ai-open-section', handleAiOpenSection);
        return () => window.removeEventListener('jumptake-ai-open-section', handleAiOpenSection);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activeSection, mobileSectionVisible, user?.id]);

    const candidatePrimaryNavItems = [
        { id: 'home', label: 'Dashboard', icon: 'dashboard' },
        { id: 'notifications', label: 'Notifications', icon: 'bell', notification: pendingNotificationCount > 0 },
        { id: 'view-candidates', label: 'Candidates', icon: 'users' },
        { id: 'friend-invitations', label: 'Friends', icon: 'user-plus', notification: pendingFriendInvitationCount > 0 },
        { id: 'bookmarked-candidates', label: 'Bookmarked Candidates', icon: 'heart' },
        { id: 'applications', label: 'My Applications', icon: 'profile' },
        { id: 'assessments', label: 'My Assessments', icon: 'assessment', notification: pendingAssessmentCount > 0 },
        { id: 'video-interviews', label: 'Video Interviews', icon: 'send', notification: pendingVideoInterviewCount > 0 },
        { id: 'draft-applications', label: 'Draft Applications', icon: 'draft' },
        { id: 'bookmarked-jobs', label: 'Bookmarked Jobs', icon: 'star' },
        { id: 'saved-posts', label: 'Saved Posts', icon: 'star' },
        { id: 'interested-jobs', label: 'Job Preferences', icon: 'briefcase' },
        { id: 'resume-playground', label: 'Resume Playground', icon: 'draft' }
    ].map((item) => ({
        ...item,
        active: item.id === 'home' ? ['home', 'job-feed'].includes(activeSection) : activeSection === item.id,
        onClick: () => openSection(item.id)
    }));

    const candidateSecondaryNavItems = [
        { id: 'profile', label: 'My Profile', icon: 'user' },
        { id: 'about-jumptake', label: 'About JumpTake', icon: 'info' },
        { id: 'progress-check', label: 'Progress Check', icon: 'chart' },
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
            localStorage.setItem('jumptakeCandidateInboxSeenAt', String(Date.now()));
            window.dispatchEvent(new CustomEvent('jumptake-open-candidate-messenger'));
            return;
        }

        if (nextSection === 'job-feed') {
            const rawPayloadJob = payload.job;
            const notificationJobId = (
                payload.jobId
                || (typeof rawPayloadJob === 'string' ? rawPayloadJob : rawPayloadJob?._id || rawPayloadJob?.id)
                || payload.recordId
                || payload.entityId
                || payload.targetId
                || payload.id
                || notification?.jobId
            );
            const homeFeedRequest = {
                mode: 'candidate',
                tab: 'job-posts',
                jobId: notificationJobId,
                action: payload.intent === 'apply' ? 'apply' : 'preview'
            };

            if (homeFeedRequest.jobId) {
                localStorage.setItem('jumptakeActiveJobId', String(homeFeedRequest.jobId));
                localStorage.setItem('jumptakeActiveJobAction', homeFeedRequest.action);
            }

            sessionStorage.setItem('jumptakeHomeFeedRequest', JSON.stringify(homeFeedRequest));
            window.dispatchEvent(new CustomEvent('jumptake-home-feed-request', { detail: homeFeedRequest }));
            openSection('job-feed');
            return;
        }

        if (nextSection === 'friend-invitations') {
            const profileUserId = payload.candidateUserId || payload.userId || payload.requesterId || payload.recipientId;
            if (profileUserId) {
                sessionStorage.setItem('jumptakeFriendProfileUserId', String(profileUserId));
            }
        }

        const normalizedSection = normalizeCandidateSection(nextSection);
        openSection(CANDIDATE_SECTION_IDS.has(normalizedSection) ? normalizedSection : 'notifications');
    };

    const resetMobilePanelScroll = () => {
        window.requestAnimationFrame(() => {
            if (mobilePanelRef.current) {
                mobilePanelRef.current.scrollTop = 0;
            }
        });
    };

    const closeMobileSectionPanel = () => {
        if (activeSection === 'applications' && myApplicationsRef.current?.goBackOneStep?.()) {
            resetMobilePanelScroll();
            return;
        }

        goToPreviousSection();
    };

    const goToPreviousSection = () => {
        if (activeSection === 'applications' && myApplicationsRef.current?.goBackOneStep?.()) {
            resetMobilePanelScroll();
            return;
        }

        if (activeSection === 'video-interviews' && videoInterviewsRef.current?.goBackOneStep?.()) {
            resetMobilePanelScroll();
            return;
        }

        const previousSection = sectionHistoryRef.current.pop();

        if (previousSection) {
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
        resetMobilePanelScroll();
    };

    const renderContent = () => {
        if (loading && activeSection === 'home') {
            return (
                <div className="loading-spinner">Loading job listings...</div>
            );
        }

        switch (activeSection) {
            case 'home':
                return <PortalDefaultLanding
                    mode="candidate"
                    displayName={displayName}
                    jobs={jobs}
                    notificationCount={pendingNotificationCount}
                    inboxCount={pendingInboxCount}
                    assessmentCount={pendingAssessmentCount}
                    videoInterviewCount={pendingVideoInterviewCount}
                    switchSection={switchSection}
                />;
            case 'inbox':
                return <Inbox
                    mode="candidate"
                    userId={user?.id}
                    onBack={goToPreviousSection}
                    onFooterBack={goToPreviousSection}
                />;
            case 'job-feed':
                return <PortalHomeFeed
                    mode="candidate"
                    currentUser={user}
                    profileData={jobSeekerData}
                    jobs={jobs}
                    switchSection={switchSection}
                    onRefresh={refreshData}
                />;
            case 'applications':
                return <MyApplications
                    ref={myApplicationsRef}
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
                    ref={videoInterviewsRef}
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
            case 'saved-posts':
                return <SavedPosts
                    viewerId={user?.id || user?._id || user?.userId || 'candidate-guest'}
                    onFooterBack={goToPreviousSection}
                />;
            case 'notifications':
                return <Notifications
                    mode="candidate"
                    recipientId={user?.id}
                    onOpenNotification={handleOpenNotification}
                    onUnreadCountChange={setPendingNotificationCount}
                />;
            case 'view-candidates':
                return <TalentPool
                    mode="candidate"
                    jobs={jobs}
                    currentUserId={user?.id}
                    onBack={goToPreviousSection}
                    onFooterBack={goToPreviousSection}
                />;
            case 'friend-invitations':
                return <FriendInvitations userId={user?.id} />;
            case 'bookmarked-candidates':
                return <BookmarkedCandidates
                    userId={user?.id}
                    onBack={goToPreviousSection}
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
            case 'resume-playground':
                return <ResumePlayground
                    user={user}
                    onFooterBack={goToPreviousSection}
                />;
            case 'profile':
                console.log('Rendering profile with userId:', user?.id);
                return <UserProfile
                    userId={user?.id}
                    jumptakeId={user?.jumptakeId}
                    onUpdate={refreshData}
                    switchSection={switchSection}
                    onFooterBack={goToPreviousSection}
                />;
            case 'about-jumptake':
                return <AboutJumpTake mode="candidate" />;
            case 'progress-check':
                return <PerformanceAnalytics
                    mode="candidate"
                    jobs={jobs}
                    jobSeekerData={jobSeekerData}
                    userId={user?.id}
                />;
            case 'settings':
                return <UserSettings
                    userId={user?.id}
                    user={user}
                    onLogout={handleLogout}
                    switchSection={switchSection}
                    onFooterBack={goToPreviousSection}
                    appMode={appMode}
                    onAppModeChange={onAppModeChange}
                />;
            default:
                return <PortalHomeFeed
                    mode="candidate"
                    currentUser={user}
                    profileData={jobSeekerData}
                    jobs={jobs}
                    switchSection={switchSection}
                    onRefresh={refreshData}
                />;
        }
    };

    const showSectionTitle = !['home', 'job-feed'].includes(activeSection);

    if (loading && !jobSeekerData) {
        return (
            <div className="loading-container">
                <div className="dashboard-header candidate-dashboard-header">
                    <div className="portal-header-ai-action">
                        <PortalAiButton onClick={openPortalAssistant} />
                    </div>
                    <div className="portal-dashboard-identity candidate-dashboard-identity">
                        <div
                            className="dashboard-logo-button dashboard-logo-static"
                            aria-label="JumpTake"
                        >
                            <img src={dashboardLogo} alt="JumpTake Logo" className="candidate-dashboard-logo" />
                        </div>
                    </div>
                </div>
                <div className="loading-spinner">Loading your dashboard...</div>
            </div>
        );
    }

    return (
        <div className="home-page">
            <div className="dashboard-header candidate-dashboard-header">
                <div className="portal-header-ai-action">
                    <PortalAiButton onClick={openPortalAssistant} />
                </div>
                <div className="portal-dashboard-identity candidate-dashboard-identity">
                    <div
                        className="dashboard-logo-button dashboard-logo-static"
                        aria-label="JumpTake"
                    >
                        <img src={dashboardLogo} alt="JumpTake Logo" className="candidate-dashboard-logo" />
                    </div>
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

            <div className={`dashboard-container ${mobileSectionVisible ? 'mobile-section-open' : ''}`}>
                <PortalSidebar
                    userName={displayName}
                    userSubtitle={displayEmail}
                    userInitial={displayInitial}
                    userImage={jobSeekerData?.profileImage || ''}
                    primaryItems={candidatePrimaryNavItems}
                    secondaryItems={candidateSecondaryNavItems}
                    onLogout={handleLogout}
                    mobileSectionOpen={mobileSectionVisible}
                />

                <main ref={mobilePanelRef} className={`main-content mobile-dashboard-section-panel mobile-section-${activeSection} ${mobileSectionVisible ? 'is-open' : ''}`}>
                    {showSectionTitle && (
                        <div className="dashboard-section-title">
                            <h2><span key={`desktop-${activeSection}`} className="portal-title-jello-text">{sectionTitles[activeSection] || 'Dashboard Section'}</span></h2>
                        </div>
                    )}
                    {showSectionTitle && mobileSectionVisible && (
                        <div className="mobile-section-panel-header">
                            <button type="button" className="back-button" onClick={closeMobileSectionPanel}>
                                Back
                            </button>
                            <h2><span key={`mobile-${activeSection}`} className="portal-title-jello-text">{sectionTitles[activeSection] || 'Dashboard Section'}</span></h2>
                        </div>
                    )}
                    <CandidatePortalErrorBoundary
                        resetKey={`${activeSection}:${sectionErrorResetKey}`}
                        onHome={() => {
                            setSectionErrorResetKey((key) => key + 1);
                            updateActiveSection('home', { push: false });
                            setMobileSectionVisible(false);
                        }}
                    >
                        {renderContent()}
                    </CandidatePortalErrorBoundary>
                    {mobileSectionVisible && ['notifications', 'about-jumptake', 'progress-check'].includes(activeSection) && (
                        <div className="page-footer-actions mobile-section-fallback-footer">
                            <button type="button" className="back-button responsive-back-button mobile-bottom-back-button" onClick={goToPreviousSection}>
                                Back
                            </button>
                        </div>
                    )}
                </main>
            </div>
            <FloatingMessenger
                mode="candidate"
                userId={user?.id}
                currentUser={user}
                profileData={jobSeekerData}
                jobs={jobs}
                activeSection={activeSection}
                unreadCount={pendingInboxCount}
                onSeen={() => {
                    setPendingInboxCount(0);
                    localStorage.setItem('jumptakeCandidateInboxSeenAt', String(Date.now()));
                }}
            />
        </div>
    );
};

export default HomePage;
