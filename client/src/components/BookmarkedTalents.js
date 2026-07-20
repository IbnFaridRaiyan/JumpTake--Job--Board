import React, { useEffect, useRef, useState } from 'react';
import ContactCandidate from './ContactCandidate';
import ProfileAvatar from './ProfileAvatar';
import confirmAction from '../utils/confirmAction';
import PortalPageSkeleton from './PortalPageSkeleton';

const BookmarkedTalents = ({ companyId, onBack, onFooterBack }) => {
    const [bookmarks, setBookmarks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedCandidate, setSelectedCandidate] = useState(null);
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const [likedCandidateIds, setLikedCandidateIds] = useState([]);
    const [candidateLikeCounts, setCandidateLikeCounts] = useState({});
    const containerRef = useRef(null);

    useEffect(() => {
        fetchBookmarks();
        fetchCandidateLikes();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [companyId]);


    const fetchBookmarks = async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem('employerToken');
            const response = await fetch(`${process.env.REACT_APP_API_URL || ''}/api/talent-bookmarks/company/${companyId}`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) {
                throw new Error('Failed to fetch bookmarked talents');
            }

            const data = await response.json();
            setBookmarks(Array.isArray(data) ? data.filter((bookmark) => bookmark.candidate) : []);
            setError('');
        } catch (bookmarkError) {
            console.error('Error fetching bookmarked talents:', bookmarkError);
            setError('Failed to load bookmarked talents. Please try again later.');
        } finally {
            setLoading(false);
        }
    };

    const removeBookmark = async (candidateId) => {
        const confirmed = await confirmAction({
            title: 'Remove bookmark?',
            message: 'Remove this talent from your bookmarks?'
        });
        if (!confirmed) {
            return;
        }

        try {
            const token = localStorage.getItem('employerToken');
            const response = await fetch(`${process.env.REACT_APP_API_URL || ''}/api/talent-bookmarks/company/${companyId}/candidate/${candidateId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) {
                throw new Error('Failed to remove bookmarked talent');
            }

            setBookmarks((prevState) => prevState.filter((bookmark) => String(bookmark.candidate?._id) !== String(candidateId)));
            setMessage('Bookmarked talent removed successfully.');
            setTimeout(() => setMessage(''), 2500);
        } catch (removeError) {
            console.error('Error removing bookmarked talent:', removeError);
            setMessage(`Error: ${removeError.message}`);
        }
    };

    const fetchCandidateLikes = async () => {
        if (!companyId) {
            return;
        }

        try {
            const params = new URLSearchParams({
                actorType: 'employer',
                actorKey: String(companyId)
            });
            const response = await fetch(`${process.env.REACT_APP_API_URL || ''}/api/candidate-likes?${params.toString()}`, {
                headers: { Authorization: `Bearer ${localStorage.getItem('employerToken')}` }
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
            console.error('Error fetching bookmarked talent likes:', likeError);
        }
    };

    const toggleCandidateLike = async (candidate, event) => {
        event.stopPropagation();
        if (!candidate?._id || !companyId) {
            return;
        }

        try {
            const response = await fetch(`${process.env.REACT_APP_API_URL || ''}/api/candidate-likes/toggle`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${localStorage.getItem('employerToken')}`
                },
                body: JSON.stringify({
                    candidateId: candidate._id,
                    actorType: 'employer',
                    actorKey: String(companyId)
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

    const renderList = (items, emptyMessage) => {
        if (!items || (Array.isArray(items) && items.length === 0)) {
            return <p className="empty-info">{emptyMessage}</p>;
        }

        return (
            <ul className="profile-list">
                {items.map((item, index) => <li key={index}>{typeof item === 'object' ? Object.values(item).filter(Boolean).join(' - ') : item}</li>)}
            </ul>
        );
    };

    if (selectedCandidate) {
        return (
            <div className="candidate-profile">
                <div className="candidate-profile-header">
                    <div className="candidate-profile-back">
                        <button onClick={() => setSelectedCandidate(null)} className="back-button">Back to Bookmarked Talents</button>
                    </div>
                    <div className="candidate-header-info">
                        <ProfileAvatar imageSrc={selectedCandidate.profileImage} name={selectedCandidate.name} className="candidate-initial" imageClassName="profile-avatar-image" />
                        <div className="candidate-header-text">
                            <h2>{selectedCandidate.name || 'Unnamed Candidate'}</h2>
                            <p>{selectedCandidate.user?.jumptakeId || selectedCandidate.jumptakeId || 'JumpTake ID unavailable'}</p>
                        </div>
                    </div>
                </div>
                <div className="candidate-profile-body">
                    <ContactCandidate companyId={companyId} candidate={selectedCandidate} />

                    <div className="profile-section"><h3>Skills</h3><div className="skills-container">{Array.isArray(selectedCandidate.skills) && selectedCandidate.skills.length > 0 ? selectedCandidate.skills.map((skill, index) => <span key={index} className="skill-tag">{skill}</span>) : <p>No skills listed</p>}</div></div>
                    <div className="profile-section"><h3>Education</h3>{renderList(selectedCandidate.education, 'No education information available')}</div>
                    <div className="profile-section"><h3>Experience</h3>{renderList(selectedCandidate.experience, 'No experience information available')}</div>
                    <div className="section-footer-nav"><button className="back-button" onClick={() => setSelectedCandidate(null)}>Back</button></div>
                </div>
            </div>
        );
    }

    return (
        <div ref={containerRef} className="talent-pool-container">
            <div className="talent-pool-header">
                <h2>Bookmarked Talents</h2>
            </div>

            {message.includes('Error') && <div className="notification-message error">{message}</div>}
            {error && <div className="error-message">{error}</div>}

            {loading ? (
                <PortalPageSkeleton compact label="Loading bookmarked talents" />
            ) : bookmarks.length === 0 ? (
                <div className="no-candidates"><h3>No bookmarked talents yet</h3><p>Star candidate cards in Talent Pool to keep them here.</p></div>
            ) : (
                <div className="candidates-grid">
                    {bookmarks.map((bookmark) => {
                        const candidate = bookmark.candidate;
                        return (
                            <div key={bookmark._id} className="candidate-card uiverse-profile-card" onClick={() => setSelectedCandidate(candidate)}>
                                <ProfileAvatar imageSrc={candidate.profileImage} name={candidate.name} className="candidate-avatar profileimage" imageClassName="profile-avatar-image" useProfileIconFallback />
                                <div className="candidate-info">
                                    <h3 className="candidate-name Name">{candidate.name || 'Unnamed Candidate'}</h3>
                                    <p className="candidate-email">{candidate.user?.jumptakeId || candidate.jumptakeId || 'JumpTake ID unavailable'}</p>
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
                                    <button type="button" className="candidate-card-action candidate-card-message-action" onClick={(event) => { event.stopPropagation(); setSelectedCandidate(candidate); }} aria-label="Message candidate" title="Message candidate">
                                        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 4h16a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H8l-5 4v-4H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Zm0 2v10h1v1.84L7.3 16H20V6H4Z" /></svg>
                                    </button>
                                    <button type="button" className="bookmark-star-button active talent-bookmark-button candidate-card-action" onClick={(event) => { event.stopPropagation(); removeBookmark(candidate._id); }} aria-label="Remove bookmarked talent" title="Remove bookmark">
                                        <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M3.612 15.443c-.386.198-.824-.149-.746-.592l.83-4.73L.173 6.765c-.329-.314-.158-.888.283-.95l4.898-.696L7.538.792c.197-.39.73-.39.927 0l2.184 4.327 4.898.696c.441.062.612.636.282.95l-3.522 3.356.83 4.73c.078.443-.36.79-.746.592L8 13.187z" /></svg>
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            <div className="page-footer-actions">
                <button className="back-button" onClick={onFooterBack || onBack}>Back</button>
            </div>
        </div>
    );
};

export default BookmarkedTalents;
