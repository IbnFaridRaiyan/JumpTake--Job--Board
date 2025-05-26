const express = require('express');
const router = express.Router();
const jobSeekerController = require('../../controllers/jobSeekerController');
const { employerAuth } = require('../../middleware/auth');


router.get('/', employerAuth, jobSeekerController.getAllJobSeekers);


module.exports = router;