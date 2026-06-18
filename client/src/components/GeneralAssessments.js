import React, { forwardRef, useEffect, useImperativeHandle, useState } from 'react';
import AnimatedDeleteButton from './AnimatedDeleteButton';

const GeneralAssessments = forwardRef(({ companyId, jobs = [], onBack, onFooterBack }, ref) => {
    const [assessments, setAssessments] = useState([]);
    const [selectedAssessment, setSelectedAssessment] = useState(null);
    const [selectedJobIds, setSelectedJobIds] = useState([]);
    const [loading, setLoading] = useState(true);
    const [savingToJobs, setSavingToJobs] = useState(false);
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');

    useEffect(() => {
        fetchAssessments();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [companyId]);

    useImperativeHandle(ref, () => ({
        goBackOneStep: () => {
            if (!selectedAssessment) {
                return false;
            }

            setSelectedAssessment(null);
            return true;
        }
    }), [selectedAssessment]);

    const fetchAssessments = async () => {
        if (!companyId) {
            setAssessments([]);
            setLoading(false);
            return;
        }

        setLoading(true);
        setError('');

        try {
            const token = localStorage.getItem('employerToken');
            const response = await fetch(`${process.env.REACT_APP_API_URL || ''}/api/assessments/company/${companyId}`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) {
                throw new Error('Failed to load general assessments');
            }

            const data = await response.json();
            setAssessments((Array.isArray(data) ? data : []).filter((assessment) => (
                assessment.scope === 'general' || (!assessment.job && !assessment.application)
            )));
        } catch (fetchError) {
            console.error('Error loading general assessments:', fetchError);
            setError(fetchError.message || 'Failed to load general assessments.');
        } finally {
            setLoading(false);
        }
    };

    const deleteAssessment = async (assessmentId) => {
        if (!window.confirm('Delete this general assessment?')) {
            return;
        }

        setError('');
        setMessage('');

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

            setMessage('General assessment deleted successfully.');
            setSelectedAssessment(null);
            await fetchAssessments();
        } catch (deleteError) {
            console.error('Error deleting general assessment:', deleteError);
            setError(deleteError.message || 'Failed to delete assessment.');
        }
    };

    const toggleSelectedJob = (jobId) => {
        setSelectedJobIds((prevIds) => (
            prevIds.includes(jobId)
                ? prevIds.filter((id) => id !== jobId)
                : [...prevIds, jobId]
        ));
    };

    const saveAssessmentToSelectedJobs = async () => {
        if (!selectedAssessment || selectedJobIds.length === 0) {
            setError('Select at least one posted job first.');
            return;
        }

        setSavingToJobs(true);
        setError('');
        setMessage('');

        try {
            const token = localStorage.getItem('employerToken');
            const results = await Promise.all(selectedJobIds.map((jobId) => (
                fetch(`${process.env.REACT_APP_API_URL || ''}/api/assessments`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({
                        companyId,
                        scope: 'job',
                        jobId,
                        title: selectedAssessment.title,
                        instructions: selectedAssessment.instructions,
                        questions: selectedAssessment.questions
                    })
                })
            )));

            const failed = results.filter((response) => !response.ok);
            if (failed.length > 0) {
                throw new Error(`Saved to some jobs, but ${failed.length} failed.`);
            }

            setMessage(`Assessment saved to ${selectedJobIds.length} selected job${selectedJobIds.length === 1 ? '' : 's'}.`);
            setSelectedJobIds([]);
        } catch (saveError) {
            console.error('Error saving general assessment to jobs:', saveError);
            setError(saveError.message || 'Failed to save assessment to selected jobs.');
        } finally {
            setSavingToJobs(false);
        }
    };

    if (selectedAssessment) {
        return (
            <div className="assessment-builder-container">
                <div className="manage-jobs-header">
                    <h2>{selectedAssessment.title}</h2>
                    <button className="back-button responsive-back-button" onClick={() => setSelectedAssessment(null)}>
                        Back to General Assessments
                    </button>
                </div>

                {message && <div className={`notification-message ${message.includes('Error') ? 'error' : 'success'}`}>{message}</div>}
                {error && <div className="error-message">{error}</div>}

                <div className="assessment-summary-card">
                    <p><strong>Saved:</strong> General Assessment</p>
                    <p><strong>Questions:</strong> {selectedAssessment.questions?.length || 0}</p>
                    {selectedAssessment.instructions && (
                        <div className="assessment-instructions">
                            <h3>Instructions</h3>
                            <p>{selectedAssessment.instructions}</p>
                        </div>
                    )}
                </div>

                <div className="settings-card assessment-send-panel">
                    <div className="section-header">
                        <h3>Save This Assessment to Posted Jobs</h3>
                    </div>
                    {jobs.length === 0 ? (
                        <p className="empty-info">No posted jobs are available yet.</p>
                    ) : (
                        <div className="job-interest-grid general-assessment-job-grid">
                            {jobs.map((job) => (
                                <button
                                    type="button"
                                    key={job._id}
                                    className={selectedJobIds.includes(job._id) ? 'selected' : ''}
                                    onClick={() => toggleSelectedJob(job._id)}
                                >
                                    {job.title}
                                </button>
                            ))}
                        </div>
                    )}
                    <div className="assessment-footer-actions">
                        <button
                            className="settings-button primary"
                            onClick={saveAssessmentToSelectedJobs}
                            disabled={savingToJobs || selectedJobIds.length === 0}
                        >
                            {savingToJobs ? 'Saving...' : 'Save to Selected Jobs'}
                        </button>
                    </div>
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
                            {question.type === 'multiple-choice' && (
                                <ul className="assessment-option-list">
                                    {question.options?.map((option, optionIndex) => (
                                        <li key={optionIndex}>{option}</li>
                                    ))}
                                </ul>
                            )}
                        </div>
                    ))}
                </div>

                <div className="assessment-footer-actions">
                    <AnimatedDeleteButton
                        onClick={() => deleteAssessment(selectedAssessment._id)}
                        title="Delete assessment"
                    />
                </div>
            </div>
        );
    }

    return (
        <div className="assessment-builder-container">
            <div className="manage-jobs-header">
                <h2>General Assessment</h2>
            </div>

            {message && <div className={`notification-message ${message.includes('Error') ? 'error' : 'success'}`}>{message}</div>}
            {error && <div className="error-message">{error}</div>}

            {loading ? (
                <div className="loading-spinner">Loading general assessments...</div>
            ) : assessments.length === 0 ? (
                <div className="no-jobs-message">
                    <h3>No general assessments yet</h3>
                    <p>Assessments saved with "Save in General" will appear here.</p>
                </div>
            ) : (
                <div className="assessment-card-grid">
                    {assessments.map((assessment) => (
                        <div className="assessment-card" key={assessment._id}>
                            <div className="assessment-card-top">
                                <div>
                                    <h3>{assessment.title}</h3>
                                    <p>{assessment.questions?.length || 0} question{assessment.questions?.length === 1 ? '' : 's'}</p>
                                </div>
                                <span className="assessment-type-pill">General</span>
                            </div>
                            <p className="assessment-card-meta">
                                Saved {new Date(assessment.createdAt).toLocaleDateString()}
                            </p>
                            <div className="assessment-card-actions">
                                <button className="view-button" onClick={() => setSelectedAssessment(assessment)}>
                                    View Assessment
                                </button>
                                <AnimatedDeleteButton
                                    onClick={() => deleteAssessment(assessment._id)}
                                    title="Delete assessment"
                                />
                            </div>
                        </div>
                    ))}
                </div>
            )}

            <div className="page-footer-actions">
                <button className="back-button responsive-back-button" onClick={onFooterBack || onBack}>
                    Back
                </button>
            </div>
        </div>
    );
});

export default GeneralAssessments;
