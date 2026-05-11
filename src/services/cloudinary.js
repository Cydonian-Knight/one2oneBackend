// Lógica para envio de imagenes
const { success, error } = require('../utils/response');

const cloudinary = require('cloudinary').v2;

require('dotenv').config()
require('../config/env');


cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});


// Funcion para el envio de codigo de verificación por correo
exports.sendImage = async (fileBuffer) => {
    if (!fileBuffer) throw new Error('No se proporcionó el buffer de la imagen');
    return new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
            {
                folder: 'avatars',
                resource_type: 'auto'
            },
            (err, result) => {
                if (err) return reject(err);
                console.log(result.secure_url);
                resolve(result.secure_url);
            }
        );

        uploadStream.end(fileBuffer);
    });
};


exports.deleteImage = async (url) => {
    try {
        const publicId = await getPublicIdFromUrl(url);
        const result = await cloudinary.uploader.destroy(publicId);
        return result;
    } catch (error) {
        throw new Error("Error al eliminar imagen de Cloudinary");
    }
};


// Función auxiliar para conseguir el Public_id solo teniendo la url
const getPublicIdFromUrl = (url) => {
    // Ejemplo: "https://res.cloudinary.com/demo/image/upload/v12345/avatars/foto_user.jpg"
    const parts = url.split('/');
    const fileName = parts.pop(); // "foto_user.jpg"
    const folder = parts.pop();   // "avatars"

    // Quitamos la extensión (.jpg)
    const publicId = `${folder}/${fileName.split('.')[0]}`;
    return publicId; // "avatars/foto_user"
};