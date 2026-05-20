// auth.middleware.js — sin cambios excepto la validación de tipo
const jwt = require('jsonwebtoken');
const { error } = require('../utils/response');

const blacklist = new Map();

const revokeToken = (token) => {
    const decoded = jwt.decode(token);
    blacklist.set(token, decoded.exp);
};

module.exports = async (req, res, next) => {
    let token = req.cookies.token;
    if (!token) return error(res, 'Acceso denegado.', 401);

    if (blacklist.has(token)) {
        if (Date.now() / 1000 > blacklist.get(token)) {
            blacklist.delete(token);
        } else {
            return error(res, 'Sesión cerrada.', 401);
        }
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        if (decoded.type !== 'access') return error(res, 'Token no autorizado.', 401);
        req.user = decoded;
        next();
    } catch (err) {
        next(err);
    }
};

module.exports.revokeToken = revokeToken;
module.exports.blacklist = blacklist; 