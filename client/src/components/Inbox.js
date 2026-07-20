import React, { useEffect, useMemo, useRef, useState } from 'react';
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
import PortalPageSkeleton from './PortalPageSkeleton';

const stripHtml = (html = '') => html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
const hasMessageContent = (html = '') => stripHtml(html).length > 0 || /<img\b/i.test(html);
const PENDING_INBOX_CONTACT_KEY = 'jumptakePendingInboxContact';
const MESSAGE_MENU_ANIMATION_MS = 180;

const formatDateTime = (dateString) => {
    if (!dateString) {
        return '';
    }

    return new Date(dateString).toLocaleString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
};

const Inbox = ({ mode, companyId, userId, onBack, onFooterBack }) => {
    const [threads, setThreads] = useState([]);
    const [selectedThread, setSelectedThread] = useState(null);
    const [pendingContact, setPendingContact] = useState(null);
    const [replyHtml, setReplyHtml] = useState('');
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);
    const [error, setError] = useState('');
    const [message, setMessage] = useState('');
    const [showAssistant, setShowAssistant] = useState(false);
    const [activeTab, setActiveTab] = useState('new');
    const [openThreadMenuId, setOpenThreadMenuId] = useState('');
    const [closingThreadMenuId, setClosingThreadMenuId] = useState('');
    const [selectedProfile, setSelectedProfile] = useState(null);
    const [selectedCompanyProfile, setSelectedCompanyProfile] = useState(null);
    const menuCloseTimerRef = useRef(null);

    const isEmployer = mode === 'employer';

    const readPendingInboxContact = () => {
        if (typeof window === 'undefined' || isEmployer) {
            return null;
        }

        try {
            const parsed = JSON.parse(sessionStorage.getItem(PENDING_INBOX_CONTACT_KEY) || 'null');
            sessionStorage.removeItem(PENDING_INBOX_CONTACT_KEY);
            return parsed && typeof parsed === 'object' ? parsed : null;
        } catch (error) {
            sessionStorage.removeItem(PENDING_INBOX_CONTACT_KEY);
            return null;
        }
    };

    useEffect(() => {
        fetchThreads();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [mode, companyId, userId]);

    useEffect(() => {
        if (!message && !error) return undefined;
        const timer = window.setTimeout(() => {
            setMessage('');
            setError('');
        }, 2000);
        return () => window.clearTimeout(timer);
    }, [error, message]);

    useEffect(() => {
        const handleThreadUpdated = (event) => {
            const updatedThread = event.detail?.thread;
            const action = event.detail?.action;
            if (!updatedThread?._id) return;
            setThreads((currentThreads) => currentThreads.map((thread) => (
                thread._id === updatedThread._id ? updatedThread : thread
            )));
            setSelectedThread((currentThread) => {
                if (currentThread?._id !== updatedThread._id) return currentThread;
                return ['archive', 'delete', 'block-chat'].includes(action) ? null : updatedThread;
            });
        };
        window.addEventListener('jumptake-message-thread-updated', handleThreadUpdated);
        return () => window.removeEventListener('jumptake-message-thread-updated', handleThreadUpdated);
    }, []);

    const fetchThreads = async () => {
        const endpoint = isEmployer
            ? `/api/messages/company/${companyId}`
            : `/api/messages/user/${userId}`;

        if ((isEmployer && !companyId) || (!isEmployer && !userId)) {
            setThreads([]);
            setLoading(false);
            return;
        }

        setLoading(true);
        setError('');

        try {
            const token = localStorage.getItem(isEmployer ? 'employerToken' : 'token');
            const response = await fetch(apiUrl(endpoint), {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) {
                throw new Error('Failed to load inbox');
            }

            const data = await response.json();
            const nextThreads = Array.isArray(data) ? data : [];
            setThreads(nextThreads);

            const nextPendingContact = readPendingInboxContact();
            if (nextPendingContact?.userId || nextPendingContact?.candidateId) {
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
                        (nextPendingContact.candidateId && candidateIds.includes(String(nextPendingContact.candidateId)))
                        || (nextPendingContact.userId && userIds.includes(String(nextPendingContact.userId)))
                    );
                });

                setSelectedThread(existingThread || null);
                setPendingContact(existingThread ? null : nextPendingContact);
                return;
            }

            if (selectedThread) {
                const refreshedThread = data.find((thread) => thread._id === selectedThread._id);
                setSelectedThread(refreshedThread || null);
            }
        } catch (fetchError) {
            console.error('Error loading inbox:', fetchError);
            setError(fetchError.message || 'Failed to load inbox.');
        } finally {
            setLoading(false);
        }
    };

    const sendReply = async () => {
        if ((!selectedThread && !pendingContact) || !hasMessageContent(replyHtml)) {
            setMessage('Write a reply before sending.');
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
                        'Authorization': `Bearer ${token}`
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
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    senderType: isEmployer ? 'employer' : 'candidate',
                    senderUserId: !isEmployer ? userId : undefined,
                    bodyHtml: replyHtml
                })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to send reply');
            }

            setReplyHtml('');
            setPendingContact(null);
            setSelectedThread(data);
            setMessage('Reply sent.');
            await fetchThreads();
        } catch (replyError) {
            console.error('Error sending reply:', replyError);
            setError(replyError.message || 'Failed to send reply.');
        } finally {
            setSending(false);
        }
    };

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

    const getThreadSubtitle = (thread) => {
        if (isEmployer) {
            return thread?.candidateUser?.email || thread?.candidate?.email || 'Email not available';
        }

        if (isDirectCandidateThread(thread)) {
            return 'Candidate connection';
        }

        return thread?.company?.industry || 'Employer message';
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

    const isThreadActive = (thread) => {
        if (!thread?.lastMessageAt) {
            return false;
        }

        const lastMessageTime = new Date(thread.lastMessageAt).getTime();
        return Number.isFinite(lastMessageTime) && Date.now() - lastMessageTime < 1000 * 60 * 60 * 24;
    };

    const isOwnMessage = (thread, item) => {
        if (isDirectCandidateThread(thread)) {
            return String(item?.senderUser || '') === String(userId || '');
        }

        return item.senderType === (isEmployer ? 'employer' : 'candidate');
    };

    const getMessageSenderLabel = (thread, item) => {
        if (isOwnMessage(thread, item)) {
            return 'You';
        }

        if (isDirectCandidateThread(thread)) {
            return getThreadTitle(thread);
        }

        return item.senderType === 'employer' ? 'Employer' : 'Candidate';
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
            archive: {
                title: 'Archive this chat?',
                message: 'The chat will move to Archived and can be viewed there later.'
            },
            delete: {
                title: 'Delete this chat?',
                message: 'You cannot get this deleted chat back. Do you want to continue?'
            },
            'block-chat': {
                title: 'Block this contact in Messages?',
                message: 'This only blocks the chat. It does not block the user profile elsewhere in JumpTake.'
            }
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
            setMessage(
                action === 'archive' ? 'Chat archived.'
                    : action === 'delete' ? 'Chat deleted.'
                        : action === 'block-chat' ? 'Contact blocked in Messages.'
                            : action === 'unblock-chat' ? 'Contact unblocked in Messages.'
                                : 'Chat restored.'
            );
            if (action === 'delete' || action === 'archive' || action === 'block-chat') {
                setSelectedThread(null);
                setPendingContact(null);
                setActiveTab(action === 'archive' ? 'archived' : action === 'block-chat' ? 'blocked' : 'new');
            } else {
                if (action === 'unarchive' || action === 'unblock-chat') {
                    setActiveTab('new');
                }
                setSelectedThread((currentThread) => (
                    currentThread?._id === thread._id ? data : currentThread
                ));
            }
            await fetchThreads();
            if (action === 'delete' || action === 'archive' || action === 'block-chat') {
                setSelectedThread(null);
                setPendingContact(null);
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
        if (typeof window === 'undefined') return;
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
        const payload = { mode: 'candidate', tab: 'create-story', openComposer: true, text: '', taggedUsers: [tag] };
        sessionStorage.setItem('jumptakeFeedAiDraft', JSON.stringify(payload));
        window.dispatchEvent(new CustomEvent('jumptake-ai-open-section', { detail: { mode: 'candidate', section: 'job-feed' } }));
        window.setTimeout(() => window.dispatchEvent(new CustomEvent('jumptake-feed-ai-draft', { detail: payload })), 180);
        setOpenThreadMenuId('');
    };

    const renderThreadMenu = (thread) => {
        if (!thread) return null;
        const menuOpen = openThreadMenuId === thread._id;
        const menuClosing = closingThreadMenuId === thread._id;
        const canTagCandidate = !isEmployer && isDirectCandidateThread(thread);
        const canViewProfile = canOpenThreadProfile(thread);
        return (
            <div className={`message-thread-options ${menuOpen ? 'is-open' : ''} ${menuClosing ? 'is-closing' : ''}`}>
                <button type="button" className="message-thread-options-trigger" onClick={(event) => {
                    event.stopPropagation();
                    toggleThreadMenu(thread._id);
                }} aria-expanded={menuOpen} aria-label="Conversation options"><span aria-hidden="true">...</span></button>
                {(menuOpen || menuClosing) && (
                    <div className={`message-thread-options-menu ${menuClosing ? 'is-closing' : 'is-opening'}`} role="menu" onClick={(event) => event.stopPropagation()}>
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

    const visibleThreads = useMemo(() => threads.filter((thread) => {
        const state = thread.viewerState || {};
        if (state.deleted) return false;
        if (activeTab === 'archived') return state.archived && !state.chatBlocked;
        if (activeTab === 'requests') return state.isRequest && !state.archived && !state.chatBlocked;
        if (activeTab === 'blocked') return state.chatBlocked;
        return !state.archived && !state.isRequest && !state.chatBlocked;
    }), [activeTab, threads]);

    const tabCounts = useMemo(() => threads.reduce((counts, thread) => {
        const state = thread.viewerState || {};
        if (state.deleted) return counts;
        if (state.chatBlocked) counts.blocked += 1;
        else if (state.archived) counts.archived += 1;
        else if (state.isRequest) counts.requests += 1;
        else counts.new += 1;
        return counts;
    }, { new: 0, archived: 0, requests: 0, blocked: 0 }), [threads]);

    if (selectedProfile) {
        return (
            <TalentPool
                mode="candidate"
                currentUserId={userId}
                initialSelectedCandidate={selectedProfile}
                profileOnly
                onProfileClose={() => setSelectedProfile(null)}
            />
        );
    }

    if (selectedCompanyProfile) {
        return (
            <MessageCompanyProfileModal
                company={selectedCompanyProfile}
                onClose={() => setSelectedCompanyProfile(null)}
            />
        );
    }

    if (showAssistant) {
        return (
            <div className="inbox-container messenger-inbox portal-inbox-ai">
                <div className="messenger-chat-header">
                    <button className="back-button messenger-back" onClick={() => setShowAssistant(false)}>
                        Back to Inbox
                    </button>
                    <div className="messenger-chat-head">
                        <ChatAvatar ai className="messenger-avatar" label="JumpTake AI" />
                        <div>
                            <h2>JumpTake AI</h2>
                            <p>Assistant chat</p>
                        </div>
                    </div>
                </div>
                <AssistantChat title="JumpTake AI" className="portal-inbox-assistant" />
            </div>
        );
    }

    if (selectedThread || pendingContact) {
        const chatTitle = selectedThread ? getThreadTitle(selectedThread) : (pendingContact.name || 'Candidate');
        const chatSubtitle = getThreadPresence(selectedThread);
        const chatAvatar = selectedThread ? getThreadAvatar(selectedThread) : (pendingContact.avatar || '');
        const chatMessages = selectedThread ? (selectedThread.messages || []) : [];

        return (
            <div className="inbox-container messenger-inbox">
                <div className="messenger-chat-header">
                    <button className="back-button messenger-back" onClick={() => {
                        setSelectedThread(null);
                        setPendingContact(null);
                    }}>
                        Back to Chats
                    </button>
                    <div className="messenger-chat-head">
                        <button type="button" className="message-profile-avatar-button" onClick={() => selectedThread && openThreadProfile(selectedThread)} disabled={!canOpenThreadProfile(selectedThread)} aria-label={`View ${chatTitle} profile`}>
                            <ChatAvatar imageSrc={chatAvatar} className="messenger-avatar" label={chatTitle} />
                        </button>
                        <div>
                            <h2>{chatTitle}</h2>
                            <p>{chatSubtitle}</p>
                        </div>
                    </div>
                    {renderThreadMenu(selectedThread)}
                </div>

                {message && <div className={`notification-message ${message.includes('Error') ? 'error' : 'success'}`}>{message}</div>}
                {error && <div className="error-message">{error}</div>}

                <div className="message-thread messenger-thread">
                    {chatMessages.length === 0 && pendingContact && (
                        <div className="no-jobs-message">
                            <p>Start a message with {chatTitle}.</p>
                        </div>
                    )}
                    {chatMessages.map((item) => (
                        <div
                            key={item._id}
                            className={`message-bubble ${isOwnMessage(selectedThread, item) ? 'sent' : 'received'}`}
                        >
                            <div className="message-meta">
                                <strong>{getMessageSenderLabel(selectedThread, item)}</strong>
                                <span>{formatDateTime(item.createdAt)}</span>
                                {isOwnMessage(selectedThread, item) && item.readReceipt ? <span className="message-read-receipt">Read</span> : null}
                            </div>
                            <div className="message-body" dangerouslySetInnerHTML={{ __html: item.bodyHtml }} />
                        </div>
                    ))}
                </div>

                {selectedThread?.viewerState?.chatBlocked ? (
                    <button type="button" className="message-unblock-chat-button" onClick={() => updateThreadState(selectedThread, 'unblock-chat')}>Unblock to chat</button>
                ) : <div className="message-compose-card messenger-compose-card">
                    <RichMessageEditor
                        value={replyHtml}
                        onChange={setReplyHtml}
                        placeholder="Write a reply..."
                        messageBox
                        showToolbar={false}
                        onSubmit={sendReply}
                        submitting={sending}
                        submitLabel={sending ? 'Sending...' : 'Send'}
                    />
                </div>}

                <div className="section-footer-nav mobile-subpage-return">
                    <button className="back-button responsive-back-button mobile-bottom-back-button" onClick={() => {
                        setSelectedThread(null);
                        setPendingContact(null);
                    }}>
                        Back to Inbox
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="inbox-container messenger-inbox">
            <div className="manage-jobs-header">
                <h2><span className="portal-title-jello-text">Messages</span></h2>
            </div>

            <MessageWorkspaceNav activeTab={activeTab} onChange={(tab) => {
                setActiveTab(tab);
                setOpenThreadMenuId('');
                setClosingThreadMenuId('');
            }} counts={tabCounts} />

            {error && <div className="error-message">{error}</div>}
            {message && <div className="notification-message success">{message}</div>}

            {activeTab === 'new' && <button
                type="button"
                className="inbox-thread-card button-message portal-ai-thread-card"
                id="btn-message-ai"
                onClick={() => setShowAssistant(true)}
            >
                <div className="content-avatar">
                    <div className="avatar">
                        <ChatAvatar ai className="user-img" label="JumpTake AI" />
                    </div>
                    <span className="status-user"></span>
                </div>
                <div className="notice-content">
                    <div className="lable-message">
                        <span>Assistant</span>
                    </div>
                    <div className="username">JumpTake AI</div>
                    <div className="user-id">Ask about jobs, resumes, hiring, and portal actions</div>
                    <span className="thread-preview">Start chatting with the JumpTake assistant.</span>
                </div>
            </button>}

            {activeTab === 'compose' ? (
                <NewMessageFinder userId={userId} onSelectContact={(contact) => {
                    setPendingContact(contact);
                    setSelectedThread(null);
                }} />
            ) : null}

            {activeTab === 'settings' ? <MessageSettings mode={mode} companyId={companyId} /> : null}

            {!['compose', 'settings'].includes(activeTab) && (loading ? (
                <PortalPageSkeleton compact label="Loading messages" />
            ) : visibleThreads.length === 0 ? (
                <div className="no-jobs-message">
                    <h3>No {activeTab === 'new' ? 'messages' : activeTab === 'blocked' ? 'blocked contacts' : activeTab} here</h3>
                    <p>{activeTab === 'requests' ? 'Introductory messages from people outside your friends list will appear here.' : activeTab === 'blocked' ? 'Contacts blocked only in Messages will appear here.' : 'Conversations for this section will appear here.'}</p>
                </div>
            ) : (
                <div className="inbox-thread-list messenger-thread-list">
                    {visibleThreads.map((thread) => {
                        const lastMessage = thread.messages?.[thread.messages.length - 1];

                        return (
                            <div
                                className={`inbox-thread-card button-message ${isThreadActive(thread) ? 'is-active' : 'is-offline'}`}
                                id="btn-message"
                                key={thread._id}
                                role="button"
                                tabIndex={0}
                                onClick={() => setSelectedThread(thread)}
                                onKeyDown={(event) => { if (event.key === 'Enter') setSelectedThread(thread); }}
                            >
                                <div className="content-avatar">
                                    <div className="avatar">
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
                                            <ChatAvatar imageSrc={getThreadAvatar(thread)} className="user-img" label={getThreadTitle(thread)} />
                                        </button>
                                    </div>
                                    <span className="status-user"></span>
                                </div>
                                <div className="notice-content">
                                    <div className="lable-message">
                                        <span>Message</span>
                                        {(thread.messages || []).length > 0 && <span className="number-message">{thread.messages.length}</span>}
                                    </div>
                                    <div className="username" title={getThreadTitle(thread)}>{getThreadTitle(thread)}</div>
                                    <div className="user-id" title={getThreadSubtitle(thread)}>{getThreadSubtitle(thread)}</div>
                                    <span className="thread-preview">{lastMessage?.bodyText || 'No message preview'}</span>
                                </div>
                                <time className="thread-time">{formatDateTime(thread.lastMessageAt)}</time>
                                {renderThreadMenu(thread)}
                            </div>
                        );
                    })}
                </div>
            ))}

            <div className="page-footer-actions">
                <button className="back-button" onClick={onFooterBack || onBack}>Back</button>
            </div>
        </div>
    );
};

export default Inbox;
