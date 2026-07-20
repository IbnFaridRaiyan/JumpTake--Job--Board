const Application = require('../models/Application');
const Job = require('../models/Job');
const User = require('../models/User');
const JobSeeker = require('../models/JobSeeker');
const DraftApplication = require('../models/DraftApplication');
const {
    ensureReferenceNumbers,
    generateUniqueReferenceNumber
} = require('../utils/referenceNumbers');
const { createNotification } = require('./notificationController');

const normalizeString = (value) => {
    if (typeof value !== 'string') {
        return '';
    }

    return value.trim();
};

const normalizeListValue = (value) => {
    if (Array.isArray(value)) {
        return value
            .map((item) => (typeof item === 'string' ? item.trim() : item))
            .filter((item) => {
                if (typeof item === 'string') {
                    return Boolean(item);
                }

                return item !== null && item !== undefined;
            });
    }

    if (typeof value === 'string') {
        const trimmedValue = value.trim();
        return trimmedValue ? trimmedValue : '';
    }

    return value ?? '';
};

const sanitizeStyleAttribute = (styleValue = '') => {
    const allowedProperties = new Set([
        'font-family',
        'font-weight',
        'font-style',
        'text-decoration',
        'text-align'
    ]);

    return styleValue
        .split(';')
        .map((rule) => rule.trim())
        .filter(Boolean)
        .map((rule) => {
            const [property, ...rest] = rule.split(':');
            if (!property || rest.length === 0) {
                return null;
            }

            const normalizedProperty = property.trim().toLowerCase();
            if (!allowedProperties.has(normalizedProperty)) {
                return null;
            }

            const rawValue = rest.join(':').trim();
            const sanitizedValue = rawValue.replace(/[^a-zA-Z0-9,\-"'()\s]/g, '');

            if (!sanitizedValue) {
                return null;
            }

            return `${normalizedProperty}: ${sanitizedValue}`;
        })
        .filter(Boolean)
        .join('; ');
};

const sanitizeCoverLetterHtml = (html = '') => {
    if (typeof html !== 'string') {
        return '';
    }

    const allowedTags = new Set([
        'p',
        'br',
        'strong',
        'b',
        'em',
        'i',
        'u',
        'ul',
        'ol',
        'li',
        'div',
        'span',
        'h3'
    ]);

    return html
        .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, '')
        .replace(/<style[\s\S]*?>[\s\S]*?<\/style>/gi, '')
        .replace(/\son[a-z]+\s*=\s*(['"]).*?\1/gi, '')
        .replace(/\shref\s*=\s*(['"])javascript:.*?\1/gi, '')
        .replace(/<([^>]+)>/g, (match, tagContent) => {
            const trimmedTag = tagContent.trim();
            const isClosingTag = trimmedTag.startsWith('/');
            const normalizedTag = trimmedTag
                .replace(/^\//, '')
                .split(/\s+/)[0]
                .toLowerCase();

            if (!allowedTags.has(normalizedTag)) {
                return '';
            }

            if (isClosingTag) {
                return `</${normalizedTag}>`;
            }

            const styleMatch = trimmedTag.match(/style\s*=\s*(['"])(.*?)\1/i);
            const sanitizedStyle = styleMatch ? sanitizeStyleAttribute(styleMatch[2]) : '';
            const styleAttribute = sanitizedStyle ? ` style="${sanitizedStyle}"` : '';

            return `<${normalizedTag}${styleAttribute}>`;
        })
        .trim();
};

const stripHtml = (html = '') => (
    html
        .replace(/<br\s*\/?>/gi, '\n')
        .replace(/<\/(p|div|li|h3)>/gi, '\n')
        .replace(/<[^>]+>/g, ' ')
        .replace(/\n{3,}/g, '\n\n')
        .replace(/[ \t]{2,}/g, ' ')
        .trim()
);

const buildProfileSnapshot = (profileInput = {}, user = null, fallbackProfile = null) => {
    const source = profileInput && typeof profileInput === 'object' ? profileInput : {};
    const baseProfile = fallbackProfile && typeof fallbackProfile === 'object' ? fallbackProfile : {};

    return {
        name: normalizeString(source.name || baseProfile.name || ''),
        email: normalizeString(source.email || baseProfile.email || user?.email || ''),
        profileImage: normalizeString(source.profileImage || baseProfile.profileImage || ''),
        skills: normalizeListValue(source.skills ?? baseProfile.skills ?? []),
        interests: normalizeListValue(source.interests ?? baseProfile.interests ?? []),
        hobbies: normalizeListValue(source.hobbies ?? baseProfile.hobbies ?? []),
        education: normalizeListValue(source.education ?? baseProfile.education ?? []),
        experience: normalizeListValue(source.experience ?? baseProfile.experience ?? []),
        achievements: normalizeListValue(source.achievements ?? baseProfile.achievements ?? [])
    };
};

const buildUploadedResume = (resumeInput = null) => {
    if (!resumeInput || typeof resumeInput !== 'object') {
        return null;
    }

    const fileName = normalizeString(resumeInput.fileName || '');
    const mimeType = normalizeString(resumeInput.mimeType || '');
    const dataUrl = typeof resumeInput.dataUrl === 'string' ? resumeInput.dataUrl.trim() : '';
    const text = typeof resumeInput.text === 'string' ? resumeInput.text.trim() : '';

    if (!dataUrl && !text) {
        return null;
    }

    return {
        fileName: fileName || 'Uploaded resume',
        mimeType,
        dataUrl,
        text
    };
};

const createApplication = async (req, res) => {
    try {
        const { jobId, userId, message, coverLetterHtml, uploadedCoverLetter, profileSnapshot, uploadedResume, draftId } = req.body;
        
        
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

        const baseProfile = user.jobSeekerId
            ? await JobSeeker.findById(user.jobSeekerId).lean()
            : null;
        
     
        const existingApplication = await Application.findOne({
            job: jobId,
            user: userId,
            status: { $ne: 'Withdrawn' }
        });
        if (existingApplication) {
            return res.status(400).json({ error: 'You have already applied to this job' });
        }
        
      
        const application = new Application({
            candidateNumber: await generateUniqueReferenceNumber(Application, 'candidateNumber', 'CAN'),
            job: jobId,
            user: userId,
            message: message || '',
            coverLetterHtml: sanitizeCoverLetterHtml(coverLetterHtml || ''),
            coverLetterText: stripHtml(coverLetterHtml || ''),
            uploadedCoverLetter: buildUploadedResume(uploadedCoverLetter),
            profileSnapshot: uploadedResume ? null : buildProfileSnapshot(profileSnapshot, user, baseProfile),
            uploadedResume: buildUploadedResume(uploadedResume),
            status: 'Submitted'
        });
        
        await application.save();

        await createNotification({
            recipientType: 'employer',
            recipientId: job.company,
            title: 'New job application',
            message: `${application.profileSnapshot?.name || user.email} applied for ${job.title}. Open now?`,
            section: 'manage-jobs',
            actionLabel: 'Open applicants',
            payload: {
                jobId: String(job._id),
                jobTitle: job.title,
                applicationId: String(application._id),
                subSection: 'applicants'
            }
        });

        if (draftId) {
            await DraftApplication.findOneAndDelete({ _id: draftId, user: userId });
        }
        
        return res.status(201).json({
            message: 'Application submitted successfully',
            applicationId: application._id,
            candidateNumber: application.candidateNumber
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
                    select: 'name logo'
                }
            })
            .sort({ createdAt: -1 });

        await ensureReferenceNumbers(applications, Application, 'candidateNumber', 'CAN');
            
        return res.status(200).json(applications);
    } catch (error) {
        console.error('Error fetching user applications:', error.message);
        return res.status(500).json({ 
            error: 'Failed to fetch applications',
            message: error.message
        });
    }
};

const getCompanyApplications = async (req, res) => {
    try {
        const companyId = req.params.companyId;

        const jobs = await Job.find({ company: companyId }).select('_id');
        const jobIds = jobs.map(job => job._id);

        if (jobIds.length === 0) {
            return res.status(200).json([]);
        }

        const applications = await Application.find({ job: { $in: jobIds } })
            .populate({
                path: 'job',
                select: 'title location jobType salary company createdAt',
                populate: {
                    path: 'company',
                    select: 'name logo'
                }
            })
            .populate({
                path: 'user',
                select: 'email jobSeekerId',
                populate: {
                    path: 'jobSeekerId',
                    select: '-resumeText'
                }
            })
            .sort({ createdAt: -1 });

        await ensureReferenceNumbers(applications, Application, 'candidateNumber', 'CAN');

        return res.status(200).json(applications);
    } catch (error) {
        console.error('Error fetching company applications:', error.message);
        return res.status(500).json({
            error: 'Failed to fetch company applications',
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
    getCompanyApplications,
    updateApplication
};
