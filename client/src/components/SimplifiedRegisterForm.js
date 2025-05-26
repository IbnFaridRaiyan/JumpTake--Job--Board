import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const SimplifiedRegisterForm = ({ jobSeekerId, initialName, initialEmail, onSuccess }) => {
    const [formData, setFormData] = useState({
        name: initialName,
        email: initialEmail,
        password: '',
        confirmPassword: ''
    });
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const navigate = useNavigate();
    
    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData({
            ...formData,
            [name]: value
        });
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
          
            const registerResponse = await fetch('http://localhost:5000/api/create-account', {
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
            
          
            if (!registerResponse.ok) {
                const errorText = await registerResponse.text();
                try {
                    const errorJson = JSON.parse(errorText);
                    throw new Error(errorJson.message || 'Registration failed');
                } catch (e) {
                    throw new Error(`Registration failed: ${registerResponse.status}`);
                }
            }
            
            const registerData = await registerResponse.json();
            
           
            const loginResponse = await fetch('http://localhost:5000/api/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    email: formData.email,
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
                jobSeekerId: jobSeekerId 
            }));
            
        
            try {
                
                const jobSeekerIdToUse = jobSeekerId || localStorage.getItem('tempJobSeekerId');
                
                if (jobSeekerIdToUse) {
                    const linkResponse = await fetch('http://localhost:5000/api/resume/link', {
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
                        disabled={true}
                        className="readonly-field"
                    />
                    <div className="form-hint">Name extracted from your resume</div>
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
                
                <button 
                    type="submit" 
                    className="create-account-button"
                    disabled={isLoading}
                >
                    {isLoading ? 'Creating Account...' : 'Create Account'}
                </button>
            </form>
        </div>
    );
};

export default SimplifiedRegisterForm;