import React, { useEffect, useRef, useState } from 'react';
import ContactCandidate from './ContactCandidate';
import ProfileAvatar from './ProfileAvatar';

const BookmarkedCandidates = ({ userId, onBack, onFooterBack, embedded = false }) => {
    const [bookmarks, setBookmarks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedCandidate, setSelectedCandidate] = useState(null);
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [connectionByUserId, setConnectionByUserId] = useState({});
    const [sendingFriendTo, setSendingFriendTo] = useState('');
    const [likedCandidateIds, setLikedCandidateIds] = useState([]);
    const [candidateLikeCounts, setCandidateLikeCounts] = useState({});
    const [skillsExpanded, setSkillsExpanded] = useState(false);
    const [isMobileView, setIsMobileView] = useState(() => (
        typeof window !== 'undefined' ? window.innerWidth <= 768 : false
    ));
    const containerRef = useRef(null);

    useEffect(() => {
        fetchBookmarks();
        fetchConnections();
        fetchCandidateLikes();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [userId]);

    useEffect(() => {
        const handleResize = () => setIsMobileView(window.innerWidth <= 768);

        handleResize();
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    useEffect(() => {
        setSkillsExpanded(false);
    }, [selectedCandidate?._id]);

    const bookmarksPerMobilePage = 6;
    const totalPages = Math.max(1, Math.ceil(bookmarks.length / bookmarksPerMobilePage));
    const pagedBookmarks = isMobileView
        ? bookmarks.slice((currentPage - 1) * bookmarksPerMobilePage, currentPage * bookmarksPerMobilePage)
        : bookmarks;

    useEffect(() => {
        setCurrentPage(1);
    }, [bookmarks.length, isMobileView]);

    useEffect(() => {
        if (currentPage > totalPages) {
            setCurrentPage(totalPages);
        }
    }, [currentPage, totalPages]);

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
            setTimeout(() => setMessage(''), 2500);
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

    const fetchCandidateLikes = async () => {
        if (!userId) {
            return;
        }

        try {
            const params = new URLSearchParams({
                actorType: 'candidate',
                actorKey: String(userId)
            });
            const response = await fetch(`${process.env.REACT_APP_API_URL || ''}/api/candidate-likes?${params.toString()}`, {
                headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
            });
            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.error || 'Failed to load candidate likes');
            }

            const counts = {};
            (data.counts || []).forEach((item) => {
                counts[String(item.candidateId)] = item.count;
            });
            setCandidateLikeCounts(counts);
            setLikedCandidateIds((data.likedCandidateIds || []).map(String));
        } catch (likeError) {
            console.error('Error fetching bookmarked candidate likes:', likeError);
        }
    };

    const toggleCandidateLike = async (candidate, event) => {
        event.stopPropagation();
        if (!candidate?._id || !userId) {
            return;
        }

        try {
            const response = await fetch(`${process.env.REACT_APP_API_URL || ''}/api/candidate-likes/toggle`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({
                    candidateId: candidate._id,
                    actorType: 'candidate',
                    actorKey: String(userId)
                })
            });
            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.error || 'Failed to update candidate like');
            }

            const candidateId = String(candidate._id);
            setCandidateLikeCounts((current) => ({ ...current, [candidateId]: data.count }));
            setLikedCandidateIds((current) => (
                data.liked
                    ? [...new Set([...current, candidateId])]
                    : current.filter((id) => id !== candidateId)
            ));
        } catch (likeError) {
            setMessage(`Error: ${likeError.message}`);
        }
    };

    const sendFriendRequest = async (candidate, event) => {
        event.stopPropagation();
        const candidateUserId = String(candidate.user || '');
        const existingConnection = connectionByUserId[candidateUserId];
        if (!candidateUserId) {
            return;
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
                setTimeout(() => setMessage(''), 2500);
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
            setTimeout(() => setMessage(''), 2500);
        } catch (friendError) {
            setMessage(`Error: ${friendError.message}`);
        } finally {
            setSendingFriendTo('');
        }
    };

    const changePage = (nextPage) => {
        setCurrentPage(nextPage);
        window.requestAnimationFrame(() => {
            const scrollParent = containerRef.current?.closest('.mobile-dashboard-section-panel, .main-content');
            if (scrollParent) {
                scrollParent.scrollTop = 0;
            }
            containerRef.current?.scrollIntoView({ block: 'start', behavior: 'auto' });
        });
    };

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

    if (selectedCandidate) {
        const selectedSkills = getSkillList(selectedCandidate.skills);
        const visibleSkills = skillsExpanded ? selectedSkills : selectedSkills.slice(0, 5);

        return (
            <div className="candidate-profile bookmarked-candidate-profile">
                <div className="candidate-profile-header">
                    <div className="candidate-profile-back">
                        <button onClick={() => setSelectedCandidate(null)} className="back-button">Back to Bookmarked Candidates</button>
                    </div>
                    <div className="candidate-header-info">
                        <ProfileAvatar imageSrc={selectedCandidate.profileImage} name={selectedCandidate.name} className="candidate-initial" imageClassName="profile-avatar-image" />
                        <div className="candidate-header-text">
                            <h2>{selectedCandidate.name || 'Unnamed Candidate'}</h2>
                            <p>Public candidate profile</p>
                        </div>
                    </div>
                </div>
                <div className="candidate-profile-body">
                    <ContactCandidate candidate={selectedCandidate} mode="candidate" currentUserId={userId} />

                    <div className="profile-section">
                        <h3>Skills</h3>
                        <div className={`skills-container compact-skills-container ${skillsExpanded ? 'is-expanded' : ''}`}>
                            {selectedSkills.length > 0
                                ? (
                                    <>
                                        {visibleSkills.map((skill, index) => <span key={index} className="skill-tag">{skill}</span>)}
                                        {selectedSkills.length > 5 && (
                                            <button
                                                type="button"
                                                className="skill-tag skill-expand-button"
                                                onClick={() => setSkillsExpanded((expanded) => !expanded)}
                                                aria-expanded={skillsExpanded}
                                            >
                                                {skillsExpanded ? '-' : `+${selectedSkills.length - 5}`}
                                            </button>
                                        )}
                                    </>
                                )
                                : <p>No skills listed</p>}
                        </div>
                    </div>
                    <div className="profile-section"><h3>Education</h3>{renderList(selectedCandidate.education, 'No education information available')}</div>
                    <div className="profile-section"><h3>Experience</h3>{renderList(selectedCandidate.experience, 'No experience information available')}</div>
                    <div className="section-footer-nav"><button className="back-button" onClick={() => setSelectedCandidate(null)}>Back</button></div>
                </div>
            </div>
        );
    }

    return (
        <div ref={containerRef} className="talent-pool-container candidate-bookmarked-container">
            {!embedded && (
                <div className="talent-pool-header">
                    <h2>Bookmarked Candidates</h2>
                </div>
            )}

            {message.includes('Error') && <div className="notification-message error">{message}</div>}
            {error && <div className="error-message">{error}</div>}

            {loading ? (
                <div className="loading-container"><div className="loading-spinner"></div><p>Loading bookmarked candidates...</p></div>
            ) : bookmarks.length === 0 ? (
                <div className="no-candidates"><h3>No bookmarked candidates yet</h3><p>Star candidate cards in View Candidates to keep them here.</p></div>
            ) : (
                <div className="candidates-grid">
                    {pagedBookmarks.map((bookmark) => {
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
                                        className={`candidate-card-action candidate-card-like-action ${likedCandidateIds.includes(String(candidate._id)) ? 'active' : ''}`}
                                        onClick={(event) => toggleCandidateLike(candidate, event)}
                                        aria-label="Like candidate"
                                        title="Like candidate"
                                    >
                                        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3v11Zm2 0V11l4.7-8.5c.5-.9 1.8-.6 1.9.4l.3 3.1c.1 1-.2 2-.8 2.8h4.1c1.8 0 3.1 1.7 2.7 3.4l-1.4 6.6A4 4 0 0 1 16.6 22H9Z" /></svg>
                                        <span>{candidateLikeCounts[String(candidate._id)] || 0}</span>
                                    </button>
                                    <button
                                        type="button"
                                        className={`candidate-card-action candidate-card-friend-action ${connection?.status || 'is-new'}`}
                                        onClick={(event) => sendFriendRequest(candidate, event)}
                                        disabled={sendingFriendTo === String(candidate._id) || connection?.status === 'accepted' || (connection?.status === 'pending' && connection.direction !== 'outgoing')}
                                        aria-label="Add friend"
                                        title={connection?.status === 'accepted' ? 'Friends' : connection?.status === 'pending' ? 'Invitation pending' : 'Add friend'}
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

            {isMobileView && totalPages > 1 && !loading && !selectedCandidate && (
                <div className="mobile-list-pagination" aria-label="Bookmarked candidate pages">
                    <button type="button" className="secondary-button" onClick={() => changePage(Math.max(1, currentPage - 1))} disabled={currentPage === 1}>
                        Previous
                    </button>
                    <span>Page {currentPage} of {totalPages}</span>
                    <button type="button" className="secondary-button" onClick={() => changePage(Math.min(totalPages, currentPage + 1))} disabled={currentPage === totalPages}>
                        Next
                    </button>
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
