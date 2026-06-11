import React, { useEffect, useState } from 'react';
import RichMessageEditor from './RichMessageEditor';

const stripHtml = (html = '') => html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();

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
    const [replyHtml, setReplyHtml] = useState('');
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);
    const [error, setError] = useState('');
    const [message, setMessage] = useState('');

    const isEmployer = mode === 'employer';

    useEffect(() => {
        fetchThreads();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [mode, companyId, userId]);

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
            const response = await fetch(`${process.env.REACT_APP_API_URL || ''}${endpoint}`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) {
                throw new Error('Failed to load inbox');
            }

            const data = await response.json();
            setThreads(Array.isArray(data) ? data : []);

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
        if (!selectedThread || !stripHtml(replyHtml)) {
            setMessage('Write a reply before sending.');
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
            return peerCandidate?.name || peerCandidate?.email || 'Candidate';
        }

        return thread?.company?.name || 'Company';
    };

    const getThreadSubtitle = (thread) => {
        if (isEmployer) {
            return thread?.candidateUser?.email || thread?.candidate?.email || 'Email not available';
        }

        if (isDirectCandidateThread(thread)) {
            const peerCandidate = getPeerCandidate(thread);
            return peerCandidate?.email || 'Candidate chat';
        }

        return thread?.company?.industry || 'Employer message';
    };

    const getInitial = (thread) => (getThreadTitle(thread).charAt(0) || 'J').toUpperCase();

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

    if (selectedThread) {
        return (
            <div className="inbox-container messenger-inbox">
                <div className="messenger-chat-header">
                    <button className="back-button messenger-back" onClick={() => setSelectedThread(null)}>
                        Back
                    </button>
                    <div className="messenger-chat-head">
                        <div className="messenger-avatar">{getInitial(selectedThread)}</div>
                        <div>
                            <h2>{getThreadTitle(selectedThread)}</h2>
                            <p>{getThreadSubtitle(selectedThread)}</p>
                        </div>
                    </div>
                </div>

                {message && <div className={`notification-message ${message.includes('Error') ? 'error' : 'success'}`}>{message}</div>}
                {error && <div className="error-message">{error}</div>}

                <div className="message-thread messenger-thread">
                    {(selectedThread.messages || []).map((item) => (
                        <div
                            key={item._id}
                            className={`message-bubble ${isOwnMessage(selectedThread, item) ? 'sent' : 'received'}`}
                        >
                            <div className="message-meta">
                                <strong>{getMessageSenderLabel(selectedThread, item)}</strong>
                                <span>{formatDateTime(item.createdAt)}</span>
                            </div>
                            <div className="message-body" dangerouslySetInnerHTML={{ __html: item.bodyHtml }} />
                        </div>
                    ))}
                </div>

                <div className="message-compose-card messenger-compose-card">
                    <RichMessageEditor
                        value={replyHtml}
                        onChange={setReplyHtml}
                        placeholder="Write a reply..."
                    />
                    <div className="message-compose-actions">
                        <button className="settings-button primary messenger-send-button" onClick={sendReply} disabled={sending}>
                            {sending ? 'Sending...' : 'Send'}
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="inbox-container messenger-inbox">
            <div className="manage-jobs-header">
                <h2>Inbox</h2>
            </div>

            {error && <div className="error-message">{error}</div>}

            {loading ? (
                <div className="loading-spinner">Loading inbox...</div>
            ) : threads.length === 0 ? (
                <div className="no-jobs-message">
                    <h3>No messages yet</h3>
                    <p>{isEmployer ? 'Candidate conversations will appear here.' : 'Employer messages will appear here.'}</p>
                </div>
            ) : (
                <div className="inbox-thread-list messenger-thread-list">
                    {threads.map((thread) => {
                        const lastMessage = thread.messages?.[thread.messages.length - 1];

                        return (
                            <button
                                className={`inbox-thread-card button-message ${isThreadActive(thread) ? 'is-active' : 'is-offline'}`}
                                id="btn-message"
                                key={thread._id}
                                onClick={() => setSelectedThread(thread)}
                            >
                                <div className="content-avatar">
                                    <div className="avatar">
                                        <span className="user-img">{getInitial(thread)}</span>
                                    </div>
                                    <span className="status-user"></span>
                                </div>
                                <div className="notice-content">
                                    <div className="lable-message">
                                        <span>Message</span>
                                        {(thread.messages || []).length > 0 && <span className="number-message">{thread.messages.length}</span>}
                                    </div>
                                    <div className="username">{getThreadTitle(thread)}</div>
                                    <div className="user-id">{getThreadSubtitle(thread)}</div>
                                    <span className="thread-preview">{lastMessage?.bodyText || 'No message preview'}</span>
                                </div>
                                <time>{formatDateTime(thread.lastMessageAt)}</time>
                            </button>
                        );
                    })}
                </div>
            )}

            <div className="page-footer-actions">
                <button className="back-button" onClick={onBack}>Back to Dashboard</button>
                <button className="back-button" onClick={onFooterBack || onBack}>Back</button>
            </div>
        </div>
    );
};

export default Inbox;
