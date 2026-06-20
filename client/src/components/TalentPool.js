import React, { useMemo, useState, useEffect, useRef } from 'react';
import ContactCandidate from './ContactCandidate';
import ProfileAvatar from './ProfileAvatar';

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

    const formatDataForDisplay = (data) => {
        if (Array.isArray(data)) {
            return data.join(', ');
        } else if (typeof data === 'string') {
            return data;
        } else if (data === null || data === undefined) {
            return 'Not specified';
        }
        return JSON.stringify(data);
    };

    const renderList = (items, defaultMessage) => {
        if (!items || (Array.isArray(items) && items.length === 0)) {
            return <p className="empty-info">{defaultMessage}</p>;
        }

        if (Array.isArray(items)) {
            return (
                <ul className="profile-list">
                    {items.map((item, index) => (
                        <li key={index}>
                            {typeof item === 'object' 
                                ? `${item.company || item.institution || ''} - ${item.role || item.degree || ''} (${item.dates || ''})`
                                : item}
                        </li>
                    ))}
                </ul>
            );
        }

        return <p>{items}</p>;
    };

    return (
        <div ref={talentPoolRef} className={`talent-pool-container ${mode === 'candidate' ? 'candidate-view-candidates' : ''}`}>
            <div className="talent-pool-header">
                <h2>{mode === 'candidate' ? 'View Candidates' : 'Talent Pool'}</h2>
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
                <div className="candidate-community-note">
                    <strong>Connect, learn, and grow together.</strong>
                    <p>Discover candidates with similar skills and experience, exchange career guidance, and learn from one another while keeping personal contact details private.</p>
                </div>
            )}

            {friendNotice && (
                <div className={`notification-message ${friendNotice.startsWith('Error:') ? 'error' : 'success'}`}>
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
            ) : selectedCandidate ? (
                <div className="candidate-profile" ref={candidateProfileRef}>
                    <div className="candidate-profile-header">
                        <div className="candidate-profile-back">
                            <button onClick={handleCloseProfile} className="back-button">
                                Back to Candidates
                            </button>
                        </div>
                        <div className="candidate-header-info">
                            <ProfileAvatar
                                imageSrc={selectedCandidate.profileImage}
                                name={selectedCandidate.name}
                                className="candidate-initial"
                                imageClassName="profile-avatar-image"
                            />
                        <div className="candidate-header-text">
                            <h2>{selectedCandidate.name || 'Unnamed Candidate'}</h2>
                            <p>{mode === 'candidate' ? 'Public matched profile' : (selectedCandidate.email || 'Email not available')}</p>
                            </div>
                        </div>
                    </div>

                    <div className="candidate-profile-body">
                        <ContactCandidate
                            companyId={companyId}
                            candidate={selectedCandidate}
                            mode={mode}
                            currentUserId={currentUserId}
                        />

                        <div className="profile-section">
                            <h3>Skills</h3>
                            <div className="skills-container">
                                {getSkillList(selectedCandidate.skills).length > 0 ? (
                                    getSkillList(selectedCandidate.skills).map((skill, index) => (
                                        <span key={index} className="skill-tag">{skill}</span>
                                    ))
                                ) : (
                                    <p>No skills listed</p>
                                )}
                            </div>
                        </div>

                        {spotlightActive && getSpotlightMatch(selectedCandidate).score > 0 && (
                            <div className="profile-section">
                                <h3>Spotlight Matches</h3>
                                <div className="skills-container">
                                    {getSpotlightMatch(selectedCandidate).matchedSkills.map((skill, index) => (
                                        <span key={index} className="skill-tag skill-match">{skill}</span>
                                    ))}
                                </div>
                                <p className="spotlight-jobs">
                                    Matching job{getSpotlightMatch(selectedCandidate).matchedJobs.length !== 1 ? 's' : ''}: {getSpotlightMatch(selectedCandidate).matchedJobs.join(', ')}
                                </p>
                            </div>
                        )}

                        <div className="profile-section">
                            <h3>Education</h3>
                            {renderList(selectedCandidate.education, "No education information available")}
                        </div>

                        <div className="profile-section">
                            <h3>Experience</h3>
                            {renderList(selectedCandidate.experience, "No experience information available")}
                        </div>

                        {selectedCandidate.achievements && (
                            <div className="profile-section">
                                <h3>Achievements</h3>
                                {renderList(selectedCandidate.achievements, "No achievements listed")}
                            </div>
                        )}

                    {(selectedCandidate.interests || selectedCandidate.hobbies) && (
                        <div className="profile-section">
                            <h3>Interests & Hobbies</h3>
                                {selectedCandidate.interests && (
                                    <div className="profile-subsection">
                                        <h4>Interests</h4>
                                        <p>{formatDataForDisplay(selectedCandidate.interests)}</p>
                                    </div>
                                )}
                                {selectedCandidate.hobbies && (
                                    <div className="profile-subsection">
                                        <h4>Hobbies</h4>
                                        <p>{formatDataForDisplay(selectedCandidate.hobbies)}</p>
                                    </div>
                                )}
                            </div>
                        )}

                        <div className="section-footer-nav">
                            <button className="back-button" onClick={handleCloseProfile}>
                                Back
                            </button>
                        </div>
                    </div>
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
                                <div key={candidate._id} className="candidate-card" onClick={() => handleViewProfile(candidate)}>
                                    {mode === 'candidate' && (
                                        <div className="candidate-connection-corner-anchor">
                                            <button
                                                type="button"
                                                className={`candidate-connection-corner-button ${candidate.connectionStatus?.status || 'is-new'}`}
                                                onClick={(event) => {
                                                    event.stopPropagation();
                                                    if (!candidate.connectionStatus) {
                                                        sendFriendRequest({ candidateId: candidate._id });
                                                    } else if (candidate.connectionStatus.status === 'pending' && candidate.connectionStatus.direction === 'outgoing') {
                                                        cancelFriendRequest(candidate);
                                                    }
                                                }}
                                                disabled={sendingFriendRequest || candidate.connectionStatus?.status === 'accepted' || (candidate.connectionStatus?.status === 'pending' && candidate.connectionStatus?.direction !== 'outgoing')}
                                                aria-label={candidate.connectionStatus?.status === 'accepted'
                                                    ? 'Already friends'
                                                    : candidate.connectionStatus?.status === 'pending'
                                                        ? (candidate.connectionStatus?.direction === 'outgoing' ? 'Unsend friend invitation' : 'Friend invitation pending')
                                                        : `Add ${candidate.name || 'candidate'} as a friend`}
                                                title={candidate.connectionStatus?.status === 'accepted'
                                                    ? 'Friends'
                                                    : candidate.connectionStatus?.status === 'pending'
                                                        ? (candidate.connectionStatus?.direction === 'outgoing' ? 'Unsend invitation' : 'Invitation pending')
                                                        : 'Add friend'}
                                            >
                                                {candidate.connectionStatus?.status === 'accepted' ? (
                                                    <span className="candidate-connection-corner-state" aria-hidden="true">&#10003;</span>
                                                ) : candidate.connectionStatus?.status === 'pending' ? (
                                                    <span className="candidate-connection-corner-state" aria-hidden="true">&#8230;</span>
                                                ) : (
                                                    <svg
                                                        xmlns="http://www.w3.org/2000/svg"
                                                        viewBox="0 0 24 24"
                                                        className="candidate-connection-corner-icon"
                                                        aria-hidden="true"
                                                    >
                                                        <path d="M12 22C17.5 22 22 17.5 22 12C22 6.5 17.5 2 12 2C6.5 2 2 6.5 2 12C2 17.5 6.5 22 12 22Z" strokeWidth="1.5"></path>
                                                        <path d="M8 12H16" strokeWidth="1.5"></path>
                                                        <path d="M12 16V8" strokeWidth="1.5"></path>
                                                    </svg>
                                                )}
                                            </button>
                                        </div>
                                    )}
                                    <button
                                        type="button"
                                        className={`bookmark-star-button talent-bookmark-button ${bookmarkedTalentIds.includes(String(candidate._id)) ? 'active' : ''}`}
                                        onClick={(event) => toggleTalentBookmark(candidate, event)}
                                        aria-label={bookmarkedTalentIds.includes(String(candidate._id)) ? 'Remove bookmark' : 'Bookmark talent'}
                                    />
                                    <ProfileAvatar
                                        imageSrc={candidate.profileImage}
                                        name={candidate.name}
                                        className="candidate-avatar"
                                        imageClassName="profile-avatar-image"
                                    />
                                    <div className="candidate-info">
                                        <div className="candidate-name-row">
                                            <h3 className="candidate-name">{candidate.name || 'Unnamed Candidate'}</h3>
                                            {renderLikeButton(candidate)}
                                        </div>
                                        <div className="candidate-match-summary candidate-jumptake-meta">
                                            <span>{candidate.jumptakeId || candidate.jumpTakeId || candidate.user?.jumptakeId || 'JumpTake ID unavailable'}</span>
                                        </div>

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
                                    <div className="candidate-view-profile">View Profile</div>
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
