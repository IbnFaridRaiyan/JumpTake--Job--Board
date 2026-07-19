import React, { useEffect, useMemo, useState } from 'react';
import ChatAvatar from './ChatAvatar';
import { apiUrl } from '../utils/apiUrl';

const asContact = (candidate = {}, source = '') => ({
    candidateId: candidate.candidateId || candidate._id || '',
    userId: candidate.userId || candidate.user?._id || candidate.user || '',
    name: candidate.name || 'Candidate',
    jumpTakeId: candidate.jumptakeId || candidate.jumpTakeId || '',
    avatar: candidate.profileImage || candidate.avatar || '',
    skills: candidate.skills || [],
    education: candidate.education || [],
    experience: candidate.experience || [],
    source
});

const NewMessageFinder = ({ userId, onSelectContact }) => {
    const [friends, setFriends] = useState([]);
    const [suggested, setSuggested] = useState([]);
    const [showIdSearch, setShowIdSearch] = useState(false);
    const [jumpTakeId, setJumpTakeId] = useState('');
    const [searching, setSearching] = useState(false);
    const [notice, setNotice] = useState('');

    useEffect(() => {
        if (!userId) return undefined;
        let active = true;
        const token = localStorage.getItem('token') || '';
        Promise.all([
            fetch(apiUrl(`/api/candidate-connections/user/${userId}`), { headers: { Authorization: `Bearer ${token}` } }),
            fetch(apiUrl(`/api/candidate-network/matches/${userId}`), { headers: { Authorization: `Bearer ${token}` } })
        ]).then(async ([friendsResponse, matchesResponse]) => {
            const [network, matches] = await Promise.all([
                friendsResponse.json().catch(() => ({})),
                matchesResponse.json().catch(() => ([]))
            ]);
            if (!active) return;
            setFriends((Array.isArray(network.friends) ? network.friends : []).map((item) => asContact(item.peer, 'friend')));
            setSuggested((Array.isArray(matches) ? matches : []).map((item) => asContact(item, 'suggested')));
        }).catch(() => {
            if (active) setNotice('Could not load contacts right now.');
        });
        return () => { active = false; };
    }, [userId]);

    useEffect(() => {
        if (!notice) return undefined;
        const timer = window.setTimeout(() => setNotice(''), 2000);
        return () => window.clearTimeout(timer);
    }, [notice]);

    const suggestedWithoutFriends = useMemo(() => {
        const friendIds = new Set(friends.flatMap((contact) => [String(contact.userId), String(contact.candidateId)]));
        return suggested.filter((contact) => !friendIds.has(String(contact.userId)) && !friendIds.has(String(contact.candidateId)));
    }, [friends, suggested]);

    const findById = async (event) => {
        event.preventDefault();
        const normalized = jumpTakeId.trim().replace(/^@/, '');
        if (!normalized) {
            setNotice('Enter a JumpTake ID.');
            return;
        }
        try {
            setSearching(true);
            const response = await fetch(apiUrl(`/api/candidate-network/find/${encodeURIComponent(normalized)}`), {
                headers: { Authorization: `Bearer ${localStorage.getItem('token') || ''}` }
            });
            const data = await response.json().catch(() => ({}));
            if (!response.ok) throw new Error(data.error || 'Candidate not found');
            onSelectContact(asContact(data, 'jumptake-id'));
        } catch (error) {
            setNotice(error.message || 'Candidate not found.');
        } finally {
            setSearching(false);
        }
    };

    const renderContacts = (items, emptyText) => items.length ? (
        <div className="new-message-contact-list">
            {items.map((contact) => (
                <button
                    type="button"
                    className="new-message-contact"
                    key={`${contact.source}:${contact.userId || contact.candidateId}`}
                    onClick={() => onSelectContact(contact)}
                >
                    <ChatAvatar imageSrc={contact.avatar} className="new-message-contact-avatar" label={contact.name} />
                    <span><strong>{contact.name}</strong><small>{contact.jumpTakeId || (contact.source === 'friend' ? 'Friend' : 'Matched candidate')}</small></span>
                </button>
            ))}
        </div>
    ) : <p className="message-workspace-empty-copy">{emptyText}</p>;

    return (
        <section className="new-message-finder">
            <div className="new-message-finder-heading">
                <div><h3>Send a new message</h3><p>Choose a friend or a candidate matched to your profile.</p></div>
                <button type="button" className="new-message-id-toggle" onClick={() => setShowIdSearch((open) => !open)} aria-expanded={showIdSearch}>+</button>
            </div>
            {showIdSearch && (
                <form className="new-message-id-form" onSubmit={findById}>
                    <input value={jumpTakeId} onChange={(event) => setJumpTakeId(event.target.value)} placeholder="Enter JumpTake ID" />
                    <button type="submit" disabled={searching}>{searching ? 'Finding...' : 'Message'}</button>
                </form>
            )}
            {notice && <div className="notification-message error">{notice}</div>}
            <h4>Friends</h4>
            {renderContacts(friends, 'Add friends to start conversations from here.')}
            <h4>Suggested candidates</h4>
            {renderContacts(suggestedWithoutFriends, 'No profile matches are available yet.')}
        </section>
    );
};

export default NewMessageFinder;
