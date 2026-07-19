const SavedPost = require('../models/SavedPost');
const { getAuthenticatedPayload } = require('../utils/candidateAuth');

const MAX_SAVED_POSTS = 80;

const getOwner = (req) => {
    const payload = getAuthenticatedPayload(req);
    const ownerId = String(payload.id || '').trim();

    if (!ownerId) {
        const error = new Error('The authenticated account is missing an ID');
        error.status = 401;
        throw error;
    }

    return {
        ownerId,
        ownerType: payload.companyId ? 'employer' : 'candidate'
    };
};

const asText = (value, maximum = 5000) => String(value || '').trim().slice(0, maximum);

const normalizeSavedPost = (input = {}) => {
    const kind = input.kind === 'job' ? 'job' : 'post';
    const postId = asText(
        input.postId
        || input.postSnapshot?._id
        || input.postSnapshot?.id
        || String(input.id || '').replace(/^(post|job):/, ''),
        160
    );

    if (!postId) {
        const error = new Error('A post ID is required');
        error.status = 400;
        throw error;
    }

    const expectedPrefix = `${kind}:`;
    const requestedKey = asText(input.id || input.savedKey, 220);
    const savedKey = requestedKey.startsWith(expectedPrefix)
        ? requestedKey
        : `${kind}:${postId}`;

    return {
        savedKey,
        postId,
        kind,
        sourceTab: asText(input.sourceTab, 80),
        title: asText(input.title, 300),
        subtitle: asText(input.subtitle, 300),
        body: asText(input.body, 5000),
        authorName: asText(input.authorName, 300),
        authorAvatar: typeof input.authorAvatar === 'string' ? input.authorAvatar : '',
        createdAt: asText(input.createdAt, 100),
        postSnapshot: input.postSnapshot && typeof input.postSnapshot === 'object'
            ? input.postSnapshot
            : null,
        link: asText(input.link, 2000)
    };
};

const serializeSavedPost = (record) => {
    const plain = record?.toObject ? record.toObject() : record;
    if (!plain) {
        return plain;
    }

    return {
        ...plain,
        mongoId: String(plain._id || ''),
        id: plain.savedKey
    };
};

const listForOwner = async (owner) => {
    const records = await SavedPost.find(owner)
        .sort({ updatedAt: -1 })
        .limit(MAX_SAVED_POSTS);
    return records.map(serializeSavedPost);
};

const pruneOwner = async (owner) => {
    const staleRecords = await SavedPost.find(owner)
        .sort({ updatedAt: -1 })
        .skip(MAX_SAVED_POSTS)
        .select('_id');

    if (staleRecords.length) {
        await SavedPost.deleteMany({
            _id: { $in: staleRecords.map((record) => record._id) }
        });
    }
};

const getSavedPosts = async (req, res) => {
    try {
        const owner = getOwner(req);
        return res.status(200).json(await listForOwner(owner));
    } catch (error) {
        return res.status(error.status || 500).json({
            error: 'Failed to load saved posts',
            message: error.message
        });
    }
};

const savePost = async (req, res) => {
    try {
        const owner = getOwner(req);
        const savedPost = normalizeSavedPost(req.body);
        const record = await SavedPost.findOneAndUpdate(
            { ...owner, savedKey: savedPost.savedKey },
            { $set: { ...owner, ...savedPost } },
            { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true }
        );
        await pruneOwner(owner);

        return res.status(200).json(serializeSavedPost(record));
    } catch (error) {
        return res.status(error.status || 500).json({
            error: 'Failed to save post',
            message: error.message
        });
    }
};

const migrateSavedPosts = async (req, res) => {
    try {
        const owner = getOwner(req);
        const sourcePosts = Array.isArray(req.body?.posts) ? req.body.posts.slice(0, MAX_SAVED_POSTS) : [];
        const normalizedPosts = sourcePosts.map(normalizeSavedPost);

        if (normalizedPosts.length) {
            await SavedPost.bulkWrite(normalizedPosts.map((savedPost) => ({
                updateOne: {
                    filter: { ...owner, savedKey: savedPost.savedKey },
                    update: { $set: { ...owner, ...savedPost } },
                    upsert: true
                }
            })));
        }

        await pruneOwner(owner);

        return res.status(200).json(await listForOwner(owner));
    } catch (error) {
        return res.status(error.status || 500).json({
            error: 'Failed to migrate saved posts',
            message: error.message
        });
    }
};

const deleteSavedPost = async (req, res) => {
    try {
        const owner = getOwner(req);
        const savedKey = String(req.params.savedKey || '').trim();
        const deleted = await SavedPost.findOneAndDelete({ ...owner, savedKey });

        if (!deleted) {
            return res.status(404).json({ error: 'Saved post not found' });
        }

        return res.status(200).json({ message: 'Saved post removed', id: savedKey });
    } catch (error) {
        return res.status(error.status || 500).json({
            error: 'Failed to remove saved post',
            message: error.message
        });
    }
};

module.exports = {
    getSavedPosts,
    savePost,
    migrateSavedPosts,
    deleteSavedPost
};
