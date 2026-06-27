import React, { useCallback, useEffect, useState } from 'react';
import ContactCandidate from './ContactCandidate';
import ProfileAvatar from './ProfileAvatar';

const FriendActionIcon = ({ type }) => {
    const paths = {
        profile: 'M8 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6m0 1c-2.667 0-5 1.333-5 3v1h10v-1c0-1.667-2.333-3-5-3m5.5 1.5a.5.5 0 0 1 .5.5v1h1a.5.5 0 0 1 0 1h-1v1a.5.5 0 0 1-1 0v-1h-1a.5.5 0 0 1 0-1h1v-1a.5.5 0 0 1 .5-.5',
        pending: 'M8 1.5a6.5 6.5 0 1 0 0 13 6.5 6.5 0 0 0 0-13M8 0a8 8 0 1 1 0 16A8 8 0 0 1 8 0m.5 4.5a.5.5 0 0 0-1 0v3.75l2.4 1.44a.5.5 0 1 0 .515-.858L8.5 7.683z',
        message: 'M0 2a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H4.414L.854 15.146A.5.5 0 0 1 0 14.793zm3.5 1a.5.5 0 0 0 0 1h9a.5.5 0 0 0 0-1zm0 2.5a.5.5 0 0 0 0 1h9a.5.5 0 0 0 0-1zm0 2.5a.5.5 0 0 0 0 1h5a.5.5 0 0 0 0-1z',
        unsend: 'M2.146 2.854a.5.5 0 1 1 .708-.708L8 7.293l5.146-5.147a.5.5 0 0 1 .708.708L8.707 8l5.147 5.146a.5.5 0 0 1-.708.708L8 8.707l-5.146 5.147a.5.5 0 0 1-.708-.708L7.293 8z',
        accept: 'M13.854 3.646a.5.5 0 0 1 0 .708l-7.5 7.5a.5.5 0 0 1-.708 0l-3.5-3.5a.5.5 0 1 1 .708-.708L6 10.793l7.146-7.147a.5.5 0 0 1 .708 0',
        decline: 'M4.646 4.646a.5.5 0 0 1 .708 0L8 7.293l2.646-2.647a.5.5 0 0 1 .708.708L8.707 8l2.647 2.646a.5.5 0 0 1-.708.708L8 8.707l-2.646 2.647a.5.5 0 0 1-.708-.708L7.293 8 4.646 5.354a.5.5 0 0 1 0-.708',
        block: 'M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14M3.707 12.293l8.586-8.586A6 6 0 0 0 3.707 12.293m.707.707A6 6 0 0 0 13 4.414z',
        connected: 'M12.5 16a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7m1.679-4.493-1.335 2.226a.75.75 0 0 1-1.174.144l-.774-.773a.5.5 0 0 1 .708-.708l.547.548 1.17-1.951a.5.5 0 1 1 .858.514M11 5a3 3 0 1 1-6 0 3 3 0 0 1 6 0M8.256 14a4.5 4.5 0 0 1-.229-1.004H3c.001-.246.154-.986.832-1.664C4.484 10.68 5.711 10 8 10q.39 0 .74.025c.226-.341.496-.65.804-.918Q8.844 9.002 8 9c-5 0-6 3-6 4s1 1 1 1z'
    };

    return (
        <svg className="friend-action-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" aria-hidden="true" focusable="false">
            <path d={paths[type] || paths.profile} />
        </svg>
    );
};

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
                    <FriendActionIcon type="profile" />
                    View Profile
                </button>
                {candidate._id ? (
                    <ContactCandidate candidate={candidate} mode="candidate" currentUserId={userId} />
                ) : null}
            </>
        );
    };

    const tabs = [
        {
            id: 'incoming',
            label: 'Received Invitations',
            iconClass: 'friend-tab-icon-incoming',
            icon: (
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" aria-hidden="true" focusable="false">
                    <path d="M0 4a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v4.5a.5.5 0 0 1-1 0V5.383l-7 4.2-1.326-.795-5.64 3.47A1 1 0 0 0 2 13h5.5a.5.5 0 0 1 0 1H2a2 2 0 0 1-2-1.99zm1 7.105 4.708-2.897L1 5.383zM1 4v.217l7 4.2 7-4.2V4a1 1 0 0 0-1-1H2a1 1 0 0 0-1 1" />
                    <path d="M12.5 16a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7m.354-1.646a.5.5 0 0 1-.722-.016l-1.149-1.25a.5.5 0 1 1 .737-.676l.28.305V11a.5.5 0 0 1 1 0v1.793l.396-.397a.5.5 0 0 1 .708.708z" />
                </svg>
            )
        },
        {
            id: 'outgoing',
            label: 'Sent Invitations',
            iconClass: 'friend-tab-icon-outgoing',
            icon: (
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" aria-hidden="true" focusable="false">
                    <path d="M2 2a2 2 0 0 0-2 2v8.01A2 2 0 0 0 2 14h5.5a.5.5 0 0 0 0-1H2a1 1 0 0 1-.966-.741l5.64-3.471L8 9.583l7-4.2V8.5a.5.5 0 0 0 1 0V4a2 2 0 0 0-2-2zm3.708 6.208L1 11.105V5.383zM1 4.217V4a1 1 0 0 1 1-1h12a1 1 0 0 1 1 1v.217l-7 4.2z" />
                    <path d="M16 12.5a3.5 3.5 0 1 1-7 0 3.5 3.5 0 0 1 7 0m-1.993-1.679a.5.5 0 0 0-.686.172l-1.17 1.95-.547-.547a.5.5 0 0 0-.708.708l.774.773a.75.75 0 0 0 1.174-.144l1.335-2.226a.5.5 0 0 0-.172-.686" />
                </svg>
            )
        },
        {
            id: 'friends',
            label: 'Friends',
            iconClass: 'friend-tab-icon-friends',
            icon: (
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" aria-hidden="true" focusable="false">
                    <path d="M12.5 16a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7m1.679-4.493-1.335 2.226a.75.75 0 0 1-1.174.144l-.774-.773a.5.5 0 0 1 .708-.708l.547.548 1.17-1.951a.5.5 0 1 1 .858.514M11 5a3 3 0 1 1-6 0 3 3 0 0 1 6 0M8 7a2 2 0 1 0 0-4 2 2 0 0 0 0 4" />
                    <path d="M8.256 14a4.5 4.5 0 0 1-.229-1.004H3c.001-.246.154-.986.832-1.664C4.484 10.68 5.711 10 8 10q.39 0 .74.025c.226-.341.496-.65.804-.918Q8.844 9.002 8 9c-5 0-6 3-6 4s1 1 1 1z" />
                </svg>
            )
        }
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
                                        <FriendActionIcon type="accept" />
                                        Accept
                                    </button>
                                    <button type="button" className="secondary-button" onClick={() => respond(connection._id, 'decline')} disabled={busyId === connection._id}>
                                        <FriendActionIcon type="decline" />
                                        Decline
                                    </button>
                                    <button type="button" className="friend-block-button" onClick={() => respond(connection._id, 'block')} disabled={busyId === connection._id}>
                                        <FriendActionIcon type="block" />
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
                                    <span className="friend-status-pill"><FriendActionIcon type="pending" />Invitation pending</span>
                                    {renderActionTools(connection)}
                                    <button
                                        type="button"
                                        className="friend-cancel-button"
                                        onClick={() => respond(connection._id, 'cancel')}
                                        disabled={busyId === connection._id}
                                    >
                                        <FriendActionIcon type="unsend" />
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
                                <span className="friend-status-pill is-friend"><FriendActionIcon type="connected" />Connected</span>
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
                                <span className={`friend-invitation-tab-icon ${tab.iconClass}`}>{tab.icon}</span>
                                <span className="friend-invitation-tab-label">{tab.label}</span>
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
