import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import RichMessageEditor from './RichMessageEditor';
import AssistantChat from './AssistantChat';
import ChatAvatar from './ChatAvatar';
import MessageWorkspaceNav from './MessageWorkspaceNav';
import NewMessageFinder from './NewMessageFinder';
import MessageSettings from './MessageSettings';
import TalentPool from './TalentPool';
import MessageCompanyProfileModal from './MessageCompanyProfileModal';
import { apiUrl } from '../utils/apiUrl';
import confirmAction from '../utils/confirmAction';

const stripHtml = (html = '') => html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
const hasMessageContent = (html = '') => stripHtml(html).length > 0 || /<img\b/i.test(html);
const ASSISTANT_THREAD_ID = '__jumptake_ai__';
const MESSAGE_MENU_ANIMATION_MS = 180;
const normalizeSearchText = (value = '') => String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
const RESUME_WORKSPACE_SNAPSHOT_KEY = 'jumptakeResumePlaygroundSnapshot';

const stripAssistantDraftMarkdown = (line = '') => String(line || '')
    .replace(/\u2022|\u00e2\u20ac\u00a2/g, '-')
    .trim()
    .replace(/^```[\w-]*\s*$/i, '')
    .replace(/^#{1,6}\s*/, '')
    .replace(/^>\s*/, '')
    .replace(/^\s*[-*_]{3,}\s*$/, '')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/__([^_]+)__/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/_([^_]+)_/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\*/g, '')
    .trim();

const isAssistantDraftPreambleLine = (line = '') => {
    const normalized = normalizeSearchText(line).replace(/\bats friendly\b/g, 'ats-friendly');
    return /^(absolutely|certainly|sure|of course|here|below|based|i ve|i have)\b/.test(normalized)
        && /\b(post|story|document|draft|message|content|caption|resume|profile|based on your profile)\b/.test(normalized);
};

const cleanAssistantDraftText = (value = '') => String(value || '')
    .replace(/\r\n/g, '\n')
    .split('\n')
    .map(stripAssistantDraftMarkdown)
    .filter(Boolean)
    .filter((line) => !isAssistantDraftPreambleLine(line))
    .join('\n')
    .trim();

const isWeakAssistantActionDraft = (value = '') => {
    const text = String(value || '').trim();
    const normalized = normalizeSearchText(text);

    return text.length < 140
        || /\b(share your|send me|tell me your|tell me a bit more|can you please tell me|pick a genre|choose a genre|paste your|target job title)\b/.test(normalized)
        || /^(great|i can|let s|ready to|please|share|send|tell me|can you|could you|pick a|choose|what kind|which)\b/.test(normalized);
};

const buildLocalResumeDraft = (context = {}, question = '') => {
    const profile = context.profile || {};
    const user = context.user || {};
    const identityValues = [profile.email, user.email, profile.username, user.username, profile.jumptakeId, user.jumptakeId]
        .map((value) => String(value || '').trim().toLowerCase())
        .filter(Boolean);
    const name = [profile.name, profile.fullName, user.name, user.fullName]
        .map((value) => String(value || '').replace(/\s+/g, ' ').trim())
        .find((value) => value
            && !/@|https?:|\d/.test(value)
            && !identityValues.includes(value.toLowerCase())
            && /^[\p{L}][\p{L}\p{M}' -]*$/u.test(value)) || 'Your Name';
    const skills = Array.isArray(profile.skills) ? profile.skills : String(profile.skills || '').split(/[\n,;|]+/).filter(Boolean);
    const education = Array.isArray(profile.education) ? profile.education : String(profile.education || '').split(/\n+/).filter(Boolean);
    const experience = Array.isArray(profile.experience) ? profile.experience : String(profile.experience || '').split(/\n+/).filter(Boolean);
    const role = String(user.jobInterests?.[0] || profile.targetRole || 'Target Role').trim();

    return [
        name.toUpperCase(),
        [user.email || profile.email, role].filter(Boolean).join(' | '),
        '',
        'PROFESSIONAL SUMMARY',
        `Motivated ${role} candidate with strengths in communication, problem solving, teamwork, and continuous learning. Ready to contribute with reliable work, clear organization, and a growth-focused mindset.`,
        '',
        'CORE SKILLS',
        ...(skills.length ? skills.slice(0, 10).map((skill) => `- ${String(skill).trim()}`) : ['- Communication', '- Teamwork', '- Problem solving', '- Time management']),
        ...(experience.length ? ['', 'EXPERIENCE', ...experience.slice(0, 6).map((item) => `- ${String(item).trim()}`)] : []),
        ...(education.length ? ['', 'EDUCATION', ...education.slice(0, 5).map((item) => `- ${String(item).trim()}`)] : [])
    ].join('\n');
};

const buildLocalDocumentDraft = (context = {}, question = '') => {
    const profile = context.profile || {};
    const user = context.user || {};
    const identities = [profile.email, user.email, profile.username, user.username, profile.jumptakeId, user.jumptakeId]
        .map((value) => String(value || '').trim().toLowerCase())
        .filter(Boolean);
    const name = [profile.name, profile.fullName, user.name, user.fullName]
        .map((value) => String(value || '').replace(/\s+/g, ' ').trim())
        .find((value) => value && !/@|\d/.test(value) && !identities.includes(value.toLowerCase())) || 'Your Name';
    return [
        'PROFESSIONAL DOCUMENT',
        '',
        '[Date]',
        '',
        'To whom it may concern,',
        '',
        String(question || 'This document records the requested information in a clear and professional form.').trim(),
        '',
        'Sincerely,',
        name
    ].join('\n');
};

const buildLocalStoryDraft = (context = {}) => {
    const profile = context.profile || {};
    const name = String(profile.name || context.user?.name || 'I').trim();
    return [
        `Today I’m sharing a small part of my career journey as ${name}.`,
        '',
        'I’m continuing to learn, build, and grow through every project, challenge, and opportunity. Each step is helping me understand my strengths better and become more confident in the work I want to do next.',
        '',
        'I’m excited to connect with people who are also learning, hiring, building, and exploring new opportunities. Let’s grow together and support each other’s next step.'
    ].join('\n');
};

const buildLocalActionDraft = (actionName = '', context = {}, question = '') => {
    if (actionName === 'candidate-create-resume' || actionName === 'candidate-format-resume') {
        return buildLocalResumeDraft(context, question);
    }

    if (actionName === 'candidate-create-document' || actionName === 'candidate-format-document') {
        return buildLocalDocumentDraft(context, question);
    }

    if (actionName === 'candidate-create-story') {
        return buildLocalStoryDraft(context);
    }

    return '';
};

const detectLocalAssistantAction = (message = '', context = {}) => {
    const normalized = normalizeSearchText(message);
    const portalMode = context?.portalMode || '';
    const activeSection = normalizeSearchText(context?.activeSection || '');
    const hasActionVerb = /\b(open|go to|show|start|create|make|write|draft|generate|compose|prepare)\b/.test(normalized);
    const wantsResumeDraft = portalMode !== 'employer'
        && /\b(create|make|write|draft|generate|prepare)\b.{0,40}\b(resume|cv)\b|\b(resume|cv)\b.{0,32}\b(create|make|write|draft|generate|prepare)\b/.test(normalized);
    const wantsDocumentDraft = portalMode !== 'employer'
        && /\b(create|make|write|draft|generate|prepare)\b.{0,40}\b(document|letter|memo|policy)\b|\b(document|letter|memo|policy)\b.{0,32}\b(create|make|write|draft|generate|prepare)\b/.test(normalized);
    const wantsStoryComposer = /\b(talent story|story|stories|talent post|feed post|post composer|create story|write story)\b/.test(normalized)
        && hasActionVerb
        && portalMode !== 'employer';
    const wantsEmployerPost = /\b(company post|work news|announcement|feed post|post composer|create post|write post)\b/.test(normalized)
        && hasActionVerb
        && portalMode === 'employer';

    if (wantsResumeDraft) {
        return 'candidate-create-resume';
    }

    if (wantsDocumentDraft) {
        return 'candidate-create-document';
    }

    if (wantsStoryComposer || (portalMode !== 'employer' && activeSection === 'job feed' && /\b(write|draft|generate|compose)\b.*\bpost\b/.test(normalized))) {
        return 'candidate-create-story';
    }

    if (wantsEmployerPost) {
        return 'employer-create-post';
    }

    return '';
};

const readWorkspaceSnapshot = () => {
    if (typeof window === 'undefined') {
        return null;
    }

    try {
        return JSON.parse(sessionStorage.getItem(RESUME_WORKSPACE_SNAPSHOT_KEY) || 'null');
    } catch (error) {
        return null;
    }
};

const CloseIcon = () => (
    <svg
        xmlns="http://www.w3.org/2000/svg"
        width="16"
        height="16"
        fill="currentColor"
        className="bi bi-x"
        viewBox="0 0 16 16"
        aria-hidden="true"
        focusable="false"
    >
        <path d="M4.646 4.646a.5.5 0 0 1 .708 0L8 7.293l2.646-2.647a.5.5 0 0 1 .708.708L8.707 8l2.647 2.646a.5.5 0 0 1-.708.708L8 8.707l-2.646 2.647a.5.5 0 0 1-.708-.708L7.293 8 4.646 5.354a.5.5 0 0 1 0-.708" />
    </svg>
);

const formatDateTime = (dateString) => {
    if (!dateString) return '';

    return new Date(dateString).toLocaleString(undefined, {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
};

const FloatingMessenger = ({
    mode,
    companyId,
    userId,
    currentUser = null,
    profileData = null,
    companyData = null,
    jobs = [],
    activeSection = '',
    unreadCount = 0,
    onSeen
}) => {
    const isEmployer = mode === 'employer';
    const [open, setOpen] = useState(false);
    const [threads, setThreads] = useState([]);
    const [selectedThreadId, setSelectedThreadId] = useState('');
    const [pendingContact, setPendingContact] = useState(null);
    const [replyHtml, setReplyHtml] = useState('');
    const [loading, setLoading] = useState(false);
    const [sending, setSending] = useState(false);
    const [error, setError] = useState('');
    const [message, setMessage] = useState('');
    const [activeTab, setActiveTab] = useState('new');
    const [openThreadMenuId, setOpenThreadMenuId] = useState('');
    const [closingThreadMenuId, setClosingThreadMenuId] = useState('');
    const [selectedProfile, setSelectedProfile] = useState(null);
    const [selectedCompanyProfile, setSelectedCompanyProfile] = useState(null);
    const [triggerTone, setTriggerTone] = useState('maroon');
    const [isMobileView, setIsMobileView] = useState(() => (
        typeof window !== 'undefined' ? window.matchMedia('(max-width: 768px)').matches : false
    ));
    const messagesRef = useRef(null);
    const openAssistantOnNextLoadRef = useRef(false);
    const assistantDirectOpenRef = useRef(false);
    const pendingContactRef = useRef(null);
    const selectedThreadIdRef = useRef(selectedThreadId);
    const isMobileViewRef = useRef(isMobileView);
    const menuCloseTimerRef = useRef(null);
    const triggerRef = useRef(null);
    const openEventName = isEmployer ? 'jumptake-open-employer-messenger' : 'jumptake-open-candidate-messenger';

    const endpoint = useMemo(() => (
        isEmployer
            ? `/api/messages/company/${companyId}`
            : `/api/messages/user/${userId}`
    ), [isEmployer, companyId, userId]);
    const assistantStorageKey = useMemo(() => (
        `jumptakeAssistantChat:${mode || 'portal'}:${userId || companyId || 'guest'}`
    ), [companyId, mode, userId]);
    const getAssistantContext = useCallback(() => ({
        portalMode: mode,
        activeSection,
        user: currentUser,
        profile: profileData,
        company: companyData,
        workspace: readWorkspaceSnapshot(),
        jobs: Array.isArray(jobs) ? jobs : []
    }), [activeSection, companyData, currentUser, jobs, mode, profileData]);

    const assistantSelected = selectedThreadId === ASSISTANT_THREAD_ID;
    const selectedThread = assistantSelected ? null : (threads.find((thread) => thread._id === selectedThreadId) || null);

    useEffect(() => {
        selectedThreadIdRef.current = selectedThreadId;
    }, [selectedThreadId]);

    useEffect(() => {
        pendingContactRef.current = pendingContact;
    }, [pendingContact]);

    useEffect(() => {
        isMobileViewRef.current = isMobileView;
    }, [isMobileView]);

    useEffect(() => {
        const handleThreadUpdated = (event) => {
            const updatedThread = event.detail?.thread;
            const action = event.detail?.action;
            if (!updatedThread?._id) return;
            setThreads((currentThreads) => currentThreads.map((thread) => (
                thread._id === updatedThread._id ? updatedThread : thread
            )));
            if (['archive', 'delete', 'block-chat'].includes(action)
                && selectedThreadIdRef.current === updatedThread._id) {
                setSelectedThreadId('');
                setPendingContact(null);
            }
        };
        window.addEventListener('jumptake-message-thread-updated', handleThreadUpdated);
        return () => window.removeEventListener('jumptake-message-thread-updated', handleThreadUpdated);
    }, []);

    useEffect(() => {
        if (open || typeof document === 'undefined') return undefined;
        let animationFrame = 0;
        let updateTimer = 0;
        let lastToneUpdateAt = 0;

        const parseSurface = (element) => {
            const color = window.getComputedStyle(element).backgroundColor;
            const match = color?.match(/rgba?\((\d+(?:\.\d+)?)[,\s]+(\d+(?:\.\d+)?)[,\s]+(\d+(?:\.\d+)?)(?:[,\s/]+(\d*(?:\.\d+)?))?\)/i);
            if (!match) return null;
            const alpha = match[4] === undefined || match[4] === '' ? 1 : Number(match[4]);
            if (alpha < 0.12) return null;
            return [Number(match[1]), Number(match[2]), Number(match[3])];
        };

        const updateTriggerTone = () => {
            animationFrame = 0;
            lastToneUpdateAt = performance.now();
            const rect = triggerRef.current?.getBoundingClientRect();
            if (!rect) return;
            const x = Math.min(window.innerWidth - 1, Math.max(0, rect.left + rect.width / 2));
            const y = Math.min(window.innerHeight - 1, Math.max(0, rect.top + rect.height / 2));
            const surface = document.elementsFromPoint(x, y)
                .filter((element) => !element.closest?.('.floating-messenger'))
                .map(parseSurface)
                .find(Boolean) || [255, 255, 255];
            const [red, green, blue] = surface.map((channel) => channel / 255);
            const luminance = (0.2126 * red) + (0.7152 * green) + (0.0722 * blue);
            const isWarmCream = surface[0] > surface[2] + 7 && surface[1] >= surface[2];
            setTriggerTone(luminance < 0.43 ? 'white' : (isWarmCream || luminance > 0.9 ? 'maroon' : 'black'));
        };

        const scheduleUpdate = () => {
            if (animationFrame || updateTimer) return;

            const elapsed = performance.now() - lastToneUpdateAt;
            if (elapsed < 80) {
                updateTimer = window.setTimeout(() => {
                    updateTimer = 0;
                    animationFrame = window.requestAnimationFrame(updateTriggerTone);
                }, 80 - elapsed);
                return;
            }

            animationFrame = window.requestAnimationFrame(updateTriggerTone);
        };

        scheduleUpdate();
        document.addEventListener('scroll', scheduleUpdate, true);
        window.addEventListener('resize', scheduleUpdate);
        const observer = new MutationObserver(scheduleUpdate);
        observer.observe(document.body, { attributes: true, attributeFilter: ['class', 'style', 'data-theme'] });
        observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class', 'style', 'data-theme'] });
        return () => {
            if (animationFrame) window.cancelAnimationFrame(animationFrame);
            if (updateTimer) window.clearTimeout(updateTimer);
            document.removeEventListener('scroll', scheduleUpdate, true);
            window.removeEventListener('resize', scheduleUpdate);
            observer.disconnect();
        };
    }, [activeSection, open]);

    const isDirectCandidateThread = (thread) => thread?.conversationType === 'candidate-candidate';

    const getPeerCandidate = (thread) => {
        const profiles = Array.isArray(thread?.candidateProfiles) ? thread.candidateProfiles : [];
        return profiles.find((profile) => String(profile?.user || '') !== String(userId || '')) || profiles[0] || null;
    };

    const getThreadTitle = (thread) => {
        if (isEmployer) {
            return thread?.candidate?.name || thread?.candidateUser?.email || 'Candidate';
        }

        if (isDirectCandidateThread(thread)) {
            const peerCandidate = getPeerCandidate(thread);
            return peerCandidate?.name || 'Candidate';
        }

        return thread?.company?.name || 'Company';
    };

    const getThreadAvatar = (thread) => {
        if (isEmployer) {
            return thread?.candidate?.profileImage || '';
        }

        if (isDirectCandidateThread(thread)) {
            return getPeerCandidate(thread)?.profileImage || '';
        }

        return thread?.company?.logo || '';
    };

    const getThreadProfile = (thread) => {
        if (!thread) return null;
        if (isEmployer && thread.candidate) {
            return {
                ...thread.candidate,
                user: thread.candidate.user || thread.candidateUser?._id || thread.candidateUser || '',
                jumptakeId: thread.candidate.jumptakeId || thread.candidateUser?.jumptakeId || ''
            };
        }
        if (!isDirectCandidateThread(thread)) return null;
        const candidate = getPeerCandidate(thread);
        const participant = (thread.participantUsers || []).find((item) => (
            String(item?._id || item) !== String(userId || '')
        ));
        return candidate ? {
            ...candidate,
            user: candidate.user || participant?._id || participant || '',
            jumptakeId: candidate.jumptakeId || participant?.jumptakeId || ''
        } : null;
    };

    const getThreadCompanyProfile = (thread) => (
        !isEmployer && !isDirectCandidateThread(thread) ? (thread?.company || null) : null
    );

    const openThreadProfile = (thread) => {
        const candidate = getThreadProfile(thread);
        if (candidate) {
            setSelectedProfile(candidate);
            return;
        }
        const company = getThreadCompanyProfile(thread);
        if (company) setSelectedCompanyProfile(company);
    };

    const canOpenThreadProfile = (thread) => Boolean(
        getThreadProfile(thread) || getThreadCompanyProfile(thread)
    );

    const getThreadPresence = (thread) => {
        if (!thread) return 'New conversation';
        if (thread.viewerState?.peerPresenceHidden) return 'Last online hidden';
        const lastOnlineAt = thread.viewerState?.peerLastOnlineAt;
        if (!lastOnlineAt) return thread.lastMessageAt ? `Last online ${formatDateTime(thread.lastMessageAt)}` : 'Last online unavailable';
        const onlineTime = new Date(lastOnlineAt).getTime();
        if (Number.isFinite(onlineTime) && Date.now() - onlineTime < 90000) return 'Online now';
        return `Last online ${formatDateTime(lastOnlineAt)}`;
    };

    const isOwnMessage = (thread, item) => {
        if (isDirectCandidateThread(thread)) {
            return String(item?.senderUser || '') === String(userId || '');
        }

        return item?.senderType === (isEmployer ? 'employer' : 'candidate');
    };

    const getMessageSenderLabel = (thread, item) => {
        if (isOwnMessage(thread, item)) return 'You';
        if (isDirectCandidateThread(thread)) return getThreadTitle(thread);
        return item?.senderType === 'employer' ? 'Employer' : 'Candidate';
    };

    const fetchThreads = async (preserveSelection = true) => {
        if ((isEmployer && !companyId) || (!isEmployer && !userId)) {
            setThreads([]);
            return;
        }

        setLoading(true);
        setError('');

        try {
            const token = localStorage.getItem(isEmployer ? 'employerToken' : 'token');
            const response = await fetch(apiUrl(endpoint), {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (!response.ok) {
                throw new Error('Failed to load messages');
            }

            const data = await response.json();
            const nextThreads = Array.isArray(data) ? data : [];
            setThreads(nextThreads);

            const requestedContact = pendingContactRef.current;
            if (requestedContact?.userId || requestedContact?.candidateId) {
                const existingThread = nextThreads.find((thread) => {
                    if (thread?.conversationType !== 'candidate-candidate') {
                        return false;
                    }

                    const candidateIds = (thread.candidateProfiles || []).map((profile) => String(profile?._id || profile?.id || ''));
                    const userIds = [
                        ...(thread.participantUsers || []).map((participant) => String(participant?._id || participant?.id || participant || '')),
                        ...(thread.candidateProfiles || []).map((profile) => String(profile?.user?._id || profile?.user?.id || profile?.user || ''))
                    ];

                    return (
                        (requestedContact.candidateId && candidateIds.includes(String(requestedContact.candidateId)))
                        || (requestedContact.userId && userIds.includes(String(requestedContact.userId)))
                    );
                });

                if (existingThread) {
                    setPendingContact(null);
                    setSelectedThreadId(existingThread._id);
                } else {
                    setSelectedThreadId('');
                }
                return;
            }

            if (!preserveSelection) {
                if (openAssistantOnNextLoadRef.current) {
                    openAssistantOnNextLoadRef.current = false;
                    setSelectedThreadId(ASSISTANT_THREAD_ID);
                } else {
                    setSelectedThreadId(isMobileViewRef.current ? '' : ASSISTANT_THREAD_ID);
                }
            } else {
                const currentSelectedThreadId = selectedThreadIdRef.current;
                const threadStillExists = nextThreads.some((thread) => thread._id === currentSelectedThreadId);
                if (!threadStillExists && currentSelectedThreadId !== ASSISTANT_THREAD_ID) {
                    setSelectedThreadId(isMobileViewRef.current ? '' : ASSISTANT_THREAD_ID);
                }
            }
        } catch (fetchError) {
            console.error('Error loading messages:', fetchError);
            setError(fetchError.message || 'Failed to load messages.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (typeof window === 'undefined') return undefined;

        const mediaQuery = window.matchMedia('(max-width: 768px)');
        const handleViewportChange = (event) => {
            setIsMobileView(event.matches);
        };

        setIsMobileView(mediaQuery.matches);
        if (typeof mediaQuery.addEventListener === 'function') {
            mediaQuery.addEventListener('change', handleViewportChange);
            return () => mediaQuery.removeEventListener('change', handleViewportChange);
        }

        mediaQuery.addListener(handleViewportChange);
        return () => mediaQuery.removeListener(handleViewportChange);
    }, []);

    useEffect(() => {
        if (!open) return undefined;

        fetchThreads(false);
        const intervalId = window.setInterval(() => fetchThreads(true), 30000);

        return () => window.clearInterval(intervalId);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open, endpoint]);

    useEffect(() => {
        if (!open || !selectedThread || !messagesRef.current) return;
        messagesRef.current.scrollTop = messagesRef.current.scrollHeight;
    }, [open, selectedThread]);

    useEffect(() => {
        if (!open || !selectedThread || !messagesRef.current) return;
        messagesRef.current.scrollTop = messagesRef.current.scrollHeight;
    }, [selectedThread?.messages?.length, open, selectedThread]);

    useEffect(() => {
        const handleOpenEvent = (event) => {
            if (event?.detail?.tourClose === true) {
                setOpen(false);
                setSelectedThreadId('');
                setPendingContact(null);
                setReplyHtml('');
                setMessage('');
                setError('');
                assistantDirectOpenRef.current = false;
                return;
            }

            const shouldOpenAssistant = event?.detail?.assistant === true;
            const nextContact = event?.detail?.contact && typeof event.detail.contact === 'object'
                ? event.detail.contact
                : null;
            openAssistantOnNextLoadRef.current = shouldOpenAssistant;
            assistantDirectOpenRef.current = shouldOpenAssistant;
            setPendingContact(nextContact);
            setOpen(true);
            if (nextContact) {
                setSelectedThreadId('');
                setReplyHtml('');
                setMessage('');
                setError('');
            } else if (shouldOpenAssistant) {
                setSelectedThreadId(ASSISTANT_THREAD_ID);
            } else if (isMobileView) {
                setSelectedThreadId('');
            }
            onSeen?.();
        };

        window.addEventListener(openEventName, handleOpenEvent);
        return () => window.removeEventListener(openEventName, handleOpenEvent);
    }, [isMobileView, onSeen, openEventName]);

    useEffect(() => {
        if (!message || /^write a message/i.test(message)) {
            return undefined;
        }

        const timeoutId = window.setTimeout(() => {
            setMessage('');
        }, 2200);

        return () => window.clearTimeout(timeoutId);
    }, [message]);

    const handleOpen = () => {
        assistantDirectOpenRef.current = false;
        setOpen(true);
        if (isMobileView) {
            setSelectedThreadId('');
        }
        onSeen?.();
    };

    const handleClose = useCallback(() => {
        setOpen(false);
        setSelectedThreadId('');
        setPendingContact(null);
        setReplyHtml('');
        setMessage('');
        setError('');
        assistantDirectOpenRef.current = false;
    }, []);

    useEffect(() => {
        if (!open || typeof document === 'undefined') {
            return undefined;
        }

        const previousOverflow = document.body.style.overflow;
        const handleKeyDown = (event) => {
            if (event.key === 'Escape') {
                handleClose();
            }
        };

        document.body.style.overflow = 'hidden';
        document.addEventListener('keydown', handleKeyDown);

        return () => {
            document.body.style.overflow = previousOverflow;
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, [handleClose, open]);

    const handleSelectThread = (threadId) => {
        assistantDirectOpenRef.current = false;
        setPendingContact(null);
        setSelectedThreadId(threadId);
        onSeen?.();
    };

    const closeThreadMenu = () => {
        if (!openThreadMenuId) return;
        const closingId = openThreadMenuId;
        setClosingThreadMenuId(closingId);
        if (menuCloseTimerRef.current) window.clearTimeout(menuCloseTimerRef.current);
        menuCloseTimerRef.current = window.setTimeout(() => {
            setOpenThreadMenuId('');
            setClosingThreadMenuId('');
            menuCloseTimerRef.current = null;
        }, MESSAGE_MENU_ANIMATION_MS);
    };

    const toggleThreadMenu = (threadId) => {
        if (openThreadMenuId === threadId) {
            closeThreadMenu();
            return;
        }
        if (menuCloseTimerRef.current) window.clearTimeout(menuCloseTimerRef.current);
        setClosingThreadMenuId('');
        setOpenThreadMenuId(threadId);
    };

    useEffect(() => () => {
        if (menuCloseTimerRef.current) window.clearTimeout(menuCloseTimerRef.current);
    }, []);

    const updateThreadState = async (thread, action) => {
        if (!thread?._id) return;
        const confirmations = {
            archive: { title: 'Archive this chat?', message: 'It can be viewed from Archived later.' },
            delete: { title: 'Delete this chat?', message: 'You cannot get this deleted chat back. Do you want to continue?' },
            'block-chat': { title: 'Block this contact in Messages?', message: 'This blocks only the chat, not the user profile.' }
        };
        if (confirmations[action] && !(await confirmAction(confirmations[action]))) return;
        try {
            const response = await fetch(apiUrl(`/api/messages/${thread._id}/state`), {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${localStorage.getItem(isEmployer ? 'employerToken' : 'token') || ''}`
                },
                body: JSON.stringify({ action, ...(isEmployer ? { companyId } : {}) })
            });
            const data = await response.json().catch(() => ({}));
            if (!response.ok) throw new Error(data.error || 'Could not update this chat');
            setThreads((currentThreads) => currentThreads.map((currentThread) => (
                currentThread._id === thread._id ? data : currentThread
            )));
            window.dispatchEvent(new CustomEvent('jumptake-message-thread-updated', {
                detail: { thread: data, action }
            }));
            setOpenThreadMenuId('');
            setMessage(action === 'archive' ? 'Chat archived.' : action === 'delete' ? 'Chat deleted.' : action === 'block-chat' ? 'Contact blocked in Messages.' : 'Chat updated.');
            if (['archive', 'delete', 'block-chat'].includes(action)) {
                setSelectedThreadId('');
                setActiveTab(action === 'archive' ? 'archived' : action === 'block-chat' ? 'blocked' : 'new');
            }
            await fetchThreads(true);
            if (['archive', 'delete', 'block-chat'].includes(action)) {
                setSelectedThreadId('');
                setPendingContact(null);
            } else if (action === 'unarchive' || action === 'unblock-chat') {
                setActiveTab('new');
                setSelectedThreadId(data._id);
            }
        } catch (stateError) {
            setError(stateError.message || 'Could not update this chat.');
        }
    };

    const openTaggedPostComposer = (thread) => {
        const candidate = getThreadProfile(thread);
        const participant = (thread?.participantUsers || []).find((item) => (
            String(item?._id || item) !== String(userId || '')
        ));
        if (isEmployer || typeof window === 'undefined') return;
        const tag = {
            userId: String(candidate?.user?._id || candidate?.user || participant?._id || participant || ''),
            candidateId: String(candidate?._id || ''),
            name: candidate?.name || getThreadTitle(thread) || 'Candidate',
            jumptakeId: candidate?.jumptakeId || participant?.jumptakeId || '',
            profileImage: candidate?.profileImage || getThreadAvatar(thread) || ''
        };
        if (!tag.userId && !tag.candidateId) {
            setError('This conversation does not contain a candidate profile to tag.');
            return;
        }
        storeAndOpenSection('job-feed', 'jumptakeFeedAiDraft', {
            mode: 'candidate', tab: 'create-story', openComposer: true, text: '', taggedUsers: [tag]
        }, 'jumptake-feed-ai-draft');
        setOpenThreadMenuId('');
        handleClose();
    };

    const renderThreadMenu = (thread) => {
        if (!thread) return null;
        const isOpen = openThreadMenuId === thread._id;
        const isClosing = closingThreadMenuId === thread._id;
        const canTagCandidate = !isEmployer && isDirectCandidateThread(thread);
        const canViewProfile = canOpenThreadProfile(thread);
        return (
            <div className={`message-thread-options ${isOpen ? 'is-open' : ''} ${isClosing ? 'is-closing' : ''}`}>
                <button type="button" className="message-thread-options-trigger" onClick={(event) => {
                    event.stopPropagation();
                    toggleThreadMenu(thread._id);
                }} aria-expanded={isOpen} aria-label="Conversation options"><span aria-hidden="true">...</span></button>
                {(isOpen || isClosing) && (
                    <div className={`message-thread-options-menu ${isClosing ? 'is-closing' : 'is-opening'}`} role="menu" onClick={(event) => event.stopPropagation()}>
                        {canTagCandidate && <button type="button" onClick={() => openTaggedPostComposer(thread)}>Tag to post</button>}
                        {canViewProfile && <button type="button" onClick={() => { openThreadProfile(thread); setOpenThreadMenuId(''); }}>View profile</button>}
                        <button type="button" onClick={() => updateThreadState(thread, thread.viewerState?.archived ? 'unarchive' : 'archive')}>{thread.viewerState?.archived ? 'Move to New Messages' : 'Archive chat'}</button>
                        <button type="button" onClick={() => updateThreadState(thread, 'delete')}>Delete chat</button>
                        <button type="button" onClick={() => updateThreadState(thread, thread.viewerState?.chatBlocked ? 'unblock-chat' : 'block-chat')}>{thread.viewerState?.chatBlocked ? 'Unblock to chat' : 'Block contact'}</button>
                    </div>
                )}
            </div>
        );
    };

    const handleBackToThreadList = () => {
        if (assistantSelected && assistantDirectOpenRef.current) {
            handleClose();
            return;
        }

        setSelectedThreadId('');
        setPendingContact(null);
        setReplyHtml('');
        setMessage('');
        setError('');
        assistantDirectOpenRef.current = false;
    };

    const sendReply = async () => {
        if ((!selectedThread && !pendingContact) || !hasMessageContent(replyHtml)) {
            setMessage('Write a message before sending.');
            return;
        }

        setSending(true);
        setError('');
        setMessage('');

        try {
            const token = localStorage.getItem(isEmployer ? 'employerToken' : 'token');
            const response = pendingContact
                ? await fetch(apiUrl('/api/messages/candidate-direct'), {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${token}`
                    },
                    body: JSON.stringify({
                        senderUserId: userId,
                        recipientCandidateId: pendingContact.candidateId || undefined,
                        recipientUserId: pendingContact.userId || undefined,
                        bodyHtml: replyHtml
                    })
                })
                : await fetch(apiUrl(`/api/messages/${selectedThread._id}/reply`), {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${token}`
                    },
                    body: JSON.stringify({
                        senderType: isEmployer ? 'employer' : 'candidate',
                        senderUserId: !isEmployer ? userId : undefined,
                        bodyHtml: replyHtml
                    })
                });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to send message');
            }

            setReplyHtml('');
            setPendingContact(null);
            setMessage('Message sent.');
            setThreads((currentThreads) => (
                currentThreads.some((thread) => thread._id === data._id)
                    ? currentThreads.map((thread) => (thread._id === data._id ? data : thread))
                    : [data, ...currentThreads]
            ));
            setSelectedThreadId(data._id || '');
            await fetchThreads(true);
        } catch (replyError) {
            console.error('Error sending message:', replyError);
            setError(replyError.message || 'Failed to send message.');
        } finally {
            setSending(false);
        }
    };

    const lastMessagePreview = (thread) => thread?.messages?.[thread.messages.length - 1]?.bodyText || 'No messages yet';
    const visibleThreads = threads.filter((thread) => {
        const state = thread.viewerState || {};
        if (state.deleted) return false;
        if (activeTab === 'archived') return state.archived && !state.chatBlocked;
        if (activeTab === 'requests') return state.isRequest && !state.archived && !state.chatBlocked;
        if (activeTab === 'blocked') return state.chatBlocked;
        return !state.archived && !state.isRequest && !state.chatBlocked;
    });
    const tabCounts = threads.reduce((counts, thread) => {
        const state = thread.viewerState || {};
        if (state.deleted) return counts;
        if (state.chatBlocked) counts.blocked += 1;
        else if (state.archived) counts.archived += 1;
        else if (state.isRequest) counts.requests += 1;
        else counts.new += 1;
        return counts;
    }, { new: 0, archived: 0, requests: 0, blocked: 0 });
    const mobileChatOpen = isMobileView && (Boolean(selectedThread) || Boolean(pendingContact) || assistantSelected);

    const findRequestedJob = (query = '') => {
        const safeJobs = Array.isArray(jobs) ? jobs : [];
        if (!safeJobs.length) {
            return null;
        }

        const normalizedQuery = normalizeSearchText(query);
        if (!normalizedQuery) {
            return null;
        }

        return safeJobs.find((job) => {
            const haystack = normalizeSearchText([
                job?._id,
                job?.id,
                job?.jobNumber,
                job?.title,
                job?.role,
                job?.company?.name,
                job?.companyName,
                job?.location
            ].filter(Boolean).join(' '));
            return haystack.includes(normalizedQuery) || normalizedQuery.includes(normalizeSearchText(job?.title));
        }) || null;
    };

    const storeAndOpenSection = (section, storageKey, payload, eventName) => {
        if (typeof window === 'undefined') {
            return;
        }

        if (storageKey && payload) {
            sessionStorage.setItem(storageKey, JSON.stringify(payload));
        }

        window.dispatchEvent(new CustomEvent('jumptake-ai-open-section', {
            detail: { mode, section }
        }));

        if (eventName) {
            window.dispatchEvent(new CustomEvent(eventName, { detail: payload }));
            window.setTimeout(() => {
                window.dispatchEvent(new CustomEvent(eventName, { detail: payload }));
            }, 180);
        }
    };

    const minimizeAfterMobileAssistantAction = () => {
        if (!isMobileViewRef.current || typeof window === 'undefined') {
            return;
        }

        window.setTimeout(() => {
            handleClose();
        }, 450);
    };

    const handleAssistantAction = (action, payload = {}) => {
        const answer = String(payload.answer || '').trim();
        const question = String(payload.question || '').trim();
        const localAction = detectLocalAssistantAction(question, payload.context || {});
        const actionName = String(localAction || action || '');
        const cleanedDraft = cleanAssistantDraftText(answer || question) || answer || question;
        const localDraft = isWeakAssistantActionDraft(cleanedDraft)
            ? buildLocalActionDraft(actionName, payload.context || {}, question)
            : '';
        const draftText = localDraft || cleanedDraft;

        if (actionName.startsWith('open-section:')) {
            const section = actionName.split(':')[1];
            if (section === 'create-story' && !isEmployer) {
                storeAndOpenSection('job-feed', 'jumptakeFeedAiDraft', {
                    mode: 'candidate',
                    tab: 'talent-stories',
                    openComposer: true,
                    text: draftText
                }, 'jumptake-feed-ai-draft');
                minimizeAfterMobileAssistantAction();
                return;
            }
            if (section) {
                storeAndOpenSection(section);
                minimizeAfterMobileAssistantAction();
            }
            return;
        }

        if (actionName === 'candidate-create-resume' && !isEmployer) {
            storeAndOpenSection('resume-playground', 'jumptakeResumePlaygroundAiDraft', {
                mode: 'resume',
                name: 'AI Generated Resume',
                text: draftText,
                source: 'ai-tailor',
                style: 'professional'
            }, 'jumptake-resume-playground-ai-draft');
            minimizeAfterMobileAssistantAction();
            return;
        }

        if (actionName === 'candidate-format-resume' && !isEmployer) {
            storeAndOpenSection('resume-playground', 'jumptakeResumePlaygroundAiDraft', {
                mode: 'resume',
                name: 'AI Formatted Resume',
                text: draftText,
                source: 'ai-tailor',
                style: 'professional'
            }, 'jumptake-resume-playground-ai-draft');
            minimizeAfterMobileAssistantAction();
            return;
        }

        if ((actionName === 'candidate-create-document' || actionName === 'candidate-format-document') && !isEmployer) {
            storeAndOpenSection('resume-playground', 'jumptakeResumePlaygroundAiDraft', {
                mode: 'document',
                name: actionName === 'candidate-format-document' ? 'AI Formatted Document' : 'AI Generated Document',
                text: draftText,
                source: 'ai-tailor',
                style: 'professional'
            }, 'jumptake-resume-playground-ai-draft');
            minimizeAfterMobileAssistantAction();
            return;
        }

        if (actionName === 'employer-create-document' && isEmployer) {
            storeAndOpenSection('create-document', 'jumptakeResumePlaygroundAiDraft', {
                mode: 'document',
                name: 'AI Generated Document',
                text: draftText,
                source: 'ai-tailor',
                style: 'business'
            }, 'jumptake-resume-playground-ai-draft');
            minimizeAfterMobileAssistantAction();
            return;
        }

        if (actionName === 'employer-format-document' && isEmployer) {
            storeAndOpenSection('create-document', 'jumptakeResumePlaygroundAiDraft', {
                mode: 'document',
                name: 'AI Formatted Document',
                text: draftText,
                source: 'ai-tailor',
                style: 'business'
            }, 'jumptake-resume-playground-ai-draft');
            minimizeAfterMobileAssistantAction();
            return;
        }

        if (actionName === 'candidate-create-story' && !isEmployer) {
            storeAndOpenSection('job-feed', 'jumptakeFeedAiDraft', {
                mode: 'candidate',
                tab: 'talent-stories',
                openComposer: true,
                text: draftText
            }, 'jumptake-feed-ai-draft');
            minimizeAfterMobileAssistantAction();
            return;
        }

        if (actionName === 'employer-create-post' && isEmployer) {
            storeAndOpenSection('home-feed', 'jumptakeFeedAiDraft', {
                mode: 'employer',
                tab: 'create-post',
                text: draftText
            }, 'jumptake-feed-ai-draft');
            minimizeAfterMobileAssistantAction();
            return;
        }

        if (actionName === 'employer-create-assessment' && isEmployer) {
            storeAndOpenSection('make-assessment', 'jumptakeAssessmentAiDraft', {
                mode: 'employer',
                text: draftText
            }, 'jumptake-assessment-ai-draft');
            minimizeAfterMobileAssistantAction();
            return;
        }

        if (actionName === 'candidate-apply-job' && !isEmployer) {
            const matchedJob = findRequestedJob(question) || findRequestedJob(answer);
            if (!matchedJob) {
                return;
            }

            const jobId = matchedJob?._id || matchedJob?.id || matchedJob?.jobNumber;
            const request = {
                mode: 'candidate',
                tab: 'job-posts',
                jobId,
                action: 'apply'
            };
            storeAndOpenSection('job-feed', 'jumptakeHomeFeedRequest', request, 'jumptake-home-feed-request');
            minimizeAfterMobileAssistantAction();
        }
    };

    const messengerMarkup = (
        <div className={`floating-messenger ${open ? 'is-open' : ''} is-trigger-${triggerTone}`}>
            {open && (
                <>
                    <div className="floating-messenger-backdrop" onClick={handleClose} aria-hidden="true" />
                    <div
                        className={`floating-messenger-panel ${isMobileView ? 'is-mobile' : ''} ${mobileChatOpen ? 'is-mobile-chat-open' : 'is-mobile-thread-list'}`}
                        role="dialog"
                        aria-modal="true"
                        aria-label="Messages"
                    >
                    <div className={`floating-messenger-shell ${mobileChatOpen ? 'is-mobile-chat-open' : ''}`}>
                        <aside className="floating-messenger-contacts">
                            <div className="floating-messenger-header">
                                {!isMobileView && (
                                    <button
                                        type="button"
                                        className="floating-messenger-close"
                                        onClick={handleClose}
                                        aria-label="Close messages"
                                    >
                                        <CloseIcon />
                                    </button>
                                )}
                                <h2><span className="floating-messenger-title-pill">Messages</span></h2>
                            </div>

                            <MessageWorkspaceNav
                                activeTab={activeTab}
                                onChange={(tab) => {
                                    setActiveTab(tab);
                                    setSelectedThreadId('');
                                    setPendingContact(null);
                                    setOpenThreadMenuId('');
                                    setClosingThreadMenuId('');
                                }}
                                counts={tabCounts}
                                compact
                            />

                            <div className="floating-messenger-contact-body">
                            <div className="floating-messenger-contact-list">
                                {activeTab === 'new' && <button
                                    type="button"
                                    className={`floating-messenger-contact portal-ai-floating-contact ${assistantSelected ? 'is-active' : ''}`}
                                    onClick={() => handleSelectThread(ASSISTANT_THREAD_ID)}
                                >
                                    <ChatAvatar ai className="floating-messenger-contact-avatar" label="JumpTake AI" />
                                    <div className="floating-messenger-contact-copy">
                                        <strong>JumpTake AI</strong>
                                        <span>Ask for help with jobs, resumes, hiring, and portal actions.</span>
                                    </div>
                                </button>}
                                {activeTab === 'compose' && !isEmployer ? (
                                    <NewMessageFinder userId={userId} onSelectContact={(contact) => {
                                        setPendingContact(contact);
                                        setSelectedThreadId('');
                                        setReplyHtml('');
                                    }} />
                                ) : activeTab === 'compose' ? (
                                    <div className="floating-messenger-empty"><p>Choose an existing candidate conversation to send a message.</p></div>
                                ) : activeTab === 'settings' ? (
                                    <MessageSettings mode={mode} companyId={companyId} />
                                ) : loading ? (
                                    <div className="floating-messenger-empty">
                                        <p>Loading messages...</p>
                                    </div>
                                ) : visibleThreads.length === 0 ? (
                                    <div className="floating-messenger-empty message-workspace-empty-state">
                                        <div className="empty-state-image" aria-hidden="true">
                                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                                                <path d="M4 5h16l2 10v4H2v-4L4 5Z" />
                                                <path d="M2 15h6l1.5 2h5L16 15h6" />
                                                <path d="M9 9h6" />
                                            </svg>
                                        </div>
                                        <h3>No {activeTab === 'new' ? 'messages' : activeTab === 'blocked' ? 'blocked contacts' : activeTab} here</h3>
                                    </div>
                                ) : (
                                    <>
                                    {visibleThreads.map((thread) => (
                                        <div
                                            key={thread._id}
                                            role="button"
                                            tabIndex={0}
                                            className={`floating-messenger-contact ${thread._id === selectedThreadId ? 'is-active' : ''}`}
                                            onClick={() => handleSelectThread(thread._id)}
                                            onKeyDown={(event) => { if (event.key === 'Enter') handleSelectThread(thread._id); }}
                                        >
                                            <button
                                                type="button"
                                                className="message-list-avatar-button"
                                                disabled={!canOpenThreadProfile(thread)}
                                                aria-label={`View ${getThreadTitle(thread)} profile`}
                                                onClick={(event) => {
                                                    event.stopPropagation();
                                                    openThreadProfile(thread);
                                                }}
                                            >
                                                <ChatAvatar imageSrc={getThreadAvatar(thread)} className="floating-messenger-contact-avatar" label={getThreadTitle(thread)} />
                                            </button>
                                            <div className="floating-messenger-contact-copy">
                                                <strong>{getThreadTitle(thread)}</strong>
                                                <span>{lastMessagePreview(thread)}</span>
                                            </div>
                                            <time>{formatDateTime(thread.lastMessageAt)}</time>
                                            {renderThreadMenu(thread)}
                                        </div>
                                    ))}
                                    </>
                                )}
                            </div>
                            {isMobileView && !mobileChatOpen && (
                                <button
                                    type="button"
                                    className="floating-messenger-list-bottom-back"
                                    onClick={handleClose}
                                    aria-label="Back to previous page"
                                >
                                    {'<'}
                                </button>
                            )}
                            </div>
                        </aside>

                        <section className="floating-messenger-chat">
                            {assistantSelected ? (
                                <>
                                    <div className="floating-messenger-chat-bar">
                                        <div className="floating-messenger-chat-head">
                                            <ChatAvatar ai className="floating-messenger-chat-avatar" label="JumpTake AI" />
                                            <div className="floating-messenger-chat-copy">
                                                <strong>JumpTake AI</strong>
                                                <span>Assistant chat</span>
                                            </div>
                                        </div>
                                        {isMobileView ? (
                                            <div className="floating-messenger-chat-actions">
                                                <button
                                                    type="button"
                                                    className="floating-messenger-mobile-back"
                                                    onClick={handleBackToThreadList}
                                                    aria-label="Back to message list"
                                                >
                                                    {'<'}
                                                </button>
                                            </div>
                                        ) : null}
                                    </div>
                                    <AssistantChat
                                        title="JumpTake AI"
                                        className="floating-messenger-assistant-chat"
                                        storageKey={assistantStorageKey}
                                        context={getAssistantContext}
                                        onAction={handleAssistantAction}
                                    />
                                </>
                            ) : (selectedThread || pendingContact) ? (
                                <>
                                    <div className="floating-messenger-chat-bar">
                                        <div className="floating-messenger-chat-head">
                                            <button
                                                type="button"
                                                className="message-profile-avatar-button"
                                                onClick={() => selectedThread && openThreadProfile(selectedThread)}
                                                disabled={!canOpenThreadProfile(selectedThread)}
                                                aria-label="View contact profile"
                                            >
                                                <ChatAvatar
                                                    imageSrc={selectedThread ? getThreadAvatar(selectedThread) : (pendingContact.avatar || '')}
                                                    className="floating-messenger-chat-avatar"
                                                    label={selectedThread ? getThreadTitle(selectedThread) : (pendingContact.name || 'Candidate')}
                                                />
                                            </button>
                                            <div className="floating-messenger-chat-copy">
                                                <strong>{selectedThread ? getThreadTitle(selectedThread) : (pendingContact.name || 'Candidate')}</strong>
                                                <span>{getThreadPresence(selectedThread)}</span>
                                            </div>
                                        </div>
                                        <div className="floating-messenger-chat-actions">
                                            {renderThreadMenu(selectedThread)}
                                            {isMobileView ? (
                                                <button
                                                    type="button"
                                                    className="floating-messenger-mobile-back"
                                                    onClick={handleBackToThreadList}
                                                    aria-label="Back to message list"
                                                >
                                                    {'<'}
                                                </button>
                                            ) : null}
                                        </div>
                                    </div>

                                    {message && <div className={`notification-message ${message.includes('Error') ? 'error' : 'success'}`}>{message}</div>}
                                    {error && <div className="error-message">{error}</div>}

                                    <div ref={messagesRef} className="floating-messenger-messages">
                                        {pendingContact && !selectedThread && (
                                            <div className="floating-messenger-empty">
                                                <p>Start a message with {pendingContact.name || 'this user'}.</p>
                                            </div>
                                        )}
                                        {(selectedThread?.messages || []).map((item) => (
                                            <div
                                                key={item._id}
                                                className={`floating-messenger-message ${isOwnMessage(selectedThread, item) ? 'is-own' : ''}`}
                                            >
                                                <strong className="floating-messenger-message-sender">
                                                    {getMessageSenderLabel(selectedThread, item)}
                                                </strong>
                                                <div className="floating-messenger-message-body" dangerouslySetInnerHTML={{ __html: item.bodyHtml }} />
                                                <div className="floating-messenger-message-meta">
                                                    <span>{formatDateTime(item.createdAt)}</span>
                                                    {isOwnMessage(selectedThread, item) && item.readReceipt ? <span className="message-read-receipt">Read</span> : null}
                                                </div>
                                            </div>
                                        ))}
                                    </div>

                                    {selectedThread?.viewerState?.chatBlocked ? (
                                        <button type="button" className="message-unblock-chat-button" onClick={() => updateThreadState(selectedThread, 'unblock-chat')}>Unblock to chat</button>
                                    ) : <div className="floating-messenger-input">
                                        <RichMessageEditor
                                            value={replyHtml}
                                            onChange={setReplyHtml}
                                            placeholder="Type your message here!"
                                            messageBox
                                            showToolbar={false}
                                            onSubmit={sendReply}
                                            submitting={sending}
                                            submitLabel={sending ? 'Sending...' : 'Send'}
                                        />
                                    </div>}
                                </>
                            ) : (
                                <div className="floating-messenger-empty floating-messenger-chat-empty">
                                    <p>Select a conversation to start messaging.</p>
                                </div>
                            )}
                        </section>
                    </div>
                    {selectedProfile && (
                        <TalentPool
                            mode="candidate"
                            currentUserId={userId}
                            initialSelectedCandidate={selectedProfile}
                            profileOnly
                            onProfileClose={() => setSelectedProfile(null)}
                        />
                    )}
                    {selectedCompanyProfile && (
                        <MessageCompanyProfileModal
                            company={selectedCompanyProfile}
                            onClose={() => setSelectedCompanyProfile(null)}
                        />
                    )}
                    </div>
                </>
            )}

            {!open && (
                <button
                    type="button"
                    className="floating-messenger-trigger"
                    ref={triggerRef}
                    onClick={handleOpen}
                    aria-label="Open messages"
                >
                    <svg
                        strokeLinejoin="round"
                        strokeLinecap="round"
                        stroke="currentColor"
                        strokeWidth="2"
                        viewBox="0 0 24 24"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                    >
                        <path fill="none" d="M0 0h24v24H0z" stroke="none"></path>
                        <path d="M8 9h8"></path>
                        <path d="M8 13h6"></path>
                        <path d="M18 4a3 3 0 0 1 3 3v8a3 3 0 0 1 -3 3h-5l-5 3v-3h-2a3 3 0 0 1 -3 -3v-8a3 3 0 0 1 3 -3h12z"></path>
                    </svg>
                    {unreadCount > 0 ? <span className="floating-messenger-badge">{unreadCount}</span> : null}
                </button>
            )}
        </div>
    );

    return open && typeof document !== 'undefined'
        ? createPortal(messengerMarkup, document.body)
        : messengerMarkup;
};

export default FloatingMessenger;
