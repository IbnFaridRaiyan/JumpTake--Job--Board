import React, { useCallback, useEffect, useState } from 'react';
import ContactCandidate from './ContactCandidate';
import ProfileAvatar from './ProfileAvatar';

const FriendInvitations = ({ userId }) => {
    const [connections, setConnections] = useState({ incoming: [], outgoing: [], friends: [] });
    const [loading, setLoading] = useState(true);
    const [busyId, setBusyId] = useState('');
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const [activeTab, setActiveTab] = useState('incoming');
    const [selectedCandidate, setSelectedCandidate] = useState(null);

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

    const getSkillList = (skills) => {
        if (Array.isArray(skills)) {
            return skills.map((skill) => String(skill).trim()).filter(Boolean);
        }

        if (typeof skills === 'string') {
            return skills.split(',').map((skill) => skill.trim()).filter(Boolean);
        }

        return [];
    };

    const renderList = (items, emptyMessage) => {
        if (!items || (Array.isArray(items) && items.length === 0)) {
            return <p className="empty-info">{emptyMessage}</p>;
        }

        return (
            <ul className="profile-list">
                {(Array.isArray(items) ? items : [items]).map((item, index) => (
                    <li key={index}>{typeof item === 'object' ? Object.values(item).filter(Boolean).join(' - ') : item}</li>
                ))}
            </ul>
        );
    };

    const getCandidateFromConnection = (connection) => {
        const peer = connection?.peer || {};
        return {
            _id: peer.candidateId || null,
            user: peer.userId || null,
            name: peer.name || 'Candidate',
            email: peer.email || '',
            profileImage: peer.profileImage || '',
            jumptakeId: peer.jumptakeId || '',
            skills: peer.skills || [],
            education: peer.education || [],
            experience: peer.experience || [],
            achievements: peer.achievements || [],
            interests: peer.interests || [],
            hobbies: peer.hobbies || []
        };
    };

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
            setMessage(
                action === 'accept'
                    ? 'Friend invitation accepted.'
                    : action === 'block'
                        ? 'Candidate blocked.'
                        : action === 'cancel'
                            ? 'Friend invitation cancelled.'
                            : 'Friend invitation declined.'
            );
            await fetchConnections();
        } catch (responseError) {
            setError(responseError.message || 'Failed to update invitation.');
        } finally {
            setBusyId('');
        }
    };

    const renderConnectionInfo = (connection, subtitle) => {
        const candidate = getCandidateFromConnection(connection);
        const skills = getSkillList(candidate.skills);

        return (
            <>
                <ProfileAvatar imageSrc={candidate.profileImage} name={candidate.name} className="friend-invitation-avatar" imageClassName="profile-avatar-image" />
                <div className="friend-invitation-copy">
                    <h3>{candidate.name || 'Candidate'}</h3>
                    {candidate.jumptakeId && <p>JumpTake ID: {candidate.jumptakeId}</p>}
                    <span>{skills.slice(0, 3).join(', ') || subtitle}</span>
                </div>
            </>
        );
    };

    const renderActionTools = (connection) => {
        const candidate = getCandidateFromConnection(connection);

        return (
            <>
                <button
                    type="button"
                    className="secondary-button"
                    onClick={() => setSelectedCandidate(candidate)}
                >
                    View Profile
                </button>
                {candidate._id ? (
                    <ContactCandidate candidate={candidate} mode="candidate" currentUserId={userId} />
                ) : null}
            </>
        );
    };

    const tabs = [
        { id: 'incoming', label: 'Received Invitations' },
        { id: 'outgoing', label: 'Sent Invitations' },
        { id: 'friends', label: 'Friends' }
    ];

    const isActiveTabEmpty = (
        (activeTab === 'incoming' && connections.incoming.length === 0)
        || (activeTab === 'outgoing' && connections.outgoing.length === 0)
        || (activeTab === 'friends' && connections.friends.length === 0)
    );

    const renderActiveTab = () => {
        if (activeTab === 'incoming') {
            return connections.incoming.length > 0
                ? (
                    <div className="friend-invitation-list">
                        {connections.incoming.map((connection) => (
                            <div className="friend-invitation-card" key={connection._id}>
                                {renderConnectionInfo(connection, 'Candidate connection')}
                                <div className="friend-invitation-actions">
                                    {renderActionTools(connection)}
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
                        ))}
                    </div>
                )
                : <p className="empty-info">You have no pending friend invitations.</p>;
        }

        if (activeTab === 'outgoing') {
            return connections.outgoing.length > 0
                ? (
                    <div className="friend-invitation-list">
                        {connections.outgoing.map((connection) => (
                            <div className="friend-outgoing-row" key={connection._id}>
                                {renderConnectionInfo(connection, 'Invitation pending')}
                                <div className="friend-invitation-actions">
                                    <span className="friend-status-pill">Invitation pending</span>
                                    {renderActionTools(connection)}
                                    <button
                                        type="button"
                                        className="friend-cancel-button"
                                        onClick={() => respond(connection._id, 'cancel')}
                                        disabled={busyId === connection._id}
                                    >
                                        {busyId === connection._id ? 'Cancelling...' : 'Unsend'}
                                    </button>
                                </div>
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
                            {renderConnectionInfo(connection, 'Connected candidate')}
                            <div className="friend-invitation-actions">
                                <span className="friend-status-pill is-friend">Connected</span>
                                {renderActionTools(connection)}
                            </div>
                        </div>
                    ))}
                </div>
            )
            : <p className="empty-info">You have no friends yet.</p>;
    };

    if (selectedCandidate) {
        return (
            <div className="candidate-profile bookmarked-candidate-profile">
                <div className="candidate-profile-header">
                    <div className="candidate-profile-back">
                        <button onClick={() => setSelectedCandidate(null)} className="back-button">Back to Friends</button>
                    </div>
                    <div className="candidate-header-info">
                        <ProfileAvatar imageSrc={selectedCandidate.profileImage} name={selectedCandidate.name} className="candidate-initial" imageClassName="profile-avatar-image" />
                        <div className="candidate-header-text">
                            <h2>{selectedCandidate.name || 'Unnamed Candidate'}</h2>
                            <p>{selectedCandidate.jumptakeId || 'Connected candidate profile'}</p>
                        </div>
                    </div>
                </div>
                <div className="candidate-profile-body">
                    {selectedCandidate._id ? (
                        <ContactCandidate candidate={selectedCandidate} mode="candidate" currentUserId={userId} />
                    ) : null}

                    <div className="profile-section">
                        <h3>Skills</h3>
                        <div className="skills-container">
                            {getSkillList(selectedCandidate.skills).length > 0
                                ? getSkillList(selectedCandidate.skills).map((skill, index) => <span key={index} className="skill-tag">{skill}</span>)
                                : <p>No skills listed</p>}
                        </div>
                    </div>
                    <div className="profile-section"><h3>Education</h3>{renderList(selectedCandidate.education, 'No education information available')}</div>
                    <div className="profile-section"><h3>Experience</h3>{renderList(selectedCandidate.experience, 'No experience information available')}</div>
                    <div className="profile-section"><h3>Achievements</h3>{renderList(selectedCandidate.achievements, 'No achievements listed')}</div>
                    <div className="profile-section"><h3>Interests</h3>{renderList(selectedCandidate.interests, 'No interests listed')}</div>
                    <div className="profile-section"><h3>Hobbies</h3>{renderList(selectedCandidate.hobbies, 'No hobbies listed')}</div>
                    <div className="section-footer-nav"><button className="back-button" onClick={() => setSelectedCandidate(null)}>Back</button></div>
                </div>
            </div>
        );
    }

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
                    <div className={`friend-invitation-panel ${isActiveTabEmpty ? 'is-empty-panel' : ''}`}>
                        {renderActiveTab()}
                    </div>
                </div>
            )}
        </div>
    );
};

export default FriendInvitations;
