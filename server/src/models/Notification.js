const mongoose = require('mongoose');

const NotificationSchema = new mongoose.Schema({
  recipientType: {
    type: String,
    enum: ['employer', 'candidate'],
    required: true
  },
  recipientId: {
    type: String,
    required: true,
    index: true
  },
  title: {
    type: String,
    required: true,
    trim: true
  },
  message: {
    type: String,
    required: true,
    trim: true
  },
  section: {
    type: String,
    trim: true,
    default: ''
  },
  actionLabel: {
    type: String,
    trim: true,
    default: 'Open'
  },
  payload: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  read: {
    type: Boolean,
    default: false
  }
}, { timestamps: true });

NotificationSchema.index({ recipientType: 1, recipientId: 1, createdAt: -1 });

module.exports = mongoose.model('Notification', NotificationSchema);
