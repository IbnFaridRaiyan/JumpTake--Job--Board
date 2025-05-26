

const express = require('express');
const router = express.Router();
const jobController = require('../../controllers/jobController');
const { auth, employerAuth } = require('../../middleware/auth');


router.get('/recommendations/:jobSeekerId', auth, jobController.getRecommendedJobs);


module.exports = router;