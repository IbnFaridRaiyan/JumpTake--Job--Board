const mongoose = require('mongoose');

const PlanCodeSchema = new mongoose.Schema({
  codeHash: { type: String, required: true, unique: true, index: true },
  plan: { type: String, enum: ['premium', 'extreme'], required: true },
  active: { type: Boolean, default: true },
  maxUses: { type: Number, default: 1, min: 1 },
  uses: { type: Number, default: 0, min: 0 },
  expiresAt: { type: Date, default: null },
  redeemedBy: [{ accountType: String, accountId: mongoose.Schema.Types.ObjectId, redeemedAt: Date }]
}, { timestamps: true });

module.exports = mongoose.model('PlanCode', PlanCodeSchema);
