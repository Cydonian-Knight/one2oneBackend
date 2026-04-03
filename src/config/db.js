const mongoose = require('mongoose');

const connectDB = async () => {
    try {
        const conn = await mongoose.connect(process.env.MONGO_URI);
        console.log('MongoDB Conectado: ', conn.connection.host);
    } catch (error) {
        next(error);
        process.exit(1);
    }
};

module.exports = connectDB;
