const jwt = require('jsonwebtoken');

// En el mismo archivo donde tienes generateToken
const blacklist = new Set();

exports.generateToken = (userId, type, expiresIn) => {
    return jwt.sign({ id: userId, type }, process.env.JWT_SECRET, { expiresIn });
};

exports.revokeToken = (token) => blacklist.add(token);

exports.isRevoked = (token) => blacklist.has(token);