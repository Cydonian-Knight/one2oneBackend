// Utils y modelos 
const { success, error } = require('../utils/response');
const temporalToken = require('../utils/tokens');
const User = require('../models/User');
const emailService = require('../utils/mailer');


// Bcrypt para encriptar contraseñas
const bcrypt = require('bcryptjs');

// Importación de nanoid para generar userIds unicos
const { customAlphabet } = require('nanoid');
const alphabet = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const nanoid = customAlphabet(alphabet, 12);

// Controlador de autenticación, registro y verificacion de 2 pasos.
exports.register = async (req, res, next) => {
    const { username, email, password } = req.body;

    try {
        // VALIDACION Campos requeridos
        if (!email || !password || !username) {
            return error(res, 'Todos los campos son obligatorios', 400);
        }

        // VALIDACION de usuario, email y telefono únicos
        const existingUser = await User.findOne({ username: username });
        if (existingUser) {
            return error(res, 'El nombre de usuario ya está registrado', 409);
        }

        // VALIDACION email y telefono unicos
        const existingEmail = await User.findOne({ email: email.toLowerCase() });
        if (existingEmail) {
            return error(res, 'El correo electrónico ya está registrado', 409);
        }


        // Generación de un userId unico con nanoid
        const userId = `u_${nanoid()}`;

        // Encriptacion de la contraseña
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Creación del nuevo usuario
        const newUser = new User({
            userId,
            username,
            email: email.toLowerCase(),
            password: hashedPassword,
            age: null,
            status: 'active',
            isVerified: false,
        });

        await newUser.save();


        // Token temporal para verificacion de email o telefono
        const token = temporalToken.generateToken(newUser.userId, 'verification', '15m');


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
    try {
        if (!email || !password) {
            return error(res, 'Todos los campos son obligatorios', 400);
        }

        const loginUser = await User.findOne({ email: email.toLowerCase() });
        if (!loginUser) {
            return error(res, 'Credenciales Inválidas', 401);
        }

        const isMatch = await bcrypt.compare(password, loginUser.password);
        if (!isMatch) {
            return error(res, 'Credenciales Inválidas', 401);
        }

        // En caso de que no este verificado aun
        if (!loginUser.isVerified) {
            const token = temporalToken.generateToken(loginUser.userId, 'verification', '15m');

            return success(res, {
                message: "Cuenta no verificada",
                token, // Token restringido
                needsVerification: true
            }, 200); // Usamos success para que el front sepa qué hacer
        }

        // Login completado y cuenta verificada
        const token = temporalToken.generateToken(
            loginUser.userId,
            'access',
            '7d');

        res.cookie("token", token, {
            httpOnly: process.env.NODE_ENV === "development",
            secure: false,
            sameSite: "Strict",
            maxAge: 7 * 24 * 60 * 60 * 1000 // 7 días
        });

        return success(res, {
            message: "Login exitoso",
            token: token,
            user: { username: loginUser.username }
        }, 200);

    } catch (err) {
        next(err);
    }
};

exports.sendVerificationCode = async (req, res, next) => {
    try {

        const verificationUser = req.user; // Usuario obtenido del middleware temporalAuth


        // VALIDACION que el usuario no este verificado ya
        if (verificationUser.isVerified) {
            return error(res, 'Usuario ya verificado', 401);
        }

        // VALIDACION que el codigo aleatorio anterior aun no haya expirado
        if (verificationUser.verificationCodeExpires && verificationUser.verificationCodeExpires > Date.now()) {
            return error(res, 'El codigo de verificacion anterior aun es valido. Porfavor, ingresalo.', 401);
        }

        // Codigo de verificación aleatorio de 6 digitos
        const verificationCode = Math.floor(100000 + Math.random() * 999999).toString();

        verificationUser.verificationCode = verificationCode;
        verificationUser.verificationCodeExpires = Date.now() + 15 * 60 * 1000; // Expira en 15 minutos

        await verificationUser.save();

        // Logica para enviar codigo por sms o email, pendiente
        emailService.sendVerificationCode(verificationUser.email, verificationCode, next);



        return success(res, {
            message: "Codigo Enviado con exito",
            verificationCode, // Para saber el codigo generado y actualizado
        }, 201);

    } catch (error) {
        next(err);
    }
}

exports.verifyCode = async (req, res, next) => {
    const verificationCode = req.body.code;
    try {

        verificationUser = req.user; // Usuario obtenido desde el middleware temporalAuth

        // VALIDACION codigo correcto y no expirado
        if (verificationUser.verificationCode !== verificationCode || verificationUser.verificationCodeExpires < Date.now()) {
            return error(res, 'Codigo de verificación inválido o expirado', 401);
        }


        // Login completado y cuenta verificada, se cambia en la bd el estado
        verificationUser.isVerified = true;
        verificationUser.verificationCode = null;
        verificationUser.verificationCodeExpires = null;

        await verificationUser.save();

        const token = temporalToken.generateToken(verificationUser.userId, 'access', '7d');

        res.cookie("token", token, {
            httpOnly: process.env.NODE_ENV === "development",
            secure: false,
            sameSite: "Strict",
            maxAge: 7 * 24 * 60 * 60 * 1000 // 7 días
        });

        return success(res, {
            message: "Login exitoso",
            token: token,
            user: { username: verificationUser.username }
        }, 200);

    } catch (err) {
        next(err);
    }
}


exports.updateEmail = async (req, res, next) => {
    const email = req.body.email;
    try {

        // VALIDACION que el email exista
        if (!email) {
            return error(res, 'No se proporcionó un email', 401);
        }

        const verificationUser = req.user; // Usuario obtenido desde el middleware temporalAuth

        const existingEmail = await User.findOne({ email: email.toLowerCase() });
        if (existingEmail) {
            return error(res, 'El correo electronico ya esta registrado', 409);
        }

        verificationUser.email = email.toLowerCase();
        verificationUser.verificationCodeExpires = null;

        await verificationUser.save();


        return success(res, {
            message: "Email actualizado con exito, puedes solicitar un nuevo codigo",
            email: verificationUser.email,
            user: { username: verificationUser.username }
        }, 200);

    } catch (err) {
        next(err);
    }
}