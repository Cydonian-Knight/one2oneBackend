const jwt = require('jsonwebtoken');
const User = require('../models/User')
const { error } = require('../utils/response');

module.exports = async (req, res, next) => {
    // 1. Obtener el token del header 
    const authHeader = req.header('Authorization');
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return error(res, 'Acceso denegado.', 401);
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        if (decoded.purpose !== 'verification') {
            return error(res, 'Este token solo sirve para verificación', 403);
        }

        const user = await User.findOne({ userId: decoded.id });
        if (!user) return error(res, 'Usuario no encontrado', 401);

        req.user = user;
        req.tokenPurpose = decoded.purpose;

        next();
    } catch (err) {
        next(err);
    }
}; 