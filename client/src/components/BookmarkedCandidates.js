import React, { useEffect, useRef, useState } from 'react';
import ContactCandidate from './ContactCandidate';

const BookmarkedCandidates = ({ userId, onBack, onFooterBack }) => {
    const [bookmarks, setBookmarks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedCandidate, setSelectedCandidate] = useState(null);
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [connectionByUserId, setConnectionByUserId] = useState({});
    const [sendingFriendTo, setSendingFriendTo] = useState('');
    const [isMobileView, setIsMobileView] = useState(() => (
        typeof window !== 'undefined' ? window.innerWidth <= 768 : false
    ));
    const containerRef = useRef(null);

    useEffect(() => {
        fetchBookmarks();
        fetchConnections();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [userId]);

    useEffect(() => {
        const handleResize = () => setIsMobileView(window.innerWidth <= 768);

        handleResize();
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

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
        return (
            <div className="candidate-profile bookmarked-candidate-profile">
                <div className="candidate-profile-header">
                    <div className="candidate-profile-back">
                        <button onClick={() => setSelectedCandidate(null)} className="back-button">Back to Bookmarked Candidates</button>
                    </div>
                    <div className="candidate-header-info">
                        <div className="candidate-initial">{selectedCandidate.name ? selectedCandidate.name.charAt(0).toUpperCase() : 'C'}</div>
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
                        <div className="skills-container">
                            {getSkillList(selectedCandidate.skills).length > 0
                                ? getSkillList(selectedCandidate.skills).map((skill, index) => <span key={index} className="skill-tag">{skill}</span>)
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
            <div className="talent-pool-header">
                <h2>Bookmarked Candidates</h2>
            </div>

            {message && <div className={`notification-message ${message.includes('Error') ? 'error' : 'success'}`}>{message}</div>}
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
                            <div key={bookmark._id} className="candidate-card" onClick={() => setSelectedCandidate(candidate)}>
                                <div className="candidate-connection-corner-anchor">
                                    <button
                                        type="button"
                                        className={`candidate-connection-corner-button ${connection?.status || 'is-new'}`}
                                        onClick={(event) => sendFriendRequest(candidate, event)}
                                        disabled={sendingFriendTo === String(candidate._id) || connection?.status === 'accepted' || (connection?.status === 'pending' && connection.direction !== 'outgoing')}
                                        aria-label={connection?.status === 'accepted' ? 'Already friends' : connection?.status === 'pending' ? (connection.direction === 'outgoing' ? 'Unsend friend invitation' : 'Friend invitation pending') : `Add ${candidate.name || 'candidate'} as a friend`}
                                        title={connection?.status === 'accepted' ? 'Friends' : connection?.status === 'pending' ? (connection.direction === 'outgoing' ? 'Unsend invitation' : 'Invitation pending') : 'Add friend'}
                                    >
                                        {connection?.status === 'accepted' ? (
                                            <span className="candidate-connection-corner-state" aria-hidden="true">&#10003;</span>
                                        ) : connection?.status === 'pending' ? (
                                            <span className="candidate-connection-corner-state" aria-hidden="true">&#8230;</span>
                                        ) : (
                                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="candidate-connection-corner-icon" aria-hidden="true">
                                                <path d="M12 22C17.5 22 22 17.5 22 12C22 6.5 17.5 2 12 2C6.5 2 2 6.5 2 12C2 17.5 6.5 22 12 22Z" strokeWidth="1.5"></path>
                                                <path d="M8 12H16" strokeWidth="1.5"></path>
                                                <path d="M12 16V8" strokeWidth="1.5"></path>
                                            </svg>
                                        )}
                                    </button>
                                </div>
                                <button type="button" className="bookmark-star-button active talent-bookmark-button" onClick={(event) => { event.stopPropagation(); removeBookmark(candidate._id); }} />
                                <div className="candidate-avatar">{candidate.name ? candidate.name.charAt(0).toUpperCase() : 'C'}</div>
                                <div className="candidate-info">
                                    <h3 className="candidate-name">{candidate.name || 'Unnamed Candidate'}</h3>
                                    <p className="candidate-email">Saved candidate profile</p>
                                </div>
                                <div className="candidate-view-profile">View Profile</div>
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

            <div className="page-footer-actions">
                <button className="back-button" onClick={onFooterBack || onBack}>Back</button>
            </div>
        </div>
    );
};

export default BookmarkedCandidates;
