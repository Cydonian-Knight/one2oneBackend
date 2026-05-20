const onlineUsers = require('../store');
const Conversation = require('../../models/Conversation');
const User = require('../../models/User');
const Message = require('../../models/Message');
const Report = require('../../models/Report');
const CallLog = require('../../models/CallLog');
const UAParser = require('ua-parser-js');
const { getGeoInfo } = require('../../services/axios');
const mongoose = require('mongoose');
const twilio = require('twilio');
const { v4: uuidv4 } = require('uuid');

const AccessToken = twilio.jwt.AccessToken;
const VideoGrant = AccessToken.VideoGrant;

const saveCallLog = async (callState, io) => {
    try {

        const endedAt = new Date();

        const durationSeconds = callState.startedAt
            ? Math.floor((endedAt - new Date(callState.startedAt)) / 1000)
            : 0;

        // Buscar conversación entre ambos usuarios
        const conversation = await Conversation.findOne({
            participants: {
                $all: [
                    callState.fromUserId,
                    callState.toUserId
                ]
            }
        }).select('conversationId');

        if (!conversation) {
            console.error('No se encontró conversación para call log');
            return;
        }

        await CallLog.create({
            callId: callState.callId,
            conversationId: conversation?.conversationId ?? null,

            fromUserId: callState.fromUserId,
            toUserId: callState.toUserId,

            type: callState.callType === 'video'
                ? 'video'
                : 'voice',

            provider: 'twilio',

            startedAt: callState.startedAt,
            endedAt,

            durationSeconds,
        });

        const message = await Message.create({
            conversationId: conversation?.conversationId ?? null,
            senderId: callState.fromUserId,
            type: 'call',
            content: durationSeconds.toString(),
        });

        await Conversation.updateOne(
            { conversationId: conversation.conversationId },
            {
                lastMessage: {
                    text: durationSeconds.toString(),

                    type: 'call',

                    senderId: callState.fromUserId,

                    createdAt: new Date(),

                    status: 'sent',
                }
            }
        );

        const participants = [callState.fromUserId, callState.toUserId];
        participants.forEach(participantId => {
            const socketId = onlineUsers.get(participantId.toString());
            if (socketId) {
                io.to(socketId).emit('new_message', {
                    conversationId: conversation.conversationId,
                    message: {
                        _id: message._id,
                        conversationId: conversation.conversationId,
                        senderId: callState.fromUserId,
                        type: 'call',
                        content: durationSeconds.toString(),
                        createdAt: message.createdAt,
                        status: 'sent',
                    }
                });
            }
        });

        console.log(
            `CallLog guardado: ${callState.callId} - ${durationSeconds}s`
        );

    } catch (err) {
        console.error('Error guardando CallLog:', err);
    }
};

const getDeviceInfo = (socket) => {
    const ua = socket.handshake.headers['user-agent'];
    const parser = new UAParser(ua);
    return {
        browser: parser.getBrowser().name || 'Desconocido',
        os: parser.getOS().name || 'Desconocido',
        device: parser.getDevice().type || 'desktop',
        model: parser.getDevice().model || null,
    };
};

module.exports = async (io, socket) => {
    const userId = socket.user.id;
    socket.connectedAt = new Date();
    socket.deviceInfo = getDeviceInfo(socket);

    const ip =
        socket.handshake.headers['x-forwarded-for'] ||
        socket.handshake.address;

    socket.geoInfo = await getGeoInfo(ip);


    socket.on('session:force', ({ existingSocketId }) => {
        const existingSocket = io.sockets.sockets.get(existingSocketId);
        if (existingSocket) {
            io.to(existingSocketId).emit('session:kicked');

            setTimeout(() => {
                existingSocket.disconnect(true);
            }, 200);
        }
        onlineUsers.set(userId, socket.id);
        socket.emit('session:accepted');
    });


    const existingSocketId = onlineUsers.get(userId);

    if (existingSocketId && existingSocketId !== socket.id) {

        const existingSocket = io.sockets.sockets.get(existingSocketId);

        if (existingSocket) {

            const user = await User.findById(userId)
                .select('email');

            // Avisarle a Tab B (el nuevo) que ya hay una sesión activa
            socket.emit('session:duplicate', {
                connectedAt: existingSocket.connectedAt,
                device: existingSocket.deviceInfo,   // dispositivo viejo
                newDevice: socket.deviceInfo,        // dispositivo nuevo
                existingSocketId,
                email: user?.email || null,
                location: existingSocket.geoInfo || null,

            });

            // Ya NO desconectes aquí
            return;
        }
    }




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
            await Conversation.updateOne(
                { conversationId: conv.conversationId },
                { 'lastMessage.status': 'delivered' }
            );
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
        const currentSocketId = onlineUsers.get(userId);

        // SOLO borrar si este socket sigue siendo el activo
        if (currentSocketId === socket.id) {

            onlineUsers.delete(userId);

            const lastSeenAt = new Date();

            await User.updateLastSeenAt(userId, lastSeenAt);

            contactIds.forEach(contactId => {
                const socketId = onlineUsers.get(contactId.toString());

                if (socketId) {
                    io.to(socketId).emit('user:status', {
                        userId,
                        status: 'offline',
                        lastSeenAt,
                    });
                }
            });

            console.log('Offline:', userId, lastSeenAt);
        }
    });

    socket.on('message:delete', async ({ messageId, conversationId }) => {
        try {
            const message = await Message.findById(messageId);
            if (!message) return;
            if (message.senderId.toString() !== userId) return;

            await Message.findByIdAndUpdate(messageId, {
                isDeleted: true
            });

            await Conversation.updateOne(
                { conversationId },  // ← sin condición de _id
                { 'lastMessage.isDeleted': true, 'lastMessage.text': '' }
            );

            const conversation = await Conversation.findOne({ conversationId }).select('participants');
            conversation.participants.forEach(participantId => {
                const socketId = onlineUsers.get(participantId.toString());
                if (socketId) {
                    io.to(socketId).emit('message:deleted', { messageId, conversationId });
                }
            });

        } catch (err) {
            console.error('Error al borrar mensaje:', err);
        }
    });

    socket.on('message:report', async ({ messageId, conversationId, reason }) => {
        try {
            const message = await Message.findById(messageId);
            if (!message) return;
            if (message.senderId.toString() === userId) return;

            await Message.findByIdAndUpdate(messageId, { isReported: true });

            await Conversation.updateOne(
                { conversationId },
                { 'lastMessage.isReported': true }
            );

            // Crear el reporte automáticamente
            await Report.create({
                reportId: `RPT-${messageId}`,
                messageId,
                reportedUserId: message.senderId,
                reporterUserId: userId,        // userId ya está en el closure del socket
                status: 'pending',
                reviewedAt: null
            });

            const conversation = await Conversation.findOne({ conversationId }).select('participants');
            conversation.participants.forEach(participantId => {
                const socketId = onlineUsers.get(participantId.toString());
                if (socketId) {
                    io.to(socketId).emit('message:reported', { messageId, conversationId });
                }
            });

        } catch (err) {
            console.error('Error al reportar mensaje:', err);
        }
    });

    socket.on('user:block', async ({ conversationId, contactId }) => {
        try {
            await User.findByIdAndUpdate(userId, {
                $addToSet: { blockedUsers: contactId }
            });

            socket.emit('user:blocked', { conversationId, contactId });

            const contactSocketId = onlineUsers.get(contactId);
            if (contactSocketId) {
                io.to(contactSocketId).emit('user:blocked_by', { conversationId });
            }

        } catch (err) {
            console.error('Error al bloquear usuario:', err);
        }
    });

    // ── A inicia llamada ─────────────────────────────────────────────
    socket.on('call:initiate', ({ targetUserId, callType }) => {
        const callId = uuidv4();
        const targetId = targetUserId?.toString(); // ← fix

        const targetSocketId = onlineUsers.get(targetId); // ← fix

        if (!targetSocketId) { socket.emit('call:unavailable'); return; }

        const targetSocket = io.sockets.sockets.get(targetSocketId);
        if (targetSocket?.callState?.active) { socket.emit('call:unavailable'); return; }

        socket.callState = {
            callId,
            targetUserId: targetId, // ← fix
            callType,
            active: false,
            fromUserId: userId,
            toUserId: targetId, // ← fix
            isInitiator: true,
            startedAt: null,
        };

        const incomingState = {
            callId, callType, fromUserId: userId,
            toUserId: targetId, targetUserId: userId, active: false, // ← fix
            isInitiator: false, startedAt: null,
        };

        targetSocket.callState = incomingState;

        io.to(targetSocketId).emit('call:incoming', { callId, callType, callerId: userId });
        socket.emit('call:ringing', { callId });
    });

    // ── B acepta ─────────────────────────────────────────────────────
    socket.on('call:accept', async ({ callId, callerId }) => {
        const startedAt = new Date();

        // B (quien acepta)
        socket.callState = {
            callId,
            callType: socket.callState?.callType || 'voice',
            fromUserId: callerId, toUserId: userId,
            targetUserId: callerId, active: true, isInitiator: false,
            startedAt,
        };

        const callerSocketId = onlineUsers.get(callerId);
        if (!callerSocketId) return;

        // A (quien llamó)
        const callerSocket = io.sockets.sockets.get(callerSocketId);
        if (callerSocket) {
            callerSocket.callState = {
                ...callerSocket.callState,
                active: true,
                startedAt,           // mismo timestamp para ambos
            };
        }

        // Tokens Twilio — igual que antes
        const tokenB = new AccessToken(
            process.env.TWILIO_ACCOUNT_SID,
            process.env.TWILIO_API_KEY,
            process.env.TWILIO_API_SECRET,
            { identity: userId }
        );
        tokenB.addGrant(new VideoGrant({ room: callId }));

        const tokenA = new AccessToken(
            process.env.TWILIO_ACCOUNT_SID,
            process.env.TWILIO_API_KEY,
            process.env.TWILIO_API_SECRET,
            { identity: callerId }
        );
        tokenA.addGrant(new VideoGrant({ room: callId }));

        socket.emit('call:ready', { token: tokenB.toJwt(), callId });
        io.to(callerSocketId).emit('call:ready', { token: tokenA.toJwt(), callId });
    });

    // ── Cualquiera rechaza ────────────────────────────────────────────
    socket.on('call:reject', ({ callId, callerId }) => {
        // ── Falta esto ──
        if (socket.callState) socket.callState.active = false;

        const callerSocketId = onlineUsers.get(callerId);
        if (callerSocketId) {
            // ── Falta esto ──
            const callerSocket = io.sockets.sockets.get(callerSocketId);
            if (callerSocket?.callState) callerSocket.callState.active = false;

            io.to(callerSocketId).emit('call:rejected', { callId });
        }
    });

    // ── Cualquiera cuelga ─────────────────────────────────────────────
    socket.on('call:end', async ({ callId, targetUserId }) => {
        try {
            const currentCall = socket.callState;
            if (!currentCall) return;

            // Guardar SOLO desde el iniciador
            if (currentCall.isInitiator && currentCall.startedAt) {
                await saveCallLog(currentCall, io);
            }

            // ← Si B cuelga primero, avisarle a A que guarde él
            if (!currentCall.isInitiator && currentCall.startedAt) {
                const initiatorSocketId = onlineUsers.get(currentCall.fromUserId?.toString());
                if (initiatorSocketId) {
                    const initiatorSocket = io.sockets.sockets.get(initiatorSocketId);
                    if (initiatorSocket?.callState?.isInitiator) {
                        await saveCallLog(initiatorSocket.callState, io);
                        initiatorSocket.callState = null;
                    }
                }
            }

            currentCall.active = false;
            socket.callState = null;

            const targetSocketId = onlineUsers.get(targetUserId);
            if (targetSocketId) {
                const targetSocket = io.sockets.sockets.get(targetSocketId);
                if (targetSocket) {
                    targetSocket.callState = null;
                    io.to(targetSocketId).emit('call:ended', { callId });
                }
            }

        } catch (err) {
            console.error('Error en call:end:', err);
        }
    });

    socket.on('user:unblock', async ({ conversationId, contactId }) => {
        try {
            console.log('user:unblock recibido', { userId, contactId, conversationId });

            const result = await User.findByIdAndUpdate(userId, {
                $pull: { blockedUsers: contactId }
            }, { returnDocument: 'after' });

            console.log('blockedUsers después:', result?.blockedUsers);

            socket.emit('user:unblocked', { conversationId, contactId }); // al que desbloqueó

            const contactSocketId = onlineUsers.get(contactId); // 👈 faltaba esto
            if (contactSocketId) {
                io.to(contactSocketId).emit('user:unblocked_by', { conversationId }); // 👈
            }

        } catch (err) {
            console.error('Error al desbloquear usuario:', err);
        }
    });
};