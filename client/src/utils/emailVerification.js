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
