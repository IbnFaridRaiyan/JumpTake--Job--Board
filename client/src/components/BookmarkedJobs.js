import React, { useEffect, useState } from 'react';

const BOOKMARKED_JOBS_PER_PAGE = 4;

const BookmarkedJobs = ({ userId, switchSection, onFooterBack }) => {
    const [bookmarks, setBookmarks] = useState([]);
    const [appliedJobIds, setAppliedJobIds] = useState([]);
    const [loading, setLoading] = useState(true);
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const [currentPage, setCurrentPage] = useState(1);

    useEffect(() => {
        fetchBookmarks();
        fetchAppliedJobs();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [userId]);

    useEffect(() => {
        setCurrentPage(1);
    }, [bookmarks.length]);

    const totalPages = Math.max(1, Math.ceil(bookmarks.length / BOOKMARKED_JOBS_PER_PAGE));
    const safeCurrentPage = Math.min(currentPage, totalPages);
    const visibleBookmarks = bookmarks.slice(
        (safeCurrentPage - 1) * BOOKMARKED_JOBS_PER_PAGE,
        safeCurrentPage * BOOKMARKED_JOBS_PER_PAGE
    );

    const changePage = (nextPage) => {
        setCurrentPage(nextPage);
        window.requestAnimationFrame(() => {
            const container = document.querySelector('.applications-container');
            const scrollParent = container?.closest('.mobile-dashboard-section-panel, .main-content');
            if (scrollParent) {
                scrollParent.scrollTop = 0;
            }
        });
    };

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
                    {visibleBookmarks.map((bookmark) => {
                        const job = bookmark.job;
                        const hasApplied = appliedJobIds.includes(String(job?._id));

                        return (
                            <div className="application-card bookmarked-job-card" key={bookmark._id}>
                                <button
                                    type="button"
                                    className="bookmarked-job-star-button active"
                                    onClick={() => removeBookmark(job?._id)}
                                    aria-label="Remove bookmark"
                                    title="Remove bookmark"
                                    disabled={!job?._id}
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" aria-hidden="true" focusable="false">
                                        <path d="M3.612 15.443c-.386.198-.824-.149-.746-.592l.83-4.73L.173 6.765c-.329-.314-.158-.888.283-.95l4.898-.696L7.538.792c.197-.39.73-.39.927 0l2.184 4.327 4.898.696c.441.062.612.636.282.95l-3.522 3.356.83 4.73c.078.443-.36.79-.746.592L8 13.187z" />
                                    </svg>
                                </button>
                                <div className="application-card-header">
                                    <div>
                                        <h3>{job?.title || 'Saved Job'}</h3>
                                        <p>{job?.company?.name || 'Company unavailable'}</p>
                                    </div>
                                </div>
                                <div className="application-job-summary">
                                    <strong>{job?.location || 'Location not specified'}</strong>
                                    <span>{job?.jobType || 'Type not specified'}</span>
                                    {job?.salary && <span>{job.salary}</span>}
                                </div>
                                <div className="application-card-actions">
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

            {bookmarks.length > 0 && totalPages > 1 && (
                <div className="mobile-list-pagination portal-list-pagination" aria-label="Bookmarked job pages">
                    <button
                        type="button"
                        className="secondary-button portal-home-page-button"
                        onClick={() => changePage(Math.max(1, safeCurrentPage - 1))}
                        disabled={safeCurrentPage === 1}
                    >
                        Previous
                    </button>
                    <span>Page {safeCurrentPage} of {totalPages}</span>
                    <button
                        type="button"
                        className="secondary-button portal-home-page-button portal-home-page-button-next"
                        onClick={() => changePage(Math.min(totalPages, safeCurrentPage + 1))}
                        disabled={safeCurrentPage === totalPages}
                    >
                        Next
                    </button>
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
