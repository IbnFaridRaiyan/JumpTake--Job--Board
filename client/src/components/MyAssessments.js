import React, { useEffect, useMemo, useState } from 'react';

const countWords = (text = '') => text.trim().split(/\s+/).filter(Boolean).length;

const formatDuration = (milliseconds = 0) => {
    const safeMilliseconds = Math.max(0, milliseconds);
    const totalSeconds = Math.ceil(safeMilliseconds / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${String(seconds).padStart(2, '0')}`;
};

const MyAssessments = ({ userId, onRefresh, onPendingCountChange, switchSection, onFooterBack }) => {
    const [assessments, setAssessments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [message, setMessage] = useState('');
    const [selectedAssessment, setSelectedAssessment] = useState(null);
    const [responses, setResponses] = useState([]);
    const [submitting, setSubmitting] = useState(false);
    const [currentTime, setCurrentTime] = useState(Date.now());

    const pendingCount = useMemo(
        () => assessments.filter((assessment) => assessment.status === 'Sent').length,
        [assessments]
    );

    useEffect(() => {
        fetchAssessments();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [userId]);

    useEffect(() => {
        if (onPendingCountChange) {
            onPendingCountChange(pendingCount);
        }
    }, [onPendingCountChange, pendingCount]);

    useEffect(() => {
        if (!selectedAssessment || selectedAssessment.status === 'Submitted' || !selectedAssessment.expiresAt) {
            return undefined;
        }

        const timer = setInterval(() => {
            setCurrentTime(Date.now());
        }, 1000);

        return () => clearInterval(timer);
    }, [selectedAssessment]);

    const fetchAssessments = async () => {
        if (!userId) {
            setAssessments([]);
            setLoading(false);
            if (onPendingCountChange) {
                onPendingCountChange(0);
            }
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
                throw new Error('Failed to load assessments');
            }

            const data = await response.json();
            setAssessments(data);
        } catch (fetchError) {
            console.error('Error fetching candidate assessments:', fetchError);
            setError('Failed to load assessments. Please try again later.');
        } finally {
            setLoading(false);
        }
    };

    const handleOpenAssessment = async (assessment) => {
        let assessmentToOpen = assessment;
        setMessage('');
        setError('');

        if (assessment.status !== 'Submitted') {
            try {
                const token = localStorage.getItem('token');
                const response = await fetch(`${process.env.REACT_APP_API_URL || ''}/api/assessment-assignments/${assessment._id}/start`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({ userId })
                });

                const data = await response.json();

                if (!response.ok) {
                    throw new Error(data.error || 'Failed to start assessment');
                }

                assessmentToOpen = data.assignment;
                setAssessments((prevAssessments) => prevAssessments.map((item) => (
                    item._id === assessmentToOpen._id ? assessmentToOpen : item
                )));
            } catch (startError) {
                console.error('Error starting assessment:', startError);
                setError(startError.message || 'Failed to start assessment.');
                return;
            }
        }

        setCurrentTime(Date.now());
        setSelectedAssessment(assessmentToOpen);
        setResponses(
            assessmentToOpen.status === 'Submitted'
                ? (assessmentToOpen.responses || []).map((response) => response.answer || '')
                : (assessmentToOpen.questions || []).map(() => '')
        );
    };

    const handleAnswerChange = (index, value) => {
        setResponses((prev) => prev.map((answer, responseIndex) => (
            responseIndex === index ? value : answer
        )));
    };

    const handleSubmit = async () => {
        if (!selectedAssessment) {
            return;
        }

        const validationError = (selectedAssessment.questions || []).find((question, index) => {
            const answer = (responses[index] || '').trim();

            if (!answer) {
                return true;
            }

            if (question.type === 'text' && countWords(answer) > (question.maxWords || 2000)) {
                return true;
            }

            return false;
        });

        if (validationError) {
            setError('Please answer every question, and keep text responses within the 2000 word limit.');
            return;
        }

        try {
            setSubmitting(true);
            setError('');
            setMessage('');

            const token = localStorage.getItem('token');
            const response = await fetch(`${process.env.REACT_APP_API_URL || ''}/api/assessment-assignments/${selectedAssessment._id}/submit`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    userId,
                    responses
                })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to submit assessment');
            }

            setMessage('Assessment submitted successfully.');
            setSelectedAssessment(data.assignment);
            setResponses((data.assignment.responses || []).map((item) => item.answer || ''));
            await fetchAssessments();
            if (onRefresh) {
                onRefresh();
            }
        } catch (submitError) {
            console.error('Error submitting assessment:', submitError);
            setError(submitError.message || 'Failed to submit assessment.');
        } finally {
            setSubmitting(false);
        }
    };

    const handleBackToFeed = () => {
        if (switchSection) {
            switchSection('job-feed');
        }
    };

    const renderAssessmentDetail = () => {
        if (!selectedAssessment) {
            return null;
        }

        const isSubmitted = selectedAssessment.status === 'Submitted';
        const remainingMilliseconds = selectedAssessment.expiresAt
            ? new Date(selectedAssessment.expiresAt).getTime() - currentTime
            : null;
        const hasTimeExpired = remainingMilliseconds !== null && remainingMilliseconds <= 0;
        const score = selectedAssessment.score ?? selectedAssessment.responses?.reduce((total, response) => total + (Number(response.awardedMarks) || 0), 0);
        const totalMarks = selectedAssessment.totalMarks ?? selectedAssessment.responses?.reduce((total, response) => total + (Number(response.marks) || 0), 0);

        return (
            <div className="assessment-builder-container candidate-assessment-detail">
                <div className="manage-jobs-header candidate-assessment-header">
                    <h2>{selectedAssessment.title}</h2>
                    <button className="back-button responsive-back-button" onClick={() => setSelectedAssessment(null)}>
                        Back to My Assessments
                    </button>
                </div>

                {message && <div className="notification-message success">{message}</div>}
                {error && <div className="error-message">{error}</div>}

                <div className="assessment-summary-card">
                    <p><strong>Company:</strong> {selectedAssessment.job?.company?.name || 'Company unavailable'}</p>
                    <p><strong>Job:</strong> {selectedAssessment.job?.title || 'Unknown job'}</p>
                    <p><strong>Status:</strong> {selectedAssessment.status}</p>
                    <p><strong>Time Limit:</strong> {selectedAssessment.timeLimitMinutes ? `${selectedAssessment.timeLimitMinutes} minutes` : 'No limit'}</p>
                    {!isSubmitted && selectedAssessment.expiresAt && (
                        <p><strong>Time Remaining:</strong> {formatDuration(remainingMilliseconds)}</p>
                    )}
                    {isSubmitted && (
                        <p><strong>Score:</strong> {score || 0}/{totalMarks || 0}</p>
                    )}
                    {selectedAssessment.instructions && (
                        <div className="assessment-instructions">
                            <h3>Instructions</h3>
                            <p>{selectedAssessment.instructions}</p>
                        </div>
                    )}
                </div>

                <div className="assessment-question-list">
                    {(selectedAssessment.questions || []).map((question, index) => {
                        const answer = responses[index] || '';
                        const wordCount = question.type === 'text' ? countWords(answer) : 0;

                        return (
                            <div className="assessment-question-card" key={question._id || index}>
                                <div className="assessment-question-header">
                                    <h3>Question {index + 1}</h3>
                                    <span className="assessment-type-pill">
                                        {question.type === 'multiple-choice' ? 'Multiple Choice' : 'Text Answer'}
                                    </span>
                                </div>

                                <div className="assessment-answer-block">
                                    <p><strong>Question:</strong> {question.prompt}</p>
                                    <p><strong>Marks:</strong> {question.marks || 1}</p>

                                    {question.type === 'multiple-choice' ? (
                                        <div className="assessment-option-list">
                                            {question.options.map((option, optionIndex) => (
                                                <label className="assessment-response-option" key={`${question._id || index}-${optionIndex}`}>
                                                    <input
                                                        type="radio"
                                                        name={`assessment-question-${index}`}
                                                        value={option}
                                                        checked={answer === option}
                                                        disabled={isSubmitted}
                                                        onChange={(event) => handleAnswerChange(index, event.target.value)}
                                                    />
                                                    <span className="assessment-response-option-text">{option}</span>
                                                </label>
                                            ))}
                                        </div>
                                    ) : isSubmitted ? (
                                        <div className="application-message-preview">
                                            <p><strong>Answer:</strong> {answer}</p>
                                        </div>
                                    ) : (
                                        <div>
                                            <textarea
                                                className="form-control assessment-response-textarea"
                                                value={answer}
                                                onChange={(event) => handleAnswerChange(index, event.target.value)}
                                                rows="6"
                                                placeholder="Write your answer here"
                                            />
                                            <p className="assessment-text-limit">
                                                Answer: {wordCount}/{question.maxWords || 2000} words
                                            </p>
                                        </div>
                                    )}

                                    {question.type === 'multiple-choice' && isSubmitted && (
                                        <p><strong>Answer:</strong> {answer}</p>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>

                <div className="assessment-footer-actions">
                    {!isSubmitted && (
                        <button className="settings-button primary" onClick={handleSubmit} disabled={submitting || hasTimeExpired}>
                            {submitting ? 'Submitting...' : 'Submit Assessment'}
                        </button>
                    )}
                </div>

                <div className="section-footer-nav">
                    <button className="back-button responsive-back-button" onClick={() => setSelectedAssessment(null)}>
                        Back to My Assessments
                    </button>
                </div>
            </div>
        );
    };

    if (loading) {
        return (
            <div className="applications-container">
                <div className="section-header">
                    <h2>My Assessments</h2>
                </div>
                <div className="loading-container">
                    <div className="loading-spinner"></div>
                    <p>Loading your assessments...</p>
                </div>
            </div>
        );
    }

    if (selectedAssessment) {
        return renderAssessmentDetail();
    }

    return (
        <div className="applications-container">
            <div className="section-header">
                <h2>My Assessments</h2>
                <div className="section-actions">
                    <button className="refresh-button" onClick={fetchAssessments}>
                        Refresh
                    </button>
                </div>
            </div>

            {message && <div className="notification-message success">{message}</div>}
            {error && <div className="error-message">{error}</div>}

            {assessments.length === 0 ? (
                <div className="no-applications-message">
                    <h3>No assessments yet</h3>
                    <p>Any assessments sent by employers will appear here for you to complete.</p>
                </div>
            ) : (
                <div className="assessment-card-grid">
                    {assessments.map((assessment) => (
                        <div className="assessment-card" key={assessment._id}>
                            <div className="assessment-card-top">
                                <div>
                                    <h3>{assessment.title}</h3>
                                    <p>{assessment.job?.company?.name || 'Company unavailable'}</p>
                                </div>
                                <span className="assessment-type-pill">
                                    {assessment.status}
                                </span>
                            </div>
                            <p className="assessment-card-job">{assessment.job?.title || 'Unknown job'}</p>
                            <p className="assessment-card-meta">
                                {assessment.status === 'Submitted' && assessment.submittedAt
                                    ? `Submitted ${new Date(assessment.submittedAt).toLocaleDateString()}`
                                    : `Sent ${new Date(assessment.sentAt || assessment.createdAt).toLocaleDateString()}`}
                            </p>
                            {assessment.status !== 'Submitted' && (
                                <div className="assessment-card-actions">
                                    <button className="view-button candidate-assessment-open-button" onClick={() => handleOpenAssessment(assessment)}>
                                        Open Assessment
                                    </button>
                                </div>
                            )}
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
};

export default MyAssessments;
