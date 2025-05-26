const express = require('express');
const router = express.Router();
const resumeController = require('../controllers/resumeController');
const auth = require('../middleware/auth');


router.post('/parse', resumeController.parseResume);


router.post('/link', auth, resumeController.linkResumeToUser);


router.get('/analysis/:userId', auth, resumeController.getResumeAnalysisByUserId);


router.put('/analysis/:jobSeekerId', auth, resumeController.updateResumeAnalysis);

module.exports = router;