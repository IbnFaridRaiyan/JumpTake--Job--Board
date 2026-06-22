import React, { useEffect, useState } from 'react';
import AnimatedDeleteButton from './AnimatedDeleteButton';

const BookmarkedJobs = ({ userId, switchSection, onFooterBack }) => {
    const [bookmarks, setBookmarks] = useState([]);
    const [appliedJobIds, setAppliedJobIds] = useState([]);
    const [loading, setLoading] = useState(true);
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');

    useEffect(() => {
        fetchBookmarks();
        fetchAppliedJobs();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [userId]);

    const fetchBookmarks = async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem('token');
            const response = await fetch(`${process.env.REACT_APP_API_URL || ''}/api/job-bookmarks/user/${userId}`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) {
                throw new Error('Failed to fetch bookmarked jobs');
            }

            const data = await response.json();
            setBookmarks(Array.isArray(data) ? data : []);
            setError('');
        } catch (bookmarkError) {
            console.error('Error fetching bookmarked jobs:', bookmarkError);
            setError('Failed to load bookmarked jobs. Please try again later.');
        } finally {
            setLoading(false);
        }
    };

    const openJob = (jobId, action = 'preview') => {
        if (!jobId) {
            return;
        }

        const homeFeedRequest = {
            mode: 'candidate',
            tab: 'job-posts',
            jobId: String(jobId),
            action
        };

        localStorage.setItem('jumptakeActiveJobId', String(jobId));
        localStorage.setItem('jumptakeActiveJobAction', action);
        localStorage.setItem('jumptakeActiveJobReturnSection', 'bookmarked-jobs');
        sessionStorage.setItem('jumptakeHomeFeedRequest', JSON.stringify(homeFeedRequest));
        if (switchSection) {
            switchSection('home');
        }

        if (typeof window !== 'undefined') {
            window.setTimeout(() => {
                window.dispatchEvent(new CustomEvent('jumptake-home-feed-request', { detail: homeFeedRequest }));
            }, 0);
        }
    };

    const removeBookmark = async (jobId) => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${process.env.REACT_APP_API_URL || ''}/api/job-bookmarks/user/${userId}/job/${jobId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) {
                throw new Error('Failed to remove bookmarked job');
            }

            setBookmarks((prevState) => prevState.filter((bookmark) => String(bookmark.job?._id || bookmark.job) !== String(jobId)));
            setMessage('Bookmarked job removed successfully.');
            setTimeout(() => setMessage(''), 2500);
        } catch (removeError) {
            console.error('Error removing bookmarked job:', removeError);
            setMessage(`Error: ${removeError.message}`);
        }
    };

    const fetchAppliedJobs = async () => {
        if (!userId) {
            setAppliedJobIds([]);
            return;
        }

        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${process.env.REACT_APP_API_URL || ''}/api/applications/user/${userId}`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) {
                throw new Error('Failed to fetch applied jobs');
            }

            const data = await response.json();
            const uniqueAppliedJobIds = [...new Set(
                (Array.isArray(data) ? data : [])
                    .filter((application) => application?.status !== 'Withdrawn')
                    .map((application) => application?.job?._id || application?.job)
                    .filter(Boolean)
                    .map((jobId) => String(jobId))
            )];

            setAppliedJobIds(uniqueAppliedJobIds);
        } catch (appliedJobsError) {
            console.error('Error fetching applied jobs for bookmarked jobs:', appliedJobsError);
        }
    };

    return (
        <div className="applications-container">
            <div className="section-header">
                <h2>Bookmarked Jobs</h2>
                <div className="section-actions">
                    <button className="refresh-button" onClick={fetchBookmarks}>Refresh</button>
                </div>
            </div>

            {message && (
                <div className={`notification-message ${message.includes('Error') ? 'error' : 'success'}`}>
                    {message}
                </div>
            )}

            {error && <div className="error-message">{error}</div>}

            {loading ? (
                <div className="loading-container">
                    <div className="loading-spinner"></div>
                    <p>Loading bookmarked jobs...</p>
                </div>
            ) : bookmarks.length === 0 ? (
                <div className="no-applications-message">
                    <h3>No bookmarked jobs yet</h3>
                    <p>Star a job from the Job Feed and it will show up here.</p>
                </div>
            ) : (
                <div className="applications-list">
                    {bookmarks.map((bookmark) => {
                        const job = bookmark.job;
                        const hasApplied = appliedJobIds.includes(String(job?._id));

                        return (
                            <div className="application-card" key={bookmark._id}>
                                <div className="application-card-header">
                                    <div>
                                        <h3>{job?.title || 'Saved Job'}</h3>
                                        <p>{job?.company?.name || 'Company unavailable'}</p>
                                    </div>
                                    <span className="status-badge accepted">Bookmarked</span>
                                </div>
                                <div className="application-job-summary">
                                    <strong>{job?.location || 'Location not specified'}</strong>
                                    <span>{job?.jobType || 'Type not specified'}</span>
                                    {job?.salary && <span>{job.salary}</span>}
                                </div>
                                <div className="application-card-actions">
                                    <AnimatedDeleteButton
                                        onClick={() => removeBookmark(job?._id)}
                                        title="Remove bookmark"
                                    />
                                    <button className="view-profile-btn secondary-action" onClick={() => openJob(job?._id, 'preview')}>
                                        Open Job
                                    </button>
                                    <button className="view-profile-btn" onClick={() => openJob(job?._id, 'apply')} disabled={hasApplied}>
                                        {hasApplied ? 'Applied' : 'Apply Now'}
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            <div className="page-footer-actions">
                <button className="back-button" onClick={onFooterBack || (() => switchSection && switchSection('job-feed'))}>
                    Back
                </button>
            </div>
        </div>
    );
};

export default BookmarkedJobs;
