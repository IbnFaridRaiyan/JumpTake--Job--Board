const mongoose = require('mongoose');

const ApplicationBookmarkSchema = new mongoose.Schema({
  company: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: true
  },
  application: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Application',
    required: true
  }
}, { timestamps: true });

ApplicationBookmarkSchema.index({ company: 1, application: 1 }, { unique: true });

module.exports = mongoose.model('ApplicationBookmark', ApplicationBookmarkSchema);
