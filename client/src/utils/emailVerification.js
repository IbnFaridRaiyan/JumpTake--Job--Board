import emailjs from '@emailjs/browser';

const DEFAULT_EXPIRY_MINUTES = 10;

export const getEmailVerificationExpiryMs = () => {
    const configuredMinutes = Number(process.env.REACT_APP_EMAIL_VERIFICATION_EXPIRY_MINUTES);
    const expiryMinutes = Number.isFinite(configuredMinutes) && configuredMinutes > 0
        ? configuredMinutes
        : DEFAULT_EXPIRY_MINUTES;

    return expiryMinutes * 60 * 1000;
};

export const generateVerificationCode = () => (
    String(Math.floor(100000 + Math.random() * 900000))
);

export const validateEmailAddress = (email = '') => (
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email).trim())
);

export const sendVerificationCodeEmail = async ({
    email,
    recipientName,
    verificationCode,
    accountType
}) => {
    const serviceId = process.env.REACT_APP_EMAILJS_SERVICE_ID;
    const templateId = process.env.REACT_APP_EMAILJS_TEMPLATE_ID;
    const publicKey = process.env.REACT_APP_EMAILJS_PUBLIC_KEY;

    if (!serviceId || !templateId || !publicKey) {
        throw new Error('Email verification is not configured yet. Add the EmailJS client settings to continue.');
    }

    try {
        return await emailjs.send(
            serviceId,
            templateId,
            {
                to_email: email,
                email,
                user_email: email,
                recipient_email: email,
                to_name: recipientName || 'there',
                name: recipientName || 'there',
                user_name: recipientName || 'there',
                recipient_name: recipientName || 'there',
                verification_code: verificationCode,
                code: verificationCode,
                app_name: process.env.REACT_APP_EMAILJS_APP_NAME || 'JumpTake',
                account_type: accountType || 'account',
                reply_to: process.env.REACT_APP_EMAILJS_REPLY_TO || 'no-reply@jumptake.com'
            },
            publicKey
        );
    } catch (error) {
        const statusText = error?.status ? `Status ${error.status}` : '';
        const detailText = error?.text || error?.message || '';
        const combinedMessage = [statusText, detailText].filter(Boolean).join(': ');

        throw new Error(combinedMessage || 'EmailJS could not send the verification code.');
    }
};

export const sendPasswordResetEmail = async ({
    email,
    recipientName,
    resetUrl,
    accountType
}) => {
    const serviceId = process.env.REACT_APP_EMAILJS_PASSWORD_RESET_SERVICE_ID || process.env.REACT_APP_EMAILJS_SERVICE_ID;
    const templateId = process.env.REACT_APP_EMAILJS_PASSWORD_RESET_TEMPLATE_ID;
    const publicKey = process.env.REACT_APP_EMAILJS_PASSWORD_RESET_PUBLIC_KEY || process.env.REACT_APP_EMAILJS_PUBLIC_KEY;

    if (!serviceId || !templateId || !publicKey) {
        throw new Error('Password reset email is not configured yet. Add the EmailJS reset settings to continue.');
    }

    try {
        return await emailjs.send(
            serviceId,
            templateId,
            {
                to_email: email,
                email,
                user_email: email,
                recipient_email: email,
                to_name: recipientName || 'there',
                name: recipientName || 'there',
                user_name: recipientName || 'there',
                recipient_name: recipientName || 'there',
                reset_link: resetUrl,
                reset_url: resetUrl,
                password_reset_link: resetUrl,
                app_name: process.env.REACT_APP_EMAILJS_APP_NAME || 'JumpTake',
                account_type: accountType || 'account',
                reply_to: process.env.REACT_APP_EMAILJS_REPLY_TO || 'no-reply@jumptake.com'
            },
            publicKey
        );
    } catch (error) {
        const statusText = error?.status ? `Status ${error.status}` : '';
        const detailText = error?.text || error?.message || '';
        const combinedMessage = [statusText, detailText].filter(Boolean).join(': ');

        throw new Error(combinedMessage || 'EmailJS could not send the password reset email.');
    }
};

export const sendApplicationStatusEmail = async ({
    email,
    recipientName,
    statusTitle
}) => {
    const serviceId = process.env.REACT_APP_EMAILJS_APPLICATION_STATUS_SERVICE_ID;
    const templateId = process.env.REACT_APP_EMAILJS_APPLICATION_STATUS_TEMPLATE_ID;
    const publicKey = process.env.REACT_APP_EMAILJS_APPLICATION_STATUS_PUBLIC_KEY;

    if (!serviceId || !templateId || !publicKey) {
        throw new Error('Application status email is not configured yet. Add the EmailJS application status settings to continue.');
    }

    if (!email || !validateEmailAddress(email)) {
        throw new Error('Candidate email address is missing or invalid.');
    }

    try {
        return await emailjs.send(
            serviceId,
            templateId,
            {
                to_email: email,
                email,
                user_email: email,
                recipient_email: email,
                to_name: recipientName || 'there',
                name: recipientName || 'there',
                user_name: recipientName || 'there',
                recipient_name: recipientName || 'there',
                title: statusTitle || 'Application Updated',
                status: statusTitle || 'Application Updated',
                app_name: process.env.REACT_APP_EMAILJS_APP_NAME || 'JumpTake',
                reply_to: process.env.REACT_APP_EMAILJS_REPLY_TO || 'no-reply@jumptake.com'
            },
            publicKey
        );
    } catch (error) {
        const statusText = error?.status ? `Status ${error.status}` : '';
        const detailText = error?.text || error?.message || '';
        const combinedMessage = [statusText, detailText].filter(Boolean).join(': ');

        throw new Error(combinedMessage || 'EmailJS could not send the application status email.');
    }
};
