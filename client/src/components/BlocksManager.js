import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { apiUrl } from '../utils/apiUrl';
import ProfileAvatar from './ProfileAvatar';

const blockedFeedKey = (userId) => `jumptakeBlockedFeedAuthors:${userId || 'guest'}`;

const readBlockedFeedIds = (userId) => {
    try {
        const parsed = JSON.parse(localStorage.getItem(blockedFeedKey(userId)) || '[]');
        return Array.isArray(parsed) ? parsed.map(String) : [];
    } catch (error) {
        return [];
    }
};

const BlocksManager = ({ userId, profileData }) => {
    const [blockedConnections, setBlockedConnections] = useState([]);
    const [blockedFeedIds, setBlockedFeedIds] = useState(() => readBlockedFeedIds(userId));
    const [posts, setPosts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [message, setMessage] = useState('');
    const [selectedPost, setSelectedPost] = useState(null);

    const loadBlocks = useCallback(async () => {
        if (!userId) {
            setLoading(false);
            return;
        }

        try {
            setLoading(true);
            const token = localStorage.getItem('token') || '';
            const [connectionsResponse, workResponse, talentResponse] = await Promise.all([
                fetch(apiUrl(`/api/candidate-connections/user/${userId}`), {
                    headers: { Authorization: `Bearer ${token}` }
                }),
                fetch(apiUrl('/api/feed-posts?type=work-news')),
                fetch(apiUrl('/api/feed-posts?type=talent-story'))
            ]);
            const [connectionsData, workPosts, talentPosts] = await Promise.all([
                connectionsResponse.json().catch(() => ({})),
                workResponse.json().catch(() => []),
                talentResponse.json().catch(() => [])
            ]);

            if (!connectionsResponse.ok) {
                throw new Error(connectionsData.error || 'Failed to load blocked users');
            }

            setBlockedConnections(Array.isArray(connectionsData.blocked) ? connectionsData.blocked : []);
            setPosts([
                ...(Array.isArray(workPosts) ? workPosts : []),
                ...(Array.isArray(talentPosts) ? talentPosts : [])
            ]);
            setBlockedFeedIds(readBlockedFeedIds(userId));
        } catch (error) {
            setMessage(`Error: ${error.message}`);
        } finally {
            setLoading(false);
        }
    }, [userId]);

    useEffect(() => {
        loadBlocks();
    }, [loadBlocks]);

    useEffect(() => {
        if (!message) {
            return undefined;
        }
        const timer = window.setTimeout(() => setMessage(''), 2000);
        return () => window.clearTimeout(timer);
    }, [message]);

    useEffect(() => {
        if (!selectedPost) {
            return undefined;
        }

        const handleKeyDown = (event) => {
            if (event.key === 'Escape') {
                setSelectedPost(null);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [selectedPost]);

    const hiddenPosts = useMemo(() => posts.filter((post) => (
        Array.isArray(post.hiddenBy) && post.hiddenBy.map(String).includes(String(userId))
    )), [posts, userId]);

    const getPostAvatar = useCallback((post) => {
        const isViewerPost = String(post?.authorId || '') === String(userId || '');
        if (isViewerPost && profileData?.profileImage) {
            return profileData.profileImage;
        }
        return post?.authorAvatar || '';
    }, [profileData?.profileImage, userId]);

    const blockedFeedSources = useMemo(() => blockedFeedIds.map((id) => {
        const matchingPost = posts.find((post) => String(post.authorId || '') === id);
        return {
            id,
            name: matchingPost?.authorName || 'Blocked feed source'
        };
    }), [blockedFeedIds, posts]);

    const unblockCandidate = async (connectionId) => {
        try {
            const response = await fetch(apiUrl(`/api/candidate-connections/${connectionId}/respond`), {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${localStorage.getItem('token') || ''}`
                },
                body: JSON.stringify({ action: 'unblock' })
            });
            const data = await response.json().catch(() => ({}));
            if (!response.ok) {
                throw new Error(data.error || 'Failed to unblock candidate');
            }
            setBlockedConnections((current) => current.filter((item) => item._id !== connectionId));
            setMessage('Candidate unblocked.');
        } catch (error) {
            setMessage(`Error: ${error.message}`);
        }
    };

    const unblockFeedSource = (sourceId) => {
        const nextIds = blockedFeedIds.filter((id) => id !== sourceId);
        localStorage.setItem(blockedFeedKey(userId), JSON.stringify(nextIds));
        setBlockedFeedIds(nextIds);
        setMessage('Feed source unblocked.');
    };

    const unhidePost = async (post) => {
        const nextPost = {
            ...post,
            hiddenBy: (Array.isArray(post.hiddenBy) ? post.hiddenBy : [])
                .filter((id) => String(id) !== String(userId))
        };

        try {
            const response = await fetch(apiUrl(`/api/feed-posts/${post._id || post.id}`), {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(nextPost)
            });
            const data = await response.json().catch(() => ({}));
            if (!response.ok) {
                throw new Error(data.error || 'Failed to restore post');
            }
            setPosts((current) => current.map((item) => (
                String(item._id || item.id) === String(post._id || post.id) ? data : item
            )));
            setMessage('Post restored to your feed.');
        } catch (error) {
            setMessage(`Error: ${error.message}`);
        }
    };

    const renderPostPreview = () => {
        if (!selectedPost) {
            return null;
        }

        const postComments = Array.isArray(selectedPost.comments) ? selectedPost.comments : [];
        const reactionTotal = Object.values(selectedPost.reactions || {}).reduce((total, reaction) => {
            if (Array.isArray(reaction)) {
                return total + reaction.length;
            }
            return total + (Number(reaction) || 0);
        }, 0);
        const postTypeLabel = selectedPost.authorType === 'employer' ? 'Company update' : 'Talent story';
        const dateLabel = selectedPost.createdAt
            ? new Date(selectedPost.createdAt).toLocaleDateString()
            : 'Hidden post';
        const closePreview = () => setSelectedPost(null);
        const modalMarkup = (
            <div
                className="portal-post-detail-backdrop"
                role="presentation"
                onClick={(event) => {
                    if (event.target === event.currentTarget) {
                        closePreview();
                    }
                }}
            >
                <article
                    className="portal-post-detail-modal blocks-post-detail-modal"
                    role="dialog"
                    aria-modal="true"
                    aria-label={`Post by ${selectedPost.authorName || 'JumpTake user'}`}
                    onClick={(event) => event.stopPropagation()}
                >
                    <span
                        role="button"
                        tabIndex={0}
                        className="portal-post-detail-close"
                        onClick={closePreview}
                        onKeyDown={(event) => {
                            if (event.key === 'Enter' || event.key === ' ') {
                                event.preventDefault();
                                closePreview();
                            }
                        }}
                        aria-label="Close post"
                        title="Close"
                    >
                        &times;
                    </span>
                    <div className="portal-post-detail-header portal-opened-post-detail-header">
                        <ProfileAvatar
                            imageSrc={getPostAvatar(selectedPost)}
                            name={selectedPost.authorName || 'JumpTake user'}
                            className="portal-author-open-button portal-post-avatar blocks-post-avatar"
                            imageClassName="profile-avatar-image"
                            useProfileIconFallback
                        />
                        <div className="portal-post-title-block">
                            <h3 className="portal-post-author-name">
                                <span className="portal-author-name-button">{selectedPost.authorName || 'JumpTake user'}</span>
                            </h3>
                            <p>{postTypeLabel} - {dateLabel}</p>
                            {selectedPost.audience && selectedPost.audience !== 'everyone' && (
                                <small className="portal-audience-pill">{selectedPost.audience === 'only-me' ? 'Only me' : 'Friends only'}</small>
                            )}
                        </div>
                    </div>
                    {selectedPost.body ? <p className="portal-post-detail-body">{selectedPost.body}</p> : null}
                    {selectedPost.media?.dataUrl && (
                        selectedPost.media.type === 'video' || selectedPost.media.type === 'image' ? (
                            <div className="portal-post-media portal-post-detail-media">
                                {selectedPost.media.type === 'video' ? (
                                    <video src={selectedPost.media.dataUrl} controls playsInline />
                                ) : (
                                    <button type="button" className="portal-post-image-preview-button" aria-label="Post image">
                                        <img src={selectedPost.media.dataUrl} alt={selectedPost.media.name || 'Post media'} />
                                    </button>
                                )}
                            </div>
                        ) : (
                            <a className="portal-post-file-attachment portal-post-detail-file" href={selectedPost.media.dataUrl} download={selectedPost.media.name || 'attachment'}>
                                <span>{selectedPost.media.name || 'Attached file'}</span>
                            </a>
                        )
                    )}
                    {selectedPost.authorType === 'employer' && selectedPost.source ? (
                        <p className="portal-post-source-link portal-post-detail-source">
                            <span>Source:</span>{' '}
                            <a href={selectedPost.source} target="_blank" rel="noreferrer">{selectedPost.sourceTitle || selectedPost.source}</a>
                        </p>
                    ) : null}
                    <div className="portal-post-detail-stats" aria-label="Post stats">
                        <span><strong>{Number(selectedPost.reach) || 0}</strong> reach</span>
                        <span><strong>{reactionTotal}</strong> reactions</span>
                        <span><strong>{postComments.length}</strong> comments</span>
                    </div>
                    <div className="portal-post-detail-comments" aria-label="Post comments">
                        {postComments.length ? postComments.map((comment, index) => (
                            <div className="portal-comment-item" key={comment.id || comment._id || `hidden-post-comment-${index}`}>
                                <span className={`portal-author-open-button portal-comment-avatar ${comment.authorAvatar ? '' : 'has-default-profile-icon'}`}>
                                    {comment.authorAvatar ? (
                                        <img src={comment.authorAvatar} alt={comment.authorName || 'Comment author'} />
                                    ) : (
                                        <span className="portal-default-profile-icon" aria-hidden="true">{String(comment.authorName || 'J').charAt(0).toUpperCase()}</span>
                                    )}
                                </span>
                                <p className="portal-comment-line">
                                    <span className="portal-comment-author-inline">{comment.authorName || 'JumpTake user'}</span>
                                    <span className="portal-comment-copy">: {comment.text || ''}</span>
                                </p>
                            </div>
                        )) : <p className="portal-post-detail-empty">No comments yet.</p>}
                    </div>
                    <div className="blocks-post-detail-actions">
                        <button type="button" onClick={closePreview}>Close</button>
                        <button
                            type="button"
                            onClick={() => {
                                unhidePost(selectedPost);
                                closePreview();
                            }}
                        >
                            Unhide post
                        </button>
                    </div>
                </article>
            </div>
        );

        return typeof document !== 'undefined' ? createPortal(modalMarkup, document.body) : modalMarkup;
    };

    const renderEmpty = (text) => <p className="blocks-empty">{text}</p>;

    return (
        <section className="blocks-manager-section">
            {message && <div className={`notification-message ${message.startsWith('Error:') ? 'error' : 'success'}`}>{message}</div>}
            {loading ? (
                <div className="loading-message">Loading blocked and hidden content...</div>
            ) : (
                <div className="blocks-manager-grid">
                    <article className="blocks-manager-card">
                        <h3>Blocked Users</h3>
                        {blockedConnections.length ? blockedConnections.map((connection) => (
                            <div className="blocks-manager-row" key={connection._id}>
                                <span><strong>{connection.peer?.name || 'Candidate'}</strong><small>{connection.peer?.jumptakeId || 'JumpTake user'}</small></span>
                                <button type="button" onClick={() => unblockCandidate(connection._id)}>Unblock</button>
                            </div>
                        )) : renderEmpty('No blocked users.')}
                    </article>

                    <article className="blocks-manager-card">
                        <h3>Blocked Feed Sources</h3>
                        {blockedFeedSources.length ? blockedFeedSources.map((source) => (
                            <div className="blocks-manager-row" key={source.id}>
                                <span><strong>{source.name}</strong><small>Posts hidden from your feed</small></span>
                                <button type="button" onClick={() => unblockFeedSource(source.id)}>Unblock</button>
                            </div>
                        )) : renderEmpty('No blocked feed sources.')}
                    </article>

                    <article className="blocks-manager-card blocks-manager-card-wide">
                        <h3>Hidden Posts</h3>
                        {hiddenPosts.length ? hiddenPosts.map((post) => (
                            <div className="blocks-manager-row blocks-manager-hidden-post-row" key={post._id || post.id}>
                                <span>
                                    <strong title={post.authorName || 'JumpTake post'}>{post.authorName || 'JumpTake post'}</strong>
                                    <small title={post.body || 'Hidden post'}>{String(post.body || 'Hidden post').slice(0, 90)}</small>
                                </span>
                                <span className="blocks-manager-actions">
                                    <button type="button" className="blocks-view-post-button" onClick={() => setSelectedPost(post)}>View post</button>
                                    <button type="button" onClick={() => unhidePost(post)}>Unhide</button>
                                </span>
                            </div>
                        )) : renderEmpty('No hidden posts.')}
                    </article>

                    <article className="blocks-manager-card blocks-manager-card-wide">
                        <h3>Hidden Comments and Content</h3>
                        {renderEmpty('No hidden comments or additional content.')}
                    </article>
                </div>
            )}
            {renderPostPreview()}
        </section>
    );
};

export default BlocksManager;
