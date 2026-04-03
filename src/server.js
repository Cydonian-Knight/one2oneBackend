require('dotenv').config();
require('./config/env');
const connectDB = require('./config/db');

connectDB();

const app = require('./app');

const { PORT, MONGO_URI, EMAIL_HOST, EMAIL_PASSWORD } = require('./config/env');

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}, with mongoURI ${MONGO_URI}, with email ${EMAIL_HOST} and ${EMAIL_PASSWORD}`);
});
