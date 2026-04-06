const mongoose = require('mongoose');

const conversationSchema = new mongoose.Schema({
    conversationId: { type: String, required: true, unique: true },
    participants: [{
        type: String,
        ref: 'User'
    }], // Array de userIds u_0001, etc.
    lastMessageId: { type: mongoose.Schema.Types.ObjectId, ref: 'Message' },
    lastMessagePreview: String,
    lastMessageAt: Date,
    isActive: { type: Boolean, default: true }
}, { timestamps: true });

// Índice para búsquedas rápidas de chats por participante
conversationSchema.index({ participants: 1 });

module.exports = mongoose.model('Conversation', conversationSchema);