import React, { useCallback, useEffect, useState } from 'react';

const FriendInvitations = ({ userId }) => {
    const [connections, setConnections] = useState({ incoming: [], outgoing: [], friends: [] });
    const [loading, setLoading] = useState(true);
    const [busyId, setBusyId] = useState('');
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const [activeTab, setActiveTab] = useState('incoming');

    const fetchConnections = useCallback(async () => {
        if (!userId) {
            setLoading(false);
            return;
        }

        try {
            setLoading(true);
            const response = await fetch(
                `${process.env.REACT_APP_API_URL || ''}/api/candidate-connections/user/${userId}`,
                { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
            );
            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.error || 'Failed to load friend invitations');
            }
            setConnections(data);
            setError('');
        } catch (fetchError) {
            setError(fetchError.message || 'Failed to load friend invitations.');
        } finally {
            setLoading(false);
        }
    }, [userId]);

    useEffect(() => {
        fetchConnections();
    }, [fetchConnections]);

    const respond = async (connectionId, action) => {
        try {
            setBusyId(connectionId);
            setError('');
            setMessage('');
            const response = await fetch(
                `${process.env.REACT_APP_API_URL || ''}/api/candidate-connections/${connectionId}/respond`,
                {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${localStorage.getItem('token')}`
                    },
                    body: JSON.stringify({ action })
                }
            );
            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.error || 'Failed to update invitation');
            }
            setMessage(action === 'accept' ? 'Friend invitation accepted.' : action === 'block' ? 'Candidate blocked.' : 'Friend invitation declined.');
            await fetchConnections();
        } catch (responseError) {
            setError(responseError.message || 'Failed to update invitation.');
        } finally {
            setBusyId('');
        }
    };

    const renderPeer = (connection) => (
        <div className="friend-invitation-card" key={connection._id}>
            <div className="friend-invitation-avatar">
                {(connection.peer?.name || 'C').charAt(0).toUpperCase()}
            </div>
            <div className="friend-invitation-copy">
                <h3>{connection.peer?.name || 'Candidate'}</h3>
                {connection.peer?.jumptakeId && <p>JumpTake ID: {connection.peer.jumptakeId}</p>}
                <span>{(connection.peer?.skills || []).slice(0, 3).join(', ') || 'Candidate connection'}</span>
            </div>
            <div className="friend-invitation-actions">
                <button type="button" className="settings-button primary" onClick={() => respond(connection._id, 'accept')} disabled={busyId === connection._id}>
                    Accept
                </button>
                <button type="button" className="secondary-button" onClick={() => respond(connection._id, 'decline')} disabled={busyId === connection._id}>
                    Decline
                </button>
                <button type="button" className="friend-block-button" onClick={() => respond(connection._id, 'block')} disabled={busyId === connection._id}>
                    Block
                </button>
            </div>
        </div>
    );

    const tabs = [
        { id: 'incoming', label: 'Received' },
        { id: 'outgoing', label: 'Sent' },
        { id: 'friends', label: 'Friends' }
    ];

    const renderActiveTab = () => {
        if (activeTab === 'incoming') {
            return connections.incoming.length > 0
                ? <div className="friend-invitation-list">{connections.incoming.map(renderPeer)}</div>
                : <p className="empty-info">You have no pending friend invitations.</p>;
        }

        if (activeTab === 'outgoing') {
            return connections.outgoing.length > 0
                ? (
                    <div className="friend-invitation-list">
                        {connections.outgoing.map((connection) => (
                            <div className="friend-outgoing-row" key={connection._id}>
                                <div className="friend-outgoing-copy">
                                    <strong>{connection.peer?.name || 'Candidate'}</strong>
                                    {connection.peer?.jumptakeId && <span>JumpTake ID: {connection.peer.jumptakeId}</span>}
                                </div>
                                <span className="friend-status-pill">Invitation pending</span>
                            </div>
                        ))}
                    </div>
                )
                : <p className="empty-info">You have no outgoing invitations.</p>;
        }

        return connections.friends.length > 0
            ? (
                <div className="friend-invitation-list">
                    {connections.friends.map((connection) => (
                        <div className="friend-outgoing-row is-friend" key={connection._id}>
                            <div className="friend-outgoing-copy">
                                <strong>{connection.peer?.name || 'Candidate'}</strong>
                                <span>{connection.peer?.jumptakeId || 'Connected candidate'}</span>
                            </div>
                            <span className="friend-status-pill is-friend">Connected</span>
                        </div>
                    ))}
                </div>
            )
            : <p className="empty-info">Accepted friends will appear here.</p>;
    };

    return (
        <div className="friend-invitations-section">
            {message && <div className="notification-message success">{message}</div>}
            {error && <div className="error-message">{error}</div>}

            {loading ? (
                <div className="loading-message">Loading invitations...</div>
            ) : (
                <div className="friend-invitations-shell">
                    <div className="friend-invitation-tabs" role="tablist" aria-label="Friend invitation categories">
                        {tabs.map((tab) => (
                            <button
                                key={tab.id}
                                type="button"
                                role="tab"
                                className={`friend-invitation-tab ${activeTab === tab.id ? 'is-active' : ''}`}
                                aria-selected={activeTab === tab.id}
                                onClick={() => setActiveTab(tab.id)}
                            >
                                {tab.label}
                            </button>
                        ))}
                    </div>
                    <div className="friend-invitation-panel">
                        {renderActiveTab()}
                    </div>
                </div>
            )}
        </div>
    );
};

export default FriendInvitations;
