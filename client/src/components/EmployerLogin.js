import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { sendPasswordResetEmail, validateEmailAddress } from '../utils/emailVerification';

const EmployerLogin = ({ onClose }) => {
    const [mode, setMode] = useState('login');
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [resetEmail, setResetEmail] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [message, setMessage] = useState('');
    const [isSuccess, setIsSuccess] = useState(false);
    const navigate = useNavigate();

    const handleSubmit = async (event) => {
        event.preventDefault();

        if (!username || !password) {
            setMessage('Username and password are required');
            setIsSuccess(false);
            return;
        }

        setIsLoading(true);
        setMessage('');

        try {
            const response = await fetch(`${process.env.REACT_APP_API_URL || ''}/api/employer/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ username, password })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Login failed');
            }

            localStorage.setItem('employerToken', data.token);
            localStorage.setItem('employer', JSON.stringify({
                id: data.employer.id,
                username: data.employer.username,
                companyId: data.employer.companyId,
                companyName: data.employer.companyName
            }));

            setIsSuccess(true);
            setMessage('Login successful!');

            setTimeout(() => {
                onClose();
                navigate('/employer-dashboard#employer:home', { replace: true });
            }, 1500);
        } catch (error) {
            console.error('Login error:', error);
            setMessage(`Error: ${error.message}`);
            setIsSuccess(false);
        } finally {
            setIsLoading(false);
        }
    };

    const handleForgotPassword = async (event) => {
        event.preventDefault();

        const normalizedEmail = resetEmail.trim().toLowerCase();

        if (!validateEmailAddress(normalizedEmail)) {
            setMessage('Please enter a valid email address to receive a reset link.');
            setIsSuccess(false);
            return;
        }

        try {
            setIsLoading(true);
            setMessage('');
            setIsSuccess(false);

            const response = await fetch(`${process.env.REACT_APP_API_URL || ''}/api/password-reset/request`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    email: normalizedEmail,
                    accountType: 'employer',
                    origin: window.location.origin
                })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to prepare the password reset link.');
            }

            if (!data.resetUrl) {
                throw new Error('No password reset link was generated for this email address.');
            }

            await sendPasswordResetEmail({
                email: normalizedEmail,
                recipientName: data.recipientName || normalizedEmail.split('@')[0],
                resetUrl: data.resetUrl,
                accountType: 'employer'
            });

            setMessage('A password reset link has been sent to your email.');
            setIsSuccess(true);
        } catch (error) {
            console.error('Employer forgot password error:', error);
            setMessage(error.message || 'Failed to send password reset email.');
            setIsSuccess(false);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="modal-overlay">
            <div className="login-modal">
                <button type="button" className="login-modal-close" onClick={onClose} aria-label="Close employer login">
                    ×
                </button>
                <div className="login-header">
                    <h2>Employer Login</h2>
                    <div className="modal-brand">JumpTake</div>
                </div>

                {mode === 'login' ? (
                    <form onSubmit={handleSubmit} className="modern-login-form">
                        <div className="form-group">
                            <label htmlFor="username">Username</label>
                            <input
                                type="text"
                                id="username"
                                value={username}
                                onChange={(event) => setUsername(event.target.value)}
                                className="login-input"
                                required
                            />
                        </div>

                        <div className="form-group">
                            <label htmlFor="password">Password</label>
                            <input
                                type="password"
                                id="password"
                                value={password}
                                onChange={(event) => setPassword(event.target.value)}
                                className="login-input"
                                required
                            />
                        </div>

                        <button
                            type="button"
                            className="login-link-button"
                            onClick={() => {
                                setMode('forgot');
                                setMessage('');
                                setIsSuccess(false);
                            }}
                        >
                            Forgot Password?
                        </button>

                        <button
                            type="submit"
                            className="login-submit-button"
                            disabled={isLoading}
                        >
                            {isLoading ? 'Logging in...' : 'Login'}
                        </button>

                        <p className="login-signup">
                            Don't have an account?{' '}
                            <button
                                type="button"
                                onClick={() => {
                                    onClose();
                                    navigate('/company');
                                }}
                            >
                                Sign up
                            </button>
                        </p>

                        {message && (
                            <div className={`login-message ${isSuccess ? 'success' : 'error'}`}>
                                {message}
                            </div>
                        )}
                    </form>
                ) : (
                    <form onSubmit={handleForgotPassword} className="modern-login-form">
                        <p className="login-helper-text">
                            Enter your employer account email and we will send you a password reset link.
                        </p>

                        <div className="form-group">
                            <label htmlFor="employer-reset-email">Email</label>
                            <input
                                type="email"
                                id="employer-reset-email"
                                value={resetEmail}
                                onChange={(event) => setResetEmail(event.target.value)}
                                className="login-input"
                                required
                            />
                        </div>

                        <button
                            type="submit"
                            className="login-submit-button"
                            disabled={isLoading}
                        >
                            {isLoading ? 'Sending Reset Link...' : 'Send Reset Link'}
                        </button>

                        <button
                            type="button"
                            className="login-link-button login-link-button-secondary"
                            onClick={() => {
                                setMode('login');
                                setMessage('');
                                setIsSuccess(false);
                            }}
                        >
                            Back to Login
                        </button>

                        {message && (
                            <div className={`login-message ${isSuccess ? 'success' : 'error'}`}>
                                {message}
                            </div>
                        )}
                    </form>
                )}
                <button type="button" className="login-bottom-close" onClick={onClose}>
                    Close
                </button>
            </div>
        </div>
    );
};

export default EmployerLogin;
