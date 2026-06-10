import React, { useState } from 'react';
import EditJob from './EditJob';

const ManageJobs = ({ jobs, companyId, onJobUpdated, onBack, onFooterBack }) => {
    const [editingJob, setEditingJob] = useState(null);
    const [message, setMessage] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [togglingJobId, setTogglingJobId] = useState(null);
    
    const handleEdit = (job) => {
        setEditingJob(job);
    };
    
    const handleDelete = async (jobId) => {
        if (!window.confirm('Are you sure you want to delete this job listing?')) {
            return;
        }
        
        setIsLoading(true);
        
        try {
            const token = localStorage.getItem('employerToken');
            const response = await fetch(`${process.env.REACT_APP_API_URL || ''}/api/jobs/${jobId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to delete job');
            }
            
            setMessage('Job deleted successfully!');
            
        
            if (onJobUpdated) {
                onJobUpdated();
            }
            
           
            setTimeout(() => {
                setMessage('');
            }, 3000);
            
        } catch (error) {
            console.error('Error deleting job:', error);
            setMessage(`Error: ${error.message}`);
        } finally {
            setIsLoading(false);
        }
    };

    const handleToggleStatus = async (job) => {
        setTogglingJobId(job._id);
        setMessage('');

        try {
            const token = localStorage.getItem('employerToken');
            const response = await fetch(`${process.env.REACT_APP_API_URL || ''}/api/jobs/${job._id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    active: !job.active
                })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to update job status');
            }

            setMessage(
                !job.active
                    ? 'Job marked as active and shown in the candidate job feed.'
                    : 'Job marked as inactive and hidden from the candidate job feed.'
            );

            if (onJobUpdated) {
                onJobUpdated();
            }

            setTimeout(() => {
                setMessage('');
            }, 3000);
        } catch (error) {
            console.error('Error updating job status:', error);
            setMessage(`Error: ${error.message}`);
        } finally {
            setTogglingJobId(null);
        }
    };
    
    const handleCancelEdit = () => {
        setEditingJob(null);
    };
    
    const handleJobUpdated = () => {
        
        setEditingJob(null);
        if (onJobUpdated) {
            onJobUpdated();
        }
    };
    
   
    const formatDate = (dateString) => {
        const options = { year: 'numeric', month: 'short', day: 'numeric' };
        return new Date(dateString).toLocaleDateString(undefined, options);
    };
    
   
    if (editingJob) {
        return (
            <EditJob 
                job={editingJob}
                onCancel={handleCancelEdit}
                onJobUpdated={handleJobUpdated}
            />
        );
    }
    
    return (
        <div className="manage-jobs-container">
            <div className="manage-jobs-header">
                <h2>Manage Job Listings</h2>
                <button 
                    className="back-button"
                    onClick={onBack}
                >
                    Back to Dashboard
                </button>
            </div>
            
            {message && (
                <div className={`notification-message ${message.includes('Error') ? 'error' : 'success'}`}>
                    {message}
                </div>
            )}
            
            {jobs.length > 0 && (
                <div className="job-count">
                    {jobs.length} job listing{jobs.length !== 1 ? 's' : ''} found
                </div>
            )}
            
            {isLoading ? (
                <div className="job-list-loading">
                    <div className="loading-spinner"></div>
                    <p>Processing your request...</p>
                </div>
            ) : jobs.length === 0 ? (
                <div className="no-jobs-message">
                    <div className="empty-state-image">
                        <svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
                            <rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect>
                            <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path>
                        </svg>
                    </div>
                    <h3>No job listings found</h3>
                    <p>You haven't posted any jobs yet. Create your first job listing to start attracting candidates.</p>
                    <button 
                        className="add-job-button" 
                        onClick={() => onBack()}
                    >
                        Post a Job
                    </button>
                </div>
            ) : (
                <div>
                    <div className="job-list-table">
                        <table>
                            <thead>
                                <tr>
                                    <th>Job Number</th>
                                    <th>Job Title</th>
                                    <th>Location</th>
                                    <th>Type</th>
                                    <th>Posted Date</th>
                                    <th>Status</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {jobs.map(job => (
                                    <tr key={job._id}>
                                        <td className="date-cell">{job.jobNumber || 'Generating...'}</td>
                                        <td>
                                            <div className="job-title-cell" onClick={() => handleEdit(job)}>
                                                {job.title}
                                            </div>
                                        </td>
                                        <td className="location-cell">{job.location}</td>
                                        <td className="job-type-cell">{job.jobType}</td>
                                        <td className="date-cell">{formatDate(job.createdAt)}</td>
                                        <td>
                                            <button
                                                type="button"
                                                className={`status-badge status-toggle-button ${job.active ? 'active' : 'inactive'}`}
                                                onClick={() => handleToggleStatus(job)}
                                                disabled={isLoading || togglingJobId === job._id}
                                            >
                                                {togglingJobId === job._id
                                                    ? 'Updating...'
                                                    : job.active ? 'Active' : 'Inactive'}
                                            </button>
                                        </td>
                                        <td className="actions-cell">
                                            <button 
                                                className="action-button edit"
                                                onClick={() => handleEdit(job)}
                                            >
                                                Edit
                                            </button>
                                            <button 
                                                className="action-button delete"
                                                onClick={() => handleDelete(job._id)}
                                                disabled={isLoading}
                                            >
                                                {isLoading ? 'Deleting...' : 'Delete'}
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    <div className="section-footer-nav">
                        <button
                            className="back-button"
                            onClick={onFooterBack || onBack}
                        >
                            Back
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ManageJobs;
