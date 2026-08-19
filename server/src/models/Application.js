const mongoose = require('mongoose');

const ApplicationSchema = new mongoose.Schema({
  candidateNumber: {
    type: String,
    trim: true,
    unique: true,
    sparse: true
  },
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
  status: {
    type: String,
    enum: [
      'Submitted',
      'Reviewed',
      'Under Review',
      'Shortlisted for Assessment',
      'Shortlisted for Video Assessment',
      'Accepted',
      'Rejected',
      'Withdrawn',
      'On Hold',
      'Unsuccessful'
    ],
    default: 'Submitted'
  },
  message: {
    type: String,
    trim: true
  },
  applicationMethod: {
    type: String,
    enum: ['jumptake', 'external'],
    default: 'jumptake'
  },
  externalApplicationLink: {
    type: String,
    trim: true,
    default: ''
  },
  sourceApplicationLink: {
    type: String,
    trim: true,
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
  uploadedCoverLetter: {
    type: mongoose.Schema.Types.Mixed,
    default: null
  },
  profileSnapshot: {
    type: mongoose.Schema.Types.Mixed,
    default: null
  },
  uploadedResume: {
    type: mongoose.Schema.Types.Mixed,
    default: null
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Application', ApplicationSchema);
