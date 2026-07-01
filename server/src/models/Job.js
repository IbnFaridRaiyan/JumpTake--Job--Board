const mongoose = require('mongoose');

const JobSchema = new mongoose.Schema({
  jobNumber: {
    type: String,
    trim: true,
    unique: true,
    sparse: true
  },
  title: {
    type: String,
    required: [true, 'Job title is required'],
    trim: true
  },
  description: {
    type: String,
    required: [true, 'Job description is required'],
    trim: true
  },
  company: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: [true, 'Company is required']
  },
  adminCompanyId: {
    type: String,
    trim: true
  },
  location: {
    type: String,
    required: [true, 'Job location is required'],
    trim: true
  },
  salary: {
    type: String,
    trim: true
  },
  applicationLink: {
    type: String,
    trim: true
  },
  jobType: {
    type: String,
    enum: ['Full-time', 'Part-time', 'Contract', 'Internship', 'Remote'],
    default: 'Full-time'
  },
  requirements: {
    type: [String],
    default: []
  },
  responsibilities: {
    type: [String],
    default: []
  },
  skills: {
    type: [String],
    default: []
  },
  reviews: {
    type: [{
      id: String,
      reviewerId: String,
      authorName: String,
      rating: {
        type: Number,
        min: 0,
        max: 5,
        default: 0
      },
      text: {
        type: String,
        trim: true
      },
      createdAt: {
        type: Date,
        default: Date.now
      }
    }],
    default: []
  },
  active: {
    type: Boolean,
    default: true
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

module.exports = mongoose.model('Job', JobSchema);
