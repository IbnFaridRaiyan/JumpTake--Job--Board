import React, { useState } from 'react';


const Register = ({ jobSeekerId, initialName = '', initialEmail = '', onClose, onSuccess }) => {
    const [formData, setFormData] = useState({
        name: initialName,
        email: initialEmail,
        password: '',
        confirmPassword: ''
    });
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    
    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData({
            ...formData,
            [name]: value
        });
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
        
        setIsLoading(true);
        
        try {
          
            const registerResponse = await fetch('http://localhost:5000/api/users/register', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    name: formData.name,
                    email: formData.email,
                    password: formData.password,
                    jobSeekerId: jobSeekerId
                })
            });
            
            const registerData = await registerResponse.json();
            
            if (!registerResponse.ok) {
                throw new Error(registerData.message || 'Registration failed');
            }
            
            
            const loginResponse = await fetch('http://localhost:5000/api/users/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    email: formData.email,
                    password: formData.password
                })
            });
            
            const loginData = await loginResponse.json();
            
            if (!loginResponse.ok) {
                throw new Error(loginData.message || 'Login failed after registration');
            }
            
          
            localStorage.setItem('token', loginData.token);
            localStorage.setItem('user', JSON.stringify({
                id: loginData.user.id,
                email: loginData.user.email,
                jobSeekerId: jobSeekerId 
            }));
            
            if (jobSeekerId) {
                const linkResponse = await fetch('http://localhost:5000/api/resume/link', {
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
                        
                        <button 
                            type="submit" 
                            className="submit-button"
                            disabled={isLoading}
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