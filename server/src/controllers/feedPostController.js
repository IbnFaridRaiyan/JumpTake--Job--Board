const FeedPost = require('../models/FeedPost');

const VALID_TYPES = new Set(['work-news', 'talent-story']);
const VALID_AUDIENCES = new Set(['everyone', 'friends', 'only-me']);
const VALID_AUTHOR_TYPES = new Set(['candidate', 'employer']);

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
        type: media.type === 'video' ? 'video' : 'image',
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
        comments: Array.isArray(body.comments) ? body.comments.slice(-200) : []
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

module.exports = {
    getFeedPosts,
    createFeedPost,
    updateFeedPost
};
