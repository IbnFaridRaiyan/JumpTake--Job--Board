import React, { useState, useEffect } from 'react';

const UserProfile = ({ userId, onUpdate }) => {
    const [jobSeekerData, setJobSeekerData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [isEditing, setIsEditing] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        skills: '',
        interests: '',
        hobbies: '',
        education: '',
        experience: '',
        achievements: ''
    });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [message, setMessage] = useState('');
    
    useEffect(() => {
        if (userId) {
            fetchProfileData();
        }
    }, [userId]);
    
    const fetchProfileData = async () => {
        try {
            setLoading(true);
            
            const token = localStorage.getItem('token');
            
           
            const userData = JSON.parse(localStorage.getItem('user') || '{}');
            const jobSeekerId = userData.jobSeekerId || localStorage.getItem('jobSeekerId') || localStorage.getItem('tempJobSeekerId');
            
            if (jobSeekerId) {
                const response = await fetch(`http://localhost:5000/api/job-seekers/${jobSeekerId}`, {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });
    
                if (response.ok) {
                    const data = await response.json();
                    setJobSeekerData(data);
                    initializeFormData(data);
                    setLoading(false);
                    return;
                }
            }
            
           
            const analysisResponse = await fetch(`http://localhost:5000/api/resume/analysis/${userId}`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            
            if (analysisResponse.ok) {
                const analysisData = await analysisResponse.json();
                setJobSeekerData(analysisData);
                initializeFormData(analysisData);
            } else {
                setJobSeekerData(null);
            }
        } catch (err) {
            console.error('Error fetching profile data:', err);
            setJobSeekerData(null);
        } finally {
            setLoading(false);
        }
    };
    
    const initializeFormData = (data) => {
        if (!data) return;
        
        setFormData({
            name: data?.name || '',
            email: data?.email || '',
            skills: Array.isArray(data?.skills) 
                ? data.skills.join(', ') 
                : (typeof data?.skills === 'string' ? data.skills : ''),
            interests: Array.isArray(data?.interests) 
                ? data.interests.join(', ') 
                : (typeof data?.interests === 'string' ? data.interests : ''),
            hobbies: Array.isArray(data?.hobbies) 
                ? data.hobbies.join(', ') 
                : (typeof data?.hobbies === 'string' ? data.hobbies : ''),
            education: Array.isArray(data?.education)
                ? data.education.map(edu => 
                    typeof edu === 'object' 
                        ? `${edu.institution || ''} - ${edu.degree || ''} (${edu.dates || ''})`
                        : edu
                  ).join('\n')
                : (typeof data?.education === 'string' ? data.education : ''),
            experience: Array.isArray(data?.experience)
                ? data.experience.map(exp => 
                    typeof exp === 'object' 
                        ? `${exp.company || ''} - ${exp.role || ''} (${exp.dates || ''})`
                        : exp
                  ).join('\n')
                : (typeof data?.experience === 'string' ? data.experience : ''),
            achievements: Array.isArray(data?.achievements) 
                ? data.achievements.join('\n') 
                : (typeof data?.achievements === 'string' ? data.achievements : '')
        });
    };

    const handleEditToggle = () => {
        setIsEditing(!isEditing);
        
        if (!isEditing) {
            setFormData({
                name: jobSeekerData?.name || '',
                email: jobSeekerData?.email || '',
                skills: Array.isArray(jobSeekerData?.skills) 
                    ? jobSeekerData.skills.join(', ') 
                    : (typeof jobSeekerData?.skills === 'string' 
                        ? jobSeekerData.skills 
                        : ''),
                interests: Array.isArray(jobSeekerData?.interests) 
                    ? jobSeekerData.interests.join(', ') 
                    : (typeof jobSeekerData?.interests === 'string' 
                        ? jobSeekerData.interests 
                        : ''),
                hobbies: Array.isArray(jobSeekerData?.hobbies) 
                    ? jobSeekerData.hobbies.join(', ') 
                    : (typeof jobSeekerData?.hobbies === 'string' 
                        ? jobSeekerData.hobbies 
                        : ''),
                education: Array.isArray(jobSeekerData?.education)
                    ? jobSeekerData.education.map(edu => 
                        typeof edu === 'object' 
                            ? `${edu.institution || ''} - ${edu.degree || ''} (${edu.dates || ''})`
                            : edu
                      ).join('\n')
                    : (typeof jobSeekerData?.education === 'string'
                        ? jobSeekerData.education
                        : ''),
                experience: Array.isArray(jobSeekerData?.experience)
                    ? jobSeekerData.experience.map(exp => 
                        typeof exp === 'object' 
                            ? `${exp.company || ''} - ${exp.role || ''} (${exp.dates || ''})`
                            : exp
                      ).join('\n')
                    : (typeof jobSeekerData?.experience === 'string'
                        ? jobSeekerData.experience
                        : ''),
                achievements: Array.isArray(jobSeekerData?.achievements) 
                    ? jobSeekerData.achievements.join('\n') 
                    : (typeof jobSeekerData?.achievements === 'string' 
                        ? jobSeekerData.achievements 
                        : '')
            });
            setMessage('');
        }
    };
    
    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData({
            ...formData,
            [name]: value
        });
    };
    
    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        
        
        const processedData = {
            ...formData,
            skills: formData.skills ? formData.skills.split(',').map(item => item.trim()).filter(Boolean) : [],
            interests: formData.interests ? formData.interests.split(',').map(item => item.trim()).filter(Boolean) : [],
            hobbies: formData.hobbies ? formData.hobbies.split(',').map(item => item.trim()).filter(Boolean) : [],
            education: formData.education ? formData.education.split('\n').map(item => item.trim()).filter(Boolean) : [],
            experience: formData.experience ? formData.experience.split('\n').map(item => item.trim()).filter(Boolean) : [],
            achievements: formData.achievements ? formData.achievements.split('\n').map(item => item.trim()).filter(Boolean) : []
        };
        
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`http://localhost:5000/api/job-seekers/${jobSeekerData._id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(processedData)
            });
            
            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || 'Failed to update profile');
            }
            
            setMessage('Profile updated successfully!');
            setIsEditing(false);
            
            
            if (onUpdate) onUpdate();
            fetchProfileData(); 
            
        } catch (error) {
            console.error('Error updating profile:', error);
            setMessage(`Error: ${error.message}`);
        } finally {
            setIsSubmitting(false);
        }
    };
    
    const formatDataForDisplay = (data) => {
        if (Array.isArray(data)) {
            return data.join(', ');
        } else if (typeof data === 'object' && data !== null) {
            return JSON.stringify(data, null, 2);
        } else {
            return data || 'Not specified';
        }
    };

    const renderList = (data, emptyMessage = "No information available") => {
        if (!data) return <p>{emptyMessage}</p>;
        
        if (Array.isArray(data)) {
            return data.length > 0 ? (
                <ul className="profile-list">
                    {data.map((item, index) => (
                        <li key={index}>
                            {typeof item === 'object' 
                                ? Object.values(item).filter(Boolean).join(' - ') 
                                : item}
                        </li>
                    ))}
                </ul>
            ) : <p>{emptyMessage}</p>;
        }
        
        return <p>{data || emptyMessage}</p>;
    };
    
    if (loading) {
        return (
            <div className="profile-container">
                <div className="profile-header">
                    <h2>My Profile</h2>
                </div>
                <div className="loading-container">
                    <div className="loading-spinner"></div>
                    <p>Loading your profile data...</p>
                </div>
            </div>
        );
    }

    if (!jobSeekerData) {
        return (
            <div className="profile-container">
                <div className="profile-header">
                    <h2>My Profile</h2>
                </div>
                <div className="profile-message">
                    <p>No profile information available. Please upload your resume in the Employee Portal.</p>
                    <button className="submit-button" onClick={() => window.location.href = '/job-seeker'}>
                        Go to Resume Upload
                    </button>
                </div>
            </div>
        );
    }
    
    return (
        <div className="profile-container">
            <div className="profile-header">
                <h2>My Profile</h2>
                {!isEditing ? (
                    <button 
                        className="edit-profile-button" 
                        onClick={handleEditToggle}
                    >
                        Edit Profile
                    </button>
                ) : null}
            </div>
            
            {message && (
                <div className={`notification-message ${message.includes('Error') ? 'error' : 'success'}`}>
                    {message}
                </div>
            )}
            
            <div className="profile-content">
                {isEditing ? (
                    <form onSubmit={handleSubmit} className="profile-form">
                        <div className="form-section">
                            <h3>Personal Information</h3>
                            <div className="form-group">
                                <label htmlFor="name">Name</label>
                                <input
                                    type="text"
                                    id="name"
                                    name="name"
                                    value={formData.name}
                                    onChange={handleInputChange}
                                    className="form-control"
                                />
                            </div>
                            
                            <div className="form-group">
                                <label htmlFor="email">Email</label>
                                <input
                                    type="email"
                                    id="email"
                                    name="email"
                                    value={formData.email}
                                    onChange={handleInputChange}
                                    className="form-control"
                                />
                            </div>
                        </div>
                        
                        <div className="form-section">
                            <h3>Education and Experience</h3>
                            <div className="form-group">
                                <label htmlFor="education">Education (one entry per line)</label>
                                <textarea
                                    id="education"
                                    name="education"
                                    value={formData.education}
                                    onChange={handleInputChange}
                                    className="form-control"
                                    rows="4"
                                    placeholder="Institution - Degree (Dates)"
                                />
                                <div className="form-hint">Format: Institution - Degree (Dates)</div>
                            </div>
                            
                            <div className="form-group">
                                <label htmlFor="experience">Experience (one entry per line)</label>
                                <textarea
                                    id="experience"
                                    name="experience"
                                    value={formData.experience}
                                    onChange={handleInputChange}
                                    className="form-control"
                                    rows="4"
                                    placeholder="Company - Role (Dates)"
                                />
                                <div className="form-hint">Format: Company - Role (Dates)</div>
                            </div>
                        </div>
                        
                        <div className="form-section">
                            <h3>Skills and Qualifications</h3>
                            <div className="form-group">
                                <label htmlFor="skills">Skills (comma separated)</label>
                                <textarea
                                    id="skills"
                                    name="skills"
                                    value={formData.skills}
                                    onChange={handleInputChange}
                                    className="form-control"
                                    rows="3"
                                    placeholder="JavaScript, React, Node.js"
                                />
                            </div>
                            
                            <div className="form-group">
                                <label htmlFor="achievements">Achievements (one per line)</label>
                                <textarea
                                    id="achievements"
                                    name="achievements"
                                    value={formData.achievements}
                                    onChange={handleInputChange}
                                    className="form-control"
                                    rows="3"
                                    placeholder="Received Employee of the Month award"
                                />
                            </div>
                        </div>
                        
                        <div className="form-section">
                            <h3>Personal Interests</h3>
                            <div className="form-group">
                                <label htmlFor="interests">Interests (comma separated)</label>
                                <textarea
                                    id="interests"
                                    name="interests"
                                    value={formData.interests}
                                    onChange={handleInputChange}
                                    className="form-control"
                                    rows="2"
                                    placeholder="Machine Learning, Web Development"
                                />
                            </div>
                            
                            <div className="form-group">
                                <label htmlFor="hobbies">Hobbies (comma separated)</label>
                                <textarea
                                    id="hobbies"
                                    name="hobbies"
                                    value={formData.hobbies}
                                    onChange={handleInputChange}
                                    className="form-control"
                                    rows="2"
                                    placeholder="Reading, Hiking, Photography"
                                />
                            </div>
                        </div>
                        
                        <div className="button-group">
                            <button 
                                type="submit" 
                                className="save-profile-button"
                                disabled={isSubmitting}
                            >
                                {isSubmitting ? 'Saving...' : 'Save Changes'}
                            </button>
                            <button 
                                type="button" 
                                className="cancel-edit-button"
                                onClick={handleEditToggle}
                                disabled={isSubmitting}
                            >
                                Cancel
                            </button>
                        </div>
                    </form>
                ) : (
                    <div className="profile-display">
                        <div className="profile-card personal-info">
                            <h3>Personal Information</h3>
                            <div className="profile-info-item">
                                <span className="info-label">Name:</span>
                                <span className="info-value">{jobSeekerData.name || 'Not specified'}</span>
                            </div>
                            <div className="profile-info-item">
                                <span className="info-label">Email:</span>
                                <span className="info-value">{jobSeekerData.email || 'Not specified'}</span>
                            </div>
                        </div>
                        
                        <div className="profile-card education">
                            <h3>Education</h3>
                            {renderList(jobSeekerData.education, "No education information available")}
                        </div>
                        
                        <div className="profile-card experience">
                            <h3>Experience</h3>
                            {renderList(jobSeekerData.experience, "No experience information available")}
                        </div>
                        
                        <div className="profile-card skills">
                            <h3>Skills & Interests</h3>
                            <div className="profile-info-item">
                                <span className="info-label">Skills:</span>
                                <div className="info-value skills-tags">
                                    {Array.isArray(jobSeekerData.skills) && jobSeekerData.skills.length > 0 ? (
                                        jobSeekerData.skills.map((skill, index) => (
                                            <span key={index} className="skill-tag">{skill}</span>
                                        ))
                                    ) : (
                                        <span>{formatDataForDisplay(jobSeekerData.skills) || "No skills listed"}</span>
                                    )}
                                </div>
                            </div>
                            
                            <div className="profile-info-item">
                                <span className="info-label">Interests:</span>
                                <span className="info-value">
                                    {formatDataForDisplay(jobSeekerData.interests)}
                                </span>
                            </div>
                            
                            <div className="profile-info-item">
                                <span className="info-label">Hobbies:</span>
                                <span className="info-value">
                                    {formatDataForDisplay(jobSeekerData.hobbies)}
                                </span>
                            </div>
                        </div>
                        
                        <div className="profile-card achievements">
                            <h3>Achievements</h3>
                            <div className="profile-info-item">
                                <span className="info-value">
                                    {Array.isArray(jobSeekerData.achievements) ? (
                                        <ul className="profile-list">
                                            {jobSeekerData.achievements.map((item, index) => (
                                                <li key={index}>{item}</li>
                                            ))}
                                        </ul>
                                    ) : (
                                        formatDataForDisplay(jobSeekerData.achievements)
                                    )}
                                </span>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default UserProfile;