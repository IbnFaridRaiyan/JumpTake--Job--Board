import React, { useEffect, useState } from 'react';
import AnimatedDeleteButton from './AnimatedDeleteButton';

const createQuestion = (type = 'multiple-choice') => ({
    clientId: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    prompt: '',
    type,
    options: type === 'multiple-choice' ? ['', ''] : [],
    maxWords: 2000
});

const createEmptyAssessment = () => ({
    title: '',
    instructions: '',
    saveTarget: 'general',
    jobId: '',
    questions: [createQuestion()]
});

const MakeAssessment = ({ companyId, jobs = [], onBack, onFooterBack }) => {
    const [formData, setFormData] = useState(createEmptyAssessment());
    const [availableJobs, setAvailableJobs] = useState(jobs);
    const [loadingJobs, setLoadingJobs] = useState(false);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');

    useEffect(() => {
        setAvailableJobs(jobs);
    }, [jobs]);

    useEffect(() => {
        fetchJobs();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [companyId]);

    const fetchJobs = async () => {
        if (!companyId) {
            setAvailableJobs([]);
            return;
        }

        setLoadingJobs(true);

        try {
            const token = localStorage.getItem('employerToken');
            const response = await fetch(`${process.env.REACT_APP_API_URL || ''}/api/companies/${companyId}/jobs`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) {
                throw new Error('Failed to load posted jobs');
            }

            const data = await response.json();
            setAvailableJobs(Array.isArray(data) ? data : []);
        } catch (fetchError) {
            console.error('Error loading jobs for assessment creator:', fetchError);
            setError('Failed to load posted jobs. You can still save the assessment in general.');
        } finally {
            setLoadingJobs(false);
        }
    };

    const updateQuestion = (clientId, updates) => {
        setFormData((prev) => ({
            ...prev,
            questions: prev.questions.map((question) => (
                question.clientId === clientId ? { ...question, ...updates } : question
            ))
        }));
    };

    const handleQuestionTypeChange = (clientId, type) => {
        setFormData((prev) => ({
            ...prev,
            questions: prev.questions.map((question) => (
                question.clientId === clientId
                    ? {
                        ...question,
                        type,
                        options: type === 'multiple-choice'
                            ? (question.options?.length ? question.options : ['', ''])
                            : []
                    }
                    : question
            ))
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
                return { ...question, options: nextOptions };
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
            questions: prev.questions.map((question) => (
                question.clientId === clientId && question.options.length > 2
                    ? { ...question, options: question.options.filter((_, index) => index !== optionIndex) }
                    : question
            ))
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

    const buildQuestions = () => (
        formData.questions.map((question) => ({
            prompt: question.prompt.trim(),
            type: question.type,
            options: question.type === 'multiple-choice'
                ? question.options.map((option) => option.trim()).filter(Boolean)
                : [],
            maxWords: 2000
        }))
    );

    const saveAssessment = async () => {
        if (!formData.title.trim()) {
            setError('Assessment title is required.');
            return;
        }

        if (formData.saveTarget === 'job' && !formData.jobId) {
            setError('Choose a posted job or select Save in General.');
            return;
        }

        const questions = buildQuestions();
        const hasInvalidQuestion = questions.some((question) => (
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
            const response = await fetch(`${process.env.REACT_APP_API_URL || ''}/api/assessments`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    companyId,
                    scope: formData.saveTarget,
                    jobId: formData.saveTarget === 'job' ? formData.jobId : undefined,
                    title: formData.title,
                    instructions: formData.instructions,
                    questions
                })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to save assessment');
            }

            setMessage(
                formData.saveTarget === 'job'
                    ? 'Assessment saved for the selected job.'
                    : 'Assessment saved in General Assessment.'
            );
            setFormData(createEmptyAssessment());
        } catch (saveError) {
            console.error('Error saving assessment:', saveError);
            setError(saveError.message || 'Failed to save assessment.');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="assessment-builder-container">
            <div className="manage-jobs-header">
                <h2>Make an Assessment</h2>
            </div>

            {message && (
                <div className={`notification-message ${message.includes('Error') ? 'error' : 'success'}`}>
                    {message}
                </div>
            )}
            {error && <div className="error-message">{error}</div>}

            <div className="settings-card assessment-send-panel">
                <div className="form-group">
                    <label htmlFor="assessment-title">Assessment Title</label>
                    <input
                        id="assessment-title"
                        type="text"
                        className="form-control"
                        value={formData.title}
                        onChange={(event) => setFormData((prev) => ({ ...prev, title: event.target.value }))}
                        placeholder="Technical screening assessment"
                    />
                </div>

                <div className="form-group">
                    <label htmlFor="assessment-instructions">Instructions</label>
                    <textarea
                        id="assessment-instructions"
                        className="form-control"
                        rows="4"
                        value={formData.instructions}
                        onChange={(event) => setFormData((prev) => ({ ...prev, instructions: event.target.value }))}
                        placeholder="Add guidance candidates should read before answering"
                    />
                </div>

                <div className="form-row">
                    <div className="form-group">
                        <label htmlFor="assessment-save-target">Save Location</label>
                        <select
                            id="assessment-save-target"
                            className="form-control"
                            value={formData.saveTarget}
                            onChange={(event) => setFormData((prev) => ({
                                ...prev,
                                saveTarget: event.target.value,
                                jobId: event.target.value === 'general' ? '' : prev.jobId
                            }))}
                        >
                            <option value="general">Save in General</option>
                            <option value="job">Save for Posted Job</option>
                        </select>
                    </div>

                    {formData.saveTarget === 'job' && (
                        <div className="form-group">
                            <label htmlFor="assessment-job">Posted Job</label>
                            <select
                                id="assessment-job"
                                className="form-control"
                                value={formData.jobId}
                                onChange={(event) => setFormData((prev) => ({ ...prev, jobId: event.target.value }))}
                                disabled={loadingJobs}
                            >
                                <option value="">{loadingJobs ? 'Loading jobs...' : 'Choose a job'}</option>
                                {availableJobs.map((job) => (
                                    <option key={job._id} value={job._id}>
                                        {job.title} ({job.jobNumber || 'No job number'})
                                    </option>
                                ))}
                            </select>
                        </div>
                    )}
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
                                <AnimatedDeleteButton
                                    onClick={() => removeQuestion(question.clientId)}
                                    disabled={formData.questions.length === 1}
                                    title="Remove question"
                                />
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
                                        <AnimatedDeleteButton
                                            onClick={() => removeOption(question.clientId, optionIndex)}
                                            disabled={question.options.length <= 2}
                                            title="Remove option"
                                        />
                                    </div>
                                ))}
                                <button className="view-button no-icon-button" onClick={() => addOption(question.clientId)}>
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

            <div className="assessment-footer-actions">
                <button className="settings-button primary" onClick={saveAssessment} disabled={saving}>
                    {saving ? 'Saving...' : 'Save Assessment'}
                </button>
            </div>

            <div className="page-footer-actions">
                <button className="back-button responsive-back-button" onClick={onBack}>
                    Back to Dashboard
                </button>
                <button className="back-button responsive-back-button" onClick={onFooterBack || onBack}>
                    Back
                </button>
            </div>
        </div>
    );
};

export default MakeAssessment;
