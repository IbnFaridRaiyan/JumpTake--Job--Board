import React, { useState } from 'react';

const EmployerRegistration = ({ companyId, companyName, onComplete }) => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [message, setMessage] = useState('');
    const [registrationComplete, setRegistrationComplete] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        
       
        if (!username) {
            setMessage('Username is required');
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
        setMessage('Creating your employer account...');
        
        try {
            const response = await fetch('http://localhost:5000/api/employer/register', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    username,
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
                    
                    <button 
                        type="submit" 
                        className="submit-button"
                        disabled={isLoading}
                    >
                        {isLoading ? 'Creating Account...' : 'Create Employer Account'}
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