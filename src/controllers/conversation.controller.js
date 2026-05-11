const { success } = require('../utils/response');
const Conversation = require('../models/Conversation');
const Message = require('../models/message');
const { getIO } = require('../sockets');

exports.allConversations = async (req, res, next) => {
    try {
        const conversations = await Conversation.findByUserId(req.user.id);
        return success(res, { message: "Todos los chats", conversations }, 200);
    } catch (err) {
        next(err);
    }
};

exports.newConversation = async (req, res, next) => {
    try {
        const conversation = await Conversation.createOrFind(req.user.id, req.body.userId);
        const status = conversation.isNew ? 201 : 200;
        return success(res, { message: "Conversación creada", conversation }, status);
    } catch (err) {
        next(err);
    }
};


// conversation.controller.js
exports.markAsRead = async (req, res, next) => {
    try {
        const { conversationId } = req.params;
        const userId = req.user.id;

        await Message.markAsRead(conversationId, userId);
        const conversation = await Conversation.resetCount(conversationId, userId);

        const io = getIO();
        conversation.participants.forEach(participantId => {
            const id = participantId.toString();
            if (id !== userId.toString()) {
                io.to(`user:${id}`).emit('message:read', { conversationId });
            }
        });

        return success(res, {}, 200);
    } catch (err) {
        next(err);
    }
};



// PATCH /api/msg/:conversationId/delivered
exports.markAsDelivered = async (req, res, next) => {
    try {
        const { conversationId } = req.params;
        const userId = req.user.id;

        const result = await Message.markAsDelivered(conversationId, userId);

        // Notificar al emisor
        const conversation = await Conversation.findOne({ conversationId });
        const io = getIO();
        conversation.participants.forEach(participantId => {
            const id = participantId.toString();
            if (id !== userId.toString()) {
                io.to(`user:${id}`).emit('message:delivered', { conversationId });
            }
        });

        return success(res, {}, 200);
    } catch (err) {
        next(err);
    }
};