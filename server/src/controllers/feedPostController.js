const FeedPost = require('../models/FeedPost');
const { createNotification } = require('./notificationController');
const { getAuthenticatedPayload } = require('../utils/candidateAuth');

const VALID_TYPES = new Set(['work-news', 'talent-story']);
const VALID_AUDIENCES = new Set(['everyone', 'friends', 'only-me']);
const VALID_AUTHOR_TYPES = new Set(['candidate', 'employer']);
const VALID_MEDIA_TYPES = new Set(['image', 'video', 'document', 'file']);

const serializePost = (post) => {
    const plain = post?.toObject ? post.toObject() : post;
    if (!plain) {
        return plain;
    }

    return {
        ...plain,
        id: String(plain._id || plain.id || '')
    };
};

const sanitizeMedia = (media) => {
    if (!media || typeof media !== 'object' || typeof media.dataUrl !== 'string' || !media.dataUrl) {
        return null;
    }

    return {
        dataUrl: media.dataUrl,
        type: VALID_MEDIA_TYPES.has(media.type) ? media.type : 'image',
        mimeType: String(media.mimeType || '').slice(0, 180),
        name: String(media.name || 'Post attachment').slice(0, 180)
    };
};

const sanitizePostPayload = (body = {}) => {
    const type = VALID_TYPES.has(body.type) ? body.type : '';
    const authorType = VALID_AUTHOR_TYPES.has(body.authorType) ? body.authorType : '';
    const authorId = String(body.authorId || '').trim();

    if (!type || !authorType || !authorId) {
        const error = new Error('Post type, author type, and author ID are required');
        error.status = 400;
        throw error;
    }

    return {
        type,
        body: String(body.body || '').trim().slice(0, 5000),
        authorId,
        authorType,
        authorName: String(body.authorName || 'JumpTake User').trim().slice(0, 160),
        authorAvatar: String(body.authorAvatar || ''),
        audience: VALID_AUDIENCES.has(body.audience) ? body.audience : 'everyone',
        reach: Math.max(Number(body.reach || 0), 0),
        seenBy: Array.isArray(body.seenBy) ? body.seenBy.map(String).slice(0, 1000) : [],
        hiddenBy: Array.isArray(body.hiddenBy) ? body.hiddenBy.map(String).slice(0, 1000) : [],
        reactions: body.reactions && typeof body.reactions === 'object' ? body.reactions : {},
        reactionsByUser: body.reactionsByUser && typeof body.reactionsByUser === 'object' ? body.reactionsByUser : {},
        media: sanitizeMedia(body.media),
        comments: Array.isArray(body.comments) ? body.comments.slice(-200) : [],
        taggedUsers: Array.isArray(body.taggedUsers) ? body.taggedUsers.slice(0, 40).map((tag) => ({
            userId: String(tag?.userId || '').slice(0, 80),
            candidateId: String(tag?.candidateId || '').slice(0, 80),
            name: String(tag?.name || 'JumpTake user').trim().slice(0, 160),
            jumptakeId: String(tag?.jumptakeId || '').trim().slice(0, 120),
            profileImage: String(tag?.profileImage || '')
        })) : []
    };
};

const getFeedPosts = async (req, res) => {
    try {
        const query = {};
        if (req.query.type) {
            if (!VALID_TYPES.has(req.query.type)) {
                return res.status(400).json({ error: 'Unknown feed post type' });
            }
            query.type = req.query.type;
        }

        const posts = await FeedPost.find(query).sort({ createdAt: -1 }).limit(200);
        return res.status(200).json(posts.map(serializePost));
    } catch (error) {
        return res.status(500).json({
            error: 'Failed to fetch feed posts',
            message: error.message
        });
    }
};

const createFeedPost = async (req, res) => {
    try {
        const payload = sanitizePostPayload(req.body);
        if (!payload.body && !payload.media) {
            return res.status(400).json({ error: 'Write something or attach media before posting' });
        }

        const post = await FeedPost.create(payload);
        return res.status(201).json(serializePost(post));
    } catch (error) {
        return res.status(error.status || 500).json({
            error: 'Failed to create feed post',
            message: error.message
        });
    }
};

const updateFeedPost = async (req, res) => {
    try {
        const existing = await FeedPost.findById(req.params.id);
        if (!existing) {
            return res.status(404).json({ error: 'Feed post not found' });
        }

        const payload = sanitizePostPayload({ ...existing.toObject(), ...req.body, type: existing.type, authorId: existing.authorId, authorType: existing.authorType });
        Object.assign(existing, payload);
        await existing.save();

        return res.status(200).json(serializePost(existing));
    } catch (error) {
        return res.status(error.status || 500).json({
            error: 'Failed to update feed post',
            message: error.message
        });
    }
};

const deleteFeedPost = async (req, res) => {
    try {
        const deleted = await FeedPost.findByIdAndDelete(req.params.id);
        if (!deleted) {
            return res.status(404).json({ error: 'Feed post not found' });
        }

        return res.status(200).json({ message: 'Feed post deleted' });
    } catch (error) {
        return res.status(error.status || 500).json({
            error: 'Failed to delete feed post',
            message: error.message
        });
    }
};

const notifyFeedPostActivity = async (req, res) => {
    try {
        const authenticated = getAuthenticatedPayload(req);
        const post = await FeedPost.findById(req.params.id);

        if (!post) {
            return res.status(404).json({ error: 'Feed post not found' });
        }

        const activityType = String(req.body.type || '').toLowerCase();
        if (!['reaction', 'comment', 'share'].includes(activityType)) {
            return res.status(400).json({ error: 'Unknown post activity type' });
        }

        const actorType = authenticated.companyId ? 'employer' : 'candidate';
        const actorId = String(authenticated.companyId || authenticated.id || '');
        if (!actorId) {
            return res.status(401).json({ error: 'Authentication is required' });
        }

        if (actorType === post.authorType && actorId === String(post.authorId)) {
            return res.status(200).json({ notified: false });
        }

        const actorName = String(req.body.actorName || 'Someone').trim().slice(0, 160) || 'Someone';
        const reaction = String(req.body.reaction || '').trim().slice(0, 40);
        const activityCopy = {
            reaction: {
                title: 'New post reaction',
                message: `${actorName} reacted${reaction ? ` ${reaction}` : ''} to your post.`
            },
            comment: {
                title: 'New post comment',
                message: `${actorName} commented on your post.`
            },
            share: {
                title: 'Your post was shared',
                message: `${actorName} shared your post.`
            }
        }[activityType];

        const notification = await createNotification({
            recipientType: post.authorType,
            recipientId: post.authorId,
            title: activityCopy.title,
            message: activityCopy.message,
            section: 'home',
            actionLabel: 'View post',
            payload: {
                postId: String(post._id),
                postType: post.type,
                activityType,
                actorId,
                actorType
            }
        });

        return res.status(201).json({ notified: true, notification });
    } catch (error) {
        return res.status(error.status || 500).json({
            error: error.message || 'Failed to create post notification'
        });
    }
};

module.exports = {
    getFeedPosts,
    createFeedPost,
    updateFeedPost,
    deleteFeedPost,
    notifyFeedPostActivity
};
