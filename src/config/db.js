const mongoose = require('mongoose');
const { syncTwilioMetrics, seedTwilioHistory, scheduleDailySync } = require('../services/twilioMetrics');

const connectDB = async () => {
    try {
        console.time('mongo');

        const conn = await mongoose.connect(process.env.MONGO_URI, {
            family: 4,
            serverSelectionTimeoutMS: 30000
        });

        console.timeEnd('mongo');
        console.log('MongoDB Conectado:', conn.connection.host);

        await seedTwilioHistory();
        await syncTwilioMetrics();
        scheduleDailySync();

    } catch (error) {
        console.error('Error MongoDB:', error.message);
        process.exit(1);
    }
};

module.exports = connectDB;