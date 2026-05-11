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

    } catch (error) {
        console.error(error);
        process.exit(1);
    }
};

startServer();