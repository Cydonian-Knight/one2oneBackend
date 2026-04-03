const jwt = require('jsonwebtoken');

exports.generateToken = (userId, purpose, expiresIn) => {
    return jwt.sign({ id: userId, purpose }, process.env.JWT_SECRET, { expiresIn });
};