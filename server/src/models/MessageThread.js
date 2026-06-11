const mongoose = require('mongoose');

const MessageSchema = new mongoose.Schema({
  senderType: {
    type: String,
    enum: ['employer', 'candidate'],
    required: true
  },
  bodyHtml: {
    type: String,
    default: ''
  },
  bodyText: {
    type: String,
    default: ''
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
}, { _id: true });

const MessageThreadSchema = new mongoose.Schema({
  company: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
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
  messages: {
    type: [MessageSchema],
    default: []
  },
  lastMessageAt: {
    type: Date,
    default: Date.now
  }
}, { timestamps: true });

MessageThreadSchema.index({ company: 1, candidateUser: 1 }, { unique: true });

module.exports = mongoose.model('MessageThread', MessageThreadSchema);
