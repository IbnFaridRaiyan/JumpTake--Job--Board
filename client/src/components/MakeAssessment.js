import React, { useEffect, useMemo, useState } from 'react';

const createQuestion = (type = 'multiple-choice') => ({
    clientId: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    prompt: '',
    type,
    options: type === 'multiple-choice' ? ['', ''] : [],
    maxWords: 2000
});

const createEmptyAssessment = (applicationId = '') => ({
    title: '',
    instructions: '',
    applicationId,
    questions: [createQuestion()]
});

const createInterviewDates = (dates = []) => Array.from({ length: 5 }, (_, index) => dates[index] || '');

const MakeAssessment = ({ companyId, onBack }) => {
    const [applications, setApplications] = useState([]);
    const [assessments, setAssessments] = useState([]);
    const [assignments, setAssignments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [message, setMessage] = useState('');
    const [selectedAssessment, setSelectedAssessment] = useState(null);
    const [selectedSubmission, setSelectedSubmission] = useState(null);
    const [selectedSubmissionView, setSelectedSubmissionView] = useState('submitted');
    const [editingAssessmentId, setEditingAssessmentId] = useState(null);
    const [isEditorOpen, setIsEditorOpen] = useState(false);
    const [sendAssessmentId, setSendAssessmentId] = useState(null);
    const [sendingApplicationId, setSendingApplicationId] = useState('');
    const [isInterviewFormOpen, setIsInterviewFormOpen] = useState(false);
    const [isCompletedInterviewOpen, setIsCompletedInterviewOpen] = useState(false);
    const [interviewLink, setInterviewLink] = useState('');
    const [interviewDates, setInterviewDates] = useState(createInterviewDates());
    const [formData, setFormData] = useState(createEmptyAssessment());

    useEffect(() => {
        fetchData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [companyId]);

    const applicationOptions = useMemo(() => applications.map((application) => {
        const candidate = application?.user?.jobSeekerId;
        const candidateName = candidate?.name || application?.user?.email || 'Unnamed Candidate';
        const jobTitle = application?.job?.title || 'Unknown Job';
        const candidateNumber = application?.candidateNumber || 'No candidate number';

        return {
            id: application._id,
            label: `${candidateName} (${candidateNumber}) - ${jobTitle}`
        };
    }), [applications]);

    const fetchData = async () => {
        if (!companyId) {
            setLoading(false);
            return;
        }

        setLoading(true);
        setError('');

        try {
            const token = localStorage.getItem('employerToken');
            const [applicationsResponse, assessmentsResponse, assignmentsResponse] = await Promise.all([
                fetch(`${process.env.REACT_APP_API_URL || ''}/api/applications/company/${companyId}`, {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                }),
                fetch(`${process.env.REACT_APP_API_URL || ''}/api/assessments/company/${companyId}`, {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                }),
                fetch(`${process.env.REACT_APP_API_URL || ''}/api/assessments/company/${companyId}/assignments`, {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                })
            ]);

            if (!applicationsResponse.ok) {
                throw new Error('Failed to load candidate applications');
            }

            if (!assessmentsResponse.ok) {
                throw new Error('Failed to load assessments');
            }

            if (!assignmentsResponse.ok) {
                throw new Error('Failed to load assessment activity');
            }

            const [applicationsData, assessmentsData, assignmentsData] = await Promise.all([
                applicationsResponse.json(),
                assessmentsResponse.json(),
                assignmentsResponse.json()
            ]);

            setApplications(applicationsData);
            setAssessments(assessmentsData);
            setAssignments(assignmentsData);

            if (!isEditorOpen) {
                setFormData(createEmptyAssessment(applicationsData[0]?._id || ''));
            }
        } catch (fetchError) {
            console.error('Error fetching assessments data:', fetchError);
            setError(fetchError.message || 'Failed to load assessments.');
        } finally {
            setLoading(false);
        }
    };

    const handleStartCreate = () => {
        setEditingAssessmentId(null);
        setSelectedAssessment(null);
        setSelectedSubmission(null);
        setSendAssessmentId(null);
        setMessage('');
        setError('');
        setFormData(createEmptyAssessment(applications[0]?._id || ''));
        setIsEditorOpen(true);
    };

    const handleStartEdit = (assessment) => {
        setEditingAssessmentId(assessment._id);
        setSelectedAssessment(null);
        setSelectedSubmission(null);
        setSendAssessmentId(null);
        setMessage('');
        setError('');
        setFormData({
            title: assessment.title || '',
            instructions: assessment.instructions || '',
            applicationId: assessment.application?._id || assessment.application || '',
            questions: (assessment.questions || []).map((question) => ({
                clientId: question._id || `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
                prompt: question.prompt || '',
                type: question.type || 'multiple-choice',
                options: question.type === 'multiple-choice'
                    ? (question.options?.length ? question.options : ['', ''])
                    : [],
                maxWords: 2000
            }))
        });
        setIsEditorOpen(true);
    };

    const handleCancelEditor = () => {
        setIsEditorOpen(false);
        setEditingAssessmentId(null);
        setSendAssessmentId(null);
        setFormData(createEmptyAssessment(applications[0]?._id || ''));
    };

    const updateQuestion = (clientId, updates) => {
        setFormData((prev) => ({
            ...prev,
            questions: prev.questions.map((question) => (
                question.clientId === clientId
                    ? { ...question, ...updates }
                    : question
            ))
        }));
    };

    const handleQuestionTypeChange = (clientId, type) => {
        setFormData((prev) => ({
            ...prev,
            questions: prev.questions.map((question) => {
                if (question.clientId !== clientId) {
                    return question;
                }

                return {
                    ...question,
                    type,
                    options: type === 'multiple-choice'
                        ? (question.options?.length ? question.options : ['', ''])
                        : [],
                    maxWords: 2000
                };
            })
        }));
    };

    const handleOptionChange = (clientId, optionIndex, value) => {
        setFormData((prev) => ({
            ...prev,
            questions: prev.questions.map((question) => {
                if (question.clientId !== clientId) {
                    return question;
                }

                const nextOptions = [...question.options];
                nextOptions[optionIndex] = value;

                return {
                    ...question,
                    options: nextOptions
                };
            })
        }));
    };

    const addOption = (clientId) => {
        setFormData((prev) => ({
            ...prev,
            questions: prev.questions.map((question) => (
                question.clientId === clientId
                    ? { ...question, options: [...question.options, ''] }
                    : question
            ))
        }));
    };

    const removeOption = (clientId, optionIndex) => {
        setFormData((prev) => ({
            ...prev,
            questions: prev.questions.map((question) => {
                if (question.clientId !== clientId) {
                    return question;
                }

                if (question.options.length <= 2) {
                    return question;
                }

                return {
                    ...question,
                    options: question.options.filter((_, index) => index !== optionIndex)
                };
            })
        }));
    };

    const addQuestion = (type = 'multiple-choice') => {
        setFormData((prev) => ({
            ...prev,
            questions: [...prev.questions, createQuestion(type)]
        }));
    };

    const removeQuestion = (clientId) => {
        setFormData((prev) => ({
            ...prev,
            questions: prev.questions.length <= 1
                ? prev.questions
                : prev.questions.filter((question) => question.clientId !== clientId)
        }));
    };

    const handleSaveAssessment = async () => {
        if (!formData.title.trim()) {
            setError('Assessment title is required.');
            return;
        }

        if (!formData.applicationId) {
            setError('Please choose a candidate application for this assessment.');
            return;
        }

        const cleanedQuestions = formData.questions.map((question) => ({
            prompt: question.prompt.trim(),
            type: question.type,
            options: question.type === 'multiple-choice'
                ? question.options.map((option) => option.trim()).filter(Boolean)
                : [],
            maxWords: 2000
        }));

        const hasInvalidQuestion = cleanedQuestions.some((question) => (
            !question.prompt ||
            (question.type === 'multiple-choice' && question.options.length < 2)
        ));

        if (hasInvalidQuestion) {
            setError('Each question needs a prompt, and multiple-choice questions need at least two options.');
            return;
        }

        setSaving(true);
        setError('');
        setMessage('');

        try {
            const token = localStorage.getItem('employerToken');
            const endpoint = editingAssessmentId
                ? `${process.env.REACT_APP_API_URL || ''}/api/assessments/${editingAssessmentId}`
                : `${process.env.REACT_APP_API_URL || ''}/api/assessments`;

            const response = await fetch(endpoint, {
                method: editingAssessmentId ? 'PUT' : 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    companyId,
                    applicationId: formData.applicationId,
                    title: formData.title,
                    instructions: formData.instructions,
                    questions: cleanedQuestions
                })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to save assessment');
            }

            setMessage(editingAssessmentId ? 'Assessment updated successfully.' : 'Assessment created successfully.');
            setIsEditorOpen(false);
            setEditingAssessmentId(null);
            setSelectedAssessment(data);
            await fetchData();
        } catch (saveError) {
            console.error('Error saving assessment:', saveError);
            setError(saveError.message || 'Failed to save assessment.');
        } finally {
            setSaving(false);
        }
    };

    const handleDeleteAssessment = async (assessmentId) => {
        if (!window.confirm('Delete this assessment?')) {
            return;
        }

        try {
            const token = localStorage.getItem('employerToken');
            const response = await fetch(`${process.env.REACT_APP_API_URL || ''}/api/assessments/${assessmentId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to delete assessment');
            }

            setMessage('Assessment deleted successfully.');
            if (selectedAssessment?._id === assessmentId) {
                setSelectedAssessment(null);
            }
            await fetchData();
        } catch (deleteError) {
            console.error('Error deleting assessment:', deleteError);
            setError(deleteError.message || 'Failed to delete assessment.');
        }
    };

    const getCandidateName = (assessmentOrApplication) => {
        return assessmentOrApplication?.candidateUser?.jobSeekerId?.name
            || assessmentOrApplication?.user?.jobSeekerId?.name
            || assessmentOrApplication?.candidateUser?.email
            || assessmentOrApplication?.user?.email
            || 'Unnamed Candidate';
    };

    const getCandidateNumber = (assessmentOrApplication) => (
        assessmentOrApplication?.application?.candidateNumber || 'Not assigned'
    );

    const getAssessmentStats = (assessmentId) => {
        const assessmentAssignments = assignments.filter((assignment) => (
            String(assignment.assessment?._id || assignment.assessment) === String(assessmentId)
        ));

        return {
            sent: assessmentAssignments.length,
            submitted: assessmentAssignments.filter((assignment) => assignment.status === 'Submitted').length
        };
    };

    const getEligibleApplicants = (assessment) => applications.filter((application) => (
        String(application?.job?._id) === String(assessment?.job?._id || assessment?.job) &&
        application.status !== 'Withdrawn'
    ));

    const submittedAssignments = assignments.filter((assignment) => assignment.status === 'Submitted');
    const scheduledInterviews = assignments.filter((assignment) => (
        assignment?.videoInterview?.link &&
        assignment?.videoInterview?.candidateSelection?.status === 'Accepted'
    ));

    const handleOpenSendPanel = (assessment) => {
        const eligibleApplicants = getEligibleApplicants(assessment);

        setSelectedAssessment(null);
        setSelectedSubmission(null);
        setSelectedSubmissionView('submitted');
        setSendAssessmentId(assessment._id);
        setSendingApplicationId(eligibleApplicants[0]?._id || '');
        setIsCompletedInterviewOpen(false);
        setMessage('');
        setError('');
    };

    const handleSendAssessment = async (assessmentId, applicationId) => {
        if (!applicationId) {
            setError('Please choose an applicant before sending the assessment.');
            return;
        }

        try {
            setSaving(true);
            setSendingApplicationId(applicationId);
            setError('');
            setMessage('');

            const token = localStorage.getItem('employerToken');
            const response = await fetch(`${process.env.REACT_APP_API_URL || ''}/api/assessments/${assessmentId}/send`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ applicationId })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to send assessment');
            }

            setMessage(data.message || 'Assessment sent successfully.');
            setSendAssessmentId(null);
            setSendingApplicationId('');
            await fetchData();
        } catch (sendError) {
            console.error('Error sending assessment:', sendError);
            setError(sendError.message || 'Failed to send assessment.');
        } finally {
            setSaving(false);
            setSendingApplicationId('');
        }
    };

    const updateSubmissionRecord = async (endpoint, body, successMessage) => {
        if (!selectedSubmission) {
            return;
        }

        try {
            setSaving(true);
            setError('');
            setMessage('');

            const token = localStorage.getItem('employerToken');
            const response = await fetch(`${process.env.REACT_APP_API_URL || ''}${endpoint}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: body ? JSON.stringify(body) : undefined
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || successMessage);
            }

            setMessage(data.message || successMessage);
            setSelectedSubmission(data.assignment);
            await fetchData();
            return data.assignment;
        } catch (submissionActionError) {
            console.error('Error updating submitted assessment:', submissionActionError);
            setError(submissionActionError.message || 'Failed to update submitted assessment.');
            return null;
        } finally {
            setSaving(false);
        }
    };

    const handleOpenInterviewForm = () => {
        setInterviewLink(selectedSubmission?.videoInterview?.link || '');
        setInterviewDates(createInterviewDates(selectedSubmission?.videoInterview?.dateOptions || []));
        setIsInterviewFormOpen(true);
        setMessage('');
        setError('');
    };

    const handleCancelInterviewForm = () => {
        setIsInterviewFormOpen(false);
        setInterviewLink(selectedSubmission?.videoInterview?.link || '');
        setInterviewDates(createInterviewDates(selectedSubmission?.videoInterview?.dateOptions || []));
    };

    const handleInterviewDateChange = (index, value) => {
        setInterviewDates((prev) => prev.map((date, dateIndex) => (
            dateIndex === index ? value : date
        )));
    };

    const handleSendVideoInterview = async () => {
        if (!interviewLink.trim()) {
            setError('Please enter a video interview link before sending.');
            return;
        }

        const cleanedDates = interviewDates.map((date) => date.trim()).filter(Boolean);

        if (cleanedDates.length !== 5) {
            setError('Please choose exactly 5 interview dates before sending.');
            return;
        }

        if (new Set(cleanedDates).size !== cleanedDates.length) {
            setError('Please choose 5 different interview dates.');
            return;
        }

        const assignment = await updateSubmissionRecord(
            `/api/assessment-assignments/${selectedSubmission._id}/video-interview`,
            {
                link: interviewLink,
                dateOptions: cleanedDates
            },
            'Video interview invitation sent successfully.'
        );

        if (assignment) {
            setIsInterviewFormOpen(false);
            setInterviewLink(assignment.videoInterview?.link || '');
            setInterviewDates(createInterviewDates(assignment.videoInterview?.dateOptions || []));
        }
    };

    const handleHireCandidate = async () => {
        if (!selectedSubmission || !window.confirm('Mark this candidate as hired?')) {
            return;
        }

        await updateSubmissionRecord(
            `/api/assessment-assignments/${selectedSubmission._id}/hire`,
            null,
            'Candidate marked as hired successfully.'
        );
    };

    const handleRejectCandidate = async () => {
        if (!selectedSubmission || !window.confirm('Reject this candidate?')) {
            return;
        }

        await updateSubmissionRecord(
            `/api/assessment-assignments/${selectedSubmission._id}/reject`,
            null,
            'Candidate rejected successfully.'
        );
    };

    const handleCompletedInterviewDecision = async (decision) => {
        if (!selectedSubmission) {
            return;
        }

        const decisionLabels = {
            hire: 'Hire Candidate',
            hold: 'Hold Candidate',
            reject: 'Reject Candidate'
        };

        if (!window.confirm(`Confirm "${decisionLabels[decision]}" for this completed interview?`)) {
            return;
        }

        const assignment = await updateSubmissionRecord(
            `/api/assessment-assignments/${selectedSubmission._id}/complete-interview`,
            { decision },
            'Interview decision saved successfully.'
        );

        if (assignment) {
            setIsCompletedInterviewOpen(false);
        }
    };

    const renderSubmissionDetails = () => {
        if (!selectedSubmission) {
            return null;
        }

        return (
            <div className="assessment-builder-container">
                <div className="manage-jobs-header">
                    <h2>{selectedSubmissionView === 'scheduled' ? 'Scheduled Interview' : selectedSubmission.title}</h2>
                    <button
                        className="back-button responsive-back-button"
                        onClick={() => {
                            setSelectedSubmission(null);
                            setSelectedSubmissionView('submitted');
                            setIsInterviewFormOpen(false);
                            setIsCompletedInterviewOpen(false);
                        }}
                    >
                        {selectedSubmissionView === 'scheduled' ? 'Back to Scheduled Interviews' : 'Back to Submitted Assessments'}
                    </button>
                </div>

                {message && (
                    <div className={`notification-message ${message.includes('Error') ? 'error' : 'success'}`}>
                        {message}
                    </div>
                )}
                {error && <div className="error-message">{error}</div>}

                <div className="assessment-summary-card">
                    <p><strong>Candidate:</strong> {getCandidateName(selectedSubmission)}</p>
                    <p><strong>Candidate Number:</strong> {getCandidateNumber(selectedSubmission)}</p>
                    <p><strong>Job Name:</strong> {selectedSubmission.job?.title || 'Unknown job'}</p>
                    <p><strong>Submitted:</strong> {selectedSubmission.submittedAt ? new Date(selectedSubmission.submittedAt).toLocaleString() : 'Not submitted yet'}</p>
                    <p><strong>Decision:</strong> {selectedSubmission.decision || 'Pending'}</p>
                    <p><strong>Video Interview Link:</strong> {selectedSubmission.videoInterview?.link || 'Not sent yet'}</p>
                    <p><strong>Scheduled Date:</strong> {selectedSubmission.videoInterview?.candidateSelection?.selectedDate
                        ? new Date(selectedSubmission.videoInterview.candidateSelection.selectedDate).toLocaleDateString()
                        : 'Not selected yet'}</p>
                    {selectedSubmissionView !== 'scheduled' && selectedSubmission.instructions && (
                        <div className="assessment-instructions">
                            <h3>Instructions</h3>
                            <p>{selectedSubmission.instructions}</p>
                        </div>
                    )}
                </div>

                {selectedSubmissionView !== 'scheduled' && (
                    <>
                        <div className="assessment-question-list">
                            {(selectedSubmission.responses || []).map((response, index) => (
                                <div className="assessment-question-card" key={response._id || index}>
                                    <div className="assessment-question-header">
                                        <h3>Question {index + 1}</h3>
                                        <span className="assessment-type-pill">
                                            {response.type === 'multiple-choice' ? 'Multiple Choice' : 'Text Answer'}
                                        </span>
                                    </div>
                                    <div className="assessment-answer-block">
                                        <p><strong>Question:</strong> {response.prompt}</p>
                                        <p><strong>Answer:</strong> {response.answer || 'No answer submitted.'}</p>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="assessment-footer-actions">
                            <button className="view-button" onClick={handleOpenInterviewForm} disabled={saving}>
                                Ask for a Video Interview
                            </button>
                            <button className="secondary-button" onClick={handleHireCandidate} disabled={saving}>
                                Hire Directly
                            </button>
                            <button className="secondary-button" onClick={handleRejectCandidate} disabled={saving}>
                                Reject Candidate
                            </button>
                        </div>

                        {isInterviewFormOpen && (
                            <div className="settings-card interview-link-panel">
                                <div className="form-group">
                                    <label htmlFor="video-interview-link">Video Interview Link</label>
                                    <input
                                        id="video-interview-link"
                                        type="text"
                                        className="form-control"
                                        value={interviewLink}
                                        onChange={(event) => setInterviewLink(event.target.value)}
                                        placeholder="Paste the Google Meet, Zoom, or Teams link"
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Available Interview Dates</label>
                                    <div className="interview-date-grid">
                                        {interviewDates.map((date, index) => (
                                            <input
                                                key={`interview-date-${index}`}
                                                type="date"
                                                className="form-control"
                                                value={date}
                                                onChange={(event) => handleInterviewDateChange(index, event.target.value)}
                                            />
                                        ))}
                                    </div>
                                    <p className="assessment-card-meta">Choose 5 different dates for the candidate to pick from.</p>
                                </div>
                                <div className="assessment-footer-actions">
                                    <button className="settings-button primary" onClick={handleSendVideoInterview} disabled={saving}>
                                        {saving ? 'Sending...' : 'Send'}
                                    </button>
                                    <button className="secondary-button" onClick={handleCancelInterviewForm} disabled={saving}>
                                        Cancel
                                    </button>
                                </div>
                            </div>
                        )}
                    </>
                )}

                {selectedSubmissionView === 'scheduled' && (
                    <div className="assessment-footer-actions">
                        <button
                            className="settings-button primary"
                            onClick={() => setIsCompletedInterviewOpen((prev) => !prev)}
                            disabled={saving}
                        >
                            Completed Interview
                        </button>
                    </div>
                )}

                {selectedSubmissionView === 'scheduled' && isCompletedInterviewOpen && (
                    <div className="settings-card interview-link-panel">
                        <div className="section-header">
                            <h3>Choose a Decision</h3>
                        </div>
                        <div className="assessment-footer-actions">
                            <button className="settings-button primary" onClick={() => handleCompletedInterviewDecision('hire')} disabled={saving}>
                                Hire Candidate
                            </button>
                            <button className="secondary-button" onClick={() => handleCompletedInterviewDecision('hold')} disabled={saving}>
                                Hold Candidate
                            </button>
                            <button className="secondary-button" onClick={() => handleCompletedInterviewDecision('reject')} disabled={saving}>
                                Reject Candidate
                            </button>
                        </div>
                    </div>
                )}

                <div className="section-footer-nav">
                    <button className="back-button responsive-back-button" onClick={onBack}>
                        Back to Dashboard
                    </button>
                </div>
            </div>
        );
    };

    const renderAssessmentDetails = () => {
        if (!selectedAssessment) {
            return null;
        }

        const assessmentStats = getAssessmentStats(selectedAssessment._id);

        return (
            <div className="assessment-builder-container">
                <div className="manage-jobs-header">
                    <h2>{selectedAssessment.title}</h2>
                    <button className="back-button responsive-back-button" onClick={() => setSelectedAssessment(null)}>
                        Back to Assessments
                    </button>
                </div>

                <div className="assessment-summary-card">
                    <p><strong>Candidate:</strong> {getCandidateName(selectedAssessment)}</p>
                    <p><strong>Job:</strong> {selectedAssessment.job?.title || 'Unknown job'}</p>
                    <p><strong>Status:</strong> {selectedAssessment.application?.status || 'Submitted'}</p>
                    <p><strong>Sent Assessments:</strong> {assessmentStats.sent}</p>
                    <p><strong>Submitted Assessments:</strong> {assessmentStats.submitted}</p>
                    {selectedAssessment.instructions && (
                        <div className="assessment-instructions">
                            <h3>Instructions</h3>
                            <p>{selectedAssessment.instructions}</p>
                        </div>
                    )}
                </div>

                <div className="assessment-question-list">
                    {selectedAssessment.questions?.map((question, index) => (
                        <div className="assessment-question-card" key={question._id || index}>
                            <div className="assessment-question-header">
                                <h3>Question {index + 1}</h3>
                                <span className="assessment-type-pill">
                                    {question.type === 'multiple-choice' ? 'Multiple Choice' : 'Text Answer'}
                                </span>
                            </div>
                            <p className="assessment-question-prompt">{question.prompt}</p>

                            {question.type === 'multiple-choice' ? (
                                <div className="assessment-option-list">
                                    {question.options.map((option, optionIndex) => (
                                        <div className="assessment-option-pill" key={`${question._id || index}-${optionIndex}`}>
                                            {option}
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="assessment-text-limit">Candidate response field limited to 2000 words.</p>
                            )}
                        </div>
                    ))}
                </div>

                <div className="assessment-footer-actions">
                    <button className="view-button" onClick={() => handleStartEdit(selectedAssessment)}>
                        Edit Assessment
                    </button>
                    <button className="secondary-button" onClick={() => handleOpenSendPanel(selectedAssessment)}>
                        Send Assessment
                    </button>
                    <button className="secondary-button" onClick={() => handleDeleteAssessment(selectedAssessment._id)}>
                        Delete Assessment
                    </button>
                </div>

                <div className="section-footer-nav">
                    <button className="back-button responsive-back-button" onClick={onBack}>
                        Back to Dashboard
                    </button>
                </div>
            </div>
        );
    };

    const renderEditor = () => (
        <div className="assessment-builder-container">
            <div className="manage-jobs-header">
                <h2>{editingAssessmentId ? 'Edit Assessment' : 'Make an Assessment'}</h2>
                <button className="back-button responsive-back-button" onClick={handleCancelEditor}>
                    Back to Assessments
                </button>
            </div>

            {error && <div className="error-message">{error}</div>}

            <div className="assessment-editor-grid">
                <div className="settings-card">
                    <div className="form-group">
                        <label htmlFor="assessment-title">Assessment Title</label>
                        <input
                            id="assessment-title"
                            type="text"
                            className="form-control"
                            value={formData.title}
                            onChange={(event) => setFormData((prev) => ({ ...prev, title: event.target.value }))}
                            placeholder="Example: Frontend Skills Assessment"
                        />
                    </div>

                    <div className="form-group">
                        <label htmlFor="assessment-application">Candidate Application</label>
                        <select
                            id="assessment-application"
                            className="form-control"
                            value={formData.applicationId}
                            onChange={(event) => setFormData((prev) => ({ ...prev, applicationId: event.target.value }))}
                        >
                            <option value="">Select an application</option>
                            {applicationOptions.map((application) => (
                                <option key={application.id} value={application.id}>
                                    {application.label}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="form-group">
                        <label htmlFor="assessment-instructions">Instructions</label>
                        <textarea
                            id="assessment-instructions"
                            className="form-control assessment-textarea"
                            value={formData.instructions}
                            onChange={(event) => setFormData((prev) => ({ ...prev, instructions: event.target.value }))}
                            rows="4"
                            placeholder="Add any guidance the candidate should see before answering."
                        />
                    </div>
                </div>

                <div className="assessment-builder-tools">
                    <button className="settings-button primary" onClick={() => addQuestion('multiple-choice')}>
                        Add Multiple Choice Question
                    </button>
                    <button className="settings-button" onClick={() => addQuestion('text')}>
                        Add Text Question
                    </button>
                </div>

                <div className="assessment-question-list">
                    {formData.questions.map((question, index) => (
                        <div className="assessment-question-card" key={question.clientId}>
                            <div className="assessment-question-header">
                                <h3>Question {index + 1}</h3>
                                <div className="assessment-question-actions">
                                    <select
                                        className="form-control assessment-type-select"
                                        value={question.type}
                                        onChange={(event) => handleQuestionTypeChange(question.clientId, event.target.value)}
                                    >
                                        <option value="multiple-choice">Multiple Choice</option>
                                        <option value="text">Text Answer</option>
                                    </select>
                                    <button
                                        className="secondary-button"
                                        onClick={() => removeQuestion(question.clientId)}
                                        disabled={formData.questions.length === 1}
                                    >
                                        Remove
                                    </button>
                                </div>
                            </div>

                            <div className="form-group">
                                <label>Question Prompt</label>
                                <input
                                    type="text"
                                    className="form-control"
                                    value={question.prompt}
                                    onChange={(event) => updateQuestion(question.clientId, { prompt: event.target.value })}
                                    placeholder="Write your question here"
                                />
                            </div>

                            {question.type === 'multiple-choice' ? (
                                <div className="assessment-options-editor">
                                    {question.options.map((option, optionIndex) => (
                                        <div className="assessment-option-editor-row" key={`${question.clientId}-${optionIndex}`}>
                                            <input
                                                type="text"
                                                className="form-control"
                                                value={option}
                                                onChange={(event) => handleOptionChange(question.clientId, optionIndex, event.target.value)}
                                                placeholder={`Option ${optionIndex + 1}`}
                                            />
                                            <button
                                                className="secondary-button"
                                                onClick={() => removeOption(question.clientId, optionIndex)}
                                                disabled={question.options.length <= 2}
                                            >
                                                Remove
                                            </button>
                                        </div>
                                    ))}
                                    <button className="view-button" onClick={() => addOption(question.clientId)}>
                                        Add Option
                                    </button>
                                </div>
                            ) : (
                                <div className="assessment-text-limit">
                                    Candidate answer field will be limited to 2000 words.
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </div>

            <div className="assessment-footer-actions">
                <button className="settings-button primary" onClick={handleSaveAssessment} disabled={saving}>
                    {saving ? 'Saving...' : editingAssessmentId ? 'Save Assessment' : 'Create Assessment'}
                </button>
                <button className="secondary-button" onClick={handleCancelEditor} disabled={saving}>
                    Cancel
                </button>
            </div>
        </div>
    );

    if (loading) {
        return (
            <div className="assessment-builder-container">
                <div className="manage-jobs-header">
                    <h2>Make an Assessment</h2>
                </div>
                <div className="loading-spinner">Loading assessment builder...</div>
            </div>
        );
    }

    if (isEditorOpen) {
        return renderEditor();
    }

    if (selectedAssessment) {
        return renderAssessmentDetails();
    }

    if (selectedSubmission) {
        return renderSubmissionDetails();
    }

    const activeSendAssessment = assessments.find((assessment) => assessment._id === sendAssessmentId);
    const eligibleApplicants = activeSendAssessment ? getEligibleApplicants(activeSendAssessment) : [];

    return (
        <div className="assessment-builder-container">
            <div className="manage-jobs-header">
                <h2>Make an Assessment</h2>
                <div className="assessment-header-actions">
                    <button className="settings-button primary" onClick={handleStartCreate} disabled={applications.length === 0}>
                        Create Assessment
                    </button>
                    <button className="back-button responsive-back-button" onClick={onBack}>
                        Back to Dashboard
                    </button>
                </div>
            </div>

            {message && (
                <div className={`notification-message ${message.includes('Error') ? 'error' : 'success'}`}>
                    {message}
                </div>
            )}
            {error && <div className="error-message">{error}</div>}

            {activeSendAssessment && (
                <div className="settings-card assessment-send-panel">
                    <div className="section-header">
                        <h3>Send Assessment</h3>
                    </div>
                    <p className="assessment-card-meta">
                        Choose an applicant for <strong>{activeSendAssessment.job?.title || 'this job'}</strong>. Only candidates who applied for this job are shown here.
                    </p>

                    {eligibleApplicants.length === 0 ? (
                        <div className="no-jobs-message">
                            <p>No eligible applicants found for this job.</p>
                        </div>
                    ) : (
                        <div className="assessment-send-list">
                            {eligibleApplicants.map((application) => {
                                const alreadySent = assignments.find((assignment) => (
                                    String(assignment.assessment?._id || assignment.assessment) === String(activeSendAssessment._id) &&
                                    String(assignment.application?._id || assignment.application) === String(application._id)
                                ));

                                return (
                                    <div className="assessment-send-row" key={application._id}>
                                        <div>
                                            <h3>{getCandidateName(application)}</h3>
                                            <p>{application.user?.email || 'No email available'}</p>
                                            <p>{application.message || 'No application message added.'}</p>
                                        </div>
                                        <div className="assessment-card-actions">
                                            <button
                                                className="view-button"
                                                onClick={() => handleSendAssessment(activeSendAssessment._id, application._id)}
                                                disabled={saving || Boolean(alreadySent)}
                                            >
                                                {alreadySent
                                                    ? alreadySent.status === 'Submitted'
                                                        ? 'Submitted'
                                                        : 'Sent'
                                                    : saving && sendingApplicationId === application._id
                                                        ? 'Sending...'
                                                        : 'Send Assessment'}
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    <div className="assessment-footer-actions">
                        <button className="secondary-button" onClick={() => setSendAssessmentId(null)} disabled={saving}>
                            Close
                        </button>
                    </div>
                </div>
            )}

            {applications.length === 0 ? (
                <div className="no-jobs-message">
                    <h3>No candidate applications available</h3>
                    <p>Assessments can be created after candidates apply for your jobs.</p>
                </div>
            ) : assessments.length === 0 ? (
                <div className="no-jobs-message">
                    <h3>No assessments created yet</h3>
                    <p>Build custom assessments with multiple-choice or text questions for your candidates.</p>
                    <button className="settings-button primary" onClick={handleStartCreate}>
                        Start Your First Assessment
                    </button>
                </div>
            ) : (
                <div className="assessment-card-grid">
                    {assessments.map((assessment) => {
                        const stats = getAssessmentStats(assessment._id);

                        return (
                            <div className="assessment-card" key={assessment._id}>
                            <div className="assessment-card-top">
                                <div>
                                    <h3>{assessment.title}</h3>
                                    <p>{getCandidateName(assessment)}</p>
                                </div>
                                <span className="assessment-type-pill">
                                    {assessment.questions?.length || 0} question{assessment.questions?.length === 1 ? '' : 's'}
                                </span>
                            </div>
                            <p className="assessment-card-job">{assessment.job?.title || 'Unknown job'}</p>
                            <p className="assessment-card-meta">
                                Updated {new Date(assessment.updatedAt || assessment.createdAt).toLocaleDateString()}
                            </p>
                            <p className="assessment-card-meta">
                                Sent {stats.sent} | Submitted {stats.submitted}
                            </p>

                            <div className="assessment-card-actions">
                                <button className="view-button" onClick={() => setSelectedAssessment(assessment)}>
                                    View Assessment
                                </button>
                                <button className="secondary-button" onClick={() => handleStartEdit(assessment)}>
                                    Edit
                                </button>
                                <button className="secondary-button" onClick={() => handleOpenSendPanel(assessment)}>
                                    Send Assessment
                                </button>
                                <button className="secondary-button" onClick={() => handleDeleteAssessment(assessment._id)}>
                                    Delete
                                </button>
                            </div>
                            </div>
                        );
                    })}
                </div>
            )}

            <div className="submitted-assessments-section">
                <div className="section-header">
                    <h2>Submitted Assessments</h2>
                </div>

                {submittedAssignments.length === 0 ? (
                    <div className="no-jobs-message">
                        <p>Submitted candidate answers will appear here once an assessment is completed.</p>
                    </div>
                ) : (
                    <div className="assessment-card-grid">
                        {submittedAssignments.map((assignment) => (
                            <div className="assessment-card" key={assignment._id}>
                                <div className="assessment-card-top">
                                    <div>
                                        <h3>{assignment.title}</h3>
                                        <p>{getCandidateName(assignment)}</p>
                                    </div>
                                    <span className="assessment-type-pill">
                                    Submitted
                                </span>
                            </div>
                            <p className="assessment-card-job">{assignment.job?.title || 'Unknown job'}</p>
                                <p className="assessment-card-meta">
                                    Submitted {assignment.submittedAt ? new Date(assignment.submittedAt).toLocaleDateString() : 'recently'}
                                </p>
                                <div className="assessment-card-actions">
                                    <button
                                        className="view-button"
                                        onClick={() => {
                                            setSelectedSubmission(assignment);
                                            setSelectedSubmissionView('submitted');
                                            setIsInterviewFormOpen(false);
                                            setIsCompletedInterviewOpen(false);
                                            setInterviewLink(assignment.videoInterview?.link || '');
                                            setInterviewDates(createInterviewDates(assignment.videoInterview?.dateOptions || []));
                                            setMessage('');
                                            setError('');
                                        }}
                                    >
                                        View Submission
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <div className="submitted-assessments-section">
                <div className="section-header">
                    <h2>Scheduled Interviews</h2>
                </div>

                {scheduledInterviews.length === 0 ? (
                    <div className="no-jobs-message">
                        <p>Accepted interview dates will appear here after candidates choose one of the 5 proposed dates.</p>
                    </div>
                ) : (
                    <div className="assessment-card-grid">
                        {scheduledInterviews.map((assignment) => (
                            <div className="assessment-card" key={`scheduled-${assignment._id}`}>
                                <div className="assessment-card-top">
                                    <div>
                                        <h3>{getCandidateName(assignment)}</h3>
                                        <p>{assignment.job?.title || 'Unknown job'}</p>
                                    </div>
                                    <span className="assessment-type-pill">Scheduled</span>
                                </div>
                                <p className="assessment-card-meta">
                                    Accepted {assignment.videoInterview?.candidateSelection?.respondedAt
                                        ? new Date(assignment.videoInterview.candidateSelection.respondedAt).toLocaleDateString()
                                        : 'recently'}
                                </p>
                                <p className="assessment-card-meta">
                                    Selected Date {assignment.videoInterview?.candidateSelection?.selectedDate
                                        ? new Date(assignment.videoInterview.candidateSelection.selectedDate).toLocaleDateString()
                                        : 'Not selected'}
                                </p>
                                <div className="assessment-card-actions">
                                    <button
                                        className="view-button"
                                        onClick={() => {
                                            setSelectedSubmission(assignment);
                                            setSelectedSubmissionView('scheduled');
                                            setIsInterviewFormOpen(false);
                                            setIsCompletedInterviewOpen(false);
                                            setInterviewLink(assignment.videoInterview?.link || '');
                                            setInterviewDates(createInterviewDates(assignment.videoInterview?.dateOptions || []));
                                            setMessage('');
                                            setError('');
                                        }}
                                    >
                                        View Scheduled Interview
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <div className="section-footer-nav">
                <button className="back-button responsive-back-button" onClick={onBack}>
                    Back to Dashboard
                </button>
            </div>
        </div>
    );
};

export default MakeAssessment;
