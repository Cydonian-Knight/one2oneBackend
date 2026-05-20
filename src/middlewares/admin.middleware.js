const jwt = require('jsonwebtoken');
const { error } = require('../utils/response');
const { blacklist } = require('./auth.middleware');

module.exports = async (req, res, next) => {
    const token = req.cookies.token;
    if (!token) return error(res, 'Acceso denegado.', 401);

    // ← verifica blacklist
    if (blacklist.has(token)) {
        return error(res, 'Sesión cerrada.', 401);
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        if (decoded.type !== 'admin') return error(res, 'Acceso restringido.', 403);
        req.user = decoded;
        next();
    } catch (err) {
        next(err);
    }
};