const requiredEnvVars = [
    'PORT',
    'JWT_SECRET'
];

requiredEnvVars.forEach((key) => {
    if (!process.env[key]) {
        console.error(`❌ Missing env variable: ${key}`);
        process.exit(1);
    }
});

module.exports = {
    PORT: process.env.PORT,
    JWT_SECRET: process.env.JWT_SECRET,
    NODE_ENV: process.env.NODE_ENV || 'development'
};
