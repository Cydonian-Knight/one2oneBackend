const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { customAlphabet } = require('nanoid');
const alphabet = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const nanoid = customAlphabet(alphabet, 12);


const userSchema = new mongoose.Schema({
    _id: { type: String, required: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
    password: { type: String, required: true }, // Necesario para el login
    username: { type: String, required: true, trim: true, unique: true, index: true },
    age: { type: Number, min: 18, max: 100, default: null },
    avatarUrl: { type: String, default: null },
    mood: { type: String, default: null },
    status: { type: String, default: 'active', enum: ['active', 'suspended', 'blocked'] },
    strikes: { type: Number, default: 0 },
    suspensionUntil: { type: Date, default: null },
    blockedUsers: [{ type: String, trim: true }], // Array de userIds
    lastSeenAt: { type: Date, default: Date.now },
    isVerified: { type: Boolean, default: false },
    verificationCode: { type: String, default: null },
    verificationCodeExpires: { type: Date, default: null }
}, { timestamps: true, _id: false });

userSchema.statics.findByUserId = async function (userId) {
    const user = await this.findOne({ _id: userId });
    if (!user) throw new Error('Usuario no encontrado');
    return user;
};

userSchema.statics.findByUserEmail = async function (email) {
    const user = await this.findOne({ email: email.toLowerCase() });
    if (!user) throw new Error('Usuario no encontrado');
    return user;
};


userSchema.statics.existingUser = async function (username) {
    const user = await this.findOne({ username: username });
    return user ? true : false;
};
userSchema.statics.existingEmail = async function (email) {
    const user = await this.findOne({ email: email.toLowerCase() });
    return user ? true : false;
};


userSchema.statics.newUser = async function (user) {
    const userId = `u_${nanoid()}`;

    // Encriptacion de la contraseña
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(user.password, salt);

    // Creación del nuevo usuario
    const newUser = new this({
        _id: userId,
        username: user.username,
        email: user.email.toLowerCase(),
        password: hashedPassword,
        age: null,
        status: 'active',
        isVerified: false,
    });

    return await newUser.save();


}


userSchema.statics.isMatch = async function (email, password) {
    const user = await this.findByUserEmail(email);
    const isMatch = await bcrypt.compare(password, user.password);
    return isMatch;
}


userSchema.statics.isVerified = async function (email) {
    const user = await this.findByUserEmail(email);
    return user.isVerified;
}




userSchema.statics.updateImage = async function (userId, imageUrl) {
    const user = await this.findByUserId(userId);
    if (!user) throw new Error('Usuario no encontrado');
    user.avatarUrl = imageUrl;
    await user.save();
    return await user.avatarUrl;
}

userSchema.statics.updateInfo = async function (userId, age, mood, password) {
    const user = await this.findByUserId(userId);
    if (!user) throw new Error('Usuario no encontrado');
    if (user.mood !== mood) user.mood = mood;
    if ((!user.age || user.age !== age) && (age >= 18 && age < 100)) user.age = age;

    const newPassword = await bcrypt.compare(password, user.password);
    if (!newPassword && password.length >= 6) {
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);
        user.password = hashedPassword;
    }
    await user.save();
    return await user.avatarUrl;
}

userSchema.statics.searchUsers = async function (query, myId) {
    const users = await this.find({
        $and: [
            { _id: { $ne: myId } }, // No buscarme a mí mismo
            {
                $or: [
                    { username: { $regex: query, $options: 'i' } },
                    { email: { $regex: query, $options: 'i' } }
                ]
            }
        ]
    })
        .select('username avatarUrl email')
        .limit(10);
    return await users;
}

// Genera y guarda el código de verificación
userSchema.statics.setVerificationCode = async function (userId) {
    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
    const verificationCodeExpires = Date.now() + 15 * 60 * 1000; // 15 minutos

    const user = await this.findOneAndUpdate(
        { _id: userId },
        { verificationCode, verificationCodeExpires },
        { new: true }
    );



    if (!user) throw new Error('Usuario no encontrado');
    return user;
};

// Verifica el código y marca el usuario como verificado
userSchema.statics.verifyCode = async function (userId, code) {
    const user = await this.findOne({ _id: userId });
    if (!user) throw new Error('Usuario no encontrado');

    // Validaciones de negocio
    if (user.verificationCode !== code) {
        throw new Error('Código de verificación inválido');
    }
    if (user.verificationCodeExpires < Date.now()) {
        throw new Error('El código ha expirado');
    }

    user.isVerified = true;
    user.verificationCode = null;
    user.verificationCodeExpires = null;

    return await user.save();
};

// Actualiza el email si no está en uso

userSchema.statics.updateEmail = async function (userId, email) {
    const normalizedEmail = email.toLowerCase();

    // Validación de negocio — email único
    const existing = await this.findOne({ email: normalizedEmail });
    if (existing) throw new Error('El correo electrónico ya está registrado');

    const user = await this.findOneAndUpdate(
        { _id: userId },
        { email: normalizedEmail, verificationCodeExpires: null },
        { new: true }
    );

    if (!user) throw new Error('Usuario no encontrado');
    return user;
};

// Actualiza la ultima vez vista del usuario
userSchema.statics.updateLastSeenAt = async function (userId, lastSeenAt) {


    const user = await this.findOneAndUpdate(
        { _id: userId },
        { lastSeenAt: lastSeenAt }
    );

    if (!user) throw new Error('Usuario no encontrado');
    return user;
};

module.exports = mongoose.model('User', userSchema);