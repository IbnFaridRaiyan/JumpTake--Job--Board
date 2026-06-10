import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

const ResetPasswordPage = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const token = searchParams.get('token') || '';
    const accountType = searchParams.get('type') === 'employer' ? 'employer' : 'candidate';
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [validating, setValidating] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [message, setMessage] = useState('');
    const [isSuccess, setIsSuccess] = useState(false);

    const loginReturnPath = useMemo(
        () => (accountType === 'employer' ? '/company' : '/job-seeker'),
        [accountType]
    );

    useEffect(() => {
        const validateToken = async () => {
            if (!token) {
                setMessage('This password reset link is missing its token.');
                setIsSuccess(false);
                setValidating(false);
                return;
            }

            try {
                setValidating(true);
                setMessage('');
                const params = new URLSearchParams({
                    token,
                    accountType
                });
                const response = await fetch(`${process.env.REACT_APP_API_URL || ''}/api/password-reset/validate?${params.toString()}`);
                const data = await response.json();

                if (!response.ok) {
                    throw new Error(data.error || 'Password reset link is invalid.');
                }

                setMessage('Choose a new password for your account.');
                setIsSuccess(true);
            } catch (error) {
                console.error('Error validating password reset token:', error);
                setMessage(error.message || 'Password reset link is invalid or has expired.');
                setIsSuccess(false);
            } finally {
                setValidating(false);
            }
        };

        validateToken();
    }, [accountType, token]);

    const handleSubmit = async (event) => {
        event.preventDefault();

        if (!password || !confirmPassword) {
            setMessage('Please enter and confirm your new password.');
            setIsSuccess(false);
            return;
        }

        if (password.length < 6) {
            setMessage('Your new password must be at least 6 characters long.');
            setIsSuccess(false);
            return;
        }

        if (password !== confirmPassword) {
            setMessage('The new password and confirmation do not match.');
            setIsSuccess(false);
            return;
        }

        try {
            setSubmitting(true);
            const response = await fetch(`${process.env.REACT_APP_API_URL || ''}/api/password-reset/confirm`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    token,
                    accountType,
                    newPassword: password
                })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to reset password.');
            }

            setMessage('Your password has been reset successfully. You can now sign in with the new password.');
            setIsSuccess(true);
            setPassword('');
            setConfirmPassword('');

            setTimeout(() => {
                navigate(loginReturnPath);
            }, 1800);
        } catch (error) {
            console.error('Error resetting password:', error);
            setMessage(error.message || 'Failed to reset password.');
            setIsSuccess(false);
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="reset-password-page">
            <div className="reset-password-card">
                <div className="reset-password-header">
                    <h1>Reset Password</h1>
                    <p>{accountType === 'employer' ? 'Employer account' : 'Candidate account'}</p>
                </div>

                {message && (
                    <div className={`login-message ${isSuccess ? 'success' : 'error'}`}>
                        {message}
                    </div>
                )}

                {validating ? (
                    <div className="loading-container">
                        <div className="loading-spinner"></div>
                        <p>Validating your reset link...</p>
                    </div>
                ) : isSuccess ? (
                    <form onSubmit={handleSubmit} className="reset-password-form">
                        <div className="form-group">
                            <label htmlFor="new-password">New Password</label>
                            <input
                                id="new-password"
                                type="password"
                                value={password}
                                onChange={(event) => setPassword(event.target.value)}
                                className="login-input"
                                required
                            />
                        </div>

                        <div className="form-group">
                            <label htmlFor="confirm-new-password">Confirm Password</label>
                            <input
                                id="confirm-new-password"
                                type="password"
                                value={confirmPassword}
                                onChange={(event) => setConfirmPassword(event.target.value)}
                                className="login-input"
                                required
                            />
                        </div>

                        <button type="submit" className="login-submit-button" disabled={submitting}>
                            {submitting ? 'Resetting Password...' : 'Reset Password'}
                        </button>

                        <button
                            type="button"
                            className="back-button responsive-back-button reset-password-back-button"
                            onClick={() => navigate(loginReturnPath)}
                        >
                            Back to Sign In
                        </button>
                    </form>
                ) : (
                    <div className="reset-password-actions">
                        <button
                            type="button"
                            className="back-button responsive-back-button reset-password-back-button"
                            onClick={() => navigate(loginReturnPath)}
                        >
                            Back to Sign In
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ResetPasswordPage;
