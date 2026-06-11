import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import EmailVerificationFields from './EmailVerificationFields';
import {
    generateVerificationCode,
    getEmailVerificationExpiryMs,
    sendVerificationCodeEmail,
    validateEmailAddress
} from '../utils/emailVerification';

const SimplifiedRegisterForm = ({ jobSeekerId, initialName, initialEmail, onSuccess }) => {
    const [formData, setFormData] = useState({
        name: initialName,
        email: initialEmail,
        password: '',
        confirmPassword: ''
    });
    const [error, setError] = useState('');
    const [message, setMessage] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [verificationCode, setVerificationCode] = useState('');
    const [sentVerificationCode, setSentVerificationCode] = useState('');
    const [verificationTargetEmail, setVerificationTargetEmail] = useState('');
    const [verificationExpiresAt, setVerificationExpiresAt] = useState(null);
    const [isEmailVerified, setIsEmailVerified] = useState(false);
    const [isSendingVerificationCode, setIsSendingVerificationCode] = useState(false);
    const navigate = useNavigate();

    const resetVerificationState = () => {
        setVerificationCode('');
        setSentVerificationCode('');
        setVerificationTargetEmail('');
        setVerificationExpiresAt(null);
        setIsEmailVerified(false);
        setMessage('');
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
    
    
    const redirectToDashboard = () => {
        console.log('Redirecting to dashboard...');
        
      
        if (onSuccess) {
            onSuccess();
        }
        
        try {
            navigate('/home');
        } catch (error) {
            console.error('Navigation error:', error);
        }
        
      
        window.location.href = '/home';
    };

    const verifyCode = () => {
        if (!verificationTargetEmail || !sentVerificationCode) {
            setError('Click Create Account to send a verification code to your email first.');
            setMessage('');
            return false;
        }

        if (Date.now() > verificationExpiresAt) {
            setError('Your verification code expired. Please request a new one.');
            setIsEmailVerified(false);
            setMessage('');
            return false;
        }

        if (verificationCode.trim() !== sentVerificationCode) {
            setError('The verification code you entered is incorrect.');
            setIsEmailVerified(false);
            setMessage('');
            return false;
        }

        setIsEmailVerified(true);
        setError('');
        setMessage('Email verified successfully. Creating your account...');
        return true;
    };

    const handleSendVerificationCode = async () => {
        const normalizedEmail = formData.email.trim().toLowerCase();

        if (!formData.name.trim()) {
            setError('Full name is required before sending a verification code.');
            setMessage('');
            return;
        }

        if (!validateEmailAddress(normalizedEmail)) {
            setError('Please enter a valid email address before sending a verification code.');
            setMessage('');
            return;
        }

        setError('');
        setMessage('Sending a verification code to your email...');
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
            setMessage(`A 6 digit verification code was sent to ${normalizedEmail}. Enter it below, then click Create Account again to complete sign up.`);
            return true;
        } catch (sendError) {
            console.error('Error sending candidate verification code:', sendError);
            setError(sendError.message || 'Failed to send verification code');
            setMessage('');
            return false;
        } finally {
            setIsSendingVerificationCode(false);
        }
    };
    
    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setMessage('');
        
      
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

        if (verificationTargetEmail !== normalizedEmail || !sentVerificationCode) {
            await handleSendVerificationCode();
            return;
        }

        if (!isEmailVerified && !verifyCode()) {
            return;
        }
        
        setIsLoading(true);
        
        try {
          
            const registerResponse = await fetch((process.env.REACT_APP_API_URL || '') + '/api/create-account', {
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
            
          
            if (!registerResponse.ok) {
                const errorText = await registerResponse.text();
                try {
                    const errorJson = JSON.parse(errorText);
                    throw new Error(errorJson.message || 'Registration failed');
                } catch (e) {
                    throw new Error(`Registration failed: ${registerResponse.status}`);
                }
            }
            
            await registerResponse.json();
            
           
            const loginResponse = await fetch((process.env.REACT_APP_API_URL || '') + '/api/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    email: normalizedEmail,
                    password: formData.password
                })
            });
            
          
            if (!loginResponse.ok) {
                const errorText = await loginResponse.text();
                try {
                    const errorJson = JSON.parse(errorText);
                    throw new Error(errorJson.message || 'Login failed');
                } catch (e) {
                    throw new Error(`Login failed: ${loginResponse.status}`);
                }
            }
            
            const loginData = await loginResponse.json();
            
           
            localStorage.setItem('token', loginData.token);
            localStorage.setItem('user', JSON.stringify({
                id: loginData.user.id,
                email: loginData.user.email,
                jobSeekerId: jobSeekerId,
                jobInterests: loginData.user.jobInterests || []
            }));
            
        
            try {
                
                const jobSeekerIdToUse = jobSeekerId || localStorage.getItem('tempJobSeekerId');
                
                if (jobSeekerIdToUse) {
                    if (!String(jobSeekerIdToUse).startsWith('temp_')) {
                        const updateProfileResponse = await fetch(`${process.env.REACT_APP_API_URL || ''}/api/job-seekers/${jobSeekerIdToUse}`, {
                            method: 'PUT',
                            headers: {
                                'Content-Type': 'application/json',
                                'Authorization': `Bearer ${loginData.token}`
                            },
                            body: JSON.stringify({
                                name: formData.name,
                                email: formData.email
                            })
                        });

                        if (!updateProfileResponse.ok) {
                            console.error('Warning: Failed to update resume profile with registration details');
                        }
                    }

                    const linkResponse = await fetch((process.env.REACT_APP_API_URL || '') + '/api/resume/link', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${loginData.token}`
                        },
                        body: JSON.stringify({
                            userId: loginData.user.id,
                            jobSeekerId: jobSeekerIdToUse
                        })
                    });
                    
                    if (!linkResponse.ok) {
                        console.error('Warning: Failed to link resume to user account');
                       
                    } else {
                        console.log('Successfully linked resume data to user account');
                       
                        localStorage.setItem('jobSeekerId', jobSeekerIdToUse);
                    }
                }
            } catch (linkError) {
                console.error('Error linking resume:', linkError);
               
            }
            
            
            console.log('Registration successful, redirecting to dashboard...');
            
            redirectToDashboard();
            
        } catch (error) {
            console.error('Registration error:', error);
            setError(error.message || 'Failed to create account');
        } finally {
            setIsLoading(false);
        }
    };
    
    return (
        <div className="simplified-register-form">
            {error && <div className="error-message">{error}</div>}
            {message && <div className="success-message">{message}</div>}
            
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
                    <div className="form-hint">You can update your name if needed</div>
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
                    <div className="form-hint">You can update your email if needed</div>
                </div>

                <div className="form-group">
                    <label htmlFor="password">Create Password</label>
                    <input
                        type="password"
                        id="password"
                        name="password"
                        value={formData.password}
                        onChange={handleChange}
                        required
                        minLength="6"
                    />
                    <div className="form-hint">Minimum 6 characters</div>
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
                
                <button 
                    type="submit" 
                    className="create-account-button"
                    disabled={isLoading || isSendingVerificationCode}
                >
                    {isLoading
                        ? 'Creating Account...'
                        : verificationTargetEmail && !isEmailVerified
                            ? 'Verify Code & Create Account'
                            : 'Create Account'}
                </button>
            </form>
        </div>
    );
};

export default SimplifiedRegisterForm;
