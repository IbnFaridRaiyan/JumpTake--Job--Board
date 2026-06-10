import React, { useState } from 'react';
import EmailVerificationFields from './EmailVerificationFields';
import {
    generateVerificationCode,
    getEmailVerificationExpiryMs,
    sendVerificationCodeEmail,
    validateEmailAddress
} from '../utils/emailVerification';

const CreateAccount = ({ email, jobSeekerId, onCancel }) => {
    const [userEmail, setUserEmail] = useState(email || '');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [verificationCode, setVerificationCode] = useState('');
    const [sentVerificationCode, setSentVerificationCode] = useState('');
    const [verificationTargetEmail, setVerificationTargetEmail] = useState('');
    const [verificationExpiresAt, setVerificationExpiresAt] = useState(null);
    const [isEmailVerified, setIsEmailVerified] = useState(false);
    const [isSendingVerificationCode, setIsSendingVerificationCode] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [message, setMessage] = useState('');
    const [accountCreated, setAccountCreated] = useState(false);

    const resetVerificationState = () => {
        setVerificationCode('');
        setSentVerificationCode('');
        setVerificationTargetEmail('');
        setVerificationExpiresAt(null);
        setIsEmailVerified(false);
    };

    const verifyCode = () => {
        if (!verificationTargetEmail || !sentVerificationCode) {
            setMessage('Please send a verification code to your email first.');
            return false;
        }

        if (Date.now() > verificationExpiresAt) {
            setMessage('Your verification code expired. Please request a new one.');
            setIsEmailVerified(false);
            return false;
        }

        if (verificationCode.trim() !== sentVerificationCode) {
            setMessage('The verification code you entered is incorrect.');
            setIsEmailVerified(false);
            return false;
        }

        setIsEmailVerified(true);
        return true;
    };

    const handleSendVerificationCode = async () => {
        const normalizedEmail = userEmail.trim().toLowerCase();

        if (!validateEmailAddress(normalizedEmail)) {
            setMessage('Please enter a valid email address before sending a verification code.');
            return;
        }

        setIsSendingVerificationCode(true);
        setMessage('Sending a verification code to your email...');

        try {
            const code = generateVerificationCode();
            await sendVerificationCodeEmail({
                email: normalizedEmail,
                recipientName: 'Candidate',
                verificationCode: code,
                accountType: 'candidate'
            });

            setSentVerificationCode(code);
            setVerificationTargetEmail(normalizedEmail);
            setVerificationExpiresAt(Date.now() + getEmailVerificationExpiryMs());
            setVerificationCode('');
            setIsEmailVerified(false);
            setMessage(`A 6 digit verification code was sent to ${normalizedEmail}.`);
        } catch (error) {
            console.error('Error sending verification code:', error);
            setMessage(`Error: ${error.message}`);
        } finally {
            setIsSendingVerificationCode(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
       
        if (!userEmail) {
            setMessage('Email is required');
            return;
        }
        
       
        if (!validateEmailAddress(userEmail)) {
            setMessage('Please enter a valid email address');
            return;
        }

        const normalizedEmail = userEmail.trim().toLowerCase();
        
        if (password.length < 6) {
            setMessage('Password must be at least 6 characters');
            return;
        }
        
        if (password !== confirmPassword) {
            setMessage('Passwords do not match');
            return;
        }

        if (verificationTargetEmail !== normalizedEmail) {
            setMessage('Please send a verification code to your current email address first.');
            return;
        }

        if (!isEmailVerified && !verifyCode()) {
            return;
        }
        
        setIsLoading(true);
        setMessage('Creating your account...');
        
        try {
            const response = await fetch((process.env.REACT_APP_API_URL || '') + '/api/create-account', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    email: normalizedEmail,
                    password,
                    jobSeekerId
                }),
            });
            
            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(data.message || 'Failed to create account');
            }
            
            setMessage('Account created successfully!');
            setAccountCreated(true);
        } catch (error) {
            console.error('Error creating account:', error);
            setMessage(`Error: ${error.message}`);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="account-form-container">
            <h3>Create Your Account</h3>
            
            {!accountCreated ? (
                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label htmlFor="email">Email (Username)</label>
                        <input
                            type="email"
                            id="email"
                            value={userEmail}
                            onChange={(e) => {
                                setUserEmail(e.target.value);
                                if (verificationTargetEmail && verificationTargetEmail !== e.target.value.trim().toLowerCase()) {
                                    resetVerificationState();
                                }
                            }}
                            className="account-input"
                            required
                        />
                        <p className="input-hint">You can modify your email if needed</p>
                    </div>

                    <EmailVerificationFields
                        verificationCode={verificationCode}
                        onVerificationCodeChange={setVerificationCode}
                        onSendCode={handleSendVerificationCode}
                        onResetVerification={resetVerificationState}
                        verificationTargetEmail={verificationTargetEmail}
                        isVerified={isEmailVerified}
                        isSendingCode={isSendingVerificationCode}
                        isDisabled={isLoading}
                    />
                    
                    <div className="form-group">
                        <label htmlFor="password">Password</label>
                        <input
                            type="password"
                            id="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="Enter a secure password"
                            className="account-input"
                            required
                        />
                    </div>
                    
                    <div className="form-group">
                        <label htmlFor="confirmPassword">Confirm Password</label>
                        <input
                            type="password"
                            id="confirmPassword"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            placeholder="Confirm your password"
                            className="account-input"
                            required
                        />
                    </div>
                    
                    <div className="button-group">
                        <button 
                            type="submit" 
                            className="submit-button"
                            disabled={isLoading || isSendingVerificationCode}
                        >
                            {isLoading ? 'Creating Account...' : 'Create Account'}
                        </button>
                        
                        <button 
                            type="button" 
                            onClick={onCancel} 
                            className="secondary-button"
                            disabled={isLoading}
                        >
                            Cancel
                        </button>
                    </div>
                </form>
            ) : (
                <div className="success-message">
                    <p>Your account has been created successfully!</p>
                    <p>You can now log in using your email and password.</p>
                </div>
            )}
            
            {message && <p className={`message ${accountCreated ? 'success' : ''}`}>{message}</p>}
        </div>
    );
};

export default CreateAccount;
