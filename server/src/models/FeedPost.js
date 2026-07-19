const mongoose = require('mongoose');

const FeedPostSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['work-news', 'talent-story'],
    required: true,
    index: true
  },
  body: {
    type: String,
    trim: true,
    default: ''
  },
  authorId: {
    type: String,
    required: true,
    index: true
  },
  authorType: {
    type: String,
    enum: ['candidate', 'employer'],
    required: true
  },
  authorName: {
    type: String,
    trim: true,
    default: 'JumpTake User'
  },
  authorAvatar: {
    type: String,
    default: ''
  },
  audience: {
    type: String,
    enum: ['everyone', 'friends', 'only-me'],
    default: 'everyone'
  },
  reach: {
    type: Number,
    default: 0
  },
  seenBy: {
    type: [String],
    default: []
  },
  hiddenBy: {
    type: [String],
    default: []
  },
  reactions: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  reactionsByUser: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  media: {
    type: mongoose.Schema.Types.Mixed,
    default: null
  },
  source: {
    type: String,
    default: ''
  },
  sourceTitle: {
    type: String,
    default: ''
  },
  comments: {
    type: [mongoose.Schema.Types.Mixed],
    default: []
  },
  taggedUsers: {
    type: [mongoose.Schema.Types.Mixed],
    default: []
  }
}, { timestamps: true });

FeedPostSchema.index({ type: 1, createdAt: -1 });
FeedPostSchema.index({ authorId: 1, createdAt: -1 });

module.exports = mongoose.model('FeedPost', FeedPostSchema);
