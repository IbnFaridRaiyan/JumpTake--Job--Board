import React, { useEffect, useState } from 'react';

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

const SavedPostIcon = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" focusable="false">
        <path d="m12 2 3.1 6.28 6.9 1-5 4.87 1.18 6.87L12 17.77l-6.18 3.25L7 14.15 2 9.28l6.9-1L12 2Z" />
    </svg>
);

const SavedPosts = ({ viewerId = 'guest', onFooterBack, embedded = false }) => {
    const [savedPosts, setSavedPosts] = useState([]);

    useEffect(() => {
        setSavedPosts(readSavedPosts(viewerId));
    }, [viewerId]);

    const removeSavedPost = (postId) => {
        setSavedPosts((currentPosts) => {
            const nextPosts = currentPosts.filter((post) => post.id !== postId);
            writeSavedPosts(viewerId, nextPosts);
            return nextPosts;
        });
    };

    return (
        <section className="saved-posts-section">
            {savedPosts.length === 0 ? (
                <div className="portal-feed-empty">No saved posts yet.</div>
            ) : (
                <div className="saved-posts-list">
                    {savedPosts.map((post) => (
                        <article key={post.id} className="saved-post-card">
                            <div className="saved-post-card-icon">
                                <SavedPostIcon />
                            </div>
                            <div className="saved-post-card-body">
                                <h3>{post.title || 'Saved post'}</h3>
                                <p>{post.subtitle || post.sourceTab || 'JumpTake'}</p>
                                <span>{post.body || 'Open this saved item in the feed.'}</span>
                            </div>
                            <div className="saved-post-card-actions">
                                <button type="button" onClick={() => { window.location.href = post.link; }}>
                                    Open
                                </button>
                                <button type="button" className="secondary" onClick={() => removeSavedPost(post.id)}>
                                    Remove
                                </button>
                            </div>
                        </article>
                    ))}
                </div>
            )}
            {onFooterBack && !embedded && (
                <button type="button" className="mobile-section-footer-back" onClick={onFooterBack}>
                    Back
                </button>
            )}
        </section>
    );
};

export default SavedPosts;
