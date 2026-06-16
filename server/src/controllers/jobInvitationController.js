const JobInvitation = require('../models/JobInvitation');
const Job = require('../models/Job');
const JobSeeker = require('../models/JobSeeker');
const TalentBookmark = require('../models/TalentBookmark');
const { createNotification } = require('./notificationController');

const normalizeSkill = (value = '') => String(value).trim().toLowerCase();

const getSkillList = (value) => {
    if (Array.isArray(value)) {
        return value.map((item) => String(item).trim()).filter(Boolean);
    }

    if (typeof value === 'string') {
        return value.split(',').map((item) => item.trim()).filter(Boolean);
    }

    return [];
};

const buildCandidateMatch = (job, candidate) => {
    const jobSkills = new Set(getSkillList(job.skills).map(normalizeSkill));
    const candidateSkills = getSkillList(candidate.skills);
    const matchedSkills = candidateSkills.filter((skill) => jobSkills.has(normalizeSkill(skill)));

    return {
        candidate,
        matchScore: matchedSkills.length,
        matchedSkills
    };
};

const getMatchingCandidates = async (req, res) => {
    try {
        const { companyId, jobId } = req.params;
        const job = await Job.findById(jobId);

        if (!job) {
            return res.status(404).json({ error: 'Job not found' });
        }

        if (String(job.company) !== String(companyId)) {
            return res.status(403).json({ error: 'This job does not belong to your company' });
        }

        const candidates = await JobSeeker.find({ user: { $exists: true, $ne: null } }).sort({ createdAt: -1 });
        const rows = candidates
            .map((candidate) => buildCandidateMatch(job, candidate))
            .filter((row) => row.matchScore > 0)
            .sort((left, right) => right.matchScore - left.matchScore);

        return res.status(200).json(rows);
    } catch (error) {
        console.error('Error fetching matching candidates:', error.message);
        return res.status(500).json({
            error: 'Failed to fetch matching candidates',
            message: error.message
        });
    }
};

const sendJobInvitations = async (req, res) => {
    try {
        const { companyId, jobId, candidateIds = [], sendToAllBookmarked = false, message = '' } = req.body;

        if (!companyId || !jobId) {
            return res.status(400).json({ error: 'Company and job are required' });
        }

        const job = await Job.findById(jobId).populate('company', 'name');
        if (!job) {
            return res.status(404).json({ error: 'Job not found' });
        }

        if (String(job.company?._id || job.company) !== String(companyId)) {
            return res.status(403).json({ error: 'This job does not belong to your company' });
        }

        let ids = Array.isArray(candidateIds) ? candidateIds.filter(Boolean) : [];

        if (sendToAllBookmarked) {
            const bookmarks = await TalentBookmark.find({ company: companyId });
            ids = [
                ...ids,
                ...bookmarks.map((bookmark) => String(bookmark.candidate)).filter(Boolean)
            ];
        }

        ids = [...new Set(ids.map(String))];

        if (ids.length === 0) {
            return res.status(400).json({ error: 'Choose at least one candidate to invite' });
        }

        const candidates = await JobSeeker.find({ _id: { $in: ids }, user: { $exists: true, $ne: null } });
        const invitations = [];

        for (const candidate of candidates) {
            const invitation = await JobInvitation.findOneAndUpdate(
                { job: job._id, candidateUser: candidate.user },
                {
                    company: companyId,
                    job: job._id,
                    candidate: candidate._id,
                    candidateUser: candidate.user,
                    message: message || `${job.company?.name || 'An employer'} invited you to apply for ${job.title}.`,
                    status: 'Sent'
                },
                { upsert: true, new: true, setDefaultsOnInsert: true }
            );

            invitations.push(invitation);

            await createNotification({
                recipientType: 'candidate',
                recipientId: candidate.user,
                title: 'Job invitation',
                message: `${job.company?.name || 'A company'} has invited you for the ${job.title} role. Apply now?`,
                section: 'job-feed',
                actionLabel: 'Open job',
                payload: {
                    jobId: String(job._id),
                    jobTitle: job.title,
                    invitationId: String(invitation._id),
                    intent: 'apply'
                }
            });
        }

        return res.status(201).json({
            message: `Sent ${invitations.length} job invitation${invitations.length === 1 ? '' : 's'}.`,
            invitations
        });
    } catch (error) {
        console.error('Error sending job invitations:', error.message);
        return res.status(500).json({
            error: 'Failed to send job invitations',
            message: error.message
        });
    }
};

const getCandidateJobInvitations = async (req, res) => {
    try {
        const invitations = await JobInvitation.find({ candidateUser: req.params.userId })
            .populate({
                path: 'job',
                select: 'title jobNumber location jobType salary description company',
                populate: {
                    path: 'company',
                    select: 'name industry headquarters description website'
                }
            })
            .populate('company', 'name industry')
            .sort({ createdAt: -1 });

        return res.status(200).json(invitations);
    } catch (error) {
        console.error('Error fetching job invitations:', error.message);
        return res.status(500).json({
            error: 'Failed to fetch job invitations',
            message: error.message
        });
    }
};

module.exports = {
    getMatchingCandidates,
    sendJobInvitations,
    getCandidateJobInvitations
};
