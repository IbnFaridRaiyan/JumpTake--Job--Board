const MessageThread = require('../models/MessageThread');
const JobSeeker = require('../models/JobSeeker');

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

    const allowedTags = new Set(['p', 'br', 'strong', 'b', 'em', 'i', 'u', 'ul', 'ol', 'li', 'div', 'span']);

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
    .populate('company', 'name industry')
    .populate('candidate', 'name email skills education experience')
    .populate('candidateUser', 'email');

const appendMessage = async (thread, senderType, bodyHtml) => {
    const sanitizedHtml = sanitizeMessageHtml(bodyHtml);
    const bodyText = stripHtml(sanitizedHtml);

    if (!bodyText) {
        throw new Error('Message cannot be empty');
    }

    thread.messages.push({
        senderType,
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

const replyToThread = async (req, res) => {
    try {
        const { senderType, bodyHtml } = req.body;
        const thread = await MessageThread.findById(req.params.threadId);

        if (!thread) {
            return res.status(404).json({ error: 'Message thread not found' });
        }

        if (!['employer', 'candidate'].includes(senderType)) {
            return res.status(400).json({ error: 'Sender must be employer or candidate' });
        }

        await appendMessage(thread, senderType, bodyHtml);

        const populatedThread = await populateThread(MessageThread.findById(thread._id));
        return res.status(200).json(populatedThread);
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
        const threads = await populateThread(
            MessageThread.find({ candidateUser: req.params.userId }).sort({ lastMessageAt: -1 })
        );

        return res.status(200).json(threads);
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
    replyToThread,
    getCompanyThreads,
    getCandidateThreads
};
