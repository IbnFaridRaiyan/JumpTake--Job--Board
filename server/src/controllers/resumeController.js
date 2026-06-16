const axios = require('axios');
const JobSeeker = require('../models/JobSeeker');
const Company = require('../models/Company');
const { createNotification } = require('./notificationController');



const parseResume = async (req, res) => {
    try {
        const resumeText = req.body.resumeText;
        
        if (!resumeText) {
            return res.status(400).json({ error: 'No resume text provided' });
        }
        
        console.log('[RESUME] Step 1: Received resume text (' + resumeText.length + ' chars)');
        console.log('[RESUME] Step 2: GEMINI_API_KEY present?', !!process.env.GEMINI_API_KEY);
        
        const processedData = await processResumeWithGemini(resumeText);
        console.log('[RESUME] Step 3: Gemini processing complete');
        
        // Try to save to MongoDB, but don't fail the whole request if DB is down
        let jobSeekerId = null;
        try {
            const jobSeekerData = {
                ...processedData,
                resumeText: resumeText
            };
            
            console.log('[RESUME] Step 4: Saving to MongoDB...');
            const jobSeeker = new JobSeeker(jobSeekerData);
            await jobSeeker.save();
            jobSeekerId = jobSeeker._id;
            console.log('[RESUME] Step 5: Saved successfully, ID:', jobSeekerId);
        } catch (dbError) {
            console.error('[RESUME] MongoDB save failed (DB may be down):', dbError.message);
            // Generate a temporary ID so the client flow can continue
            jobSeekerId = 'temp_' + Date.now();
            console.log('[RESUME] Using temporary ID:', jobSeekerId);
        }
        
        return res.status(200).json({
            message: 'Resume processed successfully',
            jobSeekerId: jobSeekerId,
            data: processedData
        });
    } catch (error) {
        console.error('[RESUME] ERROR at processing:', error.message);
        console.error('[RESUME] Full error:', error.stack);
        return res.status(500).json({ 
            error: 'Failed to process resume',
            message: error.message
        });
    }
};


const handleResume = parseResume;

const processResumeWithGemini = async (resumeText) => {
    const apiKey = process.env.GEMINI_API_KEY;
    console.log('[GEMINI] API key available:', !!apiKey, apiKey ? '(key starts with: ' + apiKey.substring(0, 8) + '...)' : '');
    
    if (!apiKey) {
        throw new Error('Gemini API key not configured. Please set GEMINI_API_KEY environment variable.');
    }
    
    // 1. Dynamically query the available models for this API key
    let availableModels = [];
    try {
        console.log(`[GEMINI] Querying available models from v1beta registry...`);
        const listResponse = await axios.get(
            `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`
        );
        if (listResponse.data && listResponse.data.models) {
            availableModels = listResponse.data.models
                .filter(m => m.supportedGenerationMethods && m.supportedGenerationMethods.includes('generateContent'))
                .map(m => m.name.replace('models/', ''));
            console.log(`[GEMINI] Registry (v1beta) returned models:`, availableModels);
        }
    } catch (listError) {
        console.warn(`[GEMINI] Failed to list models from v1beta registry:`, listError.response?.data?.error?.message || listError.message);
        
        // Try v1 registry
        try {
            console.log(`[GEMINI] Querying available models from v1 registry...`);
            const listResponse = await axios.get(
                `https://generativelanguage.googleapis.com/v1/models?key=${apiKey}`
            );
            if (listResponse.data && listResponse.data.models) {
                availableModels = listResponse.data.models
                    .filter(m => m.supportedGenerationMethods && m.supportedGenerationMethods.includes('generateContent'))
                    .map(m => m.name.replace('models/', ''));
                console.log(`[GEMINI] Registry (v1) returned models:`, availableModels);
            }
        } catch (listErrorV1) {
            console.error(`[GEMINI] Failed to list models from v1 registry:`, listErrorV1.response?.data?.error?.message || listErrorV1.message);
        }
    }
    
    // Fallback to hardcoded list if registry query fails or returns empty
    if (availableModels.length === 0) {
        console.log(`[GEMINI] Using default model fallback list`);
        availableModels = ['gemini-2.0-flash', 'gemini-1.5-flash', 'gemini-1.5-pro'];
    }
    
    // Build attempts array
    const attempts = [];
    
    // Prioritize GEMINI_MODEL if specified
    if (process.env.GEMINI_MODEL) {
        attempts.push({ model: process.env.GEMINI_MODEL, version: 'v1beta' });
        attempts.push({ model: process.env.GEMINI_MODEL, version: 'v1' });
    }
    
    // Add models returned by registry/fallback
    availableModels.forEach(m => {
        if (m !== process.env.GEMINI_MODEL) {
            attempts.push({ model: m, version: 'v1beta' });
            attempts.push({ model: m, version: 'v1' });
        }
    });
    
    let lastError = null;
    const failedAttempts = [];
    
    for (const attempt of attempts) {
        const { model, version } = attempt;
        try {
            console.log(`[GEMINI] Attempting to parse resume with model: ${model} (${version})`);
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
                `https://generativelanguage.googleapis.com/${version}/models/${model}:generateContent?key=${apiKey}`,
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
                console.error(`[GEMINI] Unexpected response structure for ${model} (${version}):`, JSON.stringify(response.data));
                throw new Error(`Unexpected response format from Gemini API using model ${model} (${version})`);
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
                    console.error(`[GEMINI] JSON parsing error for model ${model} (${version}):`, parseError, 'for text:', jsonStr);
                    throw new Error(`Failed to parse Gemini response for model ${model} (${version}) as JSON`);
                }
            } else {
                try {
                    parsedData = JSON.parse(responseText);
                } catch (parseError) {
                    console.error(`[GEMINI] JSON parsing error for full text with model ${model} (${version}):`, parseError);
                    throw new Error(`Failed to parse Gemini response for model ${model} (${version})`);
                }
            }
            
            console.log(`[GEMINI] Successfully parsed resume using model: ${model} (${version})`);
            return parsedData;
            
        } catch (error) {
            const errorMsg = error.response?.data?.error?.message || error.message;
            const errorStatus = error.response?.data?.error?.status || 'UNKNOWN';
            console.warn(`[GEMINI] Model ${model} (${version}) failed (Status: ${errorStatus}): ${errorMsg}`);
            
            failedAttempts.push({
                model,
                version,
                status: errorStatus,
                message: errorMsg
            });
            lastError = error;
        }
    }
    
    // If we reached here, all attempts failed
    const fs = require('fs');
    const path = require('path');
    const errorInfo = {
        message: lastError.message,
        stack: lastError.stack,
        responseData: lastError.response?.data,
        responseStatus: lastError.response?.status,
        failedAttempts: failedAttempts
    };
    try {
        fs.writeFileSync(path.join(__dirname, '..', '..', 'error_log.txt'), JSON.stringify(errorInfo, null, 2));
    } catch (fsErr) {
        console.error('Failed to write error log file:', fsErr);
    }
    
    console.error('Gemini API error (all models failed):', lastError.response?.data || lastError.message);
    console.error('Failed attempts detail:', JSON.stringify(failedAttempts, null, 2));
    
    return {
        name: "Could not parse",
        email: "Could not parse",
        education: "Could not parse resume data. The AI response couldn't be processed correctly. Check server logs or configure a valid API key.",
        degrees: "Could not parse",
        experience: "Could not parse",
        skills: "Could not parse",
        achievements: "Could not parse",
        interests: "Could not parse",
        hobbies: "Could not parse"
    };
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

        try {
            const companies = await Company.find({}).select('_id name').limit(200);
            await Promise.all(companies.map((company) => createNotification({
                recipientType: 'employer',
                recipientId: String(company._id),
                title: 'New talent in the pool',
                message: `${jobSeeker.name || 'A new candidate'} has joined the Talent Pool. Visit now?`,
                section: 'talent-pool',
                actionLabel: 'View Talent Pool',
                payload: {
                    candidateId: String(jobSeeker._id),
                    candidateName: jobSeeker.name || '',
                    search: jobSeeker.name || jobSeeker.email || ''
                }
            })));
        } catch (notificationError) {
            console.error('Error creating talent pool notifications:', notificationError.message);
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
