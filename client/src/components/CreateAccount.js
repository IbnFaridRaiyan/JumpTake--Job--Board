import React, { useState } from 'react';

const CreateAccount = ({ email, jobSeekerId, onCancel }) => {
    const [userEmail, setUserEmail] = useState(email || '');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [message, setMessage] = useState('');
    const [accountCreated, setAccountCreated] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        
       
        if (!userEmail) {
            setMessage('Email is required');
            return;
        }
        
       
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(userEmail)) {
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
        
        setIsLoading(true);
        setMessage('Creating your account...');
        
        try {
            const response = await fetch('http://localhost:5000/api/create-account', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    email: userEmail, // Use the potentially modified email
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
                            onChange={(e) => setUserEmail(e.target.value)}
                            className="account-input"
                            required
                        />
                        <p className="input-hint">You can modify your email if needed</p>
                    </div>
                    
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
                            disabled={isLoading}
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