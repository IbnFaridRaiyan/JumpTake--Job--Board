const axios = require('axios');
const JobSeeker = require('../models/JobSeeker');


const GEMINI_API_KEY = process.env.GEMINI_API_KEY;



const parseResume = async (req, res) => {
    try {
        const resumeText = req.body.resumeText;
        
        if (!resumeText) {
            return res.status(400).json({ error: 'No resume text provided' });
        }
        
        console.log('Received resume text:', resumeText.substring(0, 100) + '...');
        
      
        const processedData = await processResumeWithGemini(resumeText);
        console.log('Processed resume data:', JSON.stringify(processedData).substring(0, 100) + '...');
        
       
        const jobSeekerData = {
            ...processedData,
            resumeText: resumeText
        };
        
        const jobSeeker = new JobSeeker(jobSeekerData);
        await jobSeeker.save();
        
      
        return res.status(200).json({
            message: 'Resume processed successfully',
            jobSeekerId: jobSeeker._id,
            data: processedData
        });
    } catch (error) {
        console.error('Error processing resume:', error.message);
        return res.status(500).json({ 
            error: 'Failed to process resume',
            message: error.message
        });
    }
};


const handleResume = parseResume;

const processResumeWithGemini = async (resumeText) => {
    if (!GEMINI_API_KEY) {
        throw new Error('Gemini API key not configured. Please set GEMINI_API_KEY environment variable.');
    }
    
    try {
        const prompt = `
        Analyze the following resume and extract these details in JSON format:
        - name
        - email
        - education (including institutions and dates)
        - degrees
        - experience (including companies, roles, and dates)
        - skills
        - achievements
        - interests
        - hobbies
        
        Only respond with a valid JSON object containing these fields.
        
        Resume text:
        ${resumeText}
        `;
        
        const response = await axios.post(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`,
            {
                contents: [{
                    parts: [{ text: prompt }]
                }]
            },
            {
                headers: {
                    'Content-Type': 'application/json'
                }
            }
        );
        
        
        if (!response.data || 
            !response.data.candidates || 
            !response.data.candidates[0] || 
            !response.data.candidates[0].content ||
            !response.data.candidates[0].content.parts || 
            !response.data.candidates[0].content.parts[0]) {
            console.error('Unexpected response structure:', JSON.stringify(response.data));
            throw new Error('Unexpected response format from Gemini API');
        }
        
       
        const responseText = response.data.candidates[0].content.parts[0].text;
        
      
       
        const jsonMatch = responseText.match(/```json\n([\s\S]*?)\n```/) || 
                         responseText.match(/```\n([\s\S]*?)\n```/) ||
                         responseText.match(/\{[\s\S]*?\}/);
                         
        let parsedData;
        if (jsonMatch) {
            const jsonStr = jsonMatch[1] || jsonMatch[0];
            try {
                parsedData = JSON.parse(jsonStr.trim());
            } catch (parseError) {
                console.error('JSON parsing error:', parseError, 'for text:', jsonStr);
                throw new Error('Failed to parse Gemini API response as JSON');
            }
        } else {
           
            try {
                parsedData = JSON.parse(responseText);
            } catch (parseError) {
                console.error('JSON parsing error for full text:', parseError);
                throw new Error('Failed to parse Gemini API response');
            }
        }
        
        return parsedData;
    } catch (error) {
        console.error('Gemini API error:', error.response?.data || error.message);
      
        return {
            name: "Could not parse",
            email: "Could not parse",
            education: "Could not parse resume data. The AI response couldn't be processed correctly.",
            degrees: "Could not parse",
            experience: "Could not parse",
            skills: "Could not parse",
            achievements: "Could not parse",
            interests: "Could not parse",
            hobbies: "Could not parse"
        };
    }
};




const getResumeAnalysisByUserId = async (req, res) => {
    try {
        const userId = req.params.userId;
        console.log('Fetching resume analysis for user:', userId);
        
        
        const jobSeeker = await JobSeeker.findOne({ user: userId });
        
        if (!jobSeeker) {
            console.log('No jobSeeker found for user:', userId);
            return res.status(404).json({ error: 'No resume analysis found for this user' });
        }
        
        console.log('Found jobSeeker data:', jobSeeker._id);
        return res.status(200).json(jobSeeker);
    } catch (error) {
        console.error('Error retrieving resume analysis:', error.message);
        return res.status(500).json({ 
            error: 'Failed to retrieve resume analysis',
            message: error.message
        });
    }
};


const linkResumeToUser = async (req, res) => {
    try {
        const { userId, jobSeekerId } = req.body;
        
        if (!userId || !jobSeekerId) {
            return res.status(400).json({ error: 'User ID and Job Seeker ID are required' });
        }
        
      
        const jobSeeker = await JobSeeker.findById(jobSeekerId);
        if (!jobSeeker) {
            return res.status(404).json({ error: 'JobSeeker record not found' });
        }
        
     
        jobSeeker.user = userId;
        await jobSeeker.save();
        
       
        const User = require('../models/User');
        const user = await User.findById(userId);
        if (user) {
            user.jobSeekerId = jobSeekerId;
            await user.save();
        }
        
        return res.status(200).json({
            message: 'Resume data linked to user successfully',
            jobSeekerId: jobSeeker._id
        });
    } catch (error) {
        console.error('Error linking resume to user:', error.message);
        return res.status(500).json({ 
            error: 'Failed to link resume data to user',
            message: error.message
        });
    }
};


const updateResumeAnalysis = async (req, res) => {
    try {
        const jobSeekerId = req.params.jobSeekerId;
        const updateData = req.body;
        
     
        const jobSeeker = await JobSeeker.findById(jobSeekerId);
        if (!jobSeeker) {
            return res.status(404).json({ error: 'JobSeeker record not found' });
        }
        
      
        const allowedFields = ['name', 'email', 'skills', 'interests', 'hobbies', 'education', 'experience', 'achievements'];
        
        allowedFields.forEach(field => {
            if (updateData[field] !== undefined) {
                jobSeeker[field] = updateData[field];
            }
        });
        
        await jobSeeker.save();
        
        return res.status(200).json({
            message: 'Resume analysis updated successfully',
            data: jobSeeker
        });
    } catch (error) {
        console.error('Error updating resume analysis:', error.message);
        return res.status(500).json({ 
            error: 'Failed to update resume analysis',
            message: error.message
        });
    }
};


module.exports = {
    handleResume,
    parseResume,
    linkResumeToUser,
    getResumeAnalysisByUserId,
    updateResumeAnalysis
};