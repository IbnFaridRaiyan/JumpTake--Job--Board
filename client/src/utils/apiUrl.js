export const getApiBase = () => {
    const configuredBase = (process.env.REACT_APP_API_URL || '').replace(/\/$/, '');
    if (typeof window === 'undefined') {
        return configuredBase;
    }

    if (configuredBase) {
        try {
            const configuredUrl = new URL(configuredBase);
            const isConfiguredLocalhost = ['localhost', '127.0.0.1', '::1'].includes(configuredUrl.hostname);
            const isBrowserLocalhost = ['localhost', '127.0.0.1', '::1'].includes(window.location.hostname);

            if (window.location.port === '3000' && isConfiguredLocalhost) {
                return '';
            }

            if (isConfiguredLocalhost && !isBrowserLocalhost) {
                configuredUrl.hostname = window.location.hostname;
                return configuredUrl.toString().replace(/\/$/, '');
            }
        } catch (error) {
            return configuredBase;
        }

        return configuredBase;
    }

    const { protocol, hostname, port } = window.location;
    return port === '3000' && hostname ? `${protocol}//${hostname}:5000` : '';
};

export const apiUrl = (path) => `${getApiBase()}${path}`;
