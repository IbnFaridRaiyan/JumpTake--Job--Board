const CandidateConnection = require('../models/CandidateConnection');
const JobSeeker = require('../models/JobSeeker');
const User = require('../models/User');
const { createNotification } = require('./notificationController');
const { getAuthenticatedUserId, requireSameUser } = require('../utils/candidateAuth');

const pairKeyFor = (firstUserId, secondUserId) => (
    [String(firstUserId), String(secondUserId)].sort().join(':')
);

const valuesToStrings = (value) => {
    if (!value) {
        return [];
    }

    if (Array.isArray(value)) {
        return value.flatMap(valuesToStrings);
    }

    if (typeof value === 'object') {
        return Object.values(value).flatMap(valuesToStrings);
    }

    return String(value)
        .split(/[\n,;|]+/)
        .map((item) => item.trim())
        .filter(Boolean);
};

const STOP_WORDS = new Set([
    'and', 'the', 'with', 'from', 'for', 'in', 'of', 'to', 'at', 'a', 'an',
    'present', 'current', 'university', 'college', 'school', 'certificate',
    'degree', 'bachelor', 'master', 'intern', 'internship'
]);

const normalizePhrase = (value) => String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9+#.]+/g, ' ')
    .trim();

const tokenSet = (value) => {
    const tokens = new Set();
    valuesToStrings(value).forEach((entry) => {
        normalizePhrase(entry).split(/\s+/).forEach((token) => {
            if (token.length >= 3 && !STOP_WORDS.has(token)) {
                tokens.add(token);
            }
        });
    });
    return tokens;
};

const skillMap = (value) => {
    const map = new Map();
    valuesToStrings(value).forEach((skill) => {
        const normalized = normalizePhrase(skill);
        if (normalized) {
            map.set(normalized, skill);
        }
    });
    return map;
};

const intersection = (first, second) => (
    [...first].filter((value) => second.has(value))
);

const summarizeMatch = (viewer, candidate) => {
    const viewerSkills = skillMap(viewer.skills);
    const candidateSkills = skillMap(candidate.skills);
    const matchedSkills = [...viewerSkills.keys()]
        .filter((skill) => candidateSkills.has(skill))
        .map((skill) => candidateSkills.get(skill))
        .slice(0, 6);

    const matchedEducation = intersection(tokenSet(viewer.education), tokenSet(candidate.education)).slice(0, 6);
    const matchedExperience = intersection(tokenSet(viewer.experience), tokenSet(candidate.experience)).slice(0, 6);

    return {
        skills: matchedSkills,
        education: matchedEducation,
        experience: matchedExperience,
        score: (matchedSkills.length * 3) + (matchedEducation.length * 2) + (matchedExperience.length * 2)
    };
};

const publicCandidate = (candidate, matchSummary, connectionStatus) => ({
    _id: candidate._id,
    user: candidate.user,
    name: candidate.name || 'Candidate',
    profileImage: candidate.profileImage || '',
    skills: candidate.skills || [],
    education: candidate.education || [],
    degrees: candidate.degrees || [],
    experience: candidate.experience || [],
    achievements: candidate.achievements || [],
    interests: candidate.interests || [],
    hobbies: candidate.hobbies || [],
    matchSummary,
    connectionStatus
});

const getMatchedCandidates = async (req, res) => {
    try {
        const userId = requireSameUser(req, req.params.userId);
        const viewer = await JobSeeker.findOne({ user: userId });

        if (!viewer) {
            return res.status(200).json([]);
        }

        const candidates = await JobSeeker.find({
            user: { $exists: true, $ne: viewer.user },
            _id: { $ne: viewer._id }
        }).sort({ createdAt: -1 });

        const connections = await CandidateConnection.find({
            $or: [{ requester: userId }, { recipient: userId }]
        });
        const connectionMap = new Map(connections.map((connection) => [
            connection.pairKey,
            {
                id: connection._id,
                status: connection.status,
                direction: String(connection.requester) === userId ? 'outgoing' : 'incoming',
                blockedByMe: String(connection.blockedBy || '') === userId
            }
        ]));

        const matched = candidates
            .map((candidate) => {
                const matchSummary = summarizeMatch(viewer, candidate);
                const candidateUserId = String(candidate.user || '');
                return publicCandidate(
                    candidate,
                    matchSummary,
                    connectionMap.get(pairKeyFor(userId, candidateUserId)) || null
                );
            })
            .filter((candidate) => candidate.matchSummary.score > 0)
            .filter((candidate) => candidate.connectionStatus?.status !== 'blocked')
            .sort((first, second) => second.matchSummary.score - first.matchSummary.score);

        return res.status(200).json(matched);
    } catch (error) {
        return res.status(error.status || 500).json({ error: error.message || 'Failed to load matched candidates' });
    }
};

const getMyNetworkProfile = async (req, res) => {
    try {
        const userId = requireSameUser(req, req.params.userId);
        const user = await User.findById(userId).select('jumptakeId createdAt');

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        return res.status(200).json({
            jumptakeId: user.jumptakeId || null,
            legacyAccount: !user.jumptakeId
        });
    } catch (error) {
        return res.status(error.status || 500).json({ error: error.message || 'Failed to load JumpTake ID' });
    }
};

const sendFriendRequest = async (req, res) => {
    try {
        const requesterId = getAuthenticatedUserId(req);
        const { jumptakeId, recipientCandidateId } = req.body;
        let recipient = null;

        if (jumptakeId) {
            recipient = await User.findOne({ jumptakeId: String(jumptakeId).trim().toLowerCase() });
        } else if (recipientCandidateId) {
            const candidate = await JobSeeker.findById(recipientCandidateId);
            recipient = candidate?.user ? await User.findById(candidate.user) : null;
        }

        if (!recipient) {
            return res.status(404).json({ error: 'No candidate was found with that JumpTake ID' });
        }

        if (String(recipient._id) === requesterId) {
            return res.status(400).json({ error: 'You cannot add your own account' });
        }

        const pairKey = pairKeyFor(requesterId, recipient._id);
        const existing = await CandidateConnection.findOne({ pairKey });

        if (existing?.status === 'blocked') {
            return res.status(403).json({ error: 'This connection is unavailable' });
        }

        if (existing?.status === 'accepted') {
            return res.status(409).json({ error: 'You are already friends' });
        }

        if (existing?.status === 'pending') {
            return res.status(409).json({ error: 'A friend invitation is already pending' });
        }

        const connection = existing || new CandidateConnection({ pairKey });
        connection.requester = requesterId;
        connection.recipient = recipient._id;
        connection.status = 'pending';
        connection.blockedBy = null;
        connection.respondedAt = null;
        await connection.save();

        const requesterProfile = await JobSeeker.findOne({ user: requesterId }).select('name');
        await createNotification({
            recipientType: 'candidate',
            recipientId: recipient._id,
            title: 'New friend invitation',
            message: `${requesterProfile?.name || 'A candidate'} sent you a friend invitation.`,
            section: 'friend-invitations',
            actionLabel: 'Review invitation',
            payload: { connectionId: String(connection._id) }
        });

        return res.status(201).json({ message: 'Friend invitation sent', connection });
    } catch (error) {
        return res.status(error.status || 500).json({ error: error.message || 'Failed to send friend invitation' });
    }
};

const getConnections = async (req, res) => {
    try {
        const userId = requireSameUser(req, req.params.userId);
        const connections = await CandidateConnection.find({
            $or: [{ requester: userId }, { recipient: userId }]
        })
            .populate('requester', 'jumptakeId')
            .populate('recipient', 'jumptakeId')
            .sort({ updatedAt: -1 });

        const relatedUserIds = connections.map((connection) => (
            String(connection.requester?._id) === userId
                ? connection.recipient?._id
                : connection.requester?._id
        )).filter(Boolean);
        const relatedUsers = await User.find({ _id: { $in: relatedUserIds } })
            .select('email jumptakeId');
        const userMap = new Map(relatedUsers.map((user) => [String(user._id), user]));
        const profiles = await JobSeeker.find({ user: { $in: relatedUserIds } })
            .select('user name email profileImage skills education experience achievements interests hobbies');
        const profileMap = new Map(profiles.map((profile) => [String(profile.user), profile]));

        const serialize = (connection) => {
            const requesterId = String(connection.requester?._id || connection.requester);
            const peerUser = requesterId === userId ? connection.recipient : connection.requester;
            const peerId = String(peerUser?._id || peerUser);
            const profile = profileMap.get(peerId);
            const peerAccount = userMap.get(peerId);
            const fallbackName = peerAccount?.email
                ? String(peerAccount.email).split('@')[0]
                : 'Candidate';

            return {
                _id: connection._id,
                status: connection.status,
                direction: requesterId === userId ? 'outgoing' : 'incoming',
                createdAt: connection.createdAt,
                peer: {
                    candidateId: profile?._id || null,
                    userId: peerId,
                    jumptakeId: peerUser?.jumptakeId || peerAccount?.jumptakeId || null,
                    name: profile?.name || fallbackName,
                    email: profile?.email || peerAccount?.email || '',
                    profileImage: profile?.profileImage || '',
                    skills: profile?.skills || [],
                    education: profile?.education || [],
                    experience: profile?.experience || [],
                    achievements: profile?.achievements || [],
                    interests: profile?.interests || [],
                    hobbies: profile?.hobbies || []
                }
            };
        };

        const serialized = connections.map(serialize);
        return res.status(200).json({
            incoming: serialized.filter((item) => item.status === 'pending' && item.direction === 'incoming'),
            outgoing: serialized.filter((item) => item.status === 'pending' && item.direction === 'outgoing'),
            friends: serialized.filter((item) => item.status === 'accepted')
        });
    } catch (error) {
        return res.status(error.status || 500).json({ error: error.message || 'Failed to load friend invitations' });
    }
};

const respondToConnection = async (req, res) => {
    try {
        const userId = getAuthenticatedUserId(req);
        const { action } = req.body;
        const connection = await CandidateConnection.findById(req.params.connectionId);

        if (!connection) {
            return res.status(404).json({ error: 'Friend invitation not found' });
        }

        const isParticipant = [connection.requester, connection.recipient]
            .some((participant) => String(participant) === userId);
        if (!isParticipant) {
            return res.status(403).json({ error: 'You cannot update this invitation' });
        }

        if (action === 'accept') {
            if (String(connection.recipient) !== userId || connection.status !== 'pending') {
                return res.status(400).json({ error: 'This invitation cannot be accepted' });
            }
            connection.status = 'accepted';
            connection.respondedAt = new Date();
        } else if (action === 'decline') {
            if (String(connection.recipient) !== userId || connection.status !== 'pending') {
                return res.status(400).json({ error: 'This invitation cannot be declined' });
            }
            connection.status = 'declined';
            connection.respondedAt = new Date();
        } else if (action === 'cancel') {
            if (String(connection.requester) !== userId || connection.status !== 'pending') {
                return res.status(400).json({ error: 'This invitation cannot be cancelled' });
            }
            await connection.deleteOne();
            return res.status(200).json({ message: 'Invitation cancelled' });
        } else if (action === 'unfriend') {
            if (connection.status !== 'accepted') {
                return res.status(400).json({ error: 'This connection cannot be removed' });
            }
            await connection.deleteOne();
            return res.status(200).json({ message: 'Friend removed' });
        } else if (action === 'block') {
            connection.status = 'blocked';
            connection.blockedBy = userId;
            connection.respondedAt = new Date();
        } else {
            return res.status(400).json({ error: 'Use accept, decline, cancel, unfriend, or block' });
        }

        await connection.save();

        if (action === 'accept') {
            const recipientProfile = await JobSeeker.findOne({ user: connection.recipient }).select('name');
            await createNotification({
                recipientType: 'candidate',
                recipientId: connection.requester,
                title: 'Friend request accepted',
                message: `${recipientProfile?.name || 'A candidate'} accepted your friend request.`,
                section: 'friend-invitations',
                actionLabel: 'View profile',
                payload: {
                    connectionId: String(connection._id),
                    candidateUserId: String(connection.recipient)
                }
            });
        }

        return res.status(200).json({ message: `Invitation ${action}ed`, connection });
    } catch (error) {
        return res.status(error.status || 500).json({ error: error.message || 'Failed to update friend invitation' });
    }
};

module.exports = {
    getMatchedCandidates,
    getMyNetworkProfile,
    sendFriendRequest,
    getConnections,
    respondToConnection,
    pairKeyFor
};
