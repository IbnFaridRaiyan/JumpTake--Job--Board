const Assessment = require('../models/Assessment');
const AssessmentAssignment = require('../models/AssessmentAssignment');
const Application = require('../models/Application');
const Job = require('../models/Job');
const { ensureReferenceNumbers } = require('../utils/referenceNumbers');
const { createNotification } = require('./notificationController');

const normalizeAnswer = (value = '') => String(value).trim().toLowerCase();

const sanitizeMarks = (value, index) => {
    const marks = Number(value);

    if (!Number.isFinite(marks) || marks <= 0) {
        throw new Error(`Question ${index + 1} needs a marks value greater than 0`);
    }

    return Math.min(marks, 1000);
};

const sanitizeTimeLimitMinutes = (value) => {
    const minutes = Number(value);

    if (!Number.isFinite(minutes) || minutes <= 0) {
        return 0;
    }

    return Math.min(Math.round(minutes), 1440);
};

const sanitizeQuestions = (questions = []) => {
    if (!Array.isArray(questions) || questions.length === 0) {
        throw new Error('At least one question is required');
    }

    return questions.map((question, index) => {
        const prompt = question?.prompt?.trim();
        const type = question?.type;

        if (!prompt) {
            throw new Error(`Question ${index + 1} is missing a prompt`);
        }

        if (!['multiple-choice', 'text'].includes(type)) {
            throw new Error(`Question ${index + 1} has an invalid type`);
        }

        if (type === 'multiple-choice') {
            const options = Array.isArray(question.options)
                ? question.options.map((option) => option.trim()).filter(Boolean)
                : [];
            const correctAnswer = String(question.correctAnswer || '').trim();

            if (options.length < 2) {
                throw new Error(`Question ${index + 1} needs at least two options`);
            }

            if (!correctAnswer) {
                throw new Error(`Question ${index + 1} needs a correct answer`);
            }

            const matchedCorrectAnswer = options.find((option) => normalizeAnswer(option) === normalizeAnswer(correctAnswer));

            if (!matchedCorrectAnswer) {
                throw new Error(`Question ${index + 1} correct answer must match one of its options`);
            }

            return {
                prompt,
                type,
                options,
                maxWords: 2000,
                correctAnswer: matchedCorrectAnswer,
                marks: sanitizeMarks(question.marks, index)
            };
        }

        const correctAnswer = String(question.correctAnswer || '').trim();

        if (!correctAnswer) {
            throw new Error(`Question ${index + 1} needs a correct answer`);
        }

        return {
            prompt,
            type,
            options: [],
            maxWords: 2000,
            correctAnswer,
            marks: sanitizeMarks(question.marks, index)
        };
    });
};

const countWords = (text = '') => text.trim().split(/\s+/).filter(Boolean).length;

const sanitizeInterviewDates = (dates = []) => {
    if (!Array.isArray(dates)) {
        throw new Error('Interview dates must be provided as a list');
    }

    const cleanedDates = dates
        .map((date) => typeof date === 'string' ? date.trim() : '')
        .filter(Boolean);

    if (cleanedDates.length !== 5) {
        throw new Error('Please provide exactly 5 interview dates');
    }

    if (new Set(cleanedDates).size !== cleanedDates.length) {
        throw new Error('Interview dates must be unique');
    }

    const hasInvalidDate = cleanedDates.some((date) => Number.isNaN(Date.parse(date)));
    if (hasInvalidDate) {
        throw new Error('One or more interview dates are invalid');
    }

    return cleanedDates.sort((left, right) => new Date(left) - new Date(right));
};

const populateAssessment = (query) => query
    .populate({
        path: 'job',
        select: 'title location jobType salary company',
        populate: {
            path: 'company',
            select: 'name'
        }
    })
    .populate({
        path: 'candidateUser',
        select: 'email jobSeekerId',
        populate: {
            path: 'jobSeekerId',
            select: 'name email'
        }
    })
    .populate({
        path: 'application',
        select: 'status createdAt candidateNumber'
    });

const populateAssignment = (query) => query
    .populate({
        path: 'assessment',
        select: 'title'
    })
    .populate({
        path: 'job',
        select: 'title location jobType salary company',
        populate: {
            path: 'company',
            select: 'name industry headquarters website founded description'
        }
    })
    .populate({
        path: 'candidateUser',
        select: 'email jobSeekerId',
        populate: {
            path: 'jobSeekerId',
            select: 'name email'
        }
    })
    .populate({
        path: 'application',
        select: 'status message createdAt updatedAt candidateNumber'
    });

const getCompanyAssessments = async (req, res) => {
    try {
        const assessments = await populateAssessment(
            Assessment.find({ company: req.params.companyId }).sort({ createdAt: -1 })
        );

        await ensureReferenceNumbers(
            assessments.map((assessment) => assessment.application).filter(Boolean),
            Application,
            'candidateNumber',
            'CAN'
        );

        return res.status(200).json(assessments);
    } catch (error) {
        console.error('Error fetching company assessments:', error.message);
        return res.status(500).json({
            error: 'Failed to fetch assessments',
            message: error.message
        });
    }
};

const getCompanyAssessmentAssignments = async (req, res) => {
    try {
        const assignments = await populateAssignment(
            AssessmentAssignment.find({ company: req.params.companyId }).sort({ updatedAt: -1, createdAt: -1 })
        );

        await ensureReferenceNumbers(
            assignments.map((assignment) => assignment.application).filter(Boolean),
            Application,
            'candidateNumber',
            'CAN'
        );

        return res.status(200).json(assignments);
    } catch (error) {
        console.error('Error fetching company assessment assignments:', error.message);
        return res.status(500).json({
            error: 'Failed to fetch assessment assignments',
            message: error.message
        });
    }
};

const getUserAssessmentAssignments = async (req, res) => {
    try {
        const assignments = await populateAssignment(
            AssessmentAssignment.find({ candidateUser: req.params.userId }).sort({ updatedAt: -1, createdAt: -1 })
        );

        await ensureReferenceNumbers(
            assignments.map((assignment) => assignment.application).filter(Boolean),
            Application,
            'candidateNumber',
            'CAN'
        );

        return res.status(200).json(assignments);
    } catch (error) {
        console.error('Error fetching user assessment assignments:', error.message);
        return res.status(500).json({
            error: 'Failed to fetch assessments',
            message: error.message
        });
    }
};

const getAssignmentWithApplication = async (assignmentId) => {
    const assignment = await AssessmentAssignment.findById(assignmentId);

    if (!assignment) {
        return null;
    }

    const application = await Application.findById(assignment.application);

    return { assignment, application };
};

const createAssessment = async (req, res) => {
    try {
        const { companyId, applicationId, jobId, scope, title, instructions, questions, timeLimitMinutes } = req.body;

        if (!companyId || !title?.trim()) {
            return res.status(400).json({ error: 'Company and title are required' });
        }

        const sanitizedQuestions = sanitizeQuestions(questions);
        const sanitizedTimeLimitMinutes = sanitizeTimeLimitMinutes(timeLimitMinutes);

        if (applicationId) {
            const application = await Application.findById(applicationId).populate('job');
            if (!application || !application.job) {
                return res.status(404).json({ error: 'Application not found' });
            }

            if (String(application.job.company) !== String(companyId)) {
                return res.status(403).json({ error: 'This application does not belong to your company' });
            }

            const assessment = await Assessment.create({
                company: companyId,
                application: application._id,
                job: application.job._id,
                candidateUser: application.user,
                scope: 'candidate',
                title: title.trim(),
                instructions: instructions?.trim() || '',
                timeLimitMinutes: sanitizedTimeLimitMinutes,
                questions: sanitizedQuestions
            });

            const populatedAssessment = await populateAssessment(
                Assessment.findById(assessment._id)
            );

            return res.status(201).json(populatedAssessment);
        }

        const saveScope = scope === 'job' || jobId ? 'job' : 'general';
        let job = null;

        if (saveScope === 'job') {
            if (!jobId) {
                return res.status(400).json({ error: 'Please choose a job or save the assessment in general' });
            }

            job = await Job.findById(jobId);
            if (!job) {
                return res.status(404).json({ error: 'Job not found' });
            }

            if (String(job.company) !== String(companyId)) {
                return res.status(403).json({ error: 'This job does not belong to your company' });
            }
        }

        const assessment = await Assessment.create({
            company: companyId,
            job: job?._id,
            scope: saveScope,
            title: title.trim(),
            instructions: instructions?.trim() || '',
            timeLimitMinutes: sanitizedTimeLimitMinutes,
            questions: sanitizedQuestions
        });

        const populatedAssessment = await populateAssessment(
            Assessment.findById(assessment._id)
        );

        return res.status(201).json(populatedAssessment);
    } catch (error) {
        console.error('Error creating assessment:', error.message);
        return res.status(500).json({
            error: error.message || 'Failed to create assessment',
            message: error.message
        });
    }
};

const sendAssessment = async (req, res) => {
    try {
        const { applicationId } = req.body;

        if (!applicationId) {
            return res.status(400).json({ error: 'Application is required' });
        }

        const assessment = await Assessment.findById(req.params.id);
        if (!assessment) {
            return res.status(404).json({ error: 'Assessment not found' });
        }

        const application = await Application.findById(applicationId).populate('job');
        if (!application || !application.job) {
            return res.status(404).json({ error: 'Application not found' });
        }

        if (String(application.job.company) !== String(assessment.company)) {
            return res.status(403).json({ error: 'This application does not belong to your company' });
        }

        if (String(application.job._id) !== String(assessment.job)) {
            return res.status(400).json({ error: 'Assessment can only be sent to applicants for the same job' });
        }

        const existingAssignment = await AssessmentAssignment.findOne({
            assessment: assessment._id,
            application: application._id
        });

        if (existingAssignment) {
            const populatedExistingAssignment = await populateAssignment(
                AssessmentAssignment.findById(existingAssignment._id)
            );

            return res.status(200).json({
                message: existingAssignment.status === 'Submitted'
                    ? 'This candidate has already submitted the assessment'
                    : 'Assessment already sent to this candidate',
                assignment: populatedExistingAssignment
            });
        }

        const assignment = await AssessmentAssignment.create({
            assessment: assessment._id,
            company: assessment.company,
            job: assessment.job,
            application: application._id,
            candidateUser: application.user,
            title: assessment.title,
            instructions: assessment.instructions || '',
            timeLimitMinutes: assessment.timeLimitMinutes || 0,
            questions: assessment.questions.map((question) => ({
                prompt: question.prompt,
                type: question.type,
                options: question.options || [],
                maxWords: question.maxWords || 2000,
                correctAnswer: question.correctAnswer || '',
                marks: question.marks || 1
            })),
            responses: [],
            status: 'Sent',
            sentAt: new Date()
        });

        const populatedAssignment = await populateAssignment(
            AssessmentAssignment.findById(assignment._id)
        );

        await createNotification({
            recipientType: 'candidate',
            recipientId: application.user,
            title: 'Assessment invitation',
            message: `You have a new assessment invitation for ${application.job.title}. Start now?`,
            section: 'assessments',
            actionLabel: 'Open assessment',
            payload: {
                jobId: String(application.job._id),
                jobTitle: application.job.title,
                assessmentId: String(assessment._id),
                assignmentId: String(assignment._id)
            }
        });

        return res.status(201).json({
            message: 'Assessment sent successfully',
            assignment: populatedAssignment
        });
    } catch (error) {
        console.error('Error sending assessment:', error.message);
        return res.status(500).json({
            error: 'Failed to send assessment',
            message: error.message
        });
    }
};

const updateAssessment = async (req, res) => {
    try {
        const { applicationId, jobId, scope, title, instructions, questions, timeLimitMinutes } = req.body;
        const assessment = await Assessment.findById(req.params.id);

        if (!assessment) {
            return res.status(404).json({ error: 'Assessment not found' });
        }

        let application = null;
        if (applicationId && String(applicationId) !== String(assessment.application)) {
            application = await Application.findById(applicationId).populate('job');
            if (!application || !application.job) {
                return res.status(404).json({ error: 'Application not found' });
            }

            if (String(application.job.company) !== String(assessment.company)) {
                return res.status(403).json({ error: 'This application does not belong to your company' });
            }

            assessment.application = application._id;
            assessment.job = application.job._id;
            assessment.candidateUser = application.user;
            assessment.scope = 'candidate';
        } else if (jobId !== undefined || scope !== undefined) {
            const saveScope = scope === 'job' || jobId ? 'job' : 'general';

            if (saveScope === 'job') {
                const job = await Job.findById(jobId);
                if (!job) {
                    return res.status(404).json({ error: 'Job not found' });
                }

                if (String(job.company) !== String(assessment.company)) {
                    return res.status(403).json({ error: 'This job does not belong to your company' });
                }

                assessment.job = job._id;
                assessment.scope = 'job';
            } else {
                assessment.job = undefined;
                assessment.scope = 'general';
            }

            assessment.application = undefined;
            assessment.candidateUser = undefined;
        }

        if (title?.trim()) {
            assessment.title = title.trim();
        }

        assessment.instructions = instructions?.trim() || '';
        assessment.timeLimitMinutes = sanitizeTimeLimitMinutes(timeLimitMinutes);
        assessment.questions = sanitizeQuestions(questions);
        await assessment.save();

        const populatedAssessment = await populateAssessment(
            Assessment.findById(assessment._id)
        );

        return res.status(200).json(populatedAssessment);
    } catch (error) {
        console.error('Error updating assessment:', error.message);
        return res.status(500).json({
            error: error.message || 'Failed to update assessment',
            message: error.message
        });
    }
};

const deleteAssessment = async (req, res) => {
    try {
        const assessment = await Assessment.findByIdAndDelete(req.params.id);

        if (!assessment) {
            return res.status(404).json({ error: 'Assessment not found' });
        }

        await AssessmentAssignment.deleteMany({ assessment: assessment._id });

        return res.status(200).json({ message: 'Assessment deleted successfully' });
    } catch (error) {
        console.error('Error deleting assessment:', error.message);
        return res.status(500).json({
            error: 'Failed to delete assessment',
            message: error.message
        });
    }
};

const startAssessmentAssignment = async (req, res) => {
    try {
        const { userId } = req.body;
        const assignment = await AssessmentAssignment.findById(req.params.assignmentId);

        if (!assignment) {
            return res.status(404).json({ error: 'Assessment assignment not found' });
        }

        if (userId && String(assignment.candidateUser) !== String(userId)) {
            return res.status(403).json({ error: 'This assessment does not belong to the current user' });
        }

        if (assignment.status === 'Submitted') {
            const populatedSubmittedAssignment = await populateAssignment(
                AssessmentAssignment.findById(assignment._id)
            );

            return res.status(200).json({
                message: 'This assessment has already been submitted',
                assignment: populatedSubmittedAssignment
            });
        }

        if (!assignment.startedAt) {
            const now = new Date();
            assignment.startedAt = now;
            assignment.expiresAt = assignment.timeLimitMinutes > 0
                ? new Date(now.getTime() + assignment.timeLimitMinutes * 60 * 1000)
                : null;
            await assignment.save();
        }

        const populatedAssignment = await populateAssignment(
            AssessmentAssignment.findById(assignment._id)
        );

        return res.status(200).json({
            message: 'Assessment started',
            assignment: populatedAssignment
        });
    } catch (error) {
        console.error('Error starting assessment assignment:', error.message);
        return res.status(500).json({
            error: 'Failed to start assessment',
            message: error.message
        });
    }
};

const submitAssessmentAssignment = async (req, res) => {
    try {
        const { responses, userId } = req.body;
        const assignment = await AssessmentAssignment.findById(req.params.assignmentId);

        if (!assignment) {
            return res.status(404).json({ error: 'Assessment assignment not found' });
        }

        if (userId && String(assignment.candidateUser) !== String(userId)) {
            return res.status(403).json({ error: 'This assessment does not belong to the current user' });
        }

        if (assignment.status === 'Submitted') {
            return res.status(400).json({ error: 'This assessment has already been submitted' });
        }

        const now = new Date();

        if (!assignment.startedAt) {
            assignment.startedAt = now;
            assignment.expiresAt = assignment.timeLimitMinutes > 0
                ? new Date(now.getTime() + assignment.timeLimitMinutes * 60 * 1000)
                : null;
        }

        if (assignment.expiresAt && now > assignment.expiresAt) {
            return res.status(400).json({ error: 'The time limit for this assessment has expired' });
        }

        if (!Array.isArray(responses) || responses.length !== assignment.questions.length) {
            return res.status(400).json({ error: 'A response is required for each question' });
        }

        let totalMarks = 0;
        let score = 0;

        const sanitizedResponses = assignment.questions.map((question, index) => {
            const rawAnswer = typeof responses[index] === 'string' ? responses[index].trim() : '';
            const marks = Number(question.marks) || 1;
            const correctAnswer = question.correctAnswer || '';

            if (!rawAnswer) {
                throw new Error(`Question ${index + 1} requires an answer`);
            }

            if (question.type === 'multiple-choice') {
                if (!question.options.includes(rawAnswer)) {
                    throw new Error(`Question ${index + 1} has an invalid option selected`);
                }
            }

            if (question.type === 'text') {
                const wordCount = countWords(rawAnswer);
                if (wordCount > (question.maxWords || 2000)) {
                    throw new Error(`Question ${index + 1} exceeds the ${question.maxWords || 2000} word limit`);
                }
            }

            const isCorrect = normalizeAnswer(rawAnswer) === normalizeAnswer(correctAnswer);
            const awardedMarks = isCorrect ? marks : 0;
            totalMarks += marks;
            score += awardedMarks;

            return {
                prompt: question.prompt,
                type: question.type,
                answer: rawAnswer,
                options: question.options || [],
                maxWords: question.maxWords || 2000,
                correctAnswer,
                marks,
                awardedMarks,
                isCorrect
            };
        });

        assignment.responses = sanitizedResponses;
        assignment.score = score;
        assignment.totalMarks = totalMarks;
        assignment.status = 'Submitted';
        assignment.submittedAt = new Date();
        await assignment.save();

        const populatedAssignment = await populateAssignment(
            AssessmentAssignment.findById(assignment._id)
        );

        await createNotification({
            recipientType: 'employer',
            recipientId: assignment.company,
            title: 'Assessment completed',
            message: `A candidate has submitted ${populatedAssignment?.job?.title || 'a job'}'s ${assignment.title}. Check now?`,
            section: 'manage-jobs',
            actionLabel: 'Open completed assessment',
            payload: {
                jobId: String(assignment.job),
                assessmentId: String(assignment.assessment),
                assignmentId: String(assignment._id),
                subSection: 'completed-assessment'
            }
        });

        return res.status(200).json({
            message: 'Assessment submitted successfully',
            assignment: populatedAssignment
        });
    } catch (error) {
        console.error('Error submitting assessment assignment:', error.message);
        const statusCode = error.message && (
            error.message.startsWith('Question ') ||
            error.message.includes('already been submitted')
        )
            ? 400
            : 500;

        return res.status(statusCode).json({
            error: error.message || 'Failed to submit assessment',
            message: error.message
        });
    }
};

const sendVideoInterviewInvitation = async (req, res) => {
    try {
        const { link, dateOptions } = req.body;
        const record = await getAssignmentWithApplication(req.params.assignmentId);

        if (!record?.assignment) {
            return res.status(404).json({ error: 'Assessment assignment not found' });
        }

        if (record.assignment.status !== 'Submitted') {
            return res.status(400).json({ error: 'Video interview invitations can only be sent after submission' });
        }

        if (!link || !link.trim()) {
            return res.status(400).json({ error: 'A video interview link is required' });
        }

        const sanitizedDates = sanitizeInterviewDates(dateOptions);

        record.assignment.decision = 'Video Interview';
        record.assignment.videoInterview = {
            link: link.trim(),
            dateOptions: sanitizedDates,
            candidateSelection: {
                status: 'Pending',
                selectedDate: '',
                respondedAt: null
            },
            sentAt: new Date()
        };
        await record.assignment.save();

        if (record.application && !['Accepted', 'Rejected', 'Withdrawn'].includes(record.application.status)) {
            record.application.status = 'Shortlisted for Video Assessment';
            record.application.updatedAt = Date.now();
            await record.application.save();
        }

        const populatedAssignment = await populateAssignment(
            AssessmentAssignment.findById(record.assignment._id)
        );

        await createNotification({
            recipientType: 'candidate',
            recipientId: record.assignment.candidateUser,
            title: 'Video interview invitation',
            message: `You have a video interview invitation for ${populatedAssignment?.job?.title || 'a role'}. Select dates now?`,
            section: 'video-interviews',
            actionLabel: 'Open invitation',
            payload: {
                jobId: String(record.assignment.job),
                assignmentId: String(record.assignment._id)
            }
        });

        return res.status(200).json({
            message: 'Video interview invitation sent successfully',
            assignment: populatedAssignment
        });
    } catch (error) {
        console.error('Error sending video interview invitation:', error.message);
        return res.status(500).json({
            error: 'Failed to send video interview invitation',
            message: error.message
        });
    }
};

const shortlistForVideoInterview = async (req, res) => {
    try {
        const record = await getAssignmentWithApplication(req.params.assignmentId);

        if (!record?.assignment) {
            return res.status(404).json({ error: 'Assessment assignment not found' });
        }

        if (record.assignment.status !== 'Submitted') {
            return res.status(400).json({ error: 'Only completed assessments can be shortlisted for video interview' });
        }

        record.assignment.decision = 'Video Interview';
        await record.assignment.save();

        if (record.application && !['Accepted', 'Rejected', 'Withdrawn', 'Unsuccessful'].includes(record.application.status)) {
            record.application.status = 'Shortlisted for Video Assessment';
            record.application.updatedAt = Date.now();
            await record.application.save();
        }

        const populatedAssignment = await populateAssignment(
            AssessmentAssignment.findById(record.assignment._id)
        );

        return res.status(200).json({
            message: 'Candidate shortlisted for video interview successfully',
            assignment: populatedAssignment
        });
    } catch (error) {
        console.error('Error shortlisting candidate for video interview:', error.message);
        return res.status(500).json({
            error: 'Failed to shortlist candidate for video interview',
            message: error.message
        });
    }
};

const respondToVideoInterviewInvitation = async (req, res) => {
    try {
        const { userId, selectedDate, action } = req.body;
        const assignment = await AssessmentAssignment.findById(req.params.assignmentId);

        if (!assignment) {
            return res.status(404).json({ error: 'Assessment assignment not found' });
        }

        if (userId && String(assignment.candidateUser) !== String(userId)) {
            return res.status(403).json({ error: 'This interview does not belong to the current user' });
        }

        if (!assignment.videoInterview?.link) {
            return res.status(400).json({ error: 'No video interview invitation has been sent for this assessment' });
        }

        if (!['accept', 'discard'].includes(action)) {
            return res.status(400).json({ error: 'Please choose whether to accept or discard the interview invitation' });
        }

        if (action === 'accept') {
            if (!selectedDate || !assignment.videoInterview.dateOptions?.includes(selectedDate)) {
                return res.status(400).json({ error: 'Please choose one of the available interview dates' });
            }

            assignment.videoInterview.candidateSelection = {
                status: 'Accepted',
                selectedDate,
                respondedAt: new Date()
            };
        } else {
            assignment.videoInterview.candidateSelection = {
                status: 'Discarded',
                selectedDate: '',
                respondedAt: new Date()
            };
        }

        await assignment.save();

        const populatedAssignment = await populateAssignment(
            AssessmentAssignment.findById(assignment._id)
        );

        if (action === 'accept') {
            await createNotification({
                recipientType: 'employer',
                recipientId: assignment.company,
                title: 'Interview date selected',
                message: `A candidate has selected a video interview date for ${populatedAssignment?.job?.title || 'a role'}. Check now?`,
                section: 'manage-jobs',
                actionLabel: 'Open interview',
                payload: {
                    jobId: String(assignment.job),
                    assignmentId: String(assignment._id),
                    subSection: 'arrange-video'
                }
            });
        }

        return res.status(200).json({
            message: action === 'accept'
                ? 'Interview date selected successfully'
                : 'Interview invitation discarded',
            assignment: populatedAssignment
        });
    } catch (error) {
        console.error('Error responding to video interview invitation:', error.message);
        return res.status(500).json({
            error: error.message || 'Failed to update interview response',
            message: error.message
        });
    }
};

const hireCandidateFromAssessment = async (req, res) => {
    try {
        const record = await getAssignmentWithApplication(req.params.assignmentId);

        if (!record?.assignment) {
            return res.status(404).json({ error: 'Assessment assignment not found' });
        }

        record.assignment.decision = 'Hired';
        await record.assignment.save();

        if (record.application) {
            record.application.status = 'Accepted';
            record.application.updatedAt = Date.now();
            await record.application.save();
        }

        const populatedAssignment = await populateAssignment(
            AssessmentAssignment.findById(record.assignment._id)
        );

        return res.status(200).json({
            message: 'Candidate marked as hired successfully',
            assignment: populatedAssignment
        });
    } catch (error) {
        console.error('Error hiring candidate from assessment:', error.message);
        return res.status(500).json({
            error: 'Failed to hire candidate',
            message: error.message
        });
    }
};

const rejectCandidateFromAssessment = async (req, res) => {
    try {
        const record = await getAssignmentWithApplication(req.params.assignmentId);

        if (!record?.assignment) {
            return res.status(404).json({ error: 'Assessment assignment not found' });
        }

        record.assignment.decision = 'Rejected';
        await record.assignment.save();

        if (record.application) {
            record.application.status = 'Rejected';
            record.application.updatedAt = Date.now();
            await record.application.save();
        }

        const populatedAssignment = await populateAssignment(
            AssessmentAssignment.findById(record.assignment._id)
        );

        return res.status(200).json({
            message: 'Candidate rejected successfully',
            assignment: populatedAssignment
        });
    } catch (error) {
        console.error('Error rejecting candidate from assessment:', error.message);
        return res.status(500).json({
            error: 'Failed to reject candidate',
            message: error.message
        });
    }
};

const finalizeScheduledInterviewDecision = async (req, res) => {
    try {
        const { decision } = req.body;
        const record = await getAssignmentWithApplication(req.params.assignmentId);

        if (!record?.assignment) {
            return res.status(404).json({ error: 'Assessment assignment not found' });
        }

        if (record.assignment.videoInterview?.candidateSelection?.status !== 'Accepted') {
            return res.status(400).json({ error: 'This interview has not been accepted by the candidate yet' });
        }

        const decisionMap = {
            hire: {
                assignmentDecision: 'Hired',
                applicationStatus: 'Accepted',
                successMessage: 'Candidate marked as hired successfully'
            },
            hold: {
                assignmentDecision: 'Hold Candidate',
                applicationStatus: 'On Hold',
                successMessage: 'Candidate placed on hold successfully'
            },
            reject: {
                assignmentDecision: 'Rejected',
                applicationStatus: 'Unsuccessful',
                successMessage: 'Candidate marked as unsuccessful successfully'
            }
        };

        const selectedDecision = decisionMap[decision];

        if (!selectedDecision) {
            return res.status(400).json({ error: 'Please choose hire, hold, or reject for the completed interview' });
        }

        record.assignment.decision = selectedDecision.assignmentDecision;
        await record.assignment.save();

        if (record.application) {
            record.application.status = selectedDecision.applicationStatus;
            record.application.updatedAt = Date.now();
            await record.application.save();
        }

        const populatedAssignment = await populateAssignment(
            AssessmentAssignment.findById(record.assignment._id)
        );

        return res.status(200).json({
            message: selectedDecision.successMessage,
            assignment: populatedAssignment
        });
    } catch (error) {
        console.error('Error finalizing scheduled interview decision:', error.message);
        return res.status(500).json({
            error: 'Failed to finalize scheduled interview decision',
            message: error.message
        });
    }
};

module.exports = {
    getCompanyAssessments,
    getCompanyAssessmentAssignments,
    getUserAssessmentAssignments,
    createAssessment,
    sendAssessment,
    updateAssessment,
    deleteAssessment,
    startAssessmentAssignment,
    submitAssessmentAssignment,
    shortlistForVideoInterview,
    sendVideoInterviewInvitation,
    respondToVideoInterviewInvitation,
    hireCandidateFromAssessment,
    rejectCandidateFromAssessment,
    finalizeScheduledInterviewDecision
};
