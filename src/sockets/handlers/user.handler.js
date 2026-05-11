const onlineUsers = require('../store');
const Conversation = require('../../models/Conversation');
const User = require('../../models/User');
const Message = require('../../models/Message'); // ← agregar

module.exports = async (io, socket) => {
    const userId = socket.user.id;
    onlineUsers.set(userId, socket.id);

    const contactIds = await Conversation.findContacts(userId);

    // Marcar como delivered mensajes pendientes al conectarse
    const conversations = await Conversation.find({ participants: userId }).select('conversationId participants');
    for (const conv of conversations) {
        const updated = await Message.updateMany(
            {
                conversationId: conv.conversationId,
                senderId: { $ne: userId },
                status: 'sent'
            },
            { status: 'delivered' }
        );

        if (updated.modifiedCount > 0) {
            conv.participants.forEach(participantId => {
                const id = participantId.toString();
                if (id !== userId) {
                    const senderSocketId = onlineUsers.get(id);
                    if (senderSocketId) {
                        io.to(senderSocketId).emit('message:delivered', {
                            conversationId: conv.conversationId
                        });
                    }
                }
            });
        }
    }

    // Notifica a contactos que estás online
    contactIds.forEach(contactId => {
        const socketId = onlineUsers.get(contactId.toString());
        if (socketId) {
            io.to(socketId).emit('user:status', { userId, status: 'online' });
        }
    });

    // Manda lista de contactos ya online
    const onlineContacts = contactIds
        .filter(contactId => onlineUsers.has(contactId.toString()))
        .map(contactId => contactId.toString());

    socket.emit('contacts:online', onlineContacts);

    console.log('Online:', userId);

    socket.on('disconnect', async () => {
        onlineUsers.delete(userId);

        const lastSeenAt = new Date();
        await User.updateLastSeenAt(userId, lastSeenAt);

        contactIds.forEach(contactId => {
            const socketId = onlineUsers.get(contactId.toString());
            if (socketId) {
                io.to(socketId).emit('user:status', {
                    userId,
                    status: 'offline',
                    lastSeenAt: lastSeenAt,
                });
            }
        });

        console.log('Offline:', userId, lastSeenAt);
    });
};