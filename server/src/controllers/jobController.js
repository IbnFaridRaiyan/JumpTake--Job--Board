const Job = require('../models/Job');
const Company = require('../models/Company');
const JobSeeker = require('../models/JobSeeker');

const getAllJobs = async (req, res) => {
    try {
       
        const jobs = await Job.find({ active: true })
            .populate('company', 'name industry headquarters')
            .sort({ createdAt: -1 });
            
        return res.status(200).json(jobs);
    } catch (error) {
        console.error('Error fetching jobs:', error.message);
        return res.status(500).json({ 
            error: 'Failed to fetch jobs',
            message: error.message
        });
    }
};


const getJobById = async (req, res) => {
    try {
        const job = await Job.findById(req.params.id)
            .populate('company', 'name industry headquarters description website');
            
        if (!job) {
            return res.status(404).json({ error: 'Job not found' });
        }
        
        return res.status(200).json(job);
    } catch (error) {
        console.error('Error fetching job:', error.message);
        return res.status(500).json({ 
            error: 'Failed to fetch job',
            message: error.message
        });
    }
};


const createJob = async (req, res) => {
    try {
        const {
            title,
            description,
            companyId,
            location,
            salary,
            jobType,
            requirements,
            responsibilities,
            skills
        } = req.body;
        
        
        if (!title || !description || !companyId || !location) {
            return res.status(400).json({ 
                error: 'Missing required fields',
                required: ['title', 'description', 'companyId', 'location']
            });
        }
        
       
        const company = await Company.findById(companyId);
        if (!company) {
            return res.status(404).json({ error: 'Company not found' });
        }
        
        
        const job = new Job({
            title,
            description,
            company: companyId,
            location,
            salary,
            jobType,
            requirements: requirements || [],
            responsibilities: responsibilities || [],
            skills: skills || []
        });
        
        await job.save();
        
        return res.status(201).json({
            message: 'Job created successfully',
            job: {
                id: job._id,
                title: job.title
            }
        });
    } catch (error) {
        console.error('Error creating job:', error.message);
        return res.status(500).json({ 
            error: 'Failed to create job',
            message: error.message
        });
    }
};

const updateJob = async (req, res) => {
    try {
        const jobId = req.params.id;
        const {
            title,
            description,
            location,
            salary,
            jobType,
            requirements,
            responsibilities,
            skills,
            active
        } = req.body;
        
     
        const job = await Job.findById(jobId);
        if (!job) {
            return res.status(404).json({ error: 'Job not found' });
        }
        
      
        job.title = title || job.title;
        job.description = description || job.description;
        job.location = location || job.location;
        job.salary = salary !== undefined ? salary : job.salary;
        job.jobType = jobType || job.jobType;
        job.requirements = requirements || job.requirements;
        job.responsibilities = responsibilities || job.responsibilities;
        job.skills = skills || job.skills;
        job.active = active !== undefined ? active : job.active;
        job.updatedAt = Date.now();
        
        await job.save();
        
        return res.status(200).json({
            message: 'Job updated successfully',
            job: {
                id: job._id,
                title: job.title,
                active: job.active
            }
        });
    } catch (error) {
        console.error('Error updating job:', error.message);
        return res.status(500).json({ 
            error: 'Failed to update job',
            message: error.message
        });
    }
};


const deleteJob = async (req, res) => {
    try {
        const jobId = req.params.id;
        
        
        const job = await Job.findByIdAndDelete(jobId);
        
        if (!job) {
            return res.status(404).json({ error: 'Job not found' });
        }
        
        return res.status(200).json({
            message: 'Job deleted successfully'
        });
    } catch (error) {
        console.error('Error deleting job:', error.message);
        return res.status(500).json({ 
            error: 'Failed to delete job',
            message: error.message
        });
    }
};


const getCompanyJobs = async (req, res) => {
    try {
        const companyId = req.params.companyId;
        
        // Find all jobs for this company
        const jobs = await Job.find({ company: companyId })
            .sort({ createdAt: -1 });
            
        return res.status(200).json(jobs);
    } catch (error) {
        console.error('Error fetching company jobs:', error.message);
        return res.status(500).json({ 
            error: 'Failed to fetch company jobs',
            message: error.message
        });
    }
};

// Get job recommendations for a specific job seeker
const getRecommendedJobs = async (req, res) => {
    try {
        const jobSeekerId = req.params.jobSeekerId;
        
        // Get the job seeker's skills
        const jobSeeker = await JobSeeker.findById(jobSeekerId);
        if (!jobSeeker) {
            return res.status(404).json({ error: 'Job seeker not found' });
        }
        
        // Extract skills - handle different possible formats
        let seekerSkills = [];
        if (jobSeeker.skills) {
            if (Array.isArray(jobSeeker.skills)) {
                seekerSkills = jobSeeker.skills;
            } else if (typeof jobSeeker.skills === 'string') {
                seekerSkills = jobSeeker.skills.split(',').map(skill => skill.trim());
            }
        }
        
        // If no skills, return empty array
        if (seekerSkills.length === 0) {
            return res.status(200).json([]);
        }
        
        // Find active jobs with matching skills
        const jobs = await Job.find({ active: true })
            .populate('company', 'name industry headquarters')
            .sort({ createdAt: -1 });
        
        // Calculate match scores for all jobs
        const scoredJobs = jobs.map(job => {
            // Get job skills
            let jobSkills = [];
            if (job.skills) {
                if (Array.isArray(job.skills)) {
                    jobSkills = job.skills;
                } else if (typeof job.skills === 'string') {
                    jobSkills = job.skills.split(',').map(skill => skill.trim());
                }
            }
            
            // Calculate score based on matching skills
            let matchScore = 0;
            for (const seekerSkill of seekerSkills) {
                const skillMatch = jobSkills.some(jobSkill => 
                    jobSkill.toLowerCase() === seekerSkill.toLowerCase()
                );
                
                if (skillMatch) {
                    matchScore++;
                }
            }
            
            // Add score to job
            return {
                job,
                matchScore
            };
        });
        
        // Filter jobs with at least one matching skill and sort by match score
        const recommendedJobs = scoredJobs
            .filter(item => item.matchScore > 0)
            .sort((a, b) => b.matchScore - a.matchScore)
            .map(item => item.job);
        
        return res.status(200).json(recommendedJobs);
    } catch (error) {
        console.error('Error fetching job recommendations:', error.message);
        return res.status(500).json({ 
            error: 'Failed to fetch job recommendations',
            message: error.message
        });
    }
};

module.exports = {
    getAllJobs,
    getJobById,
    createJob,
    updateJob,
    deleteJob,
    getCompanyJobs,
    getRecommendedJobs
};