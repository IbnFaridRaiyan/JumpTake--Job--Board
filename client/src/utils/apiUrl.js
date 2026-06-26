export const getApiBase = () => {
    const configuredBase = (process.env.REACT_APP_API_URL || '').replace(/\/$/, '');
    if (configuredBase) {
        return configuredBase;
    }

    if (typeof window === 'undefined') {
        return '';
    }

    const { protocol, hostname, port } = window.location;
    return port === '3000' && hostname ? `${protocol}//${hostname}:5000` : '';
};

export const apiUrl = (path) => `${getApiBase()}${path}`;
