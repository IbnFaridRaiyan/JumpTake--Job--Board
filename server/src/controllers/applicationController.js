const Application = require('../models/Application');
const Job = require('../models/Job');
const User = require('../models/User');

const createApplication = async (req, res) => {
    try {
        const { jobId, userId, message } = req.body;
        
        
        if (!jobId || !userId) {
            return res.status(400).json({ error: 'Job ID and User ID are required' });
        }
        
      
        const job = await Job.findById(jobId);
        if (!job) {
            return res.status(404).json({ error: 'Job not found' });
        }
        
       
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        
     
        const existingApplication = await Application.findOne({ job: jobId, user: userId });
        if (existingApplication) {
            return res.status(400).json({ error: 'You have already applied to this job' });
        }
        
      
        const application = new Application({
            job: jobId,
            user: userId,
            message: message || '',
            status: 'Submitted'
        });
        
        await application.save();
        
        return res.status(201).json({
            message: 'Application submitted successfully',
            applicationId: application._id
        });
    } catch (error) {
        console.error('Error creating application:', error.message);
        return res.status(500).json({ 
            error: 'Failed to submit application',
            message: error.message
        });
    }
};


const getUserApplications = async (req, res) => {
    try {
        const userId = req.params.userId;
        
       
        const applications = await Application.find({ user: userId })
            .populate({
                path: 'job',
                populate: {
                    path: 'company',
                    select: 'name'
                }
            })
            .sort({ createdAt: -1 });
            
        return res.status(200).json(applications);
    } catch (error) {
        console.error('Error fetching user applications:', error.message);
        return res.status(500).json({ 
            error: 'Failed to fetch applications',
            message: error.message
        });
    }
};


const updateApplication = async (req, res) => {
    try {
        const applicationId = req.params.id;
        const { status } = req.body;
        
        // Find the application
        const application = await Application.findById(applicationId);
        if (!application) {
            return res.status(404).json({ error: 'Application not found' });
        }
        
      
        application.status = status || application.status;
        application.updatedAt = Date.now();
        
        await application.save();
        
        return res.status(200).json({
            message: 'Application updated successfully',
            application: {
                id: application._id,
                status: application.status
            }
        });
    } catch (error) {
        console.error('Error updating application:', error.message);
        return res.status(500).json({ 
            error: 'Failed to update application',
            message: error.message
        });
    }
};

module.exports = {
    createApplication,
    getUserApplications,
    updateApplication
};