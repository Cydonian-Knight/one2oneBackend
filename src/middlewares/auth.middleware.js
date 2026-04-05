const jwt = require('jsonwebtoken');
const { error } = require('../utils/response');


module.exports = async (req, res, next) => {
    let token = req.cookies.token;

    if (!token) {
        return error(res, 'Acceso denegado.', 401);
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded;
        next();
    } catch (err) {
        next(err)
    }
};

