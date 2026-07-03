import React, { useState } from 'react';
import EmailVerificationFields from './EmailVerificationFields';
import {
    generateVerificationCode,
    getEmailVerificationExpiryMs,
    sendVerificationCodeEmail,
    validateEmailAddress
} from '../utils/emailVerification';
import { persistCandidateSession } from '../utils/authStorage';
import TermsAgreement from './TermsAgreement';


const Register = ({ jobSeekerId, initialName = '', initialEmail = '', onClose, onSuccess }) => {
    const [formData, setFormData] = useState({
        name: initialName,
        email: initialEmail,
        password: '',
        confirmPassword: ''
    });
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [verificationCode, setVerificationCode] = useState('');
    const [sentVerificationCode, setSentVerificationCode] = useState('');
    const [verificationTargetEmail, setVerificationTargetEmail] = useState('');
    const [verificationExpiresAt, setVerificationExpiresAt] = useState(null);
    const [isEmailVerified, setIsEmailVerified] = useState(false);
    const [isSendingVerificationCode, setIsSendingVerificationCode] = useState(false);
    const [acceptedTerms, setAcceptedTerms] = useState(false);

    const resetVerificationState = () => {
        setVerificationCode('');
        setSentVerificationCode('');
        setVerificationTargetEmail('');
        setVerificationExpiresAt(null);
        setIsEmailVerified(false);
    };
    
    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData({
            ...formData,
            [name]: value
        });

        if (name === 'email' && verificationTargetEmail && verificationTargetEmail !== value.trim().toLowerCase()) {
            resetVerificationState();
        }
    };

    const verifyCode = () => {
        if (!verificationTargetEmail || !sentVerificationCode) {
            setError('Please send a verification code to your email first.');
            return false;
        }

        if (Date.now() > verificationExpiresAt) {
            setError('Your verification code expired. Please request a new one.');
            setIsEmailVerified(false);
            return false;
        }

        if (verificationCode.trim() !== sentVerificationCode) {
            setError('The verification code you entered is incorrect.');
            setIsEmailVerified(false);
            return false;
        }

        setIsEmailVerified(true);
        setError('');
        return true;
    };

    const handleSendVerificationCode = async () => {
        const normalizedEmail = formData.email.trim().toLowerCase();

        if (!formData.name.trim()) {
            setError('Full name is required before sending a verification code.');
            return;
        }

        if (!validateEmailAddress(normalizedEmail)) {
            setError('Please enter a valid email address before sending a verification code.');
            return;
        }

        setError('');
        setIsSendingVerificationCode(true);

        try {
            const code = generateVerificationCode();
            await sendVerificationCodeEmail({
                email: normalizedEmail,
                recipientName: formData.name.trim(),
                verificationCode: code,
                accountType: 'candidate'
            });

            setSentVerificationCode(code);
            setVerificationTargetEmail(normalizedEmail);
            setVerificationExpiresAt(Date.now() + getEmailVerificationExpiryMs());
            setVerificationCode('');
            setIsEmailVerified(false);
        } catch (sendError) {
            console.error('Error sending candidate verification code:', sendError);
            setError(sendError.message || 'Failed to send verification code');
        } finally {
            setIsSendingVerificationCode(false);
        }
    };
    
    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        
        
        if (!formData.name || !formData.email || !formData.password) {
            setError('All fields are required');
            return;
        }
        
        if (formData.password !== formData.confirmPassword) {
            setError('Passwords do not match');
            return;
        }
        
        if (formData.password.length < 6) {
            setError('Password must be at least 6 characters');
            return;
        }

        const normalizedEmail = formData.email.trim().toLowerCase();

        if (!validateEmailAddress(normalizedEmail)) {
            setError('Please enter a valid email address');
            return;
        }

        if (!acceptedTerms) {
            setError('Please accept the Terms and Conditions before creating your account.');
            return;
        }

        if (verificationTargetEmail !== normalizedEmail) {
            setError('Please send a verification code to your current email address first.');
            return;
        }

        if (!isEmailVerified && !verifyCode()) {
            return;
        }
        
        setIsLoading(true);
        
        try {
          
            const registerResponse = await fetch((process.env.REACT_APP_API_URL || '') + '/api/users/register', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    name: formData.name,
                    email: normalizedEmail,
                    password: formData.password,
                    jobSeekerId: jobSeekerId
                })
            });
            
            const registerData = await registerResponse.json();
            
            if (!registerResponse.ok) {
                throw new Error(registerData.message || 'Registration failed');
            }
            
            
            const loginResponse = await fetch((process.env.REACT_APP_API_URL || '') + '/api/users/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    email: normalizedEmail,
                    password: formData.password
                })
            });
            
            const loginData = await loginResponse.json();
            
            if (!loginResponse.ok) {
                throw new Error(loginData.message || 'Login failed after registration');
            }
            
          
            persistCandidateSession({
                token: loginData.token,
                user: {
                    id: loginData.user.id,
                    email: loginData.user.email,
                    jobSeekerId: jobSeekerId,
                    jobInterests: loginData.user.jobInterests || [],
                    jumptakeId: loginData.user.jumptakeId || registerData.user?.jumptakeId || null
                },
                jobSeekerId
            });
            
            if (jobSeekerId) {
                const linkResponse = await fetch((process.env.REACT_APP_API_URL || '') + '/api/resume/link', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${loginData.token}`
                    },
                    body: JSON.stringify({
                        userId: loginData.user.id,
                        jobSeekerId: jobSeekerId
                    })
                });
                
                if (!linkResponse.ok) {
                    console.error('Warning: Failed to link resume to user account');
                }
            }
            
            if (onSuccess) {
                onSuccess();
            }
            
        } catch (error) {
            console.error('Registration error:', error);
            setError(error.message || 'Failed to create account');
        } finally {
            setIsLoading(false);
        }
    };
    
    return (
        <div className="modal-overlay">
            <div className="modal-content register-modal">
                <div className="modal-header">
                    <h2>Create Account</h2>
                    <button className="close-button" onClick={onClose}>&times;</button>
                </div>
                <div className="modal-body">
                    <p className="registration-info">
                        We've analyzed your resume and extracted key information. Create an account to save your profile and apply for jobs.
                    </p>
                    
                    {error && <div className="error-message">{error}</div>}
                    
                    <form onSubmit={handleSubmit}>
                        <div className="form-group">
                            <label htmlFor="name">Full Name</label>
                            <input
                                type="text"
                                id="name"
                                name="name"
                                value={formData.name}
                                onChange={handleChange}
                                required
                            />
                        </div>
                        
                        <div className="form-group">
                            <label htmlFor="email">Email</label>
                            <input
                                type="email"
                                id="email"
                                name="email"
                                value={formData.email}
                                onChange={handleChange}
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
                        />
                        
                        <div className="form-group">
                            <label htmlFor="password">Password</label>
                            <input
                                type="password"
                                id="password"
                                name="password"
                                value={formData.password}
                                onChange={handleChange}
                                required
                                minLength="6"
                            />
                        </div>
                        
                        <div className="form-group">
                            <label htmlFor="confirmPassword">Confirm Password</label>
                            <input
                                type="password"
                                id="confirmPassword"
                                name="confirmPassword"
                                value={formData.confirmPassword}
                                onChange={handleChange}
                                required
                            />
                        </div>

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
                            {isLoading ? 'Creating Account...' : 'Create Account'}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default Register;
