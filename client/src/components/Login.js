import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { sendPasswordResetEmail, validateEmailAddress } from '../utils/emailVerification';

const Login = ({ onClose }) => {
    const [mode, setMode] = useState('login');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [resetEmail, setResetEmail] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [message, setMessage] = useState('');
    const [isSuccess, setIsSuccess] = useState(false);
    const navigate = useNavigate();

    const handleSubmit = async (event) => {
        event.preventDefault();

        if (!email || !password) {
            setMessage('Email and password are required');
            setIsSuccess(false);
            return;
        }

        setIsLoading(true);
        setMessage('');

        try {
            const response = await fetch(`${process.env.REACT_APP_API_URL || ''}/api/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ email, password })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Login failed');
            }

            localStorage.setItem('token', data.token);
            localStorage.setItem('user', JSON.stringify({
                id: data.user.id,
                email: data.user.email
            }));

            setIsSuccess(true);
            setMessage('Login successful!');

            setTimeout(() => {
                onClose();
                navigate('/home');
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
                    accountType: 'candidate',
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
                accountType: 'candidate'
            });

            setMessage('A password reset link has been sent to your email.');
            setIsSuccess(true);
        } catch (error) {
            console.error('Forgot password error:', error);
            setMessage(error.message || 'Failed to send password reset email.');
            setIsSuccess(false);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="modal-overlay">
            <div className="login-modal">
                <div className="login-header">
                    <h2>Candidate Login</h2>
                    <div className="modal-brand">JumpTake</div>
                    <button className="close-button" onClick={onClose}>x</button>
                </div>

                {mode === 'login' ? (
                    <form onSubmit={handleSubmit}>
                        <div className="form-group">
                            <label htmlFor="email">Email</label>
                            <input
                                type="email"
                                id="email"
                                value={email}
                                onChange={(event) => setEmail(event.target.value)}
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
                                setResetEmail(email);
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

                        {message && (
                            <div className={`login-message ${isSuccess ? 'success' : 'error'}`}>
                                {message}
                            </div>
                        )}
                    </form>
                ) : (
                    <form onSubmit={handleForgotPassword}>
                        <p className="login-helper-text">
                            Enter your candidate account email and we will send you a password reset link.
                        </p>

                        <div className="form-group">
                            <label htmlFor="reset-email">Email</label>
                            <input
                                type="email"
                                id="reset-email"
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
            </div>
        </div>
    );
};

export default Login;
