import React, { useState } from 'react';

const PostJob = ({ companyId, onJobPosted, onCancel }) => {
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        location: '',
        salary: '',
        jobType: 'Full-time',
        requirements: '',
        responsibilities: '',
        skills: ''
    });
    
    const [isLoading, setIsLoading] = useState(false);
    const [message, setMessage] = useState('');
    const [isSuccess, setIsSuccess] = useState(false);
    
    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };
    
    const handleSubmit = async (e) => {
        e.preventDefault();
        
      
        if (!formData.title || !formData.description || !formData.location) {
            setMessage('Please fill in all required fields');
            setIsSuccess(false);
            return;
        }
        
        setIsLoading(true);
        setMessage('');
        
        try {
            
            const requirements = formData.requirements
                ? formData.requirements.split('\n').map(item => item.trim()).filter(Boolean)
                : [];
                
            const responsibilities = formData.responsibilities
                ? formData.responsibilities.split('\n').map(item => item.trim()).filter(Boolean)
                : [];
                
            const skills = formData.skills
                ? formData.skills.split(',').map(item => item.trim()).filter(Boolean)
                : [];
            
            const token = localStorage.getItem('employerToken');
            const response = await fetch('http://localhost:5000/api/jobs', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    title: formData.title,
                    description: formData.description,
                    companyId: companyId,
                    location: formData.location,
                    salary: formData.salary,
                    jobType: formData.jobType,
                    requirements,
                    responsibilities,
                    skills
                }),
            });
            
            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(data.error || 'Failed to create job listing');
            }
            
            setMessage('Job listing created successfully!');
            setIsSuccess(true);
            
           
            setFormData({
                title: '',
                description: '',
                location: '',
                salary: '',
                jobType: 'Full-time',
                requirements: '',
                responsibilities: '',
                skills: ''
            });
            
          
            if (onJobPosted) {
                setTimeout(() => {
                    onJobPosted();
                }, 1500);
            }
            
        } catch (error) {
            console.error('Error posting job:', error);
            setMessage(`Error: ${error.message}`);
            setIsSuccess(false);
        } finally {
            setIsLoading(false);
        }
    };
    
    return (
        <div className="post-job-container">
            <div className="post-job-header">
                <h2>Post a New Job</h2>
                <button 
                    className="back-button"
                    onClick={onCancel}
                >
                    Back to Dashboard
                </button>
            </div>
            
            <div className="post-job-content">
                {message && (
                    <div className={`form-message ${isSuccess ? 'success-message' : 'error-message'}`}>
                        {message}
                    </div>
                )}
                
                <div className="job-form-intro">
                    <div className="job-form-icon">📝</div>
                    <div className="job-form-text">
                        <h3>Create a Job Listing</h3>
                        <p>
                            Fill out the form below to create a new job posting. Be descriptive to attract the right candidates.
                            Required fields are marked with an asterisk (*).
                        </p>
                    </div>
                </div>
                
                <form onSubmit={handleSubmit} className="job-form">
                    <div className="form-section">
                        <h3 className="form-section-title basic">Basic Information</h3>
                        <div className="form-row">
                            <div className="form-group">
                                <label htmlFor="title">Job Title <span className="required">*</span></label>
                                <input
                                    type="text"
                                    id="title"
                                    name="title"
                                    value={formData.title}
                                    onChange={handleChange}
                                    placeholder="e.g. Software Engineer"
                                    className="form-control"
                                    required
                                />
                            </div>
                            
                            <div className="form-group">
                                <label htmlFor="jobType">Job Type <span className="required">*</span></label>
                                <select
                                    id="jobType"
                                    name="jobType"
                                    value={formData.jobType}
                                    onChange={handleChange}
                                    className="form-control"
                                >
                                    <option value="Full-time">Full-time</option>
                                    <option value="Part-time">Part-time</option>
                                    <option value="Contract">Contract</option>
                                    <option value="Internship">Internship</option>
                                    <option value="Remote">Remote</option>
                                </select>
                            </div>
                        </div>
                        
                        <div class="form-row">
                            <div className="form-group">
                                <label htmlFor="location">Location <span className="required">*</span></label>
                                <input
                                    type="text"
                                    id="location"
                                    name="location"
                                    value={formData.location}
                                    onChange={handleChange}
                                    placeholder="e.g. San Francisco, CA"
                                    className="form-control"
                                    required
                                />
                            </div>
                            
                            <div className="form-group">
                                <label htmlFor="salary">Salary (optional)</label>
                                <input
                                    type="text"
                                    id="salary"
                                    name="salary"
                                    value={formData.salary}
                                    onChange={handleChange}
                                    placeholder="e.g. $80,000 - $100,000"
                                    className="form-control"
                                />
                            </div>
                        </div>
                    </div>
                    
                    <div className="form-section">
                        <h3 className="form-section-title details">Job Details</h3>
                        <div className="form-group">
                            <label htmlFor="description">Job Description <span className="required">*</span></label>
                            <textarea
                                id="description"
                                name="description"
                                value={formData.description}
                                onChange={handleChange}
                                placeholder="Provide a detailed description of the job..."
                                className="form-control"
                                rows="5"
                                required
                            />
                        </div>
                    
                        <div className="form-group">
                            <label htmlFor="requirements">Requirements (one per line)</label>
                            <textarea
                                id="requirements"
                                name="requirements"
                                value={formData.requirements}
                                onChange={handleChange}
                                placeholder="List job requirements, one per line..."
                                className="form-control"
                                rows="4"
                            />
                            <p className="form-hint">Enter each requirement on a new line</p>
                        </div>
                        
                        <div className="form-group">
                            <label htmlFor="responsibilities">Responsibilities (one per line)</label>
                            <textarea
                                id="responsibilities"
                                name="responsibilities"
                                value={formData.responsibilities}
                                onChange={handleChange}
                                placeholder="List job responsibilities, one per line..."
                                className="form-control"
                                rows="4"
                            />
                            <p className="form-hint">Enter each responsibility on a new line</p>
                        </div>
                    </div>
                    
                    <div className="form-section">
                        <h3 className="form-section-title skills">Skills & Qualifications</h3>
                        <div className="form-group">
                            <label htmlFor="skills">Skills (comma separated)</label>
                            <input
                                type="text"
                                id="skills"
                                name="skills"
                                value={formData.skills}
                                onChange={handleChange}
                                placeholder="e.g. JavaScript, React, Node.js"
                                className="form-control"
                            />
                            <p className="form-hint">These skills will be displayed as tags on your job listing</p>
                        </div>
                    </div>
                    
                    <div className="form-actions">
                        <button 
                            type="submit" 
                            className="submit-button"
                            disabled={isLoading}
                        >
                            {isLoading ? 'Creating Job...' : 'Post Job'}
                        </button>
                        
                        <button 
                            type="button" 
                            className="secondary-button"
                            onClick={onCancel}
                            disabled={isLoading}
                        >
                            Cancel
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default PostJob;