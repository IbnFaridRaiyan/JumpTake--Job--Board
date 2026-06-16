const mongoose = require('mongoose');

const JobInvitationSchema = new mongoose.Schema({
  company: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: true
  },
  job: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Job',
    required: true
  },
  candidate: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'JobSeeker',
    required: true
  },
  candidateUser: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  message: {
    type: String,
    trim: true,
    default: ''
  },
  status: {
    type: String,
    enum: ['Sent', 'Viewed', 'Applied', 'Dismissed'],
    default: 'Sent'
  }
}, { timestamps: true });

JobInvitationSchema.index({ job: 1, candidateUser: 1 }, { unique: true });
JobInvitationSchema.index({ candidateUser: 1, createdAt: -1 });

module.exports = mongoose.model('JobInvitation', JobInvitationSchema);
