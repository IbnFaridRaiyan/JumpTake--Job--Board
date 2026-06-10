const mongoose = require('mongoose');

const JobBookmarkSchema = new mongoose.Schema({
  job: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Job',
    required: true
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, { timestamps: true });

JobBookmarkSchema.index({ job: 1, user: 1 }, { unique: true });

module.exports = mongoose.model('JobBookmark', JobBookmarkSchema);
