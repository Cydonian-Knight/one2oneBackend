const mongoose = require('mongoose');

const callLogSchema = new mongoose.Schema({
    callId: { type: String, required: true, unique: true },
    conversationId: { type: String, required: true },
    fromUserId: { type: String, required: true },
    toUserId: { type: String, required: true },
    type: { type: String, enum: ['voice', 'video'], default: 'voice' },
    provider: { type: String, default: 'twilio' },
    providerCallSid: { type: String },
    startedAt: { type: Date, required: true },
    endedAt: { type: Date },
    durationSeconds: { type: Number, default: 0 }
}, { timestamps: true });

callLogSchema.index({ startedAt: -1 });
callLogSchema.index({ fromUserId: 1 });

module.exports = mongoose.model('CallLog', callLogSchema);