require('dotenv').config()

const cloudinary = require('cloudinary').v2;
console.log(process.env.CLOUDINARY_CLOUD_NAME,
    process.env.CLOUDINARY_API_KEY,
    process.env.CLOUDINARY_API_SECRET)
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});


const subir = async () => {
    try {
        const image = 'test.png';
        const result = await cloudinary.uploader.upload(image);
        console.log(image);
        console.log(result);
    } catch (error) {
        console.log(error);
    }
}

subir();