const { success, error } = require('../utils/response');
const bcrypt = require('bcryptjs');

const cloudinary = require('../services/cloudinary');
const User = require('../models/User');


exports.header = async (req, res, next) => {
    try {
        const user = await User.findByUserId(req.user.id);

        return success(res, {
            username: user.username,
            avatarUrl: user.avatarUrl || null,
            lastSeenAt: user.lastSeenAt,
            email: user.email,
            age: user.age || null,
            createdAt: new Date(user.createdAt).toLocaleDateString('es-MX'),
            id: user._id.toString(),
            subscriptionExpiresAt: user.subscriptionExpiresAt || null,
            strikes: user.strikes,
            bannedDate: new Date(user.suspensionUntil)
        }, 201);

    } catch (err) {
        next(err);
    }
}

exports.info = async (req, res, next) => {
    try {
        const user = await User.findByUserId(req.user.id);

        return success(res, {
            username: user.username,
            mood: user.mood,
            avatarUrl: user.avatarUrl,
            email: user.email,
            edad: user.age || null,
            memberSince: user.createdAt,
            lastSeen: user.lastSeenAt,
            subscriptionExpiresAt: user.subscriptionExpiresAt || null
        }, 201);

    } catch (err) {
        next(err);
    }
}


exports.newAvatar = async (req, res, next) => {
    const doc = req.file.buffer;
    if (!doc) return error(res, 'Archivo invalido', 400);

    try {
        const url = await cloudinary.sendImage(doc, next);
        const user = await User.findByUserId(req.user.id);
        if (user.avatarUrl) await cloudinary.deleteImage(user.avatarUrl);
        const avatarUrl = await User.updateImage(user._id, url);

        return success(res, {
            message: "Foto cambiada correctamente",
            avatar: avatarUrl,
        }, 200);

    } catch (err) {
        next(err);
    }
}

exports.newInfo = async (req, res, next) => {
    console.log(req);
    const { mood, edad } = req.body;
    if (!edad || !mood) {
        return error(res, 'Todos los campos deben ser validos', 400);
    }
    try {
        const user = await User.updateInfo(req.user.id, edad, mood);
        return success(res, {
            message: "Información Cambiada Correctamente"
        }, 200);

    } catch (err) {
        next(err);
    }
}


exports.searchUsers = async (req, res, next) => {
    const query = req.body.query;
    const myId = req.user.id;


    try {
        const users = await User.searchUsers(query, myId);
        return success(res, { users });
    } catch (err) {
        next(err);
    }
};

exports.newPass = async (req, res, next) => {
    const oldPass = req.body.old;
    const newPass = req.body.new;
    const myId = req.user.id;

    try {
        await User.updatePassword(myId, oldPass, newPass);
        return success(res, { message: 'Contraseña actualizada correctamente' });
    } catch (err) {
        next(err);
    }
};