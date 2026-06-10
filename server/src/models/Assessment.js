const mongoose = require('mongoose');

const AssessmentQuestionSchema = new mongoose.Schema({
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

const AssessmentSchema = new mongoose.Schema({
  company: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: true
  },
  application: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Application',
    required: true
  },
  job: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Job',
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
    trim: true
  },
  questions: {
    type: [AssessmentQuestionSchema],
    default: [],
    validate: {
      validator: function(questions) {
        return Array.isArray(questions) && questions.length > 0;
      },
      message: 'At least one assessment question is required'
    }
  }
}, { timestamps: true });

module.exports = mongoose.model('Assessment', AssessmentSchema);
