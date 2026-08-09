const mongoose = require('mongoose');

const DeletedItemSchema = new mongoose.Schema({
  itemType: {
    type: String,
    enum: ['record', 'comment'],
    default: 'record',
    index: true
  },
  collection: {
    type: String,
    required: true,
    index: true
  },
  originalId: {
    type: String,
    required: true,
    index: true
  },
  parentId: {
    type: String,
    default: ''
  },
  originalIndex: {
    type: Number,
    default: -1
  },
  label: {
    type: String,
    default: 'Deleted item'
  },
  data: {
    type: mongoose.Schema.Types.Mixed,
    required: true
  },
  deletedAt: {
    type: Date,
    default: Date.now,
    index: true
  }
}, { timestamps: true });

DeletedItemSchema.index({ collection: 1, originalId: 1, deletedAt: -1 });

module.exports = mongoose.model('DeletedItem', DeletedItemSchema);
