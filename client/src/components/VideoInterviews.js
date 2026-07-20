import React, { forwardRef, useEffect, useImperativeHandle, useState } from 'react';
import AnimatedDeleteButton from './AnimatedDeleteButton';
import PortalPageSkeleton from './PortalPageSkeleton';

const VideoInterviews = forwardRef(({ userId, switchSection, onFooterBack, embedded = false }, ref) => {
    const [interviews, setInterviews] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [message, setMessage] = useState('');
    const [selectedInterview, setSelectedInterview] = useState(null);
    const [selectedDate, setSelectedDate] = useState('');
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        fetchInterviews();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [userId]);

    const closeInterviewDetails = () => {
        setSelectedInterview(null);
        setSelectedDate('');
        setMessage('');
        setError('');
    };

    useImperativeHandle(ref, () => ({
        goBackOneStep: () => {
            if (!selectedInterview) {
                return false;
            }

            closeInterviewDetails();
            return true;
        }
    }), [selectedInterview]);

    const fetchInterviews = async () => {
        if (!userId) {
            setInterviews([]);
            setLoading(false);
            return;
        }

        try {
            setLoading(true);
            setError('');
            const token = localStorage.getItem('token');
            const response = await fetch(`${process.env.REACT_APP_API_URL || ''}/api/assessments/user/${userId}`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) {
                throw new Error('Failed to load video interviews');
            }

            const data = await response.json();
            const interviewInvites = data.filter((assessment) => assessment?.videoInterview?.link);
            setInterviews(interviewInvites);
        } catch (fetchError) {
            console.error('Error fetching video interviews:', fetchError);
            setError('Failed to load video interviews. Please try again later.');
        } finally {
            setLoading(false);
        }
    };

    const handleBackToFeed = () => {
        if (switchSection) {
            switchSection('job-feed');
        }
    };

    const handleOpenInterviewDetails = (interview) => {
        setSelectedInterview(interview);
        setSelectedDate(interview?.videoInterview?.candidateSelection?.selectedDate || '');
        setMessage('');
        setError('');
    };

    const handleRespondToInterview = async (action) => {
        if (!selectedInterview) {
            return;
        }

        if (action === 'accept' && !selectedDate) {
            setError('Please choose one of the available interview dates before accepting.');
            return;
        }

        try {
            setSaving(true);
            setError('');
            setMessage('');

            const token = localStorage.getItem('token');
            const response = await fetch(`${process.env.REACT_APP_API_URL || ''}/api/assessment-assignments/${selectedInterview._id}/video-interview/respond`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    userId,
                    action,
                    selectedDate
                })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to update interview response');
            }

            setSelectedInterview(data.assignment);
            setSelectedDate(data.assignment?.videoInterview?.candidateSelection?.selectedDate || '');
            setMessage(data.message || 'Interview response updated successfully.');
            await fetchInterviews();
        } catch (responseError) {
            console.error('Error responding to video interview:', responseError);
            setError(responseError.message || 'Failed to update interview response.');
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="applications-container video-interviews-container">
                {!embedded && (
                    <div className="section-header">
                        <h2>Video Interviews</h2>
                    </div>
                )}
                <PortalPageSkeleton compact label="Loading video interviews" />
            </div>
        );
    }

    if (selectedInterview) {
        const selectionStatus = selectedInterview?.videoInterview?.candidateSelection?.status || 'Pending';

        return (
            <div className="applications-container video-interviews-container">
                <div className="section-header">
                    <h2>Video Interview Details</h2>
                    <div className="section-actions">
                        <button
                            className="back-button responsive-back-button"
                            onClick={closeInterviewDetails}
                        >
                            Back to Video Interviews
                        </button>
                    </div>
                </div>

                {message && <div className="notification-message success">{message}</div>}
                {error && <div className="error-message">{error}</div>}

                <div className="application-detail-view">
                    <div className="profile-section">
                        <h3>{selectedInterview.job?.company?.name || 'Company unavailable'}</h3>
                        <p>{selectedInterview.job?.title || 'Unknown job'}</p>
                    </div>

                    <div className="profile-section">
                        <h3>Interview Invitation</h3>
                        <p><strong>Status:</strong> {selectedInterview.decision || 'Video Interview'}</p>
                        <p><strong>Sent:</strong> {selectedInterview.videoInterview?.sentAt ? new Date(selectedInterview.videoInterview.sentAt).toLocaleString() : 'Recently'}</p>
                        <p><strong>Candidate Response:</strong> {selectionStatus}</p>
                        {selectionStatus === 'Accepted' && selectedInterview.videoInterview?.candidateSelection?.selectedDate && (
                            <p><strong>Chosen Date:</strong> {new Date(selectedInterview.videoInterview.candidateSelection.selectedDate).toLocaleDateString()}</p>
                        )}
                    </div>

                    <div className="profile-section">
                        <h3>Meeting Link</h3>
                        <div className="application-message-preview">
                            <p>{selectedInterview.videoInterview?.link}</p>
                        </div>
                        <a
                            className="view-button video-link-button"
                            href={selectedInterview.videoInterview?.link}
                            target="_blank"
                            rel="noopener noreferrer"
                        >
                            Open Meeting Link
                        </a>
                    </div>

                    <div className="profile-section">
                        <h3>Choose Interview Date</h3>
                        {selectedInterview.videoInterview?.dateOptions?.length ? (
                            <div className="interview-date-options">
                                {selectedInterview.videoInterview.dateOptions.map((dateOption, index) => (
                                    <label className="assessment-response-option" key={`${dateOption}-${index}`}>
                                        <input
                                            type="radio"
                                            name="video-interview-date"
                                            value={dateOption}
                                            checked={selectedDate === dateOption}
                                            disabled={selectionStatus !== 'Pending'}
                                            onChange={(event) => setSelectedDate(event.target.value)}
                                        />
                                        <span>{new Date(dateOption).toLocaleDateString()}</span>
                                    </label>
                                ))}
                            </div>
                        ) : (
                            <p>No interview dates were provided yet.</p>
                        )}
                    </div>

                    {selectionStatus === 'Pending' && (
                        <div className="assessment-footer-actions">
                            <button className="settings-button primary" onClick={() => handleRespondToInterview('accept')} disabled={saving}>
                                {saving ? 'Saving...' : 'Accept Interview'}
                            </button>
                            <AnimatedDeleteButton
                                onClick={() => handleRespondToInterview('discard')}
                                disabled={saving}
                                title="Discard invitation"
                            />
                        </div>
                    )}

                    <div className="page-footer-actions">
                        <button
                            className="back-button responsive-back-button"
                            onClick={closeInterviewDetails}
                        >
                            Back to Video Interviews
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="applications-container video-interviews-container">
            {!embedded && (
                <div className="section-header">
                    <h2>Video Interviews</h2>
                    <div className="section-actions">
                        <button className="refresh-button" onClick={fetchInterviews}>
                            Refresh
                        </button>
                    </div>
                </div>
            )}

            {message && <div className="notification-message success">{message}</div>}
            {error && <div className="error-message">{error}</div>}

            {interviews.length === 0 ? (
                <div className="no-applications-message">
                    <h3>No video interviews yet</h3>
                    <p>Interview invitations sent by employers will appear here.</p>
                </div>
            ) : (
                <div className="assessment-card-grid">
                    {interviews.map((interview) => (
                        <div className="assessment-card" key={interview._id}>
                            <div className="assessment-card-top">
                                <div>
                                    <h3>{interview.job?.company?.name || 'Company unavailable'}</h3>
                                    <p>{interview.title}</p>
                                </div>
                                <span className="assessment-type-pill">Video Interview</span>
                            </div>
                            <p className="assessment-card-job">{interview.job?.title || 'Unknown job'}</p>
                            <p className="assessment-card-meta">
                                Sent {interview.videoInterview?.sentAt ? new Date(interview.videoInterview.sentAt).toLocaleDateString() : new Date(interview.updatedAt || interview.createdAt).toLocaleDateString()}
                            </p>
                            <div className="assessment-card-actions">
                                <button className="view-button" onClick={() => handleOpenInterviewDetails(interview)}>
                                    See Video Interview Details
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            <div className="page-footer-actions">
                <button className="back-button responsive-back-button" onClick={onFooterBack || handleBackToFeed}>
                    Back
                </button>
            </div>
        </div>
    );
});

export default VideoInterviews;
