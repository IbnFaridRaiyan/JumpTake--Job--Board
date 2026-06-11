const mongoose = require('mongoose');

const CandidateBookmarkSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  candidate: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'JobSeeker',
    required: true
  }
}, { timestamps: true });

CandidateBookmarkSchema.index({ user: 1, candidate: 1 }, { unique: true });

module.exports = mongoose.model('CandidateBookmark', CandidateBookmarkSchema);
