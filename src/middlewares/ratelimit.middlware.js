// middleware/errorMiddleware.js
const rateLimit = require('express-rate-limit');

exports.tresSolicitudesLimit = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: 5, // Límite de 5 solicitudes
    message: {
        status: 429,
        message: "Has excedido el límite de 5 intentos. Intenta más tarde."
    },
    standardHeaders: true,
    legacyHeaders: false,
});

exports.unaSolicitudLimit = rateLimit({
    windowMs: 60 * 60 * 1000, // 60 minutos
    max: 100, // Límite de 1 solicitud
    message: {
        status: 429,
        message: "Has excedido el límite de 1 intentos. Intenta más tarde."
    },
    standardHeaders: true,
    legacyHeaders: false,
});

