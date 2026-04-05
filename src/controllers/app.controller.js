const { success, error } = require('../utils/response');
const User = require('../models/User');
const Message = require('../models/Message');
const Conversation = require('../models/Conversation');
const Report = require('../models/Report');

exports.ejemplo = async (req, res, next) => {
    try {
        return success(res, { user: req.user, message: 'Si tengo una cookie yeiii' }, 201);

    } catch (err) {
        next(err);
    }
}