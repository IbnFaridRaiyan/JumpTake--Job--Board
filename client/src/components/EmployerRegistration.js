import React, { useState } from 'react';
import EmailVerificationFields from './EmailVerificationFields';
import SocialAuthButtons from './SocialAuthButtons';
import {
    generateVerificationCode,
    getEmailVerificationExpiryMs,
    sendVerificationCodeEmail,
    validateEmailAddress
} from '../utils/emailVerification';
import TermsAgreement from './TermsAgreement';

const EmployerRegistration = ({ companyId, companyName, onComplete }) => {
    const [username, setUsername] = useState('');
    const [email, setEmail] = useState('');
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
    const [registrationComplete, setRegistrationComplete] = useState(false);
    const [acceptedTerms, setAcceptedTerms] = useState(false);

    const resetVerificationState = () => {
        setVerificationCode('');
        setSentVerificationCode('');
        setVerificationTargetEmail('');
        setVerificationExpiresAt(null);
        setIsEmailVerified(false);
    };

    const verifyCode = () => {
        if (!verificationTargetEmail || !sentVerificationCode) {
            setMessage('Click Create Employer Account to send a verification code to your email first.');
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
        setMessage('Email verified successfully. Creating your employer account...');
        return true;
    };

    const handleSendVerificationCode = async () => {
        const normalizedEmail = email.trim().toLowerCase();

        if (!username.trim()) {
            setMessage('Username is required before sending a verification code.');
            return;
        }

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
                recipientName: username.trim(),
                verificationCode: code,
                accountType: 'employer'
            });

            setSentVerificationCode(code);
            setVerificationTargetEmail(normalizedEmail);
            setVerificationExpiresAt(Date.now() + getEmailVerificationExpiryMs());
            setVerificationCode('');
            setIsEmailVerified(false);
            setMessage(`A 6 digit verification code was sent to ${normalizedEmail}. Enter it below, then click Create Employer Account again to complete sign up.`);
            return true;
        } catch (error) {
            console.error('Error sending employer verification code:', error);
            setMessage(`Error: ${error.message}`);
            return false;
        } finally {
            setIsSendingVerificationCode(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
       
        if (!username) {
            setMessage('Username is required');
            return;
        }

        if (!email.trim()) {
            setMessage('Email is required');
            return;
        }

        if (!validateEmailAddress(email)) {
            setMessage('Please enter a valid email address');
            return;
        }
        
        if (password.length < 6) {
            setMessage('Password must be at least 6 characters');
            return;
        }
        
        if (password !== confirmPassword) {
            setMessage('Passwords do not match');
            return;
        }

        if (!acceptedTerms) {
            setMessage('Please accept the Terms and Conditions before creating your employer account.');
            return;
        }

        const normalizedEmail = email.trim().toLowerCase();

        if (verificationTargetEmail !== normalizedEmail || !sentVerificationCode) {
            await handleSendVerificationCode();
            return;
        }

        if (!isEmailVerified && !verifyCode()) {
            return;
        }
        
        setIsLoading(true);
        setMessage('Creating your employer account...');
        
        try {
            const response = await fetch((process.env.REACT_APP_API_URL || '') + '/api/employer/register', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    username,
                    email: normalizedEmail,
                    password,
                    companyId
                }),
            });
            
            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(data.error || 'Failed to register employer account');
            }
            
            setMessage('Registration successful! You can now log in as an employer.');
            setRegistrationComplete(true);
            
            
            setTimeout(() => {
                onComplete();
            }, 2000);
            
        } catch (error) {
            console.error('Error registering employer:', error);
            setMessage(`Error: ${error.message}`);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="registration-form-container">
            <h3>Create Employer Account for {companyName}</h3>
            <SocialAuthButtons role="employer" onError={setMessage} />
            
            {!registrationComplete ? (
                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label htmlFor="username">Username</label>
                        <input
                            type="text"
                            id="username"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            className="registration-input"
                            required
                        />
                        <p className="input-hint">Choose a username for logging in</p>
                    </div>
                    
                    <div className="form-group">
                        <label htmlFor="email">Email</label>
                        <input
                            type="email"
                            id="email"
                            value={email}
                            onChange={(e) => {
                                setEmail(e.target.value);
                                if (verificationTargetEmail && verificationTargetEmail !== e.target.value.trim().toLowerCase()) {
                                    resetVerificationState();
                                }
                            }}
                            className="registration-input"
                            required
                        />
                        <p className="input-hint">This email will be used for verification and employer notifications</p>
                    </div>

                    <div className="form-group">
                        <label htmlFor="password">Password</label>
                        <input
                            type="password"
                            id="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="Enter a secure password"
                            className="registration-input"
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
                            className="registration-input"
                            required
                        />
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
                        showSendButton={false}
                    />

                    <TermsAgreement
                        accepted={acceptedTerms}
                        onAcceptedChange={setAcceptedTerms}
                        disabled={isLoading || isSendingVerificationCode}
                    />

                    <button 
                        type="submit" 
                        className="submit-button"
                        disabled={isLoading || isSendingVerificationCode || !acceptedTerms}
                    >
                        {isLoading
                            ? 'Creating Account...'
                            : verificationTargetEmail && !isEmailVerified
                                ? 'Verify Code & Create Employer Account'
                                : 'Create Employer Account'}
                    </button>
                </form>
            ) : (
                <div className="success-message">
                    <p>Your employer account has been created successfully!</p>
                    <p>You will be redirected to the login screen...</p>
                </div>
            )}
            
            {message && <p className={`message ${registrationComplete ? 'success' : ''}`}>{message}</p>}
        </div>
    );
};

export default EmployerRegistration;
