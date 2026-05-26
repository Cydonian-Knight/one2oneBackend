// Lógica para envío de correos electrónicos via Gmail API (fetch nativo)
require('dotenv').config();

const EMAIL_HOST          = process.env.EMAIL_HOST;
const GMAIL_CLIENT_ID     = process.env.GMAIL_CLIENT_ID;
const GMAIL_CLIENT_SECRET = process.env.GMAIL_CLIENT_SECRET;
const GMAIL_REFRESH_TOKEN = process.env.GMAIL_REFRESH_TOKEN;

// Obtiene un access token usando el refresh token de OAuth2
const getAccessToken = async () => {
    console.log('CLIENT_ID:', GMAIL_CLIENT_ID);
    console.log('CLIENT_SECRET:', GMAIL_CLIENT_SECRET ? GMAIL_CLIENT_SECRET.slice(0, 10) + '...' : 'undefined');
    console.log('REFRESH_TOKEN:', GMAIL_REFRESH_TOKEN ? GMAIL_REFRESH_TOKEN.slice(0, 10) + '...' : 'undefined');

    const res = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
            client_id:     GMAIL_CLIENT_ID,
            client_secret: GMAIL_CLIENT_SECRET,
            refresh_token: GMAIL_REFRESH_TOKEN,
            grant_type:    'refresh_token'
        })
    });
    const data = await res.json();
    if (!data.access_token) throw new Error(`No se obtuvo access token: ${JSON.stringify(data)}`);
    return data.access_token;
};

// Convierte el correo a formato base64url que exige Gmail API
const buildRawEmail = (to, subject, html) => {
    const message = [
        `From: ${EMAIL_HOST}`,
        `To: ${to}`,
        `Subject: ${subject}`,
        'MIME-Version: 1.0',
        'Content-Type: text/html; charset=utf-8',
        '',
        html
    ].join('\r\n');

    return Buffer.from(message)
        .toString('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');
};

// Función para el envío de código de verificación por correo
exports.sendVerificationCode = async (email, verificationCode) => {
    if (!email || !verificationCode) throw new Error('Correo o código inválidos');

    const html = `
        <div style="font-family: sans-serif; text-align: center;">
            <h2>Verifica tu cuenta</h2>
            <p>Tu código de seguridad es:</p>
            <h1 style="color: #4A90E2; letter-spacing: 5px;">${verificationCode}</h1>
            <p>Este código expirará en 15 minutos.</p>
        </div>
    `;

    const accessToken = await getAccessToken();
    const raw = buildRawEmail(email, 'Codigo de Verificación One2One', html);

    const res = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ raw })
    });

    const result = await res.json();
    if (result.error) throw new Error(`Gmail API error: ${result.error.message}`);

    return true;
};
