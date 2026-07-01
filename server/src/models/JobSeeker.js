const mongoose = require('mongoose');

const JobSeekerSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  name: {
    type: String,
    trim: true
  },
  email: {
    type: String,
    trim: true,
    lowercase: true
  },
  loginUsername: {
    type: String,
    trim: true,
    lowercase: true
  },
  profileImage: {
    type: String,
    default: ''
  },
  education: {
    type: mongoose.Schema.Types.Mixed
  },
  degrees: {
    type: mongoose.Schema.Types.Mixed
  },
  experience: {
    type: mongoose.Schema.Types.Mixed
  },
  skills: {
    type: mongoose.Schema.Types.Mixed
  },
  achievements: {
    type: mongoose.Schema.Types.Mixed
  },
  interests: {
    type: mongoose.Schema.Types.Mixed
  },
  hobbies: {
    type: mongoose.Schema.Types.Mixed
  },
  resumeText: {
    type: String
  },
  socialProfile: {
    type: mongoose.Schema.Types.Mixed
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('JobSeeker', JobSeekerSchema);
