const mongoose = require('mongoose');

const connectDB = async () => {
    try {
        console.time('mongo');

        const conn = await mongoose.connect(process.env.MONGO_URI, {
            family: 4,
            serverSelectionTimeoutMS: 30000
        });

        console.timeEnd('mongo');

        console.log('MongoDB Conectado:', conn.connection.host);

    } catch (error) {
        console.error('Error MongoDB:', error.message);

        process.exit(1);
    }
};

module.exports = connectDB;