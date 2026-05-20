const { success, error } = require('../utils/response');
const Message = require('../models/Message');
const Conversation = require('../models/Conversation')
const cloudinary = require('../services/cloudinary');
const { getIO } = require('../sockets');



// Extrae los primeros 20 mensajes de la base de datos dada la conversación
exports.initialMessages = async (req, res, next) => {
    try {
        const { conversationId } = req.params;
        const userId = req.user.id;


        const messages = await Message.initialMessages(conversationId);

        messages.reverse();
        messages.forEach(msg => {
            msg.isOwn = msg.senderId === userId;
        });

        return success(res, {
            messages
        }, 201);

    } catch (err) {
        next(err);
    }
}

exports.newMessage = async (req, res, next) => {
    try {
        const { conversationId } = req.params;
        const userId = req.user.id;
        const { type, text } = req.body;
        const content = req.file?.buffer || null;

        let mediaUrl = null;
        if (content) {
            mediaUrl = await cloudinary.sendImage(content);
        }

        const message = await Message.newMessage({
            conversationId,
            senderId: userId,
            type,
            text: text || null,
            mediaUrl: mediaUrl || null,
        });

        // Actualiza unreadCounts y obtiene participants
        const conversation = await Conversation.unreadCountsUpdate(conversationId, message);

        // Emitir a los otros participantes
        const io = getIO();
        conversation.participants.forEach(participantId => {
            const id = participantId.toString();
            if (id !== userId.toString()) {
                io.to(`user:${id}`).emit('new_message', { message, conversationId });
                io.to(`user:${id}`).emit('unread_update', { conversationId });
            }
        });

        return success(res, { message }, 201);

    } catch (err) {
        next(err);
    }
};


// Siguientes 20 mensajes
exports.nextMessages = async (req, res, next) => {
    try {
        const { messageId } = req.params;
        const userId = req.user.id;

        const messages = await Message.nextMessages(messageId);
        messages.reverse(); // más antiguos primero

        messages.forEach(msg => {
            msg.isOwn = msg.senderId === userId;
        });

        return success(res, { messages }, 200);
    } catch (err) {
        next(err);
    }
};