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




router.post('/upload', resumeController.handleResume);
router.post('/resume/parse', resumeController.handleResume);
router.get('/resume/analysis/:userId', resumeController.getResumeAnalysisByUserId);
router.put('/resume/analysis/:jobSeekerId', resumeController.updateResumeAnalysis);


router.post('/company', companyController.handleCompanyInfo);
router.post('/create-account', userController.createAccount);
router.post('/login', userController.login);


router.post('/users/register', userController.createAccount);
router.post('/users/login', userController.login);


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


router.get('/job-seekers', async (req, res) => {
    try {
        const jobSeekers = await JobSeeker.find().sort({ createdAt: -1 });
        res.json(jobSeekers);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});


router.get('/job-seekers/:id', async (req, res) => {
    try {
        const jobSeeker = await JobSeeker.findById(req.params.id);
        if (!jobSeeker) {
            return res.status(404).json({ error: 'Job seeker not found' });
        }
        res.json(jobSeeker);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});


router.put('/job-seekers/:id', async (req, res) => {
    try {
        const jobSeeker = await JobSeeker.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true, runValidators: true }
        );
        
        if (!jobSeeker) {
            return res.status(404).json({ error: 'Job seeker not found' });
        }
        
        res.json(jobSeeker);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});


router.get('/jobs', jobController.getAllJobs);
router.get('/jobs/:id', jobController.getJobById);
router.post('/jobs', jobController.createJob);
router.put('/jobs/:id', jobController.updateJob);
router.delete('/jobs/:id', jobController.deleteJob);
router.get('/companies/:companyId/jobs', jobController.getCompanyJobs);


router.post('/employer/register', employerController.registerEmployer);
router.post('/employer/login', employerController.loginEmployer);


router.post('/applications', applicationController.createApplication);
router.get('/applications/user/:userId', applicationController.getUserApplications);
router.put('/applications/:id', applicationController.updateApplication);


router.put('/users/:userId/email', userController.updateEmail);
router.put('/users/:userId/password', userController.updatePassword);
router.delete('/users/:userId', userController.deleteUser);

module.exports = router;