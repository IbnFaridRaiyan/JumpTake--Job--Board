import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import confirmAction from '../utils/confirmAction';
import { apiUrl } from '../utils/apiUrl';

const SAVED_POSTS_STORAGE_PREFIX = 'jumptakeSavedPosts:';

const getSavedPostsStorageKey = (viewerId = 'guest') => `${SAVED_POSTS_STORAGE_PREFIX}${viewerId || 'guest'}`;

const readSavedPosts = (viewerId) => {
    if (typeof window === 'undefined') {
        return [];
    }

    try {
        const parsed = JSON.parse(localStorage.getItem(getSavedPostsStorageKey(viewerId)) || '[]');
        return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
        return [];
    }
};

const writeSavedPosts = (viewerId, posts) => {
    if (typeof window === 'undefined') {
        return;
    }

    localStorage.setItem(getSavedPostsStorageKey(viewerId), JSON.stringify(Array.isArray(posts) ? posts : []));
};

const getSavedRecordId = (savedPost) => String(
    savedPost?.postId
    || savedPost?.postSnapshot?._id
    || savedPost?.postSnapshot?.id
    || String(savedPost?.id || '').replace(/^(post|job):/, '')
);

const getSavedRecord = (savedPost) => savedPost?.postSnapshot || {
    _id: getSavedRecordId(savedPost),
    type: savedPost?.kind === 'job' ? 'job-post' : savedPost?.sourceTab === 'work-news' ? 'work-news' : 'talent-story',
    authorType: savedPost?.kind === 'job' || savedPost?.subtitle === 'Company update' ? 'employer' : 'candidate',
    authorName: savedPost?.authorName || savedPost?.title || 'JumpTake user',
    authorAvatar: savedPost?.authorAvatar || '',
    body: savedPost?.body || '',
    createdAt: savedPost?.createdAt || '',
    comments: [],
    reactions: {},
    reach: 0
};

const getReactionTotal = (reactions) => Object.values(reactions || {}).reduce((total, reaction) => {
    if (Array.isArray(reaction)) {
        return total + reaction.length;
    }
    return total + (Number(reaction) || 0);
}, 0);

const SavedPosts = ({ viewerId = 'guest', onFooterBack, embedded = false }) => {
    const [savedPosts, setSavedPosts] = useState([]);
    const [selectedSavedPost, setSelectedSavedPost] = useState(null);

    useEffect(() => {
        let active = true;
        const storedPosts = readSavedPosts(viewerId);
        setSavedPosts(storedPosts);

        const hydrateSavedPosts = async () => {
            try {
                const [workResponse, talentResponse] = await Promise.all([
                    fetch(apiUrl('/api/feed-posts?type=work-news')),
                    fetch(apiUrl('/api/feed-posts?type=talent-story'))
                ]);
                if (!workResponse.ok || !talentResponse.ok) {
                    return;
                }
                const [workPosts, talentPosts] = await Promise.all([workResponse.json(), talentResponse.json()]);
                const livePosts = [
                    ...(Array.isArray(workPosts) ? workPosts : []),
                    ...(Array.isArray(talentPosts) ? talentPosts : [])
                ];
                const livePostMap = new Map(livePosts.map((post) => [String(post._id || post.id), post]));
                const hydratedPosts = storedPosts.map((savedPost) => {
                    if (savedPost.kind && savedPost.kind !== 'post') {
                        return savedPost;
                    }
                    const livePost = livePostMap.get(getSavedRecordId(savedPost));
                    if (!livePost) {
                        return savedPost;
                    }
                    return {
                        ...savedPost,
                        postId: String(livePost._id || livePost.id),
                        title: livePost.authorName || savedPost.title,
                        subtitle: livePost.authorType === 'employer' ? 'Company update' : 'Talent story',
                        body: livePost.body || savedPost.body,
                        authorName: livePost.authorName || savedPost.authorName,
                        authorAvatar: livePost.authorAvatar || savedPost.authorAvatar || '',
                        createdAt: livePost.createdAt || savedPost.createdAt,
                        postSnapshot: livePost
                    };
                });

                if (active) {
                    setSavedPosts(hydratedPosts);
                    writeSavedPosts(viewerId, hydratedPosts);
                }
            } catch (error) {
                // Saved summaries remain available if the live feed is temporarily unavailable.
            }
        };

        hydrateSavedPosts();
        return () => {
            active = false;
        };
    }, [viewerId]);

    useEffect(() => {
        if (!selectedSavedPost) {
            return undefined;
        }
        const closeOnEscape = (event) => {
            if (event.key === 'Escape') {
                setSelectedSavedPost(null);
            }
        };
        window.addEventListener('keydown', closeOnEscape);
        return () => window.removeEventListener('keydown', closeOnEscape);
    }, [selectedSavedPost]);

    const removeSavedPost = async (postId) => {
        const confirmed = await confirmAction({
            title: 'Remove saved post?',
            message: 'Remove this post from your saved posts?'
        });
        if (!confirmed) {
            return;
        }

        setSavedPosts((currentPosts) => {
            const nextPosts = currentPosts.filter((post) => post.id !== postId);
            writeSavedPosts(viewerId, nextPosts);
            return nextPosts;
        });
        if (selectedSavedPost?.id === postId) {
            setSelectedSavedPost(null);
        }
    };

    const renderPostDetailModal = () => {
        if (!selectedSavedPost) {
            return null;
        }

        const post = getSavedRecord(selectedSavedPost);
        const comments = Array.isArray(post.comments) ? post.comments : [];
        const postTypeLabel = post.type === 'job-post'
            ? 'Job post'
            : post.authorType === 'employer' ? 'Company update' : 'Talent story';
        const dateLabel = post.createdAt ? new Date(post.createdAt).toLocaleDateString() : 'Saved post';
        const closeModal = () => setSelectedSavedPost(null);
        const modalMarkup = (
            <div
                className="portal-post-detail-backdrop"
                role="presentation"
                onClick={(event) => {
                    if (event.target === event.currentTarget) {
                        closeModal();
                    }
                }}
            >
                <article
                    className="portal-post-detail-modal"
                    role="dialog"
                    aria-modal="true"
                    aria-label={`Post by ${post.authorName || 'JumpTake user'}`}
                    onClick={(event) => event.stopPropagation()}
                >
                    <span
                        role="button"
                        tabIndex={0}
                        className="portal-post-detail-close"
                        onClick={closeModal}
                        onKeyDown={(event) => {
                            if (event.key === 'Enter' || event.key === ' ') {
                                event.preventDefault();
                                closeModal();
                            }
                        }}
                        aria-label="Close post"
                        title="Close"
                    >
                        &times;
                    </span>
                    <div className="portal-post-detail-header portal-opened-post-detail-header">
                        <span className={`portal-author-open-button portal-post-avatar ${post.authorAvatar ? '' : 'has-default-profile-icon'}`}>
                            {post.authorAvatar ? (
                                <img src={post.authorAvatar} alt={post.authorName || 'Post author'} />
                            ) : (
                                <span className="portal-default-profile-icon saved-post-avatar-fallback" aria-hidden="true">
                                    {String(post.authorName || 'J').charAt(0).toUpperCase()}
                                </span>
                            )}
                        </span>
                        <div className="portal-post-title-block">
                            <h3 className="portal-post-author-name"><span className="portal-author-name-button">{post.authorName || 'JumpTake user'}</span></h3>
                            <p>{postTypeLabel} - {dateLabel}</p>
                            {post.audience && post.audience !== 'everyone' && (
                                <small className="portal-audience-pill">{post.audience === 'only-me' ? 'Only me' : 'Friends only'}</small>
                            )}
                        </div>
                    </div>
                    {post.body ? <p className="portal-post-detail-body">{post.body}</p> : null}
                    {post.media?.dataUrl && (
                        post.media.type === 'video' || post.media.type === 'image' ? (
                            <div className="portal-post-media portal-post-detail-media">
                                {post.media.type === 'video' ? (
                                    <video src={post.media.dataUrl} controls playsInline />
                                ) : (
                                    <button type="button" className="portal-post-image-preview-button" aria-label="Post image">
                                        <img src={post.media.dataUrl} alt={post.media.name || 'Post media'} />
                                    </button>
                                )}
                            </div>
                        ) : (
                            <a className="portal-post-file-attachment portal-post-detail-file" href={post.media.dataUrl} download={post.media.name || 'attachment'}>
                                <span>{post.media.name || 'Attached file'}</span>
                            </a>
                        )
                    )}
                    {post.authorType === 'employer' && post.source ? (
                        <p className="portal-post-source-link portal-post-detail-source">
                            <span>Source:</span>{' '}
                            <a href={post.source} target="_blank" rel="noreferrer">{post.sourceTitle || post.source}</a>
                        </p>
                    ) : null}
                    <div className="portal-post-detail-stats" aria-label="Post stats">
                        <span><strong>{Number(post.reach) || 0}</strong> reach</span>
                        <span><strong>{getReactionTotal(post.reactions)}</strong> reactions</span>
                        <span><strong>{comments.length}</strong> comments</span>
                    </div>
                    <div className="portal-post-detail-comments" aria-label="Post comments">
                        {comments.length ? comments.map((comment, index) => (
                            <div className="portal-comment-item" key={comment.id || comment._id || `saved-comment-${index}`}>
                                <span className={`portal-author-open-button portal-comment-avatar ${comment.authorAvatar ? '' : 'has-default-profile-icon'}`}>
                                    {comment.authorAvatar ? (
                                        <img src={comment.authorAvatar} alt={comment.authorName || 'Comment author'} />
                                    ) : (
                                        <span className="portal-default-profile-icon saved-post-avatar-fallback" aria-hidden="true">{String(comment.authorName || 'J').charAt(0).toUpperCase()}</span>
                                    )}
                                </span>
                                <p className="portal-comment-line">
                                    <span className="portal-comment-author-inline">{comment.authorName || 'JumpTake user'}</span>
                                    <span className="portal-comment-copy">: {comment.text || ''}</span>
                                </p>
                            </div>
                        )) : <p className="portal-post-detail-empty">No comments yet.</p>}
                    </div>
                </article>
            </div>
        );

        return typeof document !== 'undefined' ? createPortal(modalMarkup, document.body) : modalMarkup;
    };

    return (
        <section className="saved-posts-section">
            {savedPosts.length === 0 ? (
                <div className="portal-feed-empty">No saved posts yet.</div>
            ) : (
                <div className="saved-posts-list">
                    {savedPosts.map((savedPost) => {
                        const post = getSavedRecord(savedPost);
                        const avatar = post.authorAvatar || savedPost.authorAvatar || '';
                        return (
                            <article key={savedPost.id} className="saved-post-card">
                                <div className="saved-post-card-icon saved-post-card-avatar">
                                    {avatar ? (
                                        <img src={avatar} alt={post.authorName || 'Post author'} />
                                    ) : (
                                        <span aria-hidden="true">{String(post.authorName || 'J').charAt(0).toUpperCase()}</span>
                                    )}
                                </div>
                                <div className="saved-post-card-body">
                                    <h3>{post.authorName || savedPost.title || 'Saved post'}</h3>
                                    <p>{post.authorType === 'employer' ? 'Company update' : savedPost.subtitle || 'Talent story'}</p>
                                    <span>{post.body || savedPost.body || 'Saved JumpTake post.'}</span>
                                </div>
                                <div className="saved-post-card-actions">
                                    <button type="button" className="saved-post-open-button" onClick={() => setSelectedSavedPost(savedPost)}>Open</button>
                                    <button type="button" className="saved-post-remove-button" onClick={() => removeSavedPost(savedPost.id)}>Remove</button>
                                </div>
                            </article>
                        );
                    })}
                </div>
            )}
            {renderPostDetailModal()}
            {onFooterBack && !embedded && (
                <button type="button" className="mobile-section-footer-back" onClick={onFooterBack}>Back</button>
            )}
        </section>
    );
};

export default SavedPosts;
