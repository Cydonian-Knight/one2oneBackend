const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
    conversationId: { type: String, required: true },
    senderId: { type: String, required: true },
    type: { type: String, default: 'text', enum: ['text', 'image', 'video', 'audio'] },
    content: { type: String, required: true },
    mediaUrl: String,
    isReported: { type: Boolean, default: false },
    isCensored: { type: Boolean, default: false }
}, { timestamps: true });

// Índice compuesto para scroll infinito (ordenado por fecha)
messageSchema.index({ conversationId: 1, createdAt: -1 });

module.exports = mongoose.model('Message', messageSchema);