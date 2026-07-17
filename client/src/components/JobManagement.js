import React, { useEffect, useMemo, useRef, useState } from 'react';
import AnimatedDeleteButton from './AnimatedDeleteButton';
import EditJob from './EditJob';
import ResumeFilePreview from './ResumeFilePreview';
import ProfileAvatar from './ProfileAvatar';
import { sendApplicationStatusEmail } from '../utils/emailVerification';
import confirmAction from '../utils/confirmAction';

const createQuestion = (type = 'multiple-choice') => ({
    clientId: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    prompt: '',
    type,
    options: type === 'multiple-choice' ? ['', ''] : [],
    maxWords: 2000,
    correctAnswer: '',
    marks: 1
});

const createEmptyAssessment = (applicationId = '') => ({
    title: '',
    instructions: '',
    timeLimitMinutes: '',
    applicationId,
    questions: [createQuestion()]
});

const createInterviewDates = (dates = []) => Array.from({ length: 5 }, (_, index) => dates[index] || '');

const SECTIONS = [
    { id: 'view', label: 'View Job Post' },
    { id: 'edit', label: 'Edit' },
    { id: 'send-job-invite', label: 'Send Job Invite' },
    { id: 'applicants', label: 'Applicants' },
    { id: 'create-assessment', label: 'Create Assessment' },
    { id: 'shortlisted-assessment', label: 'Shortlisted for Assessment Candidates' },
    { id: 'assessment-invitations', label: 'Assessment Invitations' },
    { id: 'completed-assessment', label: 'Completed Assessment' },
    { id: 'shortlisted-video', label: 'Shortlisted for Video Assessment' },
    { id: 'arrange-video', label: 'Arrange Video Interview' },
    { id: 'bookmarked', label: 'Bookmarked Application' },
    { id: 'hired', label: 'Hired Candidates' },
    { id: 'hold', label: 'Candidates on Hold' },
    { id: 'rejected', label: 'Rejected Candidates' }
];

const getId = (value) => {
    if (!value) {
        return '';
    }

    return String(value._id || value);
};

const getStatusClassName = (status) => (
    status ? status.toLowerCase().replace(/\s+/g, '-') : 'submitted'
);

const formatDate = (dateString) => {
    if (!dateString) {
        return 'Not available';
    }

    return new Date(dateString).toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
};

const formatDateTime = (dateString) => {
    if (!dateString) {
        return 'Not available';
    }

    return new Date(dateString).toLocaleString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
};

const formatValue = (value) => {
    if (Array.isArray(value)) {
        return value.length ? value.join(', ') : 'Not specified';
    }

    if (value && typeof value === 'object') {
        return JSON.stringify(value);
    }

    return value || 'Not specified';
};

const JobManagement = ({ job, companyId, onBack, onJobUpdated }) => {
    const [currentJob, setCurrentJob] = useState(job);
    const [activeSection, setActiveSection] = useState('view');
    const [mobileSectionVisible, setMobileSectionVisible] = useState(false);
    const [applications, setApplications] = useState([]);
    const [bookmarkedApplicationIds, setBookmarkedApplicationIds] = useState([]);
    const [assessments, setAssessments] = useState([]);
    const [assignments, setAssignments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const [selectedApplication, setSelectedApplication] = useState(null);
    const [selectedAssignment, setSelectedAssignment] = useState(null);
    const [selectedAssessmentId, setSelectedAssessmentId] = useState('');
    const [sendingApplicationId, setSendingApplicationId] = useState('');
    const [assessmentForm, setAssessmentForm] = useState(createEmptyAssessment());
    const [editingAssessmentId, setEditingAssessmentId] = useState(null);
    const [interviewLink, setInterviewLink] = useState('');
    const [interviewDates, setInterviewDates] = useState(createInterviewDates());
    const [seenApplicantsCount, setSeenApplicantsCount] = useState(0);
    const [seenCompletedAssessmentCount, setSeenCompletedAssessmentCount] = useState(0);
    const [jobInviteCandidates, setJobInviteCandidates] = useState([]);
    const [selectedJobInviteCandidateIds, setSelectedJobInviteCandidateIds] = useState([]);
    const [jobInviteMessage, setJobInviteMessage] = useState('');
    const [loadingJobInvites, setLoadingJobInvites] = useState(false);
    const [sendingJobInvites, setSendingJobInvites] = useState(false);
    const mobileSectionPanelRef = useRef(null);

    const jobId = getId(currentJob);

    useEffect(() => {
        setCurrentJob(job);
    }, [job]);

    useEffect(() => {
        fetchWorkspaceData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [companyId, jobId]);

    useEffect(() => {
        const storedSection = localStorage.getItem('jumptakeEmployerManagedJobSection');
        if (!storedSection) {
            return;
        }

        if (SECTIONS.some((section) => section.id === storedSection)) {
            setActiveSection(storedSection);
            setMobileSectionVisible(true);
            resetMobileWorkspaceScroll();
        }

        localStorage.removeItem('jumptakeEmployerManagedJobSection');
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [jobId]);

    useEffect(() => {
        if (activeSection === 'send-job-invite') {
            fetchJobInviteMatches();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activeSection, companyId, jobId]);

    const fetchWorkspaceData = async () => {
        if (!companyId || !jobId) {
            setLoading(false);
            return;
        }

        setLoading(true);
        setError('');

        try {
            const token = localStorage.getItem('employerToken');
            const [jobResponse, applicationsResponse, assessmentsResponse, assignmentsResponse, bookmarksResponse] = await Promise.all([
                fetch(`${process.env.REACT_APP_API_URL || ''}/api/jobs/${jobId}`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                }),
                fetch(`${process.env.REACT_APP_API_URL || ''}/api/applications/company/${companyId}`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                }),
                fetch(`${process.env.REACT_APP_API_URL || ''}/api/assessments/company/${companyId}`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                }),
                fetch(`${process.env.REACT_APP_API_URL || ''}/api/assessments/company/${companyId}/assignments`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                }),
                fetch(`${process.env.REACT_APP_API_URL || ''}/api/application-bookmarks/company/${companyId}`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                })
            ]);

            if (!jobResponse.ok) {
                throw new Error('Failed to load job details');
            }

            if (!applicationsResponse.ok) {
                throw new Error('Failed to load applicants');
            }

            if (!assessmentsResponse.ok) {
                throw new Error('Failed to load assessments');
            }

            if (!assignmentsResponse.ok) {
                throw new Error('Failed to load assessment invitations');
            }

            if (!bookmarksResponse.ok) {
                throw new Error('Failed to load bookmarked applications');
            }

            const [jobData, applicationsData, assessmentsData, assignmentsData, bookmarksData] = await Promise.all([
                jobResponse.json(),
                applicationsResponse.json(),
                assessmentsResponse.json(),
                assignmentsResponse.json(),
                bookmarksResponse.json()
            ]);

            setCurrentJob(jobData);
            setApplications(Array.isArray(applicationsData) ? applicationsData : []);
            setAssessments(Array.isArray(assessmentsData) ? assessmentsData : []);
            setAssignments(Array.isArray(assignmentsData) ? assignmentsData : []);
            setBookmarkedApplicationIds((Array.isArray(bookmarksData) ? bookmarksData : [])
                .map((bookmark) => bookmark?.application?._id || bookmark?.application)
                .filter(Boolean)
                .map((applicationId) => String(applicationId)));
        } catch (fetchError) {
            console.error('Error loading job management workspace:', fetchError);
            setError(fetchError.message || 'Failed to load this job workspace.');
        } finally {
            setLoading(false);
        }
    };

    const fetchJobInviteMatches = async () => {
        if (!companyId || !jobId) {
            setJobInviteCandidates([]);
            return;
        }

        setLoadingJobInvites(true);

        try {
            const token = localStorage.getItem('employerToken');
            const response = await fetch(`${process.env.REACT_APP_API_URL || ''}/api/job-invitations/company/${companyId}/job/${jobId}/matches`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) {
                throw new Error('Failed to load matching candidates');
            }

            const rows = await response.json();
            setJobInviteCandidates(Array.isArray(rows) ? rows : []);
        } catch (inviteError) {
            console.error('Error loading job invite matches:', inviteError);
            setJobInviteCandidates([]);
        } finally {
            setLoadingJobInvites(false);
        }
    };

    const jobApplications = useMemo(() => (
        applications.filter((application) => (
            getId(application?.job) === jobId &&
            application?.status !== 'Withdrawn'
        ))
    ), [applications, jobId]);

    const jobAssessments = useMemo(() => (
        assessments.filter((assessment) => getId(assessment?.job) === jobId)
    ), [assessments, jobId]);

    const jobAssignments = useMemo(() => (
        assignments.filter((assignment) => getId(assignment?.job) === jobId)
    ), [assignments, jobId]);

    const assignmentByApplicationId = useMemo(() => {
        const map = new Map();
        jobAssignments.forEach((assignment) => {
            const applicationId = getId(assignment?.application);
            if (applicationId && !map.has(applicationId)) {
                map.set(applicationId, assignment);
            }
        });
        return map;
    }, [jobAssignments]);

    const shortlistedAssessmentCandidates = jobApplications.filter((application) => (
        application.status === 'Shortlisted for Assessment' && !assignmentByApplicationId.has(getId(application))
    ));

    const assessmentInvitations = jobAssignments.filter((assignment) => assignment.status === 'Sent');

    const completedAssessments = jobAssignments.filter((assignment) => (
        assignment.status === 'Submitted' &&
        !['Video Interview', 'Hired', 'Rejected', 'Hold Candidate'].includes(assignment.decision || 'Pending')
    ));

    const hasApplicantNotification = activeSection !== 'applicants' && jobApplications.length > seenApplicantsCount;
    const hasCompletedAssessmentNotification = activeSection !== 'completed-assessment' && completedAssessments.length > seenCompletedAssessmentCount;

    const shortlistedVideoCandidates = jobAssignments.filter((assignment) => (
        assignment.status === 'Submitted' &&
        assignment.decision === 'Video Interview' &&
        !assignment.videoInterview?.link
    ));

    const videoInterviewInvitations = jobAssignments.filter((assignment) => (
        assignment.status === 'Submitted' &&
        assignment.decision === 'Video Interview' &&
        assignment.videoInterview?.link
    ));

    const hiredCandidates = jobApplications.filter((application) => application.status === 'Accepted');
    const holdCandidates = jobApplications.filter((application) => application.status === 'On Hold');
    const rejectedCandidates = jobApplications.filter((application) => ['Rejected', 'Unsuccessful'].includes(application.status));
    const bookmarkedApplications = jobApplications.filter((application) => bookmarkedApplicationIds.includes(String(application._id)));

    const getCandidateProfile = (applicationOrAssignment) => {
        const application = applicationOrAssignment?.application || applicationOrAssignment;
        const submittedProfile = application?.profileSnapshot;
        const liveProfile = application?.user?.jobSeekerId || applicationOrAssignment?.candidateUser?.jobSeekerId;

        return {
            ...(liveProfile || {}),
            ...(submittedProfile || {}),
            email: submittedProfile?.email || liveProfile?.email || application?.user?.email || applicationOrAssignment?.candidateUser?.email || ''
        };
    };

    const getCandidateName = (applicationOrAssignment) => {
        const candidate = getCandidateProfile(applicationOrAssignment);
        return candidate?.name || candidate?.email || 'Unnamed Candidate';
    };

    const getCandidateEmail = (applicationOrAssignment) => {
        const candidate = getCandidateProfile(applicationOrAssignment);
        return candidate?.email || applicationOrAssignment?.user?.email || applicationOrAssignment?.candidateUser?.email || 'Email not available';
    };

    const notifyCandidateApplicationUpdate = async (applicationOrAssignment, statusTitle) => {
        const email = getCandidateEmail(applicationOrAssignment);
        const name = getCandidateName(applicationOrAssignment);

        try {
            await sendApplicationStatusEmail({
                email,
                recipientName: name,
                statusTitle
            });
        } catch (emailError) {
            console.error('Error sending application status email:', emailError);
        }
    };

    const getCandidateNumber = (applicationOrAssignment) => (
        applicationOrAssignment?.candidateNumber ||
        applicationOrAssignment?.application?.candidateNumber ||
        'Not assigned'
    );

    const resetPanels = () => {
        setSelectedApplication(null);
        setSelectedAssignment(null);
        setMessage('');
        setError('');
    };

    const switchSection = (sectionId) => {
        resetPanels();
        setActiveSection(sectionId);
        setMobileSectionVisible(true);
        resetMobileWorkspaceScroll();

        if (sectionId === 'applicants') {
            setSeenApplicantsCount(jobApplications.length);
        }

        if (sectionId === 'completed-assessment') {
            setSeenCompletedAssessmentCount(completedAssessments.length);
        }
    };

    const closeMobileSectionPanel = () => {
        setMobileSectionVisible(false);
        resetMobileWorkspaceScroll();
    };

    const resetMobileWorkspaceScroll = () => {
        window.requestAnimationFrame(() => {
            const panel = mobileSectionPanelRef.current;
            if (panel) {
                panel.scrollTop = 0;
            }

            const outerPanel = panel?.closest?.('.mobile-dashboard-section-panel');
            if (outerPanel) {
                outerPanel.scrollTop = 0;
            }
        });
    };

    const updateApplicationStatus = async (application, status, successMessage) => {
        if (!application?._id) {
            return;
        }

        setSaving(true);
        setMessage('');
        setError('');

        try {
            const token = localStorage.getItem('employerToken');
            const response = await fetch(`${process.env.REACT_APP_API_URL || ''}/api/applications/${application._id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ status })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to update application');
            }

            setApplications((prevApplications) => prevApplications.map((item) => (
                item._id === application._id ? { ...item, status } : item
            )));
            setSelectedApplication((prevApplication) => (
                prevApplication?._id === application._id ? { ...prevApplication, status } : prevApplication
            ));
            setMessage(successMessage || `Application moved to ${status}.`);
            await notifyCandidateApplicationUpdate({ ...application, status }, status);
        } catch (statusError) {
            console.error('Error updating application status:', statusError);
            setError(statusError.message || 'Failed to update application.');
        } finally {
            setSaving(false);
        }
    };

    const toggleApplicationBookmark = async (application) => {
        if (!application?._id) {
            return;
        }

        setSaving(true);
        setMessage('');
        setError('');

        const applicationId = String(application._id);
        const isBookmarked = bookmarkedApplicationIds.includes(applicationId);

        if (isBookmarked) {
            const confirmed = await confirmAction({
                title: 'Remove bookmark?',
                message: 'Remove this application from your bookmarks?'
            });
            if (!confirmed) {
                setSaving(false);
                return;
            }
        }

        try {
            const token = localStorage.getItem('employerToken');
            const response = await fetch(
                isBookmarked
                    ? `${process.env.REACT_APP_API_URL || ''}/api/application-bookmarks/company/${companyId}/application/${application._id}`
                    : `${process.env.REACT_APP_API_URL || ''}/api/application-bookmarks`,
                {
                    method: isBookmarked ? 'DELETE' : 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: isBookmarked
                        ? undefined
                        : JSON.stringify({
                            companyId,
                            applicationId: application._id
                        })
                }
            );

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || 'Failed to update bookmark');
            }

            setBookmarkedApplicationIds((prevIds) => (
                isBookmarked
                    ? prevIds.filter((id) => id !== applicationId)
                    : [...new Set([...prevIds, applicationId])]
            ));
            setMessage(isBookmarked ? 'Application bookmark removed.' : 'Application bookmarked.');
        } catch (bookmarkError) {
            console.error('Error updating application bookmark:', bookmarkError);
            setError(bookmarkError.message || 'Failed to update bookmark.');
        } finally {
            setSaving(false);
        }
    };

    const updateAssignment = async (endpoint, body, successMessage) => {
        setSaving(true);
        setMessage('');
        setError('');

        try {
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
                throw new Error(data.error || 'Failed to update candidate');
            }

            setMessage(data.message || successMessage);
            await fetchWorkspaceData();
            setSelectedAssignment(data.assignment || null);
            return data.assignment;
        } catch (assignmentError) {
            console.error('Error updating assessment assignment:', assignmentError);
            setError(assignmentError.message || 'Failed to update candidate.');
            return null;
        } finally {
            setSaving(false);
        }
    };

    const handleOpenApplication = async (application) => {
        let nextApplication = application;

        if (application.status === 'Submitted') {
            nextApplication = { ...application, status: 'Reviewed' };
            await updateApplicationStatus(application, 'Reviewed', 'Application marked as reviewed.');
        }

        setSelectedApplication(nextApplication);
    };

    const handleJobUpdated = async () => {
        if (onJobUpdated) {
            onJobUpdated();
        }
        setMessage('Job listing updated successfully.');
        await fetchWorkspaceData();
    };

    const updateQuestion = (clientId, updates) => {
        setAssessmentForm((prevForm) => ({
            ...prevForm,
            questions: prevForm.questions.map((question) => (
                question.clientId === clientId ? { ...question, ...updates } : question
            ))
        }));
    };

    const handleQuestionTypeChange = (clientId, type) => {
        setAssessmentForm((prevForm) => ({
            ...prevForm,
            questions: prevForm.questions.map((question) => (
                question.clientId === clientId
                    ? {
                        ...question,
                        type,
                        options: type === 'multiple-choice'
                            ? (question.options?.length ? question.options : ['', ''])
                            : [],
                        correctAnswer: ''
                    }
                    : question
            ))
        }));
    };

    const handleOptionChange = (clientId, optionIndex, value) => {
        setAssessmentForm((prevForm) => ({
            ...prevForm,
            questions: prevForm.questions.map((question) => {
                if (question.clientId !== clientId) {
                    return question;
                }

                const nextOptions = [...question.options];
                nextOptions[optionIndex] = value;
                return { ...question, options: nextOptions };
            })
        }));
    };

    const addQuestion = (type = 'multiple-choice') => {
        setAssessmentForm((prevForm) => ({
            ...prevForm,
            questions: [...prevForm.questions, createQuestion(type)]
        }));
    };

    const removeQuestion = (clientId) => {
        setAssessmentForm((prevForm) => ({
            ...prevForm,
            questions: prevForm.questions.length <= 1
                ? prevForm.questions
                : prevForm.questions.filter((question) => question.clientId !== clientId)
        }));
    };

    const startEditAssessment = (assessment) => {
        setEditingAssessmentId(assessment._id);
        setAssessmentForm({
            title: assessment.title || '',
            instructions: assessment.instructions || '',
            timeLimitMinutes: assessment.timeLimitMinutes || '',
            applicationId: '',
            questions: (assessment.questions || []).map((question) => ({
                clientId: question._id || `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
                prompt: question.prompt || '',
                type: question.type || 'multiple-choice',
                options: question.type === 'multiple-choice'
                    ? (question.options?.length ? question.options : ['', ''])
                    : [],
                maxWords: 2000,
                correctAnswer: question.correctAnswer || '',
                marks: question.marks || 1
            }))
        });
        setActiveSection('create-assessment');
        setMobileSectionVisible(true);
    };

    const resetAssessmentForm = () => {
        setEditingAssessmentId(null);
        setAssessmentForm(createEmptyAssessment(shortlistedAssessmentCandidates[0]?._id || jobApplications[0]?._id || ''));
    };

    const saveAssessment = async () => {
        if (!assessmentForm.title.trim()) {
            setError('Assessment title is required.');
            return;
        }

        const cleanedQuestions = assessmentForm.questions.map((question) => ({
            prompt: question.prompt.trim(),
            type: question.type,
            options: question.type === 'multiple-choice'
                ? question.options.map((option) => option.trim()).filter(Boolean)
                : [],
            maxWords: 2000,
            correctAnswer: (question.correctAnswer || '').trim(),
            marks: Number(question.marks)
        }));

        const hasInvalidQuestion = cleanedQuestions.some((question) => (
            !question.prompt ||
            !question.correctAnswer ||
            !Number.isFinite(question.marks) ||
            question.marks <= 0 ||
            (question.type === 'multiple-choice' && question.options.length < 2)
        ));

        if (hasInvalidQuestion) {
            setError('Each question needs a prompt, correct answer, marks greater than 0, and multiple-choice questions need at least two options.');
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
                    jobId,
                    scope: 'job',
                    title: assessmentForm.title,
                    instructions: assessmentForm.instructions,
                    timeLimitMinutes: Number(assessmentForm.timeLimitMinutes) || 0,
                    questions: cleanedQuestions
                })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to save assessment');
            }

            setMessage(editingAssessmentId ? 'Assessment updated successfully.' : 'Assessment created successfully.');
            setSelectedAssessmentId(data._id);
            resetAssessmentForm();
            await fetchWorkspaceData();
        } catch (saveError) {
            console.error('Error saving assessment:', saveError);
            setError(saveError.message || 'Failed to save assessment.');
        } finally {
            setSaving(false);
        }
    };

    const deleteAssessment = async (assessmentId) => {
        const confirmed = await confirmAction({
            title: 'Delete assessment?',
            message: 'Delete this assessment permanently?'
        });
        if (!confirmed) {
            return;
        }

        setSaving(true);
        setError('');
        setMessage('');

        try {
            const token = localStorage.getItem('employerToken');
            const response = await fetch(`${process.env.REACT_APP_API_URL || ''}/api/assessments/${assessmentId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to delete assessment');
            }

            setMessage('Assessment deleted successfully.');
            await fetchWorkspaceData();
        } catch (deleteError) {
            console.error('Error deleting assessment:', deleteError);
            setError(deleteError.message || 'Failed to delete assessment.');
        } finally {
            setSaving(false);
        }
    };

    const toggleJobInviteCandidate = (candidateId) => {
        setSelectedJobInviteCandidateIds((prevIds) => (
            prevIds.includes(candidateId)
                ? prevIds.filter((id) => id !== candidateId)
                : [...prevIds, candidateId]
        ));
    };

    const selectAllJobInviteCandidates = () => {
        setSelectedJobInviteCandidateIds(jobInviteCandidates.map((row) => getId(row.candidate)).filter(Boolean));
    };

    const sendJobInvitations = async ({ sendToAllBookmarked = false, candidateIds = selectedJobInviteCandidateIds } = {}) => {
        const ids = Array.isArray(candidateIds) ? candidateIds.filter(Boolean) : [];
        if (!sendToAllBookmarked && ids.length === 0) {
            setError('Choose at least one matching candidate to invite.');
            return;
        }

        setSendingJobInvites(true);
        setError('');
        setMessage('');

        try {
            const token = localStorage.getItem('employerToken');
            const response = await fetch(`${process.env.REACT_APP_API_URL || ''}/api/job-invitations/send`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    companyId,
                    jobId,
                    candidateIds: ids,
                    sendToAllBookmarked,
                    message: jobInviteMessage
                })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to send job invitations');
            }

            setMessage(data.message || 'Job invitations sent.');
            setSelectedJobInviteCandidateIds([]);
        } catch (inviteError) {
            console.error('Error sending job invitations:', inviteError);
            setError(inviteError.message || 'Failed to send job invitations.');
        } finally {
            setSendingJobInvites(false);
        }
    };

    const sendAssessment = async (assessmentId, applicationId) => {
        if (!assessmentId || !applicationId) {
            setError('Choose an assessment and a candidate before sending.');
            return;
        }

        setSaving(true);
        setSendingApplicationId(applicationId);
        setError('');
        setMessage('');

        try {
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

            const targetApplication = jobApplications.find((application) => getId(application) === applicationId);
            if (targetApplication) {
                await notifyCandidateApplicationUpdate(targetApplication, 'Assessment Invitation');
            }
            setMessage(data.message || 'Assessment sent successfully.');
            await fetchWorkspaceData();
        } catch (sendError) {
            console.error('Error sending assessment:', sendError);
            setError(sendError.message || 'Failed to send assessment.');
        } finally {
            setSaving(false);
            setSendingApplicationId('');
        }
    };

    const sendAssessmentToAllShortlisted = async (assessmentId) => {
        if (!assessmentId) {
            setError('Choose an assessment first.');
            return;
        }

        const unsentCandidates = shortlistedAssessmentCandidates.filter((application) => (
            !jobAssignments.some((assignment) => (
                getId(assignment.assessment) === assessmentId &&
                getId(assignment.application) === getId(application)
            ))
        ));

        if (unsentCandidates.length === 0) {
            setError('There are no unsent shortlisted candidates for this assessment.');
            return;
        }

        setSaving(true);
        setError('');
        setMessage('');

        try {
            const token = localStorage.getItem('employerToken');
            const results = await Promise.all(unsentCandidates.map((application) => (
                fetch(`${process.env.REACT_APP_API_URL || ''}/api/assessments/${assessmentId}/send`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({ applicationId: application._id })
                })
            )));

            const failed = results.filter((response) => !response.ok);
            if (failed.length > 0) {
                throw new Error(`Sent some invitations, but ${failed.length} failed.`);
            }

            await Promise.allSettled(unsentCandidates.map((application) => (
                notifyCandidateApplicationUpdate(application, 'Assessment Invitation')
            )));
            setMessage(`Assessment sent to ${unsentCandidates.length} shortlisted candidate${unsentCandidates.length === 1 ? '' : 's'}.`);
            await fetchWorkspaceData();
        } catch (sendAllError) {
            console.error('Error sending assessments:', sendAllError);
            setError(sendAllError.message || 'Failed to send assessments.');
        } finally {
            setSaving(false);
        }
    };

    const shortlistForVideo = async (assignment) => {
        const updatedAssignment = await updateAssignment(
            `/api/assessment-assignments/${assignment._id}/shortlist-video`,
            null,
            'Candidate shortlisted for video interview.'
        );

        if (updatedAssignment) {
            await notifyCandidateApplicationUpdate(updatedAssignment, 'Shortlisted for Video Assessment');
        }
    };

    const sendVideoInterview = async (assignment) => {
        if (!interviewLink.trim()) {
            setError('Enter a video interview link before sending.');
            return;
        }

        const cleanedDates = interviewDates.map((date) => date.trim()).filter(Boolean);
        if (cleanedDates.length !== 5 || new Set(cleanedDates).size !== cleanedDates.length) {
            setError('Choose exactly 5 different interview dates.');
            return;
        }

        const updatedAssignment = await updateAssignment(
            `/api/assessment-assignments/${assignment._id}/video-interview`,
            {
                link: interviewLink,
                dateOptions: cleanedDates
            },
            'Video interview invitation sent successfully.'
        );

        if (updatedAssignment) {
            await notifyCandidateApplicationUpdate(updatedAssignment, 'Video Interview Invitation');
            setInterviewLink('');
            setInterviewDates(createInterviewDates());
        }
    };

    const sendVideoInterviewToAll = async () => {
        if (!interviewLink.trim()) {
            setError('Enter a video interview link before sending.');
            return;
        }

        const cleanedDates = interviewDates.map((date) => date.trim()).filter(Boolean);
        if (cleanedDates.length !== 5 || new Set(cleanedDates).size !== cleanedDates.length) {
            setError('Choose exactly 5 different interview dates.');
            return;
        }

        if (shortlistedVideoCandidates.length === 0) {
            setError('There are no shortlisted video candidates to invite.');
            return;
        }

        setSaving(true);
        setError('');
        setMessage('');

        try {
            const token = localStorage.getItem('employerToken');
            const results = await Promise.all(shortlistedVideoCandidates.map((assignment) => (
                fetch(`${process.env.REACT_APP_API_URL || ''}/api/assessment-assignments/${assignment._id}/video-interview`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({
                        link: interviewLink,
                        dateOptions: cleanedDates
                    })
                })
            )));

            const failed = results.filter((response) => !response.ok);
            if (failed.length > 0) {
                throw new Error(`Sent some invitations, but ${failed.length} failed.`);
            }

            await Promise.allSettled(shortlistedVideoCandidates.map((assignment) => (
                notifyCandidateApplicationUpdate(assignment, 'Video Interview Invitation')
            )));
            setMessage(`Video interview invitation sent to ${shortlistedVideoCandidates.length} candidate${shortlistedVideoCandidates.length === 1 ? '' : 's'}.`);
            setInterviewLink('');
            setInterviewDates(createInterviewDates());
            await fetchWorkspaceData();
        } catch (sendVideoError) {
            console.error('Error sending video interviews:', sendVideoError);
            setError(sendVideoError.message || 'Failed to send video interviews.');
        } finally {
            setSaving(false);
        }
    };

    const decideAfterInterview = async (assignment, decision) => {
        const decisionTitles = {
            hire: 'Accepted',
            hold: 'On Hold',
            reject: 'Rejected'
        };

        const updatedAssignment = await updateAssignment(
            `/api/assessment-assignments/${assignment._id}/complete-interview`,
            { decision },
            'Interview decision saved.'
        );

        if (updatedAssignment) {
            await notifyCandidateApplicationUpdate(updatedAssignment, decisionTitles[decision] || 'Application Updated');
        }
    };

    const renderList = (items, emptyMessage) => {
        if (!items || items.length === 0) {
            return <p className="empty-info">{emptyMessage}</p>;
        }

        return (
            <ul className="profile-list">
                {items.map((item, index) => (
                    <li key={index}>{typeof item === 'object' ? formatValue(item) : item}</li>
                ))}
            </ul>
        );
    };

    const renderJobPost = () => (
        <div className="job-management-panel">
            <div className="assessment-summary-card">
                <p><strong>Job Number:</strong> {currentJob.jobNumber || 'Generating...'}</p>
                <p><strong>Title:</strong> {currentJob.title}</p>
                <p><strong>Location:</strong> {currentJob.location}</p>
                <p><strong>Type:</strong> {currentJob.jobType}</p>
                <p><strong>Salary:</strong> {currentJob.salary || 'Not specified'}</p>
                <p><strong>Status:</strong> {currentJob.active ? 'Active' : 'Inactive'}</p>
                <p><strong>Posted:</strong> {formatDate(currentJob.createdAt)}</p>
            </div>

            <div className="profile-section">
                <h3>Description</h3>
                <p>{currentJob.description || 'No description provided.'}</p>
            </div>

            <div className="profile-section">
                <h3>Skills</h3>
                <div className="skills-container">
                    {currentJob.skills?.length
                        ? currentJob.skills.map((skill, index) => <span className="skill-tag" key={index}>{skill}</span>)
                        : <p>No skills listed.</p>}
                </div>
            </div>

            <div className="profile-section">
                <h3>Requirements</h3>
                {renderList(currentJob.requirements, 'No requirements listed.')}
            </div>

            <div className="profile-section">
                <h3>Responsibilities</h3>
                {renderList(currentJob.responsibilities, 'No responsibilities listed.')}
            </div>
        </div>
    );

    const renderCandidateTable = (rows, emptyMessage, actionsRenderer) => (
        rows.length === 0 ? (
            <div className="no-jobs-message">
                <p>{emptyMessage}</p>
            </div>
        ) : (
            <div className="job-list-table compact-table">
                <table>
                    <thead>
                        <tr>
                            <th>Name</th>
                            <th>Candidate Number</th>
                            <th>Email</th>
                            <th>Status</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {rows.map((application) => (
                            <tr key={application._id}>
                                <td>{getCandidateName(application)}</td>
                                <td>{getCandidateNumber(application)}</td>
                                <td>{getCandidateEmail(application)}</td>
                                <td>
                                    <span className={`status-badge ${getStatusClassName(application.status)}`}>
                                        {application.status || 'Submitted'}
                                    </span>
                                </td>
                                <td className="actions-cell">
                                    {actionsRenderer ? actionsRenderer(application) : (
                                        <button className="view-button" onClick={() => handleOpenApplication(application)}>
                                            View
                                        </button>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        )
    );

    const renderAssignmentTable = (rows, emptyMessage, actionsRenderer) => (
        rows.length === 0 ? (
            <div className="no-jobs-message">
                <p>{emptyMessage}</p>
            </div>
        ) : (
            <div className="job-list-table compact-table">
                <table>
                    <thead>
                        <tr>
                            <th>Name</th>
                            <th>Candidate Number</th>
                            <th>Email</th>
                            <th>Assessment</th>
                            <th>Status</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {rows.map((assignment) => (
                            <tr key={assignment._id}>
                                <td>{getCandidateName(assignment)}</td>
                                <td>{getCandidateNumber(assignment)}</td>
                                <td>{getCandidateEmail(assignment)}</td>
                                <td>{assignment.title}</td>
                                <td>
                                    <span className="status-badge under-review">
                                        {assignment.decision || assignment.status}
                                    </span>
                                </td>
                                <td className="actions-cell">
                                    {actionsRenderer ? actionsRenderer(assignment) : null}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        )
    );

    const renderApplicationDetails = () => {
        if (!selectedApplication) {
            return null;
        }

        const candidate = getCandidateProfile(selectedApplication);

        return (
            <div className="application-detail-view job-management-detail">
                <div className="candidate-profile-header">
                    <button className="back-button" onClick={() => setSelectedApplication(null)}>
                        Back to Applicants
                    </button>
                    <div className="candidate-header-info">
                        <ProfileAvatar imageSrc={candidate?.profileImage} name={candidate?.name} className="candidate-initial" imageClassName="profile-avatar-image" />
                        <div className="candidate-header-text">
                            <h2>{candidate?.name || 'Unnamed Candidate'}</h2>
                            <p>{getCandidateEmail(selectedApplication)}</p>
                        </div>
                    </div>
                </div>

                {message && <div className={`notification-message ${message.includes('Error') ? 'error' : 'success'}`}>{message}</div>}
                {error && <div className="error-message">{error}</div>}

                <div className="candidate-profile-body">
                    <div className="profile-section">
                        <h3>Application Status</h3>
                        <span className={`status-badge ${getStatusClassName(selectedApplication.status)}`}>
                            {selectedApplication.status || 'Submitted'}
                        </span>
                    </div>

                    <div className="profile-section">
                        <h3>Application Details</h3>
                        <p><strong>Candidate Number:</strong> {getCandidateNumber(selectedApplication)}</p>
                        <p><strong>Email:</strong> {getCandidateEmail(selectedApplication)}</p>
                        <p><strong>Applied:</strong> {formatDate(selectedApplication.createdAt)}</p>
                        <p><strong>Message:</strong> {selectedApplication.message || 'No message included.'}</p>
                    </div>

                    <div className="profile-section">
                        <h3>Submitted Cover Letter</h3>
                        {selectedApplication.coverLetterHtml ? (
                            <div className="cover-letter-preview" dangerouslySetInnerHTML={{ __html: selectedApplication.coverLetterHtml }} />
                        ) : (
                            <p className="empty-info">No cover letter included.</p>
                        )}
                    </div>

                    <div className="profile-section">
                        <h3>Candidate Profile</h3>
                        {selectedApplication.uploadedResume?.dataUrl ? (
                            <ResumeFilePreview
                                resume={selectedApplication.uploadedResume}
                                className="application-uploaded-resume-preview-readonly"
                            />
                        ) : (
                            <>
                                <p><strong>Skills:</strong> {formatValue(candidate.skills)}</p>
                                <p><strong>Education:</strong> {formatValue(candidate.education)}</p>
                                <p><strong>Experience:</strong> {formatValue(candidate.experience)}</p>
                            </>
                        )}
                    </div>

                    <div className="assessment-footer-actions">
                        <button
                            className="settings-button primary"
                            onClick={() => updateApplicationStatus(selectedApplication, 'Shortlisted for Assessment', 'Candidate shortlisted for assessment.')}
                            disabled={saving}
                        >
                            Shortlist for Assessment
                        </button>
                        {bookmarkedApplicationIds.includes(String(selectedApplication._id)) ? (
                            <AnimatedDeleteButton
                                onClick={() => toggleApplicationBookmark(selectedApplication)}
                                disabled={saving}
                                title="Remove bookmark"
                            />
                        ) : (
                            <button
                                className="secondary-button"
                                onClick={() => toggleApplicationBookmark(selectedApplication)}
                                disabled={saving}
                            >
                                Bookmark Application
                            </button>
                        )}
                        <button
                            className="secondary-button hold-button"
                            onClick={() => updateApplicationStatus(selectedApplication, 'On Hold', 'Candidate placed on hold.')}
                            disabled={saving}
                        >
                            Hold
                        </button>
                        <button
                            className="secondary-button reject-button"
                            onClick={() => updateApplicationStatus(selectedApplication, 'Rejected', 'Candidate rejected.')}
                            disabled={saving}
                        >
                            Reject
                        </button>
                    </div>
                </div>
            </div>
        );
    };

    const renderApplicants = () => {
        if (selectedApplication) {
            return renderApplicationDetails();
        }

        return renderCandidateTable(
            jobApplications,
            'No candidates have applied for this job yet.',
            (application) => (
                <button className="view-button" onClick={() => handleOpenApplication(application)}>
                    View Application
                </button>
            )
        );
    };

    const renderAssessmentForm = () => (
        <div className="settings-card job-management-form">
            {editingAssessmentId && (
                <div className="section-header assessment-edit-actions">
                    {editingAssessmentId && (
                        <button className="secondary-button" onClick={resetAssessmentForm} disabled={saving}>
                            New Assessment
                        </button>
                    )}
                </div>
            )}

            <div className="form-group">
                <label htmlFor="assessment-title">Assessment Title</label>
                <input
                    id="assessment-title"
                    className="form-control"
                    value={assessmentForm.title}
                    onChange={(event) => setAssessmentForm((prevForm) => ({ ...prevForm, title: event.target.value }))}
                    placeholder="Frontend screening assessment"
                />
            </div>

            <div className="form-group">
                <label htmlFor="assessment-instructions">Instructions</label>
                <textarea
                    id="assessment-instructions"
                    className="form-control"
                    rows="3"
                    value={assessmentForm.instructions}
                    onChange={(event) => setAssessmentForm((prevForm) => ({ ...prevForm, instructions: event.target.value }))}
                    placeholder="Add any context candidates should read before answering"
                />
            </div>

            <div className="form-group">
                <label htmlFor="job-assessment-time-limit">Time Limit (minutes)</label>
                <input
                    id="job-assessment-time-limit"
                    type="number"
                    min="0"
                    className="form-control"
                    value={assessmentForm.timeLimitMinutes}
                    onChange={(event) => setAssessmentForm((prevForm) => ({ ...prevForm, timeLimitMinutes: event.target.value }))}
                    placeholder="0 means no limit"
                />
            </div>

            <div className="assessment-question-list">
                {assessmentForm.questions.map((question, index) => (
                    <div className="assessment-question-card" key={question.clientId}>
                        <div className="assessment-question-header">
                            <h3>Question {index + 1}</h3>
                            <select
                                className="form-control compact-select"
                                value={question.type}
                                onChange={(event) => handleQuestionTypeChange(question.clientId, event.target.value)}
                            >
                                <option value="multiple-choice">Multiple Choice</option>
                                <option value="text">Text</option>
                            </select>
                        </div>

                        <textarea
                            className="form-control"
                            rows="3"
                            value={question.prompt}
                            onChange={(event) => updateQuestion(question.clientId, { prompt: event.target.value })}
                            placeholder="Question prompt"
                        />

                        <div className="form-group">
                            <label>Marks</label>
                            <input
                                type="number"
                                min="1"
                                className="form-control"
                                value={question.marks}
                                onChange={(event) => updateQuestion(question.clientId, { marks: event.target.value })}
                                placeholder="1"
                            />
                        </div>

                        {question.type === 'multiple-choice' && (
                            <div className="assessment-options-editor">
                                {question.options.map((option, optionIndex) => (
                                    <input
                                        key={`${question.clientId}-${optionIndex}`}
                                        className="form-control"
                                        value={option}
                                        onChange={(event) => handleOptionChange(question.clientId, optionIndex, event.target.value)}
                                        placeholder={`Option ${optionIndex + 1}`}
                                    />
                                ))}
                                <button
                                    type="button"
                                    className="view-button no-icon-button"
                                    onClick={() => updateQuestion(question.clientId, { options: [...question.options, ''] })}
                                >
                                    Add Option
                                </button>
                                <div className="form-group">
                                    <label>Correct Answer</label>
                                    <select
                                        className="form-control"
                                        value={question.correctAnswer}
                                        onChange={(event) => updateQuestion(question.clientId, { correctAnswer: event.target.value })}
                                    >
                                        <option value="">Choose the correct option</option>
                                        {question.options.filter((option) => option.trim()).map((option, optionIndex) => (
                                            <option key={`${question.clientId}-correct-${optionIndex}`} value={option}>
                                                {option}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        )}

                        {question.type === 'text' && (
                            <div className="form-group">
                                <label>Correct Answer</label>
                                <input
                                    type="text"
                                    className="form-control"
                                    value={question.correctAnswer}
                                    onChange={(event) => updateQuestion(question.clientId, { correctAnswer: event.target.value })}
                                    placeholder="Exact answer used for automatic marking"
                                />
                            </div>
                        )}

                        <div className="assessment-question-actions">
                            <AnimatedDeleteButton
                                onClick={() => removeQuestion(question.clientId)}
                                disabled={assessmentForm.questions.length <= 1}
                                title="Remove question"
                            />
                        </div>
                    </div>
                ))}
            </div>

            <div className="assessment-footer-actions">
                <button className="secondary-button" onClick={() => addQuestion('multiple-choice')} disabled={saving}>
                    Add Multiple Choice
                </button>
                <button className="secondary-button" onClick={() => addQuestion('text')} disabled={saving}>
                    Add Text Question
                </button>
                <button className="settings-button primary" onClick={saveAssessment} disabled={saving}>
                    {saving ? 'Saving...' : editingAssessmentId ? 'Save Assessment' : 'Create Assessment'}
                </button>
            </div>
        </div>
    );

    const renderJobInvitePanel = () => (
        <div className="settings-card job-invite-panel">
            <div className="section-header">
                <div>
                    <p>Invite matching talents to apply for this job.</p>
                </div>
                <button
                    type="button"
                    className="secondary-button"
                    onClick={fetchJobInviteMatches}
                    disabled={loadingJobInvites}
                >
                    Refresh Matches
                </button>
            </div>

            <div className="form-group">
                <label htmlFor="job-invite-message">Invitation Message</label>
                <textarea
                    id="job-invite-message"
                    className="form-control"
                    rows="3"
                    value={jobInviteMessage}
                    onChange={(event) => setJobInviteMessage(event.target.value)}
                    placeholder={`Tell candidates why ${currentJob?.title || 'this role'} could be a strong fit.`}
                />
            </div>

            <div className="assessment-footer-actions job-invite-actions">
                <button
                    type="button"
                    className="settings-button primary"
                    onClick={() => sendJobInvitations()}
                    disabled={sendingJobInvites || selectedJobInviteCandidateIds.length === 0}
                >
                    {sendingJobInvites ? 'Sending...' : `Send to Selected (${selectedJobInviteCandidateIds.length})`}
                </button>
                <button
                    type="button"
                    className="secondary-button"
                    onClick={selectAllJobInviteCandidates}
                    disabled={loadingJobInvites || jobInviteCandidates.length === 0}
                >
                    Select All Matches
                </button>
                <button
                    type="button"
                    className="secondary-button"
                    onClick={() => sendJobInvitations({ sendToAllBookmarked: true })}
                    disabled={sendingJobInvites}
                >
                    Send to All Bookmarked
                </button>
            </div>

            {loadingJobInvites ? (
                <div className="loading-spinner"></div>
            ) : jobInviteCandidates.length === 0 ? (
                <p className="empty-info">No matching talents found for this job role yet.</p>
            ) : (
                <div className="job-invite-candidate-list">
                    {jobInviteCandidates.map((row) => {
                        const candidate = row.candidate || {};
                        const candidateId = getId(candidate);
                        const selected = selectedJobInviteCandidateIds.includes(candidateId);
                        const candidateName = candidate.name || candidate.email || 'Unnamed Candidate';

                        return (
                            <div className={`job-invite-candidate-row ${selected ? 'selected' : ''}`} key={candidateId}>
                                <label className="job-invite-candidate-check">
                                    <input
                                        type="checkbox"
                                        checked={selected}
                                        onChange={() => toggleJobInviteCandidate(candidateId)}
                                    />
                                    <span>
                                        <strong>{candidateName}</strong>
                                        <small>{candidate.email || 'Email not available'}</small>
                                    </span>
                                </label>
                                <div className="job-invite-match-meta">
                                    <span>{row.matchScore} skill match{row.matchScore === 1 ? '' : 'es'}</span>
                                    <p>{(row.matchedSkills || []).join(', ') || 'Matched by profile details'}</p>
                                </div>
                                <button
                                    type="button"
                                    className="view-button no-icon-button send-candidate-button"
                                    onClick={() => sendJobInvitations({ candidateIds: [candidateId] })}
                                    disabled={sendingJobInvites}
                                >
                                    Send Invite
                                </button>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );

    const renderCreateAssessment = () => (
        <div className="job-management-panel">
            {renderAssessmentForm()}

            <div className="submitted-assessments-section">
                <div className="section-header">
                    <h3>Assessments for This Job</h3>
                </div>

                {jobAssessments.length === 0 ? (
                    <div className="no-jobs-message">
                        <p>No assessments have been created for this job yet.</p>
                    </div>
                ) : (
                    <div className="assessment-card-grid">
                        {jobAssessments.map((assessment) => {
                            const sentCount = jobAssignments.filter((assignment) => getId(assignment.assessment) === assessment._id).length;

                            return (
                                <div className="assessment-card" key={assessment._id}>
                                    <div className="assessment-card-top">
                                        <div>
                                            <h3>{assessment.title}</h3>
                                            <p>{assessment.questions?.length || 0} question{assessment.questions?.length === 1 ? '' : 's'}</p>
                                        </div>
                                        <span className="assessment-type-pill">{sentCount} sent</span>
                                    </div>
                                    <p className="assessment-card-meta">Updated {formatDate(assessment.updatedAt || assessment.createdAt)}</p>
                                    <div className="assessment-card-actions">
                                        <button className="view-button" onClick={() => setSelectedAssessmentId(assessment._id)}>
                                            Send
                                        </button>
                                        <button className="secondary-button" onClick={() => startEditAssessment(assessment)}>
                                            Edit
                                        </button>
                                        <AnimatedDeleteButton
                                            onClick={() => deleteAssessment(assessment._id)}
                                            disabled={saving}
                                            title="Delete assessment"
                                        />
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {selectedAssessmentId && renderSendAssessmentPanel()}
        </div>
    );

    const renderSendAssessmentPanel = () => {
        const assessment = jobAssessments.find((item) => item._id === selectedAssessmentId);

        if (!assessment) {
            return null;
        }

        return (
            <div className="settings-card assessment-send-panel">
                <div className="section-header">
                    <h3>Send Assessment: {assessment.title}</h3>
                    <button className="secondary-button" onClick={() => setSelectedAssessmentId('')}>
                        Close
                    </button>
                </div>

                <div className="assessment-footer-actions">
                    <button
                        className="settings-button primary"
                        onClick={() => sendAssessmentToAllShortlisted(assessment._id)}
                        disabled={saving || shortlistedAssessmentCandidates.length === 0}
                    >
                        Send to All Shortlisted
                    </button>
                </div>

                {shortlistedAssessmentCandidates.length === 0 ? (
                    <p className="empty-info">No candidates are currently shortlisted for assessment.</p>
                ) : (
                    <div className="assessment-send-list">
                        {shortlistedAssessmentCandidates.map((application) => {
                            const alreadySent = jobAssignments.find((assignment) => (
                                getId(assignment.assessment) === assessment._id &&
                                getId(assignment.application) === application._id
                            ));

                            return (
                                <div className="assessment-send-row" key={application._id}>
                                    <div>
                                        <h3>{getCandidateName(application)}</h3>
                                        <p>{getCandidateNumber(application)} - {getCandidateEmail(application)}</p>
                                    </div>
                                    <div className="assessment-card-actions">
                                        <button
                                            className="view-button no-icon-button send-candidate-button"
                                            onClick={() => sendAssessment(assessment._id, application._id)}
                                            disabled={saving || Boolean(alreadySent)}
                                        >
                                            {alreadySent
                                                ? alreadySent.status === 'Submitted' ? 'Submitted' : 'Sent'
                                                : saving && sendingApplicationId === application._id ? 'Sending...' : 'Send to Candidate'}
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        );
    };

    const renderShortlistedAssessment = () => (
        <div className="job-management-panel">
            {renderCandidateTable(
                shortlistedAssessmentCandidates,
                'No candidates have been shortlisted for assessment yet.',
                (application) => (
                    <>
                        <button className="view-button" onClick={() => handleOpenApplication(application)}>View</button>
                        <button className="secondary-button hold-button" onClick={() => updateApplicationStatus(application, 'On Hold', 'Candidate placed on hold.')} disabled={saving}>Hold</button>
                        <button className="secondary-button reject-button" onClick={() => updateApplicationStatus(application, 'Rejected', 'Candidate rejected.')} disabled={saving}>Reject</button>
                    </>
                )
            )}
        </div>
    );

    const renderAssessmentInvitations = () => (
        <div className="job-management-panel">
            {renderAssignmentTable(
                assessmentInvitations,
                'No assessment invitations have been sent for this job yet.',
                (assignment) => (
                    <button className="view-button" onClick={() => setSelectedAssignment(assignment)}>
                        View Invitation
                    </button>
                )
            )}
            {selectedAssignment && renderAssignmentDetails(false)}
        </div>
    );

    const renderCompletedAssessment = () => (
        <div className="job-management-panel">
            {renderAssignmentTable(
                completedAssessments,
                'No candidates have completed assessments for this job yet.',
                (assignment) => (
                    <button className="view-button" onClick={() => setSelectedAssignment(assignment)}>
                        Open Answers
                    </button>
                )
            )}
            {selectedAssignment && renderAssignmentDetails(true)}
        </div>
    );

    const renderAssignmentDetails = (showVideoShortlistAction) => (
        <div className="application-detail-view job-management-detail">
            <div className="candidate-profile-header">
                <button className="back-button" onClick={() => setSelectedAssignment(null)}>
                    Back
                </button>
                <div className="candidate-header-info">
                    <ProfileAvatar imageSrc={getCandidateProfile(selectedAssignment)?.profileImage} name={getCandidateName(selectedAssignment)} className="candidate-initial" imageClassName="profile-avatar-image" />
                    <div className="candidate-header-text">
                        <h2>{selectedAssignment.title}</h2>
                        <p>{getCandidateName(selectedAssignment)} - {getCandidateNumber(selectedAssignment)}</p>
                    </div>
                </div>
            </div>

            <div className="assessment-summary-card">
                <p><strong>Email:</strong> {getCandidateEmail(selectedAssignment)}</p>
                <p><strong>Status:</strong> {selectedAssignment.status}</p>
                <p><strong>Decision:</strong> {selectedAssignment.decision || 'Pending'}</p>
                <p><strong>Sent:</strong> {formatDateTime(selectedAssignment.sentAt)}</p>
                <p><strong>Submitted:</strong> {formatDateTime(selectedAssignment.submittedAt)}</p>
                <p>
                    <strong>Score:</strong>{' '}
                    {selectedAssignment.score ?? 0}/{selectedAssignment.totalMarks ?? selectedAssignment.responses?.reduce((total, response) => total + (Number(response.marks) || 0), 0) ?? 0}
                </p>
                <p><strong>Time Limit:</strong> {selectedAssignment.timeLimitMinutes ? `${selectedAssignment.timeLimitMinutes} minutes` : 'No limit'}</p>
            </div>

            {selectedAssignment.responses?.length > 0 ? (
                <div className="assessment-question-list">
                    {selectedAssignment.responses.map((response, index) => (
                        <div className="assessment-question-card" key={response._id || index}>
                            <div className="assessment-question-header">
                                <h3>Question {index + 1}</h3>
                                <span className="assessment-type-pill">{response.type === 'multiple-choice' ? 'Multiple Choice' : 'Text Answer'}</span>
                            </div>
                            <p><strong>Question:</strong> {response.prompt}</p>
                            <p><strong>Answer:</strong> {response.answer || 'No answer submitted.'}</p>
                            <p><strong>Correct Answer:</strong> {response.correctAnswer || 'Not set'}</p>
                            <p>
                                <strong>Marks:</strong>{' '}
                                {response.awardedMarks ?? 0}/{response.marks ?? 0}
                            </p>
                            <p><strong>Result:</strong> {response.isCorrect ? 'Correct' : 'Incorrect'}</p>
                        </div>
                    ))}
                </div>
            ) : (
                <p className="empty-info">Answers are not available until the candidate submits the assessment.</p>
            )}

            {showVideoShortlistAction && (
                <div className="assessment-footer-actions">
                    <button className="settings-button primary" onClick={() => shortlistForVideo(selectedAssignment)} disabled={saving}>
                        Shortlist for Video Interview Invitation
                    </button>
                    <button className="secondary-button" onClick={() => updateAssignment(`/api/assessment-assignments/${selectedAssignment._id}/hire`, null, 'Candidate hired.')} disabled={saving}>
                        Hire Directly
                    </button>
                    <button className="secondary-button reject-button" onClick={() => updateAssignment(`/api/assessment-assignments/${selectedAssignment._id}/reject`, null, 'Candidate rejected.')} disabled={saving}>
                        Reject
                    </button>
                </div>
            )}
        </div>
    );

    const renderShortlistedVideo = () => (
        <div className="job-management-panel">
            {renderAssignmentTable(
                shortlistedVideoCandidates,
                'No candidates have been shortlisted for video interview yet.',
                (assignment) => (
                    <button className="view-button" onClick={() => {
                        setSelectedAssignment(assignment);
                        setActiveSection('arrange-video');
                        setMobileSectionVisible(true);
                    }}>
                        Arrange Interview
                    </button>
                )
            )}
        </div>
    );

    const renderVideoForm = () => (
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
                            key={`video-date-${index}`}
                            type="date"
                            className="form-control"
                            value={date}
                            onChange={(event) => setInterviewDates((prevDates) => prevDates.map((item, itemIndex) => (
                                itemIndex === index ? event.target.value : item
                            )))}
                        />
                    ))}
                </div>
                <p className="form-hint">Choose 5 different dates for the candidate to pick from.</p>
            </div>
        </div>
    );

    const renderArrangeVideo = () => {
        const acceptedInterviews = videoInterviewInvitations.filter((assignment) => (
            assignment.videoInterview?.candidateSelection?.status === 'Accepted'
        ));

        return (
            <div className="job-management-panel">
                {renderVideoForm()}

                <div className="assessment-footer-actions">
                    <button
                        className="settings-button primary"
                        onClick={sendVideoInterviewToAll}
                        disabled={saving || shortlistedVideoCandidates.length === 0}
                    >
                        Send to All Shortlisted for Video
                    </button>
                </div>

                {renderAssignmentTable(
                    shortlistedVideoCandidates,
                    'No candidates are waiting for video interview invitations.',
                    (assignment) => (
                        <button className="view-button no-icon-button send-candidate-button" onClick={() => sendVideoInterview(assignment)} disabled={saving}>
                            Send Invitation
                        </button>
                    )
                )}

                <div className="submitted-assessments-section">
                    <div className="section-header">
                        <h3>Accepted Interview Dates</h3>
                    </div>
                    {renderAssignmentTable(
                        acceptedInterviews,
                        'Accepted interview dates will appear here after candidates choose one.',
                        (assignment) => (
                            <>
                                <button className="view-button" onClick={() => decideAfterInterview(assignment, 'hire')} disabled={saving}>Hire</button>
                                <button className="secondary-button hold-button" onClick={() => decideAfterInterview(assignment, 'hold')} disabled={saving}>Hold</button>
                                <button className="secondary-button reject-button" onClick={() => decideAfterInterview(assignment, 'reject')} disabled={saving}>Reject</button>
                            </>
                        )
                    )}
                </div>

                <div className="submitted-assessments-section">
                    <div className="section-header">
                        <h3>Sent Video Invitations</h3>
                    </div>
                    {renderAssignmentTable(
                        videoInterviewInvitations.filter((assignment) => assignment.videoInterview?.candidateSelection?.status !== 'Accepted'),
                        'No pending video interview invitations.',
                        (assignment) => (
                            <span className="assessment-card-meta">
                                {assignment.videoInterview?.candidateSelection?.status || 'Pending'}
                            </span>
                        )
                    )}
                </div>
            </div>
        );
    };

    const renderDecisionList = (rows, emptyMessage) => (
        <div className="job-management-panel">
            {renderCandidateTable(
                rows,
                emptyMessage,
                (application) => (
                    <>
                        <button className="view-button" onClick={() => handleOpenApplication(application)}>View</button>
                        <button className="secondary-button" onClick={() => updateApplicationStatus(application, 'Shortlisted for Assessment', 'Candidate shortlisted for assessment.')} disabled={saving}>Shortlist</button>
                        <button className="secondary-button" onClick={() => updateApplicationStatus(application, 'Accepted', 'Candidate marked as hired.')} disabled={saving}>Hire</button>
                        <button className="secondary-button hold-button" onClick={() => updateApplicationStatus(application, 'On Hold', 'Candidate placed on hold.')} disabled={saving}>Hold</button>
                        <button className="secondary-button reject-button" onClick={() => updateApplicationStatus(application, 'Rejected', 'Candidate rejected.')} disabled={saving}>Reject</button>
                    </>
                )
            )}
        </div>
    );

    const renderActiveSection = () => {
        if (loading) {
            return <div className="loading-spinner">Loading job workspace...</div>;
        }

        if (activeSection === 'edit') {
            return (
                <EditJob
                    job={currentJob}
                    onCancel={() => setActiveSection('view')}
                    onJobUpdated={handleJobUpdated}
                />
            );
        }

        switch (activeSection) {
            case 'view':
                return renderJobPost();
            case 'applicants':
                return renderApplicants();
            case 'send-job-invite':
                return (
                    <div className="job-management-panel">
                        {renderJobInvitePanel()}
                    </div>
                );
            case 'create-assessment':
                return renderCreateAssessment();
            case 'shortlisted-assessment':
                return renderShortlistedAssessment();
            case 'assessment-invitations':
                return renderAssessmentInvitations();
            case 'completed-assessment':
                return renderCompletedAssessment();
            case 'shortlisted-video':
                return renderShortlistedVideo();
            case 'arrange-video':
                return renderArrangeVideo();
            case 'bookmarked':
                return renderDecisionList(bookmarkedApplications, 'No applications have been bookmarked for this job yet.');
            case 'hired':
                return renderDecisionList(hiredCandidates, 'No candidates have been hired for this job yet.');
            case 'hold':
                return renderDecisionList(holdCandidates, 'No candidates are currently on hold for this job.');
            case 'rejected':
                return renderDecisionList(rejectedCandidates, 'No candidates have been rejected for this job.');
            default:
                return renderJobPost();
        }
    };

    return (
        <div className={`job-management-workspace ${mobileSectionVisible ? 'mobile-section-active' : ''}`}>
            <div className="manage-jobs-header job-management-header">
                <div>
                    <h2>{currentJob?.title || 'Manage Job'}</h2>
                    <p>{currentJob?.jobNumber || 'Job workspace'}</p>
                </div>
                <button
                    type="button"
                    className="back-button desktop-back-to-manage-jobs"
                    onClick={onBack}
                >
                    Back to Manage Jobs
                </button>
            </div>

            <div className="job-management-mobile-job-title" aria-label="Selected job">
                <h3>{currentJob?.title || 'Manage Job'}</h3>
                <p>{currentJob?.jobNumber || 'Job workspace'}</p>
            </div>

            <nav className="job-management-nav" aria-label="Job management sections">
                {SECTIONS.map((section) => (
                    <button
                        key={section.id}
                        type="button"
                        className={activeSection === section.id ? 'active' : ''}
                        onClick={() => switchSection(section.id)}
                    >
                        <span>{section.label}</span>
                        {section.id === 'applicants' && hasApplicantNotification && <span className="nav-notification-dot"></span>}
                        {section.id === 'completed-assessment' && hasCompletedAssessmentNotification && <span className="nav-notification-dot"></span>}
                    </button>
                ))}
                <button
                    type="button"
                    className="job-management-back-nav"
                    onClick={onBack}
                >
                    <span>Back to Manage Jobs</span>
                </button>
            </nav>

            <div
                ref={mobileSectionPanelRef}
                className={`mobile-job-management-section-panel ${mobileSectionVisible ? 'is-open' : ''}`}
            >
                {mobileSectionVisible && (
                    <div className="mobile-section-panel-header">
                        <button type="button" className="back-button" onClick={closeMobileSectionPanel}>
                            Back
                        </button>
                        <h2>{SECTIONS.find((section) => section.id === activeSection)?.label || 'Job Section'}</h2>
                    </div>
                )}

                {message && <div className={`notification-message ${message.includes('Error') ? 'error' : 'success'}`}>{message}</div>}
                {error && <div className="error-message">{error}</div>}

                {renderActiveSection()}

                {mobileSectionVisible && (
                    <div className="section-footer-nav mobile-subpage-return">
                        <button
                            type="button"
                            className="back-button responsive-back-button mobile-bottom-back-button"
                            onClick={closeMobileSectionPanel}
                        >
                            Back to Manage Jobs
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default JobManagement;
