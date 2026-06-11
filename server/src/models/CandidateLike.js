const mongoose = require('mongoose');

const CandidateLikeSchema = new mongoose.Schema({
  candidate: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'JobSeeker',
    required: true
  },
  actorType: {
    type: String,
    enum: ['employer', 'candidate'],
    required: true
  },
  actorKey: {
    type: String,
    required: true
  }
}, { timestamps: true });

CandidateLikeSchema.index({ candidate: 1, actorType: 1, actorKey: 1 }, { unique: true });
CandidateLikeSchema.index({ candidate: 1 });

module.exports = mongoose.model('CandidateLike', CandidateLikeSchema);
