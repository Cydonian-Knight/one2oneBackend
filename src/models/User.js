const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    userId: { type: String, required: true, unique: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true }, // Necesario para el login
    username: { type: String, required: true, trim: true, unique: true },
    age: { type: Number, min: 18, max: 100, default: null },
    avatarUrl: { type: String, default: null },
    status: { type: String, default: 'active', enum: ['active', 'suspended', 'blocked'] },
    strikes: { type: Number, default: 0 },
    suspensionUntil: { type: Date, default: null },
    blockedUsers: [{ type: String, trim: true }], // Array de userIds
    lastSeenAt: { type: Date, default: Date.now },
    isVerified: { type: Boolean, default: false },
    verificationCode: { type: String, default: null },
    verificationCodeExpires: { type: Date, default: null }
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);