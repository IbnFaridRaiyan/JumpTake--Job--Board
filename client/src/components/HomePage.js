import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import MyApplications from './MyApplications';
import BookmarksHub from './BookmarksHub';
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
import BlocksManager from './BlocksManager';
import { clearBrowserAccountState } from '../utils/authStorage';
import dashboardLogo from './media/jumptake-logo-9.png';

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
    'dashboard',
    'inbox',
    'job-feed',
    'notifications',
    'view-candidates',
    'friend-invitations',
    'bookmarks',
    'bookmarked-candidates',
    'applications',
    'assessments',
    'video-interviews',
    'draft-applications',
    'bookmarked-jobs',
    'saved-posts',
    'interested-jobs',
    'resume-playground',
    'about-jumptake',
    'progress-check',
    'blocks',
    'settings'
]);

const CANDIDATE_SECTION_STORAGE_KEY = 'jumptakeCandidateSection';
const PROFILE_IMAGE_UPDATED_EVENT = 'jumptake-profile-image-updated';
const CANDIDATE_SECTIONS_WITHOUT_BACK = new Set(['settings', 'view-candidates', 'interested-jobs', 'resume-playground']);

const normalizeCandidateSection = (section) => (
    ['home', 'profile'].includes(section) ? 'job-feed' : section
);

const isMobileViewport = () => (
    typeof window !== 'undefined'
    && window.matchMedia('(max-width: 768px)').matches
);

const normalizeJobsResponse = (value) => {
    const jobs = Array.isArray(value)
        ? value
        : Array.isArray(value?.jobs)
            ? value.jobs
            : Array.isArray(value?.data)
                ? value.data
                : Array.isArray(value?.results)
                    ? value.results
                    : [];

    return jobs.filter((job) => job && typeof job === 'object');
};

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
    const [activeSection, setActiveSection] = useState('job-feed');
    const [titleAnimationReplayKey, setTitleAnimationReplayKey] = useState(0);
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
    const [mobileSectionVisible, setMobileSectionVisible] = useState(() => isMobileViewport());
    const myApplicationsRef = useRef(null);
    const bookmarksHubRef = useRef(null);
    const mobilePanelRef = useRef(null);
    const navigate = useNavigate();
    const displayEmail = typeof user?.email === 'string' ? user.email : '';
    const displayName = displayEmail.includes('@') ? displayEmail.split('@')[0] : (displayEmail || 'User');
    const displayInitial = displayName ? displayName.charAt(0).toUpperCase() : 'U';
    const safeJobs = useMemo(() => normalizeJobsResponse(jobs), [jobs]);

    useEffect(() => {
        const handleProfileImageUpdated = (event) => {
            const detail = event.detail || {};
            const nextProfileImage = detail.profileImage || '';
            const detailUserId = String(detail.userId || '');
            const detailJobSeekerId = String(detail.jobSeekerId || '');
            const matchesUser = detailUserId && [
                user?.id,
                user?._id,
                user?.userId
            ].some((id) => String(id || '') === detailUserId);
            const matchesProfile = detailJobSeekerId && [
                jobSeekerData?._id,
                jobSeekerData?.id,
                user?.jobSeekerId
            ].some((id) => String(id || '') === detailJobSeekerId);

            if (!matchesUser && !matchesProfile) {
                return;
            }

            setJobSeekerData((currentProfile) => (
                currentProfile
                    ? { ...currentProfile, profileImage: nextProfileImage }
                    : currentProfile
            ));
            setUser((currentUser) => {
                if (!currentUser) {
                    return currentUser;
                }

                const nextUser = { ...currentUser, profileImage: nextProfileImage };
                localStorage.setItem('user', JSON.stringify(nextUser));
                return nextUser;
            });
        };

        window.addEventListener(PROFILE_IMAGE_UPDATED_EVENT, handleProfileImageUpdated);
        return () => window.removeEventListener(PROFILE_IMAGE_UPDATED_EVENT, handleProfileImageUpdated);
    }, [jobSeekerData?._id, jobSeekerData?.id, user?.id, user?._id, user?.userId, user?.jobSeekerId]);

    const updateActiveSection = (section, { push = true } = {}) => {
        const nextSectionValue = normalizeCandidateSection(section);

        if (!CANDIDATE_SECTION_IDS.has(nextSectionValue)) {
            return;
        }

        setSectionErrorResetKey((key) => key + 1);
        setTitleAnimationReplayKey((key) => key + 1);
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
        home: 'Home',
        dashboard: 'Dashboard',
        inbox: 'Inbox',
        'job-feed': 'Home',
        applications: 'My Applications',
        assessments: 'My Assessments',
        'video-interviews': 'Video Interviews',
        'draft-applications': 'Draft Applications',
        bookmarks: 'Bookmarks',
        'bookmarked-jobs': 'Bookmarked Jobs',
        'saved-posts': 'Saved Posts',
        notifications: 'Notifications',
        'view-candidates': 'Candidates',
        'friend-invitations': 'Friends',
        'bookmarked-candidates': 'Bookmarked Candidates',
        'interested-jobs': 'Job Preferences',
        'resume-playground': 'Resume Playground',
        'about-jumptake': 'About JumpTake',
        'progress-check': 'Progress Check',
        blocks: 'Blocks',
        settings: 'Settings'
    };

    useEffect(() => {
        const userData = localStorage.getItem('user');
        const token = localStorage.getItem('token');
        if (!userData || !token) {
            clearBrowserAccountState();
            navigate('/job-seeker');
            return;
        }

        const initializeCandidate = (candidateUser) => {
            setUser(candidateUser);
            const savedInterests = Array.isArray(candidateUser.jobInterests) ? candidateUser.jobInterests : [];
            setSelectedJobInterests(savedInterests);
            setShowInterestPopup(false);

            fetchJobs();
            fetchCandidateNotifications(candidateUser.id);
            fetchCandidateInboxNotifications(candidateUser.id);
            fetchCandidatePortalNotifications(candidateUser.id);
            fetchCandidateFriendNotifications(candidateUser.id);

            let seekerId = candidateUser.jobSeekerId;

            if (!seekerId) {
                seekerId = localStorage.getItem('jobSeekerId') || localStorage.getItem('tempJobSeekerId');

                if (seekerId && !candidateUser.jobSeekerId) {
                    const nextCandidateUser = { ...candidateUser, jobSeekerId: seekerId };
                    localStorage.setItem('user', JSON.stringify(nextCandidateUser));
                    setUser(nextCandidateUser);

                    linkJobSeekerToUser(nextCandidateUser.id, seekerId);
                }
            }

            if (seekerId) {
                fetchJobSeekerData(seekerId, candidateUser.id);
            } else {
                setLoading(false);
            }
        };

        let parsedUser = null;
        try {
            parsedUser = JSON.parse(userData);
        } catch (error) {
            console.error('Could not restore candidate session:', error);
            clearBrowserAccountState();
            navigate('/job-seeker');
            return;
        }

        const restoreLiveCandidateSession = async () => {
            try {
                const response = await fetch(`${process.env.REACT_APP_API_URL || ''}/api/session/candidate`, {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });

                if (!response.ok) {
                    throw new Error('Candidate session is no longer valid');
                }

                const data = await response.json();
                const liveUser = data.user || parsedUser;
                localStorage.setItem('user', JSON.stringify(liveUser));
                initializeCandidate(liveUser);
            } catch (error) {
                console.error('Could not restore live candidate session:', error);
                clearBrowserAccountState();
                navigate('/job-seeker');
            }
        };

        restoreLiveCandidateSession();
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
            setTitleAnimationReplayKey((key) => key + 1);
            setActiveSection(nextSection);
            sessionStorage.setItem(CANDIDATE_SECTION_STORAGE_KEY, nextSection);
            if (isMobileViewport()) {
                setMobileSectionVisible(nextSection !== 'home');
            }
        };

        const initialSection = 'job-feed';
        sessionStorage.setItem(CANDIDATE_SECTION_STORAGE_KEY, initialSection);
        sessionStorage.removeItem('jumptakeHomeFeedRequest');
        sessionStorage.removeItem('jumptakeCandidateJobSearch');
        window.history.replaceState(null, '', `#candidate:${initialSection}`);
        setMobileSectionVisible(isMobileViewport());
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
            setJobs(normalizeJobsResponse(data));
            setLoading(false);
        } catch (err) {
            console.error('Error fetching jobs:', err);
            setJobs([]);
            setError('Failed to load job listings. Please try again later.');
            setLoading(false);
        }
    };

    const fetchJobSeekerData = async (jobSeekerId, userIdOverride = null) => {
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
                const analysisUserId = userIdOverride || user?.id;
                if (!analysisUserId) {
                    return;
                }

                const analysisResponse = await fetch(`${process.env.REACT_APP_API_URL || ''}/api/resume/analysis/${analysisUserId}`, {
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
        clearBrowserAccountState();
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

    const switchSection = (requestedSection) => {
        const nextSection = normalizeCandidateSection(requestedSection);
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
        updateActiveSection(nextSection);
        setMobileSectionVisible(!isMobileViewport() || nextSection !== 'home');
        resetMobilePanelScroll();
    };

    const openSection = (requestedSection) => {
        const nextSection = normalizeCandidateSection(requestedSection);
        if (!nextSection) {
            return;
        }

        if (nextSection === 'notifications') {
            fetchCandidatePortalNotifications(user?.id);
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
        { id: 'job-feed', label: 'Home', icon: 'home' },
        { id: 'dashboard', label: 'Dashboard', icon: 'dashboard' },
        { id: 'notifications', label: 'Notifications', icon: 'bell', notification: pendingNotificationCount > 0 },
        { id: 'view-candidates', label: 'Candidates', icon: 'users' },
        { id: 'friend-invitations', label: 'Friends', icon: 'user-plus', notification: pendingFriendInvitationCount > 0 },
        { id: 'applications', label: 'My Applications', icon: 'profile' },
        { id: 'bookmarks', label: 'Bookmarks', icon: 'star' },
        { id: 'interested-jobs', label: 'Job Preferences', icon: 'briefcase' },
        { id: 'resume-playground', label: 'Resume Playground', icon: 'draft' },
        { id: 'blocks', label: 'Blocks', icon: 'block' }
    ].map((item) => ({
        ...item,
        active: item.id === 'job-feed'
            ? ['home', 'job-feed'].includes(activeSection)
            : item.id === 'applications'
                ? ['applications', 'assessments', 'video-interviews', 'draft-applications'].includes(activeSection)
                : item.id === 'bookmarks'
                    ? ['bookmarks', 'bookmarked-candidates', 'bookmarked-jobs', 'saved-posts'].includes(activeSection)
                : activeSection === item.id,
        onClick: () => openSection(item.id)
    }));

    const candidateSecondaryNavItems = [
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
        if (['applications', 'assessments', 'video-interviews', 'draft-applications'].includes(activeSection)
            && myApplicationsRef.current?.goBackOneStep?.()) {
            resetMobilePanelScroll();
            return;
        }

        if (['bookmarks', 'bookmarked-candidates', 'bookmarked-jobs', 'saved-posts'].includes(activeSection)
            && bookmarksHubRef.current?.goBackOneStep?.()) {
            resetMobilePanelScroll();
            return;
        }

        goToPreviousSection();
    };

    const goToPreviousSection = () => {
        if (['applications', 'assessments', 'video-interviews', 'draft-applications'].includes(activeSection)
            && myApplicationsRef.current?.goBackOneStep?.()) {
            resetMobilePanelScroll();
            return;
        }

        if (['bookmarks', 'bookmarked-candidates', 'bookmarked-jobs', 'saved-posts'].includes(activeSection)
            && bookmarksHubRef.current?.goBackOneStep?.()) {
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
            updateActiveSection('job-feed');
            setMobileSectionVisible(true);
            resetMobilePanelScroll();
            return;
        }

        updateActiveSection('job-feed');
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
            case 'job-feed':
                return <PortalHomeFeed
                    mode="candidate"
                    currentUser={user}
                    profileData={jobSeekerData}
                    jobs={safeJobs}
                    switchSection={switchSection}
                    onRefresh={refreshData}
                />;
            case 'dashboard':
                return <PortalDefaultLanding
                    mode="candidate"
                    displayName={displayName}
                    jobs={safeJobs}
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
            case 'applications':
            case 'assessments':
            case 'video-interviews':
            case 'draft-applications':
                return <MyApplications
                    ref={myApplicationsRef}
                    userId={user?.id}
                    onRefresh={refreshData}
                    switchSection={switchSection}
                    onFooterBack={goToPreviousSection}
                    initialTab={activeSection === 'assessments'
                        ? 'assessments'
                        : activeSection === 'video-interviews'
                            ? 'video-interviews'
                            : activeSection === 'draft-applications'
                                ? 'draft-applications'
                                : 'applications'}
                    onPendingAssessmentCountChange={setPendingAssessmentCount}
                />;
            case 'bookmarks':
            case 'bookmarked-candidates':
            case 'bookmarked-jobs':
            case 'saved-posts':
                return <BookmarksHub
                    ref={bookmarksHubRef}
                    userId={user?.id}
                    viewerId={user?.id || user?._id || user?.userId || 'candidate-guest'}
                    switchSection={switchSection}
                    onFooterBack={goToPreviousSection}
                    initialTab={activeSection === 'bookmarked-jobs'
                        ? 'bookmarked-jobs'
                        : activeSection === 'saved-posts'
                            ? 'saved-posts'
                            : 'bookmarked-candidates'}
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
                    jobs={safeJobs}
                    currentUserId={user?.id}
                    onBack={goToPreviousSection}
                    onFooterBack={goToPreviousSection}
                />;
            case 'friend-invitations':
                return <FriendInvitations userId={user?.id} />;
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
            case 'about-jumptake':
                return <AboutJumpTake mode="candidate" />;
            case 'progress-check':
                return <PerformanceAnalytics
                    mode="candidate"
                    jobs={safeJobs}
                    jobSeekerData={jobSeekerData}
                    userId={user?.id}
                />;
            case 'blocks':
                return <BlocksManager userId={user?.id} profileData={jobSeekerData} />;
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
                    jobs={safeJobs}
                    switchSection={switchSection}
                    onRefresh={refreshData}
                />;
        }
    };

    const showSectionTitle = !['home', 'job-feed', 'dashboard'].includes(activeSection);

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
                            <h2><span key={`desktop-${activeSection}-${titleAnimationReplayKey}`} className="portal-title-jello-text">{sectionTitles[activeSection] || 'Dashboard Section'}</span></h2>
                        </div>
                    )}
                    {showSectionTitle && mobileSectionVisible && (
                        <div className="mobile-section-panel-header">
                            {!CANDIDATE_SECTIONS_WITHOUT_BACK.has(activeSection) && (
                                <button type="button" className="back-button" onClick={closeMobileSectionPanel}>
                                    Back
                                </button>
                            )}
                            <h2><span key={`mobile-${activeSection}-${titleAnimationReplayKey}`} className="portal-title-jello-text">{sectionTitles[activeSection] || 'Dashboard Section'}</span></h2>
                        </div>
                    )}
                    <CandidatePortalErrorBoundary
                        resetKey={`${activeSection}:${sectionErrorResetKey}`}
                        onHome={() => {
                            setSectionErrorResetKey((key) => key + 1);
                            updateActiveSection('job-feed', { push: false });
                            setMobileSectionVisible(isMobileViewport());
                        }}
                    >
                        <div
                            key={`candidate-section-${activeSection}`}
                            className="portal-section-transition-shell"
                            data-section={activeSection}
                        >
                            {renderContent()}
                        </div>
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
                jobs={safeJobs}
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
