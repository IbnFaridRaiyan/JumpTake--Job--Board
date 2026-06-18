const DraftApplication = require('../models/DraftApplication');
const JobBookmark = require('../models/JobBookmark');
const ApplicationBookmark = require('../models/ApplicationBookmark');
const TalentBookmark = require('../models/TalentBookmark');
const CandidateBookmark = require('../models/CandidateBookmark');
const CandidateLike = require('../models/CandidateLike');
const User = require('../models/User');
const Job = require('../models/Job');
const JobSeeker = require('../models/JobSeeker');

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
        skills: normalizeListValue(source.skills ?? baseProfile.skills ?? []),
        interests: normalizeListValue(source.interests ?? baseProfile.interests ?? []),
        hobbies: normalizeListValue(source.hobbies ?? baseProfile.hobbies ?? []),
        education: normalizeListValue(source.education ?? baseProfile.education ?? []),
        experience: normalizeListValue(source.experience ?? baseProfile.experience ?? []),
        achievements: normalizeListValue(source.achievements ?? baseProfile.achievements ?? [])
    };
};

const resolveBaseProfile = async (userId) => {
    const user = await User.findById(userId);
    if (!user) {
        throw new Error('User not found');
    }

    const baseProfile = user.jobSeekerId
        ? await JobSeeker.findById(user.jobSeekerId).lean()
        : null;

    return { user, baseProfile };
};

const createOrUpdateDraftApplication = async (req, res) => {
    try {
        const { draftId, jobId, userId, message, coverLetterHtml, profileSnapshot } = req.body;

        if (!jobId || !userId) {
            return res.status(400).json({ error: 'Job ID and user ID are required' });
        }

        const job = await Job.findById(jobId);
        if (!job) {
            return res.status(404).json({ error: 'Job not found' });
        }

        const { user, baseProfile } = await resolveBaseProfile(userId);
        const draft = draftId
            ? await DraftApplication.findOne({ _id: draftId, user: userId })
            : await DraftApplication.findOne({ job: jobId, user: userId });

        const nextDraft = draft || new DraftApplication({ job: jobId, user: userId });
        nextDraft.message = message || '';
        nextDraft.coverLetterHtml = sanitizeCoverLetterHtml(coverLetterHtml || '');
        nextDraft.coverLetterText = stripHtml(coverLetterHtml || '');
        nextDraft.profileSnapshot = buildProfileSnapshot(profileSnapshot, user, baseProfile);

        await nextDraft.save();
        await nextDraft.populate({
            path: 'job',
            populate: {
                path: 'company',
                select: 'name industry'
            }
        });

        return res.status(draft ? 200 : 201).json(nextDraft);
    } catch (error) {
        console.error('Error saving draft application:', error.message);
        return res.status(500).json({
            error: 'Failed to save draft application',
            message: error.message
        });
    }
};

const getUserDraftApplications = async (req, res) => {
    try {
        const drafts = await DraftApplication.find({ user: req.params.userId })
            .populate({
                path: 'job',
                populate: {
                    path: 'company',
                    select: 'name industry'
                }
            })
            .sort({ updatedAt: -1 });

        return res.status(200).json(drafts);
    } catch (error) {
        console.error('Error fetching draft applications:', error.message);
        return res.status(500).json({
            error: 'Failed to fetch draft applications',
            message: error.message
        });
    }
};

const deleteDraftApplication = async (req, res) => {
    try {
        const deletedDraft = await DraftApplication.findByIdAndDelete(req.params.id);
        if (!deletedDraft) {
            return res.status(404).json({ error: 'Draft application not found' });
        }

        return res.status(200).json({ message: 'Draft application deleted successfully' });
    } catch (error) {
        console.error('Error deleting draft application:', error.message);
        return res.status(500).json({
            error: 'Failed to delete draft application',
            message: error.message
        });
    }
};

const createJobBookmark = async (req, res) => {
    try {
        const { userId, jobId } = req.body;

        if (!userId || !jobId) {
            return res.status(400).json({ error: 'User ID and job ID are required' });
        }

        const bookmark = await JobBookmark.findOneAndUpdate(
            { user: userId, job: jobId },
            { user: userId, job: jobId },
            { new: true, upsert: true, setDefaultsOnInsert: true }
        );

        return res.status(201).json(bookmark);
    } catch (error) {
        console.error('Error creating job bookmark:', error.message);
        return res.status(500).json({
            error: 'Failed to bookmark job',
            message: error.message
        });
    }
};

const getUserJobBookmarks = async (req, res) => {
    try {
        const bookmarks = await JobBookmark.find({ user: req.params.userId })
            .populate({
                path: 'job',
                populate: {
                    path: 'company',
                    select: 'name industry'
                }
            })
            .sort({ createdAt: -1 });

        return res.status(200).json(bookmarks);
    } catch (error) {
        console.error('Error fetching job bookmarks:', error.message);
        return res.status(500).json({
            error: 'Failed to fetch job bookmarks',
            message: error.message
        });
    }
};

const deleteJobBookmark = async (req, res) => {
    try {
        await JobBookmark.findOneAndDelete({
            user: req.params.userId,
            job: req.params.jobId
        });

        return res.status(200).json({ message: 'Job bookmark removed successfully' });
    } catch (error) {
        console.error('Error deleting job bookmark:', error.message);
        return res.status(500).json({
            error: 'Failed to remove job bookmark',
            message: error.message
        });
    }
};

const createApplicationBookmark = async (req, res) => {
    try {
        const { companyId, applicationId } = req.body;

        if (!companyId || !applicationId) {
            return res.status(400).json({ error: 'Company ID and application ID are required' });
        }

        const bookmark = await ApplicationBookmark.findOneAndUpdate(
            { company: companyId, application: applicationId },
            { company: companyId, application: applicationId },
            { new: true, upsert: true, setDefaultsOnInsert: true }
        );

        return res.status(201).json(bookmark);
    } catch (error) {
        console.error('Error creating application bookmark:', error.message);
        return res.status(500).json({
            error: 'Failed to bookmark application',
            message: error.message
        });
    }
};

const getCompanyApplicationBookmarks = async (req, res) => {
    try {
        const bookmarks = await ApplicationBookmark.find({ company: req.params.companyId })
            .populate({
                path: 'application',
                populate: [
                    {
                        path: 'job',
                        populate: {
                            path: 'company',
                            select: 'name'
                        }
                    },
                    {
                        path: 'user',
                        select: 'email jobSeekerId',
                        populate: {
                            path: 'jobSeekerId',
                            select: '-resumeText'
                        }
                    }
                ]
            })
            .sort({ createdAt: -1 });

        return res.status(200).json(bookmarks);
    } catch (error) {
        console.error('Error fetching application bookmarks:', error.message);
        return res.status(500).json({
            error: 'Failed to fetch bookmarked applications',
            message: error.message
        });
    }
};

const deleteApplicationBookmark = async (req, res) => {
    try {
        await ApplicationBookmark.findOneAndDelete({
            company: req.params.companyId,
            application: req.params.applicationId
        });

        return res.status(200).json({ message: 'Application bookmark removed successfully' });
    } catch (error) {
        console.error('Error deleting application bookmark:', error.message);
        return res.status(500).json({
            error: 'Failed to remove application bookmark',
            message: error.message
        });
    }
};

const createTalentBookmark = async (req, res) => {
    try {
        const { companyId, candidateId } = req.body;

        if (!companyId || !candidateId) {
            return res.status(400).json({ error: 'Company ID and candidate ID are required' });
        }

        const bookmark = await TalentBookmark.findOneAndUpdate(
            { company: companyId, candidate: candidateId },
            { company: companyId, candidate: candidateId },
            { new: true, upsert: true, setDefaultsOnInsert: true }
        );

        return res.status(201).json(bookmark);
    } catch (error) {
        console.error('Error creating talent bookmark:', error.message);
        return res.status(500).json({
            error: 'Failed to bookmark talent',
            message: error.message
        });
    }
};

const getCompanyTalentBookmarks = async (req, res) => {
    try {
        const bookmarks = await TalentBookmark.find({ company: req.params.companyId })
            .populate('candidate')
            .sort({ createdAt: -1 });

        return res.status(200).json(bookmarks);
    } catch (error) {
        console.error('Error fetching talent bookmarks:', error.message);
        return res.status(500).json({
            error: 'Failed to fetch bookmarked talents',
            message: error.message
        });
    }
};

const deleteTalentBookmark = async (req, res) => {
    try {
        await TalentBookmark.findOneAndDelete({
            company: req.params.companyId,
            candidate: req.params.candidateId
        });

        return res.status(200).json({ message: 'Talent bookmark removed successfully' });
    } catch (error) {
        console.error('Error deleting talent bookmark:', error.message);
        return res.status(500).json({
            error: 'Failed to remove talent bookmark',
            message: error.message
        });
    }
};

const createCandidateBookmark = async (req, res) => {
    try {
        const { userId, candidateId } = req.body;

        if (!userId || !candidateId) {
            return res.status(400).json({ error: 'User ID and candidate ID are required' });
        }

        const bookmark = await CandidateBookmark.findOneAndUpdate(
            { user: userId, candidate: candidateId },
            { user: userId, candidate: candidateId },
            { new: true, upsert: true, setDefaultsOnInsert: true }
        ).populate('candidate', 'name skills education degrees experience achievements interests hobbies user');

        return res.status(201).json(bookmark);
    } catch (error) {
        console.error('Error creating candidate bookmark:', error.message);
        return res.status(500).json({
            error: 'Failed to bookmark candidate',
            message: error.message
        });
    }
};

const getUserCandidateBookmarks = async (req, res) => {
    try {
        const bookmarks = await CandidateBookmark.find({ user: req.params.userId })
            .populate('candidate', 'name skills education degrees experience achievements interests hobbies user')
            .sort({ createdAt: -1 });

        return res.status(200).json(bookmarks);
    } catch (error) {
        console.error('Error fetching candidate bookmarks:', error.message);
        return res.status(500).json({
            error: 'Failed to fetch bookmarked candidates',
            message: error.message
        });
    }
};

const deleteCandidateBookmark = async (req, res) => {
    try {
        await CandidateBookmark.findOneAndDelete({
            user: req.params.userId,
            candidate: req.params.candidateId
        });

        return res.status(200).json({ message: 'Candidate bookmark removed successfully' });
    } catch (error) {
        console.error('Error deleting candidate bookmark:', error.message);
        return res.status(500).json({
            error: 'Failed to remove candidate bookmark',
            message: error.message
        });
    }
};

const getCandidateLikeSummary = async (req, res) => {
    try {
        const { actorType, actorKey } = req.query;

        const counts = await CandidateLike.aggregate([
            {
                $group: {
                    _id: '$candidate',
                    count: { $sum: 1 }
                }
            }
        ]);

        const liked = actorType && actorKey
            ? await CandidateLike.find({ actorType, actorKey }).select('candidate')
            : [];

        return res.status(200).json({
            counts: counts.map((item) => ({
                candidateId: String(item._id),
                count: item.count
            })),
            likedCandidateIds: liked.map((item) => String(item.candidate))
        });
    } catch (error) {
        console.error('Error fetching candidate likes:', error.message);
        return res.status(500).json({
            error: 'Failed to fetch candidate likes',
            message: error.message
        });
    }
};

const toggleCandidateLike = async (req, res) => {
    try {
        const { candidateId, actorType, actorKey } = req.body;

        if (!candidateId || !actorType || !actorKey) {
            return res.status(400).json({ error: 'Candidate, actor type, and actor key are required' });
        }

        const existingLike = await CandidateLike.findOne({ candidate: candidateId, actorType, actorKey });
        let liked = false;

        if (existingLike) {
            await CandidateLike.findByIdAndDelete(existingLike._id);
        } else {
            await CandidateLike.create({ candidate: candidateId, actorType, actorKey });
            liked = true;
        }

        const count = await CandidateLike.countDocuments({ candidate: candidateId });

        return res.status(200).json({
            candidateId,
            liked,
            count
        });
    } catch (error) {
        console.error('Error toggling candidate like:', error.message);
        return res.status(500).json({
            error: 'Failed to update candidate like',
            message: error.message
        });
    }
};

module.exports = {
    createOrUpdateDraftApplication,
    getUserDraftApplications,
    deleteDraftApplication,
    createJobBookmark,
    getUserJobBookmarks,
    deleteJobBookmark,
    createApplicationBookmark,
    getCompanyApplicationBookmarks,
    deleteApplicationBookmark,
    createTalentBookmark,
    getCompanyTalentBookmarks,
    deleteTalentBookmark,
    createCandidateBookmark,
    getUserCandidateBookmarks,
    deleteCandidateBookmark,
    getCandidateLikeSummary,
    toggleCandidateLike
};
