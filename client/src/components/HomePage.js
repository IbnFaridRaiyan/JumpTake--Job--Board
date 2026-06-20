import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import JobFeed from './JobFeed';
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
import DashboardSearch from './DashboardSearch';
import PerformanceAnalytics from './PerformanceAnalytics';
import PortalSidebar from './PortalSidebar';
import Notifications from './Notifications';
import FriendInvitations from './FriendInvitations';
import FloatingMessenger from './FloatingMessenger';
import ResumePlayground from './ResumePlayground';
import logo from './media/logo3.png';
import logoDark from './media/logo4.png';

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
    'interested-jobs',
    'resume-playground',
    'profile',
    'about-jumptake',
    'progress-check',
    'settings'
]);

const CANDIDATE_SECTION_STORAGE_KEY = 'jumptakeCandidateSection';

const isMobileViewport = () => (
    typeof window !== 'undefined'
    && window.matchMedia('(max-width: 768px)').matches
);

const getInitialCandidateSection = () => {
    if (typeof window === 'undefined') {
        return 'job-feed';
    }

    const hashValue = window.location.hash.replace(/^#/, '');
    const [portal, section] = hashValue.split(':');
    if (portal === 'candidate' && CANDIDATE_SECTION_IDS.has(section)) {
        return section;
    }

    const storedSection = sessionStorage.getItem(CANDIDATE_SECTION_STORAGE_KEY);
    return CANDIDATE_SECTION_IDS.has(storedSection) ? storedSection : 'job-feed';
};

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
    const [activeSection, setActiveSection] = useState(getInitialCandidateSection);
    const sectionHistoryRef = useRef([]);
    const [jobs, setJobs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [user, setUser] = useState(null);
    const [jobSeekerData, setJobSeekerData] = useState(null);
    const [pendingAssessmentCount, setPendingAssessmentCount] = useState(0);
    const [pendingVideoInterviewCount, setPendingVideoInterviewCount] = useState(0);
    const [pendingInboxCount, setPendingInboxCount] = useState(0);
    const [pendingNotificationCount, setPendingNotificationCount] = useState(0);
    const [showInterestPopup, setShowInterestPopup] = useState(false);
    const [selectedJobInterests, setSelectedJobInterests] = useState([]);
    const [interestError, setInterestError] = useState('');
    const [savingInterests, setSavingInterests] = useState(false);
    const [mobileSectionVisible, setMobileSectionVisible] = useState(false);
    const myApplicationsRef = useRef(null);
    const videoInterviewsRef = useRef(null);
    const mobilePanelRef = useRef(null);
    const navigate = useNavigate();
    const dashboardLogo = appMode === 'dark' ? logoDark : logo;
    const displayEmail = typeof user?.email === 'string' ? user.email : '';
    const displayName = displayEmail.includes('@') ? displayEmail.split('@')[0] : (displayEmail || 'User');
    const displayInitial = displayName ? displayName.charAt(0).toUpperCase() : 'U';

    const updateActiveSection = (section, { push = true } = {}) => {
        if (!CANDIDATE_SECTION_IDS.has(section)) {
            return;
        }

        setActiveSection(section);
        sessionStorage.setItem(CANDIDATE_SECTION_STORAGE_KEY, section);

        const nextHash = `#candidate:${section}`;
        if (window.location.hash !== nextHash) {
            if (push) {
                window.history.pushState(null, '', nextHash);
            } else {
                window.history.replaceState(null, '', nextHash);
            }
        }
    };

    const sectionTitles = {
        'job-feed': 'Job Feed',
        applications: 'My Applications',
        assessments: 'My Assessments',
        'video-interviews': 'Video Interviews',
        'draft-applications': 'Draft Applications',
        'bookmarked-jobs': 'Bookmarked Jobs',
        notifications: 'Notifications',
        'view-candidates': 'View Candidates',
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

        const parsedUser = JSON.parse(userData);
        setUser(parsedUser);
        const savedInterests = Array.isArray(parsedUser.jobInterests) ? parsedUser.jobInterests : [];
        setSelectedJobInterests(savedInterests);
        setShowInterestPopup(savedInterests.length < 4);

        fetchJobs();
        fetchCandidateNotifications(parsedUser.id);
        fetchCandidateInboxNotifications(parsedUser.id);
        fetchCandidatePortalNotifications(parsedUser.id);

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

            setActiveSection(section);
            sessionStorage.setItem(CANDIDATE_SECTION_STORAGE_KEY, section);
            if (isMobileViewport()) {
                setMobileSectionVisible(section !== 'job-feed');
            }
        };

        const initialSection = getInitialCandidateSection();
        sessionStorage.setItem(CANDIDATE_SECTION_STORAGE_KEY, initialSection);
        if (!window.location.hash.startsWith('#candidate:')) {
            window.history.replaceState(null, '', `#candidate:${initialSection}`);
        }
        if (isMobileViewport() && initialSection !== 'job-feed') {
            setMobileSectionVisible(true);
        }

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
        }
        if (user?.jobSeekerId) {
            fetchJobSeekerData(user.jobSeekerId);
        }
    };

    const switchSection = (nextSection) => {
        if (!nextSection || nextSection === activeSection) {
            setMobileSectionVisible(true);
            resetMobilePanelScroll();
            return;
        }

        const openedFromMobileNav = isMobileViewport() && !mobileSectionVisible;
        sectionHistoryRef.current = openedFromMobileNav
            ? []
            : [...sectionHistoryRef.current, activeSection];
        updateActiveSection(nextSection);
        setMobileSectionVisible(true);
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
            setMobileSectionVisible(true);
            return;
        }

        switchSection(nextSection);
    };

    const candidatePrimaryNavItems = [
        { id: 'job-feed', label: 'Job Feed', icon: 'briefcase' },
        { id: 'notifications', label: 'Notifications', icon: 'bell', notification: pendingNotificationCount > 0 },
        { id: 'view-candidates', label: 'View Candidates', icon: 'users' },
        { id: 'friend-invitations', label: 'Friends', icon: 'user-plus' },
        { id: 'bookmarked-candidates', label: 'Bookmarked Candidates', icon: 'heart' },
        { id: 'applications', label: 'My Applications', icon: 'profile' },
        { id: 'assessments', label: 'My Assessments', icon: 'assessment', notification: pendingAssessmentCount > 0 },
        { id: 'video-interviews', label: 'Video Interviews', icon: 'send', notification: pendingVideoInterviewCount > 0 },
        { id: 'draft-applications', label: 'Draft Applications', icon: 'draft' },
        { id: 'bookmarked-jobs', label: 'Bookmarked Jobs', icon: 'star' },
        { id: 'interested-jobs', label: 'Job Preferences', icon: 'briefcase' },
        { id: 'resume-playground', label: 'Resume Playground', icon: 'draft' }
    ].map((item) => ({
        ...item,
        active: activeSection === item.id,
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

    const handleDashboardSearch = (query) => {
        const lowerQuery = query.toLowerCase();

        if (['inbox', 'message', 'messages', 'reply', 'chat'].some((term) => lowerQuery.includes(term))) {
            setPendingInboxCount(0);
            localStorage.setItem('jumptakeCandidateInboxSeenAt', String(Date.now()));
            window.dispatchEvent(new CustomEvent('jumptake-open-candidate-messenger'));
            return;
        }

        const directMatches = [
            { section: 'notifications', terms: ['notification', 'notifications', 'activity', 'alert', 'updates'] },
            { section: 'settings', terms: ['settings', 'account', 'security', 'email', 'password'] },
            { section: 'resume-playground', terms: ['resume playground', 'resume editor', 'resume template', 'cv editor', 'cv builder'] },
            { section: 'profile', terms: ['profile', 'resume', 'education', 'experience', 'skill'] },
            { section: 'applications', terms: ['application', 'applied', 'status', 'withdraw'] },
            { section: 'assessments', terms: ['assessment', 'test', 'quiz'] },
            { section: 'video-interviews', terms: ['video', 'interview'] },
            { section: 'draft-applications', terms: ['draft'] },
            { section: 'bookmarked-jobs', terms: ['bookmark', 'saved job'] },
            { section: 'interested-jobs', terms: ['interest', 'suggestion', 'recommended'] },
            { section: 'progress-check', terms: ['progress', 'performance', 'analytics', 'rate', 'views', 'response'] },
            { section: 'view-candidates', terms: ['candidate', 'candidates', 'talent', 'people', 'profile'] },
            { section: 'friend-invitations', terms: ['friend', 'friends', 'invitation', 'request', 'connection'] },
            { section: 'bookmarked-candidates', terms: ['bookmarked candidates', 'saved candidates', 'candidate bookmarks'] },
            { section: 'about-jumptake', terms: ['about', 'jumptake', 'help', 'guide'] }
        ];

        const match = directMatches.find(({ terms }) => terms.some((term) => lowerQuery.includes(term)));
        if (match) {
            openSection(match.section);
            return;
        }

        sessionStorage.setItem('jumptakeCandidateJobSearch', query);
        openSection('job-feed');
    };

    const handleOpenNotification = (notification) => {
        const payload = notification?.payload || {};
        const nextSection = notification?.section || 'notifications';

        if (nextSection === 'inbox') {
            setPendingInboxCount(0);
            localStorage.setItem('jumptakeCandidateInboxSeenAt', String(Date.now()));
            window.dispatchEvent(new CustomEvent('jumptake-open-candidate-messenger', { detail: payload }));
            return;
        }

        if (nextSection === 'job-feed' && payload.jobId) {
            localStorage.setItem('jumptakeActiveJobId', String(payload.jobId));
            localStorage.setItem('jumptakeActiveJobAction', payload.intent === 'apply' ? 'apply' : 'preview');
        }

        openSection(CANDIDATE_SECTION_IDS.has(nextSection) ? nextSection : 'notifications');
    };

    const handleLogoClick = () => {
        sectionHistoryRef.current = [];
        updateActiveSection('job-feed');
        setMobileSectionVisible(false);
        resetMobilePanelScroll();
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
            setMobileSectionVisible(!isMobileViewport() || previousSection !== 'job-feed');
            resetMobilePanelScroll();
            return;
        }

        if (isMobileViewport()) {
            setMobileSectionVisible(false);
            resetMobilePanelScroll();
            return;
        }

        updateActiveSection('job-feed');
        resetMobilePanelScroll();
    };

    const returnToSection = (section) => {
        if (!CANDIDATE_SECTION_IDS.has(section)) {
            return;
        }

        sectionHistoryRef.current = sectionHistoryRef.current.filter((item) => item !== section);
        updateActiveSection(section);
        setMobileSectionVisible(true);
        resetMobilePanelScroll();
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
                    returnToSection={returnToSection}
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
                return <JobFeed
                    jobs={jobs}
                    error={error}
                    userId={user?.id}
                    onRefresh={refreshData}
                    jobSeekerData={jobSeekerData}
                    currentUser={user}
                    returnToSection={returnToSection}
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
                            <img src={dashboardLogo} alt="JumpTake Logo" className="candidate-dashboard-logo" />
                        </button>
                    </div>
                    <div className="dashboard-title candidate-dashboard-title">
                        <h1>Candidate Portal</h1>
                        <p>Welcome back, {displayName}</p>
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
                        <img src={dashboardLogo} alt="JumpTake Logo" className="candidate-dashboard-logo" />
                    </button>
                </div>
                <div className="dashboard-title candidate-dashboard-title">
                    <h1>Candidate Portal</h1>
                    <p>Welcome back, {displayName}</p>
                </div>
                <DashboardSearch onSearch={handleDashboardSearch} />
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
                    <div className="dashboard-section-title">
                        <h2>{sectionTitles[activeSection] || 'Dashboard Section'}</h2>
                    </div>
                    {mobileSectionVisible && (
                        <div className="mobile-section-panel-header">
                            <button type="button" className="back-button" onClick={closeMobileSectionPanel}>
                                Back
                            </button>
                            <h2>{sectionTitles[activeSection] || 'Dashboard Section'}</h2>
                        </div>
                    )}
                    {renderContent()}
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
