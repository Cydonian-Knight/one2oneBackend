const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
    conversationId: { type: String, required: true },
    senderId: { type: String, required: true },
    type: { type: String, default: 'text', enum: ['text', 'image', 'video', 'audio'] },
    content: { type: String, required: true },
    mediaUrl: String,
    status: { type: String, enum: ['sent', 'delivered', 'read'], default: 'sent' },
    isReported: { type: Boolean, default: false },
    isCensored: { type: Boolean, default: false }
}, { timestamps: true });

messageSchema.index({ conversationId: 1, createdAt: -1 });


messageSchema.statics.initialMessages = async function (conversationId) {
    const messages = await this.find({ conversationId })
        .sort({ createdAt: -1 })
        .limit(20)
        .lean();

    return messages;
}

messageSchema.statics.newMessage = async function ({ conversationId, senderId, type, text, mediaUrl }) {
    if (!text && !mediaUrl) throw new Error('El mensaje debe tener texto o archivo');

    const message = await this.create({
        conversationId,
        senderId,
        type: type || 'text',
        content: text || null,
        mediaUrl: mediaUrl || null,
    });



    return message;
};


messageSchema.statics.markAsRead = async function (conversationId, userId) {
    return await this.updateMany(
        {
            conversationId,
            senderId: { $ne: userId },
            status: { $ne: 'read' }
        },
        { status: 'read' }
    );
};


messageSchema.statics.markAsDelivered = async function (conversationId, userId) {
    return await this.updateMany(
        {
            conversationId,
            senderId: { $ne: userId },
            status: 'sent'
        },
        { status: 'delivered' }
    );
};

module.exports = mongoose.models.Message || mongoose.model('Message', messageSchema);