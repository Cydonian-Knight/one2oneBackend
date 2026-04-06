const { success, error } = require('../utils/response');
const User = require('../models/User');
const Message = require('../models/Message');
const Conversation = require('../models/Conversation');

exports.allConversations = async (req, res, next) => {
    try {
        const userId = req.user.id;



        return success(res, {
            message: "Todos los chats",
            user: userId,
        }, 201);

    } catch (err) {
        next(err);
    }
}
