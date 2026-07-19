import React, { useEffect, useRef, useState } from 'react';
import ProfileAvatar from './ProfileAvatar';
import confirmAction from '../utils/confirmAction';
import TalentPool from './TalentPool';

const BookmarkedCandidates = ({ userId, onBack, onFooterBack, embedded = false }) => {
    const [bookmarks, setBookmarks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedCandidate, setSelectedCandidate] = useState(null);
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const [connectionByUserId, setConnectionByUserId] = useState({});
    const [sendingFriendTo, setSendingFriendTo] = useState('');
    const containerRef = useRef(null);

    useEffect(() => {
        fetchBookmarks();
        fetchConnections();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [userId]);

    useEffect(() => {
        if (!message) {
            return undefined;
        }

        const timer = window.setTimeout(() => setMessage(''), 2000);
        return () => window.clearTimeout(timer);
    }, [message]);


    const fetchBookmarks = async () => {
        if (!userId) {
            setBookmarks([]);
            setLoading(false);
            return;
        }

        try {
            setLoading(true);
            const token = localStorage.getItem('token');
            const response = await fetch(`${process.env.REACT_APP_API_URL || ''}/api/candidate-bookmarks/user/${userId}`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) {
                throw new Error('Failed to fetch bookmarked candidates');
            }

            const data = await response.json();
            setBookmarks(Array.isArray(data) ? data.filter((bookmark) => bookmark.candidate) : []);
            setError('');
        } catch (bookmarkError) {
            console.error('Error fetching bookmarked candidates:', bookmarkError);
            setError('Failed to load bookmarked candidates. Please try again later.');
        } finally {
            setLoading(false);
        }
    };

    const removeBookmark = async (candidateId) => {
        const confirmed = await confirmAction({
            title: 'Remove bookmark?',
            message: 'Remove this candidate from your bookmarks?'
        });
        if (!confirmed) {
            return;
        }

        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${process.env.REACT_APP_API_URL || ''}/api/candidate-bookmarks/user/${userId}/candidate/${candidateId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) {
                throw new Error('Failed to remove bookmarked candidate');
            }

            setBookmarks((prevState) => prevState.filter((bookmark) => String(bookmark.candidate?._id) !== String(candidateId)));
            setMessage('Bookmarked candidate removed successfully.');
        } catch (removeError) {
            console.error('Error removing bookmarked candidate:', removeError);
            setMessage(`Error: ${removeError.message}`);
        }
    };

    const fetchConnections = async () => {
        if (!userId) {
            return;
        }

        try {
            const response = await fetch(
                `${process.env.REACT_APP_API_URL || ''}/api/candidate-connections/user/${userId}`,
                { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
            );
            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.error || 'Failed to load friend status');
            }

            const nextConnections = {};
            [...(data.incoming || []), ...(data.outgoing || []), ...(data.friends || [])].forEach((connection) => {
                if (connection.peer?.userId) {
                    nextConnections[String(connection.peer.userId)] = connection;
                }
            });
            setConnectionByUserId(nextConnections);
        } catch (connectionError) {
            console.error('Error fetching friend status:', connectionError);
        }
    };

    const sendFriendRequest = async (candidate, event) => {
        event.stopPropagation();
        const candidateUserId = String(candidate.user || '');
        const existingConnection = connectionByUserId[candidateUserId];
        if (!candidateUserId) {
            return;
        }

        if (existingConnection?.status === 'pending' && existingConnection.direction === 'outgoing') {
            const confirmed = await confirmAction({
                title: 'Unsend invitation?',
                message: 'Cancel this sent friend invitation?'
            });
            if (!confirmed) {
                return;
            }
        }

        try {
            setSendingFriendTo(String(candidate._id));
            if (existingConnection?.status === 'pending' && existingConnection.direction === 'outgoing') {
                const cancelResponse = await fetch(`${process.env.REACT_APP_API_URL || ''}/api/candidate-connections/${existingConnection._id}/respond`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${localStorage.getItem('token')}`
                    },
                    body: JSON.stringify({ action: 'cancel' })
                });
                const cancelData = await cancelResponse.json();
                if (!cancelResponse.ok) {
                    throw new Error(cancelData.error || 'Failed to cancel friend invitation');
                }
                setConnectionByUserId((current) => {
                    const next = { ...current };
                    delete next[candidateUserId];
                    return next;
                });
                setMessage('Friend invitation cancelled.');
                return;
            }

            if (existingConnection) {
                return;
            }

            const response = await fetch(`${process.env.REACT_APP_API_URL || ''}/api/candidate-connections/request`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({ recipientCandidateId: candidate._id })
            });
            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.error || 'Failed to send friend invitation');
            }
            setConnectionByUserId((current) => ({
                ...current,
                [candidateUserId]: { ...data.connection, status: 'pending', direction: 'outgoing' }
            }));
            setMessage('Friend invitation sent.');
        } catch (friendError) {
            setMessage(`Error: ${friendError.message}`);
        } finally {
            setSendingFriendTo('');
        }
    };

    if (selectedCandidate) {
        const selectedUserId = String(selectedCandidate.user || selectedCandidate.userId || '');
        const selectedConnection = connectionByUserId[selectedUserId];
        const candidateWithConnection = {
            ...selectedCandidate,
            connectionStatus: selectedConnection
                ? {
                    id: selectedConnection._id || selectedConnection.id || '',
                    status: selectedConnection.status,
                    direction: selectedConnection.direction
                }
                : null
        };

        return (
            <TalentPool
                mode="candidate"
                currentUserId={userId}
                initialSelectedCandidate={candidateWithConnection}
                profileOnly
                onProfileClose={() => {
                    setSelectedCandidate(null);
                    fetchConnections();
                }}
                onFriendStatusChange={(_, nextConnection) => {
                    setConnectionByUserId((current) => {
                        const next = { ...current };
                        if (nextConnection) {
                            next[selectedUserId] = {
                                ...(next[selectedUserId] || {}),
                                _id: nextConnection.id,
                                status: nextConnection.status,
                                direction: nextConnection.direction
                            };
                        } else {
                            delete next[selectedUserId];
                        }
                        return next;
                    });
                }}
            />
        );
    }

    return (
        <div ref={containerRef} className="talent-pool-container candidate-bookmarked-container">
            {!embedded && (
                <div className="talent-pool-header">
                    <h2>Bookmarked Candidates</h2>
                </div>
            )}

            {message && <div className={`notification-message ${message.includes('Error') ? 'error' : 'success'}`}>{message}</div>}
            {error && <div className="error-message">{error}</div>}

            {loading ? (
                <div className="loading-container"><div className="loading-spinner"></div><p>Loading bookmarked candidates...</p></div>
            ) : bookmarks.length === 0 ? (
                <div className="no-candidates"><h3>No bookmarked candidates yet</h3><p>Star candidate cards in View Candidates to keep them here.</p></div>
            ) : (
                <div className="candidates-grid">
                    {bookmarks.map((bookmark) => {
                        const candidate = bookmark.candidate;
                        const connection = connectionByUserId[String(candidate.user || '')];
                        return (
                            <div key={bookmark._id} className="candidate-card uiverse-profile-card" onClick={() => setSelectedCandidate(candidate)}>
                                <button
                                    type="button"
                                    className="bookmark-star-button active talent-bookmark-button candidate-card-corner-bookmark"
                                    onClick={(event) => { event.stopPropagation(); removeBookmark(candidate._id); }}
                                    aria-label="Remove bookmarked candidate"
                                    title="Remove bookmark"
                                >
                                    <svg viewBox="0 0 16 16" aria-hidden="true">
                                        <path d="M3.612 15.443c-.386.198-.824-.149-.746-.592l.83-4.73L.173 6.765c-.329-.314-.158-.888.283-.95l4.898-.696L7.538.792c.197-.39.73-.39.927 0l2.184 4.327 4.898.696c.441.062.612.636.282.95l-3.522 3.356.83 4.73c.078.443-.36.79-.746.592L8 13.187z" />
                                    </svg>
                                </button>
                                <ProfileAvatar imageSrc={candidate.profileImage} name={candidate.name} className="candidate-avatar profileimage" imageClassName="profile-avatar-image" useProfileIconFallback />
                                <div className="candidate-info">
                                    <h3 className="candidate-name Name">{candidate.name || 'Unnamed Candidate'}</h3>
                                    <p className="candidate-email">{candidate.jumptakeId || 'JumpTake ID unavailable'}</p>
                                </div>
                                <div className="candidate-card-socialbar socialbar">
                                    <button
                                        type="button"
                                        className={`candidate-card-action candidate-card-friend-action ${connection?.status || 'is-new'}`}
                                        onClick={(event) => sendFriendRequest(candidate, event)}
                                        disabled={sendingFriendTo === String(candidate._id) || connection?.status === 'accepted' || (connection?.status === 'pending' && connection.direction !== 'outgoing')}
                                        aria-label="Add friend"
                                        title={connection?.status === 'accepted' ? 'Friends' : connection?.status === 'pending' ? 'Unsend friend request' : 'Add friend'}
                                    >
                                        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 12a5 5 0 1 0-5-5 5 5 0 0 0 5 5Zm0 2c-4.42 0-8 2.24-8 5v1h10.1A6.9 6.9 0 0 1 17 19c0-1.85.72-3.54 1.9-4.8A11.7 11.7 0 0 0 15 14Zm6-3V8h-2v3h-3v2h3v3h2v-3h3v-2h-3Z" /></svg>
                                    </button>
                                    <button type="button" className="candidate-card-action candidate-card-message-action" onClick={(event) => { event.stopPropagation(); setSelectedCandidate(candidate); }} aria-label="Message candidate" title="Message candidate">
                                        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 4h16a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H8l-5 4v-4H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Zm0 2v10h1v1.84L7.3 16H20V6H4Z" /></svg>
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {!embedded && (
                <div className="page-footer-actions">
                    <button className="back-button" onClick={onFooterBack || onBack}>Back</button>
                </div>
            )}
        </div>
    );
};

export default BookmarkedCandidates;
