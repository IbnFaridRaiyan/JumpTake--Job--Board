const MessageThread = require('../models/MessageThread');
const JobSeeker = require('../models/JobSeeker');
const CandidateConnection = require('../models/CandidateConnection');
const Employer = require('../models/Employer');
const User = require('../models/User');
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
    .populate('company', 'name industry logo founded headquarters website description')
    .populate('candidate', 'user name email profileImage coverImage skills education degrees experience achievements interests hobbies socialProfile')
    .populate('candidateUser', 'email jumptakeId lastOnlineAt messagePreferences')
    .populate('participantUsers', 'jumptakeId lastOnlineAt messagePreferences')
    .populate('candidateProfiles', 'name profileImage coverImage skills education degrees experience achievements interests hobbies socialProfile user');

const getDirectKey = (firstUserId, secondUserId) => (
    [String(firstUserId), String(secondUserId)].sort().join(':')
);

const getCandidateRelationship = (firstUserId, secondUserId) => (
    CandidateConnection.findOne({ pairKey: getDirectKey(firstUserId, secondUserId) })
);

const getUserStateKey = (userId) => `user:${String(userId || '')}`;
const getCompanyStateKey = (companyId) => `company:${String(companyId || '')}`;

const candidateAllowsMessageNotifications = async (userId) => {
    const user = await User.findById(userId).select('messagePreferences');
    return user?.messagePreferences?.messageNotifications !== false;
};

const companyAllowsMessageNotifications = async (companyId) => {
    const employer = await Employer.findOne({ companyId }).select('messagePreferences');
    return employer?.messagePreferences?.messageNotifications !== false;
};

const serializeThreadForViewer = (thread, actorKey = '', viewerUserId = '', relationship = null) => {
    const serialized = thread?.toObject ? thread.toObject() : { ...thread };
    const archivedFor = (serialized.archivedFor || []).map(String);
    const deletedFor = (serialized.deletedFor || []).map(String);
    const chatBlockedFor = (serialized.chatBlockedFor || []).map(String);

    serialized.viewerState = {
        archived: Boolean(actorKey && archivedFor.includes(actorKey)),
        deleted: Boolean(actorKey && deletedFor.includes(actorKey)),
        chatBlocked: Boolean(actorKey && chatBlockedFor.includes(actorKey)),
        blockedByPeer: serialized.conversationType === 'candidate-candidate'
            && chatBlockedFor.some((key) => key !== actorKey),
        isRequest: false,
        relationshipStatus: relationship?.status || ''
    };

    const directPeer = serialized.conversationType === 'candidate-candidate'
        ? (serialized.participantUsers || []).find((participant) => (
            String(participant?._id || participant) !== String(viewerUserId || '')
        ))
        : actorKey.startsWith('company:') ? serialized.candidateUser : null;
    const peerWorksInSilence = Boolean(directPeer?.messagePreferences?.workInSilence);
    serialized.viewerState.peerPresenceHidden = peerWorksInSilence;
    serialized.viewerState.peerLastOnlineAt = peerWorksInSilence ? null : (directPeer?.lastOnlineAt || null);
    serialized.viewerState.readReceiptsVisible = !peerWorksInSilence;

    const peerActorKey = serialized.conversationType === 'candidate-candidate'
        ? getUserStateKey(directPeer?._id || directPeer)
        : actorKey.startsWith('company:')
            ? getUserStateKey(serialized.candidateUser?._id || serialized.candidateUser)
            : getCompanyStateKey(serialized.company?._id || serialized.company);
    (serialized.messages || []).forEach((message) => {
        const ownMessage = serialized.conversationType === 'candidate-candidate'
            ? String(message.senderUser?._id || message.senderUser || '') === String(viewerUserId || '')
            : actorKey.startsWith('company:') ? message.senderType === 'employer' : message.senderType === 'candidate';
        message.readReceipt = Boolean(
            ownMessage
            && serialized.viewerState.readReceiptsVisible
            && (message.readBy || []).map(String).includes(peerActorKey)
        );
        delete message.readBy;
    });

    if (serialized.conversationType !== 'candidate-candidate') {
        return serialized;
    }

    const firstSenderId = String(serialized.messages?.[0]?.senderUser?._id || serialized.messages?.[0]?.senderUser || '');
    const senderIds = new Set((serialized.messages || [])
        .map((item) => String(item?.senderUser?._id || item?.senderUser || ''))
        .filter(Boolean));
    serialized.viewerState.isRequest = Boolean(
        viewerUserId
        && relationship?.status !== 'accepted'
        && firstSenderId
        && firstSenderId !== String(viewerUserId)
        && senderIds.size < 2
    );

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
        delete participant.messagePreferences;
    });
    if (serialized.candidateUser) {
        delete serialized.candidateUser.messagePreferences;
    }

    return serialized;
};

const canSendDirectMessage = (thread, senderUserId, relationship) => {
    if (relationship?.status === 'blocked') {
        return { allowed: false, error: 'Messaging is unavailable for this connection' };
    }

    if (relationship?.status === 'accepted') {
        const blockedKeys = (thread?.chatBlockedFor || []).map(String);
        if (blockedKeys.length) {
            return {
                allowed: false,
                error: blockedKeys.includes(getUserStateKey(senderUserId))
                    ? 'Unblock this chat before sending a message.'
                    : 'This contact is not accepting messages in this chat.'
            };
        }
        return { allowed: true };
    }

    const blockedKeys = (thread?.chatBlockedFor || []).map(String);
    if (blockedKeys.length) {
        return {
            allowed: false,
            error: blockedKeys.includes(getUserStateKey(senderUserId))
                ? 'Unblock this chat before sending a message.'
                : 'This contact is not accepting messages in this chat.'
        };
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

        if (senderType === 'employer' && await candidateAllowsMessageNotifications(resolvedCandidateUserId)) {
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
        const { senderUserId, recipientCandidateId, recipientUserId: requestedRecipientUserId, bodyHtml } = req.body;

        if (!senderUserId || (!recipientCandidateId && !requestedRecipientUserId) || !bodyHtml) {
            return res.status(400).json({ error: 'Sender, recipient, and message are required' });
        }

        if (String(senderUserId) !== authenticatedUserId) {
            return res.status(403).json({ error: 'You cannot send messages from another account' });
        }

        const senderCandidate = await JobSeeker.findOne({ user: senderUserId });
        const recipientCandidate = recipientCandidateId
            ? await JobSeeker.findById(recipientCandidateId)
            : await JobSeeker.findOne({ user: requestedRecipientUserId });
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

        if (await candidateAllowsMessageNotifications(recipientUserId)) {
            await createNotification({
                recipientType: 'candidate',
                recipientId: recipientUserId,
                title: 'New candidate message',
                message: `${senderCandidate.name || senderCandidate.email || 'A candidate'} sent you a message. Open inbox?`,
                section: 'inbox',
                actionLabel: 'Open inbox',
                payload: { threadId: String(thread._id) }
            });
        }

        const populatedThread = await populateThread(MessageThread.findById(thread._id));
        const relationshipAfterSend = await getCandidateRelationship(senderUserId, recipientUserId);
        return res.status(201).json(serializeThreadForViewer(
            populatedThread,
            getUserStateKey(senderUserId),
            senderUserId,
            relationshipAfterSend
        ));
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

            if (recipientUserId && await candidateAllowsMessageNotifications(recipientUserId)) {
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
        } else if (senderType === 'employer' && thread.candidateUser && await candidateAllowsMessageNotifications(thread.candidateUser)) {
            await createNotification({
                recipientType: 'candidate',
                recipientId: thread.candidateUser,
                title: 'New message',
                message: 'You have a new message in your inbox. Open now?',
                section: 'inbox',
                actionLabel: 'Open inbox',
                payload: { threadId: String(thread._id) }
            });
        } else if (senderType === 'candidate' && thread.company && await companyAllowsMessageNotifications(thread.company)) {
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
                ? serializeThreadForViewer(
                    populatedThread,
                    getUserStateKey(senderUserId),
                    senderUserId,
                    await getCandidateRelationship(
                        senderUserId,
                        (thread.participantUsers || []).map(String).find((id) => id !== String(senderUserId || ''))
                    )
                )
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
        const authenticatedEmployerId = getAuthenticatedUserId(req);
        const employer = await Employer.findOne({ _id: authenticatedEmployerId, companyId: req.params.companyId });
        if (!employer) {
            return res.status(403).json({ error: 'You cannot access another company inbox' });
        }
        employer.lastOnlineAt = new Date();
        await employer.save();
        const threads = await populateThread(
            MessageThread.find({ company: req.params.companyId }).sort({ lastMessageAt: -1 })
        );

        const actorKey = getCompanyStateKey(req.params.companyId);
        await Promise.all(threads.map(async (thread) => {
            let changed = false;
            (thread.messages || []).forEach((message) => {
                if (message.senderType !== 'candidate') return;
                const readBy = new Set((message.readBy || []).map(String));
                if (!readBy.has(actorKey)) {
                    readBy.add(actorKey);
                    message.readBy = [...readBy];
                    changed = true;
                }
            });
            if (changed) await thread.save();
        }));
        return res.status(200).json(threads.map((thread) => serializeThreadForViewer(thread, actorKey)));
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

        await User.findByIdAndUpdate(authenticatedUserId, { lastOnlineAt: new Date() });

        const threads = await populateThread(
            MessageThread.find({
                $or: [
                    { candidateUser: req.params.userId },
                    { participantUsers: req.params.userId }
                ]
            }).sort({ lastMessageAt: -1 })
        );

        const actorKey = getUserStateKey(authenticatedUserId);
        await Promise.all(threads.map(async (thread) => {
            let changed = false;
            (thread.messages || []).forEach((message) => {
                const isIncoming = thread.conversationType === 'candidate-candidate'
                    ? String(message.senderUser?._id || message.senderUser || '') !== authenticatedUserId
                    : message.senderType === 'employer';
                if (!isIncoming) return;
                const readBy = new Set((message.readBy || []).map(String));
                if (!readBy.has(actorKey)) {
                    readBy.add(actorKey);
                    message.readBy = [...readBy];
                    changed = true;
                }
            });
            if (changed) await thread.save();
        }));

        const serialized = await Promise.all(threads.map(async (thread) => {
            if (thread.conversationType !== 'candidate-candidate') {
                const result = serializeThreadForViewer(thread, getUserStateKey(authenticatedUserId), authenticatedUserId);
                const threadCompanyId = thread.company?._id || thread.company;
                const employer = threadCompanyId
                    ? await Employer.findOne({ companyId: threadCompanyId }).select('lastOnlineAt messagePreferences')
                    : null;
                const hidden = Boolean(employer?.messagePreferences?.workInSilence);
                result.viewerState.peerPresenceHidden = hidden;
                result.viewerState.peerLastOnlineAt = hidden ? null : (employer?.lastOnlineAt || null);
                result.viewerState.readReceiptsVisible = !hidden;
                return result;
            }

            const participantIds = (thread.participantUsers || []).map((participant) => String(participant?._id || participant));
            const peerUserId = participantIds.find((id) => id !== authenticatedUserId);
            const relationship = peerUserId
                ? await getCandidateRelationship(authenticatedUserId, peerUserId)
                : null;
            return serializeThreadForViewer(
                thread,
                getUserStateKey(authenticatedUserId),
                authenticatedUserId,
                relationship
            );
        }));

        return res.status(200).json(serialized);
    } catch (error) {
        console.error('Error fetching candidate inbox:', error.message);
        return res.status(500).json({
            error: 'Failed to fetch inbox',
            message: error.message
        });
    }
};

const updateThreadState = async (req, res) => {
    try {
        const authenticatedId = getAuthenticatedUserId(req);
        const { action, companyId } = req.body || {};
        const thread = await MessageThread.findById(req.params.threadId);
        if (!thread) {
            return res.status(404).json({ error: 'Message thread not found' });
        }

        let actorKey = '';
        let viewerUserId = '';
        let relationship = null;
        if (companyId) {
            const employer = await Employer.findOne({ _id: authenticatedId, companyId });
            if (!employer || String(thread.company || '') !== String(companyId)) {
                return res.status(403).json({ error: 'You cannot update this company conversation' });
            }
            actorKey = getCompanyStateKey(companyId);
        } else {
            const participantIds = (thread.participantUsers || []).map(String);
            const ownsEmployerCandidateThread = String(thread.candidateUser || '') === authenticatedId;
            if (!participantIds.includes(authenticatedId) && !ownsEmployerCandidateThread) {
                return res.status(403).json({ error: 'You cannot update this conversation' });
            }
            actorKey = getUserStateKey(authenticatedId);
            viewerUserId = authenticatedId;
            const peerUserId = participantIds.find((id) => id !== authenticatedId);
            relationship = peerUserId ? await getCandidateRelationship(authenticatedId, peerUserId) : null;
        }

        const addState = (field) => {
            const values = new Set((thread[field] || []).map(String));
            values.add(actorKey);
            thread[field] = [...values];
        };
        const removeState = (field) => {
            thread[field] = (thread[field] || []).map(String).filter((key) => key !== actorKey);
        };

        if (action === 'archive') addState('archivedFor');
        else if (action === 'unarchive') removeState('archivedFor');
        else if (action === 'delete') addState('deletedFor');
        else if (action === 'block-chat') addState('chatBlockedFor');
        else if (action === 'unblock-chat') removeState('chatBlockedFor');
        else return res.status(400).json({ error: 'Unknown message action' });

        await thread.save();
        const populated = await populateThread(MessageThread.findById(thread._id));
        return res.status(200).json(serializeThreadForViewer(populated, actorKey, viewerUserId, relationship));
    } catch (error) {
        return res.status(error.status || 500).json({
            error: error.message || 'Failed to update conversation'
        });
    }
};

const getMessagePreferences = async (req, res) => {
    try {
        const authenticatedId = getAuthenticatedUserId(req);
        const companyId = String(req.query.companyId || '');
        const account = companyId
            ? await Employer.findOne({ _id: authenticatedId, companyId }).select('messagePreferences')
            : await User.findById(authenticatedId).select('messagePreferences');
        if (!account) {
            return res.status(404).json({ error: 'Message settings account not found' });
        }
        return res.status(200).json({
            workInSilence: Boolean(account.messagePreferences?.workInSilence),
            messageNotifications: account.messagePreferences?.messageNotifications !== false
        });
    } catch (error) {
        return res.status(error.status || 500).json({ error: error.message || 'Failed to load message settings' });
    }
};

const updateMessagePreferences = async (req, res) => {
    try {
        const authenticatedId = getAuthenticatedUserId(req);
        const { companyId, workInSilence, messageNotifications } = req.body || {};
        const account = companyId
            ? await Employer.findOne({ _id: authenticatedId, companyId })
            : await User.findById(authenticatedId);
        if (!account) {
            return res.status(404).json({ error: 'Message settings account not found' });
        }
        account.messagePreferences = {
            workInSilence: Boolean(workInSilence),
            messageNotifications: messageNotifications !== false
        };
        account.markModified('messagePreferences');
        await account.save();
        return res.status(200).json(account.messagePreferences);
    } catch (error) {
        return res.status(error.status || 500).json({ error: error.message || 'Failed to save message settings' });
    }
};

module.exports = {
    createOrReplyMessage,
    createCandidateDirectMessage,
    replyToThread,
    updateThreadState,
    getMessagePreferences,
    updateMessagePreferences,
    getCompanyThreads,
    getCandidateThreads
};
