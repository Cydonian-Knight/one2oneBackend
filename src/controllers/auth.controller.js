// Utils y modelos 
const { success, error } = require('../utils/response');
const temporalToken = require('../utils/tokens');
const User = require('../models/User');
const emailService = require('../services/mailer');
const { revokeToken } = require('../middlewares/auth.middleware');



// Bcrypt para encriptar contraseñas
const bcrypt = require('bcryptjs');

exports.logout = (req, res) => {
    const token = req.cookies.token;
    if (token) revokeToken(token);
    res.clearCookie('token');
    return success(res);
};

// Controlador de autenticación, registro y verificacion de 2 pasos.
exports.register = async (req, res, next) => {
    const { username, email, password } = req.body;

    try {
        // VALIDACION Campos requeridos
        if (!email || !password || !username) {
            return error(res, 'Todos los campos son obligatorios', 400);
        }

        // VALIDACION de usuario, email y telefono únicos
        const existingUser = await User.existingUser(username);
        if (existingUser) {
            return error(res, 'El nombre de usuario ya está registrado', 409);
        }

        // VALIDACION email y telefono unicos
        const existingEmail = await User.existingEmail(email.toLowerCase());
        if (existingEmail) {
            return error(res, 'El correo electrónico ya está registrado', 409);
        }


        const user = {
            username,
            email,
            password
        };

        // Creación del nuevo usuario
        const newUser = await User.newUser(user);

        // Token temporal para verificacion de email o telefono
        const token = temporalToken.generateToken(newUser._id, 'verification', '15m');


        // Respuesta exitosa con token temporal
        return success(res, {
            message: "Usuario registrado con éxito",
            token,
            user: {
                username: newUser.username
            }
        }, 201);

    } catch (err) {
        next(err);
    }
};


exports.login = async (req, res, next) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return error(res, 'Todos los campos son obligatorios', 400);
    }

    try {
        const isProduction = process.env.NODE_ENV === 'production';

        const cookieOptions = {
            httpOnly: true,
            secure: isProduction,
            sameSite: isProduction ? 'None' : 'Lax',
            maxAge: 7 * 24 * 60 * 60 * 1000
        };

        // ─────────────────────────────────────────────
        // ADMIN LOGIN
        // ─────────────────────────────────────────────

        const isAdminEmail =
            email.toLowerCase() === process.env.ADMIN_EMAIL?.toLowerCase();

        if (isAdminEmail) {
            const isAdminPassword = await bcrypt.compare(
                password,
                process.env.ADMIN_PASSWORD_HASH
            );

            if (!isAdminPassword) {
                return error(res, 'Credenciales Inválidas', 401);
            }

            const token = temporalToken.generateToken(
                process.env.ADMIN_EMAIL,
                'admin',
                '7d'
            );

            res.cookie('token', token, cookieOptions);

            return success(
                res,
                {
                    message: 'Login de administrador exitoso',
                    token,
                    user: { username: 'admin' }
                },
                200
            );
        }

        // ─────────────────────────────────────────────
        // USER LOGIN
        // ─────────────────────────────────────────────

        const loginUser = await User.findByUserEmail(
            email.toLowerCase()
        );

        if (!loginUser) {
            return error(res, 'Credenciales Inválidas', 401);
        }

        const isMatch = await bcrypt.compare(
            password,
            loginUser.password
        );

        if (!isMatch) {
            return error(res, 'Credenciales Inválidas', 401);
        }

        if (!loginUser.isVerified) {
            const token = temporalToken.generateToken(
                loginUser._id,
                'verification',
                '15m'
            );

            return success(
                res,
                {
                    message: 'Cuenta no verificada',
                    token,
                    needsVerification: true
                },
                200
            );
        }

        const token = temporalToken.generateToken(
            loginUser._id,
            'access',
            '7d'
        );

        res.cookie('token', token, cookieOptions);

        return success(
            res,
            {
                message: 'Login exitoso',
                token,
                user: { username: loginUser.username }
            },
            200
        );

    } catch (err) {
        next(err);
    }
};



exports.sendVerificationCode = async (req, res, next) => {
    try {
        const verificationUser = await User.findByUserId(req.user);
        if (verificationUser.isVerified) {
            return error(res, 'Usuario ya verificado', 400);
        }

        if (verificationUser.verificationCodeExpires && verificationUser.verificationCodeExpires > Date.now()) {
            return error(res, 'El codigo anterior aun es válido, por favor ingrésalo', 400);
        }

        const updatedUser = await User.setVerificationCode(verificationUser._id);

        emailService.sendVerificationCode(updatedUser.email, updatedUser.verificationCode, next);

        return success(res, {
            message: "Codigo enviado con éxito"
        }, 200);

    } catch (err) {
        next(err);
    }
};

exports.verifyCode = async (req, res, next) => {
    const { code } = req.body;

    if (!code) return error(res, 'Código requerido', 400);

    try {
        const verificationUser = await User.findByUserId(req.user._id);
        if (verificationUser.isVerified) { return error(res, "Usuario ya verificado", 400) }
        const verified = await User.verifyCode(verificationUser._id, code);

        const token = temporalToken.generateToken(verified._id, 'access', '7d');

        res.cookie("token", token, {
            httpOnly: process.env.NODE_ENV === "development",
            secure: false,
            sameSite: "Strict",
            maxAge: 7 * 24 * 60 * 60 * 1000
        });

        return success(res, {
            message: "Cuenta verificada, login exitoso",
            token,
            user: { username: verified.username }
        }, 200);

    } catch (err) {
        next(err);
    }
};

exports.updateEmail = async (req, res, next) => {
    const { email } = req.body;

    if (!email) return error(res, 'No se proporcionó un email', 400);

    try {
        const verificationUser = await User.findByUserId(req.user._id);


        if (verificationUser.isVerified) {
            return error(res, 'Usuario ya verificado', 400);
        }

        const updated = await User.updateEmail(verificationUser._id, email);

        return success(res, {
            message: "Email actualizado, puedes solicitar un nuevo código",
            user: { username: updated.username, email: updated.email }
        }, 200);

    } catch (err) {
        next(err);
    }
};