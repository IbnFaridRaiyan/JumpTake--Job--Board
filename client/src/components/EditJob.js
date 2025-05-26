import React, { useState } from 'react';

const EditJob = ({ job, onCancel, onJobUpdated }) => {
    const [formData, setFormData] = useState({
        title: job.title || '',
        description: job.description || '',
        location: job.location || '',
        salary: job.salary || '',
        jobType: job.jobType || 'Full-time',
        requirements: job.requirements ? job.requirements.join('\n') : '',
        responsibilities: job.responsibilities ? job.responsibilities.join('\n') : '',
        skills: job.skills ? job.skills.join(', ') : '',
        active: job.active !== undefined ? job.active : true
    });
    
    const [isLoading, setIsLoading] = useState(false);
    const [message, setMessage] = useState('');
    const [isSuccess, setIsSuccess] = useState(false);
    
    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
    };
    
    const handleSubmit = async (e) => {
        e.preventDefault();
        
       
        if (!formData.title || !formData.description || !formData.location) {
            setMessage('Please fill in all required fields');
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
            const response = await fetch(`http://localhost:5000/api/jobs/${job._id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    title: formData.title,
                    description: formData.description,
                    location: formData.location,
                    salary: formData.salary,
                    jobType: formData.jobType,
                    requirements,
                    responsibilities,
                    skills,
                    active: formData.active
                }),
            });
            
            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(data.error || 'Failed to update job listing');
            }
            
            setMessage('Job listing updated successfully!');
            setIsSuccess(true);
            
            
            setTimeout(() => {
                if (onJobUpdated) {
                    onJobUpdated();
                }
            }, 1500);
            
        } catch (error) {
            console.error('Error updating job:', error);
            setMessage(`Error: ${error.message}`);
            setIsSuccess(false);
        } finally {
            setIsLoading(false);
        }
    };
    
    return (
        <div className="edit-job-container">
            <div className="section-header">
                <h2>Edit Job Listing</h2>
                <button 
                    className="back-button"
                    onClick={onCancel}
                >
                    Back to Job Listings
                </button>
            </div>
            
            <form onSubmit={handleSubmit} className="job-form">
                <div className="form-row">
                    <div className="form-group">
                        <label htmlFor="title">Job Title <span className="required">*</span></label>
                        <input
                            type="text"
                            id="title"
                            name="title"
                            value={formData.title}
                            onChange={handleChange}
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
                
                <div className="form-row">
                    <div className="form-group">
                        <label htmlFor="location">Location <span className="required">*</span></label>
                        <input
                            type="text"
                            id="location"
                            name="location"
                            value={formData.location}
                            onChange={handleChange}
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
                            className="form-control"
                        />
                    </div>
                </div>
                
                <div className="form-group">
                    <label htmlFor="description">Job Description <span className="required">*</span></label>
                    <textarea
                        id="description"
                        name="description"
                        value={formData.description}
                        onChange={handleChange}
                        className="form-control"
                        rows="5"
                        required
                    />
                </div>
                
                <div className="form-group">
                    <label htmlFor="skills">Skills (comma separated)</label>
                    <input
                        type="text"
                        id="skills"
                        name="skills"
                        value={formData.skills}
                        onChange={handleChange}
                        className="form-control"
                    />
                </div>
                
                <div className="form-group">
                    <label htmlFor="requirements">Requirements (one per line)</label>
                    <textarea
                        id="requirements"
                        name="requirements"
                        value={formData.requirements}
                        onChange={handleChange}
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
                        className="form-control"
                        rows="4"
                    />
                    <p className="form-hint">Enter each responsibility on a new line</p>
                </div>
                
                <div className="form-checkbox">
                    <label>
                        <input
                            type="checkbox"
                            name="active"
                            checked={formData.active}
                            onChange={handleChange}
                        />
                        <span>Job Listing is Active</span>
                    </label>
                    <p className="form-hint">Uncheck to hide this job from job seekers</p>
                </div>
                
                <div className="form-actions">
                    <button 
                        type="submit" 
                        className="submit-button"
                        disabled={isLoading}
                    >
                        {isLoading ? 'Updating Job...' : 'Update Job'}
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
            
            {message && (
                <div className={`form-message ${isSuccess ? 'success-message' : 'error-message'}`}>
                    {message}
                </div>
            )}
        </div>
    );
};

export default EditJob;