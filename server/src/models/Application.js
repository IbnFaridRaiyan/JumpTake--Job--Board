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
    enum: ['Submitted', 'Reviewed', 'Under Review', 'Accepted', 'Rejected', 'Withdrawn', 'On Hold', 'Unsuccessful'],
    default: 'Submitted'
  },
  message: {
    type: String,
    trim: true
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
