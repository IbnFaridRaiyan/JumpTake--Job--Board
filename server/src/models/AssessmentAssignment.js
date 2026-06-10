const mongoose = require('mongoose');

const AssessmentQuestionSnapshotSchema = new mongoose.Schema({
  prompt: {
    type: String,
    required: true,
    trim: true
  },
  type: {
    type: String,
    enum: ['multiple-choice', 'text'],
    required: true
  },
  options: [{
    type: String,
    trim: true
  }],
  maxWords: {
    type: Number,
    default: 2000,
    min: 1,
    max: 2000
  }
}, { _id: true });

const AssessmentResponseSchema = new mongoose.Schema({
  prompt: {
    type: String,
    required: true,
    trim: true
  },
  type: {
    type: String,
    enum: ['multiple-choice', 'text'],
    required: true
  },
  answer: {
    type: String,
    trim: true,
    default: ''
  },
  options: [{
    type: String,
    trim: true
  }],
  maxWords: {
    type: Number,
    default: 2000,
    min: 1,
    max: 2000
  }
}, { _id: true });

const AssessmentAssignmentSchema = new mongoose.Schema({
  assessment: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Assessment',
    required: true
  },
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
  application: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Application',
    required: true
  },
  candidateUser: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  title: {
    type: String,
    required: true,
    trim: true
  },
  instructions: {
    type: String,
    trim: true,
    default: ''
  },
  questions: {
    type: [AssessmentQuestionSnapshotSchema],
    default: []
  },
  responses: {
    type: [AssessmentResponseSchema],
    default: []
  },
  status: {
    type: String,
    enum: ['Sent', 'Submitted'],
    default: 'Sent'
  },
  decision: {
    type: String,
    enum: ['Pending', 'Video Interview', 'Hired', 'Rejected', 'Hold Candidate'],
    default: 'Pending'
  },
  videoInterview: {
    link: {
      type: String,
      trim: true,
      default: ''
    },
    dateOptions: [{
      type: String,
      trim: true
    }],
    candidateSelection: {
      status: {
        type: String,
        enum: ['Pending', 'Accepted', 'Discarded'],
        default: 'Pending'
      },
      selectedDate: {
        type: String,
        trim: true,
        default: ''
      },
      respondedAt: {
        type: Date,
        default: null
      }
    },
    sentAt: {
      type: Date,
      default: null
    }
  },
  sentAt: {
    type: Date,
    default: Date.now
  },
  submittedAt: {
    type: Date,
    default: null
  }
}, { timestamps: true });

AssessmentAssignmentSchema.index({ assessment: 1, application: 1 }, { unique: true });

module.exports = mongoose.model('AssessmentAssignment', AssessmentAssignmentSchema);
