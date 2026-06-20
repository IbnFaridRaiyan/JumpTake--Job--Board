const express = require('express');
const router = express.Router();
const resumeController = require('../controllers/resumeController');
const companyController = require('../controllers/companyController');
const userController = require('../controllers/userController');
const jobController = require('../controllers/jobController');
const employerController = require('../controllers/employerController');
const Company = require('../models/Company');
const JobSeeker = require('../models/JobSeeker');
const applicationController = require('../controllers/applicationController');
const assessmentController = require('../controllers/assessmentController');
const engagementController = require('../controllers/engagementController');
const passwordResetController = require('../controllers/passwordResetController');
const messageController = require('../controllers/messageController');
const notificationController = require('../controllers/notificationController');
const jobInvitationController = require('../controllers/jobInvitationController');
const candidateNetworkController = require('../controllers/candidateNetworkController');
const User = require('../models/User');
const { getAuthenticatedPayload } = require('../utils/candidateAuth');




router.post('/upload', resumeController.handleResume);
router.post('/resume/parse', resumeController.handleResume);
router.post('/resume/link', resumeController.linkResumeToUser);
router.post('/resume/replace', resumeController.replaceResume);
router.get('/resume/analysis/:userId', resumeController.getResumeAnalysisByUserId);
router.put('/resume/analysis/:jobSeekerId', resumeController.updateResumeAnalysis);


router.post('/company', companyController.handleCompanyInfo);
router.post('/create-account', userController.createAccount);
router.post('/login', userController.login);


router.post('/users/register', userController.createAccount);
router.post('/users/login', userController.login);
router.post('/password-reset/request', passwordResetController.requestPasswordReset);
router.get('/password-reset/validate', passwordResetController.validatePasswordResetToken);
router.post('/password-reset/confirm', passwordResetController.confirmPasswordReset);


router.get('/companies', async (req, res) => {
    try {
        const companies = await Company.find().sort({ createdAt: -1 });
        res.json(companies);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});


router.get('/companies/:id', async (req, res) => {
    try {
        const company = await Company.findById(req.params.id);
        if (!company) {
            return res.status(404).json({ error: 'Company not found' });
        }
        res.json(company);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.put('/companies/:id', companyController.updateCompanyInfo);


router.get('/job-seekers', async (req, res) => {
    try {
        const payload = getAuthenticatedPayload(req);
        if (!payload.companyId) {
            return res.status(403).json({ error: 'The full candidate directory is available only to employers' });
        }
        const jobSeekers = await JobSeeker.find()
            .populate('user', 'jumptakeId')
            .sort({ createdAt: -1 });
        res.json(jobSeekers.map((candidate) => {
            const serialized = candidate.toObject();
            return {
                ...serialized,
                user: candidate.user?._id || candidate.user || null,
                jumptakeId: candidate.user?.jumptakeId || null
            };
        }));
    } catch (error) {
        res.status(error.status || 500).json({ error: error.message });
    }
});


router.get('/job-seekers/:id', async (req, res) => {
    try {
        const payload = getAuthenticatedPayload(req);
        const jobSeeker = await JobSeeker.findById(req.params.id);
        if (!jobSeeker) {
            return res.status(404).json({ error: 'Job seeker not found' });
        }

        if (!payload.companyId) {
            const user = await User.findById(payload.id).select('jobSeekerId');
            const ownsProfile = String(jobSeeker.user || '') === String(payload.id)
                || String(user?.jobSeekerId || '') === String(jobSeeker._id);
            if (!ownsProfile) {
                return res.status(403).json({ error: 'Private candidate profiles cannot be accessed directly' });
            }
        }
        res.json(jobSeeker);
    } catch (error) {
        res.status(error.status || 500).json({ error: error.message });
    }
});


router.put('/job-seekers/:id', async (req, res) => {
    try {
        const payload = getAuthenticatedPayload(req);
        if (!payload.companyId) {
            const existingProfile = await JobSeeker.findById(req.params.id).select('user');
            const user = await User.findById(payload.id).select('jobSeekerId');
            const ownsProfile = String(existingProfile?.user || '') === String(payload.id)
                || String(user?.jobSeekerId || '') === String(req.params.id);
            if (!ownsProfile) {
                return res.status(403).json({ error: 'You cannot update another candidate profile' });
            }
        }

        const safeUpdate = { ...req.body };
        delete safeUpdate.user;
        const jobSeeker = await JobSeeker.findByIdAndUpdate(
            req.params.id,
            safeUpdate,
            { new: true, runValidators: true }
        );
        
        if (!jobSeeker) {
            return res.status(404).json({ error: 'Job seeker not found' });
        }
        
        res.json(jobSeeker);
    } catch (error) {
        res.status(error.status || 500).json({ error: error.message });
    }
});


router.get('/jobs', jobController.getAllJobs);
router.get('/jobs/recommendations/:jobSeekerId', jobController.getRecommendedJobs);
router.get('/jobs/:id', jobController.getJobById);
router.post('/jobs', jobController.createJob);
router.put('/jobs/:id', jobController.updateJob);
router.delete('/jobs/:id', jobController.deleteJob);
router.get('/companies/:companyId/jobs', jobController.getCompanyJobs);


router.post('/employer/register', employerController.registerEmployer);
router.post('/employer/login', employerController.loginEmployer);
router.get('/employers/:id/settings', employerController.getEmployerSettings);
router.put('/employers/:id/contact', employerController.updateEmployerContact);
router.put('/employers/:id/password', employerController.updateEmployerPassword);
router.put('/employers/:id/notification-preferences', employerController.updateEmployerNotificationPreferences);


router.post('/applications', applicationController.createApplication);
router.get('/applications/company/:companyId', applicationController.getCompanyApplications);
router.get('/applications/user/:userId', applicationController.getUserApplications);
router.put('/applications/:id', applicationController.updateApplication);
router.post('/draft-applications', engagementController.createOrUpdateDraftApplication);
router.get('/draft-applications/user/:userId', engagementController.getUserDraftApplications);
router.delete('/draft-applications/:id', engagementController.deleteDraftApplication);
router.post('/job-bookmarks', engagementController.createJobBookmark);
router.get('/job-bookmarks/user/:userId', engagementController.getUserJobBookmarks);
router.delete('/job-bookmarks/user/:userId/job/:jobId', engagementController.deleteJobBookmark);
router.post('/application-bookmarks', engagementController.createApplicationBookmark);
router.get('/application-bookmarks/company/:companyId', engagementController.getCompanyApplicationBookmarks);
router.delete('/application-bookmarks/company/:companyId/application/:applicationId', engagementController.deleteApplicationBookmark);
router.post('/talent-bookmarks', engagementController.createTalentBookmark);
router.get('/talent-bookmarks/company/:companyId', engagementController.getCompanyTalentBookmarks);
router.delete('/talent-bookmarks/company/:companyId/candidate/:candidateId', engagementController.deleteTalentBookmark);
router.post('/candidate-bookmarks', engagementController.createCandidateBookmark);
router.get('/candidate-bookmarks/user/:userId', engagementController.getUserCandidateBookmarks);
router.delete('/candidate-bookmarks/user/:userId/candidate/:candidateId', engagementController.deleteCandidateBookmark);
router.get('/candidate-likes', engagementController.getCandidateLikeSummary);
router.post('/candidate-likes/toggle', engagementController.toggleCandidateLike);
router.get('/candidate-network/matches/:userId', candidateNetworkController.getMatchedCandidates);
router.get('/candidate-network/profile/:userId', candidateNetworkController.getMyNetworkProfile);
router.post('/candidate-connections/request', candidateNetworkController.sendFriendRequest);
router.get('/candidate-connections/user/:userId', candidateNetworkController.getConnections);
router.put('/candidate-connections/:connectionId/respond', candidateNetworkController.respondToConnection);

router.get('/notifications', notificationController.getNotifications);
router.put('/notifications/:id/read', notificationController.markNotificationRead);
router.put('/notifications/read-all', notificationController.markAllNotificationsRead);
router.get('/job-invitations/user/:userId', jobInvitationController.getCandidateJobInvitations);
router.get('/job-invitations/company/:companyId/job/:jobId/matches', jobInvitationController.getMatchingCandidates);
router.post('/job-invitations/send', jobInvitationController.sendJobInvitations);

router.get('/assessments/company/:companyId', assessmentController.getCompanyAssessments);
router.get('/assessments/company/:companyId/assignments', assessmentController.getCompanyAssessmentAssignments);
router.get('/assessments/user/:userId', assessmentController.getUserAssessmentAssignments);
router.post('/assessments', assessmentController.createAssessment);
router.post('/assessments/:id/send', assessmentController.sendAssessment);
router.put('/assessments/:id', assessmentController.updateAssessment);
router.delete('/assessments/:id', assessmentController.deleteAssessment);
router.put('/assessment-assignments/:assignmentId/start', assessmentController.startAssessmentAssignment);
router.put('/assessment-assignments/:assignmentId/submit', assessmentController.submitAssessmentAssignment);
router.put('/assessment-assignments/:assignmentId/shortlist-video', assessmentController.shortlistForVideoInterview);
router.put('/assessment-assignments/:assignmentId/video-interview', assessmentController.sendVideoInterviewInvitation);
router.put('/assessment-assignments/:assignmentId/video-interview/respond', assessmentController.respondToVideoInterviewInvitation);
router.put('/assessment-assignments/:assignmentId/hire', assessmentController.hireCandidateFromAssessment);
router.put('/assessment-assignments/:assignmentId/reject', assessmentController.rejectCandidateFromAssessment);
router.put('/assessment-assignments/:assignmentId/complete-interview', assessmentController.finalizeScheduledInterviewDecision);


router.put('/users/:userId/email', userController.updateEmail);
router.put('/users/:userId/password', userController.updatePassword);
router.delete('/users/:userId', userController.deleteUser);
router.get('/users/:userId/notification-preferences', userController.getNotificationPreferences);
router.put('/users/:userId/notification-preferences', userController.updateNotificationPreferences);
router.put('/users/:userId/job-interests', userController.updateJobInterests);

router.post('/messages', messageController.createOrReplyMessage);
router.post('/messages/candidate-direct', messageController.createCandidateDirectMessage);
router.put('/messages/:threadId/reply', messageController.replyToThread);
router.get('/messages/company/:companyId', messageController.getCompanyThreads);
router.get('/messages/user/:userId', messageController.getCandidateThreads);

module.exports = router;
