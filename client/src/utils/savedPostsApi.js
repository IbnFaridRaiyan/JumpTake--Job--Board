import { apiUrl } from './apiUrl';

const SAVED_POSTS_STORAGE_PREFIX = 'jumptakeSavedPosts:';

export const getLegacySavedPostsStorageKey = (viewerId = 'guest') => (
    `${SAVED_POSTS_STORAGE_PREFIX}${viewerId || 'guest'}`
);

export const readLegacySavedPosts = (viewerId) => {
    if (typeof window === 'undefined') {
        return [];
    }

    try {
        const parsed = JSON.parse(localStorage.getItem(getLegacySavedPostsStorageKey(viewerId)) || '[]');
        return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
        return [];
    }
};

const getToken = (mode = 'candidate') => {
    if (typeof window === 'undefined') {
        return '';
    }

    return mode === 'employer'
        ? localStorage.getItem('employerToken') || ''
        : localStorage.getItem('token') || '';
};

const requestSavedPosts = async (path, { mode = 'candidate', method = 'GET', body } = {}) => {
    const token = getToken(mode);
    if (!token) {
        throw new Error('Sign in to access saved posts across devices.');
    }

    const response = await fetch(apiUrl(path), {
        method,
        headers: {
            Authorization: `Bearer ${token}`,
            ...(body === undefined ? {} : { 'Content-Type': 'application/json' })
        },
        ...(body === undefined ? {} : { body: JSON.stringify(body) })
    });
    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
        throw new Error(data.message || data.error || 'Saved posts are temporarily unavailable.');
    }

    return data;
};

export const loadSavedPosts = async ({ viewerId, mode = 'candidate' }) => {
    const legacyPosts = readLegacySavedPosts(viewerId);
    if (!legacyPosts.length) {
        return requestSavedPosts('/api/saved-posts', { mode });
    }

    const migratedPosts = await requestSavedPosts('/api/saved-posts/migrate', {
        mode,
        method: 'POST',
        body: { posts: legacyPosts }
    });

    if (typeof window !== 'undefined') {
        localStorage.removeItem(getLegacySavedPostsStorageKey(viewerId));
    }

    return migratedPosts;
};

export const savePostToAccount = (savedPost, mode = 'candidate') => (
    requestSavedPosts('/api/saved-posts', {
        mode,
        method: 'POST',
        body: savedPost
    })
);

export const removePostFromAccount = (savedKey, mode = 'candidate') => (
    requestSavedPosts(`/api/saved-posts/${encodeURIComponent(savedKey)}`, {
        mode,
        method: 'DELETE'
    })
);
