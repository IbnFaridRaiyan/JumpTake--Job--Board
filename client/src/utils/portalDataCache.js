const portalDataCache = new Map();

export const readPortalDataCache = (key) => (
    key ? portalDataCache.get(key) : undefined
);

export const writePortalDataCache = (key, value) => {
    if (key) {
        portalDataCache.set(key, value);
    }
};

