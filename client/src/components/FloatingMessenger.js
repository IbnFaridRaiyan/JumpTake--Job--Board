import React, { useEffect, useMemo, useRef, useState } from 'react';
import RichMessageEditor from './RichMessageEditor';
import AssistantChat from './AssistantChat';

const stripHtml = (html = '') => html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
const hasMessageContent = (html = '') => stripHtml(html).length > 0 || /<img\b/i.test(html);
const ASSISTANT_THREAD_ID = '__jumptake_ai__';

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
    unreadCount = 0,
    onSeen
}) => {
    const isEmployer = mode === 'employer';
    const [open, setOpen] = useState(false);
    const [threads, setThreads] = useState([]);
    const [selectedThreadId, setSelectedThreadId] = useState('');
    const [replyHtml, setReplyHtml] = useState('');
    const [loading, setLoading] = useState(false);
    const [sending, setSending] = useState(false);
    const [error, setError] = useState('');
    const [message, setMessage] = useState('');
    const [isMobileView, setIsMobileView] = useState(() => (
        typeof window !== 'undefined' ? window.matchMedia('(max-width: 768px)').matches : false
    ));
    const messagesRef = useRef(null);
    const openEventName = isEmployer ? 'jumptake-open-employer-messenger' : 'jumptake-open-candidate-messenger';

    const endpoint = useMemo(() => (
        isEmployer
            ? `/api/messages/company/${companyId}`
            : `/api/messages/user/${userId}`
    ), [isEmployer, companyId, userId]);

    const assistantSelected = selectedThreadId === ASSISTANT_THREAD_ID;
    const selectedThread = assistantSelected ? null : (threads.find((thread) => thread._id === selectedThreadId) || null);

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

    const getInitial = (thread) => (getThreadTitle(thread).charAt(0) || 'M').toUpperCase();

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
            const response = await fetch(`${process.env.REACT_APP_API_URL || ''}${endpoint}`, {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (!response.ok) {
                throw new Error('Failed to load messages');
            }

            const data = await response.json();
            const nextThreads = Array.isArray(data) ? data : [];
            setThreads(nextThreads);

            if (!preserveSelection) {
                setSelectedThreadId(isMobileView ? '' : ASSISTANT_THREAD_ID);
            } else {
                const threadStillExists = nextThreads.some((thread) => thread._id === selectedThreadId);
                if (!threadStillExists && selectedThreadId !== ASSISTANT_THREAD_ID) {
                    setSelectedThreadId(isMobileView ? '' : ASSISTANT_THREAD_ID);
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
        const handleOpenEvent = () => {
            setOpen(true);
            if (isMobileView) {
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
        setOpen(true);
        if (isMobileView) {
            setSelectedThreadId('');
        }
        onSeen?.();
    };

    const handleClose = () => {
        setOpen(false);
        setSelectedThreadId('');
        setReplyHtml('');
        setMessage('');
        setError('');
    };

    const handleSelectThread = (threadId) => {
        setSelectedThreadId(threadId);
        onSeen?.();
    };

    const handleBackToThreadList = () => {
        setSelectedThreadId('');
        setReplyHtml('');
        setMessage('');
        setError('');
    };

    const sendReply = async () => {
        if (!selectedThread || !hasMessageContent(replyHtml)) {
            setMessage('Write a message before sending.');
            return;
        }

        setSending(true);
        setError('');
        setMessage('');

        try {
            const token = localStorage.getItem(isEmployer ? 'employerToken' : 'token');
            const response = await fetch(`${process.env.REACT_APP_API_URL || ''}/api/messages/${selectedThread._id}/reply`, {
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
            setMessage('Message sent.');
            setThreads((currentThreads) => currentThreads.map((thread) => (
                thread._id === data._id ? data : thread
            )));
            await fetchThreads(true);
        } catch (replyError) {
            console.error('Error sending message:', replyError);
            setError(replyError.message || 'Failed to send message.');
        } finally {
            setSending(false);
        }
    };

    const lastMessagePreview = (thread) => thread?.messages?.[thread.messages.length - 1]?.bodyText || 'No messages yet';
    const mobileChatOpen = isMobileView && (Boolean(selectedThread) || assistantSelected);

    return (
        <div className={`floating-messenger ${open ? 'is-open' : ''}`}>
            {open && (
                <div
                    className={`floating-messenger-panel ${isMobileView ? 'is-mobile' : ''} ${mobileChatOpen ? 'is-mobile-chat-open' : 'is-mobile-thread-list'}`}
                    role="dialog"
                    aria-modal="true"
                    aria-label="Messages"
                >
                    <div className={`floating-messenger-shell ${mobileChatOpen ? 'is-mobile-chat-open' : ''}`}>
                        <aside className="floating-messenger-contacts">
                            <div className="floating-messenger-header">
                                <button
                                    type="button"
                                    className="floating-messenger-close"
                                    onClick={handleClose}
                                    aria-label="Close messages"
                                >
                                    x
                                </button>
                                <h2>Messages</h2>
                            </div>

                            <div className="floating-messenger-contact-list">
                                <button
                                    type="button"
                                    className={`floating-messenger-contact portal-ai-floating-contact ${assistantSelected ? 'is-active' : ''}`}
                                    onClick={() => handleSelectThread(ASSISTANT_THREAD_ID)}
                                >
                                    <div className="floating-messenger-contact-avatar">AI</div>
                                    <div className="floating-messenger-contact-copy">
                                        <strong>JumpTake AI</strong>
                                        <span>Ask for help with jobs, resumes, hiring, and portal actions.</span>
                                    </div>
                                </button>
                                {loading ? (
                                    <div className="floating-messenger-empty">
                                        <p>Loading messages...</p>
                                    </div>
                                ) : threads.length === 0 ? (
                                    <div className="floating-messenger-empty">
                                        <p>No messages yet</p>
                                    </div>
                                ) : (
                                    <>
                                    {threads.map((thread) => (
                                        <button
                                            key={thread._id}
                                            type="button"
                                            className={`floating-messenger-contact ${thread._id === selectedThreadId ? 'is-active' : ''}`}
                                            onClick={() => handleSelectThread(thread._id)}
                                        >
                                            <div className="floating-messenger-contact-avatar">{getInitial(thread)}</div>
                                            <div className="floating-messenger-contact-copy">
                                                <strong>{getThreadTitle(thread)}</strong>
                                                <span>{lastMessagePreview(thread)}</span>
                                            </div>
                                            <time>{formatDateTime(thread.lastMessageAt)}</time>
                                        </button>
                                    ))}
                                    </>
                                )}
                            </div>
                        </aside>

                        <section className="floating-messenger-chat">
                            {assistantSelected ? (
                                <>
                                    <div className="floating-messenger-chat-bar">
                                        <div className="floating-messenger-chat-head">
                                            <div className="floating-messenger-chat-avatar">AI</div>
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
                                                <button
                                                    type="button"
                                                    className="floating-messenger-mobile-close"
                                                    onClick={handleClose}
                                                    aria-label="Close messages"
                                                >
                                                    x
                                                </button>
                                            </div>
                                        ) : null}
                                    </div>
                                    <AssistantChat title="JumpTake AI" className="floating-messenger-assistant-chat" />
                                </>
                            ) : selectedThread ? (
                                <>
                                    <div className="floating-messenger-chat-bar">
                                        <div className="floating-messenger-chat-head">
                                            <div className="floating-messenger-chat-avatar">{getInitial(selectedThread)}</div>
                                            <div className="floating-messenger-chat-copy">
                                                <strong>{getThreadTitle(selectedThread)}</strong>
                                                <span>{getThreadSubtitle(selectedThread)}</span>
                                            </div>
                                        </div>
                                        <span className="floating-messenger-chat-seen">
                                            {selectedThread.lastMessageAt ? `Last update ${formatDateTime(selectedThread.lastMessageAt)}` : 'Conversation'}
                                        </span>
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
                                                <button
                                                    type="button"
                                                    className="floating-messenger-mobile-close"
                                                    onClick={handleClose}
                                                    aria-label="Close messages"
                                                >
                                                    x
                                                </button>
                                            </div>
                                        ) : null}
                                    </div>

                                    {message && <div className={`notification-message ${message.includes('Error') ? 'error' : 'success'}`}>{message}</div>}
                                    {error && <div className="error-message">{error}</div>}

                                    <div ref={messagesRef} className="floating-messenger-messages">
                                        {(selectedThread.messages || []).map((item) => (
                                            <div
                                                key={item._id}
                                                className={`floating-messenger-message ${isOwnMessage(selectedThread, item) ? 'is-own' : ''}`}
                                            >
                                                <div className="floating-messenger-message-meta">
                                                    <strong>{getMessageSenderLabel(selectedThread, item)}</strong>
                                                    <span>{formatDateTime(item.createdAt)}</span>
                                                </div>
                                                <div className="floating-messenger-message-body" dangerouslySetInnerHTML={{ __html: item.bodyHtml }} />
                                            </div>
                                        ))}
                                    </div>

                                    <div className="floating-messenger-input">
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
                                    </div>
                                </>
                            ) : (
                                <div className="floating-messenger-empty floating-messenger-chat-empty">
                                    <p>Select a conversation to start messaging.</p>
                                </div>
                            )}
                        </section>
                    </div>
                </div>
            )}

            <button
                type="button"
                className="floating-messenger-trigger"
                onClick={open ? handleClose : handleOpen}
                aria-label={open ? 'Close messages' : 'Open messages'}
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
        </div>
    );
};

export default FloatingMessenger;
