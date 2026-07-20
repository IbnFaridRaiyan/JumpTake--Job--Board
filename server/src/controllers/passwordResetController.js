const crypto = require('crypto');
const User = require('../models/User');
const Employer = require('../models/Employer');
const JobSeeker = require('../models/JobSeeker');
const { createSecurityNotification } = require('../utils/securityNotifications');

const DEFAULT_RESET_EXPIRY_MINUTES = 60;

const normalizeAccountType = (accountType) => (
    String(accountType || '').toLowerCase() === 'employer' ? 'employer' : 'candidate'
);

const getModelForAccountType = (accountType) => (
    normalizeAccountType(accountType) === 'employer' ? Employer : User
);

const getRecipientName = async (account, accountType) => {
    if (normalizeAccountType(accountType) === 'employer') {
        return account.username || 'there';
    }

    if (account.jobSeekerId) {
        const jobSeeker = await JobSeeker.findById(account.jobSeekerId).select('name');
        if (jobSeeker?.name) {
            return jobSeeker.name;
        }
    }

    const email = account.email || '';
    return email.includes('@') ? email.split('@')[0] : 'there';
};

const hashResetToken = (token) => (
    crypto.createHash('sha256').update(token).digest('hex')
);

const getResetExpiryMs = () => {
    const configuredMinutes = Number(process.env.PASSWORD_RESET_EXPIRY_MINUTES);
    const expiryMinutes = Number.isFinite(configuredMinutes) && configuredMinutes > 0
        ? configuredMinutes
        : DEFAULT_RESET_EXPIRY_MINUTES;

    return expiryMinutes * 60 * 1000;
};

const buildResetUrl = ({ origin, token, accountType }) => {
    const normalizedOrigin = String(origin || '').trim().replace(/\/+$/, '');
    const fallbackOrigin = process.env.APP_BASE_URL
        ? String(process.env.APP_BASE_URL).trim().replace(/\/+$/, '')
        : 'http://localhost:3000';

    const baseUrl = normalizedOrigin || fallbackOrigin;
    const params = new URLSearchParams({
        token,
        type: normalizeAccountType(accountType)
    });

    return `${baseUrl}/reset-password?${params.toString()}`;
};

const requestPasswordReset = async (req, res) => {
    try {
        const { email, accountType, origin } = req.body;

        if (!email) {
            return res.status(400).json({ error: 'Email is required' });
        }

        const normalizedEmail = String(email).trim().toLowerCase();
        const resolvedAccountType = normalizeAccountType(accountType);
        const AccountModel = getModelForAccountType(resolvedAccountType);
        const account = await AccountModel.findOne({ email: normalizedEmail });

        if (!account) {
            return res.status(404).json({
                error: 'No account was found for this email address.'
            });
        }

        const rawToken = crypto.randomBytes(32).toString('hex');
        const hashedToken = hashResetToken(rawToken);

        account.passwordResetToken = hashedToken;
        account.passwordResetExpiresAt = new Date(Date.now() + getResetExpiryMs());
        await account.save();

        const normalizedType = normalizeAccountType(resolvedAccountType);
        await createSecurityNotification({
            recipientType: normalizedType,
            recipientId: normalizedType === 'employer' ? account.companyId : account._id,
            title: 'Password reset requested',
            message: 'A password reset was requested for your JumpTake account. If this was not you, secure your email account.',
            payload: { event: 'password-reset-requested' }
        });

        return res.status(200).json({
            message: 'Password reset link created successfully.',
            resetUrl: buildResetUrl({
                origin,
                token: rawToken,
                accountType: resolvedAccountType
            }),
            recipientName: await getRecipientName(account, resolvedAccountType),
            accountType: resolvedAccountType
        });
    } catch (error) {
        console.error('Error requesting password reset:', error.message);
        return res.status(500).json({
            error: 'Failed to create password reset link',
            message: error.message
        });
    }
};

const validatePasswordResetToken = async (req, res) => {
    try {
        const { token, accountType } = req.query;

        if (!token) {
            return res.status(400).json({ error: 'Reset token is required' });
        }

        const AccountModel = getModelForAccountType(accountType);
        const hashedToken = hashResetToken(token);
        const account = await AccountModel.findOne({
            passwordResetToken: hashedToken,
            passwordResetExpiresAt: { $gt: new Date() }
        });

        if (!account) {
            return res.status(400).json({ error: 'Password reset link is invalid or has expired' });
        }

        return res.status(200).json({ message: 'Password reset link is valid' });
    } catch (error) {
        console.error('Error validating password reset token:', error.message);
        return res.status(500).json({
            error: 'Failed to validate password reset token',
            message: error.message
        });
    }
};

const confirmPasswordReset = async (req, res) => {
    try {
        const { token, accountType, newPassword } = req.body;

        if (!token || !newPassword) {
            return res.status(400).json({ error: 'Reset token and new password are required' });
        }

        if (String(newPassword).length < 6) {
            return res.status(400).json({ error: 'New password must be at least 6 characters long' });
        }

        const AccountModel = getModelForAccountType(accountType);
        const hashedToken = hashResetToken(token);
        const account = await AccountModel.findOne({
            passwordResetToken: hashedToken,
            passwordResetExpiresAt: { $gt: new Date() }
        });

        if (!account) {
            return res.status(400).json({ error: 'Password reset link is invalid or has expired' });
        }

        account.password = newPassword;
        account.passwordResetToken = null;
        account.passwordResetExpiresAt = null;
        await account.save();

        const normalizedType = normalizeAccountType(accountType);
        await createSecurityNotification({
            recipientType: normalizedType,
            recipientId: normalizedType === 'employer' ? account.companyId : account._id,
            title: 'Password reset completed',
            message: 'Your JumpTake password was reset successfully. If this was not you, contact support and secure your email account.',
            payload: { event: 'password-reset' }
        });

        return res.status(200).json({
            message: 'Password reset successfully'
        });
    } catch (error) {
        console.error('Error confirming password reset:', error.message);
        return res.status(500).json({
            error: 'Failed to reset password',
            message: error.message
        });
    }
};

module.exports = {
    requestPasswordReset,
    validatePasswordResetToken,
    confirmPasswordReset
};
