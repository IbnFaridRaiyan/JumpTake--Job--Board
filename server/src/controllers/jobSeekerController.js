
const getAllJobSeekers = async (req, res) => {
    try {
       
        const jobSeekers = await JobSeeker.find()
            .select('-resumeText') 
            .sort({ createdAt: -1 });
        
        return res.status(200).json(jobSeekers);
    } catch (error) {
        console.error('Error fetching job seekers:', error.message);
        return res.status(500).json({ 
            error: 'Failed to fetch job seekers',
            message: error.message
        });
    }
};


module.exports = {
   
    getAllJobSeekers
};