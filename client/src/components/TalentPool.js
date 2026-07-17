import React, { useMemo, useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import ProfileAvatar from './ProfileAvatar';
import defaultTailorCoverImage from './media/default-tailor-cover.png';
import defaultProfileMale from './media/default-profile-male.png';
import defaultProfileFemale from './media/default-profile-female.png';
import { apiUrl } from '../utils/apiUrl';
import confirmAction from '../utils/confirmAction';
import ProfileDetailsCard from './ProfileDetailsCard';

const WORK_NEWS_STORAGE_KEY = 'jumptakeWorkNewsPosts';
const TALENT_STORIES_STORAGE_KEY = 'jumptakeTalentStoriesPosts';
const CANDIDATE_REACH_VIEWED_STORAGE_PREFIX = 'jumptakeCandidateProfileReachViewed:';
const POPUP_CLOSE_ANIMATION_MS = 260;

const lockCompactProfileReachPill = (node) => {
    if (!node) {
        return;
    }

    const styles = {
        appearance: 'none',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: 'max-content',
        minWidth: '0',
        maxWidth: 'max-content',
        inlineSize: 'max-content',
        minInlineSize: '0',
        maxInlineSize: 'max-content',
        height: '21px',
        minHeight: '21px',
        maxHeight: '21px',
        blockSize: '21px',
        minBlockSize: '21px',
        maxBlockSize: '21px',
        aspectRatio: 'auto',
        margin: '0',
        padding: '3px 8px',
        border: '0',
        borderRadius: '999px',
        background: '#b77486',
        backgroundColor: '#b77486',
        backgroundImage: 'none',
        boxShadow: 'none',
        color: '#ffffff',
        '-webkit-text-fill-color': '#ffffff',
        fontSize: '10px',
        fontWeight: '850',
        lineHeight: '1',
        textAlign: 'center',
        whiteSpace: 'nowrap',
        transform: 'none',
        opacity: '1'
    };

    Object.entries(styles).forEach(([property, value]) => {
        const cssProperty = property.startsWith('-')
            ? property
            : property.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`);
        node.style.setProperty(cssProperty, value, 'important');
    });
};

const candidateReactionIconPaths = {
    Like: 'M6.956 1.745C7.021.81 7.908.087 8.864.325l.261.066c.463.116.874.456 1.012.965.22.816.533 2.511.062 4.51a10 10 0 0 1 .443-.051c.713-.065 1.669-.072 2.516.21.518.173.994.681 1.2 1.273.184.532.16 1.162-.234 1.733q.086.18.138.363c.077.27.113.567.113.856s-.036.586-.113.856c-.039.135-.09.273-.16.404.169.387.107.819-.003 1.148a3.2 3.2 0 0 1-.488.901c.054.152.076.312.076.465 0 .305-.089.625-.253.912C13.1 15.522 12.437 16 11.5 16H8c-.605 0-1.07-.081-1.466-.218a4.8 4.8 0 0 1-.97-.484l-.048-.03c-.504-.307-.999-.609-2.068-.722C2.682 14.464 2 13.846 2 13V9c0-.85.685-1.432 1.357-1.615.849-.232 1.574-.787 2.132-1.41.56-.627.914-1.28 1.039-1.639.199-.575.356-1.539.428-2.59z',
    Comment: 'M0 2a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H4.414a1 1 0 0 0-.707.293L.854 15.146A.5.5 0 0 1 0 14.793zm3.5 1a.5.5 0 0 0 0 1h9a.5.5 0 0 0 0-1zm0 2.5a.5.5 0 0 0 0 1h9a.5.5 0 0 0 0-1zm0 2.5a.5.5 0 0 0 0 1h5a.5.5 0 0 0 0-1z',
    Love: 'M8 1.314C12.438-3.248 23.534 4.735 8 15-7.534 4.736 3.562-3.248 8 1.314',
    Appreciate: 'M7.657 6.247c.11-.33.576-.33.686 0l.645 1.937a2.89 2.89 0 0 0 1.829 1.828l1.936.645c.33.11.33.576 0 .686l-1.937.645a2.89 2.89 0 0 0-1.828 1.829l-.645 1.936a.361.361 0 0 1-.686 0l-.645-1.937a2.89 2.89 0 0 0-1.828-1.828l-1.937-.645a.361.361 0 0 1 0-.686l1.937-.645a2.89 2.89 0 0 0 1.828-1.828zM3.794 1.148a.217.217 0 0 1 .412 0l.387 1.162c.173.518.579.924 1.097 1.097l1.162.387a.217.217 0 0 1 0 .412l-1.162.387A1.73 1.73 0 0 0 4.593 5.69l-.387 1.162a.217.217 0 0 1-.412 0L3.407 5.69A1.73 1.73 0 0 0 2.31 4.593l-1.162-.387a.217.217 0 0 1 0-.412l1.162-.387A1.73 1.73 0 0 0 3.407 2.31zM10.863.099a.145.145 0 0 1 .274 0l.258.774c.115.346.386.617.732.732l.774.258a.145.145 0 0 1 0 .274l-.774.258a1.16 1.16 0 0 0-.732.732l-.258.774a.145.145 0 0 1-.274 0l-.258-.774a1.16 1.16 0 0 0-.732-.732L9.1 2.137a.145.145 0 0 1 0-.274l.774-.258c.346-.115.617-.386.732-.732z',
    Empower: 'M5.52.359A.5.5 0 0 1 6 0h4a.5.5 0 0 1 .474.658L8.694 6H12.5a.5.5 0 0 1 .395.807l-7 9a.5.5 0 0 1-.873-.454L6.823 9.5H3.5a.5.5 0 0 1-.48-.641z',
    Congratulate: 'M9.5 2.672a.5.5 0 1 0 1 0V.843a.5.5 0 0 0-1 0zm4.5.035A.5.5 0 0 0 13.293 2L12 3.293a.5.5 0 1 0 .707.707zM7.293 4A.5.5 0 1 0 8 3.293L6.707 2A.5.5 0 0 0 6 2.707zm-.621 2.5a.5.5 0 1 0 0-1H4.843a.5.5 0 1 0 0 1zm8.485 0a.5.5 0 1 0 0-1h-1.829a.5.5 0 0 0 0 1zM13.293 10A.5.5 0 1 0 14 9.293L12.707 8a.5.5 0 1 0-.707.707zM9.5 11.157a.5.5 0 0 0 1 0V9.328a.5.5 0 0 0-1 0zm1.854-5.097a.5.5 0 0 0 0-.706l-.708-.708a.5.5 0 0 0-.707 0L8.646 5.94a.5.5 0 0 0 0 .707l.708.708a.5.5 0 0 0 .707 0l1.293-1.293Zm-3 3a.5.5 0 0 0 0-.706l-.708-.708a.5.5 0 0 0-.707 0L.646 13.94a.5.5 0 0 0 0 .707l.708.708a.5.5 0 0 0 .707 0z',
    Motivate: 'M12.17 9.53c2.307-2.592 3.278-4.684 3.641-6.218.21-.887.214-1.58.16-2.065a3.6 3.6 0 0 0-.108-.563 2 2 0 0 0-.078-.23V.453c-.073-.164-.168-.234-.352-.295a2 2 0 0 0-.16-.045 4 4 0 0 0-.57-.093c-.49-.044-1.19-.03-2.08.188-1.536.374-3.618 1.343-6.161 3.604l-2.4.238h-.006a2.55 2.55 0 0 0-1.524.734L.15 7.17a.512.512 0 0 0 .433.868l1.896-.271c.28-.04.592.013.955.132.232.076.437.16.655.248l.203.083c.196.816.66 1.58 1.275 2.195.613.614 1.376 1.08 2.191 1.277l.082.202c.089.218.173.424.249.657.118.363.172.676.132.956l-.271 1.9a.512.512 0 0 0 .867.433l2.382-2.386c.41-.41.668-.949.732-1.526zm.11-3.699c-.797.8-1.93.961-2.528.362-.598-.6-.436-1.733.361-2.532.798-.799 1.93-.96 2.528-.361s.437 1.732-.36 2.531ZM5.205 10.787a7.6 7.6 0 0 0 1.804 1.352c-1.118 1.007-4.929 2.028-5.054 1.903-.126-.127.737-4.189 1.839-5.18.346.69.837 1.35 1.411 1.925',
    Angry: 'M11.46.146A.5.5 0 0 0 11.107 0H4.893a.5.5 0 0 0-.353.146L.146 4.54A.5.5 0 0 0 0 4.893v6.214a.5.5 0 0 0 .146.353l4.394 4.394a.5.5 0 0 0 .353.146h6.214a.5.5 0 0 0 .353-.146l4.394-4.394a.5.5 0 0 0 .146-.353V4.893a.5.5 0 0 0-.146-.353zm-6.106 4.5L8 7.293l2.646-2.647a.5.5 0 0 1 .708.708L8.707 8l2.647 2.646a.5.5 0 0 1-.708.708L8 8.707l-2.646 2.647a.5.5 0 0 1-.708-.708L7.293 8 4.646 5.354a.5.5 0 1 1 .708-.708',
    Sad: 'M8.867 14.41c13.308-9.322 4.79-16.563.064-13.824L7 3l1.5 4-2 3L8 15a38 38 0 0 0 .867-.59m-.303-1.01-.971-3.237 1.74-2.608a1 1 0 0 0 .103-.906l-1.3-3.468 1.45-1.813c1.861-.948 4.446.002 5.197 2.11.691 1.94-.055 5.521-6.219 9.922m-1.25 1.137a36 36 0 0 1-1.522-1.116C-5.077 4.97 1.842-1.472 6.454.293c.314.12.618.279.904.477L5.5 3 7 7l-1.5 3zm-2.3-3.06-.442-1.106a1 1 0 0 1 .034-.818l1.305-2.61L4.564 3.35a1 1 0 0 1 .168-.991l1.032-1.24c-1.688-.449-3.7.398-4.456 2.128-.711 1.627-.413 4.55 3.706 8.229Z',
    Bad: 'M15 8a6.97 6.97 0 0 0-1.71-4.584l-9.874 9.875A7 7 0 0 0 15 8M2.71 12.584l9.874-9.875a7 7 0 0 0-9.874 9.874ZM16 8A8 8 0 1 1 0 8a8 8 0 0 1 16 0',
    Hide: 'm10.79 12.912-1.614-1.615a3.5 3.5 0 0 1-4.474-4.474l-2.06-2.06C.938 6.278 0 8 0 8s3 5.5 8 5.5a7 7 0 0 0 2.79-.588M5.21 3.088A7 7 0 0 1 8 2.5c5 0 8 5.5 8 5.5s-.939 1.721-2.641 3.238l-2.062-2.062a3.5 3.5 0 0 0-4.474-4.474zM5.525 7.646a2.5 2.5 0 0 0 2.829 2.829zm4.95.708-2.829-2.83a2.5 2.5 0 0 1 2.829 2.829zm3.171 6-12-12 .708-.708 12 12z'
};

const CandidateReactionIcon = ({ name }) => (
    <svg className="candidate-reaction-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" aria-hidden="true" focusable="false">
        <path fillRule={name === 'Love' ? 'evenodd' : undefined} d={candidateReactionIconPaths[name] || candidateReactionIconPaths.Like} />
        {name === 'Congratulate' && <path className="magic-stick-accent" d="M1.3 14.7 8.35 7.65" />}
    </svg>
);

const CandidateShareIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" aria-hidden="true" focusable="false">
        <path fillRule="evenodd" d="M14.854 4.854a.5.5 0 0 0 0-.708l-4-4a.5.5 0 0 0-.708.708L13.293 4H3.5A2.5 2.5 0 0 0 1 6.5v8a.5.5 0 0 0 1 0v-8A1.5 1.5 0 0 1 3.5 5h9.793l-3.147 3.146a.5.5 0 0 0 .708.708z" />
    </svg>
);

const CandidateProfileFriendIcon = ({ status = '' }) => {
    const path = status === 'accepted'
        ? 'M9.2 16.6 4.9 12.3l1.4-1.4 2.9 2.9 7.5-7.5 1.4 1.4zM12 22a9.9 9.9 0 0 1-7.1-2.9A9.9 9.9 0 0 1 2 12a9.9 9.9 0 0 1 2.9-7.1A9.9 9.9 0 0 1 12 2a9.9 9.9 0 0 1 7.1 2.9A9.9 9.9 0 0 1 22 12a9.9 9.9 0 0 1-2.9 7.1A9.9 9.9 0 0 1 12 22z'
        : 'M15 12a5 5 0 1 0-5-5 5 5 0 0 0 5 5Zm0 2c-4.42 0-8 2.24-8 5v1h10.1A6.9 6.9 0 0 1 17 19c0-1.85.72-3.54 1.9-4.8A11.7 11.7 0 0 0 15 14Zm6-3V8h-2v3h-3v2h3v3h2v-3h3v-2h-3Z';

    return (
        <svg
            className="candidate-popup-inline-icon"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            aria-hidden="true"
            focusable="false"
        >
            <path d={path} />
        </svg>
    );
};

const CandidateProfileBookmarkIcon = () => (
    <svg
        className="candidate-popup-inline-icon"
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 16 16"
        aria-hidden="true"
        focusable="false"
    >
        <path d="M3.612 15.443c-.386.198-.824-.149-.746-.592l.83-4.73L.173 6.765c-.329-.314-.158-.888.283-.95l4.898-.696L7.538.792c.197-.39.73-.39.927 0l2.184 4.327 4.898.696c.441.062.612.636.282.95l-3.522 3.356.83 4.73c.078.443-.36.79-.746.592L8 13.187z" />
    </svg>
);

const escapeCandidateHtml = (value = '') => (
    String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;')
);

const formatCompactCount = (value) => {
    const count = Math.max(0, Number(value) || 0);

    if (count >= 1000000) {
        return `${(count / 1000000).toFixed(count >= 10000000 ? 0 : 1).replace(/\.0$/, '')}M`;
    }

    if (count >= 1000) {
        return `${(count / 1000).toFixed(count >= 10000 ? 0 : 1).replace(/\.0$/, '')}K`;
    }

    return String(count);
};

const getCandidatePostKey = (post = {}) => String(post.id || post._id || `${post.storageKey || post.feedType || 'post'}-${post.createdAt || ''}-${post.body || post.text || post.content || ''}`);

const getCandidateReachViewedStorageKey = (viewerId = 'candidate-viewer') => `${CANDIDATE_REACH_VIEWED_STORAGE_PREFIX}${viewerId || 'candidate-viewer'}`;

const readCandidateReachViewed = (viewerId) => {
    if (typeof window === 'undefined') {
        return new Set();
    }

    try {
        const stored = JSON.parse(window.localStorage.getItem(getCandidateReachViewedStorageKey(viewerId)) || '[]');
        return new Set(Array.isArray(stored) ? stored.map(String) : []);
    } catch (error) {
        return new Set();
    }
};

const writeCandidateReachViewed = (viewerId, viewedSet) => {
    if (typeof window === 'undefined') {
        return;
    }

    try {
        window.localStorage.setItem(getCandidateReachViewedStorageKey(viewerId), JSON.stringify([...viewedSet]));
    } catch (error) {
        // localStorage can be unavailable in private browsing; reach still works from post.seenBy.
    }
};

const getCandidateReachSeed = (post) => getCandidatePostKey(post)
    .split('')
    .reduce((total, character) => total + character.charCodeAt(0), 0);

const getCandidateReachHistory = (post) => {
    const explicitHistory = Array.isArray(post?.reachHistory)
        ? post.reachHistory
            .map((item) => ({
                label: String(item?.label || item?.date || ''),
                value: Math.max(0, Number(item?.value ?? item?.reach ?? 0) || 0)
            }))
            .filter((item) => item.label)
            .slice(-7)
        : [];

    if (explicitHistory.length) {
        return explicitHistory;
    }

    const totalReach = Math.max(0, Number(post?.reach || 0) || 0);
    const today = new Date();
    const seed = getCandidateReachSeed(post);
    const weights = Array.from({ length: 7 }, (_, index) => ((seed + (index + 1) * 7) % 9) + 1);
    const weightTotal = weights.reduce((total, value) => total + value, 0) || 1;
    let allocated = 0;

    return weights.map((weight, index) => {
        const date = new Date(today);
        date.setDate(today.getDate() - (6 - index));
        const value = index === 6
            ? Math.max(0, totalReach - allocated)
            : Math.floor((totalReach * weight) / weightTotal);
        allocated += value;

        return {
            label: date.toLocaleDateString(undefined, { weekday: 'short' }),
            value
        };
    });
};

const TalentPool = ({ jobs = [], companyId, mode = 'employer', currentUserId }) => {
    const [candidates, setCandidates] = useState([]);
    const [bookmarkedTalentIds, setBookmarkedTalentIds] = useState([]);
    const [, setLikedCandidateIds] = useState([]);
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
    const [candidateWorkPosts, setCandidateWorkPosts] = useState([]);
    const [candidateTalentPosts, setCandidateTalentPosts] = useState([]);
    const [expandedCandidateProfilePosts, setExpandedCandidateProfilePosts] = useState({});
    const [openCandidateReactionPostId, setOpenCandidateReactionPostId] = useState('');
    const [openCandidateCommentPostId, setOpenCandidateCommentPostId] = useState('');
    const [openCandidateSharePostId, setOpenCandidateSharePostId] = useState('');
    const [openCandidateOptionsPostId, setOpenCandidateOptionsPostId] = useState('');
    const [openCandidateReachInsightPostId, setOpenCandidateReachInsightPostId] = useState('');
    const [candidateReachInsightPost, setCandidateReachInsightPost] = useState(null);
    const [candidateImagePreview, setCandidateImagePreview] = useState(null);
    const [candidateImagePreviewZoom, setCandidateImagePreviewZoom] = useState(1);
    const [candidateCommentDrafts, setCandidateCommentDrafts] = useState({});
    const [candidateShareFriends, setCandidateShareFriends] = useState([]);
    const [candidateShareStatus, setCandidateShareStatus] = useState('');
    const [candidateSharingTargetId, setCandidateSharingTargetId] = useState('');
    const [closingProfileDetailModal, setClosingProfileDetailModal] = useState(false);
    const [growAnimationKey, setGrowAnimationKey] = useState(0);
    const [isMobileView, setIsMobileView] = useState(() => (
        typeof window !== 'undefined' ? window.innerWidth <= 768 : false
    ));
    const candidateProfileRef = useRef(null);
    const profileDetailCloseTimerRef = useRef(null);
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
        if (mode !== 'candidate') {
            return;
        }

        setGrowAnimationKey(Date.now());
    }, [mode]);

    useEffect(() => {
        const talentSearchKey = mode === 'candidate' ? 'jumptakeCandidateTalentSearch' : 'jumptakeEmployerTalentSearch';
        const dashboardSearch = sessionStorage.getItem(talentSearchKey);
        if (dashboardSearch) {
            setSearchTerm(dashboardSearch);
            sessionStorage.removeItem(talentSearchKey);
        }
    }, [mode]);

    useEffect(() => {
        if (mode !== 'candidate' || !currentUserId) {
            setCandidateShareFriends([]);
            return;
        }

        let isMounted = true;

        const fetchCandidateShareFriends = async () => {
            try {
                const token = typeof window !== 'undefined' ? localStorage.getItem('token') : '';
                const response = await fetch(apiUrl(`/api/candidate-connections/user/${currentUserId}`), {
                    headers: {
                        ...(token ? { Authorization: `Bearer ${token}` } : {})
                    }
                });
                const data = await response.json().catch(() => ({}));

                if (!response.ok) {
                    throw new Error(data.error || 'Failed to load friends');
                }

                if (!isMounted) {
                    return;
                }

                const friends = (Array.isArray(data.friends) ? data.friends : [])
                    .map((connection) => {
                        const peer = connection?.peer && typeof connection.peer === 'object' ? connection.peer : {};

                        return {
                            id: String(peer.candidateId || peer.userId || connection?._id || connection?.id || ''),
                            candidateId: peer.candidateId || '',
                            userId: peer.userId || '',
                            name: peer.name || 'Candidate',
                            jumptakeId: peer.jumptakeId || '',
                            profileImage: peer.profileImage || '',
                            gender: peer.gender || ''
                        };
                    })
                    .filter((friend) => friend.id);

                setCandidateShareFriends(friends);
            } catch (shareFriendError) {
                console.error('Error loading candidate profile share friends:', shareFriendError);
                if (isMounted) {
                    setCandidateShareFriends([]);
                }
            }
        };

        fetchCandidateShareFriends();

        return () => {
            isMounted = false;
        };
    }, [mode, currentUserId]);

    useEffect(() => {
        const handleResize = () => setIsMobileView(window.innerWidth <= 768);

        handleResize();
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    useEffect(() => {
        if (mode !== 'candidate') {
            return undefined;
        }

        let isMounted = true;

        const fetchCandidateFeedPosts = async () => {
            try {
                const [workResponse, talentResponse] = await Promise.all([
                    fetch(apiUrl('/api/feed-posts?type=work-news')),
                    fetch(apiUrl('/api/feed-posts?type=talent-story'))
                ]);

                if (!workResponse.ok || !talentResponse.ok) {
                    throw new Error('Failed to fetch candidate profile posts');
                }

                const [workPosts, talentPosts] = await Promise.all([
                    workResponse.json(),
                    talentResponse.json()
                ]);

                if (!isMounted) {
                    return;
                }

                setCandidateWorkPosts(Array.isArray(workPosts) ? workPosts : []);
                setCandidateTalentPosts(Array.isArray(talentPosts) ? talentPosts : []);
            } catch (error) {
                console.error('Unable to load candidate profile posts:', error);
                if (isMounted) {
                    setCandidateWorkPosts([]);
                    setCandidateTalentPosts([]);
                }
            }
        };

        fetchCandidateFeedPosts();

        return () => {
            isMounted = false;
        };
    }, [mode]);

    const fetchCandidates = async () => {
        try {
            setIsLoading(true);
            const token = localStorage.getItem(mode === 'candidate' ? 'token' : 'employerToken');
            const endpoint = mode === 'candidate'
                ? `/api/candidate-network/matches/${currentUserId}`
                : '/api/job-seekers';
            const response = await fetch(apiUrl(endpoint), {
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
            const response = await fetch(apiUrl(`/api/talent-bookmarks/company/${companyId}`), {
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
            const response = await fetch(apiUrl(`/api/candidate-bookmarks/user/${currentUserId}`), {
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
            const response = await fetch(apiUrl(`/api/candidate-likes?${params.toString()}`), {
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
        if (!candidate) {
            return;
        }

        if (profileDetailCloseTimerRef.current) {
            window.clearTimeout(profileDetailCloseTimerRef.current);
            profileDetailCloseTimerRef.current = null;
        }

        setClosingProfileDetailModal(false);
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
        if (!selectedCandidate || closingProfileDetailModal) {
            return;
        }

        if (profileDetailCloseTimerRef.current) {
            window.clearTimeout(profileDetailCloseTimerRef.current);
        }

        setClosingProfileDetailModal(true);
        setOpenCandidateReachInsightPostId('');
        setCandidateReachInsightPost(null);
        setOpenCandidateReactionPostId('');
        setOpenCandidateCommentPostId('');
        setOpenCandidateSharePostId('');
        setOpenCandidateOptionsPostId('');
        setCandidateShareStatus('');
        setCandidateSharingTargetId('');
        profileDetailCloseTimerRef.current = window.setTimeout(() => {
            setSelectedCandidate(null);
            setClosingProfileDetailModal(false);
            profileDetailCloseTimerRef.current = null;
        }, POPUP_CLOSE_ANIMATION_MS);
    };

    useEffect(() => () => {
        if (profileDetailCloseTimerRef.current) {
            window.clearTimeout(profileDetailCloseTimerRef.current);
        }
    }, []);

    const getCandidateJumpTakeId = (candidate) => (
        candidate?.jumptakeId
        || candidate?.jumpTakeId
        || candidate?.user?.jumptakeId
        || '@JumpTakeID'
    );

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

        if (isBookmarked) {
            const confirmed = await confirmAction({
                title: 'Remove bookmark?',
                message: 'Remove this candidate from your bookmarks?'
            });
            if (!confirmed) {
                return;
            }
        }

        try {
            if (isBookmarked) {
                const removeUrl = mode === 'employer'
                    ? `/api/talent-bookmarks/company/${companyId}/candidate/${candidate._id}`
                    : `/api/candidate-bookmarks/user/${currentUserId}/candidate/${candidate._id}`;
                const response = await fetch(apiUrl(removeUrl), {
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
                const response = await fetch(apiUrl(createUrl), {
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

    const sendFriendRequest = async ({ candidateId, jumptakeId } = {}) => {
        try {
            setSendingFriendRequest(true);
            setFriendNotice('');
            const response = await fetch(apiUrl('/api/candidate-connections/request'), {
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

        const confirmed = await confirmAction({
            title: 'Unsend invitation?',
            message: 'Cancel this sent friend invitation?'
        });
        if (!confirmed) {
            return;
        }

        try {
            setSendingFriendRequest(true);
            setFriendNotice('');
            const response = await fetch(apiUrl(`/api/candidate-connections/${connectionId}/respond`), {
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

    const openCandidateImagePreview = (media, event) => {
        event?.stopPropagation();

        if (!media?.dataUrl) {
            return;
        }

        setCandidateImagePreview({
            dataUrl: media.dataUrl,
            name: media.name || 'Post image'
        });
        setCandidateImagePreviewZoom(1);
    };

    const closeCandidateImagePreview = () => {
        setCandidateImagePreview(null);
        setCandidateImagePreviewZoom(1);
    };

    const adjustCandidateImagePreviewZoom = (amount) => {
        setCandidateImagePreviewZoom((currentZoom) => {
            const nextZoom = Math.round((currentZoom + amount) * 10) / 10;
            return Math.min(3, Math.max(0.5, nextZoom));
        });
    };

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

    const renderCandidateListRow = (candidate, spotlight) => {
        const candidateId = String(candidate?._id || '');
        const storiesCount = getCandidateTalentStories(candidate).length;
        const likeCount = candidateLikeCounts[candidateId] || 0;

        return (
            <button
                type="button"
                key={candidate._id}
                className="candidate-list-row"
                onClick={() => handleViewProfile(candidate)}
                aria-label={`Open ${candidate.name || 'candidate'} profile`}
            >
                <ProfileAvatar
                    imageSrc={candidate.profileImage || getCandidateDefaultProfileImage(candidate)}
                    name={candidate.name}
                    className="candidate-list-avatar"
                    imageClassName="profile-avatar-image"
                    useProfileIconFallback
                />
                <span className="candidate-list-main">
                    <span className="candidate-list-name">{candidate.name || 'Unnamed Candidate'}</span>
                    <span className="candidate-list-id">{getCandidateJumpTakeId(candidate) || '@JumpTakeID'}</span>
                    {spotlightActive && spotlight?.matchedSkills?.length > 0 && (
                        <span className="candidate-list-skills">
                            {spotlight.matchedSkills.slice(0, 3).join(', ')}
                        </span>
                    )}
                </span>
                <span className="candidate-list-stats" aria-label="Candidate stats">
                    <span>
                        <strong>{likeCount}</strong>
                        <small>Likes</small>
                    </span>
                    <span>
                        <strong>{storiesCount}</strong>
                        <small>Posts</small>
                    </span>
                    <span>
                        <strong>{Number(candidate.rating || 0).toFixed(1)}</strong>
                        <small>Rating</small>
                    </span>
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

    const readCandidateStoredPosts = (storageKey) => {
        try {
            const storedPosts = JSON.parse(localStorage.getItem(storageKey) || '[]');
            return Array.isArray(storedPosts) ? storedPosts : [];
        } catch (error) {
            return [];
        }
    };

    const asCandidatePostText = (value, fallback = '') => {
        if (value === null || value === undefined) {
            return fallback;
        }

        if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
            return String(value);
        }

        return fallback;
    };

    const normalizeCandidatePostComments = (comments) => (
        Array.isArray(comments)
            ? comments
                .filter((comment) => comment && typeof comment === 'object')
                .map((comment, index) => ({
                    ...comment,
                    id: asCandidatePostText(comment.id, `candidate-comment-${index}`),
                    authorId: asCandidatePostText(comment.authorId || comment.userId || comment.candidateId),
                    authorName: asCandidatePostText(comment.authorName || comment.name, 'User'),
                    authorAvatar: typeof comment.authorAvatar === 'string' ? comment.authorAvatar : '',
                    text: asCandidatePostText(comment.text || comment.body || comment.content)
                }))
            : []
    );

    const getCandidateProfilePosts = (candidate) => {
        const normalizeKey = (value) => String(value || '').trim().toLowerCase();
        const stripHandle = (value) => normalizeKey(value).replace(/^@+/, '');
        const candidateIds = [
            candidate?._id,
            candidate?.id,
            candidate?.user,
            candidate?.userId,
            candidate?.candidateId,
            candidate?.authorId,
            candidate?.accountId
        ].map(normalizeKey).filter(Boolean);
        const candidateHandles = [
            candidate?.jumptakeId,
            candidate?.jumpTakeId,
            candidate?.username,
            candidate?.handle
        ].map(stripHandle).filter(Boolean);
        const candidateName = normalizeKey(candidate?.name);
        const isVisiblePost = (post) => ['everyone', '', undefined, null].includes(post?.audience);
        const matchesCandidate = (post) => {
            const postIds = [
                post?.authorId,
                post?.candidateId,
                post?.authorCandidateId,
                post?.userId,
                post?.user,
                post?.author?._id,
                post?.author?.id
            ].map(normalizeKey).filter(Boolean);
            const postHandles = [
                post?.jumptakeId,
                post?.jumpTakeId,
                post?.authorJumpTakeId,
                post?.authorJumptakeId,
                post?.username,
                post?.handle
            ].map(stripHandle).filter(Boolean);
            const postAuthorName = normalizeKey(post?.authorName);

            return isVisiblePost(post) && (
                postIds.some((id) => candidateIds.includes(id))
                || postHandles.some((handle) => candidateHandles.includes(handle))
                || (candidateName && postAuthorName === candidateName)
            );
        };

        const posts = [
            ...candidateWorkPosts.map((post) => ({ ...post, storageKey: WORK_NEWS_STORAGE_KEY, feedType: 'Work News' })),
            ...candidateTalentPosts.map((post) => ({ ...post, storageKey: TALENT_STORIES_STORAGE_KEY, feedType: 'Talent story' })),
            ...readCandidateStoredPosts(WORK_NEWS_STORAGE_KEY).map((post) => ({ ...post, storageKey: WORK_NEWS_STORAGE_KEY, feedType: 'Work News' })),
            ...readCandidateStoredPosts(TALENT_STORIES_STORAGE_KEY).map((post) => ({ ...post, storageKey: TALENT_STORIES_STORAGE_KEY, feedType: 'Talent story' }))
        ];
        const seenPostIds = new Set();

        return posts
            .filter(matchesCandidate)
            .filter((post) => {
                const postId = String(post.id || post._id || `${post.storageKey}-${post.createdAt || ''}-${post.body || ''}`);
                if (seenPostIds.has(postId)) {
                    return false;
                }
                seenPostIds.add(postId);
                return true;
            })
            .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
    };

    const getCandidateTalentStories = (candidate) => (
        getCandidateProfilePosts(candidate).filter((post) => post.storageKey === TALENT_STORIES_STORAGE_KEY)
    );

    const candidateReactionLabels = ['Like', 'Appreciate', 'Love', 'Empower', 'Congratulate', 'Motivate', 'Angry', 'Sad', 'Bad', 'Hide'];

    const updateCandidatePost = async (post, updater) => {
        const nextPost = updater(post);
        const setPosts = post.storageKey === WORK_NEWS_STORAGE_KEY ? setCandidateWorkPosts : setCandidateTalentPosts;
        const postId = post.id || post._id;

        setPosts((posts) => posts.map((item) => (
            String(item.id || item._id || '') === String(postId || '') ? { ...item, ...nextPost } : item
        )));

        if (postId) {
            try {
                await fetch(apiUrl(`/api/feed-posts/${postId}`), {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ ...post, ...nextPost })
                });
            } catch (error) {
                console.error('Unable to update candidate profile post:', error);
            }
        }
    };

    useEffect(() => {
        if (mode !== 'candidate' || !selectedCandidate) {
            return;
        }

        const viewerKey = String(currentUserId || 'candidate-viewer');
        const viewedPosts = readCandidateReachViewed(viewerKey);
        const profilePosts = getCandidateProfilePosts(selectedCandidate);
        let viewedPostsChanged = false;

        profilePosts.forEach((post) => {
            const postKey = getCandidatePostKey(post);
            const seenBy = Array.isArray(post.seenBy) ? post.seenBy.map(String) : [];

            if (!postKey || seenBy.includes(viewerKey) || viewedPosts.has(postKey)) {
                return;
            }

            viewedPosts.add(postKey);
            viewedPostsChanged = true;
            updateCandidatePost(post, (currentPost) => {
                const currentSeenBy = Array.isArray(currentPost.seenBy) ? currentPost.seenBy.map(String) : [];

                if (currentSeenBy.includes(viewerKey)) {
                    return {};
                }

                return {
                    seenBy: [...currentSeenBy, viewerKey],
                    reach: Number(currentPost.reach || 0) + 1
                };
            });
        });

        if (viewedPostsChanged) {
            writeCandidateReachViewed(viewerKey, viewedPosts);
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [mode, selectedCandidate, currentUserId, candidateWorkPosts, candidateTalentPosts]);

    const handleCandidateReaction = (post, reaction) => {
        const viewerKey = String(currentUserId || 'candidate-viewer');
        updateCandidatePost(post, (currentPost) => {
            const reactions = { ...(currentPost.reactions || {}) };
            const reactionsByUser = { ...(currentPost.reactionsByUser || {}) };
            const previousReaction = reactionsByUser[viewerKey];

            if (previousReaction) {
                reactions[previousReaction] = Math.max(0, (Number(reactions[previousReaction]) || 0) - 1);
            }

            if (previousReaction === reaction) {
                delete reactionsByUser[viewerKey];
            } else {
                reactions[reaction] = (Number(reactions[reaction]) || 0) + 1;
                reactionsByUser[viewerKey] = reaction;
            }

            return { reactions, reactionsByUser };
        });
        setOpenCandidateReactionPostId('');
    };

    const handleCandidateCommentSubmit = (post) => {
        const postKey = getCandidatePostKey(post);
        const text = String(candidateCommentDrafts[postKey] || '').trim();

        if (!text) {
            return;
        }

        updateCandidatePost(post, (currentPost) => ({
            comments: [
                ...(Array.isArray(currentPost.comments) ? currentPost.comments : []),
                {
                    id: `candidate-comment-${Date.now()}`,
                    text,
                    authorId: String(currentUserId || ''),
                    authorName: 'You',
                    createdAt: new Date().toISOString()
                }
            ]
        }));
        setCandidateCommentDrafts((drafts) => ({ ...drafts, [postKey]: '' }));
        setOpenCandidateCommentPostId('');
    };

    const handleCandidateCopyShare = async (post) => {
        const postText = asCandidatePostText(post.body || post.text || post.content, 'JumpTake post');
        const shareText = [postText, typeof window !== 'undefined' ? window.location.href : ''].filter(Boolean).join('\n\n');

        try {
            if (typeof navigator !== 'undefined' && navigator.share) {
                await navigator.share({ text: shareText, url: typeof window !== 'undefined' ? window.location.href : undefined });
            } else if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
                await navigator.clipboard.writeText(shareText);
            }

            setCandidateShareStatus('Post link copied.');
        } catch (shareError) {
            setCandidateShareStatus('Could not open sharing. Try again.');
        }
    };

    const handleCandidateShareToFriend = async (post, friend) => {
        if (!friend?.candidateId || !currentUserId) {
            setCandidateShareStatus('This friend cannot receive messages yet.');
            return;
        }

        setCandidateSharingTargetId(friend.id);
        setCandidateShareStatus('');

        try {
            const token = typeof window !== 'undefined' ? localStorage.getItem('token') : '';
            const postText = asCandidatePostText(post.body || post.text || post.content, 'a JumpTake post');
            const postUrl = typeof window !== 'undefined' ? window.location.href : '';
            const senderName = asCandidatePostText(selectedCandidate?.name, 'A JumpTake candidate');
            const bodyHtml = [
                `<p>${escapeCandidateHtml(senderName)} shared a JumpTake post with you.</p>`,
                `<p>${escapeCandidateHtml(postText)}</p>`,
                postUrl ? `<p><a href="${escapeCandidateHtml(postUrl)}">${escapeCandidateHtml(postUrl)}</a></p>` : ''
            ].join('');

            const response = await fetch(apiUrl('/api/messages/candidate-direct'), {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(token ? { Authorization: `Bearer ${token}` } : {})
                },
                body: JSON.stringify({
                    senderUserId: currentUserId,
                    recipientCandidateId: friend.candidateId,
                    bodyHtml
                })
            });
            const data = await response.json().catch(() => ({}));

            if (!response.ok) {
                throw new Error(data.error || 'Could not share this post.');
            }

            updateCandidatePost(post, (currentPost) => ({
                reach: Number(currentPost.reach || 0) + 1,
                comments: [
                    ...(Array.isArray(currentPost.comments) ? currentPost.comments : []),
                    {
                        id: `share-${Date.now()}`,
                        text: `Shared with @${friend.jumptakeId || friend.name}`,
                        authorId: String(currentUserId || ''),
                        authorName: 'You',
                        createdAt: new Date().toISOString()
                    }
                ]
            }));
            setCandidateShareStatus(`Shared with ${friend.name}.`);
            setOpenCandidateSharePostId('');
        } catch (shareError) {
            setCandidateShareStatus(shareError.message || 'Could not share this post.');
        } finally {
            setCandidateSharingTargetId('');
        }
    };

    const openCandidateFromPostAuthor = (author = {}) => {
        const authorId = String(author.authorId || author.userId || author.candidateId || '');
        const authorName = String(author.authorName || author.name || '').trim().toLowerCase();
        const match = candidates.find((candidate) => (
            [candidate._id, candidate.id, candidate.user, candidate.userId, candidate.candidateId]
                .map((value) => String(value || ''))
                .includes(authorId)
            || (authorName && String(candidate.name || '').trim().toLowerCase() === authorName)
        ));

        if (match) {
            setSelectedCandidate(match);
        }
    };

    const closeCandidateReachInsight = () => {
        setOpenCandidateReachInsightPostId('');
        setCandidateReachInsightPost(null);
    };

    const toggleCandidateReachInsight = (event, postKey, post) => {
        event.stopPropagation();
        setOpenCandidateReactionPostId('');
        setOpenCandidateCommentPostId('');
        setOpenCandidateSharePostId('');

        if (openCandidateReachInsightPostId === postKey) {
            closeCandidateReachInsight();
            return;
        }

        setOpenCandidateReachInsightPostId(postKey);
        setCandidateReachInsightPost(post);
    };

    const renderCandidateReachButton = (post, postKey) => {
        const totalReach = Math.max(0, Number(post?.reach || 0) || 0);

        return (
            <span className="profile-post-reach-pill-wrap">
                <button
                    type="button"
                    className="profile-post-reach-pill"
                    ref={lockCompactProfileReachPill}
                    onClick={(event) => toggleCandidateReachInsight(event, postKey, post)}
                    aria-expanded={openCandidateReachInsightPostId === postKey}
                    aria-label={`Show reach graph for ${formatCompactCount(totalReach)} reach`}
                >
                    {formatCompactCount(totalReach)} reach
                </button>
            </span>
        );
    };

    const renderCandidateReachInsightModal = () => {
        if (!candidateReachInsightPost) {
            return null;
        }

        const history = getCandidateReachHistory(candidateReachInsightPost);
        const maxReach = Math.max(1, ...history.map((item) => item.value));
        const totalReach = Math.max(0, Number(candidateReachInsightPost.reach || 0) || 0);
        const modalMarkup = (
            <div
                className="portal-reach-insight-backdrop candidate-reach-insight-backdrop"
                role="presentation"
                onClick={(event) => {
                    if (event.target === event.currentTarget) {
                        closeCandidateReachInsight();
                    }
                }}
            >
                <div
                    className="portal-reach-insight-popover"
                    role="dialog"
                    aria-modal="true"
                    aria-label="Last 7 days reach"
                    onClick={(event) => event.stopPropagation()}
                >
                    <button
                        type="button"
                        className="portal-reach-insight-close portal-stats-close-cross"
                        onClick={closeCandidateReachInsight}
                        aria-label="Close reach graph"
                        title="Close"
                    >
                        &times;
                    </button>
                    <div className="portal-reach-insight-header">
                        <strong>{formatCompactCount(totalReach)} reach</strong>
                        <span>Last 7 days</span>
                    </div>
                    <div className="portal-reach-chart" aria-hidden="true">
                        {history.map((item) => (
                            <div className="portal-reach-chart-day" key={`${item.label}-${item.value}`}>
                                <span
                                    className="portal-reach-chart-bar"
                                    style={{ '--reach-bar-height': `${Math.max(10, Math.round((item.value / maxReach) * 100))}%` }}
                                />
                                <span className="portal-reach-chart-value">{formatCompactCount(item.value)}</span>
                                <span className="portal-reach-chart-label">{item.label}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        );

        return typeof document !== 'undefined'
            ? createPortal(modalMarkup, document.body)
            : modalMarkup;
    };

    const renderCandidateImagePreviewModal = () => {
        if (!candidateImagePreview) {
            return null;
        }

        const modalMarkup = (
            <div
                className="portal-image-preview-backdrop"
                role="presentation"
                onClick={(event) => {
                    if (event.target === event.currentTarget) {
                        closeCandidateImagePreview();
                    }
                }}
            >
                <div className="portal-image-preview-modal" role="dialog" aria-modal="true" aria-label="Image preview">
                    <div className="portal-image-preview-toolbar">
                        <button type="button" onClick={closeCandidateImagePreview} aria-label="Go back from image preview" title="Back">
                            Back
                        </button>
                        <span>{Math.round(candidateImagePreviewZoom * 100)}%</span>
                        <button type="button" onClick={() => adjustCandidateImagePreviewZoom(-0.25)} aria-label="Zoom out" title="Zoom out">
                            -
                        </button>
                        <button type="button" onClick={() => setCandidateImagePreviewZoom(1)} aria-label="Reset zoom" title="Reset zoom">
                            1:1
                        </button>
                        <button type="button" onClick={() => adjustCandidateImagePreviewZoom(0.25)} aria-label="Zoom in" title="Zoom in">
                            +
                        </button>
                    </div>
                    <div className="portal-image-preview-stage">
                        <img
                            src={candidateImagePreview.dataUrl}
                            alt={candidateImagePreview.name || 'Post image'}
                            style={{ transform: `scale(${candidateImagePreviewZoom})` }}
                        />
                    </div>
                </div>
            </div>
        );

        return typeof document !== 'undefined'
            ? createPortal(modalMarkup, document.body)
            : modalMarkup;
    };

    const renderCandidateProfilePostCard = (post, candidate) => {
        if (!post || typeof post !== 'object') {
            return null;
        }

        const postKey = getCandidatePostKey(post);
        const bodyText = asCandidatePostText(post.body || post.text || post.content, 'Talent story post');
        const comments = normalizeCandidatePostComments(post.comments);
        const reactions = post.reactions && typeof post.reactions === 'object' ? post.reactions : {};
        const reactionTotal = Object.values(reactions).reduce((total, value) => total + (Number(value) || 0), 0);
        const firstComment = comments[0];
        const media = post.media && typeof post.media === 'object'
            ? {
                dataUrl: typeof post.media.dataUrl === 'string' ? post.media.dataUrl : '',
                type: typeof post.media.type === 'string' ? post.media.type : '',
                name: asCandidatePostText(post.media.name, 'Post media')
            }
            : null;
        const isLongPostBody = bodyText.length > 245;
        const isPostBodyExpanded = Boolean(expandedCandidateProfilePosts[postKey]);
        const dateLabel = post.createdAt ? new Date(post.createdAt).toLocaleDateString() : 'Recent';
        const isReactionMenuOpen = openCandidateReactionPostId === postKey;
        const isCommentOpen = openCandidateCommentPostId === postKey;
        const isShareOpen = openCandidateSharePostId === postKey;
        const isOptionsOpen = openCandidateOptionsPostId === postKey;
        const commentDraft = candidateCommentDrafts[postKey] || '';
        const reactionsByUser = post.reactionsByUser && typeof post.reactionsByUser === 'object' ? post.reactionsByUser : {};
        const selectedReaction = reactionsByUser[String(currentUserId || 'candidate-viewer')] || '';

        return (
            <article
                className="portal-social-post-card portal-profile-preview-post-card candidate-section-profile-post-card"
                key={postKey}
            >
                <div className="portal-social-post-header">
                    <button
                        type="button"
                        className="portal-author-open-button portal-post-avatar"
                        onClick={(event) => {
                            event.stopPropagation();
                            openCandidateFromPostAuthor({
                                authorId: post.authorId || candidate.user || candidate.userId || candidate._id,
                                authorName: post.authorName || candidate.name
                            });
                        }}
                        aria-label={`Open ${asCandidatePostText(post.authorName || candidate.name, 'Candidate')} profile`}
                    >
                        <img
                            src={post.authorAvatar || candidate.profileImage || getCandidateDefaultProfileImage(candidate)}
                            alt={asCandidatePostText(post.authorName || candidate.name, 'Candidate')}
                        />
                    </button>
                    <div className="portal-post-title-block">
                        <h3 className="portal-post-author-name">
                            <button
                                type="button"
                                className="portal-author-name-button"
                                onClick={(event) => {
                                    event.stopPropagation();
                                    openCandidateFromPostAuthor({
                                        authorId: post.authorId || candidate.user || candidate.userId || candidate._id,
                                        authorName: post.authorName || candidate.name
                                    });
                                }}
                            >
                                {asCandidatePostText(post.authorName || candidate.name, 'Candidate')}
                            </button>
                        </h3>
                        <p>{asCandidatePostText(post.feedType, 'Talent story')} - {dateLabel}</p>
                    </div>
                    <div className="portal-post-header-actions">
                        <span className="portal-post-options-wrap">
                            <button
                                type="button"
                                className="portal-post-options-button"
                                onClick={(event) => {
                                    event.stopPropagation();
                                    setOpenCandidateOptionsPostId((openId) => (openId === postKey ? '' : postKey));
                                    setOpenCandidateReactionPostId('');
                                    setOpenCandidateCommentPostId('');
                                    setOpenCandidateSharePostId('');
                                }}
                                aria-expanded={isOptionsOpen}
                                aria-label="Post options"
                                title="Post options"
                            >
                                <svg viewBox="0 0 16 16" aria-hidden="true" focusable="false">
                                    <circle cx="3.2" cy="8" r="1.2" />
                                    <circle cx="8" cy="8" r="1.2" />
                                    <circle cx="12.8" cy="8" r="1.2" />
                                </svg>
                            </button>
                            {isOptionsOpen && (
                                <div className="portal-post-options-menu" role="menu">
                                    <button
                                        type="button"
                                        role="menuitem"
                                        onClick={(event) => {
                                            event.stopPropagation();
                                            navigator.clipboard?.writeText(window.location.href);
                                            setOpenCandidateOptionsPostId('');
                                        }}
                                    >
                                        Copy link
                                    </button>
                                </div>
                            )}
                        </span>
                    </div>
                </div>
                <div className="portal-post-reach-row">
                    {renderCandidateReachButton(post, postKey)}
                </div>
                {bodyText && (
                    <div className={`portal-post-body-wrap ${isLongPostBody && !isPostBodyExpanded ? 'is-collapsed' : 'is-expanded'}`}>
                        <p className="portal-post-body">{bodyText}</p>
                        {isLongPostBody && (
                            <button
                                type="button"
                                className="portal-post-see-more-button"
                                onClick={(event) => {
                                    event.stopPropagation();
                                    setExpandedCandidateProfilePosts((expanded) => ({
                                        ...expanded,
                                        [postKey]: !expanded[postKey]
                                    }));
                                }}
                                aria-expanded={isPostBodyExpanded}
                            >
                                {isPostBodyExpanded ? 'Show less' : 'See more'}
                            </button>
                        )}
                    </div>
                )}
                {media?.dataUrl && (
                    media.type === 'video' || media.type === 'image' ? (
                        <div className="portal-post-media">
                            {media.type === 'video' ? (
                                <video src={media.dataUrl} controls playsInline />
                            ) : (
                                <button
                                    type="button"
                                    className="portal-post-image-preview-button"
                                    onClick={(event) => openCandidateImagePreview(media, event)}
                                    aria-label="Open attached image full screen"
                                >
                                    <img src={media.dataUrl} alt={media.name || 'Post media'} />
                                </button>
                            )}
                        </div>
                    ) : (
                        <a className="portal-post-file-attachment" href={media.dataUrl} download={media.name || 'attachment'}>
                            <span>{media.name || 'Attached file'}</span>
                        </a>
                    )
                )}
                <div className="portal-post-action-cluster">
                    {isReactionMenuOpen && (
                        <ul className="portal-post-reactions portal-reaction-rail example-1 is-popover" aria-label="Post reactions">
                            {candidateReactionLabels.map((reaction) => (
                                <li key={reaction} className="portal-reaction-item icon-content">
                                    <button
                                        type="button"
                                        className={`portal-reaction-button portal-reaction-icon-button link reaction-${reaction.toLowerCase()} ${selectedReaction === reaction ? 'active' : ''}`}
                                        onClick={(event) => {
                                            event.stopPropagation();
                                            handleCandidateReaction(post, reaction);
                                        }}
                                        aria-label={`${reaction} reaction`}
                                        title={reaction}
                                    >
                                        <CandidateReactionIcon name={reaction} />
                                        <span className="candidate-reaction-label">{reaction}</span>
                                    </button>
                                </li>
                            ))}
                        </ul>
                    )}
                    <div className="portal-post-action-row">
                        <button
                            type="button"
                            className={`portal-reaction-trigger ${selectedReaction ? `has-reaction reaction-${selectedReaction.toLowerCase()}` : ''}`}
                            onClick={(event) => {
                                event.stopPropagation();
                                setOpenCandidateReactionPostId((openId) => (openId === postKey ? '' : postKey));
                                setOpenCandidateCommentPostId('');
                                setOpenCandidateSharePostId('');
                                setOpenCandidateOptionsPostId('');
                            }}
                            aria-expanded={isReactionMenuOpen}
                            aria-label="Choose reaction"
                        >
                            <CandidateReactionIcon name={selectedReaction || 'Like'} />
                        </button>
                        {reactionTotal > 0 && <span className="portal-reaction-trigger-count">{reactionTotal}</span>}
                        <button
                            type="button"
                            className={`portal-comment-toggle ${isCommentOpen ? 'active' : ''}`}
                            onClick={(event) => {
                                event.stopPropagation();
                                setOpenCandidateCommentPostId((openId) => (openId === postKey ? '' : postKey));
                                setOpenCandidateReactionPostId('');
                                setOpenCandidateSharePostId('');
                                setOpenCandidateOptionsPostId('');
                            }}
                            aria-expanded={isCommentOpen}
                            aria-label="Comment"
                        >
                            <svg viewBox="0 0 16 16" focusable="false" aria-hidden="true">
                                <path d="M0 2a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H4.414a1 1 0 0 0-.707.293L.854 15.146A.5.5 0 0 1 0 14.793z" />
                            </svg>
                        </button>
                        {comments.length > 0 && <span className="portal-comment-trigger-count">{comments.length}</span>}
                        <button
                            type="button"
                            className={`portal-share-toggle ${isShareOpen ? 'active' : ''}`}
                            onClick={(event) => {
                                event.stopPropagation();
                                setOpenCandidateSharePostId((openId) => (openId === postKey ? '' : postKey));
                                setOpenCandidateReactionPostId('');
                                setOpenCandidateCommentPostId('');
                                setOpenCandidateOptionsPostId('');
                                setCandidateShareStatus('');
                            }}
                            aria-expanded={isShareOpen}
                            aria-label="Share post"
                        >
                            <svg viewBox="0 0 16 16" focusable="false" aria-hidden="true">
                                <path d="M15 2.5A2.5 2.5 0 0 1 10.5 4L5.9 6.3a2.5 2.5 0 0 1 0 3.4l4.6 2.3A2.5 2.5 0 1 1 10 13.5c0-.2.02-.39.07-.57L5.45 10.6a2.5 2.5 0 1 1 0-5.2l4.62-2.33A2.5 2.5 0 1 1 15 2.5z" />
                            </svg>
                        </button>
                        {isShareOpen && (
                            <div className="portal-share-picker" role="dialog" aria-label="Share post with friend">
                                <strong>Share post</strong>
                                <button
                                    type="button"
                                    className="portal-share-friend portal-share-copy-button"
                                    onClick={(event) => {
                                        event.stopPropagation();
                                        handleCandidateCopyShare(post);
                                    }}
                                >
                                    <span className="portal-share-friend-avatar">
                                        <CandidateShareIcon />
                                    </span>
                                    <span>
                                        <span className="portal-share-friend-name">Copy or share post</span>
                                        <small>Use your device share tools</small>
                                    </span>
                                </button>
                                {mode === 'candidate' && candidateShareFriends.length ? (
                                    <div className="portal-share-friend-list">
                                        {candidateShareFriends.map((friend) => (
                                            <button
                                                key={friend.id}
                                                type="button"
                                                className="portal-share-friend"
                                                onClick={(event) => {
                                                    event.stopPropagation();
                                                    handleCandidateShareToFriend(post, friend);
                                                }}
                                                disabled={candidateSharingTargetId === friend.id}
                                            >
                                                <span className="portal-share-friend-avatar">
                                                    {friend.profileImage ? (
                                                        <img src={friend.profileImage} alt="" />
                                                    ) : (
                                                        <ProfileAvatar name={friend.name} className="portal-share-friend-avatar-fallback" />
                                                    )}
                                                </span>
                                                <span>
                                                    <span className="portal-share-friend-name">{friend.name}</span>
                                                    {friend.jumptakeId ? <small>{friend.jumptakeId}</small> : null}
                                                </span>
                                            </button>
                                        ))}
                                    </div>
                                ) : mode === 'candidate' ? (
                                    <p>No friends to share with yet.</p>
                                ) : null}
                                {candidateShareStatus && <p className="portal-share-status">{candidateShareStatus}</p>}
                            </div>
                        )}
                    </div>
                </div>
                {isCommentOpen && typeof document !== 'undefined' && createPortal(
                    <div
                        className="portal-comment-modal-backdrop candidate-comment-modal-backdrop"
                        role="presentation"
                        onClick={(event) => {
                            if (event.target === event.currentTarget) {
                                setOpenCandidateCommentPostId('');
                            }
                        }}
                    >
                        <div className="portal-comment-modal-card" role="dialog" aria-modal="true" aria-label="Make a comment" onClick={(event) => event.stopPropagation()}>
                            <button
                                type="button"
                                className="portal-comment-modal-close"
                                onClick={() => setOpenCandidateCommentPostId('')}
                                aria-label="Close comment composer"
                            >
                                &times;
                            </button>
                            <strong>Make a comment</strong>
                            <div className="portal-comment-composer">
                                <input
                                    type="text"
                                    value={commentDraft}
                                    onChange={(event) => setCandidateCommentDrafts((drafts) => ({ ...drafts, [postKey]: event.target.value }))}
                                    placeholder="Make a comment"
                                    aria-label="Make a comment"
                                    autoFocus
                                />
                                <button
                                    type="button"
                                    className="portal-comment-submit-button"
                                    onClick={() => handleCandidateCommentSubmit(post)}
                                    aria-label="Post comment"
                                    title="Post comment"
                                >
                                    <svg viewBox="0 0 16 16" aria-hidden="true" focusable="false">
                                        <path d={candidateReactionIconPaths.Comment} />
                                    </svg>
                                </button>
                            </div>
                        </div>
                    </div>,
                    document.body
                )}
                {firstComment && (
                    <div className="portal-post-comments portal-rotating-comment-rail">
                        <div className="portal-comment-item portal-comment-item-static">
                            <button type="button" className="portal-author-open-button portal-comment-avatar" onClick={() => openCandidateFromPostAuthor(firstComment)}>
                            <ProfileAvatar
                                imageSrc={firstComment.authorAvatar}
                                name={firstComment.authorName}
                                className="portal-comment-avatar-inner"
                                imageClassName="profile-avatar-image"
                                    useProfileIconFallback
                                />
                            </button>
                            <p>
                                <button type="button" className="portal-comment-name portal-author-name-button" onClick={() => openCandidateFromPostAuthor(firstComment)}>
                                    {firstComment.authorName || 'User'}
                                </button>: {firstComment.text}
                            </p>
                        </div>
                    </div>
                )}
            </article>
        );
    };

    const renderSelectedCandidateModal = () => {
        if (!selectedCandidate) {
            return null;
        }

        const candidateId = String(selectedCandidate._id || selectedCandidate.id || '');
        const profilePosts = (() => {
            try {
                return getCandidateProfilePosts(selectedCandidate);
            } catch (error) {
                console.error('Unable to render candidate profile posts:', error);
                return [];
            }
        })();
        const candidateName = asCandidatePostText(selectedCandidate.name, 'Candidate');
        const likeCount = candidateLikeCounts[candidateId] || 0;
        const isBookmarked = bookmarkedTalentIds.includes(candidateId);
        const socialPlatforms = ['facebook', 'instagram', 'linkedin', 'github'];
        const socialLinks = {
            facebook: asCandidatePostText(selectedCandidate.facebook || selectedCandidate.socialLinks?.facebook),
            instagram: asCandidatePostText(selectedCandidate.instagram || selectedCandidate.socialLinks?.instagram),
            linkedin: asCandidatePostText(selectedCandidate.linkedin || selectedCandidate.socialLinks?.linkedin),
            github: asCandidatePostText(selectedCandidate.github || selectedCandidate.socialLinks?.github)
        };
        const coverStyle = {
            '--tailor-cover-image': `url("${asCandidatePostText(selectedCandidate.coverImage, defaultTailorCoverImage)}")`
        };
        const jumpTakeId = String(getCandidateJumpTakeId(selectedCandidate) || '@JumpTakeID');
        const formattedJumpTakeId = jumpTakeId.startsWith('@') ? jumpTakeId : `@${jumpTakeId}`;

        const modalMarkup = (
            <div
                className={`portal-profile-detail-backdrop ${closingProfileDetailModal ? 'is-closing' : ''}`}
                role="presentation"
                onClick={(event) => {
                    if (event.target === event.currentTarget) {
                        handleCloseProfile();
                    }
                }}
            >
                <article
                    className="portal-profile-detail-modal candidate-profile-popup candidate-profile-from-candidates"
                    ref={candidateProfileRef}
                    role="dialog"
                    aria-modal="true"
                    aria-label={`${candidateName} tailor profile`}
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
                                alt={candidateName}
                            />
                        </div>
                        <div className="tailor-profile-info">
                            <div className="candidate-popup-name-row">
                                <p className="tailor-profile-name">
                                    <span className="candidate-popup-name-text">{candidateName}</span>
                                </p>
                            </div>
                            <div className="tailor-profile-title">{formattedJumpTakeId}</div>
                            <p className="portal-profile-detail-bio">{asCandidatePostText(selectedCandidate.bio || selectedCandidate.profile?.bio, 'No bio yet.')}</p>
                        </div>
                        {mode === 'candidate' && (
                            <div className="portal-profile-card-actions" aria-label={`${candidateName} quick actions`}>
                                        <button
                                            type="button"
                                            className={`portal-profile-card-action portal-profile-friend-action ${selectedCandidate.connectionStatus?.status === 'accepted' ? 'is-friend' : ''} ${selectedCandidate.connectionStatus?.status === 'pending' ? 'is-pending' : ''}`}
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
                                            <CandidateProfileFriendIcon status={selectedCandidate.connectionStatus?.status || ''} />
                                        </button>
                                        <button
                                            type="button"
                                            className={`portal-profile-card-action portal-profile-bookmark-action ${isBookmarked ? 'active' : ''}`}
                                            onClick={(event) => toggleTalentBookmark(selectedCandidate, event)}
                                            aria-label={isBookmarked ? 'Remove candidate bookmark' : 'Bookmark candidate'}
                                            title={isBookmarked ? 'Remove bookmark' : 'Bookmark candidate'}
                                        >
                                            <CandidateProfileBookmarkIcon />
                                        </button>
                            </div>
                        )}
                        <div className="tailor-social-links" aria-label={`${candidateName} social links`}>
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
                                                name: candidateName,
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
                    <ProfileDetailsCard
                        profile={selectedCandidate}
                        showHeader={false}
                        className="candidate-profile-preview-details-card"
                    />
                    {profilePosts.length > 0 ? (
                        <div className="portal-profile-detail-posts" aria-label={`${candidateName} posts`}>
                            <div className="portal-social-list portal-profile-preview-post-list">
                                {profilePosts.map((post) => {
                                    try {
                                        return renderCandidateProfilePostCard(post, selectedCandidate);
                                    } catch (error) {
                                        console.error('Skipping malformed candidate profile post:', error);
                                        return null;
                                    }
                                })}
                            </div>
                        </div>
                    ) : null}
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
                        <span key={`candidate-grow-${growAnimationKey}`} className="candidate-grow-together candidate-grow-replay">
                            <span className="candidate-grow-text">Grow Together</span>
                            <svg className="candidate-grow-icon" viewBox="0 0 16 16" aria-hidden="true">
                                <path fillRule="evenodd" d="M0 0h1v15h15v1H0zm10 3.5a.5.5 0 0 1 .5-.5h4a.5.5 0 0 1 .5.5v4a.5.5 0 0 1-1 0V4.9l-3.613 4.417a.5.5 0 0 1-.74.037L7.06 6.767l-3.656 5.027a.5.5 0 0 1-.808-.588l4-5.5a.5.5 0 0 1 .758-.06l2.609 2.61L13.445 4H10.5a.5.5 0 0 1-.5-.5" />
                            </svg>
                        </span>
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
                        <div className="candidate-list" aria-label="Candidates">
                            {pagedCandidateRows.map(({ candidate, spotlight }) => renderCandidateListRow(candidate, spotlight))}
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
            {renderCandidateReachInsightModal()}
            {renderCandidateImagePreviewModal()}

        </div>
    );
};

export default TalentPool;
