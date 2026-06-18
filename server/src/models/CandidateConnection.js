const mongoose = require('mongoose');

const CandidateConnectionSchema = new mongoose.Schema({
    pairKey: {
        type: String,
        required: true,
        unique: true,
        index: true
    },
    requester: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    recipient: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    status: {
        type: String,
        enum: ['pending', 'accepted', 'declined', 'blocked'],
        default: 'pending'
    },
    blockedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null
    },
    respondedAt: {
        type: Date,
        default: null
    }
}, { timestamps: true });

CandidateConnectionSchema.index({ requester: 1, status: 1 });
CandidateConnectionSchema.index({ recipient: 1, status: 1 });

module.exports = mongoose.model('CandidateConnection', CandidateConnectionSchema);
