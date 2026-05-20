require('dotenv').config();
require('./config/env');

const connectDB = require('./config/db');
const { server } = require('./app');
const { PORT } = require('./config/env');

const startServer = async () => {
    try {
        await connectDB();

        server.listen(PORT, '0.0.0.0', () => {
            console.log(`Server running on port ${PORT}`);
        });

        // FIX: keepAliveTimeout por defecto = 5s en Node.js,
        // cierra el socket SSE antes del primer heartbeat (15s).
        // headersTimeout siempre debe ser > keepAliveTimeout.
        server.keepAliveTimeout = 65_000;
        server.headersTimeout = 66_000;

    } catch (error) {
        console.error(error);
        process.exit(1);
    }
};

startServer();