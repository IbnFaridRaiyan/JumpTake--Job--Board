const mongoose = require('mongoose');

const SavedPostSchema = new mongoose.Schema({
  ownerId: {
    type: String,
    required: true,
    index: true
  },
  ownerType: {
    type: String,
    enum: ['candidate', 'employer'],
    required: true,
    index: true
  },
  savedKey: {
    type: String,
    required: true
  },
  postId: {
    type: String,
    required: true
  },
  kind: {
    type: String,
    enum: ['post', 'job'],
    default: 'post'
  },
  sourceTab: {
    type: String,
    default: ''
  },
  title: {
    type: String,
    default: ''
  },
  subtitle: {
    type: String,
    default: ''
  },
  body: {
    type: String,
    default: ''
  },
  authorName: {
    type: String,
    default: ''
  },
  authorAvatar: {
    type: String,
    default: ''
  },
  createdAt: {
    type: String,
    default: ''
  },
  postSnapshot: {
    type: mongoose.Schema.Types.Mixed,
    default: null
  },
  link: {
    type: String,
    default: ''
  }
}, {
  timestamps: {
    createdAt: 'savedAt',
    updatedAt: 'updatedAt'
  }
});

SavedPostSchema.index(
  { ownerType: 1, ownerId: 1, savedKey: 1 },
  { unique: true }
);
SavedPostSchema.index({ ownerType: 1, ownerId: 1, updatedAt: -1 });

module.exports = mongoose.model('SavedPost', SavedPostSchema);
