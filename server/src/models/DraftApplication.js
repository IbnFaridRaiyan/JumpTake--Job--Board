const mongoose = require('mongoose');

const DraftApplicationSchema = new mongoose.Schema({
  job: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Job',
    required: true
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  message: {
    type: String,
    default: ''
  },
  coverLetterHtml: {
    type: String,
    default: ''
  },
  coverLetterText: {
    type: String,
    default: ''
  },
  profileSnapshot: {
    type: mongoose.Schema.Types.Mixed,
    default: null
  },
  uploadedResume: {
    type: mongoose.Schema.Types.Mixed,
    default: null
  }
}, { timestamps: true });

DraftApplicationSchema.index({ job: 1, user: 1 }, { unique: true });

module.exports = mongoose.model('DraftApplication', DraftApplicationSchema);
