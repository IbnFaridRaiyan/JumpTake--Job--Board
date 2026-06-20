const MessageThread = require('../models/MessageThread');
const JobSeeker = require('../models/JobSeeker');
const CandidateConnection = require('../models/CandidateConnection');
const { createNotification } = require('./notificationController');
const { getAuthenticatedUserId } = require('../utils/candidateAuth');

const sanitizeStyleAttribute = (styleValue = '') => {
    const allowedProperties = new Set([
        'font-weight',
        'font-style',
        'text-decoration',
        'text-align',
        'list-style-type'
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

            const sanitizedValue = rest.join(':').trim().replace(/[^a-zA-Z0-9,\-"'()\s]/g, '');
            return sanitizedValue ? `${normalizedProperty}: ${sanitizedValue}` : null;
        })
        .filter(Boolean)
        .join('; ');
};

const sanitizeMessageHtml = (html = '') => {
    if (typeof html !== 'string') {
        return '';
    }

    const allowedTags = new Set(['p', 'br', 'strong', 'b', 'em', 'i', 'u', 'ul', 'ol', 'li', 'div', 'span', 'img']);
    const sanitizeAttribute = (value = '') => value.replace(/[<>"']/g, '');
    const isSafeEmojiSrc = (src = '') => /^\/static\/media\/[^<>"']+\.png(?:\?[^<>"']*)?$/i.test(src)
        || /^https?:\/\/[^/]+\/static\/media\/[^<>"']+\.png(?:\?[^<>"']*)?$/i.test(src);

    return html
        .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, '')
        .replace(/<style[\s\S]*?>[\s\S]*?<\/style>/gi, '')
        .replace(/\son[a-z]+\s*=\s*(['"]).*?\1/gi, '')
        .replace(/\shref\s*=\s*(['"])javascript:.*?\1/gi, '')
        .replace(/<([^>]+)>/g, (match, tagContent) => {
            const trimmedTag = tagContent.trim();
            const isClosingTag = trimmedTag.startsWith('/');
            const normalizedTag = trimmedTag.replace(/^\//, '').split(/\s+/)[0].toLowerCase();

            if (!allowedTags.has(normalizedTag)) {
                return '';
            }

            if (isClosingTag) {
                return `</${normalizedTag}>`;
            }

            if (normalizedTag === 'img') {
                const srcMatch = trimmedTag.match(/\ssrc\s*=\s*(['"])(.*?)\1/i);
                const src = srcMatch ? srcMatch[2].trim() : '';

                if (!isSafeEmojiSrc(src)) {
                    return '';
                }

                const altMatch = trimmedTag.match(/\salt\s*=\s*(['"])(.*?)\1/i);
                const alt = altMatch ? sanitizeAttribute(altMatch[2].trim()) : 'emoji';
                return `<img src="${sanitizeAttribute(src)}" alt="${alt}" class="chat-emoji-inline">`;
            }

            const styleMatch = trimmedTag.match(/style\s*=\s*(['"])(.*?)\1/i);
            const sanitizedStyle = styleMatch ? sanitizeStyleAttribute(styleMatch[2]) : '';
            return `<${normalizedTag}${sanitizedStyle ? ` style="${sanitizedStyle}"` : ''}>`;
        })
        .trim();
};

const stripHtml = (html = '') => (
    html
        .replace(/<br\s*\/?>/gi, '\n')
        .replace(/<\/(p|div|li)>/gi, '\n')
        .replace(/<[^>]+>/g, ' ')
        .replace(/\n{3,}/g, '\n\n')
        .replace(/[ \t]{2,}/g, ' ')
        .trim()
);

const populateThread = (query) => query
    .populate('company', 'name industry logo')
    .populate('candidate', 'name email profileImage skills education experience')
    .populate('candidateUser', 'email')
    .populate('participantUsers', 'jumptakeId')
    .populate('candidateProfiles', 'name skills education experience achievements interests hobbies user');

const getDirectKey = (firstUserId, secondUserId) => (
    [String(firstUserId), String(secondUserId)].sort().join(':')
);

const getCandidateRelationship = (firstUserId, secondUserId) => (
    CandidateConnection.findOne({ pairKey: getDirectKey(firstUserId, secondUserId) })
);

const sanitizeDirectThread = (thread) => {
    const serialized = thread?.toObject ? thread.toObject() : { ...thread };
    if (serialized.conversationType !== 'candidate-candidate') {
        return serialized;
    }

    if (serialized.candidate) {
        delete serialized.candidate.email;
    }
    if (serialized.candidateUser) {
        delete serialized.candidateUser.email;
    }
    (serialized.candidateProfiles || []).forEach((profile) => {
        delete profile.email;
        delete profile.phone;
        delete profile.address;
        delete profile.location;
    });
    (serialized.participantUsers || []).forEach((participant) => {
        delete participant.email;
    });

    return serialized;
};

const canSendDirectMessage = (thread, senderUserId, relationship) => {
    if (relationship?.status === 'blocked') {
        return { allowed: false, error: 'Messaging is unavailable for this connection' };
    }

    if (relationship?.status === 'accepted') {
        return { allowed: true };
    }

    const messages = thread?.messages || [];
    if (messages.length === 0) {
        return { allowed: true };
    }

    const participatingSenders = new Set(
        messages.map((message) => String(message.senderUser || '')).filter(Boolean)
    );

    if (participatingSenders.size >= 2) {
        return { allowed: true };
    }

    if (!participatingSenders.has(String(senderUserId))) {
        return { allowed: true };
    }

    return {
        allowed: false,
        error: 'You can send one introductory message until this candidate replies or accepts your friend invitation.'
    };
};

const appendMessage = async (thread, senderType, bodyHtml, senderUserId = null) => {
    const sanitizedHtml = sanitizeMessageHtml(bodyHtml);
    const hasEmoji = /<img\b/i.test(sanitizedHtml);
    const bodyText = stripHtml(sanitizedHtml) || (hasEmoji ? 'Emoji' : '');

    if (!bodyText) {
        throw new Error('Message cannot be empty');
    }

    thread.messages.push({
        senderType,
        ...(senderUserId ? { senderUser: senderUserId } : {}),
        bodyHtml: sanitizedHtml,
        bodyText,
        createdAt: new Date()
    });
    thread.lastMessageAt = new Date();
    await thread.save();
    return thread;
};

const createOrReplyMessage = async (req, res) => {
    try {
        const { companyId, candidateId, candidateUserId, senderType, bodyHtml } = req.body;

        if (!companyId || !senderType || !bodyHtml) {
            return res.status(400).json({ error: 'Company, sender, and message are required' });
        }

        if (!['employer', 'candidate'].includes(senderType)) {
            return res.status(400).json({ error: 'Sender must be employer or candidate' });
        }

        let candidate = candidateId ? await JobSeeker.findById(candidateId) : null;
        let resolvedCandidateUserId = candidateUserId || candidate?.user;

        if (!candidate && candidateUserId) {
            candidate = await JobSeeker.findOne({ user: candidateUserId });
        }

        if (!candidate || !resolvedCandidateUserId) {
            return res.status(400).json({ error: 'This candidate is not linked to a user account yet' });
        }

        let thread = await MessageThread.findOne({
            company: companyId,
            candidateUser: resolvedCandidateUserId
        });

        if (!thread) {
            thread = new MessageThread({
                company: companyId,
                candidate: candidate._id,
                candidateUser: resolvedCandidateUserId,
                messages: []
            });
        }

        await appendMessage(thread, senderType, bodyHtml);

        if (senderType === 'employer') {
            await createNotification({
                recipientType: 'candidate',
                recipientId: resolvedCandidateUserId,
                title: 'New message',
                message: 'You have a new message in your inbox. Open now?',
                section: 'inbox',
                actionLabel: 'Open inbox',
                payload: { threadId: String(thread._id) }
            });
        } else {
            await createNotification({
                recipientType: 'employer',
                recipientId: companyId,
                title: 'New message',
                message: 'You have new messages in your inbox. Open now?',
                section: 'inbox',
                actionLabel: 'Open inbox',
                payload: { threadId: String(thread._id) }
            });
        }

        const populatedThread = await populateThread(MessageThread.findById(thread._id));
        return res.status(201).json(populatedThread);
    } catch (error) {
        console.error('Error sending message:', error.message);
        return res.status(500).json({
            error: error.message || 'Failed to send message',
            message: error.message
        });
    }
};

const createCandidateDirectMessage = async (req, res) => {
    try {
        const authenticatedUserId = getAuthenticatedUserId(req);
        const { senderUserId, recipientCandidateId, bodyHtml } = req.body;

        if (!senderUserId || !recipientCandidateId || !bodyHtml) {
            return res.status(400).json({ error: 'Sender, recipient, and message are required' });
        }

        if (String(senderUserId) !== authenticatedUserId) {
            return res.status(403).json({ error: 'You cannot send messages from another account' });
        }

        const senderCandidate = await JobSeeker.findOne({ user: senderUserId });
        const recipientCandidate = await JobSeeker.findById(recipientCandidateId);
        const recipientUserId = recipientCandidate?.user;

        if (!senderCandidate) {
            return res.status(400).json({ error: 'Your candidate profile is not linked to your account yet' });
        }

        if (!recipientCandidate || !recipientUserId) {
            return res.status(400).json({ error: 'This candidate is not linked to a user account yet' });
        }

        if (String(senderUserId) === String(recipientUserId)) {
            return res.status(400).json({ error: 'You cannot message your own profile' });
        }

        const directKey = getDirectKey(senderUserId, recipientUserId);
        let thread = await MessageThread.findOne({
            conversationType: 'candidate-candidate',
            directKey
        });

        if (!thread) {
            thread = new MessageThread({
                conversationType: 'candidate-candidate',
                company: recipientCandidate._id,
                candidate: recipientCandidate._id,
                candidateUser: senderUserId,
                participantUsers: [senderUserId, recipientUserId],
                candidateProfiles: [senderCandidate._id, recipientCandidate._id],
                directKey,
                messages: []
            });
        }

        const relationship = await getCandidateRelationship(senderUserId, recipientUserId);
        const permission = canSendDirectMessage(thread, senderUserId, relationship);
        if (!permission.allowed) {
            return res.status(403).json({ error: permission.error });
        }

        await appendMessage(thread, 'candidate', bodyHtml, senderUserId);

        await createNotification({
            recipientType: 'candidate',
            recipientId: recipientUserId,
            title: 'New candidate message',
            message: `${senderCandidate.name || senderCandidate.email || 'A candidate'} sent you a message. Open inbox?`,
            section: 'inbox',
            actionLabel: 'Open inbox',
            payload: { threadId: String(thread._id) }
        });

        const populatedThread = await populateThread(MessageThread.findById(thread._id));
        return res.status(201).json(sanitizeDirectThread(populatedThread));
    } catch (error) {
        console.error('Error sending candidate direct message:', error.message);
        return res.status(500).json({
            error: error.message || 'Failed to send message',
            message: error.message
        });
    }
};

const replyToThread = async (req, res) => {
    try {
        const { senderType, bodyHtml, senderUserId } = req.body;
        const thread = await MessageThread.findById(req.params.threadId);

        if (!thread) {
            return res.status(404).json({ error: 'Message thread not found' });
        }

        if (!['employer', 'candidate'].includes(senderType)) {
            return res.status(400).json({ error: 'Sender must be employer or candidate' });
        }

        if (thread.conversationType === 'candidate-candidate') {
            const authenticatedUserId = getAuthenticatedUserId(req);
            if (senderType !== 'candidate' || String(senderUserId) !== authenticatedUserId) {
                return res.status(403).json({ error: 'You cannot reply from another account' });
            }

            const participantIds = (thread.participantUsers || []).map(String);
            if (!participantIds.includes(authenticatedUserId)) {
                return res.status(403).json({ error: 'You are not part of this conversation' });
            }

            const peerUserId = participantIds.find((participantId) => participantId !== authenticatedUserId);
            const relationship = await getCandidateRelationship(authenticatedUserId, peerUserId);
            const permission = canSendDirectMessage(thread, authenticatedUserId, relationship);
            if (!permission.allowed) {
                return res.status(403).json({ error: permission.error });
            }
        }

        await appendMessage(thread, senderType, bodyHtml, senderType === 'candidate' ? senderUserId : null);

        if (thread.conversationType === 'candidate-candidate') {
            const recipientUserId = (thread.participantUsers || [])
                .map((participant) => String(participant))
                .find((participant) => participant !== String(senderUserId || ''));

            if (recipientUserId) {
                await createNotification({
                    recipientType: 'candidate',
                    recipientId: recipientUserId,
                    title: 'New candidate message',
                    message: 'You have a new candidate message. Open inbox?',
                    section: 'inbox',
                    actionLabel: 'Open inbox',
                    payload: { threadId: String(thread._id) }
                });
            }
        } else if (senderType === 'employer' && thread.candidateUser) {
            await createNotification({
                recipientType: 'candidate',
                recipientId: thread.candidateUser,
                title: 'New message',
                message: 'You have a new message in your inbox. Open now?',
                section: 'inbox',
                actionLabel: 'Open inbox',
                payload: { threadId: String(thread._id) }
            });
        } else if (senderType === 'candidate' && thread.company) {
            await createNotification({
                recipientType: 'employer',
                recipientId: thread.company,
                title: 'New message',
                message: 'You have new messages in your inbox. Open now?',
                section: 'inbox',
                actionLabel: 'Open inbox',
                payload: { threadId: String(thread._id) }
            });
        }

        const populatedThread = await populateThread(MessageThread.findById(thread._id));
        return res.status(200).json(
            thread.conversationType === 'candidate-candidate'
                ? sanitizeDirectThread(populatedThread)
                : populatedThread
        );
    } catch (error) {
        console.error('Error replying to message thread:', error.message);
        return res.status(500).json({
            error: error.message || 'Failed to send reply',
            message: error.message
        });
    }
};

const getCompanyThreads = async (req, res) => {
    try {
        const threads = await populateThread(
            MessageThread.find({ company: req.params.companyId }).sort({ lastMessageAt: -1 })
        );

        return res.status(200).json(threads);
    } catch (error) {
        console.error('Error fetching company inbox:', error.message);
        return res.status(500).json({
            error: 'Failed to fetch inbox',
            message: error.message
        });
    }
};

const getCandidateThreads = async (req, res) => {
    try {
        const authenticatedUserId = getAuthenticatedUserId(req);
        if (String(req.params.userId) !== authenticatedUserId) {
            return res.status(403).json({ error: 'You cannot access another candidate inbox' });
        }

        const threads = await populateThread(
            MessageThread.find({
                $or: [
                    { candidateUser: req.params.userId },
                    { participantUsers: req.params.userId }
                ]
            }).sort({ lastMessageAt: -1 })
        );

        return res.status(200).json(threads.map(sanitizeDirectThread));
    } catch (error) {
        console.error('Error fetching candidate inbox:', error.message);
        return res.status(500).json({
            error: 'Failed to fetch inbox',
            message: error.message
        });
    }
};

module.exports = {
    createOrReplyMessage,
    createCandidateDirectMessage,
    replyToThread,
    getCompanyThreads,
    getCandidateThreads
};
