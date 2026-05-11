const requiredEnvVars = [
    'PORT',
    'JWT_SECRET',
    'MONGO_URI',
    'EMAIL_HOST',
    'EMAIL_PASSWORD',
    'NODE_ENV',
    'CLOUDINARY_CLOUD_NAME',
    'CLOUDINARY_API_KEY',
    'CLOUDINARY_API_SECRET'
];


requiredEnvVars.forEach((key) => {
    if (!process.env[key]) {
        console.error(`Missing env variable: ${key}`);
        process.exit(1);
    }
});

module.exports = {
    PORT: process.env.PORT,
    JWT_SECRET: process.env.JWT_SECRET,
    MONGO_URI: process.env.MONGO_URI,
    NODE_ENV: process.env.NODE_ENV || 'development',
    EMAIL_HOST: process.env.EMAIL_HOST,
    EMAIL_PASSWORD: process.env.EMAIL_PASSWORD,
    CLOUDINARY_CLOUD_NAME: process.env.CLOUDINARY_CLOUD_NAME,
    CLOUDINARY_API_KEY: process.env.CLOUDINARY_API_KEY,
    CLOUDINARY_API_SECRET: process.env.CLOUDINARY_API_SECRET
};
