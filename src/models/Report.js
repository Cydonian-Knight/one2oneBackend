const mongoose = require('mongoose');

const reportSchema = new mongoose.Schema({
    reportId: { type: String, required: true, unique: true },
    messageId: { type: mongoose.Schema.Types.ObjectId, ref: 'Message', required: true },
    reportedUserId: { type: String, required: true }, // ID u_0002
    reporterUserId: { type: String, required: true }, // ID u_0001
    reason: { type: String, required: true },
    status: {
        type: String,
        default: 'pending',
        enum: ['pending', 'reviewed', 'resolved', 'dismissed']
    },
    reviewedAt: { type: Date, default: null }
}, { timestamps: true });

reportSchema.index({ reportedUserId: 1 });
reportSchema.index({ status: 1 });

module.exports = mongoose.model('Report', reportSchema);