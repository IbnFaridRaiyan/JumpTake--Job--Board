const GLOBAL_LOCAL_STORAGE_KEYS = new Set([
    'jumptakeAppMode',
    'jumptakeCookieConsent'
]);

const AUTH_LOCAL_STORAGE_KEYS = new Set([
    'token',
    'user',
    'employerToken',
    'employer',
    'jobSeekerId',
    'tempJobSeekerId'
]);

const removeSameOriginCookies = () => {
    if (typeof document === 'undefined' || !document.cookie) {
        return;
    }

    document.cookie.split(';').forEach((cookie) => {
        const name = cookie.split('=')[0]?.trim();
        if (!name) {
            return;
        }

        document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
    });
};

const removeMatchingStorageKeys = (storage, shouldRemove) => {
    if (!storage) {
        return;
    }

    try {
        Object.keys(storage).forEach((key) => {
            if (shouldRemove(key)) {
                storage.removeItem(key);
            }
        });
    } catch (error) {
        // Storage may be unavailable in private or restricted browser contexts.
    }
};

export const clearBrowserAccountState = () => {
    if (typeof window === 'undefined') {
        return;
    }

    removeMatchingStorageKeys(window.localStorage, (key) => (
        AUTH_LOCAL_STORAGE_KEYS.has(key)
        || (key.startsWith('jumptake') && !GLOBAL_LOCAL_STORAGE_KEYS.has(key))
    ));

    removeMatchingStorageKeys(window.sessionStorage, (key) => key.startsWith('jumptake'));
    removeSameOriginCookies();
};

export const persistCandidateSession = ({ token, user, jobSeekerId }) => {
    clearBrowserAccountState();

    const nextUser = {
        ...(user || {}),
        jobSeekerId: jobSeekerId || user?.jobSeekerId || null
    };

    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(nextUser));
    return nextUser;
};

export const persistEmployerSession = ({ token, employer }) => {
    clearBrowserAccountState();
    localStorage.setItem('employerToken', token);
    localStorage.setItem('employer', JSON.stringify(employer || {}));
    return employer;
};
