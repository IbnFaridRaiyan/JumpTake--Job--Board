import React, { useEffect, useState } from 'react';
import confirmAction from '../utils/confirmAction';

const BOOKMARKED_JOBS_PER_PAGE = 4;
const BOOKMARKED_JOB_LIKE_STORAGE_KEY = 'jumptakeBookmarkedJobLikeMap';

const readBookmarkedJobLikeMap = () => {
    if (typeof window === 'undefined') {
        return {};
    }

    try {
        const parsed = JSON.parse(localStorage.getItem(BOOKMARKED_JOB_LIKE_STORAGE_KEY) || '{}');
        return parsed && typeof parsed === 'object' ? parsed : {};
    } catch (error) {
        return {};
    }
};

const getBookmarkedJobKey = (job) => String(job?._id || job?.jobNumber || job?.title || 'job');

const BookmarkedJobs = ({ userId, switchSection, onFooterBack, embedded = false }) => {
    const [bookmarks, setBookmarks] = useState([]);
    const [appliedJobIds, setAppliedJobIds] = useState([]);
    const [loading, setLoading] = useState(true);
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [jobLikeMap, setJobLikeMap] = useState(readBookmarkedJobLikeMap);

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
            switchSection('job-feed');
        }

        if (typeof window !== 'undefined') {
            window.setTimeout(() => {
                window.dispatchEvent(new CustomEvent('jumptake-home-feed-request', { detail: homeFeedRequest }));
            }, 0);
        }
    };

    const removeBookmark = async (jobId) => {
        const confirmed = await confirmAction({
            title: 'Remove bookmark?',
            message: 'Remove this job from your bookmarked jobs?'
        });
        if (!confirmed) {
            return;
        }

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

    const viewerLikeId = String(userId || 'candidate-guest');

    const getJobLikeEntry = (job) => {
        const key = getBookmarkedJobKey(job);
        const entry = jobLikeMap[key];
        return entry && typeof entry === 'object' ? entry : { count: 0, likedBy: [] };
    };

    const isJobLiked = (job) => {
        const entry = getJobLikeEntry(job);
        return Array.isArray(entry.likedBy) && entry.likedBy.map(String).includes(viewerLikeId);
    };

    const getJobLikeCount = (job) => Number(getJobLikeEntry(job).count || 0) || 0;

    const toggleJobLike = (job) => {
        const key = getBookmarkedJobKey(job);
        setJobLikeMap((previousMap) => {
            const previousEntry = previousMap[key] && typeof previousMap[key] === 'object'
                ? previousMap[key]
                : { count: 0, likedBy: [] };
            const previousLikedBy = Array.isArray(previousEntry.likedBy)
                ? previousEntry.likedBy.map(String)
                : [];
            const alreadyLiked = previousLikedBy.includes(viewerLikeId);
            const nextLikedBy = alreadyLiked
                ? previousLikedBy.filter((id) => id !== viewerLikeId)
                : [...previousLikedBy, viewerLikeId];
            const nextMap = {
                ...previousMap,
                [key]: {
                    count: Math.max(0, Number(previousEntry.count || 0) + (alreadyLiked ? -1 : 1)),
                    likedBy: nextLikedBy
                }
            };

            if (typeof window !== 'undefined') {
                localStorage.setItem(BOOKMARKED_JOB_LIKE_STORAGE_KEY, JSON.stringify(nextMap));
            }

            return nextMap;
        });
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
            {!embedded && (
                <div className="section-header">
                    <h2>Bookmarked Jobs</h2>
                    <div className="section-actions">
                        <button className="refresh-button" onClick={fetchBookmarks}>Refresh</button>
                    </div>
                </div>
            )}

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
                                <div className="job-card-reactions bookmarked-job-reactions portal-reaction-rail">
                                    <button
                                        type="button"
                                        className={`job-card-like-button portal-reaction-icon-button reaction-like ${isJobLiked(job) ? 'active' : ''}`}
                                        onClick={() => toggleJobLike(job)}
                                        aria-pressed={isJobLiked(job)}
                                        aria-label="Like bookmarked job"
                                        title="Like"
                                    >
                                        <span aria-hidden="true">👍</span>
                                        <span className="portal-reaction-tooltip" role="tooltip">Like</span>
                                        <strong>{getJobLikeCount(job)}</strong>
                                    </button>
                                    <button
                                        type="button"
                                        className="bookmark-star-button job-card-bookmark-action portal-reaction-icon-button bookmarked-job-remove-button"
                                        onClick={() => removeBookmark(job?._id)}
                                        aria-pressed="true"
                                        aria-label="Remove bookmark"
                                        title="Remove bookmark"
                                        disabled={!job?._id}
                                    >
                                        <img
                                            className="bookmarked-job-star-glyph"
                                            src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath fill='%235b1118' d='m12 1.9 3.1 6.28 6.93 1.01-5.02 4.89 1.19 6.9L12 17.72l-6.2 3.26 1.19-6.9-5.02-4.89L8.9 8.18 12 1.9Z'/%3E%3C/svg%3E"
                                            alt=""
                                            aria-hidden="true"
                                        />
                                        <span className="portal-reaction-tooltip" role="tooltip">Remove bookmark</span>
                                    </button>
                                </div>
                                <div className="application-card-actions">
                                    <button className="view-profile-btn secondary-action" onClick={() => openJob(job?._id, 'preview')}>
                                        Open Job
                                    </button>
                                    <button className="view-profile-btn sky-apply-button" onClick={() => openJob(job?._id, 'apply')} disabled={hasApplied}>
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

            {!embedded && (
                <div className="page-footer-actions">
                    <button className="back-button" onClick={onFooterBack || (() => switchSection && switchSection('job-feed'))}>
                        Back
                    </button>
                </div>
            )}
        </div>
    );
};

export default BookmarkedJobs;
