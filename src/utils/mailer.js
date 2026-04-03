// Lógica para envio de correos electrónicos
const nodemailer = require('nodemailer')

// Carga de variables de entorno
require('dotenv').config();
require('../config/env');

// Correo y contraseña
const { EMAIL_HOST, EMAIL_PASSWORD } = require('../config/env');

// Transportador de correo usando Gmail
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: EMAIL_HOST,
        pass: EMAIL_PASSWORD
    }
})

// Funcion para el envio de codigo de verificación por correo
exports.sendVerificationCode = async (email, verificationCode, next) => {
    try {
        const mailOptions = {
            from: EMAIL_HOST,
            to: email,
            subject: "Codigo de Verificación One2One",
            html: `
                <div style="font-family: sans-serif; text-align: center;">
                    <h2>Verifica tu cuenta</h2>
                    <p>Tu código de seguridad es:</p>
                    <h1 style="color: #4A90E2; letter-spacing: 5px;">${verificationCode}</h1>
                    <p>Este código expirará en 15 minutos.</p>
                </div>
            `
        };
        await transporter.sendMail(mailOptions);
        return true;
    } catch (err) {
        next(err);
    }
}