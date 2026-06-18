const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'jumptake-jwt-secret';

const getAuthenticatedPayload = (req) => {
    const authorization = req.headers.authorization || '';
    const token = authorization.startsWith('Bearer ') ? authorization.slice(7) : '';

    if (!token) {
        const error = new Error('Authentication is required');
        error.status = 401;
        throw error;
    }

    try {
        return jwt.verify(token, JWT_SECRET);
    } catch (verificationError) {
        const error = new Error('Invalid or expired authentication token');
        error.status = 401;
        throw error;
    }
};

const getAuthenticatedUserId = (req) => String(getAuthenticatedPayload(req).id);

const requireSameUser = (req, requestedUserId) => {
    const authenticatedUserId = getAuthenticatedUserId(req);

    if (String(requestedUserId) !== authenticatedUserId) {
        const error = new Error('You cannot access another candidate account');
        error.status = 403;
        throw error;
    }

    return authenticatedUserId;
};

module.exports = {
    getAuthenticatedUserId,
    getAuthenticatedPayload,
    requireSameUser
};
