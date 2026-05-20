const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const userHandler = require('./handlers/user.handler');

let io;

const initSocket = (server) => {
    io = new Server(server, {
        cors: { origin: true, credentials: true }
    });

    io.use((socket, next) => {
        try {
            const token = socket.handshake.headers.cookie
                ?.split(';')
                .find(c => c.trim().startsWith('token='))
                ?.split('=')[1];

            if (!token) return next(new Error('No autorizado'));

            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            socket.user = decoded;
            next();
        } catch (err) {
            next(new Error('Token inválido'));
        }
    });

    io.on('connection', (socket) => {
        console.log('Socket conectado:', socket.id);
        socket.join(`user:${socket.user.id}`);
        userHandler(io, socket);
    });

    return io;
};

const getIO = () => {
    if (!io) throw new Error('Socket.io no inicializado');
    return io;
};

// ↓ Esto es lo único que agregas
const getConnectedCount = () => {
    const onlineUsers = require('./store'); // ajusta la ruta si es necesario
    return onlineUsers.size;
};

module.exports = { initSocket, getIO, getConnectedCount };