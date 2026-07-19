const mongoose = require('mongoose');

const MessageSchema = new mongoose.Schema({
  senderType: {
    type: String,
    enum: ['employer', 'candidate'],
    required: true
  },
  senderUser: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  bodyHtml: {
    type: String,
    default: ''
  },
  bodyText: {
    type: String,
    default: ''
  },
  readBy: {
    type: [String],
    default: []
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
}, { _id: true });

const MessageThreadSchema = new mongoose.Schema({
  conversationType: {
    type: String,
    enum: ['employer-candidate', 'candidate-candidate'],
    default: 'employer-candidate'
  },
  company: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: false
  },
  candidate: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'JobSeeker',
    required: false
  },
  candidateUser: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false
  },
  participantUsers: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  candidateProfiles: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'JobSeeker'
  }],
  directKey: {
    type: String
  },
  archivedFor: {
    type: [String],
    default: []
  },
  deletedFor: {
    type: [String],
    default: []
  },
  chatBlockedFor: {
    type: [String],
    default: []
  },
  messages: {
    type: [MessageSchema],
    default: []
  },
  lastMessageAt: {
    type: Date,
    default: Date.now
  }
}, { timestamps: true });

MessageThreadSchema.index(
  { company: 1, candidateUser: 1 },
  {
    unique: true,
    partialFilterExpression: {
      company: { $exists: true },
      candidateUser: { $exists: true }
    }
  }
);
MessageThreadSchema.index(
  { directKey: 1 },
  {
    unique: true,
    partialFilterExpression: {
      directKey: { $exists: true }
    }
  }
);
MessageThreadSchema.index({ participantUsers: 1 });

module.exports = mongoose.model('MessageThread', MessageThreadSchema);
