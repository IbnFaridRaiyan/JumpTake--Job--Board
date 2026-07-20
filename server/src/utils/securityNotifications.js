const { createNotification } = require('../controllers/notificationController');

const getClientIp = (req) => {
    const forwarded = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim();
    const address = forwarded || req.ip || req.socket?.remoteAddress || '';
    return String(address).replace(/^::ffff:/, '').slice(0, 120);
};

const createSecurityNotification = ({ recipientType, recipientId, title, message, payload = {} }) => (
    createNotification({
        recipientType,
        recipientId,
        title,
        message,
        section: 'settings',
        actionLabel: 'Review security',
        payload: { category: 'security', ...payload }
    })
);

const recordLogin = async ({ account, recipientType, recipientId, req, securityAlerts = true }) => {
    const currentIp = getClientIp(req);
    const previousIp = String(account.lastLoginIp || '');

    account.lastLoginIp = currentIp;
    account.lastLoginAt = new Date();
    await account.save();

    if (securityAlerts && currentIp && previousIp && currentIp !== previousIp) {
        await createSecurityNotification({
            recipientType,
            recipientId,
            title: 'New login detected',
            message: `A new login was detected from a different network address (${currentIp}). If this was not you, change your password now.`,
            payload: { event: 'new-login', ipAddress: currentIp }
        });
    }
};

module.exports = {
    createSecurityNotification,
    recordLogin
};
