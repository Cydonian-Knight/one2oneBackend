const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');



const app = express();

app.use(cookieParser());

app.use(cors({
    origin: function (origin, callback) {
        // Permite cualquier origen (IP, localhost, Tailscale, etc.)
        // Si no hay origen (como Postman), también permite
        callback(null, true);
    },
    credentials: true // <--- RECUERDA: Esto es lo que permite que funcione tu cookie
}));
app.use(express.json());


const routes = require('./routes');
const errorMiddleware = require('./middlewares/error.middleware');

app.use('/api', routes);

app.use(errorMiddleware);

module.exports = app;
