import React, { useMemo, useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import ProfileAvatar from './ProfileAvatar';
import defaultTailorCoverImage from './media/default-tailor-cover.png';
import defaultProfileMale from './media/default-profile-male.png';
import defaultProfileFemale from './media/default-profile-female.png';

const WORK_NEWS_STORAGE_KEY = 'jumptakeWorkNewsPosts';
const TALENT_STORIES_STORAGE_KEY = 'jumptakeTalentStoriesPosts';

const TalentPool = ({ jobs = [], companyId, onBack, onFooterBack, mode = 'employer', currentUserId }) => {
    const [candidates, setCandidates] = useState([]);
    const [bookmarkedTalentIds, setBookmarkedTalentIds] = useState([]);
    const [likedCandidateIds, setLikedCandidateIds] = useState([]);
    const [candidateLikeCounts, setCandidateLikeCounts] = useState({});
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCandidate, setSelectedCandidate] = useState(null);
    const [spotlightActive, setSpotlightActive] = useState(false);
    const [currentCandidatePage, setCurrentCandidatePage] = useState(1);
    const [showAddFriend, setShowAddFriend] = useState(false);
    const [friendJumpTakeId, setFriendJumpTakeId] = useState('');
    const [friendNotice, setFriendNotice] = useState('');
    const [sendingFriendRequest, setSendingFriendRequest] = useState(false);
    const [isMobileView, setIsMobileView] = useState(() => (
        typeof window !== 'undefined' ? window.innerWidth <= 768 : false
    ));
    const candidateProfileRef = useRef(null);
    const talentPoolRef = useRef(null);

    useEffect(() => {
        fetchCandidates();
        if (mode === 'employer') {
            fetchBookmarkedTalents();
        } else {
            fetchBookmarkedCandidates();
        }
        fetchCandidateLikes();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [companyId, mode, currentUserId]);

    useEffect(() => {
        const talentSearchKey = mode === 'candidate' ? 'jumptakeCandidateTalentSearch' : 'jumptakeEmployerTalentSearch';
        const dashboardSearch = sessionStorage.getItem(talentSearchKey);
        if (dashboardSearch) {
            setSearchTerm(dashboardSearch);
            sessionStorage.removeItem(talentSearchKey);
        }
    }, [mode]);

    useEffect(() => {
        const handleResize = () => setIsMobileView(window.innerWidth <= 768);

        handleResize();
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const fetchCandidates = async () => {
        try {
            setIsLoading(true);
            const token = localStorage.getItem(mode === 'candidate' ? 'token' : 'employerToken');
            const endpoint = mode === 'candidate'
                ? `/api/candidate-network/matches/${currentUserId}`
                : '/api/job-seekers';
            const response = await fetch((process.env.REACT_APP_API_URL || '') + endpoint, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) {
                throw new Error('Failed to fetch candidates');
            }

            const data = await response.json();
            const nextCandidates = Array.isArray(data) ? data : [];
            setCandidates(nextCandidates);
        } catch (err) {
            console.error('Error fetching candidates:', err);
            setError('Failed to load candidates. Please try again later.');
        } finally {
            setIsLoading(false);
        }
    };

    const fetchBookmarkedTalents = async () => {
        if (!companyId) {
            setBookmarkedTalentIds([]);
            return;
        }

        try {
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
            const bookmarkedIds = (Array.isArray(data) ? data : [])
                .map((bookmark) => bookmark?.candidate?._id || bookmark?.candidate)
                .filter(Boolean)
                .map((candidateId) => String(candidateId));

            setBookmarkedTalentIds(bookmarkedIds);
        } catch (bookmarkError) {
            console.error('Error fetching bookmarked talents:', bookmarkError);
        }
    };

    const fetchBookmarkedCandidates = async () => {
        if (!currentUserId) {
            setBookmarkedTalentIds([]);
            return;
        }

        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${process.env.REACT_APP_API_URL || ''}/api/candidate-bookmarks/user/${currentUserId}`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) {
                throw new Error('Failed to fetch bookmarked candidates');
            }

            const data = await response.json();
            const bookmarkedIds = (Array.isArray(data) ? data : [])
                .map((bookmark) => bookmark?.candidate?._id || bookmark?.candidate)
                .filter(Boolean)
                .map((candidateId) => String(candidateId));

            setBookmarkedTalentIds(bookmarkedIds);
        } catch (bookmarkError) {
            console.error('Error fetching bookmarked candidates:', bookmarkError);
        }
    };

    const getActorKey = () => (mode === 'employer' ? companyId : currentUserId);

    const fetchCandidateLikes = async () => {
        const actorKey = getActorKey();

        if (!actorKey) {
            setLikedCandidateIds([]);
            return;
        }

        try {
            const token = localStorage.getItem(mode === 'candidate' ? 'token' : 'employerToken');
            const params = new URLSearchParams({
                actorType: mode === 'employer' ? 'employer' : 'candidate',
                actorKey: String(actorKey)
            });
            const response = await fetch(`${process.env.REACT_APP_API_URL || ''}/api/candidate-likes?${params.toString()}`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) {
                throw new Error('Failed to fetch candidate likes');
            }

            const data = await response.json();
            const counts = {};
            (data.counts || []).forEach((item) => {
                counts[String(item.candidateId)] = item.count;
            });

            setCandidateLikeCounts(counts);
            setLikedCandidateIds((data.likedCandidateIds || []).map((candidateId) => String(candidateId)));
        } catch (likeError) {
            console.error('Error fetching candidate likes:', likeError);
        }
    };

    const handleViewProfile = (candidate) => {
        setSelectedCandidate(candidate);
    };

    useEffect(() => {
        if (!selectedCandidate) {
            return;
        }

        const resetProfileScroll = () => {
            const profileNode = candidateProfileRef.current;
            if (!profileNode) {
                return;
            }

            profileNode.scrollTop = 0;
            const scrollParent = profileNode.closest('.mobile-dashboard-section-panel, .dashboard-content, .main-content, .content-area');
            if (scrollParent) {
                scrollParent.scrollTop = 0;
            }
            profileNode.scrollIntoView({ block: 'start', behavior: 'auto' });
        };

        requestAnimationFrame(resetProfileScroll);
    }, [selectedCandidate]);

    const handleCloseProfile = () => {
        setSelectedCandidate(null);
    };

    const getCandidateJumpTakeId = (candidate) => (
        candidate?.jumptakeId
        || candidate?.jumpTakeId
        || candidate?.user?.jumptakeId
        || '@JumpTakeID'
    );

    const getCandidateCoverStyle = (candidate) => ({
        '--candidate-profile-cover': candidate?.coverImage
            ? `url("${candidate.coverImage}")`
            : 'linear-gradient(135deg, #4f1224 0%, #7d3044 100%)'
    });

    const getCandidateDefaultProfileImage = (candidate) => (
        String(candidate?.gender || candidate?.profile?.gender || '').toLowerCase().startsWith('f')
            ? defaultProfileFemale
            : defaultProfileMale
    );

    const changeCandidatePage = (nextPage) => {
        setCurrentCandidatePage(nextPage);
        window.requestAnimationFrame(() => {
            const scrollParent = talentPoolRef.current?.closest('.mobile-dashboard-section-panel, .main-content');
            if (scrollParent) {
                scrollParent.scrollTop = 0;
            }
            talentPoolRef.current?.scrollIntoView({ block: 'start', behavior: 'auto' });
        });
    };

    const toggleTalentBookmark = async (candidate, event) => {
        if (event) {
            event.stopPropagation();
        }

        const actorKey = mode === 'employer' ? companyId : currentUserId;

        if (!candidate?._id || !actorKey) {
            return;
        }

        const isBookmarked = bookmarkedTalentIds.includes(String(candidate._id));
        const token = localStorage.getItem(mode === 'candidate' ? 'token' : 'employerToken');

        try {
            if (isBookmarked) {
                const removeUrl = mode === 'employer'
                    ? `/api/talent-bookmarks/company/${companyId}/candidate/${candidate._id}`
                    : `/api/candidate-bookmarks/user/${currentUserId}/candidate/${candidate._id}`;
                const response = await fetch(`${process.env.REACT_APP_API_URL || ''}${removeUrl}`, {
                    method: 'DELETE',
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });

                if (!response.ok) {
                    throw new Error('Failed to remove talent bookmark');
                }

                setBookmarkedTalentIds((prevState) => prevState.filter((candidateId) => candidateId !== String(candidate._id)));
            } else {
                const createUrl = mode === 'employer' ? '/api/talent-bookmarks' : '/api/candidate-bookmarks';
                const response = await fetch(`${process.env.REACT_APP_API_URL || ''}${createUrl}`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify(mode === 'employer'
                        ? { companyId, candidateId: candidate._id }
                        : { userId: currentUserId, candidateId: candidate._id })
                });

                if (!response.ok) {
                    throw new Error('Failed to bookmark talent');
                }

                setBookmarkedTalentIds((prevState) => [...new Set([...prevState, String(candidate._id)])]);
            }
        } catch (bookmarkError) {
            console.error('Error toggling talent bookmark:', bookmarkError);
        }
    };

    const toggleCandidateLike = async (candidate, event) => {
        if (event) {
            event.stopPropagation();
        }

        const actorKey = getActorKey();
        if (!candidate?._id || !actorKey) {
            return;
        }

        try {
            const token = localStorage.getItem(mode === 'candidate' ? 'token' : 'employerToken');
            const response = await fetch(`${process.env.REACT_APP_API_URL || ''}/api/candidate-likes/toggle`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    candidateId: candidate._id,
                    actorType: mode === 'employer' ? 'employer' : 'candidate',
                    actorKey: String(actorKey)
                })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to update like');
            }

            setCandidateLikeCounts((prevCounts) => ({
                ...prevCounts,
                [String(candidate._id)]: data.count
            }));

            setLikedCandidateIds((prevIds) => (
                data.liked
                    ? [...new Set([...prevIds, String(candidate._id)])]
                    : prevIds.filter((candidateId) => candidateId !== String(candidate._id))
            ));
        } catch (likeError) {
            console.error('Error toggling candidate like:', likeError);
        }
    };

    const sendFriendRequest = async ({ candidateId, jumptakeId } = {}) => {
        try {
            setSendingFriendRequest(true);
            setFriendNotice('');
            const response = await fetch(`${process.env.REACT_APP_API_URL || ''}/api/candidate-connections/request`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify(
                    jumptakeId
                        ? { jumptakeId: jumptakeId.trim() }
                        : { recipientCandidateId: candidateId }
                )
            });
            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.error || 'Failed to send friend invitation');
            }

            setFriendNotice('Friend invitation sent.');
            setFriendJumpTakeId('');
            if (candidateId) {
                setCandidates((currentCandidates) => currentCandidates.map((candidate) => (
                    String(candidate._id) === String(candidateId)
                        ? {
                            ...candidate,
                            connectionStatus: {
                                id: data.connection?._id,
                                status: 'pending',
                                direction: 'outgoing'
                            }
                        }
                        : candidate
                )));
            } else {
                setShowAddFriend(false);
            }
        } catch (friendError) {
            setFriendNotice(`Error: ${friendError.message}`);
        } finally {
            setSendingFriendRequest(false);
        }
    };

    const cancelFriendRequest = async (candidate) => {
        const connectionId = candidate.connectionStatus?.id;
        if (!connectionId || candidate.connectionStatus?.direction !== 'outgoing') {
            return;
        }

        try {
            setSendingFriendRequest(true);
            setFriendNotice('');
            const response = await fetch(`${process.env.REACT_APP_API_URL || ''}/api/candidate-connections/${connectionId}/respond`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({ action: 'cancel' })
            });
            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.error || 'Failed to cancel friend invitation');
            }

            setCandidates((currentCandidates) => currentCandidates.map((currentCandidate) => (
                String(currentCandidate._id) === String(candidate._id)
                    ? { ...currentCandidate, connectionStatus: null }
                    : currentCandidate
            )));
            setFriendNotice('Friend invitation cancelled.');
        } catch (friendError) {
            setFriendNotice(`Error: ${friendError.message}`);
        } finally {
            setSendingFriendRequest(false);
        }
    };

    const renderLikeButton = (candidate) => {
        const candidateId = String(candidate._id);
        const isLiked = likedCandidateIds.includes(candidateId);

        return (
            <button
                type="button"
                className={`candidate-like-button ${isLiked ? 'active' : ''}`}
                onClick={(event) => toggleCandidateLike(candidate, event)}
                aria-label={isLiked ? 'Unlike candidate' : 'Like candidate'}
            >
                <span className="candidate-like-count">{candidateLikeCounts[candidateId] || 0}</span>
                <span className="like-animation-wrap">
                    <input type="checkbox" checked={isLiked} readOnly tabIndex="-1" />
                    <svg className="celebrate" width="34" height="34" viewBox="0 0 100 100" aria-hidden="true">
                        <polygon points="10,10 20,20"></polygon>
                        <polygon points="80,10 70,20"></polygon>
                        <polygon points="50,5 50,18"></polygon>
                        <polygon points="10,80 22,72"></polygon>
                        <polygon points="90,80 78,72"></polygon>
                    </svg>
                    <svg className="like" width="24" height="24" viewBox="0 0 24 24" aria-hidden="true">
                        <path d="M7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3v11Zm2 0V11l4.7-8.5c.5-.9 1.8-.6 1.9.4l.3 3.1c.1 1-.2 2-.8 2.8h4.1c1.8 0 3.1 1.7 2.7 3.4l-1.4 6.6A4 4 0 0 1 16.6 22H9Z" />
                    </svg>
                </span>
            </button>
        );
    };

    const renderFriendButton = (candidate, compact = false) => (
        mode === 'candidate' && (
            <button
                type="button"
                className={`candidate-card-action candidate-card-friend-action ${compact ? 'candidate-profile-mini-icon' : ''} ${candidate.connectionStatus?.status || 'is-new'}`}
                onClick={(event) => {
                    event.stopPropagation();
                    if (!candidate.connectionStatus) {
                        sendFriendRequest({ candidateId: candidate._id });
                    } else if (candidate.connectionStatus.status === 'pending' && candidate.connectionStatus.direction === 'outgoing') {
                        cancelFriendRequest(candidate);
                    }
                }}
                disabled={sendingFriendRequest || candidate.connectionStatus?.status === 'accepted' || (candidate.connectionStatus?.status === 'pending' && candidate.connectionStatus?.direction !== 'outgoing')}
                aria-label={candidate.connectionStatus?.status === 'accepted' ? 'Already friends' : candidate.connectionStatus?.status === 'pending' ? 'Friend invitation pending' : 'Add friend'}
                title={candidate.connectionStatus?.status === 'accepted' ? 'Friends' : candidate.connectionStatus?.status === 'pending' ? 'Invitation pending' : 'Add friend'}
            >
                <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M15 12a5 5 0 1 0-5-5 5 5 0 0 0 5 5Zm0 2c-4.42 0-8 2.24-8 5v1h10.1A6.9 6.9 0 0 1 17 19c0-1.85.72-3.54 1.9-4.8A11.7 11.7 0 0 0 15 14Zm6-3V8h-2v3h-3v2h3v3h2v-3h3v-2h-3Z" />
                </svg>
            </button>
        )
    );

    const renderMessageButton = (candidate, compact = false) => (
        <button
            type="button"
            className={`candidate-card-action candidate-card-message-action ${compact ? 'candidate-profile-mini-icon' : ''}`}
            onClick={(event) => {
                event.stopPropagation();
                handleViewProfile(candidate);
            }}
            aria-label={`Message ${candidate.name || 'candidate'}`}
            title="Message candidate"
        >
            <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M4 4h16a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H8l-5 4v-4H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Zm0 2v10h1v1.84L7.3 16H20V6H4Z" />
            </svg>
        </button>
    );

    const renderBookmarkButton = (candidate, compact = false) => (
        <button
            type="button"
            className={`bookmark-star-button talent-bookmark-button candidate-card-action ${compact ? 'candidate-profile-mini-icon' : ''} ${bookmarkedTalentIds.includes(String(candidate._id)) ? 'active' : ''}`}
            onClick={(event) => toggleTalentBookmark(candidate, event)}
            aria-label={bookmarkedTalentIds.includes(String(candidate._id)) ? 'Remove bookmark' : 'Bookmark talent'}
            title={bookmarkedTalentIds.includes(String(candidate._id)) ? 'Remove bookmark' : 'Bookmark'}
        >
            <svg viewBox="0 0 16 16" aria-hidden="true">
                <path d="M3.612 15.443c-.386.198-.824-.149-.746-.592l.83-4.73L.173 6.765c-.329-.314-.158-.888.283-.95l4.898-.696L7.538.792c.197-.39.73-.39.927 0l2.184 4.327 4.898.696c.441.062.612.636.282.95l-3.522 3.356.83 4.73c.078.443-.36.79-.746.592L8 13.187z" />
            </svg>
        </button>
    );

    const renderTailorSocialIcon = (platform) => {
        const paths = {
            facebook: 'M22.675 0H1.325C.593 0 0 .593 0 1.326v21.348C0 23.407.593 24 1.325 24h11.494v-9.294H9.691v-3.622h3.128V8.413c0-3.1 1.893-4.788 4.659-4.788 1.325 0 2.464.099 2.795.143v3.24l-1.918.001c-1.504 0-1.795.715-1.795 1.763v2.312h3.587l-.467 3.622h-3.12V24h6.116C23.407 24 24 23.407 24 22.674V1.326C24 .593 23.407 0 22.675 0z',
            instagram: 'M16.98 0a6.9 6.9 0 0 1 5.08 1.98A6.94 6.94 0 0 1 24 7.02v9.96c0 2.08-.68 3.87-1.98 5.13A7.14 7.14 0 0 1 16.94 24H7.06a7.06 7.06 0 0 1-5.03-1.89A6.96 6.96 0 0 1 0 16.94V7.02C0 2.8 2.8 0 7.02 0h9.96zm.05 2.23H7.06c-1.45 0-2.7.43-3.53 1.25a4.82 4.82 0 0 0-1.3 3.54v9.92c0 1.5.43 2.7 1.3 3.58a5 5 0 0 0 3.53 1.25h9.88a5 5 0 0 0 3.53-1.25 4.73 4.73 0 0 0 1.4-3.54V7.02a5 5 0 0 0-1.3-3.49 4.82 4.82 0 0 0-3.54-1.3zM12 5.76c3.39 0 6.2 2.8 6.2 6.2a6.2 6.2 0 0 1-12.4 0 6.2 6.2 0 0 1 6.2-6.2zm0 2.22a3.99 3.99 0 0 0-3.97 3.97A3.99 3.99 0 0 0 12 15.92a3.99 3.99 0 0 0 3.97-3.97A3.99 3.99 0 0 0 12 7.98z',
            linkedin: 'M22.23 0H1.77C.8 0 0 .8 0 1.77v20.46C0 23.2.8 24 1.77 24h20.46c.98 0 1.77-.8 1.77-1.77V1.77C24 .8 23.2 0 22.23 0zM7.27 20.1H3.65V9.24h3.62V20.1zM5.47 7.76h-.03c-1.22 0-2-.83-2-1.87 0-1.06.8-1.87 2.05-1.87 1.24 0 2 .8 2.02 1.87 0 1.04-.78 1.87-2.05 1.87zM20.34 20.1h-3.63v-5.8c0-1.45-.52-2.45-1.83-2.45-1 0-1.6.67-1.87 1.32-.1.23-.11.55-.11.88v6.05H9.28s.05-9.82 0-10.84h3.63v1.54a3.6 3.6 0 0 1 3.26-1.8c2.39 0 4.18 1.56 4.18 4.89v6.21z',
            github: 'M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z'
        };

        return (
            <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                <path d={paths[platform]} />
            </svg>
        );
    };

    const renderCandidateProfileCard = (candidate, { compact = false } = {}) => {
        const candidateId = String(candidate?._id || '');
        const storiesCount = getCandidateTalentStories(candidate).length;
        const likeCount = candidateLikeCounts[candidateId] || 0;

        return (
            <div className={`candidate-profile-mini-card ${compact ? 'is-compact' : 'is-modal-card'}`} style={getCandidateCoverStyle(candidate)}>
                <div className="candidate-profile-mini-cover" />
                <ProfileAvatar
                    imageSrc={candidate.profileImage}
                    name={candidate.name}
                    className="candidate-profile-mini-avatar"
                    imageClassName="profile-avatar-image"
                    useProfileIconFallback
                />
                <div className="candidate-profile-mini-info">
                    <h3>{candidate.name || 'Unnamed Candidate'}</h3>
                    <p>{getCandidateJumpTakeId(candidate)}</p>
                </div>
                <div className="candidate-profile-mini-actions" onClick={(event) => event.stopPropagation()}>
                    {renderLikeButton(candidate)}
                    {renderFriendButton(candidate, true)}
                    {renderBookmarkButton(candidate, true)}
                    {renderMessageButton(candidate, true)}
                </div>
                <button
                    type="button"
                    className="candidate-profile-mini-message"
                    onClick={(event) => {
                        event.stopPropagation();
                        handleViewProfile(candidate);
                    }}
                >
                    Message
                </button>
                <div className="candidate-profile-mini-stats">
                    <span>
                        <strong>{likeCount}</strong>
                        <small>Like</small>
                    </span>
                    <span>
                        <strong>{storiesCount}</strong>
                        <small>Posts</small>
                    </span>
                    <span>
                        <strong>{Number(candidate.rating || 0).toFixed(1)}</strong>
                        <small>Rating</small>
                    </span>
                </div>
            </div>
        );
    };

    const normalizeSkill = (skill) => String(skill || '').trim().toLowerCase();

    const getSkillList = (skills) => {
        if (Array.isArray(skills)) {
            return skills.map(skill => String(skill).trim()).filter(Boolean);
        }

        if (typeof skills === 'string') {
            return skills.split(',').map(skill => skill.trim()).filter(Boolean);
        }

        return [];
    };

    const valuesToSearch = (value) => {
        if (!value) {
            return [];
        }
        if (Array.isArray(value)) {
            return value.flatMap(valuesToSearch);
        }
        if (typeof value === 'object') {
            return Object.values(value).flatMap(valuesToSearch);
        }
        return [String(value)];
    };

    const jobSkillMap = useMemo(() => {
        const skillMap = new Map();

        jobs.forEach(job => {
            getSkillList(job.skills).forEach(skill => {
                const normalized = normalizeSkill(skill);
                if (!normalized) {
                    return;
                }

                const existing = skillMap.get(normalized) || {
                    name: skill,
                    jobTitles: new Set()
                };

                existing.jobTitles.add(job.title || 'Untitled Job');
                skillMap.set(normalized, existing);
            });
        });

        return skillMap;
    }, [jobs]);

    const getSpotlightMatch = (candidate) => {
        const candidateSkills = getSkillList(candidate.skills);
        const candidateSkillSet = new Set(candidateSkills.map(normalizeSkill));
        const matchedSkills = [];
        const matchedJobs = new Set();

        jobSkillMap.forEach((skillInfo, normalizedSkill) => {
            if (candidateSkillSet.has(normalizedSkill)) {
                matchedSkills.push(skillInfo.name);
                skillInfo.jobTitles.forEach(title => matchedJobs.add(title));
            }
        });

        return {
            score: matchedSkills.length,
            matchedSkills,
            matchedJobs: Array.from(matchedJobs)
        };
    };

    const candidateRows = candidates
        .map(candidate => ({
            candidate,
            spotlight: getSpotlightMatch(candidate)
        }))
        .filter(row => !spotlightActive || row.spotlight.score > 0)
        .sort((a, b) => {
            if (!spotlightActive) {
                return 0;
            }

            if (b.spotlight.score !== a.spotlight.score) {
                return b.spotlight.score - a.spotlight.score;
            }

            return (a.candidate.name || '').localeCompare(b.candidate.name || '');
        });

    const filteredCandidateRows = candidateRows.filter(({ candidate, spotlight }) => {
        const searchLower = searchTerm.toLowerCase();

        const searchablePublicProfile = [
            ...getSkillList(candidate.skills),
            ...valuesToSearch(candidate.education),
            ...valuesToSearch(candidate.experience)
        ].join(' ').toLowerCase();

        const matchesSearch =
            (candidate.name && candidate.name.toLowerCase().includes(searchLower)) ||
            searchablePublicProfile.includes(searchLower) ||
            (spotlightActive && spotlight.matchedSkills.some(skill =>
                skill.toLowerCase().includes(searchLower)
            ));
            
        return matchesSearch;
    });
    const candidatesPerPage = isMobileView ? 6 : 9;
    const totalCandidatePages = Math.max(1, Math.ceil(filteredCandidateRows.length / candidatesPerPage));
    const pagedCandidateRows = filteredCandidateRows.slice(
        (currentCandidatePage - 1) * candidatesPerPage,
        currentCandidatePage * candidatesPerPage
    );

    useEffect(() => {
        setCurrentCandidatePage(1);
    }, [searchTerm, spotlightActive, isMobileView, filteredCandidateRows.length]);

    useEffect(() => {
        if (currentCandidatePage > totalCandidatePages) {
            setCurrentCandidatePage(totalCandidatePages);
        }
    }, [currentCandidatePage, totalCandidatePages]);

    const readCandidateStoredPosts = (storageKey) => {
        try {
            const storedPosts = JSON.parse(localStorage.getItem(storageKey) || '[]');
            return Array.isArray(storedPosts) ? storedPosts : [];
        } catch (error) {
            return [];
        }
    };

    const getCandidateProfilePosts = (candidate) => {
        const candidateIds = [
            candidate?._id,
            candidate?.id,
            candidate?.user,
            candidate?.userId,
            candidate?.candidateId
        ].map((value) => String(value || '')).filter(Boolean);
        const candidateName = String(candidate?.name || '').trim().toLowerCase();
        const matchesCandidate = (post) => (
            candidateIds.includes(String(post?.authorId || ''))
            || candidateIds.includes(String(post?.candidateId || ''))
            || String(post?.authorName || '').trim().toLowerCase() === candidateName
        );

        return [
            ...readCandidateStoredPosts(WORK_NEWS_STORAGE_KEY).filter(matchesCandidate).map((post) => ({ ...post, storageKey: WORK_NEWS_STORAGE_KEY, feedType: 'Work News' })),
            ...readCandidateStoredPosts(TALENT_STORIES_STORAGE_KEY).filter(matchesCandidate).map((post) => ({ ...post, storageKey: TALENT_STORIES_STORAGE_KEY, feedType: 'Talent story' }))
        ].sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
    };

    const getCandidateTalentStories = (candidate) => (
        getCandidateProfilePosts(candidate).filter((post) => post.storageKey === TALENT_STORIES_STORAGE_KEY)
    );

    const renderCandidateProfilePostCard = (post, candidate) => (
        <article className="portal-social-post-card candidate-profile-home-post-card" key={post.id || post._id || `${post.feedType}-${post.createdAt || post.body}`}>
            <div className="portal-post-card-header">
                <ProfileAvatar
                    imageSrc={post.authorAvatar || candidate.profileImage}
                    name={post.authorName || candidate.name}
                    className="portal-post-author-avatar"
                    imageClassName="profile-avatar-image"
                    useProfileIconFallback
                />
                <div className="portal-post-author-copy">
                    <strong>{post.authorName || candidate.name || 'Candidate'}</strong>
                    <span>{post.feedType || 'Talent story'} - {post.createdAt ? new Date(post.createdAt).toLocaleDateString() : 'Recent'}</span>
                </div>
            </div>
            <button type="button" className="portal-post-reach portal-reach-button">
                {Number(post.reach || 0) || 0} reach
            </button>
            <p className="portal-post-body">{post.body || post.text || post.content || 'Talent story post'}</p>
        </article>
    );

    const renderSelectedCandidateModal = () => {
        if (!selectedCandidate) {
            return null;
        }

        const candidateId = String(selectedCandidate._id || selectedCandidate.id || '');
        const profilePosts = getCandidateProfilePosts(selectedCandidate);
        const likeCount = candidateLikeCounts[candidateId] || 0;
        const isBookmarked = bookmarkedTalentIds.includes(candidateId);
        const socialPlatforms = ['facebook', 'instagram', 'linkedin', 'github'];
        const socialLinks = {
            facebook: selectedCandidate.facebook || selectedCandidate.socialLinks?.facebook || '',
            instagram: selectedCandidate.instagram || selectedCandidate.socialLinks?.instagram || '',
            linkedin: selectedCandidate.linkedin || selectedCandidate.socialLinks?.linkedin || '',
            github: selectedCandidate.github || selectedCandidate.socialLinks?.github || ''
        };
        const coverStyle = {
            '--tailor-cover-image': `url("${selectedCandidate.coverImage || defaultTailorCoverImage}")`
        };
        const jumpTakeId = String(getCandidateJumpTakeId(selectedCandidate) || '@JumpTakeID');
        const formattedJumpTakeId = jumpTakeId.startsWith('@') ? jumpTakeId : `@${jumpTakeId}`;

        const modalMarkup = (
            <div
                className="portal-profile-detail-backdrop candidate-profile-popup-backdrop"
                role="presentation"
                onClick={(event) => {
                    if (event.target === event.currentTarget) {
                        handleCloseProfile();
                    }
                }}
            >
                <article
                    className="portal-profile-detail-modal candidate-profile-popup"
                    ref={candidateProfileRef}
                    role="dialog"
                    aria-modal="true"
                    aria-label={`${selectedCandidate.name || 'Candidate'} tailor profile`}
                    onClick={(event) => event.stopPropagation()}
                >
                    <span
                        role="button"
                        tabIndex={0}
                        className="portal-profile-detail-close"
                        onClick={handleCloseProfile}
                        onKeyDown={(event) => {
                            if (event.key === 'Enter' || event.key === ' ') {
                                event.preventDefault();
                                handleCloseProfile();
                            }
                        }}
                        aria-label="Close profile"
                        title="Close"
                    >
                        &times;
                    </span>
                    <div className="portal-profile-detail-card" style={coverStyle}>
                        <div className={`tailor-profile-image ${selectedCandidate.profileImage ? '' : 'has-default-profile-icon'}`}>
                            <img
                                src={selectedCandidate.profileImage || getCandidateDefaultProfileImage(selectedCandidate)}
                                alt={selectedCandidate.name || 'Candidate'}
                            />
                        </div>
                        <div className="tailor-profile-info">
                            <p className="tailor-profile-name">{selectedCandidate.name || 'Unnamed Candidate'}</p>
                            <div className="tailor-profile-title">{formattedJumpTakeId}</div>
                        </div>
                        <div className="tailor-social-links" aria-label={`${selectedCandidate.name || 'Candidate'} social links`}>
                            {mode === 'candidate' && (
                                <>
                                    <button
                                        type="button"
                                        className={`tailor-social-btn portal-profile-friend-action ${selectedCandidate.connectionStatus?.status === 'accepted' ? 'is-friend' : ''} ${selectedCandidate.connectionStatus?.status === 'pending' ? 'is-pending' : ''}`}
                                        onClick={(event) => {
                                            event.stopPropagation();
                                            if (!selectedCandidate.connectionStatus) {
                                                sendFriendRequest({ candidateId: selectedCandidate._id });
                                            } else if (selectedCandidate.connectionStatus.status === 'pending' && selectedCandidate.connectionStatus.direction === 'outgoing') {
                                                cancelFriendRequest(selectedCandidate);
                                            }
                                        }}
                                        disabled={sendingFriendRequest || selectedCandidate.connectionStatus?.status === 'accepted' || (selectedCandidate.connectionStatus?.status === 'pending' && selectedCandidate.connectionStatus?.direction !== 'outgoing')}
                                        aria-label={selectedCandidate.connectionStatus?.status === 'accepted' ? 'Already friends' : selectedCandidate.connectionStatus?.status === 'pending' ? 'Friend invitation pending' : 'Add friend'}
                                        title={selectedCandidate.connectionStatus?.status === 'accepted' ? 'Friends' : selectedCandidate.connectionStatus?.status === 'pending' ? 'Invitation pending' : 'Add friend'}
                                    >
                                        <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                                            <path d="M15 12a5 5 0 1 0-5-5 5 5 0 0 0 5 5Zm0 2c-4.42 0-8 2.24-8 5v1h10.1A6.9 6.9 0 0 1 17 19c0-1.85.72-3.54 1.9-4.8A11.7 11.7 0 0 0 15 14Zm6-3V8h-2v3h-3v2h3v3h2v-3h3v-2h-3Z" />
                                        </svg>
                                    </button>
                                    <button
                                        type="button"
                                        className={`tailor-social-btn portal-profile-bookmark-action ${isBookmarked ? 'active' : ''}`}
                                        onClick={(event) => toggleTalentBookmark(selectedCandidate, event)}
                                        aria-label={isBookmarked ? 'Remove candidate bookmark' : 'Bookmark candidate'}
                                        title={isBookmarked ? 'Remove bookmark' : 'Bookmark candidate'}
                                    >
                                        <svg viewBox="0 0 16 16" aria-hidden="true" focusable="false">
                                            <path d="M3.612 15.443c-.386.198-.824-.149-.746-.592l.83-4.73L.173 6.765c-.329-.314-.158-.888.283-.95l4.898-.696L7.538.792c.197-.39.73-.39.927 0l2.184 4.327 4.898.696c.441.062.612.636.282.95l-3.522 3.356.83 4.73c.078.443-.36.79-.746.592L8 13.187z" />
                                        </svg>
                                    </button>
                                </>
                            )}
                            {socialPlatforms.map((platform) => {
                                const href = socialLinks[platform];

                                return href ? (
                                    <a
                                        key={platform}
                                        className={`tailor-social-btn ${platform}`}
                                        href={href}
                                        target="_blank"
                                        rel="noreferrer"
                                        aria-label={`Open ${platform} profile`}
                                    >
                                        {renderTailorSocialIcon(platform)}
                                    </a>
                                ) : (
                                    <span key={platform} className={`tailor-social-btn ${platform} is-empty`} aria-hidden="true">
                                        {renderTailorSocialIcon(platform)}
                                    </span>
                                );
                            })}
                        </div>
                        <button
                            type="button"
                            className="portal-profile-detail-message"
                            onClick={() => {
                                if (typeof window !== 'undefined') {
                                    window.dispatchEvent(new CustomEvent('jumptake-open-candidate-messenger', {
                                        detail: {
                                            contact: {
                                                userId: selectedCandidate.user || selectedCandidate.userId || selectedCandidate._id || '',
                                                candidateId: selectedCandidate._id || '',
                                                name: selectedCandidate.name || 'Candidate',
                                                avatar: selectedCandidate.profileImage || '',
                                                jumpTakeId: formattedJumpTakeId
                                            }
                                        }
                                    }));
                                }
                                handleCloseProfile();
                            }}
                        >
                            Message
                        </button>
                        <div className="tailor-profile-stats">
                            <div className="tailor-stat-item">
                                <div className="tailor-stat-value">{likeCount}</div>
                                <div className="tailor-stat-label">{likeCount === 1 ? 'Like' : 'Likes'}</div>
                            </div>
                            <div className="tailor-stat-item">
                                <div className="tailor-stat-value">{profilePosts.length}</div>
                                <div className="tailor-stat-label">Posts</div>
                            </div>
                            <div className="tailor-stat-item">
                                <div className="tailor-stat-value">{Number(selectedCandidate.rating || 0).toFixed(1)}</div>
                                <div className="tailor-stat-label">Rating</div>
                            </div>
                        </div>
                    </div>
                    <div className="portal-profile-detail-posts" aria-label={`${selectedCandidate.name || 'Candidate'} posts`}>
                        {profilePosts.length > 0 ? (
                            profilePosts.map((post) => renderCandidateProfilePostCard(post, selectedCandidate))
                        ) : (
                            <p className="portal-post-detail-empty">No visible posts yet.</p>
                        )}
                    </div>
                </article>
            </div>
        );

        return typeof document !== 'undefined'
            ? createPortal(modalMarkup, document.body)
            : modalMarkup;
    };

    return (
        <div ref={talentPoolRef} className={`talent-pool-container ${mode === 'candidate' ? 'candidate-view-candidates' : ''}`}>
            <div className="talent-pool-header">
                <h2>{mode === 'candidate' ? 'Candidates' : 'Talent Pool'}</h2>
                {mode === 'employer' && (
                    <div className="talent-pool-header-actions">
                        <button
                            className={`spotlight-button ${spotlightActive ? 'active' : ''}`}
                            onClick={() => setSpotlightActive(!spotlightActive)}
                        >
                            Spotlight
                        </button>
                    </div>
                )}
                {mode === 'candidate' && (
                    <div className="talent-pool-header-actions">
                        <button className="add-friends-button" type="button" onClick={() => setShowAddFriend(true)}>
                            Add Friends
                        </button>
                    </div>
                )}
            </div>

            {error && <div className="error-message">{error}</div>}

            {spotlightActive && (
                <div className="spotlight-summary">
                    <strong>Spotlight mode</strong>
                    <span>
                        Showing candidates whose skills match your posted job skills.
                    </span>
                </div>
            )}

            {mode === 'candidate' && (
                <div className="candidate-community-intro">
                    <p className="candidate-community-copy">
                        <span className="candidate-community-line">Connect, learn, and{' '}
                        <span className="candidate-grow-together">
                            <span>grow together</span>
                            <svg className="candidate-grow-icon" viewBox="0 0 16 16" aria-hidden="true">
                                <path fillRule="evenodd" d="M0 0h1v15h15v1H0zm10 3.5a.5.5 0 0 1 .5-.5h4a.5.5 0 0 1 .5.5v4a.5.5 0 0 1-1 0V4.9l-3.613 4.417a.5.5 0 0 1-.74.037L7.06 6.767l-3.656 5.027a.5.5 0 0 1-.808-.588l4-5.5a.5.5 0 0 1 .758-.06l2.609 2.61L13.445 4H10.5a.5.5 0 0 1-.5-.5" />
                            </svg>
                        </span>
                        </span>
                        <span className="candidate-community-description">
                            Discover candidates with similar skills and experience, exchange career guidance, and learn from one another while keeping personal contact details private.
                        </span>
                    </p>
                </div>
            )}

            {friendNotice.startsWith('Error:') && (
                <div className="notification-message error">
                    {friendNotice}
                </div>
            )}

            {mode === 'candidate' && showAddFriend && (
                <div className="add-friend-panel">
                    <div>
                        <h3>Add a friend</h3>
                        <p>Enter the candidate's unique JumpTake ID.</p>
                    </div>
                    <div className="add-friend-form">
                        <input
                            type="text"
                            value={friendJumpTakeId}
                            onChange={(event) => setFriendJumpTakeId(event.target.value)}
                            placeholder="e.g. raiyan-4827"
                            aria-label="JumpTake ID"
                        />
                        <button
                            type="button"
                            className="settings-button primary"
                            onClick={() => sendFriendRequest({ jumptakeId: friendJumpTakeId })}
                            disabled={sendingFriendRequest || !friendJumpTakeId.trim()}
                        >
                            Send Invitation
                        </button>
                        <button type="button" className="secondary-button" onClick={() => setShowAddFriend(false)} disabled={sendingFriendRequest}>
                            Cancel
                        </button>
                    </div>
                </div>
            )}

            <div className="talent-pool-controls">
                <div className="search-container">
                    <input 
                        type="text" 
                        placeholder={mode === 'candidate'
                            ? 'Search by name, skills, education or experience...'
                            : 'Search candidates by name, email or skills...'}
                        className="candidate-search"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            {isLoading ? (
                <div className="loading-container">
                    <div className="loading-spinner"></div>
                            <p>Loading candidates...</p>
                </div>
            ) : (
                <>
                    {filteredCandidateRows.length === 0 ? (
                        <div className="no-candidates">
                            <div className="empty-state-image">
                                <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                                    <circle cx="9" cy="7" r="4"></circle>
                                    <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                                    <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                                </svg>
                            </div>
                            <h3>{spotlightActive ? 'No spotlight matches found' : 'No candidates found'}</h3>
                            <p>
                                {mode === 'candidate'
                                    ? (searchTerm
                                        ? 'Try a broader search using names, skills, education, or experience.'
                                        : 'No matched candidates are available yet. Candidates will appear here when they share skills, education, or experience with you.')
                                    : spotlightActive
                                    ? 'Post jobs with skills that match candidate profiles, or turn off Spotlight to view all candidates.'
                                    : searchTerm ? 'Try adjusting your search criteria' : 'No candidates are available in the talent pool yet'}
                            </p>
                        </div>
                    ) : (
                        <>
                        <div className="candidates-grid">
                            {pagedCandidateRows.map(({ candidate, spotlight }) => {
                                return (
                                <div key={candidate._id} className="candidate-card uiverse-profile-card" onClick={() => handleViewProfile(candidate)}>
                                    {renderCandidateProfileCard(candidate, { compact: true })}

                                    <div className="candidate-info candidate-card-extra-info">
                                        {spotlightActive && (
                                            <div className="spotlight-match">
                                                <span className="spotlight-score">{spotlight.score}</span>
                                                <span>{spotlight.score === 1 ? 'skill match' : 'skill matches'}</span>
                                            </div>
                                        )}

                                        {spotlightActive && spotlight.matchedSkills.length > 0 && (
                                            <div className="spotlight-skills">
                                                {spotlight.matchedSkills.slice(0, 4).map((skill, index) => (
                                                    <span key={index} className="candidate-skill-tag spotlight">{skill}</span>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )})}
                        </div>
                        {totalCandidatePages > 1 && (
                            <div className="mobile-list-pagination candidate-list-pagination" aria-label="Candidate pages">
                                <button
                                    type="button"
                                    className="secondary-button"
                                    onClick={() => changeCandidatePage(Math.max(1, currentCandidatePage - 1))}
                                    disabled={currentCandidatePage === 1}
                                >
                                    Previous
                                </button>
                                <span>Page {currentCandidatePage} of {totalCandidatePages}</span>
                                <button
                                    type="button"
                                    className="secondary-button"
                                    onClick={() => changeCandidatePage(Math.min(totalCandidatePages, currentCandidatePage + 1))}
                                    disabled={currentCandidatePage === totalCandidatePages}
                                >
                                    Next
                                </button>
                            </div>
                        )}
                        </>
                    )}
                </>
            )}

            {renderSelectedCandidateModal()}

            {!isLoading && !selectedCandidate && (
                <div className="page-footer-actions">
                    <button 
                        className="back-button"
                        onClick={onFooterBack || onBack}
                    >
                        Back
                    </button>
                </div>
            )}
        </div>
    );
};

export default TalentPool;
