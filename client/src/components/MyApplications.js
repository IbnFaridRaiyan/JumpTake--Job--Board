import React, { useState, useEffect } from 'react';

const MyApplications = ({ userId, onRefresh, switchSection }) => {
    const [applications, setApplications] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [withdrawingId, setWithdrawingId] = useState(null);
    const [message, setMessage] = useState('');
    
    useEffect(() => {
        fetchApplications();
    }, [userId]);
    
    const fetchApplications = async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem('token');
            const response = await fetch(`http://localhost:5000/api/applications/user/${userId}`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            
            if (!response.ok) {
                throw new Error('Failed to fetch applications');
            }
            
            const data = await response.json();
            setApplications(data);
        } catch (err) {
            console.error('Error fetching applications:', err);
            setError('Failed to load your applications. Please try again later.');
        } finally {
            setLoading(false);
        }
    };
    
    const handleWithdraw = async (applicationId) => {
        if (!window.confirm('Are you sure you want to withdraw this application?')) {
            return;
        }
        
        setWithdrawingId(applicationId);
        
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`http://localhost:5000/api/applications/${applicationId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    status: 'Withdrawn'
                })
            });
            
            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || 'Failed to withdraw application');
            }
            
            setMessage('Application withdrawn successfully');
            
            
            fetchApplications();
            if (onRefresh) onRefresh();
            
           
            setTimeout(() => {
                setMessage('');
            }, 3000);
            
        } catch (error) {
            console.error('Error withdrawing application:', error);
            setMessage(`Error: ${error.message}`);
        } finally {
            setWithdrawingId(null);
        }
    };
    
    const handleBrowseJobs = () => {
      
        if (switchSection) {
            switchSection('job-feed');
        }
    };
    
    const getStatusBadgeClass = (status) => {
        switch (status) {
            case 'Submitted':
                return 'status-badge-submitted';
            case 'Under Review':
                return 'status-badge-review';
            case 'Accepted':
                return 'status-badge-accepted';
            case 'Rejected':
                return 'status-badge-rejected';
            case 'Withdrawn':
                return 'status-badge-withdrawn';
            default:
                return 'status-badge-submitted';
        }
    };
    
    if (loading) {
        return (
            <div className="applications-container">
                <div className="section-header">
                    <h2>My Applications</h2>
                </div>
                <div className="loading-container">
                    <div className="loading-spinner"></div>
                    <p>Loading your applications...</p>
                </div>
            </div>
        );
    }
    
    return (
        <div className="applications-container">
            <div className="section-header">
                <h2>My Applications</h2>
                <div className="section-actions">
                    <button className="refresh-button" onClick={fetchApplications}>
                        Refresh
                    </button>
                </div>
            </div>
            
            {message && (
                <div className={`notification-message ${message.includes('Error') ? 'error' : 'success'}`}>
                    {message}
                </div>
            )}
            
            {error && <div className="error-message">{error}</div>}
            
            {applications.length === 0 ? (
                <div className="no-applications-message">
                    <h3>No applications yet</h3>
                    <p>You haven't applied to any jobs. Head over to the Job Feed to find opportunities.</p>
                    <button 
                        className="job-search-link" 
                        onClick={handleBrowseJobs}
                    >
                        Browse Jobs
                    </button>
                </div>
            ) : (
                <div className="applications-table-container">
                    <table className="applications-table">
                        <thead>
                            <tr>
                                <th>Job Title</th>
                                <th>Company</th>
                                <th>Applied On</th>
                                <th>Status</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {applications.map(app => (
                                <tr key={app._id}>
                                    <td>{app.job.title}</td>
                                    <td>{app.job.company.name}</td>
                                    <td>{new Date(app.createdAt).toLocaleDateString()}</td>
                                    <td>
                                        <span className={`status-badge ${getStatusBadgeClass(app.status)}`}>
                                            {app.status}
                                        </span>
                                    </td>
                                    <td>
                                        <div className="application-actions">
                                            {app.status !== 'Withdrawn' && app.status !== 'Rejected' && (
                                                <button
                                                    className="withdraw-button"
                                                    onClick={() => handleWithdraw(app._id)}
                                                    disabled={withdrawingId === app._id}
                                                >
                                                    {withdrawingId === app._id ? 'Withdrawing...' : 'Withdraw'}
                                                </button>
                                            )}
                                            <button className="view-button">View Details</button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};

export default MyApplications;