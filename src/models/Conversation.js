const mongoose = require('mongoose');
const { customAlphabet } = require('nanoid'); // Se mueve aquí desde el controller

const alphabet = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const nanoid = customAlphabet(alphabet, 12);

const conversationSchema = new mongoose.Schema({
    conversationId: { type: String, required: true, unique: true },
    participants: [{
        type: String,
        ref: 'User'
    }],
    lastMessageId: { type: mongoose.Schema.Types.ObjectId, ref: 'Message' },
    lastMessage: {
        text: String,
        type: {
            type: String,
            enum: ['text', 'image', 'video', 'audio', 'call'],
            default: 'text'
        },
        senderId: String,
        status: { type: String, enum: ['sent', 'delivered', 'read'], default: 'sent' }, // ← agrega esto
        createdAt: Date,
        isDeleted: { type: Boolean, default: false },
        isReported: { type: Boolean, default: false }
    },
    unreadCounts: {
        type: Map,
        of: Number,
        default: {}
    },
    isActive: { type: Boolean, default: true }
}, { timestamps: true });

conversationSchema.index({ participants: 1 });

// Métodos estáticos 

// Trae todas las conversaciones de un usuario, ya procesadas
conversationSchema.statics.findByUserId = async function (userId) {
    const [conversations, currentUser] = await Promise.all([
        this.find({ participants: userId })
            .populate('participants', 'username avatarUrl status lastSeenAt age createdAt mood email blockedUsers'), // 👈
        require('../models/User').findById(userId).select('blockedUsers')
    ]);

    return conversations.map(conv => {
        const contact = conv.participants.find(p => p._id.toString() !== userId.toString());
        const unreadCount = conv.unreadCounts?.get(userId) || 0;
        const isBlocked = currentUser.blockedUsers.includes(contact?._id.toString());
        const blockedYou = contact?.blockedUsers?.includes(userId.toString()); // 👈

        return {
            id: conv.conversationId,
            contact: {
                id: contact?._id,
                username: contact?.username,
                avatarUrl: contact?.avatarUrl,
                status: contact?.status,
                lastSeenAt: contact?.lastSeenAt,
                age: contact?.age,
                createdAt: contact.createdAt.toLocaleDateString('es-MX'),
                mood: contact?.mood,
                email: contact?.email,
                isBlocked,
                blockedYou, // 👈
            },
            lastMessage: {
                ...conv.lastMessage,
                isOwn: conv.lastMessage?.senderId === userId.toString(),
            },
            unreadCount,
            updatedAt: conv.updatedAt
        };
    });
};
// Busca conversación existente o crea una nueva
conversationSchema.statics.createOrFind = async function (userId, contactId) {
    const existing = await this.findOne({
        participants: { $all: [userId, contactId] }
    });

    if (existing) return existing;

    return await this.create({
        conversationId: `c_${nanoid()}`,
        participants: [userId, contactId],
        unreadCounts: {
            [userId]: 0,
            [contactId]: 0
        },
        lastMessage: {
            text: "¡Manda tu primer mensaje!",
            type: "text",
            senderId: userId,
            createdAt: new Date()
        }
    });
};

// Actualiza el conteo de mensajes no leidos y el ultimo mensaje enviado a la conversacion
conversationSchema.statics.unreadCountsUpdate = async function (conversationId, lastMessage) {
    const conversation = await this.findOne({ conversationId });
    if (!conversation) throw new Error('Conversación no encontrada');

    const senderId = lastMessage.senderId.toString();

    conversation.participants.forEach((participantId) => {
        const id = participantId.toString();
        if (id === senderId) {
            conversation.unreadCounts.set(id, 0);
        } else {
            const current = conversation.unreadCounts.get(id) || 0;
            conversation.unreadCounts.set(id, current + 1);
        }
    });

    conversation.lastMessage = {
        _id: lastMessage._id,
        text: lastMessage.content,
        type: lastMessage.type,
        senderId: lastMessage.senderId,
        status: lastMessage.status,
        createdAt: lastMessage.createdAt
    };

    return await conversation.save();
};

conversationSchema.statics.findContacts = async function (userId) {
    const conversations = await this.find({ participants: userId });

    return conversations.flatMap(conv =>
        conv.participants.filter(p => p.toString() !== userId.toString())
    );
};

conversationSchema.statics.resetCount = async function (conversationId, userId) {
    const conversation = await this.findOne({ conversationId });
    if (!conversation) throw new Error('Conversación no encontrada');

    conversation.unreadCounts.set(userId, 0);

    return await conversation.save();
};





module.exports = mongoose.model('Conversation', conversationSchema);