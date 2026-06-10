const mongoose = require('mongoose');

const TalentBookmarkSchema = new mongoose.Schema({
  company: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: true
  },
  candidate: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'JobSeeker',
    required: true
  }
}, { timestamps: true });

TalentBookmarkSchema.index({ company: 1, candidate: 1 }, { unique: true });

module.exports = mongoose.model('TalentBookmark', TalentBookmarkSchema);
