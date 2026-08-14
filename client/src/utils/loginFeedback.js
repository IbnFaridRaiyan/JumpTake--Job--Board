export const LOGIN_WARNING_DURATION_MS = 4000;

export const getLoginFailureMessage = ({ role = 'candidate', status = 0, serverMessage = '' } = {}) => {
    const message = String(serverMessage || '').replace(/^error:\s*/i, '').trim();
    const normalized = message.toLowerCase();
    const isCredentialFailure = status === 401
        || /invalid credentials|incorrect (?:email|username|password)|wrong (?:email|username|password)/.test(normalized);
    const isMissingAccount = status === 404
        || /not registered|account not found|user not found|employer not found/.test(normalized);

    if (role === 'employer') {
        if (isMissingAccount) return 'This employer account is not registered.';
        if (isCredentialFailure) return 'The username or password is incorrect, or this employer account is not registered.';
    } else {
        if (isMissingAccount) return 'No candidate account is registered with this email.';
        if (isCredentialFailure) return 'The email or password is incorrect, or this candidate account is not registered.';
    }

    return message || 'Login failed. Please check your details and try again.';
};
